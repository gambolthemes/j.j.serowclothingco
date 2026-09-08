<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('uploads');
        $this->seed(CatalogSeeder::class);

        $this->admin = User::create([
            'name' => 'Staff', 'company' => 'J.J. Serow',
            'email' => 'staff@example.com', 'password' => 'passwordtest123',
        ]);
        $this->admin->forceFill(['is_admin' => true])->save();
    }

    private function upload(UploadedFile $file)
    {
        return $this->actingFresh($this->admin)->postJson('/api/admin/media', ['file' => $file]);
    }

    public function test_only_staff_can_upload(): void
    {
        $retailer = User::create([
            'name' => 'Buyer', 'company' => 'Store',
            'email' => 'buyer@example.com', 'password' => 'passwordtest123',
        ]);

        $file = UploadedFile::fake()->image('shirt.jpg', 900, 1200);

        $this->postJson('/api/admin/media', ['file' => $file])->assertUnauthorized();
        $this->actingFresh($retailer)->postJson('/api/admin/media', ['file' => $file])->assertForbidden();
    }

    public function test_an_upload_lands_on_disk_and_comes_back_as_a_servable_path(): void
    {
        $response = $this->upload(UploadedFile::fake()->image('shirt.jpg', 900, 1200))
            ->assertCreated()
            ->assertJsonStructure(['url', 'size']);

        $url = $response->json('url');

        $this->assertStringStartsWith('/uploads/', $url);
        Storage::disk('uploads')->assertExists(basename($url));
    }

    /**
     * The stored name never comes from the browser: it is the one field of an
     * upload the caller fully controls, and it decides both where the file
     * lands and what the web server will execute it as.
     */
    public function test_the_client_filename_is_thrown_away(): void
    {
        $url = $this->upload(UploadedFile::fake()->image('../../evil shell.php.jpg', 400, 400))
            ->assertCreated()
            ->json('url');

        $this->assertMatchesRegularExpression('#^/uploads/[a-z0-9]{32}\.jpg$#', $url);
    }

    /** Laravel's own `image` rule allows SVG, which is script we would be hosting. */
    public function test_an_svg_is_refused(): void
    {
        $this->upload(UploadedFile::fake()->create('logo.svg', 20, 'image/svg+xml'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');

        $this->assertCount(0, Storage::disk('uploads')->allFiles());
    }

    public function test_a_non_image_is_refused(): void
    {
        $this->upload(UploadedFile::fake()->create('prices.pdf', 40, 'application/pdf'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    public function test_a_thumbnail_sized_image_is_refused(): void
    {
        $this->upload(UploadedFile::fake()->image('tiny.jpg', 64, 64))
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    public function test_a_product_accepts_an_uploaded_path_as_its_image(): void
    {
        $url = $this->upload(UploadedFile::fake()->image('shirt.jpg', 900, 1200))->json('url');

        $this->actingFresh($this->admin)->postJson('/api/admin/products', [
            'name' => 'Uploaded Shirt',
            'category' => 'shirts',
            'fabric' => 'Oxford cotton',
            'image' => $url,
            'price_mod' => 0,
            'blurb' => 'Shot on the factory floor.',
            'is_active' => true,
        ])->assertCreated()->assertJsonPath('product.image', $url);
    }

    public function test_a_path_that_climbs_out_of_uploads_is_refused(): void
    {
        $this->actingFresh($this->admin)->postJson('/api/admin/products', [
            'name' => 'Sneaky', 'category' => 'shirts', 'fabric' => 'Cotton',
            'image' => '/uploads/../../.env',
            'price_mod' => 0, 'blurb' => 'No.', 'is_active' => true,
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    /** The old CDN URLs still have to validate — the whole catalog is on them. */
    public function test_an_external_url_still_validates(): void
    {
        $this->actingFresh($this->admin)->postJson('/api/admin/products', [
            'name' => 'Hosted Elsewhere', 'category' => 'shirts', 'fabric' => 'Cotton',
            'image' => 'https://images.hostinger.com/example.png',
            'price_mod' => 0, 'blurb' => 'Still fine.', 'is_active' => true,
        ])->assertCreated();
    }

    public function test_replacing_a_photo_takes_the_old_file_off_the_disk(): void
    {
        $old = $this->upload(UploadedFile::fake()->image('old.jpg', 800, 800))->json('url');
        $new = $this->upload(UploadedFile::fake()->image('new.jpg', 800, 800))->json('url');

        $product = Product::where('is_active', true)->firstOrFail();
        $base = [
            'name' => $product->name, 'category' => $product->category,
            'fabric' => $product->fabric, 'price_mod' => 0, 'blurb' => $product->blurb,
            'is_active' => true,
        ];

        $this->actingFresh($this->admin)
            ->putJson("/api/admin/products/{$product->id}", $base + ['image' => $old])
            ->assertOk();

        $this->actingFresh($this->admin)
            ->putJson("/api/admin/products/{$product->id}", $base + ['image' => $new])
            ->assertOk();

        Storage::disk('uploads')->assertMissing(basename($old));
        Storage::disk('uploads')->assertExists(basename($new));
    }

    /** Two products can share a photo; dropping it from one must not blank the other. */
    public function test_a_file_still_used_elsewhere_survives(): void
    {
        $shared = $this->upload(UploadedFile::fake()->image('shared.jpg', 800, 800))->json('url');

        $products = Product::where('is_active', true)->take(2)->get();
        $this->assertCount(2, $products, 'the seeded catalog needs two products for this');

        foreach ($products as $product) {
            $this->actingFresh($this->admin)->putJson("/api/admin/products/{$product->id}", [
                'name' => $product->name, 'category' => $product->category,
                'fabric' => $product->fabric, 'image' => $shared, 'price_mod' => 0,
                'blurb' => $product->blurb, 'is_active' => true,
            ])->assertOk();
        }

        $this->actingFresh($this->admin)
            ->deleteJson("/api/admin/products/{$products[0]->id}")
            ->assertOk();

        Storage::disk('uploads')->assertExists(basename($shared));
    }

    public function test_a_settings_image_holds_a_file_against_pruning(): void
    {
        $hero = $this->upload(UploadedFile::fake()->image('hero.jpg', 1600, 900))->json('url');

        Setting::putMany(['HERO_URL' => $hero]);

        $product = Product::where('is_active', true)->firstOrFail();

        $this->actingFresh($this->admin)->putJson("/api/admin/products/{$product->id}", [
            'name' => $product->name, 'category' => $product->category,
            'fabric' => $product->fabric, 'image' => $hero, 'price_mod' => 0,
            'blurb' => $product->blurb, 'is_active' => true,
        ])->assertOk();

        $this->actingFresh($this->admin)->putJson("/api/admin/products/{$product->id}", [
            'name' => $product->name, 'category' => $product->category,
            'fabric' => $product->fabric, 'image' => 'https://images.hostinger.com/x.png',
            'price_mod' => 0, 'blurb' => $product->blurb, 'is_active' => true,
        ])->assertOk();

        Storage::disk('uploads')->assertExists(basename($hero));
    }
}

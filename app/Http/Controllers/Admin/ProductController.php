<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Color;
use App\Models\Product;
use App\Models\Setting;
use App\Rules\ImageSource;
use App\Support\UploadedImages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    /** Every product, active or not, with its per-colour stock. */
    public function index(): JsonResponse
    {
        $products = Product::with('colors')->orderBy('position')->orderBy('name')->get();

        return response()->json([
            'products' => $products->map(fn (Product $p) => $this->payload($p)),
            'colors' => Color::orderBy('position')->get()->map(fn (Color $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'hex' => $c->hex,
                'base' => (float) $c->base,
            ]),
            'stock_states' => Product::STOCK_STATES,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $stock = $this->validatedStock($request);

        $product = Product::create($data + ['position' => (Product::max('position') ?? 0) + 1]);
        $this->syncStock($product, $stock);

        return response()->json(['product' => $this->payload($product->fresh('colors'))], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validated($request, $product);
        $stock = $this->validatedStock($request);

        $replaced = $product->image;

        $product->update($data);
        $this->syncStock($product, $stock);

        // Swapping the photo leaves the old upload on disk with nothing pointing
        // at it. Pruned after the save, so a failed update cannot delete the
        // image the product is still using.
        UploadedImages::prune($replaced);

        return response()->json(['product' => $this->payload($product->fresh('colors'))]);
    }

    /**
     * Order items keep the product's slug and name as text, so past orders are
     * unaffected by a delete — but the storefront loses the product entirely.
     */
    public function destroy(Product $product): JsonResponse
    {
        $image = $product->image;

        $product->delete();
        UploadedImages::prune($image);

        return response()->json(['status' => 'deleted']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Product $product): array
    {
        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'name' => $product->name,
            'category' => $product->category,
            'fabric' => $product->fabric,
            'image' => $product->image,
            'price_mod' => (float) $product->price_mod,
            'blurb' => $product->blurb,
            'is_active' => $product->is_active,
            'position' => $product->position,
            'stock' => $product->colors->mapWithKeys(
                fn (Color $c) => [$c->name => $c->pivot->status]
            )->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Product $product = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'slug' => [
                'nullable', 'string', 'max:80', 'regex:/^[a-z0-9-]+$/',
                Rule::unique('products', 'slug')->ignore($product?->id),
            ],
            'category' => ['required', 'string', 'max:60'],
            'fabric' => ['required', 'string', 'max:160'],
            // Not `url`: an uploaded image is the site-relative /uploads/… path
            // the admin uploader hands back, which `url` rejects.
            'image' => ['required', 'string', 'max:500', new ImageSource],
            'price_mod' => ['required', 'numeric', 'min:-100000', 'max:100000'],
            'blurb' => ['required', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ]);

        // The slug is what order items and storefront URLs key on, so it is only
        // generated when creating — renaming a product must not move it. The
        // key is absent entirely when the caller omits it, not just empty.
        $data['slug'] = ($data['slug'] ?? null) ?: ($product?->slug ?? Str::slug($data['name']));

        return $data;
    }

    /**
     * @return array<string, string>
     */
    private function validatedStock(Request $request): array
    {
        $validated = $request->validate([
            'stock' => ['array'],
            'stock.*' => [Rule::in(Product::STOCK_STATES)],
        ]);

        return $validated['stock'] ?? [];
    }

    /**
     * @param  array<string, string>  $stock
     */
    private function syncStock(Product $product, array $stock): void
    {
        $colors = Color::orderBy('position')->get();

        $product->colors()->sync(
            $colors->mapWithKeys(fn (Color $color) => [
                $color->id => ['status' => $stock[$color->name] ?? 'in_stock'],
            ])->all()
        );

        Setting::forget();
    }
}

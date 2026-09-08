<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Response;

/*
| robots.txt and sitemap.xml are generated rather than kept as files in public/
| for two reasons: the sitemap has to list whatever products are live right now,
| and the Sitemap: line in robots.txt has to be an absolute URL — so it must
| come from APP_URL instead of being hardcoded to one domain.
|
| public/robots.txt was removed when these routes landed; a real file there is
| served by Apache/nginx before the request ever reaches Laravel, so leaving it
| in place would have silently shadowed this route.
*/
class SeoController extends Controller
{
    /**
     * Pages worth indexing, with how strongly to weight them against each other.
     * The account, cart, admin and password screens are all either private or
     * meaningless to a crawler, so they are absent here and blocked in robots().
     */
    private const PUBLIC_PAGES = [
        '/' => ['1.0', 'weekly'],
        '/catalog' => ['0.9', 'weekly'],
        '/rate-card' => ['0.8', 'monthly'],
        '/tracking' => ['0.5', 'monthly'],
        '/login' => ['0.3', 'yearly'],
        '/signup' => ['0.4', 'yearly'],
    ];

    public function robots(): Response
    {
        $lines = [
            'User-agent: *',
            '',
            '# Signed-in areas and the JSON behind them. Nothing here renders for',
            '# a crawler, and /api/track would let one walk the order codes.',
            'Disallow: /account',
            'Disallow: /admin',
            'Disallow: /cart',
            'Disallow: /api/',
            'Disallow: /forgot-password',
            'Disallow: /reset-password',
            '',
            'Allow: /',
            '',
            'Sitemap: '.url('/sitemap.xml'),
        ];

        return response(implode("\n", $lines)."\n", 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }

    public function sitemap(): Response
    {
        $urls = [];

        foreach (self::PUBLIC_PAGES as $path => [$priority, $frequency]) {
            // url('/') drops the trailing slash, which would leave the homepage
            // listed as https://host while the page's own canonical tag says
            // https://host/ — the same URL, reported as two.
            $loc = $path === '/' ? rtrim(url('/'), '/').'/' : url($path);

            $urls[] = ['loc' => $loc, 'priority' => $priority, 'changefreq' => $frequency];
        }

        // Only active products: an inactive one 404s through the catch-all, and
        // listing a 404 in a sitemap is what gets a site's crawl budget cut.
        Product::where('is_active', true)
            ->orderBy('position')
            ->get(['slug', 'updated_at'])
            ->each(function (Product $product) use (&$urls) {
                $urls[] = [
                    'loc' => url('/product/'.$product->slug),
                    'lastmod' => $product->updated_at?->toAtomString(),
                    'priority' => '0.7',
                    'changefreq' => 'weekly',
                ];
            });

        $xml = view('sitemap', ['urls' => $urls])->render();

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}

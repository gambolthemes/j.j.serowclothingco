<?php

use App\Http\Controllers\Account\AddressController;
use App\Http\Controllers\Account\CartController;
use App\Http\Controllers\Account\OrderController;
use App\Http\Controllers\Account\PaymentController;
use App\Http\Controllers\Account\PaymentProfileController;
use App\Http\Controllers\Account\ProfileController;
use App\Http\Controllers\Admin\ColorController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\RetailerController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\SeoController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\WebhookController;
use App\Support\Storefront;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/*
| Session auth for the SPA. These have to be declared before the catch-all
| below, which would otherwise answer GET /auth/user with the app shell.
|
| Every one that a stranger can reach is throttled — these are the only doors
| into the app that are not already behind `auth`. The budgets themselves live
| in AppServiceProvider::rateLimiters().
*/
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::get('/auth/user', [AuthController::class, 'user']);

Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendLink'])
    ->middleware('throttle:password-reset');
Route::post('/auth/reset-password', [PasswordResetController::class, 'reset'])
    ->middleware('throttle:password-reset');

/*
| The SPA's own data endpoints. They sit under /api so they cannot collide with
| the react-router pages of the same name — /account/orders is a page, while
| /api/account/orders is the JSON behind it.
*/
// Throttled because order codes run in sequence (JS-2041, JS-2042, ...) and
// this endpoint needs no login — without a limit the whole book is walkable.
Route::get('/api/track/{code}', [TrackingController::class, 'show'])
    ->middleware('throttle:30,1');

Route::middleware('auth')->prefix('api/account')->group(function () {
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/password', [ProfileController::class, 'updatePassword']);

    // Billing identity and how the retailer pays. No card data — orders are
    // settled by transfer, so there is no gateway and nothing to tokenise.
    Route::get('/payment', [PaymentProfileController::class, 'show']);
    Route::put('/payment', [PaymentProfileController::class, 'update']);

    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{code}', [OrderController::class, 'show']);
    Route::post('/orders/{code}/cancel', [OrderController::class, 'cancel']);

    // Paying an order online. Throttled because opening a payment is a call out
    // to the gateway — cheap for us to send, not free for them to receive.
    Route::post('/orders/{code}/pay', [PaymentController::class, 'start'])
        ->middleware('throttle:20,1');
    Route::post('/orders/{code}/pay/confirm', [PaymentController::class, 'confirm'])
        ->middleware('throttle:20,1');

    // The draft cart, so it follows the retailer between devices.
    Route::get('/cart', [CartController::class, 'show']);
    Route::put('/cart', [CartController::class, 'update']);
});

/*
| Staff area. `admin` sits behind `auth`, so an unauthenticated caller gets a
| 401 and a signed-in retailer gets a 403.
*/
Route::middleware(['auth', 'admin'])->prefix('api/admin')->group(function () {
    Route::get('/stats', [AdminOrderController::class, 'stats']);

    // Declared before /orders/{code} so "export" is not read as an order code.
    Route::get('/orders/export', [AdminOrderController::class, 'export']);
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{code}', [AdminOrderController::class, 'show']);
    Route::put('/orders/{code}/status', [AdminOrderController::class, 'updateStatus']);
    Route::put('/orders/{code}/items', [AdminOrderController::class, 'updateItems']);

    Route::get('/retailers/export', [RetailerController::class, 'export']);
    Route::get('/retailers', [RetailerController::class, 'index']);
    Route::get('/retailers/{user}', [RetailerController::class, 'show']);
    Route::put('/retailers/{user}/role', [RetailerController::class, 'updateRole']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    Route::get('/colors', [ColorController::class, 'index']);
    Route::post('/colors', [ColorController::class, 'store']);
    Route::put('/colors/{color}', [ColorController::class, 'update']);
    Route::delete('/colors/{color}', [ColorController::class, 'destroy']);

    Route::get('/settings', [SettingController::class, 'show']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Product and storefront photography, so a catalog entry no longer needs
    // the image hosted somewhere else first.
    Route::post('/media', [MediaController::class, 'store']);
    Route::delete('/media', [MediaController::class, 'destroy']);
});

/*
| Gateway callbacks. No session, no CSRF token (see bootstrap/app.php) — the
| caller is Razorpay or PayPal, not a browser. Each request is only acted on
| once its signature verifies, which the gateway class does.
*/
Route::post('/webhooks/{gateway}', WebhookController::class)
    ->whereIn('gateway', ['razorpay', 'paypal']);

/*
| Crawler files. Generated, not static, so the sitemap tracks the live catalog
| and the Sitemap: line follows APP_URL. Declared before the catch-all, which
| would otherwise hand a crawler the app shell for both.
*/
Route::get('/robots.txt', [SeoController::class, 'robots']);
Route::get('/sitemap.xml', [SeoController::class, 'sitemap']);

/*
| The storefront is a React SPA driven by react-router. Every non-asset GET
| request returns the same shell so deep links (/product/washed-wide-cargo,
| /account/orders, ...) resolve on a hard refresh instead of 404ing. The
| signed-in user rides along so the first paint knows the auth state.
*/
Route::get('/{any?}', function (string $any = '') {
    // react-router shows its own 404 screen for anything unmatched, but the
    // response has to say 404 too — otherwise a mistyped URL is a soft 404 that
    // search engines index as a real page.
    $known = [
        '', 'catalog', 'cart', 'tracking', 'login', 'signup', 'rate-card',
        'forgot-password', 'reset-password',
        'product/*', 'account', 'account/*', 'admin', 'admin/*',
    ];

    return response()->view('app', [
        'authUser' => Auth::user()?->publicPayload(),
        'storefront' => Storefront::payload(),
    ], Str::is($known, $any) ? 200 : 404);
})->where('any', '.*');

<?php

use App\Http\Controllers\Account\AddressController;
use App\Http\Controllers\Account\OrderController;
use App\Http\Controllers\Account\ProfileController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\RetailerController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\TrackingController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
| Session auth for the SPA. These have to be declared before the catch-all
| below, which would otherwise answer GET /auth/user with the app shell.
*/
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::get('/auth/user', [AuthController::class, 'user']);

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

    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{code}', [OrderController::class, 'show']);
});

/*
| Staff area. `admin` sits behind `auth`, so an unauthenticated caller gets a
| 401 and a signed-in retailer gets a 403.
*/
Route::middleware(['auth', 'admin'])->prefix('api/admin')->group(function () {
    Route::get('/stats', [AdminOrderController::class, 'stats']);
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{code}', [AdminOrderController::class, 'show']);
    Route::put('/orders/{code}/status', [AdminOrderController::class, 'updateStatus']);
    Route::get('/retailers', [RetailerController::class, 'index']);
});

/*
| The storefront is a React SPA driven by react-router. Every non-asset GET
| request returns the same shell so deep links (/product/washed-wide-cargo,
| /account/orders, ...) resolve on a hard refresh instead of 404ing. The
| signed-in user rides along so the first paint knows the auth state.
*/
Route::get('/{any?}', function () {
    return view('app', [
        'authUser' => Auth::user()?->publicPayload(),
    ]);
})->where('any', '.*');

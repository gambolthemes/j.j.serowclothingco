<?php

use App\Http\Controllers\Auth\AuthController;
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
| The storefront is a React SPA driven by react-router. Every non-asset GET
| request returns the same shell so deep links (/product/washed-wide-cargo,
| /tracking, ...) resolve on a hard refresh instead of 404ing. The signed-in
| user rides along so the first paint already knows the auth state.
*/
Route::get('/{any?}', function () {
    return view('app', [
        'authUser' => Auth::user()?->only(['id', 'name', 'company', 'email']),
    ]);
})->where('any', '.*');

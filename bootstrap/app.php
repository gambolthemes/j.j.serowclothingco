<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // There is no named `login` route — /login is a react-router page served
        // by the catch-all — so point guests at it explicitly. XHR callers still
        // get a 401 rather than this redirect.
        $middleware->redirectGuestsTo('/login');

        // Binds each session to the password it was created with, so changing a
        // password really does drop the other devices. Without this,
        // Auth::logoutOtherDevices() silently does nothing.
        $middleware->web(append: [
            \Illuminate\Session\Middleware\AuthenticateSession::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
        ]);

        // Razorpay and PayPal post from their own servers and have no session
        // to carry a CSRF token in. They authenticate by signing the request
        // instead, which WebhookController refuses to act without.
        $middleware->validateCsrfTokens(except: ['webhooks/*']);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

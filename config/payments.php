<?php

/*
|--------------------------------------------------------------------------
| Payment gateways
|--------------------------------------------------------------------------
|
| Credentials live here (from .env) rather than in the settings table: they are
| secrets, they differ per environment, and nobody should be able to change how
| money is taken from inside the admin UI. The commercial number that *is* a
| business decision — the USD rate PayPal charges at — is a setting instead.
|
| Either gateway is simply absent until its keys are filled in. Nothing breaks;
| the pay buttons for it just do not appear.
|
*/

return [

    /*
     * Razorpay — the domestic one. UPI, netbanking, cards and wallets, charged
     * in INR, which is what a retailer in Ludhiana or Kochi can actually use.
     */
    'razorpay' => [
        'key' => env('RAZORPAY_KEY_ID'),
        'secret' => env('RAZORPAY_KEY_SECRET'),
        // Set when creating the webhook in the Razorpay dashboard. Without it
        // webhooks are rejected rather than trusted — an unsigned webhook is
        // just an open endpoint for marking orders paid.
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
        'base_url' => 'https://api.razorpay.com',
    ],

    /*
     * PayPal — for buyers outside India only.
     *
     * PayPal stopped handling India-domestic payments in April 2021, and does
     * not settle INR cross-border: an Indian business account receives foreign
     * currency and PayPal converts on payout. So orders are charged in USD at
     * the rate under settings, and this gateway is worth enabling only if there
     * are overseas buyers. Domestic retailers use Razorpay or a bank transfer.
     */
    'paypal' => [
        'client_id' => env('PAYPAL_CLIENT_ID'),
        'secret' => env('PAYPAL_CLIENT_SECRET'),
        // From the dashboard, once the webhook is registered. Signature
        // verification is an API call and needs it.
        'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
        'mode' => env('PAYPAL_MODE', 'sandbox'),
        'currency' => env('PAYPAL_CURRENCY', 'USD'),
        'base_urls' => [
            'sandbox' => 'https://api-m.sandbox.paypal.com',
            'live' => 'https://api-m.paypal.com',
        ],
        // The buyer-facing SDK, which the browser loads.
        'sdk_url' => 'https://www.paypal.com/sdk/js',
    ],

];

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>J.J. SEROW — Wholesale clothing in sets, from Ludhiana</title>
        <meta name="description" content="B2B wholesale clothing. One set is 4 pieces (M, L, XL, XXL). Choose your colours, pay in full, ship in 20 days. Minimum 8 sets. Made in Ludhiana, shipped across India.">

        <link rel="icon" href="/images/mark.svg">

        <script>
            window.__AUTH_USER__ = @json($authUser);
        </script>

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/main.jsx'])
    </head>
    <body class="antialiased">
        <div id="app"></div>
    </body>
</html>

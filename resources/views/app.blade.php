<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Built from the settings so the tab title and the search-result
             snippet cannot drift from what the storefront actually quotes. --}}
        @php
            $terms = $storefront['settings'];
            $city = trim(explode(',', $terms['COMPANY_LOCATION'])[0]);
        @endphp
        <title>J.J. SEROW — Wholesale clothing in sets, from {{ $city }}</title>
        <meta name="description" content="B2B wholesale clothing. One set is {{ $terms['STANDARD_SET_PIECES'] }} pieces (M, L, XL, XXL). Choose your colours, pay in full, ship in {{ $terms['LEAD_DAYS'] }} days. Minimum {{ $terms['MOQ_SETS'] }} sets. Made in {{ $city }}, shipped across India.">

        <link rel="icon" href="/images/mark.svg">

        <script>
            window.__AUTH_USER__ = @json($authUser);
            window.__STOREFRONT__ = @json($storefront);
        </script>

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/main.jsx'])
    </head>
    <body class="antialiased">
        <div id="app"></div>
    </body>
</html>

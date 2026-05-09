<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <!-- SEO & Social Share -->
        <meta name="description" content="VideoCutter Pro - The fastest browser-based video editor for content creators and vloggers. Cut, merge, and split videos with zero server uploads.">
        <meta name="keywords" content="video cutter, video trimmer, online video editor, shorts maker, vlogger tools, content creator, ffmpeg online, mp4 splitter">
        <meta name="author" content="VideoCutter Pro">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="{{ config('app.url') }}">
        <meta property="og:title" content="VideoCutter Pro - Professional Browser Video Editor">
        <meta property="og:description" content="Privacy-first video editing. Your files never leave your device. Perfect for YouTubers, Vloggers, and Shorts creators.">
        <meta property="og:image" content="{{ asset('og-image.jpg') }}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="{{ config('app.url') }}">
        <meta property="twitter:title" content="VideoCutter Pro - Professional Browser Video Editor">
        <meta property="twitter:description" content="Privacy-first video editing. Your files never leave your device. Perfect for YouTubers, Vloggers, and Shorts creators.">
        <meta property="twitter:image" content="{{ asset('og-image.jpg') }}">

        <!-- Favicon -->
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}?v=2">
        <link rel="shortcut icon" href="{{ asset('favicon.ico') }}?v=2">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        <script>
            window.Laravel = {
                csrfToken: '{{ csrf_token() }}'
            };
        </script>
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>

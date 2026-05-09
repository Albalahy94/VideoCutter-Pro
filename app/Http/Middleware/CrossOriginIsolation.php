<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CrossOriginIsolation
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Disabled to allow Google Drive and other third-party integrations
        // $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        // $response->headers->set('Cross-Origin-Embedder-Policy', 'credentialless');

        return $response;
    }
}

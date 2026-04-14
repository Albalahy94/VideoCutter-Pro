<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\AnalyticsLog;
use Jenssegers\Agent\Agent;
use Stevebauman\Location\Facades\Location;
use Symfony\Component\HttpFoundation\Response;

class TrackPageVisits
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        $response = $next($request);
        $endTime = microtime(true);
        $pageLoadTime = (int) (($endTime - $startTime) * 1000); // in milliseconds

        // We do not want to track API requests, internal system paths, or static assets
        if ($request->is('api/*') || 
            $request->is('admin/*') || 
            $request->is('admin') || 
            $request->is('livewire/*') || 
            $request->is('filament/*') || 
            $request->is('_debugbar/*')) {
            return $response;
        }

        try {
            $agent = new Agent();
            
            $deviceType = 'desktop';
            if ($agent->isMobile()) $deviceType = 'mobile';
            elseif ($agent->isTablet()) $deviceType = 'tablet';
            elseif ($agent->isRobot()) $deviceType = 'robot';

            $sessionId = session()->getId();
            
            // 1. OPTIMIZATION: Cache location in session
            $country = session('visitor_country');
            $city = session('visitor_city');
            
            if (!$country && !$city) {
                $ip = $request->ip();
                $locationInfo = Location::get($ip);
                $country = $locationInfo ? $locationInfo->countryName : 'Unknown';
                $city = $locationInfo ? $locationInfo->cityName : 'Unknown';
                
                session(['visitor_country' => $country, 'visitor_city' => $city]);
            }

            // 2. OPTIMIZATION: Cache session start time to avoid DB query for duration
            $sessionStart = session('session_start_time');
            if (!$sessionStart) {
                $sessionStart = now();
                session(['session_start_time' => $sessionStart]);
            }
                
            $duration = now()->diffInSeconds($sessionStart);

            // Exclude common file extensions
            $url = $request->url();
            if (preg_match('/\.(js|css|ico|jpg|jpeg|png|svg|woff|woff2|ttf|eot)$/i', $url)) {
                return $response;
            }

            AnalyticsLog::create([
                'user_id' => auth()->id(),
                'session_id' => $sessionId,
                'ip_address' => $ip,
                'city' => $city,
                'country' => $country,
                'action' => 'page_view',
                'url' => $request->path() === '/' ? 'home' : $request->path(),
                'method' => $request->method(),
                'user_agent' => $request->userAgent(),
                'browser' => $agent->browser(),
                'os' => $agent->platform(),
                'device_type' => $deviceType,
                'referer' => $request->headers->get('referer'),
                'page_load_time' => $pageLoadTime,
                'duration' => $duration,
            ]);
        } catch (\Exception $e) {
            // Silently fail so analytics don't break the application
            \Log::error('Analytics tracking failed: ' . $e->getMessage());
        }

        return $response;
    }
}

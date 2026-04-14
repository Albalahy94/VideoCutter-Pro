<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class RealtimeAnalyticsStats extends BaseWidget
{
    protected ?string $pollingInterval = '15s';
    protected int | string | array $columnSpan = 'full';

    protected function getStats(): array
    {
        return Cache::remember('analytics_realtime_overview', now()->addSeconds(30), function () {
            $last5Minutes = Carbon::now()->subMinutes(5);

            $currentVisitors = AnalyticsLog::where('created_at', '>=', $last5Minutes)
                ->distinct('session_id')
                ->count('session_id');

            $currentPageViews = AnalyticsLog::where('created_at', '>=', $last5Minutes)
                ->count();

            $activeUsers = AnalyticsLog::where('created_at', '>=', $last5Minutes)
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id');

            return [
                Stat::make('Current Visitors (Last 5 mins)', $currentVisitors)
                    ->description('Active visitor sessions')
                    ->descriptionIcon('heroicon-m-users')
                    ->color('success'),
                Stat::make('Current Page Views', $currentPageViews)
                    ->description('Page views in last 5 mins')
                    ->descriptionIcon('heroicon-m-eye')
                    ->color('info'),
                Stat::make('Active Authentic Users', $activeUsers)
                    ->description('Logged in users currently online')
                    ->descriptionIcon('heroicon-m-user-circle')
                    ->color('warning'),
            ];
        });
    }
}

<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;

class BrowserStatsChart extends ChartWidget
{
    protected ?string $heading = 'Browser Statistics';
    protected ?string $maxHeight = '250px';

    protected function getData(): array
    {
        return Cache::remember('analytics_browser_stats', now()->addMinutes(15), function () {
            $data = AnalyticsLog::selectRaw('browser, COUNT(*) as count')
                ->whereNotNull('browser')
                ->groupBy('browser')
                ->orderByDesc('count')
                ->limit(5)
                ->get();

            return [
                'datasets' => [
                    [
                        'label' => 'Browsers',
                        'data' => $data->pluck('count')->toArray(),
                        'backgroundColor' => [
                            '#6366f1', // indigo
                            '#8b5cf6', // violet
                            '#d946ef', // fuchsia
                            '#ec4899', // pink
                            '#f43f5e', // rose
                        ],
                    ],
                ],
                'labels' => $data->pluck('browser')->toArray(),
            ];
        });
    }

    protected function getType(): string
    {
        return 'pie';
    }
}

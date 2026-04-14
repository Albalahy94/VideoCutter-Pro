<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\Cache;

class DeviceStatsChart extends ChartWidget
{
    protected ?string $heading = 'Device Statistics';
    protected ?string $maxHeight = '250px';

    protected function getData(): array
    {
        return Cache::remember('analytics_device_stats', now()->addMinutes(15), function () {
            $data = AnalyticsLog::selectRaw('device_type, COUNT(*) as count')
                ->whereNotNull('device_type')
                ->groupBy('device_type')
                ->get();

            return [
                'datasets' => [
                    [
                        'label' => 'Devices',
                        'data' => $data->pluck('count')->toArray(),
                        'backgroundColor' => [
                            '#3b82f6', // blue
                            '#10b981', // green
                            '#f59e0b', // orange
                            '#ef4444', // red
                        ],
                    ],
                ],
                'labels' => $data->pluck('device_type')->map(fn ($type) => ucfirst($type))->toArray(),
            ];
        });
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}

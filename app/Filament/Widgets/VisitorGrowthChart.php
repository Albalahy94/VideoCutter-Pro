<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;
use Flowframe\Trend\Trend;
use Flowframe\Trend\TrendValue;

use Illuminate\Support\Facades\Cache;

class VisitorGrowthChart extends ChartWidget
{
    protected ?string $heading = 'Visitor Growth';
    protected int | string | array $columnSpan = 'half'; // Smaller span for better layout

    protected function getData(): array
    {
        return Cache::remember('analytics_visitor_growth', now()->addMinutes(15), function () {
            $data = AnalyticsLog::selectRaw('DATE(created_at) as date, COUNT(DISTINCT session_id) as visitors')
                ->where('created_at', '>=', now()->subDays(30))
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            return [
                'datasets' => [
                    [
                        'label' => 'Unique Visitors',
                        'data' => $data->pluck('visitors')->toArray(),
                        'fill' => 'start',
                        'tension' => 0.4,
                        'borderColor' => 'rgb(59, 130, 246)',
                        'backgroundColor' => 'rgba(59, 130, 246, 0.1)',
                    ],
                ],
                'labels' => $data->pluck('date')->map(fn ($date) => Carbon::parse($date)->format('M d'))->toArray(),
            ];
        });
    }

    protected function getType(): string
    {
        return 'line';
    }
}

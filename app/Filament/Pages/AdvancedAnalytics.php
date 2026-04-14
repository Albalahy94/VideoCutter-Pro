<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\BrowserStatsChart;
use App\Filament\Widgets\CountryStatsWidget;
use App\Filament\Widgets\DeviceStatsChart;
use App\Filament\Widgets\RealtimeAnalyticsStats;
use App\Filament\Widgets\SocialMediaStatsWidget;
use App\Filament\Widgets\TopPagesWidget;
use App\Filament\Widgets\TrafficSourcesWidget;
use App\Filament\Widgets\VisitorGrowthChart;
use Filament\Pages\Page;

class AdvancedAnalytics extends Page
{
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-presentation-chart-line';

    protected string $view = 'filament.pages.advanced-analytics';

    protected function getHeaderWidgets(): array
    {
        return [
            RealtimeAnalyticsStats::class,
            TrafficSourcesWidget::class,
            SocialMediaStatsWidget::class,
            VisitorGrowthChart::class,
            DeviceStatsChart::class,
            BrowserStatsChart::class,
            TopPagesWidget::class,
            CountryStatsWidget::class,
        ];
    }

    public function getHeaderWidgetsColumns(): int | array
    {
        return [
            'md' => 2,
            'xl' => 2,
        ];
    }
}

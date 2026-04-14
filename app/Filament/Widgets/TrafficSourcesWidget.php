<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\DB;

class TrafficSourcesWidget extends BaseWidget
{
    protected static ?string $heading = 'Traffic Sources';
    protected int | string | array $columnSpan = 'half';

    public function table(Table $table): Table
    {
        $caseSql = "CASE 
            WHEN referer IS NULL OR referer = '' THEN 'Direct'
            WHEN referer LIKE '%google.com%' OR referer LIKE '%bing.com%' OR referer LIKE '%yahoo.com%' OR referer LIKE '%baidu.com%' THEN 'Search Engines'
            WHEN referer LIKE '%facebook.com%' OR referer LIKE '%youtube.com%' OR referer LIKE '%instagram.com%' OR referer LIKE '%twitter.com%' OR referer LIKE '%x.com%' OR referer LIKE '%t.co%' OR referer LIKE '%linkedin.com%' OR referer LIKE '%tiktok.com%' OR referer LIKE '%whatsapp.com%' OR referer LIKE '%wa.me%' THEN 'Social Media'
            ELSE 'Referral'
        END as source";

        $totalVisits = AnalyticsLog::count();

        return $table
            ->query(
                AnalyticsLog::query()
                    ->select(DB::raw($caseSql), DB::raw('count(*) as count'))
                    ->groupBy('source')
                    ->orderByDesc('count')
            )
            ->columns([
                Tables\Columns\TextColumn::make('source')
                    ->label('Source'),
                Tables\Columns\TextColumn::make('count')
                    ->label('Visits'),
                Tables\Columns\TextColumn::make('percentage')
                    ->label('%')
                    ->state(fn ($record) => $totalVisits > 0 ? round(($record->count / $totalVisits) * 100, 1) . '%' : '0%'),
            ])
            ->paginated(false)
            ->deferLoading();
    }

    public function getTableRecordKey($record): string
    {
        return (string) $record->source;
    }
}

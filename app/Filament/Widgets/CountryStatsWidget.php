<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\DB;

class CountryStatsWidget extends BaseWidget
{
    protected static ?string $heading = 'Countries Statistics';
    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                AnalyticsLog::query()
                    ->select('country', DB::raw('count(*) as views'), DB::raw('count(distinct session_id) as visitors'))
                    ->whereNotNull('country')
                    ->groupBy('country')
                    ->orderByDesc('views')
            )
            ->columns([
                Tables\Columns\TextColumn::make('country')
                    ->label('Country')
                    ->searchable(),
                Tables\Columns\TextColumn::make('views')
                    ->label('Views')
                    ->sortable(),
                Tables\Columns\TextColumn::make('visitors')
                    ->label('Visitors')
                    ->sortable(),
            ])
            ->paginated(false)
            ->deferLoading();
    }

    public function getTableRecordKey($record): string
    {
        return (string) $record->country;
    }
}

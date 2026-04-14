<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\DB;

class TopPagesWidget extends BaseWidget
{
    protected static ?string $heading = 'Top Pages (Last 30 Days)';
    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                AnalyticsLog::query()
                    ->select('url', DB::raw('count(*) as views'))
                    ->where('created_at', '>=', now()->subDays(30))
                    ->whereNotNull('url')
                    ->groupBy('url')
                    ->orderByDesc('views')
            )
            ->columns([
                Tables\Columns\TextColumn::make('url')
                    ->label('Page Path')
                    ->formatStateUsing(fn ($state) => $state === 'home' ? '/' : "/$state"),
                Tables\Columns\TextColumn::make('views')
                    ->label('Views')
                    ->sortable(),
            ])
            ->paginated(false)
            ->deferLoading();
    }

    public function getTableRecordKey($record): string
    {
        return (string) $record->url;
    }
}

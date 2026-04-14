<?php

namespace App\Filament\Resources\Users\RelationManagers;

use App\Filament\Resources\AnalyticsLogs\AnalyticsLogResource;
use Filament\Actions\CreateAction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Table;

use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;

class AnalyticsLogsRelationManager extends RelationManager
{
    protected static string $relationship = 'analyticsLogs';

    protected static ?string $relatedResource = AnalyticsLogResource::class;

    protected static ?string $title = 'User Journey & Activity';

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                IconColumn::make('is_key_event')
                    ->label('Priority')
                    ->boolean()
                    ->state(fn ($record) => in_array($record->action, ['video_cut', 'feedback_submitted']))
                    ->trueIcon('heroicon-m-sparkles')
                    ->trueColor('warning')
                    ->falseIcon('heroicon-m-chevron-right')
                    ->falseColor('gray'),
                TextColumn::make('created_at')
                    ->label('Time')
                    ->since()
                    ->description(fn ($record) => $record->created_at->format('Y-m-d H:i')),
                TextColumn::make('url')
                    ->label('Action/Page')
                    ->formatStateUsing(fn ($state, $record) => $record->action === 'page_view' ? "/$state" : $record->action)
                    ->description(fn ($record) => $record->action === 'page_view' ? 'Visited page' : 'Performed action')
                    ->badge()
                    ->color(fn ($record) => in_array($record->action, ['video_cut', 'feedback_submitted']) ? 'warning' : 'gray'),
                TextColumn::make('country')
                    ->label('Location')
                    ->formatStateUsing(fn ($record) => $record->city ? "{$record->city}, {$record->country}" : $record->country)
                    ->icon('heroicon-m-map-pin'),
            ])
            ->defaultSort('created_at', 'desc')
            ->headerActions([
                //
            ]);
    }
}

<?php

namespace App\Filament\Resources\AnalyticsLogs;

use App\Filament\Resources\AnalyticsLogs\Pages\ManageAnalyticsLogs;
use App\Models\AnalyticsLog;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Filament\Forms\Components\DatePicker;

class AnalyticsLogResource extends Resource
{
    protected static ?string $model = AnalyticsLog::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $recordTitleAttribute = 'id';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('user_id')
                    ->numeric(),
                TextInput::make('session_id'),
                TextInput::make('ip_address'),
                TextInput::make('city'),
                TextInput::make('country'),
                TextInput::make('action')
                    ->required(),
                Textarea::make('details')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                TextColumn::make('user.name')
                    ->label('Customer')
                    ->placeholder('Guest (Anonymous)')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('url')
                    ->label('Page')
                    ->searchable()
                    ->sortable()
                    ->formatStateUsing(fn ($state) => $state === 'home' ? '/' : "/$state")
                    ->description(fn ($record) => $record->method),
                TextColumn::make('action')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'page_view' => 'info',
                        'video_cut' => 'success',
                        'video_loaded' => 'warning',
                        default => 'gray',
                    })
                    ->searchable(),
                TextColumn::make('referer')
                    ->label('Source')
                    ->badge()
                    ->color('gray')
                    ->icon(fn ($state) => match (true) {
                        str_contains($state, 'facebook.com') => 'heroicon-m-share', // Replace with brand icons if available
                        str_contains($state, 'google.com') => 'heroicon-m-magnifying-glass',
                        str_contains($state, 'youtube.com') => 'heroicon-m-play',
                        empty($state) => 'heroicon-m-bolt', // Direct
                        default => 'heroicon-m-link',
                    })
                    ->formatStateUsing(function ($state) {
                        if (empty($state)) return 'Direct';
                        $host = parse_url($state, PHP_URL_HOST);
                        return str_replace(['www.', 'm.', 'l.'], '', $host);
                    })
                    ->searchable(),
                TextColumn::make('country')
                    ->label('Location')
                    ->formatStateUsing(fn ($record) => $record->city ? "{$record->city}, {$record->country}" : $record->country)
                    ->icon('heroicon-m-map-pin')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('device_type')
                    ->label('Device')
                    ->badge()
                    ->icon(fn ($state) => match ($state) {
                        'mobile' => 'heroicon-m-device-phone-mobile',
                        'tablet' => 'heroicon-m-device-tablet',
                        default => 'heroicon-m-computer-desktop',
                    })
                    ->searchable(),
                TextColumn::make('created_at')
                    ->label('Time')
                    ->since()
                    ->sortable(),
            ])
            ->filters([
                Filter::make('created_at')
                    ->form([
                        DatePicker::make('from'),
                        DatePicker::make('until'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['from'], fn ($query, $date) => $query->whereDate('created_at', '>=', $date))
                            ->when($data['until'], fn ($query, $date) => $query->whereDate('created_at', '<=', $date));
                    }),
                SelectFilter::make('action')
                    ->options([
                        'page_view' => 'Page Views',
                        'video_cut' => 'Video Cuts',
                        'video_loaded' => 'Video Loaded',
                    ]),
                SelectFilter::make('device_type')
                    ->options([
                        'desktop' => 'Desktop',
                        'mobile' => 'Mobile',
                        'tablet' => 'Tablet',
                    ]),
                SelectFilter::make('country')
                    ->label('Country')
                    ->searchable()
                    ->options(fn () => \App\Models\AnalyticsLog::query()->whereNotNull('country')->distinct()->pluck('country', 'country')->toArray()),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ManageAnalyticsLogs::route('/'),
        ];
    }
}

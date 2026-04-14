<?php

namespace App\Filament\Resources\Feedback;

use App\Filament\Resources\Feedback\Pages\ManageFeedback;
use App\Models\Feedback;
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

class FeedbackResource extends Resource
{
    protected static ?string $model = Feedback::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    protected static ?string $recordTitleAttribute = 'id';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('user_id')
                    ->numeric(),
                TextInput::make('session_id'),
                TextInput::make('rating')
                    ->numeric(),
                TextInput::make('source'),
                Textarea::make('suggestion')
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
                    ->placeholder('Guest')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('relation')
                    ->label('User Info')
                    ->state(fn ($record) => $record->user?->email)
                    ->description(fn ($record) => $record->session_id)
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('rating')
                    ->label('Satisfaction')
                    ->badge()
                    ->color(fn (int $state): string => match (true) {
                        $state >= 4 => 'success',
                        $state >= 3 => 'warning',
                        default => 'danger',
                    })
                    ->formatStateUsing(fn (int $state): string => match ($state) {
                        5 => '⭐⭐⭐⭐⭐ (Excellent)',
                        4 => '⭐⭐⭐⭐ (Good)',
                        3 => '⭐⭐⭐ (Average)',
                        2 => '⭐⭐ (Poor)',
                        1 => '⭐ (Very Poor)',
                        default => (string) $state,
                    })
                    ->sortable(),
                TextColumn::make('suggestion')
                    ->label('Feedback Content')
                    ->wrap()
                    ->limit(50)
                    ->tooltip(fn ($record) => $record->suggestion)
                    ->searchable(),
                TextColumn::make('source')
                    ->label('Page Source')
                    ->formatStateUsing(function ($state) {
                        if (empty($state)) return 'Direct';
                        $host = parse_url($state, PHP_URL_HOST);
                        $path = parse_url($state, PHP_URL_PATH);
                        return str_replace(['www.', 'm.', 'l.'], '', $host) . $path;
                    })
                    ->badge()
                    ->color('gray')
                    ->toggleable(),
                TextColumn::make('created_at')
                    ->label('Submitted')
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
                SelectFilter::make('rating')
                    ->options([
                        '5' => '⭐⭐⭐⭐⭐ (Excellent)',
                        '4' => '⭐⭐⭐⭐ (Good)',
                        '3' => '⭐⭐⭐ (Average)',
                        '2' => '⭐⭐ (Poor)',
                        '1' => '⭐ (Very Poor)',
                    ]),
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
            'index' => ManageFeedback::route('/'),
        ];
    }
}

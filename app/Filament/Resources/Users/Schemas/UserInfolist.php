<?php

namespace App\Filament\Resources\Users\Schemas;

use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;
use Illuminate\Support\Carbon;

class UserInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('CRM Summary')
                    ->description('Overview of customer engagement')
                    ->columns(3)
                    ->schema([
                        TextEntry::make('user_status')
                            ->label('Customer Status')
                            ->badge()
                            ->color(fn (string $state): string => match ($state) {
                                'new' => 'gray',
                                'active' => 'success',
                                'inactive' => 'danger',
                                'vip' => 'warning',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn (string $state): string => ucfirst($state)),
                        
                        TextEntry::make('last_seen')
                            ->label('Last Activity')
                            ->state(function ($record) {
                                $lastLog = $record->analyticsLogs()->latest()->first();
                                return $lastLog ? Carbon::parse($lastLog->created_at)->diffForHumans() : 'Never';
                            })
                            ->icon('heroicon-m-clock')
                            ->color('info'),

                        TextEntry::make('total_visits')
                            ->label('Total Visits')
                            ->state(function ($record) {
                                return $record->analyticsLogs()->count();
                            })
                            ->icon('heroicon-m-chart-bar')
                            ->color('primary'),
                    ]),

                Section::make('Administrative Notes')
                    ->schema([
                        TextEntry::make('crm_notes')
                            ->label('Internal Remarks')
                            ->placeholder('No internal notes recorded.')
                            ->markdown(),
                    ]),

                Section::make('Account Information')
                    ->columns(2)
                    ->schema([
                        TextEntry::make('name'),
                        TextEntry::make('email')
                            ->label('Email address'),
                        TextEntry::make('phone')
                            ->placeholder('-'),
                        TextEntry::make('created_at')
                            ->label('Joined Date')
                            ->dateTime(),
                    ]),
            ]);
    }
}

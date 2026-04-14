<?php

namespace App\Filament\Resources\AnalyticsLogs\Pages;

use App\Filament\Resources\AnalyticsLogs\AnalyticsLogResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords;

class ManageAnalyticsLogs extends ManageRecords
{
    protected static string $resource = AnalyticsLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}

<?php

namespace App\Filament\Widgets;

use App\Models\AnalyticsLog;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class SocialMediaStatsWidget extends BaseWidget
{
    protected static ?string $heading = 'Social Media Platforms';
    protected int | string | array $columnSpan = 'half';

    public function table(Table $table): Table
    {
        // Define social patterns
        $socialPatterns = [
            'Facebook' => '%facebook.com%',
            'YouTube' => '%youtube.com%',
            'WhatsApp' => ['%whatsapp.com%', '%wa.me%'],
            'Instagram' => '%instagram.com%',
            'Twitter/X' => ['%twitter.com%', '%x.com%', '%t.co%'],
            'LinkedIn' => '%linkedin.com%',
            'TikTok' => '%tiktok.com%',
        ];

        // Logic to group referers by social platform
        // This is tricky with raw SQL but we can do a query and then group in PHP 
        // OR use a CASE statement in SQL.
        
        $caseSql = "CASE ";
        foreach ($socialPatterns as $name => $patterns) {
            if (is_array($patterns)) {
                foreach ($patterns as $pattern) {
                    $caseSql .= "WHEN referer LIKE '$pattern' THEN '$name' ";
                }
            } else {
                $caseSql .= "WHEN referer LIKE '$patterns' THEN '$name' ";
            }
        }
        $caseSql .= "ELSE NULL END as platform";

        $totalSocialVisitsScope = function($query) use ($socialPatterns) {
            foreach ($socialPatterns as $patterns) {
                if (is_array($patterns)) {
                    foreach ($patterns as $pattern) {
                        $query->orWhere('referer', 'like', $pattern);
                    }
                } else {
                    $query->orWhere('referer', 'like', $socialPatterns); // Fixed typo here too
                }
            }
        };

        $totalSocialVisits = Cache::remember('analytics_total_social_count', now()->addMinutes(15), function() use ($socialPatterns) {
            return AnalyticsLog::where(function($query) use ($socialPatterns) {
                foreach ($socialPatterns as $patterns) {
                    if (is_array($patterns)) {
                        foreach ($patterns as $pattern) {
                            $query->orWhere('referer', 'like', $pattern);
                        }
                    } else {
                        $query->orWhere('referer', 'like', $patterns);
                    }
                }
            })->count();
        });

        return $table
            ->query(
                AnalyticsLog::query()
                    ->select(DB::raw($caseSql), DB::raw('count(*) as count'))
                    ->whereNotNull('referer')
                    ->havingNotNull('platform')
                    ->groupBy('platform')
                    ->orderByDesc('count')
            )
            ->columns([
                Tables\Columns\TextColumn::make('platform')
                    ->label('Platform'),
                Tables\Columns\TextColumn::make('count')
                    ->label('Visits'),
                Tables\Columns\TextColumn::make('percentage')
                    ->label('%')
                    ->state(fn ($record) => $totalSocialVisits > 0 ? round(($record->count / $totalSocialVisits) * 100, 1) . '%' : '0%'),
            ])
            ->paginated(false)
            ->deferLoading();
    }

    public function getTableRecordKey($record): string
    {
        return (string) $record->platform;
    }
}

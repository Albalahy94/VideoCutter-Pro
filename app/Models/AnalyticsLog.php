<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalyticsLog extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'ip_address',
        'city',
        'country',
        'action',
        'details',
        'url',
        'method',
        'user_agent',
        'browser',
        'os',
        'device_type',
        'referer',
        'page_load_time',
        'duration',
    ];

    protected $casts = [
        'details' => 'array',
    ];
}

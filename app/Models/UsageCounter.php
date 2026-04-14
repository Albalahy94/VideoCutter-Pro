<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UsageCounter extends Model
{
    protected $fillable = [
        'identifier',
        'cut_count',
        'survey_completed',
    ];
}

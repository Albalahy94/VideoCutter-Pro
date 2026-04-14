<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'rating',
        'source',
        'suggestion',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

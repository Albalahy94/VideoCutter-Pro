<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsLog;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function log(Request $request)
    {
        $request->validate([
            'action' => 'required|string',
            'details' => 'nullable|array',
        ]);

        AnalyticsLog::create([
            'user_id' => auth()->id(),
            'session_id' => $request->session()->getId(),
            'ip_address' => $request->ip(),
            'action' => $request->action,
            'details' => $request->details,
        ]);

        return response()->json(['status' => 'ok']);
    }
}

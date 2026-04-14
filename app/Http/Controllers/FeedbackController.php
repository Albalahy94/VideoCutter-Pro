<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use App\Models\UsageCounter;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    /**
     * Check if user needs to fill the survey (after 3 cuts)
     */
    public function checkStatus(Request $request)
    {
        $identifier = auth()->id() ?? $request->session()->getId();
        $counter = UsageCounter::where('identifier', $identifier)->first();

        $needsSurvey = false;
        if ($counter && $counter->cut_count >= 3 && !$counter->survey_completed) {
            $needsSurvey = true;
        }

        return response()->json([
            'cut_count' => $counter ? $counter->cut_count : 0,
            'needs_survey' => $needsSurvey
        ]);
    }

    /**
     * Store survey results
     */
    public function store(Request $request)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'source' => 'nullable|string',
            'suggestion' => 'nullable|string',
        ]);

        $identifier = auth()->id() ?? $request->session()->getId();

        Feedback::create([
            'user_id' => auth()->id(),
            'session_id' => $request->session()->getId(),
            'rating' => $request->rating,
            'source' => $request->source,
            'suggestion' => $request->suggestion,
        ]);

        // Mark survey as completed
        UsageCounter::updateOrCreate(
            ['identifier' => $identifier],
            ['survey_completed' => true]
        );

        return response()->json(['status' => 'ok']);
    }

    /**
     * Increment usage counter
     */
    public function increment(Request $request)
    {
        $identifier = auth()->id() ?? $request->session()->getId();
        $counter = UsageCounter::firstOrCreate(['identifier' => $identifier]);
        $counter->increment('cut_count');

        return response()->json(['cut_count' => $counter->cut_count]);
    }
}

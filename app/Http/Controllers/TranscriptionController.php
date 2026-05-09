<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TranscriptionController extends Controller
{
    public function transcribe(Request $request)
    {
        $request->validate([
            'audio' => 'required|file|max:102400', // 100MB max
        ]);

        $file = $request->file('audio');
        $fileSize = $file->getSize();
        Log::info('Transcription request received', ['size' => $fileSize, 'mime' => $file->getMimeType()]);

        $base64Data = base64_encode(file_get_contents($file->getRealPath()));
        $mimeType = $file->getMimeType();

        $apiKey = env('GEMINI_API_KEY');
        
        if (!$apiKey) {
            Log::error('Gemini API Key missing');
            return response()->json(['error' => 'Gemini API Key not configured'], 500);
        }

        try {
            $prompt = "You are a highly precise, expert transcriptionist. Transcribe EVERY SINGLE WORD from the attached audio exactly as spoken.
            DO NOT summarize. DO NOT skip any sentences, phrases, or filler words. You must provide a 100% complete, word-for-word transcript.
            The output MUST be a JSON array of objects, where each object has 'start' (number, seconds), 'end' (number, seconds), and 'text' (string). 
            - Ensure timings ('start' and 'end') are extremely precise and cover the ENTIRE duration of the audio from 0:00 to the very end.
            - Break the text into readable segments suitable for subtitles (approx 3-7 words per segment). 
            - Output the text in the exact language spoken in the audio.
            - IT IS CRITICAL THAT NO WORDS ARE DROPPED.
            Respond ONLY with the raw JSON array, no markdown markers like ```json.";

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$apiKey}", [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inline_data' => [
                                    'mime_type' => $mimeType,
                                    'data' => $base64Data
                                ]
                            ]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'response_mime_type' => 'application/json',
                ]
            ]);

            if ($response->failed()) {
                Log::error('Gemini API Error', ['response' => $response->body()]);
                return response()->json(['error' => 'Failed to connect to Gemini API'], 502);
            }

            $data = $response->json();
            $textResponse = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            
            if (!$textResponse) {
                Log::error('Empty response from Gemini', ['data' => $data]);
                return response()->json(['error' => 'Gemini returned an empty response'], 500);
            }
            // Sometimes Gemini wraps it in code blocks even if told not to
            $cleanJson = preg_replace('/^```json\s*|```$/m', '', $textResponse);
            $segments = json_decode($cleanJson, true);

            if (!is_array($segments)) {
                Log::error('Invalid JSON from Gemini', ['response' => $textResponse]);
                return response()->json(['error' => 'Invalid transcription format received'], 500);
            }

            return response()->json($segments);

        } catch (\Exception $e) {
            Log::error('Transcription Exception', ['message' => $e->getMessage()]);
            return response()->json(['error' => 'Internal server error during transcription'], 500);
        }
    }
}

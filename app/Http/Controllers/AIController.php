<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIController extends Controller
{
    /**
     * Proxy request to Gemini API to avoid CORS and COEP issues.
     */
    public function analyze(Request $request)
    {
        $apiKey = env('GEMINI_API_KEY');
        
        if (!$apiKey) {
            $apiKey = env('VITE_GEMINI_API_KEY');
        }

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' . $apiKey;

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])
            ->timeout(60)
            ->post($url, $request->all());

            if ($response->failed()) {
                $errorData = $response->json();
                $statusCode = $response->status();
                $rawMessage = $errorData['error']['message'] ?? '';
                
                // User-friendly error mapping
                $friendlyMessage = match(true) {
                    $statusCode === 429 => 'لقد تجاوزت عدد الطلبات المسموح بها حالياً. يرجى الانتظار دقيقة واحدة ثم المحاولة مرة أخرى.',
                    $statusCode === 403 && str_contains($rawMessage, 'blocked') => 'الخدمة محظورة حالياً. يرجى التأكد من تفعيل "Generative Language API" في إعدادات جوجل.',
                    $statusCode === 403 && str_contains($rawMessage, 'location') => 'عذراً، خدمة Gemini غير متوفرة في موقعك الجغرافي حالياً.',
                    $statusCode === 400 && str_contains($rawMessage, 'API key') => 'خطأ في تهيئة النظام: مفتاح الـ API المستخدم غير صالح.',
                    $statusCode >= 500 => 'حدث خطأ في خوادم جوجل الذكية. يرجى المحاولة بعد قليل.',
                    default => 'فشل تحليل الفيديو: ' . ($rawMessage ?: 'خطأ غير معروف')
                };

                Log::error('Gemini API Proxy Error', [
                    'status' => $statusCode,
                    'friendly_message' => $friendlyMessage,
                    'raw_body' => $errorData
                ]);

                return response()->json([
                    'error' => [
                        'message' => $friendlyMessage,
                        'code' => $statusCode,
                        'original_error' => $rawMessage
                    ]
                ], $statusCode);
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Gemini API Proxy Exception', ['message' => $e->getMessage()]);
            return response()->json([
                'error' => [
                    'message' => 'Server error while calling Gemini API: ' . $e->getMessage()
                ]
            ], 500);
        }
    }
}

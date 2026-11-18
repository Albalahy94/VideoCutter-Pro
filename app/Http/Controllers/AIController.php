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

    /**
     * Separate vocals from music/instruments using AI model (Ultimate Vocal Remover / MDX-Net).
     */
    public function separateAudio(Request $request)
    {
        // Increase time limit for AI model processing (Demucs v4 4-stem deep separation)
        set_time_limit(600);

        $request->validate([
            'audio' => 'required|file|max:153600', // 150MB max
            'stem' => 'nullable|string|in:vocals,instrumental,both',
            'model' => 'nullable|string'
        ]);

        $stem = $request->input('stem', 'vocals');
        $model = $request->input('model', ($stem === 'vocals' ? 'htdemucs_ft.yaml' : 'UVR-MDX-NET-Inst_HQ_3.onnx'));
        $file = $request->file('audio');

        $sessionDir = storage_path('app/ai_separation/' . uniqid('sep_', true));
        if (!file_exists($sessionDir)) {
            mkdir($sessionDir, 0775, true);
        }

        $originalExtension = $file->getClientOriginalExtension() ?: 'wav';
        $inputPath = $sessionDir . DIRECTORY_SEPARATOR . 'input.' . $originalExtension;
        $file->move($sessionDir, 'input.' . $originalExtension);

        $outputDir = $sessionDir . DIRECTORY_SEPARATOR . 'output';
        mkdir($outputDir, 0775, true);

        // Find Python executable in venv or system
        $pythonCandidates = [
            base_path('venv/bin/python'),
            '/var/www/videocutterpro/venv/bin/python',
            base_path('venv/Scripts/python.exe'),
            'python3',
            'python'
        ];

        $pythonBin = 'python3';
        foreach ($pythonCandidates as $candidate) {
            if (str_starts_with($candidate, '/') || str_contains($candidate, ':\\')) {
                if (file_exists($candidate)) {
                    $pythonBin = $candidate;
                    break;
                }
            }
        }

        $scriptPath = base_path('scripts/separate_audio.py');
        if (!file_exists($scriptPath)) {
            $scriptPath = '/var/www/videocutterpro/scripts/separate_audio.py';
        }

        if (!file_exists($scriptPath)) {
            Log::error('Audio separator script not found', ['path' => $scriptPath]);
            return response()->json(['error' => 'AI separation script not found on server.'], 500);
        }

        $escapedInput = escapeshellarg($inputPath);
        $escapedOutput = escapeshellarg($outputDir);
        $escapedStem = escapeshellarg($stem);
        $escapedModel = escapeshellarg($model);
        putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
        $command = "{$pythonBin} " . escapeshellarg($scriptPath) . " --input {$escapedInput} --output_dir {$escapedOutput} --stem {$escapedStem} --model {$escapedModel} 2>&1";

        Log::info('Starting AI audio separation', ['command' => $command]);

        $output = [];
        $returnVar = 0;
        exec($command, $output, $returnVar);

        $outputString = implode("\n", $output);
        Log::info('AI separation process finished', ['exitCode' => $returnVar, 'output' => $outputString]);

        // Find json in output
        $jsonStart = strpos($outputString, '{');
        $jsonEnd = strrpos($outputString, '}');

        if ($jsonStart === false || $jsonEnd === false) {
            Log::error('AI separation produced no JSON output', ['raw' => $outputString]);
            return response()->json([
                'error' => 'فشل معالجة الصوت بالذكاء الاصطناعي على السيرفر.',
                'details' => $outputString
            ], 500);
        }

        $jsonStr = substr($outputString, $jsonStart, $jsonEnd - $jsonStart + 1);
        $result = json_decode($jsonStr, true);

        if (!$result || empty($result['success'])) {
            $errMsg = $result['error'] ?? 'حدث خطأ أثناء فصل مسارات الصوت.';
            Log::error('AI separation failed', ['error' => $errMsg, 'raw' => $outputString]);
            return response()->json(['error' => $errMsg], 500);
        }

        // Determine target file to return
        $targetFile = null;
        if ($stem === 'vocals') {
            $targetFile = $result['vocals'] ?? null;
        } elseif ($stem === 'instrumental') {
            $targetFile = $result['instrumental'] ?? null;
        }

        if (!$targetFile || !file_exists($targetFile)) {
            // Fallback to first generated file if any
            $allOutputs = $result['all_outputs'] ?? [];
            if (!empty($allOutputs) && file_exists($allOutputs[0])) {
                $targetFile = $allOutputs[0];
            }
        }

        if (!$targetFile || !file_exists($targetFile)) {
            return response()->json(['error' => 'لم يتم العثور على المسار المعزول الناتج.'], 500);
        }

        // Return the clean audio file
        return response()->download($targetFile, basename($targetFile), [
            'Content-Type' => 'audio/wav',
            'Access-Control-Allow-Origin' => '*',
            'Cross-Origin-Resource-Policy' => 'cross-origin'
        ]);
    }

    /**
     * Start an asynchronous background AI separation job.
     * Returns job_id immediately so the browser never experiences HTTP timeouts.
     */
    public function startAsyncSeparation(Request $request)
    {
        $request->validate([
            'audio' => 'required|file|max:204800', // 200MB max
            'stem' => 'nullable|string|in:vocals,instrumental,both',
            'model' => 'nullable|string'
        ]);

        $stem = $request->input('stem', 'vocals');
        $model = $request->input('model', 'UVR-MDX-NET-Inst_HQ_3.onnx');
        $file = $request->file('audio');

        $jobId = 'job_' . bin2hex(random_bytes(8));
        $jobDir = storage_path('app/ai_jobs/' . $jobId);
        if (!file_exists($jobDir)) {
            mkdir($jobDir, 0775, true);
        }

        $extension = $file->getClientOriginalExtension() ?: 'wav';
        $file->move($jobDir, 'input.' . $extension);

        $statusData = [
            'job_id' => $jobId,
            'status' => 'processing',
            'progress' => 5,
            'step' => 'تم استلام الملف وجاري بدء المعالجة في السيرفر...',
            'error' => null,
            'output_file' => null,
            'created_at' => time(),
            'updated_at' => time()
        ];
        file_put_contents($jobDir . '/status.json', json_encode($statusData, JSON_UNESCAPED_UNICODE));

        // Locate python
        $pythonCandidates = [
            base_path('venv/bin/python'),
            '/var/www/videocutterpro/venv/bin/python',
            'python3'
        ];
        $pythonBin = 'python3';
        foreach ($pythonCandidates as $cand) {
            if (file_exists($cand)) {
                $pythonBin = $cand;
                break;
            }
        }

        $scriptPath = base_path('scripts/process_job.py');
        if (!file_exists($scriptPath)) {
            $scriptPath = '/var/www/videocutterpro/scripts/process_job.py';
        }

        $escapedJobDir = escapeshellarg($jobDir);
        $escapedStem = escapeshellarg($stem);
        $escapedModel = escapeshellarg($model);
        $logFile = escapeshellarg($jobDir . '/worker.log');

        $cmd = "nohup {$pythonBin} " . escapeshellarg($scriptPath) . " --job_dir {$escapedJobDir} --stem {$escapedStem} --model {$escapedModel} > {$logFile} 2>&1 &";

        Log::info('Dispatching async AI separation job', ['job_id' => $jobId, 'cmd' => $cmd]);
        putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
        exec($cmd);

        return response()->json([
            'success' => true,
            'job_id' => $jobId,
            'status' => 'processing'
        ]);
    }

    /**
     * Poll status of an async AI separation job.
     */
    public function getJobStatus($jobId)
    {
        $jobId = basename($jobId);
        $jobDir = storage_path('app/ai_jobs/' . $jobId);
        $statusFile = $jobDir . '/status.json';

        if (!file_exists($statusFile)) {
            return response()->json(['status' => 'not_found'], 404);
        }

        $content = file_get_contents($statusFile);
        $data = json_decode($content, true);

        if (!$data) {
            return response()->json(['status' => 'processing', 'progress' => 10]);
        }

        // Watchdog: If status is processing, ensure worker PID is alive
        if (($data['status'] ?? '') === 'processing') {
            $pid = $data['pid'] ?? null;
            if ($pid && !file_exists("/proc/{$pid}")) {
                // If it died, check if clean_vocals was already generated
                $wavExists = file_exists($jobDir . '/clean_vocals.wav');
                $m4aExists = file_exists($jobDir . '/clean_vocals.m4a');
                if ($m4aExists || $wavExists) {
                    $data['status'] = 'completed';
                    $data['progress'] = 100;
                    $data['output_file'] = $m4aExists ? 'clean_vocals.m4a' : 'clean_vocals.wav';
                    $data['step'] = 'اكتمل عزل الصوت ومسح الموسيقى والدف بنجاح!';
                } else {
                    $data['status'] = 'failed';
                    $data['error'] = 'توقف محرك المعالجة في السيرفر بشكل مفاجئ.';
                }
                file_put_contents($statusFile, json_encode($data, JSON_UNESCAPED_UNICODE));
            }
        }

        return response()->json($data);
    }

    /**
     * Download completed clean stem for an async AI job.
     */
    public function downloadJobOutput($jobId)
    {
        $jobId = basename($jobId);
        $jobDir = storage_path('app/ai_jobs/' . $jobId);
        $statusFile = $jobDir . '/status.json';

        if (!file_exists($statusFile)) {
            abort(404, 'Job not found');
        }

        $data = json_decode(file_get_contents($statusFile), true);
        if (($data['status'] ?? '') !== 'completed') {
            abort(400, 'Job not completed yet');
        }

        $outputFileName = $data['output_file'] ?? 'clean_vocals.wav';
        $outputPath = $jobDir . '/' . $outputFileName;

        if (!file_exists($outputPath)) {
            abort(404, 'Clean audio file not found on server');
        }

        $fileSize = filesize($outputPath);
        $mimeType = str_ends_with($outputFileName, '.m4a') ? 'audio/mp4' : 'application/octet-stream';

        // Serve directly via Nginx X-Accel-Redirect (zero-copy, kernel sendfile, non-blocking)
        // CRITICAL: Use Content-Disposition: inline and POST support to prevent download managers (IDM/FDM) from hijacking stream
        return response('', 200, [
            'Content-Type' => $mimeType,
            'Content-Length' => (string) $fileSize,
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options' => 'nosniff',
            'X-Accel-Redirect' => '/ai-storage-internal/' . $jobId . '/' . $outputFileName,
            'Access-Control-Allow-Origin' => '*',
            'Cross-Origin-Resource-Policy' => 'cross-origin'
        ]);
    }
}

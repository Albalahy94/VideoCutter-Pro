<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VideoImportController extends Controller
{
    /**
     * Get Python binary path.
     */
    private function getPythonBin(): string
    {
        $pythonCandidates = [
            base_path('venv/bin/python'),
            '/var/www/videocutterpro/venv/bin/python',
            base_path('venv/Scripts/python.exe'),
            'python3',
            'python'
        ];

        foreach ($pythonCandidates as $cand) {
            if (str_starts_with($cand, '/') || str_contains($cand, ':\\')) {
                if (file_exists($cand)) {
                    return $cand;
                }
            }
        }

        return 'python3';
    }

    /**
     * Quick fetch video metadata (title, duration, thumbnail, author) before download.
     */
    public function fetchInfo(Request $request)
    {
        $request->validate([
            'url' => 'required|string|url'
        ]);

        $url = trim($request->input('url'));
        $pythonBin = $this->getPythonBin();

        // Extract metadata using yt-dlp dump-json without stderr warnings interfering with JSON
        $escapedUrl = escapeshellarg($url);
        $cmd = "{$pythonBin} -m yt_dlp --dump-single-json --no-playlist --skip-download --no-warnings {$escapedUrl} 2>/dev/null";

        $output = [];
        $exitCode = 0;
        putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
        exec($cmd, $output, $exitCode);

        $rawOutput = trim(implode("\n", $output));
        $firstBrace = strpos($rawOutput, '{');
        $lastBrace = strrpos($rawOutput, '}');
        if ($firstBrace !== false && $lastBrace !== false) {
            $rawOutput = substr($rawOutput, $firstBrace, $lastBrace - $firstBrace + 1);
        }
        $data = json_decode($rawOutput, true);

        if (!$data || !is_array($data)) {
            // Check for known error indicators
            $errorMsg = 'تعذر استخراج بيانات الفيديو من الرابط. يرجى التأكد من أن الرابط عام وصحيح.';
            if (str_contains($rawOutput, 'Private video')) {
                $errorMsg = 'هذا الفيديو خاص ولا يمكن استيراده.';
            } elseif (str_contains($rawOutput, 'Unsupported URL')) {
                $errorMsg = 'رابط الفيديو غير مدعوم حالياً.';
            }

            Log::warning('Video fetchInfo failed', ['url' => $url, 'raw' => substr($rawOutput, 0, 500)]);

            return response()->json([
                'success' => false,
                'error' => $errorMsg
            ], 422);
        }

        $durationSec = $data['duration'] ?? 0;
        $minutes = floor($durationSec / 60);
        $seconds = $durationSec % 60;
        $formattedDuration = sprintf('%02d:%02d', $minutes, $seconds);

        // Detect platform
        $extractor = strtolower($data['extractor_key'] ?? $data['extractor'] ?? '');
        $platform = match (true) {
            str_contains($extractor, 'youtube') => 'YouTube',
            str_contains($extractor, 'tiktok') => 'TikTok',
            str_contains($extractor, 'facebook') => 'Facebook',
            str_contains($extractor, 'instagram') => 'Instagram',
            str_contains($extractor, 'twitter') => 'X / Twitter',
            default => 'Web Video'
        };

        return response()->json([
            'success' => true,
            'title' => $data['title'] ?? 'مقطع فيديو',
            'duration' => $durationSec,
            'duration_formatted' => $formattedDuration,
            'thumbnail' => $data['thumbnail'] ?? null,
            'uploader' => $data['uploader'] ?? $data['channel'] ?? '',
            'platform' => $platform
        ]);
    }

    /**
     * Start async video download job.
     */
    public function startDownload(Request $request)
    {
        $request->validate([
            'url' => 'required|string|url',
            'quality' => 'nullable|string|in:auto,1080p,720p,480p,audio'
        ]);

        $url = trim($request->input('url'));
        $quality = $request->input('quality', 'auto');

        $jobId = 'import_' . bin2hex(random_bytes(8));
        $jobDir = storage_path('app/ai_jobs/imports/' . $jobId);

        if (!file_exists($jobDir)) {
            mkdir($jobDir, 0775, true);
        }

        $statusData = [
            'job_id' => $jobId,
            'status' => 'downloading',
            'progress' => 5,
            'step' => 'تم استلام الرابط، جاري بدء الاتصال بالمنصة...',
            'error' => null,
            'output_file' => null,
            'created_at' => time(),
            'updated_at' => time()
        ];
        file_put_contents($jobDir . '/status.json', json_encode($statusData, JSON_UNESCAPED_UNICODE));

        $pythonBin = $this->getPythonBin();
        $scriptPath = base_path('scripts/download_url_job.py');
        if (!file_exists($scriptPath)) {
            $scriptPath = '/var/www/videocutterpro/scripts/download_url_job.py';
        }

        $escapedJobDir = escapeshellarg($jobDir);
        $escapedUrl = escapeshellarg($url);
        $escapedQuality = escapeshellarg($quality);
        $logFile = escapeshellarg($jobDir . '/download.log');

        $cmd = "nohup {$pythonBin} " . escapeshellarg($scriptPath) . " --job_dir {$escapedJobDir} --url {$escapedUrl} --quality {$escapedQuality} > {$logFile} 2>&1 &";

        Log::info('Dispatched async video URL download job', ['job_id' => $jobId, 'url' => $url, 'cmd' => $cmd]);
        putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
        exec($cmd);

        return response()->json([
            'success' => true,
            'job_id' => $jobId,
            'status' => 'downloading'
        ]);
    }

    /**
     * Get real-time status of async download job.
     */
    public function getStatus($jobId)
    {
        $jobId = basename($jobId);
        $jobDir = storage_path('app/ai_jobs/imports/' . $jobId);
        $statusFile = $jobDir . '/status.json';

        if (!file_exists($statusFile)) {
            return response()->json(['status' => 'not_found'], 404);
        }

        $content = file_get_contents($statusFile);
        $data = json_decode($content, true);

        if (!$data) {
            return response()->json(['status' => 'downloading', 'progress' => 10]);
        }

        // Watchdog: If status is still active, verify worker process is alive
        if (in_array($data['status'] ?? '', ['downloading', 'processing'])) {
            $pid = $data['pid'] ?? null;
            if ($pid && !file_exists("/proc/{$pid}")) {
                // Check if output file was generated before process ended
                $outputFile = $data['output_file'] ?? null;
                if ($outputFile && file_exists($jobDir . '/' . $outputFile)) {
                    $data['status'] = 'completed';
                    $data['progress'] = 100;
                    $data['step'] = 'اكتمل استيراد الفيديو بنجاح!';
                } else {
                    // Check if any video file was created
                    $files = glob($jobDir . '/*.mp4');
                    if (!empty($files)) {
                        $data['status'] = 'completed';
                        $data['progress'] = 100;
                        $data['output_file'] = basename($files[0]);
                        $data['step'] = 'اكتمل استيراد الفيديو بنجاح!';
                    } else {
                        $data['status'] = 'failed';
                        $data['error'] = 'انقطع اتصال التحميل في السيرفر بشكل غير متوقع.';
                    }
                }
                file_put_contents($statusFile, json_encode($data, JSON_UNESCAPED_UNICODE));
            }
        }

        return response()->json($data);
    }

    /**
     * Download completed video directly to the editor via X-Accel-Redirect.
     */
    public function downloadFile($jobId)
    {
        $jobId = basename($jobId);
        $jobDir = storage_path('app/ai_jobs/imports/' . $jobId);
        $statusFile = $jobDir . '/status.json';

        if (!file_exists($statusFile)) {
            abort(404, 'Job not found');
        }

        $data = json_decode(file_get_contents($statusFile), true);
        if (($data['status'] ?? '') !== 'completed') {
            abort(400, 'Video import is not completed yet');
        }

        $outputFileName = $data['output_file'] ?? null;
        if (!$outputFileName) {
            $files = glob($jobDir . '/*.{mp4,m4a,webm}', GLOB_BRACE);
            if (!empty($files)) {
                $outputFileName = basename($files[0]);
            }
        }

        if (!$outputFileName || !file_exists($jobDir . '/' . $outputFileName)) {
            abort(404, 'Imported video file not found on server');
        }

        $filePath = $jobDir . '/' . $outputFileName;
        $mime = str_ends_with($outputFileName, '.m4a') ? 'audio/mp4' : 'video/mp4';
        $fileSize = filesize($filePath);

        // Serve directly via Nginx X-Accel-Redirect (zero-copy kernel sendfile)
        return response('', 200, [
            'Content-Type' => $mime,
            'Content-Length' => (string) $fileSize,
            'Content-Disposition' => 'attachment; filename="' . rawurlencode($outputFileName) . '"',
            'X-Accel-Redirect' => '/ai-storage-internal/imports/' . $jobId . '/' . $outputFileName,
            'Access-Control-Allow-Origin' => '*',
            'Cross-Origin-Resource-Policy' => 'cross-origin',
            'Accept-Ranges' => 'bytes',
        ]);
    }
}

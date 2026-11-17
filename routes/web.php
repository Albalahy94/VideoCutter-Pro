<?php

use App\Http\Controllers\BlogController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $posts = \App\Models\Post::where('is_published', true)
        ->orderBy('published_at', 'desc')
        ->limit(6)
        ->get();

    return Inertia::render('Welcome', [
        'posts' => $posts,
        'auth' => [
            'user' => auth()->user()
        ]
    ]);
});

Route::get('/editor', function () {
    return Inertia::render('Editor');
})->name('editor');

Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('/blog/{slug}', [BlogController::class, 'show'])->name('blog.show');

// Analytics & Feedback
Route::post('/api/analytics', [App\Http\Controllers\AnalyticsController::class, 'log']);
Route::get('/api/usage/status', [App\Http\Controllers\FeedbackController::class, 'checkStatus']);
Route::post('/api/usage/increment', [App\Http\Controllers\FeedbackController::class, 'increment']);
Route::post('/api/usage/feedback', [App\Http\Controllers\FeedbackController::class, 'store']);
Route::post('/api/transcribe', [App\Http\Controllers\TranscriptionController::class, 'transcribe']);
Route::post('/api/ai/analyze', [App\Http\Controllers\AIController::class, 'analyze']);
Route::post('/api/ai/separate-audio', [App\Http\Controllers\AIController::class, 'separateAudio']);
Route::post('/api/ai/separate-audio-async', [App\Http\Controllers\AIController::class, 'startAsyncSeparation']);
Route::get('/api/ai/job-status/{jobId}', [App\Http\Controllers\AIController::class, 'getJobStatus']);
Route::get('/api/ai/job-download/{jobId}', [App\Http\Controllers\AIController::class, 'downloadJobOutput']);

// Video URL Import (YouTube, TikTok, Facebook, Instagram, Twitter/X, etc.)
Route::post('/api/video/import-info', [App\Http\Controllers\VideoImportController::class, 'fetchInfo']);
Route::post('/api/video/import-start', [App\Http\Controllers\VideoImportController::class, 'startDownload']);
Route::get('/api/video/import-status/{jobId}', [App\Http\Controllers\VideoImportController::class, 'getStatus']);
Route::get('/api/video/import-download/{jobId}', [App\Http\Controllers\VideoImportController::class, 'downloadFile']);
Route::post('/api/video/import-cleanup/{jobId}', [App\Http\Controllers\VideoImportController::class, 'cleanupJob']);

// Socialite - Google Login
Route::get('/auth/google/redirect', [App\Http\Controllers\Auth\SocialiteController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [App\Http\Controllers\Auth\SocialiteController::class, 'callback'])->name('google.callback');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// FFmpeg Asset Proxy - Solves MIME type and COEP/CORP issues on local/hosting
Route::get('/ffmpeg-proxy/{type}/{file}', function ($type, $file) {
    $path = public_path("ffmpeg-assets/{$type}/{$file}");
    if (!file_exists($path)) {
        return response()->json(['error' => 'Asset not found', 'path' => $path], 404);
    }
    
    $mime = str_ends_with($file, '.js') ? 'application/javascript' : 
           (str_ends_with($file, '.wasm') ? 'application/wasm' : 'application/octet-stream');
    
    // Force raw content delivery to guarantee MIME types bypass server overrides
    return response(file_get_contents($path), 200, [
        'Content-Type' => $mime,
        'Access-Control-Allow-Origin' => '*',
        'Cross-Origin-Resource-Policy' => 'cross-origin',
        'Cross-Origin-Embedder-Policy' => 'require-corp',
        'Cache-Control' => 'public, max-age=31536000'
    ]);
});

require __DIR__.'/auth.php';

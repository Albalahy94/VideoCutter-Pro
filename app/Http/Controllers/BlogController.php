<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        $posts = Post::where('is_published', true)
            ->orderBy('published_at', 'desc')
            ->paginate(10);

        return Inertia::render('Blog/Index', [
            'posts' => $posts,
            'auth' => [
                'user' => $request->user()
            ]
        ]);
    }

    public function show(Request $request, $slug)
    {
        $post = Post::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        $post->increment('view_count');

        return Inertia::render('Blog/Show', [
            'post' => $post,
            'auth' => [
                'user' => $request->user()
            ]
        ]);
    }
}

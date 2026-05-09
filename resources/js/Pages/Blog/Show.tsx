import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Header } from '../../Components/VideoCutter/Header';
import { Footer } from '../../Components/VideoCutter/Footer';
import { useLanguage } from '../../Hooks/useLanguage';
import { Calendar, Clock, ChevronLeft, ChevronRight, Share2, Eye } from 'lucide-react';
import { clsx } from 'clsx';

interface Post {
    id: number;
    title: string;
    slug: string;
    summary: string;
    content: string;
    featured_image: string;
    published_at: string;
    view_count: number;
}

interface Props {
    post: Post;
    auth: {
        user: any;
    };
}

export default function Show({ post, auth }: Props) {
    const { isRtl } = useLanguage();

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            <Head title={`${post.title} - VideoCutter Pro`} />
            <Header 
                user={auth.user} 
                onLoginClick={() => router.get(route('login'))} 
                onLogout={() => router.post(route('logout'))} 
                isAuthLoading={false} 
            />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                {/* Back Link */}
                <Link 
                    href={route('blog.index')}
                    className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent font-bold mb-12 transition-colors group"
                >
                    {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {isRtl ? 'العودة للمدونة' : 'Back to Blog'}
                </Link>

                <article className="animate-fade-in">
                    {/* Header */}
                    <header className="mb-12">
                        <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-text-muted mb-6">
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent/60" />
                                {new Date(post.published_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-accent/60" />
                                {isRtl ? 'قراءة في 5 دقائق' : '5 min read'}
                            </span>
                            <span className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-accent/60" />
                                {post.view_count} {isRtl ? 'مشاهدة' : 'views'}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] text-text-primary">
                            {isRtl ? post.title : (post.title_en || post.title)}
                        </h1>

                        <p className="text-xl text-text-secondary leading-relaxed italic border-l-4 border-accent pl-6 py-2">
                            {isRtl ? post.summary : (post.summary_en || post.summary)}
                        </p>
                    </header>

                    {/* Featured Image */}
                    {post.featured_image && (
                        <div className="mb-16 rounded-[3rem] overflow-hidden shadow-2xl border border-bg-border">
                            <img 
                                src={post.featured_image} 
                                alt={post.title}
                                className="w-full h-auto"
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div 
                        className="prose prose-invert prose-lg max-w-none 
                        prose-headings:font-black prose-headings:text-text-primary
                        prose-p:text-text-secondary prose-p:leading-loose
                        prose-strong:text-accent prose-strong:font-black
                        prose-img:rounded-[2rem] prose-img:shadow-xl prose-img:border prose-img:border-bg-border"
                        dangerouslySetInnerHTML={{ __html: isRtl ? post.content : (post.content_en || post.content) }}
                    />

                    {/* Share Section */}
                    <div className="mt-20 pt-12 border-t border-bg-border flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-text-muted uppercase tracking-widest">
                                {isRtl ? 'مشاركة هذا المقال:' : 'Share this article:'}
                            </span>
                            <div className="flex items-center gap-3">
                                {[1, 2, 3].map(i => (
                                    <button 
                                        key={i}
                                        className="w-10 h-10 rounded-xl bg-bg-elevated hover:bg-accent hover:text-white border border-bg-border transition-all flex items-center justify-center"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Link 
                            href={route('editor')}
                            className="btn-primary px-10 py-4 text-sm font-black"
                        >
                            {isRtl ? 'جرب المحرر الآن' : 'Try Editor Now'}
                        </Link>
                    </div>
                </article>
            </main>

            <Footer />
        </div>
    );
}

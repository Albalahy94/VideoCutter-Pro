import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Header } from '../../Components/VideoCutter/Header';
import { Footer } from '../../Components/VideoCutter/Footer';
import { useLanguage } from '../../Hooks/useLanguage';
import { Calendar, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface Post {
    id: number;
    title: string;
    slug: string;
    summary: string;
    featured_image: string;
    published_at: string;
}

interface Props {
    posts: {
        data: Post[];
        links: any;
    };
    auth: {
        user: any;
    };
}

export default function Index({ posts, auth }: Props) {
    const { isRtl } = useLanguage();

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            <Head title={isRtl ? 'المدونة - فيديو كتر برو' : 'Blog - VideoCutter Pro'} />
            <Header 
                user={auth.user} 
                onLoginClick={() => router.get(route('login'))} 
                onLogout={() => router.post(route('logout'))} 
                isAuthLoading={false} 
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                {/* Hero Section */}
                <div className="text-center mb-20 animate-fade-in">
                    <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
                        {isRtl ? 'مدونة فيديو كتر برو' : 'VideoCutter Pro Blog'}
                    </h1>
                    <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
                        {isRtl 
                            ? 'اكتشف أحدث النصائح، التحديثات، والمقالات حول تحرير الفيديو والذكاء الاصطناعي.'
                            : 'Discover latest tips, updates, and articles about video editing and AI.'}
                    </p>
                </div>

                {/* Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {posts.data.map((post, i) => (
                        <Link
                            key={post.id}
                            href={route('blog.show', post.slug)}
                            className="group flex flex-col bg-bg-card border border-bg-border rounded-[2rem] overflow-hidden hover:border-accent/40 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/5 hover:-translate-y-2 animate-fade-in"
                            style={{ animationDelay: `${i * 100}ms` }}
                        >
                            {/* Image Placeholder or Actual Image */}
                            <div className="relative h-56 overflow-hidden bg-bg-elevated">
                                {post.featured_image ? (
                                    <img 
                                        src={post.featured_image} 
                                        alt={post.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-accent/20">
                                        <div className="w-20 h-20 rounded-full border-4 border-current animate-pulse-soft flex items-center justify-center">
                                            <span className="text-2xl font-black">VC</span>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="p-8 flex-1 flex flex-col">
                                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(post.published_at).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {isRtl ? '5 دقائق' : '5 min read'}
                                    </span>
                                </div>

                                <h2 className="text-xl font-black mb-4 group-hover:text-accent transition-colors line-clamp-2">
                                    {isRtl ? post.title : (post.title_en || post.title)}
                                </h2>

                                <p className="text-text-secondary text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
                                    {isRtl ? post.summary : (post.summary_en || post.summary)}
                                </p>

                                <div className="flex items-center gap-2 text-accent font-black text-sm group/btn">
                                    {isRtl ? 'اقرأ المزيد' : 'Read More'}
                                    <ArrowRight className={clsx("w-4 h-4 transition-transform group-hover/btn:translate-x-1", isRtl && "rotate-180 group-hover/btn:-translate-x-1")} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {posts.data.length === 0 && (
                    <div className="text-center py-20 bg-bg-card border-2 border-dashed border-bg-border rounded-[3rem]">
                        <p className="text-text-muted font-bold">
                            {isRtl ? 'لا توجد مقالات حالياً.' : 'No articles found yet.'}
                        </p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

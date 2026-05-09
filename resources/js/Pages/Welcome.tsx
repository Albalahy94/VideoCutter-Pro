import { Head, Link } from '@inertiajs/react';
import { useLanguage } from '../Hooks/useLanguage';

export default function Welcome({ auth, posts }: { auth: any, posts: any[] }) {
    const { isRtl } = useLanguage();
    
    const title = isRtl ? 'VideoCutter Pro - محررك الاحترافي لقص ودمج الفيديو' : 'VideoCutter Pro - Smart Video Trimming & Merging';
    const description = isRtl 
        ? 'أسرع أداة لقص ودمج الفيديوهات مباشرة في متصفحك. مثالية لصناع المحتوى واليوتيوبرز. خصوصية تامة بدون رفع الملفات.' 
        : 'The fastest browser-based video editor for creators. Cut, merge, and transform videos with zero server uploads.';

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white selection:bg-violet-500 selection:text-white overflow-x-hidden font-sans">
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
            </Head>

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        VideoCutter<span className="text-violet-500">Pro</span>
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {auth.user ? (
                        <Link href={route('editor')} className="text-sm font-medium hover:text-violet-400 transition-colors">
                            Go to Editor
                        </Link>
                    ) : (
                        <>
                            <Link href={route('login')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                Sign In
                            </Link>
                            <Link 
                                href={route('editor')} 
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold backdrop-blur-md transition-all active:scale-95"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                    </span>
                    Now with Browser-Level Processing
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8">
                    Smart Video Editing,<br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400">
                        Zero Server Uploads.
                    </span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 mb-12 leading-relaxed">
                    Cut, merge, and transform your videos directly in your browser using FFmpeg.wasm. 
                    Your files never leave your device—privacy redefined.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link 
                        href={route('editor')}
                        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 rounded-2xl text-lg font-bold shadow-2xl shadow-violet-500/25 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                    >
                        Start Cutting Now
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Link>
                    <a 
                        href="#features" 
                        className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-lg font-bold backdrop-blur-md transition-all active:scale-95"
                    >
                        See Features
                    </a>
                </div>

                {/* Dashboard Preview */}
                <div className="mt-20 relative group">
                    <div className="absolute inset-0 bg-violet-500/20 blur-[100px] group-hover:bg-violet-500/30 transition-all duration-700" />
                    <div className="relative border border-white/10 rounded-3xl overflow-hidden bg-[#121214] shadow-2xl">
                        <div className="bg-[#1C1C1F] px-4 py-3 flex items-center gap-2 border-b border-white/5">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <div className="mx-auto text-xs text-gray-500 font-medium">videocutterpro.app/editor</div>
                        </div>
                        <img 
                            src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=2070" 
                            alt="Editor Preview" 
                            className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" 
                        />
                    </div>
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-3 gap-12 text-center md:text-left">
                {[
                    {
                        title: 'Locally Processed',
                        desc: 'Processes your videos on your hardware. Fast, secure, and entirely offline after loading.',
                        iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                    },
                    {
                        title: 'Smart Import',
                        desc: 'Paste YouTube chapters or SRT files to automatically generate clip segments in seconds.',
                        iconPath: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
                    },
                    {
                        title: 'Pro Export',
                        desc: 'Download as single merged files or ZIP archives with custom aspect ratios like Shorts or YouTube.',
                        iconPath: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                    }
                ].map((f, i) => (
                    <div key={i} className="group">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-violet-500/20 transition-colors">
                            <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.iconPath} />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                        <p className="text-gray-400 leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* Stats */}
            <section className="relative z-10 border-y border-white/5 bg-white/[0.02] backdrop-blur-3xl py-20">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { label: 'Active Users', value: '+10K' },
                        { label: 'Files Processed', value: '250K' },
                        { label: 'Privacy Rate', value: '100%' },
                        { label: 'Server Cost', value: '$0' },
                    ].map((s, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl md:text-5xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">{s.value}</div>
                            <div className="text-xs uppercase tracking-widest text-violet-400 font-bold">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Latest from Blog Slider */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 overflow-hidden">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                    <div className="max-w-2xl text-center md:text-left">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            {isRtl ? 'آخر نصائح المونتاج' : 'Latest Editing Tips'}
                        </h2>
                        <p className="text-gray-400 text-lg">
                            {isRtl 
                                ? 'اكتشف كيف تطور مهاراتك وتستخدم أدواتنا باحترافية من خلال مقالاتنا التعليمية.'
                                : 'Discover how to level up your skills and use our tools like a pro through our guides.'}
                        </p>
                    </div>
                    <Link 
                        href={route('blog.index')}
                        className="group flex items-center gap-2 text-violet-400 font-bold hover:text-white transition-colors"
                    >
                        {isRtl ? 'عرض كل المقالات' : 'View All Articles'}
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory no-scrollbar -mx-6 px-6">
                    {posts && posts.map((post: any, i: number) => (
                        <Link
                            key={post.id}
                            href={route('blog.show', post.slug)}
                            className="min-w-[300px] md:min-w-[400px] snap-start group relative bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-violet-500/30 transition-all duration-500 hover:-translate-y-2"
                        >
                            <div className="h-56 relative overflow-hidden bg-white/5">
                                {post.featured_image ? (
                                    <img src={post.featured_image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-violet-500/20 font-black text-4xl">VC</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">
                                        {new Date(post.published_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long' })}
                                    </div>
                                    <h3 className="text-xl font-bold line-clamp-2">
                                        {isRtl ? post.title : (post.title_en || post.title)}
                                    </h3>
                                </div>
                            </div>
                            <div className="p-8 pt-6">
                                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6">
                                    {isRtl ? post.summary : (post.summary_en || post.summary)}
                                </p>
                                <div className="flex items-center gap-2 text-white font-bold text-sm">
                                    {isRtl ? 'اقرأ المقال' : 'Read Article'}
                                    <svg className="w-4 h-4 text-violet-500 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
                <div className="bg-gradient-to-br from-violet-600/10 to-blue-600/10 border border-white/10 rounded-[2rem] p-12 md:p-20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                         <svg className="w-40 h-40" viewBox="0 0 24 24" fill="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">{isRtl ? 'جاهز لتحرير أول فيديو؟' : 'Ready to edit your first video?'}</h2>
                    <p className="text-gray-400 text-lg mb-10">{isRtl ? 'انضم لآلاف المبدعين الذين يثقون في VideoCutter Pro لخصوصيتهم.' : 'Join thousands of creators who trust VideoCutter Pro for their privacy-first workflow.'}</p>
                    <Link 
                        href={route('editor')}
                        className="inline-flex px-10 py-5 bg-white text-black hover:bg-gray-200 rounded-2xl text-xl font-black transition-all active:scale-95"
                    >
                        {isRtl ? 'افتح المحرر الاحترافي' : 'Open Pro Editor'}
                    </Link>
                </div>
            </section>

            <footer className="relative z-10 pt-20 pb-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                         <span className="font-bold text-white">VideoCutter Pro</span>
                         <span>&copy; 2024. Localized Privacy.</span>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Github</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

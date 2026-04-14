import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { ThemeProvider, useTheme } from '../Hooks/useTheme';
import { LanguageProvider, useLanguage } from '../Hooks/useLanguage';
import { Header } from '../Components/VideoCutter/Header';
import { Play, Sparkles, Shield, Zap } from 'lucide-react';
import { useEffect } from 'react';

function DashboardContent({ auth }: PageProps) {
    const { isDark } = useTheme();
    const { isRtl } = useLanguage();

    const t = {
        title: isRtl ? 'لوحة التحكم | VideoCutterPro' : 'Dashboard | VideoCutterPro',
        welcome: isRtl ? `مرحباً بعودتك، ${auth.user.name} 👋` : `Welcome back, ${auth.user.name} 👋`,
        subtitle: isRtl ? 'نحن سعداء برؤيتك مجدداً! جاهز لصناعة فيديو مدهش اليوم؟' : 'We are glad to see you again! Ready to create an amazing video today?',
        btnEditor: isRtl ? 'افتح محرر الفيديو' : 'Open Video Editor',
        btnAccount: isRtl ? 'إعدادات الحساب' : 'Account Settings',
        feature1: isRtl ? 'سرعة فائقة' : 'Ultra Fast',
        feature1Desc: isRtl ? 'معالجة محلية داخل المتصفح بدون انتظار الرفع.' : 'Local strictly-in-browser processing with zero upload time.',
        feature2: isRtl ? 'خصوصية 100%' : '100% Private',
        feature2Desc: isRtl ? 'ملفاتك لا تغادر جهازك أبداً وتظل آمنة كلياً.' : 'Your files never leave your device, ensuring total security.',
        feature3: isRtl ? 'أدوات احترافية' : 'Pro Tools',
        feature3Desc: isRtl ? 'قص، تسريع، تصيير والمزيد من الأدوات بضغطة.' : 'Trim, speed adjustments, filtering, and more at one click.',
    };

    // Apply global background based on theme
    useEffect(() => {
        document.body.style.backgroundColor = isDark ? '#08080C' : '#f8fafc';
        document.body.style.color = isDark ? '#f8fafc' : '#08080c';
        return () => {
             document.body.style.backgroundColor = '';
             document.body.style.color = '';
        }
    }, [isDark]);

    return (
        <div 
            className="min-h-screen transition-colors duration-500 font-sans" 
            dir={isRtl ? 'rtl' : 'ltr'}
            style={{ 
                background: isDark ? 'radial-gradient(ellipse at top, #1a1a2e 0%, #08080C 100%)' : 'radial-gradient(ellipse at top, #e2e8f0 0%, #f8fafc 100%)'
            }}
        >
            <Head title={t.title} />

            <Header 
                user={auth.user} 
                onLoginClick={() => router.get(route('login'))} 
                onLogout={() => router.post(route('logout'))} 
                isAuthLoading={false} 
            />

            <main className="max-w-7xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center">
                
                {/* Hero Section */}
                <div className="w-full max-w-4xl flex flex-col items-center text-center space-y-6 animate-fade-in-up">
                    <div 
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-2"
                        style={{
                            background: isDark ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)',
                            color: 'var(--accent, #6366f1)',
                            border: `1px solid ${isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.1)'}`
                        }}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Pro Member</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--accent, #6366f1), var(--accent-light, #818cf8))' }}>
                        {t.welcome}
                    </h1>
                    
                    <p className={`text-lg sm:text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t.subtitle}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 w-full sm:w-auto">
                        <Link 
                            href={route('editor')}
                            className="group relative flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white transition-all overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, var(--accent, #6366f1), var(--accent-light, #818cf8))' }}
                        >
                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                            
                            <Play className="w-5 h-5 fill-current" />
                            <span className="text-lg">{t.btnEditor}</span>
                        </Link>
                        
                        <Link
                            href={route('profile.edit')}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold transition-all backdrop-blur-sm"
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                color: isDark ? '#fff' : '#000',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                        >
                            {t.btnAccount}
                        </Link>
                    </div>
                </div>

                {/* Features Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 w-full max-w-5xl">
                    <div className="flex flex-col items-center text-center p-6 rounded-3xl transition-transform hover:-translate-y-1" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.feature1}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.feature1Desc}</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 rounded-3xl transition-transform hover:-translate-y-1" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.feature2}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.feature2Desc}</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 rounded-3xl transition-transform hover:-translate-y-1" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.feature3}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.feature3Desc}</p>
                    </div>
                </div>

            </main>
        </div>
    );
}

export default function Dashboard(props: PageProps) {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <DashboardContent {...props} />
            </LanguageProvider>
        </ThemeProvider>
    );
}

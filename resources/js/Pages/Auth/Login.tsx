import { useEffect, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { useLanguage } from '../../Hooks/useLanguage';
import { useTheme } from '../../Hooks/useTheme';
import { Scissors, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';

export default function Login({ status, canResetPassword }: { status?: string, canResetPassword?: boolean }) {
    const { isRtl } = useLanguage();
    const { isDark } = useTheme();

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    const t = {
        title: isRtl ? 'تسجيل الدخول' : 'Welcome Back',
        subtitle: isRtl ? 'سجل دخولك لمتابعة أعمالك والوصول لميزاتك.' : 'Log in to continue your work and access your features.',
        email: isRtl ? 'البريد الإلكتروني' : 'Email Address',
        password: isRtl ? 'كلمة المرور' : 'Password',
        remember: isRtl ? 'تذكرني' : 'Remember me',
        forgot: isRtl ? 'نسيت كلمة المرور؟' : 'Forgot your password?',
        login: isRtl ? 'دخول' : 'Sign In',
        noAccount: isRtl ? 'ليس لديك حساب؟' : "Don't have an account?",
        register: isRtl ? 'إنشاء حساب جديد' : 'Create an Account',
        google: isRtl ? 'الدخول عبر جوجل' : 'Sign in with Google',
        back: isRtl ? 'العودة للرئيسية' : 'Back to Home',
    };

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
            <Head title={isRtl ? 'تسجيل الدخول' : 'Log in'} />
            
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-mode-merge/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Scissors className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
                            VideoCutter<span className="text-accent">Pro</span>
                        </span>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{t.title}</h1>
                    <p className="text-text-muted text-sm">{t.subtitle}</p>
                </div>

                {status && (
                    <div className="mb-4 font-medium text-sm text-mode-merge bg-mode-merge/10 p-4 rounded-xl border border-mode-merge/20">
                        {status}
                    </div>
                )}

                <div className="card-glass p-8 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder={t.email}
                                    className="w-full bg-bg-primary/50 border border-bg-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-accent outline-none transition-all"
                                    required
                                    autoFocus
                                />
                            </div>
                            {errors.email && <p className="text-xs text-mode-exclude mt-2 ml-1">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder={t.password}
                                    className="w-full bg-bg-primary/50 border border-bg-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-accent outline-none transition-all"
                                    required
                                />
                            </div>
                            {errors.password && <p className="text-xs text-mode-exclude mt-2 ml-1">{errors.password}</p>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="w-4 h-4 rounded border-bg-border bg-bg-primary text-accent focus:ring-accent transition-all cursor-pointer"
                                />
                                <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors">{t.remember}</span>
                            </label>
                            
                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-xs text-text-muted hover:text-accent font-medium transition-colors"
                                >
                                    {t.forgot}
                                </Link>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-4 bg-gradient-to-r from-accent to-accent-light text-white rounded-xl font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : t.login}
                        </button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-bg-border"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-bg-primary/0 px-2 text-text-muted tracking-widest">{isRtl ? 'أو' : 'OR'}</span></div>
                        </div>

                        {/* Google Login */}
                        <a
                            href={route('google.redirect')}
                            className="w-full py-3 bg-white text-gray-900 rounded-xl font-semibold border border-gray-200 flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                            {t.google}
                        </a>
                    </form>

                    <p className="text-center mt-10 text-sm text-text-muted">
                        {t.noAccount}{' '}
                        <Link href={route('register')} className="text-accent font-bold hover:underline">
                            {t.register}
                        </Link>
                    </p>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary text-xs font-medium transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {t.back}
                    </Link>
                </div>
            </div>
        </div>
    );
}

import { useEffect, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { useLanguage } from '../../Hooks/useLanguage';
import { useTheme } from '../../Hooks/useTheme';
import { Scissors, Mail, Lock, User as UserIcon, Phone, Loader2 } from 'lucide-react';

export default function Register() {
    const { isRtl } = useLanguage();
    const { isDark } = useTheme();
    
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        phone: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'));
    };

    const t = {
        title: isRtl ? 'إنشاء حساب جديد' : 'Create New Account',
        subtitle: isRtl ? 'انضم إلينا واستمتع بتجربة تعديل فيديو احترافية.' : 'Join us and enjoy a professional video editing experience.',
        name: isRtl ? 'الاسم الكامل' : 'Full Name',
        email: isRtl ? 'البريد الإلكتروني' : 'Email Address',
        phone: isRtl ? 'رقم الهاتف / واتساب (اختياري)' : 'Phone / WhatsApp (Optional)',
        password: isRtl ? 'كلمة المرور' : 'Password',
        confirmPassword: isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password',
        register: isRtl ? 'إنشاء حساب' : 'Create Account',
        alreadyRegistered: isRtl ? 'لديك حساب بالفعل؟' : 'Already have an account?',
        login: isRtl ? 'تسجيل الدخول' : 'Log in',
        google: isRtl ? 'التسجيل عبر جوجل' : 'Sign up with Google',
    };

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
            <Head title={t.title} />
            
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-mode-split/20 blur-[120px] rounded-full pointer-events-none" />

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

                <div className="card-glass p-8 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl">
                    <form onSubmit={submit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder={t.name}
                                    className="w-full bg-bg-primary/50 border border-bg-border rounded-xl pl-11 pr-4 py-3 text-sm focus:border-accent outline-none transition-all"
                                    required
                                    autoFocus
                                />
                            </div>
                            {errors.name && <p className="text-xs text-mode-exclude mt-1 ml-1">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder={t.email}
                                    className="w-full bg-bg-primary/50 border border-bg-border rounded-xl pl-11 pr-4 py-3 text-sm focus:border-accent outline-none transition-all"
                                    required
                                />
                            </div>
                            {errors.email && <p className="text-xs text-mode-exclude mt-1 ml-1">{errors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) => setData('phone', e.target.value)}
                                    placeholder={t.phone}
                                    className="w-full bg-bg-primary/50 border border-bg-border rounded-xl pl-11 pr-4 py-3 text-sm focus:border-accent outline-none transition-all"
                                />
                            </div>
                            {errors.phone && <p className="text-xs text-mode-exclude mt-1 ml-1">{errors.phone}</p>}
                        </div>

                        {/* Password */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder={t.password}
                                        className="w-full bg-bg-primary/50 border border-bg-border rounded-xl pl-11 pr-4 py-3 text-sm focus:border-accent outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                    <input
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        placeholder={t.confirmPassword}
                                        className="w-full bg-bg-primary/50 border border-bg-border rounded-xl pl-11 pr-4 py-3 text-sm focus:border-accent outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        {(errors.password || errors.password_confirmation) && (
                            <p className="text-xs text-mode-exclude mt-1 ml-1">{errors.password || errors.password_confirmation}</p>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-4 bg-gradient-to-r from-accent to-accent-light text-white rounded-xl font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : t.register}
                        </button>

                        <div className="relative py-4">
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

                    <p className="text-center mt-8 text-sm text-text-muted">
                        {t.alreadyRegistered}{' '}
                        <Link href={route('login')} className="text-accent font-bold hover:underline">
                            {t.login}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

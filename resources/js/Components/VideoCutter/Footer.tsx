import React from 'react';
import { Link } from '@inertiajs/react';

export function Footer() {
    const isRtl = document.documentElement.dir === 'rtl';

    return (
        <footer
            className="border-t mt-20 py-10"
            style={{ borderColor: 'var(--bg-border)', background: 'var(--bg-primary)' }}
        >
            <div className="max-w-7xl mx-auto px-4 text-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-black shadow-lg">VC</div>
                         <span className="font-bold text-lg">VideoCutter <span className="text-accent">Pro</span></span>
                    </div>
                    
                    <p className="text-xs text-text-muted max-w-md leading-relaxed">
                        {isRtl 
                            ? 'جميع عمليات معالجة الفيديو تتم محلياً في متصفحك. نحن لا نقوم برفع ملفاتك أبداً، مما يضمن خصوصية وأماناً بنسبة 100%.'
                            : 'All video processing is done locally in your browser. We never upload your files, ensuring 100% privacy and security.'}
                    </p>

                    <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-text-secondary">
                        <Link href="/privacy" className="hover:text-accent transition-colors">{isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
                        <Link href="/terms" className="hover:text-accent transition-colors">{isRtl ? 'الشروط والأحكام' : 'Terms & Conditions'}</Link>
                        <Link href={route('blog.index')} className="hover:text-accent transition-colors">{isRtl ? 'المدونة' : 'Blog'}</Link>
                    </div>

                    <p className="text-[10px] text-text-muted mt-4 opacity-60">
                        © {new Date().getFullYear()} VideoCutter Pro. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

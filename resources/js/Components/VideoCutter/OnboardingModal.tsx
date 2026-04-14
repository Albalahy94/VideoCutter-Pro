import { X, MousePointer2, Keyboard, PlayCircle, Scissors, FileVideo, Layout, Sparkles } from 'lucide-react'
import { useLanguage } from '../../Hooks/useLanguage'
import { clsx } from 'clsx'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { isRtl } = useLanguage()

  if (!isOpen) return null

  const t = {
    title: isRtl ? 'أهلاً بك في محرر الفيديو!' : 'Welcome to Video Editor!',
    subtitle: isRtl 
      ? 'إليك دليل سريع لمساعدتك على البدء في قص ودمج فيديوهاتك باحترافية.' 
      : 'Here is a quick guide to help you start cutting and merging your videos professionally.',
    shortcutsTitle: isRtl ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts',
    generalTitle: isRtl ? 'تعليمات الاستخدام' : 'General Instructions',
    gotIt: isRtl ? 'فهمت، لنبدأ!' : 'Got it, let\'s go!',
    shortcuts: [
      { key: 'Space', desc: isRtl ? 'تشغيل / إيقاف مؤقت' : 'Play / Pause', icon: PlayCircle },
      { key: 'I', desc: isRtl ? 'تحديد بداية المقطع' : 'Set start point', icon: MousePointer2 },
      { key: 'O', desc: isRtl ? 'تحديد النهاية وإضافة المقطع' : 'Set end & add segment', icon: Scissors },
      { key: '← →', desc: isRtl ? 'تقديم / تأخير 5 ثوانٍ' : 'Seek ±5 seconds', icon: Keyboard },
    ],
    tips: [
      { 
        title: isRtl ? 'تحميل الفيديو' : 'Load Video', 
        desc: isRtl ? 'اسحب ملف الفيديو وأفلته هنا للبدء فوراً.' : 'Drag and drop your video file here to start immediately.',
        icon: FileVideo 
      },
      { 
        title: isRtl ? 'تحديد المخطط الزمني' : 'Timeline Selection', 
        desc: isRtl ? 'يمكنك السحب مباشرة على الشريط الزمني لتحديد المساحة المطلوبة.' : 'You can drag directly on the timeline to select the desired area.',
        icon: Layout 
      },
      { 
        title: isRtl ? 'أوضاع المعالجة' : 'Processing Modes', 
        desc: isRtl ? 'اختر بين القص، الاستخراج، أو الدمج من القائمة الجانبية.' : 'Choose between Split, Exclude, or Merge from the side panel.',
        icon: Sparkles 
      },
    ]
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className={clsx(
        "relative w-full max-w-2xl bg-bg-elevated/90 border border-accent-light/20 rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up",
        isRtl ? "font-arabic" : ""
      )}>
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/10 blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-violet-500/10 blur-[100px] translate-x-1/2 translate-y-1/2" />

        {/* Content */}
        <div className="relative p-8 md:p-10 flex flex-col gap-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-accent-light to-violet-400 bg-clip-text text-transparent">
                {t.title}
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-md">
                {t.subtitle}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Shortcuts Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-light px-1 opacity-90">
                <Keyboard className="w-3.5 h-3.5" />
                {t.shortcutsTitle}
              </div>
              <div className="grid gap-2">
                {t.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group hover:border-accent-light/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-bg-primary flex items-center justify-center text-white/50 group-hover:text-accent-light transition-colors">
                        <s.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-white">{s.desc}</span>
                    </div>
                    <kbd className="min-w-[40px] px-2 py-1 rounded-lg bg-white text-black text-xs font-mono font-bold text-center shadow-lg">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* General Tips Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400 px-1 opacity-90">
                <MousePointer2 className="w-3.5 h-3.5" />
                {t.generalTitle}
              </div>
              <div className="grid gap-4">
                {t.tips.map((tip, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-white">
                      <tip.icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* Footer Action */}
          <button
            onClick={onClose}
            className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-accent to-violet-600 text-white font-bold text-lg shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            {t.gotIt}
          </button>
        </div>
      </div>
    </div>
  )
}

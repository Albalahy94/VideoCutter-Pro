import { Monitor, Smartphone, Tv, Square, Wand2, Sparkles } from 'lucide-react'
import type { AspectRatio, TransitionType } from '../../types'
import { useLanguage } from '../../Hooks/useLanguage'
import { clsx } from 'clsx'

const RATIOS: { id: AspectRatio; labelEn: string; labelAr: string; icon: any }[] = [
  { id: 'original', labelEn: 'Original', labelAr: 'الأصلي', icon: Monitor },
  { id: 'shorts',   labelEn: 'Shorts',   labelAr: 'شورتس', icon: Smartphone },
  { id: 'youtube',  labelEn: 'YouTube',  labelAr: 'يوتيوب', icon: Tv },
  { id: 'square',   labelEn: 'Square',   labelAr: 'مربع', icon: Square },
]

const TRANSITIONS: { id: TransitionType; labelEn: string; labelAr: string; icon: any }[] = [
  { id: 'none', labelEn: 'None', labelAr: 'بدون', icon: Wand2 },
  { id: 'fade', labelEn: 'Smooth Fade', labelAr: 'تلاشي ناعم', icon: Sparkles },
]

interface EffectsSelectorProps {
  aspectRatio: AspectRatio
  transition: TransitionType
  onRatioChange: (r: AspectRatio) => void
  onTransitionChange: (t: TransitionType) => void
  disabled?: boolean
}

export function EffectsSelector({
  aspectRatio,
  transition,
  onRatioChange,
  onTransitionChange,
  disabled
}: EffectsSelectorProps) {
  const { isRtl } = useLanguage()

  return (
    <div className="card flex flex-col gap-6">
      {/* Aspect Ratio Section */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Monitor className="w-3 h-3" />
          {isRtl ? 'مقاس الفيديو' : 'Aspect Ratio'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {RATIOS.map(r => {
            const Icon = r.icon
            const isActive = aspectRatio === r.id
            return (
              <button
                key={r.id}
                onClick={() => onRatioChange(r.id)}
                disabled={disabled}
                className={clsx(
                  'flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed text-left',
                  isRtl && 'text-right flex-row-reverse'
                )}
                style={{
                  background: isActive ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  borderColor: isActive ? 'var(--accent-light)' : 'var(--bg-border)',
                }}
              >
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ 
                    background: isActive ? 'var(--accent-light)' : 'var(--bg-border)',
                    color: isActive ? 'white' : 'var(--text-muted)'
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium" style={{ color: isActive ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                  {isRtl ? r.labelAr : r.labelEn}
                </span>
              </button>
            )
          })}
        </div>
        
        {aspectRatio !== 'original' && (
          <p className="mt-3 text-xs leading-relaxed max-w-sm text-yellow-500/90 dark:text-yellow-400/80 italic">
            {isRtl 
              ? 'تنويه: بناء مقاسات مخصصة مع مؤثرات عزل الخلفية قد يستغرق وقت معالجة أطول بقليل (حوالي وقت يعادل مدة الفيديو نفسه).' 
              : 'Note: Generating custom dimensions with background blur effects requires processing and takes approximately real-time (1x video duration).'}
          </p>
        )}
      </section>

      {/* Transitions Section */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Wand2 className="w-3 h-3" />
          {isRtl ? 'تأثيرات الانتقال' : 'Transitions'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {TRANSITIONS.map(t => {
            const Icon = t.icon
            const isActive = transition === t.id
            return (
              <button
                key={t.id}
                onClick={() => onTransitionChange(t.id)}
                disabled={disabled}
                className={clsx(
                  'flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed text-left',
                  isRtl && 'text-right flex-row-reverse'
                )}
                style={{
                  background: isActive ? 'rgba(124,58,237,0.1)' : 'var(--bg-elevated)',
                  borderColor: isActive ? 'var(--accent-light)' : 'var(--bg-border)',
                }}
              >
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ 
                    background: isActive ? 'var(--accent-light)' : 'var(--bg-border)',
                    color: isActive ? 'white' : 'var(--text-muted)'
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium" style={{ color: isActive ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                  {isRtl ? t.labelAr : t.labelEn}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

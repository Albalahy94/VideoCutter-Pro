import { Scissors, GitMerge, EyeOff } from 'lucide-react'
import type { ProcessingMode } from '../../types'
import { useLanguage } from '../../Hooks/useLanguage'
import { clsx } from 'clsx'

const MODES: {
  id: ProcessingMode
  labelEn: string
  labelAr: string
  icon: React.ElementType
  descriptionEn: string
  descriptionAr: string
  accent: string
  glow: string
}[] = [
  {
    id: 'split',
    labelEn: 'Split',
    labelAr: 'تقسيم',
    icon: Scissors,
    descriptionEn: 'Save each segment as a separate file in a ZIP.',
    descriptionAr: 'حفظ كل جزء كملف منفصل في أرشيف ZIP.',
    accent: '#3B82F6',
    glow: 'rgba(59,130,246,0.2)',
  },
  {
    id: 'merge',
    labelEn: 'Merge',
    labelAr: 'دمج',
    icon: GitMerge,
    descriptionEn: 'Join selected segments into one file.',
    descriptionAr: 'دمج الأجزاء المحددة في ملف واحد.',
    accent: '#10B981',
    glow: 'rgba(16,185,129,0.2)',
  },
  {
    id: 'exclude',
    labelEn: 'Exclude',
    labelAr: 'استبعاد',
    icon: EyeOff,
    descriptionEn: 'Remove segments. Keep everything else.',
    descriptionAr: 'حذف الأجزاء المحددة والاحتفاظ بالباقي.',
    accent: '#EF4444',
    glow: 'rgba(239,68,68,0.2)',
  },
]

interface ModeSelectorProps {
  mode: ProcessingMode
  onChange: (mode: ProcessingMode) => void
  compact?: boolean
  disabled?: boolean
}

export function ModeSelector({ mode, onChange, compact, disabled }: ModeSelectorProps) {
  const { isRtl } = useLanguage()

  return (
    <div className="card">
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
        {isRtl ? 'وضع المعالجة' : 'Processing Mode'}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => {
          const Icon = m.icon
          const isActive = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              disabled={disabled}
              className={clsx(
                'flex flex-col items-center gap-1.5 rounded-xl border transition-all duration-200 cursor-pointer',
                compact ? 'p-1.5 sm:p-2' : 'p-3',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              style={{
                background: isActive ? m.glow : 'var(--bg-elevated)',
                borderColor: isActive ? m.accent : 'var(--bg-border)',
                boxShadow: isActive ? `0 0 16px ${m.glow}` : 'none',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
              }}
              onMouseEnter={e => {
                if (!isActive && !disabled) {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = m.accent + '80'
                  ;(e.currentTarget as HTMLButtonElement).style.background = m.glow.replace('0.2', '0.08')
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bg-border)'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'
                }
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-150"
                style={{
                  background: isActive ? m.accent + '25' : 'var(--bg-border)',
                  color: isActive ? m.accent : 'var(--text-muted)',
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div
                  className="font-semibold text-sm"
                  style={{ color: isActive ? m.accent : 'var(--text-primary)' }}
                >
                  {isRtl ? m.labelAr : m.labelEn}
                </div>
                <div
                  className={clsx("text-[11px] leading-tight mt-0.5", compact ? "hidden" : "hidden sm:block")}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {isRtl ? m.descriptionAr : m.descriptionEn}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


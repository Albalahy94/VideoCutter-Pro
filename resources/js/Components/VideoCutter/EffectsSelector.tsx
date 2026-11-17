import { Monitor, Smartphone, Tv, Square, Wand2, Sparkles, Gauge, Volume2, VolumeX, Zap, Palette, Wind, Music, ShieldCheck, Headphones, Shield, Mic2 } from 'lucide-react'
import type { AspectRatio, TransitionType, VisualFilter, AudioPreset, VocalIsolationMode } from '../../types'
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

const FILTERS: { id: VisualFilter; labelEn: string; labelAr: string; color: string }[] = [
  { id: 'none',      labelEn: 'None',     labelAr: 'بدون', color: 'bg-bg-border' },
  { id: 'grayscale', labelEn: 'B&W',      labelAr: 'أبيض وأسود', color: 'bg-gray-500' },
  { id: 'sepia',     labelEn: 'Sepia',    labelAr: 'سيبيا', color: 'bg-amber-700' },
  { id: 'vintage',   labelEn: 'Vintage',  labelAr: 'عتيق', color: 'bg-orange-900' },
  { id: 'warm',      labelEn: 'Warm',     labelAr: 'دافئ', color: 'bg-orange-400' },
  { id: 'cool',      labelEn: 'Cool',     labelAr: 'بارد', color: 'bg-blue-400' },
]

const AUDIO_PRESETS: { id: AudioPreset; labelEn: string; labelAr: string }[] = [
  { id: 'normal',  labelEn: 'Normal',  labelAr: 'عادي' },
  { id: 'podcast', labelEn: 'Podcast', labelAr: 'بودكاست' },
  { id: 'cinema',  labelEn: 'Cinema',  labelAr: 'سينمائي' },
  { id: 'studio',  labelEn: 'Studio',  labelAr: 'ستوديو' },
]

interface EffectsSelectorProps {
  aspectRatio: AspectRatio
  transition: TransitionType
  videoSpeed: number
  audioBoost: number
  visualFilter: VisualFilter
  noiseReduction: boolean
  backgroundMusic: File | null
  bgMusicVolume: number
  audioPreset: AudioPreset
  showSafeZones: boolean
  onRatioChange: (r: AspectRatio) => void
  onTransitionChange: (t: TransitionType) => void
  onSpeedChange: (s: number) => void
  onBoostChange: (b: number) => void
  onFilterChange: (f: VisualFilter) => void
  onNoiseReductionChange: (v: boolean) => void
  onBgmChange: (f: File | null) => void
  onBgmVolumeChange: (v: number) => void
  onAudioPresetChange: (p: AudioPreset) => void
  onSafeZonesToggle: (v: boolean) => void
  vocalIsolation: VocalIsolationMode
  onVocalIsolationChange: (v: VocalIsolationMode) => void
  disabled?: boolean
  files?: { id: string, file: File, name: string }[]
}

export function EffectsSelector({
  aspectRatio,
  transition,
  videoSpeed,
  audioBoost,
  visualFilter,
  noiseReduction,
  backgroundMusic,
  bgMusicVolume,
  audioPreset,
  showSafeZones,
  onRatioChange,
  onTransitionChange,
  onSpeedChange,
  onBoostChange,
  onFilterChange,
  onNoiseReductionChange,
  onBgmChange,
  onBgmVolumeChange,
  onAudioPresetChange,
  onSafeZonesToggle,
  vocalIsolation,
  onVocalIsolationChange,
  disabled,
  files = []
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
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[10px] leading-relaxed max-w-sm text-yellow-500/90 dark:text-yellow-400/80 italic">
              {isRtl 
                ? 'تنويه: بناء مقاسات مخصصة مع مؤثرات عزل الخلفية قد يستغرق وقت معالجة أطول بقليل (حوالي وقت يعادل مدة الفيديو نفسه).' 
                : 'Note: Generating custom dimensions with background blur effects requires processing and takes approximately real-time (1x video duration).'}
            </p>
            <label className="flex items-center gap-2 cursor-pointer group">
               <input 
                 type="checkbox" 
                 checked={showSafeZones} 
                 onChange={e => onSafeZonesToggle(e.target.checked)}
                 className="w-3 h-3 accent-accent" 
               />
               <span className="text-[10px] text-text-muted group-hover:text-text-primary transition-colors">
                  {isRtl ? 'إظهار مناطق الأمان للـ Social Media' : 'Show Social Media Safe Zones'}
               </span>
            </label>
          </div>
        )}
      </section>
      
      {/* Speed & Audio Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-bg-border">
        {/* Speed */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <Gauge className="w-3 h-3" />
              {isRtl ? 'سرعة الفيديو' : 'Play Speed'}
            </h3>
            <button 
              onClick={() => onSpeedChange(1.0)}
              disabled={disabled || videoSpeed === 1.0}
              className="text-[10px] bg-bg-border hover:bg-bg-elevated px-2 py-0.5 rounded text-text-muted transition-colors disabled:opacity-0"
            >
              {isRtl ? 'إعادة ضبط' : 'Reset'}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-mono text-text-muted">0.25x</span>
               <span className="text-xs font-bold text-accent-light">
                 {videoSpeed.toFixed(2)}x
               </span>
               <span className="text-[10px] font-mono text-text-muted">4.0x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="4"
              step="0.05"
              value={videoSpeed}
              disabled={disabled}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-bg-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>
          <p className="mt-2 text-[10px] text-text-muted italic">
            {isRtl ? 'ثبات نبرة الصوت مفعل تلقائياً' : 'Pitch preservation active'}
          </p>
        </section>

        {/* Audio Boost */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Zap className="w-3 h-3" />
            {isRtl ? 'تعلية الصوت' : 'Audio Booster'}
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-mono text-text-muted">100%</span>
               <span className={clsx("text-xs font-bold", audioBoost > 2.5 ? "text-orange-500" : "text-accent-light")}>
                 {Math.round(audioBoost * 100)}%
               </span>
               <span className="text-[10px] font-mono text-text-muted">400%</span>
            </div>
            <input
              type="range"
              min="1"
              max="4"
              step="0.1"
              value={audioBoost}
              disabled={disabled}
              onChange={(e) => onBoostChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-bg-border rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>
          {audioBoost > 2.5 && (
            <p className="mt-2 text-[10px] text-orange-500/80 italic leading-tight">
              {isRtl ? 'تنبيه: التعلية الزائدة قد تسبب تشويشاً في بعض السماعات' : 'Warning: High boost may cause distortion on some speakers'}
            </p>
          )}
        </section>
      </div>

      {/* Vocal / Music Separation */}
      <section className="pt-4 border-t border-bg-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Mic2 className="w-3 h-3 text-accent-light" />
            {isRtl ? 'نزع الموسيقى والدف والطبول (AI Demucs)' : 'AI Music & Drums Removal'}
          </h3>
          {vocalIsolation === 'remove_music' && (
            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-mono font-medium">
              {isRtl ? 'كلام نقي 100% (بدون أي موسيقى أو دف أو طبول)' : 'AI Vocals (No Drums/Music)'}
            </span>
          )}
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed">
          {isRtl
            ? 'محرك الذكاء الاصطناعي العميق (Demucs v4): يقوم بعزل صوت الكلام البشري وحذف كل النغمات والآلات الموسيقية، والدفوف والطبول والإيقاعات بنسبة 100% بنقاوة تامة.'
            : 'Deep AI separation (Demucs v4): isolates dialogue and completely eliminates all background music, duff, drums, and percussion with 100% studio clarity.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { id: 'none'           , labelEn: 'Original Audio'          , labelAr: 'صوت عادي (الأصلي)'                  , descEn: 'Keep original track'          , descAr: 'المسار الصوتي الأصلي للفيديو دون أي تعديل' },
            { id: 'remove_music'   , labelEn: 'Remove Music & Drums 100%', labelAr: 'نزع الموسيقى والدف والطبول 100%'   , descEn: 'Pure speech without drums'    , descAr: 'عزل كلام المتحدث ومسح كل أنواع الموسيقى والإيقاعات' },
          ] as const).map(opt => (
            <button
              key={opt.id}
              disabled={disabled}
              onClick={() => onVocalIsolationChange(opt.id)}
              className={clsx(
                'py-2.5 px-3 rounded-xl text-left border transition-all flex flex-col gap-1 items-start',
                vocalIsolation === opt.id
                  ? 'bg-accent/15 border-accent text-accent shadow-sm shadow-accent/10'
                  : 'bg-bg-elevated border-bg-border text-text-muted hover:bg-bg-border hover:text-text-primary'
              )}
            >
              <span className="text-[11px] font-bold">
                {isRtl ? opt.labelAr : opt.labelEn}
              </span>
              <span className="text-[9px] opacity-75 leading-relaxed">
                {isRtl ? opt.descAr : opt.descEn}
              </span>
            </button>
          ))}
        </div>
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

      {/* Visual Filters Section */}
      <section className="pt-4 border-t border-bg-border">
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Palette className="w-3 h-3" />
          {isRtl ? 'فلاتر الألوان' : 'Visual Filters'}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {FILTERS.map(f => {
            const isActive = visualFilter === f.id
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                disabled={disabled}
                className={clsx(
                  'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-200',
                  isActive ? 'border-accent-light bg-accent-glow' : 'border-bg-border bg-bg-elevated hover:bg-bg-border'
                )}
              >
                <div className={clsx('w-8 h-8 rounded-full shadow-inner', f.color)} />
                <span className="text-[10px] font-medium text-center truncate w-full">
                  {isRtl ? f.labelAr : f.labelEn}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Audio Cleanup & BGM */}
      <section className="pt-4 border-t border-bg-border space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Wind className="w-3 h-3" />
            {isRtl ? 'تحسين الصوت' : 'Audio Cleanup'}
          </h3>
          <div className="flex items-center gap-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={noiseReduction} 
                onChange={e => onNoiseReductionChange(e.target.checked)}
                disabled={disabled} 
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Headphones className="w-3 h-3" />
            {isRtl ? 'الأوضاع الصوتية الجاهزة' : 'Audio Presets'}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {AUDIO_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => onAudioPresetChange(p.id)}
                disabled={disabled}
                className={clsx(
                  "py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-all text-center",
                  audioPreset === p.id 
                    ? "bg-accent/10 border-accent text-accent" 
                    : "bg-bg-elevated border-bg-border text-text-muted hover:bg-bg-border"
                )}
              >
                {isRtl ? p.labelAr : p.labelEn}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Music className="w-3 h-3" />
            {isRtl ? 'موسيقى خلفية' : 'Background Music'}
          </h3>
          
          {!backgroundMusic ? (
             <div className="space-y-3">
               {/* Show Project Audio Files first */}
               {files.filter(f => f.file.type.startsWith('audio/') || f.name.endsWith('.webm')).length > 0 && (
                 <div className="flex flex-col gap-1.5">
                   <p className="text-[10px] text-text-muted mb-1">{isRtl ? 'ملفاتك المسجلة:' : 'Your recordings:'}</p>
                   {files.filter(f => f.file.type.startsWith('audio/') || f.name.endsWith('.webm')).map(f => (
                     <button
                       key={f.id}
                       onClick={() => onBgmChange(f.file)}
                       className="flex items-center gap-2 p-2 bg-bg-elevated hover:bg-accent/10 border border-bg-border hover:border-accent/30 rounded-xl transition-all text-left group"
                     >
                       <Mic2 className="w-3.5 h-3.5 text-accent" />
                       <span className="text-xs text-text-secondary group-hover:text-accent truncate flex-1">{f.name}</span>
                       <Zap className="w-3 h-3 text-accent animate-pulse" />
                     </button>
                   ))}
                 </div>
               )}

               <label className="flex items-center justify-center w-full h-10 border-2 border-dashed border-bg-border rounded-xl hover:bg-bg-elevated cursor-pointer transition-all group">
                  <Music className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors mr-2" />
                  <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors">
                    {isRtl ? 'أو اختر ملف من الجهاز' : 'Or select from computer'}
                  </span>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={e => onBgmChange(e.target.files?.[0] || null)}
                    disabled={disabled}
                  />
               </label>
             </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-bg-elevated p-2 rounded-xl border border-bg-border">
                <div className="flex items-center gap-2 overflow-hidden">
                  <ShieldCheck className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] text-text-primary truncate">{backgroundMusic.name}</span>
                </div>
                <button 
                  onClick={() => onBgmChange(null)}
                  className="text-[10px] text-mode-exclude hover:underline"
                >
                  {isRtl ? 'إزالة' : 'Remove'}
                </button>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>{isRtl ? 'مستوى الموسيقى' : 'BGM Volume'}</span>
                  <span>{Math.round(bgMusicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={bgMusicVolume}
                  disabled={disabled}
                  onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

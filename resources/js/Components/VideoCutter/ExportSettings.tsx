import React from 'react';
import { Download, Film, Gauge, Monitor } from 'lucide-react';
import { useLanguage } from '../../Hooks/useLanguage';
import { clsx } from 'clsx';
import type { ExportResolution, ExportFormat, ExportBitrate } from '../../types';

interface ExportSettingsProps {
  resolution: ExportResolution;
  format: ExportFormat;
  bitrate: ExportBitrate;
  activeEffects?: string[];
  onResolutionChange: (r: ExportResolution) => void;
  onFormatChange: (f: ExportFormat) => void;
  onBitrateChange: (b: ExportBitrate) => void;
  onResetEffects?: () => void;
  disabled?: boolean;
}

const RESOLUTIONS: { id: ExportResolution; labelEn: string; labelAr: string; tag?: string }[] = [
  { id: 'original', labelEn: 'Original', labelAr: 'أصلي', tag: 'Best' },
  { id: '1080p', labelEn: '1080p', labelAr: '1080p', tag: 'HD' },
  { id: '720p', labelEn: '720p', labelAr: '720p' },
  { id: '480p', labelEn: '480p', labelAr: '480p' },
  { id: '360p', labelEn: '360p', labelAr: '360p', tag: 'Lite' },
];

const BITRATES: { id: ExportBitrate; labelEn: string; labelAr: string; descEn: string; descAr: string }[] = [
  { id: 'auto', labelEn: 'Auto', labelAr: 'تلقائي', descEn: 'Smart balance', descAr: 'توازن ذكي' },
  { id: 'high', labelEn: 'High', labelAr: 'عالي', descEn: '8–12 Mbps', descAr: '٨–١٢ ميغابت/ث' },
  { id: 'medium', labelEn: 'Medium', labelAr: 'متوسط', descEn: '4–6 Mbps', descAr: '٤–٦ ميغابت/ث' },
  { id: 'low', labelEn: 'Low', labelAr: 'منخفض', descEn: '1–2 Mbps', descAr: '١–٢ ميغابت/ث' },
];

export function ExportSettings({ 
  resolution, 
  format, 
  bitrate, 
  activeEffects = [], 
  onResolutionChange, 
  onFormatChange, 
  onBitrateChange, 
  onResetEffects, 
  disabled 
}: ExportSettingsProps) {
  const { isRtl } = useLanguage();

  return (
    <div className="card flex flex-col gap-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2">
        <Download className="w-3 h-3" />
        {isRtl ? 'إعدادات التصدير' : 'Export Settings'}
      </h3>

      {/* Active Effects Warning */}
      {activeEffects.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <Gauge className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isRtl ? 'تنبيه السرعة القصوى' : 'Fast Cut Alert'}
            </span>
          </div>
          <p className="text-[10px] text-text-secondary leading-relaxed mb-2.5">
            {isRtl 
              ? 'هناك مؤثرات نشطة ستجعل التصدير يأخذ وقتاً طويلاً:' 
              : 'Active effects found. Processing will be slower than usual:'}
          </p>
          <div className="flex flex-wrap gap-1 mb-3">
            {activeEffects.map((eff, i) => (
              <span key={i} className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[9px] font-medium border border-orange-500/20">
                {eff}
              </span>
            ))}
          </div>
          <button 
            onClick={onResetEffects}
            disabled={disabled}
            className="w-full py-2 rounded-lg bg-orange-500 text-white text-[10px] font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
          >
            {isRtl ? 'إلغاء الكل للقص السريع ⚡' : 'Reset All for Fast Cut ⚡'}
          </button>
        </div>
      )}

      {/* Resolution */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-text-muted flex items-center gap-1.5">
          <Monitor className="w-3 h-3" /> {isRtl ? 'الدقة' : 'Resolution'}
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {RESOLUTIONS.map(r => (
            <button
              key={r.id}
              disabled={disabled}
              onClick={() => onResolutionChange(r.id)}
              className={clsx(
                'relative flex flex-col items-center py-2 px-1 rounded-xl border transition-all text-center',
                resolution === r.id
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-bg-elevated border-bg-border text-text-muted hover:bg-bg-border'
              )}
            >
              <span className="text-[10px] font-bold">{isRtl ? r.labelAr : r.labelEn}</span>
              {r.tag && (
                <span className={clsx(
                  'text-[8px] px-1 rounded mt-0.5',
                  r.tag === 'Best' ? 'bg-green-500/20 text-green-400' :
                    r.tag === 'Lite' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-accent/20 text-accent'
                )}>{r.tag}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-text-muted flex items-center gap-1.5">
          <Film className="w-3 h-3" /> {isRtl ? 'الصيغة' : 'Format'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['mp4', 'webm'] as ExportFormat[]).map(f => (
            <button
              key={f}
              disabled={disabled}
              onClick={() => onFormatChange(f)}
              className={clsx(
                'py-2 px-3 rounded-xl border text-xs font-semibold transition-all',
                format === f
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-bg-elevated border-bg-border text-text-muted hover:bg-bg-border'
              )}
            >
              .{f.toUpperCase()}
              <span className={clsx('block text-[9px] font-normal mt-0.5', format === f ? 'text-accent/70' : 'text-text-muted')}>
                {f === 'mp4' ? (isRtl ? 'توافق عالي' : 'High compat.') : (isRtl ? 'حجم أصغر' : 'Smaller size')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bitrate */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-text-muted flex items-center gap-1.5">
          <Gauge className="w-3 h-3" /> {isRtl ? 'معدل البت (جودة الملف)' : 'Bitrate (File Quality)'}
        </p>
        <div className="space-y-1.5">
          {BITRATES.map(b => (
            <button
              key={b.id}
              disabled={disabled}
              onClick={() => onBitrateChange(b.id)}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all',
                bitrate === b.id
                  ? 'bg-accent/10 border-accent'
                  : 'bg-bg-elevated border-bg-border hover:bg-bg-border'
              )}
            >
              <span className={clsx('text-[11px] font-semibold', bitrate === b.id ? 'text-accent' : 'text-text-primary')}>
                {isRtl ? b.labelAr : b.labelEn}
              </span>
              <span className="text-[9px] text-text-muted">
                {isRtl ? b.descAr : b.descEn}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

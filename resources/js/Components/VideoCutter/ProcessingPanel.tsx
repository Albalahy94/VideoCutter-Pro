import { useRef, useEffect, useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, Info, Download, Eye } from 'lucide-react'
import type { LogEntry, ProcessingMode, ExportedResult } from '../../types'
import { useLanguage } from '../../Hooks/useLanguage'
import { clsx } from 'clsx'

interface ProcessingPanelProps {
  mode: ProcessingMode
  isProcessing: boolean
  isLoading: boolean
  isLoaded: boolean
  progress: number
  step: string
  logs: LogEntry[]
  segments: number
  hasFile: boolean
  onStart: () => void
  onLoadFFmpeg: () => void
  lastExport?: ExportedResult | null
  onRedownload?: () => void
}


const modeBg: Record<ProcessingMode, string> = {
  split: 'bg-mode-split hover:bg-mode-split/90',
  merge: 'bg-mode-merge hover:bg-mode-merge/90',
  exclude: 'bg-mode-exclude hover:bg-mode-exclude/90',
}
const modeBar: Record<ProcessingMode, string> = {
  split: 'bg-mode-split',
  merge: 'bg-mode-merge',
  exclude: 'bg-mode-exclude',
}

export function ProcessingPanel({
  mode, isProcessing, isLoading, isLoaded, progress, step, logs,
  segments, hasFile, onStart, onLoadFFmpeg, lastExport, onRedownload
}: ProcessingPanelProps) {
  const { isRtl } = useLanguage()
  const [showPreview, setShowPreview] = useState(false)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs])

  const canStart = hasFile && segments > 0 && !isProcessing && !isLoading

  const t = {
    infoMsg: isRtl ? 'تتم المعالجة داخل متصفحك — لا حاجة للرفع.' : 'FFmpeg processes video in your browser — no upload needed.',
    loading: isRtl ? 'جاري التحميل...' : 'Loading...',
    preload: isRtl ? 'تحميل FFmpeg' : 'Pre-load FFmpeg',
    vidLoaded: isRtl ? 'تم تحميل الفيديو' : 'Video loaded',
    segNeed2: isRtl ? 'يجب تحديد مقطعين للدمج' : 'Need ≥ 2 for merge',
    processingMsg: isRtl ? 'جاري المعالجة...' : 'Processing...',
    modeAction: {
      split: isRtl ? 'تقسيم إلى ملف مضغوط' : 'Split into ZIP',
      merge: isRtl ? 'دمج المقاطع' : 'Merge segments',
      exclude: isRtl ? 'استبعاد واستخراج' : 'Exclude & export',
    }
  }

  return (
    <div className="card flex flex-col gap-4">


      {/* Validation hints */}
      {!isProcessing && (
        <div className="flex flex-wrap gap-2">
          <StatusBadge ok={hasFile} label={t.vidLoaded} />
          <StatusBadge ok={segments > 0} label={`${segments} ${isRtl ? 'مقطع' : 'segment'}${segments !== 1 && !isRtl ? 's' : ''}`} />
          {mode === 'merge' && <StatusBadge ok={segments >= 2} label={t.segNeed2} />}
        </div>
      )}

      {/* Progress */}
      {(isProcessing || progress > 0) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-[80%]">
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-light shrink-0" />}
              {step || t.processingMsg}
            </span>
            <span className="font-mono font-semibold">{progress}%</span>
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-300', modeBar[mode])}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Last Export & Re-Download Card */}
      {lastExport && !isProcessing && (
        <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-accent/10 to-transparent border border-emerald-500/30 rounded-2xl flex flex-col gap-2.5 animate-fade-in shadow-lg shadow-emerald-500/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  {isRtl ? 'الفيديو جاهز ومحفوظ في الذاكرة!' : 'Export Ready in Memory!'}
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono font-bold">
                    {(lastExport.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </h4>
                <p className="text-[10px] text-text-muted truncate max-w-[200px] sm:max-w-[260px]">
                  {lastExport.name}
                </p>
              </div>
            </div>
            
            {!lastExport.isZip && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] px-2 py-1 rounded-lg bg-bg-elevated hover:bg-bg-border border border-bg-border text-text-secondary flex items-center gap-1 transition-colors"
                title={isRtl ? 'معاينة الفيديو' : 'Preview video'}
              >
                <Eye className="w-3 h-3" />
                {showPreview ? (isRtl ? 'إخفاء' : 'Hide') : (isRtl ? 'معاينة' : 'Preview')}
              </button>
            )}
          </div>

          <p className="text-[10px] text-text-muted leading-tight">
            {isRtl
              ? '💡 الملف تم حفظه في ذاكرة المتصفح. إذا تعذر التحميل بسبب امتلاء القرص أو إيقاف المتصفح، يمكنك إعادة تحميله فوراً دون انتظار.'
              : '💡 File safely stored in browser memory. If download was interrupted or disk full, re-download instantly without re-processing.'}
          </p>

          <button
            type="button"
            onClick={onRedownload}
            className="w-full py-2.5 px-3 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            {isRtl ? 'تحميل الملف مرة أخرى (Re-Download)' : 'Download Again (Instant)'}
          </button>

          {showPreview && !lastExport.isZip && (
            <div className="mt-2 pt-2 border-t border-bg-border/60">
              <video
                src={lastExport.url}
                controls
                playsInline
                className="w-full rounded-xl max-h-48 bg-black border border-bg-border"
              />
            </div>
          )}
        </div>
      )}

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={!canStart}
        className={clsx(
          'w-full py-3 rounded-xl font-bold transition-all duration-150 flex items-center justify-center gap-2',
          isProcessing ? 'bg-bg-elevated text-text-primary cursor-wait' : canStart ? clsx('text-white', modeBg[mode]) : 'bg-bg-elevated text-text-muted cursor-not-allowed border border-bg-border',
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t.processingMsg} {progress}%
          </>
        ) : (
          <>
            ▶ {t.modeAction[mode]}
          </>
        )}
      </button>

      {/* Log output */}
      {logs.length > 0 && (
        <div 
          ref={logsContainerRef} 
          className="bg-bg-primary border border-bg-border rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs flex flex-col gap-0.5"
        >
          {logs.map(log => (
            <LogLine key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={clsx(
      'flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border',
      ok
        ? 'text-mode-merge border-mode-merge/40 bg-mode-merge/10'
        : 'text-text-muted border-bg-border bg-bg-elevated'
    )}>
      {ok
        ? <CheckCircle className="w-3 h-3" />
        : <AlertCircle className="w-3 h-3" />
      }
      {label}
    </div>
  )
}

function LogLine({ log }: { log: LogEntry }) {
  const colors: Record<LogEntry['type'], string> = {
    ok: 'text-mode-merge',
    error: 'text-mode-exclude',
    info: 'text-text-muted',
    progress: 'text-accent-light',
  }

  return (
    <div className={clsx('leading-relaxed', colors[log.type])}>
      {log.type === 'ok' && '✓ '}
      {log.type === 'error' && '✗ '}
      {log.type === 'progress' && '· '}
      {log.message}
    </div>
  )
}

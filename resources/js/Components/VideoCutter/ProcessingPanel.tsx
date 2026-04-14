import { useRef, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import type { LogEntry, ProcessingMode } from '../../types'
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
  segments, hasFile, onStart, onLoadFFmpeg,
}: ProcessingPanelProps) {
  const { isRtl } = useLanguage()
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        <div className="bg-bg-primary border border-bg-border rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs flex flex-col gap-0.5">
          {logs.map(log => (
            <LogLine key={log.id} log={log} />
          ))}
          <div ref={logsEndRef} />
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

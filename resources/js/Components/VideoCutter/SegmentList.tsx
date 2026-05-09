import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, Play, ChevronDown, ChevronUp, Film, Maximize2 } from 'lucide-react'
import type { Segment, ProcessingMode, ProjectFile } from '../../types'
import { secondsToTime, timeToSeconds, isValidTime } from '../../Lib/time-utils'
import { clsx } from 'clsx'
import { useLanguage } from '../../Hooks/useLanguage'
import { Clock } from 'lucide-react'

interface SegmentListProps {
  segments: Segment[]
  files: ProjectFile[]
  activeFileId: string | null
  mode: ProcessingMode
  duration: number
  currentTime: number
  inPoint: number | null
  videoSpeed: number
  onAdd: (start?: number, end?: number) => void
  onUpdate: (id: string, changes: Partial<Segment>) => void
  onRemove: (id: string) => void
  onSort: () => void
  onClear: () => void
  onSeekTo: (t: number) => void
  onSwitchToFile: (fileId: string, time?: number) => void
  onImportOpen: () => void
  onSetSegments?: (segs: Segment[]) => void
  onAutoCut?: () => void
  isAutoCutting?: boolean
  disabled?: boolean
}

const modeColors: Record<ProcessingMode, string> = {
  split: 'seg-split',
  merge: 'seg-merge',
  exclude: 'seg-exclude',
}
const modeDots: Record<ProcessingMode, string> = {
  split: 'bg-mode-split',
  merge: 'bg-mode-merge',
  exclude: 'bg-mode-exclude',
}

function TimeCell({ value, onChange, disabled }: {
  value: number
  onChange: (s: number) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = useCallback(() => {
    if (isValidTime(draft)) {
      const s = timeToSeconds(draft)
      if (!isNaN(s)) onChange(s)
    }
    setEditing(false)
  }, [draft, onChange])

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        className="time-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        placeholder="00:00:00"
      />
    )
  }

  return (
    <div className="flex items-center gap-1 group/cell">
      {!disabled && (
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-5 h-5 flex items-center justify-center rounded bg-bg-border hover:bg-bg-elevated text-text-muted transition-colors opacity-0 group-hover/cell:opacity-100"
          title="-1s"
        >
          <span className="text-[10px]">-</span>
        </button>
      )}
      <button
        onClick={() => { setDraft(secondsToTime(value)); setEditing(true) }}
        disabled={disabled}
        className="time-input hover:border-accent/40 transition-colors"
        title="Click to edit"
      >
        {secondsToTime(value)}
      </button>
      {!disabled && (
        <button
          onClick={() => onChange(value + 1)}
          className="w-5 h-5 flex items-center justify-center rounded bg-bg-border hover:bg-bg-elevated text-text-muted transition-colors opacity-0 group-hover/cell:opacity-100"
          title="+1s"
        >
          <span className="text-[10px]">+</span>
        </button>
      )}
    </div>
  )
}

export function SegmentList({
  segments, files, activeFileId, mode, duration, currentTime, inPoint, videoSpeed,
  onAdd, onUpdate, onRemove, onSort, onClear, onSeekTo, onSwitchToFile, onImportOpen, onSetSegments, onAutoCut, isAutoCutting, disabled,
}: SegmentListProps) {
  const [collapsed, setCollapsed] = useState(false)

  const { isRtl } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(segments.length)

  useEffect(() => {
    if (segments.length > prevCount.current && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
    prevCount.current = segments.length
  }, [segments.length])

  const exportCSV = useCallback(() => {
    const rows = [
      ['#', 'Name', 'Start', 'End', 'Duration'].join(','),
      ...segments.map((s, i) => [
        i + 1,
        `"${s.name}"`,
        secondsToTime(s.start),
        secondsToTime(s.end),
        secondsToTime(s.end - s.start),
      ].join(',')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'segments.csv'
    a.click()
  }, [segments])

  const exportJSON = useCallback(() => {
    const data = { version: 1, segments }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'project_segments.json'
    a.click()
  }, [segments])

  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onSetSegments) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data && Array.isArray(data.segments)) {
          onSetSegments(data.segments)
        }
      } catch (err) {
        console.error('Failed to parse JSON', err)
      }
    }
    reader.readAsText(file)
    e.target.value = '' // Reset input
  }, [onSetSegments])

  const totalDuration = segments.reduce((acc, s) => acc + (s.end - s.start), 0)

  return (
    <div className="card flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center gap-2 hover:text-text-primary transition-colors"
          >
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
              {isRtl ? 'المقاطع' : 'Segments'}
            </h3>
            <span className={clsx('w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold', modeDots[mode])}>
              {segments.length}
            </span>
            {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronUp className="w-3.5 h-3.5 text-text-muted" />}
          </button>
          {totalDuration > 0 && (
            <span className="text-xs text-text-muted whitespace-nowrap">
              {isRtl ? 'الإجمالي:' : 'Total:'} {secondsToTime(totalDuration)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 ml-auto">
          {segments.length > 0 && (
            <>
              <button
                onClick={exportCSV}
                disabled={disabled}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded hover:bg-bg-elevated"
                title="Export list as CSV"
              >
                CSV
              </button>
              <button
                onClick={exportJSON}
                disabled={disabled}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded hover:bg-bg-elevated"
                title="Save Project as JSON"
              >
                Save
              </button>
              <label 
                className={clsx(
                  "cursor-pointer text-xs text-text-muted transition-colors px-2 py-1 rounded",
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:text-text-secondary hover:bg-bg-elevated"
                )}
                title="Load Project from JSON"
              >
                Load
                <input type="file" accept=".json" className="hidden" disabled={disabled} onChange={handleImportJSON} />
              </label>
              <div className="w-[1px] h-4 bg-bg-border mx-1" />
              <button
                onClick={onSort}
                disabled={disabled}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded hover:bg-bg-elevated"
                title={isRtl ? 'فرز حسب وقت البدء' : 'Sort by start time'}
              >
                {isRtl ? 'فرز' : 'Sort'}
              </button>
              <button
                onClick={onClear}
                disabled={disabled}
                className="text-xs text-mode-exclude/70 hover:text-mode-exclude transition-colors px-2 py-1 rounded hover:bg-bg-elevated"
                title={isRtl ? 'مسح كل المقاطع' : 'Clear all segments'}
              >
                {isRtl ? 'مسح' : 'Clear'}
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Segment rows */}
          {segments.length === 0 ? (
            <div className="py-6 flex flex-col items-center gap-3 text-text-muted">
              <div className="text-4xl">✂️</div>
              <div className="text-center">
                <p className="text-text-secondary text-sm">{isRtl ? 'لا توجد مقاطع بعد' : 'No segments yet'}</p>
                <p className="text-xs mt-1">
                  {isRtl ? (
                    <>استخدم <kbd className="bg-bg-elevated border border-bg-border rounded px-1 font-mono text-[10px]">O</kbd> / <kbd className="bg-bg-elevated border border-bg-border rounded px-1 font-mono text-[10px]">I</kbd> أثناء المشاهدة، أو أضف يدوياً</>
                  ) : (
                    <>Use <kbd className="bg-bg-elevated border border-bg-border rounded px-1 font-mono text-[10px]">I</kbd> / <kbd className="bg-bg-elevated border border-bg-border rounded px-1 font-mono text-[10px]">O</kbd> while watching, or add manually</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
              {segments.map((seg, i) => {
                const isActive = currentTime >= seg.start && currentTime <= seg.end;
                return (
                <div
                  key={seg.id}
                  className={clsx(
                    'flex flex-col gap-3 p-5 rounded-[1.5rem] border-2 transition-all animate-fade-in group/item relative overflow-hidden shadow-md min-h-[90px] justify-center',
                    isActive 
                      ? 'border-accent bg-accent/15 shadow-xl shadow-accent/20 ring-2 ring-accent/30 scale-[1.02] z-10' 
                      : (mode === 'split' ? 'border-blue-500/40 bg-blue-500/10' : mode === 'merge' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'),
                    'hover:bg-opacity-100 transition-all duration-300 mb-2'
                  )}
                >
                  {/* Left Accent Bar */}
                  <div className={clsx(
                    "absolute top-0 bottom-0 left-0 w-2 transition-all",
                    isActive ? "bg-accent shadow-[4px_0_15px_rgba(124,58,237,0.6)]" : (mode === 'split' ? "bg-blue-500" : mode === 'merge' ? "bg-emerald-500" : "bg-rose-500"),
                  )} />
                  {/* Row 1: Index, Name, Delete */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-8 h-8 text-xs font-black text-white rounded-xl shadow-md" style={{ backgroundColor: mode === 'split' ? '#3B82F6' : mode === 'merge' ? '#10B981' : '#EF4444' }}>
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={seg.name}
                          disabled={disabled}
                          onChange={e => onUpdate(seg.id, { name: e.target.value })}
                          className="bg-transparent border-none outline-none text-text-primary text-base font-black w-full focus:bg-white/10 focus:px-3 focus:rounded-xl transition-all"
                          placeholder={`${isRtl ? 'مقطع' : 'Segment'} ${i + 1}`}
                        />
                      </div>
                      
                      {/* File Reference */}
                      {files.length > 1 && (
                        <div className="flex items-center gap-2 ml-8.5 mt-1">
                          <Film className="w-3.5 h-3.5 text-text-muted" />
                          <span className="text-[10px] text-text-muted font-medium truncate max-w-[150px]">
                            {files.find(f => f.id === seg.fileId)?.name || 'Unknown File'}
                          </span>
                          {seg.fileId !== activeFileId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onSwitchToFile(seg.fileId, seg.start)
                              }}
                              className="text-[10px] text-accent font-bold hover:underline flex items-center gap-1 bg-accent/5 px-1.5 py-0.5 rounded-md"
                            >
                              <Maximize2 className="w-2.5 h-2.5" />
                              {isRtl ? 'تبديل' : 'Switch'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemove(seg.id)}
                      disabled={disabled}
                      className="text-text-muted hover:text-mode-exclude transition-colors p-1"
                      title={isRtl ? 'حذف المقطع' : 'Remove segment'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Row 2: Start & End Times */}
                  <div className="flex flex-wrap items-center gap-3 pl-8.5">
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      <button
                        onClick={() => onSeekTo(seg.start)}
                        disabled={disabled}
                        className="text-text-muted hover:text-text-primary transition-colors"
                        title="Jump to start"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <TimeCell
                        value={seg.start}
                        disabled={disabled}
                        onChange={v => onUpdate(seg.id, { start: Math.min(v, seg.end - 0.1) })}
                      />
                    </div>

                    <div className="w-4 h-[2px] bg-white/10 rounded-full" />

                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 shadow-sm">
                      <TimeCell
                        value={seg.end}
                        disabled={disabled}
                        onChange={v => onUpdate(seg.id, { end: Math.max(v, seg.start + 0.1) })}
                      />
                      <button
                        onClick={() => onSeekTo(seg.end)}
                        disabled={disabled}
                        className="text-text-muted hover:text-text-primary transition-colors"
                        title="Jump to end"
                      >
                        <Maximize2 className="w-3.5 h-3.5 rotate-45" />
                      </button>
                    </div>

                    {/* Final Duration Label */}
                    <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20">
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black font-mono text-accent">
                          {secondsToTime(seg.end - seg.start)}
                        </span>
                        {videoSpeed !== 1 && (
                          <span className="text-[9px] font-bold text-text-muted opacity-80">
                            {isRtl ? 'الفعلي:' : 'Actual:'} {secondsToTime((seg.end - seg.start) / videoSpeed)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-bg-border">
            {inPoint !== null && (
              <div className="text-xs text-accent-light flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-light animate-pulse-soft" />
                {isRtl ? 'البدء' : 'In'}: {secondsToTime(inPoint)}
              </div>
            )}
            <button
              onClick={() => onAdd(0, duration)}
              disabled={disabled || duration <= 0}
              className="flex items-center gap-1.5 text-sm btn-ghost text-accent-light hover:text-accent py-1.5"
            >
              <Plus className="w-4 h-4" />
              {isRtl ? 'إضافة الفيديو كاملاً' : 'Add full video'}
            </button>
            <button
              onClick={() => {
                const start = Math.max(0, currentTime)
                const end = Math.min(duration || start + 10, start + 10)
                onAdd(start, end)
              }}
              disabled={disabled}
              className="flex items-center gap-1.5 text-sm btn-ghost text-text-secondary hover:text-text-primary py-1.5"
            >
              <Plus className="w-4 h-4" />
              {isRtl ? 'إضافة مقطع' : 'Add segment'}
            </button>
            <button
              onClick={onImportOpen}
              disabled={disabled}
              className="text-sm btn-ghost text-text-muted hover:text-text-secondary py-1.5"
            >
              {isRtl ? 'استيراد' : 'Import'}
            </button>

            {onAutoCut && (
              <button
                onClick={onAutoCut}
                disabled={disabled || isAutoCutting || duration <= 0}
                className={clsx(
                  "flex items-center gap-1.5 text-sm btn-ghost py-1.5 transition-all",
                  isAutoCutting ? "text-accent animate-pulse" : "text-violet-500 hover:text-violet-400"
                )}
              >
                <Maximize2 className={clsx("w-4 h-4", isAutoCutting && "animate-spin")} />
                {isAutoCutting 
                  ? (isRtl ? 'جاري التحليل...' : 'Analyzing...') 
                  : (isRtl ? 'تقطيع تلقائي' : 'Auto Cut')
                }
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

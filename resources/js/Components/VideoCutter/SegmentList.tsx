import { useState, useCallback } from 'react'
import { Plus, Trash2, Play, ChevronDown, ChevronUp } from 'lucide-react'
import type { Segment, ProcessingMode } from '../../types'
import { secondsToTime, timeToSeconds, isValidTime } from '../../Lib/time-utils'
import { clsx } from 'clsx'
import { useLanguage } from '../../Hooks/useLanguage'

interface SegmentListProps {
  segments: Segment[]
  mode: ProcessingMode
  duration: number
  currentTime: number
  inPoint: number | null
  onAdd: (start?: number, end?: number) => void
  onUpdate: (id: string, changes: Partial<Segment>) => void
  onRemove: (id: string) => void
  onSort: () => void
  onClear: () => void
  onSeekTo: (t: number) => void
  onImportOpen: () => void
  onSetSegments?: (segs: Segment[]) => void
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
    <button
      onClick={() => { setDraft(secondsToTime(value)); setEditing(true) }}
      disabled={disabled}
      className="time-input hover:border-accent/40 transition-colors"
      title="Click to edit"
    >
      {secondsToTime(value)}
    </button>
  )
}

export function SegmentList({
  segments, mode, duration, currentTime, inPoint,
  onAdd, onUpdate, onRemove, onSort, onClear, onSeekTo, onImportOpen, onSetSegments, disabled,
}: SegmentListProps) {
  const [collapsed, setCollapsed] = useState(false)

  const { isRtl } = useLanguage()

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
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
              {segments.map((seg, i) => (
                <div
                  key={seg.id}
                  className={clsx(
                    'flex flex-col gap-2 p-3 rounded-lg border transition-all animate-fade-in',
                    modeColors[mode],
                  )}
                >
                  {/* Row 1: Index, Name, Delete */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-text-muted font-mono bg-bg-primary px-1.5 py-0.5 rounded border border-bg-border">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={seg.name}
                        disabled={disabled}
                        onChange={e => onUpdate(seg.id, { name: e.target.value })}
                        className="bg-transparent border-none outline-none text-text-primary text-sm font-medium w-full focus:bg-bg-elevated focus:px-2 focus:rounded transition-all"
                        placeholder={`${isRtl ? 'مقطع' : 'Segment'} ${i + 1}`}
                      />
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
                  <div className="flex items-center gap-2 pl-8">
                    <div className="flex items-center gap-1.5 bg-bg-inverted text-text-inverted border border-bg-inverted rounded-xl px-2 py-1 shadow-sm font-medium">
                      <button
                        onClick={() => onSeekTo(seg.start)}
                        disabled={disabled}
                        className="opacity-70 hover:opacity-100 transition-opacity"
                        title="Jump to start"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <TimeCell
                        value={seg.start}
                        disabled={disabled}
                        onChange={v => onUpdate(seg.id, { start: Math.min(v, seg.end - 0.1) })}
                      />
                    </div>
                    <span className="text-text-muted text-xs font-mono">—</span>
                    <div className="flex items-center gap-1.5 bg-bg-inverted text-text-inverted border border-bg-inverted rounded-xl px-2 py-1 shadow-sm font-medium">
                      <TimeCell
                        value={seg.end}
                        disabled={disabled}
                        onChange={v => onUpdate(seg.id, { end: Math.max(v, seg.start + 0.1) })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-bg-border">
            {inPoint !== null && (
              <div className="text-xs text-accent-light flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-light animate-pulse-soft" />
                {isRtl ? 'البدء' : 'In'}: {secondsToTime(inPoint)}
              </div>
            )}
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
          </div>
        </>
      )}
    </div>
  )
}

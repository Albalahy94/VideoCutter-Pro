import { useState, useCallback } from 'react'
import { X, FileText, Sparkles } from 'lucide-react'
import { smartParse } from '../../Lib/smart-import'
import type { Segment } from '../../types'
import { clsx } from 'clsx'

interface SmartImportModalProps {
  isOpen: boolean
  duration: number
  onClose: () => void
  onImport: (segments: Segment[]) => void
}

const EXAMPLES = [
  {
    label: 'YouTube chapters',
    text: `0:00 Intro\n2:30 Main Topic\n8:45 Deep Dive\n15:20 Conclusion`,
  },
  {
    label: 'Timecode list',
    text: `Intro | 00:00:00 | 00:02:30\nMain | 00:02:30 | 00:08:45\nOutro | 00:15:20 | 00:18:00`,
  },
]

export function SmartImportModal({ isOpen, duration, onClose, onImport }: SmartImportModalProps) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<Segment[] | null>(null)
  const [formatName, setFormatName] = useState('')
  const [error, setError] = useState('')

  const parse = useCallback((raw: string) => {
    setError('')
    setPreview(null)
    setFormatName('')
    if (!raw.trim()) return

    const result = smartParse(raw, duration)
    if (result) {
      setPreview(result.segments)
      setFormatName(result.format)
    } else {
      setError('Could not detect format. Supported: YouTube chapters, SRT subtitles, pipe/comma-separated timecodes.')
    }
  }, [duration])

  const handleTextChange = useCallback((val: string) => {
    setText(val)
    parse(val)
  }, [parse])

  const handleImport = useCallback(() => {
    if (!preview) return
    onImport(preview)
    setText('')
    setPreview(null)
    onClose()
  }, [preview, onImport, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-bg-card border border-bg-border rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-light" />
            <h2 className="font-semibold text-text-primary">Smart Import</h2>
          </div>
          <button onClick={onClose} className="btn-icon text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Text area */}
          <div>
            <label className="text-xs text-text-secondary block mb-2">
              Paste YouTube chapters, SRT subtitles, or timecode list:
            </label>
            <textarea
              className={clsx(
                'input-field h-36 resize-none font-mono text-xs',
                error ? 'border-mode-exclude/60' : ''
              )}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={`Example — YouTube chapters:\n0:00 Intro\n5:30 Chapter 2\n12:45 Conclusion`}
            />
          </div>

          {/* Examples */}
          <div className="flex gap-2">
            {EXAMPLES.map(ex => (
              <button
                key={ex.label}
                onClick={() => handleTextChange(ex.text)}
                className="text-xs text-text-muted hover:text-accent-light border border-bg-border hover:border-accent/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-mode-exclude bg-mode-exclude/10 border border-mode-exclude/30 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="bg-bg-elevated border border-mode-merge/30 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-mode-merge">
                <FileText className="w-3.5 h-3.5" />
                <span>Detected: <strong>{formatName}</strong> — {preview.length} segments</span>
              </div>
              <div className="max-h-36 overflow-y-auto flex flex-col gap-1">
                {preview.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="text-text-muted w-4 text-right">{i + 1}.</span>
                    <span className="font-mono text-text-muted">
                      {String(Math.floor(s.start / 60)).padStart(2, '0')}:{String(Math.floor(s.start % 60)).padStart(2, '0')}
                      {' → '}
                      {String(Math.floor(s.end / 60)).padStart(2, '0')}:{String(Math.floor(s.end % 60)).padStart(2, '0')}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2.5">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!preview || preview.length === 0}
              className="btn-primary flex-1 text-sm py-2.5"
            >
              Import {preview?.length || 0} segment{preview?.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

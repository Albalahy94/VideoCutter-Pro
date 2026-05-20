/**
 * SegmentAnalysisPanel
 * Displays a rich AI analysis card for a single video segment.
 * Shows key frames, scene description, visual style, motion level,
 * mood, content tags, and content creator tips.
 */

import { useState, useCallback } from 'react'
import { Sparkles, Brain, Tag, Lightbulb, Zap, Eye, Copy, ChevronDown, ChevronUp, RefreshCw, X, Film } from 'lucide-react'
import { clsx } from 'clsx'
import type { SegmentAnalysis, MotionLevel } from '../../types'
import type { SegmentAnalysisState } from '../../Hooks/useVideoAnalysis'
import { useLanguage } from '../../Hooks/useLanguage'

interface SegmentAnalysisPanelProps {
  segmentId: string
  segmentName: string
  state: SegmentAnalysisState
  onAnalyze: () => void
  onClear: () => void
  compact?: boolean // When shown inline in segment card
}

const motionConfig: Record<MotionLevel, { label: string; labelAr: string; bars: number; color: string }> = {
  static:  { label: 'Static',  labelAr: 'ثابت',    bars: 1, color: 'bg-blue-400' },
  low:     { label: 'Low',     labelAr: 'منخفض',   bars: 2, color: 'bg-green-400' },
  medium:  { label: 'Medium',  labelAr: 'متوسط',   bars: 3, color: 'bg-yellow-400' },
  high:    { label: 'High',    labelAr: 'مرتفع',   bars: 4, color: 'bg-red-400' },
}

function ViralScoreMeter({ score }: { score: number }) {
  const { isRtl } = useLanguage()
  const color = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  const label = score >= 80
    ? (isRtl ? 'فرصة انتشار عالية 🚀' : 'High Viral Potential 🚀')
    : score >= 50
    ? (isRtl ? 'جيد 👍' : 'Good 👍')
    : (isRtl ? 'يحتاج لـ Hook أقوى 💡' : 'Needs Stronger Hook 💡')

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={clsx('h-full transition-all duration-1000', score >= 80 ? 'bg-green-400' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400')}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={clsx('text-xs font-bold w-10 text-right', color)}>{score}%</span>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  )
}

function MotionMeter({ level }: { level: MotionLevel }) {
  const { isRtl } = useLanguage()
  const cfg = motionConfig[level]
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map(n => (
          <div
            key={n}
            className={clsx(
              'w-2 rounded-sm transition-all',
              n <= cfg.bars ? cfg.color : 'bg-white/10',
              n === 1 ? 'h-2' : n === 2 ? 'h-3' : n === 3 ? 'h-4' : 'h-5'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">{isRtl ? cfg.labelAr : cfg.label}</span>
    </div>
  )
}

function KeyFrameGrid({ frames, thumbnail }: { frames: string[], thumbnail: string }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const { isRtl } = useLanguage()

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5">
        {frames.map((frame, i) => (
          <button
            key={i}
            onClick={() => setLightboxIdx(i)}
            className="relative rounded-xl overflow-hidden bg-black/30 aspect-video group hover:ring-2 hover:ring-accent/60 transition-all"
          >
            <img
              src={frame}
              alt={`Frame ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {frame === thumbnail && (
              <div className="absolute top-1 left-1 bg-accent text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                {isRtl ? 'صورة مصغرة' : 'Thumbnail'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
              <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded font-mono">
              {i + 1}
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={frames[lightboxIdx]}
            alt={`Frame ${lightboxIdx + 1}`}
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-4 flex gap-2">
            {frames.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setLightboxIdx(i) }}
                className={clsx(
                  'w-2 h-2 rounded-full transition-all',
                  i === lightboxIdx ? 'bg-accent scale-150' : 'bg-white/40 hover:bg-white/70'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function AnalysisContent({ analysis, onClear }: { analysis: SegmentAnalysis; onClear: () => void }) {
  const { isRtl } = useLanguage()
  const [expanded, setExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const copyReport = useCallback(() => {
    const tips = analysis.creatorTips.map((t, i) => `${i + 1}. ${t}`).join('\n')
    const report = isRtl
      ? `📊 تحليل المقطع\n\n🎬 الوصف: ${analysis.sceneDescription}\n🎨 الأسلوب: ${analysis.visualStyle}\n😊 المزاج: ${analysis.mood}\n🏷️ الوسوم: ${analysis.contentTags.join(', ')}\n\n💡 نصائح:\n${tips}`
      : `📊 Segment Analysis\n\n🎬 Scene: ${analysis.sceneDescription}\n🎨 Style: ${analysis.visualStyle}\n😊 Mood: ${analysis.mood}\n🏷️ Tags: ${analysis.contentTags.join(', ')}\n\n💡 Tips:\n${tips}`

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [analysis, isRtl])

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
            {isRtl ? 'تحليل AI' : 'AI Analysis'}
          </span>
          <span className="text-[10px] text-text-muted">
            {new Date(analysis.analyzedAt).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copyReport}
            className="w-6 h-6 rounded-lg bg-bg-elevated hover:bg-bg-border flex items-center justify-center transition-colors"
            title={isRtl ? 'نسخ التقرير' : 'Copy report'}
          >
            {copied
              ? <span className="text-[10px] text-green-400">✓</span>
              : <Copy className="w-3 h-3 text-text-muted" />
            }
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-6 h-6 rounded-lg bg-bg-elevated hover:bg-bg-border flex items-center justify-center transition-colors"
          >
            {expanded
              ? <ChevronUp className="w-3 h-3 text-text-muted" />
              : <ChevronDown className="w-3 h-3 text-text-muted" />
            }
          </button>
          <button
            onClick={onClear}
            className="w-6 h-6 rounded-lg bg-bg-elevated hover:bg-rose-500/20 flex items-center justify-center transition-colors"
            title={isRtl ? 'مسح التحليل' : 'Clear analysis'}
          >
            <X className="w-3 h-3 text-text-muted hover:text-rose-400" />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Key Frames */}
          {analysis.keyFrames.length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5">
                {isRtl ? 'الفريمات الرئيسية' : 'Key Frames'}
              </p>
              <KeyFrameGrid frames={analysis.keyFrames} thumbnail={analysis.thumbnail} />
            </div>
          )}

          {/* Viral Score */}
          <div className="p-3 bg-bg-elevated/50 rounded-xl border border-bg-border">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              {isRtl ? 'فرصة الانتشار (Viral Score)' : 'Viral Score'}
            </p>
            <ViralScoreMeter score={analysis.viralScore} />
          </div>

          {/* Scene Description */}
          <div className="p-3 bg-bg-elevated/50 rounded-xl border border-bg-border">
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {isRtl ? 'وصف السين' : 'Scene Description'}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">{analysis.sceneDescription}</p>
          </div>

          {/* Visual Style + Motion + Mood — 3-col grid */}
          <div className="grid grid-cols-1 gap-2">
            <div className="p-3 bg-bg-elevated/50 rounded-xl border border-bg-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5">
                {isRtl ? 'الأسلوب البصري' : 'Visual Style'}
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">{analysis.visualStyle}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-bg-elevated/50 rounded-xl border border-bg-border">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2">
                  {isRtl ? 'الحركة' : 'Motion'}
                </p>
                <MotionMeter level={analysis.motionLevel} />
              </div>
              <div className="p-3 bg-bg-elevated/50 rounded-xl border border-bg-border">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5">
                  {isRtl ? 'المزاج' : 'Mood'}
                </p>
                <p className="text-xs text-text-secondary">{analysis.mood}</p>
              </div>
            </div>
          </div>

          {/* Content Tags */}
          {analysis.contentTags.length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {isRtl ? 'الوسوم' : 'Tags'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.contentTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Creator Tips & B-Roll */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.creatorTips.length > 0 && (
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-yellow-400" />
                  {isRtl ? 'نصائح صانع المحتوى' : 'Creator Tips'}
                </p>
                <div className="flex flex-col gap-1.5">
                  {analysis.creatorTips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-yellow-500/5 border border-yellow-500/20"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="text-xs text-text-secondary leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.bRollSuggestions && analysis.bRollSuggestions.length > 0 && (
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                  <Film className="w-3 h-3 text-blue-400" />
                  {isRtl ? 'اقتراحات B-Roll' : 'B-Roll Suggestions'}
                </p>
                <div className="flex flex-col gap-1.5">
                  {analysis.bRollSuggestions.map((broll, i) => (
                    <a
                      key={i}
                      href={`https://www.pexels.com/search/videos/${encodeURIComponent(broll)}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors group"
                      title={isRtl ? 'ابحث في Pexels' : 'Search on Pexels'}
                    >
                      <span className="text-xs text-blue-400 font-medium group-hover:underline">{broll}</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Pexels ↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Social Media Copy */}
          {analysis.socialMediaCopy && (
            <div className="p-3 bg-bg-elevated/50 rounded-xl border border-bg-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold flex items-center gap-1">
                  <Copy className="w-3 h-3 text-violet-400" />
                  {isRtl ? 'صانع المحتوى (Social Copy)' : 'Social Media Copy'}
                </p>
              </div>
              
              <div className="space-y-3">
                {/* Titles */}
                {analysis.socialMediaCopy.titles.length > 0 && (
                  <div>
                    <span className="text-[10px] text-text-muted block mb-1">{isRtl ? 'عناوين مقترحة:' : 'Suggested Titles:'}</span>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-0.5 pl-1">
                      {analysis.socialMediaCopy.titles.map((title, i) => (
                        <li key={i}>{title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Description */}
                {analysis.socialMediaCopy.description && (
                  <div>
                    <span className="text-[10px] text-text-muted block mb-1">{isRtl ? 'الوصف:' : 'Description:'}</span>
                    <p className="text-xs text-text-secondary bg-bg-primary p-2 rounded-lg border border-bg-border">
                      {analysis.socialMediaCopy.description}
                    </p>
                  </div>
                )}
                
                {/* Hashtags */}
                {analysis.socialMediaCopy.hashtags.length > 0 && (
                  <div>
                    <span className="text-[10px] text-text-muted block mb-1">{isRtl ? 'هاشتاجات:' : 'Hashtags:'}</span>
                    <div className="flex flex-wrap gap-1">
                      {analysis.socialMediaCopy.hashtags.map((tag, i) => (
                        <span key={i} className="text-[10px] text-blue-400">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function SegmentAnalysisPanel({
  segmentId,
  segmentName,
  state,
  onAnalyze,
  onClear,
  compact = false,
}: SegmentAnalysisPanelProps) {
  const { isRtl } = useLanguage()
  const { analysis, status, error } = state

  if (status === 'idle') return null

  if (status === 'analyzing') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 animate-pulse-soft">
        <div className="w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin flex-shrink-0" />
        <span className="text-xs text-violet-400 font-medium">
          {isRtl ? 'جاري التحليل بالذكاء الاصطناعي...' : 'Analyzing with AI...'}
        </span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
        <div className="flex items-center gap-2">
          <span className="text-rose-400 text-xs">⚠️</span>
          <span className="text-xs text-rose-400">
            {error || (isRtl ? 'فشل التحليل' : 'Analysis failed')}
          </span>
        </div>
        <button
          onClick={onAnalyze}
          className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-bold"
        >
          <RefreshCw className="w-3 h-3" />
          {isRtl ? 'إعادة' : 'Retry'}
        </button>
      </div>
    )
  }

  if (status === 'done' && analysis) {
    return <AnalysisContent analysis={analysis} onClear={onClear} />
  }

  return null
}

/**
 * Inline analysis trigger button shown inside each segment card
 */
export function AnalyzeTriggerButton({
  status,
  thumbnail,
  onAnalyze,
}: {
  status: 'idle' | 'analyzing' | 'done' | 'error'
  thumbnail?: string
  onAnalyze: () => void
}) {
  const { isRtl } = useLanguage()

  if (status === 'analyzing') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-violet-400 font-medium">
        <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
        {isRtl ? 'تحليل...' : 'Analyzing...'}
      </div>
    )
  }

  if (status === 'done' && thumbnail) {
    return (
      <div className="flex items-center gap-1.5">
        <img
          src={thumbnail}
          alt="thumbnail"
          className="w-10 h-6 object-cover rounded-md ring-1 ring-accent/30"
        />
        <button
          onClick={onAnalyze}
          className="text-[10px] text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1"
          title={isRtl ? 'إعادة التحليل' : 'Re-analyze'}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onAnalyze}
      className="flex items-center gap-1 text-[10px] text-violet-500 hover:text-violet-400 font-bold bg-violet-500/10 hover:bg-violet-500/20 px-2 py-1 rounded-lg border border-violet-500/20 transition-all"
    >
      <Sparkles className="w-3 h-3" />
      {isRtl ? 'تحليل AI' : 'AI Analyze'}
    </button>
  )
}

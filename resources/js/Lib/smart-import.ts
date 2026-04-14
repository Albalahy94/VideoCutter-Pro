import type { Segment } from '../types'
import { timeToSeconds } from './time-utils'

function uuid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Parse YouTube chapter format:
 *   0:00 Intro
 *   5:30 Chapter 2
 *   12:45 Conclusion
 */
function parseYouTubeChapters(text: string, totalDuration: number): Segment[] | null {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const pattern = /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/

  const matches = lines.map(l => {
    const m = l.trim().match(pattern)
    if (!m) return null
    return { time: timeToSeconds(m[1]), name: m[2].trim() }
  }).filter(Boolean) as { time: number; name: string }[]

  if (matches.length < 2) return null

  return matches.map((m, i) => ({
    id: uuid(),
    start: m.time,
    end: i + 1 < matches.length ? matches[i + 1].time : totalDuration,
    name: m.name,
  }))
}

/**
 * Parse SRT subtitle format:
 *   1
 *   00:00:10,000 --> 00:00:15,500
 *   Text here
 */
function parseSRT(text: string): Segment[] | null {
  const blocks = text.trim().split(/\n\n+/)
  const timePattern = /(\d{2}:\d{2}:\d{2})[,.](\d+)\s+-->\s+(\d{2}:\d{2}:\d{2})[,.](\d+)/

  const segments: Segment[] = []
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    const timeLine = lines.find(l => timePattern.test(l))
    if (!timeLine) continue
    const m = timeLine.match(timePattern)
    if (!m) continue
    const name = lines.filter(l => !/^\d+$/.test(l) && !timePattern.test(l)).join(' ').trim()
    segments.push({
      id: uuid(),
      start: timeToSeconds(m[1]),
      end: timeToSeconds(m[3]),
      name: name || `Segment ${segments.length + 1}`,
    })
  }

  return segments.length > 0 ? segments : null
}

/**
 * Parse pipe/comma/tab separated timecodes:
 *   Intro | 00:00:00 | 00:01:30
 *   Part1,00:01:30,00:05:00
 */
function parseDelimited(text: string): Segment[] | null {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const timeRe = /\d{1,2}:\d{2}(?::\d{2})?/g
  const segments: Segment[] = []

  for (const line of lines) {
    const times = line.match(timeRe) || []
    if (times.length < 2) continue
    const start = timeToSeconds(times[0] ?? '')
    const end = timeToSeconds(times[1] ?? '')
    if (isNaN(start) || isNaN(end) || end <= start) continue
    const name = line.replace(timeRe, '').replace(/[|,\t]/g, ' ').trim() || `Segment ${segments.length + 1}`
    segments.push({ id: uuid(), start, end, name })
  }

  return segments.length > 0 ? segments : null
}

/** Auto-detect format and parse timecodes from pasted text */
export function smartParse(text: string, totalDuration = 0): { segments: Segment[]; format: string } | null {
  // Try SRT first (most structured)
  if (/\d{2}:\d{2}:\d{2}[,\.]\d+\s+-->/.test(text)) {
    const s = parseSRT(text)
    if (s) return { segments: s, format: 'SRT subtitles' }
  }

  // Try YouTube chapters
  const ytResult = parseYouTubeChapters(text, totalDuration)
  if (ytResult) return { segments: ytResult, format: 'YouTube chapters' }

  // Try delimited
  const delimResult = parseDelimited(text)
  if (delimResult) return { segments: delimResult, format: 'Timecode list' }

  return null
}

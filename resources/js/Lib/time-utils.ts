/** Convert seconds to HH:MM:SS string */
export function secondsToTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':')
}

/** Convert HH:MM:SS or MM:SS to seconds */
export function timeToSeconds(t: string): number {
  const parts = t.trim().split(':').map(Number)
  if (parts.some(isNaN)) return NaN
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

/** Format seconds as human-readable duration (e.g. "1:23:45" or "4:32") */
export function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Validate a time string */
export function isValidTime(t: string): boolean {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(t.trim()) && !isNaN(timeToSeconds(t))
}

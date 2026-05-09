import { useEffect, useRef, useState } from 'react'

interface WaveformCanvasProps {
  file: File | null
  color?: string
  gap?: number
  barWidth?: number
}

// Max file size (100MB) - above this we skip waveform to avoid memory issues
const MAX_WAVEFORM_SIZE_MB = 100

export function WaveformCanvas({ 
  file, 
  color = 'rgba(124, 58, 237, 0.35)',
  gap = 1,
  barWidth = 2
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [peaks, setPeaks] = useState<number[]>([])
  const cache = useRef<Map<string, number[]>>(new Map())

  useEffect(() => {
    if (!file) {
      setPeaks([])
      return
    }

    // Skip large files to prevent browser freeze
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_WAVEFORM_SIZE_MB) {
      return
    }

    const cacheKey = `${file.name}-${file.size}`
    if (cache.current.has(cacheKey)) {
      setPeaks(cache.current.get(cacheKey)!)
      return
    }

    let isCancelled = false

    const generatePeaks = async () => {
      try {
        // Use a small slice of the file for waveform (first 2MB = rough preview)
        const sliceSize = Math.min(file.size, 2 * 1024 * 1024)
        const slice = file.slice(0, sliceSize)
        const arrayBuffer = await slice.arrayBuffer()

        if (isCancelled) return

        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext)
        if (!AudioContextClass) return

        const audioCtx = new AudioContextClass()

        let audioBuffer: AudioBuffer
        try {
          audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        } catch {
          // Audio decode might fail if the slice is incomplete - that's OK
          await audioCtx.close()
          return
        }

        if (isCancelled) {
          await audioCtx.close()
          return
        }

        const rawData = audioBuffer.getChannelData(0)
        const samples = 150
        const blockSize = Math.max(1, Math.floor(rawData.length / samples))
        const filteredData: number[] = []

        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j] || 0)
          }
          filteredData.push(sum / blockSize)
        }

        const max = Math.max(...filteredData, 0.001)
        const normalized = filteredData.map(n => n / max)

        await audioCtx.close()
        cache.current.set(cacheKey, normalized)
        if (!isCancelled) setPeaks(normalized)
      } catch (err) {
        // Silently fail - waveform is decorative only
        console.warn('Waveform skipped:', err)
      }
    }

    // Defer waveform generation so it doesn't block UI render
    const timer = setTimeout(generatePeaks, 800)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [file])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || peaks.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight

    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = color

    const barSpace = w / peaks.length

    peaks.forEach((peak, i) => {
      const x = i * barSpace
      const barH = peak * h
      ctx.fillRect(x + gap / 2, h - barH, barWidth, barH)
    })
  }, [peaks, color, gap, barWidth])

  if (peaks.length === 0) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  )
}

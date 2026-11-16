import { useState, useCallback, useRef } from 'react'
import { processVideo, getFFmpeg, resetFFmpeg } from '../Lib/ffmpeg-utils'
import type { Segment, ProcessingMode, LogEntry, AspectRatio, TransitionType, ProjectFile, VisualFilter, Overlay, AudioPreset, VocalIsolationMode, ExportResolution, ExportFormat, ExportBitrate, ExportedResult } from '../types'
import { useLanguage } from './useLanguage'

function makeLog(type: LogEntry['type'], message: string): LogEntry {
  return { id: Math.random().toString(36).slice(2), type, message, timestamp: Date.now() }
}

export function useFFmpeg() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [lastExport, setLastExport] = useState<ExportedResult | null>(null)
  const { isRtl } = useLanguage()
  const abortRef = useRef(false)

  const playSuccessSound = useCallback(() => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.volume = 0.5;
      audio.play();
    } catch (e) { console.error('Sound play failed', e); }
  }, []);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-99), makeLog(type, message)])
  }, [])

  const loadFFmpeg = useCallback(async () => {
    if (isLoaded || isLoading) return
    setIsLoading(true)
    addLog('info', isRtl ? 'جاري تحميل FFmpeg (قد يستغرق أول مرة لحظات)...' : 'Loading FFmpeg.wasm (first load may take a moment)...')
    try {
      await getFFmpeg(
        (msg) => {
          if (msg.toLowerCase().includes('error')) {
            addLog('error', msg)
          }
        },
        (pct) => {
          setProgress(Math.round(pct));
          setStep(isRtl ? `جاري التحميل... ${Math.round(pct)}%` : `Loading... ${Math.round(pct)}%`);
        }
      )
      setIsLoaded(true)
      setProgress(100)
      addLog('ok', isRtl ? 'المحرك جاهز!' : 'FFmpeg ready!')
      setTimeout(() => setProgress(0), 1500)
    } catch (err) {
      addLog('error', `Failed to load FFmpeg: ${err}`)
      resetFFmpeg()
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isLoading, addLog, isRtl])

  const process = useCallback(async (
    files: ProjectFile[],
    segments: Segment[],
    mode: ProcessingMode,
    aspectRatio: AspectRatio,
    transition: TransitionType,
    videoSpeed: number,
    audioBoost: number,
    totalDuration: number,
    includeSubtitles?: boolean,
    visualFilter?: VisualFilter,
    noiseReduction?: boolean,
    backgroundMusic?: File | null,
    bgMusicVolume?: number,
    overlays?: Overlay[],
    audioPreset?: AudioPreset,
    vocalIsolation?: VocalIsolationMode,
    exportResolution?: ExportResolution,
    exportFormat?: ExportFormat,
    exportBitrate?: ExportBitrate,
  ) => {
    if (isProcessing) return
    abortRef.current = false

    setIsProcessing(true)
    setProgress(0)
    setStep(isRtl ? 'جاري البدء...' : 'Starting...')
    setLogs([])

    try {
      if (!isLoaded) {
        addLog('info', isRtl ? 'جاري تحميل المحرك...' : 'Loading FFmpeg...')
        await getFFmpeg(
          (msg) => {
            if (msg.toLowerCase().includes('error')) addLog('error', msg);
          },
          (pct) => {
            setProgress(Math.round(pct));
            setStep(isRtl ? `جاري التحميل... ${Math.round(pct)}%` : `Loading... ${Math.round(pct)}%`);
          }
        );
        setIsLoaded(true)
        setProgress(100)
        addLog('ok', isRtl ? 'المحرك جاهز!' : 'FFmpeg ready!')
      }

      const result = await processVideo(
        files,
        segments,
        mode,
        aspectRatio,
        transition,
        videoSpeed,
        audioBoost,
        totalDuration,
        (stepMsg, pct) => {
          setStep(stepMsg)
          setProgress(pct)
          addLog(pct === 100 ? 'ok' : 'progress', stepMsg)
        },
        (msg) => addLog('info', msg),
        includeSubtitles,
        visualFilter,
        noiseReduction,
        backgroundMusic,
        bgMusicVolume,
        overlays,
        audioPreset,
        vocalIsolation,
        exportResolution,
        exportFormat,
        exportBitrate
      )

      if (result) {
        setLastExport(result)
      }

      playSuccessSound();
      addLog('ok', isRtl ? '🎉 اكتملت المعالجة بنجاح! تم حفظ الملف في الذاكرة ويمكنك إعادة تحميله في أي وقت.' : '🎉 Processing complete! Saved in browser memory and ready for download.')
    } catch (err: any) {
      let msg = err?.message || String(err)
      let displayMsg = msg

      if (msg === 'MEMORY_LIMIT_REACHED' || msg.includes('Code=-1') || msg.includes('pthread')) {
        displayMsg = isRtl 
          ? 'خطأ في الذاكرة: الملف كبير جداً على متصفح الموبايل. جرب ملفاً أصغر.' 
          : 'Memory Limit: This video is too large for mobile browser RAM. Try a smaller file.'
      } else if (msg.startsWith('DURATION_LIMIT_EXCEEDED:')) {
        const parts = msg.split(':')
        const platform = parts[1]
        const maxSec = parseInt(parts[2])
        const segNames = parts.slice(3).join(':')
        const platformNames: Record<string, string> = {
          shorts: 'YouTube Shorts',
          square: 'Instagram Reels',
          youtube: 'YouTube',
        }
        const platformLabel = platformNames[platform] || platform
        displayMsg = isRtl
          ? `⏱️ الحد المسموح لـ ${platformLabel} هو ${maxSec} ثانية (${Math.floor(maxSec / 60)}:${String(maxSec % 60).padStart(2, '0')} دقيقة). يرجى تقصير المقطع: ${segNames}`
          : `⏱️ ${platformLabel} max duration is ${maxSec}s (${Math.floor(maxSec / 60)}:${String(maxSec % 60).padStart(2, '0')}). Please shorten: ${segNames}`
      }

      addLog('error', `Error: ${displayMsg}`)
      setStep(isRtl ? 'فشلت العملية: ' + displayMsg : 'Failed: ' + displayMsg)
      throw new Error(displayMsg)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, isLoaded, addLog, isRtl])

  const redownload = useCallback(() => {
    if (!lastExport) return
    const a = document.createElement('a')
    a.href = lastExport.url
    a.download = lastExport.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    addLog('ok', isRtl ? `جاري تحميل ${lastExport.name}...` : `Downloading ${lastExport.name}...`)
  }, [lastExport, addLog, isRtl])

  const clearLastExport = useCallback(() => {
    if (lastExport?.url) {
      URL.revokeObjectURL(lastExport.url)
    }
    setLastExport(null)
  }, [lastExport])

  return {
    isLoading,
    isLoaded,
    isProcessing,
    progress,
    step,
    logs,
    lastExport,
    redownload,
    clearLastExport,
    loadFFmpeg,
    process,
  }
}

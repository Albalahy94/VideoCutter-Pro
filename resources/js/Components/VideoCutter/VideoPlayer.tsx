import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Upload, Film, RotateCcw, RotateCw } from 'lucide-react'
import { WaveformCanvas } from './WaveformCanvas'
import { secondsToTime, formatDuration } from '../../Lib/time-utils'
import type { Segment, ProcessingMode, AspectRatio } from '../../types'
import { useLanguage } from '../../Hooks/useLanguage'
import { clsx } from 'clsx'

interface VideoPlayerProps {
  file: File | null
  currentTime: number
  duration: number
  isPlaying: boolean
  isMuted: boolean
  segments: Segment[]
  mode: ProcessingMode
  videoSpeed: number
  audioBoost: number
  onFileLoad: (file: File, duration: number) => void
  onTimeUpdate: (t: number) => void
  onPlay: () => void
  onPause: () => void
  onToggleMute: () => void
  onSeek: (t: number) => void
  onAdd: (start: number, end: number) => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  aspectRatio?: AspectRatio
  showSafeZones?: boolean
  backgroundMusic?: File | null
  bgMusicVolume?: number
}

const modeColor: Record<ProcessingMode, string> = {
  split: '#3B82F6',
  merge: '#10B981',
  exclude: '#EF4444',
}

export function VideoPlayer({
  file, currentTime, duration, isPlaying, isMuted,
  segments, mode, videoSpeed, audioBoost,
  onFileLoad, onTimeUpdate, onPlay, onPause,
  onToggleMute, onSeek, onAdd, videoRef,
  aspectRatio, showSafeZones,
  backgroundMusic, bgMusicVolume = 1
}: VideoPlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { isRtl } = useLanguage()

  const gainNodeRef = useRef<GainNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const bgAudioRef = useRef<HTMLAudioElement | null>(null)

  // Handle Background Music Sync
  useEffect(() => {
    if (!backgroundMusic) {
      if (bgAudioRef.current) {
        bgAudioRef.current.pause();
        bgAudioRef.current = null;
      }
      return;
    }

    const url = URL.createObjectURL(backgroundMusic);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = bgMusicVolume;
    bgAudioRef.current = audio;

    if (isPlaying) {
      audio.currentTime = videoRef.current?.currentTime || 0;
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
      bgAudioRef.current = null;
    };
  }, [backgroundMusic]);

  // Sync Volume
  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = bgMusicVolume;
    }
  }, [bgMusicVolume]);

  // Sync Play/Pause
  useEffect(() => {
    if (!bgAudioRef.current) return;
    if (isPlaying) {
      bgAudioRef.current.currentTime = videoRef.current?.currentTime || 0;
      bgAudioRef.current.play().catch(() => {});
    } else {
      bgAudioRef.current.pause();
    }
  }, [isPlaying]);

  // Sync Seek
  useEffect(() => {
    if (bgAudioRef.current && videoRef.current) {
      // Small buffer to avoid constant seeking loops
      if (Math.abs(bgAudioRef.current.currentTime - currentTime) > 0.3) {
        bgAudioRef.current.currentTime = currentTime;
      }
    }
  }, [currentTime]);

  // Handle video source change
  useEffect(() => {
    if (!videoRef.current || !file) {
        if (!file && videoRef.current) videoRef.current.src = "";
        return;
    }
    const url = URL.createObjectURL(file)
    videoRef.current.src = url
    
    // Reset Audio Context and state on file change
    if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
        gainNodeRef.current = null
    }

    // Auto-play when a new file is loaded as per user request for "automatic" flow
    // We wait a tiny bit for the metadata to be ready
    const timer = setTimeout(() => {
      if (videoRef.current && file) {
        initAudioCtx(); // Ensure audio context is ready for boost
        videoRef.current.play().catch(err => {
          // Auto-play might be blocked by browser policy without user gesture
          // but since they just clicked "+" or dropped a file, it usually works.
          console.log("Auto-play blocked or failed", err);
        });
      }
    }, 300);

    return () => {
      URL.revokeObjectURL(url);
      clearTimeout(timer);
    }
  }, [file, videoRef])

  // Apply Speed & Pitch
  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.playbackRate = videoSpeed
    if ('preservesPitch' in videoRef.current) {
        (videoRef.current as any).preservesPitch = true
    }
  }, [videoSpeed, videoRef])

  // Apply Gain (Boost)
  useEffect(() => {
    if (gainNodeRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(audioBoost, audioCtxRef.current!.currentTime, 0.01)
    }
  }, [audioBoost])

  const initAudioCtx = useCallback(() => {
    if (!videoRef.current || audioCtxRef.current) return
    
    try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext)
        const ctx = new AudioContextClass()
        const source = ctx.createMediaElementSource(videoRef.current)
        const gain = ctx.createGain()
        
        gain.gain.value = audioBoost
        source.connect(gain)
        gain.connect(ctx.destination)
        
        audioCtxRef.current = ctx
        gainNodeRef.current = gain
    } catch (err) {
        console.error('AudioContext init failed', err)
    }
  }, [videoRef, audioBoost])

  const handleVideoLoad = useCallback(() => {
    if (!videoRef.current || !file) return
    const d = videoRef.current.duration
    if (!isNaN(d)) onFileLoad(file, d)
  }, [file, onFileLoad, videoRef])

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    onTimeUpdate(videoRef.current.currentTime)
  }, [onTimeUpdate, videoRef])



  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith('video/')) return
    const url = URL.createObjectURL(f)
    const vid = document.createElement('video')
    vid.preload = 'metadata'
    vid.onloadedmetadata = () => {
      onFileLoad(f, vid.duration)
      URL.revokeObjectURL(url)
    }
    vid.onerror = () => URL.revokeObjectURL(url)
    vid.src = url
  }, [onFileLoad])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach(f => {
      if (f.type.startsWith('video/')) loadFile(f)
    })
  }, [loadFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(f => {
        if (f.type.startsWith('video/')) loadFile(f)
      })
    }
    // Reset input so same file can be reloaded
    e.target.value = ''
  }, [loadFile])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const getTimeFromX = (clientX: number) => {
    if (!progressRef.current || duration <= 0) return 0
    const rect = progressRef.current.getBoundingClientRect()
    let pct = (clientX - rect.left) / rect.width
    if (isRtl) {
      pct = (rect.right - clientX) / rect.width
    }
    return Math.max(0, Math.min(1, pct)) * duration
  }

  return (
    <div className="card flex flex-col gap-3 min-w-0">
      {/* Video area */}
      <div
        className={clsx(
          'relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300',
          file ? 'bg-black cursor-default max-h-[60vh] aspect-video w-full' : 'drop-zone cursor-pointer w-full',
          !file && isDragOver && 'drag-over',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        {file ? (
          <>
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              className="w-full h-full object-contain no-transition"
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onEnded={onPause}
              onPlay={onPlay}
              onPause={onPause}
              playsInline
            />
            {/* Click to play/pause overlay */}
            <div
              className="absolute inset-0"
              onClick={(e) => {
                e.stopPropagation()
                if (isPlaying) videoRef.current?.pause()
                else {
                    initAudioCtx()
                    videoRef.current?.play()
                }
              }}
            />
            {/* Play indicator flash */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isPlaying && (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                >
                  <Play className="w-7 h-7 text-white ml-1" />
                </div>
              )}
            </div>
            
            {/* Safe Zones Overlay */}
            {showSafeZones && (aspectRatio === 'shorts' || aspectRatio === 'square') && (
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
                 {/* Header Safe Zone */}
                 <div className="h-20 border-b border-dashed border-white/20 bg-black/10 flex items-start justify-center pt-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Header Safe Zone</span>
                 </div>
                 
                 {/* Sidebar/Action Safe Zone (Right for Shorts) */}
                 {aspectRatio === 'shorts' && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-1/2 border-l border-dashed border-white/20 bg-black/10" />
                 )}

                 {/* Footer Safe Zone (Comments/Description) */}
                 <div className="h-32 border-t border-dashed border-white/20 bg-black/10 flex items-end justify-center pb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-tighter">Engagement Zone (Hidden)</span>
                 </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div
              className="drop-icon w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-border)' }}
            >
              {isDragOver
                ? <Film className="w-8 h-8" style={{ color: 'var(--accent-light)' }} />
                : <Upload className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              }
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: 'var(--text-secondary)' }}>
                {isDragOver 
                  ? (isRtl ? 'أفلت الفيديو هنا' : 'Drop to load video') 
                  : (isRtl ? 'أفلت ملف الفيديو هنا' : 'Drop a video file here')
                }
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {isRtl ? 'MP4, MKV, AVI, MOV, WebM — معالجة محلية بالكامل' : 'MP4, MKV, AVI, MOV, WebM — processed locally in your browser'}
              </p>
            </div>
            <span
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200"
              style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent-light)',
                border: '1px solid var(--accent-light)',
              }}
            >
              {isRtl ? 'تصفح الملفات' : 'Browse files'}
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        {/* Progress bar with segment overlays */}
        <div className="relative group" ref={progressRef}>
          {/* Segment regions */}
          {duration > 0 && segments.map(seg => {
            const startPct = (seg.start / duration) * 100
            const width = ((seg.end - seg.start) / duration) * 100
            return (
              <div
                key={seg.id}
                className="absolute top-0 bottom-0 rounded-sm opacity-50 pointer-events-none z-10"
                style={{
                  [isRtl ? 'right' : 'left']: `${startPct}%`,
                  width: `${Math.max(0.5, width)}%`,
                  backgroundColor: modeColor[mode],
                }}
              />
            )
          })}

          {/* Drag Selection Overlay */}
          {duration > 0 && dragStart !== null && dragEnd !== null && (
            <div
              className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
              style={{
                [isRtl ? 'right' : 'left']: `${(Math.min(dragStart, dragEnd) / duration) * 100}%`,
                width: `${(Math.abs(dragEnd - dragStart) / duration) * 100}%`,
                background: 'rgba(124,58,237,0.3)',
                borderInlineStart: '2px solid var(--accent-light)',
                borderInlineEnd: '2px solid var(--accent-light)',
              }}
            >
              {/* Floating Add Button */}
              {Math.abs(dragEnd - dragStart) > 0.5 && !isDragging && (
                <button
                  onMouseDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAdd(Math.min(dragStart, dragEnd!), Math.max(dragStart, dragEnd!))
                    setDragStart(null)
                    setDragEnd(null)
                  }}
                  className="absolute -top-10 bg-accent text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg font-bold animate-bounce whitespace-nowrap pointer-events-auto"
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                >
                  {isRtl ? '+ إضافة مقطع' : '+ Add Segment'}
                </button>
              )}
            </div>
          )}

          <div
            className="h-2 bg-bg-elevated rounded-full cursor-pointer relative overflow-hidden"
            onMouseDown={(e) => {
              const time = getTimeFromX(e.clientX)
              setDragStart(time)
              setDragEnd(time)
              setIsDragging(true)
              onSeek(time)
            }}
            onTouchStart={(e) => {
              if (e.touches[0].target === progressRef.current) e.preventDefault()
              const time = getTimeFromX(e.touches[0].clientX)
              setDragStart(time)
              setDragEnd(time)
              setIsDragging(true)
              onSeek(time)
            }}
            onMouseMove={(e) => {
              if (!isDragging || dragStart === null) return
              const time = getTimeFromX(e.clientX)
              setDragEnd(time)
              onSeek(time)
            }}
            onTouchMove={(e) => {
              if (!isDragging || dragStart === null) return
              const time = getTimeFromX(e.touches[0].clientX)
              setDragEnd(time)
              onSeek(time)
            }}
            onMouseUp={() => {
              setIsDragging(false)
              if (dragStart !== null && dragEnd !== null && Math.abs(dragEnd - dragStart) < 0.2) {
                setDragStart(null)
                setDragEnd(null)
              }
            }}
            onTouchEnd={() => {
              setIsDragging(false)
              if (dragStart !== null && dragEnd !== null && Math.abs(dragEnd - dragStart) < 0.2) {
                setDragStart(null)
                setDragEnd(null)
              }
            }}
            onMouseLeave={() => {
              setIsDragging(false)
            }}
          >
            {/* Visual Track (Centered) */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden pointer-events-none">
              {/* Waveform Background */}
              <WaveformCanvas file={file} />
              
              <div
                className={clsx("absolute top-0 h-full bg-accent rounded-full transition-none", isRtl ? "right-0" : "left-0")}
                style={{ 
                  width: `${progress}%`,
                  zIndex: 5
                }}
              />
            </div>
          </div>

          {/* Playhead */}
          {duration > 0 && (
            <div
              className={clsx(
                "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md pointer-events-none z-30",
                isRtl ? "-mr-1.5" : "-ml-1.5"
              )}
              style={{ [isRtl ? 'right' : 'left']: `${progress}%` }}
            />
          )}
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={() => {
                if (!videoRef.current) return
                if (isPlaying) videoRef.current.pause()
                else {
                    initAudioCtx()
                    videoRef.current.play()
                }
              }}
              disabled={!file}
              className={clsx(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm',
                file
                  ? 'text-white hover:scale-110'
                  : 'cursor-not-allowed opacity-40'
              )}
              style={file ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' } : { background: 'var(--bg-elevated)' }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Seek Buttons */}
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => onSeek(Math.max(0, currentTime - 5))}
                disabled={!file}
                className="btn-icon w-8 h-8 opacity-70 hover:opacity-100 disabled:opacity-30"
                title="-5s"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSeek(Math.min(duration, currentTime + 5))}
                disabled={!file}
                className="btn-icon w-8 h-8 opacity-70 hover:opacity-100 disabled:opacity-30"
                title="+5s"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mute */}
            <button
              onClick={onToggleMute}
              disabled={!file}
              className="btn-icon disabled:opacity-40"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Time */}
            <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              {secondsToTime(currentTime)} / {duration > 0 ? formatDuration(duration) : '--:--'}
            </span>
          </div>

          {/* Change file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {file ? `📂 ${file.name.length > 25 ? file.name.slice(0, 22) + '...' : file.name}` : 'Load video'}
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        {file && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-text-muted border-t border-bg-border pt-2 mt-0.5">
            <span className="flex items-center gap-1.5"><kbd className="bg-bg-inverted text-text-inverted rounded px-1.5 py-0.5 font-mono shadow-sm">I</kbd> {isRtl ? 'بداية المقطع' : 'Set start'}</span>
            <span className="flex items-center gap-1.5"><kbd className="bg-bg-inverted text-text-inverted rounded px-1.5 py-0.5 font-mono shadow-sm">O</kbd> {isRtl ? 'نهاية المقطع وإضافته' : 'Set end & add'}</span>
            <span className="flex items-center gap-1.5"><kbd className="bg-bg-inverted text-text-inverted rounded px-1.5 py-0.5 font-mono shadow-sm">Space</kbd> {isRtl ? 'تشغيل/إيقاف' : 'Play/Pause'}</span>
            <span className="flex items-center gap-1.5"><kbd className="bg-bg-inverted text-text-inverted rounded px-1.5 py-0.5 font-mono shadow-sm">← →</kbd> {isRtl ? 'تقديم/تأخير' : 'Seek ±5s'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

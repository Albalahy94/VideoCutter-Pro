import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Segment, ProcessingMode, Project, AspectRatio, TransitionType, ProjectFile, VisualFilter, Overlay, AudioPreset, VocalIsolationMode, ExportResolution, ExportFormat, ExportBitrate } from '../types'

const STORAGE_KEY = 'vcpro_project'

export function uuid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function loadProject(): Partial<Project> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { }
  return {}
}

function saveProject(project: Project) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch { }
}


export function useProject() {
  // Initialize with empty segments because reference files are lost on refresh
  const [segments, setSegments] = useState<Segment[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const filesRef = useRef(files)
  filesRef.current = files

  // Atomic state for the active file to prevent race conditions
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  // Persistent settings that don't depend on actual File objects
  const [mode, setMode] = useState<ProcessingMode>('split')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('original')
  const [transition, setTransition] = useState<TransitionType>('none')
  const [videoSpeed, setVideoSpeed] = useState<number>(1)
  const [audioBoost, setAudioBoost] = useState<number>(1)
  const [videoName, setVideoName] = useState<string>('')
  const [visualFilter, setVisualFilter] = useState<VisualFilter>('none')
  const [noiseReduction, setNoiseReduction] = useState<boolean>(false)
  const [backgroundMusic, setBackgroundMusic] = useState<File | null>(null)
  const [bgMusicVolume, setBgMusicVolume] = useState<number>(0.3)
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [audioPreset, setAudioPreset] = useState<AudioPreset>('normal')
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false)
  const [vocalIsolation, setVocalIsolation] = useState<VocalIsolationMode>('none')
  const [exportResolution, setExportResolution] = useState<ExportResolution>('original')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4')
  const [exportBitrate, setExportBitrate] = useState<ExportBitrate>('auto')

  // Undo/Redo History
  const [history, setHistory] = useState<Omit<Project, 'files'>[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isInternalUpdate = useRef(false)

  // Load saved project on mount
  useEffect(() => {
    const saved = loadProject()
    if (saved.activeFileId) setActiveFileId(saved.activeFileId)
    if (saved.mode) setMode(saved.mode)
    if (saved.aspectRatio) setAspectRatio(saved.aspectRatio)
    if (saved.transition) setTransition(saved.transition)
    if (saved.videoSpeed) setVideoSpeed(saved.videoSpeed)
    if (saved.audioBoost) setAudioBoost(saved.audioBoost)
    if (saved.videoName) setVideoName(saved.videoName)
    if (saved.visualFilter) setVisualFilter(saved.visualFilter)
    if (saved.noiseReduction) setNoiseReduction(saved.noiseReduction)
    if (saved.bgMusicVolume) setBgMusicVolume(saved.bgMusicVolume)
    if (saved.overlays) setOverlays(saved.overlays)
    if (saved.audioPreset) setAudioPreset(saved.audioPreset)
    if (saved.showSafeZones !== undefined) setShowSafeZones(saved.showSafeZones)
    if (saved.vocalIsolation) setVocalIsolation(saved.vocalIsolation)
    if (saved.exportResolution) setExportResolution(saved.exportResolution)
    if (saved.exportFormat) setExportFormat(saved.exportFormat)
    if (saved.exportBitrate) setExportBitrate(saved.exportBitrate)
  }, [])

  const activeFileItem = files.find(f => f.id === activeFileId)
  const activeFile = activeFileItem?.file || null

  // Auto-save settings on change
  useEffect(() => {
    saveProject({
      segments,
      files: [],
      activeFileId,
      mode,
      aspectRatio,
      transition,
      videoName,
      videoSpeed,
      audioBoost,
      visualFilter,
      noiseReduction,
      backgroundMusic: null, // Don't save File objects to localStorage
      bgMusicVolume,
      overlays,
      audioPreset,
      showSafeZones,
      vocalIsolation,
      exportResolution,
      exportFormat,
      exportBitrate
    })
  }, [segments, activeFileId, mode, aspectRatio, transition, videoName, videoSpeed, audioBoost, visualFilter, noiseReduction, bgMusicVolume, overlays, audioPreset, showSafeZones, vocalIsolation, exportResolution, exportFormat, exportBitrate])

  // Push to history when state changes
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }
    const current: Omit<Project, 'files'> = {
      segments,
      activeFileId,
      mode,
      aspectRatio,
      transition,
      videoName,
      videoSpeed,
      audioBoost,
      visualFilter,
      noiseReduction,
      bgMusicVolume,
      overlays
    }
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1)
      if (next.length > 50) next.shift() // Limit to 50 steps
      return [...next, current]
    })
    setHistoryIndex(prev => prev + 1)
  }, [segments, mode, aspectRatio, transition, videoSpeed, audioBoost, visualFilter, noiseReduction, bgMusicVolume, overlays])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    isInternalUpdate.current = true
    setHistoryIndex(historyIndex - 1)
    applyProjectState(prev)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    isInternalUpdate.current = true
    setHistoryIndex(historyIndex + 1)
    applyProjectState(next)
  }, [history, historyIndex])

  function applyProjectState(state: Omit<Project, 'files'>) {
    setSegments(state.segments)
    setActiveFileId(state.activeFileId)
    setMode(state.mode)
    setAspectRatio(state.aspectRatio)
    setTransition(state.transition)
    setVideoName(state.videoName)
    setVideoSpeed(state.videoSpeed)
    setAudioBoost(state.audioBoost)
    setVisualFilter(state.visualFilter)
    setNoiseReduction(state.noiseReduction)
    setBgMusicVolume(state.bgMusicVolume)
    setOverlays(state.overlays)
    setAudioPreset(state.audioPreset)
    setShowSafeZones(state.showSafeZones)
    setVocalIsolation(state.vocalIsolation)
    setExportResolution(state.exportResolution)
    setExportFormat(state.exportFormat)
    setExportBitrate(state.exportBitrate)
  }

  const activeEffects = useMemo(() => {
    const list: string[] = [];
    const isRtl = typeof window !== 'undefined' && (window.document.documentElement.dir === 'rtl' || window.document.documentElement.lang === 'ar');
    
    if (Math.abs((videoSpeed || 1) - 1.0) > 0.01) list.push(isRtl ? 'السرعة' : 'Speed');
    if (Math.abs((audioBoost || 1) - 1.0) > 0.01) list.push(isRtl ? 'تعلية الصوت' : 'Audio Boost');
    if (aspectRatio && aspectRatio !== 'original') list.push(isRtl ? 'الأبعاد' : 'Aspect Ratio');
    
    const vTransition = String(transition || 'none').trim().toLowerCase();
    if (vTransition !== 'none' && vTransition !== '') list.push(isRtl ? 'الانتقالات' : 'Transitions');
    
    const vFilter = String(visualFilter || 'none').trim().toLowerCase();
    const validFilters = ['grayscale', 'sepia', 'vintage', 'warm', 'cool'];
    if (validFilters.includes(vFilter)) list.push(isRtl ? 'الفلتر' : 'Filter');
    
    if (noiseReduction === true) list.push(isRtl ? 'تقليل الضوضاء' : 'Noise Reduction');
    if (backgroundMusic) list.push(isRtl ? 'الموسيقى' : 'Background Music');
    if (overlays && overlays.length > 0) list.push(isRtl ? 'النصوص/العناصر' : 'Overlays');
    
    const vAudioPreset = String(audioPreset || 'normal').trim().toLowerCase();
    if (vAudioPreset !== 'normal' && vAudioPreset !== '') list.push(isRtl ? 'محسن الصوت' : 'Audio Preset');
    
    const vVocalIso = String(vocalIsolation || 'none').trim().toLowerCase();
    if (vVocalIso !== 'none' && vVocalIso !== '') list.push(isRtl ? 'عزل الصوت' : 'Vocal Isolation');
    
    const vRes = String(exportResolution || 'original').trim().toLowerCase();
    if (vRes !== 'original' && vRes !== '') list.push(isRtl ? 'الدقة' : 'Resolution');
    
    const vBitrate = String(exportBitrate || 'auto').trim().toLowerCase();
    if (vBitrate !== 'auto' && vBitrate !== '') list.push(isRtl ? 'الجودة' : 'Bitrate');
    
    const vFormat = String(exportFormat || 'mp4').trim().toLowerCase();
    if (vFormat !== 'mp4' && vFormat !== '') list.push(isRtl ? 'الصيغة' : 'Format');

    return list;
  }, [videoSpeed, audioBoost, aspectRatio, transition, visualFilter, noiseReduction, backgroundMusic, overlays, audioPreset, vocalIsolation, exportResolution, exportBitrate, exportFormat]);

  const resetAllEffects = useCallback(() => {
    setVideoSpeed(1.0);
    setAudioBoost(1.0);
    setAspectRatio('original');
    setTransition('none');
    setVisualFilter('none');
    setNoiseReduction(false);
    setBackgroundMusic(null);
    setOverlays([]);
    setAudioPreset('normal');
    setVocalIsolation('none');
    setExportResolution('original');
    setExportBitrate('auto');
    setExportFormat('mp4');
  }, []);

  const addSegment = useCallback((start = 0, end = 10, fileId?: string) => {
    if (!fileId && !activeFileId) return
    setSegments(prev => {
      const n = prev.length + 1
      return [...prev, {
        id: uuid(),
        fileId: fileId || activeFileId!,
        start,
        end,
        name: `Segment ${n}`,
      }]
    })
  }, [activeFileId])

  const addFile = useCallback((file: File, duration: number) => {
    const existing = filesRef.current.find(f => f.name === file.name && f.file.size === file.size)
    const id = existing ? existing.id : uuid()

    if (!existing) {
      // We set them separately, but React 18 batches these. 
      // To be extra safe, we'll ensure files is updated before ID in the next render cycle effectively.
      setFiles(prev => [...prev, { id, file, name: file.name, duration }])
    }

    // Explicitly set active ID
    setActiveFileId(id)
    return id
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    setSegments(prev => prev.filter(s => s.fileId !== id))
    if (activeFileId === id) setActiveFileId(null)
  }, [activeFileId])

  const updateSegment = useCallback((id: string, changes: Partial<Segment>) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s))
  }, [])

  const removeSegment = useCallback((id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id))
  }, [])

  const setSegmentsAll = useCallback((segs: Segment[]) => {
    setSegments(segs)
  }, [])

  const clearSegments = useCallback(() => setSegments([]), [])

  const sortSegments = useCallback(() => {
    setSegments(prev => [...prev].sort((a, b) => a.start - b.start))
  }, [])

  return {
    segments,
    activeEffects,
    resetAllEffects,
    files,
    activeFileId,
    activeFile,
    mode,
    aspectRatio,
    transition,
    videoName,
    videoSpeed,
    audioBoost,
    setMode,
    setFiles,
    setActiveFileId,
    setAspectRatio,
    setTransition,
    setVideoName,
    setVideoSpeed,
    setAudioBoost,
    visualFilter,
    setVisualFilter,
    noiseReduction,
    setNoiseReduction,
    backgroundMusic,
    setBackgroundMusic,
    bgMusicVolume,
    setBgMusicVolume,
    overlays,
    addOverlay: useCallback((overlay: Omit<Overlay, 'id'>) => {
      setOverlays(prev => [...prev, { ...overlay, id: uuid() }])
    }, []),
    updateOverlay: useCallback((id: string, changes: Partial<Overlay>) => {
      setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o))
    }, []),
    removeOverlay: useCallback((id: string) => {
      setOverlays(prev => prev.filter(o => o.id !== id))
    }, []),
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    audioPreset,
    setAudioPreset,
    showSafeZones,
    setShowSafeZones,
    vocalIsolation,
    setVocalIsolation,
    exportResolution,
    setExportResolution,
    exportFormat,
    setExportFormat,
    exportBitrate,
    setExportBitrate,
    addSegment,
    addFile,
    removeFile,
    updateSegment,
    removeSegment,
    setSegmentsAll,
    clearSegments,
    sortSegments,
  }
}

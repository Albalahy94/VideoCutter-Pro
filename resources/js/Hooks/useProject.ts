import { useState, useCallback, useEffect } from 'react'
import type { Segment, ProcessingMode, Project, AspectRatio, TransitionType } from '../types'

const STORAGE_KEY = 'vcpro_project'

function uuid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function loadProject(): Partial<Project> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return {}
}

function saveProject(project: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  } catch {}
}

export function useProject() {
  const saved = loadProject()

  const [segments, setSegments] = useState<Segment[]>([])
  const [mode, setMode] = useState<ProcessingMode>(saved.mode || 'split')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(saved.aspectRatio || 'original')
  const [transition, setTransition] = useState<TransitionType>(saved.transition || 'none')
  const [videoName, setVideoName] = useState<string>('')

  // Auto-save on change
  useEffect(() => {
    saveProject({ segments, mode, aspectRatio, transition, videoName })
  }, [segments, mode, aspectRatio, transition, videoName])

  const addSegment = useCallback((start = 0, end = 10) => {
    setSegments(prev => {
      const n = prev.length + 1
      return [...prev, {
        id: uuid(),
        start,
        end,
        name: `Segment ${n}`,
      }]
    })
  }, [])

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
    mode,
    aspectRatio,
    transition,
    videoName,
    setMode,
    setAspectRatio,
    setTransition,
    setVideoName,
    addSegment,
    updateSegment,
    removeSegment,
    setSegmentsAll,
    clearSegments,
    sortSegments,
  }
}

/**
 * useVideoAnalysis Hook
 * Manages AI analysis state for all video segments.
 * Supports analyzing a single segment or queuing all segments.
 */

import { useState, useCallback, useRef } from 'react'
import type { Segment, SegmentAnalysis } from '../types'
import { analyzeSegment } from '../Lib/video-analyzer'

export type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error'

export interface SegmentAnalysisState {
  analysis: SegmentAnalysis | null
  status: AnalysisStatus
  error: string | null
}

export function useVideoAnalysis(lang: 'ar' | 'en' = 'ar') {
  // Map of segmentId -> analysis state
  const [analysisMap, setAnalysisMap] = useState<Record<string, SegmentAnalysisState>>({})
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false)
  const abortRef = useRef(false)

  const setSegmentStatus = useCallback((segId: string, status: AnalysisStatus, analysis: SegmentAnalysis | null = null, error: string | null = null) => {
    setAnalysisMap(prev => ({
      ...prev,
      [segId]: { analysis, status, error },
    }))
  }, [])

  /**
   * Analyze a single segment
   */
  const analyzeOne = useCallback(async (
    videoEl: HTMLVideoElement,
    segment: Segment
  ) => {
    if (!videoEl) return
    setSegmentStatus(segment.id, 'analyzing')
    try {
      const result = await analyzeSegment(videoEl, segment, lang)
      setSegmentStatus(segment.id, 'done', result)
    } catch (err: any) {
      console.error('[useVideoAnalysis] analyzeOne error:', err)
      setSegmentStatus(segment.id, 'error', null, err.message || 'Analysis failed')
    }
  }, [lang, setSegmentStatus])

  /**
   * Analyze all segments in sequence (with abort support)
   */
  const analyzeAll = useCallback(async (
    videoEl: HTMLVideoElement,
    segments: Segment[]
  ) => {
    if (!videoEl || segments.length === 0) return
    setIsBatchAnalyzing(true)
    abortRef.current = false

    for (const seg of segments) {
      if (abortRef.current) break

      // Skip already analyzed segments
      const existing = analysisMap[seg.id]
      if (existing?.status === 'done') continue

      setSegmentStatus(seg.id, 'analyzing')
      try {
        const result = await analyzeSegment(videoEl, seg, lang)
        if (!abortRef.current) {
          setSegmentStatus(seg.id, 'done', result)
        }
      } catch (err: any) {
        console.error(`[useVideoAnalysis] analyzeAll error for ${seg.id}:`, err)
        if (!abortRef.current) {
          setSegmentStatus(seg.id, 'error', null, err.message || 'Analysis failed')
        }
      }

      // Small pause between API calls to avoid rate limits
      await new Promise(r => setTimeout(r, 800))
    }

    setIsBatchAnalyzing(false)
  }, [lang, analysisMap, setSegmentStatus])

  /**
   * Cancel an ongoing batch analysis
   */
  const cancelAnalysis = useCallback(() => {
    abortRef.current = true
    setIsBatchAnalyzing(false)
  }, [])

  /**
   * Clear analysis for a specific segment
   */
  const clearSegmentAnalysis = useCallback((segId: string) => {
    setAnalysisMap(prev => {
      const next = { ...prev }
      delete next[segId]
      return next
    })
  }, [])

  /**
   * Clear all analyses (e.g. when segments are cleared)
   */
  const clearAll = useCallback(() => {
    setAnalysisMap({})
    abortRef.current = true
    setIsBatchAnalyzing(false)
  }, [])

  /**
   * Get state for a specific segment
   */
  const getState = useCallback((segId: string): SegmentAnalysisState => {
    return analysisMap[segId] || { analysis: null, status: 'idle', error: null }
  }, [analysisMap])

  const analyzedCount = Object.values(analysisMap).filter(s => s.status === 'done').length
  const analyzingCount = Object.values(analysisMap).filter(s => s.status === 'analyzing').length

  return {
    analysisMap,
    isBatchAnalyzing,
    analyzeOne,
    analyzeAll,
    cancelAnalysis,
    clearSegmentAnalysis,
    clearAll,
    getState,
    analyzedCount,
    analyzingCount,
  }
}

export type ProcessingMode = 'split' | 'merge' | 'exclude'
export type AspectRatio = 'original' | 'shorts' | 'youtube' | 'square'
export type TransitionType = 'none' | 'fade'

export interface Segment {
  id: string
  start: number  // seconds
  end: number    // seconds
  name: string
}

export interface Project {
  segments: Segment[]
  mode: ProcessingMode
  aspectRatio: AspectRatio
  transition: TransitionType
  videoName: string
}

export interface LogEntry {
  id: string
  type: 'info' | 'ok' | 'error' | 'progress'
  message: string
  timestamp: number
}

export interface ProcessingState {
  isProcessing: boolean
  progress: number
  step: string
  logs: LogEntry[]
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

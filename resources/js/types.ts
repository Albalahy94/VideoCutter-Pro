export type ProcessingMode = 'split' | 'merge' | 'exclude'
export type AspectRatio = 'original' | 'shorts' | 'youtube' | 'square'
export type TransitionType = 'none' | 'fade'
export type VisualFilter = 'none' | 'grayscale' | 'sepia' | 'vintage' | 'warm' | 'cool'
export type AudioPreset = 'normal' | 'podcast' | 'cinema' | 'studio'
export type VocalIsolationMode = 'none' | 'remove_music' | 'isolate_vocals' | 'mute_video'
export type ExportResolution = 'original' | '1080p' | '720p' | '480p' | '360p'
export type ExportFormat = 'mp4' | 'webm'
export type ExportBitrate = 'auto' | 'high' | 'medium' | 'low'

export interface ExportedResult {
  name: string
  blob: Blob
  size: number
  url: string
  isZip: boolean
  filesCount: number
  createdAt: number
}

export interface Overlay {
  id: string
  type: 'text' | 'image'
  content: string // text or image URL
  x: number
  y: number
  startTime: number
  endTime: number
  animation?: 'none' | 'fade' | 'slide-up' | 'zoom'
  fontFamily?: string
  style?: any
}

export interface Segment {
  id: string
  fileId: string
  start: number  // seconds
  end: number    // seconds
  name: string
}

export type MotionLevel = 'static' | 'low' | 'medium' | 'high'

export interface SocialMediaCopy {
  titles: string[]
  description: string
  hashtags: string[]
}

export interface SegmentAnalysis {
  segmentId: string
  thumbnail: string        // base64 data URL — best frame
  keyFrames: string[]      // 3-5 frames as base64
  sceneDescription: string
  visualStyle: string      // colors, lighting, shot type
  motionLevel: MotionLevel
  contentTags: string[]    // e.g. ['outdoor', 'interview', 'action']
  creatorTips: string[]    // actionable tips for content creators
  bRollSuggestions: string[] // suggested b-roll footage concepts
  socialMediaCopy: SocialMediaCopy // AI generated copy for YT/TikTok
  viralScore: number       // 1-100% predicted viral potential
  mood: string             // emotional tone of the scene
  analyzedAt: number       // timestamp
}

export interface ProjectFile {
  id: string
  file: File
  name: string
  duration: number
}

export interface Project {
  segments: Segment[]
  files: ProjectFile[]
  mode: ProcessingMode
  aspectRatio: AspectRatio
  transition: TransitionType
  videoName: string
  videoSpeed: number
  audioBoost: number
  visualFilter: VisualFilter
  noiseReduction: boolean
  backgroundMusic: File | null
  bgMusicVolume: number
  overlays: Overlay[]
  audioPreset: AudioPreset
  showSafeZones: boolean
  vocalIsolation: VocalIsolationMode
  exportResolution: ExportResolution
  exportFormat: ExportFormat
  exportBitrate: ExportBitrate
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

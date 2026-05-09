import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '../../Hooks/useLanguage';
import { clsx } from 'clsx';
import type { Segment, ProjectFile } from '../../types';
import { secondsToTime } from '../../Lib/time-utils';
import { getWaveformPeaks } from '../../Lib/audio-analyzer';

interface TimelineProps {
  segments: Segment[];
  files: ProjectFile[];
  duration: number;
  currentTime: number;
  activeFileId: string | null;
  onSeek: (time: number) => void;
  onUpdateSegment: (id: string, changes: Partial<Segment>) => void;
  disabled?: boolean;
}

const BASE_PPS = 20; // base pixels per second at zoom=1
const MIN_ZOOM = 0.01;
const MAX_ZOOM = 20;

export function Timeline({
  segments,
  files,
  duration,
  currentTime,
  activeFileId,
  onSeek,
  onUpdateSegment,
  disabled
}: TimelineProps) {
  const { isRtl } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const autoFittedFileId = useRef<string | null>(null);

  const activeFile = files.find(f => f.id === activeFileId);
  const pixelsPerSecond = BASE_PPS * zoom;
  // Use tracked containerWidth
  const timelineWidth = Math.max(containerWidth || 0, duration * pixelsPerSecond);

  // Track container width changes
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-fit timeline on load
  useEffect(() => {
    if (duration > 0 && containerWidth > 0 && activeFileId && autoFittedFileId.current !== activeFileId) {
      const idealZoom = containerWidth / (duration * BASE_PPS);
      setZoom(Math.max(MIN_ZOOM, Math.min(2, idealZoom * 0.95)));
      autoFittedFileId.current = activeFileId;
    }
  }, [duration, activeFileId, containerWidth]);

  useEffect(() => {
    if (activeFile) {
      getWaveformPeaks(activeFile.file, 2000).then(setPeaks);
    } else {
      setPeaks([]);
    }
  }, [activeFileId, activeFile]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev - e.deltaY * 0.005)));
    }
  }, []);

  const zoomIn  = () => setZoom(prev => Math.min(MAX_ZOOM, +(prev * 1.5).toFixed(3)));
  const zoomOut = () => setZoom(prev => Math.max(MIN_ZOOM, +(prev / 1.5).toFixed(3)));

  const getTimeFromEvent = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const scrollLeft = Math.abs(containerRef.current.scrollLeft);
    const pos = isRtl 
      ? (rect.right - x) + scrollLeft
      : (x - rect.left) + scrollLeft;
    return Math.max(0, Math.min(duration, pos / pixelsPerSecond));
  };

  const handleTimelineClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    onSeek(getTimeFromEvent(e));
  };

  // Dynamic marker intervals: target ~80px spacing
  const idealIntervalSeconds = 80 / pixelsPerSecond;
  const intervals = [1, 2, 5, 10, 30, 60, 300, 600, 1800, 3600]; // 1s, 2s, 5s, 10s, 30s, 1m, 5m, 10m, 30m, 1h
  let markerInterval = intervals.find(i => i >= idealIntervalSeconds) || 3600;

  const markerCount = Math.ceil(duration / markerInterval);
  const activeSegments = segments.filter(s => s.fileId === activeFileId);

  return (
    <div className="card !p-0 overflow-hidden flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-2 border-b border-bg-border flex items-center justify-between bg-bg-elevated/50">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          {isRtl ? 'الجدول الزمني' : 'Timeline'}
        </h3>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-accent-light">
            {secondsToTime(currentTime)} / {secondsToTime(duration)}
          </span>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-bg-border rounded-lg overflow-hidden">
            <button
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="px-2 py-1 text-text-muted hover:text-accent hover:bg-bg-border disabled:opacity-30 transition-all"
              title="Zoom Out (Ctrl + Scroll)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[9px] font-mono text-text-muted px-1 min-w-[34px] text-center">
              {zoom.toFixed(1)}x
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="px-2 py-1 text-text-muted hover:text-accent hover:bg-bg-border disabled:opacity-30 transition-all"
              title="Zoom In (Ctrl + Scroll)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline canvas area */}
      <div
        ref={containerRef}
        className="relative h-32 bg-bg-primary overflow-x-auto overflow-y-hidden cursor-crosshair select-none"
        onClick={handleTimelineClick}
        onWheel={handleWheel}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={(e) => { if (isDragging) handleTimelineClick(e); }}
      >
        <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>

          {/* Time Markers */}
          <div className="absolute top-0 left-0 w-full h-5 border-b border-bg-border/30 flex">
            {Array.from({ length: markerCount }).map((_, i) => (
              <div
                key={i}
                className={clsx("absolute h-full text-[8px] text-text-muted", isRtl ? "border-r pr-1" : "border-l pl-1", "border-bg-border/50")}
                style={{ [isRtl ? 'right' : 'left']: `${i * markerInterval * pixelsPerSecond}px` }}
              >
                {secondsToTime(i * markerInterval)}
              </div>
            ))}
          </div>

          {/* Waveform */}
          <div className="absolute top-8 bottom-4 left-0 w-full flex items-center gap-[1px] pointer-events-none opacity-30">
            {peaks.map((p, i) => (
              <div
                key={i}
                className="bg-accent-light flex-shrink-0 rounded-full"
                style={{ width: '2px', height: `${p * 100}%` }}
              />
            ))}
          </div>

          {/* Segments */}
          <div className="absolute top-7 bottom-3 left-0 w-full">
            {activeSegments.map(seg => (
                <div
                  key={seg.id}
                  className="absolute h-full rounded-lg border-2 border-accent/40 bg-gradient-to-b from-accent/20 to-accent/5 flex flex-col justify-center px-2 group/seg hover:from-accent/30 hover:to-accent/10 transition-all cursor-move overflow-hidden shadow-lg shadow-accent/5"
                  style={{
                    [isRtl ? 'right' : 'left']: `${seg.start * pixelsPerSecond}px`,
                    width: `${Math.max(4, (seg.end - seg.start) * pixelsPerSecond)}px`
                  }}
                >
                  <div className="flex items-center gap-1.5 opacity-80 group-hover/seg:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black text-accent-light uppercase tracking-tighter truncate">{seg.name}</span>
                  </div>
                  {/* Drag handles with indicators */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 flex items-center justify-center opacity-0 group-hover/seg:opacity-100 cursor-ew-resize">
                    <div className="w-[2px] h-4 bg-accent/60 rounded-full" />
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-2 flex items-center justify-center opacity-0 group-hover/seg:opacity-100 cursor-ew-resize">
                    <div className="w-[2px] h-4 bg-accent/60 rounded-full" />
                  </div>
                </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none transition-none"
            style={{ 
              [isRtl ? 'right' : 'left']: `${currentTime * pixelsPerSecond}px`,
              boxShadow: '0 0 12px rgba(239,68,68,0.8)'
            }}
          >
            <div className={clsx("absolute -top-1 w-3 h-3 rotate-45 bg-red-500 shadow-xl", isRtl ? "-right-1.5" : "-left-1.5")} />
            <div className="absolute h-full w-[1px] bg-red-400/50 blur-[1px]" />
          </div>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="px-3 py-1 text-[8px] text-text-muted border-t border-bg-border/20 text-center">
        {isRtl ? 'Ctrl + عجلة الماوس للتكبير/التصغير' : 'Ctrl + Scroll wheel to zoom'}
      </div>
    </div>
  );
}

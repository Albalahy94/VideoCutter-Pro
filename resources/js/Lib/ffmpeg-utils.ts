import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import JSZip from 'jszip'
import type { Segment, ProcessingMode, AspectRatio, TransitionType } from '../types'
import { secondsToTime } from './time-utils'

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoaded = false
let isMultiThreaded = false
let loadPromise: Promise<FFmpeg> | null = null

/** Hardened version of toBlobURL that forces MIME types and avoids Vite proxying */
async function forceToBlobURL(url: string, mimeType: string): Promise<string> {
  console.log(`[FFMPEG] Force loading: ${url} as ${mimeType}`);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    const data = await response.blob();
    const blob = new Blob([data], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn(`[FFMPEG] Failed to fetch ${url} locally. Trying direct fallback...`);
    return toBlobURL(url, mimeType);
  }
}

export async function getFFmpeg(
  onLog?: (msg: string) => void,
  onProgress?: (pct: number) => void,
  forceST = false
): Promise<FFmpeg> {
  const isIsolated = window.crossOriginIsolated;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  console.log('[FFMPEG] getFFmpeg. isLoaded:', ffmpegLoaded, 'isIsolated:', isIsolated, 'origin:', origin, 'forceST:', forceST);
  
  if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance
  if (loadPromise && !forceST) return loadPromise;
  loadPromise = (async () => {
    const canUseMT = typeof SharedArrayBuffer !== 'undefined' && isIsolated && !forceST;
    try {
      const ffmpeg = new FFmpeg()
      if (onLog) ffmpeg.on('log', ({ message }) => onLog(message))

      isMultiThreaded = canUseMT;
      
      // Use official ESM distribution for maximum compatibility and performance
      const assetPath = canUseMT
        ? 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
        : 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      const loadConfig: any = { 
        coreURL: `${assetPath}/ffmpeg-core.js`,
        wasmURL: `${assetPath}/ffmpeg-core.wasm`
      };

      if (canUseMT) {
        loadConfig.workerURL = `${assetPath}/ffmpeg-core.worker.js`;
      }

      await ffmpeg.load(loadConfig);
      ffmpegInstance = ffmpeg
      ffmpegLoaded = true
      if (onProgress) onProgress(100);
      return ffmpeg
    } catch (err) {
      console.error('[FFMPEG] Load error:', err);
      if (canUseMT && !forceST) {
        return getFFmpeg(onLog, onProgress, true);
      }
      loadPromise = null
      throw err
    }
  })()

  return loadPromise
}

export function resetFFmpeg() {
  ffmpegInstance = null
  ffmpegLoaded = false
}

interface VideoMetadata {
  width: number
  height: number
  duration: number
  aspectRatio: number
}

async function probeMetadata(ffmpeg: FFmpeg, inputName: string): Promise<VideoMetadata> {
  let output = ''
  const logHandler = ({ message }: { message: string }) => { output += message + '\n' }
  ffmpeg.on('log', logHandler)
  await ffmpeg.exec(['-i', inputName])
  ffmpeg.off('log', logHandler)

  const res = output.match(/Stream #.*Video:.* (\d+)x(\d+)/)
  const dur = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
  let w = 0, h = 0, d = 0;
  if (res) { w = parseInt(res[1]); h = parseInt(res[2]); }
  if (dur) { d = parseInt(dur[1]) * 3600 + parseInt(dur[2]) * 60 + parseFloat(dur[3]); }
  return { width: w, height: h, duration: d, aspectRatio: w / (h || 1) }
}

/** 
 * Build FFmpeg filter string for background blur and aspect ratio scaling
 */
function getFilterString(targetRatio: number, meta: VideoMetadata): string {
  const targetWidth = targetRatio > 1 ? 1920 : 1080;
  const targetHeight = Math.round(targetWidth / targetRatio);
  
  // Fast Blur Strategy: Downscale to 10% -> fast blur -> Upscale. Massive performance gain on WASM.
  const tw = Math.round(targetWidth / 10);
  const th = Math.round(targetHeight / 10);

  return `[0:v]split=2[bg][fg];` +
         `[bg]scale=${tw}:${th}:force_original_aspect_ratio=increase,crop=${tw}:${th},boxblur=2:1,scale=${targetWidth}:${targetHeight}[bg_out];` +
         `[fg]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg_out];` +
         `[bg_out][fg_out]overlay=(W-w)/2:(H-h)/2,format=yuv420p[outv]`
}

import { renderCanvasVideo } from './canvas-renderer';

export async function processVideo(
  file: File,
  segments: Segment[],
  mode: ProcessingMode,
  aspectRatio: AspectRatio,
  transition: TransitionType,
  totalDuration: number,
  onProgress: (step: string, pct: number) => void,
  onLog: (msg: string) => void
) {
  // FAST PATH: Canvas Rendering for single segment custom aspect ratio (Shorts/Square)
  if (mode === 'split' && segments.length === 1 && aspectRatio !== 'original') {
    onProgress('جاري تحضير بيئة الرسم (Canvas)...', 5);
    try {
      const finalBlob = await renderCanvasVideo(file, segments[0], aspectRatio, (pct) => {
         onProgress(`جاري المعالجة الفورية...`, Math.round(5 + (pct * 0.9)));
      });
      onProgress('اكتمل العمل!', 100);
      const originalExt = file.name.split('.').pop() || 'mp4';
      downloadFile(finalBlob, `final_video.${originalExt}`); 
      return;
    } catch (err) {
      console.error('[CanvasRenderError]', err);
      onProgress('فشل العرض السريع، جاري التحويل للمحرك المعقد...', 0);
      // Fallback to FFmpeg if canvas fails
    }
  }

  const ffmpeg = await getFFmpeg()
  const inputName = 'input' + Math.random().toString(36).slice(2) + '.' + file.name.split('.').pop();
  
  onProgress('جاري تحضير الملف...', 5);
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  
  const meta = await probeMetadata(ffmpeg, inputName);
  const isOriginalRatio = Math.abs(meta.aspectRatio - (aspectRatio === 'shorts' ? 9/16 : aspectRatio === 'square' ? 1/1 : 16/9)) < 0.1;

  try {
    if (mode === 'split') {
      if (segments.length === 1) {
        const seg = segments[0];
        const outputName = `final_video.mp4`;
        onProgress(`جاري معالجة الفيديو...`, 50);
        
        const args = ['-ss', seg.start.toString(), '-to', seg.end.toString(), '-i', inputName];
        if (aspectRatio !== 'original') {
          const ratio = aspectRatio === 'shorts' ? 9/16 : aspectRatio === 'square' ? 1/1 : 16/9;
          
          const tw = Math.round((ratio > 1 ? 1920 : 1080) / 10);
          const th = Math.round((ratio > 1 ? Math.round(1920 / ratio) : Math.round(1080 / ratio)) / 10);
          const targetWidth = ratio > 1 ? 1920 : 1080;
          const targetHeight = ratio > 1 ? Math.round(1920 / ratio) : Math.round(1080 / ratio);
          
          args.push('-filter_complex', `[0:v]split=2[bg][fg];[bg]scale=${tw}:${th}:force_original_aspect_ratio=increase,crop=${tw}:${th},boxblur=2:1,scale=${targetWidth}:${targetHeight}[bg_out];[fg]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg_out];[bg_out][fg_out]overlay=(W-w)/2:(H-h)/2,format=yuv420p[outv]`, '-map', '[outv]', '-map', '0:a?', '-c:a', 'copy');
        } else {
          args.push('-c', 'copy');
        }
        args.push(outputName);
        
        const progressHandler = ({ progress }: { progress: number }) => {
          if (progress > 0 && progress <= 1) {
            onProgress(`جاري معالجة الفيديو...`, 50 + Math.round(progress * 45));
          }
        };
        ffmpeg.on('progress', progressHandler);
        
        await ffmpeg.exec(args);
        
        ffmpeg.off('progress', progressHandler);
        
        const data = await ffmpeg.readFile(outputName);
        downloadFile(new Blob([data], { type: 'video/mp4' }), 'final_video.mp4');
      } else {
        const zip = new JSZip();
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const outputName = `part_${i + 1}.mp4`;
          onProgress(`جاري معالجة الجزء ${i + 1} من ${segments.length}...`, Math.round(10 + (i / segments.length) * 80));
          
          const args = ['-ss', seg.start.toString(), '-to', seg.end.toString(), '-i', inputName];
          if (aspectRatio !== 'original') {
            const ratio = aspectRatio === 'shorts' ? 9/16 : aspectRatio === 'square' ? 1/1 : 16/9;
            args.push('-filter_complex', getFilterString(ratio, meta), '-map', '[outv]', '-map', '0:a?', '-c:a', 'copy');
          } else {
            args.push('-c', 'copy'); // Fast stream copy
          }
          args.push(outputName);
          
          const progressHandler = ({ progress }: { progress: number }) => {
            if (progress > 0 && progress <= 1) {
              const basePct = 10 + (i / segments.length) * 80;
              const unitPct = 80 / segments.length;
              onProgress(`جاري معالجة الجزء ${i + 1} من ${segments.length}...`, Math.round(basePct + (progress * unitPct)));
            }
          };
          ffmpeg.on('progress', progressHandler);
          
          await ffmpeg.exec(args);
          
          ffmpeg.off('progress', progressHandler);
          
          const data = await ffmpeg.readFile(outputName);
          zip.file(outputName, data);
        }
        
        onProgress('جاري ضغط الملفات...', 95);
        const content = await zip.generateAsync({ type: 'blob' });
        downloadFile(content, 'processed_videos.zip');
      }
    } 
    else if (mode === 'merge' || mode === 'exclude') {
      let finalSegments = segments;
      if (mode === 'exclude') {
        const kept = [];
        let cursor = 0;
        const sorted = [...segments].sort((a,b) => a.start - b.start);
        for (const s of sorted) {
          if (s.start > cursor) kept.push({ start: cursor, end: s.start });
          cursor = s.end;
        }
        if (cursor < meta.duration) kept.push({ start: cursor, end: meta.duration });
        finalSegments = kept as Segment[];
      }

      onProgress('جاري دمج المقاطع...', 50);
      const concatList = [];
      for (let i = 0; i < finalSegments.length; i++) {
        const seg = finalSegments[i];
        const partName = `p_${i}.mp4`;
        const args = ['-ss', seg.start.toString(), '-to', seg.end.toString(), '-i', inputName];
        if (aspectRatio !== 'original') {
          const ratio = aspectRatio === 'shorts' ? 9/16 : aspectRatio === 'square' ? 1/1 : 16/9;
          args.push('-filter_complex', getFilterString(ratio, meta), '-map', '[outv]', '-map', '0:a?', '-c:a', 'copy');
        } else {
          args.push('-c', 'copy');
        }
        args.push(partName);
        await ffmpeg.exec(args);
        await ffmpeg.writeFile(`list.txt`, (await ffmpeg.readFile(`list.txt`) || '') + `file ${partName}\n`);
      }

      await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      downloadFile(new Blob([data], { type: 'video/mp4' }), 'final_video.mp4');
    }
    
    onProgress('اكتمل العمل!', 100);
  } finally {
    // Cleanup FS
    // await ffmpeg.deleteFile(inputName);
  }
}

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function extractFrame(file: File, time: number): Promise<string> {
  const ffmpeg = await getFFmpeg();
  const inputName = 'thumb_in.' + file.name.split('.').pop();
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec(['-ss', time.toString(), '-i', inputName, '-vframes', '1', '-q:v', '2', 'out.jpg']);
  const data = await ffmpeg.readFile('out.jpg');
  return URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
}

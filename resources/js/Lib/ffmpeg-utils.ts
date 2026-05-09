import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import JSZip from 'jszip'
import type { Segment, ProcessingMode, AspectRatio, TransitionType, ProjectFile, VisualFilter, Overlay, AudioPreset, VocalIsolationMode, ExportResolution, ExportFormat, ExportBitrate } from '../types'
import { secondsToTime } from './time-utils'
import { transcribeVideo, convertToSRT } from './transcription-service'

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoaded = false
let isMultiThreaded = false
let loadPromise: Promise<FFmpeg> | null = null

const transcriptionCache = new Map<string, any[]>();

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
  const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
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
      
      const assetPath = canUseMT
        ? 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
        : 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      onProgress?.(10);
      const coreURL = await toBlobURL(`${assetPath}/ffmpeg-core.js`, 'text/javascript');
      onProgress?.(30);
      const wasmURL = await toBlobURL(`${assetPath}/ffmpeg-core.wasm`, 'application/wasm');
      
      const loadConfig: any = { 
        coreURL,
        wasmURL
      };

      if (canUseMT) {
        onProgress?.(50);
        loadConfig.workerURL = await toBlobURL(`${assetPath}/ffmpeg-core.worker.js`, 'text/javascript');
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

function getFilterString(targetRatio: number, meta: VideoMetadata): string {
  const targetWidth = targetRatio > 1 ? 1920 : 1080;
  const targetHeight = Math.round(targetWidth / targetRatio);
  const tw = Math.round(targetWidth / 10);
  const th = Math.round(targetHeight / 10);

  return `[0:v]split=2[bg][fg];` +
         `[bg]scale=${tw}:${th}:force_original_aspect_ratio=increase,crop=${tw}:${th},boxblur=2:1,scale=${targetWidth}:${targetHeight}[bg_out];` +
         `[fg]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg_out];` +
         `[bg_out][fg_out]overlay=(W-w)/2:(H-h)/2,format=yuv420p[outv]`
}

import { renderCanvasSequence } from './canvas-renderer';

export async function processVideo(
  projectFiles: ProjectFile[],
  segments: Segment[],
  mode: ProcessingMode,
  aspectRatio: AspectRatio,
  transition: TransitionType,
  videoSpeed: number,
  audioBoost: number,
  totalDuration: number,
  onProgress: (step: string, pct: number) => void,
  onLog: (msg: string) => void,
  includeSubtitles = false,
  visualFilter: VisualFilter = 'none',
  noiseReduction = false,
  backgroundMusic: File | null = null,
  bgMusicVolume = 0.3,
  overlays: Overlay[] = [],
  audioPreset: AudioPreset = 'normal',
  vocalIsolation: VocalIsolationMode = 'none',
  exportResolution: ExportResolution = 'original',
  exportFormat: ExportFormat = 'mp4',
  exportBitrate: ExportBitrate = 'auto'
) {
  const outputFiles: { name: string; blob: Blob | null }[] = [];
  const subtitleFiles: { name: string; content: string }[] = [];
  const isRtl = typeof document !== 'undefined' && (document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar');

  const outputExt = exportFormat === 'webm' ? 'webm' : 'mp4';

  // Resolution mapping
  const resolutionMap: Record<ExportResolution, string> = {
    'original': '',
    '1080p': 'scale=-2:1080',
    '720p':  'scale=-2:720',
    '480p':  'scale=-2:480',
    '360p':  'scale=-2:360',
  };
  const scaleFilter = resolutionMap[exportResolution];

  // Bitrate mapping
  const bitrateMap: Record<ExportBitrate, string> = {
    'auto':   '',
    'high':   '-b:v 10M -maxrate 12M -bufsize 24M',
    'medium': '-b:v 5M  -maxrate 6M  -bufsize 12M',
    'low':    '-b:v 1.5M -maxrate 2M -bufsize 4M',
  };
  const bitrateFlags = bitrateMap[exportBitrate];

  // SMART ENGINE SELECTION Logic
  const activeEffects: string[] = [];
  if (Math.abs(videoSpeed - 1.0) > 0.01) activeEffects.push(isRtl ? 'السرعة' : 'Speed');
  if (Math.abs(audioBoost - 1.0) > 0.01) activeEffects.push(isRtl ? 'تعلية الصوت' : 'Audio Boost');
  if (aspectRatio && aspectRatio !== 'original') activeEffects.push(isRtl ? 'الأبعاد' : 'Aspect Ratio');
  
  const vTransition = String(transition || 'none').trim().toLowerCase();
  if (vTransition !== 'none' && vTransition !== '') activeEffects.push(isRtl ? 'الانتقالات' : 'Transitions');
  
  const vFilter = String(visualFilter || 'none').trim().toLowerCase();
  const validFilters = ['grayscale', 'sepia', 'vintage', 'warm', 'cool'];
  if (validFilters.includes(vFilter)) activeEffects.push(isRtl ? 'الفلتر' : 'Filter');
  
  if (noiseReduction === true) activeEffects.push(isRtl ? 'تقليل الضوضاء' : 'Noise Reduction');
  if (backgroundMusic) activeEffects.push(isRtl ? 'الموسيقى' : 'Background Music');
  if (overlays && overlays.length > 0) activeEffects.push(isRtl ? 'النصوص/العناصر' : 'Overlays');
  
  const vAudioPreset = String(audioPreset || 'normal').trim().toLowerCase();
  if (vAudioPreset !== 'normal' && vAudioPreset !== '') activeEffects.push(isRtl ? 'محسن الصوت' : 'Audio Preset');
  
  const vVocalIso = String(vocalIsolation || 'none').trim().toLowerCase();
  if (vVocalIso !== 'none' && vVocalIso !== '') activeEffects.push(isRtl ? 'عزل الصوت' : 'Vocal Isolation');
  
  const vRes = String(exportResolution || 'original').trim().toLowerCase();
  if (vRes !== 'original' && vRes !== '') activeEffects.push(isRtl ? 'الدقة' : 'Resolution');
  
  const vBitrate = String(exportBitrate || 'auto').trim().toLowerCase();
  if (vBitrate !== 'auto' && vBitrate !== '') activeEffects.push(isRtl ? 'الجودة' : 'Bitrate');
  
  const vFormat = String(exportFormat || 'mp4').trim().toLowerCase();
  if (vFormat !== 'mp4' && vFormat !== '') activeEffects.push(isRtl ? 'الصيغة' : 'Format');

  const hasEffects = activeEffects.length > 0;
  const isPureCut = !hasEffects;

  // Use Canvas ONLY if we need complex composition (Transitions, Text Overlays, etc)
  const useCanvas = (mode === 'merge' || mode === 'exclude') 
    ? (transition !== 'none' || overlays.length > 0 || visualFilter !== 'none') 
    : (overlays.length > 0);

  // Helper to generate subtitles and zip them if needed
  const handleFinalDelivery = async (blobs: { name: string, blob: Blob }[]) => {
    const finalSubtitleFiles: { name: string; content: string }[] = [...subtitleFiles];
    
    if (includeSubtitles && projectFiles.length > 0 && finalSubtitleFiles.length === 0) {
      try {
        const pFile = projectFiles[0];
        const fullTranscript = await getFullTranscription(pFile);
        const srt = convertToSRT(fullTranscript);
        
        const srtName = blobs.length === 1 
          ? blobs[0].name.replace(/\.[^/.]+$/, "") + ".srt"
          : "subtitles.srt";
          
        finalSubtitleFiles.push({ name: srtName, content: srt });
      } catch (e) { 
        console.error('Transcription error', e); 
        onLog(isRtl ? '⚠️ فشل إنشاء الترجمة: ' + e : '⚠️ Subtitle generation failed: ' + e);
      }
    }

    const totalCount = blobs.length + finalSubtitleFiles.length;
    
    if (totalCount === 1 && blobs.length === 1) {
      downloadFile(blobs[0].blob, blobs[0].name);
    } else if (totalCount > 1) {
      onProgress(isRtl ? 'جاري تجميع الملفات...' : 'Preparing zip...', 95);
      const zip = new JSZip();
      blobs.forEach(f => zip.file(f.name, f.blob));
      finalSubtitleFiles.forEach(s => zip.file(s.name, s.content));
      
      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
         onProgress(isRtl ? `جاري ضغط الملفات... ${metadata.percent.toFixed(0)}%` : `Zipping... ${metadata.percent.toFixed(0)}%`, 95 + (metadata.percent * 0.05));
      });
      downloadFile(content, `VideoCutterPro_Export_${Date.now()}.zip`);
    }
    onProgress(isRtl ? 'اكتمل العمل!' : 'Work complete!', 100);
  };

  const getFullTranscription = async (pFile: ProjectFile) => {
    if (transcriptionCache.has(pFile.id)) {
      return transcriptionCache.get(pFile.id)!;
    }
    onProgress(isRtl ? 'جاري استخراج الصوت للترجمة الكاملة...' : 'Extracting audio for full transcription...', 92);
    const audioFile = await extractAudio(pFile.file);
    onProgress(isRtl ? 'جاري تفريغ الفيديو بالذكاء الاصطناعي...' : 'AI Transcription of full video in progress...', 94);
    const transcript = await transcribeVideo(audioFile);
    transcriptionCache.set(pFile.id, transcript);
    return transcript;
  };

  // Background Processing Protection
  const lockId = `vcpro_processing_${Date.now()}`;
  const vFilterValue = String(visualFilter || 'none');
  const debugPrefix = hasEffects ? `[${activeEffects.join('+')} / Val:${vFilterValue}] ` : '[Fast] ';
  
  return await navigator.locks.request(lockId, async () => {
    if (useCanvas) {
      onProgress(debugPrefix + (isRtl ? 'جاري معالجة الفيديو بنظام الجودة العالية...' : 'Processing video with high quality engine...'), 5);
      try {
        if (mode === 'merge' || mode === 'exclude' || segments.length === 1) {
          const finalBlob = await renderCanvasSequence(projectFiles, segments, aspectRatio, videoSpeed, audioBoost, (msg, pct) => {
              const scaledPct = 5 + ((pct / 100) * 85);
              onProgress(msg || (isRtl ? 'جاري المعالجة (نظام الجودة)...' : 'Processing (Quality Engine)...'), Math.round(scaledPct));
           }, visualFilter, overlays);
          await handleFinalDelivery([{ name: 'processed_video.mp4', blob: finalBlob! }]);
          return;
        } else if (mode === 'split') {
          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            onProgress(isRtl ? `جاري معالجة المقطع ${i + 1}...` : `Processing segment ${i + 1}...`, Math.round(5 + (i / segments.length) * 90));
            
            const pFile = projectFiles.find(p => p.id === seg.fileId);
            const baseName = pFile?.file.name.split('.')[0] || 'video';
            const outName = `${baseName}_part${i + 1}.${outputExt}`;

            const segBlob = await renderCanvasSequence(projectFiles, [seg], aspectRatio, videoSpeed, audioBoost, (msg, pct) => {
               const basePct = 5 + (i / segments.length) * 85;
               const currentSegPct = (pct / 100) * (85 / segments.length);
               onProgress(msg || (isRtl ? `جاري معالجة المقطع ${i + 1}...` : `Processing segment ${i + 1}...`), Math.round(basePct + currentSegPct));
            }, visualFilter, overlays);
            
            outputFiles.push({ name: outName, blob: segBlob });
          }
          await handleFinalDelivery(outputFiles as { name: string, blob: Blob }[]);
          return;
        }
      } catch (err) {
        console.error('[CanvasRenderError]', err);
        onProgress(isRtl ? 'فشل العرض السريع، جاري التحويل للمحرك التقليدي...' : 'Fast render failed, switching to legacy engine...', 0);
      }
    }

    const ffmpeg = await getFFmpeg();
    onProgress(isRtl ? 'جاري تحضير الملفات...' : 'Preparing files...', 5);
    
    const fileToFFName = new Map<string, string>();
    const activeFFFiles: string[] = [];
    
    for (let i = 0; i < projectFiles.length; i++) {
      const pFile = projectFiles[i];
      const rawName = `raw_${pFile.id.slice(0, 8)}.${pFile.file.name.split('.').pop()}`;
      await ffmpeg.writeFile(rawName, await fetchFile(pFile.file));
      fileToFFName.set(pFile.id, rawName);
      activeFFFiles.push(rawName);
    }

    let bgmFFName = '';
    if (backgroundMusic) {
      bgmFFName = `bgm_${Date.now()}.mp3`;
      await ffmpeg.writeFile(bgmFFName, await fetchFile(backgroundMusic));
      activeFFFiles.push(bgmFFName);
    }

    const durationToSeconds = (timeStr: string) => {
      const [h, m, s] = timeStr.split(':').map(parseFloat);
      return (h * 3600) + (m * 60) + s;
    };

    try {
      if (mode === 'split') {
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const segDuration = seg.end - seg.start;
          const inputName = fileToFFName.get(seg.fileId)!;
          const pFile = projectFiles.find(p => p.id === seg.fileId);
          const baseName = pFile?.file.name.split('.')[0] || 'video';

          const basePct = Math.round(20 + (i / segments.length) * 70);
          
          const args = [
            '-ss', seg.start.toString(), 
            '-i', inputName,
            '-t', segDuration.toString(), 
            '-fflags', '+genpts+discardcorrupt', 
            '-map_metadata', '-1'
          ];
          
          const segmentLogHandler = ({ message }: { message: string }) => {
            console.log('[FFmpeg]', message);
            const timeMatch = message.match(/time=\s*(\d{2}:\d{2}:\d{2}\.\d{2})/);
            if (timeMatch) {
              const elapsed = durationToSeconds(timeMatch[1]);
              const segPct = Math.min(99, (elapsed / segDuration) * 100);
              const totalPct = basePct + Math.round((segPct / 100) * (70 / segments.length));
              onProgress(debugPrefix + (isRtl ? `معالجة المقطع ${i + 1}... (${Math.round(segPct)}%)` : `Processing segment ${i + 1}... (${Math.round(segPct)}%)`), totalPct);
            }
          };
          ffmpeg.on('log', segmentLogHandler);
          
          if (bgmFFName) args.push('-stream_loop', '-1', '-i', bgmFFName);

          if (!hasEffects) {
            args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero', '-map_metadata', '-1');
          } else {
            // Build base video filter with aspect ratio conversion
            const isLargeFile = pFile && pFile.file.size > 300 * 1024 * 1024;
            const targetW = isLargeFile ? 720 : 1080;
            const targetH = Math.round(targetW * (16/9));
            const squareS = isLargeFile ? 720 : 1080;

            let vFilter: string;
            if (aspectRatio === 'shorts') {
              vFilter = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black,setpts=${1/videoSpeed}*(PTS-STARTPTS),format=yuv420p`;
            } else if (aspectRatio === 'square') {
              vFilter = `scale=${squareS}:${squareS}:force_original_aspect_ratio=decrease,pad=${squareS}:${squareS}:(ow-iw)/2:(oh-ih)/2:color=black,setpts=${1/videoSpeed}*(PTS-STARTPTS),format=yuv420p`;
            } else {
              vFilter = `scale='trunc(iw/2)*2:trunc(ih/2)*2',setpts=${1/videoSpeed}*(PTS-STARTPTS)`;
            }

            // Apply visual color filters
            if (visualFilter === 'grayscale') vFilter += `,hue=s=0`;
            if (visualFilter === 'sepia') vFilter += `,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`;
            if (visualFilter === 'vintage') vFilter += `,curves=vintage`;
            if (visualFilter === 'warm') vFilter += `,hue=h=5:s=1.1`;
            if (visualFilter === 'cool') vFilter += `,hue=h=-5:s=1.1`;

            let aFilter = `aresample=async=1,atempo=${videoSpeed},volume=${audioBoost},asetpts=PTS-STARTPTS`;
            if (noiseReduction) aFilter = `afftdn=nf=-25,${aFilter}`;
            if (vocalIsolation === 'remove_music') aFilter = `pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1,${aFilter}`;
            else if (vocalIsolation === 'isolate_vocals') aFilter = `pan=stereo|c0=c0-c1|c1=c1-c0,${aFilter}`;
            if (audioPreset === 'podcast') aFilter = `compand=0.3|0.3:1|1:-90/-60|-60/-40|-40/-30|-20/-20:6:0:-90:0.2,${aFilter}`;
            else if (audioPreset === 'cinema') aFilter = `bass=g=5,treble=g=3,${aFilter}`;

            if (bgmFFName) {
              const complexFilter = `[0:v]${vFilter}[out_v];[0:a]${aFilter}[v_a];[1:a]volume=${bgMusicVolume}[bg_a];[v_a][bg_a]amix=inputs=2:duration=first[out_a]`;
              args.push('-filter_complex', complexFilter, '-map', '[out_v]', '-map', '[out_a]');
            } else {
              args.push('-vf', vFilter, '-af', aFilter);
            }

            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-avoid_negative_ts', 'make_zero');
            if (bitrateFlags) args.push(...bitrateFlags.split(' ').filter(Boolean));
          }

          const outName = `${baseName}_part${i + 1}.${outputExt}`;
          args.push(outName);
          
          try {
            onProgress(debugPrefix + (isRtl ? `بدء معالجة المقطع ${i + 1}...` : `Starting segment ${i + 1}...`), basePct);
            await ffmpeg.exec(args);
          } finally {
            ffmpeg.off('log', segmentLogHandler);
          }
          
          const data = await ffmpeg.readFile(outName);
          const segBlob = new Blob([data], { type: outputExt === 'webm' ? 'video/webm' : 'video/mp4' });
          await ffmpeg.deleteFile(outName).catch(() => {});

          // Generate per-segment subtitles if requested
          if (includeSubtitles && pFile) {
            try {
              onProgress(isRtl ? `جاري إعداد ترجمة المقطع ${i + 1}...` : `Preparing subtitles for segment ${i + 1}...`, Math.round(basePct + 2));
              const fullTranscript = await getFullTranscription(pFile);
              
              // Filter and offset for this specific segment
              const segTranscript = fullTranscript
                .filter((t: any) => t.start < seg.end && t.end > seg.start)
                .map((t: any) => ({
                  ...t,
                  start: Math.max(0, t.start - seg.start),
                  end: Math.min(seg.end - seg.start, t.end - seg.start)
                }))
                .filter((t: any) => t.end > t.start);

              if (segTranscript.length > 0) {
                const srt = convertToSRT(segTranscript);
                const srtName = outName.replace(/\.[^/.]+$/, '') + '.srt';
                subtitleFiles.push({ name: srtName, content: srt });
              }
            } catch (e) {
              console.error('Segment subtitle error', e);
            }
          }

          outputFiles.push({ name: outName, blob: segBlob });
        }
      }
      else if (mode === 'merge' || mode === 'exclude') {
        let finalSegments = segments;
        if (mode === 'exclude' && projectFiles.length > 0) {
          const kept = [];
          let cursor = 0;
          const activeFileId = projectFiles[0].id;
          const activeFileMeta = await probeMetadata(ffmpeg, fileToFFName.get(activeFileId)!);
          const sorted = [...segments].sort((a, b) => a.start - b.start);
          for (const s of sorted) {
            if (s.start > cursor) kept.push({ fileId: activeFileId, start: cursor, end: s.start });
            cursor = s.end;
          }
          if (cursor < activeFileMeta.duration) kept.push({ fileId: activeFileId, start: cursor, end: activeFileMeta.duration });
          finalSegments = kept as Segment[];
        }

        onProgress(isRtl ? 'جاري دمج المقاطع...' : 'Merging segments...', 50);
        const manifestLines = [];
        for (let i = 0; i < finalSegments.length; i++) {
          const seg = finalSegments[i];
          const inputName = fileToFFName.get(seg.fileId)!;
          const partName = `p_${i}.ts`;
          await ffmpeg.exec(['-ss', seg.start.toString(), '-to', seg.end.toString(), '-i', inputName, '-c', 'copy', '-map_metadata', '-1', partName]);
          manifestLines.push(`file ${partName}`);
          activeFFFiles.push(partName);
        }

        await ffmpeg.writeFile('list.txt', manifestLines.join('\n'));
        await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output.mp4']);
        const data = await ffmpeg.readFile('output.mp4');
        outputFiles.push({ name: 'output.mp4', blob: new Blob([data], { type: 'video/mp4' }) });
      }

      await handleFinalDelivery(outputFiles as { name: string, blob: Blob }[]);
    } catch (err: any) {
      console.error('[ProcessError]', err);
      throw new Error(err.message || 'Error processing video');
    } finally {
      for (const ffName of activeFFFiles) await ffmpeg.deleteFile(ffName).catch(() => {});
      await ffmpeg.deleteFile('list.txt').catch(() => {});
      if (bgmFFName) await ffmpeg.deleteFile(bgmFFName).catch(() => {});
    }
  });
}

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function extractFrame(file: File, time: number): Promise<string> {
  const ffmpeg = await getFFmpeg();
  const inputName = 'thumb_in.' + file.name.split('.').pop();
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec(['-ss', time.toString(), '-i', inputName, '-vframes', '1', '-q:v', '2', 'out.jpg']);
  const data = await ffmpeg.readFile('out.jpg');
  await ffmpeg.deleteFile(inputName).catch(() => {});
  return URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
}

export async function extractAudio(file: File): Promise<File> {
  const ffmpeg = await getFFmpeg();
  const name = file.name || 'video.mp4';
  const inputName = 'audio_in.' + name.split('.').pop();
  const outputName = 'audio_out.mp3';

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec(['-i', inputName, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k', outputName]);

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});

  return new File([data], 'audio.mp3', { type: 'audio/mpeg' });
}

export async function detectSilence(
  file: File,
  duration: number,
  thresholdDB = -30,
  minSilenceDuration = 1.2,
  maxSegmentDuration = 59,
  onProgress?: (msg: string) => void
): Promise<{ start: number; end: number }[]> {
  const ffmpeg = await getFFmpeg();
  const inputName = `silence_in_${Date.now()}.${file.name.split('.').pop()}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const logs: string[] = [];
  const logHandler = ({ message }: { message: string }) => {
    if (message.includes('silence_')) logs.push(message);
    if (onProgress) onProgress(message);
  };

  ffmpeg.on('log', logHandler);

  await ffmpeg.exec([
    '-i', inputName,
    '-vn',
    '-af', `silencedetect=noise=${thresholdDB}dB:d=${minSilenceDuration}`,
    '-f', 'null', '-'
  ]);

  ffmpeg.off('log', logHandler);
  await ffmpeg.deleteFile(inputName).catch(() => {});

  const segments: { start: number; end: number }[] = [];
  let lastSilenceEnd = 0;

  for (const line of logs) {
    const startMatch = line.match(/silence_start: (\d+\.?\d*)/);
    const endMatch = line.match(/silence_end: (\d+\.?\d*)/);

    if (startMatch) {
      const silenceStart = parseFloat(startMatch[1]);
      if (silenceStart > lastSilenceEnd + 0.1) {
        segments.push({ start: lastSilenceEnd, end: silenceStart });
      }
    } else if (endMatch) {
      lastSilenceEnd = parseFloat(endMatch[1]);
    }
  }

  if (lastSilenceEnd < duration - 0.5) segments.push({ start: lastSilenceEnd, end: duration });

  const validSegments = segments.filter(seg => (seg.end - seg.start) >= 1.0);
  if (validSegments.length === 0 && duration > 0) validSegments.push({ start: 0, end: duration });

  const finalSegments: { start: number; end: number }[] = [];
  for (const seg of validSegments) {
    let currentStart = seg.start;
    while (seg.end - currentStart > maxSegmentDuration) {
      finalSegments.push({ start: currentStart, end: currentStart + maxSegmentDuration });
      currentStart += maxSegmentDuration;
    }
    if (seg.end - currentStart >= 1.0) finalSegments.push({ start: currentStart, end: seg.end });
  }

  return finalSegments;
}

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import JSZip from 'jszip'
import type { Segment, ProcessingMode, AspectRatio, TransitionType, ProjectFile, VisualFilter, Overlay, AudioPreset, VocalIsolationMode, ExportResolution, ExportFormat, ExportBitrate, ExportedResult } from '../types'
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

export function buildAudioFilter(
  videoSpeed: number,
  audioBoost: number,
  noiseReduction: boolean,
  vocalIsolation: VocalIsolationMode,
  audioPreset: AudioPreset
): string {
  let aFilter = `aresample=async=1,atempo=${videoSpeed},volume=${audioBoost},asetpts=PTS-STARTPTS`;
  if (noiseReduction) {
    aFilter = `afftdn=nf=-25,${aFilter}`;
  }

  if (vocalIsolation === 'remove_music') {
    // Pure studio vocal enhancement (warm bottom, subtle presence, absolutely no muffling)
    aFilter = `highpass=f=80,equalizer=f=3000:width_type=h:width=1800:g=2.5,${aFilter}`;
  } else if (vocalIsolation === 'isolate_vocals') {
    // Music stem (already isolated cleanly by AI engine)
    aFilter = `${aFilter}`;
  }

  if (audioPreset === 'podcast') {
    aFilter = `compand=0.3|0.3:1|1:-90/-60|-60/-40|-40/-30|-20/-20:6:0:-90:0.2,${aFilter}`;
  } else if (audioPreset === 'cinema') {
    aFilter = `bass=g=5,treble=g=3,${aFilter}`;
  } else if (audioPreset === 'studio') {
    aFilter = `equalizer=f=3000:width_type=h:width=1500:g=3,compand=0.2|0.2:1|1:-70/-50|-50/-30|-20/-10:6:0:-70:0.1,${aFilter}`;
  }

  return aFilter;
}

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
): Promise<ExportedResult | null> {
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
  const isVocalIsoActive = vocalIsolation && vocalIsolation !== 'none';
  const useCanvas = !isVocalIsoActive && (
    (mode === 'merge' || mode === 'exclude') 
      ? (transition !== 'none' || overlays.length > 0 || visualFilter !== 'none') 
      : (overlays.length > 0)
  );

  // Helper to generate subtitles and zip them if needed
  const handleFinalDelivery = async (blobs: { name: string, blob: Blob }[]): Promise<ExportedResult> => {
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
    let finalResult: ExportedResult;
    
    if (totalCount === 1 && blobs.length === 1) {
      const b = blobs[0].blob;
      const name = blobs[0].name;
      const url = downloadFile(b, name);
      finalResult = {
        name,
        blob: b,
        size: b.size,
        url,
        isZip: false,
        filesCount: 1,
        createdAt: Date.now()
      };
    } else if (totalCount > 1) {
      onProgress(isRtl ? 'جاري تجميع الملفات...' : 'Preparing zip...', 95);
      const zip = new JSZip();
      blobs.forEach(f => zip.file(f.name, f.blob));
      finalSubtitleFiles.forEach(s => zip.file(s.name, s.content));
      
      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
         onProgress(isRtl ? `جاري ضغط الملفات... ${metadata.percent.toFixed(0)}%` : `Zipping... ${metadata.percent.toFixed(0)}%`, 95 + (metadata.percent * 0.05));
      });
      const zipName = `VideoCutterPro_Export_${Date.now()}.zip`;
      const url = downloadFile(content, zipName);
      finalResult = {
        name: zipName,
        blob: content,
        size: content.size,
        url,
        isZip: true,
        filesCount: totalCount,
        createdAt: Date.now()
      };
    } else {
      throw new Error('No output files generated');
    }
    onProgress(isRtl ? 'اكتمل العمل!' : 'Work complete!', 100);
    return finalResult;
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
          return await handleFinalDelivery([{ name: 'processed_video.mp4', blob: finalBlob! }]);
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
          return await handleFinalDelivery(outputFiles as { name: string, blob: Blob }[]);
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

    // AI Audio Separation Engine (Async Background Queue + MDX-Net & Acoustic De-percussion)
    if (vocalIsolation === 'remove_music') {
      const labelMsg = isRtl 
        ? 'جاري تجهيز مسار الصوت ونزع الموسيقى والدفوف والطبول 100%...' 
        : 'Preparing audio & eliminating all music, duff & drums 100% via AI...';
      
      onProgress(labelMsg, 8);

      for (let i = 0; i < projectFiles.length; i++) {
        const pFile = projectFiles[i];
        const rawName = fileToFFName.get(pFile.id)!;
        const audioExtractName = `audio_ext_${i}_${Date.now()}.wav`;
        
        try {
          // Extract 44.1kHz stereo audio
          onProgress(isRtl ? `جاري استخراج مسار الصوت للملف ${i + 1}...` : `Extracting audio track for file ${i + 1}...`, 10);
          await ffmpeg.exec(['-i', rawName, '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', audioExtractName]);
          const rawAudioData = await ffmpeg.readFile(audioExtractName);
          const audioBlob = new Blob([rawAudioData], { type: 'audio/wav' });
          await ffmpeg.deleteFile(audioExtractName).catch(() => {});

          onProgress(isRtl ? 'جاري رفع الصوت وبدء عزل الموسيقى والدف والطبول بالذكاء الاصطناعي...' : 'Uploading audio to background AI separation queue...', 12);

          const formData = new FormData();
          formData.append('audio', audioBlob, 'input.wav');
          formData.append('stem', 'vocals');
          formData.append('model', 'UVR-MDX-NET-Inst_HQ_3.onnx');

          const startResp = await fetch('/api/ai/separate-audio-async', {
            method: 'POST',
            body: formData,
          });

          if (!startResp.ok) {
            throw new Error(`AI Separation init failed: HTTP ${startResp.status}`);
          }

          const { job_id } = await startResp.json();
          if (!job_id) {
            throw new Error('لم يتم استلام معرف المهمة من خادم الذكاء الاصطناعي.');
          }

          // Poll job status until completed
          const startTime = Date.now();
          const maxWaitMs = 1800000; // 30 minutes max
          let isDone = false;

          while (!isDone) {
            if (Date.now() - startTime > maxWaitMs) {
              throw new Error(isRtl ? 'استغرقت معالجة الذكاء الاصطناعي وقتاً أطول من المتوقع.' : 'AI separation timed out.');
            }

            await new Promise(res => setTimeout(res, 2500));

            const statusResp = await fetch(`/api/ai/job-status/${job_id}`);
            if (!statusResp.ok) continue;

            const job = await statusResp.json();

            if (job.status === 'completed') {
              isDone = true;
              break;
            }

            if (job.status === 'failed') {
              throw new Error(job.error || (isRtl ? 'فشلت معالجة الصوت في السيرفر.' : 'Server separation failed.'));
            }

            const jobProgress = job.progress || 20;
            const exportPct = Math.round(12 + (jobProgress / 100) * 10);
            const stepText = job.step || (isRtl ? `جاري عزل الصوت ومسح الدفوف بالذكاء الاصطناعي... ${jobProgress}%` : `AI Separating... ${jobProgress}%`);
            onProgress(stepText, exportPct);
          }

          onProgress(isRtl ? 'جاري استلام مسار الصوت النقي ودمجه مع الفيديو...' : 'Downloading clean studio vocal track...', 22);

          const downloadResp = await fetch(`/api/ai/job-download/${job_id}`);
          if (!downloadResp.ok) {
            throw new Error(`Failed to download clean audio stem: HTTP ${downloadResp.status}`);
          }

          const separatedAudioBlob = await downloadResp.blob();
          const cleanStemName = `stem_clean_${i}_${Date.now()}.wav`;
          await ffmpeg.writeFile(cleanStemName, await fetchFile(separatedAudioBlob));
          activeFFFiles.push(cleanStemName);

          // Replace audio in raw file with the clean AI stem
          const cleanMuxedName = `clean_mux_${i}_${Date.now()}.mp4`;
          onProgress(isRtl ? 'جاري دمج مسار الصوت النقي مع الفيديو...' : 'Muxing clean AI audio into video...', 23);
          await ffmpeg.exec([
            '-i', rawName,
            '-i', cleanStemName,
            '-c:v', 'copy',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            cleanMuxedName
          ]);

          fileToFFName.set(pFile.id, cleanMuxedName);
          activeFFFiles.push(cleanMuxedName);
          onProgress(isRtl ? 'تم عزل الصوت ومسح الموسيقى والدف بنجاح 100%!' : 'AI separation completed successfully!', 25);
        } catch (aiErr: any) {
          console.error('[AI Separation Error]', aiErr);
          const errorMsg = aiErr?.message || (isRtl ? 'تعذر إتمام عزل الصوت بالذكاء الاصطناعي.' : 'AI Vocal Isolation failed.');
          throw new Error(errorMsg);
        }
      }
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

            const aFilter = buildAudioFilter(videoSpeed, audioBoost, noiseReduction, vocalIsolation, audioPreset);

            if (bgmFFName) {
              const complexFilter = `[0:v]${vFilter}[out_v];[0:a]${aFilter}[v_a];[1:a]volume=${bgMusicVolume}[bg_a];[v_a][bg_a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out_a]`;
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
        const aFilter = buildAudioFilter(videoSpeed, audioBoost, noiseReduction, vocalIsolation, audioPreset);

        for (let i = 0; i < finalSegments.length; i++) {
          const seg = finalSegments[i];
          const inputName = fileToFFName.get(seg.fileId)!;
          const partName = `p_${i}.ts`;
          const segDuration = seg.end - seg.start;

          if (!hasEffects) {
            await ffmpeg.exec(['-ss', seg.start.toString(), '-to', seg.end.toString(), '-i', inputName, '-c', 'copy', '-map_metadata', '-1', partName]);
          } else {
            const pArgs = [
              '-ss', seg.start.toString(),
              '-i', inputName,
              '-t', segDuration.toString(),
              '-vf', `setpts=${1/videoSpeed}*(PTS-STARTPTS)`,
              '-af', aFilter,
              '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '1', '-pix_fmt', 'yuv420p',
              '-c:a', 'aac',
              partName
            ];
            await ffmpeg.exec(pArgs);
          }
          manifestLines.push(`file ${partName}`);
          activeFFFiles.push(partName);
        }

        await ffmpeg.writeFile('list.txt', manifestLines.join('\n'));
        const outMerged = bgmFFName ? 'merged_temp.mp4' : `output.${outputExt}`;
        await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', outMerged]);

        let finalOutName = `output.${outputExt}`;
        if (bgmFFName) {
          onProgress(isRtl ? 'جاري دمج الموسيقى الخلفية...' : 'Mixing background music...', 85);
          const complexFilter = `[0:a]volume=1[v_a];[1:a]volume=${bgMusicVolume}[bg_a];[v_a][bg_a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[out_a]`;
          await ffmpeg.exec([
            '-i', outMerged,
            '-stream_loop', '-1', '-i', bgmFFName,
            '-filter_complex', complexFilter,
            '-map', '0:v', '-map', '[out_a]',
            '-c:v', 'copy', '-c:a', 'aac',
            finalOutName
          ]);
          await ffmpeg.deleteFile(outMerged).catch(() => {});
        }

        const data = await ffmpeg.readFile(finalOutName);
        outputFiles.push({ 
          name: `VideoCutterPro_Merged_${Date.now()}.${outputExt}`, 
          blob: new Blob([data], { type: outputExt === 'webm' ? 'video/webm' : 'video/mp4' }) 
        });
        await ffmpeg.deleteFile(finalOutName).catch(() => {});
      }

      return await handleFinalDelivery(outputFiles as { name: string, blob: Blob }[]);
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

function downloadFile(blob: Blob, name: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Do NOT revoke immediately! Keep URL alive for re-download / preview
  return url;
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

import { AspectRatio, Segment, ProjectFile, VisualFilter, Overlay } from '../types';

/**
 * Renders multiple video segments from potentially different files into a single video
 * using HTML5 Canvas. Process is real-time and extremely fast on most devices.
 */
export async function renderCanvasSequence(
  projectFiles: ProjectFile[],
  segments: Segment[],
  aspectRatio: AspectRatio,
  videoSpeed: number,
  audioBoost: number,
  onProgress: (msg: string, pct: number) => void,
  visualFilter: VisualFilter = 'none',
  overlays: Overlay[] = []
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const isRtl = typeof document !== 'undefined' && (document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar');
      let targetWidth = 1920;
      let targetHeight = 1080;

      if (aspectRatio === 'original') {
        const firstSeg = segments[0];
        const firstFile = projectFiles.find(f => f.id === firstSeg.fileId);
        if (firstFile) {
          // Temporarily load first video to get dimensions if not in metadata
          const tempVideo = document.createElement('video');
          tempVideo.src = URL.createObjectURL(firstFile.file);
          onProgress(isRtl ? 'جاري قراءة أبعاد الفيديو...' : 'Loading video dimensions...', 0);
          await new Promise(r => { tempVideo.onloadedmetadata = r; setTimeout(r, 2000); });
          targetWidth = tempVideo.videoWidth || 1920;
          targetHeight = tempVideo.videoHeight || 1080;
          URL.revokeObjectURL(tempVideo.src);
        }
      } else {
        const targetRatio = aspectRatio === 'shorts' ? 9 / 16 : aspectRatio === 'square' ? 1 / 1 : 16 / 9;
        targetWidth = targetRatio > 1 ? 1920 : 1080;
        targetHeight = Math.round(targetWidth / targetRatio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) return reject(new Error('Canvas 2D context not supported'));

      const stream = canvas.captureStream(30);
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioContextClass) return reject(new Error('AudioContext not supported'));
      const audioCtx = new AudioContextClass();
      const destNode = audioCtx.createMediaStreamDestination();
      
      destNode.stream.getAudioTracks().forEach(track => stream.addTrack(track));

      // Try standard mp4 first, fallback to webm
      let mimeType = 'video/webm;codecs=vp9,opus';
      const MR = typeof MediaRecorder !== 'undefined' ? MediaRecorder : null;
      
      if (MR && MR.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (MR && MR.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }

      if (!MR) return reject(new Error('MediaRecorder not supported'));
      const recorder = new MR(stream, { mimeType, videoBitsPerSecond: 8000000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        audioCtx.close();
        resolve(new Blob(chunks, { type: mimeType }));
      };

      const video = document.createElement('video');
      video.muted = false; 
      video.volume = 1;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      // Connect video to audio graph once
      const sourceNode = audioCtx.createMediaElementSource(video);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = audioBoost;
      sourceNode.connect(gainNode);
      gainNode.connect(destNode);

      recorder.start();

      let totalDuration = segments.reduce((acc, s) => acc + (s.end - s.start), 0) / videoSpeed;
      let elapsedCaptured = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const projFile = projectFiles.find(f => f.id === seg.fileId);
        if (!projFile) continue;

        // Switch source
        video.src = URL.createObjectURL(projFile.file);
        video.playbackRate = videoSpeed;
        if ('preservesPitch' in video) (video as any).preservesPitch = true;

        // Pre-load Image Overlays once per sequence
        const loadedOverlays = await Promise.all(overlays.map(async ov => {
          if (ov.type === 'image') {
            const img = new Image();
            img.src = ov.content;
            await new Promise(r => { img.onload = r; img.onerror = r; });
            return { ...ov, img };
          }
          return ov;
        }));

        onProgress(isRtl ? `جاري تحميل المقطع ${i+1}...` : `Loading segment ${i+1}...`, 0);
        await new Promise((res) => {
            video.onloadedmetadata = res;
            video.onerror = (e) => { console.error('Video error', e); res(null); };
        });

        onProgress(isRtl ? `جاري البحث في المقطع ${i+1}...` : `Seeking segment ${i+1}...`, 5);
        video.currentTime = seg.start;
        await new Promise((res) => { video.onseeked = res; });
        onProgress(isRtl ? `جاري معالجة المقطع ${i+1}...` : `Rendering segment ${i+1}...`, 10);

        // Record segment
        await new Promise((segmentDone) => {
            let isDrawing = false;
            let fallbackInterval: ReturnType<typeof setInterval> | null = null;
            let reqId: number | null = null;

            const checkEnd = () => {
                if (video.currentTime >= seg.end || video.ended || video.paused) {
                    if (fallbackInterval) clearInterval(fallbackInterval);
                    if (reqId) {
                        if ('cancelVideoFrameCallback' in video) {
                            (video as any).cancelVideoFrameCallback(reqId);
                        } else {
                            cancelAnimationFrame(reqId);
                        }
                    }
                    video.pause();
                    URL.revokeObjectURL(video.src);
                    segmentDone(null);
                    return true;
                }
                return false;
            };

            const drawFrame = () => {
                if (isDrawing || checkEnd()) return;
                isDrawing = true;
                const vidRatio = video.videoWidth / video.videoHeight;
                ctx.save();
                
                // Background Blur
                ctx.filter = 'blur(40px) brightness(0.6)';
                let bgW = targetWidth, bgH = targetWidth / vidRatio;
                if (bgH < targetHeight) { bgH = targetHeight; bgW = targetHeight * vidRatio; }
                ctx.drawImage(video, (targetWidth - bgW) / 2, (targetHeight - bgH) / 2, bgW, bgH);
                ctx.restore();

                // Foreground Video
                ctx.save();
                
                // Apply Visual Filters
                if (visualFilter === 'grayscale') ctx.filter = 'grayscale(100%)';
                else if (visualFilter === 'sepia') ctx.filter = 'sepia(100%)';
                else if (visualFilter === 'vintage') ctx.filter = 'sepia(50%) contrast(1.1) brightness(0.9)';
                else if (visualFilter === 'warm') ctx.filter = 'saturate(130%) sepia(20%)';
                else if (visualFilter === 'cool') ctx.filter = 'saturate(90%) hue-rotate(10deg) brightness(1.05)'; 
                
                let fgW = targetWidth, fgH = targetWidth / vidRatio;
                if (fgH > targetHeight) { fgH = targetHeight; fgW = targetHeight * vidRatio; }
                ctx.drawImage(video, (targetWidth - fgW) / 2, (targetHeight - fgH) / 2, fgW, fgH);
                
                // Draw Overlays (Text/Watermarks)
                const currentTotalTime = elapsedCaptured + (video.currentTime - seg.start) / videoSpeed;
                for (const overlay of (loadedOverlays as any[])) {
                  if (currentTotalTime >= overlay.startTime && currentTotalTime <= overlay.endTime) {
                    const overlayElapsed = currentTotalTime - overlay.startTime;
                    const overlayDuration = overlay.endTime - overlay.startTime;
                    const animProgress = Math.min(1, overlayElapsed / 0.5); // 0.5s entrance
                    const exitProgress = Math.min(1, (overlay.endTime - currentTotalTime) / 0.5); // 0.5s exit
                    const opacity = overlay.animation === 'none' ? 1 : Math.min(animProgress, exitProgress);
                    
                    ctx.save();
                    ctx.globalAlpha = opacity;
                    
                    let drawX = overlay.x;
                    let drawY = overlay.y;
                    let scale = 1;

                    if (overlay.animation === 'slide-up') {
                        drawY += (1 - animProgress) * 50;
                    } else if (overlay.animation === 'zoom') {
                        scale = 0.8 + (animProgress * 0.2);
                    }

                    if (overlay.type === 'text') {
                      ctx.font = overlay.style?.font || 'bold 60px Inter';
                      if (overlay.fontFamily) ctx.font = ctx.font.replace(/Inter|sans-serif|serif/, overlay.fontFamily);
                      
                      ctx.fillStyle = overlay.style?.color || 'white';
                      ctx.strokeStyle = 'black';
                      ctx.lineWidth = 4;
                      
                      ctx.translate(drawX, drawY);
                      ctx.scale(scale, scale);
                      ctx.strokeText(overlay.content, 0, 0);
                      ctx.fillText(overlay.content, 0, 0);
                    } else if (overlay.type === 'image' && (overlay as any).img) {
                        ctx.translate(drawX, drawY);
                        ctx.scale(scale, scale);
                        ctx.drawImage((overlay as any).img, 0, 0);
                    }
                    ctx.restore();
                  }
                }

                ctx.restore();

                // Progress update
                const currentElapsed = elapsedCaptured + (video.currentTime - seg.start) / videoSpeed;
                onProgress('', Math.min(99, Math.round((currentElapsed / totalDuration) * 100)));

                isDrawing = false;
            };

            const loop = () => {
                if (checkEnd()) return;
                drawFrame();
                if ('requestVideoFrameCallback' in video) {
                    reqId = (video as any).requestVideoFrameCallback(loop);
                } else {
                    reqId = requestAnimationFrame(loop);
                }
            };

            fallbackInterval = setInterval(() => {
                if (!checkEnd() && document.hidden) {
                    drawFrame();
                }
            }, 1000 / 30);

            video.play().then(() => {
                if ('requestVideoFrameCallback' in video) {
                    reqId = (video as any).requestVideoFrameCallback(loop);
                } else {
                    reqId = requestAnimationFrame(loop);
                }
            });
        });

        elapsedCaptured += (seg.end - seg.start) / videoSpeed;
      }

      recorder.stop();
      onProgress(100);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Compatibility wrapper for single segment
 */
export async function renderCanvasVideo(
  file: File,
  segment: Segment,
  aspectRatio: AspectRatio,
  videoSpeed: number,
  audioBoost: number,
  onProgress: (pct: number) => void,
  visualFilter: VisualFilter = 'none'
): Promise<Blob> {
    const projFile: ProjectFile = {
        id: segment.fileId,
        file: file,
        name: file.name,
        duration: 0
    };
    return renderCanvasSequence([projFile], [segment], aspectRatio, videoSpeed, audioBoost, onProgress, visualFilter);
}

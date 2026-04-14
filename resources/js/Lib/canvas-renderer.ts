import { AspectRatio, Segment } from '../types';

/**
 * Renders a video segment with custom aspect ratio and blurred background using HTML5 Canvas
 * Process is roughly 10x to 100x faster than FFmpeg WebAssembly.
 */
export async function renderCanvasVideo(
  file: File,
  segment: Segment,
  aspectRatio: AspectRatio,
  onProgress: (pct: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true; // Must be muted to play automatically if needed
      video.crossOrigin = 'anonymous';
      video.playsInline = true;

      video.onloadedmetadata = () => {
        // Calculate dimensions
        const targetRatio = aspectRatio === 'shorts' ? 9 / 16 : aspectRatio === 'square' ? 1 / 1 : 16 / 9;
        const targetWidth = targetRatio > 1 ? 1920 : 1080;
        const targetHeight = Math.round(targetWidth / targetRatio);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Canvas 2D context not supported'));
        }

        // Setup MediaRecorder
        const stream = canvas.captureStream(30); // 30 FPS
        
        // Ensure audio is captured if the original video has audio tracks
        // We use Web Audio API to route the video's audio to the MediaRecorder stream
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sourceNode = audioCtx.createMediaElementSource(video);
        const destNode = audioCtx.createMediaStreamDestination();
        sourceNode.connect(destNode);
        // Do NOT connect to audioCtx.destination to prevent audio from playing out loud
        video.muted = false; // Must be unmuted to allow Web Audio API to capture the stream internally
        video.volume = 1;

        // Add the audio track to the video stream
        destNode.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });

        // Try standard mp4 first, fallback to webm
        let mimeType = 'video/webm;codecs=vp9,opus';
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          audioCtx.close();
          const finalBlob = new Blob(chunks, { type: mimeType });
          resolve(finalBlob);
        };

        // Rendering Loop
        let animationFrameId: number;
        const drawFrame = () => {
          if (video.currentTime >= segment.end || video.ended || video.paused && video.currentTime > segment.start) {
            recorder.stop();
            video.pause();
            cancelAnimationFrame(animationFrameId);
            onProgress(100);
            return;
          }

          // Calculate dimensions for covering the whole canvas (background)
          const vidRatio = video.videoWidth / video.videoHeight;
          
          ctx.clearRect(0, 0, targetWidth, targetHeight);

          // 1. Draw Blurred Background
          ctx.save();
          ctx.filter = 'blur(40px) brightness(0.6)'; // Add blur and darken slightly
          // Scale to fill
          let bgW = targetWidth;
          let bgH = targetWidth / vidRatio;
          if (bgH < targetHeight) {
            bgH = targetHeight;
            bgW = targetHeight * vidRatio;
          }
          const bgX = (targetWidth - bgW) / 2;
          const bgY = (targetHeight - bgH) / 2;
          ctx.drawImage(video, bgX, bgY, bgW, bgH);
          ctx.restore();

          // 2. Draw Foreground (Scaled to fit)
          let fgW = targetWidth;
          let fgH = targetWidth / vidRatio;
          if (fgH > targetHeight) {
            fgH = targetHeight;
            fgW = targetHeight * vidRatio;
          }
          const fgX = (targetWidth - fgW) / 2;
          const fgY = (targetHeight - fgH) / 2;
          ctx.drawImage(video, fgX, fgY, fgW, fgH);

          // Report Progress
          const pct = Math.min(99, Math.round(((video.currentTime - segment.start) / (segment.end - segment.start)) * 100));
          onProgress(pct);

          animationFrameId = requestAnimationFrame(drawFrame);
        };

        // Start Process
        video.currentTime = segment.start;
        video.onseeked = () => {
           video.onseeked = null; // Remove listener
           recorder.start();
           video.play().then(() => {
              drawFrame();
           }).catch(err => reject(err));
        };
      };

      video.onerror = (e) => reject(new Error('Failed to load video for canvas processing'));
    } catch (error) {
      reject(error);
    }
  });
}

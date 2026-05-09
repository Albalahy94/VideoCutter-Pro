/**
 * Transcription Service
 * This service handles communication with an AI API (e.g. Gemini or Whisper)
 * to transcribe video/audio content and generate subtitle files (SRT).
 */

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Converts segments to SRT format
 */
export function convertToSRT(segments: TranscriptionSegment[]): string {
  return segments
    .map((seg, i) => {
      const index = i + 1;
      const start = formatSRTTime(seg.start);
      const end = formatSRTTime(seg.end);
      return `${index}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
}

function formatSRTTime(seconds: number): string {
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
  return `${hh}:${mm}:${ss},${ms}`;
}

/**
 * Real AI Transcription using Gemini 1.5 Flash via Laravel Backend
 */
export async function transcribeVideo(file: File): Promise<TranscriptionSegment[]> {
  console.log('[Transcription] Sending to AI:', file.name);
  
  const formData = new FormData();
  formData.append('audio', file);
  
  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        // 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || errorData.message || 'Transcription failed';
      throw new Error(errorMsg);
    }

    return await response.json();
  } catch (error) {
    console.error('[Transcription Error]', error);
    throw error;
  }
}

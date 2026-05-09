/**
 * Audio Analyzer Utility
 * Extracts waveform peaks from a File for visualization on a Timeline.
 */

const peakCache = new Map<string, number[]>();

export async function getWaveformPeaks(file: File, width = 1000): Promise<number[]> {
  const cacheKey = `${file.name}_${file.size}_${width}`;
  if (peakCache.has(cacheKey)) return peakCache.get(cacheKey)!;

  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const sampleSize = Math.ceil(channelData.length / width);
    const peaks = [];

    for (let i = 0; i < width; i++) {
      const start = i * sampleSize;
      const end = start + sampleSize;
      let max = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    peakCache.set(cacheKey, peaks);
    audioCtx.close();
    return peaks;
  } catch (err) {
    console.error('[AudioAnalyzer] Failed to decode audio', err);
    return [];
  }
}

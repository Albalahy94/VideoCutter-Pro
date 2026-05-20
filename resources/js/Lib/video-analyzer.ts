/**
 * Video Analyzer — Client-Side AI Analysis
 * Extracts frames from video segments using Canvas API,
 * then sends them to Gemini Vision for content creator insights.
 */

import type { Segment, SegmentAnalysis, MotionLevel } from '../types'

/**
 * Extracts N evenly-spaced frames from a video segment using Canvas API.
 * Returns an array of base64 JPEG data URLs.
 */
export async function extractFrames(
  videoEl: HTMLVideoElement,
  segment: Segment,
  count = 4
): Promise<string[]> {
  const { start, end } = segment
  const duration = end - start
  if (duration <= 0 || !videoEl.src) return []

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Use a smaller resolution for speed
  canvas.width = 480
  canvas.height = Math.round(480 / (videoEl.videoWidth / videoEl.videoHeight || 1.78))

  const frames: string[] = []
  const times: number[] = []

  // Calculate evenly distributed timestamps
  for (let i = 0; i < count; i++) {
    const t = start + (duration / (count + 1)) * (i + 1)
    times.push(t)
  }

  for (const time of times) {
    const dataUrl = await seekAndCapture(videoEl, canvas, ctx, time)
    if (dataUrl) frames.push(dataUrl)
  }

  // Restore original playback position
  return frames
}

/**
 * Seeks the video to a specific time and captures a frame.
 */
async function seekAndCapture(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  time: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 5000)

    const onSeeked = () => {
      clearTimeout(timeout)
      video.removeEventListener('seeked', onSeeked)
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      } catch {
        resolve(null)
      }
    }

    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

/**
 * Converts a base64 data URL to a Gemini-compatible inline_data part.
 */
function dataUrlToPart(dataUrl: string) {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  return { inline_data: { mime_type: mimeType, data } }
}

/**
 * Builds the analysis prompt for Gemini Vision.
 * Tailored for content creators.
 */
function buildPrompt(lang: 'ar' | 'en', segmentName: string, segmentDuration: number, count: number): string {
  if (lang === 'ar') {
    return `أنت محلل محتوى متخصص يساعد صناع المحتوى على تحسين مقاطع الفيديو.

قم بتحليل هذه الفريمات من مقطع الفيديو المسمى "${segmentName}" (المدة: ${segmentDuration.toFixed(1)} ثانية).

أعطني تحليلاً شاملاً بصيغة JSON فقط (بدون أي نص خارج JSON):

{
  "sceneDescription": "وصف تفصيلي للمشهد بجملة أو جملتين",
  "visualStyle": "وصف الأسلوب البصري: الألوان، الإضاءة، زاوية التصوير (مثل: close-up، wide shot)، خلفية",
  "motionLevel": "static | low | medium | high",
  "mood": "المزاج العاطفي للمشهد (مثل: محفز، هادئ، تشويقي، مرح)",
  "contentTags": ["وسم1", "وسم2", "وسم3"],
  "viralScore": 85,
  "creatorTips": [
    "نصيحة محددة وقابلة للتنفيذ",
    "نصيحة أخرى",
    "نصيحة ثالثة"
  ],
  "bRollSuggestions": ["مصطلح بحث 1", "مصطلح بحث 2"],
  "socialMediaCopy": {
    "titles": ["عنوان 1", "عنوان 2", "عنوان 3"],
    "description": "وصف قصير ومشوق لمنصات يوتيوب/تيك توك",
    "hashtags": ["#وسم1", "#وسم2"]
  },
  "bestThumbnailIndex": 0
}

قواعد:
- viralScore من 1 إلى 100 (مدى احتمالية انتشار المقطع بناءً على قوة الثواني الأولى والتعبير البصري)
- contentTags يجب أن تكون بالعربية (مثل: حوار، خارجي، أكشن، كاميرا ثابتة)
- creatorTips: نصائح عملية ومحددة لتحسين المحتوى
- bRollSuggestions: مصطلحات بحث بالإنجليزية للبحث عن لقطات مساعدة (مثال: "person typing on laptop")
- bestThumbnailIndex: رقم من 0 إلى ${Math.max(1, count - 1)} يمثل الفريم الأفضل لاستخدامه كصورة مصغرة
- الرد يجب أن يكون JSON فقط`
  }

  return `You are a specialized content analyst helping content creators improve their video segments.

Analyze these frames from a video segment named "${segmentName}" (Duration: ${segmentDuration.toFixed(1)}s).

Provide a comprehensive analysis in JSON format ONLY (no text outside JSON):

{
  "sceneDescription": "Detailed scene description in 1-2 sentences",
  "visualStyle": "Visual style description: colors, lighting, shot angle (e.g. close-up, wide shot), background",
  "motionLevel": "static | low | medium | high",
  "mood": "Emotional tone of the scene (e.g. energetic, calm, suspenseful, fun)",
  "contentTags": ["tag1", "tag2", "tag3"],
  "viralScore": 85,
  "creatorTips": [
    "Specific actionable tip",
    "Another tip",
    "Third tip"
  ],
  "bRollSuggestions": ["search term 1", "search term 2"],
  "socialMediaCopy": {
    "titles": ["Title 1", "Title 2", "Title 3"],
    "description": "Short engaging description for YouTube/TikTok",
    "hashtags": ["#tag1", "#tag2"]
  },
  "bestThumbnailIndex": 0
}

Rules:
- viralScore from 1 to 100 (how likely this is to go viral based on the hook and visual expression)
- contentTags: short descriptive tags (e.g. talking-head, outdoor, action, static-camera)
- creatorTips: practical, specific improvements for this segment
- bRollSuggestions: english search terms for stock footage
- bestThumbnailIndex: an integer from 0 to ${Math.max(1, count - 1)} indicating the best frame for a thumbnail
- Response MUST be valid JSON only`
}

/**
 * Sends frames to Gemini Vision API and returns structured analysis.
 */
export async function analyzeSegmentWithGemini(
  frames: string[],
  segment: Segment,
  lang: 'ar' | 'en' = 'ar',
  count: number = 4
): Promise<Omit<SegmentAnalysis, 'segmentId' | 'thumbnail' | 'keyFrames' | 'analyzedAt'>> {
  if (frames.length === 0) throw new Error('No frames to analyze')

  const duration = segment.end - segment.start
  const prompt = buildPrompt(lang, segment.name, duration, count)

  // Build request parts: text prompt + all image frames
  const parts: any[] = [{ text: prompt }, ...frames.map(dataUrlToPart)]

  // Call our backend proxy to avoid CORS/COEP issues and secure the API key
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Parse JSON from response — strip any markdown fences if present
  const jsonStr = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(jsonStr)

  return {
    sceneDescription: parsed.sceneDescription || '',
    visualStyle: parsed.visualStyle || '',
    motionLevel: (parsed.motionLevel as MotionLevel) || 'medium',
    mood: parsed.mood || '',
    contentTags: Array.isArray(parsed.contentTags) ? parsed.contentTags : [],
    creatorTips: Array.isArray(parsed.creatorTips) ? parsed.creatorTips : [],
    viralScore: typeof parsed.viralScore === 'number' ? Math.max(1, Math.min(100, parsed.viralScore)) : 50,
    bRollSuggestions: Array.isArray(parsed.bRollSuggestions) ? parsed.bRollSuggestions : [],
    socialMediaCopy: {
      titles: Array.isArray(parsed.socialMediaCopy?.titles) ? parsed.socialMediaCopy.titles : [],
      description: parsed.socialMediaCopy?.description || '',
      hashtags: Array.isArray(parsed.socialMediaCopy?.hashtags) ? parsed.socialMediaCopy.hashtags : []
    },
    // We pass this back so the caller can pick the best thumbnail
    bestThumbnailIndex: typeof parsed.bestThumbnailIndex === 'number' ? parsed.bestThumbnailIndex : Math.floor(frames.length / 2)
  } as Omit<SegmentAnalysis, 'segmentId' | 'thumbnail' | 'keyFrames' | 'analyzedAt'> & { bestThumbnailIndex: number }
}

/**
 * Full pipeline: extract frames → analyze with Gemini → return SegmentAnalysis
 */
export async function analyzeSegment(
  videoEl: HTMLVideoElement,
  segment: Segment,
  lang: 'ar' | 'en' = 'ar',
  frameCount = 4
): Promise<SegmentAnalysis> {
  const frames = await extractFrames(videoEl, segment, frameCount)
  if (frames.length === 0) throw new Error('Could not extract frames from segment')

  const analysis = await analyzeSegmentWithGemini(frames, segment, lang, frameCount)

  const { bestThumbnailIndex, ...restAnalysis } = analysis as any;
  const validThumbIndex = Math.max(0, Math.min(frames.length - 1, bestThumbnailIndex));

  return {
    segmentId: segment.id,
    thumbnail: frames[validThumbIndex],
    keyFrames: frames,
    analyzedAt: Date.now(),
    ...restAnalysis,
  }
}

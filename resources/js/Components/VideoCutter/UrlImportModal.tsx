import React, { useState, useEffect } from 'react';
import { 
  X, Link2, Download, AlertCircle, CheckCircle2, 
  Loader2, Play, Video, Music2, Sparkles, Youtube, 
  Globe, ArrowRight, RefreshCw, Check
} from 'lucide-react';
import { useLanguage } from '../../Hooks/useLanguage';

interface UrlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoImported: (file: File, duration: number) => void;
}

interface VideoMetadata {
  title: string;
  duration: number;
  duration_formatted: string;
  thumbnail: string | null;
  uploader: string;
  platform: string;
}

export function UrlImportModal({ isOpen, onClose, onVideoImported }: UrlImportModalProps) {
  const { isRtl } = useLanguage();

  const [url, setUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [quality, setQuality] = useState<'auto' | '1080p' | '720p' | '480p' | 'audio'>('auto');
  const [autoSaveToDevice, setAutoSaveToDevice] = useState(true);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusStep, setStatusStep] = useState('');
  const [speed, setSpeed] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setMetadata(null);
      setError(null);
      setIsChecking(false);
      setIsDownloading(false);
      setProgress(0);
      setStatusStep('');
      setSpeed(null);
      setEta(null);
      setRetryNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setUrl(text.trim());
        checkUrl(text.trim());
      }
    } catch (e) {
      // Clipboard access denied
    }
  };

  const checkUrl = async (targetUrl = url) => {
    const cleanUrl = targetUrl.trim();
    if (!cleanUrl) {
      setError(isRtl ? 'يرجى إدخال رابط الفيديو أولاً.' : 'Please enter a video URL first.');
      return;
    }

    setIsChecking(true);
    setError(null);
    setMetadata(null);

    try {
      const resp = await fetch('/api/video/import-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
        },
        body: JSON.stringify({ url: cleanUrl })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || (isRtl ? 'تعذر جلب تفاصيل الفيديو من هذا الرابط.' : 'Could not fetch video info from URL.'));
      }

      // Duration validation: max 2 hours (7200 seconds)
      if (data.duration && data.duration > 7200) {
        throw new Error(isRtl ? 'عذراً، مدة الفيديو تتجاوز ساعتين (الحد الأقصى المسموح به للاستيراد هو 120 دقيقة حفاظاً على استقرار السيرفر).' : 'Video exceeds maximum allowed limit of 2 hours.');
      }

      setMetadata(data);
    } catch (err: any) {
      console.error('Fetch info error:', err);
      setError(err.message || (isRtl ? 'حدث خطأ أثناء فحص الرابط.' : 'An error occurred while inspecting the URL.'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartImport = async () => {
    if (!url.trim()) return;

    setIsDownloading(true);
    setError(null);
    setProgress(5);
    setStatusStep(isRtl ? 'جاري بدء مهمة التحميل في السيرفر...' : 'Starting download on server...');

    try {
      const startResp = await fetch('/api/video/import-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
        },
        body: JSON.stringify({ 
          url: url.trim(),
          quality: quality
        })
      });

      const startData = await startResp.json();
      if (!startResp.ok || !startData.job_id) {
        throw new Error(startData.error || (isRtl ? 'تعذر بدء تحميل الفيديو من السيرفر.' : 'Failed to start download job.'));
      }

      const jobId = startData.job_id;

      // Resilient Polling Loop
      let isDone = false;
      const startTime = Date.now();
      const maxWaitMs = 15 * 60 * 1000; // 15 minutes max
      let completedData: any = null;

      while (!isDone) {
        if (Date.now() - startTime > maxWaitMs) {
          throw new Error(isRtl ? 'استغرق تحميل الفيديو وقتاً أطول من المتوقع.' : 'Video download timed out.');
        }

        await new Promise(r => setTimeout(r, 1500));

        try {
          const pollResp = await fetch(`/api/video/import-status/${jobId}`);
          if (!pollResp.ok) throw new Error(`HTTP ${pollResp.status}`);

          const pollData = await pollResp.json();
          setRetryNotice(null);

          if (pollData.status === 'completed') {
            isDone = true;
            completedData = pollData;
            setProgress(100);
            setStatusStep(isRtl ? 'اكتمل التحميل! جاري استلام الملف للمحرر...' : 'Download completed! Transferring to editor...');
            break;
          }

          if (pollData.status === 'failed') {
            throw new Error(pollData.error || (isRtl ? 'فشل تحميل الفيديو في السيرفر.' : 'Server failed to download video.'));
          }

          setProgress(pollData.progress || 15);
          if (pollData.step) setStatusStep(pollData.step);
          if (pollData.speed) setSpeed(pollData.speed);
          if (pollData.eta) setEta(pollData.eta);

        } catch (pollErr: any) {
          console.warn('Polling network fluctuation:', pollErr);
          setRetryNotice(isRtl ? 'انقطع الاتصال مؤقتاً، السيرفر يواصل التحميل وجاري استئناف المتابعة...' : 'Connection dropped, server continues downloading. Reconnecting...');
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // Download file to browser as Blob with 5 retries
      let videoBlob: Blob | null = null;
      let finalFileName = completedData?.output_file || (metadata?.title ? `${metadata.title}.mp4` : 'imported_video.mp4');
      const maxRetries = 5;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          setStatusStep(attempt > 1 
            ? (isRtl ? `جاري استلام ملف الفيديو (محاولة ${attempt} من ${maxRetries})...` : `Downloading video file (attempt ${attempt} of ${maxRetries})...`)
            : (isRtl ? 'جاري استلام ملف الفيديو وفتحه في المحرر...' : 'Transferring video file to editor...')
          );

          const dlResp = await fetch(`/api/video/import-download/${jobId}`);
          if (!dlResp.ok) throw new Error(`HTTP ${dlResp.status}`);

          // Read content-disposition header if available for exact filename
          const disp = dlResp.headers.get('content-disposition');
          if (disp && disp.includes('filename=')) {
            const match = disp.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
            if (match && match[1]) {
              try {
                finalFileName = decodeURIComponent(match[1]);
              } catch {
                finalFileName = match[1];
              }
            }
          }

          videoBlob = await dlResp.blob();
          if (videoBlob && videoBlob.size > 1000) {
            break;
          }
        } catch (dlErr: any) {
          console.warn(`File download attempt ${attempt} failed:`, dlErr);
          if (attempt === maxRetries) {
            throw new Error(isRtl ? 'تعذر تنزيل الملف بعد اكتمال معالجته بسبب انقطاع الإنترنت. يرجى المحاولة ثانية.' : 'Failed to download file after multiple attempts.');
          }
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (!videoBlob) {
        throw new Error(isRtl ? 'الملف الناتج فارغ أو غير صالح.' : 'Generated file is empty or corrupted.');
      }

      // Immediately delete file from server storage to free disk space (since browser holds it in memory now)
      try {
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
        fetch(`/api/video/import-cleanup/${jobId}`, {
          method: 'POST',
          headers: { 'X-CSRF-TOKEN': csrfToken }
        }).catch(e => console.warn('Server cleanup notice:', e));
      } catch (cleanErr) {
        // Non-blocking
      }

      const mimeType = quality === 'audio' ? 'audio/mp4' : 'video/mp4';
      const importedFile = new File([videoBlob], finalFileName, { type: mimeType });

      // Automatically save a local copy to user's device (Downloads) if requested
      if (autoSaveToDevice) {
        try {
          const downloadUrl = URL.createObjectURL(videoBlob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = finalFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 8000);
        } catch (saveErr) {
          console.warn('Auto-save to local disk notice:', saveErr);
        }
      }

      // Probe true video duration from the loaded blob
      let trueDuration = metadata?.duration || completedData?.duration || 0;
      try {
        const probeVid = document.createElement('video');
        probeVid.preload = 'metadata';
        const blobUrl = URL.createObjectURL(videoBlob);
        probeVid.src = blobUrl;
        await new Promise<void>((res) => {
          probeVid.onloadedmetadata = () => {
            if (probeVid.duration && !isNaN(probeVid.duration) && probeVid.duration > 0) {
              trueDuration = probeVid.duration;
            }
            URL.revokeObjectURL(blobUrl);
            res();
          };
          probeVid.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            res();
          };
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            res();
          }, 2500);
        });
      } catch (probeErr) {
        console.warn('Video duration probe skipped:', probeErr);
      }

      onVideoImported(importedFile, trueDuration);
      onClose();

    } catch (err: any) {
      console.error('Import process failed:', err);
      setError(err.message || (isRtl ? 'فشلت عملية الاستيراد.' : 'Import failed.'));
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity" 
        onClick={!isDownloading ? onClose : undefined} 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-bg-card border border-bg-border rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-bg-border/60 bg-gradient-to-r from-accent/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent shadow-sm">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-text-primary">
                {isRtl ? 'استيراد فيديو من رابط' : 'Import Video from URL'}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {isRtl ? 'YouTube, TikTok, Facebook, Instagram, Twitter/X والمزيد' : 'Supports YouTube, TikTok, Facebook, Instagram, X & more'}
              </p>
            </div>
          </div>

          {!isDownloading && (
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-5">

          {/* URL Input Form */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
              <span>{isRtl ? 'ضع رابط الفيديو هنا:' : 'Paste Video URL here:'}</span>
              <button
                type="button"
                onClick={handlePaste}
                disabled={isChecking || isDownloading}
                className="text-[11px] text-accent hover:underline flex items-center gap-1 font-bold disabled:opacity-50"
              >
                <span>📋</span> {isRtl ? 'لصق من الحافظة' : 'Paste from clipboard'}
              </button>
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  disabled={isChecking || isDownloading}
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isChecking && !isDownloading) {
                      checkUrl();
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=... أو TikTok أو Facebook"
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-bg-elevated border border-bg-border focus:border-accent focus:ring-2 focus:ring-accent/20 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted"
                />
                <Globe className="w-4 h-4 text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={() => checkUrl()}
                disabled={isChecking || isDownloading || !url.trim()}
                className="px-5 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md shadow-accent/20 disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRtl ? 'فحص...' : 'Checking...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{isRtl ? 'فحص الرابط' : 'Check URL'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Supported Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <span className="text-[11px] text-text-muted font-medium">{isRtl ? 'المنصات المدعومة:' : 'Supported:'}</span>
            <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold">YouTube</span>
            <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-bg-border text-text-primary text-[10px] font-bold">TikTok</span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-600/10 border border-blue-600/20 text-blue-500 text-[10px] font-bold">Facebook</span>
            <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-500 text-[10px] font-bold">Instagram</span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-500 text-[10px] font-bold">Twitter / X</span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold">+1800 موقع</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Video Metadata Card */}
          {metadata && !isDownloading && (
            <div className="flex flex-col gap-4 p-4 rounded-2xl bg-bg-elevated border border-accent/30 shadow-lg relative overflow-hidden animate-fade-in">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-28 h-20 rounded-xl overflow-hidden bg-black/40 shrink-0 relative border border-bg-border flex items-center justify-center">
                  {metadata.thumbnail ? (
                    <img 
                      src={metadata.thumbnail} 
                      alt={metadata.title} 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <Video className="w-8 h-8 text-text-muted" />
                  )}
                  {metadata.duration_formatted && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                      {metadata.duration_formatted}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-accent/20 text-accent">
                        {metadata.platform}
                      </span>
                      {metadata.uploader && (
                        <span className="text-[11px] text-text-muted truncate max-w-[180px]">
                          {metadata.uploader}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-text-primary line-clamp-2 leading-tight">
                      {metadata.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Long video notice if > 30 minutes */}
              {metadata.duration > 1800 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-medium">
                  <span>⏳</span>
                  <span>
                    {isRtl 
                      ? `هذا المقطع طويل (${metadata.duration_formatted}). قد يستغرق التحميل والتجهيز بضع دقائق إضافية.`
                      : `Long video (${metadata.duration_formatted}). Processing may take a few extra minutes.`}
                  </span>
                </div>
              )}

              {/* Quality Options */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bg-border/60">
                <span className="text-xs font-semibold text-text-secondary">
                  {isRtl ? 'اختر دقة التنزيل:' : 'Select Download Quality:'}
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'auto', label: isRtl ? 'تلقائي' : 'Auto', sub: 'أفضل جودة' },
                    { id: '1080p', label: '1080p', sub: 'عالي الدقة' },
                    { id: '720p', label: '720p', sub: 'متوسط' },
                    { id: '480p', label: '480p', sub: 'حجم خفيف' },
                    { id: 'audio', label: isRtl ? 'صوت' : 'Audio', sub: 'M4A نقي' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuality(q.id as any)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        quality === q.id
                          ? 'bg-accent/20 border-accent text-accent shadow-sm'
                          : 'bg-bg-card border-bg-border text-text-muted hover:border-accent/30 hover:text-text-primary'
                      }`}
                    >
                      <span>{q.label}</span>
                      <span className="text-[9px] font-normal opacity-70">{q.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-save to device toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-accent/5 border border-accent/20 cursor-pointer select-none transition-all hover:bg-accent/10">
                <input
                  type="checkbox"
                  checked={autoSaveToDevice}
                  onChange={(e) => setAutoSaveToDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-bg-border text-accent focus:ring-accent/20 cursor-pointer accent-accent"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <span>💾</span>
                    <span>{isRtl ? 'حفظ نسخة تلقائياً على جهازي في مجلد التنزيلات (Downloads)' : 'Auto-save a copy to my device (Downloads)'}</span>
                  </span>
                  <span className="text-[10px] text-text-muted mt-0.5">
                    {isRtl ? 'يوفر عليك طلب الرابط ثانية ويضمن بقاء الملف بجهازك مع إخلاء مساحة السيرفر فوراً' : 'Keeps a local copy for instant offline re-use and frees server storage'}
                  </span>
                </div>
              </label>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleStartImport}
                className="w-full mt-1 py-3 px-4 rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white text-sm font-bold transition-all shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isRtl ? 'تحميل واستيراد إلى المحرر' : 'Download & Import to Editor'}</span>
              </button>
            </div>
          )}

          {/* Active Download Progress Box */}
          {isDownloading && (
            <div className="flex flex-col gap-3 p-5 rounded-2xl bg-bg-elevated border border-accent/40 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span>{statusStep || (isRtl ? 'جاري المعالجة...' : 'Processing...')}</span>
                </div>
                <span className="text-sm font-black font-mono text-accent">
                  {progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-bg-border overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-accent via-purple-500 to-accent transition-all duration-300"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>

              {/* Meta stats: speed / ETA */}
              <div className="flex items-center justify-between text-xs text-text-muted font-mono pt-1">
                <div>
                  {speed && (
                    <span>⚡ {isRtl ? 'السرعة: ' : 'Speed: '}{speed}</span>
                  )}
                </div>
                <div>
                  {eta && (
                    <span>⏳ {isRtl ? 'المتبقي: ' : 'ETA: '}{eta}</span>
                  )}
                </div>
              </div>

              {/* Network Retry Notification */}
              {retryNotice && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{retryNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Limits Notice */}
          <div className="pt-2 border-t border-bg-border/60 flex items-center justify-between text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <span>📌</span>
              <span>{isRtl ? 'الحد الأقصى للمقطع المستورد: ساعتان' : 'Max supported length: 2 hours'}</span>
            </span>
            <span>
              {isRtl ? 'الجودة الموصى بها: 720p أو تلقائي' : 'Recommended: 720p or Auto'}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

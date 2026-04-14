import { useState, useRef, useCallback, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Header } from '../Components/VideoCutter/Header';
import { VideoPlayer } from '../Components/VideoCutter/VideoPlayer';
import { ModeSelector } from '../Components/VideoCutter/ModeSelector';
import { EffectsSelector } from '../Components/VideoCutter/EffectsSelector';
import { SegmentList } from '../Components/VideoCutter/SegmentList';
import { ProcessingPanel } from '../Components/VideoCutter/ProcessingPanel';
import { SmartImportModal } from '../Components/VideoCutter/SmartImportModal';
import { OnboardingModal } from '../Components/VideoCutter/OnboardingModal';
import { useProject } from '../Hooks/useProject';
import { useFFmpeg } from '../Hooks/useFFmpeg';
import { useLanguage } from '../Hooks/useLanguage';
import type { Segment } from '../types';
import axios from 'axios';

interface Props {
  auth: {
    user: any;
  };
}

export default function Editor({ auth }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const project = useProject();
  const ffmpeg = useFFmpeg();
  const { isRtl } = useLanguage();
  const [needsSurvey, setNeedsSurvey] = useState(false);

  // Initialize analytics & check usage
  useEffect(() => {
    // Auto-load FFmpeg engine as soon as user enters the page
    ffmpeg.loadFFmpeg();

    axios.post('/api/analytics', { action: 'page_view', details: { page: 'editor' } });
    
    axios.get('/api/usage/status').then(res => {
      if (res.data.needs_survey) {
        setNeedsSurvey(true);
      }
    });

    // Check onboarding status
    const seenOnboarding = localStorage.getItem('vcpro_onboarding_seen');
    if (!seenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const handleFileLoad = useCallback((f: File, d: number) => {
    setFile(f);
    setDuration(d);
    setCurrentTime(0);
    project.setVideoName(f.name);
    project.clearSegments();
    showToast(`${isRtl ? 'تم تحميل' : 'Loaded'}: ${f.name}`, 'success');
  }, [project, showToast, isRtl]);

  const seek = useCallback((t: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (!videoRef.current) return;
          isPlaying ? videoRef.current.pause() : videoRef.current.play();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(Math.min(duration, currentTime + 5));
          break;
        case 'KeyI':
          setInPoint(currentTime);
          showToast(`${isRtl ? 'البدء' : 'In point'}: ${new Date(currentTime * 1000).toISOString().slice(11, 19)}`, 'info');
          break;
        case 'KeyO':
          if (inPoint !== null) {
            const start = Math.min(inPoint, currentTime);
            const end = Math.max(inPoint, currentTime);
            if (end - start > 0.1) {
              const n = project.segments.length + 1;
              project.addSegment(start, end);
              showToast(`${isRtl ? 'تمت إضافة المقطع' : 'Added segment'} ${n}: ${new Date(start * 1000).toISOString().slice(11, 19)} → ${new Date(end * 1000).toISOString().slice(11, 19)}`, 'success');
              setInPoint(null);
            } else {
              showToast(isRtl ? 'المقطع قصير جداً. حرك المؤشر لأمام.' : 'Segment too short. Move playhead further.', 'error');
            }
          } else {
            showToast(isRtl ? 'اضغط I أولاً لتحديد البداية.' : 'Press I first to set the start point.', 'info');
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, currentTime, duration, inPoint, project, seek, showToast, isRtl]);

  const handleStart = useCallback(async () => {
    if (needsSurvey) { showToast(isRtl ? 'يرجى إكمال الاستبيان للمتابعة.' : 'Please complete the survey to continue.', 'info'); return; }
    if (!file) { showToast(isRtl ? 'يرجى تحميل فيديو أولاً.' : 'Please load a video first.', 'error'); return; }
    if (project.segments.length === 0) { showToast(isRtl ? 'أضف مقطعاً واحداً على الأقل.' : 'Add at least one segment.', 'error'); return; }
    if (project.mode === 'merge' && project.segments.length < 2) {
      showToast(isRtl ? 'وضع الدمج يتطلب مقطعين على الأقل.' : 'Merge mode requires at least 2 segments.', 'error'); return;
    }

    // Mobile-specific memory warning
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const sizeInMB = file.size / (1024 * 1024);
    if (isMobile && sizeInMB > 300) {
      const confirmed = window.confirm(isRtl 
        ? 'حجم الملف كبير جداً بالنسبة للموبايل (أكبر من 300 ميجا). قد يفشل المتصفح بسبب نقص الذاكرة. هل تريد الاستمرار؟' 
        : 'File size is large for mobile (>300MB). Browser may crash due to memory limits. Continue?');
      if (!confirmed) return;
    }

    await ffmpeg.process(file, project.segments, project.mode, project.aspectRatio, project.transition, duration);
    
    // Increment usage and check survey status after processing starts/completes
    axios.post('/api/usage/increment');
    axios.post('/api/analytics', { action: 'video_cut', details: { mode: project.mode, segments: project.segments.length } });
    
    // Check if next use needs survey
    axios.get('/api/usage/status').then(res => {
      if (res.data.needs_survey) setNeedsSurvey(true);
    });
  }, [file, project.segments, project.mode, project.aspectRatio, project.transition, duration, ffmpeg, showToast, isRtl, needsSurvey]);


  const handleSurveySubmit = async (data: any) => {
    await axios.post('/api/usage/feedback', data);
    setNeedsSurvey(false);
    showToast(isRtl ? 'شكراً لرأيك!' : 'Thank you for your feedback!', 'success');
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Head title="VideoCutter Pro" />
      <Header
        user={auth.user}
        isAuthLoading={false}
        onLoginClick={() => (window.location.href = route('login'))}
        onLogout={() => {}} // Handle via Inertia
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
          <div className="flex flex-col gap-5">
            <VideoPlayer
              file={file}
              videoRef={videoRef}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              isMuted={isMuted}
              segments={project.segments}
              mode={project.mode}
              onFileLoad={handleFileLoad}
              onTimeUpdate={setCurrentTime}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onToggleMute={() => {
                setIsMuted(v => !v);
                if (videoRef.current) videoRef.current.muted = !isMuted;
              }}
              onSeek={seek}
              onAdd={project.addSegment}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ModeSelector mode={project.mode} onChange={project.setMode} disabled={ffmpeg.isProcessing} />
              <EffectsSelector
                aspectRatio={project.aspectRatio}
                transition={project.transition}
                onRatioChange={project.setAspectRatio}
                onTransitionChange={project.setTransition}
                disabled={ffmpeg.isProcessing}
              />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <SegmentList
              segments={project.segments}
              mode={project.mode}
              duration={duration}
              currentTime={currentTime}
              inPoint={inPoint}
              onAdd={project.addSegment}
              onUpdate={project.updateSegment}
              onRemove={project.removeSegment}
              onSort={project.sortSegments}
              onClear={project.clearSegments}
              onSeekTo={seek}
              onImportOpen={() => setShowImport(true)}
              onSetSegments={project.setSegmentsAll}
              disabled={ffmpeg.isProcessing}
            />
            <ProcessingPanel
              mode={project.mode}
              isProcessing={ffmpeg.isProcessing}
              isLoading={ffmpeg.isLoading}
              isLoaded={ffmpeg.isLoaded}
              progress={ffmpeg.progress}
              step={ffmpeg.step}
              logs={ffmpeg.logs}
              segments={project.segments.length}
              hasFile={!!file}
              onStart={handleStart}
              onLoadFFmpeg={ffmpeg.loadFFmpeg}
            />
          </div>
        </div>
      </main>

      <SmartImportModal isOpen={showImport} duration={duration} onClose={() => setShowImport(false)} onImport={project.setSegmentsAll} />

      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('vcpro_onboarding_seen', 'true');
        }} 
      />

      {/* Survey Modal */}
      {needsSurvey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-elevated border border-accent-light/30 rounded-[2rem] p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-white">
              {isRtl ? 'نقدر رأيك!' : 'We value your feedback!'}
            </h2>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">
              {isRtl 
                ? 'لقد استخدمت الخدمة 3 مرات بنجاح. يرجى إخبارنا برأيك لنستمر في تحسين التجربة. لن يستغرق الأمر سوى ثوانٍ.' 
                : 'You have successfully used the service 3 times. Please let us know what you think so we can keep improving. It only takes a few seconds.'}
            </p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSurveySubmit({
                rating: formData.get('rating'),
                source: formData.get('source'),
                suggestion: formData.get('suggestion'),
              });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  {isRtl ? 'التقييم' : 'Rating'}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <label key={num} className="flex-1 cursor-pointer">
                      <input type="radio" name="rating" value={num} required className="peer hidden" />
                      <div className="h-10 rounded-xl bg-bg-primary border border-bg-border flex items-center justify-center peer-checked:bg-accent peer-checked:text-white transition-all text-sm font-bold text-white">
                        {num}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
 
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  {isRtl ? 'كيف سمعت عنا؟' : 'How did you hear about us?'}
                </label>
                <select name="source" className="w-full bg-bg-primary border border-bg-border rounded-xl px-4 py-2.5 text-sm focus:border-accent-light outline-none transition-all text-white">
                  <option value="Google">Google</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
 
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                  {isRtl ? 'اقتراح للتحسين' : 'Suggestion for improvement'}
                </label>
                <textarea 
                  name="suggestion"
                  className="w-full bg-bg-primary border border-bg-border rounded-xl px-4 py-2.5 text-sm focus:border-accent-light outline-none transition-all resize-none h-24 text-white"
                  placeholder={isRtl ? 'أكتب هنا...' : 'Type here...'}
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all"
              >
                {isRtl ? 'إرسال ومتابعة' : 'Submit & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="rounded-xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2 max-w-xs transition-all duration-300 transform animate-fade-in"
            style={{
              background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)'}`,
              color: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : 'var(--accent-light)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

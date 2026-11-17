import { useState, useRef, useCallback, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Film, Scissors, Sparkles, Type, Mic, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { Header } from '../Components/VideoCutter/Header';
import { VideoPlayer } from '../Components/VideoCutter/VideoPlayer';
import { ModeSelector } from '../Components/VideoCutter/ModeSelector';
import { EffectsSelector } from '../Components/VideoCutter/EffectsSelector';
import { SegmentList } from '../Components/VideoCutter/SegmentList';
import { ProcessingPanel } from '../Components/VideoCutter/ProcessingPanel';
import { SmartImportModal } from '../Components/VideoCutter/SmartImportModal';
import { UrlImportModal } from '../Components/VideoCutter/UrlImportModal';
import { OnboardingModal } from '../Components/VideoCutter/OnboardingModal';
import { FileManager } from '../Components/VideoCutter/FileManager';
import { Timeline } from '../Components/VideoCutter/Timeline';
import { OverlayManager } from '../Components/VideoCutter/OverlayManager';
import { VoiceOverRecorder } from '../Components/VideoCutter/VoiceOverRecorder';
import { TemplateGallery } from '../Components/VideoCutter/TemplateGallery';
import { ExportSettings } from '../Components/VideoCutter/ExportSettings';
import { useProject, uuid } from '../Hooks/useProject';
import { useFFmpeg } from '../Hooks/useFFmpeg';
import { useLanguage } from '../Hooks/useLanguage';
import { useVideoAnalysis } from '../Hooks/useVideoAnalysis';
import { initGoogleDrive, pickFileFromDrive, saveFileToDrive, disconnectDrive } from '../Lib/google-drive-v2';
import { detectSilence } from '../Lib/ffmpeg-utils';
import type { Segment } from '../types';
import axios from 'axios';

interface Props {
  auth: {
    user: any;
  };
}

export default function Editor({ auth }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const project = useProject();

  const activeFile = project.activeFile;
  const activeFileItem = project.files.find(f => f.id === project.activeFileId);
  const duration = activeFileItem?.duration || 0;

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info', persistent?: boolean }[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const ffmpeg = useFFmpeg();
  const { isRtl } = useLanguage();
  const videoAnalysis = useVideoAnalysis(isRtl ? 'ar' : 'en');
  const [needsSurvey, setNeedsSurvey] = useState(false);
  const [isAutoCutting, setIsAutoCutting] = useState(false);
  const [includeSubtitles, setIncludeSubtitles] = useState(false);
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [activeTab, setActiveTab] = useState<'media' | 'cut' | 'effects' | 'text' | 'audio' | 'export'>('cut');
  const [driveConnected, setDriveConnected] = useState(!!localStorage.getItem('drive_access_token'));
  const [driveLoading, setDriveLoading] = useState(false);

  useEffect(() => {
    const checkAuth = () => setDriveConnected(!!localStorage.getItem('drive_access_token'));
    window.addEventListener('drive-auth-changed', checkAuth);
    return () => window.removeEventListener('drive-auth-changed', checkAuth);
  }, []);

  // Silent Audio Hack for background processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const silentOscRef = useRef<OscillatorNode | null>(null);

  const startKeepAwake = () => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001; // Almost silent
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      silentOscRef.current = osc;
      console.log('[VCPro] Keep-awake active');
    } catch (e) { console.warn('Failed to start keep-awake audio', e); }
  };

  const stopKeepAwake = () => {
    silentOscRef.current?.stop();
    silentOscRef.current = null;
    console.log('[VCPro] Keep-awake stopped');
  };

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

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', persistent = false) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-3), { id, message, type, persistent }]);
    if (!persistent) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleFileLoad = useCallback((f: File, d: number) => {
    const id = project.addFile(f, d);
    showToast(`${isRtl ? 'تم تحميل الفيديو' : 'Video loaded'}: ${f.name}`, 'success');

    // Friendly capacity notices
    if (f.size > 2 * 1024 * 1024 * 1024) {
      setTimeout(() => {
        showToast(
          isRtl 
            ? `تنبيه سعة: حجم الملف كبير (${(f.size / (1024 * 1024 * 1024)).toFixed(1)} جيجابايت). قد يتطلب تصديره وقتاً وذاكرة أكبر.`
            : `Capacity Notice: Large file (${(f.size / (1024 * 1024 * 1024)).toFixed(1)} GB). Processing may require more browser memory.`,
          'info'
        );
      }, 900);
    } else if (d > 1800) {
      setTimeout(() => {
        showToast(
          isRtl
            ? `تنبيه مدة: الفيديو طويل (${Math.round(d / 60)} دقيقة). ننصح بقص المقاطع المستهدفة لضمان أقصى سرعة وأداء سلس.`
            : `Duration Notice: Long video (${Math.round(d / 60)} min). We recommend trimming target segments for optimal speed.`,
          'info'
        );
      }, 900);
    }
  }, [project, showToast, isRtl]);

  const handleAddMore = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Process each file
    for (const f of Array.from(selectedFiles)) {
      // We need duration. A dummy video element can get it.
      await new Promise<void>((resolve) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.src = URL.createObjectURL(f);
        v.onloadedmetadata = () => {
          handleFileLoad(f, v.duration);
          URL.revokeObjectURL(v.src);
          resolve();
        };
        // Handle potential errors (e.g. not a video or corrupted)
        v.onerror = () => {
          showToast(`${isRtl ? 'فشل تحميل' : 'Failed to load'}: ${f.name}`, 'error');
          URL.revokeObjectURL(v.src);
          resolve();
        };
      });
    }

    e.target.value = ''; // Reset
  };

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
        case 'KeyS':
          e.preventDefault();
          const activeSegment = project.segments.find(s => s.fileId === project.activeFileId && s.start < currentTime && s.end > currentTime);
          if (activeSegment && (currentTime - activeSegment.start > 0.1) && (activeSegment.end - currentTime > 0.1)) {
            // Split the segment
            project.updateSegment(activeSegment.id, { end: currentTime });
            project.addSegment(currentTime, activeSegment.end, project.activeFileId!);
            showToast(isRtl ? 'تم تقسيم المقطع عند المؤشر' : 'Split segment at playhead', 'success');
          } else {
            showToast(isRtl ? 'لا يوجد مقطع تحت المؤشر لتقسيمه' : 'No segment under playhead to split', 'info');
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, currentTime, duration, inPoint, project, seek, showToast, isRtl]);

  const handleStart = useCallback(async () => {
    if (needsSurvey) { showToast(isRtl ? 'يرجى إكمال الاستبيان للمتابعة.' : 'Please complete the survey to continue.', 'info'); return; }
    if (!activeFile) { showToast(isRtl ? 'يرجى تحميل فيديو أولاً.' : 'Please load a video first.', 'error'); return; }
    if (project.segments.length === 0) { showToast(isRtl ? 'أضف مقطعاً واحداً على الأقل.' : 'Add at least one segment.', 'error'); return; }
    if (project.mode === 'merge' && project.segments.length < 2) {
      showToast(isRtl ? 'وضع الدمج يتطلب مقطعين على الأقل.' : 'Merge mode requires at least 2 segments.', 'error'); return;
    }

    // Mobile-specific memory warning
    const totalSize = project.files.reduce((acc, f) => acc + f.file.size, 0);
    const sizeInMB = totalSize / (1024 * 1024);
    if (isMobile && sizeInMB > 350) {
      const confirmed = window.confirm(isRtl
        ? 'اجمالي حجم الملفات كبير جداً بالنسبة للموبايل. قد يفشل المتصفح. هل تريد الاستمرار؟'
        : 'Total size is large for mobile. Browser may crash. Continue?');
      if (!confirmed) return;
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    startKeepAwake();
    try {
      await ffmpeg.process(
        project.files,
        project.segments,
        project.mode,
        project.aspectRatio,
        project.transition,
        project.videoSpeed,
        project.audioBoost,
        duration,
        includeSubtitles,
        project.visualFilter,
        project.noiseReduction,
        project.backgroundMusic,
        project.bgMusicVolume,
        project.overlays,
        project.audioPreset,
        project.vocalIsolation,
        project.exportResolution,
        project.exportFormat,
        project.exportBitrate
      );
      stopKeepAwake();

      setActiveTab('export');
      const successMsg = isRtl ? '🎉 اكتمل تصدير الفيديو بنجاح! تم حفظ الملف في الذاكرة ويمكنك إعادة تحميله في أي وقت.' : '🎉 Video export complete! Saved in memory and ready for download.';
      showToast(successMsg, 'success', true);

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const playTone = (freq: number, startTime: number, toneDuration: number, vol: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
            gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
            gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + toneDuration);
            osc.start(ctx.currentTime + startTime);
            osc.stop(ctx.currentTime + startTime + toneDuration);
          };
          playTone(523.25, 0, 0.4, 0.3);    // C5
          playTone(659.25, 0.1, 0.5, 0.3);  // E5
          playTone(783.99, 0.2, 0.6, 0.3);  // G5
          playTone(1046.50, 0.3, 1.2, 0.4); // C6
        }
      } catch (e) { console.warn('Failed to play success sound'); }

      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(isRtl ? 'اكتمل تصدير الفيديو!' : 'Video Export Complete!', {
          body: isRtl ? 'تم الانتهاء من معالجة وتصدير الفيديو بنجاح.' : 'Your video has been processed and exported successfully.',
        });
      }

      // Increment usage and check survey status after processing starts/completes
      axios.post('/api/usage/increment');
      axios.post('/api/analytics', { action: 'video_cut', details: { mode: project.mode, segments: project.segments.length } });

      // Check if next use needs survey
      axios.get('/api/usage/status').then(res => {
        if (res.data.needs_survey) setNeedsSurvey(true);
      });
    } catch (err) {
      console.error('[Export Error]', err);
      stopKeepAwake();
      showToast(isRtl ? 'حدث خطأ أثناء معالجة الفيديو' : 'Error during video processing', 'error', true);
    }
  }, [activeFile, project.segments, project.mode, project.aspectRatio, project.transition, duration, ffmpeg, showToast, isRtl, needsSurvey]);


  const handleSurveySubmit = async (data: any) => {
    await axios.post('/api/usage/feedback', data);
    setNeedsSurvey(false);
    showToast(isRtl ? 'شكراً لرأيك!' : 'Thank you for your feedback!', 'success');
  };

  const applyTemplate = (settings: { aspectRatio: any; visualFilter: any; audioPreset: any; noiseReduction: boolean; showSafeZones: boolean }) => {
    project.setAspectRatio(settings.aspectRatio);
    project.setVisualFilter(settings.visualFilter);
    project.setAudioPreset(settings.audioPreset);
    project.setNoiseReduction(settings.noiseReduction);
    project.setShowSafeZones(settings.showSafeZones);
    showToast(isRtl ? '✅ تم تطبيق القالب بنجاح!' : '✅ Template applied!', 'success');
  };

  const handleAutoCut = async () => {
    if (!activeFileItem) return;
    setIsAutoCutting(true);
    showToast(isRtl ? 'جاري تحليل الصوت وتقطيع الفيديو...' : 'Analyzing audio and auto-cutting...', 'info');

    try {
      const detected = await detectSilence(activeFileItem.file, duration);
      project.setSegmentsAll(detected.map((d, idx) => ({
        id: uuid(),
        ...d,
        name: isRtl ? `مقطع ${idx + 1}` : `Segment ${idx + 1}`,
        fileId: project.activeFileId!
      })));
      showToast(isRtl ? `تم اكتشاف ${detected.length} مقاطع!` : `Detected ${detected.length} segments!`, 'success');
    } catch (err) {
      showToast(isRtl ? 'فشل التقطيع التلقائي' : 'Auto-cut failed', 'error');
    } finally {
      setIsAutoCutting(false);
    }
  };

  const handleAddAllFilesAsSegments = useCallback(() => {
    project.files.forEach(f => {
      // Avoid duplicates if same file already covers whole duration? 
      // User likely wants to just dump everything.
      project.addSegment(0, f.duration, f.id);
    });
    showToast(isRtl ? 'تم إضافة جميع الملفات كمقاطع' : 'All files added as segments', 'success');
  }, [project, isRtl, showToast]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Head>
        <title>{isRtl ? 'محرر الفيديو الاحترافي - VideoCutter Pro' : 'Professional Video Editor - VideoCutter Pro'}</title>
        <meta name="description" content={isRtl ? 'قص ودمج الفيديوهات باحترافية في متصفحك.' : 'Edit and merge your videos professionally in your browser.'} />
      </Head>
      <Header
        user={auth.user}
        isAuthLoading={false}
        onLoginClick={() => (window.location.href = route('login'))}
        onLogout={() => { }}
        onUndo={project.undo}
        onRedo={project.redo}
        canUndo={project.canUndo}
        canRedo={project.canRedo}
        onExportClick={() => setActiveTab('export')}
      />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 xl:overflow-hidden min-h-[calc(100vh-56px)] xl:h-[calc(100vh-56px)] flex flex-col">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 flex-1 xl:overflow-hidden">

          {/* LEFT: MAIN WORKSPACE (Video + Timeline) */}
          <div className="flex flex-col gap-5 min-w-0 xl:overflow-y-auto hide-scrollbar xl:pb-10" style={isRtl ? { paddingLeft: '0.5rem', paddingRight: 0 } : {}}>
            <VideoPlayer
              key={project.activeFileId || 'empty'}
              file={activeFile}
              videoRef={videoRef}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              isMuted={isMuted}
              segments={project.segments.filter(s => s.fileId === project.activeFileId)}
              mode={project.mode}
              videoSpeed={project.videoSpeed}
              audioBoost={project.audioBoost}
              aspectRatio={project.aspectRatio}
              showSafeZones={project.showSafeZones}
              backgroundMusic={project.backgroundMusic}
              bgMusicVolume={project.bgMusicVolume}
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
              onImportUrl={() => setShowUrlImport(true)}
            />
            <Timeline
              segments={project.segments}
              files={project.files}
              duration={duration}
              currentTime={currentTime}
              activeFileId={project.activeFileId}
              onSeek={seek}
              onUpdateSegment={project.updateSegment}
              disabled={ffmpeg.isProcessing}
            />
          </div>

          {/* RIGHT: TABBED SIDEBAR */}
          <div className="flex flex-col bg-bg-card/40 backdrop-blur-sm border border-bg-border rounded-2xl overflow-hidden xl:h-full shadow-2xl w-full xl:w-[420px]" style={{ minHeight: '600px' }}>
            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center overflow-x-auto hide-scrollbar border-b border-bg-border bg-bg-elevated/40 p-1.5 gap-1">
              {[
                { id: 'media', icon: Film, label: isRtl ? 'الوسائط' : 'Media' },
                { id: 'cut', icon: Scissors, label: isRtl ? 'المقاطع' : 'Cut' },
                { id: 'effects', icon: Sparkles, label: isRtl ? 'المؤثرات' : 'Effects' },
                { id: 'text', icon: Type, label: isRtl ? 'النصوص' : 'Text' },
                { id: 'audio', icon: Mic, label: isRtl ? 'الصوت' : 'Audio' },
                { id: 'export', icon: Download, label: isRtl ? 'التصدير' : 'Export' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    'flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-bg-primary shadow-sm text-text-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-primary/50'
                  )}
                >
                  <tab.icon className={clsx("w-4 h-4", activeTab === tab.id && "text-accent-light")} />
                  <span className="text-[9px] font-bold">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
              {activeTab === 'media' && (
                  <FileManager
                    files={project.files}
                    activeFileId={project.activeFileId}
                    onFileSelect={project.setActiveFileId}
                    onFileRemove={project.removeFile}
                    onAddMore={handleAddMore}
                    onAddAllAsSegments={handleAddAllFilesAsSegments}
                    onImportUrl={() => setShowUrlImport(true)}
                    disabled={ffmpeg.isProcessing}
                  />
              )}

              {activeTab === 'cut' && (
                <>
                  <ModeSelector mode={project.mode} onChange={project.setMode} compact disabled={ffmpeg.isProcessing} />
                  <SegmentList
                    segments={project.segments}
                    files={project.files}
                    activeFileId={project.activeFileId}
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
                    onSwitchToFile={(fid, time) => {
                      project.setActiveFileId(fid)
                      if (time !== undefined) setTimeout(() => seek(time), 100)
                    }}
                    onImportOpen={() => setShowImport(true)}
                    onSetSegments={project.setSegmentsAll}
                    onAutoCut={handleAutoCut}
                    isAutoCutting={isAutoCutting}
                    videoSpeed={project.videoSpeed}
                    disabled={ffmpeg.isProcessing}
                    analysisMap={videoAnalysis.analysisMap}
                    isBatchAnalyzing={videoAnalysis.isBatchAnalyzing}
                    onAnalyzeSegment={(segId) => {
                      if (!videoRef.current) return;
                      const seg = project.segments.find(s => s.id === segId);
                      if (seg) videoAnalysis.analyzeOne(videoRef.current, seg);
                    }}
                    onAnalyzeAll={() => {
                      if (!videoRef.current) return;
                      videoAnalysis.analyzeAll(videoRef.current, project.segments);
                    }}
                    onClearAnalysis={videoAnalysis.clearSegmentAnalysis}
                  />
                </>
              )}

              {activeTab === 'effects' && (
                <>
                  <TemplateGallery
                    onApply={applyTemplate}
                    disabled={ffmpeg.isProcessing}
                  />
                  <EffectsSelector
                    aspectRatio={project.aspectRatio}
                    transition={project.transition}
                    videoSpeed={project.videoSpeed}
                    audioBoost={project.audioBoost}
                    visualFilter={project.visualFilter}
                    noiseReduction={project.noiseReduction}
                    backgroundMusic={project.backgroundMusic}
                    bgMusicVolume={project.bgMusicVolume}
                    audioPreset={project.audioPreset}
                    showSafeZones={project.showSafeZones}
                    onRatioChange={project.setAspectRatio}
                    onTransitionChange={project.setTransition}
                    onSpeedChange={project.setVideoSpeed}
                    onBoostChange={project.setAudioBoost}
                    onFilterChange={project.setVisualFilter}
                    onNoiseReductionChange={project.setNoiseReduction}
                    onBgmChange={project.setBackgroundMusic}
                    onBgmVolumeChange={project.setBgMusicVolume}
                    onAudioPresetChange={project.setAudioPreset}
                    onSafeZonesToggle={project.setShowSafeZones}
                    vocalIsolation={project.vocalIsolation}
                    onVocalIsolationChange={project.setVocalIsolation}
                    disabled={ffmpeg.isProcessing}
                    files={project.files}
                  />
                </>
              )}

              {activeTab === 'text' && (
                <OverlayManager
                  overlays={project.overlays}
                  duration={duration}
                  onAdd={project.addOverlay}
                  onUpdate={project.updateOverlay}
                  onRemove={project.removeOverlay}
                  disabled={ffmpeg.isProcessing}
                />
              )}

              {activeTab === 'audio' && (
                <>
                  <VoiceOverRecorder
                    onAddFile={project.addFile}
                    disabled={ffmpeg.isProcessing}
                  />

                  {/* Transcription & Cloud Options */}
                  <div className="card flex flex-col gap-4">
                    <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest">
                      {isRtl ? 'إعدادات إضافية' : 'Extra Settings'}
                    </h3>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={includeSubtitles}
                          onChange={e => setIncludeSubtitles(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-10 h-5 bg-bg-border rounded-full peer-checked:bg-accent transition-colors" />
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                      </div>
                      <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                        {isRtl ? 'توليد ملفات ترجمة (SRT)' : 'Generate Subtitles (SRT)'}
                      </span>
                    </label>
                    {/* Show Project Audio Files in Audio Tab too */}
                    {project.files.filter(f => f.file.type.startsWith('audio/') || f.name.endsWith('.webm')).length > 0 && (
                      <div className="flex flex-col gap-2 p-3 bg-bg-elevated/50 rounded-2xl border border-bg-border">
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">{isRtl ? 'تسجيلاتك الجاهزة:' : 'Your recordings:'}</p>
                        <div className="flex flex-col gap-1.5">
                          {project.files.filter(f => f.file.type.startsWith('audio/') || f.name.endsWith('.webm')).map(f => (
                            <button
                              key={f.id}
                              onClick={() => {
                                project.setBackgroundMusic(f.file);
                                setActiveTab('effects');
                                showToast(isRtl ? 'تم ضبط التسجيل كموسيقى خلفية' : 'Recording set as background music', 'success');
                              }}
                              className="flex items-center gap-2 p-2 bg-bg-primary hover:bg-accent/10 border border-bg-border hover:border-accent/30 rounded-xl transition-all text-left group"
                            >
                              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                                <Mic className="w-3 h-3 text-accent" />
                              </div>
                              <span className="text-xs text-text-secondary group-hover:text-accent truncate flex-1">{f.name}</span>
                              <div className="text-[9px] bg-bg-elevated px-1.5 py-0.5 rounded-md text-text-muted group-hover:text-accent">
                                {isRtl ? 'استخدم' : 'Use'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {driveConnected && (
                      <div className="flex items-center justify-between p-2 bg-accent/5 rounded-xl border border-accent/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] text-text-secondary font-medium">
                            {isRtl ? 'جوجل درايف متصل' : 'Google Drive Linked'}
                          </span>
                        </div>
                        <button 
                          onClick={() => disconnectDrive()}
                          className="text-[9px] text-accent hover:underline font-bold"
                        >
                          {isRtl ? 'فصل الحساب' : 'Disconnect'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={driveLoading}
                        onClick={async () => {
                          setDriveLoading(true);
                          try {
                            // Ensure libs are loaded first
                            await initGoogleDrive();
                            const file = await pickFileFromDrive();
                            if (file) handleFileLoad(file, 0);
                          } catch (e: any) {
                            console.error('Drive import error', e);
                            const msg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
                            alert((isRtl ? 'فشل الاستيراد: ' : 'Import failed: ') + msg);
                          } finally {
                            setDriveLoading(false);
                          }
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-3 bg-bg-elevated hover:bg-bg-border rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                      >
                        <span className="text-blue-500">{driveLoading ? '⌛' : 'G'}</span> 
                        {driveLoading ? (isRtl ? 'جاري...' : 'Loading...') : (isRtl ? 'استيراد' : 'Import')}
                      </button>
                      <button
                        disabled={driveLoading || project.files.length === 0}
                        onClick={async () => {
                          if (project.files.length === 0) return;
                          setDriveLoading(true);
                          try {
                            const activeFileObj = project.files.find(f => f.id === project.activeFileId);
                            if (activeFileObj) {
                               const success = await saveFileToDrive(activeFileObj.file);
                               if (success) alert(isRtl ? 'تم الحفظ بنجاح!' : 'Saved successfully!');
                            }
                          } catch (e: any) {
                            console.error('Drive save error', e);
                            const msg = e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
                            alert((isRtl ? 'فشل الحفظ: ' : 'Save failed: ') + msg);
                          } finally {
                            setDriveLoading(false);
                          }
                        }}
                        className="flex items-center justify-center gap-2 py-2 px-3 bg-bg-elevated hover:bg-bg-border rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                      >
                        <span className="text-green-500">{driveLoading ? '⌛' : '☁️'}</span>
                        {driveLoading ? (isRtl ? 'جاري...' : 'Loading...') : (isRtl ? 'حفظ' : 'Save')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'export' && (
                <>
                  <ExportSettings
                    resolution={project.exportResolution}
                    format={project.exportFormat}
                    bitrate={project.exportBitrate}
                    activeEffects={project.activeEffects}
                    onResolutionChange={project.setExportResolution}
                    onFormatChange={project.setExportFormat}
                    onBitrateChange={project.setExportBitrate}
                    onResetEffects={project.resetAllEffects}
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
                    hasFile={project.files.length > 0}
                    onStart={handleStart}
                    onLoadFFmpeg={ffmpeg.loadFFmpeg}
                    lastExport={ffmpeg.lastExport}
                    onRedownload={ffmpeg.redownload}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="video/*"
          multiple
          onChange={handleFileChange}
        />
      </main>

      <SmartImportModal isOpen={showImport} duration={duration} onClose={() => setShowImport(false)} onImport={project.setSegmentsAll} />

      <UrlImportModal
        isOpen={showUrlImport}
        onClose={() => setShowUrlImport(false)}
        onVideoImported={(file, d) => {
          handleFileLoad(file, d);
          setActiveTab('cut');
        }}
      />

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
            <h2 className="text-2xl font-bold mb-2 text-text-primary">
              {isRtl ? 'نقدر رأيك!' : 'We value your feedback!'}
            </h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
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
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  {isRtl ? 'التقييم' : 'Rating'}
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <label key={num} className="flex-1 cursor-pointer">
                      <input type="radio" name="rating" value={num} required className="peer hidden" />
                      <div className="h-10 rounded-xl bg-bg-primary border border-bg-border flex items-center justify-center peer-checked:bg-accent peer-checked:text-white transition-all text-sm font-bold text-text-primary">
                        {num}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  {isRtl ? 'كيف سمعت عنا؟' : 'How did you hear about us?'}
                </label>
                <select name="source" className="w-full bg-bg-primary border border-bg-border rounded-xl px-4 py-2.5 text-sm focus:border-accent-light outline-none transition-all text-text-primary">
                  <option value="Google">Google</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  {isRtl ? 'اقتراح للتحسين' : 'Suggestion for improvement'}
                </label>
                <textarea
                  name="suggestion"
                  className="w-full bg-bg-primary border border-bg-border rounded-xl px-4 py-2.5 text-sm focus:border-accent-light outline-none transition-all resize-none h-24 text-text-primary"
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
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 items-end">
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={clsx(
              "rounded-xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2 max-w-xs transition-all duration-300 transform animate-fade-in",
              toast.persistent && "cursor-pointer hover:scale-105"
            )}
            style={{
              background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)'}`,
              color: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : 'var(--accent-light)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>{toast.message}</span>
            {toast.persistent && <button className="ml-2 text-current opacity-60 hover:opacity-100 font-bold transition-opacity">×</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { Mic, Square, Save, Trash2 } from 'lucide-react';
import { useLanguage } from '../../Hooks/useLanguage';
import { clsx } from 'clsx';

interface VoiceOverRecorderProps {
  onAddFile: (file: File, duration: number) => void;
  disabled?: boolean;
}

export function VoiceOverRecorder({ onAddFile, disabled }: VoiceOverRecorderProps) {
  const { isRtl } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert(isRtl ? 'فشل الوصول إلى الميكروفون' : 'Microphone access failed');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSave = () => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `voiceover_${Date.now()}.webm`, { type: 'audio/webm' });
    
    // Get duration
    const audio = new Audio(URL.createObjectURL(recordedBlob));
    audio.onloadedmetadata = () => {
      onAddFile(file, audio.duration);
      setRecordedBlob(null);
    };
  };

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2">
        <Mic className="w-3 h-3" />
        {isRtl ? 'تسجيل تعليق صوتي' : 'Voice Over'}
      </h3>

      <div className="flex items-center gap-3">
        {!recordedBlob ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all",
              isRecording ? "bg-red-500 animate-pulse text-white" : "bg-bg-elevated hover:bg-bg-border text-text-primary"
            )}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {isRecording 
                ? (isRtl ? 'توقف' : 'Stop') 
                : (isRtl ? 'بدء التسجيل' : 'Record Now')
              }
            </span>
          </button>
        ) : (
          <div className="flex-1 flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent-light text-white rounded-xl transition-all"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">{isRtl ? 'حفظ' : 'Save'}</span>
            </button>
            <button
              onClick={() => setRecordedBlob(null)}
              className="px-4 bg-bg-elevated hover:bg-bg-border text-mode-exclude rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      <p className="text-[10px] text-text-muted italic">
        {isRtl ? 'سيتم إضافة التسجيل كملف صوتي جديد في المشروع' : 'Recording will be added as a new audio file in project'}
      </p>
    </div>
  );
}

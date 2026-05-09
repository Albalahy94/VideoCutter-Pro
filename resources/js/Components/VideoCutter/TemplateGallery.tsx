import React from 'react';
import { Sparkles, Smartphone, Monitor, Square, Zap, Film, Mic2, Newspaper } from 'lucide-react';
import { useLanguage } from '../../Hooks/useLanguage';
import type { AspectRatio, VisualFilter, AudioPreset } from '../../types';
import { clsx } from 'clsx';

interface Template {
  id: string;
  nameEn: string;
  nameAr: string;
  icon: React.ElementType;
  settings: {
    aspectRatio: AspectRatio;
    visualFilter: VisualFilter;
    audioPreset: AudioPreset;
    noiseReduction: boolean;
    showSafeZones: boolean;
  };
}

const TEMPLATES: Template[] = [
  {
    id: 'shorts_viral',
    nameEn: 'Viral Shorts',
    nameAr: 'شورتس تريند',
    icon: Smartphone,
    settings: {
      aspectRatio: 'shorts',
      visualFilter: 'warm',
      audioPreset: 'podcast',
      noiseReduction: true,
      showSafeZones: true
    }
  },
  {
    id: 'cinematic_vlog',
    nameEn: 'Cinematic Vlog',
    nameAr: 'فلوج سينمائي',
    icon: Film,
    settings: {
      aspectRatio: 'youtube',
      visualFilter: 'vintage',
      audioPreset: 'cinema',
      noiseReduction: false,
      showSafeZones: false
    }
  },
  {
    id: 'quick_news',
    nameEn: 'Social News',
    nameAr: 'أخبار سريعة',
    icon: Newspaper,
    settings: {
      aspectRatio: 'square',
      visualFilter: 'cool',
      audioPreset: 'normal',
      noiseReduction: true,
      showSafeZones: true
    }
  },
  {
    id: 'pro_studio',
    nameEn: 'Pro Studio',
    nameAr: 'استوديو احترافي',
    icon: Mic2,
    settings: {
      aspectRatio: 'original',
      visualFilter: 'none',
      audioPreset: 'studio',
      noiseReduction: true,
      showSafeZones: false
    }
  }
];

interface TemplateGalleryProps {
  onApply: (settings: Template['settings']) => void;
  disabled?: boolean;
}

export function TemplateGallery({ onApply, disabled }: TemplateGalleryProps) {
  const { isRtl } = useLanguage();

  return (
    <div className="card flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2">
        <Sparkles className="w-3 h-3 text-accent" />
        {isRtl ? 'قوالب المونتاج السريع' : 'One-Click Templates'}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            disabled={disabled}
            onClick={() => onApply(t.settings)}
            className="group relative flex flex-col items-center gap-2 p-3 bg-bg-elevated border border-bg-border rounded-xl hover:border-accent/50 hover:bg-bg-border transition-all text-center"
          >
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
              <t.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-text-primary">
              {isRtl ? t.nameAr : t.nameEn}
            </span>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            </div>
          </button>
        ))}
      </div>
      
      <p className="text-[9px] text-text-muted italic text-center">
        {isRtl ? '* سيتم تطبيق كافة الإعدادات فوراً بضغطة واحدة' : '* Applies all settings instantly in one click'}
      </p>
    </div>
  );
}

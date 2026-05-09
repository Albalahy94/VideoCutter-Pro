import React, { useState } from 'react';
import { Type, Image as ImageIcon, Trash2, Plus, Clock, Move, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../Hooks/useLanguage';
import type { Overlay } from '../../types';
import { clsx } from 'clsx';
import { secondsToTime } from '../../Lib/time-utils';

interface OverlayManagerProps {
  overlays: Overlay[];
  duration: number;
  onAdd: (overlay: Omit<Overlay, 'id'>) => void;
  onUpdate: (id: string, changes: Partial<Overlay>) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const GOOGLE_FONTS = [
  { name: 'Inter', family: "'Inter', sans-serif" },
  { name: 'Cairo (Arabic)', family: "'Cairo', sans-serif" },
  { name: 'Almarai (Arabic)', family: "'Almarai', sans-serif" },
  { name: 'Amiri (Classic)', family: "'Amiri', serif" },
  { name: 'Roboto', family: "'Roboto', sans-serif" },
  { name: 'Oswald', family: "'Oswald', sans-serif" },
];

export function OverlayManager({
  overlays,
  duration,
  onAdd,
  onUpdate,
  onRemove,
  disabled
}: OverlayManagerProps) {
  const { isRtl } = useLanguage();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddText = () => {
    onAdd({
      type: 'text',
      content: isRtl ? 'نص جديد' : 'New Text',
      x: 100,
      y: 100,
      startTime: 0,
      endTime: Math.min(duration, 5),
      style: { color: '#ffffff', font: 'bold 60px Inter' }
    });
    setShowAddMenu(false);
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAdd({
      type: 'image',
      content: url,
      x: 50,
      y: 50,
      startTime: 0,
      endTime: duration
    });
    setShowAddMenu(false);
  };

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary flex items-center gap-2">
          <Type className="w-3 h-3" />
          {isRtl ? 'النصوص والشعارات' : 'Text & Stickers'}
        </h3>
        
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            disabled={disabled}
            className="btn-accent py-1 px-3 text-xs flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            {isRtl ? 'إضافة' : 'Add'}
          </button>

          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-bg-elevated border border-bg-border rounded-xl shadow-xl z-20 overflow-hidden">
              <button 
                onClick={handleAddText}
                className="w-full text-left px-4 py-2 text-xs hover:bg-bg-border flex items-center gap-2"
              >
                <Type className="w-3 h-3 text-accent" />
                {isRtl ? 'نص' : 'Text'}
              </button>
              <label className="w-full text-left px-4 py-2 text-xs hover:bg-bg-border flex items-center gap-2 cursor-pointer">
                <ImageIcon className="w-3 h-3 text-green-500" />
                {isRtl ? 'شعار / استيكر' : 'Sticker / Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {overlays.length === 0 && (
          <p className="text-[10px] text-text-muted italic text-center py-4">
            {isRtl ? 'لا يوجد نصوص مضافة بعد' : 'No overlays added yet'}
          </p>
        )}
        
        {overlays.map(ov => (
          <div key={ov.id} className="bg-bg-primary border border-bg-border rounded-xl p-3 space-y-3 transition-all hover:border-accent/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {ov.type === 'text' ? <Type className="w-3 h-3 text-accent" /> : <ImageIcon className="w-3 h-3 text-green-500" />}
                <span className="text-[10px] font-bold uppercase text-text-muted">{ov.type}</span>
              </div>
              <button 
                onClick={() => onRemove(ov.id)}
                className="text-mode-exclude hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {ov.type === 'text' ? (
              <input 
                type="text" 
                value={ov.content}
                onChange={e => onUpdate(ov.id, { content: e.target.value })}
                className="w-full bg-bg-elevated border-none rounded-lg text-xs p-2 focus:ring-1 focus:ring-accent"
              />
            ) : (
              <div className="flex items-center gap-2">
                <img src={ov.content} className="w-8 h-8 rounded border border-bg-border object-contain bg-black" />
                <span className="text-[10px] text-text-muted truncate">Image Overlay</span>
              </div>
            )}

            {ov.type === 'text' && (
              <div className="space-y-1">
                <label className="text-[9px] text-text-muted">Font Family</label>
                <div className="relative">
                  <select
                    value={ov.fontFamily || "'Inter', sans-serif"}
                    onChange={e => {
                        const font = e.target.value;
                        onUpdate(ov.id, { fontFamily: font });
                        // Dynamically load font
                        const link = document.createElement('link');
                        link.href = `https://fonts.googleapis.com/css2?family=${font.split("'")[1].replace(' ', '+')}&display=swap`;
                        link.rel = 'stylesheet';
                        document.head.appendChild(link);
                    }}
                    className="w-full bg-bg-elevated border-none rounded-lg text-[10px] p-2 appearance-none"
                  >
                    {GOOGLE_FONTS.map(f => (
                      <option key={f.name} value={f.family}>{f.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-text-muted pointer-events-none" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] text-text-muted">Animation</label>
              <div className="relative">
                <select
                  value={ov.animation || 'none'}
                  onChange={e => onUpdate(ov.id, { animation: e.target.value as any })}
                  className="w-full bg-bg-elevated border-none rounded-lg text-[10px] p-2 appearance-none"
                >
                  <option value="none">None</option>
                  <option value="fade">Smooth Fade</option>
                  <option value="slide-up">Slide Up</option>
                  <option value="zoom">Zoom</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-text-muted pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] text-text-muted flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {isRtl ? 'وقت الظهور' : 'Start Time'}
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={ov.startTime}
                  onChange={e => onUpdate(ov.id, { startTime: parseFloat(e.target.value) })}
                  className="w-full bg-bg-elevated border-none rounded-lg text-[10px] p-1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-text-muted flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {isRtl ? 'وقت الاختفاء' : 'End Time'}
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={ov.endTime}
                  onChange={e => onUpdate(ov.id, { endTime: parseFloat(e.target.value) })}
                  className="w-full bg-bg-elevated border-none rounded-lg text-[10px] p-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] text-text-muted flex items-center gap-1">
                  <Move className="w-2.5 h-2.5" /> X Position
                </label>
                <input 
                  type="number" 
                  value={ov.x}
                  onChange={e => onUpdate(ov.id, { x: parseInt(e.target.value) })}
                  className="w-full bg-bg-elevated border-none rounded-lg text-[10px] p-1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-text-muted flex items-center gap-1">
                  <Move className="w-2.5 h-2.5" /> Y Position
                </label>
                <input 
                  type="number" 
                  value={ov.y}
                  onChange={e => onUpdate(ov.id, { y: parseInt(e.target.value) })}
                  className="w-full bg-bg-elevated border-none rounded-lg text-[10px] p-1.5"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

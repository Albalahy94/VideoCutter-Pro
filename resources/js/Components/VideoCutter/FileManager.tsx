import { Film, Trash2, GripVertical, Plus, CheckCircle, LayoutGrid, ListPlus } from 'lucide-react'
import { ProjectFile } from '../../types'
import { clsx } from 'clsx'
import { useLanguage } from '../../Hooks/useLanguage'
import { secondsToTime } from '../../Lib/time-utils'

interface FileManagerProps {
  files: ProjectFile[]
  activeFileId: string | null
  onFileSelect: (id: string) => void
  onFileRemove: (id: string) => void
  onAddMore: () => void
  onAddAllAsSegments?: () => void
  disabled?: boolean
}

export function FileManager({
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddMore,
  onAddAllAsSegments,
  disabled
}: FileManagerProps) {
  const { isRtl } = useLanguage()

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
           <LayoutGrid className="w-4 h-4 text-accent" />
           {isRtl ? 'قائمة الفيديوهات' : 'Video Playlist'}
        </h3>
        <div className="flex items-center gap-2">
          {files.length > 0 && onAddAllAsSegments && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddAllAsSegments(); }}
              disabled={disabled}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all text-[10px] font-bold"
              title={isRtl ? 'إضافة الكل كمقاطع' : 'Add all as segments'}
            >
              <ListPlus className="w-3.5 h-3.5" />
              {isRtl ? 'إضافة الكل' : 'Add All'}
            </button>
          )}
          <button
            onClick={onAddMore}
            disabled={disabled}
            className="p-1.5 rounded-lg bg-bg-elevated border border-bg-border text-text-secondary hover:text-accent hover:border-accent/40 transition-all shadow-sm"
            title={isRtl ? 'إضافة فيديو جديد' : 'Add new video'}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {files.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-text-muted border-2 border-dashed border-bg-border rounded-xl">
            <Plus className="w-8 h-8 opacity-20" />
            <p className="text-xs">{isRtl ? 'لا توجد فيديوهات بعد' : 'No videos added'}</p>
          </div>
        ) : (
          files.map((item, index) => {
            const isActive = activeFileId === item.id
            return (
              <div
                key={item.id}
                onClick={() => onFileSelect(item.id)}
                className={clsx(
                  'group flex items-center gap-5 p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer relative overflow-hidden shadow-md min-h-[90px]',
                  isActive 
                    ? 'border-accent bg-accent/15 shadow-xl shadow-accent/20 ring-2 ring-accent/30 scale-[1.02] z-10' 
                    : 'border-bg-border bg-bg-elevated hover:border-accent/30 hover:bg-bg-elevated/80'
                )}
              >
                {/* Active Accent Bar */}
                <div className={clsx(
                  "absolute top-0 bottom-0 left-0 w-2 transition-all",
                  isActive ? "bg-accent shadow-[4px_0_15px_rgba(124,58,237,0.6)]" : "bg-bg-border group-hover:bg-accent/40"
                )} />

                <div className={clsx(
                  "shrink-0 w-14 h-14 rounded-2xl border-2 flex items-center justify-center relative transition-all duration-300 shadow-sm",
                  isActive ? "bg-accent/25 border-accent/50 rotate-3 scale-110" : "bg-bg-primary border-bg-border group-hover:border-accent/30"
                )}>
                   <Film className={clsx("w-7 h-7 transition-colors", isActive ? "text-accent" : "text-text-muted group-hover:text-accent/60")} />
                   {isActive && (
                     <div className="absolute -top-2 -right-2 animate-bounce-slow">
                       <CheckCircle className="w-6 h-6 text-accent fill-white shadow-lg" />
                     </div>
                   )}
                </div>

                <div className="flex-1 min-w-0">
                  <p 
                    className={clsx(
                      "text-base font-black truncate transition-colors",
                      isActive ? "text-accent" : "text-text-secondary group-hover:text-text-primary"
                    )}
                  >
                    {item.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5 bg-bg-primary/60 px-2 py-1 rounded-lg border border-bg-border/50 shadow-inner">
                      <span className="text-xs font-black font-mono text-accent">
                        {secondsToTime(item.duration)}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted font-black uppercase tracking-widest bg-bg-primary/40 px-2 py-0.5 rounded-md border border-bg-border/20">
                      {item.file.type.split('/')[1] || 'video'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onFileRemove(item.id)
                    }}
                    disabled={disabled}
                    className="p-2.5 rounded-2xl bg-rose-500/5 hover:bg-rose-500/20 text-rose-500/60 hover:text-rose-600 border border-rose-500/10 transition-all active:scale-90 shadow-sm"
                    title={isRtl ? 'حذف' : 'Remove'}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="cursor-grab p-2 text-text-muted hover:text-accent transition-colors bg-bg-primary/40 rounded-xl border border-bg-border/30">
                    <GripVertical className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {files.length > 0 && (
        <p className="text-[10px] text-text-muted text-center italic">
          {isRtl ? 'بإمكانك دمج أي عدد من الفيديوهات وسيتم دمجها حسب الترتيب أعلاه' : 'You can merge any number of videos in the order shown above'}
        </p>
      )}
    </div>
  )
}

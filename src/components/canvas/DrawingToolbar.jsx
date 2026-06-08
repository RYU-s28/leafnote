import React from 'react';
import { Pen, Highlighter, Eraser, Undo2, Redo2, Type, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

const PEN_COLORS = [
  '#1D1D1F', '#007AFF', '#FF3B30', '#34C759', '#FF9500',
  '#5856D6', '#AF52DE', '#8E8E93', '#5AC8FA', '#FF6B6B',
];

export default function DrawingToolbar({
  activeTool,
  setActiveTool,
  penColor,
  setPenColor,
  penSize,
  setPenSize,
  highlighterColor,
  setHighlighterColor,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  return (
    <div className="flex items-center justify-center gap-1 px-3 py-2 bg-card/90 backdrop-blur-xl border border-border rounded-2xl shadow-lg">
      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Pen */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            onClick={() => setActiveTool('pen')}
            className={cn(
              "p-2 rounded-lg transition-all relative",
              activeTool === 'pen' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
          >
            <Pen className="w-4 h-4" />
            <div
              className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full"
              style={{ background: penColor }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" side="top">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Color</p>
              <div className="flex flex-wrap gap-1.5">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setPenColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      penColor === c ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'hover:scale-110'
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Size</p>
              <div className="flex items-center gap-2">
                <Minus className="w-3 h-3 text-muted-foreground" />
                <Slider
                  value={[penSize]}
                  onValueChange={([v]) => setPenSize(v)}
                  min={1}
                  max={12}
                  step={0.5}
                  className="flex-1"
                />
                <Plus className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlighter */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            onClick={() => setActiveTool('highlighter')}
            className={cn(
              "p-2 rounded-lg transition-all relative",
              activeTool === 'highlighter' ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-muted'
            )}
          >
            <Highlighter className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" side="top">
          <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Highlight Color</p>
          <div className="flex gap-1.5">
            {['#FFFF00', '#00FF00', '#FF69B4', '#87CEEB', '#FFA500'].map((c) => (
              <button
                key={c}
                onClick={() => setHighlighterColor(c)}
                className={cn(
                  "w-7 h-7 rounded-full transition-all",
                  highlighterColor === c ? 'ring-2 ring-primary ring-offset-1' : 'hover:scale-110'
                )}
                style={{ background: c, opacity: 0.5 }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Eraser */}
      <button
        onClick={() => setActiveTool('eraser')}
        className={cn(
          "p-2 rounded-lg transition-all",
          activeTool === 'eraser' ? 'bg-destructive/10 text-destructive' : 'hover:bg-muted'
        )}
      >
        <Eraser className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Text */}
      <button
        onClick={() => setActiveTool('text')}
        className={cn(
          "p-2 rounded-lg transition-all",
          activeTool === 'text' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
        )}
      >
        <Type className="w-4 h-4" />
      </button>
    </div>
  );
}
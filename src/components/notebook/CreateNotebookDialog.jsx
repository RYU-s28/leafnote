import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NotebookCover from './NotebookCover';

const COLORS = [
  { name: 'Blue', hex: '#007AFF' },
  { name: 'Purple', hex: '#5856D6' },
  { name: 'Teal', hex: '#5AC8FA' },
  { name: 'Green', hex: '#34C759' },
  { name: 'Sage', hex: '#8B9F82' },
  { name: 'Clay', hex: '#C67F5E' },
  { name: 'Rose', hex: '#E8919A' },
  { name: 'Charcoal', hex: '#3A3A3C' },
  { name: 'Navy', hex: '#1C2541' },
  { name: 'Warm Gray', hex: '#8E8E93' },
];

const GRADIENTS = [
  { c1: '#007AFF', c2: '#5856D6' },
  { c1: '#5AC8FA', c2: '#34C759' },
  { c1: '#FF6B6B', c2: '#FFB347' },
  { c1: '#1C2541', c2: '#3A506B' },
  { c1: '#8B9F82', c2: '#C8D5B9' },
  { c1: '#C67F5E', c2: '#E8C1A0' },
];

const ICONS = ['📓', '💻', '🌍', '📐', '🎨', '📊', '🔬', '📖', '✏️', '🎯', '💡', '🗂️'];

export default function CreateNotebookDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    subject: '',
    cover_type: 'solid',
    cover_color1: '#007AFF',
    cover_color2: '#5856D6',
    cover_pattern: 'none',
    cover_icon: '📓',
    default_template: 'blank',
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave(form);
    setForm({
      title: '',
      subject: '',
      cover_type: 'solid',
      cover_color1: '#007AFF',
      cover_color2: '#5856D6',
      cover_pattern: 'none',
      cover_icon: '📓',
      default_template: 'blank',
    });
  };

  const preview = { ...form };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">New Notebook</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Preview */}
          <div className="flex justify-center py-4 bg-muted/50 rounded-xl">
            <NotebookCover notebook={preview} size="lg" />
          </div>

          {/* Title & Subject */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="My Notebook"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Optional"
                className="h-9"
              />
            </div>
          </div>

          {/* Cover Type */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Cover Style</Label>
            <div className="flex gap-2">
              {['solid', 'gradient'].map((type) => (
                <button
                  key={type}
                  onClick={() => setForm({ ...form, cover_type: type })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.cover_type === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              {form.cover_type === 'gradient' ? 'Gradient' : 'Color'}
            </Label>
            {form.cover_type === 'solid' ? (
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setForm({ ...form, cover_color1: c.hex })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.cover_color1 === c.hex ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-110'
                    }`}
                    style={{ background: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {GRADIENTS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setForm({ ...form, cover_color1: g.c1, cover_color2: g.c2 })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.cover_color1 === g.c1 && form.cover_color2 === g.c2
                        ? 'ring-2 ring-primary ring-offset-2'
                        : 'hover:scale-110'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${g.c1}, ${g.c2})` }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pattern */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Pattern</Label>
            <div className="flex gap-2">
              {['none', 'grid', 'dots', 'lines', 'waves'].map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, cover_pattern: p })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    form.cover_pattern === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setForm({ ...form, cover_icon: icon })}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                    form.cover_icon === icon
                      ? 'bg-primary/10 ring-2 ring-primary/30'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Default Template */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Default Page Template</Label>
            <Select value={form.default_template} onValueChange={(v) => setForm({ ...form, default_template: v })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank</SelectItem>
                <SelectItem value="lined">Lined</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-sm">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()} className="text-sm">
              Create Notebook
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
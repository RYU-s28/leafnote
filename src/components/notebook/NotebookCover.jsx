import React from 'react';
import { cn } from '@/lib/utils';

const patterns = {
  none: '',
  grid: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(255,255,255,0.08) 19px, rgba(255,255,255,0.08) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(255,255,255,0.08) 19px, rgba(255,255,255,0.08) 20px)',
  dots: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
  lines: 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,255,255,0.08) 15px, rgba(255,255,255,0.08) 16px)',
  waves: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)',
};

export default function NotebookCover({ notebook, size = 'md', className }) {
  const { cover_type, cover_color1, cover_color2, cover_pattern, cover_icon, title, subject } = notebook;

  const color1 = cover_color1 || '#007AFF';
  const color2 = cover_color2 || '#5856D6';
  const pattern = cover_pattern || 'none';

  const bgStyle = cover_type === 'gradient'
    ? { background: `linear-gradient(135deg, ${color1}, ${color2})` }
    : { background: color1 };

  const patternStyle = patterns[pattern]
    ? { backgroundImage: patterns[pattern], backgroundSize: pattern === 'dots' ? '20px 20px' : undefined }
    : {};

  const sizes = {
    sm: 'w-20 h-28',
    md: 'w-40 h-56',
    lg: 'w-52 h-72',
  };

  return (
    <div
      className={cn(
        sizes[size],
        "rounded-xl shadow-md relative overflow-hidden flex flex-col items-center justify-center transition-all duration-300",
        className
      )}
      style={bgStyle}
    >
      {/* Pattern overlay */}
      <div className="absolute inset-0" style={patternStyle} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-3">
        {cover_icon && (
          <span className={cn(
            "mb-2 drop-shadow-sm",
            size === 'sm' ? 'text-xl' : size === 'md' ? 'text-3xl' : 'text-4xl'
          )}>
            {cover_icon}
          </span>
        )}
        <h3 className={cn(
          "font-semibold text-white drop-shadow-sm leading-tight",
          size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          {title}
        </h3>
        {subject && size !== 'sm' && (
          <p className="text-white/70 text-[10px] mt-1 tracking-wide uppercase">
            {subject}
          </p>
        )}
      </div>

      {/* Spine effect */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/10" />
    </div>
  );
}
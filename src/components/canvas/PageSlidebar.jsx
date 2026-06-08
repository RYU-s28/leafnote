import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function PageSidebar({ pages, currentPageId, onSelectPage, onAddPage, onDeletePage }) {
  return (
    <div className="w-48 h-full bg-card border-r border-border flex flex-col shrink-0">
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pages</span>
        <button
          onClick={onAddPage}
          className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        <AnimatePresence>
          {pages.map((page, index) => (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <button
                onClick={() => onSelectPage(page.id)}
                className={cn(
                  "w-full text-left group relative",
                  "rounded-lg transition-all duration-200 overflow-hidden"
                )}
              >
                {/* Thumbnail */}
                <div
                  className={cn(
                    "w-full aspect-[3/4] rounded-lg border-2 transition-all bg-white flex items-center justify-center",
                    currentPageId === page.id
                      ? 'border-primary shadow-sm'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <span className="text-[10px] text-muted-foreground">
                    {page.title || `Page ${index + 1}`}
                  </span>
                </div>

                {/* Delete button */}
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page.id);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}

                <p className="text-[10px] text-muted-foreground mt-1 text-center truncate px-1">
                  {index + 1}
                </p>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
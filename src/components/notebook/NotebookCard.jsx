import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Star, Trash2, RotateCcw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import NotebookCover from './NotebookCover';
import { motion } from 'framer-motion';

export default function NotebookCard({ notebook, onToggleFavorite, onTrash, onRestore, onDelete }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="group flex flex-col items-center cursor-pointer"
      onClick={() => navigate(`/notebook/${notebook.id}`)}
    >
      <div className="relative">
        <NotebookCover notebook={notebook} size="md" className="group-hover:shadow-xl" />

        {/* Favorite badge */}
        {notebook.is_favorite && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          </div>
        )}

        {/* Menu */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white">
                <MoreHorizontal className="w-3 h-3 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {!notebook.is_trashed ? (
                <>
                  <DropdownMenuItem onClick={() => onToggleFavorite(notebook)}>
                    <Star className="w-3.5 h-3.5 mr-2" />
                    {notebook.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTrash(notebook)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Move to Trash
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onRestore(notebook)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(notebook)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete Forever
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 text-center w-40">
        <h3 className="text-sm font-medium text-foreground truncate">{notebook.title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {notebook.page_count || 0} pages · {format(new Date(notebook.updated_date || notebook.created_date), 'MMM d')}
        </p>
      </div>
    </motion.div>
  );
}
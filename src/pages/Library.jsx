import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppSidebar from '@/components/layout/AppSidebar';
import NotebookCard from '@/components/notebook/NotebookCard';
import CreateNotebookDialog from '@/components/notebook/CreateNotebookDialog';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Plus } from 'lucide-react';

export default function Library() {
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const queryClient = useQueryClient();

  const { data: notebooks = [], isLoading } = useQuery({
    queryKey: ['notebooks'],
    queryFn: () => base44.entities.Notebook.list('-updated_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Notebook.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notebook.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notebooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notebook.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notebooks'] }),
  });

  const filteredNotebooks = notebooks.filter((nb) => {
    if (filter === 'all') return !nb.is_trashed;
    if (filter === 'favorites') return nb.is_favorite && !nb.is_trashed;
    if (filter === 'recent') return !nb.is_trashed;
    if (filter === 'trash') return nb.is_trashed;
    return true;
  });

  const filterLabels = {
    all: 'All Notes',
    favorites: 'Favorites',
    recent: 'Recent',
    trash: 'Trash',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar
          currentFilter={filter}
          onFilterChange={setFilter}
          onCreateNew={() => setShowCreate(true)}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="px-6 md:px-10 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{filterLabels[filter]}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filteredNotebooks.length} notebook{filteredNotebooks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        {/* Notebook Grid */}
        <div className="px-6 md:px-10 py-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col items-center animate-pulse">
                  <div className="w-40 h-56 rounded-xl bg-muted" />
                  <div className="w-24 h-3 bg-muted rounded mt-3" />
                  <div className="w-16 h-2 bg-muted rounded mt-2" />
                </div>
              ))}
            </div>
          ) : filteredNotebooks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                {filter === 'trash' ? 'Trash is empty' : 'No notebooks yet'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === 'trash' ? 'Deleted notebooks will appear here' : 'Create your first notebook to get started'}
              </p>
              {filter !== 'trash' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Create Notebook
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              <AnimatePresence>
                {filteredNotebooks.map((nb) => (
                  <NotebookCard
                    key={nb.id}
                    notebook={nb}
                    onToggleFavorite={(nb) =>
                      updateMutation.mutate({ id: nb.id, data: { is_favorite: !nb.is_favorite } })
                    }
                    onTrash={(nb) =>
                      updateMutation.mutate({ id: nb.id, data: { is_trashed: true } })
                    }
                    onRestore={(nb) =>
                      updateMutation.mutate({ id: nb.id, data: { is_trashed: false } })
                    }
                    onDelete={(nb) => deleteMutation.mutate(nb.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <CreateNotebookDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}
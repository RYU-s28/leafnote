import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageSidebar from '@/components/canvas/PageSidebar';
import DrawingCanvas from '@/components/canvas/DrawingCanvas';
import DrawingToolbar from '@/components/canvas/DrawingToolbar';
import PageTemplateBackground from '@/components/canvas/PageTemplateBackground';
import { ArrowLeft, Menu, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

const CANVAS_W = 1200;
const CANVAS_H = 1600;

export default function NotebookView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [showPageSidebar, setShowPageSidebar] = useState(true);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');

  // Drawing state
  const [activeTool, setActiveTool] = useState('pen');
  const [penColor, setPenColor] = useState('#1D1D1F');
  const [penSize, setPenSize] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState('#FFFF00');

  // Stroke history for undo/redo
  const [strokes, setStrokes] = useState([]);
  const [undoStack, setUndoStack] = useState([]);

  // Load notebook
  const { data: notebook, isLoading: loadingNotebook } = useQuery({
    queryKey: ['notebook', id],
    queryFn: async () => {
      const list = await base44.entities.Notebook.filter({ id });
      return list[0];
    },
  });

  // Load pages
  const { data: pages = [], isLoading: loadingPages } = useQuery({
    queryKey: ['pages', id],
    queryFn: () => base44.entities.Page.filter({ notebook_id: id }, 'page_order'),
  });

  // Auto select first page
  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId]);

  // Load strokes when page changes
  useEffect(() => {
    if (!currentPageId) return;
    const page = pages.find((p) => p.id === currentPageId);
    if (page && page.strokes_data) {
      try {
        setStrokes(JSON.parse(page.strokes_data));
      } catch {
        setStrokes([]);
      }
    } else {
      setStrokes([]);
    }
    setUndoStack([]);
  }, [currentPageId, pages]);

  // Debounced save
  const saveStrokes = useCallback(
    debounce(async (pageId, strokesData) => {
      setSaveStatus('saving');
      await base44.entities.Page.update(pageId, {
        strokes_data: JSON.stringify(strokesData),
      });
      setSaveStatus('saved');
    }, 800),
    []
  );

  // Mutations
  const addPageMutation = useMutation({
    mutationFn: async () => {
      const template = notebook?.default_template || 'blank';
      const page = await base44.entities.Page.create({
        notebook_id: id,
        title: `Page ${pages.length + 1}`,
        page_order: pages.length,
        template,
        strokes_data: '[]',
        text_boxes_data: '[]',
      });
      // Update page count
      await base44.entities.Notebook.update(id, { page_count: pages.length + 1 });
      return page;
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ['pages', id] });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      setCurrentPageId(page.id);
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId) => {
      await base44.entities.Page.delete(pageId);
      await base44.entities.Notebook.update(id, { page_count: Math.max(0, pages.length - 1) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', id] });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      if (pages.length > 1) {
        const remaining = pages.filter((p) => p.id !== currentPageId);
        setCurrentPageId(remaining[0]?.id || null);
      }
    },
  });

  // Create initial page if none exist
  useEffect(() => {
    if (!loadingPages && pages.length === 0 && notebook) {
      addPageMutation.mutate();
    }
  }, [loadingPages, pages.length, notebook]);

  // Handle stroke complete
  const handleStrokeComplete = useCallback((stroke) => {
    setStrokes((prev) => {
      const next = [...prev, stroke];
      if (currentPageId) saveStrokes(currentPageId, next);
      return next;
    });
    setUndoStack([]);
  }, [currentPageId, saveStrokes]);

  // Handle erase
  const handleEraseStroke = useCallback((index) => {
    setStrokes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (currentPageId) saveStrokes(currentPageId, next);
      return next;
    });
  }, [currentPageId, saveStrokes]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setUndoStack((u) => [...u, last]);
      const next = prev.slice(0, -1);
      if (currentPageId) saveStrokes(currentPageId, next);
      return next;
    });
  }, [currentPageId, saveStrokes]);

  const handleRedo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => {
        const next = [...s, last];
        if (currentPageId) saveStrokes(currentPageId, next);
        return next;
      });
      return prev.slice(0, -1);
    });
  }, [currentPageId, saveStrokes]);

  const currentPage = pages.find((p) => p.id === currentPageId);

  if (loadingNotebook || loadingPages) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Page sidebar */}
      <AnimatePresence>
        {showPageSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 192, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <PageSidebar
              pages={pages}
              currentPageId={currentPageId}
              onSelectPage={setCurrentPageId}
              onAddPage={() => addPageMutation.mutate()}
              onDeletePage={(pageId) => deletePageMutation.mutate(pageId)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-card/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowPageSidebar(!showPageSidebar)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border" />
            <h2 className="text-sm font-medium truncate max-w-[200px]">{notebook?.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              saveStatus === 'saving' ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {saveStatus === 'saving' ? 'Saving...' : (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-4 md:p-8">
          <div
            className="relative bg-white rounded-lg shadow-md"
            style={{ width: '100%', maxWidth: 800, aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
          >
            <PageTemplateBackground
              template={currentPage?.template || 'blank'}
              width={CANVAS_W}
              height={CANVAS_H}
            />
            <div className="absolute inset-0">
              <DrawingCanvas
                ref={canvasRef}
                strokes={strokes}
                onStrokeComplete={handleStrokeComplete}
                onEraseStroke={handleEraseStroke}
                activeTool={activeTool}
                penColor={penColor}
                penSize={penSize}
                highlighterColor={highlighterColor}
              />
            </div>
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="py-3 px-4 flex justify-center bg-background/80 backdrop-blur-xl border-t border-border">
          <DrawingToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            penColor={penColor}
            setPenColor={setPenColor}
            penSize={penSize}
            setPenSize={setPenSize}
            highlighterColor={highlighterColor}
            setHighlighterColor={setHighlighterColor}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={strokes.length > 0}
            canRedo={undoStack.length > 0}
          />
        </div>
      </div>
    </div>
  );
}
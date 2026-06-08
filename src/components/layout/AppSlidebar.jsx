import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Star, Clock, Trash2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'All Notes', icon: BookOpen, path: '/', filter: 'all' },
  { label: 'Favorites', icon: Star, path: '/?filter=favorites', filter: 'favorites' },
  { label: 'Recent', icon: Clock, path: '/?filter=recent', filter: 'recent' },
  { label: 'Trash', icon: Trash2, path: '/?filter=trash', filter: 'trash' },
];

export default function AppSidebar({ currentFilter, onFilterChange, onCreateNew }) {
  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Leafnote
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">Your quiet space for notes</p>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-sidebar-accent rounded-lg text-sm text-muted-foreground">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search notebooks...</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {navItems.map((item) => {
          const isActive = currentFilter === item.filter;
          return (
            <button
              key={item.filter}
              onClick={() => onFilterChange(item.filter)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Create button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Notebook
        </button>
      </div>
    </aside>
  );
}
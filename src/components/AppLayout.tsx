'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Search, Tag, Pin, MoreVertical, Download, Upload, Lock, Menu, X } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isUnlocked, lock, notes, files, addNote, findNotes, loadNotes } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadNotes();
      return;
    }
    setIsSearching(true);
    const results = await findNotes(searchQuery);
    setIsSearching(false);
  };

  const handleNewNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    await addNote(newNoteTitle, newNoteContent, newNoteTags.split(',').map(t => t.trim()).filter(Boolean));
    setShowNewNote(false);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTags('');
  };

  if (!isUnlocked) return null;

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 lg:relative ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full card">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16L5 12l6-4M3 7v6l6 4 6-4V7M14 3v4m0 8v4" />
                </svg>
                Secure Notes
              </h2>
              <button 
                className="lg:hidden icon-button"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="input pl-10"
              />
              </div>
            </form>

            {/* New Note Button */}
            <div className="p-4 border-b border-border">
              <button
                onClick={() => setShowNewNote(true)}
                className="btn btn-primary w-full"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-2">
              {notes.length === 0 && !isSearching && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No notes yet. Create your first note!
                </div>
              )}
              <ul className="space-y-1">
                {notes.map(note => (
                  <li key={note.id} className="stagger-item">
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        note.isPinned ? 'bg-primary-light border-l-2 border-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="font-medium text-foreground truncate">{note.title}</h3>
                            {note.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          </div>
                          <p className="text-muted-foreground line-clamp-1 text-xs">{note.content}</p>
                          {note.tags.length > 0 && (
                            <div className="tags">
                              {note.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="badge badge-secondary">{tag}</span>
                              ))}
                              {note.tags.length > 3 && (
                                <span className="badge badge-secondary">
                                  +{note.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats */}
            <div className="p-4 border-t border-border text-xs text-muted-foreground">
              <div className="flex justify-between mb-1">
                <span>Notes</span>
                <span className="font-medium">{notes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Files</span>
                <span className="font-medium">{files.length}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-0 flex-1 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 card border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden icon-button"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={lock}
                className="icon-button"
                title="Lock"
              >
                <Lock className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="section-container py-8">
          {children}
        </div>
      </main>

      {/* New Note Modal */}
      {showNewNote && (
        <div className="modal-overlay" onClick={() => setShowNewNote(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Note</h3>
              <button onClick={() => setShowNewNote(false)} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleNewNote} className="modal-body space-y-4">
              <div>
                <label className="form-label">Title</label>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="input"
                  placeholder="Note title"
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Content</label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={8}
                  className="input font-mono text-sm"
                  placeholder="Write your note..."
                />
              </div>
              <div>
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newNoteTags}
                  onChange={(e) => setNewNoteTags(e.target.value)}
                  className="input"
                  placeholder="work, personal, important"
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowNewNote(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNoteTitle.trim()}
                  className="btn btn-primary"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
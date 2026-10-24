'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Pin, Tag, Trash2, Download, Edit2, Save, X, MoreVertical, FileText, Calendar, Hash } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isPinned: boolean;
}

export default function NoteView({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const { notes, editNote, removeNote, loadNotes } = useApp();
  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const found = notes.find(n => n.id === noteId);
    if (found) {
      setNote(found);
      setEditTitle(found.title);
      setEditContent(found.content);
      setEditTags(found.tags.join(', '));
      setIsPinned(found.isPinned);
    } else {
      onClose();
    }
  }, [noteId, notes, onClose]);

  if (!note) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await editNote(noteId, {
        title: editTitle,
        content: editContent,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        isPinned: isPinned,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await removeNote(noteId);
      onClose();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
    setDeleting(false);
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="modal-close" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="modal-title truncate">{isEditing ? editTitle || 'Untitled' : note.title || 'Untitled'}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>Created: {formatDate(note.createdAt)}</span>
                <span>•</span>
                <span>Updated: {formatDate(note.updatedAt)}</span>
                {note.isPinned && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Pin className="w-3 h-3" /> Pinned
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="icon-button"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="icon-button text-destructive hover:bg-destructive hover:text-on-destructive"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => {
                    setEditTitle(note.title);
                    setEditContent(note.content);
                    setEditTags(note.tags.join(', '));
                    setIsPinned(note.isPinned);
                    setIsEditing(false);
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="modal-body flex-1 overflow-y-auto">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 h-full">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input"
                  placeholder="Note title"
                />
              </div>
              <div className="form-group flex-1 min-h-0">
                <label className="form-label">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="input font-mono text-sm resize-none"
                  rows={15}
                  placeholder="Write your note..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="input"
                  placeholder="work, personal, important"
                />
              </div>
              <div className="form-group flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Pin to top</span>
                </label>
              </div>
            </form>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                {note.content || '<empty>'}
              </div>
              {note.tags.length > 0 && (
                <div className="tags mt-4">
                  {note.tags.map(tag => (
                    <span key={tag} className="badge badge-primary">
                      <Hash className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
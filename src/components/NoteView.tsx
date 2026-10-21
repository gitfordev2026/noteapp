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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{isEditing ? editTitle || 'Untitled' : note.title || 'Untitled'}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
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
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
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
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 h-full">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Note title"
                />
              </div>
              <div className="flex-1 min-h-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-[calc(100%-100px)] min-h-[300px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-none"
                  placeholder="Write your note..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="work, personal, important"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Pin to top</span>
                </label>
              </div>
            </form>
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap font-mono text-gray-800 leading-relaxed">
                {note.content || '<empty>'}
              </div>
              {note.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {note.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
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
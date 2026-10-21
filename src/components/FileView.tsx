'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Trash2, Download, Tag, File as FileIcon, X, MoreVertical, Calendar, Save, Edit2 } from 'lucide-react';

interface FileEntry {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  data: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  description: string;
}

export default function FileView({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const { files, getFileData, editFile, removeFile } = useApp();
  const [file, setFile] = useState<FileEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Find file
  const found = files.find(f => f.id === fileId);
  if (found) {
    setFile(found);
    setEditName(found.originalName);
    setEditTags(found.tags.join(', '));
    setEditDescription(found.description);
  } else {
    onClose();
    return null;
  }

  if (!file) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const result = await getFileData(fileId);
      if (result) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${file.originalName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await removeFile(fileId);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setDeleting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await editFile(fileId, {
        originalName: editName,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        description: editDescription,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('zip') || mimeType.includes('compress') || mimeType.includes('archive')) return '📦';
    if (mimeType.startsWith('text/')) return '📝';
    return '📎';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                <h3 className="text-lg font-semibold text-gray-900">{isEditing ? editName : file.originalName}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>{formatSize(file.size)}</span>
                <span>•</span>
                <span>{file.mimeType}</span>
                <span>•</span>
                <span>Updated: {formatDate(file.updatedAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Edit metadata"
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
                    setEditName(file.originalName);
                    setEditTags(file.tags.join(', '));
                    setEditDescription(file.description);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
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
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="File name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="documents, work, archive"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="Optional description"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <span className="text-4xl">{getFileIcon(file.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{file.originalName}</h4>
                  <p className="text-sm text-gray-500">{file.mimeType} • {formatSize(file.size)}</p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {downloading ? 'Downloading...' : 'Download'}
                </button>
              </div>

              {file.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-gray-600 text-sm">{file.description}</p>
                </div>
              )}

              {file.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {file.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-medium">{formatDate(file.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Modified</span>
                  <span className="font-medium">{formatDate(file.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size</span>
                  <span className="font-medium">{formatSize(file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="font-medium">{file.mimeType}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="modal-close" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="file-icon">{getFileIcon(file.mimeType)}</span>
                <h3 className="modal-title truncate">{isEditing ? editName : file.originalName}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
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
                  className="icon-button"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="icon-button"
                  title="Edit metadata"
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
                    setEditName(file.originalName);
                    setEditTags(file.tags.join(', '));
                    setEditDescription(file.description);
                    setIsEditing(false);
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
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
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-group">
                <label className="form-label">File Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                  placeholder="File name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="input"
                  placeholder="documents, work, archive"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="input text-sm"
                  placeholder="Optional description"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 card rounded-xl">
                <span className="file-icon">{getFileIcon(file.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{file.originalName}</h4>
                  <p className="text-sm text-muted-foreground">{file.mimeType} • {formatSize(file.size)}</p>
                </div>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="btn btn-primary"
                >
                  {downloading ? 'Downloading...' : 'Download'}
                </button>
              </div>

              {file.description && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{file.description}</p>
                </div>
              )}

              {file.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Tags</h4>
                  <div className="tags">
                    {file.tags.map(tag => (
                      <span key={tag} className="badge badge-primary">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="divider" />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-foreground">{formatDate(file.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Modified</span>
                  <span className="font-medium text-foreground">{formatDate(file.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium text-foreground">{formatSize(file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{file.mimeType}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
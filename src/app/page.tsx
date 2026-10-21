'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import PinScreen from '@/components/PinScreen';
import AppLayout from '@/components/AppLayout';
import NoteView from '@/components/NoteView';
import FileView from '@/components/FileView';
import { Plus, Upload, File, Settings, ChevronDown, Tag } from 'lucide-react';

export default function Home() {
  const { isInitialized, isUnlocked, isLoading, notes, files, loadNotes, loadFiles, addFile } = useApp();
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [showAddFile, setShowAddFile] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [fileTags, setFileTags] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      loadNotes();
      loadFiles();
    }
  }, [isUnlocked, loadNotes, loadFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(e.target.files);
  };

  const handleAddFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        await addFile(selectedFiles[i], fileTags.split(',').map(t => t.trim()).filter(Boolean), fileDescription);
      }
      setShowAddFile(false);
      setSelectedFiles(null);
      setFileTags('');
      setFileDescription('');
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isInitialized || !isUnlocked) {
    return <PinScreen />;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1">Your encrypted notes and files</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddFile(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Add File
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16L5 12l6-4M3 7v6l6 4 6-4V7M14 3v4m0 8v4" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
                <p className="text-sm text-gray-500">Notes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <File className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{files.length}</p>
                <p className="text-sm text-gray-500">Files</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{notes.filter(n => n.isPinned).length}</p>
                <p className="text-sm text-gray-500">Pinned</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {[...new Set(notes.flatMap(n => n.tags))].length}
                </p>
                <p className="text-sm text-gray-500">Tags</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Notes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Notes</h2>
            {notes.length > 0 && (
              <span className="text-sm text-gray-500">{notes.length} total</span>
            )}
          </div>
          {notes.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16L5 12l6-4M3 7v6l6 4 6-4V7M14 3v4m0 8v4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notes yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new note.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {notes.slice(0, 5).map(note => (
                <li key={note.id}>
                  <button
                    onClick={() => setOpenNoteId(note.id)}
                    className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                        {note.isPinned && (
                          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-gray-500 line-clamp-1 text-sm">{note.content}</p>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded">
                              +{note.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Files */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Files</h2>
            {files.length > 0 && (
              <span className="text-sm text-gray-500">{files.length} total</span>
            )}
          </div>
          {files.length === 0 ? (
            <div className="p-8 text-center">
              <File className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files yet</h3>
              <p className="mt-1 text-sm text-gray-500">Upload your first encrypted file.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {files.slice(0, 5).map(file => (
                <li key={file.id}>
                  <button
                    onClick={() => setOpenFileId(file.id)}
                    className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {file.mimeType.startsWith('image/') && '🖼️'}
                      {file.mimeType === 'application/pdf' && '📄'}
                      {file.mimeType.startsWith('text/') && '📝'}
                      {!file.mimeType.startsWith('image/') && file.mimeType !== 'application/pdf' && !file.mimeType.startsWith('text/') && '📎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{file.originalName}</h3>
                      <p className="text-gray-500 text-sm truncate">{file.mimeType} • {(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Note View Modal */}
      {openNoteId && (
        <NoteView noteId={openNoteId} onClose={() => setOpenNoteId(null)} />
      )}

      {/* File View Modal */}
      {openFileId && (
        <FileView fileId={openFileId} onClose={() => setOpenFileId(null)} />
      )}

      {/* Add File Modal */}
      {showAddFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Add Files</h3>
              <button onClick={() => setShowAddFile(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddFiles} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Files</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                {selectedFiles && (
                  <p className="mt-1 text-sm text-gray-500">{selectedFiles.length} file(s) selected</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={fileTags}
                  onChange={(e) => setFileTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="documents, work, archive"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddFile(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFiles || selectedFiles.length === 0 || uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </AppLayout>
  );
}

// Settings Modal Component
function SettingsModal({ onClose }: { onClose: () => void }) {
  const { changePin, exportBackup, importBackup, lock, isUnlocked } = useApp();
  const [activeTab, setActiveTab] = useState<'security' | 'backup'>('security');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 characters');
      return;
    }
    setChangingPin(true);
    try {
      await changePin(oldPin, newPin);
      setPinSuccess('PIN changed successfully');
      setOldPin(''); setNewPin(''); setConfirmPin('');
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed to change PIN');
    }
    setChangingPin(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noteapp-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImportError('');
    setImporting(true);
    try {
      const text = await importFile.text();
      await importBackup(text);
      onClose();
    } catch (err) {
      setImportError('Invalid backup file');
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Settings</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'backup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Backup
            </button>
          </nav>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Change PIN</h4>
                <form onSubmit={handleChangePin} className="space-y-4">
                  {pinError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{pinError}</div>}
                  {pinSuccess && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{pinSuccess}</div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
                    <input
                      type="password"
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      minLength={4}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New PIN</label>
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPin}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {changingPin ? 'Changing...' : 'Change PIN'}
                  </button>
                </form>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Lock App</h4>
                <button
                  onClick={lock}
                  className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Lock Now
                </button>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Export Backup</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Download an encrypted backup of all your notes and files. 
                  The backup remains encrypted - you'll need your PIN to restore it.
                </p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Download Backup'}
                </button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Import Backup</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Restore from a previously exported backup file. 
                  This will replace all current data.
                </p>
                {importError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{importError}</div>}
                <form onSubmit={handleImport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Backup File</label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!importFile || importing}
                    className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : 'Import Backup'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
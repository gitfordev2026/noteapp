/**
 * IndexedDB storage for encrypted notes and files
 * All data stored is already encrypted
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Note {
  id: string;
  title: string;
  content: string; // encrypted
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isPinned: boolean;
}

interface FileEntry {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  data: string; // encrypted base64
  createdAt: number;
  updatedAt: number;
  tags: string[];
  description: string;
}

interface PinData {
  hash: string;
  salt: string;
  iterations: number;
}

interface AppMetadata {
  version: string;
  createdAt: number;
  lastUnlock: number | null;
}

interface NoteAppDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: { 'by-updated': 'updatedAt'; 'by-pinned': 'isPinned' };
  };
  files: {
    key: string;
    value: FileEntry;
    indexes: { 'by-updated': 'updatedAt' };
  };
  metadata: {
    key: string;
    value: PinData | AppMetadata;
    indexes: { 'by-key': 'key' };
  };
}

let dbInstance: IDBPDatabase<NoteAppDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<NoteAppDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<NoteAppDB>('noteapp', 1, {
    upgrade(db) {
      // Notes store
      const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
      noteStore.createIndex('by-updated', 'updatedAt');
      noteStore.createIndex('by-pinned', 'isPinned');

      // Files store
      const fileStore = db.createObjectStore('files', { keyPath: 'id' });
      fileStore.createIndex('by-updated', 'updatedAt');

      // Metadata store (for PIN hash, app metadata)
      const metaStore = db.createObjectStore('metadata', { keyPath: 'key' });
      metaStore.createIndex('by-key', 'key');
    },
  });

  return dbInstance;
}

// Notes CRUD
export async function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note> {
  const db = await getDB();
  const now = Date.now();
  const newNote: Note = {
    ...note,
    id: note.id || crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put('notes', newNote);
  return newNote;
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get('notes', id);
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
  const db = await getDB();
  const note = await db.get('notes', id);
  if (!note) return undefined;

  const updated: Note = {
    ...note,
    ...updates,
    id, // preserve ID
    updatedAt: Date.now(),
  };
  await db.put('notes', updated);
  return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
  const db = await getDB();
  await db.delete('notes', id);
  return true;
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  // Sort: pinned first, then by updatedAt descending
  return notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return b.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export async function searchNotes(query: string): Promise<Note[]> {
  const notes = await listNotes();
  const lowerQuery = query.toLowerCase();
  return notes.filter(n => 
    n.title.toLowerCase().includes(lowerQuery) ||
    n.content.toLowerCase().includes(lowerQuery) ||
    n.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

// Files CRUD
export async function createFile(file: Omit<FileEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<FileEntry> {
  const db = await getDB();
  const now = Date.now();
  const newFile: FileEntry = {
    ...file,
    id: file.id || crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put('files', newFile);
  return newFile;
}

export async function getFile(id: string): Promise<FileEntry | undefined> {
  const db = await getDB();
  return db.get('files', id);
}

export async function updateFile(id: string, updates: Partial<FileEntry>): Promise<FileEntry | undefined> {
  const db = await getDB();
  const file = await db.get('files', id);
  if (!file) return undefined;

  const updated: FileEntry = {
    ...file,
    ...updates,
    id,
    updatedAt: Date.now(),
  };
  await db.put('files', updated);
  return updated;
}

export async function deleteFile(id: string): Promise<boolean> {
  const db = await getDB();
  await db.delete('files', id);
  return true;
}

export async function listFiles(): Promise<FileEntry[]> {
  const db = await getDB();
  const files = await db.getAll('files');
  return files.sort((a, b) => b.updatedAt - a.updatedAt);
}

// PIN & Metadata
export async function savePinData(pinData: PinData): Promise<void> {
  const db = await getDB();
  await db.put('metadata', { ...pinData, key: 'pin' } as any, 'pin');
}

export async function getPinData(): Promise<PinData | undefined> {
  const db = await getDB();
  const result = await db.get('metadata', 'pin');
  return result as PinData | undefined;
}

export async function saveMetadata(metadata: AppMetadata): Promise<void> {
  const db = await getDB();
  await db.put('metadata', { ...metadata, key: 'app' } as any, 'app');
}

export async function getMetadata(): Promise<AppMetadata | undefined> {
  const db = await getDB();
  const result = await db.get('metadata', 'app');
  return result as AppMetadata | undefined;
}

// Clear all data (for logout/reset)
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('notes'),
    db.clear('files'),
    // Keep metadata (PIN) for security
  ]);
}

// Export all data for backup
export async function exportAllData(): Promise<{
  notes: Note[];
  files: FileEntry[];
  metadata: AppMetadata | undefined;
  pinData: PinData | undefined;
}> {
  const db = await getDB();
  const [notes, files, metadata, pinData] = await Promise.all([
    db.getAll('notes'),
    db.getAll('files'),
    db.get('metadata', 'app') as Promise<AppMetadata | undefined>,
    db.get('metadata', 'pin') as Promise<PinData | undefined>,
  ]);
  return { notes, files, metadata, pinData };
}

// Import data from backup
export async function importAllData(data: {
  notes: Note[];
  files: FileEntry[];
  metadata?: AppMetadata;
  pinData?: PinData;
}): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['notes', 'files', 'metadata'], 'readwrite');
  
  await Promise.all([
    ...data.notes.map(n => tx.objectStore('notes').put(n)),
    ...data.files.map(f => tx.objectStore('files').put(f)),
    data.metadata ? tx.objectStore('metadata').put(data.metadata, 'app') : Promise.resolve(),
    data.pinData ? tx.objectStore('metadata').put(data.pinData, 'pin') : Promise.resolve(),
  ]);
  
  await tx.done;
}
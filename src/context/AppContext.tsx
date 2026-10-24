'use client';

import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { hashPin, verifyPin, deriveKeyFromPin, exportKey, importKey, encrypt, decrypt, encryptFile, decryptFile } from '@/lib/crypto';
import { 
  getDB, savePinData, getPinData, getMetadata, saveMetadata, 
  clearAllData, exportAllData, importAllData,
  listNotes, createNote, getNote, updateNote, deleteNote, searchNotes,
  listFiles, createFile, getFile, updateFile, deleteFile
} from '@/lib/storage';
import { EncryptedData, PinHash } from '@/lib/crypto';

interface Note {
  id: string;
  title: string;
  content: string;
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
  data: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  description: string;
}

interface AppState {
  isInitialized: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  pinHash: PinHash | null;
  encryptionKey: CryptoKey | null;
  notes: Note[];
  files: FileEntry[];
  error: string | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'INIT_APP'; payload: { isInitialized: boolean; pinHash: PinHash | null } }
  | { type: 'UNLOCK_SUCCESS'; payload: { key: CryptoKey; pinHash: PinHash } }
  | { type: 'LOCK' }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: Note }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'SET_FILES'; payload: FileEntry[] }
  | { type: 'ADD_FILE'; payload: FileEntry }
  | { type: 'UPDATE_FILE'; payload: FileEntry }
  | { type: 'DELETE_FILE'; payload: string };

const initialState: AppState = {
  isInitialized: false,
  isUnlocked: false,
  isLoading: true,
  pinHash: null,
  encryptionKey: null,
  notes: [],
  files: [],
  error: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'INIT_APP':
      return { 
        ...state, 
        isInitialized: action.payload.isInitialized,
        pinHash: action.payload.pinHash,
        isLoading: false,
      };
    case 'UNLOCK_SUCCESS':
      return {
        ...state,
        isInitialized: true,
        isUnlocked: true,
        encryptionKey: action.payload.key,
        pinHash: action.payload.pinHash,
        error: null,
      };
    case 'LOCK':
      return {
        ...state,
        isUnlocked: false,
        encryptionKey: null,
        notes: [],
        files: [],
      };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [action.payload, ...state.notes] };
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(n => n.id === action.payload.id ? action.payload : n),
      };
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload) };
    case 'SET_FILES':
      return { ...state, files: action.payload };
    case 'ADD_FILE':
      return { ...state, files: [action.payload, ...state.files] };
    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(f => f.id === action.payload.id ? action.payload : f),
      };
    case 'DELETE_FILE':
      return { ...state, files: state.files.filter(f => f.id !== action.payload) };
    default:
      return state;
  }
}

interface AppContextType extends AppState {
  initialize: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  lock: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<void>;
  // Notes
  loadNotes: () => Promise<void>;
  addNote: (title: string, content: string, tags?: string[]) => Promise<Note>;
  editNote: (id: string, updates: Partial<Note>) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  findNotes: (query: string) => Promise<Note[]>;
  // Files
  loadFiles: () => Promise<void>;
  addFile: (file: File, tags?: string[], description?: string) => Promise<FileEntry>;
  getFileData: (id: string) => Promise<{ blob: Blob; name: string; type: string } | null>;
  editFile: (id: string, updates: Partial<FileEntry>) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  // Backup
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<void>;
  // Util
  clearError: (message?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Initialize app on mount
  useEffect(() => {
    async function init() {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const pinData = await getPinData();
        dispatch({ 
          type: 'INIT_APP', 
          payload: { isInitialized: !!pinData, pinHash: pinData || null } 
        });
      } catch (e) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize app' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    init();
  }, []);

  const clearError = (message?: string) => dispatch({ type: 'SET_ERROR', payload: null });

  const initialize = async (pin: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const pinHash = await hashPin(pin);
      const key = await deriveKeyFromPin(pin, base64ToBuffer(pinHash.salt));
      
      await savePinData(pinHash);
      await saveMetadata({ version: '1.0', createdAt: Date.now(), lastUnlock: Date.now() });
      
      dispatch({ type: 'UNLOCK_SUCCESS', payload: { key, pinHash } });
      dispatch({ type: 'SET_NOTES', payload: [] });
      dispatch({ type: 'SET_FILES', payload: [] });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const unlock = async (pin: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      if (!state.pinHash) throw new Error('App not initialized');
      
      const valid = await verifyPin(pin, state.pinHash);
      if (!valid) throw new Error('Invalid PIN');
      
      const key = await deriveKeyFromPin(pin, base64ToBuffer(state.pinHash.salt));
      
      await saveMetadata({ 
        version: '1.0', 
        createdAt: (await getMetadata())?.createdAt || Date.now(), 
        lastUnlock: Date.now() 
      });
      
      dispatch({ type: 'UNLOCK_SUCCESS', payload: { key, pinHash: state.pinHash } });
      
      // Load data
      const [notes, files] = await Promise.all([loadNotesData(key), loadFilesData(key)]);
      dispatch({ type: 'SET_NOTES', payload: notes });
      dispatch({ type: 'SET_FILES', payload: files });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to unlock' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const lock = () => {
    dispatch({ type: 'LOCK' });
  };

  const changePin = async (oldPin: string, newPin: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      if (!state.pinHash || !state.encryptionKey) throw new Error('Not unlocked');
      
      const valid = await verifyPin(oldPin, state.pinHash);
      if (!valid) throw new Error('Current PIN incorrect');
      
      // Export current key, derive new key from new PIN, re-encrypt all data
      const rawKey = await exportKey(state.encryptionKey);
      const newPinHash = await hashPin(newPin);
      const newKey = await deriveKeyFromPin(newPin, base64ToBuffer(newPinHash.salt));
      
      // Re-encrypt all notes
      const notes = await listNotes();
      for (const note of notes) {
        const decrypted = await decrypt({ 
          ciphertext: note.content, 
          iv: '', 
          salt: '' 
        }, state.encryptionKey);
        const encrypted = await encrypt(decrypted, newKey);
        await updateNote(note.id, { content: encrypted.ciphertext });
      }
      
      // Re-encrypt all files
      const files = await listFiles();
      for (const file of files) {
        const decrypted = await decryptFile({ 
          ciphertext: file.data, 
          iv: '', 
          salt: '' 
        }, state.encryptionKey);
        const encrypted = await encryptFile(decrypted, newKey);
        await updateFile(file.id, { data: encrypted.ciphertext });
      }
      
      await savePinData(newPinHash);
      
      dispatch({ 
        type: 'UNLOCK_SUCCESS', 
        payload: { key: newKey, pinHash: newPinHash } 
      });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to change PIN' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Helper functions for encrypted data loading
  async function loadNotesData(key: CryptoKey): Promise<Note[]> {
    const encryptedNotes = await listNotes();
    const notes: Note[] = [];
    for (const encNote of encryptedNotes) {
      try {
        const decrypted = await decrypt({ 
          ciphertext: encNote.content, 
          iv: '', 
          salt: '' 
        }, key);
        notes.push({ ...encNote, content: decrypted });
      } catch {
        // Skip corrupted notes
      }
    }
    return notes;
  }

  async function loadFilesData(key: CryptoKey): Promise<FileEntry[]> {
    const encryptedFiles = await listFiles();
    const files: FileEntry[] = [];
    for (const encFile of encryptedFiles) {
      try {
        files.push({ ...encFile }); // Files store encrypted data, decrypt on download
      } catch {
        // Skip corrupted files
      }
    }
    return files;
  }

  const loadNotes = async () => {
    if (!state.encryptionKey) return;
    const notes = await loadNotesData(state.encryptionKey);
    dispatch({ type: 'SET_NOTES', payload: notes });
  };

  const addNote = async (title: string, content: string, tags: string[] = []): Promise<Note> => {
    if (!state.encryptionKey) throw new Error('Not unlocked');
    const encrypted = await encrypt(content, state.encryptionKey);
    const note = await createNote({
      title,
      content: encrypted.ciphertext,
      tags,
      isPinned: false,
    });
    const decryptedNote = { ...note, content };
    dispatch({ type: 'ADD_NOTE', payload: decryptedNote });
    return decryptedNote;
  };

  const editNote = async (id: string, updates: Partial<Note>) => {
    if (!state.encryptionKey) throw new Error('Not unlocked');
    const updateData: Partial<Note> = { ...updates, updatedAt: Date.now() };
    if (updates.content !== undefined) {
      const encrypted = await encrypt(updates.content, state.encryptionKey);
      updateData.content = encrypted.ciphertext;
    }
    await updateNote(id, updateData);
    const updated = await getNote(id);
    if (updated) {
      const decrypted = await decrypt({ 
        ciphertext: updated.content, 
        iv: '', 
        salt: '' 
      }, state.encryptionKey);
      dispatch({ type: 'UPDATE_NOTE', payload: { ...updated, content: decrypted } });
    }
  };

  const removeNote = async (id: string) => {
    await deleteNote(id);
    dispatch({ type: 'DELETE_NOTE', payload: id });
  };

  const findNotes = async (query: string): Promise<Note[]> => {
    if (!state.encryptionKey) return [];
    const notes = await searchNotes(query);
    const results: Note[] = [];
    for (const note of notes) {
      try {
        const decrypted = await decrypt({ 
          ciphertext: note.content, 
          iv: '', 
          salt: '' 
        }, state.encryptionKey);
        results.push({ ...note, content: decrypted });
      } catch {}
    }
    return results;
  };

  const loadFiles = async () => {
    if (!state.encryptionKey) return;
    const files = await loadFilesData(state.encryptionKey);
    dispatch({ type: 'SET_FILES', payload: files });
  };

  const addFile = async (file: File, tags: string[] = [], description: string = ''): Promise<FileEntry> => {
    if (!state.encryptionKey) throw new Error('Not unlocked');
    const arrayBuffer = await file.arrayBuffer();
    const encrypted = await encryptFile(arrayBuffer, state.encryptionKey);
    const fileEntry = await createFile({
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      data: encrypted.ciphertext,
      tags,
      description,
    });
    dispatch({ type: 'ADD_FILE', payload: fileEntry });
    return fileEntry;
  };

  const getFileData = async (id: string) => {
    if (!state.encryptionKey) return null;
    const file = await getFile(id);
    if (!file) return null;
    try {
      const decrypted = await decryptFile({ 
        ciphertext: file.data, 
        iv: '', 
        salt: '' 
      }, state.encryptionKey);
      return {
        blob: new Blob([decrypted], { type: file.mimeType }),
        name: file.originalName,
        type: file.mimeType,
      };
    } catch {
      return null;
    }
  };

  const editFile = async (id: string, updates: Partial<FileEntry>) => {
    await updateFile(id, { ...updates, updatedAt: Date.now() });
    const updated = await getFile(id);
    if (updated) dispatch({ type: 'UPDATE_FILE', payload: updated });
  };

  const removeFile = async (id: string) => {
    await deleteFile(id);
    dispatch({ type: 'DELETE_FILE', payload: id });
  };

  const exportBackup = async (): Promise<string> => {
    const data = await exportAllData();
    return JSON.stringify(data, null, 2);
  };

  const importBackup = async (json: string) => {
    const data = JSON.parse(json);
    await importAllData(data);
    // Reload
    if (state.encryptionKey) {
      const [notes, files] = await Promise.all([loadNotesData(state.encryptionKey), loadFilesData(state.encryptionKey)]);
      dispatch({ type: 'SET_NOTES', payload: notes });
      dispatch({ type: 'SET_FILES', payload: files });
    }
  };

  return (
    <AppContext.Provider value={{ ...state, initialize, unlock, lock, changePin, loadNotes, addNote, editNote, removeNote, findNotes, loadFiles, addFile, getFileData, editFile, removeFile, exportBackup, importBackup, clearError }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

// Helper functions
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
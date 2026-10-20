"""
Data models for the secure note app.
Defines Note, File, and metadata structures.
"""

import os
import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path


@dataclass
class Note:
    """Represents a text note."""
    id: str
    title: str
    content: str  # Encrypted content stored as JSON string
    created_at: str
    updated_at: str
    tags: List[str] = field(default_factory=list)
    is_pinned: bool = False
    
    @classmethod
    def create(cls, title: str, content: str, tags: List[str] = None) -> 'Note':
        """Create a new note with generated ID and timestamps."""
        now = datetime.utcnow().isoformat() + 'Z'
        return cls(
            id=str(uuid.uuid4()),
            title=title,
            content=content,
            created_at=now,
            updated_at=now,
            tags=tags or [],
            is_pinned=False
        )
    
    def update(self, title: Optional[str] = None, content: Optional[str] = None, 
               tags: Optional[List[str]] = None, is_pinned: Optional[bool] = None) -> None:
        """Update note fields."""
        if title is not None:
            self.title = title
        if content is not None:
            self.content = content
        if tags is not None:
            self.tags = tags
        if is_pinned is not None:
            self.is_pinned = is_pinned
        self.updated_at = datetime.utcnow().isoformat() + 'Z'
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Note':
        """Create Note from dictionary."""
        return cls(**data)


@dataclass
class FileEntry:
    """Represents an encrypted file entry."""
    id: str
    original_name: str
    encrypted_name: str  # Stored filename on disk
    mime_type: str
    size: int  # Original file size in bytes
    created_at: str
    updated_at: str
    tags: List[str] = field(default_factory=list)
    description: str = ""
    
    @classmethod
    def create(cls, original_name: str, encrypted_name: str, mime_type: str, 
               size: int, tags: List[str] = None, description: str = "",
               file_id: str = None) -> 'FileEntry':
        """Create a new file entry."""
        now = datetime.utcnow().isoformat() + 'Z'
        return cls(
            id=file_id or str(uuid.uuid4()),
            original_name=original_name,
            encrypted_name=encrypted_name,
            mime_type=mime_type,
            size=size,
            created_at=now,
            updated_at=now,
            tags=tags or [],
            description=description
        )
    
    def update(self, original_name: Optional[str] = None, mime_type: Optional[str] = None,
               tags: Optional[List[str]] = None, description: Optional[str] = None) -> None:
        """Update file entry fields."""
        if original_name is not None:
            self.original_name = original_name
        if mime_type is not None:
            self.mime_type = mime_type
        if tags is not None:
            self.tags = tags
        if description is not None:
            self.description = description
        self.updated_at = datetime.utcnow().isoformat() + 'Z'
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FileEntry':
        """Create FileEntry from dictionary."""
        return cls(**data)


@dataclass
class AppMetadata:
    """Application metadata and settings."""
    version: str = "1.0.0"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + 'Z')
    last_unlock: Optional[str] = None
    note_count: int = 0
    file_count: int = 0
    total_size: int = 0  # Total size of all files in bytes
    settings: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AppMetadata':
        return cls(**data)


class DataStore:
    """Handles persistence of notes, files, and metadata."""
    
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.notes_dir = self.data_dir / 'notes'
        self.files_dir = self.data_dir / 'files'
        self.metadata_file = self.data_dir / 'metadata.json'
        self.notes_index_file = self.data_dir / 'notes_index.json'
        self.files_index_file = self.data_dir / 'files_index.json'
        
        # Ensure directories exist
        self.notes_dir.mkdir(parents=True, exist_ok=True)
        self.files_dir.mkdir(parents=True, exist_ok=True)
    
    # Notes operations
    def save_note(self, note: Note) -> None:
        """Save a note to disk (encrypted content already in note.content)."""
        note_file = self.notes_dir / f"{note.id}.json"
        with open(note_file, 'w') as f:
            json.dump(note.to_dict(), f, indent=2)
        os.chmod(note_file, 0o600)
        self._update_notes_index(note)
    
    def load_note(self, note_id: str) -> Optional[Note]:
        """Load a note from disk."""
        note_file = self.notes_dir / f"{note_id}.json"
        if not note_file.exists():
            return None
        with open(note_file, 'r') as f:
            data = json.load(f)
        return Note.from_dict(data)
    
    def delete_note(self, note_id: str) -> bool:
        """Delete a note from disk."""
        note_file = self.notes_dir / f"{note_id}.json"
        if note_file.exists():
            note_file.unlink()
            self._remove_from_notes_index(note_id)
            return True
        return False
    
    def list_notes(self) -> List[Note]:
        """List all notes (metadata only, content still encrypted)."""
        notes = []
        for note_file in self.notes_dir.glob("*.json"):
            try:
                with open(note_file, 'r') as f:
                    data = json.load(f)
                notes.append(Note.from_dict(data))
            except (json.JSONDecodeError, KeyError):
                continue
        # Sort by updated_at descending, pinned first
        notes.sort(key=lambda n: (n.is_pinned, n.updated_at), reverse=True)
        return notes
        return notes
    
    def _update_notes_index(self, note: Note) -> None:
        """Update the notes index for quick listing."""
        index = self._load_notes_index()
        index[note.id] = {
            'id': note.id,
            'title': note.title,
            'created_at': note.created_at,
            'updated_at': note.updated_at,
            'tags': note.tags,
            'is_pinned': note.is_pinned,
        }
        self._save_notes_index(index)
    
    def _remove_from_notes_index(self, note_id: str) -> None:
        """Remove a note from the index."""
        index = self._load_notes_index()
        index.pop(note_id, None)
        self._save_notes_index(index)
    
    def _load_notes_index(self) -> Dict[str, Any]:
        """Load notes index."""
        if not self.notes_index_file.exists():
            return {}
        try:
            with open(self.notes_index_file, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    
    def _save_notes_index(self, index: Dict[str, Any]) -> None:
        """Save notes index."""
        with open(self.notes_index_file, 'w') as f:
            json.dump(index, f, indent=2)
        os.chmod(self.notes_index_file, 0o600)
    
    # Files operations
    def save_file_entry(self, file_entry: FileEntry) -> None:
        """Save a file entry to index."""
        index = self._load_files_index()
        index[file_entry.id] = file_entry.to_dict()
        self._save_files_index(index)
    
    def load_file_entry(self, file_id: str) -> Optional[FileEntry]:
        """Load a file entry from index."""
        index = self._load_files_index()
        data = index.get(file_id)
        if data:
            return FileEntry.from_dict(data)
        return None
    
    def delete_file_entry(self, file_id: str) -> bool:
        """Delete a file entry from index."""
        index = self._load_files_index()
        if file_id in index:
            del index[file_id]
            self._save_files_index(index)
            return True
        return False
    
    def list_files(self) -> List[FileEntry]:
        """List all file entries."""
        index = self._load_files_index()
        files = [FileEntry.from_dict(data) for data in index.values()]
        files.sort(key=lambda f: f.updated_at, reverse=True)
        return files
    
    def _load_files_index(self) -> Dict[str, Any]:
        """Load files index."""
        if not self.files_index_file.exists():
            return {}
        try:
            with open(self.files_index_file, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    
    def _save_files_index(self, index: Dict[str, Any]) -> None:
        """Save files index."""
        with open(self.files_index_file, 'w') as f:
            json.dump(index, f, indent=2)
        os.chmod(self.files_index_file, 0o600)
    
    # File content operations (encrypted files on disk)
    def get_encrypted_file_path(self, file_id: str) -> Path:
        """Get the path for an encrypted file."""
        return self.files_dir / file_id
    
    def save_encrypted_file(self, file_id: str, encrypted_data: bytes) -> None:
        """Save encrypted file content."""
        file_path = self.get_encrypted_file_path(file_id)
        with open(file_path, 'wb') as f:
            f.write(encrypted_data)
        os.chmod(file_path, 0o600)
    
    def load_encrypted_file(self, file_id: str) -> Optional[bytes]:
        """Load encrypted file content."""
        file_path = self.get_encrypted_file_path(file_id)
        if not file_path.exists():
            return None
        with open(file_path, 'rb') as f:
            return f.read()
    
    def delete_encrypted_file(self, file_id: str) -> bool:
        """Delete encrypted file from disk."""
        file_path = self.get_encrypted_file_path(file_id)
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    # Metadata operations
    def save_metadata(self, metadata: AppMetadata) -> None:
        """Save application metadata."""
        with open(self.metadata_file, 'w') as f:
            json.dump(metadata.to_dict(), f, indent=2)
        os.chmod(self.metadata_file, 0o600)
    
    def load_metadata(self) -> AppMetadata:
        """Load application metadata."""
        if not self.metadata_file.exists():
            return AppMetadata()
        try:
            with open(self.metadata_file, 'r') as f:
                data = json.load(f)
            return AppMetadata.from_dict(data)
        except (json.JSONDecodeError, KeyError):
            return AppMetadata()
    
    def update_stats(self, note_count: int = None, file_count: int = None, 
                     total_size: int = None) -> None:
        """Update metadata statistics."""
        metadata = self.load_metadata()
        if note_count is not None:
            metadata.note_count = note_count
        if file_count is not None:
            metadata.file_count = file_count
        if total_size is not None:
            metadata.total_size = total_size
        metadata.last_unlock = datetime.utcnow().isoformat() + 'Z'
        self.save_metadata(metadata)
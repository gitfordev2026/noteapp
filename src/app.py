"""
Main application class for the secure note app.
Provides high-level CRUD operations for notes and files with PIN authentication.
"""

import os
import json
import uuid
import mimetypes
import shutil
from datetime import datetime
from typing import Optional, List, Dict, Any, BinaryIO
from pathlib import Path

from security import SecureStorage, SecurityError, PINManager, EncryptionManager
from models import Note, FileEntry, AppMetadata, DataStore


class NoteApp:
    """
    Main application class for the secure note app.
    Handles PIN authentication, encryption, and CRUD operations.
    """
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        self.data_dir = os.path.abspath(data_dir)
        self.storage = SecureStorage(self.data_dir)
        self.datastore = DataStore(self.data_dir)
        self._current_pin: Optional[str] = None
    
    # ===== Initialization & Authentication =====
    
    def initialize(self, pin: str) -> bool:
        """Initialize a new secure note app with a PIN."""
        if self.storage._load_pin_data():
            raise SecurityError("App already initialized. Use unlock() instead.")
        
        if not pin or len(pin) < 4:
            raise SecurityError("PIN must be at least 4 characters")
        if len(pin) > 128:
            raise SecurityError("PIN too long")
        
        self.storage.initialize_new(pin)
        self._current_pin = pin
        
        # Initialize metadata
        metadata = AppMetadata()
        self.datastore.save_metadata(metadata)
        
        return True
    
    def unlock(self, pin: str) -> bool:
        """Unlock the app with PIN."""
        if not self.storage.unlock(pin):
            return False
        self._current_pin = pin
        
        # Update metadata
        metadata = self.datastore.load_metadata()
        metadata.last_unlock = datetime.utcnow().isoformat() + 'Z'
        self.datastore.save_metadata(metadata)
        
        return True
    
    def lock(self) -> None:
        """Lock the app (clear keys from memory)."""
        self.storage.lock()
        self._current_pin = None
    
    def change_pin(self, old_pin: str, new_pin: str) -> bool:
        """Change the PIN."""
        if not self._current_pin or self._current_pin != old_pin:
            raise SecurityError("Current PIN incorrect")
        if not new_pin or len(new_pin) < 4:
            raise SecurityError("New PIN must be at least 4 characters")
        
        result = self.storage.change_pin(old_pin, new_pin)
        if result:
            self._current_pin = new_pin
        return result
    
    def is_unlocked(self) -> bool:
        """Check if app is unlocked."""
        return self.storage.is_unlocked()
    
    def is_initialized(self) -> bool:
        """Check if app has been initialized."""
        return self.storage._load_pin_data() is not None
    
    # ===== Notes CRUD =====
    
    def create_note(self, title: str, content: str, tags: List[str] = None) -> Note:
        """Create a new encrypted note."""
        self._require_unlocked()
        
        if not title or not title.strip():
            raise SecurityError("Note title cannot be empty")
        
        note = Note.create(title.strip(), content, tags or [])
        
        # Encrypt the content
        encrypted = self.storage.encrypt_note(note.id, content)
        note.content = json.dumps(encrypted)
        
        # Save
        self.datastore.save_note(note)
        self._update_stats()
        
        return note
    
    def get_note(self, note_id: str) -> Optional[Note]:
        """Get a note by ID (returns decrypted content)."""
        self._require_unlocked()
        
        note = self.datastore.load_note(note_id)
        if not note:
            return None
        
        # Decrypt content
        try:
            encrypted = json.loads(note.content)
            decrypted_content = self.storage.decrypt_note(note.id, encrypted)
            note.content = decrypted_content
        except (json.JSONDecodeError, SecurityError) as e:
            raise SecurityError(f"Failed to decrypt note: {e}")
        
        return note
    
    def update_note(self, note_id: str, title: Optional[str] = None, 
                    content: Optional[str] = None, tags: Optional[List[str]] = None,
                    is_pinned: Optional[bool] = None) -> Optional[Note]:
        """Update a note."""
        self._require_unlocked()
        
        note = self.datastore.load_note(note_id)
        if not note:
            return None
        
        # Decrypt current content first if we're not updating it
        current_content = None
        if content is None:
            try:
                encrypted = json.loads(note.content)
                current_content = self.storage.decrypt_note(note.id, encrypted)
            except (json.JSONDecodeError, SecurityError):
                pass
        
        # Update fields
        new_title = title if title is not None else note.title
        new_content = content if content is not None else (current_content or "")
        new_tags = tags if tags is not None else note.tags
        new_pinned = is_pinned if is_pinned is not None else note.is_pinned
        
        note.update(
            title=new_title,
            content=new_content,  # Will be re-encrypted below
            tags=new_tags,
            is_pinned=new_pinned
        )
        
        # Re-encrypt content
        encrypted = self.storage.encrypt_note(note.id, new_content)
        note.content = json.dumps(encrypted)
        
        # Save
        self.datastore.save_note(note)
        return note
    
    def delete_note(self, note_id: str) -> bool:
        """Delete a note."""
        self._require_unlocked()
        
        result = self.datastore.delete_note(note_id)
        if result:
            self._update_stats()
        return result
    
    def list_notes(self, include_content: bool = False, 
                   tag_filter: Optional[str] = None,
                   pinned_only: bool = False) -> List[Note]:
        """List all notes."""
        self._require_unlocked()
        
        notes = self.datastore.list_notes()
        
        # Apply filters
        if pinned_only:
            notes = [n for n in notes if n.is_pinned]
        if tag_filter:
            notes = [n for n in notes if tag_filter in n.tags]
        
        if include_content:
            # Decrypt content for each note
            for note in notes:
                try:
                    encrypted = json.loads(note.content)
                    note.content = self.storage.decrypt_note(note.id, encrypted)
                except (json.JSONDecodeError, SecurityError):
                    note.content = "[Decryption failed]"
        else:
            # Just show placeholder for content
            for note in notes:
                note.content = f"[Encrypted - {len(note.content)} chars]"
        
        return notes
    
    def search_notes(self, query: str) -> List[Note]:
        """Search notes by title or content."""
        self._require_unlocked()
        
        query = query.lower()
        results = []
        
        for note in self.datastore.list_notes():
            # Search in title
            if query in note.title.lower():
                results.append(note)
                continue
            
            # Search in content (need to decrypt)
            try:
                encrypted = json.loads(note.content)
                content = self.storage.decrypt_note(note.id, encrypted)
                if query in content.lower():
                    results.append(note)
            except (json.JSONDecodeError, SecurityError):
                pass
        
        return results
    
    # ===== Files CRUD =====
    
    def add_file(self, file_path: str, tags: List[str] = None, 
                 description: str = "") -> FileEntry:
        """Add a file (encrypt and store)."""
        self._require_unlocked()
        
        path = Path(file_path)
        if not path.exists():
            raise SecurityError(f"File not found: {file_path}")
        if not path.is_file():
            raise SecurityError(f"Not a file: {file_path}")
        
        # Get file info
        original_name = path.name
        mime_type = mimetypes.guess_type(original_name)[0] or 'application/octet-stream'
        size = path.stat().st_size
        
        # Generate file ID (used for both file entry and encrypted file)
        file_id = str(uuid.uuid4())
        
        # Create file entry with matching ID
        file_entry = FileEntry.create(
            original_name=original_name,
            encrypted_name=file_id,  # Use same ID for encrypted file
            mime_type=mime_type,
            size=size,
            tags=tags or [],
            description=description,
            file_id=file_id
        )
        
        # Encrypt and save file
        encrypted_output = self.datastore.get_encrypted_file_path(file_id)
        self.storage.encrypt_file(file_id, str(path), str(encrypted_output))
        
        # Save file entry
        self.datastore.save_file_entry(file_entry)
        self._update_stats()
        
        return file_entry
    
    def get_file(self, file_id: str, output_path: str) -> FileEntry:
        """Decrypt and retrieve a file to output_path."""
        self._require_unlocked()
        
        file_entry = self.datastore.load_file_entry(file_id)
        if not file_entry:
            raise SecurityError(f"File not found: {file_id}")
        
        encrypted_path = self.datastore.get_encrypted_file_path(file_id)
        if not encrypted_path.exists():
            raise SecurityError(f"Encrypted file missing: {file_id}")
        
        self.storage.decrypt_file(file_id, str(encrypted_path), output_path)
        return file_entry
    
    def get_file_info(self, file_id: str) -> Optional[FileEntry]:
        """Get file metadata without decrypting content."""
        self._require_unlocked()
        return self.datastore.load_file_entry(file_id)
    
    def update_file_info(self, file_id: str, original_name: Optional[str] = None,
                         tags: Optional[List[str]] = None, 
                         description: Optional[str] = None) -> Optional[FileEntry]:
        """Update file metadata."""
        self._require_unlocked()
        
        file_entry = self.datastore.load_file_entry(file_id)
        if not file_entry:
            return None
        
        file_entry.update(
            original_name=original_name,
            tags=tags,
            description=description
        )
        
        self.datastore.save_file_entry(file_entry)
        return file_entry
    
    def delete_file(self, file_id: str) -> bool:
        """Delete a file (both metadata and encrypted content)."""
        self._require_unlocked()
        
        # Delete encrypted file
        self.datastore.delete_encrypted_file(file_id)
        
        # Delete metadata
        result = self.datastore.delete_file_entry(file_id)
        if result:
            self._update_stats()
        return result
    
    def list_files(self, tag_filter: Optional[str] = None) -> List[FileEntry]:
        """List all files."""
        self._require_unlocked()
        
        files = self.datastore.list_files()
        
        if tag_filter:
            files = [f for f in files if tag_filter in f.tags]
        
        return files
    
    # ===== Utility Methods =====
    
    def _require_unlocked(self) -> None:
        """Raise error if app is not unlocked."""
        if not self.is_unlocked():
            raise SecurityError("App is locked. Call unlock() first.")
    
    def _update_stats(self) -> None:
        """Update metadata statistics."""
        notes = self.datastore.list_notes()
        files = self.datastore.list_files()
        total_size = sum(f.size for f in files)
        
        self.datastore.update_stats(
            note_count=len(notes),
            file_count=len(files),
            total_size=total_size
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get app statistics."""
        self._require_unlocked()
        
        metadata = self.datastore.load_metadata()
        notes = self.datastore.list_notes()
        files = self.datastore.list_files()
        
        return {
            'version': metadata.version,
            'created_at': metadata.created_at,
            'last_unlock': metadata.last_unlock,
            'note_count': len(notes),
            'file_count': len(files),
            'total_size_bytes': sum(f.size for f in files),
            'total_size_human': self._format_size(sum(f.size for f in files)),
            'is_unlocked': self.is_unlocked(),
            'data_dir': self.data_dir,
        }
    
    def export_data(self, export_path: str, pin: str) -> bool:
        """Export all data (encrypted) for backup."""
        self._require_unlocked()
        
        if pin != self._current_pin:
            raise SecurityError("PIN incorrect for export")
        
        export_dir = Path(export_path)
        export_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy all data files
        shutil.copytree(self.data_dir, export_dir / 'noteapp_backup', dirs_exist_ok=True)
        
        # Create manifest
        manifest = {
            'version': '1.0.0',
            'exported_at': datetime.utcnow().isoformat() + 'Z',
            'note_count': len(self.datastore.list_notes()),
            'file_count': len(self.datastore.list_files()),
        }
        with open(export_dir / 'manifest.json', 'w') as f:
            json.dump(manifest, f, indent=2)
        
        return True
    
    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """Format byte size to human readable."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} PB"


class CLIApp:
    """Command-line interface for the note app."""
    
    def __init__(self, app: NoteApp):
        self.app = app
    
    def run(self):
        """Run interactive CLI."""
        print("🔐 Secure Note App")
        print("=" * 40)
        
        if not self.app.is_initialized():
            print("\nFirst time setup - create a PIN")
            pin = self._get_pin("Enter new PIN (min 4 chars): ")
            confirm = self._get_pin("Confirm PIN: ")
            if pin != confirm:
                print("❌ PINs don't match")
                return
            self.app.initialize(pin)
            print("✅ App initialized!")
        else:
            print("\nApp already initialized")
            pin = self._get_pin("Enter PIN to unlock: ")
            if not self.app.unlock(pin):
                print("❌ Incorrect PIN")
                return
            print("✅ Unlocked!")
        
        self._main_loop()
    
    def _get_pin(self, prompt: str) -> str:
        """Get PIN from user (hidden input)."""
        import getpass
        return getpass.getpass(prompt)
    
    def _main_loop(self):
        """Main command loop."""
        commands = {
            'help': self._cmd_help,
            'notes': self._cmd_list_notes,
            'newnote': self._cmd_new_note,
            'view': self._cmd_view_note,
            'edit': self._cmd_edit_note,
            'delete': self._cmd_delete_note,
            'search': self._cmd_search_notes,
            'files': self._cmd_list_files,
            'addfile': self._cmd_add_file,
            'getfile': self._cmd_get_file,
            'delfile': self._cmd_delete_file,
            'stats': self._cmd_stats,
            'changepin': self._cmd_change_pin,
            'lock': self._cmd_lock,
            'quit': self._cmd_quit,
        }
        
        while True:
            try:
                cmd = input("\n> ").strip().lower()
                if not cmd:
                    continue
                
                parts = cmd.split()
                base_cmd = parts[0]
                args = parts[1:]
                
                if base_cmd in commands:
                    commands[base_cmd](args)
                else:
                    print(f"Unknown command: {base_cmd}. Type 'help' for commands.")
            except KeyboardInterrupt:
                print("\nUse 'quit' to exit")
            except EOFError:
                break
            except SecurityError as e:
                print(f"🔒 Security error: {e}")
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def _cmd_help(self, args):
        print("""
Commands:
  help          - Show this help
  notes         - List all notes
  newnote       - Create a new note
  view <id>     - View a note
  edit <id>     - Edit a note
  delete <id>   - Delete a note
  search <q>    - Search notes
  files         - List all files
  addfile <path> - Add a file
  getfile <id> <out> - Retrieve a file
  delfile <id>  - Delete a file
  stats         - Show statistics
  changepin     - Change PIN
  lock          - Lock the app
  quit          - Exit
        """)
    
    def _cmd_list_notes(self, args):
        pinned = '--pinned' in args
        notes = self.app.list_notes(pinned_only=pinned)
        if not notes:
            print("No notes found.")
            return
        for note in notes:
            pin_mark = "📌 " if note.is_pinned else "  "
            tags = f" [{', '.join(note.tags)}]" if note.tags else ""
            print(f"{pin_mark}{note.id[:8]} - {note.title}{tags}")
            print(f"      Updated: {note.updated_at}")
    
    def _cmd_new_note(self, args):
        title = input("Title: ").strip()
        if not title:
            print("Title required")
            return
        print("Content (Ctrl+D to finish):")
        import sys
        content = sys.stdin.read()
        tags_input = input("Tags (comma-separated): ").strip()
        tags = [t.strip() for t in tags_input.split(',') if t.strip()] if tags_input else []
        
        note = self.app.create_note(title, content, tags)
        print(f"✅ Note created: {note.id}")
    
    def _cmd_view_note(self, args):
        if not args:
            print("Usage: view <note_id>")
            return
        note = self.app.get_note(args[0])
        if not note:
            print("Note not found")
            return
        print(f"\n📝 {note.title}")
        print(f"ID: {note.id}")
        print(f"Created: {note.created_at}")
        print(f"Updated: {note.updated_at}")
        if note.tags:
            print(f"Tags: {', '.join(note.tags)}")
        if note.is_pinned:
            print("📌 Pinned")
        print("-" * 40)
        print(note.content)
    
    def _cmd_edit_note(self, args):
        if not args:
            print("Usage: edit <note_id>")
            return
        note = self.app.get_note(args[0])
        if not note:
            print("Note not found")
            return
        
        print(f"Editing: {note.title}")
        new_title = input(f"Title [{note.title}]: ").strip() or None
        print("New content (Ctrl+D to finish, leave empty to keep):")
        import sys
        new_content = sys.stdin.read()
        new_content = new_content if new_content else None
        tags_input = input(f"Tags [{', '.join(note.tags)}]: ").strip()
        tags = [t.strip() for t in tags_input.split(',') if t.strip()] if tags_input else None
        
        updated = self.app.update_note(args[0], new_title, new_content, tags)
        if updated:
            print("✅ Note updated")
        else:
            print("❌ Failed to update")
    
    def _cmd_delete_note(self, args):
        if not args:
            print("Usage: delete <note_id>")
            return
        confirm = input(f"Delete note {args[0]}? (y/N): ").lower()
        if confirm == 'y':
            if self.app.delete_note(args[0]):
                print("✅ Note deleted")
            else:
                print("❌ Note not found")
    
    def _cmd_search_notes(self, args):
        if not args:
            print("Usage: search <query>")
            return
        query = ' '.join(args)
        results = self.app.search_notes(query)
        if not results:
            print("No matches found")
            return
        for note in results:
            print(f"  {note.id[:8]} - {note.title}")
    
    def _cmd_list_files(self, args):
        files = self.app.list_files()
        if not files:
            print("No files found.")
            return
        for f in files:
            tags = f" [{', '.join(f.tags)}]" if f.tags else ""
            size = self.app._format_size(f.size)
            print(f"  {f.id[:8]} - {f.original_name} ({size}){tags}")
    
    def _cmd_add_file(self, args):
        if not args:
            print("Usage: addfile <path>")
            return
        path = args[0]
        tags_input = input("Tags (comma-separated): ").strip()
        tags = [t.strip() for t in tags_input.split(',') if t.strip()] if tags_input else []
        desc = input("Description: ").strip()
        
        file_entry = self.app.add_file(path, tags, desc)
        print(f"✅ File added: {file_entry.id}")
    
    def _cmd_get_file(self, args):
        if len(args) < 2:
            print("Usage: getfile <file_id> <output_path>")
            return
        file_id, output = args[0], args[1]
        try:
            entry = self.app.get_file(file_id, output)
            print(f"✅ File saved to: {output}")
        except SecurityError as e:
            print(f"❌ {e}")
    
    def _cmd_delete_file(self, args):
        if not args:
            print("Usage: delfile <file_id>")
            return
        confirm = input(f"Delete file {args[0]}? (y/N): ").lower()
        if confirm == 'y':
            if self.app.delete_file(args[0]):
                print("✅ File deleted")
            else:
                print("❌ File not found")
    
    def _cmd_stats(self, args):
        stats = self.app.get_stats()
        print(f"""
📊 Statistics:
  Version: {stats['version']}
  Created: {stats['created_at']}
  Last unlock: {stats['last_unlock'] or 'Never'}
  Notes: {stats['note_count']}
  Files: {stats['file_count']}
  Total size: {stats['total_size_human']}
  Data dir: {stats['data_dir']}
        """)
    
    def _cmd_change_pin(self, args):
        old = self._get_pin("Current PIN: ")
        new = self._get_pin("New PIN: ")
        confirm = self._get_pin("Confirm new PIN: ")
        if new != confirm:
            print("❌ PINs don't match")
            return
        if self.app.change_pin(old, new):
            print("✅ PIN changed")
        else:
            print("❌ Failed to change PIN")
    
    def _cmd_lock(self, args):
        self.app.lock()
        print("🔒 App locked")
    
    def _cmd_quit(self, args):
        self.app.lock()
        print("👋 Goodbye!")
        exit(0)


def main():
    """Entry point for CLI."""
    import argparse
    parser = argparse.ArgumentParser(description='Secure Note App')
    parser.add_argument('--data-dir', help='Data directory path')
    parser.add_argument('--init', help='Initialize with PIN')
    parser.add_argument('--unlock', help='Unlock with PIN')
    args = parser.parse_args()
    
    app = NoteApp(args.data_dir)
    
    if args.init:
        app.initialize(args.init)
        print("✅ Initialized")
        return
    
    if args.unlock:
        if app.unlock(args.unlock):
            print("✅ Unlocked")
        else:
            print("❌ Incorrect PIN")
        return
    
    # Interactive mode
    cli = CLIApp(app)
    cli.run()


if __name__ == '__main__':
    main()
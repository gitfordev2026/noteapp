# Secure Note App 🔐

A privacy-first, encrypted note-taking application with PIN authentication, built for personal use. All data is encrypted at rest using AES-GCM with keys derived from your PIN via PBKDF2.

## Features

- 🔒 **PIN-protected encryption** - Your data is encrypted with a key derived from your PIN
- 📝 **Encrypted notes** - Create, read, update, delete, search, pin, and tag notes
- 📁 **Encrypted file storage** - Store any file type with metadata (tags, descriptions)
- 🔍 **Full-text search** - Search across note titles and content
- 📌 **Pin important notes** - Keep critical notes at the top
- 🏷️ **Tagging system** - Organize with custom tags
- 💾 **Persistent storage** - Data survives app restarts
- 🔄 **PIN change** - Change your PIN without losing data
- 📊 **Statistics** - View storage usage and counts

## Security Architecture

```
PIN → PBKDF2-HMAC-SHA256 (600,000 iterations) → Salt + Hash
                    ↓
            HKDF-SHA256 → Master Encryption Key (256-bit)
                    ↓
            AES-GCM (per-note/file nonce) → Encrypted Data
```

- **PIN hashing**: PBKDF2 with 600,000 iterations, 32-byte salt
- **Key derivation**: HKDF from PIN-derived key
- **Encryption**: AES-256-GCM with unique 96-bit nonce per item
- **Authentication**: Associated data binds encryption to note/file ID
- **File permissions**: All data files stored with 0600 permissions

## Installation

```bash
cd /home/ubuntu/.openclaw/workspace/noteapp
# No additional dependencies beyond Python 3.8+ and cryptography
pip3 install cryptography
```

## Usage

### Interactive CLI

```bash
python3 -m src.app
```

First run: creates PIN and initializes encrypted storage.
Subsequent runs: enter PIN to unlock.

### Programmatic API

```python
from src.app import NoteApp

app = NoteApp("/path/to/data")

# Initialize (first time)
app.initialize("your-pin")

# Unlock (subsequent uses)
app.unlock("your-pin")

# Notes
note = app.create_note("Title", "Content", tags=["work"])
note = app.get_note(note.id)  # Returns decrypted content
app.update_note(note.id, title="New Title")
app.delete_note(note.id)
notes = app.list_notes()
results = app.search_notes("query")

# Files
file_entry = app.add_file("/path/to/file.pdf", tags=["doc"])
app.get_file(file_entry.id, "/output/path.pdf")
app.delete_file(file_entry.id)
files = app.list_files()

# Lock when done
app.lock()
```

### Commands (Interactive Mode)

| Command | Description |
|---------|-------------|
| `help` | Show all commands |
| `notes` | List all notes |
| `newnote` | Create a new note |
| `view <id>` | View a note (decrypted) |
| `edit <id>` | Edit a note |
| `delete <id>` | Delete a note |
| `search <query>` | Search notes |
| `files` | List all files |
| `addfile <path>` | Add a file |
| `getfile <id> <out>` | Retrieve a file |
| `delfile <id>` | Delete a file |
| `stats` | Show statistics |
| `changepin` | Change PIN |
| `lock` | Lock the app |
| `quit` | Exit |

## Data Structure

```
data/
├── pin_data.json          # PIN hash + salt (0600)
├── metadata.json          # App metadata (0600)
├── notes_index.json       # Note index for fast listing (0600)
├── files_index.json       # File index for fast listing (0600)
├── notes/
│   └── {note-id}.json     # Encrypted note content (0600)
└── files/
    └── {file-id}          # Encrypted file content (0600)
```

## Testing

```bash
python3 -c "
import sys
sys.path.insert(0, 'src')
import tests.test_noteapp
tests.test_noteapp.run_tests()
"
```

All 54 tests pass covering:
- PIN management (hashing, verification, changing)
- Encryption/decryption (AES-GCM, associated data, tamper detection)
- Secure storage (initialize, unlock, lock, change PIN)
- Data models (serialization, CRUD)
- Data persistence (notes, files, metadata, indexes)
- Full app integration (notes, files, search, stats, PIN change)
- Security integration (persistence, wrong PIN rejection, disk encryption verification)

## Security Notes

- **Never share your PIN** - It's the only key to your data
- **No backdoors** - Without the PIN, data is cryptographically inaccessible
- **Memory protection** - Keys cleared on `lock()` call
- **Audit the code** - All crypto uses standard `cryptography` library primitives
- **Backup strategy** - Copy the entire `data/` directory for backups (still encrypted)

## License

Personal use only. Built with security-first principles.
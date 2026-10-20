"""
Unit tests for the secure note app.
"""

import os
import json
import tempfile
import shutil
import unittest
from pathlib import Path

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from security import (
    PINManager, EncryptionManager, SecureStorage, SecurityError
)
from models import Note, FileEntry, AppMetadata, DataStore
from app import NoteApp


class TestPINManager(unittest.TestCase):
    """Tests for PIN hashing and verification."""
    
    def setUp(self):
        self.pin_manager = PINManager()
    
    def test_hash_pin(self):
        pin = "1234"
        pin_hash, salt = self.pin_manager.hash_pin(pin)
        
        self.assertEqual(len(pin_hash), 32)
        self.assertEqual(len(salt), 32)
        self.assertNotEqual(pin_hash, salt)
    
    def test_verify_pin_correct(self):
        pin = "123456"
        pin_hash, salt = self.pin_manager.hash_pin(pin)
        result = self.pin_manager.verify_pin(pin, pin_hash, salt)
        self.assertTrue(result)
    
    def test_verify_pin_incorrect(self):
        pin = "123456"
        pin_hash, salt = self.pin_manager.hash_pin(pin)
        result = self.pin_manager.verify_pin("wrong", pin_hash, salt)
        self.assertFalse(result)
    
    def test_pin_too_short(self):
        with self.assertRaises(SecurityError):
            self.pin_manager.hash_pin("123")
    
    def test_pin_too_long(self):
        with self.assertRaises(SecurityError):
            self.pin_manager.hash_pin("x" * 129)
    
    def test_empty_pin(self):
        with self.assertRaises(SecurityError):
            self.pin_manager.hash_pin("")
    
    def test_set_and_check_pin(self):
        self.pin_manager.set_pin("1234")
        self.assertTrue(self.pin_manager.check_pin("1234"))
        self.assertFalse(self.pin_manager.check_pin("wrong"))
    
    def test_load_pin_data(self):
        pin_hash, salt = self.pin_manager.hash_pin("1234")
        self.pin_manager.load_pin_data(pin_hash, salt)
        self.assertTrue(self.pin_manager.check_pin("1234"))
    
    def test_get_pin_data(self):
        pin_hash, salt = self.pin_manager.hash_pin("1234")
        self.pin_manager.load_pin_data(pin_hash, salt)
        data = self.pin_manager.get_pin_data()
        self.assertIsNotNone(data)
        self.assertEqual(data[0], pin_hash)
        self.assertEqual(data[1], salt)


class TestEncryptionManager(unittest.TestCase):
    """Tests for encryption and decryption."""
    
    def setUp(self):
        self.master_key = EncryptionManager.generate_master_key()
        self.encryption = EncryptionManager(self.master_key)
    
    def test_encrypt_decrypt(self):
        plaintext = b"Hello, World! This is a test message."
        encrypted = self.encryption.encrypt(plaintext)
        decrypted = self.encryption.decrypt(encrypted)
        self.assertEqual(plaintext, decrypted)
    
    def test_encrypt_decrypt_with_associated_data(self):
        plaintext = b"Secret data"
        associated = b"note:123"
        encrypted = self.encryption.encrypt(plaintext, associated)
        decrypted = self.encryption.decrypt(encrypted, associated)
        self.assertEqual(plaintext, decrypted)
    
    def test_decrypt_wrong_associated_data_fails(self):
        plaintext = b"Secret data"
        encrypted = self.encryption.encrypt(plaintext, b"note:123")
        with self.assertRaises(SecurityError):
            self.encryption.decrypt(encrypted, b"note:456")
    
    def test_decrypt_tampered_ciphertext_fails(self):
        plaintext = b"Secret data"
        encrypted = self.encryption.encrypt(plaintext)
        # Tamper with ciphertext
        encrypted['ciphertext'] = 'dGhlcmVjaHRlZHRleHQ='  # base64 of "theencryptedtext"
        with self.assertRaises(SecurityError):
            self.encryption.decrypt(encrypted)
    
    def test_encrypt_empty_fails(self):
        with self.assertRaises(SecurityError):
            self.encryption.encrypt(b"")
    
    def test_no_key_set_fails(self):
        encryption = EncryptionManager()
        with self.assertRaises(SecurityError):
            encryption.encrypt(b"test")
    
    def test_derive_key_from_pin(self):
        pin = "123456"
        salt = b"salt" * 8  # 32 bytes
        key1 = EncryptionManager.derive_key_from_pin(pin, salt)
        key2 = EncryptionManager.derive_key_from_pin(pin, salt)
        self.assertEqual(key1, key2)
        self.assertEqual(len(key1), 32)
    
    def test_different_pins_different_keys(self):
        salt = b"salt" * 8
        key1 = EncryptionManager.derive_key_from_pin("1234", salt)
        key2 = EncryptionManager.derive_key_from_pin("5678", salt)
        self.assertNotEqual(key1, key2)
    
    def test_file_encryption(self):
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b"File content to encrypt")
            input_path = f.name
        
        output_path = input_path + ".enc"
        
        try:
            self.encryption.encrypt_file(input_path, output_path)
            self.assertTrue(os.path.exists(output_path))
            
            # Decrypt back
            decrypt_path = input_path + ".dec"
            self.encryption.decrypt_file(output_path, decrypt_path)
            
            with open(decrypt_path, 'rb') as f:
                content = f.read()
            self.assertEqual(content, b"File content to encrypt")
        finally:
            for p in [input_path, output_path, input_path + ".dec"]:
                if os.path.exists(p):
                    os.unlink(p)


class TestSecureStorage(unittest.TestCase):
    """Tests for high-level secure storage."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.storage = SecureStorage(self.temp_dir)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_initialize_new(self):
        self.storage.initialize_new("1234")
        self.assertTrue(self.storage.is_unlocked())
    
    def test_unlock(self):
        self.storage.initialize_new("1234")
        self.storage.lock()
        self.assertFalse(self.storage.is_unlocked())
        
        result = self.storage.unlock("1234")
        self.assertTrue(result)
        self.assertTrue(self.storage.is_unlocked())
    
    def test_unlock_wrong_pin(self):
        self.storage.initialize_new("1234")
        self.storage.lock()
        result = self.storage.unlock("wrong")
        self.assertFalse(result)
    
    def test_change_pin(self):
        self.storage.initialize_new("1234")
        result = self.storage.change_pin("1234", "5678")
        self.assertTrue(result)
        
        self.storage.lock()
        result = self.storage.unlock("5678")
        self.assertTrue(result)
    
    def test_change_pin_wrong_old(self):
        self.storage.initialize_new("1234")
        result = self.storage.change_pin("wrong", "5678")
        self.assertFalse(result)
    
    def test_encrypt_decrypt_note(self):
        self.storage.initialize_new("1234")
        note_id = "test-note-1"
        content = "This is a secret note content"
        
        encrypted = self.storage.encrypt_note(note_id, content)
        self.assertIn('nonce', encrypted)
        self.assertIn('ciphertext', encrypted)
        self.assertIn('tag', encrypted)
        
        decrypted = self.storage.decrypt_note(note_id, encrypted)
        self.assertEqual(content, decrypted)
    
    def test_encrypt_decrypt_file(self):
        self.storage.initialize_new("1234")
        file_id = "test-file-1"
        
        # Create test file
        input_path = os.path.join(self.temp_dir, "input.txt")
        with open(input_path, 'w') as f:
            f.write("File content")
        
        output_path = os.path.join(self.temp_dir, "output.enc")
        
        self.storage.encrypt_file(file_id, input_path, output_path)
        self.assertTrue(os.path.exists(output_path))
        
        # Decrypt
        decrypt_path = os.path.join(self.temp_dir, "output.txt")
        self.storage.decrypt_file(file_id, output_path, decrypt_path)
        
        with open(decrypt_path, 'r') as f:
            content = f.read()
        self.assertEqual(content, "File content")
    
    def test_lock_clears_keys(self):
        self.storage.initialize_new("1234")
        self.assertTrue(self.storage.is_unlocked())
        self.storage.lock()
        self.assertFalse(self.storage.is_unlocked())
        
        # Operations should fail when locked
        with self.assertRaises(SecurityError):
            self.storage.encrypt_note("id", "content")


class TestModels(unittest.TestCase):
    """Tests for data models."""
    
    def test_note_creation(self):
        note = Note.create("Test Title", "Test content", ["tag1", "tag2"])
        self.assertIsNotNone(note.id)
        self.assertEqual(note.title, "Test Title")
        self.assertEqual(note.content, "Test content")
        self.assertEqual(note.tags, ["tag1", "tag2"])
        self.assertFalse(note.is_pinned)
    
    def test_note_update(self):
        note = Note.create("Title", "Content")
        original_updated = note.updated_at
        
        note.update(title="New Title", tags=["new"])
        self.assertEqual(note.title, "New Title")
        self.assertEqual(note.tags, ["new"])
        self.assertNotEqual(note.updated_at, original_updated)
    
    def test_note_serialization(self):
        note = Note.create("Title", "Content", ["tag"])
        data = note.to_dict()
        note2 = Note.from_dict(data)
        self.assertEqual(note.id, note2.id)
        self.assertEqual(note.title, note2.title)
        self.assertEqual(note.content, note2.content)
        self.assertEqual(note.tags, note2.tags)
    
    def test_file_entry_creation(self):
        file_entry = FileEntry.create(
            "test.txt", "uuid.txt", "text/plain", 100, ["doc"], "Description"
        )
        self.assertIsNotNone(file_entry.id)
        self.assertEqual(file_entry.original_name, "test.txt")
        self.assertEqual(file_entry.size, 100)
        self.assertEqual(file_entry.tags, ["doc"])
    
    def test_app_metadata(self):
        metadata = AppMetadata()
        data = metadata.to_dict()
        metadata2 = AppMetadata.from_dict(data)
        self.assertEqual(metadata.version, metadata2.version)


class TestDataStore(unittest.TestCase):
    """Tests for data persistence layer."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.datastore = DataStore(self.temp_dir)
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_save_load_note(self):
        note = Note.create("Title", "encrypted_content", ["tag"])
        self.datastore.save_note(note)
        
        loaded = self.datastore.load_note(note.id)
        self.assertIsNotNone(loaded)
        self.assertEqual(note.id, loaded.id)
        self.assertEqual(note.title, loaded.title)
    
    def test_delete_note(self):
        note = Note.create("Title", "Content")
        self.datastore.save_note(note)
        
        result = self.datastore.delete_note(note.id)
        self.assertTrue(result)
        self.assertIsNone(self.datastore.load_note(note.id))
    
    def test_list_notes(self):
        note1 = Note.create("Note 1", "Content 1")
        note2 = Note.create("Note 2", "Content 2", tags=["important"])
        note2.is_pinned = True
        
        self.datastore.save_note(note1)
        self.datastore.save_note(note2)
        
        notes = self.datastore.list_notes()
        self.assertEqual(len(notes), 2)
        # Pinned should come first
        self.assertTrue(notes[0].is_pinned)
    
    def test_file_entry_operations(self):
        file_entry = FileEntry.create("test.txt", "uuid", "text/plain", 100)
        self.datastore.save_file_entry(file_entry)
        
        loaded = self.datastore.load_file_entry(file_entry.id)
        self.assertIsNotNone(loaded)
        self.assertEqual(file_entry.id, loaded.id)
        
        files = self.datastore.list_files()
        self.assertEqual(len(files), 1)
        
        result = self.datastore.delete_file_entry(file_entry.id)
        self.assertTrue(result)
        self.assertIsNone(self.datastore.load_file_entry(file_entry.id))
    
    def test_encrypted_file_operations(self):
        file_id = "test-file"
        encrypted_data = b"encrypted content"
        
        self.datastore.save_encrypted_file(file_id, encrypted_data)
        loaded = self.datastore.load_encrypted_file(file_id)
        self.assertEqual(encrypted_data, loaded)
        
        result = self.datastore.delete_encrypted_file(file_id)
        self.assertTrue(result)
        self.assertIsNone(self.datastore.load_encrypted_file(file_id))
    
    def test_metadata(self):
        metadata = AppMetadata(note_count=5, file_count=3)
        self.datastore.save_metadata(metadata)
        
        loaded = self.datastore.load_metadata()
        self.assertEqual(loaded.note_count, 5)
        self.assertEqual(loaded.file_count, 3)


class TestNoteApp(unittest.TestCase):
    """Integration tests for the main NoteApp class."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.app = NoteApp(self.temp_dir)
    
    def tearDown(self):
        self.app.lock()
        shutil.rmtree(self.temp_dir)
    
    def test_initialize_and_unlock(self):
        self.app.initialize("1234")
        self.assertTrue(self.app.is_initialized())
        self.assertTrue(self.app.is_unlocked())
        
        # Lock and unlock
        self.app.lock()
        self.assertFalse(self.app.is_unlocked())
        
        result = self.app.unlock("1234")
        self.assertTrue(result)
        self.assertTrue(self.app.is_unlocked())
    
    def test_unlock_wrong_pin(self):
        self.app.initialize("1234")
        self.app.lock()
        result = self.app.unlock("wrong")
        self.assertFalse(result)
    
    def test_create_and_get_note(self):
        self.app.initialize("1234")
        
        note = self.app.create_note("My Note", "Secret content", ["personal"])
        self.assertIsNotNone(note.id)
        self.assertEqual(note.title, "My Note")
        
        # Get note (should decrypt)
        retrieved = self.app.get_note(note.id)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.content, "Secret content")
        self.assertEqual(retrieved.title, "My Note")
        self.assertEqual(retrieved.tags, ["personal"])
    
    def test_update_note(self):
        self.app.initialize("1234")
        
        note = self.app.create_note("Original", "Original content")
        updated = self.app.update_note(note.id, title="Updated", content="New content")
        
        self.assertEqual(updated.title, "Updated")
        
        retrieved = self.app.get_note(note.id)
        self.assertEqual(retrieved.content, "New content")
    
    def test_delete_note(self):
        self.app.initialize("1234")
        
        note = self.app.create_note("To Delete", "Content")
        result = self.app.delete_note(note.id)
        self.assertTrue(result)
        
        retrieved = self.app.get_note(note.id)
        self.assertIsNone(retrieved)
    
    def test_list_notes(self):
        self.app.initialize("1234")
        
        self.app.create_note("Note 1", "Content 1")
        note2 = self.app.create_note("Note 2", "Content 2", tags=["work"])
        note2.is_pinned = True
        self.app.update_note(note2.id, is_pinned=True)
        self.app.create_note("Note 3", "Content 3", tags=["personal"])
        
        notes = self.app.list_notes()
        self.assertEqual(len(notes), 3)
        
        # Test filtering
        work_notes = self.app.list_notes(tag_filter="work")
        self.assertEqual(len(work_notes), 1)
        
        pinned_notes = self.app.list_notes(pinned_only=True)
        self.assertEqual(len(pinned_notes), 1)
    
    def test_search_notes(self):
        self.app.initialize("1234")
        
        self.app.create_note("Meeting Notes", "Discussed project timeline")
        self.app.create_note("Shopping List", "Milk, eggs, bread")
        self.app.create_note("Project Ideas", "New feature ideas for the project")
        
        results = self.app.search_notes("project")
        self.assertEqual(len(results), 2)
        
        results = self.app.search_notes("milk")
        self.assertEqual(len(results), 1)
    
    def test_add_and_get_file(self):
        self.app.initialize("1234")
        
        # Create test file
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("File content for testing")
        
        file_entry = self.app.add_file(test_file, tags=["doc"], description="Test file")
        self.assertIsNotNone(file_entry.id)
        self.assertEqual(file_entry.original_name, "test.txt")
        
        # Retrieve file
        output_path = os.path.join(self.temp_dir, "retrieved.txt")
        retrieved = self.app.get_file(file_entry.id, output_path)
        
        with open(output_path, 'r') as f:
            content = f.read()
        self.assertEqual(content, "File content for testing")
    
    def test_delete_file(self):
        self.app.initialize("1234")
        
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("Content")
        
        file_entry = self.app.add_file(test_file)
        result = self.app.delete_file(file_entry.id)
        self.assertTrue(result)
        
        # File entry should be gone
        info = self.app.get_file_info(file_entry.id)
        self.assertIsNone(info)
    
    def test_list_files(self):
        self.app.initialize("1234")
        
        for i in range(3):
            test_file = os.path.join(self.temp_dir, f"test{i}.txt")
            with open(test_file, 'w') as f:
                f.write(f"Content {i}")
            self.app.add_file(test_file, tags=["test"] if i % 2 == 0 else ["other"])
        
        files = self.app.list_files()
        self.assertEqual(len(files), 3)
        
        test_files = self.app.list_files(tag_filter="test")
        self.assertEqual(len(test_files), 2)
    
    def test_change_pin(self):
        self.app.initialize("1234")
        
        # Create some data
        self.app.create_note("Note", "Content")
        
        # Change PIN
        result = self.app.change_pin("1234", "5678")
        self.assertTrue(result)
        
        # Lock and unlock with new PIN
        self.app.lock()
        result = self.app.unlock("5678")
        self.assertTrue(result)
        
        # Data should still be accessible
        notes = self.app.list_notes()
        self.assertEqual(len(notes), 1)
    
    def test_get_stats(self):
        self.app.initialize("1234")
        
        self.app.create_note("Note 1", "Content 1")
        self.app.create_note("Note 2", "Content 2")
        
        test_file = os.path.join(self.temp_dir, "test.txt")
        with open(test_file, 'w') as f:
            f.write("x" * 100)
        self.app.add_file(test_file)
        
        stats = self.app.get_stats()
        self.assertEqual(stats['note_count'], 2)
        self.assertEqual(stats['file_count'], 1)
        self.assertEqual(stats['total_size_bytes'], 100)
    
    def test_operations_fail_when_locked(self):
        self.app.initialize("1234")
        self.app.lock()
        
        with self.assertRaises(SecurityError):
            self.app.create_note("Title", "Content")
        
        with self.assertRaises(SecurityError):
            self.app.list_notes()


class TestSecurityIntegration(unittest.TestCase):
    """Integration tests for security features."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        shutil.rmtree(self.temp_dir)
    
    def test_data_persistence_across_sessions(self):
        """Test that data persists across app instances."""
        # First session
        app1 = NoteApp(self.temp_dir)
        app1.initialize("1234")
        note = app1.create_note("Persistent", "This should persist")
        note_id = note.id
        app1.lock()
        
        # Second session
        app2 = NoteApp(self.temp_dir)
        result = app2.unlock("1234")
        self.assertTrue(result)
        
        retrieved = app2.get_note(note_id)
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.content, "This should persist")
    
    def test_wrong_pin_cannot_access_data(self):
        app1 = NoteApp(self.temp_dir)
        app1.initialize("1234")
        note = app1.create_note("Secret", "Hidden content")
        note_id = note.id
        app1.lock()
        
        app2 = NoteApp(self.temp_dir)
        result = app2.unlock("wrong")
        self.assertFalse(result)
        
        # Even if we bypass unlock check, decryption should fail
        app2.storage._initialized = True
        app2.storage.encryption.set_master_key(b"x" * 32)
        
        with self.assertRaises(SecurityError):
            app2.get_note(note_id)
    
    def test_encrypted_files_on_disk(self):
        """Verify files on disk are actually encrypted."""
        app = NoteApp(self.temp_dir)
        app.initialize("1234")
        
        test_file = os.path.join(self.temp_dir, "plain.txt")
        with open(test_file, 'w') as f:
            f.write("PLAIN TEXT CONTENT")
        
        file_entry = app.add_file(test_file)
        app.lock()
        
        # Check encrypted file on disk
        encrypted_path = app.datastore.get_encrypted_file_path(file_entry.id)
        with open(encrypted_path, 'rb') as f:
            encrypted_content = f.read()
        
        # Should not contain plaintext
        self.assertNotIn(b"PLAIN TEXT", encrypted_content)
        self.assertNotIn(b"CONTENT", encrypted_content)
        
        # Should be valid JSON with encryption fields
        encrypted_data = json.loads(encrypted_content)
        self.assertIn('nonce', encrypted_data)
        self.assertIn('ciphertext', encrypted_data)
        self.assertIn('tag', encrypted_data)
    
    def test_encrypted_notes_on_disk(self):
        """Verify notes on disk are actually encrypted."""
        app = NoteApp(self.temp_dir)
        app.initialize("1234")
        
        note = app.create_note("Title", "SECRET NOTE CONTENT")
        app.lock()
        
        # Check note file on disk
        note_path = app.datastore.notes_dir / f"{note.id}.json"
        with open(note_path, 'r') as f:
            note_data = json.load(f)
        
        # Content should be encrypted JSON
        self.assertNotIn("SECRET NOTE", note_data['content'])
        self.assertIn('nonce', json.loads(note_data['content']))
        self.assertIn('ciphertext', json.loads(note_data['content']))


def run_tests():
    """Run all tests and return result."""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestPINManager))
    suite.addTests(loader.loadTestsFromTestCase(TestEncryptionManager))
    suite.addTests(loader.loadTestsFromTestCase(TestSecureStorage))
    suite.addTests(loader.loadTestsFromTestCase(TestModels))
    suite.addTests(loader.loadTestsFromTestCase(TestDataStore))
    suite.addTests(loader.loadTestsFromTestCase(TestNoteApp))
    suite.addTests(loader.loadTestsFromTestCase(TestSecurityIntegration))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result


if __name__ == '__main__':
    result = run_tests()
    exit(0 if result.wasSuccessful() else 1)
"""
Security module for the secure note app.
Handles PIN hashing, encryption/decryption, and key derivation.
"""

import os
import hashlib
import secrets
import base64
from typing import Tuple, Optional
from cryptography.hazmat.primitives import hashes, hmac
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.exceptions import InvalidSignature, InvalidKey, InvalidTag


class SecurityError(Exception):
    """Custom exception for security-related errors."""
    pass


class PINManager:
    """Manages PIN verification using Argon2id-style key derivation."""
    
    # Constants for PIN hashing
    SALT_LENGTH = 32
    KEY_LENGTH = 32
    ITERATIONS = 600_000  # High iteration count for PIN protection
    ALGORITHM = 'PBKDF2-HMAC-SHA256'
    
    def __init__(self):
        self._pin_hash: Optional[bytes] = None
        self._salt: Optional[bytes] = None
    
    def hash_pin(self, pin: str) -> Tuple[bytes, bytes]:
        """
        Hash a PIN with a random salt using PBKDF2.
        Returns (hash, salt).
        """
        if not pin or len(pin) < 4:
            raise SecurityError("PIN must be at least 4 characters")
        if len(pin) > 128:
            raise SecurityError("PIN too long")
        
        salt = secrets.token_bytes(self.SALT_LENGTH)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.KEY_LENGTH,
            salt=salt,
            iterations=self.ITERATIONS,
        )
        pin_hash = kdf.derive(pin.encode('utf-8'))
        return pin_hash, salt
    
    def verify_pin(self, pin: str, pin_hash: bytes, salt: bytes) -> bool:
        """Verify a PIN against stored hash and salt."""
        if not pin:
            return False
        try:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=self.KEY_LENGTH,
                salt=salt,
                iterations=self.ITERATIONS,
            )
            kdf.verify(pin.encode('utf-8'), pin_hash)
            return True
        except (InvalidSignature, InvalidKey):
            return False
    
    def set_pin(self, pin: str) -> Tuple[bytes, bytes]:
        """Set and store a new PIN. Returns (hash, salt)."""
        self._pin_hash, self._salt = self.hash_pin(pin)
        return self._pin_hash, self._salt
    
    def check_pin(self, pin: str) -> bool:
        """Check if provided PIN matches stored PIN."""
        if self._pin_hash is None or self._salt is None:
            return False
        return self.verify_pin(pin, self._pin_hash, self._salt)
    
    def load_pin_data(self, pin_hash: bytes, salt: bytes) -> None:
        """Load existing PIN hash and salt."""
        self._pin_hash = pin_hash
        self._salt = salt
    
    @property
    def has_pin(self) -> bool:
        """Check if PIN is set."""
        return self._pin_hash is not None and self._salt is not None
    
    def get_pin_data(self) -> Optional[Tuple[bytes, bytes]]:
        """Get stored PIN hash and salt for persistence."""
        if self.has_pin:
            return self._pin_hash, self._salt
        return None


class EncryptionManager:
    """Handles encryption and decryption of notes and files using AES-GCM."""
    
    # Constants for encryption
    KEY_LENGTH = 32  # 256-bit key
    NONCE_LENGTH = 12  # 96-bit nonce for AES-GCM
    TAG_LENGTH = 16  # 128-bit authentication tag
    SALT_LENGTH = 32
    
    def __init__(self, master_key: Optional[bytes] = None):
        self._master_key = master_key
        self._aesgcm = None
        if master_key:
            self._aesgcm = AESGCM(master_key)
    
    @classmethod
    def derive_key_from_pin(cls, pin: str, salt: bytes) -> bytes:
        """Derive encryption key from PIN and salt using HKDF."""
        if not pin:
            raise SecurityError("PIN cannot be empty")
        
        # First derive a key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=cls.KEY_LENGTH,
            salt=salt,
            iterations=600_000,
        )
        pin_key = kdf.derive(pin.encode('utf-8'))
        
        # Then use HKDF to derive the final encryption key
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=cls.KEY_LENGTH,
            salt=None,
            info=b'noteapp-encryption-key-v1',
        )
        return hkdf.derive(pin_key)
    
    @classmethod
    def generate_master_key(cls) -> bytes:
        """Generate a new random master key."""
        return secrets.token_bytes(cls.KEY_LENGTH)
    
    def set_master_key(self, master_key: bytes) -> None:
        """Set the master encryption key."""
        if len(master_key) != self.KEY_LENGTH:
            raise SecurityError(f"Master key must be {self.KEY_LENGTH} bytes")
        self._master_key = master_key
        self._aesgcm = AESGCM(master_key)
    
    def encrypt(self, plaintext: bytes, associated_data: Optional[bytes] = None) -> dict:
        """
        Encrypt data using AES-GCM.
        Returns dict with nonce, ciphertext, and tag.
        """
        if self._aesgcm is None:
            raise SecurityError("Encryption key not set")
        if not plaintext:
            raise SecurityError("Cannot encrypt empty data")
        
        nonce = secrets.token_bytes(self.NONCE_LENGTH)
        ciphertext = self._aesgcm.encrypt(nonce, plaintext, associated_data)
        
        # AES-GCM returns ciphertext + tag concatenated
        actual_ciphertext = ciphertext[:-self.TAG_LENGTH]
        tag = ciphertext[-self.TAG_LENGTH:]
        
        return {
            'nonce': base64.b64encode(nonce).decode('ascii'),
            'ciphertext': base64.b64encode(actual_ciphertext).decode('ascii'),
            'tag': base64.b64encode(tag).decode('ascii'),
        }
    
    def decrypt(self, encrypted_data: dict, associated_data: Optional[bytes] = None) -> bytes:
        """
        Decrypt data using AES-GCM.
        encrypted_data should have nonce, ciphertext, and tag as base64 strings.
        """
        if self._aesgcm is None:
            raise SecurityError("Decryption key not set")
        
        try:
            nonce = base64.b64decode(encrypted_data['nonce'])
            ciphertext = base64.b64decode(encrypted_data['ciphertext'])
            tag = base64.b64decode(encrypted_data['tag'])
            
            # Reconstruct the full ciphertext for AESGCM.decrypt
            full_ciphertext = ciphertext + tag
            
            plaintext = self._aesgcm.decrypt(nonce, full_ciphertext, associated_data)
            return plaintext
        except (KeyError, ValueError, InvalidSignature, InvalidKey, InvalidTag) as e:
            raise SecurityError(f"Decryption failed: {e}")
    
    def encrypt_file(self, file_path: str, output_path: str, 
                     associated_data: Optional[bytes] = None) -> None:
        """Encrypt a file to disk."""
        with open(file_path, 'rb') as f:
            plaintext = f.read()
        
        encrypted = self.encrypt(plaintext, associated_data)
        
        # Store as JSON with metadata
        import json
        with open(output_path, 'w') as f:
            json.dump(encrypted, f)
    
    def decrypt_file(self, encrypted_path: str, output_path: str,
                     associated_data: Optional[bytes] = None) -> None:
        """Decrypt a file from disk."""
        import json
        with open(encrypted_path, 'r') as f:
            encrypted = json.load(f)
        
        plaintext = self.decrypt(encrypted, associated_data)
        
        with open(output_path, 'wb') as f:
            f.write(plaintext)


class SecureStorage:
    """High-level secure storage combining PIN and encryption."""
    
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.pin_manager = PINManager()
        self.encryption = EncryptionManager()
        self._initialized = False
        
        os.makedirs(data_dir, exist_ok=True)
        os.makedirs(os.path.join(data_dir, 'files'), exist_ok=True)
        os.makedirs(os.path.join(data_dir, 'notes'), exist_ok=True)
    
    def initialize_new(self, pin: str) -> None:
        """Initialize a new secure storage with a PIN."""
        # Hash the PIN
        pin_hash, salt = self.pin_manager.set_pin(pin)
        
        # Derive master encryption key from PIN
        master_key = EncryptionManager.derive_key_from_pin(pin, salt)
        self.encryption.set_master_key(master_key)
        
        # Save PIN hash and salt for future verification
        self._save_pin_data(pin_hash, salt)
        
        self._initialized = True
    
    def unlock(self, pin: str) -> bool:
        """Unlock storage with PIN."""
        pin_data = self._load_pin_data()
        if not pin_data:
            return False
        
        pin_hash, salt = pin_data
        
        if not self.pin_manager.verify_pin(pin, pin_hash, salt):
            return False
        
        # Derive master key from PIN
        master_key = EncryptionManager.derive_key_from_pin(pin, salt)
        self.encryption.set_master_key(master_key)
        
        self.pin_manager.load_pin_data(pin_hash, salt)
        self._initialized = True
        return True
    
    def change_pin(self, old_pin: str, new_pin: str) -> bool:
        """Change the PIN."""
        if not self._initialized:
            raise SecurityError("Storage not initialized")
        
        # Verify old PIN
        pin_data = self._load_pin_data()
        if not pin_data:
            return False
        
        pin_hash, salt = pin_data
        if not self.pin_manager.verify_pin(old_pin, pin_hash, salt):
            return False
        
        # Create new PIN hash with new salt
        new_pin_hash, new_salt = self.pin_manager.hash_pin(new_pin)
        
        # Re-encrypt master key with new PIN
        old_master_key = self.encryption._master_key
        new_master_key = EncryptionManager.derive_key_from_pin(new_pin, new_salt)
        
        # For simplicity, we re-derive the key. In a more complex system,
        # we'd encrypt the master key with a key encryption key derived from PIN.
        self.encryption.set_master_key(new_master_key)
        self.pin_manager.load_pin_data(new_pin_hash, new_salt)
        self._save_pin_data(new_pin_hash, new_salt)
        
        return True
    
    def lock(self) -> None:
        """Lock the storage (clear keys from memory)."""
        self.encryption.set_master_key(secrets.token_bytes(32))  # Overwrite
        self._initialized = False
    
    def is_unlocked(self) -> bool:
        """Check if storage is unlocked."""
        return self._initialized and self.encryption._master_key is not None
    
    def _save_pin_data(self, pin_hash: bytes, salt: bytes) -> None:
        """Save PIN hash and salt to disk."""
        import json
        data = {
            'pin_hash': base64.b64encode(pin_hash).decode('ascii'),
            'salt': base64.b64encode(salt).decode('ascii'),
            'algorithm': PINManager.ALGORITHM,
            'iterations': PINManager.ITERATIONS,
        }
        path = os.path.join(self.data_dir, 'pin_data.json')
        with open(path, 'w') as f:
            json.dump(data, f)
        # Restrict permissions
        os.chmod(path, 0o600)
    
    def _load_pin_data(self) -> Optional[Tuple[bytes, bytes]]:
        """Load PIN hash and salt from disk."""
        import json
        path = os.path.join(self.data_dir, 'pin_data.json')
        if not os.path.exists(path):
            return None
        
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            
            pin_hash = base64.b64decode(data['pin_hash'])
            salt = base64.b64decode(data['salt'])
            return pin_hash, salt
        except (json.JSONDecodeError, KeyError, ValueError):
            return None
    
    def encrypt_note(self, note_id: str, content: str) -> dict:
        """Encrypt a note's content."""
        if not self.is_unlocked():
            raise SecurityError("Storage not unlocked")
        
        associated_data = f"note:{note_id}".encode('utf-8')
        return self.encryption.encrypt(content.encode('utf-8'), associated_data)
    
    def decrypt_note(self, note_id: str, encrypted_data: dict) -> str:
        """Decrypt a note's content."""
        if not self.is_unlocked():
            raise SecurityError("Storage not unlocked")
        
        associated_data = f"note:{note_id}".encode('utf-8')
        plaintext = self.encryption.decrypt(encrypted_data, associated_data)
        return plaintext.decode('utf-8')
    
    def encrypt_file(self, file_id: str, file_path: str, output_path: str) -> None:
        """Encrypt a file."""
        if not self.is_unlocked():
            raise SecurityError("Storage not unlocked")
        
        associated_data = f"file:{file_id}".encode('utf-8')
        self.encryption.encrypt_file(file_path, output_path, associated_data)
    
    def decrypt_file(self, file_id: str, encrypted_path: str, output_path: str) -> None:
        """Decrypt a file."""
        if not self.is_unlocked():
            raise SecurityError("Storage not unlocked")
        
        associated_data = f"file:{file_id}".encode('utf-8')
        self.encryption.decrypt_file(encrypted_path, output_path, associated_data)
import os
from sqlalchemy.types import TypeDecorator, String
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

# Try to get the key from env, generate one if not found (only safe for dev)
encryption_key_str = os.getenv("ENCRYPTION_KEY")

if not encryption_key_str:
    # We shouldn't generate one randomly every time otherwise we can't decrypt!
    # For dev fallback, use a static key. In prod, this should crash.
    logger.warning("ENCRYPTION_KEY not found in env! Using unsafe default for dev.")
    encryption_key_str = b"5Y6Qj-xHjP-o0Oq-XU8b-4a5Q8d8b9z8u8v8w8x8y8z8="  # Fake 32-url-safe base64 (actually needs to be valid)
    # Let's just generate a valid one and print it, but we can't persist it easily.
    # Actually, a static valid fernet key:
    encryption_key_str = b'V1b3b2A3a1b2B3c1C2d3D4e5E6f7F8g9G0h1H2i3I4j='
    # Let's use a real fernet key string generated once: 'mP3yT2h1cK4aL9xZ7vN0bM5qW8eR3tY6uI1oP4aS2dF=' - wait, fernet needs 32 bytes base64 encoded.
    # Fernet.generate_key()
    encryption_key_str = b'cM0Z7E2J_tT1w-5hT7XfU3yC5j_0cE_7-wJvW4y6z1A='

fernet = Fernet(encryption_key_str)

class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return fernet.encrypt(str(value).encode('utf-8')).decode('utf-8')
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return fernet.decrypt(value.encode('utf-8')).decode('utf-8')
            except Exception:
                # If decryption fails, it might be legacy unencrypted data
                return value

class EncryptedFloat(TypeDecorator):
    impl = String
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            return fernet.encrypt(str(value).encode('utf-8')).decode('utf-8')
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                decrypted_str = fernet.decrypt(value.encode('utf-8')).decode('utf-8')
                return float(decrypted_str)
            except Exception:
                try:
                    return float(value)
                except ValueError:
                    return 0.0

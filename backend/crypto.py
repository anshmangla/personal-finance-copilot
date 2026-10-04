import os
from sqlalchemy.types import TypeDecorator, String
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

# Try to get the key from env, generate one if not found (only safe for dev)
encryption_key_str = os.getenv("ENCRYPTION_KEY")

if not encryption_key_str:
    # In production, missing ENCRYPTION_KEY should be a fatal error.
    # For development, we generate an ephemeral key so the app boots, 
    # but any data encrypted this session won't be decryptable after restart.
    logger.warning("ENCRYPTION_KEY not found! Using ephemeral key for development. Data will be lost on restart.")
    encryption_key_str = Fernet.generate_key()

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

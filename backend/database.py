import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Read DATABASE_URL from environment (or default to local SQLite for offline development)
raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./local_finance.db")

# SQLAlchemy requires postgresql:// instead of postgres://
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

DATABASE_URL = raw_db_url

# Configure engine connection parameters
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Neon / PostgreSQL settings: enable connection pooling with auto-reconnect
    connect_args = {
        "sslmode": "require"
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # checks liveness before giving connection (crucial for Neon serverless)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI dependency to yield a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables in PostgreSQL / SQLite if they do not exist."""
    import models  # ensure models are registered with Base.metadata
    Base.metadata.create_all(bind=engine)

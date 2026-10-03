import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Read DATABASE_URL from environment (or default to local SQLite for offline development)
raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./local_finance.db")

# In SQLAlchemy 2.0+, 'postgresql://' defaults to psycopg v3.
# Explicitly use postgresql+psycopg2:// to match psycopg2-binary
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+"):
    raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

DATABASE_URL = raw_db_url

engine_kwargs = {
    "pool_pre_ping": True, # checks liveness before giving connection (crucial for Neon serverless)
}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(DATABASE_URL, **engine_kwargs)

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

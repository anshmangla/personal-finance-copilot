import os
from datetime import datetime, timedelta
from typing import Optional

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session

from database import get_db
from models import User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "personal_finance_copilot_dev_secret_key_123")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

security = HTTPBearer()

def verify_google_token(token: str) -> dict:
    """Verifies a Google ID token and returns the user's profile dict."""
    try:
        request = google_requests.Request()
        # If GOOGLE_CLIENT_ID is set, verify against it; otherwise verify signature without audience check
        audience = GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
        id_info = id_token.verify_oauth2_token(token, request, audience=audience)
        
        email = id_info.get("email")
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token does not contain email")
            
        return {
            "google_id": id_info.get("sub"),
            "email": email,
            "name": id_info.get("name", email.split("@")[0]),
            "picture": id_info.get("picture", ""),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {str(e)}"
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates an encoded JWT token for the user session."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=JWT_EXPIRATION_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI dependency to extract and validate the authenticated user from the Bearer token."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_user_from_header_or_query(
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> User:
    """Dependency supporting both Authorization: Bearer <token> and ?token=<token> (useful for direct file downloads)."""
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(raw_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


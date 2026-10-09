"""
Authentication API for CrowdSentinel AI.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select

from config import settings
from database import AsyncSessionLocal
from models import User
from schemas import LoginRequest, TokenResponse, UserResponse


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def create_access_token(user_id: int, role: str) -> str:
    """Create a signed JWT access token."""

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Authenticate a user and return an access token."""

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == credentials.email.strip())
        )

        user = result.scalar_one_or_none()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        try:
            password_is_valid = pwd_context.verify(
                credentials.password,
                user.password_hash,
            )
        except (ValueError, TypeError):
            password_is_valid = False

        if not password_is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        access_token = create_access_token(
            user_id=user.id,
            role=user.role,
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

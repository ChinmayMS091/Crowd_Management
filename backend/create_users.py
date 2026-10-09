"""
Create initial development users for Crowd Management AI.

Run from the backend directory:
    python create_users.py
"""

import asyncio
import getpass

from passlib.context import CryptContext
from sqlalchemy import select

from database import AsyncSessionLocal
from models import User


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)

USERS = [
    {
        "email": "owner@gmail.com",
        "full_name": "System Owner",
        "role": "owner",
    },
    {
        "email": "head@gmail.com",
        "full_name": "Security Head",
        "role": "security_head",
    },
    {
        "email": "guard@gmail.com",
        "full_name": "Security Guard",
        "role": "security_guard",
    },
]


async def create_users():
    async with AsyncSessionLocal() as session:
        for user_data in USERS:
            result = await session.execute(
                select(User).where(
                    User.email == user_data["email"]
                )
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                print(
                    f"Already exists: {user_data['email']} "
                    f"({existing_user.role})"
                )
                continue

            print(f"\nCreate account: {user_data['email']}")
            password = getpass.getpass("Set a password: ")
            confirmation = getpass.getpass("Confirm password: ")

            if password != confirmation:
                print("Passwords do not match. Account skipped.")
                continue

            if len(password) < 12:
                print("Use at least 12 characters. Account skipped.")
                continue

            if len(password.encode("utf-8")) > 72:
                print("Password exceeds bcrypt's 72-byte limit. Account skipped.")
                continue

            user = User(
                email=user_data["email"],
                password_hash=pwd_context.hash(password),
                full_name=user_data["full_name"],
                role=user_data["role"],
                is_active=True,
            )

            session.add(user)

            try:
                await session.commit()
                print(f"Created: {user_data['email']}")
            except Exception:
                await session.rollback()
                raise

    print("\nUser creation process finished.")


if __name__ == "__main__":
    asyncio.run(create_users())

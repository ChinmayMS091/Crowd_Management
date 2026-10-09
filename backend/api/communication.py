
"""
Communication API for Owner, Security Head, and Security Guard.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth_dependencies import get_current_user
from database import get_db
from models import Message, User
from schemas import MessageCreate


router = APIRouter(
    prefix="/api/communication",
    tags=["Communication"],
)


def can_access_channel(role: str, channel: str) -> bool:
    """Check whether a role can access a communication channel."""

    permissions = {
        "owner": {"owner_head"},
        "security_head": {"owner_head", "head_guards"},
        "security_guard": {"head_guards"},
    }

    return channel in permissions.get(role, set())


@router.get("/messages")
async def get_messages(
    channel: str = Query(..., min_length=1, max_length=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve messages from a channel the user can access."""

    if not can_access_channel(current_user.role, channel):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this channel",
        )

    result = await db.execute(
        select(Message, User.full_name)
        .join(User, Message.sender_id == User.id)
        .where(Message.channel == channel)
        .order_by(Message.created_at.asc(), Message.id.asc())
    )

    rows = result.all()

    return [
        {
            "id": message.id,
            "sender_id": message.sender_id,
            "channel": message.channel,
            "content": message.content,
            "created_at": message.created_at,
            "sender_name": sender_name,
        }
        for message, sender_name in rows
    ]


@router.post("/messages", status_code=201)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to an authorized channel."""

    if not can_access_channel(current_user.role, message_data.channel):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to send messages to this channel",
        )

    content = message_data.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="Message content cannot be empty",
        )

    message = Message(
        sender_id=current_user.id,
        channel=message_data.channel,
        content=content,
    )

    db.add(message)
    await db.commit()
    await db.refresh(message)

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "channel": message.channel,
        "content": message.content,
        "created_at": message.created_at,
        "sender_name": current_user.full_name,
    }

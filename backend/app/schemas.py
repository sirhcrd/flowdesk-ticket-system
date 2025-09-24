from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

from .models import UserRole, TicketStatus, TicketPriority

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: Optional[UserRole] = UserRole.USER

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Tag schemas
class TagBase(BaseModel):
    name: str
    color: Optional[str] = "#6B7280"

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Comment schemas
class CommentBase(BaseModel):
    content: str
    is_internal: Optional[bool] = False

class CommentCreate(CommentBase):
    ticket_id: int

class CommentResponse(CommentBase):
    id: int
    ticket_id: int
    author_id: int
    author: UserResponse
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Ticket schemas
class TicketBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[TicketStatus] = TicketStatus.OPEN
    priority: Optional[TicketPriority] = TicketPriority.MEDIUM

class TicketCreate(TicketBase):
    assignee_id: Optional[int] = None
    tag_ids: Optional[List[int]] = []

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assignee_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None

class TicketResponse(TicketBase):
    id: int
    creator_id: int
    assignee_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    # Relationships
    creator: UserResponse
    assignee: Optional[UserResponse] = None
    comments: List[CommentResponse] = []
    tags: List[TagResponse] = []
    
    class Config:
        from_attributes = True

class TicketListResponse(BaseModel):
    id: int
    title: str
    status: TicketStatus
    priority: TicketPriority
    creator: UserResponse
    assignee: Optional[UserResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tags: List[TagResponse] = []
    comment_count: int = 0
    
    class Config:
        from_attributes = True

# WebSocket message schemas
class WSMessage(BaseModel):
    type: str  # "ticket_created", "ticket_updated", "comment_added", etc.
    data: dict
    user_id: Optional[int] = None
    timestamp: datetime = datetime.utcnow()
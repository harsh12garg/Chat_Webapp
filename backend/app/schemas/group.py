from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserResponse

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    group_picture: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupMemberBase(BaseModel):
    user_id: str
    is_admin: bool = False

class GroupMemberCreate(GroupMemberBase):
    pass

class GroupMemberResponse(GroupMemberBase):
    id: str
    group_id: str
    joined_at: datetime
    user: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

class GroupResponse(GroupBase):
    id: str
    created_by: str
    created_at: datetime
    members: Optional[List[GroupMemberResponse]] = None
    
    class Config:
        from_attributes = True

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    group_picture: Optional[str] = None

class GroupList(BaseModel):
    groups: list[GroupResponse]
    total: int 
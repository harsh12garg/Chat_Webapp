from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserResponse(BaseModel):
    id: str
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None

class UserProfileResponse(UserResponse):
    pass

class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int 
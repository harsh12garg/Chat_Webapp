from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.message import MessageStatus, MessageType

class MessageBase(BaseModel):
    content: str
    message_type: MessageType = MessageType.TEXT
    file_url: Optional[str] = None

class MessageCreate(MessageBase):
    receiver_id: Optional[str] = None
    group_id: Optional[str] = None
    
    class Config:
        use_enum_values = True

class MessageResponse(MessageBase):
    id: str
    sender_id: str
    receiver_id: Optional[str] = None
    group_id: Optional[str] = None
    status: MessageStatus
    created_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True

class MessageUpdate(BaseModel):
    status: MessageStatus
    
    class Config:
        use_enum_values = True

class MessageList(BaseModel):
    messages: list[MessageResponse]
    total: int

class WebSocketMessage(BaseModel):
    type: str  # message, typing, read_receipt, etc.
    data: dict

class FileUploadResponse(BaseModel):
    file_url: str 
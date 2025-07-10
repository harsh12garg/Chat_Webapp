from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
import enum

class MessageStatus(enum.Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class MessageType(enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    FILE = "file"

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    group_id = Column(String(36), ForeignKey("groups.id"), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    file_url = Column(String(255), nullable=True)
    status = Column(Enum(MessageStatus), default=MessageStatus.SENT)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    group = relationship("Group", back_populates="messages")
    
    def __repr__(self):
        return f"<Message {self.id}>" 
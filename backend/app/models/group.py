from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    group_picture = Column(String(255), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    members = relationship("GroupMember", back_populates="group")
    messages = relationship("Message", back_populates="group")
    
    def __repr__(self):
        return f"<Group {self.name}>"

class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String(36), ForeignKey("groups.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")
    
    def __repr__(self):
        return f"<GroupMember {self.user_id} in {self.group_id}>" 
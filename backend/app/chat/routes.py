from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    MessageCreate, MessageResponse, MessageUpdate, 
    MessageList, WebSocketMessage, FileUploadResponse
)
from app.models import User, Message, MessageStatus, MessageType, Group
from app.auth.security import get_current_active_user, get_current_user
from app.redis_client import set_user_online, set_user_offline, is_user_online
from typing import List, Optional, Dict
import json
import uuid
import boto3
from app.config import settings
from datetime import datetime
import asyncio

router = APIRouter()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        set_user_online(user_id)
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        set_user_offline(user_id)
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

# WebSocket endpoint
@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    try:
        # Authenticate user from token
        user = await get_current_user(token=token, db=db)
        
        # Connect to WebSocket
        await manager.connect(websocket, user.id)
        
        try:
            while True:
                # Receive message from WebSocket
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Process message based on type
                if message_data["type"] == "message":
                    # Create new message
                    message_create = MessageCreate(
                        content=message_data["data"]["content"],
                        message_type=message_data["data"].get("message_type", MessageType.TEXT),
                        file_url=message_data["data"].get("file_url"),
                        receiver_id=message_data["data"].get("receiver_id"),
                        group_id=message_data["data"].get("group_id")
                    )
                    
                    # Save message to database
                    db_message = Message(
                        id=str(uuid.uuid4()),
                        sender_id=user.id,
                        receiver_id=message_create.receiver_id,
                        group_id=message_create.group_id,
                        content=message_create.content,
                        message_type=message_create.message_type,
                        file_url=message_create.file_url,
                        status=MessageStatus.SENT
                    )
                    
                    db.add(db_message)
                    db.commit()
                    db.refresh(db_message)
                    
                    # Prepare response
                    response = {
                        "type": "message",
                        "data": {
                            "id": db_message.id,
                            "sender_id": db_message.sender_id,
                            "receiver_id": db_message.receiver_id,
                            "group_id": db_message.group_id,
                            "content": db_message.content,
                            "message_type": db_message.message_type.value,
                            "file_url": db_message.file_url,
                            "status": db_message.status.value,
                            "created_at": db_message.created_at.isoformat()
                        }
                    }
                    
                    # Send message to receiver if online
                    if db_message.receiver_id:
                        await manager.send_personal_message(response, db_message.receiver_id)
                        
                        # Update message status to delivered
                        if is_user_online(db_message.receiver_id):
                            db_message.status = MessageStatus.DELIVERED
                            db.commit()
                    
                    # Send message to group members if it's a group message
                    elif db_message.group_id:
                        # Get all group members
                        group = db.query(Group).filter(Group.id == db_message.group_id).first()
                        if group:
                            for member in group.members:
                                if member.user_id != user.id:  # Don't send to sender
                                    await manager.send_personal_message(response, member.user_id)
                    
                    # Send confirmation to sender
                    await manager.send_personal_message(response, user.id)
                
                elif message_data["type"] == "typing":
                    # Send typing status
                    receiver_id = message_data["data"]["receiver_id"]
                    typing_status = {
                        "type": "typing",
                        "data": {
                            "sender_id": user.id,
                            "receiver_id": receiver_id,
                            "is_typing": message_data["data"]["is_typing"]
                        }
                    }
                    await manager.send_personal_message(typing_status, receiver_id)
                
                elif message_data["type"] == "read_receipt":
                    # Update message status to read
                    message_id = message_data["data"]["message_id"]
                    message = db.query(Message).filter(Message.id == message_id).first()
                    
                    if message and message.receiver_id == user.id:
                        message.status = MessageStatus.READ
                        db.commit()
                        
                        # Send read receipt to sender
                        read_receipt = {
                            "type": "read_receipt",
                            "data": {
                                "message_id": message_id,
                                "reader_id": user.id
                            }
                        }
                        await manager.send_personal_message(read_receipt, message.sender_id)
        
        except WebSocketDisconnect:
            manager.disconnect(user.id)
        
    except Exception as e:
        await websocket.close(code=1008)

# Get chat history with a specific user
@router.get("/messages/{user_id}", response_model=MessageList)
async def get_chat_history(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get messages between current user and specified user
    messages = db.query(Message).filter(
        (
            (Message.sender_id == current_user.id) & 
            (Message.receiver_id == user_id)
        ) | (
            (Message.sender_id == user_id) & 
            (Message.receiver_id == current_user.id)
        )
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    
    # Count total messages
    total = db.query(Message).filter(
        (
            (Message.sender_id == current_user.id) & 
            (Message.receiver_id == user_id)
        ) | (
            (Message.sender_id == user_id) & 
            (Message.receiver_id == current_user.id)
        )
    ).count()
    
    # Mark received messages as read
    for message in messages:
        if message.receiver_id == current_user.id and message.status != MessageStatus.READ:
            message.status = MessageStatus.READ
    
    db.commit()
    
    return {"messages": messages, "total": total}

# Get group chat history
@router.get("/groups/{group_id}/messages", response_model=MessageList)
async def get_group_chat_history(
    group_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is a member of the group
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    is_member = any(member.user_id == current_user.id for member in group.members)
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Get group messages
    messages = db.query(Message).filter(
        Message.group_id == group_id
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()
    
    # Count total messages
    total = db.query(Message).filter(Message.group_id == group_id).count()
    
    return {"messages": messages, "total": total}

# Upload file for chat
@router.post("/upload-file", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"chat_files/{current_user.id}/{uuid.uuid4()}.{file_extension}"
        
        # Upload file to S3
        s3_client.upload_fileobj(
            file.file,
            settings.AWS_BUCKET_NAME,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )
        
        # Generate S3 URL
        file_url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
        
        return {"file_url": file_url}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        ) 
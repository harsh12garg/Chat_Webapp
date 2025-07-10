from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import UserResponse, UserUpdate, UserProfileResponse, UserListResponse
from app.models import User
from app.auth.security import get_current_active_user
from typing import List
import boto3
from app.config import settings
import uuid

router = APIRouter()

# Get current user profile
@router.get("/users/me", response_model=UserProfileResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    return current_user

# Update current user profile
@router.put("/users/me", response_model=UserProfileResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Update user fields
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

# Upload profile picture
@router.post("/users/me/upload-profile-picture", response_model=UserProfileResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, JPG, and PNG files are allowed"
        )
    
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
        unique_filename = f"profile_pictures/{current_user.id}/{uuid.uuid4()}.{file_extension}"
        
        # Upload file to S3
        s3_client.upload_fileobj(
            file.file,
            settings.AWS_BUCKET_NAME,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )
        
        # Generate S3 URL
        file_url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
        
        # Update user profile picture
        current_user.profile_picture = file_url
        db.commit()
        db.refresh(current_user)
        
        return current_user
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )

# Get all users
@router.get("/users", response_model=UserListResponse)
async def get_all_users(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    total = db.query(User).count()
    
    return {"users": users, "total": total}

# Get user by ID
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user 
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    GroupCreate, GroupResponse, GroupUpdate, 
    GroupList, GroupMemberCreate, GroupMemberResponse
)
from app.models import User, Group, GroupMember
from app.auth.security import get_current_active_user
import uuid
import boto3
from app.config import settings

router = APIRouter()

# Create a new group
@router.post("/groups", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Create new group
    group = Group(
        id=str(uuid.uuid4()),
        name=group_data.name,
        description=group_data.description,
        group_picture=group_data.group_picture,
        created_by=current_user.id
    )
    
    db.add(group)
    db.commit()
    db.refresh(group)
    
    # Add creator as admin member
    group_member = GroupMember(
        id=str(uuid.uuid4()),
        group_id=group.id,
        user_id=current_user.id,
        is_admin=True
    )
    
    db.add(group_member)
    db.commit()
    
    return group

# Get all groups for current user
@router.get("/groups", response_model=GroupList)
async def get_user_groups(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get all groups where user is a member
    user_group_members = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id
    ).all()
    
    group_ids = [member.group_id for member in user_group_members]
    
    # Get groups with pagination
    groups = db.query(Group).filter(
        Group.id.in_(group_ids)
    ).offset(skip).limit(limit).all()
    
    # Count total groups
    total = db.query(Group).filter(Group.id.in_(group_ids)).count()
    
    return {"groups": groups, "total": total}

# Get group by ID
@router.get("/groups/{group_id}", response_model=GroupResponse)
async def get_group_by_id(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is a member of the group
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    return group

# Update group
@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    group_update: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is an admin of the group
    is_admin = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_admin == True
    ).first()
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can update group details"
        )
    
    # Update group fields
    for field, value in group_update.dict(exclude_unset=True).items():
        setattr(group, field, value)
    
    db.commit()
    db.refresh(group)
    
    return group

# Upload group picture
@router.post("/groups/{group_id}/upload-picture", response_model=GroupResponse)
async def upload_group_picture(
    group_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is an admin of the group
    is_admin = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_admin == True
    ).first()
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can update group picture"
        )
    
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
        unique_filename = f"group_pictures/{group_id}/{uuid.uuid4()}.{file_extension}"
        
        # Upload file to S3
        s3_client.upload_fileobj(
            file.file,
            settings.AWS_BUCKET_NAME,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )
        
        # Generate S3 URL
        file_url = f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
        
        # Update group picture
        group.group_picture = file_url
        db.commit()
        db.refresh(group)
        
        return group
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )

# Add member to group
@router.post("/groups/{group_id}/members", response_model=GroupMemberResponse)
async def add_group_member(
    group_id: str,
    member_data: GroupMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if user is an admin of the group
    is_admin = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_admin == True
    ).first()
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can add members"
        )
    
    # Check if user to be added exists
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is already a member
    existing_member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == member_data.user_id
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )
    
    # Add user to group
    group_member = GroupMember(
        id=str(uuid.uuid4()),
        group_id=group_id,
        user_id=member_data.user_id,
        is_admin=member_data.is_admin
    )
    
    db.add(group_member)
    db.commit()
    db.refresh(group_member)
    
    return group_member

# Remove member from group
@router.delete("/groups/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_group_member(
    group_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if group exists
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check if current user is an admin of the group
    is_admin = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.is_admin == True
    ).first()
    
    # Check if member exists
    member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this group"
        )
    
    # Allow users to leave groups themselves
    if member.user_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can remove other members"
        )
    
    # Prevent removal of the last admin
    if member.is_admin:
        admin_count = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.is_admin == True
        ).count()
        
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin from the group"
            )
    
    # Remove member
    db.delete(member)
    db.commit()
    
    return None 
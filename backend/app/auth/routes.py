from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    UserCreate, UserLogin, Token, OTPRequest, 
    OTPVerify, PasswordReset, UserResponse
)
from app.models import User
from app.auth.security import (
    get_password_hash, verify_password, create_access_token
)
from app.redis_client import store_otp, get_otp, delete_otp
from app.celery_worker import get_celery_app
from app.tasks import send_email_otp, send_sms_otp
from datetime import timedelta
from app.config import settings
import uuid
import re

router = APIRouter()

# Helper function to check if input is email or phone
def is_email(contact: str) -> bool:
    email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(email_pattern, contact))

# Register new user
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if user already exists
    if user_data.email:
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    if user_data.phone_number:
        existing_user = db.query(User).filter(User.phone_number == user_data.phone_number).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        phone_number=user_data.phone_number,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        is_active=True,
        is_verified=False
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Automatically send OTP after registration
    try:
        if user.email:
            # Send email OTP
            background_tasks.add_task(send_email_otp, user.email, user.id)
        elif user.phone_number:
            # Send SMS OTP
            background_tasks.add_task(send_sms_otp, user.phone_number, user.id)
    except Exception as e:
        print(f"Error sending OTP after registration: {e}")
        # Continue even if OTP sending fails
    
    return user

# Login user - support both JSON and form data
@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Check if username is email or phone number
    username = form_data.username
    password = form_data.password
    
    if is_email(username):
        user = db.query(User).filter(User.email == username).first()
    else:
        user = db.query(User).filter(User.phone_number == username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is verified
    if not user.is_verified and settings.REQUIRE_VERIFICATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please verify your account first."
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

# Send OTP
@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_otp(otp_request: OTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    contact = otp_request.contact
    contact_type = otp_request.contact_type
    
    # Find user by contact
    if contact_type == "email":
        user = db.query(User).filter(User.email == contact).first()
    else:
        user = db.query(User).filter(User.phone_number == contact).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with this {contact_type} not found"
        )
    
    # Send OTP via email or SMS
    result = None
    try:
        if contact_type == "email":
            # Run synchronously for immediate feedback
            result = send_email_otp(contact, user.id)
        else:
            # Run synchronously for immediate feedback
            result = send_sms_otp(contact, user.id)
        
        if result and result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {result.get('message', 'Unknown error')}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send OTP: {str(e)}"
        )
    
    return {"message": f"OTP sent to your {contact_type}"}

# Verify OTP
@router.post("/verify-otp", status_code=status.HTTP_200_OK)
async def verify_otp(otp_verify: OTPVerify, db: Session = Depends(get_db)):
    contact = otp_verify.contact
    otp = otp_verify.otp
    
    # Find user by contact
    if is_email(contact):
        user = db.query(User).filter(User.email == contact).first()
    else:
        user = db.query(User).filter(User.phone_number == contact).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get stored OTP from Redis
    stored_otp = get_otp(user.id)
    
    if not stored_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or not found. Please request a new OTP."
        )
    
    if stored_otp != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please try again."
        )
    
    # Mark user as verified
    user.is_verified = True
    db.commit()
    
    # Delete OTP from Redis
    delete_otp(user.id)
    
    # Create access token for automatic login after verification
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "message": "OTP verified successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id
    }

# Reset password
@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(reset_data: PasswordReset, db: Session = Depends(get_db)):
    contact = reset_data.contact
    otp = reset_data.otp
    
    # Find user by contact
    if is_email(contact):
        user = db.query(User).filter(User.email == contact).first()
    else:
        user = db.query(User).filter(User.phone_number == contact).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get stored OTP from Redis
    stored_otp = get_otp(user.id)
    
    if not stored_otp or stored_otp != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP or OTP expired"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    db.commit()
    
    # Delete OTP from Redis
    delete_otp(user.id)
    
    return {"message": "Password reset successfully"}
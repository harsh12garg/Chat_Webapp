from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
import re

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v is not None:
            # Simple regex for phone number validation
            pattern = r'^\+?[1-9]\d{1,14}$'
            if not re.match(pattern, v):
                raise ValueError('Invalid phone number format')
        return v
    
    @validator('email', 'phone_number')
    def validate_contact_info(cls, v, values):
        # Ensure at least one contact method is provided
        if 'email' in values and values['email'] is None and 'phone_number' in values and values['phone_number'] is None:
            raise ValueError('Either email or phone number must be provided')
        return v

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class UserLogin(BaseModel):
    username: str  # Can be either email or phone number
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class OTPRequest(BaseModel):
    contact: str  # Can be either email or phone number
    contact_type: str = Field(..., pattern='^(email|phone)$')

class OTPVerify(BaseModel):
    contact: str  # Can be either email or phone number
    otp: str = Field(..., min_length=6, max_length=6)

class PasswordReset(BaseModel):
    contact: str  # Can be either email or phone number
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v 
# Chat Application Backend

A real-time chat application backend built with FastAPI, WebSockets, MySQL, Redis, and Celery.

## Features

- 🔐 User Authentication with JWT
- 📱 OTP Verification via Email/SMS
- 💬 Real-time Chat with WebSockets
- 👥 Group Chat Management
- 📁 File Uploads
- 📊 Message Status Tracking

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **WebSockets**: For real-time communication
- **MySQL**: Primary database for storing users, messages, etc.
- **Redis**: For OTP storage and Celery tasks
- **Celery**: For background tasks like sending emails/SMS
- **JWT**: For secure authentication
- **Pydantic**: For data validation
- **SQLAlchemy**: ORM for database operations

## Setup Instructions

### 1. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Set up MySQL database

Create a database named `chatapp`:

```sql
CREATE DATABASE chatapp;
```

### 4. Set up Redis

Make sure Redis is installed and running on your system.

### 5. Configure environment variables

Create a `.env` file in the backend directory with the following variables:

```
# Database settings
DATABASE_URL=mysql+pymysql://root:password@localhost/chatapp

# JWT settings
JWT_SECRET_KEY=your-secret-key-for-jwt-change-in-production

# Redis settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# Celery settings
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email settings
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS settings (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# AWS S3 settings
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name
```

### 6. Run the application

```bash
uvicorn app.main:app --reload
```

### 7. Start Celery worker

```bash
celery -A app.celery_worker worker --loglevel=info
```

## API Documentation

Once the server is running, you can access the API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/send-otp` - Send OTP for verification
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/reset-password` - Reset password with OTP

### User Management

- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `POST /api/users/me/upload-profile-picture` - Upload profile picture
- `GET /api/users` - Get all users
- `GET /api/users/{user_id}` - Get user by ID

### Chat

- `GET /chat/messages/{user_id}` - Get chat history with a user
- `GET /chat/groups/{group_id}/messages` - Get group chat history
- `POST /chat/upload-file` - Upload file for chat
- `WebSocket /chat/ws/{token}` - WebSocket endpoint for real-time chat

### Groups

- `POST /chat/groups` - Create a new group
- `GET /chat/groups` - Get all groups for current user
- `GET /chat/groups/{group_id}` - Get group by ID
- `PUT /chat/groups/{group_id}` - Update group
- `POST /chat/groups/{group_id}/upload-picture` - Upload group picture
- `POST /chat/groups/{group_id}/members` - Add member to group
- `DELETE /chat/groups/{group_id}/members/{member_id}` - Remove member from group 
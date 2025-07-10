# Real-Time Chat Application

A full-stack real-time chat application with ReactJS frontend and FastAPI backend.

## Features

### 🔐 User Authentication & OTP System
- Signup/Login using Email or Phone Number
- OTP verification using Email (SMTP) or SMS (Twilio)
- OTP storage in Redis with 2-minute expiry
- JWT token-based authentication
- Secure password reset flow

### 💬 Real-Time Chat System (WebSockets)
- Personal (one-to-one) messaging
- Group chat creation and management
- Real-time message delivery and typing status
- Message status tracking (sent, delivered, read)
- File uploads (images, audio, etc.)

### 🧠 Additional Features
- Background tasks with Celery + Redis
- Toast notifications for user feedback
- Responsive UI with Tailwind CSS
- Real-time WebSocket communication

## Tech Stack

### Frontend
- ReactJS with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Formik & Yup for form handling
- WebSocket API for real-time features
- Axios for API requests

### Backend
- FastAPI for REST API endpoints
- WebSockets for real-time communication
- JWT for authentication
- Pydantic for data validation
- SQLAlchemy ORM with MySQL
- Redis for OTP storage and Celery tasks
- Celery for background tasks

## Project Structure

```
/
├── backend/              # FastAPI backend
│   ├── app/              # Application code
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication
│   │   ├── chat/         # Chat functionality
│   │   ├── models/       # Database models
│   │   └── schemas/      # Pydantic schemas
│   └── requirements.txt  # Python dependencies
│
└── frontend/             # React frontend
    ├── public/           # Static files
    ├── src/              # Source code
    │   ├── components/   # React components
    │   ├── context/      # React context
    │   ├── pages/        # Application pages
    │   └── utils/        # Utility functions
    └── package.json      # Node dependencies
```

## Getting Started

### Prerequisites
- Node.js and npm
- Python 3.8+
- MySQL
- Redis

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables in a `.env` file (see backend/README.md)

5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

6. Start the Celery worker:
   ```bash
   celery -A app.celery_worker worker --loglevel=info
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in a `.env` file (see frontend/README.md)

4. Start the development server:
   ```bash
   npm start
   ```

## API Documentation
Once the backend server is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc` 
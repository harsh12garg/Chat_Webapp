from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.auth.routes import router as auth_router
from app.chat.routes import router as chat_router
from app.chat.group_routes import router as group_router
from app.database import create_tables
from app.config import settings

app = FastAPI(
    title="Chat Application API",
    description="A real-time chat application API with user authentication and WebSockets",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(api_router, prefix="/api", tags=["API"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(group_router, prefix="/chat", tags=["Groups"])

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to the Chat Application API"}

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 
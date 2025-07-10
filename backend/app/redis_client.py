import redis
from app.config import settings
import time
import threading
import os

# Initialize redis_client as None
redis_client = None

# In-memory store for OTPs when Redis is not available
otp_store = {}
otp_expiry = {}
online_users = set()

# Lock for thread safety
lock = threading.Lock()

# Function to get or create Redis connection
def get_redis_client():
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            # Test connection
            redis_client.ping()
            print("Redis connection successful")
        except Exception as e:
            print(f"Redis connection error: {e}")
            raise Exception(f"Failed to connect to Redis: {e}")
    return redis_client

# Store OTP in Redis with expiry
def store_otp(user_id: str, otp: str) -> bool:
    try:
        client = get_redis_client()
        client.setex(
            f"otp:{user_id}", 
            settings.OTP_EXPIRY_SECONDS, 
            otp
        )
        return True
    except Exception as e:
        print(f"Error storing OTP: {e}")
        raise Exception(f"Failed to store OTP: {e}")

# Get OTP from Redis
def get_otp(user_id: str) -> str:
    try:
        client = get_redis_client()
        return client.get(f"otp:{user_id}")
    except Exception as e:
        print(f"Error retrieving OTP: {e}")
        raise Exception(f"Failed to retrieve OTP: {e}")

# Delete OTP from Redis
def delete_otp(user_id: str) -> bool:
    try:
        client = get_redis_client()
        client.delete(f"otp:{user_id}")
        return True
    except Exception as e:
        print(f"Error deleting OTP: {e}")
        raise Exception(f"Failed to delete OTP: {e}")

# Store user's online status
def set_user_online(user_id: str) -> bool:
    try:
        client = get_redis_client()
        client.sadd("online_users", user_id)
        return True
    except Exception as e:
        print(f"Error setting user online: {e}")
        raise Exception(f"Failed to set user online: {e}")

# Remove user's online status
def set_user_offline(user_id: str) -> bool:
    try:
        client = get_redis_client()
        client.srem("online_users", user_id)
        return True
    except Exception as e:
        print(f"Error setting user offline: {e}")
        raise Exception(f"Failed to set user offline: {e}")

# Check if user is online
def is_user_online(user_id: str) -> bool:
    try:
        client = get_redis_client()
        return client.sismember("online_users", user_id)
    except Exception as e:
        print(f"Error checking if user is online: {e}")
        raise Exception(f"Failed to check if user is online: {e}")

# Get all online users
def get_online_users() -> list:
    try:
        client = get_redis_client()
        return client.smembers("online_users")
    except Exception as e:
        print(f"Error getting online users: {e}")
        raise Exception(f"Failed to get online users: {e}")

# Clean up expired OTPs periodically (for in-memory store)
def clean_expired_otps():
    with lock:
        current_time = time.time()
        expired_keys = [key for key, expiry in otp_expiry.items() if current_time > expiry]
        for key in expired_keys:
            if key in otp_store:
                del otp_store[key]
            if key in otp_expiry:
                del otp_expiry[key]
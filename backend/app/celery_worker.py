from celery import Celery
from app.config import settings
import os

# Initialize celery_app as None
celery_app = None

# Function to get or create Celery app
def get_celery_app():
    global celery_app
    if celery_app is None:
        try:
            celery_app = Celery(
                "chat_app",
                broker=settings.CELERY_BROKER_URL,
                backend=settings.CELERY_RESULT_BACKEND,
                include=["app.tasks"]
            )
            
            # Configure Celery
            celery_app.conf.update(
                task_serializer="json",
                accept_content=["json"],
                result_serializer="json",
                timezone="UTC",
                enable_utc=True,
                task_track_started=True,
                worker_max_tasks_per_child=1000,
            )
        except Exception as e:
            print(f"Celery connection error: {e}")
            return None
    return celery_app

# Initialize celery_app
celery_app = get_celery_app()

if __name__ == "__main__":
    app = get_celery_app()
    if app:
        app.start()
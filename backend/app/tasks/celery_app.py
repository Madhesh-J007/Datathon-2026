from app.core.config import settings

try:
    from celery import Celery
    celery_app = Celery(
        "tasks",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
        include=["app.tasks.report_tasks", "app.tasks.notification_tasks"]
    )
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
    )
except ImportError:
    class DummyCelery:
        def task(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator
        def update(self, *args, **kwargs):
            pass

    celery_app = DummyCelery()
    celery_app.conf = DummyCelery()

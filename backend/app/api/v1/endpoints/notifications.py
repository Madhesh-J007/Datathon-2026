from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationOut

router = APIRouter()

@router.get("", response_model=List[NotificationOut], summary="Get Notifications")
def read_notifications(
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves dynamic in-app alerts and notification events for the active user.
    """
    # Emulate real-time task alerts (can be backed by Celery queues or notifications table)
    alerts = [
        NotificationOut(
            id=1,
            user_id=current_user.UserID,
            title="New Investigator Assignment",
            message="You have been assigned as Lead Investigator on a new case registry.",
            created_at=datetime.now(timezone.utc),
            is_read=False
        ),
        NotificationOut(
            id=2,
            user_id=current_user.UserID,
            title="Relationship Confirmed",
            message="Suspect connection link has been verified by the SCRB analyst.",
            created_at=datetime.now(timezone.utc),
            is_read=True
        )
    ]
    return alerts

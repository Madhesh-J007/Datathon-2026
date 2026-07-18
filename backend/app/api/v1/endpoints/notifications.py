from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.services import notification_service

router = APIRouter()

@router.get("", response_model=List[NotificationOut], summary="Get Notifications")
def read_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves dynamic in-app alerts and notification events for the active user.
    """
    notifications = notification_service.list_notifications(db, current_user)
    
    # Map the model keys to lowercase schema keys
    return [
        NotificationOut(
            id=n.NotificationID,
            user_id=n.UserID,
            title=n.Title,
            message=n.Message,
            created_at=n.CreatedAt,
            is_read=n.IsRead
        )
        for n in notifications
    ]

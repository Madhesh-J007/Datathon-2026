from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User

def create_notification(db: Session, user_id: int, title: str, message: str) -> Notification:
    """
    Creates a new dynamic alert or event notification for the user.
    """
    notification = Notification(
        UserID=user_id,
        Title=title,
        Message=message,
        IsRead=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification

def list_notifications(db: Session, current_user: User) -> list[Notification]:
    """
    Retrieves all notifications for the active user, ordered by creation time descending.
    """
    return db.query(Notification).filter(Notification.UserID == current_user.UserID).order_by(Notification.CreatedAt.desc()).all()

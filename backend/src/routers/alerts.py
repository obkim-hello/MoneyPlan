from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models.alert import Alert, AlertType
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=List[dict])
def get_all_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all alerts for the current user."""
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id).order_by(Alert.created_at.desc()).all()

    return [
        {
            "id": alert.id,
            "alert_type": alert.alert_type.value if alert.alert_type else None,
            "title": alert.title,
            "message": alert.message,
            "threshold_value": alert.threshold_value,
            "is_read": alert.is_read == "Y",
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        }
        for alert in alerts
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new alert for the current user."""
    alert_type = alert_data.get("alert_type")
    title = alert_data.get("title")
    message = alert_data.get("message")

    if not alert_type or not title or not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="alert_type, title, and message are required"
        )

    # Validate alert_type
    try:
        alert_type_enum = AlertType(alert_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"alert_type must be one of: {[e.value for e in AlertType]}"
        )

    new_alert = Alert(
        user_id=current_user.id,
        alert_type=alert_type_enum,
        title=title,
        message=message,
        threshold_value=alert_data.get("threshold_value"),
        is_read="N"
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    return {
        "id": new_alert.id,
        "alert_type": new_alert.alert_type.value if new_alert.alert_type else None,
        "title": new_alert.title,
        "message": new_alert.message,
        "threshold_value": new_alert.threshold_value,
        "is_read": new_alert.is_read == "Y",
        "created_at": new_alert.created_at.isoformat() if new_alert.created_at else None,
    }

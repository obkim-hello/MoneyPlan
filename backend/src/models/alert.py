import uuid
from sqlalchemy import Column, String, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
from . import Base, TimestampMixin


class AlertType(str, enum.Enum):
    BUDGET_OVER = "budget_over"
    GOAL_REACHED = "goal_reached"
    ACCOUNT_LOW = "account_low"
    SPENDING_HIGH = "spending_high"
    NET_WORTH_CHANGE = "net_worth_change"
    INVESTMENT_ALERT = "investment_alert"


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    alert_type = Column(SQLEnum(AlertType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    threshold_value = Column(Float, nullable=True)  # The value that triggered the alert
    is_read = Column(String(1), default="N", nullable=False)  # Y/N

    user = relationship("User", backref="alerts")

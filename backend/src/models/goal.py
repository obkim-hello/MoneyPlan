import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from . import Base, TimestampMixin


class Goal(Base, TimestampMixin):
    __tablename__ = "goals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    goal_type = Column(String(50), nullable=False)  # e.g., "emergency_fund", "retirement", "purchase", "investment"
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0, nullable=False)
    target_date = Column(Date, nullable=True)
    priority = Column(Integer, default=3, nullable=False)  # 1=high, 2=medium, 3=low
    is_active = Column(String(1), default="Y", nullable=False)  # Y/N
    notes = Column(String(500), nullable=True)

    user = relationship("User", backref="goals")

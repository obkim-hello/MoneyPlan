from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from . import Base, TimestampMixin


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)  # e.g., "Groceries", "Rent", "Utilities"
    amount = Column(Float, nullable=False)
    period = Column(String(20), nullable=False)  # "monthly", "weekly", "yearly"
    spent = Column(Float, default=0.0, nullable=False)
    is_active = Column(String(1), default="Y", nullable=False)  # Y/N

    user = relationship("User", backref="budgets")

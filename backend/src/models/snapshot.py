import uuid
from sqlalchemy import Column, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from . import Base, TimestampMixin


class Snapshot(Base, TimestampMixin):
    __tablename__ = "snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    total_assets = Column(Float, nullable=False)
    total_liabilities = Column(Float, nullable=False)
    net_worth = Column(Float, nullable=False, index=True)
    cash_balance = Column(Float, nullable=True)
    investment_balance = Column(Float, nullable=True)
    other_balance = Column(Float, nullable=True)
    data_source = Column(String(50), nullable=True)  # e.g., "monarch", "manual"

    user = relationship("User", backref="snapshots")

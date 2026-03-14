import uuid
from sqlalchemy import Column, String, Float
from . import Base, TimestampMixin


class Allocation(Base, TimestampMixin):
    __tablename__ = "allocations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # e.g., "Stock", "Bond", "GIC", "Cash", "Precious Metals"
    # Comma-separated asset types this category maps to: "stock,etf" or "cash" or "bond"
    asset_types = Column(String(255), nullable=False, default="")
    sort_order = Column(Float, nullable=False, default=0)  # For ordering display

    # Note: percentage is calculated automatically from holdings, not stored

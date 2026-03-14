import uuid
from sqlalchemy import Column, String, Float, Date
from . import Base


class AllocationSnapshot(Base):
    __tablename__ = "allocation_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    # JSON string storing the breakdown: [{"name": "Stock", "percentage": 25.0, "value": 10000}, ...]
    breakdown_json = Column(String(2000), nullable=False)
    total_value = Column(Float, nullable=False, default=0)

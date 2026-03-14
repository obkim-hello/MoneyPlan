import uuid
from sqlalchemy import Column, String, Float, Date
from . import Base


class PoolSnapshot(Base):
    __tablename__ = "pool_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    pool_id = Column(String(36), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    total_value = Column(Float, nullable=False, default=0)
    holdings_count = Column(String(36), nullable=False, default=0)

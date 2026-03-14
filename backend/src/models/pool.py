import uuid
from sqlalchemy import Column, String, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
import enum
from . import Base, TimestampMixin


class PoolCategory(str, enum.Enum):
    GROWTH = "growth"
    DIVIDEND = "dividend"
    INCOME = "income"
    SPECULATIVE = "speculative"
    CASH = "cash"
    SPENDING = "spending"
    EMERGENCY = "emergency"


class Pool(Base, TimestampMixin):
    __tablename__ = "pools"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(SQLEnum(PoolCategory), nullable=False, index=True)
    description = Column(String(500), nullable=True)

    user = relationship("User", backref="pools")

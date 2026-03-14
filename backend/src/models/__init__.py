from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# Import all models so they get registered with Base.metadata
from src.models.user import User
from src.models.account import Account
from src.models.holding import Holding
from src.models.transaction import Transaction
from src.models.snapshot import Snapshot
from src.models.budget import Budget
from src.models.goal import Goal
from src.models.alert import Alert
from src.models.monarch_session import MonarchSession
from src.models.mx_member import MXMember, MXUser
from src.models.pool import Pool
from src.models.allocation import Allocation
from src.models.pool_snapshot import PoolSnapshot
from src.models.allocation_snapshot import AllocationSnapshot

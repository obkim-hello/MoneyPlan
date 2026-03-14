from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from . import Base


class MXUser(Base):
    __tablename__ = "mx_users"

    id = Column(String(36), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    mx_user_guid = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class MXMember(Base):
    __tablename__ = "mx_members"

    guid = Column(String(255), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    mx_user_id = Column(String(36), ForeignKey("mx_users.id"), nullable=False)
    institution_guid = Column(String(255), nullable=False)
    institution_name = Column(String(255))
    is_connected = Column(Boolean, default=False)
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

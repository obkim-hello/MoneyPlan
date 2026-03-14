import uuid
from sqlalchemy import Column, String, Float, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from . import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False, index=True)
    category = Column(String(100), nullable=True, index=True)  # User-defined category
    merchant = Column(String(255), nullable=True)
    transaction_type = Column(String(50), nullable=True)  # e.g., "buy", "sell", "deposit", "withdrawal"
    notes = Column(Text, nullable=True)

    account = relationship("Account", backref="transactions")
    user = relationship("User", backref="transactions")

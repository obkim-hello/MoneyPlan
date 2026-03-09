from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from . import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False, index=True)
    category = Column(String(100), nullable=True, index=True)  # User-defined category
    merchant = Column(String(255), nullable=True)
    transaction_type = Column(String(50), nullable=True)  # e.g., "buy", "sell", "deposit", "withdrawal"
    notes = Column(Text, nullable=True)

    account = relationship("Account", backref="transactions")
    user = relationship("User", backref="transactions")

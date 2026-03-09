from sqlalchemy import Column, Integer, String, Float, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
import enum
from . import Base, TimestampMixin


class AccountType(str, enum.Enum):
    INVESTMENT = "investment"
    BANK = "bank"
    CREDIT = "credit"
    LOAN = "loan"
    MORTGAGE = "mortgage"
    INSURANCE = "insurance"
    CRYPTO = "crypto"
    OTHER = "other"


class AccountCategoryType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    account_type = Column(SQLEnum(AccountType), nullable=False, index=True)
    category = Column(SQLEnum(AccountCategoryType), nullable=False, index=True)
    institution = Column(String(255), nullable=True)
    account_number = Column(String(100), nullable=True)  # Masked or last 4 digits
    current_balance = Column(Float, default=0.0, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    is_active = Column(String(1), default="Y", nullable=False)  # Y/N

    user = relationship("User", backref="accounts")

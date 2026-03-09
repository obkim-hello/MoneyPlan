from sqlalchemy import Column, Integer, String, Float, Enum as SQLEnum, ForeignKey, Date
from sqlalchemy.orm import relationship
import enum
from . import Base, TimestampMixin


class AssetType(str, enum.Enum):
    STOCK = "stock"
    ETF = "etf"
    MUTUAL_FUND = "mutual_fund"
    BOND = "bond"
    CASH = "cash"
    CRYPTO = "crypto"
    COMMODITY = "commodity"
    REAL_ESTATE = "real_estate"
    OTHER = "other"


class HoldingCategory(str, enum.Enum):
    EQUITY = "equity"
    FIXED_INCOME = "fixed_income"
    CASH = "cash"
    ALTERNATIVE = "alternative"


class Holding(Base, TimestampMixin):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    asset_type = Column(SQLEnum(AssetType), nullable=False, index=True)
    category = Column(SQLEnum(HoldingCategory), nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    cost_basis = Column(Float, nullable=True)  # Total cost basis
    current_price = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    currency = Column(String(3), default="USD", nullable=False)
    purchase_date = Column(Date, nullable=True)
    notes = Column(String(500), nullable=True)

    account = relationship("Account", backref="holdings")
    user = relationship("User", backref="holdings")

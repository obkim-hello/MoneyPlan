from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.account import Account, AccountCategoryType, AccountType
from ..models.holding import Holding, HoldingCategory, AssetType
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("/summary")
@router.get("/summary/", include_in_schema=False)
def get_asset_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get asset summary including total assets, cash total, emergency fund, and investment total."""
    # Get all accounts for the user
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()

    # Calculate totals by category
    total_assets = 0.0
    cash_total = 0.0
    emergency_fund = 0.0
    investment_total = 0.0

    for account in accounts:
        if account.category == AccountCategoryType.ASSET:
            # Total assets = sum of all asset accounts
            total_assets += account.current_balance

            # Cash total = bank accounts
            if account.account_type == AccountType.BANK:
                cash_total += account.current_balance

                # Check for emergency fund (institution name contains "emergency" or account name contains "emergency")
                if "emergency" in (account.institution or "").lower() or \
                   "emergency" in account.name.lower():
                    emergency_fund += account.current_balance

            # Investment total = investment, crypto, etc.
            if account.account_type in [AccountType.INVESTMENT, AccountType.CRYPTO]:
                investment_total += account.current_balance

    return {
        "total_assets": total_assets,
        "cash_total": cash_total,
        "emergency_fund": emergency_fund,
        "investment_total": investment_total,
    }


@router.get("/holdings", response_model=List[dict])
@router.get("/holdings/", include_in_schema=False)
def get_holdings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all holdings for the current user."""
    holdings = db.query(Holding).filter(Holding.user_id == current_user.id).all()

    return [
        {
            "id": holding.id,
            "account_id": holding.account_id,
            "pool_id": holding.pool_id,
            "allocation_id": holding.allocation_id,
            "allocation_category": holding.allocation.name if holding.allocation else None,
            "symbol": holding.symbol,
            "name": holding.name,
            "asset_type": holding.asset_type.value,
            "category": holding.category.value,
            "quantity": holding.quantity,
            "cost_basis": holding.cost_basis,
            "current_price": holding.current_price,
            "current_value": holding.current_value,
            "currency": holding.currency,
            "purchase_date": holding.purchase_date.isoformat() if holding.purchase_date else None,
        }
        for holding in holdings
    ]

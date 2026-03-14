from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Union
from pydantic import BaseModel

from ..database import get_db
from ..models.account import Account, AccountCategoryType, AccountType
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/accounts", tags=["Accounts"])


class AccountUpdateRequest(BaseModel):
    account_type: str = None
    category: str = None


# Handle both /accounts and /accounts/
@router.get("", response_model=List[dict], include_in_schema=False)
@router.get("/", response_model=List[dict])
def get_all_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all accounts for the current user."""
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()

    return [
        {
            "id": account.id,
            "name": account.name,
            "account_type": account.account_type.value,
            "category": account.category.value,
            "institution": account.institution,
            "account_number": account.account_number,
            "current_balance": account.current_balance,
            "currency": account.currency,
            "is_active": account.is_active == "Y",
        }
        for account in accounts
    ]


@router.put("/{account_id}/", status_code=status.HTTP_200_OK)
@router.put("/{account_id}", status_code=status.HTTP_200_OK, include_in_schema=False)
def update_account(
    account_id: str,
    update_data: AccountUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update account type or category."""
    # Find the account
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Update account_type if provided
    if update_data.account_type:
        try:
            account.account_type = AccountType(update_data.account_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid account_type. Must be one of: {[t.value for t in AccountType]}"
            )

    # Update category if provided
    if update_data.category:
        try:
            account.category = AccountCategoryType(update_data.category.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category. Must be one of: {[c.value for c in AccountCategoryType]}"
            )

    db.commit()
    db.refresh(account)

    return {
        "id": account.id,
        "name": account.name,
        "account_type": account.account_type.value,
        "category": account.category.value,
        "institution": account.institution,
        "account_number": account.account_number,
        "current_balance": account.current_balance,
        "currency": account.currency,
        "is_active": account.is_active == "Y",
    }


@router.get("/types")
@router.get("/types/", include_in_schema=False)
def get_account_types():
    """Get available account types."""
    return {
        "account_types": [t.value for t in AccountType],
        "categories": [c.value for c in AccountCategoryType]
    }

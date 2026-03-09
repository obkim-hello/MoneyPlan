from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.account import Account, AccountCategoryType
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/accounts", tags=["Accounts"])


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


@router.put("/{account_id}/category", status_code=status.HTTP_200_OK)
def update_account_category(
    account_id: int,
    category: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the category of an account."""
    # Validate category value
    try:
        category_enum = AccountCategoryType(category.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {[c.value for c in AccountCategoryType]}"
        )

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

    # Update the category
    account.category = category_enum
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

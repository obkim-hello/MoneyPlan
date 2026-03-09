from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models.budget import Budget
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("/", response_model=List[dict])
def get_all_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all budgets for the current user."""
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()

    return [
        {
            "id": budget.id,
            "category": budget.category,
            "amount": budget.amount,
            "period": budget.period,
            "spent": budget.spent,
            "remaining": budget.amount - budget.spent,
            "is_active": budget.is_active == "Y",
            "created_at": budget.created_at.isoformat() if budget.created_at else None,
            "updated_at": budget.updated_at.isoformat() if budget.updated_at else None,
        }
        for budget in budgets
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new budget for the current user."""
    category = budget_data.get("category")
    amount = budget_data.get("amount")
    period = budget_data.get("period", "monthly")

    if not category or amount is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category and amount are required"
        )

    if period not in ["monthly", "weekly", "yearly"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Period must be one of: monthly, weekly, yearly"
        )

    new_budget = Budget(
        user_id=current_user.id,
        category=category,
        amount=float(amount),
        period=period,
        spent=0.0,
        is_active="Y"
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return {
        "id": new_budget.id,
        "category": new_budget.category,
        "amount": new_budget.amount,
        "period": new_budget.period,
        "spent": new_budget.spent,
        "remaining": new_budget.amount - new_budget.spent,
        "is_active": new_budget.is_active == "Y",
        "created_at": new_budget.created_at.isoformat() if new_budget.created_at else None,
        "updated_at": new_budget.updated_at.isoformat() if new_budget.updated_at else None,
    }

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models.goal import Goal
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("/", response_model=List[dict])
def get_all_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all goals for the current user."""
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()

    return [
        {
            "id": goal.id,
            "name": goal.name,
            "goal_type": goal.goal_type,
            "target_amount": goal.target_amount,
            "current_amount": goal.current_amount,
            "progress": (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0,
            "target_date": goal.target_date.isoformat() if goal.target_date else None,
            "priority": goal.priority,
            "is_active": goal.is_active == "Y",
            "notes": goal.notes,
            "created_at": goal.created_at.isoformat() if goal.created_at else None,
            "updated_at": goal.updated_at.isoformat() if goal.updated_at else None,
        }
        for goal in goals
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new goal for the current user."""
    name = goal_data.get("name")
    goal_type = goal_data.get("goal_type")
    target_amount = goal_data.get("target_amount")

    if not name or not goal_type or target_amount is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name, goal_type, and target_amount are required"
        )

    valid_types = ["emergency_fund", "retirement", "purchase", "investment", "savings", "debt_payoff"]
    if goal_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"goal_type must be one of: {valid_types}"
        )

    target_date = None
    if goal_data.get("target_date"):
        try:
            target_date = datetime.strptime(goal_data["target_date"], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid target_date format. Use YYYY-MM-DD"
            )

    priority = goal_data.get("priority", 3)
    if priority not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority must be 1 (high), 2 (medium), or 3 (low)"
        )

    new_goal = Goal(
        user_id=current_user.id,
        name=name,
        goal_type=goal_type,
        target_amount=float(target_amount),
        current_amount=0.0,
        target_date=target_date,
        priority=priority,
        is_active="Y",
        notes=goal_data.get("notes")
    )

    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return {
        "id": new_goal.id,
        "name": new_goal.name,
        "goal_type": new_goal.goal_type,
        "target_amount": new_goal.target_amount,
        "current_amount": new_goal.current_amount,
        "progress": 0.0,
        "target_date": new_goal.target_date.isoformat() if new_goal.target_date else None,
        "priority": new_goal.priority,
        "is_active": new_goal.is_active == "Y",
        "notes": new_goal.notes,
        "created_at": new_goal.created_at.isoformat() if new_goal.created_at else None,
        "updated_at": new_goal.updated_at.isoformat() if new_goal.updated_at else None,
    }

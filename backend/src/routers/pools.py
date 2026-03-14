from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
import json

from ..database import get_db
from ..models.pool import Pool, PoolCategory
from ..models.pool_snapshot import PoolSnapshot
from ..models.holding import Holding
from ..models.account import Account, AccountCategoryType
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/pools", tags=["Pools"])


class PoolCreateRequest(BaseModel):
    name: str
    category: str
    description: Optional[str] = None


class PoolUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class HoldingPoolAssignRequest(BaseModel):
    pool_id: Optional[str] = None  # None to unassign


# Handle both /pools and /pools/
@router.get("", response_model=List[dict], include_in_schema=False)
@router.get("/", response_model=List[dict])
def get_pools(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pools for the current user."""
    pools = db.query(Pool).filter(Pool.user_id == current_user.id).all()

    return [
        {
            "id": pool.id,
            "name": pool.name,
            "category": pool.category.value,
            "description": pool.description,
            "created_at": pool.created_at.isoformat(),
            "updated_at": pool.updated_at.isoformat(),
        }
        for pool in pools
    ]


@router.post("", status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_pool(
    pool_data: PoolCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new pool."""
    try:
        category = PoolCategory(pool_data.category.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {[c.value for c in PoolCategory]}"
        )

    pool = Pool(
        user_id=current_user.id,
        name=pool_data.name,
        category=category,
        description=pool_data.description
    )
    db.add(pool)
    db.commit()
    db.refresh(pool)

    return {
        "id": pool.id,
        "name": pool.name,
        "category": pool.category.value,
        "description": pool.description,
        "created_at": pool.created_at.isoformat(),
        "updated_at": pool.updated_at.isoformat(),
    }


@router.put("/{pool_id}", status_code=status.HTTP_200_OK, include_in_schema=False)
@router.put("/{pool_id}/", status_code=status.HTTP_200_OK)
def update_pool(
    pool_id: str,
    update_data: PoolUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a pool."""
    pool = db.query(Pool).filter(
        Pool.id == pool_id,
        Pool.user_id == current_user.id
    ).first()

    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pool not found"
        )

    if update_data.name is not None:
        pool.name = update_data.name

    if update_data.category is not None:
        try:
            pool.category = PoolCategory(update_data.category.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category. Must be one of: {[c.value for c in PoolCategory]}"
            )

    if update_data.description is not None:
        pool.description = update_data.description

    db.commit()
    db.refresh(pool)

    return {
        "id": pool.id,
        "name": pool.name,
        "category": pool.category.value,
        "description": pool.description,
        "created_at": pool.created_at.isoformat(),
        "updated_at": pool.updated_at.isoformat(),
    }


@router.delete("/{pool_id}", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
@router.delete("/{pool_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_pool(
    pool_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a pool. Holdings in this pool will be unassigned."""
    pool = db.query(Pool).filter(
        Pool.id == pool_id,
        Pool.user_id == current_user.id
    ).first()

    if not pool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pool not found"
        )

    # Unassign all holdings from this pool
    db.query(Holding).filter(Holding.pool_id == pool_id).update({"pool_id": None})

    db.delete(pool)
    db.commit()

    return None


@router.get("/categories")
@router.get("/categories/", include_in_schema=False)
def get_pool_categories():
    """Get available pool categories."""
    return {
        "categories": [c.value for c in PoolCategory]
    }


# Holding pool assignment endpoints

@router.put("/holdings/{holding_id}/pool", status_code=status.HTTP_200_OK, include_in_schema=False)
@router.put("/holdings/{holding_id}/pool/", status_code=status.HTTP_200_OK)
def assign_holding_to_pool(
    holding_id: str,
    assign_data: HoldingPoolAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign or unassign a holding to a pool."""
    holding = db.query(Holding).filter(
        Holding.id == holding_id,
        Holding.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found"
        )

    # Verify the pool belongs to the user if pool_id is provided
    if assign_data.pool_id:
        pool = db.query(Pool).filter(
            Pool.id == assign_data.pool_id,
            Pool.user_id == current_user.id
        ).first()

        if not pool:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pool not found"
            )

    holding.pool_id = assign_data.pool_id
    db.commit()
    db.refresh(holding)

    return {
        "id": holding.id,
        "account_id": holding.account_id,
        "pool_id": holding.pool_id,
        "symbol": holding.symbol,
        "name": holding.name,
    }


class HoldingAllocationCategoryRequest(BaseModel):
    allocation_category: Optional[str] = None


class HoldingAllocationRequest(BaseModel):
    allocation_id: Optional[str] = None


@router.put("/holdings/{holding_id}/allocation", status_code=status.HTTP_200_OK)
@router.put("/holdings/{holding_id}/allocation/", status_code=status.HTTP_200_OK, include_in_schema=False)
def assign_holding_allocation(
    holding_id: str,
    assign_data: HoldingAllocationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign or unassign a holding to an allocation using allocation_id."""
    # First just find by ID (for debugging)
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Holding {holding_id} not found"
        )

    # Then verify user owns it
    if holding.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this holding"
        )

    # Validate allocation_id if provided
    if assign_data.allocation_id:
        from ..models.allocation import Allocation
        allocation = db.query(Allocation).filter(
            Allocation.id == assign_data.allocation_id,
            Allocation.user_id == current_user.id
        ).first()
        if not allocation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Allocation not found"
            )

    holding.allocation_id = assign_data.allocation_id
    # Clear the old string field
    holding.allocation_category = None
    db.commit()
    db.refresh(holding)

    return {
        "id": holding.id,
        "account_id": holding.account_id,
        "allocation_id": holding.allocation_id,
    }


@router.put("/holdings/{holding_id}/allocation-category", status_code=status.HTTP_200_OK)
@router.put("/holdings/{holding_id}/allocation-category/", status_code=status.HTTP_200_OK, include_in_schema=False)
def assign_holding_allocation_category(
    holding_id: str,
    assign_data: HoldingAllocationCategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign or unassign a holding to an allocation category (legacy)."""
    holding = db.query(Holding).filter(
        Holding.id == holding_id,
        Holding.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding not found"
        )

    holding.allocation_category = assign_data.allocation_category
    db.commit()
    db.refresh(holding)

    return {
        "id": holding.id,
        "account_id": holding.account_id,
        "allocation_category": holding.allocation_category,
        "symbol": holding.symbol,
        "name": holding.name,
    }


# Pool history/trend endpoint

@router.get("/history/")
def get_pool_history(
    months: int = 12,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pool value history over time (monthly)."""
    from datetime import timedelta

    end_date = date.today()
    start_date = end_date.replace(day=1) - timedelta(days=months * 30)

    # Get all pools for user
    pools = db.query(Pool).filter(Pool.user_id == current_user.id).all()

    # Get snapshots within date range
    snapshots = db.query(PoolSnapshot).filter(
        PoolSnapshot.user_id == current_user.id,
        PoolSnapshot.date >= start_date,
        PoolSnapshot.date <= end_date
    ).order_by(PoolSnapshot.date).all()

    # Get current holdings to calculate current pool values
    holdings = db.query(Holding).join(Account).filter(
        Holding.user_id == current_user.id,
        Account.category == AccountCategoryType.ASSET,
        Holding.pool_id.isnot(None)
    ).all()

    # Calculate current pool values
    pool_values = {}
    for pool in pools:
        pool_values[pool.id] = {"name": pool.name, "value": 0}

    for h in holdings:
        if h.pool_id and h.pool_id in pool_values:
            pool_values[h.pool_id]["value"] += h.current_value or 0

    # Build monthly data
    monthly_data = {}
    for i in range(months):
        month_date = start_date.replace(day=1)
        month_key = month_date.strftime("%Y-%m")
        monthly_data[month_key] = {"date": month_key, "pools": {}, "total": 0}
        # Move to next month
        if month_date.month == 12:
            start_date = month_date.replace(year=month_date.year + 1, month=1)
        else:
            start_date = month_date.replace(month=month_date.month + 1)

    # Fill in snapshot data
    for snap in snapshots:
        month_key = snap.date.strftime("%Y-%m")
        if month_key in monthly_data:
            if snap.pool_id not in monthly_data[month_key]["pools"]:
                monthly_data[month_key]["pools"][snap.pool_id] = 0
            monthly_data[month_key]["pools"][snap.pool_id] += snap.total_value
            monthly_data[month_key]["total"] += snap.total_value

    # Add current values to the latest month
    latest_month = end_date.strftime("%Y-%m")
    if latest_month not in monthly_data:
        monthly_data[latest_month] = {"date": latest_month, "pools": {}, "total": 0}

    for pool_id, info in pool_values.items():
        monthly_data[latest_month]["pools"][pool_id] = info["value"]
        monthly_data[latest_month]["total"] += info["value"]

    # Convert to list and add pool names
    result = []
    for month_key in sorted(monthly_data.keys()):
        month_info = monthly_data[month_key]
        pools_list = []
        for pool in pools:
            value = month_info["pools"].get(pool.id, 0)
            pools_list.append({
                "pool_id": pool.id,
                "pool_name": pool.name,
                "value": value
            })
        result.append({
            "date": month_info["date"],
            "pools": pools_list,
            "total": month_info["total"]
        })

    return result


@router.post("/snapshot/")
def create_pool_snapshot(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a snapshot of current pool values."""
    today = date.today()

    # Get all pools
    pools = db.query(Pool).filter(Pool.user_id == current_user.id).all()

    # Get holdings grouped by pool
    holdings = db.query(Holding).join(Account).filter(
        Holding.user_id == current_user.id,
        Account.category == AccountCategoryType.ASSET,
        Holding.pool_id.isnot(None)
    ).all()

    pool_values = {}
    for pool in pools:
        pool_values[pool.id] = 0

    for h in holdings:
        if h.pool_id and h.pool_id in pool_values:
            pool_values[h.pool_id] += h.current_value or 0

    # Delete existing snapshot for today
    db.query(PoolSnapshot).filter(
        PoolSnapshot.user_id == current_user.id,
        PoolSnapshot.date == today
    ).delete()

    # Create new snapshots
    for pool_id, value in pool_values.items():
        if value > 0:
            snapshot = PoolSnapshot(
                user_id=current_user.id,
                pool_id=pool_id,
                date=today,
                total_value=value,
                holdings_count=0
            )
            db.add(snapshot)

    db.commit()
    return {"status": "success", "date": today.isoformat()}

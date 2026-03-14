from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date, timedelta
import json

from ..database import get_db
from ..models.allocation import Allocation
from ..models.allocation_snapshot import AllocationSnapshot
from ..models.holding import Holding
from ..models.account import Account, AccountCategoryType
from ..models.user import User
from ..routers.auth import get_current_user


router = APIRouter(prefix="/allocations", tags=["Allocations"])


class AllocationCreateRequest(BaseModel):
    name: str
    asset_types: str  # comma-separated: "stock,etf" or "cash" etc.
    sort_order: Optional[float] = 0


class AllocationUpdateRequest(BaseModel):
    name: Optional[str] = None
    asset_types: Optional[str] = None
    sort_order: Optional[float] = None


# Get all allocations for user
@router.get("/", response_model=List[dict])
def get_allocations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all allocations for the current user."""
    allocations = db.query(Allocation).filter(
        Allocation.user_id == current_user.id
    ).order_by(Allocation.sort_order, Allocation.name).all()

    return [
        {
            "id": a.id,
            "name": a.name,
            "asset_types": a.asset_types,
            "sort_order": a.sort_order,
        }
        for a in allocations
    ]


# Create allocation
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_allocation(
    data: AllocationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new allocation category."""
    allocation = Allocation(
        user_id=current_user.id,
        name=data.name,
        asset_types=data.asset_types,
        sort_order=data.sort_order or 0
    )
    db.add(allocation)
    db.commit()
    db.refresh(allocation)

    return {
        "id": allocation.id,
        "name": allocation.name,
        "asset_types": allocation.asset_types,
        "sort_order": allocation.sort_order,
    }


# Update allocation
@router.put("/{allocation_id}/")
def update_allocation(
    allocation_id: str,
    data: AllocationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an allocation category."""
    allocation = db.query(Allocation).filter(
        Allocation.id == allocation_id,
        Allocation.user_id == current_user.id
    ).first()

    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    if data.name is not None:
        allocation.name = data.name
    if data.asset_types is not None:
        allocation.asset_types = data.asset_types
    if data.sort_order is not None:
        allocation.sort_order = data.sort_order

    db.commit()
    db.refresh(allocation)

    return {
        "id": allocation.id,
        "name": allocation.name,
        "asset_types": allocation.asset_types,
        "sort_order": allocation.sort_order,
    }


# Delete allocation
@router.delete("/{allocation_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_allocation(
    allocation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an allocation category."""
    allocation = db.query(Allocation).filter(
        Allocation.id == allocation_id,
        Allocation.user_id == current_user.id
    ).first()

    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    db.delete(allocation)
    db.commit()
    return None


# Get allocation breakdown with calculated percentages
@router.get("/breakdown/")
def get_allocation_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get allocation breakdown with calculated percentages based on holdings."""
    # Get all allocations for user
    allocations = db.query(Allocation).filter(
        Allocation.user_id == current_user.id
    ).order_by(Allocation.sort_order, Allocation.name).all()

    # Get all holdings for user (only asset accounts)
    holdings = db.query(Holding).join(Account).filter(
        Holding.user_id == current_user.id,
        Account.category == AccountCategoryType.ASSET
    ).all()

    # Calculate total value
    total_value = sum(h.current_value or 0 for h in holdings)

    # Parse asset types for each allocation
    allocation_map = {}
    for a in allocations:
        # Parse comma-separated asset types
        types = [t.strip().lower() for t in a.asset_types.split(",") if t.strip()]
        allocation_map[a.id] = {
            "name": a.name,
            "asset_types": types,
            "value": 0
        }

    # Calculate value for each allocation
    for holding in holdings:
        holding_type = holding.asset_type.value.lower() if holding.asset_type else ""
        matched = False

        for alloc_id, alloc_info in allocation_map.items():
            if holding_type in alloc_info["asset_types"]:
                alloc_info["value"] += holding.current_value or 0
                matched = True
                break

    # Build result
    result = []
    uncategorized_value = 0

    for a in allocations:
        info = allocation_map[a.id]
        value = info["value"]
        percentage = (value / total_value * 100) if total_value > 0 else 0

        result.append({
            "name": info["name"],
            "percentage": round(percentage, 2),
            "value": round(value, 2)
        })

    # Add uncategorized
    for holding in holdings:
        holding_type = holding.asset_type.value.lower() if holding.asset_type else ""
        matched = False

        for alloc_info in allocation_map.values():
            if holding_type in alloc_info["asset_types"]:
                matched = True
                break

        if not matched:
            uncategorized_value += holding.current_value or 0

    if uncategorized_value > 0:
        percentage = (uncategorized_value / total_value * 100) if total_value > 0 else 0
        result.append({
            "name": "Uncategorized",
            "percentage": round(percentage, 2),
            "value": round(uncategorized_value, 2)
        })

    # Add total
    result.append({
        "name": "Total",
        "percentage": 100.0,
        "value": round(total_value, 2)
    })

    return result


# Allocation history/trend endpoint

@router.get("/history/")
def get_allocation_history(
    months: int = 12,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get allocation breakdown history over time (monthly)."""
    end_date = date.today()
    start_date = end_date.replace(day=1) - timedelta(days=months * 30)

    # Get snapshots within date range
    snapshots = db.query(AllocationSnapshot).filter(
        AllocationSnapshot.user_id == current_user.id,
        AllocationSnapshot.date >= start_date,
        AllocationSnapshot.date <= end_date
    ).order_by(AllocationSnapshot.date).all()

    # Build monthly data
    result = []
    for snap in snapshots:
        try:
            breakdown = json.loads(snap.breakdown_json)
        except:
            breakdown = []
        result.append({
            "date": snap.date.strftime("%Y-%m"),
            "breakdown": breakdown,
            "total_value": snap.total_value
        })

    # Add current data as latest entry if not already there
    current = get_allocation_breakdown_internal(db, current_user.id)
    if result and result[-1]["date"] == end_date.strftime("%Y-%m"):
        result[-1] = {
            "date": end_date.strftime("%Y-%m"),
            "breakdown": current,
            "total_value": sum(item["value"] for item in current if item["name"] != "Total")
        }
    elif not result or result[-1]["date"] != end_date.strftime("%Y-%m"):
        result.append({
            "date": end_date.strftime("%Y-%m"),
            "breakdown": current,
            "total_value": sum(item["value"] for item in current if item["name"] != "Total")
        })

    return result


@router.post("/snapshot/")
def create_allocation_snapshot(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a snapshot of current allocation breakdown."""
    today = date.today()

    # Get current breakdown
    breakdown = get_allocation_breakdown_internal(db, current_user.id)

    # Delete existing snapshot for today
    db.query(AllocationSnapshot).filter(
        AllocationSnapshot.user_id == current_user.id,
        AllocationSnapshot.date == today
    ).delete()

    # Create new snapshot
    total_value = sum(item["value"] for item in breakdown if item["name"] != "Total")
    snapshot = AllocationSnapshot(
        user_id=current_user.id,
        date=today,
        breakdown_json=json.dumps(breakdown),
        total_value=total_value
    )
    db.add(snapshot)
    db.commit()

    return {"status": "success", "date": today.isoformat()}


# Helper function to get breakdown without auth
def get_allocation_breakdown_internal(db: Session, user_id: str):
    """Internal function to get allocation breakdown."""
    allocations = db.query(Allocation).filter(
        Allocation.user_id == user_id
    ).order_by(Allocation.sort_order, Allocation.name).all()

    holdings = db.query(Holding).join(Account).filter(
        Holding.user_id == user_id,
        Account.category == AccountCategoryType.ASSET
    ).all()

    total_value = sum(h.current_value or 0 for h in holdings)

    allocation_map = {}
    for a in allocations:
        types = [t.strip().lower() for t in a.asset_types.split(",") if t.strip()]
        allocation_map[a.name.lower()] = {"name": a.name, "value": 0}

    # Map allocation_category names to allocation names
    category_to_allocation = {}
    for a in allocations:
        types = [t.strip().lower() for t in a.asset_types.split(",") if t.strip()]
        for t in types:
            category_to_allocation[t] = a.name

    result = []
    uncategorized_value = 0

    for holding in holdings:
        # Calculate value: use current_value, or calculate from quantity * current_price
        holding_value = holding.current_value or 0
        if holding_value == 0 and holding.quantity and holding.current_price:
            holding_value = holding.quantity * holding.current_price

        # First check if holding has explicit allocation_category
        if holding.allocation_category:
            alloc_name = holding.allocation_category.lower()
            if alloc_name in allocation_map:
                allocation_map[alloc_name]["value"] += holding_value
            else:
                # Unknown category - add as uncategorized
                uncategorized_value += holding_value
        else:
            # Fall back to using asset_type mapping
            holding_type = holding.asset_type.value.lower() if holding.asset_type else ""
            matched = False
            for alloc_name, alloc_info in allocation_map.items():
                if holding_type in alloc_name.lower() or holding_type in [t.lower() for t in alloc_name.split()]:
                    alloc_info["value"] += holding_value
                    matched = True
                    break
            if not matched:
                uncategorized_value += holding_value

    for a in allocations:
        info = allocation_map[a.name.lower()]
        value = info["value"]
        percentage = (value / total_value * 100) if total_value > 0 else 0
        result.append({"name": info["name"], "percentage": round(percentage, 2), "value": round(value, 2)})

    if uncategorized_value > 0:
        percentage = (uncategorized_value / total_value * 100) if total_value > 0 else 0
        result.append({"name": "Uncategorized", "percentage": round(percentage, 2), "value": round(uncategorized_value, 2)})

    result.append({"name": "Total", "percentage": 100.0, "value": round(total_value, 2)})

    return result

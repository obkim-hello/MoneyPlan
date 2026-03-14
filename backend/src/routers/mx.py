import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any

from src.database import get_db
from src.models.user import User
from src.models.mx_member import MXMember, MXUser
from src.services.mx import MXService
from src.services.sync import run_mx_sync
from ..routers.auth import get_current_user

router = APIRouter(prefix="/mx", tags=["MX"])
logger = logging.getLogger(__name__)


def get_or_create_mx_user(db: Session, user: User) -> str:
    """Get or create MX user and return the MX user GUID."""
    mx_user = db.query(MXUser).filter(MXUser.user_id == str(user.id)).first()
    if mx_user:
        logger.info(f"Found existing MX user: {mx_user.mx_user_guid}")
        return mx_user.mx_user_guid

    # Create new MX user
    logger.info(f"Creating new MX user for user_id: {user.id}, email: {user.email}")
    mx_service = MXService()
    result = mx_service.create_user(str(user.id), user.email)
    logger.info(f"MX API result: {result}")
    mx_user_guid = result.get("guid")
    logger.info(f"MX User GUID: {mx_user_guid}")

    if not mx_user_guid:
        raise Exception("Failed to create MX user - no guid returned")

    mx_user = MXUser(
        user_id=str(user.id),
        mx_user_guid=mx_user_guid
    )
    db.add(mx_user)
    db.commit()

    return mx_user_guid


class ConnectRequest(BaseModel):
    institution_guid: str
    credentials: Optional[Any] = None


@router.get("/status")
def get_mx_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if MX is connected."""
    members = db.query(MXMember).filter(MXMember.user_id == str(user.id)).all()

    if not members:
        return {
            "connected": False,
            "members": [],
            "last_sync": None
        }

    return {
        "connected": True,
        "members": [
            {
                "guid": m.guid,
                "institution_name": m.institution_name,
                "is_connected": m.is_connected,
                "last_sync": m.last_sync.isoformat() if m.last_sync else None
            }
            for m in members
        ],
        "last_sync": max((m.last_sync for m in members if m.last_sync), default=None)
    }


@router.get("/institutions")
def list_institutions(name: str = None):
    """List available institutions."""
    mx = MXService()
    institutions = mx.list_institutions(name=name)
    return [
        {
            "guid": i.get("guid"),
            "name": i.get("name"),
            "logo": i.get("logo"),
            "url": i.get("url")
        }
        for i in institutions
    ]


@router.get("/institutions/{institution_guid}/credentials")
def get_institution_credentials(institution_guid: str):
    """Get required credentials for an institution."""
    mx = MXService()
    try:
        credentials = mx.get_institution_credentials(institution_guid)
        return [
            {
                "guid": c.get("guid"),
                "label": c.get("label"),
                "type": c.get("type"),
                "required": c.get("required", True)
            }
            for c in credentials
        ]
    except Exception as e:
        return {"error": str(e)}


@router.post("/connect")
async def connect_institution(
    request: ConnectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect to a financial institution."""
    mx = MXService()

    try:
        # Get or create MX user
        mx_user_guid = get_or_create_mx_user(db, user)
        logger.info(f"MX User GUID: {mx_user_guid}")

        # Get institution code from guid
        institution = mx.get_institution(request.institution_guid)
        institution_code = institution.get("institution", {}).get("code")
        institution_name = institution.get("institution", {}).get("name")

        if not institution_code:
            return {"status": "error", "message": "Invalid institution"}

        # First get the required credentials for this institution
        if not request.credentials:
            # Return the required credentials fields
            try:
                required_creds = mx.get_institution_credentials(request.institution_guid)
                return {
                    "status": "credentials_required",
                    "institution_guid": request.institution_guid,
                    "institution_name": institution_name,
                    "credentials": [
                        {
                            "guid": c.get("guid"),
                            "label": c.get("label"),
                            "type": c.get("type"),
                            "required": c.get("required", True)
                        }
                        for c in required_creds
                    ],
                    "message": "Please provide credentials"
                }
            except:
                pass

        # Create member with credentials
        logger.info(f"Creating member with user_guid={mx_user_guid}, institution_code={institution_code}")
        result = mx.create_member(
            user_guid=mx_user_guid,
            institution_code=institution_code,
            credentials=request.credentials
        )

        member_data = result.get("member", {})

        # Get MXUser ID from database
        mx_user_db = db.query(MXUser).filter(MXUser.user_id == str(user.id)).first()

        # Save member to database - default to True for is_connected since we just created it
        # The aggregation will update this status
        mx_member = MXMember(
            guid=member_data.get("guid"),
            user_id=str(user.id),
            mx_user_id=mx_user_db.id,
            institution_guid=request.institution_guid,
            institution_name=institution_name or "Unknown",
            is_connected=True  # Default to connected since we just successfully authenticated
        )
        db.add(mx_member)
        db.commit()

        logger.info(f"Member created: {member_data}")

        # Trigger aggregation to start fetching account data
        try:
            mx.aggregate_member(mx_user_guid, member_data.get("guid"))
        except Exception as e:
            logger.warning(f"Aggregation trigger error: {e}")

        # Check if MFA is needed
        if member_data.get("is_mfa"):
            return {
                "status": "mfa_required",
                "member_guid": member_data.get("guid"),
                "message": "MFA required. Please provide credentials."
            }

        # Check connection status
        connection_status = member_data.get("connection_status", "")
        if connection_status in ["CREATED", "CONNECTED", "UPDATED"]:
            # Connection in progress or successful
            return {
                "status": "connecting",
                "member_guid": member_data.get("guid"),
                "message": f"Connecting to {institution_name}... Please wait."
            }

        # If connected, start sync
        if member_data.get("is_connected"):
            await run_mx_sync(str(user.id))

        return {
            "status": "connected",
            "member_guid": member_data.get("guid"),
            "message": "Successfully connected"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@router.post("/members/{member_guid}/resume")
async def resume_member(
    member_guid: str,
    credentials: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume member connection with new credentials."""
    mx = MXService()

    # Get member
    mx_member = db.query(MXMember).filter(
        MXMember.guid == member_guid,
        MXMember.user_id == str(user.id)
    ).first()

    if not mx_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Get MX user
    mx_user_db = db.query(MXUser).filter(MXUser.user_id == str(user.id)).first()
    if not mx_user_db:
        raise HTTPException(status_code=400, detail="MX user not found")

    try:
        result = mx.resume_member(
            user_guid=mx_user_db.mx_user_guid,
            member_guid=member_guid,
            credentials=credentials
        )

        member_data = result.get("member", {})

        if member_data.get("is_mfa"):
            return {
                "status": "mfa_required",
                "message": "MFA required"
            }

        if member_data.get("is_connected"):
            mx_member.is_connected = True
            db.commit()
            await run_mx_sync(str(user.id))

        return {
            "status": "connected",
            "message": "Successfully reconnected"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@router.delete("/members/{member_guid}")
def disconnect_member(
    member_guid: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect a member."""
    mx = MXService()

    # Get member
    mx_member = db.query(MXMember).filter(
        MXMember.guid == member_guid,
        MXMember.user_id == str(user.id)
    ).first()

    if not mx_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Try to delete from MX, but don't fail if it's already gone
    try:
        mx_user_db = db.query(MXUser).filter(MXUser.user_id == str(user.id)).first()
        if mx_user_db:
            mx.delete_member(mx_user_db.mx_user_guid, member_guid)
    except Exception as e:
        # Member might already be deleted from MX, continue with local delete
        logger.warning(f"MX delete warning: {e}")

    # Always delete from local database
    db.delete(mx_member)
    db.commit()

    return {"status": "disconnected", "message": "Member disconnected"}


@router.get("/members/{member_guid}/status")
def get_member_status(
    member_guid: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get member connection status."""
    mx = MXService()

    # Get member from database
    mx_member = db.query(MXMember).filter(
        MXMember.guid == member_guid,
        MXMember.user_id == str(user.id)
    ).first()

    if not mx_member:
        raise HTTPException(status_code=404, detail="Member not found")

    try:
        # Get MX user
        mx_user_db = db.query(MXUser).filter(MXUser.user_id == str(user.id)).first()
        if not mx_user_db:
            raise HTTPException(status_code=400, detail="MX user not found")

        # Get status from MX
        result = mx.get_member_status(mx_user_db.mx_user_guid, member_guid)
        status_data = result.get("member", {})

        return {
            "guid": member_guid,
            "connection_status": status_data.get("connection_status"),
            "is_connected": status_data.get("is_connected"),
            "error": status_data.get("error")
        }
    except Exception as e:
        return {
            "guid": member_guid,
            "connection_status": mx_member.is_connected,
            "is_connected": mx_member.is_connected,
            "error": str(e)
        }


@router.get("/accounts")
def get_accounts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all accounts for user."""
    mx = MXService()

    # Get MX user
    mx_user_db = db.query(MXUser).filter(MXUser.user_id == str(user.id)).first()
    if not mx_user_db:
        raise HTTPException(status_code=400, detail="MX user not found")

    try:
        accounts = mx.get_accounts(mx_user_db.mx_user_guid)
        return [
            {
                "guid": a.get("guid"),
                "name": a.get("name"),
                "type": a.get("type"),
                "balance": a.get("balance"),
                "currency": a.get("currency_code"),
                "institution_name": a.get("institution_name")
            }
            for a in accounts
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sync")
async def sync_mx(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Trigger sync for all members."""
    members = db.query(MXMember).filter(
        MXMember.user_id == str(user.id),
        MXMember.is_connected == True
    ).all()

    if not members:
        raise HTTPException(status_code=400, detail="No connected members")

    # Get MX user
    mx_user_db = db.query(MXUser).filter(MXUser.user_id == str(user.id)).first()
    if not mx_user_db:
        raise HTTPException(status_code=400, detail="MX user not found")

    try:
        result = await run_mx_sync(mx_user_db.mx_user_guid)
        return {"status": "success", "message": "Sync completed"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

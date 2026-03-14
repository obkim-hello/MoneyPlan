import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from src.database import get_db
from src.models.user import User
from src.models.monarch_session import MonarchSession
from src.models import Account
from src.config import get_settings
from src.services.sync import run_sync, MonarchSyncService
from ..routers.auth import get_current_user

router = APIRouter(prefix="/monarch", tags=["monarch"])
logger = logging.getLogger(__name__)

settings = get_settings()


class ConnectRequest(BaseModel):
    email: str = None
    password: str = None
    mfa_code: str = None
    monarch_token: str = None


@router.get("/status")
def get_monarch_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check if MonarchMoney is connected."""
    session = db.query(MonarchSession).filter(MonarchSession.user_id == str(user.id)).first()

    if not session or not session.is_active:
        return {
            "connected": False,
            "last_sync": None,
            "email": None
        }

    return {
        "connected": session.is_active,
        "last_sync": session.last_sync.isoformat() if session.last_sync else None,
        "email": session.email
    }


@router.post("/connect")
async def connect_monarch(
    request: ConnectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect to MonarchMoney account using token or credentials."""
    # Check if monarch_token is provided
    if request.monarch_token:
        return await connect_with_token(request.monarch_token, user, db)

    # Use credentials from .env if not provided
    email = request.email or settings.monarch_email
    password = request.password or settings.monarch_password

    if not email or not password:
        return {
            "status": "error",
            "message": "MonarchMoney credentials not configured in .env"
        }

    try:
        service = MonarchSyncService(str(user.id))

        # Try to login
        login_result = await service.login(email, password, request.mfa_code)

        if not login_result.get("success"):
            service.close()
            status = login_result.get("status", "mfa_required")
            message = login_result.get("message", "Please complete verification")

            # Check for CAPTCHA
            if status == "captcha_required":
                return {
                    "status": "captcha_required",
                    "message": "CAPTCHA verification required. Please click 'Open Monarch Login' to complete verification in browser, then try again."
                }
            elif status == "mfa_required":
                return {
                    "status": "mfa_required",
                    "message": "Please enter your MFA code"
                }
            else:
                return {
                    "status": "error",
                    "message": message
                }

        # Save session
        session = db.query(MonarchSession).filter(MonarchSession.user_id == str(user.id)).first()
        if not session:
            session = MonarchSession(user_id=str(user.id), email=email, is_active=True)
            db.add(session)
        else:
            session.email = email
            session.is_active = True

        db.commit()

        # Run initial sync
        result = await service.full_sync()

        return {
            "status": "connected",
            "message": "Successfully connected to MonarchMoney"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


async def connect_with_token(monarch_token: str, user: User, db: Session):
    """Connect using a pre-existing token from browser."""
    try:
        service = MonarchSyncService(str(user.id))
        service.mm.set_token(monarch_token)

        # Verify the token works by getting accounts
        try:
            accounts = await service.mm.get_accounts()
            logger.info(f"Token validation successful, got {len(accounts)} accounts")
        except Exception as e:
            service.close()
            logger.warning(f"Token validation failed: {e}")
            return {
                "status": "error",
                "message": "Invalid token. Please get a fresh token from your browser."
            }

        # Save session
        session = db.query(MonarchSession).filter(MonarchSession.user_id == str(user.id)).first()
        if not session:
            session = MonarchSession(user_id=str(user.id), email="token-auth", is_active=True)
            db.add(session)
        else:
            session.email = "token-auth"
            session.is_active = True

        db.commit()

        # Run initial sync
        result = await service.full_sync()

        return {
            "status": "connected",
            "message": "Successfully connected to MonarchMoney"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@router.post("/sync")
async def sync_monarch(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Manually trigger sync from MonarchMoney."""
    # Get stored credentials
    session = db.query(MonarchSession).filter(MonarchSession.user_id == str(user.id)).first()

    if not session or not session.is_active:
        raise HTTPException(status_code=400, detail="MonarchMoney not connected")

    # Use credentials from settings (in production, encrypt and store in DB)
    email = settings.monarch_email
    password = settings.monarch_password

    if not email or not password:
        raise HTTPException(status_code=400, detail="MonarchMoney credentials not configured")

    # Run sync in background
    result = await run_sync(str(user.id), email, password)

    return result


@router.get("/accounts")
def get_synced_accounts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get synced accounts."""
    accounts = db.query(Account).filter(Account.user_id == str(user.id)).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "type": a.account_type,
            "balance": a.balance,
            "currency": a.currency,
            "category": a.category
        }
        for a in accounts
    ]

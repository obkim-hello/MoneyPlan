import asyncio
from datetime import datetime
from typing import Optional
import uuid
import traceback
from monarchmoney import MonarchMoney, MonarchMoneyEndpoints, RequireMFAException, LoginFailedException
from sqlalchemy.orm import Session

# Monkey-patch the API endpoint to use new monarch.com URL
MonarchMoneyEndpoints.BASE_URL = "https://api.monarch.com"

from src.config import get_settings
from src.models import Account, Holding, MonarchSession, Snapshot
from src.models.account import AccountType, AccountCategoryType
from src.models.holding import AssetType, HoldingCategory
from src.models.mx_member import MXUser
from src.database import SessionLocal

settings = get_settings()


class MonarchSyncService:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.mm = MonarchMoney()
        self.db = SessionLocal()

    def close(self):
        self.db.close()

    async def login(self, email: str, password: str, mfa_code: str = None) -> dict:
        """Login to MonarchMoney. Returns dict with status."""
        try:
            # If MFA code is provided, handle the MFA flow
            if mfa_code:
                try:
                    await self.mm.login(email, password)
                except RequireMFAException:
                    # MFA is required - now authenticate with the code
                    await self.mm.multi_factor_authenticate(email, password, mfa_code)
                except Exception as initial_error:
                    print(f"Initial login error: {initial_error}")
                    traceback.print_exc()
                    # Try MFA anyway
                    await self.mm.multi_factor_authenticate(email, password, mfa_code)

                # Verify login worked
                await self.mm.get_accounts()
                return {"success": True}

            # No MFA code - try normal login
            await self.mm.login(email, password)
            # Verify login worked
            await self.mm.get_accounts()
            return {"success": True}
        except RequireMFAException as e:
            # MFA is required but no code provided
            print(f"MFA required: {e}")
            return {"success": False, "status": "mfa_required", "message": str(e)}
        except LoginFailedException as e:
            error_msg = str(e)
            print(f"Login failed: {error_msg}")
            traceback.print_exc()

            # Check for CAPTCHA
            if "captcha" in error_msg.lower():
                return {"success": False, "status": "captcha_required", "message": "CAPTCHA verification required. Please complete verification in browser first."}

            return {"success": False, "status": "error", "message": error_msg}
        except Exception as e:
            error_msg = str(e)
            print(f"Login error: {error_msg}")
            traceback.print_exc()

            # Check if it's an MFA requirement
            if "mfa" in error_msg.lower() or "two-factor" in error_msg.lower() or "verification" in error_msg.lower():
                return {"success": False, "status": "mfa_required", "message": error_msg}

            # Check for CAPTCHA
            if "captcha" in error_msg.lower():
                return {"success": False, "status": "captcha_required", "message": "CAPTCHA verification required. Please complete verification in browser first."}

            # HTTP 525 or other errors - return False to indicate login failed
            return {"success": False, "status": "error", "message": error_msg}

    async def sync_accounts(self):
        """Sync accounts from MonarchMoney."""
        accounts_data = await self.mm.get_accounts()

        # Get existing account IDs for this user
        existing_ids = {a.monarch_id for a in self.db.query(Account).filter(Account.user_id == self.user_id).all()}

        synced_ids = set()

        for account_data in accounts_data:
            monarch_id = account_data.get("id")
            synced_ids.add(monarch_id)

            # Check if account exists
            account = self.db.query(Account).filter(
                Account.monarch_id == monarch_id,
                Account.user_id == self.user_id
            ).first()

            if not account:
                account = Account(
                    id=str(monarch_id),
                    user_id=self.user_id,
                    monarch_id=monarch_id,
                    name=account_data.get("name", "Unknown"),
                    account_type=account_data.get("type", "other"),
                    balance=account_data.get("currentBalance", 0) or 0,
                    currency=account_data.get("currency", "USD") or "USD"
                )
                self.db.add(account)
            else:
                account.name = account_data.get("name", account.name)
                account.balance = account_data.get("currentBalance", account.balance) or 0

        self.db.commit()
        return accounts_data

    async def sync_holdings(self):
        """Sync holdings from MonarchMoney."""
        holdings_data = await self.mm.get_account_holdings()

        for holding_data in holdings_data:
            # Find account
            account_id = holding_data.get("accountId")
            account = self.db.query(Account).filter(
                Account.monarch_id == account_id,
                Account.user_id == self.user_id
            ).first()

            if not account:
                continue

            symbol = holding_data.get("symbol", "CASH")
            holding = self.db.query(Holding).filter(
                Holding.account_id == account.id,
                Holding.symbol == symbol
            ).first()

            if not holding:
                holding = Holding(
                    account_id=account.id,
                    symbol=symbol,
                    name=holding_data.get("name", symbol),
                    quantity=holding_data.get("quantity", 0) or 0,
                    cost_basis=holding_data.get("costBasis", 0) or 0,
                    current_price=holding_data.get("price", 0) or 0,
                    asset_type=holding_data.get("type", "cash")
                )
                self.db.add(holding)
            else:
                holding.quantity = holding_data.get("quantity", holding.quantity) or 0
                holding.current_price = holding_data.get("price", holding.current_price) or 0
                holding.cost_basis = holding_data.get("costBasis", holding.cost_basis) or 0

        self.db.commit()
        return holdings_data

    async def create_snapshot(self):
        """Create a daily asset snapshot."""
        accounts = self.db.query(Account).filter(Account.user_id == self.user_id).all()
        holdings = self.db.query(Holding).join(Account).filter(Account.user_id == self.user_id).all()

        total_assets = sum(a.balance for a in accounts if a.balance and a.balance > 0)
        investment_holdings = sum((h.current_price or 0) * (h.quantity or 0) for h in holdings)
        total_assets += investment_holdings

        snapshot = Snapshot(
            user_id=self.user_id,
            date=datetime.utcnow().date(),
            total_assets=total_assets,
            total_liabilities=abs(sum(a.balance for a in accounts if a.balance and a.balance < 0)),
            net_worth=total_assets,
            cash_balance=sum(a.balance for a in accounts if a.account_type in ["depository", "savings"]),
            investment_balance=investment_holdings
        )
        self.db.add(snapshot)
        self.db.commit()
        return snapshot

    async def full_sync(self):
        """Run full sync from MonarchMoney."""
        try:
            await self.sync_accounts()
            await self.sync_holdings()
            await self.create_snapshot()

            # Update last sync time
            session = self.db.query(MonarchSession).filter(MonarchSession.user_id == self.user_id).first()
            if session:
                session.last_sync = datetime.utcnow()
                self.db.commit()

            return {"status": "success"}
        except Exception as e:
            print(f"Sync error: {e}")
            return {"status": "error", "message": str(e)}
        finally:
            self.close()


async def run_sync(user_id: str, email: str, password: str):
    """Helper to run sync."""
    service = MonarchSyncService(user_id)

    # Login first
    logged_in = await service.login(email, password)
    if not logged_in:
        return {"status": "error", "message": "MFA required"}

    return await service.full_sync()


# ============ MX Sync ============

from src.services.mx import MXService
from src.models import MXMember


async def run_mx_sync(user_id: str):
    """Run sync for MX connected accounts."""
    db = SessionLocal()
    mx = MXService()

    try:
        # Get MX user GUID
        mx_user = db.query(MXUser).filter(MXUser.user_id == user_id).first()
        if not mx_user:
            return {"status": "error", "message": "MX user not found"}

        mx_user_guid = mx_user.mx_user_guid

        # Get all connected members
        members = db.query(MXMember).filter(
            MXMember.user_id == user_id,
            MXMember.is_connected == True
        ).all()

        if not members:
            return {"status": "error", "message": "No connected members"}

        # Sync accounts for each member
        for member in members:
            accounts = mx.get_accounts(mx_user_guid, member.guid)

            for acc_data in accounts:
                # Map MX account type to our AccountType enum (MX types are uppercase)
                mx_type = acc_data.get("type", "").upper()
                if mx_type in ["CHECKING", "SAVINGS", "DEPOSITORY"]:
                    account_type = AccountType.BANK
                elif mx_type in ["INVESTMENT", "BROKERAGE"]:
                    account_type = AccountType.INVESTMENT
                elif mx_type in ["CREDIT_CARD"]:
                    account_type = AccountType.CREDIT
                elif mx_type in ["LOAN", "MORTGAGE"]:
                    account_type = AccountType.LOAN
                elif mx_type in ["CRYPTO"]:
                    account_type = AccountType.CRYPTO
                else:
                    account_type = AccountType.OTHER

                # Category is asset unless it's a credit/loan/mortgage
                if account_type in [AccountType.BANK, AccountType.INVESTMENT, AccountType.CRYPTO]:
                    category = AccountCategoryType.ASSET
                else:
                    category = AccountCategoryType.LIABILITY

                # Check if account exists
                account = db.query(Account).filter(
                    Account.monarch_id == acc_data.get("guid"),
                    Account.user_id == user_id
                ).first()

                if not account:
                    account = Account(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        monarch_id=acc_data.get("guid"),
                        name=acc_data.get("name", "Unknown"),
                        account_type=account_type,
                        category=category,
                        institution=acc_data.get("institution_name"),
                        current_balance=acc_data.get("balance", 0) or 0,
                        currency=acc_data.get("currency_code", "USD") or "USD"
                    )
                    db.add(account)
                else:
                    account.name = acc_data.get("name", account.name)
                    account.current_balance = acc_data.get("balance", account.current_balance) or 0
                    account.institution = acc_data.get("institution_name")

        db.commit()

        # Sync holdings
        for member in members:
            try:
                holdings = mx.get_holdings(mx_user_guid, member.guid)

                # First, get all accounts for this user to determine which are bank accounts
                account_guids = set()
                for acc_data in accounts:
                    if acc_data.get("guid"):
                        account_guids.add(acc_data.get("guid"))

                # Get account objects keyed by GUID for quick lookup
                accounts_by_guid = {}
                user_accounts = db.query(Account).filter(Account.user_id == user_id).all()
                for account in user_accounts:
                    if account.monarch_id:
                        accounts_by_guid[account.monarch_id] = account

                for h_data in holdings:
                    # Map MX holding type to AssetType enum
                    mx_type = h_data.get("type", "").lower() if h_data.get("type") else "other"
                    if mx_type in ["stock", "equity"]:
                        asset_type = AssetType.STOCK
                    elif mx_type in ["etf"]:
                        asset_type = AssetType.ETF
                    elif mx_type in ["mutual_fund"]:
                        asset_type = AssetType.MUTUAL_FUND
                    elif mx_type in ["bond"]:
                        asset_type = AssetType.BOND
                    elif mx_type in ["cash", "money"]:
                        asset_type = AssetType.CASH
                    elif mx_type in ["crypto"]:
                        asset_type = AssetType.CRYPTO
                    else:
                        asset_type = AssetType.OTHER

                    # Default category based on asset type
                    if asset_type in [AssetType.STOCK, AssetType.ETF, AssetType.MUTUAL_FUND]:
                        category = HoldingCategory.EQUITY
                    elif asset_type == AssetType.BOND:
                        category = HoldingCategory.FIXED_INCOME
                    elif asset_type == AssetType.CASH:
                        category = HoldingCategory.CASH
                    else:
                        category = HoldingCategory.ALTERNATIVE

                    quantity = h_data.get("quantity", 0) or 0
                    current_price = h_data.get("price", 0) or 0
                    # MX might return marketValue as total value, or price as per-share
                    current_value = h_data.get("marketValue") or h_data.get("value") or (quantity * current_price)
                    # If quantity is 0 but we have a price, treat price as total value
                    if quantity == 0 and current_price > 0:
                        current_value = current_price
                        current_price = current_value  # Store total as price for consistency

                    # Find existing holding
                    account_guid = h_data.get("account_guid")
                    account = accounts_by_guid.get(account_guid)

                    if account:
                        # For bank accounts, only allow CASH holdings
                        is_bank_account = account.account_type.value.upper() == "BANK"

                        if is_bank_account:
                            # Bank accounts: always use CASH symbol, ignore any other holdings from MX
                            # Get or create the CASH holding
                            symbol = "CASH"
                            holding = db.query(Holding).filter(
                                Holding.account_id == account.id,
                                Holding.symbol == "CASH"
                            ).first()

                            if not holding:
                                holding = Holding(
                                    id=str(uuid.uuid4()),
                                    account_id=account.id,
                                    user_id=user_id,
                                    symbol="CASH",
                                    name="Cash",
                                    asset_type=AssetType.CASH,
                                    category=HoldingCategory.CASH,
                                    quantity=1,
                                    cost_basis=account.current_balance or 0,
                                    current_price=account.current_balance or 0,
                                    current_value=account.current_balance or 0,
                                    currency=account.currency or "USD"
                                )
                                db.add(holding)
                            else:
                                # Update CASH holding with account balance
                                holding.current_price = account.current_balance or 0
                                holding.current_value = account.current_balance or 0
                                holding.cost_basis = account.current_balance or 0

                            # Delete any non-CASH holdings for this bank account
                            db.query(Holding).filter(
                                Holding.account_id == account.id,
                                Holding.symbol != "CASH"
                            ).delete()
                        else:
                            # Investment accounts: allow all holdings
                            symbol = h_data.get("symbol") or "CASH"

                            holding = db.query(Holding).filter(
                                Holding.account_id == account.id,
                                Holding.symbol == symbol
                            ).first()

                            if not holding:
                                holding = Holding(
                                    id=str(uuid.uuid4()),
                                    account_id=account.id,
                                    user_id=user_id,
                                    symbol=symbol,
                                    name=h_data.get("name") or symbol,
                                    asset_type=asset_type,
                                    category=category,
                                    quantity=quantity,
                                    cost_basis=h_data.get("cost_basis", 0) or 0,
                                    current_price=current_price,
                                    current_value=current_value,
                                    currency=h_data.get("currency_code", "USD") or "USD"
                                )
                                db.add(holding)
                            else:
                                holding.quantity = quantity
                                holding.current_price = current_price
                                holding.current_value = current_value
                                holding.cost_basis = h_data.get("cost_basis", holding.cost_basis) or 0
            except Exception as e:
                print(f"Holdings sync error: {e}")

        # For bank accounts that have no holdings, create a CASH holding
        user_accounts = db.query(Account).filter(Account.user_id == user_id).all()
        for account in user_accounts:
            if account.account_type.value.upper() == "BANK":
                existing_cash = db.query(Holding).filter(
                    Holding.account_id == account.id,
                    Holding.symbol == "CASH"
                ).first()

                if not existing_cash:
                    holding = Holding(
                        id=str(uuid.uuid4()),
                        account_id=account.id,
                        user_id=user_id,
                        symbol="CASH",
                        name="Cash",
                        asset_type=AssetType.CASH,
                        category=HoldingCategory.CASH,
                        quantity=1,
                        cost_basis=account.current_balance or 0,
                        current_price=account.current_balance or 0,
                        current_value=account.current_balance or 0,
                        currency=account.currency or "USD"
                    )
                    db.add(holding)

        db.commit()

        db.commit()

        # Update last sync time
        for member in members:
            member.last_sync = datetime.utcnow()

        db.commit()

        # Create snapshot
        user_accounts = db.query(Account).filter(Account.user_id == user_id).all()
        total_assets = sum(a.current_balance for a in user_accounts if a.current_balance and a.current_balance > 0)

        snapshot = Snapshot(
            user_id=user_id,
            date=datetime.utcnow().date(),
            total_assets=total_assets,
            total_liabilities=abs(sum(a.current_balance for a in user_accounts if a.current_balance and a.current_balance < 0)),
            net_worth=total_assets,
            cash_balance=sum(a.current_balance for a in user_accounts if a.account_type == AccountType.BANK),
            investment_balance=sum(h.current_value or 0 for h in db.query(Holding).join(Account).filter(Account.user_id == user_id).all())
        )
        db.add(snapshot)
        db.commit()

        return {"status": "success"}

    except Exception as e:
        print(f"MX Sync error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

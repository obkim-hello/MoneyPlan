from monarchmoney import MonarchMoney, MonarchMoneyEndpoints


# Monkey-patch the API endpoint to use new monarch.com URL
MonarchMoneyEndpoints.BASE_URL = "https://api.monarch.com"

from src.config import get_settings

settings = get_settings()


class MFANeededError(Exception):
    """Exception raised when MFA is required to complete login."""
    pass


class MonarchService:
    def __init__(self, email: str = None, password: str = None):
        self.email = email or settings.monarch_email
        self.password = password or settings.monarch_password
        self.mm = MonarchMoney()
        self._mfa_pending = False

    async def login(self, mfa_code: str = None):
        """
        Login to Monarch. If mfa_code is not provided and MFA is required,
        raises MFANeededError.

        Args:
            mfa_code: Optional MFA code. If not provided and MFA is required,
                     MFANeededError will be raised.

        Raises:
            MFANeededError: If MFA is required and no mfa_code was provided.
        """
        await self.mm.login(self.email, self.password)

        if mfa_code:
            await self.mm.multi_factor_authenticate(self.email, self.password, mfa_code)
            self._mfa_pending = False
        else:
            # Check if MFA is required by attempting the flow without a code
            # The monarch library will raise an exception if MFA is needed
            try:
                # Try to authenticate without MFA code - this should fail if MFA is required
                await self.mm.multi_factor_authenticate(self.email, self.password, "")
            except Exception as e:
                # MFA is required - set flag and raise exception
                self._mfa_pending = True
                raise MFANeededError("MFA authentication required. Please provide MFA code.") from e

    async def complete_mfa_login(self, mfa_code: str):
        """
        Complete the login flow with the MFA code.
        Must be called after login() raises MFANeededError.

        Args:
            mfa_code: The MFA code from the user.

        Raises:
            RuntimeError: If there is no pending MFA login.
        """
        if not self._mfa_pending:
            raise RuntimeError("No MFA login pending. Call login() first.")

        await self.mm.multi_factor_authenticate(self.email, self.password, mfa_code)
        self._mfa_pending = False

    async def get_accounts(self):
        return await self.mm.get_accounts()

    async def get_holdings(self):
        return await self.mm.get_account_holdings()

    async def get_transactions(self, start_date=None, end_date=None):
        return await self.mm.get_transactions(startDate=start_date, endDate=end_date)

    async def get_recurring_transactions(self):
        return await self.mm.get_recurring_transactions()

    async def get_cashflow(self):
        return await self.mm.get_cashflow()

from monarchmoney import MonarchMoney
from src.config import get_settings

settings = get_settings()


class MonarchService:
    def __init__(self, email: str = None, password: str = None):
        self.email = email or settings.monarch_email
        self.password = password or settings.monarch_password
        self.mm = MonarchMoney()

    async def login(self):
        await self.mm.login(self.email, self.password)
        await self.mm.multi_factor_authenticate(self.email, self.password, input("Enter MFA code: "))

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

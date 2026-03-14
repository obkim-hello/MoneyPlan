import requests
from typing import Dict, List, Optional, Any
from src.config import get_settings

settings = get_settings()

MX_BASE_URL = "https://int-api.mx.com"  # Use for testing, change to api.mx.com for production


class MXService:
    def __init__(self):
        self.client_id = settings.mx_client_id
        self.api_key = settings.mx_api_key
        self.base_url = MX_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Version": "v20250224",
            "Authorization": f"Basic {settings.mx_auth_value}"
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)

        print(f"MX API: {method} {url} -> {response.status_code}")

        if response.status_code >= 400:
            raise Exception(f"MX API Error: {response.status_code} - {response.text}")

        if not response.text:
            return {}

        return response.json()

    # ============ User Management ============

    def create_user(self, user_id: str, email: str = None) -> Dict[str, Any]:
        """Create a new MX user. Returns the MX-generated user GUID."""
        # Always create a new user - MX generates its own unique guid
        print(f"MXService.create_user: Creating user with email {email}")
        result = self._request("POST", "/users", json={
            "user": {
                "email": email or f"{user_id}@moneyplan.local"
            }
        })
        print(f"MXService.create_user: Result = {result}")
        user = result.get("user", {})
        return {"guid": user.get("guid")}

    def get_user(self, user_guid: str) -> Dict[str, Any]:
        """Get user by GUID."""
        return self._request("GET", f"/users/{user_guid}")

    # ============ Institution ============

    def list_institutions(self, name: str = None, page: int = 1, per_page: int = 25) -> List[Dict]:
        """List available institutions."""
        params = {"page": page, "per_page": per_page}
        if name:
            params["name"] = name

        result = self._request("GET", "/institutions", params=params)
        return result.get("institutions", [])

    def get_institution(self, institution_guid: str) -> Dict[str, Any]:
        """Get institution details."""
        return self._request("GET", f"/institutions/{institution_guid}")

    def get_institution_credentials(self, institution_guid: str) -> List[Dict]:
        """Get required credentials for an institution."""
        result = self._request("GET", f"/institutions/{institution_guid}/credentials")
        return result.get("credentials", [])

    # ============ Member (Bank Connection) ============

    def create_member(self, user_guid: str, institution_code: str, credentials: List[Dict] = None) -> Dict[str, Any]:
        """Create a member (bank connection) for a user."""
        payload = {
            "member": {
                "institution_code": institution_code,
            }
        }

        if credentials:
            payload["member"]["credentials"] = credentials

        return self._request("POST", f"/users/{user_guid}/members", json=payload)

    def get_member(self, user_guid: str, member_guid: str) -> Dict[str, Any]:
        """Get member status."""
        return self._request("GET", f"/users/{user_guid}/members/{member_guid}")

    def list_members(self, user_guid: str) -> List[Dict]:
        """List all members for a user."""
        result = self._request("GET", f"/users/{user_guid}/members")
        return result.get("members", [])

    def delete_member(self, user_guid: str, member_guid: str) -> None:
        """Delete a member (disconnect bank)."""
        self._request("DELETE", f"/users/{user_guid}/members/{member_guid}")

    def resume_member(self, user_guid: str, member_guid: str, credentials: Dict[str, str]) -> Dict[str, Any]:
        """Resume member connection with new credentials."""
        payload = {
            "member": {
                "credentials": [
                    {"guid": k, "value": v} for k, v in credentials.items()
                ]
            }
        }
        return self._request("POST", f"/users/{user_guid}/members/{member_guid}/resume", json=payload)

    # ============ Account & Holdings ============

    def get_accounts(self, user_guid: str, member_guid: str = None) -> List[Dict]:
        """Get accounts for a user."""
        if member_guid:
            result = self._request("GET", f"/users/{user_guid}/members/{member_guid}/accounts")
        else:
            result = self._request("GET", f"/users/{user_guid}/accounts")

        return result.get("accounts", [])

    def get_holdings(self, user_guid: str, member_guid: str = None) -> List[Dict]:
        """Get investment holdings."""
        if member_guid:
            result = self._request("GET", f"/users/{user_guid}/members/{member_guid}/holdings")
        else:
            result = self._request("GET", f"/users/{user_guid}/holdings")

        return result.get("holdings", [])

    def get_transactions(self, user_guid: str, member_guid: str = None, from_date: str = None, to_date: str = None) -> List[Dict]:
        """Get transactions."""
        params = {}
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date

        if member_guid:
            result = self._request("GET", f"/users/{user_guid}/members/{member_guid}/transactions", params=params)
        else:
            result = self._request("GET", f"/users/{user_guid}/transactions", params=params)

        return result.get("transactions", [])

    # ============ Cash Flow ============

    def get_cash_flow(self, user_guid: str) -> Dict[str, Any]:
        """Get monthly cash flow."""
        return self._request("GET", f"/users/{user_guid}/cash_flow")

    # ============ Sync ============

    def aggregate_member(self, user_guid: str, member_guid: str) -> Dict[str, Any]:
        """Trigger aggregation for a member."""
        return self._request("POST", f"/users/{user_guid}/members/{member_guid}/aggregate")

    def get_member_status(self, user_guid: str, member_guid: str) -> Dict[str, Any]:
        """Get member connection status."""
        return self._request("GET", f"/users/{user_guid}/members/{member_guid}/status")

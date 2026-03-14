from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    jwt_secret: str = "change-me-in-production"
    monarch_email: str = ""
    monarch_password: str = ""
    mx_client_id: str = ""
    mx_api_key: str = ""
    mx_auth_value: str = ""
    snaptrade_secret: str = ""
    snaptrade_client_id: str = ""

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        extra = "ignore"

@lru_cache
def get_settings():
    return Settings()

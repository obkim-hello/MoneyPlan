from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    jwt_secret: str = "change-me-in-production"
    monarch_email: str = ""
    monarch_password: str = ""

    class Config:
        env_file = ".env"

@lru_cache
def get_settings():
    return Settings()

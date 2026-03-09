from celery import Celery
from src.config import get_settings

settings = get_settings()
celery_app = Celery("moneyplan", broker=settings.redis_url)


@celery_app.task
def sync_monarch_data(user_id: str):
    # Sync accounts, holdings, transactions from MonarchMoney
    # This is a placeholder - implementation depends on monarchmoney library
    pass


@celery_app.task
def create_snapshot(user_id: str):
    # Create daily asset snapshot
    # This is a placeholder
    pass

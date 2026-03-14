from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import all models to register them with Base, then create tables
from .models import User, Account, Holding, Transaction, Snapshot, Budget, Goal, Alert, MonarchSession, MXMember, MXUser, Pool, Allocation, PoolSnapshot, AllocationSnapshot, Base  # noqa: F401, E402
Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

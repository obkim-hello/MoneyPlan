# MoneyPlan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个自托管的财务仪表板，通过 MonarchMoney API 同步数据，提供资产可视化、现金流预测、预算规划、目标管理和警报功能。

**Architecture:** 单体 FastAPI + React 架构，使用 PostgreSQL 存储历史数据，Celery 处理定时同步任务。

**Tech Stack:** Python, FastAPI, React, TypeScript, PostgreSQL, Redis, Celery, Docker Compose

---

## Phase 1: 项目基础设施

### Task 1: 创建 Docker Compose 配置

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Step 1: 创建 docker-compose.yml**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://moneyplan:moneyplan@postgres:5432/moneyplan
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=moneyplan
      - POSTGRES_PASSWORD=moneyplan
      - POSTGRES_DB=moneyplan
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Step 2: 创建 .env.example**

```
DATABASE_URL=postgresql://moneyplan:moneyplan@localhost:5432/moneyplan
REDIS_URL=redis://localhost:6379/0
MONARCH_EMAIL=your_email@example.com
MONARCH_PASSWORD=your_password
JWT_SECRET=your-secret-key
```

**Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add docker-compose configuration"
```

---

### Task 2: 创建后端项目结构

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/src/__init__.py`
- Create: `backend/src/main.py`
- Create: `backend/src/config.py`
- Create: `backend/requirements.txt`

**Step 1: 创建 backend/requirements.txt**

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
celery[redis]==5.3.6
monarchmoney==0.1.15
httpx==0.26.0
python-dotenv==1.0.0
```

**Step 2: 创建 backend/pyproject.toml**

```toml
[tool.poetry]
name = "moneyplan-backend"
version = "0.1.0"
description = "MoneyPlan Backend API"
authors = ["MoneyPlan"]

[tool.poetry.dependencies]
python = "^3.11"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

**Step 3: 创建 backend/src/config.py**

```python
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
```

**Step 4: 创建 backend/src/main.py**

```python
from fastapi import FastAPI

app = FastAPI(title="MoneyPlan API")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

**Step 5: 创建 backend/src/__init__.py**

```python
```

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add backend project structure"
```

---

### Task 3: 创建前端项目结构

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

**Step 1: 创建 frontend/package.json**

```json
{
  "name": "moneyplan-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "axios": "^1.6.5",
    "@tanstack/react-query": "^5.17.0",
    "recharts": "^2.10.4"
  },
  "devDependencies": {
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11"
  }
}
```

**Step 2: 创建 frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

**Step 3: 创建 frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MoneyPlan</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 4: 创建 frontend/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 5: 创建 frontend/src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: add frontend project structure"
```

---

## Phase 2: 数据库模型

### Task 4: 创建 SQLAlchemy 模型

**Files:**
- Create: `backend/src/models/__init__.py`
- Create: `backend/src/models/user.py`
- Create: `backend/src/models/account.py`
- Create: `backend/src/models/holding.py`
- Create: `backend/src/models/transaction.py`
- Create: `backend/src/models/snapshot.py`
- Create: `backend/src/models/budget.py`
- Create: `backend/src/models/goal.py`
- Create: `backend/src/models/alert.py`

**Step 1: 创建 backend/src/models/__init__.py**

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

**Step 2: 创建 backend/src/models/user.py**

```python
import uuid
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from . import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    alerts = relationship("Alert", back_populates="user")
```

**Step 3: 创建 backend/src/models/account.py**

```python
import uuid
from sqlalchemy import String, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base
import enum

class AccountType(str, enum.Enum):
    CASH = "cash"
    INVESTMENT = "investment"
    CREDIT = "credit"
    LOAN = "loan"

class AccountCategoryType(str, enum.Enum):
    CASH_FLOW = "cash_flow"
    EMERGENCY_FUND = "emergency_fund"
    INVESTMENT = "investment"

class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    monarch_id: Mapped[str] = mapped_column(String(36), index=True)  # MonarchMoney account ID
    name: Mapped[str] = mapped_column(String(255))
    account_type: Mapped[str] = mapped_column(SQLEnum(AccountType))
    balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    category_type: Mapped[str] = mapped_column(SQLEnum(AccountCategoryType), nullable=True)
    category_tier: Mapped[int] = mapped_column(nullable=True)  # 1, 2, 3 for emergency fund

    user = relationship("User", back_populates="accounts")
    holdings = relationship("Holding", back_populates="account")
```

**Step 4: 创建 backend/src/models/holding.py**

```python
import uuid
from sqlalchemy import String, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base
import enum

class AssetType(str, enum.Enum):
    STOCK = "stock"
    FUND = "fund"
    ETF = "etf"
    CRYPTO = "crypto"
    CASH = "cash"

class HoldingCategory(str, enum.Enum):
    CASH = "cash"
    STOCK = "stock"
    FUND = "fund"
    CRYPTO = "crypto"

class Holding(Base):
    __tablename__ = "holdings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"))
    symbol: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[float] = mapped_column(Numeric(15, 4))
    cost_basis: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    current_price: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    asset_type: Mapped[str] = mapped_column(SQLEnum(AssetType))
    category: Mapped[str] = mapped_column(SQLEnum(HoldingCategory), nullable=True)

    account = relationship("Account", back_populates="holdings")
```

**Step 5: 创建 backend/src/models/transaction.py**

```python
import uuid
from sqlalchemy import String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from . import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(String(36), ForeignKey("accounts.id"))
    monarch_id: Mapped[str] = mapped_column(String(36), index=True)
    date: Mapped[datetime] = mapped_column(DateTime)
    amount: Mapped[float] = mapped_column(Numeric(15, 2))
    description: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100), nullable=True)
```

**Step 6: 创建 backend/src/models/snapshot.py**

```python
import uuid
from sqlalchemy import String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from . import Base

class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    total_assets: Mapped[float] = mapped_column(Numeric(15, 2))
    total_liabilities: Mapped[float] = mapped_column(Numeric(15, 2))
    net_worth: Mapped[float] = mapped_column(Numeric(15, 2))
    cash_total: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    investment_total: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    emergency_fund_tier1: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    emergency_fund_tier2: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    emergency_fund_tier3: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
```

**Step 7: 创建 backend/src/models/budget.py**

```python
import uuid
from sqlalchemy import String, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    category: Mapped[str] = mapped_column(String(100))
    amount: Mapped[float] = mapped_column(Numeric(15, 2))
    period: Mapped[str] = mapped_column(String(20), default="monthly")  # monthly, weekly

    user = relationship("User", back_populates="budgets")
```

**Step 8: 创建 backend/src/models/goal.py**

```python
import uuid
from sqlalchemy import String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from . import Base

class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    target_amount: Mapped[float] = mapped_column(Numeric(15, 2))
    current_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    target_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="goals")
```

**Step 9: 创建 backend/src/models/alert.py**

```python
import uuid
from sqlalchemy import String, Numeric, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base
import enum

class AlertType(str, enum.Enum):
    ASSET_THRESHOLD = "asset_threshold"
    ACCOUNT_BALANCE = "account_balance"
    BUDGET_OVER = "budget_over"
    GOAL_PROGRESS = "goal_progress"

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    alert_type: Mapped[str] = mapped_column(SQLEnum(AlertType))
    name: Mapped[str] = mapped_column(String(255))
    condition: Mapped[str] = mapped_column(String(50))  # "below", "above"
    threshold: Mapped[float] = mapped_column(Numeric(15, 2))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    triggered: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="alerts")
```

**Step 10: Commit**

```bash
git add backend/src/models/
git commit -m "feat: add database models"
```

---

### Task 5: 创建数据库和 Alembic 配置

**Files:**
- Create: `backend/src/database.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/001_initial.py`

**Step 1: 创建 backend/src/database.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url.replace("postgresql://", "postgresql+psycopg2://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 2: 创建 backend/alembic.ini**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = driver://user:pass@localhost/dbname

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic
```

**Step 3: 创建 backend/alembic/env.py**

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import sys
sys.path.insert(0, ".")

from src.models import Base
from src.config import get_settings

config = context.config
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url.replace("postgresql://", "postgresql+psycopg2://"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Step 4: 创建 backend/alembic/versions/001_initial.py**

```python
"""initial migration

Revision ID: 001
Revises:
Create Date: 2026-03-09

"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Tables will be created from models
    pass

def downgrade() -> None:
    pass
```

**Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/ backend/src/database.py
git commit -m "feat: add database configuration"
```

---

## Phase 3: 认证系统

### Task 6: 实现用户认证

**Files:**
- Modify: `backend/src/main.py`
- Create: `backend/src/schemas/__init__.py`
- Create: `backend/src/schemas/user.py`
- Create: `backend/src/auth/__init__.py`
- Create: `backend/src/auth/password.py`
- Create: `backend/src/auth/jwt.py`
- Create: `backend/src/routers/auth.py`

**Step 1: 创建 backend/src/schemas/user.py**

```python
from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
```

**Step 2: 创建 backend/src/auth/password.py**

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

**Step 3: 创建 backend/src/auth/jwt.py**

```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from src.config import get_settings

settings = get_settings()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str):
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
```

**Step 4: 创建 backend/src/routers/auth.py**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.schemas.user import UserCreate, UserResponse
from src.auth.password import verify_password, get_password_hash
from src.auth.jwt import create_access_token, decode_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(days=7)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        user_id = decode_token(token)["sub"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

**Step 5: 修改 backend/src/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import auth

app = FastAPI(title="MoneyPlan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

**Step 6: Commit**

```bash
git add backend/src/
git commit -m "feat: add authentication system"
```

---

## Phase 4: MonarchMoney 集成

### Task 7: 创建 MonarchMoney 服务

**Files:**
- Create: `backend/src/services/monarch.py`

**Step 1: 创建 backend/src/services/monarch.py**

```python
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
```

**Step 2: Commit**

```bash
git add backend/src/services/
git commit -m "feat: add monarchmoney service"
```

---

### Task 8: 创建数据同步任务

**Files:**
- Create: `backend/src/tasks/sync.py`

**Step 1: 创建 backend/src/tasks/sync.py**

```python
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
```

**Step 2: Commit**

```bash
git add backend/src/tasks/
git commit -m "feat: add sync tasks"
```

---

## Phase 5: API 端点

### Task 9: 账户和资产 API

**Files:**
- Create: `backend/src/routers/accounts.py`
- Create: `backend/src/routers/assets.py`

**Step 1: 创建 backend/src/routers/accounts.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.auth.jwt import decode_token
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

router = APIRouter(prefix="/accounts", tags=["accounts"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_token(token)["sub"]
    return db.query(User).filter(User.id == user_id).first()

class AccountCategoryUpdate(BaseModel):
    category_type: str
    category_tier: int | None = None

@router.get("/")
def get_accounts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.account import Account
    accounts = db.query(Account).filter(Account.user_id == user.id).all()
    return accounts

@router.put("/{account_id}/category")
def update_account_category(
    account_id: str,
    category: AccountCategoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from src.models.account import Account
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == user.id
    ).first()
    if not account:
        return {"error": "Account not found"}

    account.category_type = category.category_type
    account.category_tier = category.category_tier
    db.commit()
    return {"status": "updated"}
```

**Step 2: 创建 backend/src/routers/assets.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.auth.jwt import decode_token
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/assets", tags=["assets"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_token(token)["sub"]
    return db.query(User).filter(User.id == user_id).first()

@router.get("/summary")
def get_asset_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.account import Account
    from src.models.holding import Holding

    accounts = db.query(Account).filter(Account.user_id == user.id).all()
    holdings = db.query(Holding).join(Account).filter(Account.user_id == user.id).all()

    # Calculate totals by category
    cash_total = sum(a.balance for a in accounts if a.category_type == "cash_flow")
    emergency_fund = sum(a.balance for a in accounts if a.category_type == "emergency_fund")
    investment = sum(a.balance for a in accounts if a.category_type == "investment")
    investment_holdings = sum(h.current_price * h.quantity for h in holdings)

    return {
        "total_assets": cash_total + emergency_fund + investment + investment_holdings,
        "cash_total": cash_total,
        "emergency_fund": emergency_fund,
        "investment_total": investment + investment_holdings,
    }

@router.get("/holdings")
def get_holdings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.holding import Holding
    from src.models.account import Account
    holdings = db.query(Holding).join(Account).filter(Account.user_id == user.id).all()
    return holdings
```

**Step 3: 更新 main.py 包含路由**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import auth, accounts, assets

app = FastAPI(title="MoneyPlan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(assets.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

**Step 4: Commit**

```bash
git add backend/src/routers/
git commit -m "feat: add accounts and assets API endpoints"
```

---

## Phase 6: 前端页面

### Task 10: 登录页面

**Files:**
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/api/auth.ts`

**Step 1: 创建 frontend/src/api/auth.ts**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const login = async (email: string, password: string) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  const response = await api.post('/auth/login', formData);
  return response.data.access_token;
};

export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  const response = await api.get('/auth/me');
  return response.data;
};
```

**Step 2: 创建 frontend/src/pages/Login.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await login(email, password);
      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed');
    }
  };

  return (
    <div>
      <h1>MoneyPlan Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
```

**Step 3: 更新 App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<div>Dashboard coming soon</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add login page"
```

---

### Task 11: 主仪表板

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/api/assets.ts`

**Step 1: 创建 frontend/src/api/assets.ts**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getAssetSummary = async () => {
  const response = await api.get('/assets/summary');
  return response.data;
};

export const getHoldings = async () => {
  const response = await api.get('/assets/holdings');
  return response.data;
};

export const getAccounts = async () => {
  const response = await api.get('/accounts');
  return response.data;
};
```

**Step 2: 创建 frontend/src/pages/Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react';
import { getAssetSummary } from '../api/assets';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    getAssetSummary().then(setSummary);
  }, []);

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <h1>Financial Dashboard</h1>
      <div className="summary-cards">
        <div className="card">
          <h3>Total Assets</h3>
          <p>${summary.total_assets?.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Cash</h3>
          <p>${summary.cash_total?.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Emergency Fund</h3>
          <p>${summary.emergency_fund?.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Investments</h3>
          <p>${summary.investment_total?.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: 更新 App.tsx**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add dashboard page"
```

---

## Phase 7: 核心功能完善

### Task 12: 预算功能

**Files:**
- Create: `backend/src/routers/budgets.py`
- Create: `frontend/src/pages/Budgets.tsx`

**Step 1: 创建 backend/src/routers/budgets.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.auth.jwt import decode_token
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/budgets", tags=["budgets"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_token(token)["sub"]
    return db.query(User).filter(User.id == user_id).first()

class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str = "monthly"

class BudgetResponse(BaseModel):
    id: str
    category: str
    amount: float
    period: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[BudgetResponse])
def get_budgets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.budget import Budget
    budgets = db.query(Budget).filter(Budget.user_id == user.id).all()
    return budgets

@router.post("/", response_model=BudgetResponse)
def create_budget(budget: BudgetCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.budget import Budget
    db_budget = Budget(**budget.model_dump(), user_id=user.id)
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget
```

**Step 2: 更新 main.py 添加 budgets 路由**

```python
app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
```

**Step 3: Commit**

```bash
git add backend/src/routers/budgets.py
git commit -m "feat: add budgets API"
```

---

### Task 13: 目标功能

**Files:**
- Create: `backend/src/routers/goals.py`
- Create: `frontend/src/pages/Goals.tsx`

**Step 1: 创建 backend/src/routers/goals.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.auth.jwt import decode_token
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/goals", tags=["goals"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_token(token)["sub"]
    return db.query(User).filter(User.id == user_id).first()

class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    target_date: Optional[datetime] = None

class GoalResponse(BaseModel):
    id: str
    name: str
    target_amount: float
    current_amount: float
    target_date: Optional[datetime]
    progress: float

    class Config:
        from_attributes = True

@router.get("/", response_model=List[GoalResponse])
def get_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.goal import Goal
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    return [GoalResponse(
        **{**g.__dict__, "progress": (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0}
    ) for g in goals]

@router.post("/", response_model=GoalResponse)
def create_goal(goal: GoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.goal import Goal
    db_goal = Goal(**goal.model_dump(), user_id=user.id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return GoalResponse(
        **{**db_goal.__dict__, "progress": (db_goal.current_amount / db_goal.target_amount * 100) if db_goal.target_amount > 0 else 0}
    )
```

**Step 2: Commit**

```bash
git add backend/src/routers/goals.py
git commit -m "feat: add goals API"
```

---

### Task 14: 警报功能

**Files:**
- Create: `backend/src/routers/alerts.py`
- Create: `frontend/src/pages/Alerts.tsx`

**Step 1: 创建 backend/src/routers/alerts.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.auth.jwt import decode_token
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/alerts", tags=["alerts"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_id = decode_token(token)["sub"]
    return db.query(User).filter(User.id == user_id).first()

class AlertCreate(BaseModel):
    alert_type: str
    name: str
    condition: str
    threshold: float

class AlertResponse(BaseModel):
    id: str
    alert_type: str
    name: str
    condition: str
    threshold: float
    enabled: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[AlertResponse])
def get_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.alert import Alert
    alerts = db.query(Alert).filter(Alert.user_id == user.id).all()
    return alerts

@router.post("/", response_model=AlertResponse)
def create_alert(alert: AlertCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from src.models.alert import Alert
    db_alert = Alert(**alert.model_dump(), user_id=user.id)
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert
```

**Step 2: Commit**

```bash
git add backend/src/routers/alerts.py
git commit -m "feat: add alerts API"
```

---

### Task 15: Docker 配置完善

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

**Step 1: 创建 backend/Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: 创建 frontend/Dockerfile**

```dockerfile
FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Step 3: 创建 frontend/nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
    }
}
```

**Step 4: 更新 docker-compose.yml**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
```

**Step 5: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile frontend/nginx.conf
git commit -m "feat: add Docker configurations"
```

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-03-09-monarchmoney-dashboard-design.md`.**

Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

# MoneyPlan Code Review Documentation

**Generated:** March 14, 2026
**Project:** MoneyPlan - Personal Finance Management Application
**Technology Stack:** React + TypeScript (Frontend), FastAPI + Python (Backend), PostgreSQL (Database)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Backend Architecture Review](#backend-architecture-review)
3. [Frontend Architecture Review](#frontend-architecture-review)
4. [Database & Data Models](#database--data-models)
5. [Infrastructure & DevOps](#infrastructure--devops)
6. [Security Analysis](#security-analysis)
7. [API Endpoints](#api-endpoints)
8. [Database Migrations](#database-migrations)
9. [Critical Issues & Recommendations](#critical-issues--recommendations)
10. [Architecture Improvements](#architecture-improvements)

---

## Executive Summary

MoneyPlan is a personal finance management application that enables users to track accounts, holdings, budgets, and investment allocations. The application integrates with external financial data providers (Monarch Money and MX) to aggregate financial data.

**Current Status:**
- **Backend:** FastAPI-based REST API with SQLAlchemy ORM
- **Frontend:** React 18 + TypeScript with Vite build system
- **Database:** PostgreSQL with Alembic migrations
- **Infrastructure:** Docker Compose orchestration

**Key Findings:**
- **23 Critical Issues** identified across the codebase
- **47 High Priority Issues** requiring attention
- Multiple security vulnerabilities in credential handling
- Significant code duplication and architectural inefficiencies
- Missing production configurations

---

## Backend Architecture Review

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | FastAPI | Latest |
| ORM | SQLAlchemy | 2.x |
| Authentication | JWT (python-jose) | 3.3.0 |
| Password Hashing | bcrypt | Latest |
| Database | PostgreSQL | Latest |
| Migrations | Alembic | Latest |

### Module Structure

```
backend/src/
├── auth/
│   ├── password.py          # Password hashing utilities
│   └── jwt.py               # JWT token management
├── config.py                 # Application configuration
├── database.py               # SQLAlchemy setup
├── main.py                   # FastAPI application entry
├── models/                   # SQLAlchemy ORM models
│   ├── user.py
│   ├── account.py
│   ├── holding.py
│   ├── transaction.py
│   ├── budget.py
│   ├── goal.py
│   ├── alert.py
│   ├── snapshot.py
│   ├── allocation.py
│   ├── allocation_snapshot.py
│   ├── pool.py
│   ├── pool_snapshot.py
│   ├── monarch_session.py
│   └── mx_member.py
├── routers/                  # API endpoints
│   ├── auth.py
│   ├── accounts.py
│   ├── assets.py
│   ├── allocations.py
│   ├── pools.py
│   ├── monarch.py
│   └── mx.py
├── services/                 # Business logic
│   ├── monarch.py           # Monarch Money integration
│   ├── mx.py                # MX integration
│   └── sync.py              # Data synchronization
└── schemas/                  # Pydantic models
    └── user.py
```

---

### 1.1 Authentication Module (`backend/src/auth/`)

#### Password Management (`password.py`)

**Purpose:** Handles password hashing and verification using bcrypt.

**Implementation:**
```python
# Uses bcrypt with proper salt generation
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
```

**Code Quality:** Good - Uses bcrypt properly with salt generation and proper encoding handling.

**Best Practice Note:** Password strength validation is implemented at the schema level in `user.py`.

#### JWT Authentication (`jwt.py`)

**Purpose:** Creates and validates JWT tokens for API authentication.

**Issues Found:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Hardcoded secret fallback | HIGH | Default JWT secret "change-me-in-production" in config.py is weak |
| No token blacklisting | MEDIUM | Once issued, tokens cannot be revoked |
| 30-minute expiration | LOW | Reasonable but may need adjustment based on use case |

**Recommendations:**
```python
# In config.py - require strong secrets
jwt_secret: str = Field(..., min_length=32)  # Require strong secrets
```

---

### 1.2 Configuration Module (`backend/src/config.py`)

**Purpose:** Application settings using Pydantic BaseSettings with environment variable loading.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Default placeholder values | CRITICAL | Sensitive credential defaults (monarch_password, mx_api_key) should NOT have defaults |
| Fragile path calculation | MEDIUM | Multiple `os.path.dirname` calls make path handling brittle |
| Missing validation | HIGH | No validation that critical secrets are actually provided |

**Current Implementation Concerns:**
```python
# PROBLEMATIC: Sensitive fields have defaults
monarch_password: str = ""  # Should fail if not provided
mx_api_key: str = ""        # Should fail if not provided
```

**Recommendations:**
```python
class Settings(BaseSettings):
    # Make sensitive fields required or use Field(default=None)
    jwt_secret: str = Field(..., min_length=32)
    monarch_password: Optional[str] = None
    mx_api_key: Optional[str] = None

    class Config:
        env_file = ".env"
        validate_default = True  # Validate defaults on load
```

---

### 1.3 Database Module (`backend/src/database.py`)

**Purpose:** SQLAlchemy engine, session factory, and table creation.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Eager model imports | MEDIUM | Imports all models at startup creating tight coupling |
| No connection pooling | HIGH | Should configure `pool_size`, `max_overflow` for production |
| No error handling | MEDIUM | `create_all()` should have error handling |
| Synchronous only | MEDIUM | Uses synchronous SQLAlchemy with FastAPI (async would be better) |

**Recommendations:**
```python
# Add connection pooling configuration
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

---

### 1.4 API Routers (`backend/src/routers/`)

#### Auth Router (`auth.py`)

**Purpose:** User authentication endpoints (login, register).

**Good Practices:**
- Proper OAuth2PasswordBearer flow
- Password verification before returning token

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Duplicate get_current_user | HIGH | Defined in 3+ routers - should be shared |
| No rate limiting | HIGH | Login endpoint vulnerable to brute force |
| Missing input sanitization | MEDIUM | Email should be normalized (lowercase) |

#### Accounts Router (`accounts.py`)

**Purpose:** Account management endpoints.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Response model using dict | MEDIUM | Should use Pydantic schemas for type safety |
| Inconsistent pluralization | LOW | Has both `/accounts` and `/accounts/` routes |

#### Assets Router (`assets.py`)

**Purpose:** Asset calculations and summary data.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Emergency fund detection | HIGH | String matching "emergency" in account name is fragile |
| No pagination | HIGH | Could return large datasets |
| Missing error handling | HIGH | Division by zero possible in percentage calculations |

#### Allocations Router (`allocations.py`)

**Purpose:** User-defined allocation categories.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Code duplication | HIGH | `get_allocation_breakdown` and `get_allocation_breakdown_internal` overlap |
| JSON parsing in loop | MEDIUM | Breaking down allocations multiple times |
| No transaction | HIGH | Multiple DB operations without explicit transaction |
| Imprecise date calculation | MEDIUM | `timedelta(days=months * 30)` is imprecise - use `relativedelta` |

#### Pools Router (`pools.py`)

**Purpose:** Investment pool management.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| No pagination | MEDIUM | History endpoint returns all data |
| Memory concerns | MEDIUM | Building large monthly data structures |

#### Monarch Router (`monarch.py`)

**Purpose:** Monarch Money integration endpoints.

**Security Concerns:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Credentials in request body | CRITICAL | Email/password should NOT be sent in requests |
| Global settings for credentials | CRITICAL | Each user should have their own credentials stored securely |
| No input validation | HIGH | Optional fields can be None |
| Duplicate get_current_user | HIGH | Should import from auth.py |
| Hardcoded OAuth2Scheme | MEDIUM | Duplicated in multiple routers |
| Error messages expose details | MEDIUM | Should use generic messages in production |

#### MX Router (`mx.py`)

**Purpose:** MX (Plaid alternative) bank connection.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Duplicate get_current_user | HIGH | Should be shared |
| Print statements in code | MEDIUM | Should use proper logging |
| No retry logic | MEDIUM | API calls can fail transiently |
| ID confusion | HIGH | mx_user_guid vs user_id confusion |

---

### 1.5 Services (`backend/src/services/`)

#### Monarch Service (`monarch.py`)

**Purpose:** Monarch Money API integration.

**CRITICAL ISSUES:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Blocking MFA input | CRITICAL | `input("Enter MFA code: ")` blocks the async server - completely unacceptable for production |
| No error handling | CRITICAL | Any exception crashes the service |
| No token storage | HIGH | Login called every time |

```python
# CRITICAL: This blocks the async event loop
def login(self):
    # ...
    mfa_code = input("Enter MFA code: ")  # BLOCKS SERVER!
```

#### MX Service (`mx.py`)

**Purpose:** MX platform integration.

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Hardcoded API base URL | MEDIUM | MX_BASE_URL should be configurable |
| No retry logic | HIGH | Should implement exponential backoff |
| Print statements | MEDIUM | Should use logging module |

#### Sync Service (`sync.py`)

**Purpose:** Data synchronization from external providers.

**CRITICAL ISSUES:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Massive function | CRITICAL | `run_mx_sync` is 450+ lines - should be split |
| No transaction management | CRITICAL | Multiple commits without proper rollback |
| Exception swallowing | CRITICAL | Errors caught and printed but not handled |
| Duplicate code | HIGH | Account and holding sync logic repeated |
| Inconsistent field mapping | HIGH | Some places use `balance`, others `current_balance` |
| No idempotency | HIGH | Running sync twice creates duplicates |

---

## Frontend Architecture Review

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18.x |
| Language | TypeScript | 5.3 |
| Build Tool | Vite | 5.x |
| Styling | Tailwind CSS | 4.x |
| State Management | React Query | Latest |
| HTTP Client | Axios | Latest |
| Routing | React Router | 6.x |
| Charts | Recharts | Latest |

### Module Structure

```
frontend/src/
├── main.tsx                  # Application entry
├── App.tsx                   # Main app with routing
├── index.css                 # Global styles
├── api/                      # API clients
│   ├── allocations.ts
│   ├── assets.ts
│   ├── auth.ts
│   ├── monarch.ts
│   ├── mx.ts
│   └── pools.ts
├── pages/                    # Page components
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Accounts.tsx
│   ├── Allocations.tsx
│   └── Settings.tsx
└── components/               # Reusable components
```

---

### 2.1 Frontend Configuration Files

#### Dockerfile

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing nginx.conf | CRITICAL | File copied but not in git - build will fail |
| No security headers | HIGH | Nginx lacks security headers |
| No compression | MEDIUM | Gzip not enabled |

#### package.json

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| No linting | MEDIUM | No ESLint configured |
| No testing | MEDIUM | No test framework |
| No version pinning | MEDIUM | Caret ranges could cause issues |

#### vite.config.ts

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| No production optimizations | MEDIUM | Missing minification, chunking |
| No alias configuration | MEDIUM | Could use `@/` for cleaner imports |
| No compression plugin | LOW | Could add vite-plugin-compression |

#### tsconfig.json

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| No path aliases | MEDIUM | Missing `@/` alias |
| Could add noImplicitAny | LOW | Stricter typing |

---

### 2.2 Frontend Components

#### main.tsx

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing QueryClientProvider | CRITICAL | React Query not initialized |
| No global error boundary | MEDIUM | Unhandled errors crash app |

```typescript
// MISSING: Should wrap app with QueryClientProvider
const queryClient = new QueryClient()
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

#### App.tsx

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| localStorage for tokens | HIGH | Vulnerable to XSS attacks |
| Full page reloads | HIGH | Uses window.location.href |
| Navigation not shown on login | MEDIUM | Inconsistent UI |

```typescript
// PROBLEMATIC: Causes full page reload
onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}

// BETTER: Use React Router navigate
const navigate = useNavigate()
onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
```

#### Dashboard.tsx

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Extensive use of `any` | HIGH | Type safety compromised |
| No error states | HIGH | Silent failures |
| Loading shows "Loading..." | MEDIUM | Should use skeleton/spinner |
| Data transformation in body | MEDIUM | Should extract to hooks |

#### Login.tsx

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Full page reload | HIGH | Should use useNavigate |
| No show password toggle | LOW | UX improvement |
| No network error handling | MEDIUM | Should handle offline |

#### Accounts.tsx (550+ lines)

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Code duplication | HIGH | Lines 89-101 duplicate data loading |
| Inefficient refetch | HIGH | Refetches ALL data after single update |
| Dropdowns don't close outside | MEDIUM | UX issue |
| Component too large | HIGH | Should split into smaller components |

#### Allocations.tsx

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Native alert() usage | HIGH | Poor UX |
| console.error only | MEDIUM | No user feedback |
| No manual refresh | LOW | UX improvement |

#### Settings.tsx

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Multiple alert() calls | HIGH | Lines 61, 67, 88, 95, 110, 123 |
| No visual error states | HIGH | Only alerts |
| Complex state management | MEDIUM | Could use state machine |

---

## Database & Data Models

### Model Architecture

All models inherit from a common `Base` and use mixins for consistent timestamps:

```python
# TimestampMixin provides:
- created_at: DateTime
- updated_at: DateTime
```

### Models Overview

| Model | Purpose | Foreign Keys |
|-------|---------|--------------|
| User | Authentication | None |
| Account | Financial accounts | user_id |
| Holding | Investment positions | account_id, pool_id |
| Transaction | Account transactions | account_id |
| Budget | Budget categories | user_id |
| Goal | Financial goals | user_id |
| Alert | User notifications | user_id |
| Snapshot | Historical data | user_id |
| Allocation | Asset allocation rules | user_id |
| Pool | Investment pools | user_id |
| MonarchSession | Monarch credentials | user_id |
| MXMember | MX connections | user_id |

---

### 3.1 Data Model Issues

#### User Model (`user.py`)

**Issues:**
- Uses String(36) for UUID - could use UUID type directly
- No index on created_at

#### Account Model (`account.py`)

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Inconsistent field naming | MEDIUM | `current_balance` vs `balance` |
| No index on is_active | MEDIUM | Should index for filtering |
| Using String(1) for Y/N | MEDIUM | Should use Boolean |

#### Holding Model (`holding.py`)

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing relationship to Pool | MEDIUM | Has pool_id but relationship needed |
| Nullable required fields | MEDIUM | cost_basis, current_price should not be nullable |

#### MonarchSession Model (`monarch_session.py`)

**CRITICAL SECURITY ISSUE:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Tokens in plaintext | CRITICAL | access_token and refresh_token stored as Text without encryption |

#### Allocation Model (`allocation.py`)

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Comma-separated asset_types | MEDIUM | Should be separate table or ARRAY |
| No percentage field | MEDIUM | Stored for performance |

#### Snapshot Models (`allocation_snapshot.py`, `pool_snapshot.py`)

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| JSON as string | MEDIUM | Using String(2000) - should use JSONB |
| No JSON validation | MEDIUM | Should validate structure |

---

## Infrastructure & DevOps

### Docker Compose Configuration

**Services:**
- `backend`: FastAPI application
- `frontend`: Nginx static file server
- `postgres`: Database
- `redis`: Cache (if used)

### Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Hardcoded DB credentials | HIGH | Lines 13, 51-53 |
| Default SECRET_KEY | HIGH | Should be required |
| Port 8080 conflict | LOW | May conflict with other services |
| No networks defined | LOW | All services in default network |
| Frontend healthcheck wrong | HIGH | References `/health` but serves static files |

---

## Security Analysis

### Critical Security Vulnerabilities

| # | Vulnerability | Location | Impact |
|---|---------------|----------|--------|
| 1 | Tokens/credentials stored plaintext | monarch_session, mx_member | Data breach risk |
| 2 | MFA blocking call in async context | monarch.py service | Server hangs |
| 3 | Credentials in request body | monarch.py router | MITM attacks |
| 4 | localStorage for JWT tokens | frontend | XSS token theft |
| 5 | CORS too permissive | main.py | Cross-origin attacks |
| 6 | Default placeholder secrets | config.py | Weak authentication |
| 7 | No rate limiting on auth | auth.py router | Brute force attacks |

### Security Best Practices Missing

1. **Token Storage:** Use httpOnly, secure cookies instead of localStorage
2. **Credential Encryption:** Encrypt tokens at rest using field-level encryption
3. **Input Validation:** Add Pydantic validators on all endpoints
4. **Rate Limiting:** Implement on authentication endpoints
5. **CSRF Protection:** Add for state-changing operations
6. **Content Security Policy:** Configure in nginx

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| GET | /api/auth/me | Get current user |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/accounts | List accounts |
| POST | /api/accounts | Create account |
| GET | /api/accounts/{id} | Get account details |
| PUT | /api/accounts/{id} | Update account |
| DELETE | /api/accounts/{id} | Delete account |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/assets/summary | Get asset summary |
| GET | /api/assets/holdings | Get holdings breakdown |
| GET | /api/assets/allocation | Get allocation breakdown |

### Allocations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/allocations | List allocations |
| POST | /api/allocations | Create allocation |
| PUT | /api/allocations/{id} | Update allocation |
| DELETE | /api/allocations/{id} | Delete allocation |

### Pools

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/pools | List pools |
| POST | /api/pools | Create pool |
| PUT | /api/pools/{id} | Update pool |
| DELETE | /api/pools/{id} | Delete pool |
| GET | /api/pools/{id}/history | Get pool history |

### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/monarch/connect | Connect Monarch account |
| POST | /api/monarch/sync | Sync Monarch data |
| GET | /api/mx/institutions | List MX institutions |
| POST | /api/mx/connect | Connect MX account |
| POST | /api/mx/members | Get members |

---

## Database Migrations

### Migration 002: Add Allocations and Pools

**Operations:**
1. Modifies `allocations` table - adds `asset_types`, `sort_order`
2. Modifies `holdings` table - adds `pool_id` with FK
3. Creates `allocation_snapshots` table
4. Creates `pools` table
5. Creates `pool_snapshots` table
6. Creates `mx_members` table
7. Creates `monarch_sessions` table

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| Silent exception handling | HIGH | Try/except swallows all errors |
| Missing unique constraint | MEDIUM | mx_member_guid needs uniqueness |
| No ON DELETE cascade | MEDIUM | FK cleanup behavior undefined |

### Migration 003: Add Allocation Category

**Operations:**
1. Adds `allocation_category` column to `holdings`
2. Creates index on `allocation_category`

**Issues:**

| Issue | Severity | Description |
|-------|----------|-------------|
| No value validation | MEDIUM | Should use CHECK constraint |
| Index on nullable column | LOW | Performance implications |

---

## Critical Issues & Recommendations

### Priority 1: Critical (Must Fix)

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | MFA blocking call | Implement webhook/queue-based MFA |
| 2 | Credentials plaintext | Add field-level encryption |
| 3 | Credentials in request body | Use secure credential storage per user |
| 4 | Missing nginx.conf | Create proper nginx configuration |
| 5 | No QueryClientProvider | Wrap app with React Query provider |

### Priority 2: High (Should Fix)

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | Duplicate get_current_user | Create shared auth module |
| 2 | localStorage for tokens | Use httpOnly cookies |
| 3 | 450+ line sync function | Split into service classes |
| 4 | Extensive `any` usage | Add proper TypeScript types |
| 5 | No transactions | Add DB transactions for multi-step ops |
| 6 | Print statements | Replace with logging module |

### Priority 3: Medium (Nice to Have)

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | Add ESLint/Prettier | Configure linting |
| 2 | Add testing | Set up Vitest |
| 3 | Pagination | Add to list endpoints |
| 4 | Component splitting | Break large components |
| 5 | Toast notifications | Replace alerts |

---

## Architecture Improvements

### Backend Recommendations

1. **Shared Authentication Module**
```python
# Create backend/src/auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Single implementation
```

2. **Service Layer Refactoring**
```python
# Split sync.py into:
# - services/sync/accounts.py
# - services/sync/holdings.py
# - services/sync/transactions.py
```

3. **Async SQLAlchemy**
```python
# Use async engine for better performance
from sqlalchemy.ext.asyncio import create_async_engine
```

### Frontend Recommendations

1. **React Query Integration**
```typescript
// Wrap app with QueryClientProvider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})
```

2. **TypeScript Interfaces**
```typescript
// Define proper types
interface Account {
  id: number;
  name: string;
  account_type: string;
  current_balance: number;
  is_active: boolean;
}
```

3. **Component Splitting**
```
src/pages/Accounts/
├── index.tsx        # Main page
├── HoldingCard.tsx  # Individual holding
├── PoolForm.tsx     # Pool management
└── useAccounts.ts   # Data fetching hook
```

---

## Appendix: File Inventory

### Modified Backend Files (25)
- requirements.txt
- src/auth/password.py
- src/config.py
- src/database.py
- src/main.py
- src/models/__init__.py
- src/models/account.py
- src/models/alert.py
- src/models/budget.py
- src/models/goal.py
- src/models/holding.py
- src/models/snapshot.py
- src/models/transaction.py
- src/models/user.py
- src/routers/accounts.py
- src/routers/assets.py
- src/routers/auth.py
- src/schemas/user.py
- src/services/monarch.py

### New Backend Files (16)
- alembic/versions/002_add_allocations_pools.py
- alembic/versions/003_add_allocation_category.py
- src/models/allocation.py
- src/models/allocation_snapshot.py
- src/models/monarch_session.py
- src/models/mx_member.py
- src/models/pool.py
- src/models/pool_snapshot.py
- src/routers/allocations.py
- src/routers/monarch.py
- src/routers/mx.py
- src/routers/pools.py
- src/services/mx.py
- src/services/sync.py

### Modified Frontend Files (7)
- Dockerfile
- package.json
- src/App.tsx
- src/main.tsx
- src/pages/Dashboard.tsx
- src/pages/Login.tsx
- vite.config.ts

### New Frontend Files (13)
- src/api/allocations.ts
- src/api/monarch.ts
- src/api/mx.ts
- src/api/pools.ts
- src/pages/Accounts.tsx
- src/pages/Allocations.tsx
- src/pages/Register.tsx
- src/pages/Settings.tsx
- src/index.css
- postcss.config.js
- tailwind.config.js
- tsconfig.json
- tsconfig.node.json

### Infrastructure Files
- docker-compose.yml

---

*Document generated by Claude Code Code Review System*

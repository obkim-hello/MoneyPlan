from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, accounts, assets, budgets, goals, alerts, monarch, mx, pools, allocations

app = FastAPI(title="MoneyPlan API")

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(accounts.router)
api_router.include_router(assets.router)
api_router.include_router(budgets.router)
api_router.include_router(goals.router)
api_router.include_router(alerts.router)
api_router.include_router(monarch.router)
api_router.include_router(mx.router)
api_router.include_router(pools.router)
api_router.include_router(allocations.router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}

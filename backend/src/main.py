from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, accounts, assets, budgets, goals, alerts

app = FastAPI(title="MoneyPlan API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(assets.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(alerts.router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}

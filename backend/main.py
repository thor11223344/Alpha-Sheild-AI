from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import anomaly, manipulation, portfolio, ipo, stocks, live, intelligence

app = FastAPI(
    title="AlphaSheild AI API",
    description="Integrated Market Intelligence & Risk Analysis Platform for NSE",
    version="1.0.0"
)

# Configure CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(anomaly.router, prefix="/api/anomaly", tags=["Anomaly Detection"])
app.include_router(manipulation.router, prefix="/api/manipulation", tags=["Manipulation Detector"])
app.include_router(portfolio.router, prefix="/api/portfolio-stress", tags=["Portfolio Stress Test"])
app.include_router(ipo.router, prefix="/api/ipo-evaluate", tags=["IPO Evaluator"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["Stock List"])
app.include_router(live.router, prefix="/api/live", tags=["Live Tracking"])
app.include_router(intelligence.router, prefix="/api/intelligence", tags=["Corporate Intelligence"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AlphaSheild AI API"}

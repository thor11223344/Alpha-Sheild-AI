from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import anomaly, manipulation, portfolio, ipo, stocks

app = FastAPI(
    title="AlphaSheild AI API",
    description="Integrated Market Intelligence & Risk Analysis Platform for NSE",
    version="1.0.0"
)

# Configure CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(anomaly.router, prefix="/api/anomaly", tags=["Anomaly Screener"])
app.include_router(manipulation.router, prefix="/api/manipulation", tags=["Manipulation Detector"])
app.include_router(portfolio.router, prefix="/api/portfolio-stress", tags=["Portfolio Stress Tester"])
app.include_router(ipo.router, prefix="/api/ipo-evaluate", tags=["AI IPO Evaluator"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["Stocks"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AlphaSheild AI API"}

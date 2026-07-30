from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from models.ml_pipeline import get_nse_data
from hmmlearn import hmm
import numpy as np
import pandas as pd
import yfinance as yf

router = APIRouter()

class PortfolioInput(BaseModel):
    tickers: List[str]
    weights: List[float]

def get_nifty_data(period="2y"):
    """Fetch Nifty 50 data to determine market regime"""
    nifty = yf.Ticker("^NSEI")
    df = nifty.history(period=period)
    df['Return'] = df['Close'].pct_change()
    df = df.dropna()
    return df

@router.post("/")
def run_stress_test(portfolio: PortfolioInput):
    if len(portfolio.tickers) != len(portfolio.weights):
        raise HTTPException(status_code=400, detail="Tickers and weights must have the same length.")
    
    if abs(sum(portfolio.weights) - 1.0) > 0.01:
        raise HTTPException(status_code=400, detail="Weights must sum to 1.")

    try:
        # 1. Regime Detection on Nifty 50
        nifty_df = get_nifty_data()
        returns = nifty_df[['Return']].values
        
        # Train HMM with 2 components (Bull, Bear/Volatile)
        model = hmm.GaussianHMM(n_components=2, covariance_type="diag", n_iter=100, random_state=42)
        model.fit(returns)
        
        # Determine which state is high volatility / low return (Bear) and which is low vol / high return (Bull)
        means = model.means_.flatten()
        vars = np.diagonal(model.covars_).flatten()
        
        # Predict current state based on recent data
        hidden_states = model.predict(returns)
        current_state = hidden_states[-1]
        
        # Describe the current regime
        state_mean = means[current_state]
        state_var = vars[current_state]
        
        is_bull_market = state_mean > means[1 - current_state]
        regime_name = "Bull Market" if is_bull_market else "Bear/High-Volatility Market"
        
        # 2. Fetch Portfolio Data
        portfolio_returns = pd.DataFrame()
        for ticker in portfolio.tickers:
            df = get_nse_data(ticker, period="1y")
            df['Return'] = df['Close'].pct_change()
            portfolio_returns[ticker] = df['Return']
            
        portfolio_returns = portfolio_returns.dropna()
        
        # Calculate historical daily portfolio returns
        weights = np.array(portfolio.weights)
        daily_portfolio_returns = portfolio_returns.dot(weights)
        
        # Portfolio stats
        port_mean = daily_portfolio_returns.mean()
        port_std = daily_portfolio_returns.std()
        
        # 3. Monte Carlo Simulation conditioned on Regime
        # Adjust drift and volatility based on the detected regime multiplier relative to history
        drift = port_mean * (1 if is_bull_market else -0.5)
        volatility = port_std * (1 if is_bull_market else 1.5)
        
        num_simulations = 500
        forecast_days = 30
        initial_value = 100000  # Assume 1 Lakh starting portfolio value
        
        simulations = []
        
        for _ in range(num_simulations):
            # Geometric Brownian Motion
            daily_returns = np.random.normal(drift, volatility, forecast_days)
            price_paths = initial_value * np.cumprod(1 + daily_returns)
            simulations.append(price_paths.tolist())
            
        # Calculate Risk Metrics
        final_values = [path[-1] for path in simulations]
        var_95 = np.percentile(final_values, 5)
        max_drawdown = (initial_value - min(final_values)) / initial_value if min(final_values) < initial_value else 0
        
        # To reduce payload size, we'll only send a subset of paths (e.g., 20) and the percentiles for the UI fan chart
        paths_for_ui = simulations[:20]
        
        percentiles = []
        simulations_array = np.array(simulations)
        for day in range(forecast_days):
            day_values = simulations_array[:, day]
            percentiles.append({
                "day": day + 1,
                "p10": np.percentile(day_values, 10),
                "p50": np.percentile(day_values, 50),
                "p90": np.percentile(day_values, 90)
            })

        return {
            "regime": {
                "name": regime_name,
                "mean_daily_return": float(state_mean),
                "volatility": float(np.sqrt(state_var))
            },
            "risk_metrics": {
                "var_95_value": float(var_95),
                "max_drawdown_percent": float(max_drawdown * 100)
            },
            "simulation": {
                "initial_value": initial_value,
                "forecast_days": forecast_days,
                "percentiles": percentiles,
                "sample_paths": paths_for_ui
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

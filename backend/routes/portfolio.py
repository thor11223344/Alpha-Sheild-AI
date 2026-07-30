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
        weights = np.array(portfolio.weights)
        
        # Calculate historical stats
        mean_returns = portfolio_returns.mean().values
        cov_matrix = portfolio_returns.cov().values
        
        # 3. Advanced Monte Carlo Simulation conditioned on Regime
        # Adjust drift and volatility based on the detected regime multiplier relative to history
        drift = mean_returns * (1 if is_bull_market else -0.5)
        vol_scalar = 1.0 if is_bull_market else 1.5
        adjusted_cov_matrix = cov_matrix * (vol_scalar ** 2)
        
        # Cholesky decomposition for correlated random variables
        try:
            L = np.linalg.cholesky(adjusted_cov_matrix)
        except np.linalg.LinAlgError:
            # Add small ridge if matrix is not positive definite
            ridge = np.eye(len(weights)) * 1e-6
            L = np.linalg.cholesky(adjusted_cov_matrix + ridge)
        
        num_simulations = 1000
        forecast_days = 30
        initial_value = 100000  # Assume 1 Lakh starting portfolio value
        
        simulations = []
        
        for _ in range(num_simulations):
            # Generate uncorrelated random normal variables (days x assets)
            Z = np.random.normal(size=(forecast_days, len(weights)))
            
            # Correlate them using Cholesky lower triangle
            daily_asset_returns = drift + Z.dot(L.T)
            
            # Calculate daily portfolio return
            daily_port_returns = daily_asset_returns.dot(weights)
            
            # Calculate price path
            price_paths = initial_value * np.cumprod(1 + daily_port_returns)
            # Prepend initial value
            path = np.insert(price_paths, 0, initial_value)
            simulations.append(path.tolist())
            
        # Calculate Risk Metrics
        final_values = [path[-1] for path in simulations]
        
        var_95 = np.percentile(final_values, 5)
        
        # CVaR (Expected Shortfall) is the average of values worse than VaR
        worse_than_var = [v for v in final_values if v <= var_95]
        cvar_95 = np.mean(worse_than_var) if worse_than_var else var_95
        
        max_drawdown = (initial_value - min(final_values)) / initial_value if min(final_values) < initial_value else 0
        
        # To reduce payload size, we'll only send a subset of paths (e.g., 20) for the UI background
        paths_for_ui = simulations[:20]
        
        percentiles = []
        simulations_array = np.array(simulations)
        for day in range(forecast_days + 1):
            day_values = simulations_array[:, day]
            percentiles.append({
                "day": day,
                "p5": np.percentile(day_values, 5),
                "p25": np.percentile(day_values, 25),
                "p50": np.percentile(day_values, 50),
                "p75": np.percentile(day_values, 75),
                "p95": np.percentile(day_values, 95)
            })

        return {
            "regime": {
                "name": regime_name,
                "mean_daily_return": float(state_mean),
                "volatility": float(np.sqrt(state_var))
            },
            "risk_metrics": {
                "var_95_value": float(var_95),
                "cvar_95_value": float(cvar_95),
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

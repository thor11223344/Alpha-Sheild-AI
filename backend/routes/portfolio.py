from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from models.ml_pipeline import get_nse_data
from hmmlearn import hmm
import numpy as np
import pandas as pd
import yfinance as yf
from functools import lru_cache

router = APIRouter()

class PortfolioInput(BaseModel):
    tickers: List[str]
    weights: List[float]
    initial_value: Optional[float] = 100000.0

@lru_cache(maxsize=1)
def get_nifty_data_cached(period="2y"):
    """Fetch Nifty 50 data to determine market regime"""
    nifty = yf.Ticker("^NSEI")
    df = nifty.history(period=period)
    df['Return'] = df['Close'].pct_change()
    df = df.dropna()
    return df

@lru_cache(maxsize=1)
def get_hmm_model():
    nifty_df = get_nifty_data_cached()
    returns = nifty_df[['Return']].values
    
    # Train HMM with 2 components, higher n_iter and tol to guarantee convergence
    model = hmm.GaussianHMM(n_components=2, covariance_type="diag", n_iter=300, tol=1e-4, random_state=42)
    model.fit(returns)
    return model, returns

@router.post("/")
def run_stress_test(portfolio: PortfolioInput):
    # 1. Clean and consolidate tickers & weights
    clean_items = []
    for t, w in zip(portfolio.tickers, portfolio.weights):
        clean_t = t.strip().upper().replace(".NS", "")
        if clean_t and w > 0:
            clean_items.append((clean_t, float(w)))
            
    if not clean_items:
        raise HTTPException(status_code=400, detail="Please select at least one valid stock with positive weight.")
        
    # Consolidate duplicate tickers
    consolidated = {}
    for t, w in clean_items:
        consolidated[t] = consolidated.get(t, 0.0) + w
        
    unique_tickers = list(consolidated.keys())
    total_w = sum(consolidated.values())
    weights = np.array([consolidated[t] / total_w for t in unique_tickers])
    num_assets = len(unique_tickers)

    try:
        # 2. Regime Detection on Nifty 50
        model, returns = get_hmm_model()
        
        means = model.means_.flatten()
        vars = np.diagonal(model.covars_).flatten()
        transmat = model.transmat_
        
        hidden_states = model.predict(returns)
        current_state = hidden_states[-1]
        
        is_state_0_bull = means[0] > means[1]
        state_mean = means[current_state]
        state_var = vars[current_state]
        
        is_current_bull = (current_state == 0 and is_state_0_bull) or (current_state == 1 and not is_state_0_bull)
        regime_name = "Bull Market" if is_current_bull else "Bear/High-Volatility Market"
        
        # 3. Fetch Portfolio Data with Exact Date Index Alignment
        returns_dict = {}
        for ticker in unique_tickers:
            df = get_nse_data(ticker, period="1y")
            df['Date'] = pd.to_datetime(df['Date'])
            df['Return'] = df['Close'].pct_change()
            returns_dict[ticker] = df.set_index('Date')['Return']
            
        portfolio_returns = pd.DataFrame(returns_dict)
        portfolio_returns = portfolio_returns.ffill().bfill().dropna()
        
        if len(portfolio_returns) < 20:
            raise HTTPException(status_code=400, detail="Not enough historical data points for the selected portfolio.")
            
        # Daily expected returns & covariance matrix
        mean_returns = portfolio_returns.mean().values
        cov_matrix = portfolio_returns.cov().values
        
        # 4. Advanced Monte Carlo Engine - Vectorized
        num_simulations = 10000
        forecast_days = 30
        initial_value = float(portfolio.initial_value) if portfolio.initial_value and portfolio.initial_value > 0 else 100000.0
        
        # State 0 parameters (Bull / Normal regime)
        drift_0 = mean_returns
        vol_scalar_0 = 1.0
        cov_0 = cov_matrix * (vol_scalar_0 ** 2)
        try:
            L_0 = np.linalg.cholesky(cov_0)
        except np.linalg.LinAlgError:
            L_0 = np.linalg.cholesky(cov_0 + np.eye(num_assets) * 1e-6)
            
        # State 1 parameters (Bear / Volatile regime - stressed drift & volatility)
        daily_vols = np.sqrt(np.maximum(1e-8, np.diagonal(cov_matrix)))
        drift_1 = mean_returns - 0.5 * daily_vols  # Regime-conditioned downside drift stress
        vol_scalar_1 = 1.4  # Volatility amplification in bear regime
        cov_1 = cov_matrix * (vol_scalar_1 ** 2)
        try:
            L_1 = np.linalg.cholesky(cov_1)
        except np.linalg.LinAlgError:
            L_1 = np.linalg.cholesky(cov_1 + np.eye(num_assets) * 1e-6)

        # Simulate Regimes for all paths and days
        states = np.zeros((forecast_days, num_simulations), dtype=int)
        curr_states = np.full(num_simulations, current_state)
        
        for t in range(forecast_days):
            rand = np.random.rand(num_simulations)
            probs_0 = transmat[curr_states, 0]
            next_states = np.where(rand < probs_0, 0, 1)
            states[t] = next_states
            curr_states = next_states

        # Generate Shocks (Student's t-distribution for fat tails, df=5)
        Z = np.random.standard_t(df=5, size=(forecast_days, num_simulations, num_assets)) * np.sqrt(3/5)
        
        # Calculate asset returns for both states
        returns_0 = drift_0 + Z @ L_0.T
        returns_1 = drift_1 + Z @ L_1.T
        
        # Select returns based on the simulated state
        states_expanded = states[:, :, np.newaxis]
        daily_asset_returns = np.where(states_expanded == 0, returns_0, returns_1)
        
        # Calculate portfolio returns and cumulative price paths
        daily_port_returns = daily_asset_returns @ weights
        price_paths = initial_value * np.cumprod(1 + daily_port_returns, axis=0)
        
        # Prepend initial value
        initial_row = np.full((1, num_simulations), initial_value)
        price_paths = np.vstack([initial_row, price_paths]) # Shape: (31, 10000)
        
        # Risk Metrics
        final_values = price_paths[-1, :]
        
        var_95 = float(np.percentile(final_values, 5))
        var_99 = float(np.percentile(final_values, 1))
        
        worse_than_var_95 = final_values[final_values < var_95]
        if len(worse_than_var_95) == 0:
            worse_than_var_95 = final_values[final_values <= var_95]
        cvar_95 = float(np.mean(worse_than_var_95)) if len(worse_than_var_95) > 0 else var_95 * 0.95
        
        max_drawdowns = (initial_value - np.min(price_paths, axis=0)) / initial_value
        max_drawdowns = np.where(max_drawdowns < 0, 0, max_drawdowns)
        max_drawdown_median = float(np.median(max_drawdowns))
        max_drawdown_95 = float(np.percentile(max_drawdowns, 95))
        
        prob_loss_0 = float(np.mean(final_values < initial_value) * 100)
        prob_loss_10 = float(np.mean(final_values < initial_value * 0.90) * 100)
        prob_loss_20 = float(np.mean(final_values < initial_value * 0.80) * 100)
        
        best_case = float(np.max(final_values))
        worst_case = float(np.min(final_values))
        median_case = float(np.median(final_values))
        
        loss_percent_cvar = (initial_value - cvar_95) / initial_value
        if loss_percent_cvar < 0.05:
            risk_label = "Low Risk"
            risk_color = "green"
        elif loss_percent_cvar < 0.15:
            risk_label = "Moderate Risk"
            risk_color = "yellow"
        elif loss_percent_cvar < 0.25:
            risk_label = "High Risk"
            risk_color = "orange"
        else:
            risk_label = "Very High Risk"
            risk_color = "red"
            
        percentiles = []
        for day in range(forecast_days + 1):
            day_values = price_paths[day, :]
            percentiles.append({
                "day": day,
                "p5": float(np.percentile(day_values, 5)),
                "p10": float(np.percentile(day_values, 10)),
                "p25": float(np.percentile(day_values, 25)),
                "p50": float(np.percentile(day_values, 50)),
                "p75": float(np.percentile(day_values, 75)),
                "p90": float(np.percentile(day_values, 90)),
                "p95": float(np.percentile(day_values, 95))
            })
            
        paths_for_ui = price_paths[:, :20].T.tolist()

        return {
            "regime": {
                "name": regime_name,
                "mean_daily_return": float(state_mean),
                "volatility": float(np.sqrt(state_var))
            },
            "risk_metrics": {
                "var_95_value": float(max(0, initial_value - var_95)),
                "var_99_value": float(max(0, initial_value - var_99)),
                "cvar_95_value": float(max(0, initial_value - cvar_95)),
                "max_drawdown_percent_median": float(max_drawdown_median * 100),
                "max_drawdown_percent_95": float(max_drawdown_95 * 100),
                "prob_loss_0": float(prob_loss_0),
                "prob_loss_10": float(prob_loss_10),
                "prob_loss_20": float(prob_loss_20),
                "best_case": float(best_case),
                "worst_case": float(worst_case),
                "median_case": float(median_case),
                "risk_label": risk_label,
                "risk_color": risk_color
            },
            "simulation": {
                "initial_value": initial_value,
                "forecast_days": forecast_days,
                "num_simulations": num_simulations,
                "percentiles": percentiles,
                "sample_paths": paths_for_ui
            }
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

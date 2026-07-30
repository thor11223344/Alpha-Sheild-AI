from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from models.ml_pipeline import get_nse_data
from hmmlearn import hmm
import numpy as np
import pandas as pd
import yfinance as yf
from functools import lru_cache

from engine.monte_carlo import (
    SimulationConfig,
    VarianceReductionMethod,
    GeometricBrownianMotion,
    MertonJumpDiffusion,
    HestonStochasticVolatility,
    MonteCarloEngine,
    MonteCarloAnalytics
)

router = APIRouter()

class PortfolioInput(BaseModel):
    tickers: List[str]
    weights: List[float]
    initial_value: Optional[float] = 100000.0
    model_type: Optional[str] = "regime_switching"  # "regime_switching", "merton_jump", "gbm", "heston"
    sampler_type: Optional[str] = "sobol"          # "sobol", "antithetic", "standard"

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
        
        # 4. Map Sampler Choice
        sampler_map = {
            "sobol": VarianceReductionMethod.SOBOL,
            "antithetic": VarianceReductionMethod.ANTITHETIC,
            "standard": VarianceReductionMethod.NONE
        }
        vr_method = sampler_map.get(portfolio.sampler_type, VarianceReductionMethod.SOBOL)

        num_simulations = 10000
        forecast_days = 30
        initial_value = float(portfolio.initial_value) if portfolio.initial_value and portfolio.initial_value > 0 else 100000.0

        # Create Engine Config
        sim_config = SimulationConfig(
            n_paths=num_simulations,
            n_steps=forecast_days,
            time_horizon=forecast_days / 252.0,
            initial_value=initial_value,
            variance_reduction=vr_method,
            seed=42
        )

        # 5. Execute Simulation Path Generation based on Model Selection
        model_choice = portfolio.model_type.lower() if portfolio.model_type else "regime_switching"

        if model_choice == "merton_jump":
            # Portfolio scalar Merton Jump Diffusion
            port_mu = float(np.dot(mean_returns, weights) * 252)
            port_vol = float(np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights))))
            
            jump_proc = MertonJumpDiffusion(
                mu=port_mu,
                sigma=port_vol,
                jump_lambda=2.0,
                jump_mu=-0.08,
                jump_sigma=0.12
            )
            engine = MonteCarloEngine(sim_config)
            engine_res = engine.run(jump_proc, initial_state=np.array([initial_value]))
            
            # Generate paths for UI rendering
            shocks = engine.sampler.generate_shocks(num_simulations, forecast_days, 1, seed=42)
            paths_matrix = jump_proc.simulate_paths(num_simulations, forecast_days, sim_config.dt, np.array([initial_value]), shocks)
            price_paths = paths_matrix[:, :, 0].T  # Shape: (31, 10000)

        elif model_choice == "gbm":
            # Multivariate GBM
            gbm_proc = GeometricBrownianMotion(mu=mean_returns, cov_matrix=cov_matrix)
            engine = MonteCarloEngine(sim_config)
            
            shocks = engine.sampler.generate_shocks(num_simulations, forecast_days, num_assets, seed=42)
            asset_paths = gbm_proc.simulate_paths(num_simulations, forecast_days, sim_config.dt, initial_state=weights * initial_value, random_shocks=shocks)
            # Sum portfolio values across assets: shape (n_paths, n_steps + 1)
            port_paths = np.sum(asset_paths, axis=-1)
            price_paths = port_paths.T

        else:
            # Default: Advanced HMM Regime-Switching Vectorised Simulation
            drift_0 = mean_returns
            cov_0 = cov_matrix
            try:
                L_0 = np.linalg.cholesky(cov_0)
            except np.linalg.LinAlgError:
                L_0 = np.linalg.cholesky(cov_0 + np.eye(num_assets) * 1e-6)
                
            daily_vols = np.sqrt(np.maximum(1e-8, np.diagonal(cov_matrix)))
            drift_1 = mean_returns - 0.5 * daily_vols
            cov_1 = cov_matrix * 1.96
            try:
                L_1 = np.linalg.cholesky(cov_1)
            except np.linalg.LinAlgError:
                L_1 = np.linalg.cholesky(cov_1 + np.eye(num_assets) * 1e-6)

            states = np.zeros((forecast_days, num_simulations), dtype=int)
            curr_states = np.full(num_simulations, current_state)
            
            for t in range(forecast_days):
                rand = np.random.rand(num_simulations)
                probs_0 = transmat[curr_states, 0]
                next_states = np.where(rand < probs_0, 0, 1)
                states[t] = next_states
                curr_states = next_states

            states_paths_first = states.T  # Shape: (10000, 30)
            states_expanded = states_paths_first[:, :, np.newaxis]  # Shape: (10000, 30, 1)

            # Generate Shocks using engine Sampler (Sobol or Antithetic)
            engine = MonteCarloEngine(sim_config)
            Z = engine.sampler.generate_shocks(num_simulations, forecast_days, num_assets, seed=42)  # Shape: (10000, 30, num_assets)
            
            returns_0 = drift_0 + Z @ L_0.T  # Shape: (10000, 30, num_assets)
            returns_1 = drift_1 + Z @ L_1.T  # Shape: (10000, 30, num_assets)
            
            daily_asset_returns = np.where(states_expanded == 0, returns_0, returns_1)  # Shape: (10000, 30, num_assets)
            
            daily_port_returns = daily_asset_returns @ weights  # Shape: (10000, 30)
            price_paths_sim = initial_value * np.cumprod(1 + daily_port_returns, axis=1)  # Shape: (10000, 30)
            
            initial_col = np.full((num_simulations, 1), initial_value)
            price_paths_matrix = np.hstack([initial_col, price_paths_sim])  # Shape: (10000, 31)
            price_paths = price_paths_matrix.T  # Shape: (31, 10000)

        # 6. Advanced Analytics & Summary Metrics
        final_values = price_paths[-1, :]
        summary_stats = MonteCarloAnalytics.compute_summary_statistics(
            terminal_values=final_values,
            initial_value=initial_value,
            confidence_level=0.95
        )

        drawdown_stats = MonteCarloAnalytics.calculate_drawdowns(price_paths.T)
        convergence_diag = MonteCarloAnalytics.compute_convergence_series(final_values, step_size=max(10, num_simulations // 40))

        var_95_val = float(np.percentile(final_values, 5))
        var_99_val = float(np.percentile(final_values, 1))
        
        worse_than_var = final_values[final_values <= var_95_val]
        cvar_95_val = float(np.mean(worse_than_var)) if len(worse_than_var) > 0 else var_95_val

        prob_loss_0 = float(np.mean(final_values < initial_value) * 100)
        prob_loss_10 = float(np.mean(final_values < initial_value * 0.90) * 100)
        prob_loss_20 = float(np.mean(final_values < initial_value * 0.80) * 100)

        loss_pct_cvar = (initial_value - cvar_95_val) / initial_value
        if loss_pct_cvar < 0.05:
            risk_label = "Low Risk"
            risk_color = "green"
        elif loss_pct_cvar < 0.15:
            risk_label = "Moderate Risk"
            risk_color = "yellow"
        elif loss_pct_cvar < 0.25:
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
            "model_metadata": {
                "model_used": model_choice.upper(),
                "sampler_used": vr_method.value.upper(),
                "standard_error": summary_stats["standard_error"],
                "ci_95_lower": summary_stats["ci_95_lower"],
                "ci_95_upper": summary_stats["ci_95_upper"],
                "skewness": summary_stats["skewness"],
                "kurtosis": summary_stats["kurtosis"]
            },
            "risk_metrics": {
                "var_95_value": float(max(0, initial_value - var_95_val)),
                "var_99_value": float(max(0, initial_value - var_99_val)),
                "cvar_95_value": float(max(0, initial_value - cvar_95_val)),
                "max_drawdown_percent_median": float(drawdown_stats["median_max_drawdown"] * 100),
                "max_drawdown_percent_95": float(drawdown_stats["p95_max_drawdown"] * 100),
                "prob_loss_0": float(prob_loss_0),
                "prob_loss_10": float(prob_loss_10),
                "prob_loss_20": float(prob_loss_20),
                "best_case": float(np.max(final_values)),
                "worst_case": float(np.min(final_values)),
                "median_case": float(np.median(final_values)),
                "risk_label": risk_label,
                "risk_color": risk_color
            },
            "convergence": {
                "path_counts": convergence_diag["path_counts"].tolist(),
                "running_means": convergence_diag["running_means"].tolist(),
                "ci_lower": convergence_diag["ci_lower"].tolist(),
                "ci_upper": convergence_diag["ci_upper"].tolist()
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

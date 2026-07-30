"""
Risk Metrics, Analytics, and Convergence Diagnostics for Monte Carlo Engine
"""

import numpy as np
from scipy.stats import skew, kurtosis
from typing import Dict, Any, Tuple

class MonteCarloAnalytics:
    """
    Production Risk Analytics and Statistical Diagnostics Engine
    """

    @staticmethod
    def calculate_var(terminal_returns: np.ndarray, confidence_level: float = 0.95) -> float:
        """Calculate Value at Risk (VaR) at specified confidence level"""
        percentile = (1.0 - confidence_level) * 100.0
        return float(-np.percentile(terminal_returns, percentile))

    @staticmethod
    def calculate_cvar(terminal_returns: np.ndarray, confidence_level: float = 0.95) -> float:
        """Calculate Conditional Value at Risk (CVaR / Expected Shortfall)"""
        percentile = (1.0 - confidence_level) * 100.0
        cutoff = np.percentile(terminal_returns, percentile)
        tail_losses = terminal_returns[terminal_returns <= cutoff]
        if len(tail_losses) == 0:
            return float(-cutoff)
        return float(-np.mean(tail_losses))

    @staticmethod
    def calculate_drawdowns(paths: np.ndarray) -> Dict[str, float]:
        """
        Calculate Drawdown statistics across all simulated paths.
        paths shape: (n_paths, n_steps, dimension) or (n_paths, n_steps)
        """
        if paths.ndim == 3:
            portfolio_values = np.sum(paths, axis=-1)
        else:
            portfolio_values = paths

        # Running maximum along time steps (axis 1)
        running_max = np.maximum.accumulate(portfolio_values, axis=1)
        drawdowns = (portfolio_values - running_max) / running_max

        max_drawdown_per_path = np.min(drawdowns, axis=1)
        
        return {
            "max_drawdown": float(np.min(max_drawdown_per_path)),
            "mean_max_drawdown": float(np.mean(max_drawdown_per_path)),
            "median_max_drawdown": float(np.median(max_drawdown_per_path)),
            "p95_max_drawdown": float(np.percentile(max_drawdown_per_path, 5))
        }

    @staticmethod
    def compute_summary_statistics(terminal_values: np.ndarray, initial_value: float, confidence_level: float = 0.95) -> Dict[str, Any]:
        """Compute full statistical summary & distribution moments"""
        terminal_returns = (terminal_values - initial_value) / initial_value
        
        n_samples = len(terminal_values)
        mean_val = np.mean(terminal_values)
        std_val = np.std(terminal_values, ddof=1)
        std_err = std_val / np.sqrt(n_samples)

        # 95% Confidence Interval for Mean
        ci_lower = mean_val - 1.96 * std_err
        ci_upper = mean_val + 1.96 * std_err

        var_val = MonteCarloAnalytics.calculate_var(terminal_returns, confidence_level)
        cvar_val = MonteCarloAnalytics.calculate_cvar(terminal_returns, confidence_level)

        return {
            "n_paths": n_samples,
            "mean_terminal_value": float(mean_val),
            "median_terminal_value": float(np.median(terminal_values)),
            "std_dev": float(std_val),
            "standard_error": float(std_err),
            "ci_95_lower": float(ci_lower),
            "ci_95_upper": float(ci_upper),
            "skewness": float(skew(terminal_values)),
            "kurtosis": float(kurtosis(terminal_values)),
            "var_95": float(var_val),
            "cvar_95": float(cvar_val),
            "expected_return_pct": float(np.mean(terminal_returns) * 100.0)
        }

    @staticmethod
    def compute_convergence_series(terminal_values: np.ndarray, step_size: int = 100) -> Dict[str, np.ndarray]:
        """
        Compute running estimate of mean and confidence bands vs path count
        """
        n_paths = len(terminal_values)
        path_counts = np.arange(step_size, n_paths + 1, step_size)
        
        running_means = []
        running_stderrs = []

        for count in path_counts:
            sub_sample = terminal_values[:count]
            m = np.mean(sub_sample)
            se = np.std(sub_sample, ddof=1) / np.sqrt(count)
            running_means.append(m)
            running_stderrs.append(se)

        means = np.array(running_means)
        stderrs = np.array(running_stderrs)

        return {
            "path_counts": path_counts,
            "running_means": means,
            "ci_lower": means - 1.96 * stderrs,
            "ci_upper": means + 1.96 * stderrs
        }

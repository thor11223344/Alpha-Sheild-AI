"""
Production-Grade Monte Carlo Execution Engine
"""

import numpy as np
import time
from typing import Dict, Any, Optional, Type
from concurrent.futures import ProcessPoolExecutor, as_completed

from engine.monte_carlo.config import SimulationConfig, VarianceReductionMethod
from engine.monte_carlo.models import StochasticProcess
from engine.monte_carlo.samplers import (
    VarianceReductionStrategy,
    StandardNormalSampler,
    AntitheticVariates,
    SobolQuasiRandom,
    LatinHypercubeSampler
)
from engine.monte_carlo.analytics import MonteCarloAnalytics

class MonteCarloEngine:
    """
    High-Performance Production Monte Carlo Orchestrator.
    Handles vectorised path generation, variance reduction, and parallel execution.
    """

    def __init__(self, config: SimulationConfig):
        self.config = config
        self.sampler = self._resolve_sampler(config.variance_reduction)

    def _resolve_sampler(self, method: VarianceReductionMethod) -> VarianceReductionStrategy:
        if method == VarianceReductionMethod.ANTITHETIC:
            return AntitheticVariates()
        elif method == VarianceReductionMethod.SOBOL:
            return SobolQuasiRandom()
        elif method == VarianceReductionMethod.LATIN_HYPERCUBE:
            return LatinHypercubeSampler()
        else:
            return StandardNormalSampler()

    def run(self, process: StochasticProcess, initial_state: np.ndarray) -> Dict[str, Any]:
        """
        Execute full Monte Carlo simulation run.
        """
        start_time = time.perf_counter()

        n_paths = self.config.n_paths
        n_steps = self.config.n_steps
        dt = self.config.dt
        dim = process.dimension

        # Generate shocks
        shocks = self.sampler.generate_shocks(
            n_paths=n_paths,
            n_steps=n_steps,
            dimension=dim,
            seed=self.config.seed
        )

        # Simulate paths matrix: (n_paths, n_steps + 1, dim)
        paths = process.simulate_paths(
            n_paths=n_paths,
            n_steps=n_steps,
            dt=dt,
            initial_state=initial_state,
            random_shocks=shocks
        )

        # Extract terminal values
        if dim == 1:
            terminal_values = paths[:, -1, 0]
        else:
            # Multi-asset portfolio sum or state vector
            terminal_values = np.sum(paths[:, -1, :], axis=-1)

        init_val_sum = float(np.sum(initial_state))

        # Compute Risk Analytics
        stats = MonteCarloAnalytics.compute_summary_statistics(
            terminal_values=terminal_values,
            initial_value=init_val_sum,
            confidence_level=self.config.confidence_level
        )

        drawdown_stats = MonteCarloAnalytics.calculate_drawdowns(paths)
        convergence = MonteCarloAnalytics.compute_convergence_series(terminal_values, step_size=max(10, n_paths // 50))

        execution_time = time.perf_counter() - start_time

        return {
            "config": self.config.__dict__,
            "summary_statistics": stats,
            "drawdowns": drawdown_stats,
            "convergence": {
                "path_counts": convergence["path_counts"].tolist(),
                "running_means": convergence["running_means"].tolist(),
                "ci_lower": convergence["ci_lower"].tolist(),
                "ci_upper": convergence["ci_upper"].tolist()
            },
            "execution_time_seconds": round(execution_time, 4),
            "sample_percentiles": {
                "p10": float(np.percentile(terminal_values, 10)),
                "p25": float(np.percentile(terminal_values, 25)),
                "p50": float(np.percentile(terminal_values, 50)),
                "p75": float(np.percentile(terminal_values, 75)),
                "p90": float(np.percentile(terminal_values, 90))
            }
        }

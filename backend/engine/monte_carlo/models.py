"""
Stochastic Process Definitions for Production Monte Carlo Engine
"""

from abc import ABC, abstractmethod
import numpy as np
from typing import Tuple, Dict, Any, Optional

class StochasticProcess(ABC):
    """
    Abstract Base Class for Stochastic Processes.
    Defines interface for drift, diffusion, and vectorised path simulation.
    """
    
    def __init__(self, dimension: int = 1):
        self.dimension = dimension

    @abstractmethod
    def drift(self, state: np.ndarray, t: float) -> np.ndarray:
        """Compute drift vector mu(S, t)"""
        pass

    @abstractmethod
    def diffusion(self, state: np.ndarray, t: float) -> np.ndarray:
        """Compute diffusion matrix sigma(S, t)"""
        pass

    @abstractmethod
    def simulate_paths(
        self, 
        n_paths: int, 
        n_steps: int, 
        dt: float, 
        initial_state: np.ndarray, 
        random_shocks: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Simulate full paths matrix.
        Output shape: (n_paths, n_steps + 1, dimension)
        """
        pass


class GeometricBrownianMotion(StochasticProcess):
    """
    Multivariate Geometric Brownian Motion (GBM)
    dS = mu * S * dt + sigma * S * dW
    """

    def __init__(self, mu: np.ndarray, cov_matrix: np.ndarray):
        mu = np.atleast_1d(mu)
        super().__init__(dimension=len(mu))
        self.mu = mu
        self.cov_matrix = np.atleast_2d(cov_matrix)
        self.cholesky = np.linalg.cholesky(self.cov_matrix)
        self.vols = np.sqrt(np.diag(self.cov_matrix))

    def drift(self, state: np.ndarray, t: float) -> np.ndarray:
        return self.mu * state

    def diffusion(self, state: np.ndarray, t: float) -> np.ndarray:
        return self.vols * state

    def simulate_paths(
        self, 
        n_paths: int, 
        n_steps: int, 
        dt: float, 
        initial_state: np.ndarray, 
        random_shocks: Optional[np.ndarray] = None
    ) -> np.ndarray:
        initial_state = np.atleast_1d(initial_state)
        dim = self.dimension
        
        if random_shocks is None:
            random_shocks = np.random.standard_normal((n_paths, n_steps, dim))

        # Correlate shocks via Cholesky: (n_paths, n_steps, dim) @ L^T
        correlated_shocks = np.einsum('nsd,kd->nsk', random_shocks, self.cholesky)

        paths = np.zeros((n_paths, n_steps + 1, dim))
        paths[:, 0, :] = initial_state

        drift_term = (self.mu - 0.5 * (self.vols ** 2)) * dt
        vol_term = np.sqrt(dt)

        # Log-return exact step
        log_returns = drift_term + vol_term * correlated_shocks
        cum_log_returns = np.cumsum(log_returns, axis=1)

        paths[:, 1:, :] = initial_state * np.exp(cum_log_returns)
        return paths


class MertonJumpDiffusion(StochasticProcess):
    """
    Merton's Jump-Diffusion Process
    dS/S = (mu - lambda * k) * dt + sigma * dW + (Y - 1) * dN
    where log(Y) ~ N(mu_j, sigma_j^2)
    """

    def __init__(self, mu: float, sigma: float, jump_lambda: float, jump_mu: float, jump_sigma: float):
        super().__init__(dimension=1)
        self.mu = mu
        self.sigma = sigma
        self.jump_lambda = jump_lambda
        self.jump_mu = jump_mu
        self.jump_sigma = jump_sigma
        self.k = np.exp(jump_mu + 0.5 * (jump_sigma ** 2)) - 1.0

    def drift(self, state: np.ndarray, t: float) -> np.ndarray:
        return (self.mu - self.jump_lambda * self.k) * state

    def diffusion(self, state: np.ndarray, t: float) -> np.ndarray:
        return self.sigma * state

    def simulate_paths(
        self, 
        n_paths: int, 
        n_steps: int, 
        dt: float, 
        initial_state: np.ndarray, 
        random_shocks: Optional[np.ndarray] = None
    ) -> np.ndarray:
        if random_shocks is None:
            random_shocks = np.random.standard_normal((n_paths, n_steps, 1))

        paths = np.zeros((n_paths, n_steps + 1, 1))
        paths[:, 0, :] = initial_state

        # Continuous diffusion part
        drift_dt = (self.mu - self.jump_lambda * self.k - 0.5 * (self.sigma ** 2)) * dt
        diff_part = drift_dt + self.sigma * np.sqrt(dt) * random_shocks[:, :, 0]

        # Jump part: Poisson counts and log-normal jump magnitudes
        n_jumps = np.random.poisson(self.jump_lambda * dt, size=(n_paths, n_steps))
        jump_magnitudes = np.zeros((n_paths, n_steps))

        mask = n_jumps > 0
        if np.any(mask):
            total_jumps = n_jumps[mask]
            # Sum of normal random variables for log-jumps
            jump_logs = np.random.normal(
                loc=total_jumps * self.jump_mu,
                scale=np.sqrt(total_jumps) * self.jump_sigma
            )
            jump_magnitudes[mask] = jump_logs

        total_step_returns = diff_part + jump_magnitudes
        cum_returns = np.cumsum(total_step_returns, axis=1)

        paths[:, 1:, 0] = initial_state * np.exp(cum_returns)
        return paths


class HestonStochasticVolatility(StochasticProcess):
    """
    Heston Stochastic Volatility Model
    dS_t = mu * S_t * dt + sqrt(v_t) * S_t * dW_t^S
    dv_t = kappa * (theta - v_t) * dt + xi * sqrt(v_t) * dW_t^v
    corr(dW^S, dW^v) = rho
    """

    def __init__(self, mu: float, kappa: float, theta: float, xi: float, rho: float, v0: float):
        super().__init__(dimension=2)  # S and v
        self.mu = mu
        self.kappa = kappa
        self.theta = theta
        self.xi = xi
        self.rho = rho
        self.v0 = v0

    def drift(self, state: np.ndarray, t: float) -> np.ndarray:
        S, v = state[..., 0], state[..., 1]
        return np.stack([self.mu * S, self.kappa * (self.theta - v)], axis=-1)

    def diffusion(self, state: np.ndarray, t: float) -> np.ndarray:
        S, v = state[..., 0], state[..., 1]
        v_pos = np.maximum(v, 0.0)
        return np.stack([np.sqrt(v_pos) * S, self.xi * np.sqrt(v_pos)], axis=-1)

    def simulate_paths(
        self, 
        n_paths: int, 
        n_steps: int, 
        dt: float, 
        initial_state: np.ndarray, 
        random_shocks: Optional[np.ndarray] = None
    ) -> np.ndarray:
        if random_shocks is None:
            # Generate 2 correlated normal variables
            Z1 = np.random.standard_normal((n_paths, n_steps))
            Z2 = np.random.standard_normal((n_paths, n_steps))
            Zv = Z1
            ZS = self.rho * Z1 + np.sqrt(1.0 - self.rho ** 2) * Z2
        else:
            ZS = random_shocks[:, :, 0]
            Zv = random_shocks[:, :, 1]

        S = np.zeros((n_paths, n_steps + 1))
        v = np.zeros((n_paths, n_steps + 1))

        S[:, 0] = initial_state[0] if len(initial_state) > 0 else initial_state
        v[:, 0] = self.v0

        sqrt_dt = np.sqrt(dt)

        # Euler-Maruyama with Full Truncation for Variance
        for t_idx in range(n_steps):
            v_curr = np.maximum(v[:, t_idx], 0.0)
            sqrt_v = np.sqrt(v_curr)

            # Update variance: dv = kappa*(theta - v)*dt + xi*sqrt(v)*dW_v
            v[:, t_idx + 1] = v[:, t_idx] + self.kappa * (self.theta - v_curr) * dt + self.xi * sqrt_v * sqrt_dt * Zv[:, t_idx]
            v[:, t_idx + 1] = np.maximum(v[:, t_idx + 1], 0.0)

            # Update asset price: dS = mu*S*dt + sqrt(v)*S*dW_S
            S[:, t_idx + 1] = S[:, t_idx] * np.exp(
                (self.mu - 0.5 * v_curr) * dt + sqrt_v * sqrt_dt * ZS[:, t_idx]
            )

        return np.stack([S, v], axis=-1)

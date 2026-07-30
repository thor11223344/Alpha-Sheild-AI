"""
Variance Reduction and Sampling Utilities for Production Monte Carlo Engine
"""

from abc import ABC, abstractmethod
import numpy as np
from typing import Tuple, Optional
from scipy.stats import qmc

class VarianceReductionStrategy(ABC):
    """Abstract interface for Variance Reduction techniques"""
    
    @abstractmethod
    def generate_shocks(self, n_paths: int, n_steps: int, dimension: int, seed: Optional[int] = None) -> np.ndarray:
        """Generate random/quasi-random shock matrix shape: (n_paths, n_steps, dimension)"""
        pass


class StandardNormalSampler(VarianceReductionStrategy):
    """Standard Pseudo-Random Normal Sampler (Mersenne Twister / PCG64)"""

    def generate_shocks(self, n_paths: int, n_steps: int, dimension: int, seed: Optional[int] = None) -> np.ndarray:
        rng = np.random.default_rng(seed)
        return rng.standard_normal((n_paths, n_steps, dimension))


class AntitheticVariates(VarianceReductionStrategy):
    """
    Antithetic Variates Sampling:
    Pairs each random shock Z with its negation -Z.
    Reduces variance by inducing negative correlation Cov(f(Z), f(-Z)) < 0.
    """

    def generate_shocks(self, n_paths: int, n_steps: int, dimension: int, seed: Optional[int] = None) -> np.ndarray:
        rng = np.random.default_rng(seed)
        half_paths = (n_paths + 1) // 2
        raw_shocks = rng.standard_normal((half_paths, n_steps, dimension))
        antithetic_shocks = -raw_shocks
        
        combined = np.concatenate([raw_shocks, antithetic_shocks], axis=0)
        return combined[:n_paths, :, :]


class SobolQuasiRandom(VarianceReductionStrategy):
    """
    Sobol Low-Discrepancy Quasi-Monte Carlo Sampler.
    Achieves faster error convergence O(1/N) vs standard Monte Carlo O(1/sqrt(N)).
    """

    def generate_shocks(self, n_paths: int, n_steps: int, dimension: int, seed: Optional[int] = None) -> np.ndarray:
        total_dim = n_steps * dimension
        sobol = qmc.Sobol(d=total_dim, scramble=True, seed=seed)
        
        # Sobol works best with power of 2 paths
        pow2_paths = int(2 ** np.ceil(np.log2(n_paths)))
        uniform_samples = sobol.random(pow2_paths)[:n_paths]
        
        # Transform Uniform [0, 1] to Normal via inverse CDF
        from scipy.stats import norm
        normal_samples = norm.ppf(np.clip(uniform_samples, 1e-9, 1.0 - 1e-9))
        
        return normal_samples.reshape((n_paths, n_steps, dimension))


class LatinHypercubeSampler(VarianceReductionStrategy):
    """
    Latin Hypercube Sampling (LHS).
    Ensures uniform stratification across all input dimensions.
    """

    def generate_shocks(self, n_paths: int, n_steps: int, dimension: int, seed: Optional[int] = None) -> np.ndarray:
        total_dim = n_steps * dimension
        lhs = qmc.LatinHypercube(d=total_dim, seed=seed)
        uniform_samples = lhs.random(n_paths)
        
        from scipy.stats import norm
        normal_samples = norm.ppf(np.clip(uniform_samples, 1e-9, 1.0 - 1e-9))
        
        return normal_samples.reshape((n_paths, n_steps, dimension))

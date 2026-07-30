"""
Production-Grade Monte Carlo Engine Configuration Management
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum

class DiscretizationScheme(str, Enum):
    EULER_MARUYAMA = "euler_maruyama"
    MILSTEIN = "milstein"

class VarianceReductionMethod(str, Enum):
    NONE = "none"
    ANTITHETIC = "antithetic"
    CONTROL_VARIATES = "control_variates"
    SOBOL = "sobol"
    LATIN_HYPERCUBE = "latin_hypercube"

@dataclass
class SimulationConfig:
    n_paths: int = 10000
    n_steps: int = 252
    time_horizon: float = 1.0  # Years
    initial_value: float = 100000.0
    seed: Optional[int] = 42
    discretization: DiscretizationScheme = DiscretizationScheme.EULER_MARUYAMA
    variance_reduction: VarianceReductionMethod = VarianceReductionMethod.NONE
    confidence_level: float = 0.95
    parallel: bool = False
    max_workers: Optional[int] = None
    extra_params: Dict[str, Any] = field(default_factory=dict)

    @property
    def dt(self) -> float:
        return self.time_horizon / self.n_steps

"""
Risk Engine Module
Calculates risk scores based on crowd metrics
"""

from typing import Dict, Optional, Tuple, Any
import logging

logger = logging.getLogger(__name__)


class RiskEngine:
    """
    Calculate crowd risk scores based on multiple factors
    """

    # Risk level thresholds
    RISK_LEVELS = {
        "safe": (0, 30),
        "warning": (31, 55),
        "high": (56, 75),
        "critical": (76, 100)
    }

    def __init__(
        self,
        density_weight: float = 0.35,
        flow_weight: float = 0.25,
        velocity_weight: float = 0.15,
        bottleneck_weight: float = 0.25
    ):
        """
        Initialize risk engine with configurable weights.
        """

        self.density_weight = density_weight
        self.flow_weight = flow_weight
        self.velocity_weight = velocity_weight
        self.bottleneck_weight = bottleneck_weight

        # Normalize weights
        total_weight = sum([
            density_weight,
            flow_weight,
            velocity_weight,
            bottleneck_weight
        ])

        if total_weight > 0:

            self.density_weight /= total_weight
            self.flow_weight /= total_weight
            self.velocity_weight /= total_weight
            self.bottleneck_weight /= total_weight

    def calculate_risk(
        self,
        density: float,
        flow_metrics: Dict[str, Any],
        is_bottleneck: bool,
        zone_config: Optional[Dict] = None,
        people_count: int = 0
    ) -> Dict[str, Any]:
        """
        Calculate overall crowd risk score.

        Movement-related risk is only calculated when the
        tracker has actually established movement information.
        """

        # -----------------------------------------------------
        # No-data case
        # -----------------------------------------------------

        if (
            density == 0.0
            and flow_metrics.get("flow_rate", 0.0) == 0.0
        ):

            return {
                "risk_score": 0.0,
                "risk_level": "no_data",
                "components": {
                    "density": 0.0,
                    "flow": 0.0,
                    "velocity": 0.0,
                    "bottleneck": 0.0
                }
            }

        # -----------------------------------------------------
        # Very small crowd edge case
        # -----------------------------------------------------

        if (
            people_count <= 2
            and flow_metrics.get(
                "movement_data_available",
                False
            )
            and flow_metrics.get(
                "avg_velocity",
                0.0
            ) == 0.0
        ):

            return {
                "risk_score": 5.0,
                "risk_level": "safe",
                "components": {
                    "density": round(
                        density * 100,
                        2
                    ),
                    "flow": 0.0,
                    "velocity": 0.0,
                    "bottleneck": 0.0
                }
            }

        # -----------------------------------------------------
        # Density
        # -----------------------------------------------------
        #
        # Density is already normalized from 0.0 to 1.0.
        #
        # 0.20 -> 20 risk points
        # 0.50 -> 50 risk points
        # 1.00 -> 100 risk points
        # -----------------------------------------------------

        density_score = (
            min(
                max(density, 0.0),
                1.0
            )
            * 100
        )

        # -----------------------------------------------------
        # Check movement availability
        # -----------------------------------------------------

        movement_data_available = flow_metrics.get(
            "movement_data_available",
            False
        )

        # -----------------------------------------------------
        # Flow and velocity
        # -----------------------------------------------------
        #
        # If movement data is unavailable, these components
        # MUST NOT be treated as dangerous.
        # -----------------------------------------------------

        if not movement_data_available:

            flow_score = 0.0
            velocity_score = 0.0

        else:

            # -------------------------------------------------
            # Flow abnormality
            # -------------------------------------------------

            flow_consistency = flow_metrics.get(
                "flow_consistency",
                0.0
            )

            flow_score = (
                1.0
                - flow_consistency
            ) * 100

            flow_score = min(
                max(flow_score, 0.0),
                100.0
            )

            # -------------------------------------------------
            # Velocity
            # -------------------------------------------------

            velocity = flow_metrics.get(
                "avg_velocity",
                0.0
            )

            # Very slow movement
            if velocity < 2:

                velocity_score = 100

            # Very fast movement
            elif velocity > 20:

                velocity_score = 100

            # Normal movement
            else:

                velocity_score = 0

        # -----------------------------------------------------
        # Bottleneck
        # -----------------------------------------------------

        bottleneck_score = (
            100
            if is_bottleneck
            else 0
        )

        # -----------------------------------------------------
        # Weighted risk
        # -----------------------------------------------------

        raw_risk_score = (

            self.density_weight
            * density_score

            +

            self.flow_weight
            * flow_score

            +

            self.velocity_weight
            * velocity_score

            +

            self.bottleneck_weight
            * bottleneck_score
        )

        # -----------------------------------------------------
        # Crowd Mass Scaling
        # -----------------------------------------------------

        mass_scaling_factor = min(
            1.0,
            people_count / 15.0
        )

        risk_score = (
            raw_risk_score
            * mass_scaling_factor
        )

        risk_score = min(
            max(risk_score, 0.0),
            100.0
        )

        # -----------------------------------------------------
        # Determine risk level
        # -----------------------------------------------------

        risk_level = self._get_risk_level(
            risk_score
        )

        return {
            "risk_score": round(
                risk_score,
                2
            ),

            "risk_level": risk_level,

            "components": {
                "density": round(
                    density_score,
                    2
                ),

                "flow": round(
                    flow_score,
                    2
                ),

                "velocity": round(
                    velocity_score,
                    2
                ),

                "bottleneck": round(
                    bottleneck_score,
                    2
                )
            }
        }

    def _get_risk_level(
        self,
        score: float
    ) -> str:
        """
        Get risk level from risk score.
        """

        for level, (
            min_score,
            max_score
        ) in self.RISK_LEVELS.items():

            if min_score <= score <= max_score:

                return level

        return (
            "critical"
            if score > 75
            else "safe"
        )

    def should_trigger_alert(
        self,
        risk_result: Dict[str, Any],
        previous_risk: Optional[float] = None
    ) -> Tuple[bool, str]:
        """
        Determine if an alert should be triggered.
        """

        risk_score = risk_result["risk_score"]
        risk_level = risk_result["risk_level"]

        # -----------------------------------------------------
        # No data
        # -----------------------------------------------------

        if risk_level == "no_data":

            return (
                False,
                "No people detected - insufficient data"
            )

        # -----------------------------------------------------
        # Critical
        # -----------------------------------------------------

        if risk_level == "critical":

            return (
                True,
                f"Critical risk level: {risk_score}"
            )

        # -----------------------------------------------------
        # High
        # -----------------------------------------------------

        if risk_level == "high":

            return (
                True,
                f"High risk level: {risk_score}"
            )

        # -----------------------------------------------------
        # Warning + rapid increase
        # -----------------------------------------------------

        if (
            risk_level == "warning"
            and previous_risk is not None
        ):

            increase = (
                risk_score
                - previous_risk
            )

            if increase > 20:

                return (
                    True,
                    f"Rapid risk increase: +{increase:.1f}"
                )

        return (
            False,
            "Risk within acceptable limits"
        )
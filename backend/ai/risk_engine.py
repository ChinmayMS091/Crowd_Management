"""
Risk Engine Module
Calculates risk scores based on crowd metrics
"""

from typing import Dict, Optional, Tuple
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
        Initialize risk engine with configurable weights
        
        Args:
            density_weight: Weight for density in risk calculation
            flow_weight: Weight for flow abnormality
            velocity_weight: Weight for velocity
            bottleneck_weight: Weight for bottleneck detection
        """
        self.density_weight = density_weight
        self.flow_weight = flow_weight
        self.velocity_weight = velocity_weight
        self.bottleneck_weight = bottleneck_weight
        
        # Normalize weights
        total_weight = sum([density_weight, flow_weight, velocity_weight, bottleneck_weight])
        if total_weight > 0:
            self.density_weight /= total_weight
            self.flow_weight /= total_weight
            self.velocity_weight /= total_weight
            self.bottleneck_weight /= total_weight
    
    def calculate_risk(
        self,
        density: float,
        flow_metrics: Dict[str, float],
        is_bottleneck: bool,
        zone_config: Optional[Dict] = None,
        people_count: int = 0
    ) -> Dict[str, any]:
        """
        Calculate overall risk score
        
        Args:
            density: Normalized density (0-1)
            flow_metrics: Flow metrics from analytics
            is_bottleneck: Whether bottleneck is detected
            zone_config: Optional zone-specific configuration
            people_count: Number of people detected (for edge case handling)
            
        Returns:
            Dict with risk_score, risk_level, and component_scores
        """
        # Handle no-data case: if no people detected, return no_data state
        if density == 0.0 and flow_metrics["flow_rate"] == 0.0:
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
        
        # Handle single person edge case: stationary single person is not a risk
        if people_count <= 2 and flow_metrics["avg_velocity"] == 0.0:
            # Single stationary person - treat as safe
            return {
                "risk_score": 5.0,  # Low but non-zero to indicate data exists
                "risk_level": "safe",
                "components": {
                    "density": round(density * 100, 2),
                    "flow": 0.0,
                    "velocity": 0.0,
                    "bottleneck": 0.0
                }
            }
        
        # Get zone-specific thresholds if available
        if zone_config:
            density_threshold = zone_config.get("density_threshold", 0.5)
            flow_threshold = zone_config.get("flow_threshold", 0.3)
        else:
            density_threshold = 0.5
            flow_threshold = 0.3
        
        # Calculate component scores (0-100)
        density_score = min(density / density_threshold * 100, 100)
        
        # Flow abnormality: low consistency = high risk
        flow_score = (1 - flow_metrics["flow_consistency"]) * 100
        
        # Velocity: very low or very high = high risk
        velocity = flow_metrics["avg_velocity"]
        if velocity < 2:  # Too slow
            velocity_score = 100
        elif velocity > 20:  # Too fast (potential stampede)
            velocity_score = 100
        else:
            velocity_score = 0
        
        # Bottleneck penalty
        bottleneck_score = 100 if is_bottleneck else 0
        
        # Calculate weighted risk score
        raw_risk_score = (
            self.density_weight * density_score +
            self.flow_weight * flow_score +
            self.velocity_weight * velocity_score +
            self.bottleneck_weight * bottleneck_score
        )
        
        # Apply Crowd Mass Scaling
        # It is physically impossible to have a crowd crush/stampede with a small number of people,
        # regardless of how much of the camera frame they take up (e.g., standing close to the lens).
        # We scale the risk down for groups smaller than 15 people.
        mass_scaling_factor = min(1.0, people_count / 15.0)
        risk_score = raw_risk_score * mass_scaling_factor
        
        # Determine risk level
        risk_level = self._get_risk_level(risk_score)
        
        return {
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "components": {
                "density": round(density_score, 2),
                "flow": round(flow_score, 2),
                "velocity": round(velocity_score, 2),
                "bottleneck": round(bottleneck_score, 2)
            }
        }
    
    def _get_risk_level(self, score: float) -> str:
        """Get risk level from score"""
        for level, (min_score, max_score) in self.RISK_LEVELS.items():
            if min_score <= score <= max_score:
                return level
        return "critical" if score > 75 else "safe"
    
    def should_trigger_alert(
        self,
        risk_result: Dict[str, any],
        previous_risk: Optional[float] = None
    ) -> Tuple[bool, str]:
        """
        Determine if an alert should be triggered
        
        Args:
            risk_result: Result from calculate_risk
            previous_risk: Previous risk score for trend analysis
            
        Returns:
            Tuple of (should_alert, reason)
        """
        risk_score = risk_result["risk_score"]
        risk_level = risk_result["risk_level"]
        
        # No data state - do not trigger alert
        if risk_level == "no_data":
            return (False, "No people detected - insufficient data")
        
        # Critical level always triggers alert
        if risk_level == "critical":
            return (True, f"Critical risk level: {risk_score}")
        
        # High level triggers alert
        if risk_level == "high":
            return (True, f"High risk level: {risk_score}")
        
        # Warning level with rapid increase triggers alert
        if risk_level == "warning" and previous_risk:
            increase = risk_score - previous_risk
            if increase > 20:  # Rapid increase
                return (True, f"Rapid risk increase: +{increase:.1f}")
        
        return (False, "Risk within acceptable limits")

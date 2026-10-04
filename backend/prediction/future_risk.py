def calculate_future_risk(predicted_people: float) -> dict:
    """
    Calculate future crowd risk from the predicted people count.
    """

    predicted_people = max(0, float(predicted_people))

    # Crowd level
    if predicted_people <= 100:
        crowd_level = "Low"
    elif predicted_people <= 300:
        crowd_level = "Moderate"
    elif predicted_people <= 500:
        crowd_level = "High"
    else:
        crowd_level = "Very High"

    # Future risk score
    #
    # 0 people  -> 0 risk
    # 500+      -> 100 risk
    #
    # We keep this independent from the real-time RiskEngine.
    risk_score = min(100.0, (predicted_people / 500.0) * 100.0)

    # Risk level
    if risk_score <= 30:
        risk_level = "safe"
    elif risk_score <= 55:
        risk_level = "warning"
    elif risk_score <= 75:
        risk_level = "high"
    else:
        risk_level = "critical"

    return {
        "predicted_people": round(predicted_people, 2),
        "crowd_level": crowd_level,
        "future_risk_score": round(risk_score, 2),
        "future_risk_level": risk_level,
    }
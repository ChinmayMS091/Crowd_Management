"""
Test script for zero-detection / no-person handling
Tests the fix for the issue where zero detections caused false bottleneck/risk alerts
"""
from ai.tracking import SimpleTracker
from ai.analytics import CrowdAnalytics
from ai.risk_engine import RiskEngine

print("=" * 80)
print("ZERO-DETECTION HANDLING TESTS")
print("=" * 80)
print()

# Initialize components
tracker = SimpleTracker()
analytics = CrowdAnalytics(frame_width=640, frame_height=480)
risk_engine = RiskEngine()

# Test 1: Zero Detections (No People)
print("Test 1: Zero Detections (No People)")
print("-" * 80)
try:
    detections = []
    tracks = tracker.update(detections, frame_number=0)
    
    people_count = len(tracks)
    density = analytics.calculate_density(tracks)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    is_bottleneck, bottleneck_reason = analytics.detect_bottleneck(density, flow_metrics)
    risk_result = risk_engine.calculate_risk(density, flow_metrics, is_bottleneck, people_count=people_count)
    should_alert, alert_reason = risk_engine.should_trigger_alert(risk_result)
    
    print(f"  People count: {people_count}")
    print(f"  Density: {density:.4f}")
    print(f"  Flow rate: {flow_metrics['flow_rate']:.4f}")
    print(f"  Avg velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"  Bottleneck: {is_bottleneck} (reason: '{bottleneck_reason}')")
    print(f"  Risk score: {risk_result['risk_score']:.2f}")
    print(f"  Risk level: {risk_result['risk_level']}")
    print(f"  Alert triggered: {should_alert} (reason: '{alert_reason}')")
    
    # Verify expected behavior
    assert people_count == 0, "People count should be 0"
    assert density == 0.0, "Density should be 0"
    assert flow_metrics['flow_rate'] == 0.0, "Flow rate should be 0"
    assert is_bottleneck == False, "Bottleneck should NOT be triggered"
    assert bottleneck_reason == "No people detected", "Reason should be 'No people detected'"
    assert risk_result['risk_score'] == 0.0, "Risk score should be 0"
    assert risk_result['risk_level'] == "no_data", "Risk level should be 'no_data'"
    assert should_alert == False, "Alert should NOT be triggered"
    
    print(f"  ✓ All assertions passed")
except Exception as e:
    print(f"  ✗ Failed: {e}")
print()

# Test 2: One Person (Low Risk / Empty Scene)
print("Test 2: One Person (Low Risk / Empty Scene)")
print("-" * 80)
try:
    tracker.reset()
    
    detections = [{"bbox": [100, 100, 200, 300]}]
    tracks = tracker.update(detections, frame_number=0)
    
    people_count = len(tracks)
    density = analytics.calculate_density(tracks)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    is_bottleneck, bottleneck_reason = analytics.detect_bottleneck(density, flow_metrics)
    risk_result = risk_engine.calculate_risk(density, flow_metrics, is_bottleneck, people_count=people_count)
    should_alert, alert_reason = risk_engine.should_trigger_alert(risk_result)
    
    print(f"  People count: {people_count}")
    print(f"  Density: {density:.4f}")
    print(f"  Flow rate: {flow_metrics['flow_rate']:.4f}")
    print(f"  Avg velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"  Bottleneck: {is_bottleneck} (reason: '{bottleneck_reason}')")
    print(f"  Risk score: {risk_result['risk_score']:.2f}")
    print(f"  Risk level: {risk_result['risk_level']}")
    print(f"  Alert triggered: {should_alert} (reason: '{alert_reason}')")
    
    # Verify expected behavior
    assert people_count == 1, "People count should be 1"
    assert density > 0.0, "Density should be > 0"
    assert risk_result['risk_level'] in ["safe", "warning"], "Risk level should be safe or warning"
    
    print(f"  ✓ All assertions passed")
except Exception as e:
    print(f"  ✗ Failed: {e}")
print()

# Test 3: Normal Crowd (Multiple People)
print("Test 3: Normal Crowd (Multiple People)")
print("-" * 80)
try:
    tracker.reset()
    
    # Create multiple people with some movement
    detections = [
        {"bbox": [100, 100, 200, 300]},
        {"bbox": [300, 100, 400, 300]},
        {"bbox": [500, 100, 600, 300]},
    ]
    tracks = tracker.update(detections, frame_number=0)
    
    # Move them slightly to create velocity
    detections_next = [
        {"bbox": [105, 105, 205, 305]},
        {"bbox": [305, 105, 405, 305]},
        {"bbox": [505, 105, 605, 305]},
    ]
    tracks = tracker.update(detections_next, frame_number=1)
    
    people_count = len(tracks)
    density = analytics.calculate_density(tracks)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    is_bottleneck, bottleneck_reason = analytics.detect_bottleneck(density, flow_metrics)
    risk_result = risk_engine.calculate_risk(density, flow_metrics, is_bottleneck, people_count=people_count)
    should_alert, alert_reason = risk_engine.should_trigger_alert(risk_result)
    
    print(f"  People count: {people_count}")
    print(f"  Density: {density:.4f}")
    print(f"  Flow rate: {flow_metrics['flow_rate']:.4f}")
    print(f"  Avg velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"  Flow consistency: {flow_metrics['flow_consistency']:.4f}")
    print(f"  Bottleneck: {is_bottleneck} (reason: '{bottleneck_reason}')")
    print(f"  Risk score: {risk_result['risk_score']:.2f}")
    print(f"  Risk level: {risk_result['risk_level']}")
    print(f"  Alert triggered: {should_alert} (reason: '{alert_reason}')")
    
    # Verify expected behavior
    assert people_count == 3, "People count should be 3"
    assert density > 0.0, "Density should be > 0"
    assert flow_metrics['avg_velocity'] > 0.0, "Velocity should be > 0"
    
    print(f"  ✓ All assertions passed")
except Exception as e:
    print(f"  ✗ Failed: {e}")
print()

# Test 4: High-Density Crowd
print("Test 4: High-Density Crowd")
print("-" * 80)
try:
    tracker.reset()
    
    # Create many people in a small area
    detections = []
    for i in range(10):
        x = 50 + i * 20
        detections.append({"bbox": [x, 100, x + 80, 300]})
    
    tracks = tracker.update(detections, frame_number=0)
    
    people_count = len(tracks)
    density = analytics.calculate_density(tracks)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    is_bottleneck, bottleneck_reason = analytics.detect_bottleneck(density, flow_metrics)
    risk_result = risk_engine.calculate_risk(density, flow_metrics, is_bottleneck, people_count=people_count)
    should_alert, alert_reason = risk_engine.should_trigger_alert(risk_result)
    
    print(f"  People count: {people_count}")
    print(f"  Density: {density:.4f}")
    print(f"  Flow rate: {flow_metrics['flow_rate']:.4f}")
    print(f"  Avg velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"  Bottleneck: {is_bottleneck} (reason: '{bottleneck_reason}')")
    print(f"  Risk score: {risk_result['risk_score']:.2f}")
    print(f"  Risk level: {risk_result['risk_level']}")
    print(f"  Alert triggered: {should_alert} (reason: '{alert_reason}')")
    
    # Verify expected behavior
    assert people_count == 10, "People count should be 10"
    assert density > 0.0, "Density should be > 0"
    
    print(f"  ✓ All assertions passed")
except Exception as e:
    print(f"  ✗ Failed: {e}")
print()

# Test 5: Bottleneck with Actual People
print("Test 5: Bottleneck with Actual People")
print("-" * 80)
try:
    tracker.reset()
    
    # Create people with low velocity (simulating bottleneck)
    detections = [
        {"bbox": [100, 100, 200, 300]},
        {"bbox": [150, 100, 250, 300]},
        {"bbox": [200, 100, 300, 300]},
    ]
    
    # Keep them stationary (low velocity)
    for frame_num in range(5):
        tracks = tracker.update(detections, frame_number=frame_num)
    
    people_count = len(tracks)
    density = analytics.calculate_density(tracks)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    is_bottleneck, bottleneck_reason = analytics.detect_bottleneck(density, flow_metrics)
    risk_result = risk_engine.calculate_risk(density, flow_metrics, is_bottleneck, people_count=people_count)
    should_alert, alert_reason = risk_engine.should_trigger_alert(risk_result)
    
    print(f"  People count: {people_count}")
    print(f"  Density: {density:.4f}")
    print(f"  Flow rate: {flow_metrics['flow_rate']:.4f}")
    print(f"  Avg velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"  Flow consistency: {flow_metrics['flow_consistency']:.4f}")
    print(f"  Bottleneck: {is_bottleneck} (reason: '{bottleneck_reason}')")
    print(f"  Risk score: {risk_result['risk_score']:.2f}")
    print(f"  Risk level: {risk_result['risk_level']}")
    print(f"  Alert triggered: {should_alert} (reason: '{alert_reason}')")
    
    # Verify expected behavior
    assert people_count == 3, "People count should be 3"
    assert density > 0.0, "Density should be > 0"
    assert flow_metrics['avg_velocity'] < 2.0, "Velocity should be low (< 2)"
    
    print(f"  ✓ All assertions passed")
except Exception as e:
    print(f"  ✗ Failed: {e}")
print()

print("=" * 80)
print("SUMMARY OF CHANGES")
print("=" * 80)
print()

print("CHANGES MADE:")
print("1. ai/analytics.py - detect_bottleneck():")
print("   - Added check: if density == 0.0 and flow_rate == 0.0, return (False, 'No people detected')")
print("   - This prevents false bottleneck detection when no people are present")
print()

print("2. ai/risk_engine.py - calculate_risk():")
print("   - Added check: if density == 0.0 and flow_rate == 0.0, return no_data state")
print("   - Returns risk_score = 0.0, risk_level = 'no_data'")
print("   - This prevents false high/critical risk scores when no people are present")
print()

print("3. ai/risk_engine.py - should_trigger_alert():")
print("   - Added check: if risk_level == 'no_data', return (False, 'No people detected - insufficient data')")
print("   - This prevents false alerts when no people are present")
print()

print("BEHAVIOR CHANGES:")
print("BEFORE FIX:")
print("  - Zero detections → bottleneck = TRUE (due to low velocity/consistency)")
print("  - Zero detections → risk = 65 (HIGH)")
print("  - Zero detections → alert = TRUE")
print()

print("AFTER FIX:")
print("  - Zero detections → bottleneck = FALSE (reason: 'No people detected')")
print("  - Zero detections → risk = 0 (level: 'no_data')")
print("  - Zero detections → alert = FALSE (reason: 'No people detected - insufficient data')")
print()

print("STATE DISTINCTION:")
print("1. REAL LOW-RISK / EMPTY SCENE:")
print("   - One person, low density, normal flow")
print("   - Risk level: safe or warning")
print("   - Alert: FALSE (unless rapid increase)")
print()

print("2. NO VALID DETECTIONS / INSUFFICIENT DATA:")
print("   - Zero people, density = 0, flow = 0")
print("   - Risk level: no_data")
print("   - Alert: FALSE")
print()

print("3. ACTUAL CROWD RISK:")
print("   - Multiple people, high density, low flow, bottleneck")
print("   - Risk level: high or critical")
print("   - Alert: TRUE")
print()

print("=" * 80)
print("ZERO-DETECTION HANDLING TESTS COMPLETE")
print("=" * 80)

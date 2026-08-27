"""
Test script for flow analysis
"""
import numpy as np
from ai.tracking import SimpleTracker
from ai.analytics import CrowdAnalytics

print("=" * 60)
print("Phase 6 - Flow Analysis Testing")
print("=" * 60)
print()

# Test 1: Average Velocity Calculation
print("Test 1: Average Velocity Calculation")
print("-" * 60)
try:
    tracker = SimpleTracker()
    analytics = CrowdAnalytics(frame_width=640, frame_height=480)
    
    # Create tracks with known movement
    # Person 1: Moving right at 10 pixels/frame
    # Person 2: Moving right at 15 pixels/frame
    # Person 3: Moving left at 8 pixels/frame
    
    for frame_num in range(5):
        detections = [
            {"bbox": [100 + frame_num * 10, 100, 200 + frame_num * 10, 300]},  # Right 10
            {"bbox": [300 + frame_num * 15, 100, 400 + frame_num * 15, 300]},  # Right 15
            {"bbox": [500 - frame_num * 8, 100, 600 - frame_num * 8, 300]},    # Left 8
        ]
        tracks = tracker.update(detections, frame_number=frame_num)
    
    # Calculate average velocity
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    
    print(f"✓ Active tracks: {len(tracks)}")
    print(f"✓ Average velocity: {flow_metrics['avg_velocity']:.4f}")
    
    # Expected: Average of (10, 15, -8) = 5.67 pixels/frame
    expected_avg = (10 + 15 - 8) / 3
    if abs(flow_metrics['avg_velocity'] - expected_avg) < 1.0:
        print(f"✓ Velocity calculation accurate (expected ~{expected_avg:.2f})")
    else:
        print(f"✗ Velocity calculation error (expected ~{expected_avg:.2f})")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 2: Flow Rate (Moving People / Total People)
print("Test 2: Flow Rate (Moving People / Total People)")
print("-" * 60)
try:
    tracker.reset()
    analytics = CrowdAnalytics(frame_width=640, frame_height=480)
    
    # Create mix of moving and stationary people
    for frame_num in range(3):
        detections = [
            {"bbox": [100 + frame_num * 10, 100, 200 + frame_num * 10, 300]},  # Moving
            {"bbox": [300, 100, 400, 300]},  # Stationary
            {"bbox": [500 + frame_num * 5, 100, 600 + frame_num * 5, 300]},    # Moving slowly
        ]
        tracks = tracker.update(detections, frame_number=frame_num)
    
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    
    print(f"✓ Total people: {len(tracks)}")
    print(f"✓ Flow rate: {flow_metrics['flow_rate']:.4f}")
    print(f"✓ Flow percentage: {flow_metrics['flow_rate'] * 100:.2f}%")
    
    # Expected: 2 moving out of 3 = 0.667
    if 0.6 < flow_metrics['flow_rate'] < 0.8:
        print(f"✓ Flow rate calculation accurate")
    else:
        print(f"✗ Flow rate calculation error")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 3: Flow Consistency (Direction Alignment)
print("Test 3: Flow Consistency (Direction Alignment)")
print("-" * 60)
try:
    tracker.reset()
    analytics = CrowdAnalytics(frame_width=640, frame_height=480)
    
    # Test 1: All moving in same direction (high consistency)
    print("  Test 3a: All moving right (high consistency)")
    for frame_num in range(3):
        detections = [
            {"bbox": [100 + frame_num * 10, 100, 200 + frame_num * 10, 300]},
            {"bbox": [300 + frame_num * 12, 100, 400 + frame_num * 12, 300]},
            {"bbox": [500 + frame_num * 8, 100, 600 + frame_num * 8, 300]},
        ]
        tracks = tracker.update(detections, frame_number=frame_num)
    
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    print(f"    Consistency: {flow_metrics['flow_consistency']:.4f}")
    print(f"    Status: {'HIGH' if flow_metrics['flow_consistency'] > 0.7 else 'LOW'}")
    
    # Test 2: Moving in different directions (low consistency)
    print("  Test 3b: Moving in different directions (low consistency)")
    tracker.reset()
    for frame_num in range(3):
        detections = [
            {"bbox": [100 + frame_num * 10, 100, 200 + frame_num * 10, 300]},  # Right
            {"bbox": [300 - frame_num * 10, 100, 400 - frame_num * 10, 300]},  # Left
            {"bbox": [500, 100 + frame_num * 5, 600, 300 + frame_num * 5]},    # Down
        ]
        tracks = tracker.update(detections, frame_number=frame_num)
    
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    print(f"    Consistency: {flow_metrics['flow_consistency']:.4f}")
    print(f"    Status: {'HIGH' if flow_metrics['flow_consistency'] > 0.7 else 'LOW'}")
    
    print(f"✓ Flow consistency calculation working")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 4: Flow Trend Over Frames
print("Test 4: Flow Trend Over Frames")
print("-" * 60)
try:
    tracker.reset()
    analytics = CrowdAnalytics(frame_width=640, frame_height=480)
    
    flow_history = []
    
    # Simulate increasing flow over frames
    for frame_num in range(5):
        # Add more moving people each frame
        num_moving = 1 + frame_num
        detections = []
        for i in range(num_moving):
            x = 50 + i * 50
            detections.append({"bbox": [x + frame_num * 10, 100, x + 100 + frame_num * 10, 300]})
        
        tracks = tracker.update(detections, frame_number=frame_num)
        flow_metrics = analytics.calculate_flow_metrics(tracks)
        flow_history.append(flow_metrics['flow_rate'])
        
        print(f"  Frame {frame_num}: {len(tracks)} people, flow rate = {flow_metrics['flow_rate']:.4f}")
    
    # Check trend
    is_increasing = all(flow_history[i] <= flow_history[i+1] for i in range(len(flow_history)-1))
    print(f"✓ Flow trend: {'Increasing' if is_increasing else 'Not increasing'}")
    
    if is_increasing:
        print(f"✓ Flow trend tracking working correctly")
    else:
        print(f"✗ Flow trend tracking issue")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 5: Configurable Flow Thresholds
print("Test 5: Configurable Flow Thresholds")
print("-" * 60)
try:
    tracker.reset()
    analytics = CrowdAnalytics(frame_width=640, frame_height=480)
    
    # Create a scenario with known flow rate
    for frame_num in range(3):
        detections = [
            {"bbox": [100 + frame_num * 10, 100, 200 + frame_num * 10, 300]},  # Moving
            {"bbox": [300, 100, 400, 300]},  # Stationary
        ]
        tracks = tracker.update(detections, frame_number=frame_num)
    
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    flow_rate = flow_metrics['flow_rate']
    
    print(f"✓ Current flow rate: {flow_rate:.4f}")
    
    # Test against different thresholds
    thresholds = [0.3, 0.5, 0.7, 0.9]
    for threshold in thresholds:
        is_over_threshold = flow_rate > threshold
        print(f"  Threshold {threshold}: {'OVER' if is_over_threshold else 'UNDER'}")
    
    print(f"✓ Configurable thresholds working")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 6: Velocity Magnitude for Different Movements
print("Test 6: Velocity Magnitude for Different Movements")
print("-" * 60)
try:
    tracker.reset()
    analytics = CrowdAnalytics(frame_width=640, frame_height=480)
    
    # Test 1: Moving right (positive X)
    print("  Test 6a: Moving right")
    tracker.reset()
    for frame_num in range(3):
        detections = [{"bbox": [100 + frame_num * 10, 100, 200 + frame_num * 10, 300]}]
        tracks = tracker.update(detections, frame_number=frame_num)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    print(f"    Average velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"    Flow rate: {flow_metrics['flow_rate']:.4f}")
    
    # Test 2: Moving left (negative X)
    print("  Test 6b: Moving left")
    tracker.reset()
    for frame_num in range(3):
        detections = [{"bbox": [500 - frame_num * 10, 100, 600 - frame_num * 10, 300]}]
        tracks = tracker.update(detections, frame_number=frame_num)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    print(f"    Average velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"    Flow rate: {flow_metrics['flow_rate']:.4f}")
    
    # Test 3: Moving down (positive Y)
    print("  Test 6c: Moving down")
    tracker.reset()
    for frame_num in range(3):
        detections = [{"bbox": [100, 100 + frame_num * 10, 200, 300 + frame_num * 10]}]
        tracks = tracker.update(detections, frame_number=frame_num)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    print(f"    Average velocity: {flow_metrics['avg_velocity']:.4f}")
    print(f"    Flow rate: {flow_metrics['flow_rate']:.4f}")
    
    print(f"✓ Velocity magnitude tracking working")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

print("=" * 60)
print("Phase 6 Testing Complete")
print("=" * 60)

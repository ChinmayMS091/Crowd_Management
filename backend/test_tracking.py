"""
Test script for ByteTrack-style person tracking
"""
import numpy as np
from ai.tracking import SimpleTracker

print("=" * 60)
print("Phase 4 - Person Tracking Testing")
print("=" * 60)
print()

# Test 1: Tracker Initialization
print("Test 1: Tracker Initialization")
print("-" * 60)
try:
    tracker = SimpleTracker(iou_threshold=0.3)
    print(f"✓ Tracker initialized")
    print(f"✓ IoU threshold: {tracker.iou_threshold}")
    print(f"✓ Next track ID: {tracker.next_track_id}")
    print(f"✓ Active tracks: {tracker.get_track_count()}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 2: New Track Creation
print("Test 2: New Track Creation")
print("-" * 60)
try:
    # Simulate first detection
    detections = [
        {
            "class_id": 0,
            "class_name": "person",
            "confidence": 0.85,
            "bbox": [100, 100, 200, 300]  # x1, y1, x2, y2
        }
    ]
    
    tracks = tracker.update(detections, frame_number=0)
    print(f"✓ Frame 0: {len(tracks)} active tracks")
    
    if tracks:
        track = tracks[0]
        print(f"  Track ID: {track['track_id']}")
        print(f"  BBox: {track['bbox']}")
        print(f"  Center: {track['center']}")
        print(f"  Age: {track['age']}")
        print(f"  Velocity: {track['velocity']}")
        
        # Check internal tracker state
        internal_track = tracker.tracks[track['track_id']]
        print(f"  Trajectory length: {len(internal_track.trajectory)}")
        print(f"  State: {internal_track.state}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 3: Persistent Tracking IDs
print("Test 3: Persistent Tracking IDs Across Frames")
print("-" * 60)
try:
    tracker.reset()
    
    # Simulate moving object across frames
    detections_sequence = [
        [{"bbox": [100, 100, 200, 300]}],  # Frame 0
        [{"bbox": [110, 105, 210, 305]}],  # Frame 1 (slightly moved)
        [{"bbox": [120, 110, 220, 310]}],  # Frame 2 (slightly moved)
        [{"bbox": [130, 115, 230, 315]}],  # Frame 3 (slightly moved)
    ]
    
    track_ids = []
    for i, detections in enumerate(detections_sequence):
        tracks = tracker.update(detections, frame_number=i)
        if tracks:
            track_ids.append(tracks[0]['track_id'])
            print(f"  Frame {i}: Track ID = {tracks[0]['track_id']}, BBox = {tracks[0]['bbox']}")
    
    # Check if ID remained consistent
    if len(set(track_ids)) == 1:
        print(f"✓ Track ID remained consistent: {track_ids[0]}")
    else:
        print(f"✗ Track ID changed: {track_ids}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 4: Trajectory History
print("Test 4: Trajectory History Storage")
print("-" * 60)
try:
    tracker.reset()
    
    # Create a track and move it
    for i in range(5):
        x = 100 + i * 10
        detections = [{"bbox": [x, 100, x + 100, 300]}]
        tracker.update(detections, frame_number=i)
    
    # Check trajectory
    track_id = list(tracker.tracks.keys())[0]
    track = tracker.tracks[track_id]
    
    print(f"✓ Track ID: {track_id}")
    print(f"✓ Trajectory length: {len(track.trajectory)}")
    print(f"✓ Trajectory positions:")
    for i, bbox in enumerate(track.trajectory):
        center_x = (bbox[0] + bbox[2]) / 2
        center_y = (bbox[1] + bbox[3]) / 2
        print(f"    Frame {i}: ({center_x:.1f}, {center_y:.1f})")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 5: Lost Track Handling
print("Test 5: Lost Track Handling")
print("-" * 60)
try:
    tracker.reset()
    
    # Create a track
    detections = [{"bbox": [100, 100, 200, 300]}]
    tracks = tracker.update(detections, frame_number=0)
    track_id = tracks[0]['track_id']
    print(f"✓ Created track {track_id}")
    
    # Simulate lost detections (no detections for several frames)
    for i in range(1, 8):
        tracks = tracker.update([], frame_number=i)
        print(f"  Frame {i}: {len(tracks)} active tracks")
    
    # Check track state
    if track_id in tracker.tracks:
        track = tracker.tracks[track_id]
        print(f"✓ Track {track_id} state: {track.state}")
        print(f"✓ Track {track_id} misses: {track.misses}")
        print(f"✓ Track {track_id} age: {track.age}")
    else:
        print(f"✓ Track {track_id} was deleted after max misses")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 6: Multiple Tracks
print("Test 6: Multiple Tracks Handling")
print("-" * 60)
try:
    tracker.reset()
    
    # Create multiple tracks
    detections = [
        {"bbox": [100, 100, 200, 300]},  # Person 1
        {"bbox": [300, 100, 400, 300]},  # Person 2
        {"bbox": [500, 100, 600, 300]},  # Person 3
    ]
    
    tracks = tracker.update(detections, frame_number=0)
    print(f"✓ Frame 0: {len(tracks)} active tracks")
    
    for track in tracks:
        print(f"  Track ID: {track['track_id']}, Center: {track['center']}")
    
    # Move them and verify IDs persist
    detections_next = [
        {"bbox": [110, 105, 210, 305]},  # Person 1 moved
        {"bbox": [310, 105, 410, 305]},  # Person 2 moved
        {"bbox": [510, 105, 610, 305]},  # Person 3 moved
    ]
    
    tracks_next = tracker.update(detections_next, frame_number=1)
    print(f"✓ Frame 1: {len(tracks_next)} active tracks")
    
    track_ids_prev = {t['track_id'] for t in tracks}
    track_ids_next = {t['track_id'] for t in tracks_next}
    
    if track_ids_prev == track_ids_next:
        print(f"✓ All track IDs persisted: {track_ids_next}")
    else:
        print(f"✗ Track IDs changed")
        print(f"  Previous: {track_ids_prev}")
        print(f"  Current: {track_ids_next}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 7: Velocity Calculation
print("Test 7: Velocity Calculation")
print("-" * 60)
try:
    tracker.reset()
    
    # Create a track with known movement
    # Move 10 pixels per frame in X direction
    for i in range(5):
        x = 100 + i * 10
        detections = [{"bbox": [x, 100, x + 100, 300]}]
        tracks = tracker.update(detections, frame_number=i)
        
        if tracks:
            velocity = tracks[0]['velocity']
            print(f"  Frame {i}: Velocity = ({velocity[0]:.1f}, {velocity[1]:.1f})")
    
    # Expected velocity: (10, 0) pixels per frame
    final_velocity = tracks[0]['velocity']
    print(f"✓ Final velocity: ({final_velocity[0]:.1f}, {final_velocity[1]:.1f})")
    print(f"✓ Expected: (10.0, 0.0)")
    
    if abs(final_velocity[0] - 10.0) < 1.0 and abs(final_velocity[1] - 0.0) < 1.0:
        print(f"✓ Velocity calculation is accurate")
    else:
        print(f"✗ Velocity calculation has significant error")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 8: IoU Calculation
print("Test 8: IoU Calculation Verification")
print("-" * 60)
try:
    tracker.reset()
    
    # Test IoU with identical boxes (should be 1.0)
    bbox1 = [100, 100, 200, 300]
    bbox2 = [100, 100, 200, 300]
    iou = tracker._calculate_iou(bbox1, bbox2)
    print(f"✓ Identical boxes IoU: {iou:.4f} (expected: 1.0)")
    
    # Test IoU with overlapping boxes
    bbox3 = [150, 150, 250, 350]
    iou_overlap = tracker._calculate_iou(bbox1, bbox3)
    print(f"✓ Overlapping boxes IoU: {iou_overlap:.4f}")
    
    # Test IoU with non-overlapping boxes
    bbox4 = [300, 300, 400, 500]
    iou_no_overlap = tracker._calculate_iou(bbox1, bbox4)
    print(f"✓ Non-overlapping boxes IoU: {iou_no_overlap:.4f} (expected: 0.0)")
    
    if iou == 1.0 and iou_no_overlap == 0.0:
        print(f"✓ IoU calculation is correct")
    else:
        print(f"✗ IoU calculation has errors")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

print("=" * 60)
print("Phase 4 Testing Complete")
print("=" * 60)

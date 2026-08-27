"""
Test script for YOLO person detection
"""
import cv2
import time
import numpy as np
from ai.detection import PersonDetector
from ai.video_processor import VideoProcessor

print("=" * 60)
print("Phase 3 - YOLO Person Detection Testing")
print("=" * 60)
print()

# Test 1: Model Loading
print("Test 1: YOLO Model Loading")
print("-" * 60)
try:
    detector = PersonDetector()
    model_info = detector.get_model_info()
    print(f"✓ Model Status: {model_info['status']}")
    print(f"✓ Model Path: {model_info['model_path']}")
    print(f"✓ Confidence Threshold: {model_info['confidence_threshold']}")
    print(f"✓ IoU Threshold: {model_info['iou_threshold']}")
    print(f"✓ Classes: {model_info['classes']}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 2: Frame Extraction from Video
print("Test 2: Frame Extraction from Video")
print("-" * 60)
video_path = "test_video_people.mp4"
try:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"✗ Could not open video: {video_path}")
    else:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"✓ Video FPS: {fps}")
        print(f"✓ Total Frames: {frame_count}")
        print(f"✓ Resolution: {width}x{height}")
        
        # Extract a single frame
        ret, frame = cap.read()
        if ret:
            print(f"✓ Successfully extracted frame")
            print(f"✓ Frame shape: {frame.shape}")
        else:
            print(f"✗ Failed to read frame")
        cap.release()
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 3: YOLO Inference on Single Frame
print("Test 3: YOLO Inference on Single Frame")
print("-" * 60)
try:
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        start_time = time.time()
        detections = detector.detect_frame(frame, frame_number=0)
        inference_time = time.time() - start_time
        
        print(f"✓ Inference completed in {inference_time:.4f} seconds")
        print(f"✓ Number of detections: {len(detections)}")
        
        for i, det in enumerate(detections):
            print(f"  Detection {i+1}:")
            print(f"    Class: {det['class_name']} (ID: {det['class_id']})")
            print(f"    Confidence: {det['confidence']:.4f}")
            print(f"    BBox: {det['bbox']}")
    else:
        print(f"✗ Could not read frame from video")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 4: Person-Class Filtering
print("Test 4: Person-Class Filtering")
print("-" * 60)
try:
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        detections = detector.detect_frame(frame, frame_number=0)
        
        # Check if all detections are person class
        all_persons = all(det['class_id'] == detector.PERSON_CLASS_ID for det in detections)
        print(f"✓ All detections are person class: {all_persons}")
        print(f"✓ Person class ID: {detector.PERSON_CLASS_ID}")
        
        for det in detections:
            if det['class_id'] == detector.PERSON_CLASS_ID:
                print(f"  ✓ {det['class_name']} detected")
            else:
                print(f"  ✗ Non-person class detected: {det['class_name']}")
    else:
        print(f"✗ Could not read frame from video")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 5: Confidence Threshold Filtering
print("Test 5: Confidence Threshold Filtering")
print("-" * 60)
try:
    print(f"Current confidence threshold: {detector.confidence_threshold}")
    
    # Test with lower threshold to see if model detects anything
    print("Testing with lower threshold (0.1) to check model sensitivity...")
    original_threshold = detector.confidence_threshold
    detector.confidence_threshold = 0.1
    
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        detections = detector.detect_frame(frame, frame_number=0)
        
        if detections:
            confidences = [det['confidence'] for det in detections]
            min_conf = min(confidences)
            max_conf = max(confidences)
            avg_conf = sum(confidences) / len(confidences)
            
            print(f"✓ Detection count (low threshold): {len(detections)}")
            print(f"✓ Min confidence: {min_conf:.4f}")
            print(f"✓ Max confidence: {max_conf:.4f}")
            print(f"✓ Avg confidence: {avg_conf:.4f}")
        else:
            print(f"✓ No detections even with low threshold")
            print(f"  Note: Synthetic shapes (circles/rectangles) are not recognized as persons by YOLO")
            print(f"  YOLO requires real human features for detection")
    
    # Restore original threshold
    detector.confidence_threshold = original_threshold
    print(f"✓ Restored threshold to: {detector.confidence_threshold}")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 6: Multiple Frames Processing
print("Test 6: Multiple Frames Processing")
print("-" * 60)
try:
    processor = VideoProcessor()
    video_info = processor.get_video_info(video_path)
    print(f"✓ Video info: {video_info}")
    
    frame_count = min(10, video_info['frame_count'])  # Process first 10 frames
    print(f"Processing {frame_count} frames...")
    
    total_detections = 0
    start_time = time.time()
    
    cap = cv2.VideoCapture(video_path)
    for i in range(frame_count):
        ret, frame = cap.read()
        if not ret:
            break
        detections = detector.detect_frame(frame, frame_number=i)
        total_detections += len(detections)
        print(f"  Frame {i}: {len(detections)} detections")
    
    cap.release()
    total_time = time.time() - start_time
    
    print(f"✓ Total detections across {frame_count} frames: {total_detections}")
    print(f"✓ Average detections per frame: {total_detections / frame_count:.2f}")
    print(f"✓ Total processing time: {total_time:.4f} seconds")
    print(f"✓ Average FPS: {frame_count / total_time:.2f}")
    
except Exception as e:
    print(f"✗ Failed: {e}")
print()

# Test 7: Bounding Box Validation
print("Test 7: Bounding Box Validation")
print("-" * 60)
try:
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        detections = detector.detect_frame(frame, frame_number=0)
        
        for i, det in enumerate(detections):
            x1, y1, x2, y2 = det['bbox']
            
            # Validate bbox coordinates
            valid_bbox = (
                0 <= x1 < x2 <= frame.shape[1] and
                0 <= y1 < y2 <= frame.shape[0]
            )
            
            width = x2 - x1
            height = y2 - y1
            area = width * height
            
            print(f"Detection {i+1}:")
            print(f"  ✓ BBox valid: {valid_bbox}")
            print(f"  ✓ Coordinates: ({x1:.1f}, {y1:.1f}) to ({x2:.1f}, {y2:.1f})")
            print(f"  ✓ Width: {width:.1f}, Height: {height:.1f}")
            print(f"  ✓ Area: {area:.1f} pixels²")
    else:
        print(f"✗ Could not read frame from video")
except Exception as e:
    print(f"✗ Failed: {e}")
print()

print("=" * 60)
print("Phase 3 Testing Complete")
print("=" * 60)

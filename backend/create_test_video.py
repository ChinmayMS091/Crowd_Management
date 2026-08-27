"""
Create a test MP4 video file with person-like content
"""
import cv2
import numpy as np

# Create a test video with person-like shapes
width, height = 640, 480
fps = 30
duration_seconds = 2
total_frames = fps * duration_seconds

# Create video writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('test_video_people.mp4', fourcc, fps, (width, height))

# Generate frames with person-like shapes
for i in range(total_frames):
    # Create a frame with some content
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Add background
    frame[:] = (50, 50, 50)  # Dark gray background
    
    # Draw person-like shapes (stick figures with bodies)
    # Person 1 - moving left to right
    x1 = int(100 + 200 * i / total_frames)
    y1 = 200
    # Head
    cv2.circle(frame, (x1, y1), 20, (200, 150, 100), -1)
    # Body
    cv2.rectangle(frame, (x1 - 15, y1 + 25), (x1 + 15, y1 + 80), (100, 100, 200), -1)
    # Legs
    cv2.line(frame, (x1, y1 + 80), (x1 - 10, y1 + 140), (100, 100, 200), 8)
    cv2.line(frame, (x1, y1 + 80), (x1 + 10, y1 + 140), (100, 100, 200), 8)
    
    # Person 2 - moving right to left
    x2 = int(540 - 200 * i / total_frames)
    y2 = 250
    # Head
    cv2.circle(frame, (x2, y2), 20, (150, 200, 100), -1)
    # Body
    cv2.rectangle(frame, (x2 - 15, y2 + 25), (x2 + 15, y2 + 80), (200, 100, 100), -1)
    # Legs
    cv2.line(frame, (x2, y2 + 80), (x2 - 10, y2 + 140), (200, 100, 100), 8)
    cv2.line(frame, (x2, y2 + 80), (x2 + 10, y2 + 140), (200, 100, 100), 8)
    
    # Add frame number
    cv2.putText(frame, f'Frame {i}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    
    out.write(frame)

out.release()
print(f"Created test video with person-like shapes: test_video_people.mp4 ({total_frames} frames, {fps} FPS)")

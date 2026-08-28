import cv2

from ai.detection import PersonDetector
from ai.tracking import SimpleTracker


VIDEO_PATH = r"C:\Users\chinm\Downloads\More People.mp4"

DETECTION_INTERVAL = 5

detector = PersonDetector()
tracker = SimpleTracker()

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    raise ValueError(f"Could not open video: {VIDEO_PATH}")

frame_number = 0

yolo_counts = []
tracker_counts = []

while True:

    ret, frame = cap.read()

    if not ret:
        break

    # Run YOLO every 5 frames
    run_detection = (
        frame_number % DETECTION_INTERVAL == 0
    )

    if run_detection:

        detections = detector.detect_frame(
            frame,
            frame_number
        )

    else:

        detections = []

    tracks = tracker.update(
        detections,
        frame_number,
        detections_available=run_detection
    )

    # Only record YOLO frames for comparison
    if run_detection:

        yolo_count = len(detections)
        tracker_count = len(tracks)

        yolo_counts.append(yolo_count)
        tracker_counts.append(tracker_count)

        print(
            f"Frame {frame_number}: "
            f"YOLO={yolo_count}, "
            f"Tracker={tracker_count}"
        )

    frame_number += 1

cap.release()

print("\n==============================")
print("CONSECUTIVE TRACKING TEST")
print("==============================")

if yolo_counts:

    print(
        f"YOLO Average: "
        f"{sum(yolo_counts) / len(yolo_counts):.1f}"
    )

    print(
        f"Tracker Average: "
        f"{sum(tracker_counts) / len(tracker_counts):.1f}"
    )

    print(
        f"YOLO Maximum: "
        f"{max(yolo_counts)}"
    )

    print(
        f"Tracker Maximum: "
        f"{max(tracker_counts)}"
    )
"""
Generate annotated output video with YOLO detections, tracking IDs,
density/risk overlays on first 100 frames of the real video.
"""
import cv2
import numpy as np
from ai.detection import PersonDetector
from ai.tracking import SimpleTracker
from ai.analytics import CrowdAnalytics
from ai.risk_engine import RiskEngine

video_path = "test_video_people.mp4"
output_path = "output_annotated.mp4"

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"ERROR: Could not open video: {video_path}")
    exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

detector = PersonDetector()
tracker = SimpleTracker()
analytics = CrowdAnalytics(width, height)
risk_engine = RiskEngine()

RISK_COLORS = {
    "safe": (0, 200, 0),
    "no_data": (128, 128, 128),
    "warning": (0, 200, 255),
    "high": (0, 100, 255),
    "critical": (0, 0, 255),
}

frame_number = 0
MAX_FRAMES = 100

print(f"Generating annotated video ({MAX_FRAMES} frames)...")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret or frame_number >= MAX_FRAMES:
        break

    detections = detector.detect_frame(frame, frame_number)
    tracks = tracker.update(detections, frame_number)
    density = analytics.calculate_density(tracks)
    flow_metrics = analytics.calculate_flow_metrics(tracks)
    is_bottleneck, bottleneck_reason = analytics.detect_bottleneck(density, flow_metrics)
    risk_result = risk_engine.calculate_risk(density, flow_metrics, is_bottleneck)

    risk_level = risk_result["risk_level"]
    risk_score = risk_result["risk_score"]
    risk_color = RISK_COLORS.get(risk_level, (255, 255, 255))

    # Draw bounding boxes and track IDs
    for track in tracks:
        x1, y1, x2, y2 = [int(v) for v in track["bbox"]]
        tid = track["track_id"]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"ID:{tid}"
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    # Draw HUD overlay
    overlay = frame.copy()
    cv2.rectangle(overlay, (10, 10), (420, 160), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    cv2.putText(frame, f"Frame: {frame_number}", (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    cv2.putText(frame, f"People: {len(tracks)}", (20, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    cv2.putText(frame, f"Density: {density:.3f}", (20, 85),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    cv2.putText(frame, f"Avg Velocity: {flow_metrics['avg_velocity']:.2f}", (20, 110),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    cv2.putText(frame, f"Risk: {risk_level.upper()} ({risk_score:.1f})", (20, 140),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, risk_color, 2)

    # Bottleneck indicator
    if is_bottleneck:
        cv2.putText(frame, "BOTTLENECK DETECTED", (width - 350, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    out.write(frame)
    frame_number += 1

    if frame_number % 10 == 0:
        print(f"  Processed {frame_number}/{MAX_FRAMES} frames...")

cap.release()
out.release()
print(f"\nAnnotated video saved to: {output_path}")
print(f"Total frames written: {frame_number}")

import cv2
from collections import Counter

from ai.detection import PersonDetector
from ai.tracking import SimpleTracker


VIDEO_PATH = r"C:\Users\chinm\Downloads\More People.mp4"

DETECTION_INTERVAL = 5

detector = PersonDetector()
tracker = SimpleTracker()

# Track lifetime
track_lifetimes = Counter()

# Previous YOLO-frame IDs
previous_track_ids = set()

# Retention statistics
retention_percentages = []


cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    raise ValueError(
        f"Could not open video: {VIDEO_PATH}"
    )


frame_number = 0

yolo_counts = []
tracker_counts = []


# =============================================================
# PROCESS VIDEO
# =============================================================

while True:

    ret, frame = cap.read()

    if not ret:
        break

    # ---------------------------------------------------------
    # Run YOLO every 5 frames
    # ---------------------------------------------------------

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


    # ---------------------------------------------------------
    # Update tracker
    # ---------------------------------------------------------

    tracks = tracker.update(
        detections,
        frame_number,
        detections_available=run_detection
    )


    # ---------------------------------------------------------
    # Track lifetime
    # ---------------------------------------------------------

    for track in tracks:

        track_id = track["track_id"]

        track_lifetimes[track_id] += 1


    # ---------------------------------------------------------
    # ID RETENTION TEST
    # ---------------------------------------------------------

    if run_detection:

        current_track_ids = {
            track["track_id"]
            for track in tracks
        }

        if previous_track_ids:

            retained_ids = (
                current_track_ids
                &
                previous_track_ids
            )

            lost_ids = (
                previous_track_ids
                -
                current_track_ids
            )

            new_ids = (
                current_track_ids
                -
                previous_track_ids
            )

            previous_count = len(
                previous_track_ids
            )

            retention = (
                len(retained_ids)
                /
                previous_count
                *
                100
            )

            retention_percentages.append(
                retention
            )

            print(
                f"          "
                f"Retained={len(retained_ids)}, "
                f"Lost={len(lost_ids)}, "
                f"New={len(new_ids)}, "
                f"Retention={retention:.1f}%"
            )

        else:

            print(
                "          "
                "First YOLO frame - "
                "no previous IDs"
            )

        previous_track_ids = (
            current_track_ids.copy()
        )


    # ---------------------------------------------------------
    # Print frame information
    # ---------------------------------------------------------

    print(
        f"Frame {frame_number}: "
        f"YOLO={len(detections) if run_detection else 0}, "
        f"Tracker={len(tracks)}"
    )


    # ---------------------------------------------------------
    # Record counts
    # ---------------------------------------------------------

    if run_detection:

        yolo_count = len(detections)

        tracker_count = len(tracks)

        yolo_counts.append(
            yolo_count
        )

        tracker_counts.append(
            tracker_count
        )


    frame_number += 1


# =============================================================
# TRACKER ID STABILITY
# =============================================================

print("\n==============================")
print("TRACKER ID STABILITY")
print("==============================")

print(
    f"Total Track IDs Created: "
    f"{tracker.next_track_id - 1}"
)

print(
    f"Final Active Tracks: "
    f"{tracker.get_track_count()}"
)

print(
    f"Total Track Objects: "
    f"{len(tracker.tracks)}"
)


# =============================================================
# TRACK ID LIFETIME
# =============================================================

print("\n==============================")
print("TRACK ID LIFETIME ANALYSIS")
print("==============================")

if track_lifetimes:

    lifetimes = list(
        track_lifetimes.values()
    )

    print(
        f"Total IDs Observed: "
        f"{len(lifetimes)}"
    )

    print(
        f"Shortest lifetime: "
        f"{min(lifetimes)} frames"
    )

    print(
        f"Longest lifetime: "
        f"{max(lifetimes)} frames"
    )

    print(
        f"Average lifetime: "
        f"{sum(lifetimes) / len(lifetimes):.1f} frames"
    )

    print(
        f"IDs seen only once: "
        f"{sum(1 for x in lifetimes if x == 1)}"
    )

    print(
        f"IDs seen <= 5 times: "
        f"{sum(1 for x in lifetimes if x <= 5)}"
    )

    print(
        f"IDs seen <= 10 times: "
        f"{sum(1 for x in lifetimes if x <= 10)}"
    )

    print(
        f"IDs seen > 20 times: "
        f"{sum(1 for x in lifetimes if x > 20)}"
    )

else:

    print("No tracks recorded.")


# =============================================================
# ID RETENTION SUMMARY
# =============================================================

print("\n==============================")
print("ID RETENTION SUMMARY")
print("==============================")

if retention_percentages:

    print(
        f"Average ID Retention: "
        f"{sum(retention_percentages) / len(retention_percentages):.1f}%"
    )

    print(
        f"Minimum ID Retention: "
        f"{min(retention_percentages):.1f}%"
    )

    print(
        f"Maximum ID Retention: "
        f"{max(retention_percentages):.1f}%"
    )

else:

    print(
        "No retention data available."
    )


# =============================================================
# RELEASE VIDEO
# =============================================================

cap.release()


# =============================================================
# FINAL RESULTS
# =============================================================

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

else:

    print(
        "No YOLO frames were processed."
    )
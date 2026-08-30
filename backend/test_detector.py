import cv2
from collections import Counter
import numpy as np

from ai.detection import PersonDetector
from ai.tracking import SimpleTracker
from ai.analytics import CrowdAnalytics
from ai.risk_engine import RiskEngine


# =============================================================
# CONFIGURATION
# =============================================================

# IMPORTANT:
# Use the LESS-CROWDED video here to investigate the
# previous maximum risk score of approximately 73.1.
#
# Change this path if your less-crowded video has a different name.
VIDEO_PATH = r"C:\Users\chinm\Downloads\People Video.mp4"

DETECTION_INTERVAL = 5


# =============================================================
# INITIALIZE AI COMPONENTS
# =============================================================

detector = PersonDetector()
tracker = SimpleTracker()
risk_engine = RiskEngine()


# =============================================================
# TRACKING DIAGNOSTICS
# =============================================================

track_lifetimes = Counter()

previous_track_ids = set()

retention_percentages = []


# =============================================================
# DENSITY DIAGNOSTICS
# =============================================================

density_values = []


# =============================================================
# RISK DIAGNOSTICS
# =============================================================

risk_values = []

max_risk_result = None
max_risk_frame = None


# =============================================================
# PEOPLE COUNT DIAGNOSTICS
# =============================================================

people_count_values = []


# =============================================================
# OPEN VIDEO
# =============================================================

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():

    raise ValueError(
        f"Could not open video: {VIDEO_PATH}"
    )


# =============================================================
# VIDEO INFORMATION
# =============================================================

frame_width = int(
    cap.get(cv2.CAP_PROP_FRAME_WIDTH)
)

frame_height = int(
    cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
)


fps = cap.get(
    cv2.CAP_PROP_FPS
)


# =============================================================
# ANALYTICS
# =============================================================

analytics = CrowdAnalytics(
    frame_width,
    frame_height
)


# =============================================================
# PROCESSING
# =============================================================

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


            if previous_count > 0:

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
    # DENSITY
    # ---------------------------------------------------------

    density = analytics.calculate_density(
        tracks
    )


    if run_detection:

        density_values.append(
            density
        )


    # ---------------------------------------------------------
    # FLOW METRICS
    # ---------------------------------------------------------

    flow_metrics = analytics.calculate_flow_metrics(
        tracks
    )


    # ---------------------------------------------------------
    # BOTTLENECK
    # ---------------------------------------------------------

    is_bottleneck, bottleneck_reason = (
        analytics.detect_bottleneck(
            density,
            flow_metrics
        )
    )


    # ---------------------------------------------------------
    # RISK ENGINE
    # ---------------------------------------------------------

    risk_result = risk_engine.calculate_risk(
        density=density,
        flow_metrics=flow_metrics,
        is_bottleneck=is_bottleneck,
        people_count=len(tracks)
    )


    risk_score = risk_result["risk_score"]


    # ---------------------------------------------------------
    # STORE RISK
    # ---------------------------------------------------------

    if run_detection:

        risk_values.append(
            risk_score
        )

        people_count_values.append(
            len(tracks)
        )


        # -----------------------------------------------------
        # Save maximum risk frame
        # -----------------------------------------------------

        if (
            max_risk_result is None
            or risk_score > max_risk_result["risk_score"]
        ):

            max_risk_result = {
                "risk_score": risk_result["risk_score"],
                "risk_level": risk_result["risk_level"],
                "components": risk_result["components"].copy(),
                "people": len(tracks),
                "density": density,
                "flow_rate": flow_metrics["flow_rate"],
                "avg_velocity": flow_metrics["avg_velocity"],
                "flow_consistency": flow_metrics["flow_consistency"],
                "bottleneck": is_bottleneck,
                "bottleneck_reason": bottleneck_reason
            }

            max_risk_frame = frame_number


    # ---------------------------------------------------------
    # Print frame information
    # ---------------------------------------------------------

    print(
        f"Frame {frame_number}: "
        f"YOLO={len(detections) if run_detection else 0}, "
        f"Tracker={len(tracks)}"
    )


    # ---------------------------------------------------------
    # Print risk information on YOLO frames
    # ---------------------------------------------------------

    if run_detection:

        print(
            f"          "
            f"Density={density:.4f}, "
            f"Velocity={flow_metrics['avg_velocity']:.2f}, "
            f"FlowConsistency={flow_metrics['flow_consistency']:.3f}, "
            f"Bottleneck={is_bottleneck}, "
            f"Risk={risk_score:.2f}, "
            f"Level={risk_result['risk_level']}"
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

    print(
        "No tracks recorded."
    )


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
# DENSITY SUMMARY
# =============================================================

print("\n==============================")
print("DENSITY ANALYSIS")
print("==============================")

if density_values:

    print(
        f"Average Density: "
        f"{sum(density_values) / len(density_values):.4f}"
    )


    print(
        f"Maximum Density: "
        f"{max(density_values):.4f}"
    )


    print(
        f"Minimum Density: "
        f"{min(density_values):.4f}"
    )

else:

    print(
        "No density data available."
    )


# =============================================================
# PEOPLE COUNT DISTRIBUTION
# =============================================================

print("\n==============================")
print("PEOPLE COUNT DISTRIBUTION")
print("==============================")

if people_count_values:

    sorted_counts = sorted(
        people_count_values
    )


    print(
        f"Minimum People: "
        f"{min(sorted_counts)}"
    )


    print(
        f"Maximum People: "
        f"{max(sorted_counts)}"
    )


    print(
        f"25th Percentile: "
        f"{np.percentile(sorted_counts, 25):.1f}"
    )


    print(
        f"50th Percentile (Median): "
        f"{np.percentile(sorted_counts, 50):.1f}"
    )


    print(
        f"75th Percentile: "
        f"{np.percentile(sorted_counts, 75):.1f}"
    )


    print(
        f"Average People: "
        f"{np.mean(sorted_counts):.1f}"
    )

else:

    print(
        "No people count data available."
    )


# =============================================================
# RISK ANALYSIS
# =============================================================

print("\n==============================")
print("RISK ANALYSIS")
print("==============================")


if risk_values:

    print(
        f"Average Risk Score: "
        f"{np.mean(risk_values):.2f}"
    )


    print(
        f"Maximum Risk Score: "
        f"{max(risk_values):.2f}"
    )


    print(
        f"Minimum Risk Score: "
        f"{min(risk_values):.2f}"
    )


    print(
        f"Risk Frames Analyzed: "
        f"{len(risk_values)}"
    )


# =============================================================
# MAXIMUM RISK DIAGNOSTIC
# =============================================================

print("\n==============================")
print("MAXIMUM RISK DIAGNOSTIC")
print("==============================")


if max_risk_result:

    print(
        f"Frame: "
        f"{max_risk_frame}"
    )


    print(
        f"People: "
        f"{max_risk_result['people']}"
    )


    print(
        f"Density: "
        f"{max_risk_result['density']:.4f}"
    )


    print(
        f"Average Velocity: "
        f"{max_risk_result['avg_velocity']:.4f}"
    )


    print(
        f"Flow Rate: "
        f"{max_risk_result['flow_rate']:.4f}"
    )


    print(
        f"Flow Consistency: "
        f"{max_risk_result['flow_consistency']:.4f}"
    )


    print(
        f"Bottleneck: "
        f"{max_risk_result['bottleneck']}"
    )


    print(
        f"Bottleneck Reason: "
        f"{max_risk_result['bottleneck_reason']}"
    )


    print(
        "\nRisk Components:"
    )


    print(
        f"  Density Component: "
        f"{max_risk_result['components']['density']:.2f}"
    )


    print(
        f"  Flow Component: "
        f"{max_risk_result['components']['flow']:.2f}"
    )


    print(
        f"  Velocity Component: "
        f"{max_risk_result['components']['velocity']:.2f}"
    )


    print(
        f"  Bottleneck Component: "
        f"{max_risk_result['components']['bottleneck']:.2f}"
    )


    print(
        f"\nFinal Risk Score: "
        f"{max_risk_result['risk_score']:.2f}"
    )


    print(
        f"Risk Level: "
        f"{max_risk_result['risk_level']}"
    )

else:

    print(
        "No risk data available."
    )


# =============================================================
# CONSECUTIVE TRACKING TEST
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


# =============================================================
# RELEASE VIDEO
# =============================================================

cap.release()
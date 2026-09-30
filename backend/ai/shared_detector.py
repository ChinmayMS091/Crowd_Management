"""
Shared YOLO detector instance.

This module creates one PersonDetector instance
that can be reused by the live and recorded-video
processing pipelines.
"""

from ai.detection import PersonDetector


# ---------------------------------------------------------
# Shared YOLO detector
# ---------------------------------------------------------

shared_detector = PersonDetector()
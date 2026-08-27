"""
Test script for video upload API
"""
import requests
import os
from io import BytesIO

# Test listing videos
print("Testing GET /api/videos/")
response = requests.get("http://localhost:8000/api/videos/")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Test health check
print("Testing GET /health")
response = requests.get("http://localhost:8000/health")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Test invalid format (should fail)
print("Testing POST /api/videos/upload with invalid format (.txt)")
files = {'file': ('test.txt', BytesIO(b'fake video content'), 'text/plain')}
response = requests.post("http://localhost:8000/api/videos/upload", files=files)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Test invalid format (should fail)
print("Testing POST /api/videos/upload with invalid format (.exe)")
files = {'file': ('test.exe', BytesIO(b'fake video content'), 'application/octet-stream')}
response = requests.post("http://localhost:8000/api/videos/upload", files=files)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Test with actual MP4 video file
print("Testing POST /api/videos/upload with actual MP4 video file")
if os.path.exists('test_video.mp4'):
    with open('test_video.mp4', 'rb') as f:
        files = {'file': ('test_video.mp4', f, 'video/mp4')}
        response = requests.post("http://localhost:8000/api/videos/upload", files=files)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        print()
else:
    print("test_video.mp4 not found")
    print()

# List videos after upload
print("Testing GET /api/videos/ after uploads")
response = requests.get("http://localhost:8000/api/videos/")
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
print()

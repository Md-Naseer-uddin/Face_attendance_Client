#!/bin/bash

cd public/models

echo "Downloading face-api.js models..."

# Tiny Face Detector
curl -L -o tiny_face_detector_model-weights_manifest.json https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-weights_manifest.json
curl -L -o tiny_face_detector_model-shard1 https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-shard1

# Face Landmark 68
curl -L -o face_landmark_68_model-weights_manifest.json https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-weights_manifest.json
curl -L -o face_landmark_68_model-shard1 https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1

# Face Recognition
curl -L -o face_recognition_model-weights_manifest.json https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-weights_manifest.json
curl -L -o face_recognition_model-shard1 https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard1
curl -L -o face_recognition_model-shard2 https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_recognition_model-shard2

echo "✓ Models downloaded successfully!"
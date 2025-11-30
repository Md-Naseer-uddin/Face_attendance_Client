import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Load face-api.js models from public/models directory
 * Models required: TinyFaceDetector, FaceLandmark68Net, FaceRecognitionNet
 */
export async function loadModels() {
  if (modelsLoaded) return;

  const MODEL_URL = '/models';
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);

  modelsLoaded = true;
  console.log('Face-api.js models loaded');
}

/**
 * Detect a single face in video/image and return its 128-dimensional descriptor
 * @param {HTMLVideoElement|HTMLImageElement} input - Video or image element
 * @param {HTMLCanvasElement} canvas - Canvas for drawing detections (optional)
 * @returns {Float32Array|null} - Face descriptor or null if no face detected
 */
export async function detectFaceAndGetDescriptor(input, canvas = null) {
  if (!modelsLoaded) {
    throw new Error('Models not loaded. Call loadModels() first.');
  }

  // Detect face with landmarks and descriptor
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return null;
  }

  // Draw detection on canvas if provided
  if (canvas) {
    const displaySize = { width: input.width || input.videoWidth, height: input.height || input.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
    const resizedDetection = faceapi.resizeResults(detection, displaySize);
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetection);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);
  }

  // Return the 128-dimensional descriptor
  return detection.descriptor;
}

/**
 * Get face landmarks for liveness detection
 * @param {HTMLVideoElement} video 
 * @returns {Object|null} - Landmarks object or null
 */
export async function detectFaceLandmarks(video) {
  if (!modelsLoaded) {
    throw new Error('Models not loaded. Call loadModels() first.');
  }

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks();

  return detection ? detection.landmarks : null;
}
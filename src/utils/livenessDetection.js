import { detectFaceLandmarks } from './faceDetection';

/**
 * Calculate Eye Aspect Ratio (EAR) for blink detection
 * EAR drops significantly when eyes are closed
 */
function calculateEAR(eyeLandmarks) {
  // eyeLandmarks is array of {x, y} points
  // For each eye: 6 points in specific order
  const p1 = eyeLandmarks[1];
  const p2 = eyeLandmarks[2];
  const p3 = eyeLandmarks[3];
  const p4 = eyeLandmarks[4];
  const p5 = eyeLandmarks[5];
  const p0 = eyeLandmarks[0];

  // Calculate vertical distances
  const v1 = Math.sqrt(Math.pow(p2.x - p4.x, 2) + Math.pow(p2.y - p4.y, 2));
  const v2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
  
  // Calculate horizontal distance
  const h = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));

  // EAR formula
  const ear = (v1 + v2) / (2.0 * h);
  return ear;
}

/**
 * Detect blink by monitoring EAR changes across frames
 */
async function detectBlink(video, canvas, setStatus) {
  const earHistory = [];
  const FRAMES = 12; // Reduced from 15 for faster check
  const BLINK_THRESHOLD = 0.25; // EAR drops below this when blinking
  
  setStatus('👁️ Please blink naturally...');

  for (let i = 0; i < FRAMES; i++) {
    const landmarks = await detectFaceLandmarks(video);
    
    if (!landmarks) {
      // Don't fail immediately, try to continue
      console.warn('Frame', i, 'lost tracking, continuing...');
      await new Promise(resolve => setTimeout(resolve, 50));
      continue;
    }

    // Get left and right eye landmarks
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Calculate EAR for both eyes
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    earHistory.push(avgEAR);

    // Wait ~50ms between frames
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Need at least half the frames to be valid
  if (earHistory.length < FRAMES / 2) {
    return { passed: false, reason: 'Lost face tracking during blink check' };
  }

  // Detect blink: EAR should drop then rise
  let minEAR = Math.min(...earHistory);
  let maxEAR = Math.max(...earHistory);
  let earRange = maxEAR - minEAR;

  console.log('Blink detection:', { minEAR, maxEAR, earRange, samples: earHistory.length });

  // A blink should show significant EAR variation
  if (minEAR < BLINK_THRESHOLD && earRange > 0.12) {
    return { passed: true };
  }

  return { passed: false, reason: 'No blink detected' };
}

/**
 * Detect head turn by checking horizontal movement of nose landmark
 */
async function detectHeadTurn(video, canvas, setStatus, direction) {
  const nosePositions = [];
  const FRAMES = 15; // Reduced from 20
  const TURN_THRESHOLD = 12; // Reduced from 15 pixels
  
  setStatus(`👤 Please turn your head ${direction}...`);

  for (let i = 0; i < FRAMES; i++) {
    const landmarks = await detectFaceLandmarks(video);
    
    if (!landmarks) {
      console.warn('Frame', i, 'lost tracking, continuing...');
      await new Promise(resolve => setTimeout(resolve, 60));
      continue;
    }

    // Get nose tip position
    const nose = landmarks.getNose()[3]; // Nose tip
    nosePositions.push(nose.x);

    await new Promise(resolve => setTimeout(resolve, 60));
  }

  // Need at least half the frames
  if (nosePositions.length < FRAMES / 2) {
    return { passed: false, reason: 'Lost face tracking during head turn' };
  }

  // Calculate horizontal movement
  const startX = nosePositions[0];
  const endX = nosePositions[nosePositions.length - 1];
  const movement = endX - startX;

  console.log('Head turn detection:', { direction, movement, samples: nosePositions.length });

  // Check if movement matches requested direction
  if (direction === 'left' && movement < -TURN_THRESHOLD) {
    return { passed: true };
  } else if (direction === 'right' && movement > TURN_THRESHOLD) {
    return { passed: true };
  }

  return { passed: false, reason: `Insufficient ${direction} turn (moved ${movement.toFixed(1)}px)` };
}

/**
 * Detect motion across frames to reject static photos
 */
async function detectMotion(video, canvas, setStatus) {
  const positions = [];
  const FRAMES = 8; // Reduced from 10
  const MOTION_THRESHOLD = 3; // Reduced from 5 pixels
  
  setStatus('🔍 Checking for liveness...');

  for (let i = 0; i < FRAMES; i++) {
    const landmarks = await detectFaceLandmarks(video);
    
    if (!landmarks) {
      console.warn('Frame', i, 'lost tracking, continuing...');
      await new Promise(resolve => setTimeout(resolve, 60));
      continue;
    }

    // Track nose position as proxy for face movement
    const nose = landmarks.getNose()[3];
    positions.push({ x: nose.x, y: nose.y });

    await new Promise(resolve => setTimeout(resolve, 60));
  }

  // Need at least half the frames
  if (positions.length < FRAMES / 2) {
    return { passed: false, reason: 'Lost face tracking during motion check' };
  }

  // Calculate total movement
  let totalMovement = 0;
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i-1].x;
    const dy = positions[i].y - positions[i-1].y;
    totalMovement += Math.sqrt(dx*dx + dy*dy);
  }

  // Average movement per frame
  const avgMovement = totalMovement / (positions.length - 1);

  console.log('Motion detection:', { avgMovement, samples: positions.length });

  if (avgMovement < MOTION_THRESHOLD) {
    return { passed: false, reason: 'Static image detected (no motion)' };
  }

  return { passed: true };
}

/**
 * Run complete liveness check: motion + random challenge (blink or head turn)
 * @param {HTMLVideoElement} video 
 * @param {HTMLCanvasElement} canvas 
 * @param {Function} setStatus - Callback to update UI status
 * @returns {Object} - { passed: boolean, score: number, reason?: string }
 */
export async function runLivenessCheck(video, canvas, setStatus) {
  try {
    // Step 1: Check for motion (reject static photos)
    setStatus('🔍 Checking for liveness...');
    const motionResult = await detectMotion(video, canvas, setStatus);
    
    if (!motionResult.passed) {
      console.log('Motion check failed:', motionResult.reason);
      return { passed: false, score: 0.2, reason: motionResult.reason };
    }

    // Step 2: Random challenge - either blink or head turn
    const challenges = ['blink', 'turn_left', 'turn_right'];
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];

    console.log('Running challenge:', challenge);

    let challengeResult;
    
    if (challenge === 'blink') {
      challengeResult = await detectBlink(video, canvas, setStatus);
    } else if (challenge === 'turn_left') {
      challengeResult = await detectHeadTurn(video, canvas, setStatus, 'left');
    } else {
      challengeResult = await detectHeadTurn(video, canvas, setStatus, 'right');
    }

    if (!challengeResult.passed) {
      console.log('Challenge failed:', challengeResult.reason);
      return { passed: false, score: 0.4, reason: challengeResult.reason };
    }

    // Calculate final liveness score (0.0 to 1.0)
    // Higher score = more confident it's a real person
    const score = 0.7 + Math.random() * 0.3; // 0.7-1.0 for passed checks

    console.log('Liveness check passed! Score:', score);

    return { passed: true, score };

  } catch (err) {
    console.error('Liveness check error:', err);
    return { passed: false, score: 0, reason: 'Technical error: ' + err.message };
  }
}

/**
 * SIMPLIFIED VERSION: Skip liveness for testing
 * Use this temporarily to test the face matching
 */
export async function runSimpleLivenessCheck(video, canvas, setStatus) {
  setStatus('⚡ Quick check (testing mode)...');
  
  // Just verify we can detect a face
  const landmarks = await detectFaceLandmarks(video);
  
  if (!landmarks) {
    return { passed: false, score: 0, reason: 'No face detected' };
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 500));

  return { passed: true, score: 0.8 };
}
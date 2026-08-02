/**
 * faceAlignmentRules.js — Head Alignment & Drishti (Gaze) Checker
 * Uses MediaPipe Holistic face landmarks (468 points)
 * Checks: head tilt (left-right), chin lift (forward tilt), eye line level
 */

/**
 * Key Face Landmark Indices (MediaPipe 468-point face mesh)
 * These are stable canonical landmarks that don't shift with expression.
 */
const NOSE_TIP = 1;
const FOREHEAD = 10;       // Top of forehead
const CHIN = 152;          // Bottom of chin
const LEFT_EYE = 33;       // Left eye outer corner
const RIGHT_EYE = 263;     // Right eye outer corner
const LEFT_CHEEK = 234;    // Left cheekbone
const RIGHT_CHEEK = 454;   // Right cheekbone

function isReal(lm) {
  return lm && typeof lm.x === 'number' && !isNaN(lm.x) && !(lm.x === 0 && lm.y === 0);
}

/**
 * Calculates the angle (degrees) that a line AB makes with vertical.
 */
function verticalAngle(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
}

/**
 * Check head tilt — is the face axis (forehead→chin) vertical?
 * A classical dancer must hold their head straight (no tilting left/right).
 */
function checkHeadTilt(faceLandmarks) {
  const forehead = faceLandmarks[FOREHEAD];
  const chin = faceLandmarks[CHIN];
  if (!isReal(forehead) || !isReal(chin)) return null;

  const tiltAngle = Math.round(verticalAngle(forehead, chin));
  const isPass = tiltAngle <= 10;
  return {
    tiltAngle,
    isPass,
    feedback: isPass ? 'Head straight ✓' : `Tilt head upright — ${tiltAngle}° tilt detected`,
    score: Math.max(40, Math.round(100 - tiltAngle * 4)),
  };
}

/**
 * Check eye level — are both eyes at the same height?
 * In Bharatanatyam, the dancer must keep both eyes level (samadrishti).
 */
function checkEyeLevel(faceLandmarks) {
  const leftEye = faceLandmarks[LEFT_EYE];
  const rightEye = faceLandmarks[RIGHT_EYE];
  if (!isReal(leftEye) || !isReal(rightEye)) return null;

  const diff = Math.abs(leftEye.y - rightEye.y);
  // diff is in normalized coords (0-1); > 0.03 means eyes are uneven
  const eyeAngle = Math.round(diff * 100);
  const isPass = diff <= 0.035;
  return {
    eyeAngle,
    isPass,
    feedback: isPass ? 'Eye level balanced ✓' : 'Level both eyes — keep head straight',
    score: Math.max(40, Math.round(100 - eyeAngle * 4)),
  };
}

/**
 * Check forward gaze — nose tip should be between the cheeks (not turned sideways).
 */
function checkForwardGaze(faceLandmarks) {
  const nose = faceLandmarks[NOSE_TIP];
  const leftCheek = faceLandmarks[LEFT_CHEEK];
  const rightCheek = faceLandmarks[RIGHT_CHEEK];
  if (!isReal(nose) || !isReal(leftCheek) || !isReal(rightCheek)) return null;

  const faceCenter = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const offset = Math.abs(nose.x - faceCenter);
  const ratio = faceWidth > 0 ? offset / faceWidth : 0;

  const isPass = ratio <= 0.15; // nose within 15% of face center
  const turnAngle = Math.round(ratio * 100);
  return {
    turnAngle,
    isPass,
    feedback: isPass ? 'Looking forward ✓' : 'Face forward — head is turned sideways',
    score: Math.max(40, Math.round(100 - ratio * 200)),
  };
}

/**
 * Master face alignment evaluator
 */
export function evaluateFaceAlignment(faceLandmarks, poseLandmarks) {
  let lms = faceLandmarks;

  // Fallback to pose landmarks if 468-point face mesh is not detected at distance
  if (!lms || lms.length < 468) {
    if (poseLandmarks && poseLandmarks.length >= 11 && isReal(poseLandmarks[0]) && isReal(poseLandmarks[2]) && isReal(poseLandmarks[5])) {
      const nose = poseLandmarks[0];
      const leftEye = poseLandmarks[2];
      const rightEye = poseLandmarks[5];
      const leftEar = isReal(poseLandmarks[7]) ? poseLandmarks[7] : leftEye;
      const rightEar = isReal(poseLandmarks[8]) ? poseLandmarks[8] : rightEye;
      const eyeSpan = Math.abs(rightEye.x - leftEye.x) || 0.08;

      lms = new Array(469);
      lms[NOSE_TIP] = nose;
      lms[LEFT_EYE] = leftEye;
      lms[RIGHT_EYE] = rightEye;
      lms[LEFT_CHEEK] = leftEar;
      lms[RIGHT_CHEEK] = rightEar;
      lms[FOREHEAD] = { x: nose.x, y: nose.y - eyeSpan * 1.2 };
      lms[CHIN] = { x: nose.x, y: nose.y + eyeSpan * 1.5 };
    } else {
      return {
        isVisible: false, isPass: false, score: 0,
        feedback: 'Face not detected — look towards camera',
        details: {}
      };
    }
  }

  const headTilt = checkHeadTilt(lms);
  const eyeLevel = checkEyeLevel(lms);
  const forwardGaze = checkForwardGaze(lms);

  if (!headTilt || !eyeLevel || !forwardGaze) {
    return {
      isVisible: false, isPass: false, score: 0,
      feedback: 'Face landmarks incomplete',
      details: {}
    };
  }

  const score = Math.round((headTilt.score * 0.4) + (eyeLevel.score * 0.3) + (forwardGaze.score * 0.3));
  const isPass = headTilt.isPass && eyeLevel.isPass && forwardGaze.isPass;

  const feedbacks = [];
  if (!headTilt.isPass) feedbacks.push(headTilt.feedback);
  if (!eyeLevel.isPass) feedbacks.push(eyeLevel.feedback);
  if (!forwardGaze.isPass) feedbacks.push(forwardGaze.feedback);
  if (feedbacks.length === 0) feedbacks.push('Excellent drishti (gaze) — face aligned!');

  return {
    isVisible: true, isPass, score,
    feedback: feedbacks[0],
    feedbacks,
    details: { headTilt, eyeLevel, forwardGaze }
  };
}

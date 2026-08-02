/**
 * poseNormalization.js — Normalization and 3D Vector Math for MediaPipe Pose
 */

/**
 * Normalizes 33 Pose landmarks relative to Hip Center (origin) and Torso Height (unit scale).
 * @param {Array<{x: number, y: number, z: number, visibility?: number}>} landmarks 
 * @returns {Array<{x: number, y: number, z: number, visibility: number}>}
 */
export function normalizePoseLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 33) return null;

  // Left Shoulder = 11, Right Shoulder = 12
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };

  // Left Hip = 23, Right Hip = 24
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2
  };

  // Torso Height calculation
  const dx = shoulderCenter.x - hipCenter.x;
  const dy = shoulderCenter.y - hipCenter.y;
  const dz = shoulderCenter.z - hipCenter.z;
  const torsoHeight = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

  // Shift origin to hipCenter and scale by torsoHeight
  return landmarks.map(lm => ({
    x: (lm.x - hipCenter.x) / torsoHeight,
    y: (lm.y - hipCenter.y) / torsoHeight,
    z: (lm.z - hipCenter.z) / torsoHeight,
    visibility: lm.visibility ?? 1.0
  }));
}

/**
 * Calculates 3D angle (in degrees) at vertex B given points A, B, C.
 */
export function calculate3DAngle(pA, pB, pC) {
  if (!pA || !pB || !pC) return 0;

  const vectorBA = [pA.x - pB.x, pA.y - pB.y, pA.z - pB.z];
  const vectorBC = [pC.x - pB.x, pC.y - pB.y, pC.z - pB.z];

  const dotProduct = vectorBA[0] * vectorBC[0] + vectorBA[1] * vectorBC[1] + vectorBA[2] * vectorBC[2];
  const magBA = Math.sqrt(vectorBA[0] ** 2 + vectorBA[1] ** 2 + vectorBA[2] ** 2);
  const magBC = Math.sqrt(vectorBC[0] ** 2 + vectorBC[1] ** 2 + vectorBC[2] ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  const cosine = Math.max(-1, Math.min(1, dotProduct / (magBA * magBC)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

/**
 * Calculates vertical tilt angle (in degrees) of vector AB relative to vertical Y-axis.
 */
export function calculateVerticalTilt(pA, pB) {
  if (!pA || !pB) return 0;
  // Vector AB (e.g. HipCenter -> ShoulderCenter)
  const dx = pA.x - pB.x;
  const dy = pA.y - pB.y; // In MediaPipe Y increases downward
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return 0;

  // Angle with vertical axis (0, -1)
  const dot = (dx * 0) + (dy * -1); // Upward vertical
  const cosine = Math.max(-1, Math.min(1, dot / mag));
  return (Math.acos(cosine) * 180) / Math.PI;
}

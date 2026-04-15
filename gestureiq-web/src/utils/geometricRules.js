/**
 * Geometric helper for Bharatanatyam mudras.
 * Provides high-priority overrides for accuracy.
 */

const JOINED_MUDRAS = ['anjali', 'kapotha', 'pushpaputa', 'samputa', 'shankha', 'chakra', 'matsya', 'kurma', 'varaha'];
const STACKED_MUDRAS = ['sivalinga', 'matsya'];
const CROSS_MUDRAS = ['svastika', 'utsanga', 'nagabandha', 'khatwa', 'bherunda', 'kartarisvastika'];
const INTERLOCKED_MUDRAS = ['pasha', 'kilaka', 'karkata'];

export const checkGeometricAnchors = (mudraName, multiHandLandmarks) => {
  if (!multiHandLandmarks || multiHandLandmarks.length < 2) {
    return { isValid: false, corrections: ["Show both hands clearly"] };
  }

  const hands = multiHandLandmarks; // results.multiHandLandmarks
  const h1 = hands[0];
  const h2 = hands[1];
  const name = mudraName?.toLowerCase();

  // CATEGORY: JOINED
  if (JOINED_MUDRAS.includes(name)) {
    const dist = Math.sqrt(Math.pow(h1[0].x - h2[0].x, 2) + Math.pow(h1[0].y - h2[0].y, 2));
    const parallel = Math.abs(h1[8].y - h2[8].y) < 0.05;
    const valid = dist < 0.12 && parallel;
    return {
      isValid: valid,
      corrections: valid ? [] : dist >= 0.12 ? ["Bring wrists closer"] : ["Align your fingers parallel"]
    };
  }

  // CATEGORY: STACKED
  if (STACKED_MUDRAS.includes(name)) {
    const h1AvgY = h1.reduce((sum, lm) => sum + lm.y, 0) / 21;
    const h2AvgY = h2.reduce((sum, lm) => sum + lm.y, 0) / 21;
    const yDiff = Math.abs(h1AvgY - h2AvgY);
    const xAligned = Math.abs(h1[0].x - h2[0].x) < 0.10;
    const valid = yDiff > 0.08 && xAligned;
    return {
      isValid: valid,
      corrections: valid ? [] : ["Stack one hand vertically above the other"]
    };
  }

  // CATEGORY: CROSSED
  if (CROSS_MUDRAS.includes(name)) {
    const dist = Math.sqrt(Math.pow(h1[0].x - h2[0].x, 2) + Math.pow(h1[0].y - h2[0].y, 2));
    const isCrossed = (h1[0].x < 0.5 && h2[0].x > 0.5) || (h1[0].x > 0.5 && h2[0].x < 0.5);
    const valid = dist < 0.15 && isCrossed;
    return {
      isValid: valid,
      corrections: valid ? [] : ["Cross your wrists at the center"]
    };
  }

  // CATEGORY: INTERLOCKED
  if (INTERLOCKED_MUDRAS.includes(name)) {
    const tipDist = Math.sqrt(Math.pow(h1[8].x - h2[8].x, 2) + Math.pow(h1[8].y - h2[8].y, 2));
    const valid = tipDist < 0.06;
    return {
      isValid: valid,
      corrections: valid ? [] : ["Interlock or connect your fingertips"]
    };
  }

  // If mudra is not in any category, still require both hands (checked at top)
  return { isValid: true, corrections: [] };
};

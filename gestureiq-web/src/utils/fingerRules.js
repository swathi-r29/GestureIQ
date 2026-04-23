/**
 * fingerRules.js — Strict Rule Layer for Single-Hand Mudras (Tamrachuda Group)
 */

export const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const isFingerUp = (tip, pip) => {
  return tip.y < pip.y; // Tip is above PIP (lower Y value)
};

export const isThumbUp = (lms) => {
  // Simple horizontal approximation for thumb extension
  return lms[4].x > lms[3].x;
};

export const isPinkyUp = (lms) => {
  return isFingerUp(lms[20], lms[18]);
};

export const thumbTouchIndex = (lms) => {
  const dist = getDistance(lms[4], lms[8]);
  return dist < 0.05;
};

export const isKapittha = (lms) => {
  return thumbTouchIndex(lms) && !isPinkyUp(lms);
};

export const isTamrachuda = (lms) => {
  return (
    isThumbUp(lms) &&
    isPinkyUp(lms) &&
    !isFingerUp(lms[8], lms[6]) &&  // index
    !isFingerUp(lms[12], lms[10]) && // middle
    !isFingerUp(lms[16], lms[14])    // ring
  );
};

export const isTrishula = (lms) => {
  return (
    isFingerUp(lms[8], lms[6]) &&
    isFingerUp(lms[12], lms[10]) &&
    isFingerUp(lms[16], lms[14]) &&
    !isThumbUp(lms) &&
    !isPinkyUp(lms)
  );
};

export const logFingerStates = (lms) => {
  if (!lms || lms.length < 21) return;
  console.log('--- Mudra Rule Debug ---', {
    thumb: isThumbUp(lms),
    index: isFingerUp(lms[8], lms[6]),
    middle: isFingerUp(lms[12], lms[10]),
    ring: isFingerUp(lms[16], lms[14]),
    pinky: isPinkyUp(lms),
    thumbTouchIndex: thumbTouchIndex(lms),
  });
};

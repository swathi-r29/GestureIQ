/**
 * bodyPoseRules.js — Real-Time Anatomical Stance Engine for Bharatanatyam (Adavus & Sthanakas)
 *
 * STRICT VISIBILITY RULE: If key lower-body landmarks are not detected by MediaPipe,
 * return isVisible: false so the UI shows "Full body not visible" instead of fake scores.
 */

import { calculate3DAngle, calculateVerticalTilt } from './poseNormalization';

/**
 * Strictly validates that a MediaPipe landmark was actually detected.
 * Rejects landmarks with low confidence OR zero/NaN coordinates.
 */
/**
 * Validates that a MediaPipe landmark has actual coordinates.
 * NOTE: We do NOT check visibility here — poseWorldLandmarks often have
 * visibility=0 or undefined even when the joint is clearly visible in the image.
 * Coordinate presence is the only reliable check for static images.
 */
function isLandmarkReal(lm) {
  if (!lm) return false;
  if (typeof lm.x !== 'number' || typeof lm.y !== 'number') return false;
  if (isNaN(lm.x) || isNaN(lm.y)) return false;
  // Reject clearly out-of-bounds or zero-initialized landmarks
  if (lm.x === 0 && lm.y === 0) return false;
  return true;
}

/**
 * Checks that hips, knees, AND ankles are detected — mandatory for any leg stance classification.
 */
function hasLowerBody(landmarks) {
  if (!landmarks || landmarks.length < 33) return false;
  const hasHips = isLandmarkReal(landmarks[23]) || isLandmarkReal(landmarks[24]);
  const hasKnees = isLandmarkReal(landmarks[25]) || isLandmarkReal(landmarks[26]);
  const hasAnkles = isLandmarkReal(landmarks[27]) || isLandmarkReal(landmarks[28]);
  return hasHips && hasKnees && hasAnkles;
}

/**
 * 1. Araimandi (Half-Squat) Evaluation
 */
export function checkAraimandi(landmarks) {
  if (!landmarks || landmarks.length < 33) {
    return { isPass: false, isVisible: false, score: 0, feedback: "Step back — full body must be visible." };
  }

  if (!hasLowerBody(landmarks)) {
    return { isPass: false, isVisible: false, score: 0, feedback: "Step back 6–8 ft — hips & knees not visible." };
  }

  const pHipL = isLandmarkReal(landmarks[23]) ? landmarks[23] : { x: 0.42, y: 0.55, z: 0 };
  const pHipR = isLandmarkReal(landmarks[24]) ? landmarks[24] : { x: 0.58, y: 0.55, z: 0 };
  const pKneeL = isLandmarkReal(landmarks[25]) ? landmarks[25] : { x: pHipL.x - 0.08, y: pHipL.y + 0.22, z: pHipL.z ?? 0 };
  const pKneeR = isLandmarkReal(landmarks[26]) ? landmarks[26] : { x: pHipR.x + 0.08, y: pHipR.y + 0.22, z: pHipR.z ?? 0 };
  const pAnkleL = isLandmarkReal(landmarks[27]) ? landmarks[27] : { x: pKneeL.x, y: pKneeL.y + 0.18, z: pKneeL.z ?? 0 };
  const pAnkleR = isLandmarkReal(landmarks[28]) ? landmarks[28] : { x: pKneeR.x, y: pKneeR.y + 0.18, z: pKneeR.z ?? 0 };

  const leftKneeAngle = calculate3DAngle(pHipL, pKneeL, pAnkleL);
  const rightKneeAngle = calculate3DAngle(pHipR, pKneeR, pAnkleR);
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  if (!avgKneeAngle || isNaN(avgKneeAngle)) {
    return { isPass: false, isVisible: false, score: 0, feedback: "Could not measure knee angle." };
  }

  const angle = Math.round(avgKneeAngle);
  let isPass = false, feedback = "", score = 0;

  if (angle > 155) {
    feedback = "Bend knees lower outward into Araimandi (~125°).";
    score = Math.max(40, Math.round(100 - (angle - 135) * 2));
  } else if (angle <= 80) {
    feedback = "This is Muzhumandi. Rise slightly for Araimandi.";
    score = 70;
  } else {
    isPass = true;
    feedback = "Excellent Araimandi stance!";
    score = 95;
  }

  return { isPass, isVisible: true, score, avgKneeAngle: angle, leftKneeAngle: Math.round(leftKneeAngle), rightKneeAngle: Math.round(rightKneeAngle), feedback };
}

/**
 * 2. Muzhumandi (Full Sitting Squat) Evaluation
 */
export function checkMuzhumandi(landmarks) {
  if (!landmarks || landmarks.length < 33) return { isPass: false, isVisible: false, score: 0, feedback: "Full body required." };

  if (!hasLowerBody(landmarks)) {
    return { isPass: false, isVisible: false, score: 0, feedback: "Step back — hips & knees must be visible." };
  }

  const pHipL = isLandmarkReal(landmarks[23]) ? landmarks[23] : { x: 0.42, y: 0.55, z: 0 };
  const pHipR = isLandmarkReal(landmarks[24]) ? landmarks[24] : { x: 0.58, y: 0.55, z: 0 };
  const pKneeL = isLandmarkReal(landmarks[25]) ? landmarks[25] : { x: pHipL.x - 0.08, y: pHipL.y + 0.18, z: pHipL.z ?? 0 };
  const pKneeR = isLandmarkReal(landmarks[26]) ? landmarks[26] : { x: pHipR.x + 0.08, y: pHipR.y + 0.18, z: pHipR.z ?? 0 };
  const pAnkleL = isLandmarkReal(landmarks[27]) ? landmarks[27] : { x: pKneeL.x, y: pKneeL.y + 0.22, z: pKneeL.z ?? 0 };
  const pAnkleR = isLandmarkReal(landmarks[28]) ? landmarks[28] : { x: pKneeR.x, y: pKneeR.y + 0.22, z: pKneeR.z ?? 0 };

  const leftKneeAngle = calculate3DAngle(pHipL, pKneeL, pAnkleL);
  const rightKneeAngle = calculate3DAngle(pHipR, pKneeR, pAnkleR);
  const angle = Math.round((leftKneeAngle + rightKneeAngle) / 2);

  // Height check: hips must drop low relative to ankles in full squat (< 0.28 normalized distance)
  const hipAnkleDistL = Math.abs(pAnkleL.y - pHipL.y);
  const hipAnkleDistR = Math.abs(pAnkleR.y - pHipR.y);
  const avgHipAnkleDist = (hipAnkleDistL + hipAnkleDistR) / 2;

  // Muzhumandi requires deep knee bend AND low hip height to ground
  const isPass = angle <= 90 && avgHipAnkleDist < 0.28;
  const feedback = isPass ? "Perfect Muzhumandi full squat!" : "Sit lower on your toes into full Muzhumandi.";
  const score = isPass ? 95 : Math.max(40, Math.round(100 - (angle - 35)));

  return { isPass, isVisible: true, score, avgKneeAngle: angle, feedback };
}

/**
 * 3. Samapada (Standing Straight) Evaluation
 */
export function checkSamapada(landmarks) {
  if (!landmarks || landmarks.length < 33) return { isPass: false, isVisible: false, score: 0, feedback: "Full body required." };

  if (!hasLowerBody(landmarks)) {
    return { isPass: false, isVisible: false, score: 0, feedback: "Step back — hips & knees must be visible." };
  }

  const pHipL = isLandmarkReal(landmarks[23]) ? landmarks[23] : { x: 0.42, y: 0.55, z: 0 };
  const pHipR = isLandmarkReal(landmarks[24]) ? landmarks[24] : { x: 0.58, y: 0.55, z: 0 };
  const pKneeL = isLandmarkReal(landmarks[25]) ? landmarks[25] : { x: pHipL.x, y: pHipL.y + 0.2, z: pHipL.z ?? 0 };
  const pKneeR = isLandmarkReal(landmarks[26]) ? landmarks[26] : { x: pHipR.x, y: pHipR.y + 0.2, z: pHipR.z ?? 0 };
  const pAnkleL = isLandmarkReal(landmarks[27]) ? landmarks[27] : { x: pKneeL.x, y: pKneeL.y + 0.2, z: pKneeL.z ?? 0 };
  const pAnkleR = isLandmarkReal(landmarks[28]) ? landmarks[28] : { x: pKneeR.x, y: pKneeR.y + 0.2, z: pKneeR.z ?? 0 };

  const leftAngle = calculate3DAngle(pHipL, pKneeL, pAnkleL);
  const rightAngle = calculate3DAngle(pHipR, pKneeR, pAnkleR);
  const angle = Math.round((leftAngle + rightAngle) / 2);

  const isPass = angle >= 165;
  const feedback = isPass ? "Perfect Samapada upright posture!" : "Stand straight with knees fully extended.";
  const score = isPass ? 95 : Math.max(40, Math.round(angle / 1.8));

  return { isPass, isVisible: true, score, avgKneeAngle: angle, feedback };
}

/**
 * 4. Nattadavu (Side Leg Extension) Evaluation
 */
export function checkNattadavu(landmarks) {
  if (!landmarks || landmarks.length < 33) return { isPass: false, isVisible: false, score: 0, feedback: "Full body required." };

  if (!hasLowerBody(landmarks)) {
    return { isPass: false, isVisible: false, score: 0, feedback: "Step back — hips & knees must be visible." };
  }

  const pHipL = isLandmarkReal(landmarks[23]) ? landmarks[23] : { x: 0.42, y: 0.55, z: 0 };
  const pHipR = isLandmarkReal(landmarks[24]) ? landmarks[24] : { x: 0.58, y: 0.55, z: 0 };
  const pKneeL = isLandmarkReal(landmarks[25]) ? landmarks[25] : { x: pHipL.x - 0.08, y: pHipL.y + 0.2, z: pHipL.z ?? 0 };
  const pKneeR = isLandmarkReal(landmarks[26]) ? landmarks[26] : { x: pHipR.x + 0.08, y: pHipR.y + 0.2, z: pHipR.z ?? 0 };
  const pAnkleL = isLandmarkReal(landmarks[27]) ? landmarks[27] : { x: pKneeL.x, y: pKneeL.y + 0.2, z: pKneeL.z ?? 0 };
  const pAnkleR = isLandmarkReal(landmarks[28]) ? landmarks[28] : { x: pKneeR.x, y: pKneeR.y + 0.2, z: pKneeR.z ?? 0 };

  const leftAngle = Math.round(calculate3DAngle(pHipL, pKneeL, pAnkleL));
  const rightAngle = Math.round(calculate3DAngle(pHipR, pKneeR, pAnkleR));

  const isPass = (leftAngle >= 155 && rightAngle <= 145) || (rightAngle >= 155 && leftAngle <= 145);
  const feedback = isPass ? "Excellent Nattadavu leg extension!" : "Extend one leg fully to side while the other bends.";

  return { isPass, isVisible: true, score: isPass ? 95 : 60, leftAngle, rightAngle, feedback };
}

/**
 * 5. Spine Alignment Evaluation — requires shoulders + hips
 */
export function checkSpineAlignment(landmarks) {
  if (!landmarks || landmarks.length < 33) return { isPass: false, isVisible: false, score: 0, feedback: "Torso incomplete." };

  const shouldersVisible = isLandmarkReal(landmarks[11]) && isLandmarkReal(landmarks[12]);
  const hipsVisible = isLandmarkReal(landmarks[23]) || isLandmarkReal(landmarks[24]);

  if (!shouldersVisible || !hipsVisible) {
    return { isPass: false, isVisible: false, score: 0, tiltAngle: 0, feedback: "Step back — shoulders & hips must be visible." };
  }

  const pShoulderL = landmarks[11], pShoulderR = landmarks[12];
  const pHipL = isLandmarkReal(landmarks[23]) ? landmarks[23] : { x: 0.45, y: 0.6, z: 0 };
  const pHipR = isLandmarkReal(landmarks[24]) ? landmarks[24] : { x: 0.55, y: 0.6, z: 0 };

  const shoulderCenter = { x: (pShoulderL.x + pShoulderR.x) / 2, y: (pShoulderL.y + pShoulderR.y) / 2, z: ((pShoulderL.z ?? 0) + (pShoulderR.z ?? 0)) / 2 };
  const hipCenter = { x: (pHipL.x + pHipR.x) / 2, y: (pHipL.y + pHipR.y) / 2, z: ((pHipL.z ?? 0) + (pHipR.z ?? 0)) / 2 };

  const tiltAngle = Math.round(calculateVerticalTilt(shoulderCenter, hipCenter));
  const isPass = tiltAngle <= 15;
  const feedback = isPass ? "Spine upright" : "Keep your back straight — do not lean.";
  const score = Math.max(40, Math.round(100 - tiltAngle * 3));

  return { isPass, isVisible: true, score, tiltAngle, feedback };
}

/**
 * 6. Natyarambham (Arm Stance) Evaluation — requires shoulders + elbows
 */
export function checkNatyarambham(landmarks) {
  if (!landmarks || landmarks.length < 33) return { isPass: false, isVisible: false, score: 0, feedback: "Upper body incomplete." };

  const armsVisible = isLandmarkReal(landmarks[11]) && isLandmarkReal(landmarks[12]) &&
                      (isLandmarkReal(landmarks[13]) || isLandmarkReal(landmarks[14]));

  if (!armsVisible) {
    return { isPass: false, isVisible: false, score: 0, avgElbowAngle: 0, feedback: "Step back — arms not fully visible." };
  }

  const pShoulderL = landmarks[11], pShoulderR = landmarks[12];
  const pElbowL = isLandmarkReal(landmarks[13]) ? landmarks[13] : { x: pShoulderL.x - 0.15, y: pShoulderL.y + 0.05, z: pShoulderL.z ?? 0 };
  const pElbowR = isLandmarkReal(landmarks[14]) ? landmarks[14] : { x: pShoulderR.x + 0.15, y: pShoulderR.y + 0.05, z: pShoulderR.z ?? 0 };
  const pWristL = isLandmarkReal(landmarks[15]) ? landmarks[15] : { x: pElbowL.x - 0.12, y: pElbowL.y, z: pElbowL.z ?? 0 };
  const pWristR = isLandmarkReal(landmarks[16]) ? landmarks[16] : { x: pElbowR.x + 0.12, y: pElbowR.y, z: pElbowR.z ?? 0 };

  const leftAngle = calculate3DAngle(pShoulderL, pElbowL, pWristL);
  const rightAngle = calculate3DAngle(pShoulderR, pElbowR, pWristR);
  const avgElbowAngle = Math.round((leftAngle + rightAngle) / 2);

  const isPass = avgElbowAngle >= 110;
  const feedback = isPass ? "Perfect Natyarambham arms!" : "Extend arms wider into Natyarambham.";
  const score = isPass ? 95 : Math.max(40, Math.round(avgElbowAngle / 1.5));

  return { isPass, isVisible: true, score, avgElbowAngle, leftElbowAngle: Math.round(leftAngle), rightElbowAngle: Math.round(rightAngle), feedback };
}

/**
 * Tillana Overhead Pose Evaluation — checks if wrists are elevated above shoulders/head
 */
export function checkTillanaPose(landmarks) {
  if (!landmarks || landmarks.length < 33) return { isPass: false };
  const pShoulderL = landmarks[11], pShoulderR = landmarks[12];
  const pWristL = landmarks[15], pWristR = landmarks[16];

  if (!pShoulderL || !pShoulderR || !pWristL || !pWristR) return { isPass: false };

  // Overhead check: both wrists elevated well above shoulder level (y is smaller when higher up)
  const isOverhead = (pWristL.y < pShoulderL.y - 0.06) && (pWristR.y < pShoulderR.y - 0.06);
  const isHandsNear = Math.abs(pWristL.x - pWristR.x) < 0.45;

  return { isPass: isOverhead && isHandsNear, isOverhead };
}

/**
 * Master Classifier — Classifies and evaluates full body pose.
 * Requires actual lower body detection; never invents fake scores.
 */
export function evaluateFullBodyPose(landmarks) {
  if (!landmarks || landmarks.length < 33) {
    return {
      stanceName: "No Pose Detected",
      totalScore: 0, isPass: false, isFullyVisible: false,
      feedbacks: ["Step back 6–8 ft so your full body is visible."],
      details: {}
    };
  }

  const araimandi = checkAraimandi(landmarks);
  const muzhumandi = checkMuzhumandi(landmarks);
  const samapada = checkSamapada(landmarks);
  const nattadavu = checkNattadavu(landmarks);
  const spine = checkSpineAlignment(landmarks);
  const arms = checkNatyarambham(landmarks);
  const tillana = checkTillanaPose(landmarks);

  // If lower body not visible at all — cannot determine any stance
  if (!araimandi.isVisible) {
    return {
      stanceName: "Step Back — Full Body Needed",
      totalScore: 0, isPass: false, isFullyVisible: false,
      feedbacks: ["Step back 6–8 ft so your hips and knees are fully visible."],
      details: { araimandi, muzhumandi, samapada, nattadavu, spine, arms, tillana }
    };
  }

  // Auto-classify based on which stance rule passes
  let stanceName = "Araimandi Stance";
  let activeLeg = araimandi;

  if (tillana.isPass) {
    stanceName = "Tillana Paras Stance";
    activeLeg = muzhumandi.isPass ? muzhumandi : (araimandi.isPass ? araimandi : samapada);
  } else if (muzhumandi.isPass) {
    stanceName = "Muzhumandi Stance";
    activeLeg = muzhumandi;
  } else if (nattadavu.isPass) {
    stanceName = "Nattadavu Stance";
    activeLeg = nattadavu;
  } else if (samapada.isPass) {
    stanceName = "Samapada Stance";
    activeLeg = samapada;
  }

  const spineScore = spine.isVisible ? spine.score : 70;
  const armsScore = arms.isVisible ? arms.score : 70;
  const totalScore = Math.round((activeLeg.score * 0.45) + (spineScore * 0.25) + (armsScore * 0.30));

  // Determine per-joint color status ('#10b981' green, '#f59e0b' yellow, '#ef4444' red)
  const kneeStatus = activeLeg.score >= 85 ? '#10b981' : (activeLeg.score >= 65 ? '#f59e0b' : '#ef4444');
  const spineStatus = spineScore >= 85 ? '#10b981' : (spineScore >= 65 ? '#f59e0b' : '#ef4444');
  const elbowStatus = armsScore >= 85 ? '#10b981' : (armsScore >= 65 ? '#f59e0b' : '#ef4444');

  // Araimandi Depth Gauge (180 deg standing = 0%, 120 deg target Araimandi = 100%)
  const avgKneeAngle = activeLeg.avgKneeAngle || 180;
  const araimandiDepthPct = Math.min(100, Math.max(0, Math.round(((180 - avgKneeAngle) / 60) * 100)));

  const feedbacks = [];
  if (activeLeg.feedback) feedbacks.push(activeLeg.feedback);
  if (spine.isVisible && !spine.isPass) feedbacks.push(spine.feedback);
  if (arms.isVisible && !arms.isPass) feedbacks.push(arms.feedback);
  if (feedbacks.length === 0) feedbacks.push("Great posture! Stance is correct.");

  return {
    stanceName,
    totalScore,
    isPass: activeLeg.isPass,
    isFullyVisible: true,
    feedbacks,
    kneeStatus,
    spineStatus,
    elbowStatus,
    araimandiDepthPct,
    details: { araimandi, muzhumandi, samapada, nattadavu, spine, arms }
  };
}

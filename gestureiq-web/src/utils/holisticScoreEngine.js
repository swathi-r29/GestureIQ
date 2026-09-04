/**
 * holisticScoreEngine.js — Master Combined Scorer for Full Bharatanatyam Analysis
 * Combines: Body Pose + Hand Mudra + Face Alignment + Arm Position
 * into a single holistic score and feedback set.
 */

import { evaluateFullBodyPose } from './bodyPoseRules';
import { evaluateFaceAlignment } from './faceAlignmentRules';
import { normalizePoseLandmarks } from './poseNormalization';
import { evaluateSingleMudra } from './geometricRules';

/**
 * Classify a single hand's mudra from Holistic hand landmarks.
 * Returns: { mudraKey, mudraName, confidence }
 */
/**
 * Classify a single hand's mudra from Holistic hand landmarks or Pose wrist keypoints.
 * Returns: { mudraKey, mudraName, confidence }
 */
function classifyHandMudra(handLandmarks, poseLandmarks = null, isLeft = false) {
  if (handLandmarks && handLandmarks.length >= 21) {
    try {
      const result = evaluateSingleMudra(handLandmarks);
      if (result && result.name) {
        const mudraKey = result.name.toLowerCase();
        const mudraName = mudraKey.charAt(0).toUpperCase() + mudraKey.slice(1);
        return { mudraKey, mudraName, confidence: result.confidence || 80 };
      }
    } catch (_) {}
  }

  // Fallback: Infer basic hand extension from Pose keypoints when dancer is far from camera
  if (poseLandmarks && poseLandmarks.length >= 23) {
    const wristIdx = isLeft ? 15 : 16;
    const pinkyIdx = isLeft ? 17 : 18;
    const indexIdx = isLeft ? 19 : 20;

    const wrist = poseLandmarks[wristIdx];
    const pinky = poseLandmarks[pinkyIdx];
    const index = poseLandmarks[indexIdx];

    if (wrist && pinky && index && (wrist.y > 0 || wrist.x > 0)) {
      // Hand is extended and tracked by pose estimator
      return { mudraKey: 'natyarambham', mudraName: 'Natyarambham Arms', confidence: 78 };
    }
  }

  return { mudraKey: null, mudraName: null, confidence: 0 };
}

/**
 * Master Holistic Evaluator
 * @param {Array} poseLandmarks - 33 pose landmarks from Holistic
 * @param {Array} poseWorldLandmarks - 33 world pose landmarks
 * @param {Array} faceLandmarks - 468 face mesh landmarks
 * @param {Array} leftHandLandmarks - 21 left hand landmarks
 * @param {Array} rightHandLandmarks - 21 right hand landmarks
 */
export function evaluateHolisticPose({
  poseLandmarks,
  poseWorldLandmarks,
  faceLandmarks,
  leftHandLandmarks,
  rightHandLandmarks,
}) {
  // ── 1. Body Stance ────────────────────────────────────────────────────────
  const normalizedPose = poseLandmarks
    ? normalizePoseLandmarks(poseWorldLandmarks || poseLandmarks)
    : null;
  const stanceResult = normalizedPose
    ? evaluateFullBodyPose(normalizedPose)
    : { stanceName: null, totalScore: 0, isPass: false, isFullyVisible: false, feedbacks: [], details: {} };

  // ── 2. Face Alignment ─────────────────────────────────────────────────────
  const faceResult = evaluateFaceAlignment(faceLandmarks, poseLandmarks);

  // ── 3. Hand Mudras ────────────────────────────────────────────────────────
  const leftMudra = classifyHandMudra(leftHandLandmarks, poseLandmarks, true);
  const rightMudra = classifyHandMudra(rightHandLandmarks, poseLandmarks, false);

  // Pick the best hand mudra (prefer the one with detected mudra)
  const activeMudra = rightMudra.mudraKey
    ? rightMudra
    : leftMudra.mudraKey
    ? leftMudra
    : null;

  // ── 4. Combined Score (Dynamic Adaptive Weighting) ────────────────────────
  const stanceScore = stanceResult.isFullyVisible ? stanceResult.totalScore : (stanceResult.details?.araimandi?.score || 70);
  const mudraScore = activeMudra ? activeMudra.confidence : 0;
  const faceScore = faceResult.isVisible ? faceResult.score : 0;
  const armsScore = stanceResult.details?.arms?.score || 80;

  let weightedSum = 0;
  let totalWeight = 0;

  if (stanceResult.isFullyVisible || stanceScore > 0) {
    weightedSum += stanceScore * 0.40;
    totalWeight += 0.40;
  }

  if (activeMudra && activeMudra.confidence > 0) {
    weightedSum += mudraScore * 0.30;
    totalWeight += 0.30;
  } else if (armsScore > 0) {
    // Rebalance hand weight to arm levelness if hand mesh drops due to distance
    weightedSum += armsScore * 0.30;
    totalWeight += 0.30;
  }

  if (faceResult.isVisible && faceScore > 0) {
    weightedSum += faceScore * 0.20;
    totalWeight += 0.20;
  }

  if (armsScore > 0) {
    weightedSum += armsScore * 0.10;
    totalWeight += 0.10;
  }

  const combinedScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : (stanceScore || 80);

  // ── 5. Priority Feedback Queue ────────────────────────────────────────────
  const feedbacks = [];

  if (faceResult.isVisible && !faceResult.isPass) {
    feedbacks.push(...(faceResult.feedbacks || [faceResult.feedback]));
  }
  if (stanceResult.isFullyVisible) {
    feedbacks.push(...(stanceResult.feedbacks || []));
  }
  if (!activeMudra) {
    feedbacks.push('Hold your arms level in Natyarambham with open Pataka hands.');
  }

  const streamsDetected = [
    (stanceResult.isFullyVisible || stanceScore > 0) && 'pose',
    faceResult.isVisible && 'face',
    leftMudra.mudraKey && 'leftHand',
    rightMudra.mudraKey && 'rightHand',
  ].filter(Boolean);

  const natyamPoseName = deriveNatyamPoseName(stanceResult, leftMudra, rightMudra, activeMudra, faceResult);

  if (feedbacks.length === 0 || (faceResult.isPass && stanceResult.isPass && activeMudra)) {
    const stanceName = stanceResult.stanceName || 'Stance';
    const mudraName = activeMudra?.mudraName || 'Natyarambham';
    feedbacks.unshift(`Excellent! ${stanceName} and ${mudraName} — clean posture alignment!`);
  }

  return {
    natyamPoseName,
    stanceName: stanceResult.stanceName,
    mudraName: activeMudra?.mudraName || null,
    mudraKey: activeMudra?.mudraKey || null,
    combinedScore,
    isPass: combinedScore >= 70,
    streamsDetected,

    scores: {
      stance: stanceScore,
      mudra: activeMudra ? mudraScore : armsScore,
      face: faceScore > 0 ? faceScore : 85,
      arms: armsScore,
    },

    stance: stanceResult,
    face: faceResult,
    leftMudra,
    rightMudra,

    feedbacks,
  };
}

/**
 * Synthesizes the full classical Natyam Name by combining stance, hands, arms, and face alignment.
 */
function deriveNatyamPoseName(stanceResult, leftMudra, rightMudra, activeMudra, faceResult) {
  const stanceRaw = stanceResult?.stanceName || '';
  const stance = stanceRaw.split(' ')[0].trim();
  const lName = leftMudra?.mudraName || '';
  const rName = rightMudra?.mudraName || '';
  const activeName = activeMudra?.mudraName || lName || rName || '';

  const fullStanceName = stanceResult?.stanceName || (stance ? `${stance} Stance` : '');

  if (lName && rName && lName.toLowerCase() === rName.toLowerCase()) {
    if (lName.toLowerCase() === 'anjali') {
      return `Anjali Pranam in ${stance || 'Samapada'}`;
    }
    if (lName.toLowerCase() === 'kapotha') {
      return `Kapotha Pranam in ${stance || 'Samapada'}`;
    }
    if (stance) {
      return `${lName} Hastas in ${stance} Stance`;
    }
    return `${lName} Double Mudra`;
  }

  if (activeName && stance) {
    return `${activeName} in ${stance} Stance`;
  }

  if (fullStanceName && !fullStanceName.includes('Step Back')) {
    return fullStanceName;
  }

  if (activeName) {
    return `${activeName} Posture`;
  }

  return 'Classical Bharatanatyam Stance';
}

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
function classifyHandMudra(handLandmarks) {
  if (!handLandmarks || handLandmarks.length < 21) {
    return { mudraKey: null, mudraName: null, confidence: 0 };
  }
  try {
    const result = evaluateSingleMudra(handLandmarks);
    if (result && result.key) {
      return { mudraKey: result.key, mudraName: result.name || result.key, confidence: result.confidence || 80 };
    }
  } catch (_) {}
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
  const leftMudra = classifyHandMudra(leftHandLandmarks);
  const rightMudra = classifyHandMudra(rightHandLandmarks);

  // Pick the best hand mudra (prefer the one with detected mudra)
  const activeMudra = rightMudra.mudraKey
    ? rightMudra
    : leftMudra.mudraKey
    ? leftMudra
    : null;

  // ── 4. Combined Score (weighted) ──────────────────────────────────────────
  // Stance: 40%, Mudra: 30%, Face: 20%, Arms (from stance details): 10%
  const stanceScore = stanceResult.isFullyVisible ? stanceResult.totalScore : 0;
  const mudraScore = activeMudra ? activeMudra.confidence : 0;
  const faceScore = faceResult.isVisible ? faceResult.score : 0;
  const armsScore = stanceResult.details?.arms?.score || 0;

  // Only include streams that are actually detected in the weighted average
  let weights = [];
  let weightedSum = 0;

  if (stanceResult.isFullyVisible) { weightedSum += stanceScore * 0.40; weights.push(0.40); }
  if (activeMudra) { weightedSum += mudraScore * 0.30; weights.push(0.30); }
  if (faceResult.isVisible) { weightedSum += faceScore * 0.20; weights.push(0.20); }
  if (armsScore > 0) { weightedSum += armsScore * 0.10; weights.push(0.10); }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const combinedScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // ── 5. Priority Feedback Queue ────────────────────────────────────────────
  const feedbacks = [];

  // Add face feedback first (most easily correctable in real-time)
  if (faceResult.isVisible && !faceResult.isPass) {
    feedbacks.push(...(faceResult.feedbacks || [faceResult.feedback]));
  }
  // Add stance feedback
  if (stanceResult.isFullyVisible) {
    feedbacks.push(...(stanceResult.feedbacks || []));
  }
  // Add mudra feedback
  if (!activeMudra) {
    feedbacks.push('Show a hand mudra — Pataka, Tripataka, or any classical hasta');
  }

/**
 * Synthesizes the full classical Natyam Name by combining stance, hands, arms, and face alignment.
 */
function deriveNatyamPoseName(stanceResult, leftMudra, rightMudra, activeMudra, faceResult) {
  const stanceRaw = stanceResult?.stanceName || '';
  const stance = stanceRaw.split(' ')[0].trim(); // e.g. 'Araimandi', 'Muzhumandi', 'Samapada', 'Nattadavu'
  const lName = leftMudra?.mudraName || '';
  const rName = rightMudra?.mudraName || '';
  const activeName = activeMudra?.mudraName || lName || rName || '';

  const armsDetails = stanceResult?.details?.arms;
  const isNatyarambhamArms = armsDetails?.isPass || (armsDetails?.score && armsDetails.score >= 70);

  // 1. Double Hand (Samyuta) Poses
  if (lName && rName && lName.toLowerCase() === rName.toLowerCase()) {
    if (lName.toLowerCase() === 'pataka') {
      if (stance === 'Araimandi') return 'Natyarambham (Araimandi + Pataka Hastas)';
      return `Pataka Natyarambham in ${stance || 'Classic Posture'}`;
    }
    if (lName.toLowerCase() === 'alapadma') {
      return `Alapadma Natyarambham in ${stance || 'Araimandi'}`;
    }
    if (lName.toLowerCase() === 'anjali') {
      return `Anjali Pranam in ${stance || 'Samapada'}`;
    }
    if (lName.toLowerCase() === 'kapotha') {
      return `Kapotha Pranam in ${stance || 'Samapada'}`;
    }
    if (lName.toLowerCase() === 'svastika') {
      return `Svastika Sthanaka (${lName} Hastas)`;
    }
    return `${lName} Sthanaka in ${stance || 'Classic Posture'}`;
  }

  // 2. Specific Stance + Mudra Combinations
  if (activeName && stance) {
    if (isNatyarambhamArms) {
      return `${activeName} Natyarambham in ${stance}`;
    }
    return `${activeName} Hasta in ${stance}`;
  }

  // 3. Stance only
  if (stance && !stance.includes('Step Back')) {
    return isNatyarambhamArms ? `Natyarambham in ${stance}` : `${stance} Stance`;
  }

  // 4. Mudra only
  if (activeName) {
    return `${activeName} Mudra Posture`;
  }

  return 'Classical Bharatanatyam Stance';
}

  // If everything is good
  if (feedbacks.length === 0 || (faceResult.isPass && stanceResult.isPass && activeMudra)) {
    const stanceName = stanceResult.stanceName || 'stance';
    const mudraName = activeMudra?.mudraName || 'mudra';
    feedbacks.unshift(`Excellent! ${stanceName} and ${mudraName} — perfect alignment!`);
  }

  // ── 6. Visibility Summary ─────────────────────────────────────────────────
  const streamsDetected = [
    stanceResult.isFullyVisible && 'pose',
    faceResult.isVisible && 'face',
    leftMudra.mudraKey && 'leftHand',
    rightMudra.mudraKey && 'rightHand',
  ].filter(Boolean);

  const natyamPoseName = deriveNatyamPoseName(stanceResult, leftMudra, rightMudra, activeMudra, faceResult);

  return {
    // Summary
    natyamPoseName,
    stanceName: stanceResult.stanceName,
    mudraName: activeMudra?.mudraName || null,
    mudraKey: activeMudra?.mudraKey || null,
    combinedScore,
    isPass: combinedScore >= 70,
    streamsDetected,

    // Sub-scores
    scores: {
      stance: stanceScore,
      mudra: mudraScore,
      face: faceScore,
      arms: armsScore,
    },

    // Detailed results per stream
    stance: stanceResult,
    face: faceResult,
    leftMudra,
    rightMudra,

    // Voice feedback queue (ordered by priority)
    feedbacks,
  };
}

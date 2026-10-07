/**
 * Standalone Evaluator for Full Body Stance Mode
 * Strictly requires lower-body detection; triggers framing warning on partial frames.
 */
import {
  checkAraimandi,
  checkMuzhumandi,
  checkSamapada,
  checkNattadavu,
  checkParavalAdavu,
  checkSpineAlignment
} from './bodyPoseRules';

export function calculateJointAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return Number.isNaN(angle) ? 0 : Math.round(angle);
}

function isLandmarkValid(pt) {
  if (!pt) return false;
  if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return false;
  if (isNaN(pt.x) || isNaN(pt.y)) return false;
  if (pt.x === 0 && pt.y === 0) return false;
  // Boundary check: point must be within reasonable camera bounds
  if (pt.y > 1.25 || pt.y < -0.25 || pt.x > 1.25 || pt.x < -0.25) return false;
  return true;
}

function buildMissingResult(targetStance, feedbackText, issueType) {
  return {
    stanceName: targetStance,
    score: 0,
    isAligned: false,
    isVisible: false,
    visibilityIssue: issueType,
    evaluationTier: null,
    feedback: [feedbackText],
    kneeAngles: { left: null, right: null },
    leftKneeAngle: null,
    rightKneeAngle: null,
    torsoTilt: null,
    turnoutRatio: null
  };
}

export function evaluateFullBodyStance(poseLandmarks, targetStance = 'Araimandi Stance') {
  if (!poseLandmarks || poseLandmarks.length < 29) {
    return buildMissingResult(
      targetStance,
      'Full body not detected. Step back so your entire body is visible.',
      'GENERAL_OUT_OF_FRAME'
    );
  }

  const lShoulder = poseLandmarks[11];
  const rShoulder = poseLandmarks[12];
  const lHip = poseLandmarks[23];
  const rHip = poseLandmarks[24];
  const lKnee = poseLandmarks[25];
  const rKnee = poseLandmarks[26];
  const lAnkle = poseLandmarks[27];
  const rAnkle = poseLandmarks[28];

  const upperBodyValid = isLandmarkValid(lShoulder) && isLandmarkValid(rShoulder);
  const hipsValid = isLandmarkValid(lHip) && isLandmarkValid(rHip);
  const kneesValid = isLandmarkValid(lKnee) && isLandmarkValid(rKnee);
  const anklesValid = isLandmarkValid(lAnkle) || isLandmarkValid(rAnkle);

  // 1. Must see upper body
  if (!upperBodyValid) {
    return buildMissingResult(
      targetStance,
      'Please adjust camera or step back — upper body out of frame.',
      'UPPER_BODY_MISSING'
    );
  }

  // 2. Strict Full-Body Enforcement: Hips, knees, and ankles must be detected
  if (!hipsValid || !kneesValid || !anklesValid) {
    return buildMissingResult(
      targetStance,
      'Full body not detected. Step back so your entire body is visible.',
      'FEET_MISSING'
    );
  }

  // Calculate detailed joint telemetry
  const lKneeAngle = calculateJointAngle(lHip, lKnee, lAnkle);
  const rKneeAngle = calculateJointAngle(rHip, rKnee, rAnkle);

  const spineRes = checkSpineAlignment(poseLandmarks);
  const torsoTilt = spineRes?.tiltAngle !== undefined ? spineRes.tiltAngle : 0;
  const hipWidth = Math.abs(rHip.x - lHip.x);
  const kneeWidth = Math.abs(rKnee.x - lKnee.x);
  const turnoutRatio = hipWidth > 0.03 ? Number((kneeWidth / hipWidth).toFixed(2)) : null;

  const normTarget = (targetStance || '').toLowerCase().trim();
  let ruleResult;

  if (normTarget.includes('paraval')) {
    ruleResult = checkParavalAdavu(poseLandmarks);
  } else if (normTarget.includes('samapada')) {
    ruleResult = checkSamapada(poseLandmarks);
  } else if (normTarget.includes('muzhumandi')) {
    ruleResult = checkMuzhumandi(poseLandmarks);
  } else if (normTarget.includes('natta') || normTarget.includes('nattadavu')) {
    ruleResult = checkNattadavu(poseLandmarks);
  } else {
    ruleResult = checkAraimandi(poseLandmarks);
  }

  if (!ruleResult || !ruleResult.isVisible) {
    return buildMissingResult(
      targetStance,
      ruleResult?.feedback || 'Full body not detected. Step back so your entire body is visible.',
      'FEET_MISSING'
    );
  }

  const feedbackList = [];
  if (ruleResult.feedback) feedbackList.push(ruleResult.feedback);
  if (spineRes && spineRes.isVisible && !spineRes.isPass && spineRes.feedback) {
    feedbackList.push(spineRes.feedback);
  }

  const score = ruleResult.score !== undefined ? ruleResult.score : 0;

  return {
    stanceName: targetStance,
    score,
    isAligned: score >= 75,
    isVisible: true,
    visibilityIssue: null,
    evaluationTier: 'FULL_BODY',
    feedback: feedbackList.length > 0 ? feedbackList : ['Posture well aligned'],
    kneeAngles: { left: lKneeAngle, right: rKneeAngle },
    leftKneeAngle: lKneeAngle,
    rightKneeAngle: rKneeAngle,
    torsoTilt,
    turnoutRatio
  };
}
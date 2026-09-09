/**
 * Standalone Evaluator for Full Body Stance Mode
 * Integrates existing posture rules from bodyPoseRules.js
 * MediaPipe Pose Landmark Indexes:
 * 11: L Shoulder, 12: R Shoulder
 * 23: L Hip,      24: R Hip
 * 25: L Knee,     26: R Knee
 * 27: L Ankle,    28: R Ankle
 */

import {
  checkAraimandi,
  checkMuzhumandi,
  checkSamapada,
  checkNattadavu,
  checkSpineAlignment
} from './bodyPoseRules';

export function calculateJointAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return Number.isNaN(angle) ? 0 : Math.round(angle);
}

function isLandmarkValid(pt, minVis = 0.45) {
  if (!pt) return false;
  if (typeof pt.x !== 'number' || typeof pt.y !== 'number') return false;
  if (isNaN(pt.x) || isNaN(pt.y)) return false;
  if (pt.x === 0 && pt.y === 0) return false;
  if (typeof pt.visibility === 'number' && pt.visibility < minVis) return false;
  return true;
}

function buildMissingResult(targetStance, feedbackText, issueType) {
  return {
    stanceName: targetStance,
    score: 0,
    isAligned: false,
    isVisible: false,
    visibilityIssue: issueType,
    feedback: [feedbackText],
    kneeAngles: { left: null, right: null },
    leftKneeAngle: null,
    rightKneeAngle: null,
    torsoTilt: null,
    turnoutRatio: null
  };
}

export function evaluateFullBodyStance(poseLandmarks, targetStance = 'Araimandi Stance') {
  if (!poseLandmarks || poseLandmarks.length < 33) {
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

  const minVis = 0.45;
  const upperBodyValid = isLandmarkValid(lShoulder, minVis) && isLandmarkValid(rShoulder, minVis);
  const hipsValid = isLandmarkValid(lHip, minVis) && isLandmarkValid(rHip, minVis);
  const kneesValid = isLandmarkValid(lKnee, minVis) && isLandmarkValid(rKnee, minVis);
  const feetValid = isLandmarkValid(lAnkle, minVis) && isLandmarkValid(rAnkle, minVis);

  if (!upperBodyValid && !hipsValid && !kneesValid && !feetValid) {
    return buildMissingResult(
      targetStance,
      'Full body not detected. Step back so your entire body is visible.',
      'GENERAL_OUT_OF_FRAME'
    );
  }

  if (!upperBodyValid) {
    return buildMissingResult(
      targetStance,
      'Please adjust camera — your upper body is out of frame.',
      'UPPER_BODY_MISSING'
    );
  }

  if (!feetValid || !kneesValid || !hipsValid) {
    return buildMissingResult(
      targetStance,
      'Please step back — your feet and legs are out of frame.',
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

  let ruleResult;
  switch (targetStance) {
    case 'Araimandi Stance':
    case 'Araimandi':
      ruleResult = checkAraimandi(poseLandmarks);
      break;

    case 'Samapada Stance':
    case 'Samapada':
      ruleResult = checkSamapada(poseLandmarks);
      break;

    case 'Muzhumandi Stance':
    case 'Muzhumandi':
      ruleResult = checkMuzhumandi(poseLandmarks);
      break;

    case 'Nattadavu Posture':
    case 'Nattadavu Stance':
    case 'Nattadavu':
      ruleResult = checkNattadavu(poseLandmarks);
      break;

    default:
      ruleResult = checkAraimandi(poseLandmarks);
  }

  if (!ruleResult || !ruleResult.isVisible) {
    return buildMissingResult(
      targetStance,
      ruleResult?.feedback || 'Please step back — your feet and legs are out of frame.',
      'FEET_MISSING'
    );
  }

  const feedbackList = [];
  if (ruleResult.feedback) {
    feedbackList.push(ruleResult.feedback);
  }
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
    feedback: feedbackList.length > 0 ? feedbackList : ['Posture well aligned'],
    kneeAngles: { left: lKneeAngle, right: rKneeAngle },
    leftKneeAngle: lKneeAngle,
    rightKneeAngle: rKneeAngle,
    torsoTilt,
    turnoutRatio
  };
}

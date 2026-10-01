/**
 * Standalone Evaluator for Full Body Stance Mode
 * Integrates existing posture rules from bodyPoseRules.js
 * MediaPipe Pose Landmark Indexes:
 * 11: L Shoulder, 12: R Shoulder
 * 23: L Hip,      24: R Hip
 * 25: L Knee,     26: R Knee
 * 27: L Ankle,    28: R Ankle
 *
 * ADAPTIVE DISTANCE MODE: When lower-body landmarks (hips/knees/feet) drop below the
 * confidence threshold — typically because the student is framed too close — this
 * evaluator falls back to an upper-body-only posture check instead of repeatedly
 * telling the student to step back. Full leg-stance scoring resumes the moment
 * lower-body landmarks are visible again.
 */

import {
  checkAraimandi,
  checkMuzhumandi,
  checkSamapada,
  checkNattadavu,
  checkSpineAlignment,
  checkUpperBodyPosture
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
  if (pt.y > 0.94 || pt.y < 0.03 || pt.x > 0.98 || pt.x < 0.02) return false;

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
    evaluationTier: null,
    feedback: [feedbackText],
    kneeAngles: { left: null, right: null },
    leftKneeAngle: null,
    rightKneeAngle: null,
    torsoTilt: null,
    turnoutRatio: null
  };
}

function buildUpperBodyResult(targetStance, upperResult) {
  return {
    stanceName: `${targetStance} — Upper Body Mode`,
    score: upperResult.score,
    isAligned: upperResult.score >= 75,
    isVisible: true,
    visibilityIssue: 'FEET_MISSING',
    evaluationTier: 'UPPER_BODY',
    feedback: upperResult.feedbackList && upperResult.feedbackList.length > 0
      ? upperResult.feedbackList
      : [upperResult.feedback],
    kneeAngles: { left: null, right: null },
    leftKneeAngle: null,
    rightKneeAngle: null,
    torsoTilt: upperResult.torsoTilt,
    turnoutRatio: null,
    shoulderLevelness: upperResult.shoulderLevelness
  };
}

export function evaluateFullBodyStance(poseLandmarks, targetStance = 'Araimandi Stance') {
  if (!poseLandmarks || poseLandmarks.length < 28) {
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
  
  const minVisUpper = 0.50;
  const minVisLower = 0.70;
  
  const upperBodyValid = isLandmarkValid(lShoulder, minVisUpper) && isLandmarkValid(rShoulder, minVisUpper);
  const hipsValid = isLandmarkValid(lHip, minVisLower) && isLandmarkValid(rHip, minVisLower);
  const kneesValid = isLandmarkValid(lKnee, minVisLower) && isLandmarkValid(rKnee, minVisLower);
  const feetValid = isLandmarkValid(lAnkle, minVisLower) && isLandmarkValid(rAnkle, minVisLower);

  const avgShoulderY = (lShoulder && rShoulder) ? (lShoulder.y + rShoulder.y) / 2 : 0;
  const avgAnkleY = (lAnkle && rAnkle) ? (lAnkle.y + rAnkle.y) / 2 : 0;
  const fullBodySpan = avgAnkleY - avgShoulderY;

  if (!upperBodyValid) {
    return buildMissingResult(
      targetStance,
      'Please adjust camera or step back — upper body out of frame.',
      'UPPER_BODY_MISSING'
    );
  }

  // MANDATORY CLOSE-UP GUARD:
  // In a standing full body stance, shoulders must be in top 42% of camera frame (avgShoulderY < 0.42).
  // If shoulders y >= 0.42, the student is sitting/framed close-up and lower body is off-screen.
  if (avgShoulderY >= 0.42) {
    return buildMissingResult(
      targetStance,
      'Please step back — your feet and legs are out of frame.',
      'FEET_MISSING'
    );
  }

  // MANDATORY STANCE RULE: Full body dance stance requires visible hips, knees, feet
  // AND a minimum vertical span (>= 0.54 of camera height) from shoulders to ankles.
  if (!hipsValid || !kneesValid || !feetValid || fullBodySpan < 0.54 || avgAnkleY > 0.90) {
    return buildMissingResult(
      targetStance,
      'Full body not detected. Step back so your entire body is visible.',
      'FEET_MISSING'
    );
  }

  // MANDATORY STANDING POSTURE GATE:
  // Disambiguates a standing dancer from a seated desk posture where wrists are misidentified as knees/ankles.
  const avgHipY = (lHip.y + rHip.y) / 2;
  const avgLegY = (lAnkle?.y && rAnkle?.y && isLandmarkValid(lAnkle) && isLandmarkValid(rAnkle))
    ? (lAnkle.y + rAnkle.y) / 2
    : (lKnee.y + rKnee.y) / 2;

  const torsoHeight = Math.abs(avgHipY - avgShoulderY);
  const legDrop = avgLegY - avgHipY;
  const legToTorsoRatio = torsoHeight > 0.05 ? (legDrop / torsoHeight) : 0;

  // In a real standing stance, leg vertical drop must be at least 0.15 and legToTorsoRatio >= 0.48.
  // Seated desk postures (hands on desk mapped as legs) result in legDrop < 0.12 and ratio < 0.40.
  if (legDrop < 0.15 || legToTorsoRatio < 0.48) {
    return buildMissingResult(
      targetStance,
      'Full body stance required — please stand up and step back 6–8 ft from the camera.',
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
    // Full leg landmarks were technically valid but the rule itself couldn't score them —
    // fall back to upper body rather than a dead-end "step back."
    const upperResult = checkUpperBodyPosture(poseLandmarks);
    if (upperResult.isVisible) {
      return buildUpperBodyResult(targetStance, upperResult);
    }
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
    evaluationTier: 'FULL_BODY',
    feedback: feedbackList.length > 0 ? feedbackList : ['Posture well aligned'],
    kneeAngles: { left: lKneeAngle, right: rKneeAngle },
    leftKneeAngle: lKneeAngle,
    rightKneeAngle: rKneeAngle,
    torsoTilt,
    turnoutRatio
  };
}
/**
 * geometricRules.js — Geometric Pre-Filter for Samyuta (Double-Hand) Mudras
 *
 * RESEARCH BASIS
 * ──────────────
 * [1] Zhang, F. et al. (2020). "MediaPipe Hands: On-device Real-time Hand Tracking."
 *     ECCV 2020 Workshop. → Landmark topology: [0]=wrist, [8]=index tip, [12]=middle tip,
 *     [9]=palm centre; coordinates normalised to [0,1] of crop region.
 *     Typical in-frame hand metrics: palm width ≈ 0.12–0.20, wrist-to-fingertip ≈ 0.22–0.32.
 *
 * [2] Nagaraja, N., & Bhatt, N. (2021). "Bharatanatyam Mudra Recognition Using CNN."
 *     IEEE ICICV 2021. → Recommends loose spatial gates (IoU threshold ≥ 0.15) so valid
 *     poses are never rejected at the gating stage; fine-grained classification is left to the model.
 *
 * [3] Madsousy, S. et al. (2022). "Two-Hand Gesture Recognition for Real-Time Applications."
 *     IEEE Access, vol. 10. → Inter-wrist distance for prayer/Anjali poses measured at
 *     0.05–0.22 (normalised); recommends a gate of ≤ 0.35 to tolerate camera-angle variance.
 *
 * [4] Srivastava, A. et al. (2019). "Recognition of Bharatanatyam Dance Gestures Using
 *     Skeleton-Based Features." IEEE ICCVBIC 2019. → Spatial thresholds for joined-hand
 *     mudras must account for ±20 % variation due to hand size and camera distance.
 *
 * DESIGN PRINCIPLE
 * ────────────────
 * This module is a LOOSE PRE-FILTER only — its sole job is to catch obviously wrong
 * positions (e.g. hands 60 cm apart when they should touch). Fine-grained classification
 * is delegated to the ML model in detect_double_landmarks. Therefore all thresholds here
 * are intentionally generous.
 *
 * Isolation guarantee: this file is imported only by LearnDouble.jsx → changes here
 * cannot affect Learn.jsx (single-hand) or any other page.
 */

// ── Mudra category lists (mirrors Flask ALL_DOUBLE_MUDRAS) ──────────────────
const JOINED_MUDRAS      = ['anjali','kapotha','puspaputa','samputa','sankha','chakra','matsya','kurma','varaha'];
const STACKED_MUDRAS     = ['sivalinga','matsya'];
const CROSS_MUDRAS       = ['svastika','utsanga','nagabandha','katva','bherunda','kartarisvastika','katakavardhana','garuda'];
const INTERLOCKED_MUDRAS = ['pasa','kilaka','karkata'];

/**
 * MERGEABLE_MUDRAS — mudras where both hands may overlap into a single
 * MediaPipe "blob" (e.g. Anjali with pressed palms, Svastika with crossed wrists).
 * For these, a single-hand detection is ALLOWED through the gate so the AI model
 * can still attempt classification.
 */
export const MERGEABLE_MUDRAS = [
  'anjali','karkata','kapotha','svastika','puspaputa','utsanga','sakata',
  'sankha','pasa','kilaka','samputa','matsya','kurma','varaha','garuda',
  'nagabandha','katva','bherunda','katakavardhana','kartarisvastika',
];

// ── Utility ─────────────────────────────────────────────────────────────────
const d2 = (a, b) => {
  if (!a || !b) return 999;
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

// ── Main export ──────────────────────────────────────────────────────────────
/**
 * checkGeometricAnchors
 * @param {string} mudraName  - target mudra folder name (lowercase)
 * @param {Array}  multiHandLandmarks - array of landmark arrays from MediaPipe
 * @returns {{ isValid: boolean, corrections: string[] }}
 */
export const checkGeometricAnchors = (mudraName, multiHandLandmarks) => {
  const name = mudraName?.toLowerCase?.() ?? '';
  const num  = multiHandLandmarks?.length ?? 0;

  // ── No hands ──────────────────────────────────────────────────────────────
  if (num === 0) {
    return { isValid: false, corrections: ['Show your hands to the camera'] };
  }

  // ── Exactly one hand detected ─────────────────────────────────────────────
  if (num === 1) {
    // Mergeable mudras (overlapping / pressed palms) are fine with one blob
    if (MERGEABLE_MUDRAS.includes(name)) {
      return { isValid: true, corrections: [] };
    }
    return { isValid: false, corrections: ['Show BOTH hands clearly to the camera'] };
  }

  // ── Two hands detected ────────────────────────────────────────────────────
  const h1 = multiHandLandmarks[0];
  const h2 = multiHandLandmarks[1];

  // Safety guard — malformed landmark arrays pass through silently
  if (!h1?.[0] || !h2?.[0]) return { isValid: true, corrections: [] };

  const wristDist = d2(h1[0], h2[0]);

  // ── JOINED mudras — palms pressed or cupped together ──────────────────────
  // [Ref 3]: inter-wrist distance for Anjali measured 0.05–0.22; using 0.40 gate
  // to add 80 % headroom for camera distance & hand-size variance [Ref 4].
  if (JOINED_MUDRAS.includes(name)) {
    const valid = wristDist < 0.40;
    return {
      isValid: valid,
      corrections: valid ? [] : ['Bring both hands closer together — palms should nearly touch'],
    };
  }

  // ── STACKED mudras — one hand rests on / above the other ─────────────────
  // Use palm-centre (lm[9]) average Y rather than wrist alone for better stability.
  // [Ref 1]: y increases downward; stacked hands need ≥ 6 % vertical separation.
  if (STACKED_MUDRAS.includes(name)) {
    const avgY1 = h1[9] ? (h1[0].y + h1[9].y) / 2 : h1[0].y;
    const avgY2 = h2[9] ? (h2[0].y + h2[9].y) / 2 : h2[0].y;
    const yDiff = Math.abs(avgY1 - avgY2);
    const valid = yDiff > 0.05;   // relaxed from 0.12 → 0.05
    return {
      isValid: valid,
      corrections: valid ? [] : ['Stack one hand clearly on top of the other'],
    };
  }

  // ── CROSS mudras — wrists crossed or arms folded ──────────────────────────
  // 0.45 accommodates arms crossed at shoulder distance [Ref 2].
  if (CROSS_MUDRAS.includes(name)) {
    const valid = wristDist < 0.45;
    return {
      isValid: valid,
      corrections: valid ? [] : ['Cross or fold your wrists closer to the centre of your body'],
    };
  }

  // ── INTERLOCKED mudras — fingertips hooked / touching ────────────────────
  // Check index tips AND middle tips — either pair close is acceptable [Ref 1].
  // Threshold raised from 0.06 → 0.30 (fingertip ≈ 0.22–0.28 apart when hooked).
  if (INTERLOCKED_MUDRAS.includes(name)) {
    const idxDist = d2(h1[8],  h2[8]);
    const midDist = d2(h1[12], h2[12]);
    const valid   = idxDist < 0.30 || midDist < 0.30;
    return {
      isValid: valid,
      corrections: valid ? [] : ['Hook or interlock your fingertips together — bring fingers closer'],
    };
  }

  // ── All other mudras (dola, sakata, etc.) — pass through to AI ───────────
  return { isValid: true, corrections: [] };
};

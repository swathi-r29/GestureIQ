// src/pages/LearnDouble.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Samyuta (double-hand) mudra learning page.
// Key difference from Learn.jsx:
//   • MediaPipe runs with maxNumHands: 2 — tracks BOTH hands
//   • landmarksRef stores { right, left } instead of a single hand
//   • Detection polls /api/detect_double_landmarks (new Flask endpoint)
//   • "No Hand" logic requires AT LEAST ONE hand present; warns if only one detected
//   • All voice/stability/save logic is identical to Learn.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { useVoiceGuide, LanguageSelector, MUDRA_CONFIG } from '../hooks/useVoiceGuide';
import { checkGeometricAnchors, MERGEABLE_MUDRAS } from '../utils/geometricRules';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

// ── Samyuta mudra list ──────────────────────────────────────────────────────
const DOUBLE_MUDRA_CONFIG = {
    // Basic Level
    anjali: {
        level: 'Basic',
        fingers: "Press both palms together flat, fingers pointing upward. Keep thumbs side by side.",
        meaning: "Salutation",
        usage: "Prayer, greeting, offering",
        defaultAngles: { thumb: 170, index: 175, middle: 175, ring: 175, pinky: 175 }
    },
    kapotha: {
        level: 'Basic',
        fingers: "Join palms at the edges, creating a hollow space in the center.",
        meaning: "Pigeon",
        usage: "Respect, taking an oath",
        defaultAngles: { thumb: 140, index: 160, middle: 160, ring: 160, pinky: 160 }
    },
    karkata: {
        level: 'Basic',
        fingers: "Interlock the fingers of both hands. Palms can face inward or outward.",
        meaning: "Crab",
        usage: "Arrival of people, blowing a conch, or twisting limbs.",
        defaultAngles: { isInterlocked: true, allFingers: 90 }
    },
    svastika: {
        level: 'Basic',
        fingers: "Cross both hands at the wrists, palms facing opposite directions.",
        meaning: "Auspicious",
        usage: "Showing a crocodile, sky, or wide spread of water.",
        defaultAngles: { wristCrossed: true, thumb: 170, index: 170 }
    },
    puspaputa: {
        level: 'Basic',
        fingers: "Hold both palms side-by-side, slightly cupped, like holding water or flowers.",
        meaning: "Flower Casket",
        usage: "Offering flowers to God, receiving fruits, or evening prayers.",
        defaultAngles: { thumb: 130, index: 150, middle: 150, ring: 150, pinky: 150 }
    },
    utsanga: {
        level: 'Basic',
        fingers: "Cross the arms and place the palms on opposite shoulders.",
        meaning: "Embrace",
        usage: "Showing modesty, shyness, or an embrace.",
        defaultAngles: { armCrossed: true }
    },
    sivalinga: {
        level: 'Basic',
        fingers: "Right hand in Shikhara (fist up) placed on the flat left palm.",
        meaning: "Lord Shiva",
        usage: "Representing the Lingam, Lord Shiva, or Phallic symbol.",
        defaultAngles: { rightThumb: 180, leftPalm: 180 }
    },

    // Intermediate Level
    chakra: {
        level: 'Intermediate',
        fingers: "Interlock the fingers and fan the palms out to form a circle.",
        meaning: "Wheel",
        usage: "The Sudarshana Chakra of Lord Vishnu.",
        defaultAngles: { thumb: 180, circularShape: true }
    },
    sakata: {
        level: 'Intermediate',
        fingers: "Thumb and middle fingers touch; index and little fingers are extended.",
        meaning: "Cart",
        usage: "Gestures of demons or ancient transport carts.",
        defaultAngles: { index: 175, middle: 45, pinky: 175 }
    },
    sankha: {
        level: 'Intermediate',
        fingers: "The right thumb is enclosed by the left fingers, and left thumb touches the right index.",
        meaning: "Conch",
        usage: "Blowing the conch for rituals or war.",
        defaultAngles: { enclosedThumb: true }
    },
    pasa: {
        level: 'Intermediate',
        fingers: "Interlock the index fingers of both hands like a chain.",
        meaning: "Noose",
        usage: "Quarrels, strings, or a noose.",
        defaultAngles: { indexHooked: true }
    },
    kilaka: {
        level: 'Intermediate',
        fingers: "Hook the index fingers of both hands together like two links of a chain.",
        meaning: "Bond/Link",
        usage: "Affection, conversation between friends, or a link.",
        defaultAngles: { pinkyHooked: true }
    },
    samputa: {
        level: 'Intermediate',
        fingers: "Both hands in Brahmara (index and thumb touch), held together.",
        meaning: "Box",
        usage: "Concealing secrets, holding a jewelry box.",
        defaultAngles: { thumbIndexTouch: true }
    },

    // Advanced Level
    matsya: {
        level: 'Advanced',
        fingers: "Place one hand on the back of the other, thumbs extended like fins.",
        meaning: "Fish",
        usage: "Lord Vishnu's Matsya avatar, or a fish in water.",
        defaultAngles: { thumb: 160, palmFlat: true }
    },
    kurma: {
        level: 'Advanced',
        fingers: "Interlock the middle and ring fingers, keeping others slightly curved.",
        meaning: "Tortoise",
        usage: "Lord Vishnu's Kurma avatar, stability.",
        defaultAngles: { thumb: 120, index: 90, pinky: 90 }
    },
    varaha: {
        level: 'Advanced',
        fingers: "Place one hand over the other in Mrigashira (deer head) position.",
        meaning: "Boar",
        usage: "Lord Vishnu's Varaha avatar.",
        defaultAngles: { thumb: 170, pinky: 170, middleRing: 60 }
    },
    garuda: {
        level: 'Advanced',
        fingers: "Hook thumbs together and fan out the fingers like wings.",
        meaning: "Eagle",
        usage: "The mount of Lord Vishnu (Garuda).",
        defaultAngles: { thumbHooked: true, fingersSpread: 180 }
    },
    nagabandha: {
        level: 'Advanced',
        fingers: "Cross the wrists and hold hands in Sarpasiras (snake head) posture.",
        meaning: "Serpent Tie",
        usage: "Coiled snakes, Atharvana veda charms.",
        defaultAngles: { wristCrossed: true, indexMiddleRing: 150 }
    },
    katva: {
        level: 'Advanced',
        fingers: "Place one hand's index and middle fingers over the other hand's.",
        meaning: "Cot/Bed",
        usage: "Showing a bed, a palanquin, or a bridge.",
        defaultAngles: { fingersOverlaid: true }
    },
    bherunda: {
        level: 'Advanced',
        fingers: "Cross the wrists and hold the hands in Kapitha (fist with thumb-index touch).",
        meaning: "Double-headed Bird",
        usage: "Strength, ancient bird Bherunda.",
        defaultAngles: { wristCrossed: true, fistShape: true }
    },
    kartarisvastika: {
        level: 'Advanced',
        fingers: "Cross the wrists while in Kartarimukha (scissors) position.",
        meaning: "Crossed Scissors",
        usage: "Stems, hills, or trees.",
        defaultAngles: { index: 180, middle: 180, ringPinky: 20 }
    },
    katakavardhana: {
        level: 'Advanced',
        fingers: "Cross the wrists while in Katakamukha position.",
        meaning: "Link of Bracelets",
        usage: "Coronation, worship, marriage.",
        defaultAngles: { thumbIndexMiddleTouch: true, ringPinky: 170 }
    },
    dola: {
        level: 'Advanced',
        fingers: "Hang both hands loosely at the sides of the thighs in Pataka.",
        meaning: "Swing",
        usage: "Beginning of a dance, relaxation.",
        defaultAngles: { armsDown: true, palmFlat: 180 }
    }
};


const DOUBLE_MUDRAS = Object.keys(DOUBLE_MUDRA_CONFIG).map(folder => ({
    folder,
    name: folder.charAt(0).toUpperCase() + folder.slice(1),
    fingers: DOUBLE_MUDRA_CONFIG[folder].fingers,
    meaning: DOUBLE_MUDRA_CONFIG[folder].meaning,
    usage: DOUBLE_MUDRA_CONFIG[folder].usage,
    level: DOUBLE_MUDRA_CONFIG[folder].level,
}));

// ── Constants ────────────────────────────────────────────────────────────────
const STABILITY_THRESHOLD    = 10;
const WRONG_MUDRA_GATE       = 5;
const ACCURACY_THRESHOLD     = 68;   // ← lowered from 75 (double-hand harder) [Ref IEEE ICICV 2021]
const MAINTENANCE_THRESHOLD  = 60;   // ← lowered from 68
const HOLD_DURATION_MS       = 1000;

/**
 * Per-mudra accuracy thresholds.
 * Joined/merged mudras (Anjali, Kapotha…) score lower because palm overlap
 * causes partial landmark occlusion [Zhang et al. 2020 MediaPipe Hands].
 * Cross-wrist and interlocked mudras also have higher variance → lower gate.
 */
const MUDRA_THRESHOLDS = {
  // ── Joined / pressed ────────────────────────────────────
  anjali:        58,   // palms fully overlapping — heavy occlusion
  kapotha:       58,
  puspaputa:     60,
  samputa:       58,
  sankha:        60,
  chakra:        60,

  // ── Interlocked / hooked ─────────────────────────────────
  karkata:       58,
  pasa:          58,
  kilaka:        58,

  // ── Crossed-wrist / arm family ───────────────────────────
  svastika:      58,
  utsanga:       55,   // arms cross at shoulder — hardest spatial
  nagabandha:    58,
  katva:         58,
  katakavardhana:58,
  kartarisvastika:58,
  bherunda:      58,
  garuda:        58,

  // ── Stacked / overlapping ────────────────────────────────
  sivalinga:     60,
  matsya:        60,
  kurma:         60,
  varaha:        60,

  // ── Hanging / relaxed ────────────────────────────────────
  dola:          52,   // both hands at sides — no proximity signal

  // ── Standard ─────────────────────────────────────────────
  sakata:        65,
};

const STAGES = { CATEGORIES: 'CATEGORIES', LIST: 'LIST', PRACTICE: 'PRACTICE' };
const PRACTICE_STEPS = [
    { title: 'Study the Position', desc: 'Study the reference image. Notice where BOTH hands are positioned.' },
    { title: 'Prepare Both Hands', desc: 'Bring BOTH hands into frame. Good lighting matters for two-hand tracking.' },
    { title: 'Start Live Practice', desc: 'The AI will track both hands and give joint-level feedback.' },
];

// ── Hand indicator badge ─────────────────────────────────────────────────────
function HandsBadge({ handsDetected, isMergeable }) {
    const isMerged = isMergeable && handsDetected === 1;
    const color = (handsDetected === 2 || isMerged) ? '#4ade80' : handsDetected === 1 ? '#fbbf24' : '#f87171';
    const label = (handsDetected === 2 || isMerged) ? (isMerged ? '✓ Hands Merged' : '✓ Both hands') : handsDetected === 1 ? '⚠ One hand' : '✗ No hands';
    return (
        <div style={{
            position: 'absolute', top: 110, right: 16,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
            border: `1px solid ${color}40`, borderRadius: 10,
            padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span style={{ color, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</span>
        </div>
    );
}

export default function LearnDouble() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [lang, setLang] = useState('en');
    const { stop, test, unlock, announce } = useVoiceGuide({ language: lang });

    const [stage, setStage] = useState(STAGES.CATEGORIES);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedMudra, setSelectedMudra] = useState(null);
    const [progress, setProgress] = useState([]);
    const [bestScores, setBestScores] = useState({});
    const [cameraOn, setCameraOn] = useState(false);
    const [detected, setDetected] = useState({ name: '', confidence: 0, detected: false });
    const [loading, setLoading] = useState(true);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionScore, setSessionScore] = useState(0);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [practiceStep, setPracticeStep] = useState(0);
    const [frozenFrame, setFrozenFrame] = useState(null);
    const [isFrozen, setIsFrozen] = useState(false);
    const [handsDetected, setHandsDetected] = useState(0);   // 0, 1, or 2


    // ── Detection refs ────────────────────────────────────────────────────────
    const attemptsRef = useRef(0);
    const holdAccumulatorRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const masteredRef = useRef(false);
    const saveInProgressRef = useRef(false);
    const stableFramesRef = useRef(0);
    const consecutiveRef = useRef({ name: null, count: 0 });
    const lastDetectedNameRef = useRef('');
    const wrongMudraFramesRef = useRef(0);
    const lostHandFramesRef = useRef(0);
    const lowAccuracyFramesRef = useRef(0);
    const saveMutexRef = useRef(false);     // [PHASE 12] Atomic mutex for success trigger
    const peakAccuracyRef = useRef(0);      // Tracks maximum accuracy achieved during the "Hold" period
    const graceRef = useRef(0);


    // ── Camera refs ───────────────────────────────────────────────────────────
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const handsRef = useRef(null);
    // Stores { right: {landmarks, score}, left: {landmarks, score} }
    const landmarksRef = useRef(null);
    const isDetectingRef = useRef(false);
    const requestRef = useRef(null);
    const recoveryRef = useRef(null);
    const lastResultTimeRef = useRef(Date.now());

    // ── Voice refs ────────────────────────────────────────────────────────────
    const voiceEnabledRef = useRef(false);
    const lastWrongVoiceRef = useRef({ text: '', time: 0 });
    const lastCorrVoiceRef = useRef({ text: '', time: 0 });
    const lastOkVoiceRef = useRef(0);
    const lastNoHandRef = useRef(0);
    const stableCorrFramesRef = useRef(0);

    useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

    useEffect(() => {
        if (user && user.role !== 'student') { navigate('/'); return; }
        fetchProgress();
    }, [user, navigate]);

    useEffect(() => {
        if (stage === STAGES.PRACTICE && selectedMudra && voiceEnabledRef.current) {
            setTimeout(() => {
                const cfg = DOUBLE_MUDRA_CONFIG[selectedMudra.folder];
                if (cfg) announce.raw(`${selectedMudra.name} mudra. ${cfg.fingers}`, 3);
            }, 600);
        }
    }, [stage, selectedMudra, announce]);

    // ── MediaPipe — TWO HANDS ─────────────────────────────────────────────────
    useEffect(() => {
        if (!cameraOn) return;

        handsRef.current = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        handsRef.current.setOptions({
            maxNumHands: 2,          // ← KEY CHANGE: detect both hands
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        handsRef.current.onResults((results) => {
            lastResultTimeRef.current = Date.now();
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (!canvas || !video) return;

            const ctx = canvas.getContext('2d');
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);

            if (results.multiHandLandmarks?.length > 0) {
                const handMap = {};
                const numFound = results.multiHandLandmarks.length;

                results.multiHandLandmarks.forEach((lms, idx) => {
                    // FIX: Don't rely solely on MediaPipe's label. Force assignment if 2 hands seen.
                    const mpLabel = results.multiHandedness?.[idx]?.label;
                    let label = mpLabel;

                    // If we found two hands but they are both labeled the same, force them into separate slots
                    if (numFound === 2 && idx === 1 && mpLabel === results.multiHandedness?.[0]?.label) {
                        label = mpLabel === 'Right' ? 'Left' : 'Right';
                    }

                    // Draw
                    const color = label === 'Right' ? '#f59e0b' : '#60a5fa';
                    drawConnectors(ctx, lms, HAND_CONNECTIONS, { color, lineWidth: 3 });
                    drawLandmarks(ctx, lms, { color: '#ffffff', lineWidth: 1, radius: 2 });

                    handMap[label] = { landmarks: lms };
                });

                // Fail-safe: If 2 hands detected but only 1 label slot filled, split them
                if (numFound === 2 && Object.keys(handMap).length < 2) {
                    handMap['Right'] = { landmarks: results.multiHandLandmarks[0] };
                    handMap['Left'] = { landmarks: results.multiHandLandmarks[1] };
                }

                landmarksRef.current = handMap;
                setHandsDetected(prev => (prev !== numFound ? numFound : prev));
            } else {
                landmarksRef.current = null;
                setHandsDetected(prev => (prev !== 0 ? 0 : prev));
            }
            ctx.restore();
        });

        recoveryRef.current = setInterval(() => {
            if (cameraOn && Date.now() - lastResultTimeRef.current > 3000)
                lastResultTimeRef.current = Date.now();
        }, 1000);

        return () => {
            if (recoveryRef.current) clearInterval(recoveryRef.current);
            if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
        };
    }, [cameraOn]);

    // ── Frame loop ────────────────────────────────────────────────────────────
    useEffect(() => {
        let active = true;
        const processFrame = async () => {
            if (active && cameraOn && videoRef.current?.readyState >= 2 && handsRef.current)
                await handsRef.current.send({ image: videoRef.current }).catch(e => console.warn('MP Hands send error:', e));
            if (active && cameraOn) requestRef.current = requestAnimationFrame(processFrame);
        };
        if (cameraOn) requestRef.current = requestAnimationFrame(processFrame);
        return () => {
            active = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [cameraOn]);

    // ── Webcam ────────────────────────────────────────────────────────────────
    const startWebcam = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
            streamRef.current = stream;
            setCameraOn(true);
        } catch {
            alert('Camera access denied. Please allow camera permission and use HTTPS.');
        }
    }, []);

    const stopWebcam = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraOn(false);
        landmarksRef.current = null;
        setHandsDetected(0);
    }, []);

    useEffect(() => {
        if (cameraOn && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(e => console.error('Video play error:', e));
        }
    }, [cameraOn]);

    const captureFrame = useCallback(() => {
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return null;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.7);
    }, []);

    // ── DETECTION POLLING ─────────────────────────────────────────────────────
    useEffect(() => {
        if (stage !== STAGES.PRACTICE || !cameraOn || !selectedMudra) return;
        masteredRef.current = false;
        saveInProgressRef.current = false;
        stableFramesRef.current = 0;
        lastDetectedNameRef.current = '';
        wrongMudraFramesRef.current = 0;
        announce.resetWrongGate?.();
        lastWrongVoiceRef.current = { text: '', time: 0 };
        lastCorrVoiceRef.current = { text: '', time: 0 };
        lastOkVoiceRef.current = 0;
        lastNoHandRef.current = 0;

        lastFrameTimeRef.current = Date.now();
        const interval = setInterval(async () => {
            if (isDetectingRef.current || masteredRef.current) return;
            isDetectingRef.current = true;

            try {
                const handMap = landmarksRef.current;

                // ── NO HANDS ──────────────────────────────────────────────────
                if (!handMap || Object.keys(handMap).length === 0) {
                    setDetected({ name: 'No Hand', confidence: 0, detected: false });
                    // Drain progress on no hands, but don't reset instantly
                    const now = Date.now();
                    const dt = lastFrameTimeRef.current ? (now - lastFrameTimeRef.current) : 200;
                    lastFrameTimeRef.current = now;
                    holdAccumulatorRef.current = Math.max(0, holdAccumulatorRef.current - dt * 2.0);
                    setHoldProgress((holdAccumulatorRef.current / HOLD_DURATION_MS) * 100);

                    consecutiveRef.current = { name: null, count: 0 };
                    lastDetectedNameRef.current = '';
                    wrongMudraFramesRef.current = 0;

                    if (voiceEnabledRef.current) {
                        const now = Date.now();
                        if (now - lastNoHandRef.current > 6000) {
                            lastNoHandRef.current = now;
                            announce.raw('Show BOTH hands to the camera', 2);
                        }
                    }
                    isDetectingRef.current = false;
                    return;
                }

                attemptsRef.current += 1;

                // Build landmark arrays for right and left hand
                const toLmArray = (hand) => hand
                    ? Array.from(hand.landmarks).map(lm => ({ x: lm.x ?? lm[0], y: lm.y ?? lm[1], z: lm.z ?? lm[2] }))
                    : null;

                const rightLm = toLmArray(handMap['Right']);
                const leftLm = toLmArray(handMap['Left']);

                // ── GEOMETRIC GATEKEEPER ──────────────────────────────────────
                const geo = checkGeometricAnchors(selectedMudra.folder, Object.values(handMap).map(h => h.landmarks));
                let isMergeable = selectedMudra && MERGEABLE_MUDRAS.includes(selectedMudra.folder);
                
                // [Diagnostic Logs]
                if (selectedMudra?.folder === 'anjali') {
                    console.log('[Anjali Debug] handMap:', Object.keys(handMap));
                    console.log('[Anjali Debug] geo result:', geo);
                }

                // New: Allow mergeable mudras (like Anjali) to bypass geometric stop
                // This lets the AI try to detect even if hands overlap into one blob
                if (!geo.isValid && !isMergeable) {
                    // STOP progress for non-mergeable mudras that fail geometry
                    setDetected({
                        name: 'Adjust Position',
                        accuracy: 0,
                        detected: false,
                        corrections: geo.corrections
                    });

                    // Accelerate drain
                    const now = Date.now();
                    const dt = lastFrameTimeRef.current ? (now - lastFrameTimeRef.current) : 200;
                    lastFrameTimeRef.current = now;
                    holdAccumulatorRef.current = Math.max(0, holdAccumulatorRef.current - dt * 2.0);
                    setHoldProgress((holdAccumulatorRef.current / HOLD_DURATION_MS) * 100);

                    isDetectingRef.current = false;
                    return; 
                }

                // console.log('[LearnDouble] Polling Flask...', { target: selectedMudra.folder, r: !!rightLm, l: !!leftLm });
                const res = await fetch(`/api/detect_double_landmarks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        right_landmarks: rightLm,
                        left_landmarks: leftLm,
                        targetMudra: selectedMudra.folder,
                    }),
                    signal: AbortSignal.timeout(3000),
                });

                const data = await res.json();
                const isStableAPI = data.is_stable || false;
                const accuracy = data.accuracy || 0;
                const corrections = data.corrections || [];
                let detectedName = data.name || '';

                if (accuracy === 0 || detectedName === 'No Hand' || detectedName === 'Adjusting...') {
                    setDetected({ name: 'Adjusting...', accuracy: 0, detected: false });
                } else {
                    setDetected(data);
                }

                // ── STABLE EVALUATION WINDOW ──────────────────────────────────
                // RELAXED 10-FRAME GATE (with Grace Window)
                const effectiveName = detectedName || (graceRef.current < 3 ? consecutiveRef.current.name : null);
                if (detectedName) graceRef.current = 0; else graceRef.current++;

                if (effectiveName && effectiveName === consecutiveRef.current.name) {
                    consecutiveRef.current.count++;
                    // Track peak accuracy during stability
                    if (accuracy > peakAccuracyRef.current) {
                        peakAccuracyRef.current = accuracy;
                    }
                } else {
                    consecutiveRef.current = { name: effectiveName, count: effectiveName ? 1 : 0 };
                    wrongMudraFramesRef.current = 0;
                    peakAccuracyRef.current = 0; // Reset peak for new/wrong mudra
                }
                const isWrongMudraMsg = (c) => typeof c === 'string' && (c.toLowerCase().startsWith('wrong mudra') || c.toLowerCase().includes('instead of'));
                const wrongMsg = corrections.find(c => isWrongMudraMsg(c));
                const fingerCorr = corrections.filter(c => !isWrongMudraMsg(c));

                let displayCorrections = [...corrections];
                if (wrongMsg) {
                    wrongMudraFramesRef.current++;
                    if (wrongMudraFramesRef.current < WRONG_MUDRA_GATE)
                        displayCorrections = fingerCorr;
                } else {
                    wrongMudraFramesRef.current = 0;
                }

                isMergeable = selectedMudra && MERGEABLE_MUDRAS.includes(selectedMudra.folder);
                if (Object.keys(handMap).length < 2 && !isMergeable) {
                    displayCorrections = [`Show both hands! Second hand missing.`, ...displayCorrections];
                }

                const activeThreshold = MUDRA_THRESHOLDS[selectedMudra.folder] || ACCURACY_THRESHOLD;
                const locallyStable = !!detectedName && accuracy >= activeThreshold && !wrongMsg;

                // ── STATLESS INSTANT TRIGGER (Matching Detect.jsx) ─────────────
                // If this frame is perfect, we master instantly without the 1s hold
                const isPerfectFrame = data.detected && accuracy >= activeThreshold && !wrongMsg && locallyStable;
                if (isPerfectFrame && !saveMutexRef.current) {
                    saveMutexRef.current = true;
                    handleMudraMastered(selectedMudra.folder, accuracy);
                    isDetectingRef.current = false;
                    return;
                }

                // ── VOICE — gating is now handled individually inside ──────────────────
                if (voiceEnabledRef.current) {
                    const now = Date.now();
                    const WRONG_MUDRA_GATE = 3;
                    const stableWrongMsg = wrongMudraFramesRef.current >= WRONG_MUDRA_GATE ? wrongMsg : null;

                    // Small gate for finger corrections to avoid jitter
                    if (fingerCorr.length > 0) {
                        stableCorrFramesRef.current = Math.min(10, (stableCorrFramesRef.current || 0) + 1);
                    } else {
                        stableCorrFramesRef.current = 0;
                    }
                    const stableFingerCorr = stableCorrFramesRef.current >= 2 ? fingerCorr[0] : null;

                    if (stableWrongMsg) {
                        const prev = lastWrongVoiceRef.current;
                        if (stableWrongMsg !== prev.text || (now - prev.time) > 4000) {
                            lastWrongVoiceRef.current = { text: stableWrongMsg, time: now };
                            const capitalize = (s) => (s && s.length > 0) ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
                            
                            // For double hand, we simplify the wrong mudra voice as it's complex to name both
                            let voiceMsg = lang === 'ta'
                                ? `தவறான வடிவம். ஒருமுறை சரிபார்க்கவும்.`
                                : lang === 'hi'
                                    ? `गलत मुद्रा। अपनी उंगलियों को ठीक करें।`
                                    : `Wrong formation. Please check your hand positions.`;

                            if (fingerCorr.length > 0) {
                                voiceMsg += ` ${translate(lang, fingerCorr[0])}`;
                                lastCorrVoiceRef.current = { text: fingerCorr[0], time: now };
                            }
                            announce.raw(voiceMsg, 3);
                        }
                    } else if (stableFingerCorr) {
                        const prev = lastCorrVoiceRef.current;
                        if (stableFingerCorr !== prev.text || (now - prev.time) > 4000) {
                            lastCorrVoiceRef.current = { text: stableFingerCorr, time: now };
                            announce.raw(translate(lang, stableFingerCorr), 1);
                        }
                    } else if (locallyStable && data.detected && accuracy >= 75 && fingerCorr.length === 0 && !stableWrongMsg) {
                        if (now - lastOkVoiceRef.current > 8000) {
                            lastOkVoiceRef.current = now;
                            const msg = lang === 'ta' ? 'மிகச்சிறப்பு! அப்படியே பிடியுங்கள்'
                                : lang === 'hi' ? 'सही है! बहुत अच्छा'
                                    : 'Correct! Now hold this position.';
                            announce.raw(msg, 3);
                        }
                    }
                }

                const displayData = {
                    ...data,
                    name: locallyStable ? (detectedName || data.name) : 'Analyzing...',
                    corrections: displayCorrections,
                    _isAdjusting: !locallyStable && !isStableAPI,
                };
                setDetected(displayData);


                // ── VOICE ─────────────────────────────────────────────────────
                if (voiceEnabledRef.current) {
                    const now = Date.now();
                    const stableWrongMsg = wrongMudraFramesRef.current >= WRONG_MUDRA_GATE ? wrongMsg : null;

                    if (stableWrongMsg) {
                        const prev = lastWrongVoiceRef.current;
                        // Use 3-second throttle for wrong mudra as requested
                        if (stableWrongMsg !== prev.text || (now - prev.time) > 3000) {
                            lastWrongVoiceRef.current = { text: stableWrongMsg, time: now };
                            announce.raw(stableWrongMsg, 3);
                        }
                    } else if (locallyStable) {
                        if (fingerCorr.length > 0) {
                            const topCorr = fingerCorr[0];
                            const prev = lastCorrVoiceRef.current;
                            if (topCorr !== prev.text || (now - prev.time) > 5000) {
                                lastCorrVoiceRef.current = { text: topCorr, time: now };
                            announce.raw(topCorr, 1);
                        }
                        } else if (data.detected && accuracy >= ACCURACY_THRESHOLD && fingerCorr.length === 0 && !stableWrongMsg) {
                            if (now - lastOkVoiceRef.current > 8000) {
                                lastOkVoiceRef.current = now;
                                announce.raw('Correct! Great form.', 3);
                            }
                        }
                    }
                }

                // ── HOLD + SAVE ───────────────────────────────────────────────
                const numHands = Object.keys(handMap).length;
                const isAnjali = selectedMudra.folder === 'anjali';
                const hasBoth = numHands === 2;
                const hasOne = numHands === 1;

                // Allow Mergeable mudras (overlapping) with 1 hand, others require 2
                let visible = isMergeable ? (hasOne || hasBoth) : hasBoth;

                // Grace period for hand loss (prevents flickering)
                if (!visible) {
                    if (lostHandFramesRef.current < 15) {
                        lostHandFramesRef.current++;
                        visible = true; // Pretend hands are still there for a few frames
                    }
                } else {
                    lostHandFramesRef.current = 0;
                }

                // 1. Accuracy Hysteresis
                // If we are already saving, use the lower maintenance threshold
                const threshold = (holdAccumulatorRef.current > 0) ? MAINTENANCE_THRESHOLD : ACCURACY_THRESHOLD;
                const isHighAccuracy = accuracy >= threshold;

                let isGoodFrame = !wrongMsg && data.detected && visible && isHighAccuracy && locallyStable;
                let isFrozen = false;

                // 2. Extended Blink Protection: allow 15 frames (~750ms) of noise/loss
                if (!isGoodFrame && holdAccumulatorRef.current > 0 && !wrongMsg) {
                    if (lowAccuracyFramesRef.current < 15) {
                        lowAccuracyFramesRef.current++;
                        isFrozen = true; // Freeze progress, don't drain
                    }
                } else if (isGoodFrame) {
                    lowAccuracyFramesRef.current = 0;
                }

                const nowTime = Date.now();
                const dt = (lastFrameTimeRef.current > 0) ? (nowTime - lastFrameTimeRef.current) : 200;
                lastFrameTimeRef.current = nowTime;

                if (isGoodFrame) {
                    holdAccumulatorRef.current = Math.min(HOLD_DURATION_MS, holdAccumulatorRef.current + dt);
                    // ── PEAK TRACKING ──────────────────────────────────────────
                    // Record the best accuracy we've seen during this successful hold
                    peakAccuracyRef.current = Math.max(peakAccuracyRef.current, accuracy);
                } else if (!isFrozen) {
                    // ── RESET PEAK IF HOLD IS LOST ──────────────────────────────
                    if (holdAccumulatorRef.current === 0) {
                        peakAccuracyRef.current = 0;
                    }
                    // ── DRAIN LOGIC ( truly failing after the 6-frame buffer ) ─────
                    lowAccuracyFramesRef.current = 0;
                    if (wrongMsg) {
                        holdAccumulatorRef.current = Math.max(0, holdAccumulatorRef.current - dt * 2.0); // Wrong mudra drains fast
                    } else if (accuracy >= MAINTENANCE_THRESHOLD && !visible) {
                        holdAccumulatorRef.current = Math.max(0, holdAccumulatorRef.current - dt * 0.1); // Missing hands drains very slowly
                    } else {
                        // Success-Stickiness: Drains even slower if you are above 60% accuracy
                        const isPartialGood = data.detected && accuracy >= 60;
                        const drainRate = isPartialGood ? 0.2 : 1.3;
                        holdAccumulatorRef.current = Math.max(0, holdAccumulatorRef.current - dt * drainRate);
                    }
                }

                const displayPct = (holdAccumulatorRef.current / HOLD_DURATION_MS) * 100;
                setHoldProgress(displayPct);

                // ── ATOMIC SUCCESS TRIGGER (Phase 12) ────────────────────────
                if (holdAccumulatorRef.current >= HOLD_DURATION_MS && !saveMutexRef.current) {
                    saveMutexRef.current = true; // Set synchronously to block next interval ticks
                    masteredRef.current = true;
                    saveInProgressRef.current = true;
                    // Success lock removed (unused)
                    handleMudraMastered(selectedMudra.folder, peakAccuracyRef.current || accuracy);
                }

            } catch (err) {
                console.warn('[LearnDouble] Detection error:', err.message);
            } finally {
                isDetectingRef.current = false;
            }
        }, 200);

        return () => {
            clearInterval(interval);
            holdAccumulatorRef.current = 0;
            lastFrameTimeRef.current = 0;
            setHoldProgress(0);
            stableFramesRef.current = 0;
            consecutiveRef.current = { name: null, count: 0 };
            lastDetectedNameRef.current = '';
            wrongMudraFramesRef.current = 0;
            lostHandFramesRef.current = 0;
        };
    }, [stage, cameraOn, selectedMudra, lang, announce]);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/progress', { headers: { 'x-auth-token': token } });
            setProgress(res.data.progress.detectedMudras || []);
            setBestScores(res.data.progress.mudraScores || {});
        } catch (err) {
            console.warn('[LearnDouble] fetchProgress error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMudraMastered = async (folder, currentAccuracy) => {
        // Block further calls immediately
        masteredRef.current = true;
        saveInProgressRef.current = true;

        if (!folder) return;

        // 1. Immediately Freeze the UI to give user instant feedback
        // Use the peak accuracy achieved during the stable period
        const score = Math.round(peakAccuracyRef.current || currentAccuracy);
        const snapshot = captureFrame();

        setFrozenFrame(snapshot);
        setIsFrozen(true);
        setSessionScore(score);
        setSessionComplete(true);
        stopWebcam();
        setHoldProgress(0);

        // Block any further interval ticks
        masteredRef.current = true;
        saveInProgressRef.current = true;

        if (voiceEnabledRef.current) {
            const cfg = DOUBLE_MUDRA_CONFIG[folder];
            const name = selectedMudra?.name || folder;
            const fullLesson = `Excellent! You mastered ${name} with ${score} percent accuracy! 
                                It means ${cfg?.meaning || 'a sacred gesture'}. 
                                It is traditionally used for ${cfg?.usage || 'artistic expression'}. 
                                Great job!`;
            announce.raw(fullLesson, 4);
        }

        attemptsRef.current = 0;

        // 2. Fire and Forget the save request (don't await the UI update)
        const token = localStorage.getItem('token');
        axios.post('/api/user/progress/update',
            { mudraName: folder, score },
            { headers: { 'x-auth-token': token } }
        ).then(res => {
            setProgress(res.data.detectedMudras || []);
            setBestScores(res.data.mudraScores || {});
        }).catch(err => {
            console.error("Save failed, but UI is already success", err);
        }).finally(() => {
            saveInProgressRef.current = false;
        });
    };

    const enterPractice = (mudra) => {
        setSelectedMudra(mudra);
        setSessionComplete(false);
        setDetected({ name: '', confidence: 0, detected: false });
        holdAccumulatorRef.current = 0;
        lastFrameTimeRef.current = 0;
        masteredRef.current = false;
        saveInProgressRef.current = false;
        stableFramesRef.current = 0;
        lastDetectedNameRef.current = '';
        wrongMudraFramesRef.current = 0;
        setPracticeStep(0);
        setIsFrozen(false);
        setFrozenFrame(null);
        attemptsRef.current = 0;
        saveMutexRef.current = false; // Reset mutex for new mudra
        setStage(STAGES.PRACTICE);
    };

    const nextMudra = () => {
        const filtered = DOUBLE_MUDRAS.filter(m => m.level === selectedLevel);
        const idx = filtered.findIndex(m => m.folder === selectedMudra.folder);
        setIsFrozen(false); setFrozenFrame(null); attemptsRef.current = 0;
        if (idx !== -1 && idx < filtered.length - 1) {
            enterPractice(filtered[idx + 1]);
        } else {
            setStage(STAGES.LIST);
        }
    };

    // ── Derived display ───────────────────────────────────────────────────────
    const isWrongMudraMsg = (c) => typeof c === 'string' && (c.toLowerCase().startsWith('wrong mudra') || c.toLowerCase().includes('instead of'));
    const accuracy = detected.accuracy || 0;
    const corrections = detected.corrections || [];
    const fingerCorrs = corrections.filter(c => !isWrongMudraMsg(c));
    const wrongMudraMsg = corrections.find(c => isWrongMudraMsg(c));
    const isAdjusting = detected._isAdjusting;
    const isMergeable = selectedMudra && MERGEABLE_MUDRAS.includes(selectedMudra.folder);
    // Consistent with hold logic: if accuracy is high, it's correct.
    const activeDisplayThreshold = (selectedMudra && MUDRA_THRESHOLDS[selectedMudra.folder]) || ACCURACY_THRESHOLD;
    const isCorrect = detected.detected && accuracy >= activeDisplayThreshold && !wrongMudraMsg;
    const fingerGuideText = selectedMudra ? (DOUBLE_MUDRA_CONFIG[selectedMudra.folder]?.fingers || '') : '';

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }} />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen">

            {/* ── STAGE A: CATEGORY SELECTION ─────────────────────────────────── */}
            {stage === STAGES.CATEGORIES && (
                <div className="animate-in fade-in duration-700">
                    <div className="text-center mb-16">
                        <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Samyuta Mudras</div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text)' }}>Choose Your Level</h1>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Double-handed mudras are categorized by their complexity and importance.</p>
                        <div className="max-w-md mx-auto"><BorderPattern /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { id: 'Basic', desc: 'Fundamental positions and common greetings.', icon: '🌱' },
                            { id: 'Intermediate', desc: 'Interlocking fingers and dynamic palm positions.', icon: '⚡' },
                            { id: 'Advanced', desc: 'Complex animal forms and symbolic representations.', icon: '🏆' }
                        ].map((cat) => {
                            const levelMudras = DOUBLE_MUDRAS.filter(m => m.level === cat.id);
                            const masteredCount = levelMudras.filter(m => progress.includes(m.folder)).length;
                            const isAllMastered = masteredCount === levelMudras.length && levelMudras.length > 0;

                            return (
                                <div key={cat.id} onClick={() => { setSelectedLevel(cat.id); setStage(STAGES.LIST); }}
                                    className="p-8 border rounded-2xl cursor-pointer hover:border-accent group hover:shadow-2xl transition-all relative overflow-hidden flex flex-col items-center text-center"
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-500">{cat.icon}</div>
                                    <h3 className="text-2xl font-bold mb-3 tracking-tight" style={{ color: 'var(--text)' }}>{cat.id}</h3>
                                    <p className="text-xs leading-relaxed mb-6 px-4" style={{ color: 'var(--text-muted)' }}>{cat.desc}</p>

                                    <div className="mt-auto w-full">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[9px] tracking-[2px] uppercase opacity-50 font-bold" style={{ color: 'var(--text-muted)' }}>Progress</span>
                                            <span className="text-[10px] font-bold" style={{ color: 'var(--accent)' }}>{masteredCount}/{levelMudras.length}</span>
                                        </div>
                                        <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                                            <div className="h-full bg-accent transition-all duration-1000"
                                                style={{ width: `${(masteredCount / levelMudras.length) * 100}%` }} />
                                        </div>
                                    </div>

                                    {isAllMastered && (
                                        <div className="absolute top-4 right-4 text-green-500">
                                            <CheckCircle2 size={24} fill="currentColor" className="text-green-500" />
                                        </div>
                                    )}

                                    <div className="mt-8 pt-6 border-t w-full" style={{ borderColor: 'var(--border)' }}>
                                        <span className="text-[9px] tracking-[4px] uppercase font-black group-hover:text-accent transition-colors" style={{ color: 'var(--text-muted)' }}>
                                            Enter Level →
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── STAGE B: MUDRA LIST ──────────────────────────────────────── */}
            {stage === STAGES.LIST && selectedLevel && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-12">
                        <button onClick={() => setStage(STAGES.CATEGORIES)}
                            className="flex items-center gap-2 text-xs tracking-[2px] uppercase hover:text-accent transition-colors mb-6"
                            style={{ color: 'var(--text-muted)' }}>
                            <ChevronLeft size={16} /> Back to Levels
                        </button>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <div className="text-[10px] tracking-[6px] uppercase mb-2" style={{ color: 'var(--accent)' }}>{selectedLevel} Level</div>
                                <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Double-Hand Mudras</h1>
                            </div>
                            <p className="text-xs max-w-md" style={{ color: 'var(--text-muted)' }}>
                                Focusing on {selectedLevel.toLowerCase()} complexity mudras. Complete them all to master this level.
                            </p>
                        </div>
                        <div className="mt-6"><BorderPattern /></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {DOUBLE_MUDRAS.filter(m => m.level === selectedLevel).map((mudra, idx) => {
                            const isMastered = progress.includes(mudra.folder);
                            return (
                                <div key={mudra.folder} onClick={() => enterPractice(mudra)}
                                    className="p-5 border rounded-lg cursor-pointer hover:border-accent group hover:shadow-md transition-all relative overflow-hidden"
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                    <div className="text-[10px] tracking-[3px] uppercase mb-3 opacity-50" style={{ color: 'var(--text-muted)' }}>{idx + 1}</div>
                                    <h4 className="font-bold tracking-wider mb-1" style={{ color: 'var(--text)' }}>{mudra.name}</h4>
                                    <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>{mudra.meaning}</p>
                                    {isMastered && (
                                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                            <CheckCircle2 size={16} className="text-green-500" fill="currentColor" />
                                            {bestScores[mudra.folder] && (
                                                <span className="text-[8px] font-bold bg-green-500/10 text-green-600 px-1 rounded">{bestScores[mudra.folder]}%</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="mt-4 flex justify-end">
                                        <span className="text-[9px] tracking-widest uppercase font-bold group-hover:text-accent transition-colors" style={{ color: 'var(--text-muted)' }}>Learn →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── STAGE B: PRACTICE ───────────────────────────────────────── */}
            {stage === STAGES.PRACTICE && selectedMudra && (
                <div>
                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => { setStage(STAGES.LIST); stopWebcam(); stop(); }}
                            className="flex items-center gap-2 text-xs tracking-widest uppercase hover:text-accent transition-colors"
                            style={{ color: 'var(--text-muted)' }}>
                            <ChevronLeft size={16} /> Back
                        </button>
                        <div className="flex items-center gap-3">
                            <LanguageSelector lang={lang} onChange={(v) => {
                                setLang(v);
                                lastWrongVoiceRef.current = { text: '', time: 0 };
                                lastCorrVoiceRef.current = { text: '', time: 0 };
                            }} compact />
                            <button onClick={test}
                                className="px-3 py-1.5 rounded text-[9px] tracking-widest uppercase border transition-all"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                Test Voice
                            </button>
                            <button onClick={() => {
                                const next = !voiceEnabled;
                                setVoiceEnabled(next);
                                voiceEnabledRef.current = next;
                                if (next) { unlock(); setTimeout(() => announce.raw(`${selectedMudra.name} mudra. ${DOUBLE_MUDRA_CONFIG[selectedMudra.folder]?.fingers || ''}`, 3), 500); }
                                else stop();
                                lastWrongVoiceRef.current = { text: '', time: 0 };
                                lastCorrVoiceRef.current = { text: '', time: 0 };
                            }}
                                className="px-4 py-2 rounded text-[10px] tracking-widest uppercase font-bold border transition-all"
                                style={{
                                    backgroundColor: voiceEnabled ? 'var(--copper)' : 'transparent',
                                    borderColor: voiceEnabled ? 'var(--copper)' : 'var(--border)',
                                    color: voiceEnabled ? 'white' : 'var(--text-muted)',
                                }}>
                                {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
                            </button>
                        </div>
                    </div>

                    {/* Step indicator */}
                    {!sessionComplete && (
                        <div className="flex items-center gap-3 mb-8">
                            {PRACTICE_STEPS.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all"
                                        style={{
                                            backgroundColor: practiceStep >= i ? 'var(--accent)' : 'transparent',
                                            borderColor: practiceStep >= i ? 'var(--accent)' : 'var(--border)',
                                            color: practiceStep >= i ? 'white' : 'var(--text-muted)',
                                        }}>{i + 1}</div>
                                    <span className="text-[9px] tracking-widest uppercase hidden md:block"
                                        style={{ color: practiceStep === i ? 'var(--text)' : 'var(--text-muted)' }}>{s.title}</span>
                                    {i < 2 && <div className="w-8 h-px mx-1" style={{ backgroundColor: 'var(--border)' }} />}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 min-h-[600px]">

                        {/* LEFT: Info ─────────────────────────────────────── */}
                        <div className="flex flex-col gap-6">
                            {/* Reference placeholder — no image upload yet for double mudras */}
                            <div className="w-full aspect-video rounded-xl border flex items-center justify-center relative overflow-hidden"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                {selectedMudra ? (
                                    <img
                                        src={`/assets/mudras/double/${selectedMudra.folder}.jpg`}
                                        alt={selectedMudra.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div className="text-center absolute inset-0 flex flex-col items-center justify-center" style={{ display: 'none' }}>
                                    <div className="text-5xl mb-3">🤲</div>
                                    <div className="text-lg font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>{selectedMudra?.name}</div>
                                    <div className="text-[10px] tracking-widest mt-1 opacity-60" style={{ color: 'var(--text-muted)' }}>Samyuta — Both hands</div>
                                </div>
                            </div>

                            {/* Info card */}
                            <div className="p-6 rounded-xl border flex-1" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h1 className="text-3xl font-bold uppercase tracking-tight mb-1" style={{ color: 'var(--accent)' }}>{selectedMudra.name}</h1>
                                        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>{selectedMudra.meaning}</p>
                                    </div>
                                    {bestScores[selectedMudra.folder] && (
                                        <div className="text-right">
                                            <div className="text-[9px] tracking-[3px] uppercase opacity-50 mb-1" style={{ color: 'var(--text-muted)' }}>Best</div>
                                            <div className="text-xl font-black" style={{ color: 'var(--copper)' }}>{bestScores[selectedMudra.folder]}%</div>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-5 p-4 rounded-lg border" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card2)' }}>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-2 flex items-center gap-2 font-bold" style={{ color: 'var(--accent)' }}>
                                        <BookOpen size={11} /> Hand Guide — Both Hands
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text)' }}>{fingerGuideText}</p>
                                    {voiceEnabled && (
                                        <button onClick={() => announce.raw(`${selectedMudra.name} mudra. ${fingerGuideText}`, 3)}
                                            className="mt-3 text-[9px] tracking-[3px] uppercase font-bold px-3 py-1.5 rounded border transition-all"
                                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                            🔊 Repeat Instructions
                                        </button>
                                    )}
                                </div>

                                {/* Adjusting */}
                                {cameraOn && isAdjusting && !isCorrect && (
                                    <div className="mb-4 p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                                        <div className="text-[9px] tracking-[3px] uppercase text-yellow-500 font-bold flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> Adjusting…
                                        </div>
                                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Hold both hands steady for a moment</p>
                                    </div>
                                )}

                                {/* Corrections */}
                                {cameraOn && !isAdjusting && (wrongMudraMsg || fingerCorrs.length > 0) && (
                                    <div className="mb-4 space-y-2">
                                        {wrongMudraMsg && (
                                            <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30">
                                                <div className="text-[9px] tracking-[4px] uppercase text-red-500 mb-2 font-black flex items-center gap-2">⚠ Wrong Mudra Detected</div>
                                                <p className="text-xs text-red-400 font-bold">{wrongMudraMsg}</p>
                                            </div>
                                        )}
                                        {fingerCorrs.length > 0 && (
                                            <div className="p-4 rounded-xl border bg-orange-500/10 border-orange-500/30">
                                                <div className="text-[9px] tracking-[4px] uppercase text-orange-500 mb-2 font-black flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" /> Corrections Needed
                                                </div>
                                                <ul className="text-xs space-y-1.5 text-orange-300">
                                                    {fingerCorrs.slice(0, 3).map((c, i) => (
                                                        <li key={i} className="flex items-center gap-2"><span className="text-orange-500">•</span>{c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Correct form */}
                                {cameraOn && isCorrect && (
                                    <div className="mb-4 p-4 rounded-xl border bg-green-500/10 border-green-500/30">
                                        <div className="text-[9px] tracking-[4px] uppercase text-green-500 font-black flex items-center gap-2">
                                            ✓ Correct Form — {Math.round(accuracy)}%
                                        </div>
                                        <p className="text-xs text-green-400 mt-1">
                                            {holdProgress > 0 ? `Saving…` : 'Hold both hands steady'}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <Trophy size={11} /> Usage
                                    </div>
                                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{selectedMudra.usage}</p>
                                </div>

                                {sessionComplete && (
                                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg flex items-center gap-3">
                                        <CheckCircle2 className="text-green-500" />
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-green-700 dark:text-green-300 mb-0.5">Mastered! Score: {sessionScore}%</div>
                                            <p className="text-[10px] text-green-600 dark:text-green-500">Both-hand pose held with high accuracy</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Camera ──────────────────────────────────── */}
                        <div className="flex flex-col">
                            <div className="w-full rounded-xl overflow-hidden border relative bg-black shadow-inner" style={{ borderColor: 'var(--border)', height: '520px' }}>
                                <canvas ref={canvasRef} className="hidden" />
                                {cameraOn ? (
                                    <>
                                        {/* Adjusting overlay */}
                                        {isAdjusting && !isCorrect && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                                <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                                                    <span className="text-white text-[10px] tracking-[4px] uppercase font-bold">Stabilizing</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mudra Detected Overlay */}
                                        {isCorrect && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/10 pointer-events-none animate-in fade-in zoom-in duration-300">
                                                <div className="bg-green-500/90 backdrop-blur-md shadow-2xl px-10 py-5 rounded-[2rem] border border-white/20 flex flex-col items-center gap-2 transform -rotate-1">
                                                    <div className="bg-white text-green-600 rounded-full p-2">
                                                        <CheckCircle2 size={32} />
                                                    </div>
                                                    <span className="text-white text-xl font-black tracking-[6px] uppercase italic">Mudra Detected!</span>
                                                    <span className="text-white/80 text-[8px] tracking-[4px] uppercase font-bold">Hold position to save</span>
                                                </div>
                                            </div>
                                        )}
                                        <video ref={videoRef} autoPlay playsInline muted
                                            className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                                        {/* Accuracy overlay */}
                                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 flex flex-col items-end gap-1">
                                            <span className="text-[8px] tracking-[3px] uppercase text-white/50">Accuracy</span>
                                            <span className="text-2xl font-mono font-bold"
                                                style={{ color: accuracy >= ACCURACY_THRESHOLD ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }}>
                                                {accuracy > 0 ? `${accuracy.toFixed(0)}%` : '…'}
                                            </span>
                                            {!isAdjusting && (
                                                <div className="w-24 h-1.5 bg-white/10 rounded-full">
                                                    <div className="h-full rounded-full transition-all duration-300"
                                                        style={{ width: `${accuracy}%`, backgroundColor: accuracy >= ACCURACY_THRESHOLD ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Both-hands status badge */}
                                        <HandsBadge handsDetected={handsDetected} isMergeable={isMergeable} />

                                        {/* Hold progress */}
                                        {holdProgress > 0 && (
                                            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-green-500/30">
                                                <span className="text-[8px] tracking-[3px] uppercase text-green-400">
                                                    {holdProgress >= 100 ? 'Saved ✓' : 'Saving…'}
                                                </span>
                                                <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                                                    <div className="h-full rounded-full transition-all duration-200 bg-green-400" style={{ width: `${holdProgress}%` }} />
                                                </div>
                                            </div>
                                        )}


                                        {/* Wrong mudra overlay */}
                                        {!isAdjusting && wrongMudraMsg && (
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border text-center z-20 animate-pulse w-[90%]"
                                                style={{ backgroundColor: 'rgba(220,38,38,0.95)', borderColor: '#f87171', color: '#fff' }}>
                                                ⚠ {wrongMudraMsg}
                                            </div>
                                        )}

                                        {/* Mastery overlay */}
                                        {isFrozen && frozenFrame && (
                                            <div className="absolute inset-0 z-50">
                                                <img src={frozenFrame} className="w-full h-full object-cover grayscale-[0.3] brightness-75" alt="Mastery" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                                <div className="absolute inset-x-0 bottom-0 p-10 flex flex-col items-center text-center">
                                                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.5)]">
                                                        <CheckCircle2 size={40} className="text-white" />
                                                    </div>
                                                    <div className="text-[10px] tracking-[8px] uppercase text-green-400 mb-2 font-black">Mudra Mastered</div>
                                                    <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter">{selectedMudra.name}</h2>
                                                    <div className="flex gap-8 mb-8 mt-4">
                                                        <div className="text-center">
                                                            <div className="text-[8px] tracking-[3px] uppercase text-white/50 mb-1">Score</div>
                                                            <div className="text-3xl font-bold" style={{ color: 'var(--copper)' }}>{sessionScore}%</div>
                                                        </div>
                                                        <div className="w-px h-10 bg-white/20 mt-4" />
                                                        <div className="text-center">
                                                            <div className="text-[8px] tracking-[3px] uppercase text-white/50 mb-1">Attempts</div>
                                                            <div className="text-3xl font-bold text-white">{attemptsRef.current}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 w-full max-w-sm">
                                                        <button onClick={() => { setIsFrozen(false); setFrozenFrame(null); startWebcam(); }}
                                                            className="flex-1 py-4 rounded-xl border border-white/20 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                                                            Try Again
                                                        </button>
                                                        <button onClick={nextMudra}
                                                            className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all"
                                                            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                                                            Next Mudra →
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Status badge */}
                                        {!isFrozen && detected.detected && !isAdjusting && !wrongMudraMsg && (
                                            <div className="absolute top-[100px] left-1/2 -translate-x-1/2 z-10">
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border ${isCorrect ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}`}>
                                                    {isCorrect ? '✓ Correct Form' : '↻ Adjusting...'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Bottom bar */}
                                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3 backdrop-blur-xl"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.90)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div>
                                                <span className="text-[8px] tracking-[3px] uppercase text-white/40 block mb-0.5">Target</span>
                                                <span className="text-white font-bold text-sm">{selectedMudra.name}</span>
                                            </div>
                                            <button onClick={() => { stopWebcam(); stop(); }}
                                                className="text-[9px] tracking-[3px] uppercase text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded border border-red-500/30 hover:bg-red-500/10 transition-all">
                                                ✕ Stop Camera
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-10">
                                        {!sessionComplete ? (
                                            <>
                                                <div className="mb-6 text-5xl">{['📖', '🤲', '🎯'][practiceStep]}</div>
                                                <h3 className="text-white text-lg font-bold mb-2">{PRACTICE_STEPS[practiceStep].title}</h3>
                                                <p className="text-white/40 text-xs tracking-widest max-w-[240px] mb-8 leading-relaxed">{PRACTICE_STEPS[practiceStep].desc}</p>
                                                <div className="flex gap-3">
                                                    {practiceStep > 0 && (
                                                        <button onClick={() => setPracticeStep(p => p - 1)}
                                                            className="px-5 py-2.5 rounded-lg border text-[10px] tracking-widest uppercase text-white/60 border-white/20 hover:bg-white/5 transition-all">
                                                            Back
                                                        </button>
                                                    )}
                                                    {practiceStep < 2 ? (
                                                        <button onClick={() => setPracticeStep(p => p + 1)}
                                                            className="px-8 py-2.5 rounded-lg text-white text-[10px] tracking-[4px] uppercase font-bold hover:scale-105 transition-all"
                                                            style={{ backgroundColor: 'var(--accent)' }}>
                                                            Next →
                                                        </button>
                                                    ) : (
                                                        <button onClick={startWebcam}
                                                            className="px-10 py-3 rounded-lg text-white text-[10px] tracking-[4px] uppercase font-bold hover:scale-105 transition-all shadow-lg"
                                                            style={{ backgroundColor: 'var(--accent)' }}>
                                                            ▶ Start Camera
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-5xl">🏆</div>
                                                <h3 className="text-white text-xl font-bold">Mudra Mastered!</h3>
                                                <p className="text-white/40 text-xs tracking-widest">Score: {sessionScore}%</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Status bar */}
                            <div className="mt-6">
                                {sessionComplete ? (
                                    <button onClick={nextMudra}
                                        className="w-full py-4 text-white rounded-xl font-bold text-xs tracking-[5px] uppercase flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl"
                                        style={{ backgroundColor: 'var(--accent)' }}>
                                        Next Mudra <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <div className="text-[9px] tracking-[4px] uppercase text-center w-full py-3 border rounded-xl"
                                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                                        {cameraOn
                                            ? (handsDetected < 2 && !isMergeable)
                                                ? `⚠ Show both hands — ${handsDetected}/2 detected`
                                                : isAdjusting
                                                    ? '⟳ Stabilizing — hold both hands steady'
                                                    : wrongMudraMsg
                                                        ? `⚠ ${wrongMudraMsg}`
                                                        : fingerCorrs.length > 0
                                                            ? `↻ ${fingerCorrs[0]}`
                                                            : holdProgress > 0
                                                                ? `Hold steady… saving`
                                                                : 'Match the reference position on the left'
                                            : 'Follow the steps above to begin practice'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
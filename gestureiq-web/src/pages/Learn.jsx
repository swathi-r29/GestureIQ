import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import HandVisualiser from '../components/HandVisualiser';
import { useVoiceGuide, LanguageSelector, MUDRA_CONFIG, translate, getMudraName } from '../hooks/useVoiceGuide';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

const MUDRAS = [
    // --- SINGLE HAND MUDRAS ---
    { name: "Pataka", level: "Basic", folder: "pataka", type: "Single" },
    { name: "Tripataka", level: "Basic", folder: "tripataka", type: "Single" },
    { name: "Ardhapataka", level: "Basic", folder: "ardhapataka", type: "Single" },
    { name: "Kartarimukha", level: "Basic", folder: "kartarimukha", type: "Single" },
    { name: "Mayura", level: "Basic", folder: "mayura", type: "Single" },
    { name: "Ardhachandra", level: "Basic", folder: "ardhachandra", type: "Single" },
    { name: "Suchi", level: "Basic", folder: "suchi", type: "Single" },

    { name: "Arala", level: "Intermediate", folder: "arala", type: "Single" },
    { name: "Shukatunda", level: "Intermediate", folder: "shukatunda", type: "Single" },
    { name: "Mushti", level: "Intermediate", folder: "mushti", type: "Single" },
    { name: "Shikhara", level: "Intermediate", folder: "shikhara", type: "Single" },
    { name: "Kapittha", level: "Intermediate", folder: "kapittha", type: "Single" },
    { name: "Katakamukha", level: "Intermediate", folder: "katakamukha", type: "Single" },
    { name: "Chandrakala", level: "Intermediate", folder: "chandrakala", type: "Single" },
    { name: "Padmakosha", level: "Intermediate", folder: "padmakosha", type: "Single" },

    { name: "Sarpashira", level: "Advanced", folder: "sarpashira", type: "Single" },
    { name: "Mrigashira", level: "Advanced", folder: "mrigashira", type: "Single" },
    { name: "Simhamukha", level: "Advanced", folder: "simhamukha", type: "Single" },
    { name: "Kangula", level: "Advanced", folder: "kangula", type: "Single" },
    { name: "Alapadma", level: "Advanced", folder: "alapadma", type: "Single" },
    { name: "Chatura", level: "Advanced", folder: "chatura", type: "Single" },
    { name: "Bhramara", level: "Advanced", folder: "bhramara", type: "Single" },
    { name: "Hamsasya", level: "Advanced", folder: "hamsasya", type: "Single" },
    { name: "Hamsapaksha", level: "Advanced", folder: "hamsapaksha", type: "Single" },
    { name: "Sandamsha", level: "Advanced", folder: "sandamsha", type: "Single" },
    { name: "Mukula", level: "Advanced", folder: "mukula", type: "Single" },
    { name: "Tamrachuda", level: "Advanced", folder: "tamrachuda", type: "Single" },
    { name: "Trishula", level: "Advanced", folder: "trishula", type: "Single" },

    // --- DOUBLE HAND MUDRAS ---
    { name: "Anjali", level: "Basic", folder: "anjali", type: "Double" },
    { name: "Kapotha", level: "Basic", folder: "kapotha", type: "Double" },
    { name: "Karkata", level: "Basic", folder: "karkata", type: "Double" },
    { name: "Svastika", level: "Basic", folder: "svastika", type: "Double" },
    { name: "Dola", level: "Basic", folder: "dola", type: "Double" },
    { name: "Puspaputa", level: "Basic", folder: "puspaputa", type: "Double" },

    { name: "Utsanga", level: "Intermediate", folder: "utsanga", type: "Double" },
    { name: "Sivalinga", level: "Intermediate", folder: "sivalinga", type: "Double" },
    { name: "Katakavardhana", level: "Intermediate", folder: "katakavardhana", type: "Double" },
    { name: "Kartarisvastika", level: "Intermediate", folder: "kartarisvastika", type: "Double" },
    { name: "Sakata", level: "Intermediate", folder: "sakata", type: "Double" },
    { name: "Sankha", level: "Intermediate", folder: "sankha", type: "Double" },
    { name: "Chakra", level: "Intermediate", folder: "chakra", type: "Double" },
    { name: "Samputa", level: "Intermediate", folder: "samputa", type: "Double" },

    { name: "Pasa", level: "Advanced", folder: "pasa", type: "Double" },
    { name: "Kilaka", level: "Advanced", folder: "kilaka", type: "Double" },
    { name: "Matsya", level: "Advanced", folder: "matsya", type: "Double" },
    { name: "Kurma", level: "Advanced", folder: "kurma", type: "Double" },
    { name: "Varaha", level: "Advanced", folder: "varaha", type: "Double" },
    { name: "Garuda", level: "Advanced", folder: "garuda", type: "Double" },
    { name: "Nagabandha", level: "Advanced", folder: "nagabandha", type: "Double" },
    { name: "Bherunda", level: "Advanced", folder: "bherunda", type: "Double" },
    { name: "Katva", level: "Advanced", folder: "katva", type: "Double" },
].map(m => ({
    ...m,
    meaning: MUDRA_CONFIG[m.folder]?.meaning || '',
    usage: MUDRA_CONFIG[m.folder]?.usage || '',
    fingers: MUDRA_CONFIG[m.folder]?.fingers || '',
}));

const STABILITY_THRESHOLD = 10;
const WRONG_MUDRA_GATE = 3;
const ACCURACY_THRESHOLD = 75;
const HOLD_DURATION_MS = 1200;

const STAGES = { SELECT_TYPE: 'SELECT_TYPE', SELECT_LEVEL: 'SELECT_LEVEL', MUDRA_LIST: 'MUDRA_LIST', PRACTICE: 'PRACTICE' };
const LEVEL_CONFIG = {
    'Basic': { title: 'The Foundations', icon: '✦' },
    'Intermediate': { title: 'The Expressions', icon: '❦' },
    'Advanced': { title: 'The Mastery', icon: '✧' },
};

export default function Learn() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [lang, setLang] = useState('en');
    const { stop, test, unlock, announce } = useVoiceGuide({ language: lang });

    const [stage, setStage] = useState(STAGES.SELECT_TYPE);
    const [selectedType, setSelectedType] = useState(null); // 'Single' or 'Double'
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedMudra, setSelectedMudra] = useState(null);
    const [progress, setProgress] = useState([]);
    const [bestScores, setBestScores] = useState({});
    const [cameraOn, setCameraOn] = useState(false);
    const [detected, setDetected] = useState({ name: '', confidence: 0, detected: false });
    const [loading, setLoading] = useState(true);
    const [mudraContent, setMudraContent] = useState(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionScore, setSessionScore] = useState(0);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [practiceStep, setPracticeStep] = useState(0);
    const [show3D, setShow3D] = useState(true);
    const [isFrozen, setIsFrozen] = useState(false);
    const [frozenFrame, setFrozenFrame] = useState(null);
    const [isMuted, setIsMuted] = useState(false); // UI State (stays for CSS/UI if needed)
    const isMutedRef = useRef(false);             // Logic State (prevents stale closures)

    const [activeModules, setActiveModules] = useState({ mudra: true, face: true, pose: false });
    const activeModulesRef = useRef(activeModules);
    useEffect(() => { activeModulesRef.current = activeModules; }, [activeModules]);

    const attemptsRef = useRef(0);
    const holdStartRef = useRef(null);
    const consecutiveRef = useRef({ name: null, count: 0 });
    const masteredRef = useRef(false);
    const saveInProgressRef = useRef(false);

    const lastDetectedNameRef = useRef('');
    const wrongMudraFramesRef = useRef(0);
    const stableFramesRef = useRef(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const handsRef = useRef(null);
    const landmarksRef = useRef(null);
    const landmarksMetaRef = useRef({ handedness: 'Right', score: 1.0 }); // Task 1: Store meta separately
    const isDetectingRef = useRef(false);
    const requestRef = useRef(null);
    const recoveryRef = useRef(null);
    const lastResultTimeRef = useRef(Date.now());
    const holdAccumulatorRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const graceRef = useRef(0);
    const lowAccuracyFramesRef = useRef(0); // [PHASE 10] Blink Protection
    const successLockRef = useRef(false);   // [PHASE 10] Mastered UI lock
    const saveMutexRef = useRef(false);     // [PHASE 12] Atomic mutex for success trigger
    const detectedRef = useRef(null);      // Task 4: For canvas drawing access
    const isProcessingRef = useRef(false); // Pro-Tip: Prevents frame stacking
    const fpsRef = useRef(0);

    const voiceEnabledRef = useRef(false);
    const lastWrongVoiceRef = useRef({ text: '', time: 0 });
    const lastCorrVoiceRef = useRef({ text: '', time: 0 });
    const lastOkVoiceRef = useRef(0);
    const lastNoHandRef = useRef(0);
    const stableCorrFramesRef = useRef(0);

    useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

    const PRACTICE_STEPS = [
        { title: 'Study the Position', desc: 'Look at the reference image carefully. Read the finger instructions below.' },
        { title: 'Prepare Your Hand', desc: 'Get your hand ready in front of you. Good lighting helps accuracy.' },
        { title: 'Start Live Practice', desc: 'The AI will watch your hand and give corrections in real time.' },
    ];

    const getLevelMudras = (lvl) => MUDRAS.filter(m => m.level === lvl && m.type === selectedType);
    const getLevelProgress = (lvl) => getLevelMudras(lvl).filter(m => progress.includes(m.folder));

    useEffect(() => {
        if (user && user.role !== 'student') { navigate('/'); return; }
        
        const sock = io(window.location.origin.replace('5173', '5000'));
        sock.on('modules_changed', (data) => {
            setActiveModules(data.modules || data);
        });

        fetchProgress();

        return () => { sock.disconnect(); };
    }, [user, navigate]);

    useEffect(() => {
        if (selectedMudra) { setMudraContent(null); fetchMudraContent(selectedMudra.folder); }
        else setMudraContent(null);
    }, [selectedMudra]);

    useEffect(() => {
        if (stage === STAGES.PRACTICE && selectedMudra) {
            unlock(); // Early unlock for browser audio
            if (voiceEnabledRef.current) {
                setTimeout(() => announce.start(selectedMudra.folder), 600);
            }
        }
    }, [stage, selectedMudra]);

    // ── MASTER DETECTION LOOP (Task 2) ───────────────────────────────────────
    // Consolidates MediaPipe Setup, Video Sync, and Frame Processing
    useEffect(() => {
        if (!cameraOn) return;

        // 1. Initialize MediaPipe Hands
        const hands = new Hands({ 
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
        });

        hands.setOptions({
            maxNumHands: selectedType === 'Double' ? 2 : 1,
            modelComplexity: 0, // 0 for speed, 1 for accuracy
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3
        });

        hands.onResults((results) => {
            // Frame Processed -> Unlock next frame
            isProcessingRef.current = false;
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
            
            if (activeModulesRef.current.mudra && results.multiHandLandmarks?.length > 0) {
                const lmsList = results.multiHandLandmarks;
                const handsList = results.multiHandedness || [];

                lmsList.forEach((lms, idx) => {
                    drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#f59e0b', lineWidth: 4 });
                    drawLandmarks(ctx, lms, { color: '#ffffff', lineWidth: 1, radius: 2 });
                    
                    if (detectedRef.current?.problematic_joints) {
                        const joints = detectedRef.current.problematic_joints;
                        const JOINT_MAP = {
                            thumb_mcp: 2, thumb_ip: 3, thumb_tip: 4,
                            index_mcp: 5, index_pip: 6, index_dip: 7, index_tip: 8,
                            middle_mcp: 9, middle_pip: 10, middle_dip: 11, middle_tip: 12,
                            ring_mcp: 13, ring_pip: 14, ring_dip: 15, ring_tip: 16,
                            pinky_mcp: 17, pinky_pip: 18, pinky_dip: 19, pinky_tip: 20
                        };

                        joints.forEach(j => {
                            const idx = JOINT_MAP[j.joint] || JOINT_MAP[j.joint.replace('_mcp','_pip')];
                            if (idx !== undefined && lms[idx]) {
                                const pt = lms[idx];
                                const screenX = pt.x * canvas.width;
                                const screenY = pt.y * canvas.height;
                                const gradient = ctx.createRadialGradient(screenX, screenY, 5, screenX, screenY, 40);
                                gradient.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
                                gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
                                ctx.beginPath();
                                ctx.fillStyle = gradient;
                                ctx.arc(screenX, screenY, 40, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        });
                    }
                });

                if (selectedType === 'Double') {
                    let left = null, right = null;
                    handsList.forEach((h, i) => {
                        if (h.label === 'Left') left = lmsList[i];
                        else right = lmsList[i];
                    });
                    if (!left && lmsList.length > 1) left = lmsList[1];
                    if (!right && lmsList.length > 1) right = lmsList[0];

                    landmarksRef.current = { left, right }; // Fixed for HandVisualiser
                } else {
                    const lms = lmsList[0];
                    const label = handsList[0]?.label || 'Right';
                    const score = handsList[0]?.score || 1.0;
                    
                    landmarksRef.current = lms; // Raw array for HandVisualiser
                    landmarksMetaRef.current = { handedness: label, score };
                }
            } else {
                landmarksRef.current = null;
            }
            ctx.restore();
        });

        handsRef.current = hands;

        // 2. Video Stream Sync
        if (streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }

        // 3. High-Performance requestAnimationFrame Loop
        let active = true;
        const processFrame = async () => {
            if (!active || !cameraOn) return;

            if (videoRef.current?.readyState >= 2 && handsRef.current && !isProcessingRef.current) {
                isProcessingRef.current = true; // Lock
                await handsRef.current.send({ image: videoRef.current }).catch(() => {
                    isProcessingRef.current = false; // Release lock on error
                });
            }
            
            requestRef.current = requestAnimationFrame(processFrame);
        };
        requestRef.current = requestAnimationFrame(processFrame);

        // 4. Recovery Monitor
        const recoveryId = setInterval(() => {
            if (cameraOn && Date.now() - lastResultTimeRef.current > 4000) {
                console.warn('[Detection] Loop hung, forcing result clear');
                lastResultTimeRef.current = Date.now();
                isProcessingRef.current = false;
            }
        }, 2000);

        // Cleanup
        return () => {
            active = false;
            clearInterval(recoveryId);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (handsRef.current) {
                handsRef.current.close();
                handsRef.current = null;
                console.log('[Learn] Hands resources released.');
            }
        };
    }, [cameraOn, selectedType]);
 
    const startWebcam = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            streamRef.current = stream;
            setCameraOn(true);
        } catch (error) {
            console.error('Camera failed:', error);
            alert('Camera access denied. Please allow camera permission and use HTTPS.');
        }
    }, []);

    const stopWebcam = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraOn(false);
        landmarksRef.current = null;
    }, []);

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

        const interval = setInterval(async () => {
            if (isDetectingRef.current) return;

            // GATEKEEPER: If teacher disabled the module OR we are in "mute" window, skip
            if (!activeModulesRef.current.mudra || isMutedRef.current) {
                setDetected({ 
                    name: isMutedRef.current ? 'Positioning...' : 'AI Paused', 
                    confidence: 0, 
                    detected: false 
                });
                setHoldProgress(0);
                return;
            }

            isDetectingRef.current = true;

            try {
                const dataObj = landmarksRef.current;

                // ── NO HAND ───────────────────────────────────────────────────
                const hasHand = dataObj && (
                  selectedType === 'Double'
                    ? (dataObj.left && dataObj.right)
                    : (Array.isArray(dataObj) && dataObj.length === 21)
                );
                  if (!hasHand) {
                    setDetected({ name: 'No Hand', confidence: 0, detected: false });
                    setHoldProgress(0);
                    holdStartRef.current = null;

                    consecutiveRef.current = { name: null, count: 0 };
                    lastDetectedNameRef.current = '';
                    wrongMudraFramesRef.current = 0;
                    lowAccuracyFramesRef.current = 0; // Reset on total hand loss

                    if (voiceEnabledRef.current) {
                        const now = Date.now();
                        // Only announce "Show your hand" if not currently holding a success state
                        if (holdAccumulatorRef.current === 0) {
                            if (now - lastNoHandRef.current > 8000) {
                                lastNoHandRef.current = now;
                                announce.raw(lang === 'ta' ? 'உங்கள் கையை கேமராவில் காட்டுங்கள்' : 'Show your hand to the camera', 2);
                            }
                        }
                    }
                    isDetectingRef.current = false;
                    return;
                }


                attemptsRef.current += 1;

                let endpoint = `/api/detect_landmarks`;
                let body = {};

                if (selectedType === 'Double') {
                    endpoint = `/api/detect_double_landmarks`;
                    body = {
                        left_landmarks: Array.from(dataObj.left).map(lm => ({ x: lm.x, y: lm.y, z: lm.z })),
                        right_landmarks: Array.from(dataObj.right).map(lm => ({ x: lm.x, y: lm.y, z: lm.z })),
                        targetMudra: selectedMudra.folder,
                    };
                } else {
                    const meta = landmarksMetaRef.current;
                    const lmArray = Array.from(dataObj).map(lm => ({
                        x: lm.x ?? lm[0], y: lm.y ?? lm[1], z: lm.z ?? lm[2],
                    }));
                    body = {
                        landmarks: lmArray,
                        handedness: meta.handedness || 'Right',
                        presenceScore: meta.score || 1.0,
                        targetMudra: selectedMudra.folder,
                    };
                }

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(1500),
                });

                const data = await res.json();

                // ── STABLE EVALUATION WINDOW ──────────────────────────────────
                const detectedName = data.name || '';
                const isStableAPI = data.is_stable === true; // Task 1
                const accuracy = data.accuracy || 0;
                const holdMs = accuracy >= 90 ? 500 : HOLD_DURATION_MS;
                const corrections = data.corrections || [];
                const problematicJoints = data.problematic_joints || []; // Task 4

                // RELAXED 10-FRAME GATE (with Grace Window)
                const effectiveName = detectedName || (graceRef.current < 3 ? consecutiveRef.current.name : null);
                if (detectedName) graceRef.current = 0; else graceRef.current++;

                // [PHASE 18] Added Accuracy check to stability reset
                const isAccurate = accuracy >= ACCURACY_THRESHOLD;
                if (effectiveName && effectiveName === consecutiveRef.current.name && isAccurate) {
                    consecutiveRef.current.count++;
                } else {
                    consecutiveRef.current = { name: effectiveName, count: effectiveName ? 1 : 0 };
                }

                const locallyStable = consecutiveRef.current.count >= STABILITY_THRESHOLD;

                const isWrongMudraMsg = (c) => typeof c === 'string' && (
                    c.toLowerCase().startsWith('wrong mudra') || 
                    c.toLowerCase().includes('instead of') ||
                    c.toLowerCase().startsWith('veto') ||
                    c.toLowerCase().includes('wrong position')
                );
                const wrongMsg = corrections.find(c => isWrongMudraMsg(c));
                const fingerCorr = corrections.filter(c => typeof c === 'string' && !isWrongMudraMsg(c));

                // ── FIX: Wrong mudra frame counter (for voice gating only) ────
                // The UI always shows wrongMsg immediately when backend sends it.
                // Only the VOICE announcement is gated behind wrongMudraFramesRef.
                if (wrongMsg) {
                    wrongMudraFramesRef.current = Math.min(6, wrongMudraFramesRef.current + 1);
                } else {
                    wrongMudraFramesRef.current = Math.max(0, wrongMudraFramesRef.current - 0.5);
                }

                // displayCorrections passes wrongMsg through untouched — no UI gate
                const displayCorrections = [...corrections];
                const hasWrongMudraInDisplay = displayCorrections.some(
                    c => typeof c === 'string' && c.toLowerCase().startsWith('wrong mudra')
                );

                const displayData = {
                    ...data,
                    corrections: displayCorrections,
                    // ── FIX: isAdjusting checks raw wrongMsg, not the filtered display list ──
                    // If backend sent a wrongMsg, suppress "Adjusting…" and show the alert instead
                    // ── RELAXED ADJUSTING LOGIC: Show accuracy immediately if detection is live ──
                    _isAdjusting: !locallyStable && !isStableAPI && accuracy < 10 && !wrongMsg,
                    _isMoving: !isStableAPI && data.status === 'Stabilizing...',
                    problematic_joints: problematicJoints,
                };
                detectedRef.current = displayData;

                // ── SUCCESS LOCK ─────────────────────────────────────────────
                if (successLockRef.current) {
                    isDetectingRef.current = false;
                    return;
                }

                setDetected(prev => {
                    // Prevent jitter if we just achieved success
                    if (successLockRef.current) return prev;
                    return displayData;
                });

                // --- UPDATED VOICE & SUCCESS LOGIC ---
                if (voiceEnabledRef.current) {
                    const now = Date.now();
                    const currentHoldPct = (holdAccumulatorRef.current / holdMs) * 100;

                    // 1. SUCCESS STATE: User is holding the pose
                    if (currentHoldPct > 10 && !sessionComplete) {
                        if (now - lastOkVoiceRef.current > 8000) {
                            lastOkVoiceRef.current = now;
                            const msg = lang === 'ta' 
                                ? 'அப்படியே பிடியுங்கள்! நீங்கள் செய்துவிட்டீர்கள்!' 
                                : 'Hold for a second, you did it!';
                            announce.raw(msg, 4); // Priority 4 (Ultra) to prevent interruptions
                        }
                    }
                    // 2. WRONG MUDRA STATE (Guard with holdProgress === 0)
                    else if (wrongMsg && holdAccumulatorRef.current === 0) {
                        const stableWrongMsg = wrongMudraFramesRef.current >= WRONG_MUDRA_GATE ? wrongMsg : null;
                        if (stableWrongMsg) {
                            const prev = lastWrongVoiceRef.current;
                            if (stableWrongMsg !== prev.text || (now - prev.time) > 5000) {
                                lastWrongVoiceRef.current = { text: stableWrongMsg, time: now };
                                const detMatch = stableWrongMsg.match(/showing ([a-zA-Z]+)/i);
                                const detName = detMatch ? detMatch[1] : detectedName;
                                
                                let voiceMsg = lang === 'ta'
                                    ? `தவறான முத்திரை. நீங்கள் ${getMudraName(lang, detName)} காட்டுகிறீர்கள்.`
                                    : `Wrong mudra. You are showing ${detName}.`;
                                announce.raw(voiceMsg, 3);
                            }
                        }
                    } 
                    // 3. FINGER CORRECTIONS (Guard with holdProgress === 0)
                    else if (fingerCorr.length > 0 && holdAccumulatorRef.current === 0) {
                        stableCorrFramesRef.current = Math.min(10, (stableCorrFramesRef.current || 0) + 1);
                        if (stableCorrFramesRef.current >= 2) {
                            const currentCorr = fingerCorr[0];
                            const prev = lastCorrVoiceRef.current;
                            if (currentCorr !== prev.text || (now - prev.time) > 4500) {
                                lastCorrVoiceRef.current = { text: currentCorr, time: now };
                                announce.raw(translate(lang, currentCorr), 2);
                            }
                        }
                    } 
                }

                // ── HOLD + SAVE ───────────────────────────────────────────────
                // [PHASE 18] STRICT SUCCESS TRIGGER: Require detected Name to match Folder
                const isCorrect = data.detected && accuracy >= ACCURACY_THRESHOLD && !wrongMsg && (data.name === selectedMudra.folder);
                const isGoodFrame = isCorrect;

                const now = Date.now();
                const dt = lastFrameTimeRef.current ? (now - lastFrameTimeRef.current) : 0;
                lastFrameTimeRef.current = now;

                if (isGoodFrame) {
                    holdAccumulatorRef.current = Math.min(holdMs, holdAccumulatorRef.current + dt);
                    lowAccuracyFramesRef.current = 0;
                } else {
                    lowAccuracyFramesRef.current++;
                    
                    if (wrongMsg || accuracy < ACCURACY_THRESHOLD) {
                        // [PHASE 18] Wrong mudra or low accuracy — drain instantly
                        holdAccumulatorRef.current = 0;
                        lowAccuracyFramesRef.current = 0;
                    } else if (lowAccuracyFramesRef.current > 10) {
                        // Maintain fallback for consistency drops
                        const isPartialGood = data.detected && !wrongMsg && accuracy >= 62;
                        holdAccumulatorRef.current = Math.max(0, holdAccumulatorRef.current - dt * (isPartialGood ? 0.3 : 1.5));
                    }
                }

                let displayPct = (holdAccumulatorRef.current / holdMs) * 100;
                if (!isGoodFrame && (isCorrect && accuracy >= 62)) {
                    displayPct = Math.min(75, displayPct);
                }
                
                // Functional update to avoid stale state flicker
                setHoldProgress(() => {
                    if (successLockRef.current) return 100;
                    return displayPct;
                });

                // ── ATOMIC SUCCESS TRIGGER (Phase 12) ────────────────────────
                if (holdAccumulatorRef.current >= holdMs && !saveMutexRef.current) {
                    saveMutexRef.current = true; // Set synchronously to block next interval ticks
                    
                    // 1. First, tell the user they did it
                    if (voiceEnabledRef.current) {
                        const msg = lang === 'ta' ? 'அற்புதம்! முடித்துவிட்டீர்கள்.' : 'Excellent! You did it.';
                        announce.raw(msg, 4); 
                    }

                    // 2. Wait 1.5 seconds for the voice to play BEFORE showing the mastery page
                    setTimeout(() => {
                        masteredRef.current = true;
                        saveInProgressRef.current = true;
                        successLockRef.current = true; // Lock UI at 100%
                        handleMudraMastered(selectedMudra.folder, accuracy);
                    }, 1500); 
                }

            } catch (err) {
                console.warn('[Learn] Detection error:', err.message);
            } finally {
                isDetectingRef.current = false;
            }
        }, 100); // High-frequency streaming for "instant" feel

        return () => {
            clearInterval(interval);
            holdStartRef.current = null;
            setHoldProgress(0);
            stableFramesRef.current = 0;
            lastDetectedNameRef.current = '';
            wrongMudraFramesRef.current = 0;
        };
    }, [stage, cameraOn, selectedMudra, lang, announce]);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/progress', { headers: { 'x-auth-token': token } });
            setProgress(res.data.progress.detectedMudras || []);
            setBestScores(res.data.progress.mudraScores || {});
        } catch (error) { } finally { setLoading(false); }
    };

    const fetchMudraContent = async (mudraName) => {
        setContentLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/user/mudra/content/${mudraName}`, { headers: { 'x-auth-token': token } });
            setMudraContent(res.data);
        } catch (error) { } finally { setContentLoading(false); }
    };

    const handleMudraMastered = async (folder, currentAccuracy) => {
        if (!folder) return;

        const score = Math.round(currentAccuracy);
        const snapshot = captureFrame();
        setFrozenFrame(snapshot);
        setIsFrozen(true);
        setSessionScore(score);
        setSessionComplete(true);
        stopWebcam();
        setHoldProgress(0);

        if (voiceEnabledRef.current) {
            const congrats = lang === 'ta' 
                ? `வாழ்த்துகள்! நீங்கள் ${selectedMudra.name} முத்திரையை வெற்றிகரமாக முடித்துவிட்டீர்கள்!`
                : `Congratulations! You have successfully mastered the ${selectedMudra.name} mudra!`;
            announce.raw(congrats, 4);
        }
        attemptsRef.current = 0;

        try {
            const token = localStorage.getItem('token');
            const studentId = user?.id || 'anonymous';
            const classId = 'learning_session';

            // ── Phase 4: AI Session Report ──
            await axios.post('/api/session_report', {
                studentId,
                classId,
                mudraName: folder,
                detectedName: detected.name,
                aiScore: score,
                problematicJoints: detected.problematic_joints || [],
                timeTaken: 0, // Could be calculated
            }).catch(e => console.warn('[SessionReport] Failed:', e));

            const res = await axios.post(
                '/api/user/progress/update',
                { mudraName: folder, score },
                { headers: { 'x-auth-token': token }, timeout: 5000 }
            );
            setProgress(res.data.detectedMudras || []);
            setBestScores(res.data.mudraScores || {});
        } catch (error) {
            console.warn('[handleMudraMastered] Progress save failed (backend may be offline). UI already updated.', error);
        } finally {
            saveInProgressRef.current = false;
        }
    };

    const enterPractice = async (mudra) => {
        // [PHASE 18] CRITICAL: Unlock audio on exactly this click event
        unlock(); 
        
        setSelectedMudra(mudra);
        setSessionComplete(false);
        setDetected({ name: '', confidence: 0, detected: false });
        setHoldProgress(0);
        holdStartRef.current = null;
        masteredRef.current = false;
        saveInProgressRef.current = false;
        stableFramesRef.current = 0;
        lastDetectedNameRef.current = '';
        wrongMudraFramesRef.current = 0;
        setPracticeStep(0);
        setIsFrozen(false);
        setFrozenFrame(null);
        attemptsRef.current = 0;
        lowAccuracyFramesRef.current = 0;
        
        // ── ATOMIC RESET & MUTE (Task 5) ──
        isMutedRef.current = true;
        setIsMuted(true);
        
        // Synchronous History Flush: Ensure registry is wiped BEFORE detection starts
        try {
            await axios.post('/api/clear_history');
            console.log('[Learn] Registry flushed successfully.');
        } catch (e) {
            console.error('[Learn] Flush failed:', e);
        }

        setIsMuted(false);
        isMutedRef.current = false;
        setStage(STAGES.PRACTICE);
    };

    const nextMudra = () => {
        // [PHASE 18] Audio Unlock
        unlock();
        
        const levelMudras = getLevelMudras(selectedLevel);
        const currentIndex = levelMudras.findIndex(m => m.folder === selectedMudra.folder);
        setIsFrozen(false);
        setFrozenFrame(null);
        attemptsRef.current = 0;
        if (currentIndex < levelMudras.length - 1) enterPractice(levelMudras[currentIndex + 1]);
        else setStage(STAGES.MUDRA_LIST);
    };

    // ── Derived display state ─────────────────────────────────────────────────
    const accuracy = detected.accuracy || 0;
    const corrections = detected.corrections || [];
    const fingerCorrs = corrections.filter(c => typeof c === 'string' && !c.toLowerCase().startsWith('wrong mudra'));
    const wrongMudraMsg = detected.isWrongMudra 
        ? `You are showing ${detected.actualMudra?.capitalize?.() || detected.actualMudra} instead of ${selectedMudra?.name}`
        : corrections.find(c => typeof c === 'string' && c.toLowerCase().startsWith('wrong mudra'));
    const isAdjusting = detected._isAdjusting;
    const isCorrect = detected.detected && accuracy >= 80 && !wrongMudraMsg && fingerCorrs.length === 0 && (detected.name === selectedMudra?.folder);

    const fingerGuideText = selectedMudra
        ? (MUDRA_CONFIG[selectedMudra.folder]?.fingers || selectedMudra.fingers || '')
        : '';

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }} />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen">

            {/* ── STAGE 0: TYPE SELECTION ─────────────────────────────── */}
            {stage === STAGES.SELECT_TYPE && (
                <div>
                    <div className="text-center mb-16">
                        <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Learning Journey</div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text)' }}>Choose Category</h1>
                        <div className="max-w-md mx-auto"><BorderPattern /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                        {[
                            { id: 'Single', title: 'Asamyuta Hastas', sub: 'Single Hand Mudras', icon: '🖐️', desc: 'Basic one-handed gestures that form the foundation of Bharatnatyam.' },
                            { id: 'Double', title: 'Samyuta Hastas', sub: 'Double Hand Mudras', icon: '🙌', desc: 'Advanced gestures that combine both hands to express complex meanings.' }
                        ].map((t) => (
                            <div key={t.id}
                                onClick={() => {
                                    if (t.id === 'Double') navigate('/learn/samyuta');
                                    else { setSelectedType(t.id); setStage(STAGES.SELECT_LEVEL); }
                                }}
                                className="group p-10 rounded-2xl border-2 transition-all duration-500 cursor-pointer relative overflow-hidden text-center flex flex-col items-center"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                <div className="text-6xl mb-8 group-hover:scale-110 transition-transform filter drop-shadow-lg">{t.icon}</div>
                                <h3 className="text-2xl font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--text)' }}>{t.title}</h3>
                                <p className="text-xs mb-4 font-bold opacity-60" style={{ color: 'var(--accent)' }}>{t.sub}</p>
                                <p className="text-sm opacity-70 mb-8 max-w-xs" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>

                                <div className="mt-auto h-12 w-12 flex items-center justify-center rounded-full bg-accent/10 border border-accent/20 group-hover:bg-accent group-hover:text-white transition-all shadow-inner">
                                    <ChevronRight size={24} />
                                </div>
                                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-accent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── STAGE A: LEVEL SELECTION ─────────────────────────────── */}
            {stage === STAGES.SELECT_LEVEL && (
                <div>
                    <button onClick={() => setStage(STAGES.SELECT_TYPE)}
                        className="flex items-center gap-2 mb-8 text-xs tracking-widest uppercase hover:text-accent transition-colors"
                        style={{ color: 'var(--text-muted)' }}>
                        <ChevronLeft size={16} /> Back to Categories
                    </button>
                    <div className="text-center mb-16">
                        <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>{selectedType} Hand Journey</div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text)' }}>Choose your Path</h1>
                        <div className="max-w-md mx-auto"><BorderPattern /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {['Basic', 'Intermediate', 'Advanced'].map((lvl) => {
                            const config = LEVEL_CONFIG[lvl];
                            const levelMudras = getLevelMudras(lvl);
                            const completedCount = getLevelProgress(lvl).length;
                            let isLocked = false, lockReason = '';
                            if (lvl === 'Intermediate' && getLevelProgress('Basic').length < 5) { isLocked = true; lockReason = 'Master 5 Basic Mudras to unlock'; }
                            else if (lvl === 'Advanced' && getLevelProgress('Intermediate').length < getLevelMudras('Intermediate').length) { isLocked = true; lockReason = 'Master all Intermediate Mudras to unlock'; }
                            return (
                                <div key={lvl}
                                    onClick={() => { if (!isLocked) { setSelectedLevel(lvl); setStage(STAGES.MUDRA_LIST); } }}
                                    className={`group p-8 rounded-xl border-2 transition-all duration-500 cursor-pointer relative overflow-hidden ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 shadow-xl'}`}
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform" style={{ color: 'var(--accent)' }}>{config.icon}</div>
                                    <h3 className="text-2xl font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--text)' }}>{lvl}</h3>
                                    <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>{config.title}</p>
                                    {lockReason && (
                                        <div className="mb-6 px-3 py-1 bg-accent/5 rounded-full inline-block border border-accent/10">
                                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>{lockReason}</p>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Completion</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--copper)' }}>{completedCount} / {levelMudras.length}</div>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-accent/10 border border-accent/20 group-hover:bg-accent group-hover:text-white transition-all">
                                            {isLocked ? '🔒' : <ChevronRight size={20} />}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-1 bg-accent transition-all duration-1000"
                                        style={{ width: `${(completedCount / levelMudras.length) * 100}%` }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── STAGE B: MUDRA LIST ──────────────────────────────────── */}
            {stage === STAGES.MUDRA_LIST && (
                <div>
                    <button onClick={() => setStage(STAGES.SELECT_LEVEL)}
                        className="flex items-center gap-2 mb-8 text-xs tracking-widest uppercase hover:text-accent transition-colors"
                        style={{ color: 'var(--text-muted)' }}>
                        <ChevronLeft size={16} /> Back to Levels
                    </button>
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text)' }}>{selectedLevel} {selectedType} Mudras</h2>
                        <BorderPattern />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {MUDRAS.filter(m => m.level === selectedLevel && m.type === selectedType).map((mudra, idx) => {
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

            {/* ── STAGE C: PRACTICE ────────────────────────────────────── */}
            {stage === STAGES.PRACTICE && selectedMudra && (
                <div>
                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => { setStage(STAGES.MUDRA_LIST); stopWebcam(); stop(); }}
                            className="flex items-center gap-2 text-xs tracking-widest uppercase hover:text-accent transition-colors"
                            style={{ color: 'var(--text-muted)' }}>
                            <ChevronLeft size={16} /> Back
                        </button>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShow3D(v => !v)}
                                className="px-3 py-1.5 rounded border text-[9px] tracking-[3px] uppercase transition-all"
                                style={{
                                    backgroundColor: show3D ? 'rgba(139,92,246,0.15)' : 'transparent',
                                    borderColor: show3D ? 'rgba(139,92,246,0.5)' : 'var(--border)',
                                    color: show3D ? '#a78bfa' : 'var(--text-muted)',
                                }}>
                                {show3D ? '◈ 3D On' : '◈ 3D Off'}
                            </button>
                            <LanguageSelector lang={lang} onChange={(v) => {
                                setLang(v);
                                lastWrongVoiceRef.current = { text: '', time: 0 };
                                lastCorrVoiceRef.current = { text: '', time: 0 };
                            }} compact />
                            <button onClick={() => { unlock(); test(); }}
                                className="px-3 py-1.5 rounded text-[9px] tracking-widest uppercase border transition-all"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                Test Voice
                            </button>
                            <button onClick={() => {
                                const next = !voiceEnabled;
                                setVoiceEnabled(next);
                                voiceEnabledRef.current = next;
                                if (next) { unlock(); setTimeout(() => announce.start(selectedMudra.folder), 500); }
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

                        {/* LEFT: Reference + Info ──────────────────────── */}
                        <div className="flex flex-col gap-6">
                            {/* Reference image */}
                            <div className="w-full aspect-video rounded-xl border flex items-center justify-center relative overflow-hidden"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                {mudraContent?.primaryImage && mudraContent.mudraName === selectedMudra.folder ? (
                                    <div className="w-full h-full relative overflow-hidden">
                                        <div className="absolute inset-0 scale-110 blur-xl opacity-30 saturate-150"
                                            style={{ backgroundImage: `url(/uploads/mudras/${selectedMudra.folder}/images/${mudraContent.primaryImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                        <img src={`/uploads/mudras/${selectedMudra.folder}/images/${mudraContent.primaryImage}`}
                                            alt={selectedMudra.name}
                                            className="relative z-10 w-full h-full object-contain drop-shadow-2xl" />
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="text-3xl mb-3 opacity-20">📸</div>
                                        <p className="text-[10px] tracking-[4px] uppercase opacity-40 font-bold">Image Not Available</p>
                                    </div>
                                )}
                                {contentLoading && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent" />
                                    </div>
                                )}
                            </div>

                            {/* 3D Visualiser */}
                            {show3D && cameraOn && (
                                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                                    <div className="text-[9px] tracking-[5px] uppercase mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <span style={{ color: '#8b5cf6' }}>◈</span> 3D Joint Analysis
                                    </div>
                                    <HandVisualiser
                                        targetMudra={selectedMudra.folder}
                                        landmarks={landmarksRef.current || []}
                                        deviations={detected?.deviations || {}}
                                        infoOverride={detected}
                                    />
                                </div>
                            )}

                            {/* Info card */}
                            <div className="p-6 rounded-xl border flex-1" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h1 className="text-3xl font-bold uppercase tracking-tight mb-1" style={{ color: 'var(--accent)' }}>{selectedMudra.name}</h1>
                                        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                                            {mudraContent?.description?.meaning || selectedMudra.meaning}
                                        </p>
                                    </div>
                                    {bestScores[selectedMudra.folder] && (
                                        <div className="text-right">
                                            <div className="text-[9px] tracking-[3px] uppercase opacity-50 mb-1" style={{ color: 'var(--text-muted)' }}>Best</div>
                                            <div className="text-xl font-black" style={{ color: 'var(--copper)' }}>{bestScores[selectedMudra.folder]}%</div>
                                        </div>
                                    )}
                                </div>

                                {/* Finger Guide */}
                                <div className="mb-5 p-4 rounded-lg border" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card2)' }}>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-2 flex items-center gap-2 font-bold" style={{ color: 'var(--accent)' }}>
                                        <BookOpen size={11} /> Finger Guide
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text)' }}>
                                        {fingerGuideText}
                                    </p>
                                    {voiceEnabled && (
                                        <button onClick={() => { unlock(); announce.start(selectedMudra.folder); }}
                                            className="mt-3 text-[9px] tracking-[3px] uppercase font-bold px-3 py-1.5 rounded border transition-all"
                                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                            🔊 Repeat Instructions
                                        </button>
                                    )}
                                </div>

                                {/* Adjusting state */}
                                {cameraOn && (isAdjusting || detected._isMoving) && !isCorrect && (
                                    <div className={`mb-4 p-3 rounded-xl border ${detected._isMoving ? 'border-orange-500/20 bg-orange-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
                                        <div className={`text-[9px] tracking-[3px] uppercase ${detected._isMoving ? 'text-orange-500' : 'text-yellow-500'} font-bold flex items-center gap-2`}>
                                            <span className={`w-2 h-2 rounded-full ${detected._isMoving ? 'bg-orange-400' : 'bg-yellow-400'} animate-pulse`} /> 
                                            {detected._isMoving ? 'Stabilizing…' : 'Adjusting…'}
                                        </div>
                                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                            {detected._isMoving ? 'Hold your hand still for detection' : 'Hold your hand steady for a moment'}
                                        </p>
                                    </div>
                                )}

                                {/* Live corrections */}
                                {cameraOn && !isAdjusting && (wrongMudraMsg || fingerCorrs.length > 0) && (
                                    <div className="mb-4 space-y-2">
                                        {wrongMudraMsg && (
                                            <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30">
                                                <div className="text-[9px] tracking-[4px] uppercase text-red-500 mb-2 font-black flex items-center gap-2">
                                                    ⚠ Wrong Mudra Detected
                                                </div>
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
                                                        <li key={i} className="flex items-center gap-2">
                                                            <span className="text-orange-500">•</span>{c}
                                                        </li>
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
                                            {holdProgress > 0
                                                ? `Saving in ${Math.ceil((1 - holdProgress / 100) * (HOLD_DURATION_MS / 1000))}s…`
                                                : 'Hold this position steady'}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <Trophy size={11} /> Usage
                                    </div>
                                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                        {mudraContent?.description?.usage || selectedMudra.usage}
                                    </p>
                                </div>

                                {sessionComplete && (
                                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg flex items-center gap-3">
                                        <CheckCircle2 className="text-green-500" />
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-widest text-green-700 dark:text-green-300 mb-0.5">Mastered! Score: {sessionScore}%</div>
                                            <p className="text-[10px] text-green-600 dark:text-green-500">Pose held with high accuracy</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Camera ───────────────────────────────── */}
                        <div className="flex flex-col">
                            <div className="w-full rounded-xl overflow-hidden border relative bg-black shadow-inner transition-all duration-500" 
                                 style={{ 
                                     borderColor: (wrongMudraMsg && accuracy === 0) ? '#ef4444' : 'var(--border)', 
                                     height: '520px',
                                     boxShadow: (wrongMudraMsg && accuracy === 0) ? '0 0 25px rgba(239, 68, 68, 0.4)' : 'none'
                                 }}>
                                 {/* Task B: Red Pulsing Border for Structural Veto */}
                                 {(wrongMudraMsg && accuracy === 0) && (
                                     <div className="absolute inset-0 z-10 pointer-events-none animate-pulse border-4 border-red-500/50 mix-blend-screen" />
                                 )}
                                <canvas ref={canvasRef} className="hidden" />
                                {cameraOn ? (
                                    <>
                                        <video ref={videoRef} autoPlay playsInline muted
                                            className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                                        {/* Accuracy overlay */}
                                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 flex flex-col items-end gap-1">
                                            <span className="text-[8px] tracking-[3px] uppercase text-white/50">Accuracy</span>
                                            <span className="text-2xl font-mono font-bold"
                                                style={{ color: accuracy > 75 ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }}>
                                                {isAdjusting ? '…' : `${accuracy.toFixed(0)}%`}
                                            </span>
                                            {!isAdjusting && (
                                                <div className="w-24 h-1.5 bg-white/10 rounded-full">
                                                    <div className="h-full rounded-full transition-all duration-300"
                                                        style={{ width: `${accuracy}%`, backgroundColor: accuracy > 75 ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Hold progress ring */}
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

                                        {/* Adjusting overlay */}
                                        {isAdjusting && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                <div className="px-5 py-2.5 rounded-full backdrop-blur-md"
                                                    style={{ backgroundColor: 'rgba(0,0,0,0.72)', border: '1px solid rgba(245,158,11,0.18)' }}>
                                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(251,191,36,0.8)' }}>
                                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                                        Adjusting…
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Wrong mudra overlay — shows immediately when backend sends it */}
                                        {!isAdjusting && wrongMudraMsg && (
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border text-center z-20 animate-pulse w-[90%]"
                                                style={{ backgroundColor: 'rgba(220,38,38,0.95)', borderColor: '#f87171', color: '#fff' }}>
                                                ⚠ {wrongMudraMsg}
                                            </div>
                                        )}

                                        {/* Mastery frozen overlay */}
                                        {isFrozen && frozenFrame && (
                                            <div className="absolute inset-0 z-50">
                                                <img src={frozenFrame} className="w-full h-full object-cover grayscale-[0.3] brightness-75" alt="Mastery Moment" />
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
                                                            <div className={`text-[10px] font-bold uppercase ${sessionScore > 85 ? 'text-green-400' : sessionScore > 70 ? 'text-amber-400' : 'text-orange-400'}`}>
                                                                {sessionScore > 85 ? 'Excellent' : sessionScore > 70 ? 'Good Form' : 'Improved'}
                                                            </div>
                                                        </div>
                                                        <div className="w-px h-10 bg-white/20 mt-4" />
                                                        <div className="text-center">
                                                            <div className="text-[8px] tracking-[3px] uppercase text-white/50 mb-1">Effort</div>
                                                            <div className="text-3xl font-bold text-white">{attemptsRef.current}</div>
                                                            <div className="text-[10px] font-bold uppercase text-white/50">Attempts</div>
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
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-[85%] z-10">
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
                                                <div className="mb-6 text-5xl">{['📖', '🤚', '🎯'][practiceStep]}</div>
                                                <h3 className="text-white text-lg font-bold mb-2">{PRACTICE_STEPS[practiceStep].title}</h3>
                                                <p className="text-white/40 text-xs tracking-widest max-w-[220px] mb-8 leading-relaxed">{PRACTICE_STEPS[practiceStep].desc}</p>
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

                            {/* Next / status bar */}
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
                                            ? isAdjusting
                                                ? '⟳ Stabilizing — hold your hand steady'
                                                : wrongMudraMsg
                                                    ? `⚠ ${wrongMudraMsg}`
                                                    : fingerCorrs.length > 0
                                                        ? `↻ ${fingerCorrs[0]}`
                                                        : holdProgress > 0
                                                            ? `Hold steady… saving`
                                                            : 'Match the reference image on the left'
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
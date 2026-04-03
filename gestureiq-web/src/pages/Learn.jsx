// src/pages/Learn.jsx — FIXED voice feedback: wrong mudra + corrections + scoring
// Key fixes:
//  1. Separate voice cooldown timers (wrong-mudra vs corrections vs correct)
//  2. Wrong mudra announced every 7s with clear message
//  3. Top correction spoken every 5s 
//  4. Voice fires on first occurrence, no double-fire requirement
//  5. Proper landmark serialization to Flask

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import HandVisualiser from '../components/HandVisualiser';
import { useVoiceGuide, LanguageSelector } from '../hooks/useVoiceGuide';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

const MUDRAS = [
    { name: "Pataka",       meaning: "Flag",                usage: "Clouds, forest, a straight line, river, horse",   fingers: "All four fingers straight together, thumb bent",            level: "Basic",        folder: "pataka"       },
    { name: "Tripataka",    meaning: "Three parts of flag", usage: "Crown, tree, flame, arrow",                        fingers: "Ring finger bent, others straight",                        level: "Basic",        folder: "tripataka"    },
    { name: "Ardhapataka",  meaning: "Half flag",           usage: "Knife, two meanings, leaves",                      fingers: "Ring and little finger bent, others straight",             level: "Basic",        folder: "ardhapataka"  },
    { name: "Kartarimukha", meaning: "Scissors face",       usage: "Separation, lightning, falling",                   fingers: "Index and middle separated like scissors",                 level: "Basic",        folder: "kartarimukha" },
    { name: "Mayura",       meaning: "Peacock",             usage: "Peacock, applying tilak, braid",                   fingers: "Thumb touches ring fingertip, others spread",              level: "Basic",        folder: "mayura"       },
    { name: "Ardhachandra", meaning: "Half moon",           usage: "Moon, plate, spear, beginning prayer",             fingers: "All fingers open, thumb extended sideways",                level: "Basic",        folder: "ardhachandra" },
    { name: "Arala",        meaning: "Bent",                usage: "Drinking nectar, wind, poison",                    fingers: "Index finger bent inward, others straight",                level: "Intermediate", folder: "arala"        },
    { name: "Shukatunda",   meaning: "Parrot beak",         usage: "Shooting arrow, throwing",                         fingers: "Thumb presses ring finger, others straight",               level: "Intermediate", folder: "shukatunda"   },
    { name: "Mushti",       meaning: "Fist",                usage: "Grasping, wrestling, holding hair",                fingers: "All fingers curled into fist, thumb over them",           level: "Intermediate", folder: "mushti"       },
    { name: "Shikhara",     meaning: "Spire",               usage: "Bow, pillar, husband, question",                   fingers: "Thumb raised from fist position",                          level: "Intermediate", folder: "shikhara"     },
    { name: "Kapittha",     meaning: "Wood apple",          usage: "Lakshmi, Saraswati, holding cymbals",              fingers: "Index finger curled, thumb presses it",                    level: "Intermediate", folder: "kapittha"     },
    { name: "Katakamukha",  meaning: "Opening in bracelet", usage: "Picking flowers, garland, pulling bow",            fingers: "Thumb, index, middle form a circle",                       level: "Intermediate", folder: "katakamukha"  },
    { name: "Suchi",        meaning: "Needle",              usage: "Universe, number one, city, this",                 fingers: "Index finger pointing straight up",                        level: "Basic",        folder: "suchi"        },
    { name: "Chandrakala",  meaning: "Digit of moon",       usage: "Moon crescent, forehead mark",                     fingers: "Thumb and index form crescent shape",                      level: "Intermediate", folder: "chandrakala"  },
    { name: "Padmakosha",   meaning: "Lotus bud",           usage: "Lotus flower, fruits, ball, bell",                 fingers: "All fingers spread and curved like a cup",                 level: "Intermediate", folder: "padmakosha"   },
    { name: "Sarpashira",   meaning: "Snake head",          usage: "Snake, elephant trunk, water",                     fingers: "All fingers together, hand bent at wrist",                 level: "Advanced",     folder: "sarpashira"   },
    { name: "Mrigashira",   meaning: "Deer head",           usage: "Deer, forest, gentle touch, woman",                fingers: "Thumb, ring, little finger touch; others straight",        level: "Advanced",     folder: "mrigashira"   },
    { name: "Simhamukha",   meaning: "Lion face",           usage: "Lion, horse, elephant, pearl",                     fingers: "Three fingers spread like lion mane",                      level: "Advanced",     folder: "simhamukha"   },
    { name: "Kangula",      meaning: "Bell",                usage: "Bell fruit, fruit, drop of water",                 fingers: "Four fingers together, thumb bent across",                 level: "Advanced",     folder: "kangula"      },
    { name: "Alapadma",     meaning: "Full bloomed lotus",  usage: "Full moon, beauty, lake, disc",                    fingers: "All five fingers spread wide and curved",                  level: "Advanced",     folder: "alapadma"     },
    { name: "Chatura",      meaning: "Clever",              usage: "Gold, wind, slight, slow",                         fingers: "Four fingers bent, thumb tucked at side",                  level: "Advanced",     folder: "chatura"      },
    { name: "Bhramara",     meaning: "Bee",                 usage: "Bee, bird, six seasons",                           fingers: "Index finger touches thumb; middle bent; others up",       level: "Advanced",     folder: "bhramara"     },
    { name: "Hamsasya",     meaning: "Swan beak",           usage: "Pearl, tying thread, number five",                 fingers: "All fingertips touching thumb tip",                        level: "Advanced",     folder: "hamsasya"     },
    { name: "Hamsapaksha",  meaning: "Swan wing",           usage: "Swan, number six, waving",                         fingers: "Fingers slightly spread in wave shape",                    level: "Advanced",     folder: "hamsapaksha"  },
    { name: "Sandamsha",    meaning: "Tongs",               usage: "Picking flowers, tongs, forceful grasp",           fingers: "Index and middle pinch together",                          level: "Advanced",     folder: "sandamsha"    },
    { name: "Mukula",       meaning: "Bud",                 usage: "Lotus bud, eating, naval",                         fingers: "All fingertips meet at one point",                         level: "Advanced",     folder: "mukula"       },
    { name: "Tamrachuda",   meaning: "Rooster",             usage: "Rooster, peacock, bird crest",                     fingers: "Thumb up from fist, little finger raised",                 level: "Advanced",     folder: "tamrachuda"   },
    { name: "Trishula",     meaning: "Trident",             usage: "Shiva trident, three paths, number three",         fingers: "Index, middle, ring fingers raised; others closed",        level: "Advanced",     folder: "trishula"     },
];

const HOLD_DURATION_MS = 2000;
const STAGES = { SELECT_LEVEL: 'SELECT_LEVEL', MUDRA_LIST: 'MUDRA_LIST', PRACTICE: 'PRACTICE' };
const LEVEL_CONFIG = {
    'Basic':        { title: 'The Foundations', icon: '✦' },
    'Intermediate': { title: 'The Expressions', icon: '❦' },
    'Advanced':     { title: 'The Mastery',     icon: '✧' },
};
const FLASK_URL = (import.meta.env.VITE_FLASK_URL || '').replace(/\/$/, '');

export default function Learn() {
    const { user }  = useAuth();
    const navigate  = useNavigate();

    const [lang, setLang]                   = useState('en');
    const { stop, test, unlock, announce }  = useVoiceGuide({ language: lang });

    const [stage,           setStage]           = useState(STAGES.SELECT_LEVEL);
    const [selectedLevel,   setSelectedLevel]   = useState(null);
    const [selectedMudra,   setSelectedMudra]   = useState(null);
    const [progress,        setProgress]        = useState([]);
    const [bestScores,      setBestScores]      = useState({});
    const [cameraOn,        setCameraOn]        = useState(false);
    const [detected,        setDetected]        = useState({ name: '', confidence: 0, detected: false });
    const [loading,         setLoading]         = useState(true);
    const [mudraContent,    setMudraContent]    = useState(null);
    const [contentLoading,  setContentLoading]  = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionScore,    setSessionScore]    = useState(0);
    const [voiceEnabled,    setVoiceEnabled]    = useState(false);
    const [holdProgress,    setHoldProgress]    = useState(0);
    const [practiceStep,    setPracticeStep]    = useState(0);
    const [show3D,          setShow3D]          = useState(true);
    const [frozenFrame,     setFrozenFrame]     = useState(null);
    const [isFrozen,        setIsFrozen]        = useState(false);

    const attemptsRef       = useRef(0);
    const holdStartRef      = useRef(null);
    const masteredRef       = useRef(false);
    const videoRef          = useRef(null);
    const canvasRef         = useRef(null);
    const streamRef         = useRef(null);
    const handsRef          = useRef(null);
    const landmarksRef      = useRef(null);
    const isDetectingRef    = useRef(false);
    const requestRef        = useRef(null);
    const recoveryRef       = useRef(null);
    const lastResultTimeRef = useRef(Date.now());

    // ── Separate voice cooldown refs (KEY FIX) ──────────────────────────────
    const voiceEnabledRef     = useRef(false);
    const lastWrongVoiceRef   = useRef({ text: '', time: 0 });  // wrong mudra timer
    const lastCorrVoiceRef    = useRef({ text: '', time: 0 });  // finger correction timer
    const lastOkVoiceRef      = useRef(0);                       // correct form timer
    const lastNoHandRef       = useRef(0);                       // no hand timer

    useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

    const PRACTICE_STEPS = [
        { title: 'Study the Position',  desc: 'Look at the reference image carefully. Read the finger instructions below.' },
        { title: 'Prepare Your Hand',   desc: 'Get your hand ready in front of you. Good lighting helps accuracy.'        },
        { title: 'Start Live Practice', desc: 'The AI will watch your hand and give corrections in real time.'             },
    ];

    const getLevelMudras   = (lvl) => MUDRAS.filter(m => m.level === lvl);
    const getLevelProgress = (lvl) => getLevelMudras(lvl).filter(m => progress.includes(m.folder));

    useEffect(() => {
        if (user && user.role !== 'student') { navigate('/'); return; }
        fetchProgress();
    }, [user, navigate]);

    useEffect(() => {
        if (selectedMudra) { setMudraContent(null); fetchMudraContent(selectedMudra.folder); }
        else setMudraContent(null);
    }, [selectedMudra]);

    // Speak mudra instruction when stage becomes PRACTICE and voice is on
    useEffect(() => {
        if (stage === STAGES.PRACTICE && selectedMudra && voiceEnabledRef.current) {
            setTimeout(() => announce.start(selectedMudra.folder), 600);
        }
    }, [stage, selectedMudra]);

    // ── MediaPipe: Hands Setup ──────────────────────────────────────────────
    useEffect(() => {
        if (!cameraOn) return;

        handsRef.current = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        handsRef.current.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

        handsRef.current.onResults((results) => {
            lastResultTimeRef.current = Date.now();
            const canvas = canvasRef.current;
            const video  = videoRef.current;
            if (!canvas || !video) return;

            const ctx = canvas.getContext('2d');
            canvas.width  = video.clientWidth;
            canvas.height = video.clientHeight;
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);

            if (results.multiHandLandmarks?.length > 0) {
                const lms  = results.multiHandLandmarks[0];
                const hand = results.multiHandedness?.[0]?.label || 'Right';
                const sc   = results.multiHandedness?.[0]?.score  || 1.0;
                landmarksRef.current = { landmarks: lms, handedness: hand, score: sc };
                drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#f59e0b', lineWidth: 4 });
                drawLandmarks(ctx, lms, { color: '#ffffff', lineWidth: 1, radius: 2 });
            } else {
                landmarksRef.current = null;
            }
            ctx.restore();
        });

        recoveryRef.current = setInterval(() => {
            if (cameraOn && Date.now() - lastResultTimeRef.current > 3000) {
                lastResultTimeRef.current = Date.now();
            }
        }, 1000);

        return () => {
            if (recoveryRef.current) clearInterval(recoveryRef.current);
            if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
        };
    }, [cameraOn]);

    // ── Frame Loop ──────────────────────────────────────────────────────────
    useEffect(() => {
        let active = true;
        const processFrame = async () => {
            if (active && cameraOn && videoRef.current?.readyState >= 2 && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current }).catch(() => {});
            }
            if (active && cameraOn) requestRef.current = requestAnimationFrame(processFrame);
        };
        if (cameraOn) requestRef.current = requestAnimationFrame(processFrame);
        return () => {
            active = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [cameraOn]);

    // ── Webcam ──────────────────────────────────────────────────────────────
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
    }, []);

    useEffect(() => {
        if (cameraOn && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }
    }, [cameraOn]);

    const captureFrame = useCallback(() => {
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return null;
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.7);
    }, []);

    // ── DETECTION POLLING — voice logic is the main fix ─────────────────────
    useEffect(() => {
        if (stage !== STAGES.PRACTICE || !cameraOn || !selectedMudra) return;
        masteredRef.current = false;

        // Reset voice cooldowns when mudra changes
        lastWrongVoiceRef.current = { text: '', time: 0 };
        lastCorrVoiceRef.current  = { text: '', time: 0 };
        lastOkVoiceRef.current    = 0;
        lastNoHandRef.current     = 0;

        const interval = setInterval(async () => {
            if (isDetectingRef.current) return;
            isDetectingRef.current = true;

            try {
                const dataObj = landmarksRef.current;

                // ── NO HAND ──────────────────────────────────────────────────
                if (!dataObj || !dataObj.landmarks) {
                    setDetected({ name: 'No Hand', confidence: 0, detected: false });
                    setHoldProgress(0);
                    holdStartRef.current = null;

                    // Voice: no hand reminder every 6s
                    if (voiceEnabledRef.current) {
                        const now = Date.now();
                        if (now - lastNoHandRef.current > 6000) {
                            lastNoHandRef.current = now;
                            announce.raw(lang === 'ta' ? 'உங்கள் கையை கேமராவில் காட்டுங்கள்' : 'Show your hand to the camera', 2);
                        }
                    }
                    isDetectingRef.current = false;
                    return;
                }

                attemptsRef.current += 1;

                // Convert MediaPipe landmarks to plain array
                const lmArray = Array.from(dataObj.landmarks).map(lm => ({
                    x: lm.x ?? lm[0],
                    y: lm.y ?? lm[1],
                    z: lm.z ?? lm[2],
                }));

                const res = await fetch(`${FLASK_URL}/api/detect_landmarks`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        landmarks:     lmArray,
                        handedness:    dataObj.handedness || 'Right',
                        presenceScore: dataObj.score      || 1.0,
                        targetMudra:   selectedMudra.folder,
                    }),
                    signal: AbortSignal.timeout(1500),
                });

                const data = await res.json();
                setDetected(data);

                // ═══════════════════════════════════════════════════════════
                // VOICE FEEDBACK — COMPLETELY REWRITTEN (the main fix)
                // Uses separate timers so wrong-mudra never blocks corrections
                // ═══════════════════════════════════════════════════════════
                if (voiceEnabledRef.current && data) {
                    const now         = Date.now();
                    const accuracy    = data.accuracy    || 0;
                    const corrections = data.corrections || [];
                    const detected    = data.detected    || false;
                    const mudraName   = data.name        || '';

                    // Find messages by type
                    const wrongMsg   = corrections.find(c => typeof c === 'string' && c.toLowerCase().startsWith('wrong mudra'));
                    const fingerCorr = corrections.filter(c => typeof c === 'string' && !c.toLowerCase().startsWith('wrong mudra'));

                    // ── 1. WRONG MUDRA (highest priority, every 7s) ──────────
                    if (wrongMsg) {
                        const prev = lastWrongVoiceRef.current;
                        if (wrongMsg !== prev.text || (now - prev.time) > 7000) {
                            lastWrongVoiceRef.current = { text: wrongMsg, time: now };

                            // Build clear spoken message
                            const detMatch = wrongMsg.match(/showing ([a-zA-Z]+)/i);
                            const tgtMatch = wrongMsg.match(/target is ([a-zA-Z]+)/i);
                            const detName  = detMatch ? detMatch[1] : mudraName;
                            const tgtName  = tgtMatch ? tgtMatch[1] : selectedMudra.folder;

                            let voiceMsg;
                            if (lang === 'ta') {
                                voiceMsg = `தவறான முத்திரை. நீங்கள் ${detName} காட்டுகிறீர்கள். இலக்கு ${tgtName}.`;
                            } else if (lang === 'hi') {
                                voiceMsg = `गलत मुद्रा। आप ${detName} दिखा रहे हैं। लक्ष्य ${tgtName} है।`;
                            } else {
                                voiceMsg = `Wrong mudra. You are showing ${detName}. The target mudra is ${tgtName}.`;
                            }
                            announce.raw(voiceMsg, 3);
                        }
                    }

                    // ── 2. FINGER CORRECTIONS (every 5s, only when correct mudra) ─
                    else if (fingerCorr.length > 0 && detected && !wrongMsg) {
                        const topCorr = fingerCorr[0];
                        const prev    = lastCorrVoiceRef.current;
                        if (topCorr !== prev.text || (now - prev.time) > 5000) {
                            lastCorrVoiceRef.current = { text: topCorr, time: now };
                            announce.raw(topCorr, 1);
                        }
                    }

                    // ── 3. CORRECT FORM (every 8s) ───────────────────────────
                    else if (detected && accuracy >= 72 && fingerCorr.length === 0 && !wrongMsg) {
                        if (now - lastOkVoiceRef.current > 8000) {
                            lastOkVoiceRef.current = now;
                            const msg = lang === 'ta' ? 'சரியானது! அருமையான கோலம்'
                                      : lang === 'hi' ? 'सही है! बहुत अच्छा'
                                      : 'Correct! Great form.';
                            announce.raw(msg, 3);
                        }
                    }
                }

                // ── HOLD DETECTION ──────────────────────────────────────────
                const accuracy    = data.accuracy    || 0;
                const corrections = data.corrections || [];
                const fingerOnly  = corrections.filter(c => typeof c === 'string' && !c.toLowerCase().startsWith('wrong'));
                const isCorrect   = data.detected && accuracy >= 62 && fingerOnly.length === 0;

                if (isCorrect) {
                    if (!holdStartRef.current) holdStartRef.current = Date.now();
                    const elapsed = Date.now() - holdStartRef.current;
                    setHoldProgress(Math.min(100, (elapsed / HOLD_DURATION_MS) * 100));
                    if (elapsed >= HOLD_DURATION_MS && !masteredRef.current) {
                        masteredRef.current = true;
                        handleMudraMastered(selectedMudra.folder, accuracy);
                    }
                } else {
                    if (holdStartRef.current) { holdStartRef.current = null; setHoldProgress(0); }
                }
            } catch (err) {
                console.warn('[Learn] Detection error:', err.message);
            } finally {
                isDetectingRef.current = false;
            }
        }, 200);

        return () => { clearInterval(interval); holdStartRef.current = null; setHoldProgress(0); };
    }, [stage, cameraOn, selectedMudra, lang, announce]);

    // ── Data fetching ───────────────────────────────────────────────────────
    const fetchProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/progress', { headers: { 'x-auth-token': token } });
            setProgress(res.data.progress.detectedMudras || []);
            setBestScores(res.data.progress.mudraScores  || {});
        } catch {} finally { setLoading(false); }
    };

    const fetchMudraContent = async (mudraName) => {
        setContentLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/user/mudra/content/${mudraName}`, { headers: { 'x-auth-token': token } });
            setMudraContent(res.data);
        } catch {} finally { setContentLoading(false); }
    };

    const handleMudraMastered = async (folder, currentAccuracy) => {
        if (!folder) return;
        try {
            const token = localStorage.getItem('token');
            const score    = Math.round(currentAccuracy);
            const snapshot = captureFrame();
            setFrozenFrame(snapshot);
            setIsFrozen(true);
            setSessionScore(score);
            const res = await axios.post('/api/user/progress/update', { mudraName: folder, score }, { headers: { 'x-auth-token': token } });
            setProgress(res.data.detectedMudras || []);
            setBestScores(res.data.mudraScores  || {});
            setSessionComplete(true);
            stopWebcam();
            setHoldProgress(0);
            if (voiceEnabledRef.current) {
                announce.mastered({ mudra: selectedMudra.name, score, attempts: attemptsRef.current });
            }
            attemptsRef.current = 0;
        } catch { console.error('Failed to update progress'); }
    };

    const enterPractice = (mudra) => {
        setSelectedMudra(mudra);
        setSessionComplete(false);
        setDetected({ name: '', confidence: 0, detected: false });
        setHoldProgress(0);
        holdStartRef.current = null;
        masteredRef.current  = false;
        setPracticeStep(0);
        setIsFrozen(false);
        setFrozenFrame(null);
        attemptsRef.current = 0;
        setStage(STAGES.PRACTICE);
    };

    const nextMudra = () => {
        const levelMudras  = getLevelMudras(selectedLevel);
        const currentIndex = levelMudras.findIndex(m => m.folder === selectedMudra.folder);
        setIsFrozen(false);
        setFrozenFrame(null);
        attemptsRef.current = 0;
        if (currentIndex < levelMudras.length - 1) enterPractice(levelMudras[currentIndex + 1]);
        else setStage(STAGES.MUDRA_LIST);
    };

    // ── Derived ─────────────────────────────────────────────────────────────
    const accuracy       = detected.accuracy    || 0;
    const corrections    = detected.corrections || [];
    const fingerCorrs    = corrections.filter(c => typeof c === 'string' && !c.toLowerCase().startsWith('wrong mudra'));
    const wrongMudraMsg  = corrections.find(c => typeof c === 'string' && c.toLowerCase().startsWith('wrong mudra'));
    const isCorrect      = detected.detected && accuracy > 65 && fingerCorrs.length === 0 && !wrongMudraMsg;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }} />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen">

            {/* ── STAGE A: LEVEL SELECTION ─────────────────────────────── */}
            {stage === STAGES.SELECT_LEVEL && (
                <div>
                    <div className="text-center mb-16">
                        <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Learning Journey</div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text)' }}>Choose your Path</h1>
                        <div className="max-w-md mx-auto"><BorderPattern /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {['Basic', 'Intermediate', 'Advanced'].map((lvl) => {
                            const config         = LEVEL_CONFIG[lvl];
                            const levelMudras    = getLevelMudras(lvl);
                            const completedCount = getLevelProgress(lvl).length;
                            let isLocked = false, lockReason = '';
                            if (lvl === 'Intermediate' && getLevelProgress('Basic').length < 5)
                                { isLocked = true; lockReason = 'Master 5 Basic Mudras to unlock'; }
                            else if (lvl === 'Advanced' && getLevelProgress('Intermediate').length < getLevelMudras('Intermediate').length)
                                { isLocked = true; lockReason = 'Master all Intermediate Mudras to unlock'; }
                            return (
                                <div key={lvl}
                                    onClick={() => { if (!isLocked) { setSelectedLevel(lvl); setStage(STAGES.MUDRA_LIST); } }}
                                    className={`group p-8 rounded-xl border-2 transition-all duration-500 cursor-pointer relative overflow-hidden ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 shadow-xl'}`}
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform" style={{ color: 'var(--accent)' }}>{config.icon}</div>
                                    <h3 className="text-2xl font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--text)' }}>{lvl}</h3>
                                    <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>{config.title}</p>
                                    {lockReason && <div className="mb-6 px-3 py-1 bg-accent/5 rounded-full inline-block border border-accent/10"><p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>{lockReason}</p></div>}
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Completion</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--copper)' }}>{completedCount} / {levelMudras.length}</div>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-accent/10 border border-accent/20 group-hover:bg-accent group-hover:text-white transition-all">
                                            {isLocked ? '🔒' : <ChevronRight size={20} />}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-1 bg-accent transition-all duration-1000" style={{ width: `${(completedCount / levelMudras.length) * 100}%` }} />
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
                        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text)' }}>{selectedLevel} Mudras</h2>
                        <BorderPattern />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {MUDRAS.filter(m => m.level === selectedLevel).map((mudra, idx) => {
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

            {/* ── STAGE C: PRACTICE ──────────────────────────────────────── */}
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
                                    borderColor:     show3D ? 'rgba(139,92,246,0.5)'  : 'var(--border)',
                                    color:           show3D ? '#a78bfa'               : 'var(--text-muted)',
                                }}>
                                {show3D ? '◈ 3D On' : '◈ 3D Off'}
                            </button>
                            <LanguageSelector lang={lang} onChange={(v) => { setLang(v); lastWrongVoiceRef.current = { text: '', time: 0 }; lastCorrVoiceRef.current = { text: '', time: 0 }; }} compact />
                            <button onClick={test}
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
                                    lastCorrVoiceRef.current  = { text: '', time: 0 };
                                }}
                                className="px-4 py-2 rounded text-[10px] tracking-widest uppercase font-bold border transition-all"
                                style={{
                                    backgroundColor: voiceEnabled ? 'var(--copper)' : 'transparent',
                                    borderColor:     voiceEnabled ? 'var(--copper)' : 'var(--border)',
                                    color:           voiceEnabled ? 'white'         : 'var(--text-muted)',
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
                                            borderColor:     practiceStep >= i ? 'var(--accent)' : 'var(--border)',
                                            color:           practiceStep >= i ? 'white'         : 'var(--text-muted)',
                                        }}>{i + 1}</div>
                                    <span className="text-[9px] tracking-widest uppercase hidden md:block"
                                        style={{ color: practiceStep === i ? 'var(--text)' : 'var(--text-muted)' }}>{s.title}</span>
                                    {i < 2 && <div className="w-8 h-px mx-1" style={{ backgroundColor: 'var(--border)' }} />}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 min-h-[600px]">

                        {/* LEFT: Reference + Info ─────────────────────────── */}
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
                                        landmarks={landmarksRef.current?.landmarks || []}
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
                                        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>{mudraContent?.description?.meaning || selectedMudra.meaning}</p>
                                    </div>
                                    {bestScores[selectedMudra.folder] && (
                                        <div className="text-right">
                                            <div className="text-[9px] tracking-[3px] uppercase opacity-50 mb-1" style={{ color: 'var(--text-muted)' }}>Best</div>
                                            <div className="text-xl font-black" style={{ color: 'var(--copper)' }}>{bestScores[selectedMudra.folder]}%</div>
                                        </div>
                                    )}
                                </div>

                                {/* Finger guide */}
                                <div className="mb-5 p-4 rounded-lg border" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card2)' }}>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-2 flex items-center gap-2 font-bold" style={{ color: 'var(--accent)' }}>
                                        <BookOpen size={11} /> Finger Guide
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text)' }}>
                                        {selectedMudra.fingers}
                                    </p>
                                    {voiceEnabled && (
                                        <button onClick={() => announce.start(selectedMudra.folder)}
                                            className="mt-3 text-[9px] tracking-[3px] uppercase font-bold px-3 py-1.5 rounded border transition-all"
                                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                            🔊 Repeat Instructions
                                        </button>
                                    )}
                                </div>

                                {/* LIVE CORRECTIONS — shown prominently ───────── */}
                                {cameraOn && (wrongMudraMsg || fingerCorrs.length > 0) && (
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
                                                        <li key={i} className="flex items-center gap-2"><span className="text-orange-500">•</span>{c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Correct form indicator */}
                                {cameraOn && isCorrect && (
                                    <div className="mb-4 p-4 rounded-xl border bg-green-500/10 border-green-500/30">
                                        <div className="text-[9px] tracking-[4px] uppercase text-green-500 font-black flex items-center gap-2">
                                            ✓ Correct Form — {Math.round(accuracy)}%
                                        </div>
                                        <p className="text-xs text-green-400 mt-1">
                                            {holdProgress > 0 ? `Hold for ${Math.ceil((1 - holdProgress/100) * (HOLD_DURATION_MS/1000))}s to save` : 'Hold this position steady'}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <Trophy size={11} /> Usage
                                    </div>
                                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{mudraContent?.description?.usage || selectedMudra.usage}</p>
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

                        {/* RIGHT: Camera ───────────────────────────────────── */}
                        <div className="flex flex-col">
                            <div className="w-full rounded-xl overflow-hidden border relative bg-black shadow-inner" style={{ borderColor: 'var(--border)', height: '520px' }}>
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
                                                {accuracy.toFixed(0)}%
                                            </span>
                                            <div className="w-24 h-1.5 bg-white/10 rounded-full">
                                                <div className="h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${accuracy}%`, backgroundColor: accuracy > 75 ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }} />
                                            </div>
                                        </div>

                                        {/* Hold progress */}
                                        {holdProgress > 0 && (
                                            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-green-500/30">
                                                <span className="text-[8px] tracking-[3px] uppercase text-green-400">Hold</span>
                                                <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                                                    <div className="h-full rounded-full transition-all duration-200 bg-green-400" style={{ width: `${holdProgress}%` }} />
                                                </div>
                                                <span className="text-[9px] text-green-300 font-bold">
                                                    {Math.ceil((1 - holdProgress / 100) * (HOLD_DURATION_MS / 1000))}s
                                                </span>
                                            </div>
                                        )}

                                        {/* Wrong mudra overlay */}
                                        {wrongMudraMsg && (
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
                                        {!isFrozen && detected.detected && (
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-[85%] z-10">
                                                {!wrongMudraMsg && (
                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border ${isCorrect ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}`}>
                                                        {isCorrect ? '✓ Correct Form' : '↻ Adjusting...'}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Bottom bar */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 px-5 py-3 flex items-center justify-between">
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

                            {/* Next / status */}
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
                                            ? wrongMudraMsg
                                                ? `⚠ ${wrongMudraMsg}`
                                                : fingerCorrs.length > 0
                                                    ? `↻ ${fingerCorrs[0]}`
                                                    : holdProgress > 0
                                                        ? `Hold steady… ${Math.ceil((1 - holdProgress / 100) * 2)}s`
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
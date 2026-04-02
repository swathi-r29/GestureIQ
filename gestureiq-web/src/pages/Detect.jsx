
// src/pages/Detect.jsx
// ─────────────────────────────────────────────────────────────────────────────
// MODULE ROLE: STANDALONE FREE-PRACTICE DETECTOR
// Updated: Natural voice + 6-language support + HoldDetectionRing + HandVisualiser
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { useVoiceGuide, LanguageSelector } from '../hooks/useVoiceGuide';
import HandVisualiser from '../components/HandVisualiser';
import HoldDetectionRing from '../components/HoldDetectionRing';
import { io } from 'socket.io-client';
const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

const MUDRAS = [
    { folder: "pataka",       name: "Pataka",       meaning: "Flag",                usage: "Clouds, forest, a straight line, river, horse",   fingers: "All four fingers straight together, thumb bent",            level: "Basic"        },
    { folder: "tripataka",    name: "Tripataka",    meaning: "Three parts of flag", usage: "Crown, tree, flame, arrow",                        fingers: "Ring finger bent, others straight and joined",             level: "Basic"        },
    { folder: "ardhapataka",  name: "Ardhapataka",  meaning: "Half flag",           usage: "Knife, two meanings, leaves",                      fingers: "Ring and little finger bent, others straight",             level: "Basic"        },
    { folder: "kartarimukha", name: "Kartarimukha", meaning: "Scissors face",       usage: "Separation, lightning, falling",                   fingers: "Index and middle separated like scissors",                 level: "Basic"        },
    { folder: "mayura",       name: "Mayura",       meaning: "Peacock",             usage: "Peacock, applying tilak, braid",                   fingers: "Thumb touches ring fingertip, others spread",              level: "Basic"        },
    { folder: "ardhachandra", name: "Ardhachandra", meaning: "Half moon",           usage: "Moon, plate, spear, beginning prayer",             fingers: "All fingers open, thumb extended sideways",                level: "Basic"        },
    { folder: "arala",        name: "Arala",        meaning: "Bent",                usage: "Drinking nectar, wind, poison",                    fingers: "Index finger bent inward, others straight",                level: "Intermediate" },
    { folder: "shukatunda",   name: "Shukatunda",   meaning: "Parrot beak",         usage: "Shooting arrow, throwing",                         fingers: "Thumb presses ring finger, others straight",               level: "Intermediate" },
    { folder: "mushti",       name: "Mushti",       meaning: "Fist",                usage: "Grasping, wrestling, holding hair",                fingers: "All fingers curled into fist, thumb over them",           level: "Intermediate" },
    { folder: "shikhara",     name: "Shikhara",     meaning: "Spire",               usage: "Bow, pillar, husband, question",                   fingers: "Thumb raised from fist position",                          level: "Intermediate" },
    { folder: "kapittha",     name: "Kapittha",     meaning: "Wood apple",          usage: "Lakshmi, Saraswati, holding cymbals",              fingers: "Index finger curled, thumb presses it",                    level: "Intermediate" },
    { folder: "katakamukha",  name: "Katakamukha",  meaning: "Opening in bracelet", usage: "Picking flowers, garland, pulling bow",            fingers: "Thumb, index, middle form a circle",                       level: "Intermediate" },
    { folder: "suchi",        name: "Suchi",        meaning: "Needle",              usage: "Universe, number one, city, this",                 fingers: "Index finger pointing straight up",                        level: "Basic"        },
    { folder: "chandrakala",  name: "Chandrakala",  meaning: "Digit of moon",       usage: "Moon crescent, forehead mark",                     fingers: "Thumb and index form crescent shape",                      level: "Intermediate" },
    { folder: "padmakosha",   name: "Padmakosha",   meaning: "Lotus bud",           usage: "Lotus flower, fruits, ball, bell",                 fingers: "All fingers spread and curved like a cup",                 level: "Intermediate" },
    { folder: "sarpashira",   name: "Sarpashira",   meaning: "Snake head",          usage: "Snake, elephant trunk, water",                     fingers: "All fingers together, hand bent at wrist",                 level: "Advanced"     },
    { folder: "mrigashira",   name: "Mrigashira",   meaning: "Deer head",           usage: "Deer, forest, gentle touch, woman",                fingers: "Thumb, ring, little finger touch; others straight",        level: "Advanced"     },
    { folder: "simhamukha",   name: "Simhamukha",   meaning: "Lion face",           usage: "Lion, horse, elephant, pearl",                     fingers: "Three fingers spread like lion mane",                      level: "Advanced"     },
    { folder: "kangula",      name: "Kangula",      meaning: "Bell",                usage: "Bell, fruit, small rounded objects",               fingers: "Ring and little finger bent inward, others straight",      level: "Advanced"     },
    { folder: "alapadma",     name: "Alapadma",     meaning: "Full bloomed lotus",  usage: "Full moon, beauty, lake, disc",                    fingers: "All five fingers spread wide and curved",                  level: "Advanced"     },
    { folder: "chatura",      name: "Chatura",      meaning: "Clever",              usage: "Gold, wind, slight, slow",                         fingers: "Four fingers bent, thumb tucked at side",                  level: "Advanced"     },
    { folder: "bhramara",     name: "Bhramara",     meaning: "Bee",                 usage: "Bee, bird, six seasons",                           fingers: "Index finger touches thumb; middle bent; others up",       level: "Advanced"     },
    { folder: "hamsasya",     name: "Hamsasya",     meaning: "Swan beak",           usage: "Pearl, tying thread, number five",                 fingers: "All fingertips touching thumb tip",                        level: "Advanced"     },
    { folder: "hamsapaksha",  name: "Hamsapaksha",  meaning: "Swan wing",           usage: "Swan, number six, waving",                         fingers: "Fingers slightly spread in wave shape",                    level: "Advanced"     },
    { folder: "sandamsha",    name: "Sandamsha",    meaning: "Tongs",               usage: "Picking flowers, tongs, forceful grasp",           fingers: "Index and middle pinch together",                          level: "Advanced"     },
    { folder: "mukula",       name: "Mukula",       meaning: "Bud",                 usage: "Lotus bud, eating, naval",                         fingers: "All fingertips meet at one point",                         level: "Advanced"     },
    { folder: "tamrachuda",   name: "Tamrachuda",   meaning: "Rooster",             usage: "Rooster, peacock, bird crest",                     fingers: "Thumb up from fist, little finger raised",                 level: "Advanced"     },
    { folder: "trishula",     name: "Trishula",     meaning: "Trident",             usage: "Shiva trident, three paths, number three",         fingers: "Index, middle, ring fingers raised; others closed",        level: "Advanced"     },
];

const HOLD_DURATION_MS = 1500;

const LEVEL_COLORS = {
    Basic:        { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", border: "rgba(16, 185, 129, 0.3)" },
    Intermediate: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" },
    Advanced:     { bg: "rgba(220, 38, 38, 0.1)",  text: "#DC2626", border: "rgba(220, 38, 38, 0.3)"  },
};

let _socket = null;
function getSocket() {
    if (!_socket) {
        _socket = io(import.meta.env.VITE_BACKEND_URL, { transports: ['websocket'], reconnectionAttempts: 5 });
    }
    return _socket;
}

export default function Detect() {
    const { user }   = useAuth();
    const navigate   = useNavigate();

    // ── Language + Voice ──────────────────────────────────────
    const [lang, setLang] = useState('en');
    const { speak, stop, test, unlock, announce } = useVoiceGuide({ language: lang });

    // ── Core state ────────────────────────────────────────────
    const [cameraOn,      setCameraOn]      = useState(false);
    const [voiceEnabled,  setVoiceEnabled]  = useState(false);
    const [detected,      setDetected]      = useState({ name: '', confidence: 0, detected: false });
    const [progress,      setProgress]      = useState([]);
    const [saved,         setSaved]         = useState(false);
    const [visible,       setVisible]       = useState(false);
    const [selectedMudra, setSelectedMudra] = useState('');
    const [holdState,     setHoldState]     = useState('idle');
    const [holdProgress,  setHoldProgress]  = useState(0);
    const [landmarks,       setLandmarks]       = useState(null);
    const [autoResult,      setAutoResult]      = useState(null);
    const [show3D,        setShow3D]        = useState(true);

    const holdStartRef        = useRef(null);
    const savedRef            = useRef(false);
    const manualHoldPct       = useRef(0);
    const videoRef            = useRef(null);
    const canvasRef           = useRef(null);
    const streamRef           = useRef(null);
    const landmarksRef        = useRef(null);
    const lastResultTimeRef   = useRef(Date.now());
    const isDetectingRef      = useRef(false);
    const handsRef            = useRef(null);
    const requestRef          = useRef(null);
    const recoveryIntervalRef = useRef(null);
    // Voice stability: only announce correction after seeing it 2x in a row

    // ── Init ──────────────────────────────────────────────────
    // ── Init MediaPipe ───────────────────────────────────────
    useEffect(() => {
        if (user && user.role !== 'student') { navigate('/'); return; }
        
        handsRef.current = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsRef.current.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        handsRef.current.onResults((results) => {
            lastResultTimeRef.current = Date.now();
            const canvas = canvasRef.current;
            const video  = videoRef.current;
            if (!canvas || !video) return;
            
            const ctx = canvas.getContext('2d');
            
            // Sync canvas size to visible video size for perfect alignment
            canvas.width  = video.clientWidth;
            canvas.height = video.clientHeight;
            
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Handle Mirroring for 2D UI matching (CSS scaleX(-1))
            // Since the video is mirrored via CSS, we mirror the drawing context
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                let landmarks = results.multiHandLandmarks[0];
                let handedness = results.multiHandedness[0]?.label || 'Right';
                const score = results.multiHandedness[0]?.score || 0;
                
                // ── Frontend Mirroring (Trick Backend) ──
                // If it's a left hand, we mirror it horizontally to treat it as a right hand.
                if (handedness === 'Left') {
                    landmarks = landmarks.map(lm => ({
                        ...lm,
                        x: 1 - lm.x
                    }));
                    handedness = 'Right'; // Now seen as Right by everything downstream
                }
                
                landmarksRef.current = { landmarks, score, handedness };

                // SYNC: Update landmarks state for the 3D visualizer
                setLandmarks(landmarks);
                
                // Draw skeleton (Now perfectly aligned with mirrored video)
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#f59e0b', lineWidth: 4 });
                drawLandmarks(ctx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 2 });
            } else {
                landmarksRef.current = null;
            }
            ctx.restore();
        });

        // ── Auto-Recovery Monitor ──
        recoveryIntervalRef.current = setInterval(() => {
            if (cameraOn && (Date.now() - lastResultTimeRef.current > 3000)) {
                console.warn("[MediaPipe] Stale results detected. Re-initializing worker...");
                lastResultTimeRef.current = Date.now(); // reset to avoid loop
                if (handsRef.current) handsRef.current.dispatchEvent({type: 'error', message: 'recovery'});
            }
        }, 1000);

        setTimeout(() => setVisible(true), 100);
        fetchProgress();
        return () => {
            stop();
            if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current);
            if (handsRef.current) handsRef.current.close();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [user, navigate]);

    // ── Socket: auto_evaluation from Flask ────────────────────
    useEffect(() => {
        const socket = getSocket();
        const onAutoEval = (result) => {
            setAutoResult(result);
            setDetected(result);
            if (voiceEnabled) {
                if (result.accuracy >= 75) {
                    announce.correct();
                } else if (result.corrections?.length > 0) {
                    const wrongMsg   = result.corrections.find(c => c.startsWith('Wrong mudra'));
                    const fingerCorr = result.corrections.find(c => !c.startsWith('Wrong mudra'));
                    if (wrongMsg) announce.correction(wrongMsg);
                    else if (fingerCorr) announce.correction(fingerCorr);
                }
            }
            if (result.detected && result.accuracy >= 75 && !savedRef.current) {
                savedRef.current = true;
                saveProgress(result.name);
            }
        };
        socket.on('auto_evaluation', onAutoEval);
        return () => socket.off('auto_evaluation', onAutoEval);
    }, [voiceEnabled]);

    // ── Notify Flask when target changes ──────────────────────
    useEffect(() => {
        if (selectedMudra && cameraOn) getSocket().emit('set_free_practice_target', { target: selectedMudra });
        setAutoResult(null);
        savedRef.current = false;
    }, [selectedMudra, cameraOn]);

    // ── Webcam ────────────────────────────────────────────────
    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
            streamRef.current = stream;
            setCameraOn(true);
            unlock(); // FIX: Audio Unlock on user interaction
            if (voiceEnabled) announce.cameraActive();
        } catch (err) {
            console.error("Webcam Error:", err);
            alert('Camera access denied. Please allow camera permission and use HTTPS.');
        }
    };

    const stopWebcam = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraOn(false);
        setHoldState('idle');
        setHoldProgress(0);
        setAutoResult(null);
        stop();
    };

    const captureFrame = () => {
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return null;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.save(); ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.6);
    };

    useEffect(() => {
        if (cameraOn && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
            if (selectedMudra) getSocket().emit('set_free_practice_target', { target: selectedMudra });
            
            // Start MediaPipe processing loop
            const process = async () => {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                    await handsRef.current.send({ image: videoRef.current });
                }
                requestRef.current = requestAnimationFrame(process);
            };
            requestRef.current = requestAnimationFrame(process);
        }
        if (!cameraOn) {
            holdStartRef.current = null;
            manualHoldPct.current = 0;
            savedRef.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            stop();
        }
    }, [cameraOn]);

    // ── Detection polling (Landmarks JSON) ───────────────────
    useEffect(() => {
        if (!cameraOn) return;
        const interval = setInterval(async () => {
            if (isDetectingRef.current) return;
            const dataObj = landmarksRef.current;
            if (!dataObj) return;

            isDetectingRef.current = true;
            try {
                const res  = await fetch(`${import.meta.env.VITE_FLASK_URL || ''}/api/detect_landmarks`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        landmarks: dataObj.landmarks,
                        presenceScore: dataObj.score,
                        handedness: dataObj.handedness,
                        targetMudra: selectedMudra || '' 
                    })
                });
                const data = await res.json();
                if (holdState !== 'evaluating') setDetected(data);

                const accuracy    = data.accuracy    || 0;
                const confidence  = data.confidence  || 0;
                const corrections = data.corrections || [];
                const isGood      = data.detected && confidence >= 70 && accuracy >= 70 && corrections.length === 0;

                if (voiceEnabled && holdState === 'idle') {
                    announce.fromResult(data);
                }

                if (isGood) {
                    if (!holdStartRef.current) holdStartRef.current = Date.now();
                    const elapsed = Date.now() - holdStartRef.current;
                    manualHoldPct.current = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
                    if (holdState === 'idle') setHoldProgress(manualHoldPct.current);
                    if (elapsed >= HOLD_DURATION_MS && !savedRef.current) {
                        savedRef.current = true;
                        saveProgress(data.name);
                    }
                } else {
                    if (holdStartRef.current) {
                        holdStartRef.current = null;
                        manualHoldPct.current = 0;
                        if (holdState === 'idle') setHoldProgress(0);
                    }
                }
            } catch (err) { 
                console.error("Landmark API error:", err);
            }
            finally { isDetectingRef.current = false; }
        }, 150); // Polling faster now (150ms) since payload is small
        return () => { clearInterval(interval); holdStartRef.current = null; };
    }, [cameraOn, voiceEnabled, selectedMudra, holdState]);

    // ── Poll /mudra_data for Flask hold state ─────────────────
    useEffect(() => {
        if (!cameraOn) return;
        const interval = setInterval(async () => {
            try {
                const res  = await fetch(`/mudra_data?target=${selectedMudra || ''}`);
                const data = await res.json();
                setHoldState(data.hold_state || 'idle');
                if (data.hold_state !== 'idle') setHoldProgress(data.hold_progress || 0);
                if (data.auto_result && data.hold_state === 'evaluating') setAutoResult(data.auto_result);
            } catch { }
        }, 300);
        return () => clearInterval(interval);
    }, [cameraOn, selectedMudra]);

    // ── Progress ──────────────────────────────────────────────
    const fetchProgress = async () => {
        try { 
            const res = await axios.get('/api/user/progress'); 
            setProgress(res.data.progress); 
        } catch { }
    };

    const saveProgress = async (mudraName) => {
        setSaved(true);
        try {
            const res = await axios.post('/api/user/progress/update', { mudraName });
            setProgress(res.data);
            if (voiceEnabled) announce.saved(mudraName);
        } catch { }
        setTimeout(() => { setSaved(false); savedRef.current = false; }, 3000);
    };

    // ── Derived display ───────────────────────────────────────
    const displayData   = (holdState === 'evaluating' && autoResult) ? autoResult : detected;
    const mudraInfo     = MUDRAS.find(m => m.folder === displayData.name);
    const confidence    = displayData.confidence || 0;
    const accuracy      = displayData.accuracy   || 0;
    const isDetected    = displayData.detected;
    const corrections   = displayData.corrections || [];
    const wrongMudraMsg = corrections.find(c => typeof c === 'string' && c.startsWith('Wrong mudra'));

    return (
        <div className={`max-w-6xl mx-auto px-6 py-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Header */}
            <div className="text-center mb-10">
                <div className="text-[10px] tracking-[6px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Live Recognition</div>
                <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Mudra Detection</h2>
                <BorderPattern />
                <p className="text-xs tracking-widest mt-2 uppercase" style={{ color: 'var(--text-muted)' }}>
                    Hold your hand clearly · Good lighting · Face the camera
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] tracking-[4px] uppercase" style={{ color: 'var(--text-muted)' }}>Target:</span>
                    <select value={selectedMudra} onChange={e => setSelectedMudra(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded border outline-none"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                        <option value="">Free Detect (Any Mudra)</option>
                        {MUDRAS.map(m => <option key={m.folder} value={m.folder}>{m.name}</option>)}
                    </select>
                </div>

                <button onClick={() => setShow3D(v => !v)}
                    className="px-3 py-1.5 rounded border text-[9px] tracking-[3px] uppercase transition-all"
                    style={{
                        backgroundColor: show3D ? 'rgba(139,92,246,0.15)' : 'transparent',
                        borderColor:     show3D ? 'rgba(139,92,246,0.5)'  : 'var(--border)',
                        color:           show3D ? '#a78bfa'               : 'var(--text-muted)',
                    }}>
                    {show3D ? '◈ 3D On' : '◈ 3D Off'}
                </button>

                {holdState !== 'idle' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border"
                        style={{
                            backgroundColor: holdState === 'evaluating' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            borderColor:     holdState === 'evaluating' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
                        }}>
                        <div className={`w-2 h-2 rounded-full ${holdState === 'evaluating' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                        <span className="text-[9px] tracking-[3px] uppercase font-bold"
                            style={{ color: holdState === 'evaluating' ? '#34d399' : '#fbbf24' }}>
                            {holdState === 'evaluating' ? `Auto Eval · ${accuracy}%` : 'Detecting hold…'}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column — Camera & 3D */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    {/* Camera */}
                    {cameraOn ? (
                        <div className="w-full rounded-lg overflow-hidden border relative"
                            style={{ borderColor: 'var(--border)', height: '65vh', minHeight: '450px' }}>

                            {/* Top bar */}
                            <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 py-2"
                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                                <span className="text-[9px] tracking-[4px] text-white/60 uppercase">Live Feed · MediaPipe Hands</span>
                                {selectedMudra && (
                                    <span className="ml-auto text-[9px] tracking-[3px] uppercase text-yellow-400/80">
                                        Target: {MUDRAS.find(m => m.folder === selectedMudra)?.name}
                                    </span>
                                )}
                            </div>

                            {/* Status + wrong mudra badge */}
                            {isDetected && (
                                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 w-full max-w-[85%]">
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border ${accuracy >= 70 && confidence >= 70 && corrections.length === 0 ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}`}>
                                        {accuracy >= 70 && confidence >= 70 && corrections.length === 0 ? '✓ Good Form' : '↻ Adjust Position'}
                                    </div>
                                    {wrongMudraMsg && (
                                        <div className="px-4 py-2 rounded-lg text-[10px] tracking-widest uppercase font-black border bg-red-600/95 border-red-400 text-white shadow-2xl backdrop-blur-md text-center animate-pulse">
                                            ⚠️ {wrongMudraMsg}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Manual hold bar */}
                            {holdState === 'idle' && holdProgress > 0 && (
                                <div className="absolute top-12 left-4 z-10 bg-black/70 px-3 py-2 rounded-lg border border-green-500/30">
                                    <div className="text-[8px] tracking-[3px] uppercase text-green-400 mb-1">Saving…</div>
                                    <div className="w-24 h-1.5 bg-white/10 rounded-full">
                                        <div className="h-full rounded-full bg-green-400 transition-all duration-200" style={{ width: `${holdProgress}%` }} />
                                    </div>
                                </div>
                            )}

                            <canvas ref={canvasRef} 
                                width="640" height="480"
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />
                            <video ref={videoRef} autoPlay playsInline muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

                            {/* Hold Detection Ring */}
                            <HoldDetectionRing
                                holdProgress={holdProgress}
                                holdState={holdState}
                                mudraName={autoResult?.name || displayData.name || ''}
                                accuracy={autoResult?.accuracy || accuracy}
                            />

                            {/* Saved overlay */}
                            {saved && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-6 py-3 rounded-xl border bg-green-500/20 border-green-500/40 text-green-300 text-sm font-bold tracking-widest uppercase">
                                    ✓ Progress Saved!
                                </div>
                            )}

                            {/* Bottom controls */}
                            <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-xl border-t border-white/10 px-5 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={test}
                                        className="px-3 py-1.5 rounded text-white text-[9px] tracking-widest uppercase border border-white/20 bg-white/5 hover:bg-white/10 transition-all">
                                        Test Voice
                                    </button>
                                    <LanguageSelector lang={lang} onChange={setLang} compact />
                                    <button onClick={() => {
                                            const next = !voiceEnabled;
                                            setVoiceEnabled(next);
                                        }}
                                        className="px-4 py-2 rounded text-white text-100% tracking-widest uppercase flex items-center gap-2 border border-white/10 transition-all font-bold"
                                        style={{ backgroundColor: voiceEnabled ? '#b87333' : 'rgba(255,255,255,0.05)' }}>
                                        {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
                                    </button>
                                </div>
                                <button onClick={stopWebcam}
                                    className="px-6 py-2 rounded text-white text-xs tracking-widest uppercase border border-red-500/30 bg-red-500/20 hover:bg-red-500/30 transition-all">
                                    ■ Stop Camera
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full rounded-lg flex flex-col items-center justify-center gap-5 border"
                            style={{ height: '65vh', minHeight: '450px', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                            <div className="text-6xl" style={{ color: 'var(--text-muted)' }}>◎</div>
                            <p className="text-xs tracking-[4px] uppercase" style={{ color: 'var(--text-muted)' }}>Camera ready to start</p>
                            <button onClick={startWebcam}
                                className="px-10 py-3 rounded text-white text-xs tracking-[4px] uppercase"
                                style={{ backgroundColor: 'var(--accent)' }}>
                                ▶ Start Camera
                            </button>
                        </div>
                    )}

                    {/* 3D Hand Visualiser */}
                    {show3D && (
                        <div className="w-full rounded-lg border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                            <div className="text-[9px] tracking-[5px] uppercase mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: '#8b5cf6' }}>◈</span> 3D Joint Angle Analysis
                                {selectedMudra && (
                                    <span className="ml-auto text-[9px]" style={{ color: '#a78bfa' }}>
                                        Gold = {MUDRAS.find(m => m.folder === selectedMudra)?.name} reference pose
                                    </span>
                                )}
                            </div>
                            <HandVisualiser 
                                targetMudra={selectedMudra} 
                                landmarks={landmarks || []}
                                deviations={autoResult?.deviations || {}}
                                infoOverride={autoResult}
                                apiBase={import.meta.env.VITE_FLASK_URL || ""} 
                                loading={!landmarks}
                            />
                        </div>
                    )}
                </div>

                {/* Right Column — Information Panel */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                    {/* Card 1 — Name */}
                    <div className="rounded-lg border p-6 transition-all duration-500 shadow-sm"
                        style={{ borderColor: isDetected ? 'var(--accent)' : 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-4" style={{ color: 'var(--text-muted)' }}>✦ Detected Mudra</div>
                        <div className="text-3xl font-bold mb-2 transition-colors duration-500" style={{ color: isDetected ? 'var(--accent)' : 'var(--border)' }}>
                            {isDetected && mudraInfo ? mudraInfo.name : 'Waiting…'}
                        </div>
                        {isDetected && mudraInfo && <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>{mudraInfo.meaning}</p>}
                        
                        {holdState === 'evaluating' && autoResult && (
                            <div className="mt-4 px-3 py-2 rounded border text-[9px] tracking-[3px] uppercase font-bold animate-pulse"
                                style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10B981' }}>
                                ⚡ Auto-detected on hold
                            </div>
                        )}
                        {saved && (
                            <div className="mt-4 border rounded p-3 text-center bg-green-500/10 border-green-500/20 text-green-400">
                                <span className="text-[9px] tracking-[3px] uppercase font-bold">✓ Progress Saved</span>
                            </div>
                        )}
                    </div>

                    {/* Card 2 — Confidence + Accuracy */}
                    <div className="rounded-lg border p-6 shadow-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Recognition Confidence</div>
                        <div className="text-4xl font-bold mb-3" style={{ color: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : 'var(--accent)' }}>
                            {confidence.toFixed(1)}%
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden mb-6" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <div className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${confidence}%`, backgroundColor: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : '#dc2626' }} />
                        </div>
                        
                        {isDetected && (
                            <div className="pt-4 border-t border-white/5">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-[9px] tracking-[3px] uppercase" style={{ color: 'var(--text-muted)' }}>Pose Accuracy</div>
                                    <div className="text-lg font-bold" style={{ color: accuracy > 75 ? '#4ade80' : '#fbbf24' }}>{accuracy.toFixed(0)}%</div>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                    <div className="h-full rounded-full transition-all duration-700 delay-100 ease-out"
                                        style={{ width: `${accuracy}%`, backgroundColor: accuracy > 75 ? '#4ade80' : '#fbbf24' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Card 3 — Corrections & Position */}
                    <div className="rounded-lg border p-6 shadow-sm flex-grow" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="flex justify-between items-center mb-5">
                            <div className="text-[9px] tracking-[5px] uppercase" style={{ color: 'var(--text-muted)' }}>Hand Position</div>
                            {isDetected && mudraInfo && (
                                <span className="text-[8px] tracking-[2px] uppercase px-2 py-1 rounded-sm border font-bold"
                                    style={{ backgroundColor: LEVEL_COLORS[mudraInfo.level].bg, borderColor: LEVEL_COLORS[mudraInfo.level].border, color: LEVEL_COLORS[mudraInfo.level].text }}>
                                    {mudraInfo.level}
                                </span>
                            )}
                        </div>

                        {isDetected && mudraInfo ? (
                            <div className="space-y-5">
                                <div className="p-3 rounded bg-white/5 border border-white/5">
                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>{mudraInfo.fingers}</p>
                                </div>

                                {corrections.length > 0 && (
                                    <div className="p-4 rounded border bg-red-500/10 border-red-500/20">
                                        <div className="text-[9px] tracking-[4px] uppercase text-red-500 mb-3 font-black">Correction Needed</div>
                                        <ul className="text-xs space-y-2 text-red-400/90 font-medium">
                                            {corrections.map((c, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                    <span>{c}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {accuracy >= 70 && confidence >= 70 && corrections.length === 0 && (
                                    <div className="p-4 rounded border bg-green-500/10 border-green-500/20">
                                        <div className="text-[9px] tracking-[4px] uppercase text-green-500 font-black flex items-center gap-2">
                                            <span className="text-lg">✓</span> Correct Pose
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="text-[9px] tracking-[5px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Common Usage</div>
                                    <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>{mudraInfo.usage}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                                <div className="text-4xl mb-4">✋</div>
                                <p className="text-[10px] tracking-[3px] uppercase text-center">Position hand in camera to see details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar (Full Width Below) */}
            {progress && (
                <div className="mt-8 border rounded-lg p-6 shadow-sm" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="text-[9px] tracking-[4px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Learning Journey</div>
                            <div className="h-px w-12 bg-white/10"></div>
                            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--copper)' }}>
                                {progress.detectedMudras?.length || 0} of 28 Mastered
                            </span>
                        </div>
                        <span className="text-[10px] tracking-widest uppercase font-bold text-white/40">
                            {Math.round(((progress.detectedMudras?.length || 0) / 28) * 100)}% Complete
                        </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-black/20" style={{ border: '1px solid var(--border)' }}>
                        <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(184,115,51,0.3)]"
                            style={{ width: `${((progress.detectedMudras?.length || 0) / 28) * 100}%`, backgroundColor: 'var(--copper)' }} />
                    </div>
                    <div className="flex justify-between mt-3">
                        <span className="text-[9px] tracking-[3px] uppercase text-white/30 font-medium">Session Count: {progress.practiceCount || 0}</span>
                        <div className="flex gap-4">
                            <span className="text-[9px] tracking-[3px] uppercase text-white/30 font-medium italic">GestureIQ Bharatnatyam Guide</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
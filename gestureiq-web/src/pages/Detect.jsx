// src/pages/Detect.jsx
// ─────────────────────────────────────────────────────────────────────────────
// MODULE ROLE: STANDALONE FREE-PRACTICE DETECTOR
// Updated: Velocity Hold Detection + 3D HandVisualiser + HoldDetectionRing
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { useVoiceGuide } from '../hooks/useVoiceGuide';
import HandVisualiser from '../components/HandVisualiser';
import HoldDetectionRing from '../components/HoldDetectionRing';
import { io } from 'socket.io-client';

const MUDRAS = [
    { folder: "pataka",       name: "Pataka",       meaning: "Flag",                usage: "Clouds, forest, a straight line, river, horse",   fingers: "All four fingers straight together, thumb bent",             level: "Basic"        },
    { folder: "tripataka",    name: "Tripataka",    meaning: "Three parts of flag", usage: "Crown, tree, flame, arrow",                        fingers: "Ring finger bent, others straight",                         level: "Basic"        },
    { folder: "ardhapataka",  name: "Ardhapataka",  meaning: "Half flag",           usage: "Knife, two meanings, leaves",                      fingers: "Ring and little finger bent, others straight",              level: "Basic"        },
    { folder: "kartarimukha", name: "Kartarimukha", meaning: "Scissors face",       usage: "Separation, lightning, falling",                   fingers: "Index and middle separated like scissors",                  level: "Basic"        },
    { folder: "mayura",       name: "Mayura",       meaning: "Peacock",             usage: "Peacock, applying tilak, braid",                   fingers: "Thumb touches index fingertip, others spread",              level: "Basic"        },
    { folder: "ardhachandra", name: "Ardhachandra", meaning: "Half moon",           usage: "Moon, plate, spear, beginning prayer",             fingers: "All fingers open, thumb extended sideways",                 level: "Basic"        },
    { folder: "arala",        name: "Arala",        meaning: "Bent",                usage: "Drinking nectar, wind, poison",                    fingers: "Index finger bent inward, others straight",                 level: "Intermediate" },
    { folder: "shukatunda",   name: "Shukatunda",   meaning: "Parrot beak",         usage: "Shooting arrow, throwing",                         fingers: "Thumb presses ring finger, others straight",                level: "Intermediate" },
    { folder: "mushti",       name: "Mushti",       meaning: "Fist",                usage: "Grasping, wrestling, holding hair",                fingers: "All fingers curled into fist, thumb over them",            level: "Intermediate" },
    { folder: "shikhara",     name: "Shikhara",     meaning: "Spire",               usage: "Bow, pillar, husband, question",                   fingers: "Thumb raised from fist position",                           level: "Intermediate" },
    { folder: "kapittha",     name: "Kapittha",     meaning: "Wood apple",          usage: "Lakshmi, Saraswati, holding cymbals",              fingers: "Index finger curled, thumb presses it",                     level: "Intermediate" },
    { folder: "katakamukha",  name: "Katakamukha",  meaning: "Opening in bracelet", usage: "Picking flowers, garland, pulling bow",            fingers: "Thumb, index, middle form a circle",                        level: "Intermediate" },
    { folder: "suchi",        name: "Suchi",        meaning: "Needle",              usage: "Universe, number one, city, this",                 fingers: "Index finger pointing straight up",                         level: "Basic"        },
    { folder: "chandrakala",  name: "Chandrakala",  meaning: "Digit of moon",       usage: "Moon crescent, forehead mark",                     fingers: "Thumb and index form crescent shape",                       level: "Intermediate" },
    { folder: "padmakosha",   name: "Padmakosha",   meaning: "Lotus bud",           usage: "Lotus flower, fruits, ball, bell",                 fingers: "All fingers spread and curved like a cup",                  level: "Intermediate" },
    { folder: "sarpashira",   name: "Sarpashira",   meaning: "Snake head",          usage: "Snake, elephant trunk, water",                     fingers: "All fingers together, hand bent at wrist",                  level: "Advanced"     },
    { folder: "mrigashira",   name: "Mrigashira",   meaning: "Deer head",           usage: "Deer, forest, gentle touch, woman",                fingers: "Thumb, ring, little finger touch; others straight",         level: "Advanced"     },
    { folder: "simhamukha",   name: "Simhamukha",   meaning: "Lion face",           usage: "Lion, horse, elephant, pearl",                     fingers: "Three fingers spread like lion mane",                       level: "Advanced"     },
    { folder: "kangula",      name: "Kangula",      meaning: "Bell",                usage: "Bell fruit, fruit, drop of water",                 fingers: "Four fingers together, thumb bent across",                  level: "Advanced"     },
    { folder: "alapadma",     name: "Alapadma",     meaning: "Full bloomed lotus",  usage: "Full moon, beauty, lake, disc",                    fingers: "All five fingers spread wide and curved",                   level: "Advanced"     },
    { folder: "chatura",      name: "Chatura",      meaning: "Clever",              usage: "Gold, wind, slight, slow",                         fingers: "Four fingers bent, thumb tucked at side",                   level: "Advanced"     },
    { folder: "bhramara",     name: "Bhramara",     meaning: "Bee",                 usage: "Bee, bird, six seasons",                           fingers: "Index finger touches thumb; middle bent; others up",        level: "Advanced"     },
    { folder: "hamsasya",     name: "Hamsasya",     meaning: "Swan beak",           usage: "Pearl, tying thread, number five",                 fingers: "All fingertips touching thumb tip",                         level: "Advanced"     },
    { folder: "hamsapaksha",  name: "Hamsapaksha",  meaning: "Swan wing",           usage: "Swan, number six, waving",                         fingers: "Fingers slightly spread in wave shape",                     level: "Advanced"     },
    { folder: "sandamsha",    name: "Sandamsha",    meaning: "Tongs",               usage: "Picking flowers, tongs, forceful grasp",           fingers: "Index and middle pinch together",                           level: "Advanced"     },
    { folder: "mukula",       name: "Mukula",       meaning: "Bud",                 usage: "Lotus bud, eating, naval",                         fingers: "All fingertips meet at one point",                          level: "Advanced"     },
    { folder: "tamrachuda",   name: "Tamrachuda",   meaning: "Rooster",             usage: "Rooster, peacock, bird crest",                     fingers: "Thumb up from fist, little finger raised",                  level: "Advanced"     },
    { folder: "trishula",     name: "Trishula",     meaning: "Trident",             usage: "Shiva trident, three paths, number three",         fingers: "Index, middle, ring fingers raised; others closed",         level: "Advanced"     },
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
        _socket = io('http://localhost:5000', {
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });
    }
    return _socket;
}

export default function Detect() {
    const { user }   = useAuth();
    const navigate   = useNavigate();
    const { speak, stop, test, announce } = useVoiceGuide();

    const [cameraOn,     setCameraOn]     = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [detected,     setDetected]     = useState({});
    const [progress,     setProgress]     = useState([]);
    const [saved,        setSaved]        = useState(false);
    const [visible,      setVisible]      = useState(false);
    const [selectedMudra, setSelectedMudra] = useState('');
    const [holdState,    setHoldState]    = useState('idle');
    const [holdProgress, setHoldProgress] = useState(0);
    const [autoResult,   setAutoResult]   = useState(null);
    const [show3D,       setShow3D]       = useState(true);

    const holdStartRef   = useRef(null);
    const savedRef       = useRef(false);
    const manualHoldPct  = useRef(0);
    const videoRef       = useRef(null);
    const canvasRef      = useRef(null);
    const streamRef      = useRef(null);
    const isDetectingRef = useRef(false);

    // ── Init ─────────────────────────────────────────────────
    useEffect(() => {
        if (user && user.role !== 'student') { navigate('/'); return; }
        setTimeout(() => setVisible(true), 100);
        fetchProgress();
        return () => stop();
    }, [user, navigate]);

    // ── Socket: auto_evaluation from Flask hold detection ────
    useEffect(() => {
        const socket = getSocket();
        const onAutoEval = (result) => {
            setAutoResult(result);
            setDetected(result);
            if (voiceEnabled) {
                if (result.accuracy >= 75) speak(`Correct! ${result.name} — great form!`, { priority: true });
                else if (result.corrections?.length > 0) announce.correction(result.corrections[0]);
            }
            if (result.detected && result.accuracy >= 75 && !savedRef.current) {
                savedRef.current = true;
                saveProgress(result.name);
            }
        };
        socket.on('auto_evaluation', onAutoEval);
        return () => socket.off('auto_evaluation', onAutoEval);
    }, [voiceEnabled]);

    // ── Notify Flask when target mudra changes ───────────────
    useEffect(() => {
        if (selectedMudra && cameraOn) getSocket().emit('set_free_practice_target', { target: selectedMudra });
        setAutoResult(null);
        savedRef.current = false;
    }, [selectedMudra, cameraOn]);

    // ── Webcam start/stop ────────────────────────────────────
    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
            streamRef.current = stream;
            setCameraOn(true);
            if (voiceEnabled) speak("Camera active. Show your hand mudra to begin recognition.", { priority: true });
        } catch {
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

    // Attach stream to video element
    useEffect(() => {
        if (cameraOn && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
            if (selectedMudra) getSocket().emit('set_free_practice_target', { target: selectedMudra });
        }
        if (!cameraOn) {
            holdStartRef.current = null;
            manualHoldPct.current = 0;
            savedRef.current = false;
            stop();
        }
    }, [cameraOn]);

    // ── Detection polling every 600ms ────────────────────────
    useEffect(() => {
        if (!cameraOn) return;
        const interval = setInterval(async () => {
            if (isDetectingRef.current) return;
            isDetectingRef.current = true;
            try {
                const frame = captureFrame();
                if (!frame) return;
                const res  = await fetch('/api/detect_frame', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ frame, targetMudra: selectedMudra || '' })
                });
                const data = await res.json();
                if (holdState !== 'evaluating') setDetected(data);

                const accuracy    = data.accuracy    || 0;
                const corrections = data.corrections || [];
                const isGood      = data.detected && data.confidence > 70 && accuracy >= 70 && (accuracy > 75 || corrections.length === 0);

                if (voiceEnabled && holdState === 'idle') {
                    if (!data.detected) announce.noHand();
                    else if (isGood) announce.hold();
                    else if (corrections.length > 0 && accuracy < 70) announce.correction(corrections[0]);
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
            } catch { }
            finally { isDetectingRef.current = false; }
        }, 600);
        return () => { clearInterval(interval); holdStartRef.current = null; };
    }, [cameraOn, voiceEnabled, selectedMudra, holdState]);

    // ── Poll /mudra_data for Flask hold state ────────────────
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

    // ── Progress helpers ─────────────────────────────────────
    const fetchProgress = async () => {
        try { const res = await axios.get('/api/user/progress'); setProgress(res.data.progress); } catch { }
    };
    const saveProgress = async (mudraName) => {
        setSaved(true);
        try {
            const res = await axios.post('/api/user/progress/update', { mudraName });
            setProgress(res.data);
            if (voiceEnabled) speak(`${mudraName} mudra saved to your progress!`, { priority: true });
        } catch { }
        setTimeout(() => { setSaved(false); savedRef.current = false; }, 3000);
    };

    // ── Derived display ──────────────────────────────────────
    const displayData = (holdState === 'evaluating' && autoResult) ? autoResult : detected;
    const mudraInfo   = MUDRAS.find(m => m.folder === displayData.name);
    const confidence  = displayData.confidence || 0;
    const accuracy    = displayData.accuracy   || 0;
    const isDetected  = displayData.detected;
    const corrections = displayData.corrections || [];

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
                        borderColor: show3D ? 'rgba(139,92,246,0.5)' : 'var(--border)',
                        color: show3D ? '#a78bfa' : 'var(--text-muted)',
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

            <div className="flex flex-col gap-6">

                {/* Camera */}
                {cameraOn ? (
                    <div className="w-full rounded-lg overflow-hidden border relative"
                        style={{ borderColor: 'var(--border)', height: '70vh', minHeight: '500px' }}>
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
                        {isDetected && (
                            <div className={`absolute top-12 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border ${corrections.length === 0 && accuracy > 75 ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}`}>
                                {corrections.length === 0 && accuracy > 75 ? '✓ Good Form' : '↻ Adjust Position'}
                            </div>
                        )}
                        {holdState === 'idle' && holdProgress > 0 && (
                            <div className="absolute top-12 left-4 z-10 bg-black/70 px-3 py-2 rounded-lg border border-green-500/30">
                                <div className="text-[8px] tracking-[3px] uppercase text-green-400 mb-1">Saving…</div>
                                <div className="w-24 h-1.5 bg-white/10 rounded-full">
                                    <div className="h-full rounded-full bg-green-400 transition-all duration-200" style={{ width: `${holdProgress}%` }} />
                                </div>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                        <video ref={videoRef} autoPlay playsInline muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

                        {/* ── HOLD DETECTION RING ── */}
                        <HoldDetectionRing
                            holdProgress={holdProgress}
                            holdState={holdState}
                            mudraName={autoResult?.name || displayData.name || ''}
                            accuracy={autoResult?.accuracy || accuracy}
                        />

                        {saved && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-6 py-3 rounded-xl border bg-green-500/20 border-green-500/40 text-green-300 text-sm font-bold tracking-widest uppercase">
                                ✓ Progress Saved!
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-xl border-t border-white/10 px-5 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={test} className="px-3 py-1.5 rounded text-white text-[9px] tracking-widest uppercase border border-white/20 bg-white/5 hover:bg-white/10 transition-all">Test Voice</button>
                                <button onClick={() => setVoiceEnabled(v => !v)}
                                    className="px-4 py-2 rounded text-white text-[10px] tracking-widest uppercase flex items-center gap-2 border border-white/10 transition-all"
                                    style={{ backgroundColor: voiceEnabled ? 'var(--copper)' : 'rgba(255,255,255,0.05)' }}>
                                    {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
                                </button>
                            </div>
                            <button onClick={stopWebcam} className="px-6 py-2 rounded text-white text-xs tracking-widest uppercase border border-red-500/30 bg-red-500/20 hover:bg-red-500/30 transition-all">
                                ■ Stop Camera
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full rounded-lg flex flex-col items-center justify-center gap-5 border"
                        style={{ height: '70vh', minHeight: '500px', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                        <div className="text-6xl" style={{ color: 'var(--text-muted)' }}>◎</div>
                        <p className="text-xs tracking-[4px] uppercase" style={{ color: 'var(--text-muted)' }}>Camera ready to start</p>
                        <button onClick={startWebcam} className="px-10 py-3 rounded text-white text-xs tracking-[4px] uppercase" style={{ backgroundColor: 'var(--accent)' }}>
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
                        <HandVisualiser targetMudra={selectedMudra} apiBase="http://localhost:5001" />
                    </div>
                )}

                {/* Result Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Card 1 — Name */}
                    <div className="rounded-lg border p-6 transition-all duration-500"
                        style={{ borderColor: isDetected ? 'var(--accent)' : 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>✦ Detected Mudra</div>
                        <div className="text-3xl font-bold mb-1" style={{ color: isDetected ? 'var(--accent)' : 'var(--border)' }}>
                            {isDetected && mudraInfo ? mudraInfo.name : '—'}
                        </div>
                        {isDetected && mudraInfo && <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{mudraInfo.meaning}</p>}
                        {holdState === 'evaluating' && autoResult && (
                            <div className="mt-3 px-3 py-2 rounded border text-[9px] tracking-[3px] uppercase font-bold"
                                style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10B981' }}>
                                ⚡ Auto-detected on hold
                            </div>
                        )}
                        {saved && (
                            <div className="mt-4 border rounded p-2 text-center"
                                style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#10B981' }}>
                                <span className="text-[9px] tracking-[3px] uppercase">✓ Progress Saved</span>
                            </div>
                        )}
                    </div>

                    {/* Card 2 — Confidence + Accuracy */}
                    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Confidence</div>
                        <div className="text-3xl font-bold mb-2" style={{ color: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : 'var(--accent)' }}>
                            {confidence.toFixed(1)}%
                        </div>
                        <div className="h-2 rounded overflow-hidden mb-4" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <div className="h-full rounded transition-all duration-500"
                                style={{ width: `${confidence}%`, backgroundColor: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : '#dc2626' }} />
                        </div>
                        {isDetected && (
                            <>
                                <div className="text-[9px] tracking-[3px] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Accuracy</div>
                                <div className="text-xl font-bold mb-1" style={{ color: accuracy > 75 ? '#4ade80' : '#fbbf24' }}>{accuracy.toFixed(0)}%</div>
                                <div className="h-1.5 rounded overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                    <div className="h-full rounded transition-all duration-500"
                                        style={{ width: `${accuracy}%`, backgroundColor: accuracy > 75 ? '#4ade80' : '#fbbf24' }} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Card 3 — Corrections */}
                    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="flex justify-between items-center mb-3">
                            <div className="text-[9px] tracking-[5px] uppercase" style={{ color: 'var(--text-muted)' }}>Hand Position</div>
                            {isDetected && mudraInfo && (
                                <span className="text-[9px] tracking-[3px] uppercase px-2 py-1 rounded border"
                                    style={{ backgroundColor: LEVEL_COLORS[mudraInfo.level].bg, borderColor: LEVEL_COLORS[mudraInfo.level].border, color: LEVEL_COLORS[mudraInfo.level].text }}>
                                    {mudraInfo.level}
                                </span>
                            )}
                        </div>
                        {isDetected && mudraInfo ? (
                            <div className="space-y-3">
                                <p className="text-sm" style={{ color: 'var(--text)' }}>{mudraInfo.fingers}</p>
                                {corrections.length > 0 && (
                                    <div className="p-3 rounded border bg-red-500/10 border-red-500/30">
                                        <div className="text-[9px] tracking-[4px] uppercase text-red-500 mb-2 font-bold">Correction Needed</div>
                                        <ul className="text-xs space-y-1 text-red-400">
                                            {corrections.map((c, i) => <li key={i} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-red-500" />{c}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {accuracy >= 75 && corrections.length === 0 && (
                                    <div className="p-3 rounded border bg-green-500/10 border-green-500/30">
                                        <div className="text-[9px] tracking-[4px] uppercase text-green-500 font-bold">✓ Correct Pose</div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-[9px] tracking-[5px] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Usage</div>
                                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{mudraInfo.usage}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs" style={{ color: 'var(--border)' }}>Show a mudra to see details</p>
                        )}
                    </div>
                </div>

                {/* Progress */}
                {progress && (
                    <div className="border rounded-lg p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                        <div className="flex justify-between items-center mb-3">
                            <div className="text-[9px] tracking-[4px] uppercase" style={{ color: 'var(--text-muted)' }}>Your Progress</div>
                            <span className="text-xs font-bold" style={{ color: 'var(--copper)' }}>{progress.detectedMudras?.length || 0} / 28 Mudras</span>
                        </div>
                        <div className="h-1.5 rounded overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                            <div className="h-full rounded transition-all duration-700"
                                style={{ width: `${((progress.detectedMudras?.length || 0) / 28) * 100}%`, backgroundColor: 'var(--copper)' }} />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Sessions: {progress.practiceCount || 0}</span>
                            <span className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{Math.round(((progress.detectedMudras?.length || 0) / 28) * 100)}% Complete</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
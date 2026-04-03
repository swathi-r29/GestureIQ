// src/pages/Detect.jsx — Complete Professional Rewrite
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { useVoiceGuide, LanguageSelector } from '../hooks/useVoiceGuide';
import HandVisualiser from '../components/HandVisualiser';

const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

const MUDRAS = [
    { folder: "pataka",       name: "Pataka",       meaning: "Flag",                level: "Basic"        },
    { folder: "tripataka",    name: "Tripataka",    meaning: "Three parts of flag", level: "Basic"        },
    { folder: "ardhapataka",  name: "Ardhapataka",  meaning: "Half flag",           level: "Basic"        },
    { folder: "kartarimukha", name: "Kartarimukha", meaning: "Scissors face",       level: "Basic"        },
    { folder: "mayura",       name: "Mayura",       meaning: "Peacock",             level: "Basic"        },
    { folder: "ardhachandra", name: "Ardhachandra", meaning: "Half moon",           level: "Basic"        },
    { folder: "arala",        name: "Arala",        meaning: "Bent",                level: "Intermediate" },
    { folder: "shukatunda",   name: "Shukatunda",   meaning: "Parrot beak",         level: "Intermediate" },
    { folder: "mushti",       name: "Mushti",       meaning: "Fist",                level: "Intermediate" },
    { folder: "shikhara",     name: "Shikhara",     meaning: "Spire",               level: "Intermediate" },
    { folder: "kapittha",     name: "Kapittha",     meaning: "Wood apple",          level: "Intermediate" },
    { folder: "katakamukha",  name: "Katakamukha",  meaning: "Opening in bracelet", level: "Intermediate" },
    { folder: "suchi",        name: "Suchi",        meaning: "Needle",              level: "Basic"        },
    { folder: "chandrakala",  name: "Chandrakala",  meaning: "Digit of moon",       level: "Intermediate" },
    { folder: "padmakosha",   name: "Padmakosha",   meaning: "Lotus bud",           level: "Intermediate" },
    { folder: "sarpashira",   name: "Sarpashira",   meaning: "Snake head",          level: "Advanced"     },
    { folder: "mrigashira",   name: "Mrigashira",   meaning: "Deer head",           level: "Advanced"     },
    { folder: "simhamukha",   name: "Simhamukha",   meaning: "Lion face",           level: "Advanced"     },
    { folder: "kangula",      name: "Kangula",      meaning: "Bell",                level: "Advanced"     },
    { folder: "alapadma",     name: "Alapadma",     meaning: "Full bloomed lotus",  level: "Advanced"     },
    { folder: "chatura",      name: "Chatura",      meaning: "Clever",              level: "Advanced"     },
    { folder: "bhramara",     name: "Bhramara",     meaning: "Bee",                 level: "Advanced"     },
    { folder: "hamsasya",     name: "Hamsasya",     meaning: "Swan beak",           level: "Advanced"     },
    { folder: "hamsapaksha",  name: "Hamsapaksha",  meaning: "Swan wing",           level: "Advanced"     },
    { folder: "sandamsha",    name: "Sandamsha",    meaning: "Tongs",               level: "Advanced"     },
    { folder: "mukula",       name: "Mukula",       meaning: "Bud",                 level: "Advanced"     },
    { folder: "tamrachuda",   name: "Tamrachuda",   meaning: "Rooster",             level: "Advanced"     },
    { folder: "trishula",     name: "Trishula",     meaning: "Trident",             level: "Advanced"     },
];

const HOLD_MS = 1800;
const FLASK = import.meta.env.VITE_FLASK_URL || '';

export default function Detect() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [lang, setLang] = useState('en');
    const { stop, test, unlock, announce } = useVoiceGuide({ language: lang });

    // Core state
    const [cameraOn, setCameraOn]     = useState(false);
    const [voiceOn, setVoiceOn]       = useState(false);
    const [selectedMudra, setSelectedMudra] = useState('');
    const [show3D, setShow3D]         = useState(false);

    // Detection state
    const [result, setResult]         = useState(null);
    const [landmarks, setLandmarks]   = useState([]);
    const [holdPct, setHoldPct]       = useState(0);
    const [holdState, setHoldState]   = useState('idle'); // idle | holding | done
    const [saved, setSaved]           = useState(false);
    const [progress, setProgress]     = useState(null);

    // Refs
    const videoRef      = useRef(null);
    const canvasRef     = useRef(null);
    const streamRef     = useRef(null);
    const handsRef      = useRef(null);
    const rafRef        = useRef(null);
    const landmarksRef  = useRef(null); // latest landmarks, updated every frame
    const detectTimerRef = useRef(null);
    const holdStartRef  = useRef(null);
    const savedRef      = useRef(false);
    const voiceTimerRef = useRef(0); // last time voice fired

    // Fetch progress once
    useEffect(() => {
        if (user?.role !== 'student') { navigate('/'); return; }
        axios.get('/api/user/progress').then(r => setProgress(r.data.progress)).catch(() => {});
        return () => cleanup();
    }, []);

    const cleanup = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (detectTimerRef.current) clearInterval(detectTimerRef.current);
        if (handsRef.current) { handsRef.current.close(); handsRef.current = null; }
        stop();
    };

    // ── MediaPipe init ──────────────────────────────────────
    const initMediaPipe = useCallback(() => {
        if (handsRef.current) return;
        const h = new Hands({
            locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
        });
        h.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        h.onResults(onResults);
        handsRef.current = h;
    }, []);

    const onResults = useCallback((results) => {
        const canvas = canvasRef.current;
        const video  = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        canvas.width  = video.clientWidth  || 640;
        canvas.height = video.clientHeight || 480;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Mirror the drawing to match the mirrored video
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        if (results.multiHandLandmarks?.length > 0) {
            let lms       = results.multiHandLandmarks[0];
            const handed  = results.multiHandedness[0]?.label || 'Right';
            const score   = results.multiHandedness[0]?.score || 0;

            // DO NOT mirror X here — send raw coords + handedness label to Flask
            // Flask's extract_features() mirrors Left hands internally
            landmarksRef.current = { landmarks: lms, handedness: handed, score };
            setLandmarks(lms);

            drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#f59e0b', lineWidth: 3 });
            drawLandmarks(ctx, lms, { color: '#fff', lineWidth: 1, radius: 2 });
        } else {
            landmarksRef.current = null;
            setLandmarks([]);
        }
        ctx.restore();
    }, []);

    // ── Frame loop ──────────────────────────────────────────
    const startFrameLoop = useCallback(() => {
        const loop = async () => {
            if (videoRef.current?.readyState >= 2 && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current }).catch(() => {});
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    // ── Camera start/stop ───────────────────────────────────
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            initMediaPipe();
            setCameraOn(true);
            unlock();
        } catch (e) {
            alert('Camera permission denied. Please allow camera access and use HTTPS.');
        }
    };

    const stopCamera = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (detectTimerRef.current) clearInterval(detectTimerRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraOn(false);
        setResult(null);
        setLandmarks([]);
        setHoldPct(0);
        setHoldState('idle');
        holdStartRef.current = null;
        savedRef.current = false;
        landmarksRef.current = null;
        stop();
    }, [stop]);

    // Set video src when camera turns on
    useEffect(() => {
        if (cameraOn && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
            startFrameLoop();
            startDetectionLoop();
        }
    }, [cameraOn]);

    // ── Single detection loop — no socket, no mudra_data poll ──
    const startDetectionLoop = () => {
        if (detectTimerRef.current) clearInterval(detectTimerRef.current);
        detectTimerRef.current = setInterval(runDetection, 180);
    };

    const runDetection = useCallback(async () => {
        const data = landmarksRef.current;
        if (!data) {
            setHoldPct(0);
            holdStartRef.current = null;
            return;
        }

        try {
            const res = await fetch(`${FLASK}/api/detect_landmarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    landmarks:    data.landmarks,
                    handedness:   data.handedness,
                    presenceScore: data.score,
                    targetMudra:  selectedMudra || '',
                })
            });
            const json = await res.json();
            setResult(json);

            // ── Voice — only fire when stable and cooldown passed ──
            if (voiceOn && json.is_stable) {
                const now = Date.now();
                if (now - voiceTimerRef.current > 5000) {
                    voiceTimerRef.current = now;
                    announce.fromResult(json);
                }
            }

            // ── Hold detection ──
            const confidence = json.confidence || 0;
            const accuracy   = json.accuracy   || 0;
            const isGood = json.detected &&
                           confidence >= 65 &&
                           accuracy   >= 65 &&
                           (json.corrections || []).filter(c => !c.startsWith('Wrong')).length === 0;

            if (isGood) {
                if (!holdStartRef.current) holdStartRef.current = Date.now();
                const pct = Math.min(100, ((Date.now() - holdStartRef.current) / HOLD_MS) * 100);
                setHoldPct(pct);
                if (pct < 100) setHoldState('holding');

                if (pct >= 100 && !savedRef.current) {
                    savedRef.current = true;
                    setHoldState('done');
                    handleSaveProgress(json.name);
                    if (voiceOn) announce.mastered({ mudra: json.name, score: Math.round(accuracy), attempts: 1 });
                }
            } else {
                holdStartRef.current = null;
                setHoldPct(0);
                if (holdState === 'holding') setHoldState('idle');
            }

        } catch (err) {
            // Flask not running — silently ignore
        }
    }, [selectedMudra, voiceOn, holdState, announce]);

    // Re-create detection loop when selectedMudra changes
    useEffect(() => {
        if (cameraOn) {
            holdStartRef.current = null;
            savedRef.current = false;
            setHoldPct(0);
            setHoldState('idle');
            setResult(null);
            if (detectTimerRef.current) clearInterval(detectTimerRef.current);
            startDetectionLoop();
        }
    }, [selectedMudra]);

    const handleSaveProgress = async (mudraName) => {
        setSaved(true);
        try {
            const r = await axios.post('/api/user/progress/update', { mudraName });
            setProgress(r.data);
        } catch {}
        setTimeout(() => {
            setSaved(false);
            savedRef.current = false;
            setHoldState('idle');
            setHoldPct(0);
        }, 3000);
    };

    // ── Derived ──────────────────────────────────────────────
    const mudraInfo    = MUDRAS.find(m => m.folder === result?.name);
    const confidence   = result?.confidence  || 0;
    const accuracy     = result?.accuracy    || 0;
    const corrections  = result?.corrections || [];
    const isDetected   = result?.detected    || false;
    const wrongMsg     = corrections.find(c => c.startsWith('Wrong mudra'));
    const mastered     = progress?.detectedMudras || [];
    const mastPct      = Math.round((mastered.length / 28) * 100);

    const scoreColor   = accuracy >= 75 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444';
    const confColor    = confidence >= 70 ? '#10b981' : confidence >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">

            {/* Header */}
            <div className="text-center mb-8">
                <div className="text-[10px] tracking-[6px] uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}>Live AI Recognition</div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Mudra Detect</h1>
                <BorderPattern />
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                {/* Target selector */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Target:</span>
                    <select
                        value={selectedMudra}
                        onChange={e => setSelectedMudra(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded border outline-none"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                        <option value="">Free Practice (Any)</option>
                        {MUDRAS.map(m => (
                            <option key={m.folder} value={m.folder}>
                                {mastered.includes(m.folder) ? '✓ ' : ''}{m.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Language */}
                <LanguageSelector lang={lang} onChange={setLang} />

                {/* Voice toggle */}
                <button
                    onClick={() => { const n = !voiceOn; setVoiceOn(n); if (n) { unlock(); setTimeout(() => test(), 300); } }}
                    className="px-4 py-1.5 rounded border text-[10px] tracking-widest uppercase font-bold transition-all"
                    style={{
                        backgroundColor: voiceOn ? 'var(--accent)' : 'transparent',
                        borderColor: voiceOn ? 'var(--accent)' : 'var(--border)',
                        color: voiceOn ? '#fff' : 'var(--text-muted)',
                    }}
                >
                    {voiceOn ? '🔊 Voice On' : '🔇 Voice Off'}
                </button>

                {/* 3D toggle */}
                <button
                    onClick={() => setShow3D(v => !v)}
                    className="px-4 py-1.5 rounded border text-[10px] tracking-widest uppercase transition-all"
                    style={{
                        backgroundColor: show3D ? 'rgba(139,92,246,0.15)' : 'transparent',
                        borderColor: show3D ? 'rgba(139,92,246,0.5)' : 'var(--border)',
                        color: show3D ? '#a78bfa' : 'var(--text-muted)',
                    }}
                >
                    ◈ 3D {show3D ? 'On' : 'Off'}
                </button>

                {/* Status pill */}
                {cameraOn && holdState !== 'idle' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border"
                        style={{
                            backgroundColor: holdState === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            borderColor: holdState === 'done' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
                        }}>
                        <div className={`w-2 h-2 rounded-full ${holdState === 'done' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                        <span className="text-[9px] tracking-widest uppercase font-bold"
                            style={{ color: holdState === 'done' ? '#34d399' : '#fbbf24' }}>
                            {holdState === 'done' ? `Saved! ${Math.round(accuracy)}%` : `Holding ${Math.round(holdPct)}%`}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── LEFT: Camera + 3D ── */}
                <div className="lg:col-span-8 space-y-4">

                    {/* Camera view */}
                    {cameraOn ? (
                        <div className="relative rounded-xl overflow-hidden border"
                            style={{ borderColor: 'var(--border)', height: '60vh', minHeight: '420px', backgroundColor: '#000' }}>

                            {/* Video */}
                            <video ref={videoRef} autoPlay playsInline muted
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }} />

                            {/* Skeleton overlay */}
                            <canvas ref={canvasRef}
                                className="absolute inset-0 pointer-events-none"
                                style={{ width: '100%', height: '100%' }} />

                            {/* Top bar */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[9px] text-white/70 uppercase tracking-widest">Live</span>
                                    {selectedMudra && (
                                        <span className="text-[9px] text-yellow-400 uppercase tracking-widest">
                                            · {MUDRAS.find(m => m.folder === selectedMudra)?.name}
                                        </span>
                                    )}
                                </div>

                                {/* Live score badge */}
                                {isDetected && (
                                    <div className="px-3 py-1 rounded-full text-[10px] font-bold"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: scoreColor }}>
                                        {Math.round(accuracy)}%
                                    </div>
                                )}
                            </div>

                            {/* Wrong mudra warning */}
                            {wrongMsg && (
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border text-center animate-pulse"
                                    style={{ backgroundColor: 'rgba(220,38,38,0.9)', borderColor: '#f87171', color: '#fff', whiteSpace: 'nowrap' }}>
                                    ⚠ {wrongMsg}
                                </div>
                            )}

                            {/* Hold progress bar */}
                            {holdPct > 0 && holdState !== 'done' && (
                                <div className="absolute bottom-16 left-4 right-4">
                                    <div className="flex justify-between text-[9px] text-white/60 mb-1">
                                        <span>Hold steady...</span>
                                        <span>{Math.round(holdPct)}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                        <div className="h-full rounded-full transition-all duration-200"
                                            style={{ width: `${holdPct}%`, backgroundColor: '#10b981' }} />
                                    </div>
                                </div>
                            )}

                            {/* Saved overlay */}
                            {saved && (
                                <div className="absolute inset-0 flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                                    <div className="text-center">
                                        <div className="text-4xl mb-2">✓</div>
                                        <div className="text-white font-bold text-lg uppercase tracking-widest">
                                            Mudra Saved!
                                        </div>
                                        <div className="text-white/60 text-sm">{mudraInfo?.name} · {Math.round(accuracy)}%</div>
                                    </div>
                                </div>
                            )}

                            {/* Bottom controls */}
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3"
                                style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                                <div className="flex items-center gap-2">
                                    {isDetected && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: confColor }} />
                                            <span className="text-[10px] text-white/70">
                                                {mudraInfo?.name || result?.name} · {Math.round(confidence)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={stopCamera}
                                    className="px-4 py-2 rounded text-[9px] uppercase tracking-widest font-bold border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-all">
                                    ■ Stop
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Start camera placeholder */
                        <div className="rounded-xl flex flex-col items-center justify-center border"
                            style={{ height: '60vh', minHeight: '420px', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                            <div className="text-6xl mb-4 opacity-20">◎</div>
                            <p className="text-[10px] tracking-widest uppercase mb-6" style={{ color: 'var(--text-muted)' }}>
                                Camera ready
                            </p>
                            {selectedMudra && (
                                <p className="text-sm mb-4 font-bold" style={{ color: 'var(--accent)' }}>
                                    Target: {MUDRAS.find(m => m.folder === selectedMudra)?.name}
                                </p>
                            )}
                            <button onClick={startCamera}
                                className="px-10 py-3 rounded text-white text-[10px] tracking-widest uppercase"
                                style={{ backgroundColor: 'var(--accent)' }}>
                                ▶ Start Camera
                            </button>
                        </div>
                    )}

                    {/* 3D Visualiser — only render when camera is on */}
                    {show3D && cameraOn && (
                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                            <div className="text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2"
                                style={{ color: 'var(--text-muted)' }}>
                                <span style={{ color: '#8b5cf6' }}>◈</span> 3D Joint Analysis
                            </div>
                            <HandVisualiser
                                landmarks={landmarks}
                                deviations={result?.deviations || {}}
                                targetMudra={selectedMudra}
                                infoOverride={result}
                            />
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Info Panel ── */}
                <div className="lg:col-span-4 flex flex-col gap-4">

                    {/* Detected mudra card */}
                    <div className="rounded-xl border p-5"
                        style={{
                            borderColor: isDetected ? 'var(--accent)' : 'var(--border)',
                            backgroundColor: 'var(--bg-card)',
                        }}>
                        <div className="text-[9px] uppercase tracking-widest mb-3"
                            style={{ color: 'var(--text-muted)' }}>✦ Detected Mudra</div>
                        <div className="text-3xl font-bold mb-1 transition-all"
                            style={{ color: isDetected ? 'var(--accent)' : 'var(--border)' }}>
                            {isDetected && mudraInfo ? mudraInfo.name : 'Waiting…'}
                        </div>
                        {isDetected && mudraInfo && (
                            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                                {mudraInfo.meaning}
                            </p>
                        )}
                        {result?.is_stable && isDetected && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                                style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                ● Stable detection
                            </div>
                        )}
                    </div>

                    {/* Scores */}
                    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                            Scores
                        </div>

                        <div className="space-y-3">
                            {[
                                { label: 'Confidence', value: confidence, color: confColor },
                                { label: 'Accuracy',   value: accuracy,   color: scoreColor },
                            ].map(({ label, value, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                                        <span className="text-sm font-bold" style={{ color }}>{Math.round(value)}%</span>
                                    </div>
                                    <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${value}%`, backgroundColor: color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Corrections */}
                    <div className="rounded-xl border p-5 flex-1" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                            Hand Position Guide
                        </div>

                        {isDetected ? (
                            <div className="space-y-3">
                                {corrections.filter(c => !c.startsWith('Wrong')).length > 0 ? (
                                    <div className="p-3 rounded-lg border"
                                        style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                                        <div className="text-[9px] uppercase tracking-widest text-red-500 mb-2 font-bold">
                                            Corrections
                                        </div>
                                        <ul className="space-y-1.5">
                                            {corrections.filter(c => !c.startsWith('Wrong')).slice(0, 3).map((c, i) => (
                                                <li key={i} className="text-xs text-red-400/90 flex gap-2">
                                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                    {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : accuracy >= 65 ? (
                                    <div className="p-3 rounded-lg border"
                                        style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                        <div className="text-[9px] uppercase tracking-widest text-green-500 mb-1 font-bold flex items-center gap-1">
                                            <span className="text-base">✓</span> Good Form!
                                        </div>
                                        <p className="text-xs text-green-400/80">
                                            Hold still for {Math.ceil((1 - holdPct/100) * (HOLD_MS/1000))}s to save
                                        </p>
                                    </div>
                                ) : null}

                                {result?.meaning && (
                                    <div className="mt-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                        <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                                            Meaning
                                        </div>
                                        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{result.meaning}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 opacity-30">
                                <div className="text-3xl mb-3">✋</div>
                                <p className="text-[10px] uppercase tracking-widest text-center">
                                    Show your hand to the camera
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            {progress && (
                <div className="mt-6 border rounded-xl p-5"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] uppercase tracking-widest font-bold"
                            style={{ color: 'var(--text-muted)' }}>
                            Learning Journey — {mastered.length}/28 Mastered
                        </span>
                        <span className="text-[10px] uppercase tracking-widest font-bold"
                            style={{ color: 'var(--copper)' }}>{mastPct}%</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${mastPct}%`, backgroundColor: 'var(--copper)' }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {MUDRAS.map(m => (
                            <div key={m.folder}
                                className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider"
                                style={{
                                    backgroundColor: mastered.includes(m.folder) ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.05)',
                                    color: mastered.includes(m.folder) ? '#10b981' : 'var(--text-muted)',
                                    border: `0.5px solid ${mastered.includes(m.folder) ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                                }}>
                                {mastered.includes(m.folder) ? '✓ ' : ''}{m.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
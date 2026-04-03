// src/pages/Detect.jsx — FULLY CORRECTED
// All real-time cases:
//  1. Shows detected mudra name + meaning immediately
//  2. Wrong mudra: clear visual + voice "You are showing X, target is Y"
//  3. Finger corrections: displayed + spoken every 5s
//  4. Auto-save at 75%+ (no hold required)
//  5. Hold-to-save at 60%+ with no corrections (1.8s)
//  6. voiceOnRef declared before runDetection (fixes stale closure bug)
//  7. lang ref used in runDetection to avoid stale closure

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

const HOLD_MS       = 1800;
const AUTO_SAVE_PCT = 75;   // Auto-save immediately at or above this score
const FLASK_URL     = (import.meta.env.VITE_FLASK_URL || '').replace(/\/$/, '');

export default function Detect() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [lang, setLang] = useState('en');
    const { stop, test, unlock, announce } = useVoiceGuide({ language: lang });

    const [cameraOn,      setCameraOn]      = useState(false);
    const [voiceOn,       setVoiceOn]       = useState(false);
    const [selectedMudra, setSelectedMudra] = useState('');
    const [show3D,        setShow3D]        = useState(false);
    const [flaskOk,       setFlaskOk]       = useState(true);

    const [result,        setResult]        = useState(null);
    const [landmarks,     setLandmarks]     = useState([]);
    const [holdPct,       setHoldPct]       = useState(0);
    const [holdState,     setHoldState]     = useState('idle');
    const [saved,         setSaved]         = useState(false);
    const [savedMudraInfo, setSavedMudraInfo] = useState(null);
    const [progress,      setProgress]      = useState(null);

    // ── Voice refs — DECLARED FIRST before any callbacks that use them ──────
    const voiceOnRef          = useRef(false);
    const langRef             = useRef('en');   // ref mirror of lang for use in callbacks
    const lastVoiceRef        = useRef(0);
    const lastCorrRef         = useRef({ text: '', time: 0 });
    const lastWrongRef        = useRef({ text: '', time: 0 });
    const lastNoHandRef       = useRef(0);

    // Keep refs in sync
    useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);
    useEffect(() => { langRef.current = lang; }, [lang]);

    const videoRef     = useRef(null);
    const canvasRef    = useRef(null);
    const streamRef    = useRef(null);
    const handsRef     = useRef(null);
    const rafRef       = useRef(null);
    const detectRef    = useRef(null);
    const landmarksRef = useRef(null);
    const holdStartRef = useRef(null);
    const savedRef     = useRef(false);
    const selectedRef  = useRef('');

    useEffect(() => { selectedRef.current = selectedMudra; }, [selectedMudra]);

    useEffect(() => {
        if (!user || user.role !== 'student') { navigate('/'); return; }
        axios.get('/api/user/progress').then(r => setProgress(r.data.progress)).catch(() => {});
        return () => cleanup();
    }, []);

    const cleanup = () => {
        if (rafRef.current)    cancelAnimationFrame(rafRef.current);
        if (detectRef.current) clearInterval(detectRef.current);
        if (handsRef.current)  { handsRef.current.close(); handsRef.current = null; }
        streamRef.current?.getTracks().forEach(t => t.stop());
        stop();
    };

    // MediaPipe init
    const initMediaPipe = useCallback(() => {
        if (handsRef.current) return;
        const h = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        h.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
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
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        if (results.multiHandLandmarks?.length > 0) {
            const lms  = results.multiHandLandmarks[0];
            const hand = results.multiHandedness?.[0]?.label || 'Right';
            const sc   = results.multiHandedness?.[0]?.score  || 1.0;
            landmarksRef.current = { landmarks: lms, handedness: hand, score: sc };
            setLandmarks(lms);
            drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#f59e0b', lineWidth: 3 });
            drawLandmarks(ctx, lms, { color: '#fff', lineWidth: 1, radius: 2 });
        } else {
            landmarksRef.current = null;
            setLandmarks([]);
        }
        ctx.restore();
    }, []);

    // Frame loop
    const startFrameLoop = useCallback(() => {
        const loop = async () => {
            if (videoRef.current?.readyState >= 2 && handsRef.current) {
                await handsRef.current.send({ image: videoRef.current }).catch(() => {});
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    // Camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            initMediaPipe();
            setCameraOn(true);
        } catch {
            alert('Camera permission denied. Please allow camera access and use HTTPS.');
        }
    };

    const stopCamera = useCallback(() => {
        cleanup();
        setCameraOn(false);
        setResult(null);
        setLandmarks([]);
        setHoldPct(0);
        setHoldState('idle');
        holdStartRef.current = null;
        savedRef.current     = false;
        landmarksRef.current = null;
    }, []);

    useEffect(() => {
        if (cameraOn && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
            startFrameLoop();
            startDetectionLoop();
        }
    }, [cameraOn]);

    const startDetectionLoop = () => {
        if (detectRef.current) clearInterval(detectRef.current);
        detectRef.current = setInterval(runDetection, 200);
    };

    // =====================================================================
    // DETECTION — all real-time cases handled, voice refs used (no stale closure)
    // =====================================================================
    const runDetection = useCallback(async () => {
        if (savedRef.current) return; // Skip detection while success screen is showing

        const data = landmarksRef.current;
        const currentLang = langRef.current;   // use ref, never stale

        // ── NO HAND ───────────────────────────────────────────────────────
        if (!data || !data.landmarks || data.landmarks.length !== 21) {
            setResult(prev => (prev?.detected ? null : prev));
            setHoldPct(0);
            holdStartRef.current = null;

            if (voiceOnRef.current) {
                const now = Date.now();
                if (now - lastNoHandRef.current > 6000) {
                    lastNoHandRef.current = now;
                    const msg = currentLang === 'ta'
                        ? 'உங்கள் கையை கேமராவில் காட்டுங்கள்'
                        : currentLang === 'hi' ? 'कैमरे में अपना हाथ दिखाएं'
                        : 'Show your hand to the camera';
                    announce.raw(msg, 2);
                }
            }
            return;
        }

        try {
            const lmArray = Array.from(data.landmarks).map(lm => ({
                x: typeof lm.x !== 'undefined' ? lm.x : lm[0],
                y: typeof lm.y !== 'undefined' ? lm.y : lm[1],
                z: typeof lm.z !== 'undefined' ? lm.z : lm[2],
            }));

            const res = await fetch(`${FLASK_URL}/api/detect_landmarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    landmarks:     lmArray,
                    handedness:    data.handedness || 'Right',
                    presenceScore: data.score      || 1.0,
                    targetMudra:   selectedRef.current || '',
                }),
                signal: AbortSignal.timeout(1500),
            });

            if (!res.ok) throw new Error('Flask error');
            const json = await res.json();
            setFlaskOk(true);
            setResult(json);

            const now         = Date.now();
            const accuracy    = json.accuracy    || 0;
            const corrections = json.corrections || [];
            const isDetected  = json.detected    || false;
            const mudraName   = json.name        || '';
            const detectedMudraName = json.detected_mudra_name || mudraName;

            const wrongMsg   = corrections.find(c =>
                typeof c === 'string' && c.toLowerCase().includes('wrong mudra')
            );
            const fingerCorrs = corrections.filter(c =>
                typeof c === 'string' && !c.toLowerCase().includes('wrong mudra')
            );

            // ── VOICE FEEDBACK ─────────────────────────────────────────────
            if (voiceOnRef.current && isDetected) {

                // CASE A: Wrong mudra — every 7s
                if (wrongMsg) {
                    const prev = lastWrongRef.current;
                    if (wrongMsg !== prev.text || (now - prev.time) > 7000) {
                        lastWrongRef.current = { text: wrongMsg, time: now };

                        const showingMatch = wrongMsg.match(/showing\s+([A-Za-z]+)/i);
                        const insteadMatch = wrongMsg.match(/instead of\s+([A-Za-z]+)/i);
                        const showingName  = showingMatch ? showingMatch[1] : detectedMudraName;
                        const targetName   = insteadMatch ? insteadMatch[1] : selectedRef.current;

                        let msg;
                        if (currentLang === 'ta') {
                            msg = `தவறான முத்திரை. நீங்கள் ${showingName} காட்டுகிறீர்கள். இலக்கு ${targetName}.`;
                        } else if (currentLang === 'hi') {
                            msg = `गलत मुद्रा। आप ${showingName} दिखा रहे हैं। लक्ष्य ${targetName} है।`;
                        } else {
                            msg = `Wrong mudra. You are showing ${showingName}. The target is ${targetName}.`;
                        }
                        announce.raw(msg, 3);
                    }
                }

                // CASE B: Finger corrections — every 5s
                else if (fingerCorrs.length > 0) {
                    const topCorr = fingerCorrs[0];
                    const prev    = lastCorrRef.current;
                    if (topCorr !== prev.text || (now - prev.time) > 5000) {
                        lastCorrRef.current = { text: topCorr, time: now };
                        announce.raw(topCorr, 1);
                    }
                }

                // CASE C: Correct / excellent — every 8s
                else if (accuracy >= 72 && !wrongMsg) {
                    if (now - lastVoiceRef.current > 8000) {
                        lastVoiceRef.current = now;
                        const msg = accuracy >= AUTO_SAVE_PCT
                            ? (currentLang === 'ta' ? 'சரியானது! அருமை!' : currentLang === 'hi' ? 'उत्कृष्ट! बहुत अच्छा!' : 'Excellent! Perfect form!')
                            : (currentLang === 'ta' ? 'சரியானது! அருமையான கோலம்' : currentLang === 'hi' ? 'सही है! बहुत अच्छा' : 'Correct! Great form.');
                        announce.raw(msg, 3);
                    }
                }
            }

            // ── SAVE LOGIC ─────────────────────────────────────────────────
            const noWrong   = !wrongMsg;
            const hasNoCorr = fingerCorrs.length === 0;

            // CASE 1: Auto-save at AUTO_SAVE_PCT%+ immediately
            if (isCorrect && accuracy >= AUTO_SAVE_PCT && !savedRef.current) {
                savedRef.current = true;
                setHoldState('done');
                setHoldPct(100);
                const mudraObj = MUDRAS.find(m => m.folder === (json.detected_mudra_name || json.name));
                setSavedMudraInfo({ name: mudraObj?.name || json.name, accuracy });
                setResult(null); // Clear live result immediately
                handleSaveProgress(json.name || selectedRef.current, accuracy);
                if (voiceOnRef.current) {
                    const msg = currentLang === 'ta' ? 'சேமிக்கப்பட்டது! அருமை!' : 'Saved! Excellent score!';
                    announce.raw(msg, 3);
                }
                return;
            }

            // CASE 2: Hold-to-save at 62%+
            const canHold = isCorrect && accuracy >= 62;
            if (canHold) {
                if (!holdStartRef.current) holdStartRef.current = Date.now();
                const pct = Math.min(100, ((Date.now() - holdStartRef.current) / HOLD_MS) * 100);
                setHoldPct(pct);
                if (pct < 100) setHoldState('holding');
                if (pct >= 100 && !savedRef.current) {
                    savedRef.current = true;
                    setHoldState('done');
                    const mudraObj = MUDRAS.find(m => m.folder === (json.detected_mudra_name || json.name));
                    setSavedMudraInfo({ name: mudraObj?.name || json.name, accuracy });
                    setResult(null); // Clear live result
                    handleSaveProgress(json.name || selectedRef.current, accuracy);
                    if (voiceOnRef.current) {
                        const msg = currentLang === 'ta' ? 'சேமிக்கப்பட்டது!' : 'Mudra saved!';
                        announce.mastered({ mudra: json.name, score: Math.round(accuracy), attempts: 1 });
                    }
                }
            } else {
                holdStartRef.current = null;
                if (holdState !== 'done') {
                    setHoldPct(0);
                    setHoldState('idle');
                }
            }

        } catch (err) {
            setFlaskOk(false);
            console.warn('[Detect] Flask call failed:', err.message);
        }
    }, [announce]); // announce is stable, lang/voiceOn read from refs

    // Reset state when mudra target changes
    useEffect(() => {
        if (cameraOn) {
            holdStartRef.current = null;
            savedRef.current     = false;
            setHoldPct(0);
            setHoldState('idle');
            setResult(null);
            lastCorrRef.current  = { text: '', time: 0 };
            lastWrongRef.current = { text: '', time: 0 };
            lastVoiceRef.current = 0;
            startDetectionLoop();
        }
    }, [selectedMudra]);

    const handleSaveProgress = async (mudraName, currentAccuracy) => {
        setSaved(true);
        try {
            const r = await axios.post('/api/user/progress/update', {
                mudraName,
                score: Math.round(currentAccuracy)
            });
            setProgress(r.data);
        } catch {}
        setTimeout(() => {
            setSaved(false);
            setSavedMudraInfo(null);
            savedRef.current = false;
            setHoldState('idle');
            setHoldPct(0);
        }, 1200);
    };

    // Derived state
    const isDetected = result?.detected && result?.confidence > 0.40;
    const accuracy   = result?.accuracy || (result?.confidence * 100 || 0);
    const fingerCorrs = result?.corrections?.filter(c => typeof c === 'string' && !c.toLowerCase().includes('wrong')) || [];
    const isCorrect   = isDetected && accuracy >= 62 && fingerCorrs.length === 0;
    const mudraInfo  = MUDRAS.find(m => m.folder === (result?.detected_mudra_name || result?.name));
    const confidence  = result?.confidence  || 0;
    const corrections = result?.corrections || [];
    const wrongMsg    = corrections.find(c => typeof c === 'string' && c.toLowerCase().includes('wrong mudra'));
    const mastered    = progress?.detectedMudras || [];
    const mastPct     = Math.round((mastered.length / 28) * 100);
    const isExcellent = isDetected && accuracy >= AUTO_SAVE_PCT && !wrongMsg;
    const isGood      = isDetected && accuracy >= 62 && !wrongMsg && fingerCorrs.length === 0;

    // Extract detected/target names from wrong mudra message
    const getWrongDisplay = () => {
        if (!wrongMsg) return null;
        const showingMatch = wrongMsg.match(/showing\s+([A-Za-z]+)/i);
        const insteadMatch = wrongMsg.match(/instead of\s+([A-Za-z]+)/i);
        const detectedName = result?.detected_mudra_name || result?.name || '';
        const showing      = showingMatch ? showingMatch[1] : detectedName;
        const target       = insteadMatch ? insteadMatch[1] : selectedMudra;
        return { showing, target };
    };
    const wrongDisplay = getWrongDisplay();

    const scoreColor = isExcellent ? '#34d399' : accuracy >= 75 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444';
    const confColor  = confidence >= 70 ? '#10b981' : confidence >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">

            {/* Header */}
            <div className="text-center mb-8">
                <div className="text-[10px] tracking-[6px] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
                    Live AI Recognition
                </div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Mudra Detect</h1>
                <BorderPattern />
            </div>

            {/* Flask offline warning */}
            {!flaskOk && (
                <div className="mb-4 px-4 py-3 rounded-lg border text-xs font-bold text-center"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    ⚠ AI Engine offline — Make sure Flask is running on port 5001
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Target:</span>
                    <select
                        value={selectedMudra}
                        onChange={e => setSelectedMudra(e.target.value)}
                        className="text-xs px-3 py-1.5 rounded border outline-none"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                        <option value="">Free Practice (Any Mudra)</option>
                        {MUDRAS.map(m => (
                            <option key={m.folder} value={m.folder}>
                                {mastered.includes(m.folder) ? '✓ ' : ''}{m.name}
                            </option>
                        ))}
                    </select>
                </div>

                <LanguageSelector lang={lang} onChange={(v) => {
                    setLang(v);
                    langRef.current      = v;
                    lastCorrRef.current  = { text: '', time: 0 };
                    lastWrongRef.current = { text: '', time: 0 };
                }} />

                <button
                    onClick={() => {
                        const n = !voiceOn;
                        setVoiceOn(n);
                        voiceOnRef.current = n;
                        if (n) { unlock(); setTimeout(() => test(), 300); }
                        else stop();
                        lastCorrRef.current  = { text: '', time: 0 };
                        lastWrongRef.current = { text: '', time: 0 };
                        lastVoiceRef.current = 0;
                    }}
                    className="px-4 py-1.5 rounded border text-[10px] tracking-widest uppercase font-bold transition-all"
                    style={{
                        backgroundColor: voiceOn ? 'var(--accent)' : 'transparent',
                        borderColor: voiceOn ? 'var(--accent)' : 'var(--border)',
                        color: voiceOn ? '#fff' : 'var(--text-muted)',
                    }}
                >
                    {voiceOn ? '🔊 Voice On' : '🔇 Voice Off'}
                </button>

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

                {/* Hold / save status pill */}
                {cameraOn && holdState !== 'idle' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border"
                        style={{
                            backgroundColor: holdState === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            borderColor: holdState === 'done' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
                        }}>
                        <div className={`w-2 h-2 rounded-full ${holdState === 'done' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                        <span className="text-[9px] tracking-widest uppercase font-bold"
                            style={{ color: holdState === 'done' ? '#34d399' : '#fbbf24' }}>
                            {holdState === 'done' ? `Saved! ${Math.round(accuracy)}%` : `Hold ${Math.round(holdPct)}%`}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT: Camera */}
                <div className="lg:col-span-8 space-y-4">
                    {cameraOn ? (
                        <div className="relative rounded-xl overflow-hidden border"
                            style={{ borderColor: 'var(--border)', height: '60vh', minHeight: '420px', backgroundColor: '#000' }}>

                            <video ref={videoRef} autoPlay playsInline muted
                                className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none"
                                style={{ width: '100%', height: '100%' }} />

                            {/* Status Indicator (Aligned with Learn.jsx) */}
                            {isDetected && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-[80%]">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border backdrop-blur-md transition-all shadow-lg ${isCorrect ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'}`}>
                                            {isCorrect ? '✓ Correct Form' : '↻ Refining Pose...'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Top bar: live indicator + score */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[9px] text-white/70 uppercase tracking-widest">Live</span>
                                    {selectedMudra && (
                                        <span className="text-[9px] text-yellow-400 uppercase tracking-widest">
                                            · Target: {MUDRAS.find(m => m.folder === selectedMudra)?.name}
                                        </span>
                                    )}
                                </div>
                                {isDetected && (
                                    <div className="px-3 py-1 rounded-full text-[10px] font-bold"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: scoreColor }}>
                                        {Math.round(accuracy)}%
                                        {isExcellent && ' ⭐'}
                                    </div>
                                )}
                            </div>

                            {/* Wrong mudra banner */}
                            {wrongMsg && wrongDisplay && (
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 w-[90%] px-4 py-2 rounded-lg border text-center z-20"
                                    style={{ backgroundColor: 'rgba(220,38,38,0.95)', borderColor: '#f87171' }}>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white">⚠ Wrong Mudra</p>
                                    <p className="text-[10px] text-red-200 mt-0.5">
                                        Showing: <span className="text-white font-bold">{wrongDisplay.showing}</span>
                                        {' '}→ Target: <span className="text-yellow-300 font-bold capitalize">{wrongDisplay.target}</span>
                                    </p>
                                </div>
                            )}

                            {/* Excellent badge */}
                            {isExcellent && !wrongMsg && (
                                <div className="absolute top-14 left-1/2 -translate-x-1/2">
                                    <div className="px-4 py-1.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                                        ⭐ Excellent Form — Auto-saving!
                                    </div>
                                </div>
                            )}

                            {/* Hold progress bar */}
                            {holdPct > 0 && holdState === 'holding' && (
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
                                <div className="absolute inset-0 flex items-center justify-center z-30"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">✓</div>
                                        <div className="text-white font-bold text-xl uppercase tracking-widest mb-2">
                                            Mudra Saved!
                                        </div>
                                        <div className="text-white/60 text-sm">
                                            {savedMudraInfo?.name} · {Math.round(savedMudraInfo?.accuracy || 0)}%
                                        </div>
                                        {(savedMudraInfo?.accuracy || 0) >= AUTO_SAVE_PCT && (
                                            <div className="mt-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                                                ⭐ Excellent Score!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Bottom controls */}
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3"
                                style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
                                <div className="flex items-center gap-2">
                                    {isDetected ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: confColor }} />
                                            <span className="text-[10px] text-white/70">
                                                {mudraInfo?.name || result?.name} · {Math.round(confidence)}% conf
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-white/40">Show your hand...</span>
                                    )}
                                </div>
                                <button onClick={stopCamera}
                                    className="px-4 py-2 rounded text-[9px] uppercase tracking-widest font-bold border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-all">
                                    ■ Stop
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl flex flex-col items-center justify-center border"
                            style={{ height: '60vh', minHeight: '420px', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                            <div className="text-6xl mb-4 opacity-20">◎</div>
                            <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                                Camera ready
                            </p>
                            {selectedMudra && (
                                <p className="text-sm mb-4 font-bold" style={{ color: 'var(--accent)' }}>
                                    Target: {MUDRAS.find(m => m.folder === selectedMudra)?.name}
                                </p>
                            )}
                            <p className="text-[10px] text-center mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                                Score ≥ {AUTO_SAVE_PCT}% saves automatically. Score 60-74% needs a 1.8s hold.
                            </p>
                            <button onClick={startCamera}
                                className="px-10 py-3 rounded text-white text-[10px] tracking-widest uppercase hover:scale-105 transition-all"
                                style={{ backgroundColor: 'var(--accent)' }}>
                                ▶ Start Camera
                            </button>
                        </div>
                    )}

                    {/* 3D Visualiser */}
                    {show3D && cameraOn && (
                        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                            <div className="text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
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

                {/* RIGHT: Info Panel */}
                <div className="lg:col-span-4 flex flex-col gap-4">

                    {/* Detected mudra card */}
                    <div className="rounded-xl border p-5"
                        style={{
                            borderColor: isExcellent ? '#34d399' : isDetected ? 'var(--accent)' : 'var(--border)',
                            backgroundColor: 'var(--bg-card)'
                        }}>
                        <div className="text-[9px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                            ✦ Detected Mudra
                        </div>
                        <div className="text-3xl font-bold mb-1 transition-all"
                            style={{ color: isExcellent ? '#34d399' : isDetected ? 'var(--accent)' : 'var(--border)' }}>
                            {isDetected && mudraInfo
                                ? mudraInfo.name
                                : landmarks.length > 0 ? 'Analyzing...' : 'Waiting…'}
                        </div>
                        {isDetected && mudraInfo && (
                            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>{mudraInfo.meaning}</p>
                        )}
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {result?.is_stable && isDetected && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                                    style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                    ● Stable
                                </div>
                            )}
                            {isExcellent && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold"
                                    style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                                    ⭐ Excellent
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                            Live Scores
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
                                            style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Auto-save threshold indicator */}
                        <div className="mt-3 flex items-center justify-between text-[9px]" style={{ color: 'var(--text-muted)' }}>
                            <span>Auto-save at {AUTO_SAVE_PCT}%</span>
                            <span style={{ color: accuracy >= AUTO_SAVE_PCT ? '#34d399' : 'var(--text-muted)' }}>
                                {accuracy >= AUTO_SAVE_PCT ? '✓ Threshold reached' : `${AUTO_SAVE_PCT - Math.round(accuracy)}% more needed`}
                            </span>
                        </div>
                    </div>

                    {/* Corrections / Feedback Panel */}
                    <div className="rounded-xl border p-5 flex-1" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                            Hand Position Guide
                        </div>

                        {isDetected ? (
                            <div className="space-y-3">

                                {/* Wrong mudra alert — two-line clear display */}
                                {wrongMsg && wrongDisplay && (
                                    <div className="p-3 rounded-lg border"
                                        style={{ backgroundColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.3)' }}>
                                        <div className="text-[9px] uppercase tracking-widest font-bold mb-2" style={{ color: '#ef4444' }}>
                                            ⚠ Wrong Mudra
                                        </div>
                                        <p className="text-xs mb-1" style={{ color: '#fca5a5' }}>
                                            You are showing: <span className="font-black text-white uppercase">{wrongDisplay.showing}</span>
                                        </p>
                                        <p className="text-xs" style={{ color: '#fca5a5' }}>
                                            Target mudra: <span className="font-black text-yellow-300 uppercase">{wrongDisplay.target}</span>
                                        </p>
                                    </div>
                                )}

                                {/* Finger corrections */}
                                {fingerCorrs.length > 0 ? (
                                    <div className="p-3 rounded-lg border"
                                        style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
                                        <div className="text-[9px] uppercase tracking-widest text-red-500 mb-2 font-bold">
                                            Corrections Needed
                                        </div>
                                        <ul className="space-y-1.5">
                                            {fingerCorrs.slice(0, 3).map((c, i) => (
                                                <li key={i} className="text-xs text-red-400/90 flex gap-2">
                                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />{c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : isExcellent ? (
                                    <div className="p-3 rounded-lg border"
                                        style={{ backgroundColor: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.3)' }}>
                                        <div className="text-[9px] uppercase tracking-widest text-emerald-400 mb-1 font-bold flex items-center gap-1">
                                            ⭐ Excellent Form!
                                        </div>
                                        <p className="text-xs text-emerald-300/80">
                                            Score ≥ {AUTO_SAVE_PCT}% — saving automatically!
                                        </p>
                                    </div>
                                ) : isGood ? (
                                    <div className="p-3 rounded-lg border"
                                        style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                        <div className="text-[9px] uppercase tracking-widest text-green-500 mb-1 font-bold flex items-center gap-1">
                                            ✓ Good Form!
                                        </div>
                                        <p className="text-xs text-green-400/80">
                                            {holdState === 'holding'
                                                ? `Hold for ${Math.ceil((1 - holdPct / 100) * (HOLD_MS / 1000))}s more...`
                                                : 'Hold steady to save. Reach 75% for instant save.'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                        Improving... score: {Math.round(accuracy)}%
                                    </p>
                                )}

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
                                    {cameraOn ? 'Show your hand to the camera' : 'Start camera to begin'}
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
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>
                            Learning Journey — {mastered.length}/28 Mastered
                        </span>
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--copper)' }}>
                            {mastPct}%
                        </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${mastPct}%`, backgroundColor: 'var(--copper)' }} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {MUDRAS.map(m => (
                            <div key={m.folder} className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider"
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
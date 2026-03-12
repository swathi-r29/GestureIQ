// src/pages/Detect.jsx
// Key fixes:
//   1. Voice uses useVoiceGuide (ref-based, no stale closures)
//   2. Clear spoken phrases with distinct phases (noHand / correction / hold / perfect)
//   3. Hold timer for confirmation before saving progress

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { useVoiceGuide } from '../hooks/useVoiceGuide';

const MUDRAS = [
    { folder: "pataka", name: "Pataka", meaning: "Flag", usage: "Clouds, forest, a straight line, river, horse", fingers: "All four fingers straight together, thumb bent", level: "Basic" },
    { folder: "tripataka", name: "Tripataka", meaning: "Three parts of flag", usage: "Crown, tree, flame, arrow", fingers: "Ring finger bent, others straight", level: "Basic" },
    { folder: "ardhapataka", name: "Ardhapataka", meaning: "Half flag", usage: "Knife, two meanings, leaves", fingers: "Ring and little finger bent, others straight", level: "Basic" },
    { folder: "kartarimukha", name: "Kartarimukha", meaning: "Scissors face", usage: "Separation, lightning, falling", fingers: "Index and middle separated like scissors", level: "Basic" },
    { folder: "mayura", name: "Mayura", meaning: "Peacock", usage: "Peacock, applying tilak, braid", fingers: "Thumb touches index fingertip, others spread", level: "Basic" },
    { folder: "ardhachandra", name: "Ardhachandra", meaning: "Half moon", usage: "Moon, plate, spear, beginning prayer", fingers: "All fingers open, thumb extended sideways", level: "Basic" },
    { folder: "arala", name: "Arala", meaning: "Bent", usage: "Drinking nectar, wind, poison", fingers: "Index finger bent inward, others straight", level: "Intermediate" },
    { folder: "shukatunda", name: "Shukatunda", meaning: "Parrot beak", usage: "Shooting arrow, throwing", fingers: "Thumb presses ring finger, others straight", level: "Intermediate" },
    { folder: "mushti", name: "Mushti", meaning: "Fist", usage: "Grasping, wrestling, holding hair", fingers: "All fingers curled into fist, thumb over them", level: "Intermediate" },
    { folder: "shikhara", name: "Shikhara", meaning: "Spire", usage: "Bow, pillar, husband, question", fingers: "Thumb raised from fist position", level: "Intermediate" },
    { folder: "kapittha", name: "Kapittha", meaning: "Wood apple", usage: "Lakshmi, Saraswati, holding cymbals", fingers: "Index finger curled, thumb presses it", level: "Intermediate" },
    { folder: "katakamukha", name: "Katakamukha", meaning: "Opening in bracelet", usage: "Picking flowers, garland, pulling bow", fingers: "Thumb, index, middle form a circle", level: "Intermediate" },
    { folder: "suchi", name: "Suchi", meaning: "Needle", usage: "Universe, number one, city, this", fingers: "Index finger pointing straight up", level: "Basic" },
    { folder: "chandrakala", name: "Chandrakala", meaning: "Digit of moon", usage: "Moon crescent, forehead mark", fingers: "Thumb and index form crescent shape", level: "Intermediate" },
    { folder: "padmakosha", name: "Padmakosha", meaning: "Lotus bud", usage: "Lotus flower, fruits, ball, bell", fingers: "All fingers spread and curved like a cup", level: "Intermediate" },
    { folder: "sarpashira", name: "Sarpashira", meaning: "Snake head", usage: "Snake, elephant trunk, water", fingers: "All fingers together, hand bent at wrist", level: "Advanced" },
    { folder: "mrigashira", name: "Mrigashira", meaning: "Deer head", usage: "Deer, forest, gentle touch, woman", fingers: "Thumb, ring, little finger touch; others straight", level: "Advanced" },
    { folder: "simhamukha", name: "Simhamukha", meaning: "Lion face", usage: "Lion, horse, elephant, pearl", fingers: "Three fingers spread like lion mane", level: "Advanced" },
    { folder: "kangula", name: "Kangula", meaning: "Bell", usage: "Bell fruit, fruit, drop of water", fingers: "Four fingers together, thumb bent across", level: "Advanced" },
    { folder: "alapadma", name: "Alapadma", meaning: "Full bloomed lotus", usage: "Full moon, beauty, lake, disc", fingers: "All five fingers spread wide and curved", level: "Advanced" },
    { folder: "chatura", name: "Chatura", meaning: "Clever", usage: "Gold, wind, slight, slow", fingers: "Four fingers bent, thumb tucked at side", level: "Advanced" },
    { folder: "bhramara", name: "Bhramara", meaning: "Bee", usage: "Bee, bird, six seasons", fingers: "Index finger touches thumb; middle bent; others up", level: "Advanced" },
    { folder: "hamsasya", name: "Hamsasya", meaning: "Swan beak", usage: "Pearl, tying thread, number five", fingers: "All fingertips touching thumb tip", level: "Advanced" },
    { folder: "hamsapaksha", name: "Hamsapaksha", meaning: "Swan wing", usage: "Swan, number six, waving", fingers: "Fingers slightly spread in wave shape", level: "Advanced" },
    { folder: "sandamsha", name: "Sandamsha", meaning: "Tongs", usage: "Picking flowers, tongs, forceful grasp", fingers: "Index and middle pinch together", level: "Advanced" },
    { folder: "mukula", name: "Mukula", meaning: "Bud", usage: "Lotus bud, eating, naval", fingers: "All fingertips meet at one point", level: "Advanced" },
    { folder: "tamrachuda", name: "Tamrachuda", meaning: "Rooster", usage: "Rooster, peacock, bird crest", fingers: "Thumb up from fist, little finger raised", level: "Advanced" },
    { folder: "trishula", name: "Trishula", meaning: "Trident", usage: "Shiva trident, three paths, number three", fingers: "Index, middle, ring fingers raised; others closed", level: "Advanced" },
];

const HOLD_DURATION_MS = 1500;

const LEVEL_COLORS = {
    Basic: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", border: "rgba(16, 185, 129, 0.3)" },
    Intermediate: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" },
    Advanced: { bg: "rgba(220, 38, 38, 0.1)", text: "#DC2626", border: "rgba(220, 38, 38, 0.3)" },
};

export default function Detect() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { speak, stop, test, announce } = useVoiceGuide();

    const [cameraOn, setCameraOn] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [detected, setDetected] = useState({});
    const [progress, setProgress] = useState([]);
    const [saved, setSaved] = useState(false);
    const [visible, setVisible] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);

    const holdStartRef = useRef(null);
    const savedRef = useRef(false);

    useEffect(() => {
        if (user && user.role !== 'student') { navigate('/'); return; }
        setTimeout(() => setVisible(true), 100);
        fetchProgress();
        return () => stop(); // cleanup on unmount
    }, [user, navigate]);

    useEffect(() => {
        if (!cameraOn) {
            holdStartRef.current = null;
            setHoldProgress(0);
            savedRef.current = false;
            stop();
            return;
        }
        if (voiceEnabled) speak("Camera active. Show your hand mudra to begin recognition.", { priority: true });
    }, [cameraOn]);

    useEffect(() => {
        if (!cameraOn) return;

        const interval = setInterval(() => {
            fetch('http://localhost:5001/mudra_data')
                .then(r => r.json())
                .then(data => {
                    setDetected(data);

                    const accuracy = data.accuracy || 0;
                    const corrections = data.corrections || [];
                    // isGood: accuracy >= 70 AND (accuracy > 75 OR no corrections)
                    const isGood = data.detected && data.confidence > 70 && accuracy >= 70 && (accuracy > 75 || corrections.length === 0);

                    if (voiceEnabled) {
                        if (!data.detected) {
                            announce.noHand();
                        } else if (isGood) {
                            announce.hold();
                        } else if (corrections.length > 0 && accuracy < 70) {
                            // Only speak corrections when accuracy is genuinely low
                            announce.correction(corrections[0]);
                        } else if (accuracy >= 70) {
                            announce.hold();
                        }
                    }

                    // Hold timer for saving
                    if (isGood) {
                        if (!holdStartRef.current) {
                            holdStartRef.current = Date.now();
                        }
                        const elapsed = Date.now() - holdStartRef.current;
                        const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
                        setHoldProgress(pct);

                        if (elapsed >= HOLD_DURATION_MS && !savedRef.current) {
                            savedRef.current = true;
                            saveProgress(data.name);
                        }
                    } else {
                        if (holdStartRef.current) {
                            holdStartRef.current = null;
                            setHoldProgress(0);
                        }
                    }
                })
                .catch(() => { });
        }, 600);

        return () => {
            clearInterval(interval);
            holdStartRef.current = null;
            setHoldProgress(0);
        };
    }, [cameraOn, voiceEnabled]);

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
            if (voiceEnabled) speak(`${mudraName} mudra saved to your progress!`, { priority: true });
        } catch { }
        setTimeout(() => {
            setSaved(false);
            savedRef.current = false;
        }, 3000);
    };

    const mudraInfo = MUDRAS.find(m => m.folder === detected.name);
    const confidence = detected.confidence || 0;
    const accuracy = detected.accuracy || 0;
    const isDetected = detected.detected;
    const corrections = detected.corrections || [];

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

            <div className="flex flex-col">

                {/* Camera Section */}
                {cameraOn ? (
                    <div className="w-full rounded-lg overflow-hidden border relative mb-8"
                        style={{ borderColor: 'var(--border)', height: '70vh', minHeight: '500px' }}>

                        {/* Top bar */}
                        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 py-2"
                            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-[9px] tracking-[4px] text-white/60 uppercase">Live Feed · MediaPipe Hands</span>
                        </div>

                        {/* Status badge */}
                        {isDetected && (
                            <div className={`absolute top-12 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border ${corrections.length === 0 && accuracy > 75 ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}`}>
                                {corrections.length === 0 && accuracy > 75 ? '✓ Good Form' : '↻ Adjust Position'}
                            </div>
                        )}

                        {/* Hold bar top-left */}
                        {holdProgress > 0 && (
                            <div className="absolute top-12 left-4 z-10 bg-black/70 px-3 py-2 rounded-lg border border-green-500/30">
                                <div className="text-[8px] tracking-[3px] uppercase text-green-400 mb-1">Saving…</div>
                                <div className="w-24 h-1.5 bg-white/10 rounded-full">
                                    <div className="h-full rounded-full bg-green-400 transition-all duration-200" style={{ width: `${holdProgress}%` }} />
                                </div>
                            </div>
                        )}

                        <img src="http://localhost:5001/video_feed"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                        {/* Bottom controls */}
                        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-xl border-t border-white/10 px-5 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={test}
                                    className="px-3 py-1.5 rounded text-white text-[9px] tracking-widest uppercase border border-white/20 bg-white/5 hover:bg-white/10 transition-all">
                                    Test Voice
                                </button>
                                <button onClick={() => { setVoiceEnabled(v => !v); }}
                                    className="px-4 py-2 rounded text-white text-[10px] tracking-widest uppercase flex items-center gap-2 border border-white/10 transition-all"
                                    style={{ backgroundColor: voiceEnabled ? 'var(--copper)' : 'rgba(255,255,255,0.05)' }}>
                                    {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
                                </button>
                            </div>
                            <button onClick={() => { setCameraOn(false); stop(); }}
                                className="px-6 py-2 rounded text-white text-xs tracking-widest uppercase border border-red-500/30 bg-red-500/20 hover:bg-red-500/30 transition-all">
                                ■ Stop Camera
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full rounded-lg flex flex-col items-center justify-center gap-5 border mb-8"
                        style={{ height: '70vh', minHeight: '500px', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                        <div className="text-6xl" style={{ color: 'var(--text-muted)' }}>◎</div>
                        <p className="text-xs tracking-[4px] uppercase" style={{ color: 'var(--text-muted)' }}>Camera ready to start</p>
                        <button onClick={() => setCameraOn(true)}
                            className="px-10 py-3 rounded text-white text-xs tracking-[4px] uppercase"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            ▶ Start Camera
                        </button>
                    </div>
                )}

                {/* Result Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

                    {/* Card 1 - Mudra Name */}
                    <div className="rounded-lg border p-6 transition-all duration-500"
                        style={{ borderColor: isDetected ? 'var(--accent)' : 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>✦ Detected Mudra</div>
                        <div className="text-3xl font-bold mb-1 transition-all duration-300"
                            style={{ color: isDetected ? 'var(--accent)' : 'var(--border)' }}>
                            {isDetected && mudraInfo ? mudraInfo.name : '—'}
                        </div>
                        {isDetected && mudraInfo && (
                            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{mudraInfo.meaning}</p>
                        )}
                        {saved && (
                            <div className="mt-4 border rounded p-2 text-center"
                                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10B981' }}>
                                <span className="text-[9px] tracking-[3px] uppercase">✓ Progress Saved</span>
                            </div>
                        )}
                    </div>

                    {/* Card 2 - Confidence + Accuracy */}
                    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Confidence</div>
                        <div className="text-3xl font-bold mb-2"
                            style={{ color: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : 'var(--accent)' }}>
                            {confidence.toFixed(1)}%
                        </div>
                        <div className="h-2 rounded overflow-hidden mb-4" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <div className="h-full rounded transition-all duration-500"
                                style={{ width: `${confidence}%`, backgroundColor: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : '#dc2626' }} />
                        </div>
                        {isDetected && (
                            <>
                                <div className="text-[9px] tracking-[3px] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Accuracy</div>
                                <div className="text-xl font-bold mb-1" style={{ color: accuracy > 75 ? '#4ade80' : '#fbbf24' }}>
                                    {accuracy.toFixed(0)}%
                                </div>
                                <div className="h-1.5 rounded overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                    <div className="h-full rounded transition-all duration-500"
                                        style={{ width: `${accuracy}%`, backgroundColor: accuracy > 75 ? '#4ade80' : '#fbbf24' }} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Card 3 - Hand Position + Corrections */}
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
                                        <div className="text-[9px] tracking-[4px] uppercase text-red-500 mb-2 font-bold">Correction</div>
                                        <ul className="text-xs space-y-1 text-red-400">
                                            {corrections.map((c, i) => (
                                                <li key={i} className="flex items-center gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-red-500" />{c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {accuracy >= 100 && (
                                    <div className="p-3 rounded border bg-green-500/10 border-green-500/30">
                                        <div className="text-[9px] tracking-[4px] uppercase text-green-500 font-bold">✓ Perfect Pose</div>
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

                {/* Progress bar */}
                {progress && (
                    <div className="border rounded-lg p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                        <div className="flex justify-between items-center mb-3">
                            <div className="text-[9px] tracking-[4px] uppercase" style={{ color: 'var(--text-muted)' }}>Your Progress</div>
                            <span className="text-xs font-bold" style={{ color: 'var(--copper)' }}>
                                {progress.detectedMudras?.length || 0} / 28 Mudras
                            </span>
                        </div>
                        <div className="h-1.5 rounded overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                            <div className="h-full rounded transition-all duration-700"
                                style={{ width: `${((progress.detectedMudras?.length || 0) / 28) * 100}%`, backgroundColor: 'var(--copper)' }} />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                                Sessions: {progress.practiceCount || 0}
                            </span>
                            <span className="text-[9px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                                {Math.round(((progress.detectedMudras?.length || 0) / 28) * 100)}% Complete
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
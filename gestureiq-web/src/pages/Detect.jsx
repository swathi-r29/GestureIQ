// src/pages/Detect.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';

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

const LEVEL_COLORS = {
    Basic: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", border: "rgba(16, 185, 129, 0.3)" },
    Intermediate: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" },
    Advanced: { bg: "rgba(220, 38, 38, 0.1)", text: "#DC2626", border: "rgba(220, 38, 38, 0.3)" },
};

export default function Detect() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [detected, setDetected] = useState({ name: "", confidence: 0, detected: false });
    const [progress, setProgress] = useState(null);
    const [saved, setSaved] = useState(false);
    const [visible, setVisible] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);

    useEffect(() => {
        if (user && user.role !== 'student') {
            navigate('/');
            return;
        }
        setTimeout(() => setVisible(true), 100);
        fetchProgress();
    }, [user, navigate]);

    // Poll detection
    useEffect(() => {
        if (!cameraOn) return;
        const interval = setInterval(() => {
            fetch('http://localhost:5001/mudra_data')
                .then(r => r.json())
                .then(data => {
                    setDetected(data);
                    if (data.detected && data.confidence > 70) {
                        saveProgress(data.name);
                    }
                })
                .catch(() => { });
        }, 500);
        return () => clearInterval(interval);
    }, [cameraOn]);

    const fetchProgress = async () => {
        try {
            const res = await axios.get('/api/user/progress');
            setProgress(res.data.progress);
        } catch { }
    };

    const saveProgress = async (mudraName) => {
        if (saved) return;
        setSaved(true);
        try {
            const res = await axios.post('/api/user/progress/update', { mudraName });
            setProgress(res.data);
        } catch { }
        setTimeout(() => setSaved(false), 3000);
    };

    const mudraInfo = MUDRAS.find(m => m.folder === detected.name);
    const confidence = detected.confidence || 0;
    const isDetected = detected.detected;

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
                            <span className="text-[9px] tracking-[4px] text-white/60 uppercase">
                                Live Feed · MediaPipe Hands
                            </span>
                        </div>

                        {/* Camera feed */}
                        <img src="http://localhost:5001/video_feed"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                        {/* Stop button overlaid bottom center */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                            <button onClick={() => setCameraOn(false)}
                                className="px-8 py-2 rounded text-white text-xs tracking-widest uppercase"
                                style={{ backgroundColor: 'rgba(139,26,26,0.85)' }}>
                                ■ Stop Camera
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full rounded-lg flex flex-col items-center justify-center gap-5 border mb-8"
                        style={{ height: '70vh', minHeight: '500px', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                        <div className="text-6xl" style={{ color: 'var(--text-muted)' }}>◎</div>
                        <p className="text-xs tracking-[4px] uppercase" style={{ color: 'var(--text-muted)' }}>
                            Camera ready to start
                        </p>
                        <button onClick={() => setCameraOn(true)}
                            className="px-10 py-3 rounded text-white text-xs tracking-[4px] uppercase"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            ▶ Start Camera
                        </button>
                    </div>
                )}

                {/* Result Cards Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

                    {/* Card 1 - Mudra Name */}
                    <div className="rounded-lg border p-6 transition-all duration-500"
                        style={{
                            borderColor: isDetected ? 'var(--accent)' : 'var(--border)',
                            backgroundColor: 'var(--bg-card)'
                        }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                            ✦ Detected Mudra
                        </div>
                        <div className="text-3xl font-bold mb-1 transition-all duration-300"
                            style={{ color: isDetected ? 'var(--accent)' : 'var(--border)' }}>
                            {isDetected && mudraInfo ? mudraInfo.name : '—'}
                        </div>
                        {isDetected && mudraInfo && (
                            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{mudraInfo.meaning}</p>
                        )}
                        {saved && (
                            <div className="mt-4 border rounded p-2 text-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10B981' }}>
                                <span className="text-[9px] tracking-[3px] uppercase">
                                    ✓ Progress Saved
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Card 2 - Confidence */}
                    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-[9px] tracking-[5px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                            Confidence
                        </div>
                        <div className="text-3xl font-bold mb-4"
                            style={{ color: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : 'var(--accent)' }}>
                            {confidence.toFixed(1)}%
                        </div>
                        <div className="h-2 rounded overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <div className="h-full rounded transition-all duration-500"
                                style={{
                                    width: `${confidence}%`,
                                    backgroundColor: confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : '#dc2626'
                                }} />
                        </div>
                        {isDetected && (
                            <div className="mt-3 text-[9px] tracking-[3px] uppercase"
                                style={{ color: confidence >= 70 ? '#4ade80' : '#fbbf24' }}>
                                {confidence >= 70 ? '✓ High Confidence' : '⚠ Adjust Position'}
                            </div>
                        )}
                    </div>

                    {/* Card 3 - Mudra Info */}
                    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <div className="flex justify-between items-center mb-3">
                            <div className="text-[9px] tracking-[5px] uppercase" style={{ color: 'var(--text-muted)' }}>
                                Hand Position
                            </div>
                            {isDetected && mudraInfo && (
                                <span className={`text-[9px] tracking-[3px] uppercase px-2 py-1 rounded border`} style={{
                                    backgroundColor: LEVEL_COLORS[mudraInfo.level].bg,
                                    borderColor: LEVEL_COLORS[mudraInfo.level].border,
                                    color: LEVEL_COLORS[mudraInfo.level].text
                                }}>
                                    {mudraInfo.level}
                                </span>
                            )}
                        </div>
                        {isDetected && mudraInfo ? (
                            <>
                                <p className="text-sm mb-4" style={{ color: 'var(--text)' }}>{mudraInfo.fingers}</p>
                                <div className="text-[9px] tracking-[5px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                                    Usage in Dance
                                </div>
                                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>{mudraInfo.usage}</p>
                            </>
                        ) : (
                            <p className="text-xs" style={{ color: 'var(--border)' }}>Show a mudra to see details</p>
                        )}
                    </div>

                </div>

                {/* Progress bar full width */}
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
                                Practice sessions: {progress.practiceCount || 0}
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
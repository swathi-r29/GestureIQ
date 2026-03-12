// src/pages/Learn.jsx
// Key fixes:
//   1. Voice uses useVoiceGuide (ref-based, no stale closures)
//   2. Hold timer: user must hold pose for 2s before "mastered"
//   3. Step-by-step onboarding before camera starts
//   4. Clear spoken phrases: start → guide → hold → perfect → mastered

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { BookOpen, Camera, CheckCircle2, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useVoiceGuide } from '../hooks/useVoiceGuide';

const MUDRAS = [
    { name: "Pataka", meaning: "Flag", usage: "Clouds, forest, a straight line, river, horse", fingers: "All four fingers straight together, thumb bent", level: "Basic", folder: "pataka" },
    { name: "Tripataka", meaning: "Three parts of flag", usage: "Crown, tree, flame, arrow", fingers: "Ring finger bent, others straight", level: "Basic", folder: "tripataka" },
    { name: "Ardhapataka", meaning: "Half flag", usage: "Knife, two meanings, leaves", fingers: "Ring and little finger bent, others straight", level: "Basic", folder: "ardhapataka" },
    { name: "Kartarimukha", meaning: "Scissors face", usage: "Separation, lightning, falling", fingers: "Index and middle separated like scissors", level: "Basic", folder: "kartarimukha" },
    { name: "Mayura", meaning: "Peacock", usage: "Peacock, applying tilak, braid", fingers: "Thumb touches index fingertip, others spread", level: "Basic", folder: "mayura" },
    { name: "Ardhachandra", meaning: "Half moon", usage: "Moon, plate, spear, beginning prayer", fingers: "All fingers open, thumb extended sideways", level: "Basic", folder: "ardhachandra" },
    { name: "Arala", meaning: "Bent", usage: "Drinking nectar, wind, poison", fingers: "Index finger bent inward, others straight", level: "Intermediate", folder: "arala" },
    { name: "Shukatunda", meaning: "Parrot beak", usage: "Shooting arrow, throwing", fingers: "Thumb presses ring finger, others straight", level: "Intermediate", folder: "shukatunda" },
    { name: "Mushti", meaning: "Fist", usage: "Grasping, wrestling, holding hair", fingers: "All fingers curled into fist, thumb over them", level: "Intermediate", folder: "mushti" },
    { name: "Shikhara", meaning: "Spire", usage: "Bow, pillar, husband, question", fingers: "Thumb raised from fist position", level: "Intermediate", folder: "shikhara" },
    { name: "Kapittha", meaning: "Wood apple", usage: "Lakshmi, Saraswati, holding cymbals", fingers: "Index finger curled, thumb presses it", level: "Intermediate", folder: "kapittha" },
    { name: "Katakamukha", meaning: "Opening in bracelet", usage: "Picking flowers, garland, pulling bow", fingers: "Thumb, index, middle form a circle", level: "Intermediate", folder: "katakamukha" },
    { name: "Suchi", meaning: "Needle", usage: "Universe, number one, city, this", fingers: "Index finger pointing straight up", level: "Basic", folder: "suchi" },
    { name: "Chandrakala", meaning: "Digit of moon", usage: "Moon crescent, forehead mark", fingers: "Thumb and index form crescent shape", level: "Intermediate", folder: "chandrakala" },
    { name: "Padmakosha", meaning: "Lotus bud", usage: "Lotus flower, fruits, ball, bell", fingers: "All fingers spread and curved like a cup", level: "Intermediate", folder: "padmakosha" },
    { name: "Sarpashira", meaning: "Snake head", usage: "Snake, elephant trunk, water", fingers: "All fingers together, hand bent at wrist", level: "Advanced", folder: "sarpashira" },
    { name: "Mrigashira", meaning: "Deer head", usage: "Deer, forest, gentle touch, woman", fingers: "Thumb, ring, little finger touch; others straight", level: "Advanced", folder: "mrigashira" },
    { name: "Simhamukha", meaning: "Lion face", usage: "Lion, horse, elephant, pearl", fingers: "Three fingers spread like lion mane", level: "Advanced", folder: "simhamukha" },
    { name: "Kangula", meaning: "Bell", usage: "Bell fruit, fruit, drop of water", fingers: "Four fingers together, thumb bent across", level: "Advanced", folder: "kangula" },
    { name: "Alapadma", meaning: "Full bloomed lotus", usage: "Full moon, beauty, lake, disc", fingers: "All five fingers spread wide and curved", level: "Advanced", folder: "alapadma" },
    { name: "Chatura", meaning: "Clever", usage: "Gold, wind, slight, slow", fingers: "Four fingers bent, thumb tucked at side", level: "Advanced", folder: "chatura" },
    { name: "Bhramara", meaning: "Bee", usage: "Bee, bird, six seasons", fingers: "Index finger touches thumb; middle bent; others up", level: "Advanced", folder: "bhramara" },
    { name: "Hamsasya", meaning: "Swan beak", usage: "Pearl, tying thread, number five", fingers: "All fingertips touching thumb tip", level: "Advanced", folder: "hamsasya" },
    { name: "Hamsapaksha", meaning: "Swan wing", usage: "Swan, number six, waving", fingers: "Fingers slightly spread in wave shape", level: "Advanced", folder: "hamsapaksha" },
    { name: "Sandamsha", meaning: "Tongs", usage: "Picking flowers, tongs, forceful grasp", fingers: "Index and middle pinch together", level: "Advanced", folder: "sandamsha" },
    { name: "Mukula", meaning: "Bud", usage: "Lotus bud, eating, naval", fingers: "All fingertips meet at one point", level: "Advanced", folder: "mukula" },
    { name: "Tamrachuda", meaning: "Rooster", usage: "Rooster, peacock, bird crest", fingers: "Thumb up from fist, little finger raised", level: "Advanced", folder: "tamrachuda" },
    { name: "Trishula", meaning: "Trident", usage: "Shiva trident, three paths, number three", fingers: "Index, middle, ring fingers raised; others closed", level: "Advanced", folder: "trishula" },
];

// Detailed, spoken-friendly finger instructions per mudra
const VOICE_INSTRUCTIONS = {
    pataka: "Extend all four fingers straight together. Bend only your thumb inward. Hold flat like a flag.",
    tripataka: "Keep index, middle, and little fingers straight. Bend your ring finger down toward your palm.",
    ardhapataka: "Extend index and middle fingers straight. Bend your ring and little fingers down.",
    kartarimukha: "Extend index and middle fingers and spread them apart like scissors. Fold the others.",
    mayura: "Touch your thumb tip to your index fingertip. Spread the remaining three fingers wide.",
    ardhachandra: "Open all fingers wide and extend your thumb outward to the side. Like a half moon.",
    arala: "Bend only your index finger inward. Keep all other fingers straight and upright.",
    shukatunda: "Press your thumb against your ring finger. Keep the other three fingers straight.",
    mushti: "Curl all four fingers into a fist. Place your thumb over them.",
    shikhara: "Form a fist. Now raise only your thumb upward.",
    kapittha: "Curl your index finger. Press your thumb against the side of it. Keep others curled.",
    katakamukha: "Form a gentle circle with your thumb, index, and middle finger. Keep the rest relaxed.",
    suchi: "Point your index finger straight up like a needle. Curl all other fingers down.",
    chandrakala: "Curve your thumb and index finger together to form a crescent moon shape.",
    padmakosha: "Spread all five fingers wide and curve them inward like holding a ball. Like a lotus cup.",
    sarpashira: "Hold all fingers together tightly. Bend your entire hand at the wrist downward. Like a snake.",
    mrigashira: "Touch your thumb, ring, and little finger together. Keep index and middle fingers straight up.",
    simhamukha: "Spread your thumb, index, and middle fingers wide like a lion mane. Curl the others.",
    kangula: "Hold four fingers together and straight. Bend your thumb across your palm.",
    alapadma: "Spread all five fingers as wide as possible, curving them slightly outward. A full lotus bloom.",
    chatura: "Bend all four fingers together. Tuck your thumb flat against your palm on the side.",
    bhramara: "Touch your index finger to your thumb. Bend your middle finger. Raise ring and little finger.",
    hamsasya: "Bring all five fingertips together touching at one point. Like a swan beak.",
    hamsapaksha: "Spread your fingers slightly apart in a gentle wave, like a swan wing.",
    sandamsha: "Pinch your index and middle fingers firmly together. Keep the others curled.",
    mukula: "Bring all five fingertips to meet at one point at the top. Like a closed flower bud.",
    tamrachuda: "Make a fist. Raise your thumb upward and lift your little finger. Like a rooster crest.",
    trishula: "Raise your index, middle, and ring fingers straight up. Keep thumb and little finger closed.",
};

const HOLD_DURATION_MS = 2000; // User must hold correct pose for 2 seconds

const STAGES = { SELECT_LEVEL: 'SELECT_LEVEL', MUDRA_LIST: 'MUDRA_LIST', PRACTICE: 'PRACTICE' };
const LEVEL_CONFIG = {
    'Basic': { title: 'The Foundations', icon: '✦' },
    'Intermediate': { title: 'The Expressions', icon: '❦' },
    'Advanced': { title: 'The Mastery', icon: '✧' }
};

export default function Learn() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { speak, stop, test, announce } = useVoiceGuide();

    const [stage, setStage] = useState(STAGES.SELECT_LEVEL);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedMudra, setSelectedMudra] = useState(null);
    const [progress, setProgress] = useState([]);
    const [bestScores, setBestScores] = useState({});
    const [cameraOn, setCameraOn] = useState(false);
    const [detected, setDetected] = useState({ name: "", confidence: 0, detected: false });
    const [loading, setLoading] = useState(true);
    const [mudraContent, setMudraContent] = useState(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionScore, setSessionScore] = useState(0);
    const [voiceEnabled, setVoiceEnabled] = useState(false);

    // Hold timer: track how long user has been in correct pose
    const [holdProgress, setHoldProgress] = useState(0); // 0–100%
    const holdStartRef = useRef(null);
    const masteredRef = useRef(false); // prevent duplicate mastered calls

    // Steps for guided onboarding before camera
    const [practiceStep, setPracticeStep] = useState(0); // 0=instructions, 1=ready, 2=live
    const PRACTICE_STEPS = [
        { title: "Study the Position", desc: "Look at the reference image carefully. Read the finger instructions below." },
        { title: "Prepare Your Hand", desc: "Get your hand ready in front of you. Good lighting helps accuracy." },
        { title: "Start Live Practice", desc: "The AI will watch your hand and guide you in real time." }
    ];

    const getLevelMudras = (lvl) => MUDRAS.filter(m => m.level === lvl);
    const getLevelProgress = (lvl) => getLevelMudras(lvl).filter(m => progress.includes(m.folder));

    useEffect(() => {
        if (user && user.role !== 'student') { navigate('/'); return; }
        fetchProgress();
    }, [user, navigate]);

    useEffect(() => {
        if (selectedMudra) fetchMudraContent(selectedMudra.folder);
        else setMudraContent(null);
    }, [selectedMudra]);

    // Announce mudra when practice stage opens
    useEffect(() => {
        if (stage === STAGES.PRACTICE && selectedMudra && voiceEnabled) {
            setTimeout(() => {
                announce.start(selectedMudra.name);
                setTimeout(() => {
                    const instruction = VOICE_INSTRUCTIONS[selectedMudra.folder];
                    if (instruction) speak(instruction, { priority: true, minInterval: 0 });
                }, 3000);
            }, 500);
        }
    }, [stage, selectedMudra]);

    // When camera turns on, guide the user
    useEffect(() => {
        if (cameraOn && selectedMudra && voiceEnabled) {
            setTimeout(() => {
                speak("Camera is active. Hold your hand clearly in view and match the reference image.", { priority: true });
            }, 1000);
        }
    }, [cameraOn]);

    // Polling + hold timer logic
    useEffect(() => {
        if (stage !== STAGES.PRACTICE || !cameraOn || !selectedMudra) return;

        masteredRef.current = false;

        const interval = setInterval(() => {
            fetch(`http://localhost:5001/mudra_data?target=${selectedMudra.folder}`)
                .then(r => r.json())
                .then(data => {
                    setDetected(data);

                    const accuracy = data.accuracy || 0;
                    const corrections = data.corrections || [];
                    // isCorrect: accuracy >= 70 AND (accuracy > 75 OR no corrections)
                    // This ensures at least a 70% floor even if corrections are empty.
                    const isCorrect = data.detected && accuracy >= 70 && (accuracy > 75 || corrections.length === 0);

                    // ── HOLD TIMER LOGIC ──
                    if (isCorrect) {
                        if (!holdStartRef.current) {
                            holdStartRef.current = Date.now();
                            if (voiceEnabled) speak("Good! Now hold this position.", { priority: true });
                        }
                        const elapsed = Date.now() - holdStartRef.current;
                        const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
                        setHoldProgress(pct);

                        if (elapsed >= HOLD_DURATION_MS && !masteredRef.current) {
                            masteredRef.current = true;
                            handleMudraMastered(selectedMudra.folder, accuracy);
                        }
                    } else {
                        // Reset hold timer if pose is broken
                        if (holdStartRef.current) {
                            holdStartRef.current = null;
                            setHoldProgress(0);
                        }

                        // Voice: only speak corrections when accuracy is genuinely low (<70%).
                        // If accuracy >= 70, just encourage — never nag with corrections.
                        if (voiceEnabled) {
                            if (!data.detected) {
                                announce.noHand();
                            } else if (corrections.length > 0 && accuracy < 70) {
                                announce.correction(corrections[0]);
                            } else if (accuracy >= 70) {
                                announce.hold();
                            }
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
    }, [stage, cameraOn, selectedMudra, voiceEnabled]);

    const fetchProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/progress', { headers: { 'x-auth-token': token } });
            setProgress(res.data.progress.detectedMudras || []);
            setBestScores(res.data.progress.mudraScores || {});
        } catch (err) {
            console.error('Failed to fetch progress', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMudraContent = async (mudraName) => {
        setContentLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/user/mudra/content/${mudraName}`, { headers: { 'x-auth-token': token } });
            setMudraContent(res.data);
        } catch (err) {
            console.error('Failed to fetch mudra content', err);
        } finally {
            setContentLoading(false);
        }
    };

    const handleMudraMastered = async (folder, currentAccuracy) => {
        try {
            const token = localStorage.getItem('token');
            const score = Math.round(currentAccuracy);
            setSessionScore(score);
            const res = await axios.post('/api/user/progress/update', { mudraName: folder, score }, { headers: { 'x-auth-token': token } });
            setProgress(res.data.detectedMudras || []);
            setBestScores(res.data.mudraScores || {});
            setSessionComplete(true);
            setCameraOn(false);
            setHoldProgress(0);
            if (voiceEnabled) announce.mastered(selectedMudra.name);
        } catch (err) {
            console.error('Failed to update progress', err);
        }
    };

    const enterPractice = (mudra) => {
        setSelectedMudra(mudra);
        setSessionComplete(false);
        setDetected({ name: "", confidence: 0, detected: false });
        setHoldProgress(0);
        holdStartRef.current = null;
        masteredRef.current = false;
        setPracticeStep(0);
        setStage(STAGES.PRACTICE);
    };

    const nextMudra = () => {
        const levelMudras = getLevelMudras(selectedLevel);
        const currentIndex = levelMudras.findIndex(m => m.folder === selectedMudra.folder);
        if (currentIndex < levelMudras.length - 1) {
            enterPractice(levelMudras[currentIndex + 1]);
        } else {
            setStage(STAGES.MUDRA_LIST);
        }
    };

    const accuracy = detected.accuracy || 0;
    const corrections = detected.corrections || [];
    const isCorrect = detected.detected && accuracy > 75 && corrections.length === 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen">

            {/* ── STAGE A: LEVEL SELECTION ── */}
            {stage === STAGES.SELECT_LEVEL && (
                <div className="animate-fade-in">
                    <div className="text-center mb-16">
                        <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Learning Journey</div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text)' }}>Choose your Path</h1>
                        <div className="max-w-md mx-auto"><BorderPattern /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {['Basic', 'Intermediate', 'Advanced'].map((lvl) => {
                            const config = LEVEL_CONFIG[lvl];
                            const levelMudras = getLevelMudras(lvl);
                            const completedCount = getLevelProgress(lvl).length;
                            let isLocked = false, lockReason = "";
                            if (lvl === 'Intermediate' && getLevelProgress('Basic').length < 5) {
                                isLocked = true; lockReason = "Master 5 Basic Mudras to unlock";
                            } else if (lvl === 'Advanced' && getLevelProgress('Intermediate').length < getLevelMudras('Intermediate').length) {
                                isLocked = true; lockReason = "Master all Intermediate Mudras to unlock";
                            }
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
                                    <div className="absolute bottom-0 left-0 h-1 bg-accent transition-all duration-1000" style={{ width: `${(completedCount / levelMudras.length) * 100}%` }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── STAGE B: MUDRA LIST ── */}
            {stage === STAGES.MUDRA_LIST && (
                <div className="animate-fade-in">
                    <button onClick={() => setStage(STAGES.SELECT_LEVEL)} className="flex items-center gap-2 mb-8 text-xs tracking-widest uppercase hover:text-accent transition-colors" style={{ color: 'var(--text-muted)' }}>
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
                                            <CheckCircle2 size={16} className="text-green-500" fill="currentColor" style={{ color: 'white' }} />
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

            {/* ── STAGE C: PRACTICE ── */}
            {stage === STAGES.PRACTICE && selectedMudra && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => { setStage(STAGES.MUDRA_LIST); setCameraOn(false); stop(); }}
                            className="flex items-center gap-2 text-xs tracking-widest uppercase hover:text-accent transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <ChevronLeft size={16} /> Back
                        </button>

                        {/* Voice toggle always visible */}
                        <div className="flex items-center gap-3">
                            <button onClick={test} className="px-3 py-1.5 rounded text-[9px] tracking-widest uppercase border transition-all"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                Test Voice
                            </button>
                            <button onClick={() => setVoiceEnabled(v => !v)}
                                className="px-4 py-2 rounded text-[10px] tracking-widest uppercase font-bold border transition-all"
                                style={{
                                    backgroundColor: voiceEnabled ? 'var(--copper)' : 'transparent',
                                    borderColor: voiceEnabled ? 'var(--copper)' : 'var(--border)',
                                    color: voiceEnabled ? 'white' : 'var(--text-muted)'
                                }}>
                                {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
                            </button>
                        </div>
                    </div>

                    {/* ── STEP INDICATOR ── */}
                    {!sessionComplete && (
                        <div className="flex items-center gap-3 mb-8">
                            {PRACTICE_STEPS.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${practiceStep >= i ? 'text-white' : ''}`}
                                        style={{
                                            backgroundColor: practiceStep >= i ? 'var(--accent)' : 'transparent',
                                            borderColor: practiceStep >= i ? 'var(--accent)' : 'var(--border)',
                                            color: practiceStep >= i ? 'white' : 'var(--text-muted)'
                                        }}>{i + 1}</div>
                                    <span className="text-[9px] tracking-widest uppercase hidden md:block"
                                        style={{ color: practiceStep === i ? 'var(--text)' : 'var(--text-muted)' }}>{s.title}</span>
                                    {i < 2 && <div className="w-8 h-px mx-1" style={{ backgroundColor: 'var(--border)' }} />}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 min-h-[600px]">

                        {/* LEFT: Reference + Info */}
                        <div className="flex flex-col">
                            {/* Reference Image */}
                            <div className="w-full aspect-video rounded-xl border flex flex-col items-center justify-center mb-6 relative overflow-hidden"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                {mudraContent?.primaryImage ? (
                                    <div className="w-full h-full relative overflow-hidden">
                                        <div className="absolute inset-0 scale-110 blur-xl opacity-30 saturate-150"
                                            style={{ backgroundImage: `url(http://localhost:5000/uploads/mudras/${selectedMudra.folder}/images/${mudraContent.primaryImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                                        <img src={`http://localhost:5000/uploads/mudras/${selectedMudra.folder}/images/${mudraContent.primaryImage}`}
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
                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent" />
                                    </div>
                                )}
                            </div>

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

                                {/* Step 0: Detailed voice-ready instructions */}
                                <div className="mb-5 p-4 rounded-lg border" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card2)' }}>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-2 flex items-center gap-2 font-bold" style={{ color: 'var(--accent)' }}>
                                        <BookOpen size={11} /> Step-by-step Finger Guide
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text)' }}>
                                        {VOICE_INSTRUCTIONS[selectedMudra.folder] || selectedMudra.fingers}
                                    </p>
                                    {voiceEnabled && (
                                        <button onClick={() => { const inst = VOICE_INSTRUCTIONS[selectedMudra.folder]; if (inst) speak(inst, { priority: true }); }}
                                            className="mt-3 text-[9px] tracking-[3px] uppercase font-bold px-3 py-1.5 rounded border transition-all"
                                            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                            🔊 Repeat Instructions
                                        </button>
                                    )}
                                </div>

                                {/* Live corrections */}
                                {cameraOn && corrections.length > 0 && (
                                    <div className="mb-4 p-4 rounded-xl border bg-red-500/10 border-red-500/30">
                                        <div className="text-[9px] tracking-[4px] uppercase text-red-500 mb-2 font-black flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Correction Needed
                                        </div>
                                        <ul className="text-xs space-y-1.5 text-red-400">
                                            {corrections.map((c, i) => (
                                                <li key={i} className="flex items-center gap-2"><span className="text-red-500">•</span>{c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div>
                                    <div className="text-[9px] tracking-[4px] uppercase mb-1 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <Trophy size={11} /> Usage in Dance
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

                        {/* RIGHT: Camera */}
                        <div className="flex flex-col">
                            <div className="w-full flex-1 min-h-[420px] rounded-xl overflow-hidden border relative bg-black shadow-inner" style={{ borderColor: 'var(--border)' }}>
                                {cameraOn ? (
                                    <>
                                        <img src="http://localhost:5001/video_feed" alt="Live Video" className="w-full h-full object-cover" />

                                        {/* Accuracy overlay */}
                                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 flex flex-col items-end gap-1">
                                            <span className="text-[8px] tracking-[3px] uppercase text-white/50">Accuracy</span>
                                            <span className="text-2xl font-mono font-bold" style={{ color: accuracy > 75 ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }}>
                                                {accuracy.toFixed(0)}%
                                            </span>
                                            <div className="w-24 h-1.5 bg-white/10 rounded-full">
                                                <div className="h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${accuracy}%`, backgroundColor: accuracy > 75 ? '#4ade80' : accuracy > 50 ? '#fbbf24' : '#f87171' }} />
                                            </div>
                                        </div>

                                        {/* Hold progress ring */}
                                        {holdProgress > 0 && (
                                            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-green-500/30 flex flex-col items-center gap-1">
                                                <span className="text-[8px] tracking-[3px] uppercase text-green-400">Hold</span>
                                                <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                                                    <div className="h-full rounded-full transition-all duration-200 bg-green-400"
                                                        style={{ width: `${holdProgress}%` }} />
                                                </div>
                                                <span className="text-[9px] text-green-300 font-bold">{Math.ceil((1 - holdProgress / 100) * (HOLD_DURATION_MS / 1000))}s</span>
                                            </div>
                                        )}

                                        {/* Status badge */}
                                        {detected.detected && (
                                            <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border ${isCorrect ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}`}>
                                                {isCorrect ? '✓ Correct Form' : '↻ Adjust'}
                                            </div>
                                        )}

                                        {/* Bottom bar */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 px-5 py-3 flex items-center justify-between">
                                            <div>
                                                <span className="text-[8px] tracking-[3px] uppercase text-white/40 block mb-0.5">Target</span>
                                                <span className="text-white font-bold text-sm">{selectedMudra.name}</span>
                                            </div>
                                            <button onClick={() => { setCameraOn(false); stop(); }}
                                                className="text-[9px] tracking-[3px] uppercase text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded border border-red-500/30 hover:bg-red-500/10 transition-all">
                                                ✕ Stop Camera
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* Pre-camera: Step-by-step guided flow */
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
                                                        <button onClick={() => setCameraOn(true)}
                                                            className="px-10 py-3 rounded-lg text-white text-[10px] tracking-[4px] uppercase font-bold hover:scale-105 transition-all shadow-lg shadow-accent/20"
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

                            {/* Next button */}
                            <div className="mt-6">
                                {sessionComplete ? (
                                    <button onClick={nextMudra}
                                        className="w-full py-4 text-white rounded-xl font-bold text-xs tracking-[5px] uppercase flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-accent/20"
                                        style={{ backgroundColor: 'var(--accent)' }}>
                                        Next Mudra <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <div className="text-[9px] tracking-[4px] uppercase text-center w-full py-3 border rounded-xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                                        {cameraOn
                                            ? corrections.length > 0
                                                ? `↻ ${corrections[0]}`
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
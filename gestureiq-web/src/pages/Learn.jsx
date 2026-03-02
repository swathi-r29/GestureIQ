import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { AppWindow, BookOpen, Camera, CheckCircle2, ChevronLeft, ChevronRight, Play, Trophy } from 'lucide-react';

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

const STAGES = {
    SELECT_LEVEL: 'SELECT_LEVEL',
    MUDRA_LIST: 'MUDRA_LIST',
    PRACTICE: 'PRACTICE'
};

const LEVEL_CONFIG = {
    'Basic': { title: 'The Foundations', count: 7, icon: '✦' },
    'Intermediate': { title: 'The Expressions', count: 9, icon: '❦' },
    'Advanced': { title: 'The Mastery', count: 12, icon: '✧' }
};

export default function Learn() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stage, setStage] = useState(STAGES.SELECT_LEVEL);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedMudra, setSelectedMudra] = useState(null);
    const [progress, setProgress] = useState([]);
    const [cameraOn, setCameraOn] = useState(false);
    const [detected, setDetected] = useState({ name: "", confidence: 0, detected: false });
    const [loading, setLoading] = useState(true);
    const [mudraContent, setMudraContent] = useState(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionScore, setSessionScore] = useState(0);

    useEffect(() => {
        if (user && user.role !== 'student') {
            navigate('/');
            return;
        }
        fetchProgress();
    }, [user, navigate]);

    // Fetch content when mudra changes
    useEffect(() => {
        if (selectedMudra) {
            fetchMudraContent(selectedMudra.folder);
        } else {
            setMudraContent(null);
        }
    }, [selectedMudra]);

    const fetchMudraContent = async (mudraName) => {
        setContentLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/admin/mudra/content/${mudraName}`, {
                headers: { 'x-auth-token': token }
            });
            setMudraContent(res.data);
        } catch (err) {
            console.error('Failed to fetch mudra content', err);
        } finally {
            setContentLoading(false);
        }
    };

    // Polling logic for practice mode
    useEffect(() => {
        let interval;
        if (stage === STAGES.PRACTICE && cameraOn && selectedMudra) {
            interval = setInterval(() => {
                fetch('http://localhost:5001/mudra_data')
                    .then(r => r.json())
                    .then(data => {
                        setDetected(data);
                        // Check if current mudra is detected correctly
                        if (data.detected && data.name === selectedMudra.folder && data.confidence > 75) {
                            handleMudraMastered(selectedMudra.folder, data.confidence);
                        }
                    })
                    .catch(() => { });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [stage, cameraOn, selectedMudra]);

    const fetchProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/progress', {
                headers: { 'x-auth-token': token }
            });
            setProgress(res.data.progress.detectedMudras || []);
        } catch (err) {
            console.error('Failed to fetch progress', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMudraMastered = async (folder, currentConfidence) => {
        if (progress.includes(folder) && sessionComplete) return;

        try {
            const token = localStorage.getItem('token');
            const score = Math.round(currentConfidence);
            setSessionScore(score);

            const res = await axios.post('/api/user/progress/update', { mudraName: folder }, {
                headers: { 'x-auth-token': token }
            });
            setProgress(res.data.detectedMudras || []);
            setSessionComplete(true);
            setCameraOn(false);
        } catch (err) {
            console.error('Failed to update progress', err);
        }
    };

    const nextMudra = () => {
        const levelMudras = MUDRAS.filter(m => m.level === selectedLevel);
        const currentIndex = levelMudras.findIndex(m => m.folder === selectedMudra.folder);
        if (currentIndex < levelMudras.length - 1) {
            setSelectedMudra(levelMudras[currentIndex + 1]);
            setSessionComplete(false);
            setDetected({ name: "", confidence: 0, detected: false });
        } else {
            setStage(STAGES.MUDRA_LIST);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }}></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen">

            {/* STAGE A: LEVEL SELECTION */}
            {stage === STAGES.SELECT_LEVEL && (
                <div className="animate-fade-in">
                    <div className="text-center mb-16">
                        <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Learning Journey</div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text)' }}>Choose your Path</h1>
                        <div className="max-w-md mx-auto">
                            <BorderPattern />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {['Basic', 'Intermediate', 'Advanced'].map((lvl) => {
                            const config = LEVEL_CONFIG[lvl];
                            const completedCount = MUDRAS.filter(m => m.level === lvl && progress.includes(m.folder)).length;
                            const totalCount = MUDRAS.filter(m => m.level === lvl).length;
                            const isLocked = lvl !== 'Basic' && MUDRAS.filter(m => m.level === (lvl === 'Intermediate' ? 'Basic' : 'Intermediate') && progress.includes(m.folder)).length < (lvl === 'Intermediate' ? 3 : 5);

                            return (
                                <div key={lvl}
                                    onClick={() => { if (!isLocked) { setSelectedLevel(lvl); setStage(STAGES.MUDRA_LIST); } }}
                                    className={`group p-8 rounded-xl border-2 transition-all duration-500 cursor-pointer relative overflow-hidden ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 shadow-xl hover:border-accent'}`}
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderColor: 'var(--border)',
                                        borderColor: isLocked ? 'var(--border)' : 'var(--border)'
                                    }}>

                                    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform" style={{ color: 'var(--accent)' }}>{config.icon}</div>
                                    <h3 className="text-2xl font-bold mb-2 uppercase tracking-widest" style={{ color: 'var(--text)' }}>{lvl}</h3>
                                    <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>{config.title}</p>

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Completion</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--copper)' }}>{completedCount} / {totalCount}</div>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-accent/10 border border-accent/20 group-hover:bg-accent group-hover:text-white transition-all">
                                            {isLocked ? '🔒' : <ChevronRight size={20} />}
                                        </div>
                                    </div>

                                    {/* Progress line */}
                                    <div className="absolute bottom-0 left-0 h-1 bg-accent transition-all duration-1000" style={{ width: `${(completedCount / totalCount) * 100}%` }}></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* STAGE B: MUDRA LIST */}
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
                                <div key={mudra.folder}
                                    onClick={() => { setSelectedMudra(mudra); setStage(STAGES.PRACTICE); }}
                                    className="p-5 border rounded-lg cursor-pointer hover:border-accent group hover:shadow-md transition-all relative overflow-hidden"
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                                    <div className="text-[10px] tracking-[3px] uppercase mb-3 opacity-50" style={{ color: 'var(--text-muted)' }}>{idx + 1}</div>
                                    <h4 className="font-bold tracking-wider mb-1" style={{ color: 'var(--text)' }}>{mudra.name}</h4>
                                    <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>{mudra.meaning}</p>

                                    {isMastered && (
                                        <div className="absolute top-2 right-2 text-green-500">
                                            <CheckCircle2 size={16} fill="currentColor" className="text-white dark:text-gray-900" />
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

            {/* STAGE C: PRACTICE MODE (Side-by-side) */}
            {stage === STAGES.PRACTICE && selectedMudra && (
                <div className="animate-fade-in">
                    <button onClick={() => { setStage(STAGES.MUDRA_LIST); setCameraOn(false); }} className="flex items-center gap-2 mb-8 text-xs tracking-widest uppercase hover:text-accent transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <ChevronLeft size={16} /> Back to Mudra List
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 min-h-[600px]">

                        {/* LEFT: INFORMATION & REFERENCE */}
                        <div className="flex flex-col">
                            {/* Image Placeholder Box */}
                            <div className="w-full aspect-video rounded-xl border flex flex-col items-center justify-center mb-8 relative overflow-hidden transition-all group"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                {mudraContent?.primaryImage ? (
                                    <img src={`http://localhost:5000/uploads/mudras/${selectedMudra.folder}/images/${mudraContent.primaryImage}`}
                                        alt={selectedMudra.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center">
                                        <div className="text-3xl mb-3 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all">📸</div>
                                        <p className="text-[10px] tracking-[4px] uppercase opacity-40 font-bold">Image Not Available</p>
                                    </div>
                                )}
                                {contentLoading && (
                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 rounded-xl border relative overflow-hidden flex-1" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                <div className="text-[10px] tracking-[6px] uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Mudra Details</div>
                                <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight" style={{ color: 'var(--accent)' }}>{selectedMudra.name}</h1>
                                <p className="text-sm italic mb-6 border-l-4 pl-4" style={{ color: 'var(--text-muted)', borderColor: 'var(--accent)' }}>
                                    {mudraContent?.description?.meaning || selectedMudra.meaning}
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <div className="text-[10px] tracking-[4px] uppercase mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                            <BookOpen size={12} /> Finger Position
                                        </div>
                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                                            {mudraContent?.description?.fingerPosition || selectedMudra.fingers}
                                        </p>
                                    </div>

                                    <div>
                                        <div className="text-[10px] tracking-[4px] uppercase mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                            <Trophy size={12} /> Usage & Significance
                                        </div>
                                        <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                            {mudraContent?.description?.usage || selectedMudra.usage}
                                        </p>
                                    </div>
                                </div>

                                {sessionComplete && (
                                    <div className="mt-8 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg flex items-center gap-3">
                                        <CheckCircle2 className="text-green-500" />
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-400">Mastered! Score: {sessionScore}%</span>
                                            <p className="text-[10px] text-green-600 dark:text-green-500">Postured captured with high confidence</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: LIVE CAMERA & SCORING */}
                        <div className="flex flex-col">
                            <div className="w-full aspect-video md:aspect-auto md:h-full min-h-[400px] rounded-xl overflow-hidden border relative bg-black shadow-inner" style={{ borderColor: 'var(--border)' }}>
                                {cameraOn ? (
                                    <>
                                        {/* Camera feed */}
                                        <img src="http://localhost:5001/video_feed"
                                            alt="Live Video"
                                            className="w-full h-full object-cover" />

                                        {/* Confidence Gauge Overlay */}
                                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 flex flex-col items-end">
                                            <span className="text-[8px] tracking-[3px] uppercase text-white/60 mb-1">AI Confidence</span>
                                            <span className="text-lg font-mono font-bold" style={{ color: detected.confidence > 70 ? '#4ade80' : '#fbbf24' }}>
                                                {detected.confidence.toFixed(1)}%
                                            </span>
                                            <div className="w-20 h-1 bg-white/10 rounded-full mt-1">
                                                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${detected.confidence}%`, backgroundColor: detected.confidence > 75 ? '#4ade80' : 'var(--accent)' }}></div>
                                            </div>
                                        </div>

                                        {/* Guidance Overlay */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-6">
                                            <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-4 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <span className="text-[9px] tracking-[3px] uppercase text-white/50 block mb-1">Current Target</span>
                                                    <span className="text-white font-bold">{selectedMudra.name}</span>
                                                </div>
                                                <button onClick={() => setCameraOn(false)} className="text-[9px] tracking-[3px] uppercase text-red-400 hover:text-red-300 font-bold">
                                                    ✕ Stop Camera
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
                                        <div className="w-20 h-20 bg-accent/5 flex items-center justify-center rounded-full mb-6 border border-accent/20">
                                            <Camera size={32} className="text-accent" />
                                        </div>
                                        <h3 className="text-white text-xl font-bold mb-2">Ready to Practice?</h3>
                                        <p className="text-white/40 text-[10px] tracking-widest uppercase mb-8 max-w-[200px]">The AI will monitor your posture and score your accuracy</p>
                                        <button onClick={() => setCameraOn(true)}
                                            className="px-10 py-3 bg-accent text-white text-[10px] tracking-[4px] uppercase font-bold rounded-lg hover:scale-105 transition-all shadow-lg shadow-accent/20">
                                            ▶ Start Live Practice
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Action Row */}
                            <div className="mt-8 flex justify-center">
                                {sessionComplete ? (
                                    <button onClick={nextMudra}
                                        className="w-full py-5 bg-accent text-white rounded-xl font-bold text-xs tracking-[5px] uppercase flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-accent/20">
                                        Next Mudra <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <div className="text-[10px] tracking-[4px] uppercase text-center w-full py-4 border rounded-xl" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                                        Follow the instructions on the left to complete your posture
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

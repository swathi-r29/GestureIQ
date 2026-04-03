
// src/pages/Learn.jsx
// ─────────────────────────────────────────────────────────────────────────────
// MODULE ROLE: GUIDED LEARNING MODULE
// Updated: Natural voice + 6-language support + HandVisualiser 3D panel
// ─────────────────────────────────────────────────────────────────────────────

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

const VOICE_INSTRUCTIONS = {
    pataka:       "Extend all four fingers straight together. Bend only your thumb inward. Hold flat like a flag.",
    tripataka:    "Keep index, middle, and little fingers straight. Bend your ring finger down toward your palm.",
    ardhapataka:  "Extend index and middle fingers straight. Bend your ring and little fingers down.",
    kartarimukha: "Extend index and middle fingers and spread them apart like scissors. Fold the others.",
    mayura:       "Touch your thumb tip to your ring fingertip. Spread the remaining three fingers wide.",
    ardhachandra: "Open all fingers wide and extend your thumb outward to the side. Like a half moon.",
    arala:        "Bend only your index finger inward. Keep all other fingers straight and upright.",
    shukatunda:   "Press your thumb against your ring finger. Keep the other three fingers straight.",
    mushti:       "Curl all four fingers into a fist. Place your thumb over them.",
    shikhara:     "Form a fist. Now raise only your thumb upward.",
    kapittha:     "Curl your index finger. Press your thumb against the side of it. Keep others curled.",
    katakamukha:  "Form a gentle circle with your thumb, index, and middle finger. Keep the rest relaxed.",
    suchi:        "Point your index finger straight up like a needle. Curl all other fingers down.",
    chandrakala:  "Curve your thumb and index finger together to form a crescent moon shape.",
    padmakosha:   "Spread all five fingers wide and curve them inward like holding a ball. Like a lotus cup.",
    sarpashira:   "Hold all fingers together tightly. Bend your entire hand at the wrist downward. Like a snake.",
    mrigashira:   "Touch your thumb, ring, and little finger together. Keep index and middle fingers straight up.",
    simhamukha:   "Spread your thumb, index, and middle fingers wide like a lion mane. Curl the others.",
    kangula:      "Hold four fingers together and straight. Bend your thumb across your palm.",
    alapadma:     "Spread all five fingers as wide as possible, curving them slightly outward. A full lotus bloom.",
    chatura:      "Bend all four fingers together. Tuck your thumb flat against your palm on the side.",
    bhramara:     "Touch your index finger to your thumb. Bend your middle finger. Raise ring and little finger.",
    hamsasya:     "Bring all five fingertips together touching at one point. Like a swan beak.",
    hamsapaksha:  "Spread your fingers slightly apart in a gentle wave, like a swan wing.",
    sandamsha:    "Pinch your index and middle fingers firmly together. Keep the others curled.",
    mukula:       "Bring all five fingertips to meet at one point at the top. Like a closed flower bud.",
    tamrachuda:   "Make a fist. Raise your thumb upward and lift your little finger. Like a rooster crest.",
    trishula:     "Raise your index, middle, and ring fingers straight up. Keep thumb and little finger closed.",
};

// ─────────────────────────────────────────────────────────────────────────────
// VOICE_INSTRUCTIONS_TRANSLATED
// Same instructions translated for each language.
// Used by "Repeat Instructions" button and auto-start announce.
// ─────────────────────────────────────────────────────────────────────────────
const VOICE_INSTRUCTIONS_TA = {
    pataka:       "நான்கு விரல்களையும் நேராக நீட்டுங்கள். கட்டை விரலை மட்டும் உள்ளே மடக்குங்கள். கொடி போல தட்டையாக பிடியுங்கள்.",
    tripataka:    "ஆட்காட்டி, நடு, சிறு விரல்களை நேராக வையுங்கள். மோதிர விரலை மட்டும் கீழே மடக்குங்கள்.",
    ardhapataka:  "ஆட்காட்டி, நடு விரல்களை நேராக வையுங்கள். மோதிர, சிறு விரல்களை மடக்குங்கள்.",
    kartarimukha: "ஆட்காட்டி, நடு விரல்களை கத்தரி போல விரித்து நேராக வையுங்கள். மற்றவற்றை மடக்குங்கள்.",
    mayura:       "கட்டை விரல் நுனியை மோதிர விரல் நுனியில் தொடுங்கள். மற்ற மூன்று விரல்களை விரிக்குங்கள்.",
    ardhachandra: "அனைத்து விரல்களையும் திறந்து விரிக்குங்கள். கட்டை விரலை பக்கவாட்டில் நீட்டுங்கள். பாதி சந்திரன் போல.",
    arala:        "ஆட்காட்டி விரலை மட்டும் உள்ளே மடக்குங்கள். மற்ற விரல்களை நேராக வையுங்கள்.",
    shukatunda:   "கட்டை விரலை மோதிர விரலில் அழுத்துங்கள். மற்ற மூன்று விரல்களை நேராக வையுங்கள்.",
    mushti:       "நான்கு விரல்களையும் மடித்து கட்டை விரலை அவற்றின் மேல் வையுங்கள்.",
    shikhara:     "முஷ்டி பிடியுங்கள். கட்டை விரலை மட்டும் மேலே நிமிர்த்துங்கள்.",
    kapittha:     "ஆட்காட்டி விரலை மடக்குங்கள். கட்டை விரலை அதன் பக்கத்தில் அழுத்துங்கள். மற்றவை மடக்கியிருக்கட்டும்.",
    katakamukha:  "கட்டை, ஆட்காட்டி, நடு விரல்களால் வட்டம் போல பிடியுங்கள். மற்றவற்றை தளர்த்துங்கள்.",
    suchi:        "ஆட்காட்டி விரலை ஊசி போல நேராக மேலே நீட்டுங்கள். மற்ற விரல்களை மடக்குங்கள்.",
    chandrakala:  "கட்டை விரல், ஆட்காட்டி விரலை சந்திர வளைவு போல வளைக்குங்கள்.",
    padmakosha:   "ஐந்து விரல்களையும் பந்து பிடிப்பது போல வளைத்து கோப்பை வடிவம் செய்யுங்கள். தாமரை அரும்பு போல.",
    sarpashira:   "அனைத்து விரல்களையும் இறுக்கமாக சேர்த்து பிடியுங்கள். கையை கீழே வளைக்குங்கள். பாம்பு தலை போல.",
    mrigashira:   "கட்டை விரல், மோதிர, சிறு விரல்களை சேர்த்து தொடுங்கள். ஆட்காட்டி, நடு விரல்களை நேராக மேலே வையுங்கள்.",
    simhamukha:   "கட்டை, ஆட்காட்டி, நடு விரல்களை சிங்கத்தின் பிடரி போல விரிக்குங்கள். மற்றவற்றை மடக்குங்கள்.",
    kangula:      "நான்கு விரல்களை சேர்த்து நேராக வையுங்கள். கட்டை விரலை உள்ளங்கை குறுக்கே வளைக்குங்கள்.",
    alapadma:     "ஐந்து விரல்களையும் முழுவதும் விரித்து, சற்று வெளியே வளைக்குங்கள். முழு மலர்ந்த தாமரை போல.",
    chatura:      "நான்கு விரல்களை மடக்குங்கள். கட்டை விரலை பக்கத்தில் தட்டையாக வையுங்கள்.",
    bhramara:     "ஆட்காட்டி விரலை கட்டை விரலில் தொடுங்கள். நடு விரலை மடக்குங்கள். மோதிர, சிறு விரல்களை மேலே வையுங்கள்.",
    hamsasya:     "ஐந்து விரல் நுனிகளையும் ஒரே இடத்தில் சேர்க்குங்கள். அன்னத்தின் வாய் போல.",
    hamsapaksha:  "விரல்களை சற்று விரித்து மென்மையான அலை வடிவில் வையுங்கள். அன்னத்தின் இறகு போல.",
    sandamsha:    "ஆட்காட்டி, நடு விரல்களை இறுக்கமாக சேர்த்து நிப்பி போல பிடியுங்கள்.",
    mukula:       "ஐந்து விரல் நுனிகளையும் மேலே ஒரு இடத்தில் சேர்க்குங்கள். மூடிய மொட்டு போல.",
    tamrachuda:   "முஷ்டி பிடியுங்கள். கட்டை விரலை மேலே, சிறு விரலை மேலே தூக்குங்கள். சேவல் தலை முடி போல.",
    trishula:     "ஆட்காட்டி, நடு, மோதிர விரல்களை மேலே நேராக நீட்டுங்கள். கட்டை, சிறு விரல்களை மடக்குங்கள்.",
};

const VOICE_INSTRUCTIONS_HI = {
    pataka:       "चारों उंगलियां सीधी रखें। केवल अंगूठा अंदर की ओर मोड़ें। झंडे की तरह सपाट रखें।",
    tripataka:    "तर्जनी, मध्यमा, कनिष्ठा सीधी रखें। केवल अनामिका को नीचे मोड़ें।",
    ardhapataka:  "तर्जनी और मध्यमा सीधी रखें। अनामिका और कनिष्ठा को मोड़ें।",
    kartarimukha: "तर्जनी और मध्यमा को कैंची की तरह फैलाएं। बाकी उंगलियां मोड़ें।",
    mayura:       "अंगूठे की नोक को अनामिका की नोक से छुएं। बाकी तीन उंगलियां फैलाएं।",
    ardhachandra: "सभी उंगलियां खोलें। अंगूठा बगल में फैलाएं। अर्धचंद्र की तरह।",
    arala:        "केवल तर्जनी को अंदर मोड़ें। बाकी उंगलियां सीधी रखें।",
    shukatunda:   "अंगूठा अनामिका पर दबाएं। बाकी तीन उंगलियां सीधी रखें।",
    mushti:       "चारों उंगलियां मुट्ठी में बंद करें। अंगूठा ऊपर से रखें।",
    shikhara:     "मुट्ठी बनाएं। केवल अंगूठा ऊपर उठाएं।",
    kapittha:     "तर्जनी मोड़ें। अंगूठे को उसके पास दबाएं। बाकी मुड़ी रहें।",
    katakamukha:  "अंगूठा, तर्जनी, मध्यमा से गोल बनाएं। बाकी ढीली रखें।",
    suchi:        "तर्जनी सुई की तरह सीधे ऊपर करें। बाकी उंगलियां मोड़ें।",
    chandrakala:  "अंगूठा और तर्जनी को अर्धचंद्र आकार में मोड़ें।",
    padmakosha:   "पांचों उंगलियां गेंद पकड़ने की तरह मोड़ें। कमल कली की तरह।",
    sarpashira:   "सभी उंगलियां कसकर एक साथ रखें। हाथ नीचे मोड़ें। सांप के सिर की तरह।",
    mrigashira:   "अंगूठा, अनामिका, कनिष्ठा एक साथ छुएं। तर्जनी, मध्यमा ऊपर सीधी रखें।",
    simhamukha:   "अंगूठा, तर्जनी, मध्यमा शेर की अयाल की तरह फैलाएं। बाकी मोड़ें।",
    kangula:      "चार उंगलियां एक साथ सीधी रखें। अंगूठा हथेली पर रखें।",
    alapadma:     "पांचों उंगलियां जितना हो सके फैलाएं, थोड़ा बाहर मोड़ें। खिला कमल।",
    chatura:      "चारों उंगलियां मोड़ें। अंगूठा बगल में सपाट रखें।",
    bhramara:     "तर्जनी अंगूठे से छुएं। मध्यमा मोड़ें। अनामिका, कनिष्ठा ऊपर रखें।",
    hamsasya:     "पांचों उंगलियों की नोकें एक बिंदु पर मिलाएं। हंस की चोंच।",
    hamsapaksha:  "उंगलियां थोड़ी फैलाएं, लहर जैसी। हंस के पंख की तरह।",
    sandamsha:    "तर्जनी और मध्यमा कसकर मिलाएं। चिमटे की तरह।",
    mukula:       "पांचों उंगलियों की नोकें ऊपर एक साथ मिलाएं। बंद कली की तरह।",
    tamrachuda:   "मुट्ठी बनाएं। अंगूठा और कनिष्ठा ऊपर उठाएं। मुर्गे की कलगी।",
    trishula:     "तर्जनी, मध्यमा, अनामिका ऊपर सीधी उठाएं। अंगूठा, कनिष्ठा मोड़ें।",
};

// Helper to get instruction in current language
const getVoiceInstruction = (folder, lang) => {
    if (lang === 'ta' && VOICE_INSTRUCTIONS_TA[folder]) return VOICE_INSTRUCTIONS_TA[folder];
    if (lang === 'hi' && VOICE_INSTRUCTIONS_HI[folder]) return VOICE_INSTRUCTIONS_HI[folder];
    return VOICE_INSTRUCTIONS[folder] || '';
};

const HOLD_DURATION_MS = 2000;
const STAGES = { SELECT_LEVEL: 'SELECT_LEVEL', MUDRA_LIST: 'MUDRA_LIST', PRACTICE: 'PRACTICE' };
const LEVEL_CONFIG = {
    'Basic':        { title: 'The Foundations', icon: '✦' },
    'Intermediate': { title: 'The Expressions', icon: '❦' },
    'Advanced':     { title: 'The Mastery',     icon: '✧' },
};

export default function Learn() {
    const { user }   = useAuth();
    const navigate   = useNavigate();

    // ── Language + Voice ──────────────────────────────────────
    const [lang, setLang] = useState('en');
    const { stop, test, unlock, announce } = useVoiceGuide({ language: lang });

    const [stage,           setStage]           = useState(STAGES.SELECT_LEVEL);
    const [selectedLevel,   setSelectedLevel]   = useState(null);
    const [selectedMudra,   setSelectedMudra]   = useState(null);
    const [progress,        setProgress]        = useState([]);
    const [bestScores,      setBestScores]      = useState({});
    const [cameraOn,        setCameraOn]        = useState(false);
    // const [landmarks,       setLandmarks]       = useState(null); // unused, safe removal
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

    const attemptsRef         = useRef(0);
    const holdStartRef        = useRef(null);
    const masteredRef         = useRef(false);
    const videoRef            = useRef(null);
    const canvasRef           = useRef(null);
    const streamRef           = useRef(null);
    const handsRef            = useRef(null);
    const landmarksRef        = useRef(null);
    const lastResultTimeRef   = useRef(Date.now());
    const isDetectingRef      = useRef(false);
    const recoveryIntervalRef = useRef(null);
    const requestRef          = useRef(null);
    const voiceTimerRef       = useRef(0); // last time voice fired (5s cooldown)

    const PRACTICE_STEPS = [
        { title: 'Study the Position',  desc: 'Look at the reference image carefully. Read the finger instructions below.' },
        { title: 'Prepare Your Hand',   desc: 'Get your hand ready in front of you. Good lighting helps accuracy.'        },
        { title: 'Start Live Practice', desc: 'The AI will watch your hand and guide you in real time.'                   },
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

    useEffect(() => {
        if (stage === STAGES.PRACTICE && selectedMudra && voiceEnabled) {
            setTimeout(() => {
                announce.start(selectedMudra.folder);
            }, 500);
        }
    }, [stage, selectedMudra]);

    // ── MediaPipe: Hands Setup ──────────────────────────────
    useEffect(() => {
        if (cameraOn && !handsRef.current) {
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
                        
                        // Store raw landmarks — Flask handles mirroring via handedness label
                        landmarksRef.current = { landmarks, handedness, score };
                        
                        // 3D visualizer uses landmarksRef.current directly
                        
                        // Draw skeleton (Now perfectly aligned with mirrored video)
                        // drawConnectors/drawLandmarks uses normalized [0,1] coordinates
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
                    console.warn("[MediaPipe] Stale results in Learn.jsx. Re-initializing...");
                    lastResultTimeRef.current = Date.now();
                    if (handsRef.current) handsRef.current.dispatchEvent({type: 'error', message: 'recovery'});
                }
            }, 1000);
        }

        return () => {
            if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current);
            if (handsRef.current) {
                handsRef.current.close();
                handsRef.current = null;
            }
        };
    }, [cameraOn]);

    // ── MediaPipe: Frame Loop ────────────────────────────────
    useEffect(() => {
        let active = true;
        const processFrame = async () => {
            if (cameraOn && videoRef.current && handsRef.current && active) {
                if (videoRef.current.readyState >= 2) {
                    await handsRef.current.send({ image: videoRef.current });
                }
                requestRef.current = requestAnimationFrame(processFrame);
            }
        };
        if (cameraOn) requestRef.current = requestAnimationFrame(processFrame);
        return () => {
            active = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [cameraOn]);

    // ── Webcam ────────────────────────────────────────────────
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
    }, []);

    const captureFrame = useCallback(() => {
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return null;
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        // CRITICAL FIX: Mirror the frame before sending to Flask.
        // The video displays with scaleX(-1) so the student sees a mirrored view.
        // We must send a mirrored frame to Flask so MediaPipe sees the same
        // hand orientation as the training data (front-camera = mirrored).
        // MIRROR FIX: Ensure the frame is mirrored for consistent coordinate extraction on the backend
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.8);
    }, []);

    useEffect(() => {
        if (cameraOn && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }
        if (cameraOn && selectedMudra && voiceEnabled) {
            setTimeout(() => announce.cameraActive(), 1000);
        }
    }, [cameraOn]);

    // ── Detection polling ─────────────────────────────────────
    useEffect(() => {
        if (stage !== STAGES.PRACTICE || !cameraOn || !selectedMudra) return;
        masteredRef.current = false;

        const interval = setInterval(async () => {
            if (isDetectingRef.current) return;
            isDetectingRef.current = true;
            try {
                const dataObj = landmarksRef.current;
                if (!dataObj) {
                    setDetected({ name: 'No Hand', confidence: 0, detected: false });
                    setHoldProgress(0);
                    holdStartRef.current = null;
                    isDetectingRef.current = false;
                    return;
                }

                // Increment attempts when hand is present
                attemptsRef.current += 1;

                const res  = await fetch(`${import.meta.env.VITE_FLASK_URL || ''}/api/detect_landmarks`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        landmarks: dataObj.landmarks,
                        handedness: dataObj.handedness,
                        presenceScore: dataObj.score,
                        targetMudra: selectedMudra.folder 
                    })
                });
                const data = await res.json();
                setDetected(data);

                // ── Voice — only fire when stable + 5s cooldown (matches Detect.jsx) ──
                if (voiceEnabled && data.is_stable) {
                    const now = Date.now();
                    if (now - voiceTimerRef.current > 5000) {
                        voiceTimerRef.current = now;
                        announce.fromResult(data);
                    }
                }

                const accuracy    = data.accuracy    || 0;
                const corrections = data.corrections || [];
                const isCorrect   = data.detected && accuracy >= 65 && (accuracy > 70 || corrections.length === 0);

                if (isCorrect) {
                    if (!holdStartRef.current) {
                        holdStartRef.current = Date.now();
                    }
                    const elapsed = Date.now() - holdStartRef.current;
                    setHoldProgress(Math.min(100, (elapsed / HOLD_DURATION_MS) * 100));
                    if (elapsed >= HOLD_DURATION_MS && !masteredRef.current) {
                        masteredRef.current = true;
                        handleMudraMastered(selectedMudra.folder, accuracy);
                    }
                } else {
                    if (holdStartRef.current) { holdStartRef.current = null; setHoldProgress(0); }
                }
            } catch { }
            finally { isDetectingRef.current = false; }
        }, 180); // Faster 180ms loop like Detect.jsx for smoother feedback

        return () => { clearInterval(interval); holdStartRef.current = null; setHoldProgress(0); };
    }, [stage, cameraOn, selectedMudra, voiceEnabled, captureFrame]);

    // ── Data fetching ─────────────────────────────────────────
    const fetchProgress = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/progress', { headers: { 'x-auth-token': token } });
            setProgress(res.data.progress.detectedMudras || []);
            setBestScores(res.data.progress.mudraScores  || {});
        } catch { } finally { setLoading(false); }
    };

    const fetchMudraContent = async (mudraName) => {
        setContentLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/user/mudra/content/${mudraName}`, { headers: { 'x-auth-token': token } });
            setMudraContent(res.data);
        } catch { } finally { setContentLoading(false); }
    };

    const handleMudraMastered = async (folder, currentAccuracy) => {
        if (!folder || folder === 'undefined') {
            console.error('Mudra folder is undefined. Cannot save progress.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const score = Math.round(currentAccuracy);
            
            // ── MASTERY MOMENT: Capture Snapshot & Statistics ──
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
            
            if (voiceEnabled) {
                announce.mastered({ 
                    mudra: selectedMudra.name, 
                    score: score, 
                    attempts: attemptsRef.current 
                });
            }
            // Reset attempts for next mudra
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
        setStage(STAGES.PRACTICE);
    };

    const nextMudra = () => {
        const levelMudras  = getLevelMudras(selectedLevel);
        const currentIndex = levelMudras.findIndex(m => m.folder === selectedMudra.folder);
        
        // Reset Mastery Moment state
        setIsFrozen(false);
        setFrozenFrame(null);
        attemptsRef.current = 0;

        if (currentIndex < levelMudras.length - 1) enterPractice(levelMudras[currentIndex + 1]);
        else setStage(STAGES.MUDRA_LIST);
    };

    const accuracy      = detected.accuracy    || 0;
    const corrections   = detected.corrections || [];
    const isCorrect     = detected.detected && accuracy > 65 && corrections.length === 0;
    const wrongMudraMsg = corrections.find(c => typeof c === 'string' && c.startsWith('Wrong mudra'));

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }} />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen">

            {/* ── STAGE A: LEVEL SELECTION ─────────────────── */}
            {stage === STAGES.SELECT_LEVEL && (
                <div className="animate-fade-in">
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

            {/* ── STAGE B: MUDRA LIST ──────────────────────── */}
            {stage === STAGES.MUDRA_LIST && (
                <div className="animate-fade-in">
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

            {/* ── STAGE C: PRACTICE ───────────────────────── */}
            {stage === STAGES.PRACTICE && selectedMudra && (
                <div className="animate-fade-in">
                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => { setStage(STAGES.MUDRA_LIST); stopWebcam(); stop(); }}
                            className="flex items-center gap-2 text-xs tracking-widest uppercase hover:text-accent transition-colors"
                            style={{ color: 'var(--text-muted)' }}>
                            <ChevronLeft size={16} /> Back
                        </button>
                        <div className="flex items-center gap-3">
                            {/* 3D toggle */}
                            <button onClick={() => setShow3D(v => !v)}
                                className="px-3 py-1.5 rounded border text-[9px] tracking-[3px] uppercase transition-all"
                                style={{
                                    backgroundColor: show3D ? 'rgba(139,92,246,0.15)' : 'transparent',
                                    borderColor:     show3D ? 'rgba(139,92,246,0.5)'  : 'var(--border)',
                                    color:           show3D ? '#a78bfa'               : 'var(--text-muted)',
                                }}>
                                {show3D ? '◈ 3D On' : '◈ 3D Off'}
                            </button>
                            <button onClick={test}
                                className="px-3 py-1.5 rounded text-[9px] tracking-widest uppercase border transition-all"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                Test Voice
                            </button>
                            {/* ── LANGUAGE SELECTOR ── */}
                            <LanguageSelector lang={lang} onChange={setLang} compact />
                            <button onClick={() => {
                                    const next = !voiceEnabled;
                                    setVoiceEnabled(next);
                                    // CHROME AUTOPLAY FIX: unlock speech engine on user click
                                    if (next) unlock();
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

                    {/* Main practice grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 min-h-[600px]">

                        {/* LEFT: Reference + Info */}
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
                                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent" />
                                    </div>
                                )}
                            </div>

                            {/* 3D Joint Visualiser */}
                            {show3D && cameraOn && (
                                <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                                    <div className="text-[9px] tracking-[5px] uppercase mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                        <span style={{ color: '#8b5cf6' }}>◈</span> 3D Joint Angle Analysis
                                        <span className="ml-auto text-[9px]" style={{ color: '#a78bfa' }}>Gold = {selectedMudra.name} reference</span>
                                    </div>
                                    <HandVisualiser 
                                        targetMudra={selectedMudra.folder} 
                                        landmarks={landmarksRef.current?.landmarks || []}
                                        deviations={detected?.deviations || {}}
                                        infoOverride={detected}
                                        apiBase={import.meta.env.VITE_FLASK_URL || ""} 
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
                                        <BookOpen size={11} /> Step-by-step Finger Guide
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text)' }}>
                                        {getVoiceInstruction(selectedMudra.folder, lang) || selectedMudra.fingers}
                                    </p>
                                    {voiceEnabled && (
                                        <button onClick={() => {
                                            announce.start(selectedMudra.folder);
                                        }}
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
                            <div className="w-full rounded-xl overflow-hidden border relative bg-black shadow-inner" style={{ borderColor: 'var(--border)', height: '520px' }}>
                                <canvas ref={canvasRef} className="hidden" />
                                {cameraOn ? (
                                    <>
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

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
                                            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-3 rounded-xl border border-green-500/30 flex flex-col items-center gap-1">
                                                <span className="text-[8px] tracking-[3px] uppercase text-green-400">Hold</span>
                                                <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                                                    <div className="h-full rounded-full transition-all duration-200 bg-green-400" style={{ width: `${holdProgress}%` }} />
                                                </div>
                                                <span className="text-[9px] text-green-300 font-bold">
                                                    {Math.ceil((1 - holdProgress / 100) * (HOLD_DURATION_MS / 1000))}s
                                                </span>
                                            </div>
                                        )}

                                        {/* Frozen Snapshot Overlay */}
                                        {isFrozen && frozenFrame && (
                                            <div className="absolute inset-0 z-50 animate-fade-in">
                                                <img src={frozenFrame} className="w-full h-full object-cover grayscale-[0.3] brightness-75 transition-all duration-1000" alt="Mastery Moment" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                                
                                                {/* Success Content */}
                                                <div className="absolute inset-x-0 bottom-0 p-10 flex flex-col items-center text-center">
                                                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-bounce-subtle">
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
                                                            className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-green-500/20 hover:scale-105 transition-all"
                                                            style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                                                            Next Mudra →
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Status badge + wrong mudra */}
                                        {detected.detected && (
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-full max-w-[85%] z-20">
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] tracking-[3px] uppercase font-bold border ${isCorrect ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}`}>
                                                    {isCorrect ? '✓ Correct Form' : '↻ Adjust'}
                                                </div>
                                                {wrongMudraMsg && (
                                                    <div className="px-4 py-2 mt-1 rounded-lg text-[10px] tracking-widest uppercase font-black border bg-red-600/95 border-red-400 text-white shadow-2xl backdrop-blur-md text-center animate-pulse">
                                                        ⚠️ {wrongMudraMsg}
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

                            {/* Next / status */}
                            <div className="mt-6">
                                {sessionComplete ? (
                                    <button onClick={nextMudra}
                                        className="w-full py-4 text-white rounded-xl font-bold text-xs tracking-[5px] uppercase flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-accent/20"
                                        style={{ backgroundColor: 'var(--accent)' }}>
                                        Next Mudra <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <div className="text-[9px] tracking-[4px] uppercase text-center w-full py-3 border rounded-xl"
                                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
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
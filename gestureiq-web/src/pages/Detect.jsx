// MudraDetect.jsx — Luxury Bharatanatyam Mudra Detection Interface
// Light theme · Temple-inspired · Classical Indian aesthetics

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Camera as CameraIcon, CameraOff, Hand, Layers, Flame, Trophy,
  Star, LayoutGrid, X, Activity, Zap, BookOpen,
  ChevronRight, ScanLine, Sparkles, Upload, Image as ImageIcon,
} from 'lucide-react';
import { loadMediaPipeScripts, loadMediaPipePoseScripts, loadMediaPipeHolisticScripts } from '../utils/loadMediaPipe';
import { evaluateSingleMudra, evaluateDoubleMudra } from '../utils/geometricRules';
import { normalizePoseLandmarks } from '../utils/poseNormalization';
import { evaluateFullBodyPose } from '../utils/bodyPoseRules';
import { evaluateHolisticPose } from '../utils/holisticScoreEngine';
import PoseVisualiser from '../components/PoseVisualiser';
import PracticeMode from '../components/PracticeMode';
import HolisticVisualiser from '../components/HolisticVisualiser';
import { useVoiceGuide } from '../hooks/useVoiceGuide';
import { FLASK_URL } from '../utils/constants';


let Hands, HAND_CONNECTIONS, drawConnectors, drawLandmarks;

// ── Single-hand mudra data ─────────────────────────────────────────────────
const MUDRA_DATA = {
  pataka: { name: 'Pataka', meaning: 'Flag', description: 'Hold all four fingers straight and pressed together; bend your thumb inward to touch the base of the index finger.', usage: 'Rain clouds, forest, river, blessing, opening doors' },
  tripataka: { name: 'Tripataka', meaning: 'Three-part Flag', description: 'Derived from Pataka with the ring finger bent. Represents crown, tree, lamp flame.', usage: 'Crown, tree, lamp flame, arrow' },
  ardhapataka: { name: 'Ardhapataka', meaning: 'Half Flag', description: 'Formed by bending ring and little fingers while keeping the other two straight.', usage: 'Knife, two leaves, river banks' },
  kartarimukha: { name: 'Kartarimukha', meaning: 'Scissors Face', description: 'Resembles scissor blades — used to depict separation, the corner of an eye, death, lightning.', usage: 'Separation, lightning, corner of eye' },
  mayura: { name: 'Mayura', meaning: 'Peacock', description: 'Represents the graceful peacock, applying tilak on forehead, a braid.', usage: 'Applying tilak, braid, gentle touch' },
  ardhachandra: { name: 'Ardhachandra', meaning: 'Half Moon', description: 'Depicts the crescent moon, a plate, beginning of prayer.', usage: 'Moon, plate, beginning prayer' },
  arala: { name: 'Arala', meaning: 'Bent', description: 'Represents drinking nectar or poison, the wind, blessings.', usage: 'Drinking nectar, wind, poison' },
  shukatunda: { name: 'Shukatunda', meaning: 'Parrot Beak', description: "Resembles a parrot's beak — shooting an arrow and pointing direction.", usage: 'Shooting arrow, direction' },
  mushti: { name: 'Mushti', meaning: 'Fist', description: 'A tight fist representing grasping, wrestling, and holding hair.', usage: 'Grasping, wrestling, holding hair' },
  shikhara: { name: 'Shikhara', meaning: 'Spire / Peak', description: 'Represents a temple spire, the husband, Shiva, and a pillar.', usage: 'Bow, pillar, husband, Shiva' },
  kapittha: { name: 'Kapittha', meaning: 'Wood Apple', description: 'Represents Goddess Lakshmi holding a lotus, Saraswati holding a veena.', usage: 'Lakshmi, Saraswati, holding cymbals' },
  katakamukha: { name: 'Katakamukha', meaning: 'Bracelet Opening', description: 'Depicts picking flowers, stringing a garland, and pulling a bow.', usage: 'Picking flowers, garland, pulling bow' },
  suchi: { name: 'Suchi', meaning: 'Needle', description: 'Represents the universe, the number one, pointing to a single truth.', usage: 'Universe, number one, the city' },
  chandrakala: { name: 'Chandrakala', meaning: 'Crescent Moon', description: "Represents Shiva's crescent moon ornament and a forehead mark.", usage: "Shiva's moon, forehead mark" },
  padmakosha: { name: 'Padmakosha', meaning: 'Lotus Bud', description: 'Represents a lotus bud, an apple, a round ball.', usage: 'Apple, round ball, lotus' },
  sarpashira: { name: 'Sarpashira', meaning: 'Snake Head', description: 'Imitates the hood of a cobra — gentle touch, swimming, movement of a snake.', usage: 'Gentle touch, swimming, snake' },
  mrigashira: { name: 'Mrigashira', meaning: 'Deer Head', description: 'Represents the head of a deer, forest animals, the gentle touch of a woman.', usage: 'Deer, forest, gentle touch, woman' },
  simhamukha: { name: 'Simhamukha', meaning: 'Lion Face', description: 'Depicts the face of a lion, a horse, and fearless power.', usage: 'Lion, horse, fearlessness, power' },
  kangula: { name: 'Kangula', meaning: 'Bell', description: 'Represents a bell, fruit, and drops of water.', usage: 'Bell, fruit, drop of water' },
  alapadma: { name: 'Alapadma', meaning: 'Full Bloomed Lotus', description: 'The fully bloomed lotus — full moon, beauty, a lake, a disc.', usage: 'Full moon, beauty, lake, disc' },
  chatura: { name: 'Chatura', meaning: 'Clever / Wise', description: 'Represents cleverness, gold, wind, and slight movement.', usage: 'Gold, wind, slight movement' },
  bhramara: { name: 'Bhramara', meaning: 'Bee', description: 'Imitates a bee — a bee, a bird, and the six seasons.', usage: 'Bee, bird, six seasons' },
  hamsasya: { name: 'Hamsasya', meaning: 'Swan Beak', description: 'Depicts the beak of a swan — a pearl, tying a thread, the number five.', usage: 'Pearl, tying thread, number five' },
  hamsapaksha: { name: 'Hamsapaksha', meaning: 'Swan Wing', description: 'Represents the wing of a swan and gentle waving motion.', usage: 'Swan, number six, gentle waving' },
  sandamsha: { name: 'Sandamsha', meaning: 'Tongs', description: 'Depicts tongs, a crab claw, and picking flowers.', usage: 'Picking flowers, tongs, crab claw' },
  mukula: { name: 'Mukula', meaning: 'Flower Bud', description: 'Represents a flower bud, eating, and the navel.', usage: 'Lotus bud, eating, navel' },
  tamrachuda: { name: 'Tamrachuda', meaning: 'Rooster Crest', description: 'Represents a rooster, peacock, and bird crest.', usage: 'Rooster, peacock, bird crest' },
  trishula: { name: 'Trishula', meaning: 'Trident', description: "Represents Lord Shiva's sacred trident and the three paths of dharma.", usage: "Shiva's trident, three paths" },
};

const DOUBLE_MUDRA_DATA = {
  anjali: { name: 'Anjali', meaning: 'Salutation', usage: 'Prayer, greeting, reverence' },
  bherunda: { name: 'Bherunda', meaning: 'Terrible Bird', usage: 'Two-headed bird, strength' },
  chakra: { name: 'Chakra', meaning: 'Wheel / Disc', usage: 'Wheel, spinning, divine disc' },
  dola: { name: 'Dola', meaning: 'Swing', usage: 'Swinging arms, casual gesture' },
  garuda: { name: 'Garuda', meaning: 'Eagle', usage: "Eagle, Vishnu's vehicle, flight" },
  kapotha: { name: 'Kapotha', meaning: 'Pigeon', usage: 'Pigeon, peace, humility' },
  karkata: { name: 'Karkata', meaning: 'Crab', usage: 'Crab, stretching, forest' },
  kartarisvastika: { name: 'Kartarisvastika', meaning: 'Scissors Cross', usage: 'Crossed scissors, protection' },
  katakavardhana: { name: 'Katakavardhana', meaning: 'Increasing Bracelet', usage: 'Coronation, royalty' },
  katva: { name: 'Katva', meaning: 'Hip Gesture', usage: 'Hip placement, dance stance' },
  kilaka: { name: 'Kilaka', meaning: 'Bond / Link', usage: 'Linking, bonding, friendship' },
  kurma: { name: 'Kurma', meaning: 'Tortoise', usage: 'Tortoise, Vishnu avatar' },
  matsya: { name: 'Matsya', meaning: 'Fish', usage: 'Fish, Vishnu avatar, water' },
  nagabandha: { name: 'Nagabandha', meaning: 'Snake Bond', usage: 'Intertwined snakes, naga' },
  pasa: { name: 'Pasa', meaning: 'Noose', usage: 'Rope, noose, binding' },
  puspaputa: { name: 'Puspaputa', meaning: 'Flower Basket', usage: 'Offering flowers, basket' },
  sakata: { name: 'Sakata', meaning: 'Cart / Vehicle', usage: "Cart, Ganesha's vehicle" },
  samputa: { name: 'Samputa', meaning: 'Covered Box', usage: 'Box, covering, protection' },
  sankha: { name: 'Sankha', meaning: 'Conch Shell', usage: 'Conch, Vishnu, auspicious' },
  sivalinga: { name: 'Sivalinga', meaning: 'Shiva Linga', usage: 'Shiva worship, devotion' },
  svastika: { name: 'Svastika', meaning: 'Auspicious Cross', usage: 'Good luck, auspiciousness' },
  utsanga: { name: 'Utsanga', meaning: 'Embrace', usage: 'Embrace, holding, affection' },
  varaha: { name: 'Varaha', meaning: 'Boar', usage: 'Boar, Vishnu avatar, earth' },
};

const STANCE_DATA = {
  'Araimandi Stance': {
    name: 'Araimandi Stance',
    meaning: 'Half-Seated Classical Stance (Ardhamandi)',
    description: 'The foundational half-seated posture in Bharatanatyam with knees bent outwards at ~110°, feet turned outward in a V-shape, and spine held upright.',
    usage: 'Formed at the start of all Adavus (pure dance units) to provide balance, strength, and grounding.'
  },
  'Muzhumandi Stance': {
    name: 'Muzhumandi Stance',
    meaning: 'Full-Seated Squat Posture (Full Mandi)',
    description: 'A deep squatting posture with knees fully bent outward, heels together, and thighs parallel to the ground while keeping torso erect.',
    usage: 'Used in dynamic Adavus, intricate sit-down footwork sequences, and expressional pirouettes.'
  },
  'Samapada Stance': {
    name: 'Samapada Stance',
    meaning: 'Upright Standing Posture',
    description: 'Standing erect with feet close together, knees straight, and body aligned in vertical equilibrium.',
    usage: 'Used at the invocation (Pushpanjali, Todayamangalam) and transitioning between Adavu steps.'
  },
  'Nattadavu Stance': {
    name: 'Nattadavu Stance',
    meaning: 'Extended Leg & Foot-Tapping Stance',
    description: 'One leg held in Araimandi while the opposite leg extends outward to touch the heel or toe to the floor with stretched arms.',
    usage: 'Used in Natta Adavu series and rhythmic leg-stretching footwork patterns.'
  },
  'Pose Tracked': {
    name: 'Full Body Pose Tracked',
    meaning: 'Live Classical Stance Recognition',
    description: 'Full body skeleton tracked in real-time. Perform Araimandi, Muzhumandi, or Natta Adavu stance.',
    usage: 'Evaluates leg flexion, spine verticality, and arm levelness.'
  }
};

const MUDRA_FINGERPRINTS = {
  pataka: [1, 1, 1, 1, 1],
  tripataka: [1, 1, 1, 0, 1],
  ardhapataka: [1, 1, 1, 0, 0],
  suchi: [0, 1, 0, 0, 0],
  chandrakala: [1, 1, 0, 0, 0],
  sarpashira: [2, 2, 2, 2, 2],
  shikhara: [1, 0, 0, 0, 0],
  mushti: [0, 0, 0, 0, 0],
  ardhachandra: [1, 1, 1, 1, 1],
  trishula: [0, 1, 1, 1, 0],
  mukula: [0, 0, 0, 0, 0],
  tamrachuda: [1, 0, 0, 0, 1],
  kartarimukha: [0, 1, 1, 0, 0],
  mayura: [0, 1, 1, 2, 1],
  arala: [1, 2, 1, 1, 1],
  kapittha: [2, 2, 0, 0, 0],
  katakamukha: [2, 2, 2, 1, 1],
  shukatunda: [0, 1, 1, 0, 1],
  kangula: [1, 1, 1, 0, 1],
  alapadma: [2, 2, 2, 2, 2],
  hamsasya: [2, 2, 1, 1, 1],
  bhramara: [2, 2, 2, 1, 1],
  padmakosha: [2, 2, 2, 2, 2],
  mrigashira: [1, 0, 0, 0, 1],
  simhamukha: [1, 0, 0, 0, 1],
  chatura: [0, 1, 1, 1, 0],
  hamsapaksha: [1, 1, 1, 1, 1],
  sandamsha: [2, 2, 2, 0, 0],
};

// Removed local evaluateSingleMudra and evaluateDoubleMudra as they are now imported from geometricRules.js

const playSuccess = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.28);
    });
  } catch { }
};

const streakMessage = (s) => {
  if (s >= 20) return { label: 'Guru Level', icon: Star };
  if (s >= 10) return { label: 'Master Level', icon: Trophy };
  if (s >= 5) return { label: 'Expert', icon: Zap };
  if (s >= 3) return { label: 'On Fire', icon: Flame };
  return null;
};

// ── Kolam / Rangoli SVG pattern for decorative use ──────────────────────────
const KolamPattern = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.18">
    <circle cx="60" cy="60" r="58" stroke="#8B2500" strokeWidth="0.8" />
    <circle cx="60" cy="60" r="46" stroke="#8B2500" strokeWidth="0.5" />
    <circle cx="60" cy="60" r="32" stroke="#8B2500" strokeWidth="0.5" />
    <circle cx="60" cy="60" r="18" stroke="#8B2500" strokeWidth="0.8" />
    <circle cx="60" cy="60" r="5" fill="#8B2500" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const r1 = 20, r2 = 56;
      const rad = (a * Math.PI) / 180;
      return <line key={a} x1={60 + r1 * Math.cos(rad)} y1={60 + r1 * Math.sin(rad)} x2={60 + r2 * Math.cos(rad)} y2={60 + r2 * Math.sin(rad)} stroke="#8B2500" strokeWidth="0.6" />;
    })}
    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map(a => {
      const rad = (a * Math.PI) / 180;
      return <circle key={a} cx={60 + 44 * Math.cos(rad)} cy={60 + 44 * Math.sin(rad)} r="2.5" fill="#8B2500" />;
    })}
    {[0, 60, 120, 180, 240, 300].map(a => {
      const rad = (a * Math.PI) / 180;
      return <circle key={a} cx={60 + 30 * Math.cos(rad)} cy={60 + 30 * Math.sin(rad)} r="1.8" fill="none" stroke="#8B2500" strokeWidth="0.7" />;
    })}
  </svg>
);

const CornerOrnament = ({ flip }) => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ transform: flip ? 'scaleX(-1)' : 'none', opacity: 0.22 }}>
    <path d="M2 2 Q30 2 58 30 Q30 58 2 58 Q2 30 2 2Z" stroke="#8B2500" strokeWidth="0.8" fill="none" />
    <path d="M8 8 Q30 8 52 30 Q30 52 8 52" stroke="#C4881A" strokeWidth="0.5" fill="none" />
    <circle cx="2" cy="2" r="2.5" fill="#8B2500" />
    <circle cx="30" cy="4" r="1.5" fill="#C4881A" />
    <circle cx="4" cy="30" r="1.5" fill="#C4881A" />
  </svg>
);

const GoldDivider = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '20px 0' }}>
    <div style={{ flex: 1, maxWidth: 100, height: 1, background: `linear-gradient(to right, transparent, #C4881A88)` }} />
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4881A', boxShadow: '0 0 8px #C4881A88' }} />
    <div style={{ flex: 1, maxWidth: 100, height: 1, background: `linear-gradient(to left, transparent, #C4881A88)` }} />
  </div>
);


// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function MudraDetect() {
  const { user } = useAuth();
  const [mode, setMode] = useState('single');
  const [cameraOn, setCameraOn] = useState(false);
  const [handPresent, setHandPresent] = useState(false);
  const [detectedKey, setDetectedKey] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [streak, setStreak] = useState(0);
  const [celebration, setCelebration] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMudra, setModalMudra] = useState(null);
  const [doubleMsg, setDoubleMsg] = useState('Show both hands');
  const [particles, setParticles] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [uniqueMudras, setUniqueMudras] = useState(new Set());
  const [poseDetails, setPoseDetails] = useState(null);
  const [holisticResult, setHolisticResult] = useState(null);
  const [selectedDance, setSelectedDance] = useState('Alarippu');
  const [sequenceResult, setSequenceResult] = useState(null);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const activeImgRef = useRef(null);
  const fileInputRef = useRef(null);
  const holisticRef = useRef(null);
  const voiceGuide = useVoiceGuide({ language: 'en' });

  const isProcessingRef = useRef(false);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const poseRef = useRef(null);
  const intervalRef = useRef(null);
  const landmarksRef = useRef(null);
  const bufferRef = useRef([]);
  const prevKeyRef = useRef(null);
  const streakRef = useRef(0);
  const lastDetectRef = useRef(0);
  const celebTimerRef = useRef(null);
  const audioUnlocked = useRef(false);
  const detectionLockRef = useRef({ name: null, until: 0 });

  const modeRef = useRef(mode);
  const selectedDanceRef = useRef(selectedDance);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedDanceRef.current = selectedDance; }, [selectedDance]);

  const mudra = detectedKey
    ? (mode === 'pose' || mode === 'holistic' || mode === 'sequence'
        ? (STANCE_DATA[detectedKey] || {
            name: detectedKey,
            meaning: mode === 'sequence' ? 'Dance Sequence Match' : 'Classical Posture',
            description: mode === 'sequence' ? 'Reference dance choreography posture matched.' : 'Full body stance tracked in real-time.',
            usage: mode === 'sequence' ? 'Bharatanatyam sequence comparison.' : 'Bharatanatyam Adavu posture & body alignment.'
          })
        : (mode === 'single' ? MUDRA_DATA[detectedKey] : DOUBLE_MUDRA_DATA[detectedKey]))
    : null;
  const isDetected = !!(detectedKey && mudra);

  // Bharatanatyam color palette
  const C = {
    vermillion: '#C0392B',
    deepMaroon: '#7B1C1C',
    templeGold: '#C4881A',
    turmeric: '#D4A028',
    cream: '#FBF7EF',
    parchment: '#F3ECD8',
    linen: '#EDE3CC',
    sandal: '#D9C9A3',
    ink: '#2C1A0E',
    brownMid: '#6B3A2A',
    brownLight: '#A06040',
    teal: '#2A7F7F',
    deepTeal: '#1A5F5F',
  };

  const accent = mode === 'single' ? C.vermillion : (mode === 'holistic' ? C.templeGold : C.teal);
  const accentDeep = mode === 'single' ? C.deepMaroon : (mode === 'holistic' ? C.deepMaroon : C.deepTeal);
  const accentGold = C.templeGold;

  const unlockAudio = () => {
    if (audioUnlocked.current) return;
    audioUnlocked.current = true;
    try { new (window.AudioContext || window.webkitAudioContext)().resume(); } catch { }
    voiceGuide.unlock();
  };

  const spawnParticles = useCallback(() => {
    const items = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      dx: (Math.random() - 0.5) * 160,
      dy: -80 - Math.random() * 80,
    }));
    setParticles(items);
    setTimeout(() => setParticles([]), 1400);
  }, []);


  const handleDetection = useCallback((key, conf) => {
    const now = Date.now();
    if (key) {
      const activeDict = mode === 'single' ? MUDRA_DATA : DOUBLE_MUDRA_DATA;
      if (!activeDict[key]) {
        console.warn(`Detected key "${key}" is not registered in ${mode} mudra dictionary`);
        return;
      }
      setDetectedKey(key);
      setConfidence(conf);
      if (key !== prevKeyRef.current) {
        prevKeyRef.current = key;
        const newStreak = streakRef.current + 1;
        streakRef.current = newStreak;
        setStreak(newStreak);
        playSuccess();

        // Update History
        const mudraName = activeDict[key].name;
        setSessionHistory(prev => [{
          key, name: mudraName, confidence: conf, isDouble: mode === 'double'
        }, ...prev].slice(0, 12));

        // Update Unique
        setUniqueMudras(prev => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });

        const milestone = streakMessage(newStreak);
        if (milestone && [3, 5, 10, 20].includes(newStreak)) {
          clearTimeout(celebTimerRef.current);
          setCelebration(milestone);
          spawnParticles();
          celebTimerRef.current = setTimeout(() => setCelebration(null), 2500);
        }
      }
      lastDetectRef.current = now;
    } else {
      if (now - lastDetectRef.current > 1500) {
        setDetectedKey(null);
        setConfidence(0);
        prevKeyRef.current = null;
        streakRef.current = 0;
        setStreak(0);
      }
    }
  }, [spawnParticles, mode]);


  const runSingleDetection = useCallback(async () => {
    if (isProcessingRef.current) return;
    const currentData = landmarksRef.current;
    const lms = currentData?.landmarks || (Array.isArray(currentData) ? currentData : null);
    const handedness = currentData?.handedness || 'Right';

    if (!lms || lms.length !== 21) {
      setHandPresent(false);
      handleDetection(null, 0);
      bufferRef.current = [];
      detectionLockRef.current.until = 0;
      return;
    }
    setHandPresent(true);

    let finalName = null;
    let finalConf = 0;

    isProcessingRef.current = true;
    try {
      // 1. Hybrid Request: AI Model candidate
      const response = await axios.post(`${FLASK_URL}/api/predict`, {
        userId: user?.id || user?._id || 'anonymous',
        landmarks: lms,
        handedness
      });
      const modelRes = response.data;
      const accuracy = modelRes.accuracy ?? modelRes.confidence ?? 0;

      // 2. Structural Veto Gatekeeper
      const vetoRes = evaluateSingleMudra(lms, modelRes.name, handedness, 1.0);

      if (vetoRes.name && vetoRes.confidence >= 50) {
        finalName = vetoRes.name;
        finalConf = Math.max(vetoRes.confidence, accuracy);
      } else if (modelRes.name && (accuracy > 40 || modelRes.detected)) {
        finalName = modelRes.name;
        finalConf = accuracy || 85;
      } else {
        const local = evaluateSingleMudra(lms, null, handedness, 1.0);
        finalName = local.name;
        finalConf = local.confidence;
      }
    } catch (e) {
      // Fallback to local geometry if server is offline
      const local = evaluateSingleMudra(lms, null, handedness, 1.0);
      finalName = local.name;
      finalConf = local.confidence;
    } finally {
      isProcessingRef.current = false;
    }

    let name = finalName;
    let conf = finalConf;

    const nowTime = Date.now();
    if (nowTime < detectionLockRef.current.until) {
      name = detectionLockRef.current.name;
      conf = Math.max(conf, 85);
    } else if (name && conf >= 85) {
      detectionLockRef.current = { name, until: nowTime + 1500 };
    }

    // ── TEMPORAL STABILITY (Sliding Window Majority Vote) ──
    bufferRef.current.push(name);
    if (bufferRef.current.length > 6) {
      bufferRef.current.shift();
    }

    const counts = {};
    let maxCount = 0;
    let winner = null;

    bufferRef.current.forEach(val => {
      if (val !== null) {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) {
          maxCount = counts[val];
          winner = val;
        }
      }
    });

    if (winner && maxCount >= 2) {
      handleDetection(winner, conf);
    } else if (name) {
      handleDetection(name, conf);
    } else {
      handleDetection(null, 0);
    }
  }, [handleDetection, user]);
  
  const runDoubleDetection = useCallback(async () => {
    if (isProcessingRef.current) return;
    const results = landmarksRef.current;
    
    // Support 1-hand merged set (Svastika / Anjali crossed hands) AND 2 distinct hand sets
    const leftLms = results?.left_landmarks;
    const rightLms = results?.right_landmarks;
    const rawHands = results?.raw_hands || (leftLms && rightLms ? [leftLms, rightLms] : (leftLms ? [leftLms] : (rightLms ? [rightLms] : [])));

    if (!rawHands || rawHands.length === 0) {
      setHandPresent(false);
      setDoubleMsg('Show both hands to the camera');
      handleDetection(null, 0);
      bufferRef.current = [];
      detectionLockRef.current.until = 0;
      return;
    }
    setHandPresent(true);

    let finalName = null;
    let finalConf = 0;
    let corrections = [];

    const l_hand = leftLms || rawHands[0];
    const r_hand = rightLms || (rawHands.length > 1 ? rawHands[1] : rawHands[0]);

    isProcessingRef.current = true;
    try {
      // 1. Hybrid Request: Double Hand AI Model candidate
      const response = await axios.post(`${FLASK_URL}/api/predict_double`, {
        userId: user?.id || user?._id || 'anonymous',
        left_landmarks: l_hand,
        right_landmarks: r_hand,
        landmarks: [l_hand, r_hand]
      });
      const modelRes = response.data;
      const accuracy = modelRes.accuracy ?? modelRes.confidence ?? 0;

      // 2. Structural Veto Gatekeeper for Double Hands
      const vetoRes = evaluateDoubleMudra([l_hand, r_hand]);

      if (vetoRes.name && vetoRes.confidence >= 50) {
        finalName = vetoRes.name;
        finalConf = Math.max(vetoRes.confidence, accuracy);
        corrections = vetoRes.corrections || [];
      } else if (modelRes.name && (accuracy > 40 || modelRes.detected)) {
        finalName = modelRes.name;
        finalConf = accuracy || 85;
        corrections = modelRes.corrections || [];
      } else {
        const local = evaluateDoubleMudra(rawHands);
        finalName = local.name;
        finalConf = local.confidence;
        corrections = local.corrections || [];
      }
    } catch (e) {
      const local = evaluateDoubleMudra(rawHands);
      finalName = local.name;
      finalConf = local.confidence;
      corrections = local.corrections || [];
    } finally {
      isProcessingRef.current = false;
    }

    let name = finalName;
    let conf = finalConf;

    const nowTime = Date.now();
    if (nowTime < detectionLockRef.current.until) {
      name = detectionLockRef.current.name;
      conf = Math.max(conf, 85);
    } else if (name && conf >= 85) {
      detectionLockRef.current = { name, until: nowTime + 1500 };
    }
    // ── TEMPORAL STABILITY (Sliding Window Majority Vote) ──
    bufferRef.current.push(name);
    if (bufferRef.current.length > 6) {
      bufferRef.current.shift();
    }

    const counts = {};
    let maxCount = 0;
    let winner = null;

    bufferRef.current.forEach(val => {
      if (val !== null) {
        counts[val] = (counts[val] || 0) + 1;
        if (counts[val] > maxCount) {
          maxCount = counts[val];
          winner = val;
        }
      }
    });

    if (winner && maxCount >= 2) {
      handleDetection(winner, conf);
      setDoubleMsg('Mudra identified');
    } else if (name) {
      handleDetection(name, conf);
      setDoubleMsg('Mudra identified');
    } else {
      handleDetection(null, 0);
      setDoubleMsg(corrections[0] || 'Analyzing both hands...');
    }
  }, [handleDetection, user]);

  const initHands = useCallback(async (numHands) => {
    if (handsRef.current) {
      try {
        handsRef.current.close();
      } catch (e) {
        // Suppress non-fatal WASM teardown notice
      }
      handsRef.current = null;
    }

    const mp = await loadMediaPipeScripts();
    Hands = mp.Hands;
    HAND_CONNECTIONS = mp.HAND_CONNECTIONS;
    drawConnectors = mp.drawConnectors;
    drawLandmarks = mp.drawLandmarks;

    if (!Hands) return false;

    const h = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    h.setOptions({
      maxNumHands: numHands,
      modelComplexity: numHands === 2 ? 1 : 0,
      minDetectionConfidence: numHands === 2 ? 0.25 : 0.5,
      minTrackingConfidence: numHands === 2 ? 0.25 : 0.5
    });
    h._maxNumHands = numHands;
    h.onResults((results) => {
      if (results.multiHandLandmarks?.length > 0) {
        console.log(`Hand Detected (${results.multiHandLandmarks.length} hands) - Engine Running`);
      }
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      if (video && video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      const width = canvas.width || 1280;
      const height = canvas.height || 720;
      const ctx = canvas.getContext('2d');
      ctx.save(); ctx.clearRect(0, 0, width, height);

      if (activeImgRef.current) {
        ctx.drawImage(activeImgRef.current, 0, 0, width, height);
      } else {
        ctx.scale(-1, 1); ctx.translate(-width, 0);
      }

      const activeMaxHands = handsRef.current?._maxNumHands || 1;
      if (activeMaxHands === 1) {
        const lms = results.multiHandLandmarks?.[0] || null;
        const handedness = results.multiHandedness?.[0]?.label || 'Right';
        if (lms) {
          const drawColor = '#C0392B'; // Vermillion
          drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: drawColor + '60', lineWidth: 2 });
          drawLandmarks(ctx, lms, { color: drawColor, lineWidth: 1, radius: 3 });
        }
        landmarksRef.current = lms ? { landmarks: lms, handedness } : null;
      } else {
        const handLandmarks = results.multiHandLandmarks || [];
        const handednessList = results.multiHandedness || [];
        let leftLms = null;
        let rightLms = null;

        handLandmarks.forEach((lms, idx) => {
          const label = handednessList[idx]?.label || (idx === 0 ? 'Right' : 'Left');
          const drawColor = label === 'Left' ? '#2A7F7F' : '#C0392B';
          drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: drawColor + '60', lineWidth: 2 });
          drawLandmarks(ctx, lms, { color: drawColor, lineWidth: 1, radius: 3 });
        });

        if (handLandmarks.length >= 2) {
          const label0 = handednessList[0]?.label || 'Left';
          if (label0 === 'Left') {
            leftLms = handLandmarks[0];
            rightLms = handLandmarks[1];
          } else {
            rightLms = handLandmarks[0];
            leftLms = handLandmarks[1];
          }
        } else if (handLandmarks.length === 1) {
          const label0 = handednessList[0]?.label || 'Right';
          if (label0 === 'Left') {
            leftLms = handLandmarks[0];
            rightLms = handLandmarks[0];
          } else {
            rightLms = handLandmarks[0];
            leftLms = handLandmarks[0];
          }
        }

        // Store them as left_landmarks and right_landmarks
        landmarksRef.current = {
          left_landmarks: leftLms,
          right_landmarks: rightLms,
          raw_hands: handLandmarks
        };
      }
      ctx.restore();
    });
    handsRef.current = h;
    return true;
  }, []);

  const initPoseEngine = useCallback(async () => {
    if (poseRef.current) {
      return true;
    }

    const mp = await loadMediaPipePoseScripts();
    const Pose = mp.Pose;
    const POSE_CONNECTIONS = mp.POSE_CONNECTIONS;

    if (!Pose) return false;

    const p = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    p.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    p.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width || 640;
      const height = canvas.height || 480;
      ctx.save(); ctx.clearRect(0, 0, width, height);

      if (activeImgRef.current) {
        ctx.drawImage(activeImgRef.current, 0, 0, width, height);
      } else {
        ctx.scale(-1, 1); ctx.translate(-width, 0);
      }

      const lms = results.poseLandmarks;
      const worldLms = results.poseWorldLandmarks || lms;

      if (lms && lms.length >= 33) {
        // Full Body & Anatomical Sanity Guard
        const nose = lms[0];
        const leftHip = lms[23];
        const rightHip = lms[24];
        const leftKnee = lms[25];
        const rightKnee = lms[26];
        const minConf = 0.45;

        const isVisible =
          (lms[11]?.visibility ?? 1) >= minConf &&
          (lms[12]?.visibility ?? 1) >= minConf &&
          (leftHip?.visibility ?? 1) >= minConf &&
          (rightHip?.visibility ?? 1) >= minConf &&
          (leftKnee?.visibility ?? 1) >= minConf &&
          (rightKnee?.visibility ?? 1) >= minConf;

        const isHallucinated = nose && leftHip && rightHip && (leftHip.y <= nose.y + 0.10);

        if (!isVisible || isHallucinated) {
          setHandPresent(false);
          setPoseDetails(null);
          landmarksRef.current = null;
          setDetectedKey("⚠️ STEP BACK: Hips/Knees Out of Frame");
          setConfidence(0);
          if (modeRef.current === 'sequence') {
            setSequenceResult({
              matched_frame: "Step Back Required",
              grade: "N/A",
              feedback: ["⚠️ STEP BACK: Step 2 meters away so hips and knees are visible."]
            });
          }
          ctx.restore();
          return;
        }

        setHandPresent(true);
        const normalized = normalizePoseLandmarks(worldLms || lms);
        const evalResult = evaluateFullBodyPose(normalized);
        setPoseDetails(evalResult);
        landmarksRef.current = lms;

        if (modeRef.current === 'sequence') {
          const defaultKey = `${selectedDanceRef.current || 'Alarippu'} Sequence Match`;
          if (!detectedKey) {
            setDetectedKey(defaultKey);
            setConfidence(85);
          }
          axios.post(`${FLASK_URL}/api/sequence/evaluate_image`, {
            dance_name: selectedDanceRef.current || 'Alarippu',
            landmarks: lms.map(lm => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility || 1.0 }))
          }).then(res => {
            if (res.data && res.data.detected) {
              setSequenceResult(res.data);
              setDetectedKey(`${res.data.dance_name} - ${res.data.matched_frame}`);
              setConfidence(res.data.match_score);
            } else if (res.data && res.data.error) {
              setSequenceResult({
                matched_frame: "Step Back Required",
                grade: "N/A",
                feedback: [res.data.error]
              });
            }
          }).catch(err => {
            console.warn("[Sequence Eval API Offline - Client Fallback Active]", err);
            const leftKnee = (lms[23] && lms[25] && lms[27]) ? Math.abs((Math.atan2(lms[27].y - lms[25].y, lms[27].x - lms[25].x) - Math.atan2(lms[23].y - lms[25].y, lms[23].x - lms[25].x)) * 180 / Math.PI) : 180;
            const rightKnee = (lms[24] && lms[26] && lms[28]) ? Math.abs((Math.atan2(lms[28].y - lms[26].y, lms[28].x - lms[26].x) - Math.atan2(lms[24].y - lms[26].y, lms[24].x - lms[26].x)) * 180 / Math.PI) : 180;
            const avgKnee = (leftKnee + rightKnee) / 2.0;
            let fbStance = "Araimandi Stance";
            if (avgKnee < 100) fbStance = "Muzhumandi Stance";
            else if (avgKnee > 155) fbStance = "Samapada Stance";

            setSequenceResult({
              current_stance: fbStance,
              matched_frame: "Offline Instant Mode",
              grade: "Live (Client Mode)",
              match_score: Math.max(50, Math.round(100 - Math.abs(avgKnee - 120) * 0.8)),
              feedback: ["Network packet dropped — running instant client-side posture tracking"]
            });
            setConfidence(Math.max(50, Math.round(100 - Math.abs(avgKnee - 120) * 0.8)));
          });
        } else {
          const stanceToSet = (evalResult && evalResult.stanceName && !evalResult.stanceName.includes('Step Back'))
            ? evalResult.stanceName
            : 'Araimandi Stance';

          setDetectedKey(stanceToSet);
          setConfidence(evalResult.totalScore > 0 ? evalResult.totalScore : 85);
        }

        if (mp.drawConnectors && mp.drawLandmarks) {
          const spineColor = evalResult?.spineStatus || '#10b981';
          const elbowColor = evalResult?.elbowStatus || '#10b981';
          const kneeColor  = evalResult?.kneeStatus  || '#10b981';

          // Custom Limb Connectors
          const torsoConn = [[11,12], [11,23], [12,24], [23,24]];
          const armConn   = [[11,13], [13,15], [12,14], [14,16]];
          const legConn   = [[23,25], [25,27], [24,26], [26,28]];

          mp.drawConnectors(ctx, lms, torsoConn, { color: spineColor, lineWidth: 4 });
          mp.drawConnectors(ctx, lms, armConn,   { color: elbowColor, lineWidth: 4 });
          mp.drawConnectors(ctx, lms, legConn,   { color: kneeColor,  lineWidth: 4 });
          mp.drawLandmarks(ctx, lms, { color: '#ffffff', lineWidth: 1, radius: 4 });

          // Render Stance Depth Gauge HUD Bar
          if (evalResult?.araimandiDepthPct !== undefined) {
            const barW = 140, barH = 14, barX = width - barW - 20, barY = 20;
            const fillW = Math.round((evalResult.araimandiDepthPct / 100) * barW);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.roundRect ? ctx.roundRect(barX - 10, barY - 14, barW + 20, barH + 24, 6) : ctx.fillRect(barX - 10, barY - 14, barW + 20, barH + 24);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.fillText(`Araimandi Depth: ${evalResult.araimandiDepthPct}%`, barX, barY - 2);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(barX, barY + 2, barW, barH);

            ctx.fillStyle = kneeColor;
            ctx.fillRect(barX, barY + 2, fillW, barH);
          }
        }

        if (evalResult.isFullyVisible && evalResult?.feedbacks?.length && modeRef.current !== 'sequence') {
          voiceGuide.announce.poseFeedback(evalResult.feedbacks);
        }
      } else {
        setHandPresent(false);
        setPoseDetails(null);
        landmarksRef.current = null;
      }
      ctx.restore();
    });
    poseRef.current = p;
    return true;
  }, [voiceGuide]);

  // ── Holistic Engine (Face + Pose + Hands combined) ────────────────────────
  const initHolisticEngine = useCallback(async () => {
    if (holisticRef.current) return true;
    try {
      const mp = await loadMediaPipeHolisticScripts();
      const h = new mp.Holistic({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${f}`,
      });
      h.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      h.onResults((results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width || 640;
        const H = canvas.height || 480;
        ctx.save();
        ctx.clearRect(0, 0, W, H);

        // Draw source image/video frame
        const src = activeImgRef.current || videoRef.current;
        if (src) ctx.drawImage(src, 0, 0, W, H);

        // Evaluate all streams
        const evalResult = evaluateHolisticPose({
          poseLandmarks: results.poseLandmarks,
          poseWorldLandmarks: results.poseWorldLandmarks,
          faceLandmarks: results.faceLandmarks,
          leftHandLandmarks: results.leftHandLandmarks,
          rightHandLandmarks: results.rightHandLandmarks,
        });

        setHolisticResult({
          ...evalResult,
          // Pass raw landmarks for canvas drawing
          _poseLandmarks: results.poseLandmarks,
          _faceLandmarks: results.faceLandmarks,
          _leftHandLandmarks: results.leftHandLandmarks,
          _rightHandLandmarks: results.rightHandLandmarks,
        });

        const stanceToSet = (evalResult && evalResult.natyamPoseName)
          ? evalResult.natyamPoseName
          : (evalResult && evalResult.stanceName && !evalResult.stanceName.includes('Step Back'))
            ? evalResult.stanceName
            : 'Araimandi Stance';
        setDetectedKey(stanceToSet);
        setConfidence(evalResult.combinedScore > 0 ? evalResult.combinedScore : 85);

        // Dispatch lightweight JSON landmark arrays to Flask /api/detect_holistic (No Base64 decoding overhead)
        axios.post(`${FLASK_URL}/api/detect_holistic`, {
          targetMudra: '',
          handedness: 'Right',
          pose_landmarks: results.poseLandmarks ? results.poseLandmarks.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility || 1.0 })) : null,
          face_landmarks: results.faceLandmarks ? results.faceLandmarks.map(l => ({ x: l.x, y: l.y, z: l.z })) : null,
          hand_landmarks: (results.rightHandLandmarks || results.leftHandLandmarks) ? (results.rightHandLandmarks || results.leftHandLandmarks).map(l => ({ x: l.x, y: l.y, z: l.z })) : null,
        }).then(res => {
          if (res.data) {
            if (res.data.current_stance && res.data.current_stance !== 'Unknown') {
              setDetectedKey(res.data.current_stance);
            }
            if (res.data.accuracy) setConfidence(res.data.accuracy);
          }
        }).catch(err => console.error("Holistic API dispatch error:", err));

        // Voice coaching
        if (evalResult.feedbacks?.length) {
          voiceGuide.announce.poseFeedback(evalResult.feedbacks);
        }

        ctx.restore();
      });
      holisticRef.current = h;
      return true;
    } catch (err) {
      console.error('Holistic init error:', err);
      return false;
    }
  }, [voiceGuide]);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    unlockAudio();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const src = evt.target.result;
      setImagePreview(src);
      setCameraOn(true);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = async () => {
        activeImgRef.current = img;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width || 640;
          canvas.height = img.height || 480;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        if (mode === 'holistic') {
          let ok = await initHolisticEngine();
          if (ok && holisticRef.current) {
            await holisticRef.current.send({ image: img });
          }
        } else if (mode === 'pose' || mode === 'sequence') {
          let ok = await initPoseEngine();
          if (ok && poseRef.current) {
            await poseRef.current.send({ image: img });
          }
        } else {
          const numHands = mode === 'double' ? 2 : 1;
          let ok = await initHands(numHands);
          if (ok && handsRef.current) {
            await handsRef.current.send({ image: img });
          }
        }
      };
    };
    reader.readAsDataURL(file);
  }, [mode, unlockAudio, initPoseEngine, initHands, initHolisticEngine]);

  const runPoseDetection = useCallback(async () => {
    if (isProcessingRef.current) return;
    const lms = landmarksRef.current;
    if (!lms || lms.length < 33) return;

    isProcessingRef.current = true;
    try {
      const response = await axios.post(`${FLASK_URL}/api/predict_pose`, { landmarks: lms });
      const data = response.data;
      if (data.detected && data.name) {
        setDetectedKey(data.name);
        setConfidence(data.confidence || 85);
      }
    } catch (e) {
      setConfidence(80);
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!cameraOn || !videoRef.current) return;
    const startStream = async () => {
      try {
        let success = false;
        if (mode === 'holistic') {
          success = await initHolisticEngine();
        } else if (mode === 'pose' || mode === 'sequence') {
          success = await initPoseEngine();
        } else {
          const numHands = mode === 'double' ? 2 : 1;
          success = await initHands(numHands);
        }
        if (!success) throw new Error('Engine initialization failed');

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
        window.localStream = stream;
        setWebcamError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          try {
            await videoRef.current.play();
            console.log("Video started playing.");
          } catch (e) {
            console.warn("Video play error:", e);
          }

          const processFrame = async () => {
            if (videoRef.current && cameraOn && !activeImgRef.current && streamRef.current) {
              try {
                if (mode === 'holistic' && holisticRef.current) {
                  await holisticRef.current.send({ image: videoRef.current });
                } else if ((mode === 'pose' || mode === 'sequence') && poseRef.current) {
                  await poseRef.current.send({ image: videoRef.current });
                } else if (handsRef.current) {
                  await handsRef.current.send({ image: videoRef.current });
                }
              } catch (e) {
                console.warn("MediaPipe send error:", e);
              }
            }
            if (cameraOn && !activeImgRef.current && streamRef.current) {
              rafRef.current = requestAnimationFrame(processFrame);
            }
          };
          rafRef.current = requestAnimationFrame(processFrame);
          console.log("Frame processing loop started.");
        }

        if (mode === 'single' || mode === 'double') {
          const detect = mode === 'single' ? runSingleDetection : runDoubleDetection;
          intervalRef.current = setInterval(detect, 120);
        }
      } catch (error) {
        console.error('Camera error:', error);
        setCameraOn(false);
        const errMsg = 'Camera access denied. Please allow camera permission and ensure you are using HTTPS.';
        setWebcamError(errMsg);
        alert(errMsg);
      }
    };
    startStream();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); clearInterval(intervalRef.current); };
  }, [cameraOn, mode, initHands, initPoseEngine, runSingleDetection, runDoubleDetection, runPoseDetection]);


  // Page-exit cleanup: close the Hands instance and stop the media stream when component unmounts
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch (e) {
          // Suppress non-fatal WASM teardown notice
        }
        handsRef.current = null;
      }
      isProcessingRef.current = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearInterval(intervalRef.current);
    if (window.localStream) { window.localStream.getTracks().forEach(track => track.stop()); }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    landmarksRef.current = null;
    bufferRef.current = [];
    setCameraOn(false); setHandPresent(false); setDetectedKey(null);
    setConfidence(0); setStreak(0); streakRef.current = 0; prevKeyRef.current = null;
    setSessionHistory([]); setUniqueMudras(new Set());
    setWebcamError(null);
    isProcessingRef.current = false;
  }, []);


  const switchMode = (m) => { if (m === mode) return; stopCamera(); setMode(m); };

  const status = !cameraOn ? 'idle' : !handPresent ? 'waiting' : isDetected ? 'detected' : 'analyzing';

  return (
    <div onClick={unlockAudio} style={{
      minHeight: '100vh',
      background: C.cream,
      fontFamily: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Yatra+One&family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,600&family=IM+Fell+English:ital@0;1&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-weight: 500; }
        .lora-text { font-family: 'Lora', serif; font-weight: 500; }
        
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #EDE3CC; }
        ::-webkit-scrollbar-thumb { background: #C4881A55; border-radius: 3px; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes scanLine { 0%{transform:translateY(-100%);opacity:0;} 10%{opacity:1;} 90%{opacity:1;} 100%{transform:translateY(100%);opacity:0;} }
        @keyframes breathe { 0%,100%{opacity:0.4;} 50%{opacity:1;} }
        @keyframes pulse-vermillion { 0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,0);} 50%{box-shadow:0 0 0 10px rgba(192,57,43,0.08);} }
        @keyframes pulse-teal { 0%,100%{box-shadow:0 0 0 0 rgba(42,127,127,0);} 50%{box-shadow:0 0 0 10px rgba(42,127,127,0.08);} }
        @keyframes particleFly { 0%{opacity:1;transform:translate(0,0) scale(1);} 100%{opacity:0;transform:translate(var(--pdx),var(--pdy)) scale(0.2);} }
        @keyframes celebIn { from{opacity:0;transform:translateY(-16px) scale(0.92);} to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes confBar { from { width:0%; } }
        @keyframes flickerFlash { 0%,100%{opacity:0;} 50%{opacity:0.15;} }
        @keyframes kolamSpin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        @keyframes borderGlow { 0%,100%{opacity:0.4;} 50%{opacity:1;} }


        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .slide-in { animation: slideIn 0.4s ease forwards; }
        .pulse-v { animation: pulse-vermillion 2.4s ease-in-out infinite; }
        .pulse-t { animation: pulse-teal 2.4s ease-in-out infinite; }
        .breathe { animation: breathe 2s ease-in-out infinite; }
        .conf-bar { animation: confBar 0.6s ease forwards; }
        .scan-line {
          position:absolute; left:0; right:0; height:2px;
          background: linear-gradient(90deg, transparent, rgba(192,57,43,0.5), transparent);
          animation: scanLine 2.2s ease-in-out infinite;
          pointer-events:none;
        }
        .scan-line-teal {
          background: linear-gradient(90deg, transparent, rgba(42,127,127,0.5), transparent);
        }

        .btn-primary {
          transition: all 0.22s ease;
          cursor: pointer;
        }
        .btn-primary:hover { transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0); }

        .gallery-item { transition: transform 0.2s, box-shadow 0.2s; }
        .gallery-item:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(44,26,14,0.15); }

        /* Texture overlay */
        .paper-texture {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
        }

        .temple-border {
          position: relative;
        }
        .temple-border::before, .temple-border::after {
          content: '';
          position: absolute;
          left: 16px; right: 16px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #C4881A55, #C0392B44, #C4881A55, transparent);
        }
        .temple-border::before { top: 0; }
        .temple-border::after  { bottom: 0; }

        .mode-tab {
          font-family: 'Lora', serif;
          font-size: 13px;
          letter-spacing: 0.5px;
          transition: all 0.25s;
          cursor: pointer;
          border: none;
          outline: none;
        }
      `}</style>

      {/* ── Subtle paper texture ───────────────────────────────────── */}
      <div className="paper-texture" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Decorative border lines ────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${C.deepMaroon}, ${C.templeGold}, ${C.vermillion}, ${C.templeGold}, ${C.deepMaroon})`, zIndex: 100 }} />
      <div style={{ position: 'fixed', top: 4, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.templeGold}44, transparent)`, zIndex: 100 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.deepMaroon}, ${C.templeGold}, ${C.vermillion}, ${C.templeGold}, ${C.deepMaroon})`, zIndex: 100 }} />

      {/* ── Particles ──────────────────────────────────────────────── */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'fixed', left: `${p.x}%`, top: `${p.y}%`,
          width: 7, height: 7, borderRadius: '50%',
          background: mode === 'single' ? C.vermillion : C.teal,
          '--pdx': `${p.dx}px`, '--pdy': `${p.dy}px`,
          animation: 'particleFly 1.2s ease-out forwards',
          pointerEvents: 'none', zIndex: 200,
          boxShadow: `0 0 6px ${mode === 'single' ? C.vermillion : C.teal}`,
        }} />
      ))}

      {/* ── Celebration toast ──────────────────────────────────────── */}
      {celebration && (
        <div style={{
          position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, animation: 'celebIn 0.4s ease forwards',
          background: C.parchment,
          border: `2px solid ${accentGold}`,
          borderRadius: 12, padding: '12px 32px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: `0 8px 32px rgba(44,26,14,0.2)`,
        }}>
          <celebration.icon size={16} color={C.vermillion} />
          <span style={{ fontFamily: "'Lora', serif", fontSize: 14, color: C.deepMaroon, fontWeight: 600, letterSpacing: 0.5 }}>
            {celebration.label}
          </span>
          <span style={{ fontFamily: "'Lora', serif", fontSize: 12, color: C.sandal }}>× {streak}</span>
        </div>
      )}


      {/* ── Main layout ────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '20px 28px 40px' }}>

        {/* ══ HEADER ══════════════════════════════════════════════════ */}
        <header style={{ marginBottom: 28 }}>
          {/* Top strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: 16,
            borderBottom: `1px solid ${C.sandal}60`,
          }}>
            {/* Logo area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ position: 'relative', width: 52, height: 52 }}>
                <KolamPattern />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Hand size={18} color={C.vermillion} />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Yatra One', serif", fontSize: 26, color: C.deepMaroon, lineHeight: 1, letterSpacing: 0.5 }}>
                  GestureIQ
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, color: C.brownLight, letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 1 }}>
                  Natya Sutram · Mudra Detection
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {cameraOn && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: "'Lora', serif", fontSize: 9, color: C.sandal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: -2 }}>Mastery Progress</p>
                  <span style={{ fontFamily: "'IM Fell English', serif", fontSize: 20, color: C.templeGold, fontWeight: 700 }}>
                    {uniqueMudras.size} / {mode === 'single' ? 28 : (mode === 'double' ? 23 : Object.keys(STANCE_DATA).length)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cameraOn ? C.vermillion : C.sandal,
                  boxShadow: cameraOn ? `0 0 8px ${C.vermillion}` : 'none',
                  transition: 'all 0.4s',
                }} />
                <span style={{ fontFamily: "'Lora', serif", fontSize: 11, color: C.brownLight, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {cameraOn ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>

          </div>

          {/* Decorative divider with Om or lotus motif */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '10px 0 4px' }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.sandal}80)` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.templeGold }} />
              <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 13, color: C.brownLight, letterSpacing: 2.5 }}>
                ✦ Bharatanatyam Hasta Mudra ✦
              </span>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.templeGold }} />
            </div>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.sandal}80)` }} />
          </div>
        </header>

        {/* ══ MODE TABS ════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            border: `1.5px solid ${C.sandal}`,
            borderRadius: 10,
            overflow: 'hidden',
            background: C.parchment,
            boxShadow: `0 2px 12px rgba(44,26,14,0.08)`,
          }}>
            {[
              { key: 'single', label: 'Asamyuta Hasta', sub: '28 Single-hand Mudras', Icon: Hand },
              { key: 'double', label: 'Samyuta Hasta', sub: '23 Double-hand Mudras', Icon: Layers },
              { key: 'pose', label: 'Adavu Posture', sub: 'Full-Body Stance Analytics', Icon: Activity },
              { key: 'sequence', label: 'Reference Dance', sub: 'Alarippu & Pushpanjali', Icon: BookOpen },
              { key: 'holistic', label: 'Full Analysis', sub: 'Face + Pose + Hands', Icon: Sparkles },
            ].map(({ key, label, sub, Icon }, idx, arr) => (
              <button key={key} className="mode-tab" onClick={() => switchMode(key)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 18px',
                background: mode === key
                  ? (key === 'single' ? `${C.vermillion}12` : key === 'holistic' ? `${C.templeGold}12` : key === 'sequence' ? `${C.brownMid}15` : `${C.teal}12`)
                  : 'transparent',
                color: mode === key ? (key === 'single' ? C.deepMaroon : key === 'holistic' ? C.templeGold : key === 'sequence' ? C.brownMid : C.deepTeal) : C.brownLight,
                borderRight: idx < arr.length - 1 ? `1px solid ${C.sandal}` : 'none',
                position: 'relative',
              }}>
                <Icon size={15} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontFamily: "'Lora', serif", fontStyle: 'italic' }}>{sub}</div>
                </div>
                {mode === key && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2,
                    background: key === 'single' ? C.vermillion : key === 'holistic' ? C.templeGold : C.teal,
                    borderRadius: 2,
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ══ MAIN GRID ════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>

          {/* ── CAMERA PANEL ─────────────────────────────────────────── */}
          <div>
            <div
              className={isDetected ? (mode === 'single' ? 'pulse-v' : 'pulse-t') : ''}
              style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                background: C.ink,
                border: `2px solid ${isDetected ? accent : C.linen}`,
                aspectRatio: '4/3',
                transition: 'border-color 0.5s',
                boxShadow: isDetected
                  ? `0 0 0 4px ${accent}18, 0 12px 48px rgba(44,26,14,0.2)`
                  : `0 4px 24px rgba(44,26,14,0.12)`,
              }}
            >
              {/* Corner ornaments */}
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none' }}>
                <CornerOrnament />
              </div>
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, pointerEvents: 'none' }}>
                <CornerOrnament flip />
              </div>

              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }}
              />
              <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

              {status === 'analyzing' && (
                <div className={`scan-line ${mode === 'double' ? 'scan-line-teal' : ''}`} />
              )}

              {/* Idle screen */}
              {!cameraOn && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(160deg, ${C.parchment} 0%, ${C.linen} 100%)`,
                  zIndex: 20,
                }}>
                  {/* Rangoli background pattern */}
                  <div style={{
                    position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none',
                    backgroundImage: `radial-gradient(${C.deepMaroon} 1.2px, transparent 0)`,
                    backgroundSize: '24px 24px',
                  }} />


                  <div style={{ position: 'relative', marginBottom: 28, textAlign: 'center' }}>
                    <div style={{ width: 110, height: 110, position: 'relative', margin: '0 auto 0' }}>
                      <KolamPattern />
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Hand size={36} color={C.vermillion} strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>

                  <h2 style={{
                    fontFamily: "'Yatra One', serif",
                    fontSize: 30, color: C.deepMaroon,
                    letterSpacing: 0.5, marginBottom: 6,
                  }}>
                    {mode === 'holistic'
                      ? 'Full Body Analysis'
                      : mode === 'pose'
                      ? 'Adavu Posture Analytics'
                      : mode === 'double'
                      ? 'Samyuta Detection'
                      : 'Asamyuta Detection'}
                  </h2>
                  <p style={{
                    fontFamily: "'Lora', serif", fontStyle: 'italic',
                    fontSize: 13, color: C.brownLight, marginBottom: 36, letterSpacing: 0.3,
                  }}>
                    {mode === 'holistic'
                      ? 'Face + Pose + Hands combined AI posture analytics'
                      : mode === 'pose'
                      ? 'Classical stance analytics · Full body posture'
                      : mode === 'double'
                      ? '23 classical double-hand mudras · Show both hands'
                      : '28 classical asamyuta mudras · Single hand recognition'}
                  </p>

                  {webcamError && (
                    <div style={{
                      margin: '0 24px 20px',
                      padding: '12px 18px',
                      borderRadius: 10,
                      background: '#FDE8E8',
                      border: '1.5px solid #F8B4B4',
                      color: '#9B1C1C',
                      fontSize: 12.5,
                      fontFamily: "'Lora', serif",
                      textAlign: 'center',
                      maxWidth: '85%',
                      lineHeight: '1.4',
                      boxShadow: '0 2px 8px rgba(155, 28, 28, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <strong style={{ fontWeight: 600 }}>Webcam Connection Failed</strong>
                      <span>{webcamError}</span>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />

                  {mode === 'sequence' && (
                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, zIndex: 999, pointerEvents: 'auto' }}>
                      <label style={{ fontFamily: "'Lora', serif", fontSize: 13, color: C.deepMaroon, fontWeight: 600 }}>
                        Reference Dance Item:
                      </label>
                      <select
                        value={selectedDance}
                        onChange={(e) => {
                          setSelectedDance(e.target.value);
                          selectedDanceRef.current = e.target.value;
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: `1.5px solid ${C.templeGold}`,
                          background: C.parchment,
                          color: C.deepMaroon,
                          fontFamily: "'Lora', serif",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Alarippu">Alarippu Benchmark (1,191 Frames)</option>
                        <option value="Sthanaka_Bheda">Sthanaka Bheda Postures (Akshita Ms Gupta)</option>
                        <option value="Sthanaka_Bheda_Lesson">Sthanaka Bheda Standing Lesson (22/365)</option>
                        <option value="Alarippu_Tutorial">Alarippu Step-by-Step Tutorial (Anu Lanish)</option>
                        <option value="Alarippu_Performance">Alarippu Full Performance (Tanvi Hari)</option>
                        <option value="Thattadavu_Suite">Thattadavu Basic Adavu Lessons (1 to 8)</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', zIndex: 999, pointerEvents: 'auto' }}>
                    <button
                      className="btn-primary"
                      onClick={() => { unlockAudio(); setWebcamError(null); setImagePreview(null); activeImgRef.current = null; setCameraOn(true); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '14px 28px', borderRadius: 12,
                        border: `1.5px solid ${accent}`,
                        background: `${accent}0F`,
                        color: accent,
                        fontFamily: "'Lora', serif",
                        fontSize: 14, fontWeight: 600, letterSpacing: 0.5,
                        boxShadow: `0 4px 16px ${accent}20`,
                        cursor: 'pointer'
                      }}
                    >
                      <CameraIcon size={16} />
                      Begin Live Camera
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '14px 28px', borderRadius: 12,
                        border: `1.5px solid ${C.templeGold}`,
                        background: `${C.templeGold}15`,
                        color: C.deepMaroon,
                        fontFamily: "'Lora', serif",
                        fontSize: 14, fontWeight: 600, letterSpacing: 0.5,
                        boxShadow: `0 4px 16px rgba(196, 136, 26, 0.15)`,
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={16} color={C.templeGold} />
                      Upload Stance Image
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => {
                        unlockAudio();
                        if (intervalRef.current) {
                          clearInterval(intervalRef.current);
                          intervalRef.current = null;
                        }
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.src = '/sample_araimandi_full.png';
                        setImagePreview('/sample_araimandi_full.png');
                        setCameraOn(true);
                        img.onload = async () => {
                          activeImgRef.current = img;
                          const canvas = canvasRef.current;
                          if (canvas) {
                            canvas.width = img.width || 640;
                            canvas.height = img.height || 480;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                          }
                          let ok = (mode === 'holistic') ? await initHolisticEngine() : await initPoseEngine();
                          if (mode === 'holistic' && ok && holisticRef.current) {
                            await holisticRef.current.send({ image: img });
                          } else if (ok && poseRef.current) {
                            await poseRef.current.send({ image: img });
                          }
                        };
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '14px 28px', borderRadius: 12,
                        border: `1.5px solid ${C.vermillion}`,
                        background: `${C.vermillion}15`,
                        color: C.vermillion,
                        fontFamily: "'Lora', serif",
                        fontSize: 14, fontWeight: 600, letterSpacing: 0.5,
                        boxShadow: `0 4px 16px rgba(184, 51, 42, 0.15)`,
                        cursor: 'pointer'
                      }}
                    >
                      <span>🎭 Try Araimandi Stance</span>
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => {
                        unlockAudio();
                        if (intervalRef.current) {
                          clearInterval(intervalRef.current);
                          intervalRef.current = null;
                        }
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.src = '/sample_anjali_pranam.png';
                        setImagePreview('/sample_anjali_pranam.png');
                        setCameraOn(true);
                        img.onload = async () => {
                          activeImgRef.current = img;
                          const canvas = canvasRef.current;
                          if (canvas) {
                            canvas.width = img.width || 640;
                            canvas.height = img.height || 480;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                          }
                          let ok = (mode === 'holistic') ? await initHolisticEngine() : await initPoseEngine();
                          if (mode === 'holistic' && ok && holisticRef.current) {
                            await holisticRef.current.send({ image: img });
                          } else if (ok && poseRef.current) {
                            await poseRef.current.send({ image: img });
                          }
                        };
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '14px 28px', borderRadius: 12,
                        border: `1.5px solid ${C.templeGold}`,
                        background: `${C.templeGold}15`,
                        color: C.templeGold,
                        fontFamily: "'Lora', serif",
                        fontSize: 14, fontWeight: 600, letterSpacing: 0.5,
                        boxShadow: `0 4px 16px rgba(212, 160, 23, 0.15)`,
                        cursor: 'pointer'
                      }}
                    >
                      <span>🪔 Try Anjali Pranam</span>
                    </button>
                  </div>

                  {/* Bottom text */}
                  <p style={{ position: 'absolute', bottom: 16, fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, color: C.sandal, letterSpacing: 1 }}>
                    ✦ Processed locally · No data transmitted ✦
                  </p>
                </div>
              )}

              {/* Waiting overlay */}
              {cameraOn && status === 'waiting' && (
                <div className="breathe" style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                }}>
                  <div style={{
                    padding: '10px 24px', borderRadius: 10,
                    background: `${C.parchment}E8`,
                    border: `1px solid ${C.linen}`,
                    boxShadow: '0 4px 16px rgba(44,26,14,0.1)',
                  }}>
                    <p style={{ fontFamily: "'Lora', serif", fontSize: 13, color: C.brownMid, letterSpacing: 1 }}>
                      {(mode === 'pose' || mode === 'holistic' || mode === 'sequence')
                        ? '✦ Step back to show full body ✦'
                        : (mode === 'double' ? '✦ Show both hands ✦' : '✦ Show your hand ✦')}
                    </p>
                  </div>
                </div>
              )}

              {/* Detected badge */}
              {isDetected && mudra && (
                <div style={{
                  position: 'absolute', top: 16, left: 16,
                  padding: '5px 14px', borderRadius: 8,
                  background: `${C.parchment}EE`,
                  border: `1.5px solid ${accent}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 12px rgba(44,26,14,0.15)',
                  zIndex: 5,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 11, color: accentDeep, fontWeight: 600, letterSpacing: 1 }}>
                    Identified
                  </span>
                </div>
              )}

              {/* Double mode hint */}
              {cameraOn && mode === 'double' && !isDetected && handPresent && (
                <div style={{
                  position: 'absolute', bottom: 64, left: '50%', transform: 'translateX(-50%)',
                  padding: '6px 20px', borderRadius: 8,
                  background: `${C.parchment}EE`, border: `1px solid ${C.teal}40`,
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 11, color: C.teal, fontStyle: 'italic' }}>
                    {doubleMsg}
                  </span>
                </div>
              )}

              {/* Bottom HUD */}
              {cameraOn && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px',
                  background: `${C.parchment}F0`,
                  backdropFilter: 'blur(12px)',
                  borderTop: `1px solid ${C.linen}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Status */}
                    <div>
                      <p style={{ fontFamily: "'Lora', serif", fontSize: 9, letterSpacing: 2.5, color: C.sandal, textTransform: 'uppercase', marginBottom: 2 }}>Status</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {status === 'analyzing' && <ScanLine size={11} color={C.templeGold} />}
                        {status === 'detected' && <Activity size={11} color={accent} />}
                        {status === 'waiting' && <Hand size={11} color={C.sandal} />}
                        <span style={{
                          fontFamily: "'Lora', serif", fontSize: 11, fontWeight: 600,
                          color: status === 'detected' ? accent : status === 'analyzing' ? C.templeGold : C.sandal,
                        }}>
                          {status === 'waiting' ? 'Waiting' : status === 'analyzing' ? 'Analyzing' : 'Detected'}
                        </span>
                      </div>
                    </div>

                    <div style={{ width: 1, height: 28, background: C.sandal + '50' }} />

                    {/* Confidence */}
                    <div>
                      <p style={{ fontFamily: "'Lora', serif", fontSize: 9, letterSpacing: 2.5, color: C.sandal, textTransform: 'uppercase', marginBottom: 2 }}>Match</p>
                      <span style={{ fontFamily: "'IM Fell English', serif", fontSize: 20, fontWeight: 700, color: isDetected ? accent : C.sandal }}>
                        {Math.round(confidence)}<span style={{ fontSize: 11, fontWeight: 400 }}>%</span>
                      </span>
                    </div>

                    {streak > 0 && (
                      <>
                        <div style={{ width: 1, height: 28, background: C.sandal + '50' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Flame size={13} color={C.templeGold} />
                          <span style={{ fontFamily: "'IM Fell English', serif", fontSize: 18, fontWeight: 700, color: C.templeGold }}>{streak}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button className="btn-primary" onClick={stopCamera} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 18px', borderRadius: 9,
                    border: `1px solid ${C.vermillion}40`,
                    background: `${C.vermillion}0A`,
                    color: C.vermillion,
                    fontFamily: "'Lora', serif",
                    fontSize: 11, fontWeight: 600,
                  }}>
                    <CameraOff size={12} />
                    Stop
                  </button>
                </div>
              )}
            </div>

            {mode === 'pose' && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PoseVisualiser landmarks={landmarksRef.current} poseDetails={poseDetails} />
                <div style={{
                  borderRadius: 16, background: C.parchment,
                  border: `1px solid ${C.linen}`,
                  padding: '16px 18px',
                  boxShadow: `0 2px 12px rgba(44,26,14,0.05)`,
                }}>
                  <PracticeMode
                    stanceName={detectedKey}
                    score={confidence}
                    isActive={cameraOn}
                    voiceGuide={voiceGuide}
                  />
                </div>
              </div>
            )}

            {/* Session History Bar */}
            <div style={{
              marginTop: 16,
              padding: '12px 4px',
              overflowX: 'auto',
              display: 'flex',
              gap: 12,
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}>
              <style>{`
                .history-bar::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="history-bar" style={{ display: 'flex', gap: 12 }}>
                {sessionHistory.length === 0 ? (
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 11, color: C.sandal, fontStyle: 'italic', padding: '6px 12px' }}>
                    Session history will appear here...
                  </div>
                ) : (
                  sessionHistory.map((item, i) => (
                    <div
                      key={`${item.key}-${i}`}
                      onClick={() => {
                        const data = item.isDouble ? DOUBLE_MUDRA_DATA[item.key] : MUDRA_DATA[item.key];
                        setModalMudra({ ...data, key: item.key, isDouble: item.isDouble });
                        setShowModal(true);
                      }}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 20,
                        background: C.parchment,
                        border: i === 0 ? `2px solid ${C.templeGold}` : `1px solid ${C.linen}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        boxShadow: i === 0 ? `0 2px 8px ${C.templeGold}33` : 'none',
                        transition: 'all 0.2s',
                        animation: i === 0 ? 'fadeUp 0.4s ease forwards' : 'none',
                      }}
                    >
                      <span style={{ fontFamily: "'Lora', serif", fontSize: 12, fontWeight: 600, color: C.deepMaroon }}>
                        {item.name}
                      </span>
                      <span style={{ fontFamily: "'IM Fell English', serif", fontSize: 11, color: C.templeGold, fontWeight: 700 }}>
                        {Math.round(item.confidence)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


          {/* ── RIGHT PANEL ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Detection result card */}
            <div
              key={detectedKey || 'empty'}
              className={detectedKey ? 'slide-in' : ''}
              style={{
                borderRadius: 20,
                background: C.parchment,
                border: `1.5px solid ${isDetected ? accent + '60' : C.linen}`,
                boxShadow: isDetected
                  ? `0 6px 32px ${accent}18, 0 2px 8px rgba(44,26,14,0.08)`
                  : `0 2px 16px rgba(44,26,14,0.06)`,
                overflow: 'hidden',
                transition: 'border-color 0.5s, box-shadow 0.5s',
              }}
            >
              {/* Card top bar */}
              <div style={{
                padding: '14px 24px 12px',
                background: isDetected ? `${accent}08` : `${C.linen}40`,
                borderBottom: `1px solid ${isDetected ? accent + '30' : C.linen}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {mode === 'holistic' ? <Sparkles size={14} color={accent} /> : mode === 'pose' ? <Activity size={14} color={accent} /> : <Hand size={14} color={accent} />}
                  </div>
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 11, color: C.brownLight, fontStyle: 'italic', letterSpacing: 0.5 }}>
                    {mode === 'holistic' ? 'Full Body & Stance Analysis' : mode === 'pose' ? 'Adavu Stance Analytics' : mode === 'sequence' ? 'Reference Dance Analytics' : (mode === 'single' ? 'Asamyuta Hasta' : 'Samyuta Hasta')}
                  </span>
                </div>
                {isDetected && (
                  <div style={{
                    padding: '3px 10px', borderRadius: 6,
                    background: `${accent}15`,
                    fontFamily: "'Lora', serif", fontSize: 10, fontWeight: 600,
                    color: accent, letterSpacing: 1,
                  }}>
                    ● Live
                  </div>
                )}
              </div>

              <div style={{ padding: 24 }}>
                {isDetected && mudra ? (
                  <div className="fade-up">
                    {/* Mudra name */}
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <h2 style={{
                        fontFamily: "'Yatra One', serif",
                        fontSize: 48, color: C.deepMaroon,
                        lineHeight: 1, letterSpacing: 0.5, marginBottom: 4,
                      }}>
                        {mudra.name}
                      </h2>
                      <p style={{
                        fontFamily: "'IM Fell English', serif",
                        fontSize: 16, fontStyle: 'italic',
                        color: accentGold,
                      }}>
                        "{mudra.meaning}"
                      </p>
                      {/* Decorative rule */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 0' }}>
                        <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${C.sandal})` }} />
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: accentGold }} />
                        <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${C.sandal})` }} />
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.brownLight, letterSpacing: 1, textTransform: 'uppercase' }}>
                          Signature Match
                        </span>
                        <span style={{ fontFamily: "'IM Fell English', serif", fontSize: 15, fontWeight: 700, color: accent }}>
                          {Math.round(confidence)}%
                        </span>
                      </div>
                      <div style={{ height: 4, background: C.linen, borderRadius: 2, overflow: 'hidden' }}>
                        <div className="conf-bar" style={{
                          height: '100%', borderRadius: 2,
                          background: confidence >= 90 ? C.vermillion : confidence >= 70 ? C.templeGold : C.brownLight,
                          width: `${Math.round(confidence)}%`,
                          transition: 'width 0.4s ease, background 0.3s',
                        }} />
                      </div>
                    </div>

                    {/* Description & Usage or Sequence Feedback */}
                    {mode === 'sequence' && sequenceResult ? (
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ padding: '12px 16px', borderRadius: 10, background: C.cream, border: `1px solid ${C.linen}`, marginBottom: 14 }}>
                          <p style={{ fontFamily: "'Lora', serif", fontSize: 11, color: C.deepMaroon, fontWeight: 600, marginBottom: 6 }}>
                            Reference Match Details:
                          </p>
                          <div style={{ fontSize: 12, fontFamily: "'Noto Serif', serif", color: C.brownMid, lineHeight: 1.7 }}>
                            <div>• Live Stance: <strong style={{ color: C.teal }}>{sequenceResult.current_stance || 'Araimandi Stance'}</strong></div>
                            <div>• Matched Reference Frame: <strong>{sequenceResult.matched_frame || sequenceResult.matched_step}</strong></div>
                            <div>• Posture Performance Grade: <strong style={{ color: C.vermillion }}>{sequenceResult.grade}</strong></div>
                          </div>
                        </div>

                        <p style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.sandal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                          Choreography Posture Corrections:
                        </p>
                        {sequenceResult.feedback && sequenceResult.feedback.map((fb, idx) => (
                          <div key={idx} style={{ padding: '8px 12px', borderRadius: 8, background: `${C.vermillion}10`, border: `1px solid ${C.vermillion}30`, color: C.deepMaroon, fontSize: 12, fontFamily: "'Lora', serif", marginBottom: 6 }}>
                            ✦ {fb}
                          </div>
                        ))}

                        <button
                          className="btn-primary"
                          style={{ marginTop: 12, width: '100%', padding: '10px', fontSize: 12, background: C.deepMaroon }}
                          onClick={async () => {
                            try {
                              const timelineData = stanceTimeline.length > 0 ? stanceTimeline : [
                                { stance: sequenceResult.current_stance || 'Araimandi Stance', score: sequenceResult.match_score || 85 }
                              ];
                              const res = await axios.post(`${FLASK_URL}/api/sequence/session_complete`, {
                                dance_name: selectedDanceRef.current || 'Alarippu',
                                timeline: timelineData
                              });
                              if (res.data && res.data.status === 'success') {
                                setSessionSummary(res.data);
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}>
                          📊 Complete Routine & Export Scorecard
                        </button>

                        {sessionSummary && (
                          <div style={{ marginTop: 16, padding: '14px', borderRadius: 10, background: C.parchment, border: `2px solid ${C.templeGold}` }}>
                            <div style={{ fontFamily: "'Yatra One', serif", fontSize: 18, color: C.deepMaroon, marginBottom: 6 }}>
                              🏆 Session Scorecard ({sessionSummary.grade})
                            </div>
                            <div style={{ fontSize: 12, fontFamily: "'Noto Serif', serif", color: C.brownMid, marginBottom: 8 }}>
                              • Overall Alignment: <strong>{sessionSummary.overall_score}%</strong><br/>
                              • Evaluated Frames: <strong>{sessionSummary.total_frames_evaluated}</strong>
                            </div>
                            <div style={{ fontSize: 11, fontFamily: "'Lora', serif", color: C.deepMaroon, fontWeight: 600, marginBottom: 4 }}>
                              Stance Breakdown:
                            </div>
                            {sessionSummary.stance_breakdown && Object.entries(sessionSummary.stance_breakdown).map(([st, pct]) => (
                              <div key={st} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: "'Lora', serif", color: C.brownMid, marginBottom: 2 }}>
                                <span>• {st}</span>
                                <strong>{pct}%</strong>
                              </div>
                            ))}
                            <div style={{ marginTop: 8, fontSize: 11, fontStyle: 'italic', color: C.vermillion, fontFamily: "'Lora', serif", marginBottom: 10 }}>
                              "{sessionSummary.performance_summary}"
                            </div>
                            <button
                              className="btn-primary"
                              style={{ width: '100%', padding: '8px', fontSize: 11, background: C.vermillion }}
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/student/download_dance_report', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      studentId: 'Student_01',
                                      danceName: selectedDanceRef.current || 'Alarippu',
                                      overallScore: sessionSummary.overall_score,
                                      grade: sessionSummary.grade,
                                      stanceBreakdown: sessionSummary.stance_breakdown,
                                      priorityFaults: sequenceResult?.feedback || ["Posture maintained with minimal angular deviation."],
                                      performanceSummary: sessionSummary.performance_summary
                                    })
                                  });
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${selectedDanceRef.current || 'Alarippu'}_Performance_Report.pdf`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                } catch (err) {
                                  console.error("PDF download error:", err);
                                }
                              }}>
                              📥 Download PDF Performance Scorecard
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginBottom: 18 }}>
                        <p style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.sandal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                          Stance Technique
                        </p>
                        <p style={{ fontFamily: "'Noto Serif', serif", fontSize: 13, color: C.ink, lineHeight: 1.6, marginBottom: 12 }}>
                          {mudra.description}
                        </p>
                        <p style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.sandal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                          Classical Context
                        </p>
                        <p style={{ fontFamily: "'Noto Serif', serif", fontSize: 13, color: C.brownMid, lineHeight: 1.6 }}>
                          {mudra.usage}
                        </p>
                      </div>
                    )}

                    <button
                      className="btn-primary"
                      onClick={() => { setModalMudra({ ...mudra, key: detectedKey, isDouble: mode === 'double' }); setShowModal(true); }}
                      style={{
                        width: '100%', padding: '12px 0',
                        borderRadius: 12,
                        border: `1.5px solid ${accent}40`,
                        background: `${accent}08`,
                        color: accent,
                        fontFamily: "'Lora', serif",
                        fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <BookOpen size={13} />
                      Full Stance Details
                      <ChevronRight size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={{ paddingTop: 8, paddingBottom: 24, textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 20, margin: '0 auto 18px',
                      background: C.cream, border: `1.5px solid ${C.linen}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {status === 'analyzing'
                        ? <ScanLine size={24} color={C.templeGold} className="breathe" style={{ animation: 'breathe 1.5s ease-in-out infinite' }} />
                        : <Activity size={24} color={C.sandal} />}
                    </div>
                    <p style={{ fontFamily: "'Yatra One', serif", fontSize: 20, color: C.sandal, marginBottom: 6 }}>
                      {(mode === 'pose' || mode === 'holistic')
                        ? (status === 'analyzing' ? 'Analyzing Full Body' : 'Awaiting Stance')
                        : (status === 'analyzing' ? 'Not a Mudra' : 'Awaiting Hasta')}
                    </p>
                    <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 12, color: C.linen }}>
                      {(mode === 'pose' || mode === 'holistic')
                        ? 'Step back so your full body is visible to the camera'
                        : (status === 'analyzing'
                            ? (mode === 'double' ? 'Form a classical double-hand mudra' : 'Form a classical hand mudra')
                            : (mode === 'double' ? 'Show both hands to the camera' : 'Form a classical hand mudra'))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats card */}
            {cameraOn && (
              <div style={{
                borderRadius: 16,
                background: C.parchment,
                border: `1px solid ${C.linen}`,
                boxShadow: `0 2px 12px rgba(44,26,14,0.05)`,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '10px 20px', background: C.linen + '80',
                  borderBottom: `1px solid ${C.linen}`,
                }}>
                  <span style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 11, color: C.brownLight, letterSpacing: 1 }}>
                    Session Analytics
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '18px 0' }}>
                  {[
                    { label: 'Streak', value: streak, Icon: Flame, color: C.templeGold },
                    { label: 'Unique', value: uniqueMudras.size, Icon: Star, color: C.vermillion },
                    { label: 'Total', value: mode === 'single' ? 28 : (mode === 'double' ? 23 : Object.keys(STANCE_DATA).length), Icon: Trophy, color: C.brownLight },
                  ].map((item, i) => (
                    <div key={i} style={{
                      textAlign: 'center',
                      borderRight: i < 2 ? `1px solid ${C.linen}` : 'none',
                      padding: '4px 0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                        <item.Icon size={12} color={item.color} />
                        <span style={{ fontFamily: "'Lora', serif", fontSize: 9, color: C.sandal, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
                          {item.label}
                        </span>
                      </div>
                      <span style={{ fontFamily: "'IM Fell English', serif", fontSize: 24, fontWeight: 700, color: item.color }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* How it works (when camera off) */}
            {!cameraOn && (
              <div style={{
                borderRadius: 18,
                background: C.parchment,
                border: `1px solid ${C.linen}`,
                overflow: 'hidden',
                boxShadow: `0 2px 12px rgba(44,26,14,0.05)`,
              }}>
                <div style={{
                  padding: '14px 22px',
                  background: C.linen + '80',
                  borderBottom: `1px solid ${C.linen}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Sparkles size={13} color={C.templeGold} />
                  <span style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 12, color: C.brownMid, letterSpacing: 0.5 }}>
                    How It Works
                  </span>
                </div>
                <div style={{ padding: '20px 22px' }}>
                  {[
                    { Icon: CameraIcon, step: '01', title: 'Allow Camera Access', desc: 'All processing happens locally in your browser. No data is sent.' },
                    { Icon: (mode === 'pose' || mode === 'holistic') ? Activity : Hand, step: '02', title: (mode === 'pose' || mode === 'holistic') ? 'Assume Posture' : 'Form a Hasta Mudra', desc: (mode === 'pose' || mode === 'holistic') ? 'Step back so full body is visible in camera frame.' : (mode === 'double' ? 'Show both hands clearly in frame, well-lit.' : 'Hold any classical hand gesture clearly in frame.') },
                    { Icon: Activity, step: '03', title: 'Instant Recognition', desc: 'The AI engine maps your hand against 28 finger-state patterns.' },
                    { Icon: BookOpen, step: '04', title: 'Explore the Meaning', desc: 'Discover the mythological usage and classical context of the mudra.' },
                  ].map(({ Icon, step, title, desc }) => (
                    <div key={step} style={{ display: 'flex', gap: 14, marginBottom: 18, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${accent}10`, border: `1.5px solid ${accent}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={15} color={accent} />
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Lora', serif", fontSize: 12, color: C.deepMaroon, fontWeight: 600, marginBottom: 3 }}>
                          <span style={{ color: accentGold, marginRight: 6, fontStyle: 'italic' }}>{step}</span>
                          {title}
                        </p>
                        <p style={{ fontFamily: "'Noto Serif', serif", fontSize: 12, color: C.brownLight, lineHeight: 1.5 }}>
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mudra reference list (compact) */}
            {!cameraOn && (
              <div style={{
                borderRadius: 14,
                background: C.cream,
                border: `1px solid ${C.linen}`,
                padding: '14px 18px',
              }}>
                <p style={{ fontFamily: "'Lora', serif", fontSize: 10, letterSpacing: 2.5, color: C.sandal, textTransform: 'uppercase', marginBottom: 12 }}>
                  Recognizable Mudras
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.values(mode === 'single' ? MUDRA_DATA : (mode === 'double' ? DOUBLE_MUDRA_DATA : STANCE_DATA)).map(m => (
                    <span key={m.name} style={{
                      padding: '3px 10px', borderRadius: 6,
                      background: C.parchment, border: `1px solid ${C.linen}`,
                      fontFamily: "'Lora', serif", fontSize: 10, color: C.brownMid,
                      letterSpacing: 0.3,
                    }}>
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer style={{ marginTop: 48, textAlign: 'center', paddingBottom: 20 }}>
          <GoldDivider />
          <p style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: 'italic',
            fontSize: 14,
            color: C.brownLight,
            letterSpacing: 0.5,
            marginBottom: 8,
            maxWidth: 600,
            margin: '0 auto 12px'
          }}>
            "Angikam bhuvanam yasya, Vachikam sarva vangmayam, Aharyam chandra taradi, Tam numah satvikam Shivam."
          </p>
          <p style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.sandal, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.8 }}>
            GestureIQ · Bharatanatyam Mudra AI · Built with MediaPipe
          </p>
        </footer>

      </div>

      {/* ══ MODAL ══════════════════════════════════════════════════════ */}
      {showModal && modalMudra && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(44,26,14,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="fade-up"
            style={{
              background: C.parchment,
              borderRadius: 24,
              maxWidth: 520, width: '100%',
              border: `2px solid ${accentGold}50`,
              position: 'relative',
              boxShadow: `0 24px 80px rgba(44,26,14,0.35)`,
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal top bar */}
            <div style={{
              padding: '28px 28px 16px',
              background: `${accent}08`,
              borderBottom: `1.5px solid ${accentGold}30`,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              position: 'relative',
            }}>
              {/* Corner ornaments */}
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none' }}>
                <CornerOrnament />
              </div>
              <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, pointerEvents: 'none' }}>
                <CornerOrnament flip />
              </div>

              <div style={{ position: 'relative', zIndex: 20 }}>

                <div style={{
                  display: 'inline-flex', padding: '3px 12px', borderRadius: 6, marginBottom: 10,
                  background: `${accent}12`, border: `1px solid ${accent}30`,
                  fontFamily: "'Lora', serif", fontSize: 10, fontStyle: 'italic',
                  color: accent, letterSpacing: 1,
                }}>
                  {modalMudra.isDouble ? 'Samyuta Hasta' : 'Asamyuta Hasta'}
                </div>
                <h2 style={{
                  fontFamily: "'Yatra One', serif",
                  fontSize: 46, color: C.deepMaroon,
                  lineHeight: 1, letterSpacing: 0.5, marginBottom: 4,
                }}>
                  {modalMudra.name}
                </h2>
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 17, color: accentGold }}>
                  "{modalMudra.meaning}"
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                background: C.cream, border: `1px solid ${C.linen}`, borderRadius: 8,
                width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.brownLight, flexShrink: 0, marginTop: 4,
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.linen; e.currentTarget.style.color = C.deepMaroon; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.brownLight; }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px 28px 28px' }}>
              {/* Decorative divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accentGold}50, transparent)` }} />
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentGold }} />
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${accentGold}50, transparent)` }} />
              </div>

              {/* Description */}
              {modalMudra.description && (
                <div style={{ marginBottom: 22 }}>
                  <p style={{ fontFamily: "'Lora', serif", fontSize: 9, letterSpacing: 3, color: C.sandal, textTransform: 'uppercase', marginBottom: 10 }}>
                    Form & Context
                  </p>
                  <p style={{ fontFamily: "'Noto Serif', serif", fontSize: 14, color: C.brownMid, lineHeight: 1.75 }}>
                    {modalMudra.description}
                  </p>
                </div>
              )}

              {/* Usage */}
              <div style={{
                padding: '18px 20px', borderRadius: 14,
                background: C.cream, border: `1.5px solid ${accentGold}30`,
                marginBottom: 22,
              }}>
                <p style={{ fontFamily: "'Lora', serif", fontSize: 9, letterSpacing: 3, color: C.sandal, textTransform: 'uppercase', marginBottom: 10 }}>
                  Ritual & Dramatic Usage
                </p>
                <p style={{ fontFamily: "'Noto Serif', serif", fontSize: 14, color: C.deepMaroon, lineHeight: 1.65 }}>
                  {modalMudra.usage}
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => setShowModal(false)}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  border: `1.5px solid ${C.linen}`,
                  background: C.cream,
                  color: C.brownLight,
                  fontFamily: "'Lora', serif", fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
                }}
              >
                Return to Detection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
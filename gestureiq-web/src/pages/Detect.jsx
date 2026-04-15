import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../context/AuthContext';
import { useVoiceGuide } from '../hooks/useVoiceGuide';
import io from 'socket.io-client';
import { checkGeometricAnchors } from '../utils/geometricRules';

const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

// ── Single-hand mudra data ─────────────────────────────────
const MUDRA_DATA = {
  pataka:       { name: 'Pataka',       meaning: 'Flag',               description: 'The Pataka mudra represents a flag, clouds, forest, beginning of dance, and river. It is one of the most fundamental mudras in Bharatanatyam, used to depict blessing, a forest, the sea, and the night sky.', usage: 'Clouds, forest, river, blessing', symbol: '🏳️' },
  tripataka:    { name: 'Tripataka',    meaning: 'Three-part Flag',    description: 'Tripataka is derived from Pataka with the ring finger bent. It represents a crown, tree, lamp flame, and arrow. Used widely in storytelling sequences to depict royalty and divine objects.', usage: 'Crown, tree, lamp flame, arrow', symbol: '🌿' },
  ardhapataka:  { name: 'Ardhapataka', meaning: 'Half Flag',           description: 'Ardhapataka represents a knife, two leaves, and river banks. This mudra is formed by bending the ring and little fingers while keeping the other two straight.', usage: 'Knife, two leaves, river banks', symbol: '🍃' },
  kartarimukha: { name: 'Kartarimukha', meaning: 'Scissors Face',      description: 'Kartarimukha resembles scissor blades and is used to depict separation, the corner of an eye, death, and lightning. A powerful expressive mudra in classical dance.', usage: 'Separation, lightning, corner of eye', symbol: '✂️' },
  mayura:       { name: 'Mayura',       meaning: 'Peacock',            description: 'Mayura represents the graceful peacock, and is used for applying tilak on forehead, a braid, and gentle touch.', usage: 'Applying tilak, braid, gentle touch', symbol: '🦚' },
  ardhachandra: { name: 'Ardhachandra', meaning: 'Half Moon',          description: 'Ardhachandra depicts the crescent moon, a plate, and the beginning of prayer.', usage: 'Moon, plate, beginning prayer', symbol: '🌙' },
  arala:        { name: 'Arala',        meaning: 'Bent',               description: 'Arala represents drinking nectar or poison, the wind, and blessings.', usage: 'Drinking nectar, wind, poison', symbol: '💨' },
  shukatunda:   { name: 'Shukatunda',  meaning: 'Parrot Beak',        description: 'Shukatunda resembles a parrot\'s beak and represents shooting an arrow and pointing direction.', usage: 'Shooting arrow, direction', symbol: '🦜' },
  mushti:       { name: 'Mushti',       meaning: 'Fist',               description: 'Mushti is a tight fist representing grasping, wrestling, and holding hair.', usage: 'Grasping, wrestling, holding hair', symbol: '✊' },
  shikhara:     { name: 'Shikhara',     meaning: 'Spire / Peak',       description: 'Shikhara represents a temple spire, the husband, Shiva, and a pillar.', usage: 'Bow, pillar, husband, Shiva', symbol: '🏛️' },
  kapittha:     { name: 'Kapittha',     meaning: 'Wood Apple',         description: 'Kapittha represents Goddess Lakshmi holding a lotus, Saraswati holding a veena, and cymbals.', usage: 'Lakshmi, Saraswati, holding cymbals', symbol: '🌸' },
  katakamukha:  { name: 'Katakamukha', meaning: 'Bracelet Opening',   description: 'Katakamukha depicts picking flowers, stringing a garland, and pulling a bow.', usage: 'Picking flowers, garland, pulling bow', symbol: '💐' },
  suchi:        { name: 'Suchi',        meaning: 'Needle',             description: 'Suchi represents the universe, the number one, and pointing to a single truth.', usage: 'Universe, number one, the city', symbol: '☝️' },
  chandrakala:  { name: 'Chandrakala',  meaning: 'Crescent Moon',      description: 'Chandrakala represents Shiva\'s crescent moon ornament and a forehead mark.', usage: "Shiva's moon, forehead mark", symbol: '🌛' },
  padmakosha:   { name: 'Padmakosha',  meaning: 'Lotus Bud',          description: 'Padmakosha represents a lotus bud, an apple, and a round ball.', usage: 'Apple, round ball, lotus', symbol: '🪷' },
  sarpashira:   { name: 'Sarpashira',  meaning: 'Snake Head',         description: 'Sarpashira imitates the hood of a cobra and represents gentle touch, swimming, and the movement of a snake.', usage: 'Gentle touch, swimming, snake', symbol: '🐍' },
  mrigashira:   { name: 'Mrigashira',  meaning: 'Deer Head',          description: 'Mrigashira represents the head of a deer, forest animals, and the gentle touch of a woman.', usage: 'Deer, forest, gentle touch, woman', symbol: '🦌' },
  simhamukha:   { name: 'Simhamukha',  meaning: 'Lion Face',          description: 'Simhamukha depicts the face of a lion, a horse, and fearless power.', usage: 'Lion, horse, fearlessness, power', symbol: '🦁' },
  kangula:      { name: 'Kangula',      meaning: 'Bell',               description: 'Kangula represents a bell, fruit, and drops of water.', usage: 'Bell, fruit, drop of water', symbol: '🔔' },
  alapadma:     { name: 'Alapadma',    meaning: 'Full Bloomed Lotus',  description: 'Alapadma is the fully bloomed lotus, representing full moon, beauty, a lake, and a disc.', usage: 'Full moon, beauty, lake, disc', symbol: '🌺' },
  chatura:      { name: 'Chatura',      meaning: 'Clever / Wise',      description: 'Chatura represents cleverness, gold, wind, and slight movement.', usage: 'Gold, wind, slight movement', symbol: '🧠' },
  bhramara:     { name: 'Bhramara',    meaning: 'Bee',                 description: 'Bhramara imitates a bee and represents a bee, a bird, and the six seasons.', usage: 'Bee, bird, six seasons', symbol: '🐝' },
  hamsasya:     { name: 'Hamsasya',    meaning: 'Swan Beak',           description: 'Hamsasya depicts the beak of a swan and represents a pearl, tying a thread, and the number five.', usage: 'Pearl, tying thread, number five', symbol: '🦢' },
  hamsapaksha:  { name: 'Hamsapaksha', meaning: 'Swan Wing',          description: 'Hamsapaksha represents the wing of a swan and gentle waving motion.', usage: 'Swan, number six, gentle waving', symbol: '🕊️' },
  sandamsha:    { name: 'Sandamsha',   meaning: 'Tongs',               description: 'Sandamsha depicts tongs, a crab claw, and picking flowers.', usage: 'Picking flowers, tongs, crab claw', symbol: '🦀' },
  mukula:       { name: 'Mukula',       meaning: 'Flower Bud',         description: 'Mukula represents a flower bud, eating, and the navel.', usage: 'Lotus bud, eating, navel', symbol: '🌷' },
  tamrachuda:   { name: 'Tamrachuda',  meaning: 'Rooster Crest',      description: 'Tamrachuda represents a rooster, peacock, and bird crest.', usage: 'Rooster, peacock, bird crest', symbol: '🐓' },
  trishula:     { name: 'Trishula',    meaning: 'Trident',             description: 'Trishula represents Lord Shiva\'s sacred trident and the three paths of dharma.', usage: "Shiva's trident, three paths", symbol: '🔱' },
};

// ── Double-hand mudra data ─────────────────────────────────
const DOUBLE_MUDRA_DATA = {
  anjali:          { name: 'Anjali',          meaning: 'Salutation',       symbol: '🙏', usage: 'Prayer, greeting, reverence' },
  bherunda:        { name: 'Bherunda',        meaning: 'Terrible Bird',    symbol: '🦅', usage: 'Two-headed bird, strength' },
  chakra:          { name: 'Chakra',          meaning: 'Wheel / Disc',     symbol: '☸️', usage: 'Wheel, spinning, divine disc' },
  dola:            { name: 'Dola',            meaning: 'Swing',            symbol: '🌊', usage: 'Swinging arms, casual gesture' },
  garuda:          { name: 'Garuda',          meaning: 'Eagle',            symbol: '🦁', usage: 'Eagle, Vishnu\'s vehicle, flight' },
  kapotha:         { name: 'Kapotha',         meaning: 'Pigeon',           symbol: '🕊️', usage: 'Pigeon, peace, humility' },
  karkata:         { name: 'Karkata',         meaning: 'Crab',             symbol: '🦀', usage: 'Crab, stretching, forest' },
  kartarisvastika: { name: 'Kartarisvastika', meaning: 'Scissors Cross',   symbol: '✂️', usage: 'Crossed scissors, protection' },
  katakavardhana:  { name: 'Katakavardhana',  meaning: 'Increasing Bracelet', symbol: '💍', usage: 'Coronation, royalty' },
  katva:           { name: 'Katva',           meaning: 'Hip gesture',      symbol: '💃', usage: 'Hip placement, dance stance' },
  kilaka:          { name: 'Kilaka',          meaning: 'Bond / Link',      symbol: '🔗', usage: 'Linking, bonding, friendship' },
  kurma:           { name: 'Kurma',           meaning: 'Tortoise',         symbol: '🐢', usage: 'Tortoise, Vishnu avatar' },
  matsya:          { name: 'Matsya',          meaning: 'Fish',             symbol: '🐟', usage: 'Fish, Vishnu avatar, water' },
  nagabandha:      { name: 'Nagabandha',      meaning: 'Snake Bond',       symbol: '🐍', usage: 'Intertwined snakes, naga' },
  pasa:            { name: 'Pasa',            meaning: 'Noose',            symbol: '🪢', usage: 'Rope, noose, binding' },
  puspaputa:       { name: 'Puspaputa',       meaning: 'Flower Basket',    symbol: '🌸', usage: 'Offering flowers, basket' },
  sakata:          { name: 'Sakata',          meaning: 'Cart / Vehicle',   symbol: '🛒', usage: 'Cart, Ganesha\'s vehicle' },
  samputa:         { name: 'Samputa',         meaning: 'Covered Box',      symbol: '📦', usage: 'Box, covering, protection' },
  sankha:          { name: 'Sankha',          meaning: 'Conch Shell',      symbol: '🐚', usage: 'Conch, Vishnu, auspicious' },
  sivalinga:       { name: 'Sivalinga',       meaning: 'Shiva Linga',      symbol: '🔱', usage: 'Shiva worship, devotion' },
  svastika:        { name: 'Svastika',        meaning: 'Auspicious Cross', symbol: '✨', usage: 'Good luck, auspiciousness' },
  utsanga:         { name: 'Utsanga',         meaning: 'Embrace',          symbol: '🤗', usage: 'Embrace, holding, affection' },
  varaha:          { name: 'Varaha',          meaning: 'Boar',             symbol: '🐗', usage: 'Boar, Vishnu avatar, earth' },
};

const STATUS = {
  idle:      { label: 'Camera Off',           color: '#94A3B8', pulse: false },
  no_hand:   { label: 'Show Your Hand(s)',     color: '#94A3B8', pulse: false },
  analyzing: { label: 'Analyzing…',           color: '#D97706', pulse: true  },
  detected:  { label: 'Mudra Identified',     color: '#059669', pulse: true  },
  no_mudra:  { label: 'No Mudra Detected',    color: '#64748B', pulse: false },
};

export default function Detect() {
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const { announce, unlock } = useVoiceGuide();

  // ── Mode toggle ────────────────────────────────────────────
  const [mode, setMode] = useState('single'); // 'single' | 'double'

  // ── Shared state ───────────────────────────────────────────
  const [cameraOn,    setCameraOn]    = useState(false);
  const [handPresent, setHandPresent] = useState(false);
  const [detectedKey, setDetectedKey] = useState(null);
  const [confidence,  setConfidence]  = useState(0);
  const [top3,        setTop3]        = useState([]);
  const [bufSize,     setBufSize]     = useState(0);
  const [engineOk,    setEngineOk]    = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [modalMudra,  setModalMudra]  = useState(null);
  const [doubleMsg,   setDoubleMsg]   = useState('Show both hands to the camera');

  const [activeModules, setActiveModules] = useState({ mudra: true, face: true, pose: false });
  const activeModulesRef = useRef(activeModules);
  useEffect(() => { activeModulesRef.current = activeModules; }, [activeModules]);

  const videoRef       = useRef(null);
  const canvasRef      = useRef(null);
  const streamRef      = useRef(null);
  const handsRef       = useRef(null);
  const rafRef         = useRef(null);
  const socketRef      = useRef(null);
  const intervalRef    = useRef(null);
  const landmarksRef   = useRef(null);
  const bufferRef      = useRef([]);
  const inFlightRef    = useRef(false);
  const lockRef        = useRef({ name: null, until: 0 });
  const prevKeyRef     = useRef(null);
  const modalTimerRef  = useRef(null);
  const engineErrCount = useRef(0);
  const frameCapRef    = useRef(null); // for double mode frame capture
  const consecutiveRef = useRef({ name: null, count: 0 });
  const graceRef       = useRef(0); // For stability grace window (hysteresis)

  const STABILITY_THRESHOLD = 10;
  const MIN_CONF            = 20;

  useEffect(() => {
    if (!user || user.role !== 'student') { navigate('/'); return; }
    
    const sock = io(window.location.origin.replace('5173', '5000'));
    socketRef.current = sock;
    sock.on('modules_changed', (data) => {
      setActiveModules(data.modules || data);
    });

    return () => {
      sock.disconnect();
      doCleanup();
    };
  }, [user, navigate]);

  // ── Modal + voice on detection ─────────────────────────────
  useEffect(() => {
    // [RECTIFICATION] Manual cancel removed to prevent interruption on hand loss
    if (detectedKey && detectedKey !== prevKeyRef.current) {
      prevKeyRef.current = detectedKey;
      const data = mode === 'single' ? MUDRA_DATA[detectedKey] : DOUBLE_MUDRA_DATA[detectedKey];
      if (!data) return;

      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
      modalTimerRef.current = setTimeout(() => {
        setModalMudra({ ...data, isDouble: mode === 'double' });
        setShowModal(true);
        
        // [RECTIFICATION] Use Unified Hook and Ultra Priority (4)
        const text = `${data.name} mudra detected. ${data.meaning}. Used for ${data.usage}.`;
        announce.raw(text, 4, { onEnd: () => setShowModal(false) });
      }, 1500);
    }
    if (!detectedKey) {
      prevKeyRef.current = null;
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
      setShowModal(false);
    }
  }, [detectedKey, mode]);

  const doCleanup = useCallback(() => {
    if (rafRef.current)      cancelAnimationFrame(rafRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (handsRef.current)    { handsRef.current.close(); handsRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── MediaPipe init — single hand ──────────────────────────
  const initSingleHands = useCallback(() => {
    if (handsRef.current) return;
    const h = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    h.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    h.onResults((results) => {
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
      
      // GATEKEEPER: Check live ref for mudra toggle
      if (activeModulesRef.current.mudra && results.multiHandLandmarks?.length > 0) {
        const lms = results.multiHandLandmarks[0];
        landmarksRef.current = lms;
        drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#7C3AED', lineWidth: 3 });
        drawLandmarks(ctx, lms, { color: '#A78BFA', lineWidth: 1, radius: 3 });
      } else {
        landmarksRef.current = null;
      }
      ctx.restore();
    });
    handsRef.current = h;
  }, []);

  // ── MediaPipe init — double hand ──────────────────────────
  const initDoubleHands = useCallback(() => {
    if (handsRef.current) return;
    const h = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    h.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    h.onResults((results) => {
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
      const count = results.multiHandLandmarks?.length || 0;
      
      // GATEKEEPER: Check live ref for mudra toggle (double mode)
      if (activeModulesRef.current.mudra && count > 0) {
        landmarksRef.current = results;
        results.multiHandLandmarks.forEach(lms => {
          drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#10B981', lineWidth: 3 });
          drawLandmarks(ctx, lms, { color: '#34D399', lineWidth: 1, radius: 3 });
        });
      } else {
        landmarksRef.current = null;
      }
      ctx.restore();
    });
    handsRef.current = h;
  }, []);

  // ── Capture frame for double mode ─────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const c = document.createElement('canvas');
    c.width = 640; c.height = 480;
    const ctx = c.getContext('2d');
    ctx.scale(-1, 1);
    ctx.drawImage(video, -640, 0, 640, 480);
    return c.toDataURL('image/jpeg', 0.6);
  }, []);

  // ── Single-hand detection ──────────────────────────────────
  const runSingleDetection = useCallback(async () => {
    if (showModal) return; // [LOCK] Pause while explaining
    if (inFlightRef.current) return;
    
    // GATEKEEPER: If module is off, skip detection API call
    if (!activeModulesRef.current.mudra) {
      setHandPresent(false);
      setDetectedKey(null);
      return;
    }

    const lms = landmarksRef.current;
    if (!lms || lms.length !== 21) {
      setHandPresent(false);
      consecutiveRef.current = { name: null, count: 0 };
      setDetectedKey(null);
      setConfidence(0);
      setBufSize(0);
      return;
    }
    setHandPresent(true);
    inFlightRef.current = true;
    try {
      const lmArray = Array.from(lms).map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
      const res = await fetch(`/api/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks: lmArray }), signal: AbortSignal.timeout(800),
      });
      if (!res.ok) throw new Error('Flask error');
      const json = await res.json();
      setEngineOk(true);
      engineErrCount.current = 0;
      
      const isValid = (json.confidence || 0) >= MIN_CONF && !!json.name;
      const detectedName = isValid ? json.name : null;

      // RELAXED 10-FRAME GATE (with Grace Window)
      const effectiveName = detectedName || (graceRef.current < 3 ? consecutiveRef.current.name : null);
      if (detectedName) graceRef.current = 0; else graceRef.current++;

      if (effectiveName && effectiveName === consecutiveRef.current.name) {
        consecutiveRef.current.count++;
      } else {
        consecutiveRef.current = { name: effectiveName, count: effectiveName ? 1 : 0 };
      }

      if (consecutiveRef.current.count >= STABILITY_THRESHOLD) {
        setDetectedKey(consecutiveRef.current.name);
        setConfidence(Math.min(98, 85 + (json.confidence || 0) * 0.15));
      } else {
        setDetectedKey(null);
        setConfidence(0);
      }
      setBufSize(consecutiveRef.current.count);
      setTop3(json.top3 || []);
    } catch {
      engineErrCount.current++;
      if (engineErrCount.current >= 3) setEngineOk(false);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // ── Double-hand detection ──────────────────────────────────
  const runDoubleDetection = useCallback(async () => {
    if (showModal) return; // [LOCK] Pause while explaining
    if (inFlightRef.current) return;

    // GATEKEEPER: If module is off, skip detection API call
    if (!activeModulesRef.current.mudra) {
      setHandPresent(false);
      setDetectedKey(null);
      return;
    }

    const results = landmarksRef.current;
    const count   = results?.multiHandLandmarks?.length || 0;

    if (count === 0) {
      setHandPresent(false);
      setDoubleMsg("Please bring both hands into view.");
      consecutiveRef.current = { name: null, count: 0 };
      setDetectedKey(null);
      setConfidence(0);
      setBufSize(0);
      return;
    }


    setHandPresent(true);
    setDoubleMsg('Analyzing both hands…');
    inFlightRef.current = true;

    try {
      const frame = captureFrame();
      if (!frame) { inFlightRef.current = false; return; }

      const res = await fetch(`/api/predict_double`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame }), signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) throw new Error('Flask error');
      const json = await res.json();
      setEngineOk(true);
      engineErrCount.current = 0;

      let detectedName = json.detected && json.confidence >= 40 ? json.name : null;

      // GEOMETRIC OVERRIDE
      if (detectedName && ['anjali', 'karkata', 'sivalinga', 'sankha'].includes(detectedName.toLowerCase())) {
        const geo = checkGeometricAnchors(detectedName, results.multiHandLandmarks);
        if (!geo.isValid) {
          detectedName = null;
          setDoubleMsg(geo.corrections[0] || "Adjust your hand position");
        }
      }

      // RELAXED 10-FRAME GATE (with Grace Window)
      const effectiveName = detectedName || (graceRef.current < 3 ? consecutiveRef.current.name : null);
      if (detectedName) graceRef.current = 0; else graceRef.current++;

      if (effectiveName && effectiveName === consecutiveRef.current.name) {
        consecutiveRef.current.count++;
      } else {
        consecutiveRef.current = { name: effectiveName, count: effectiveName ? 1 : 0 };
      }

      if (consecutiveRef.current.count >= 4) { // Insta-Gate (4 frames)
        setDetectedKey(consecutiveRef.current.name);
        setConfidence(Math.round(json.confidence || 0));
        setDoubleMsg(`✓ ${consecutiveRef.current.name} identified!`);
      } else {
        setDetectedKey(null);
        setConfidence(0);
        if (!detectedName) setDoubleMsg('Analyzing both hands...');
      }
      setBufSize(consecutiveRef.current.count);
      setTop3(json.top3 || []);
    } catch {
      engineErrCount.current++;
      if (engineErrCount.current >= 3) setEngineOk(false);
    } finally {
      inFlightRef.current = false;
    }
  }, [captureFrame]);


  // ── Camera start / stop ────────────────────────────────────
  const startCamera = async () => {
    unlock(); // Enable voice engine on user gesture
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      streamRef.current = stream;
      if (mode === 'single') initSingleHands();
      else                   initDoubleHands();
      setCameraOn(true);
    } catch {
      engineErrCount.current++;
      if (engineErrCount.current >= 3) setEngineOk(false);
    }
  };

  const stopCamera = useCallback(() => {
    doCleanup();
    streamRef.current = null; landmarksRef.current = null;
    bufferRef.current = []; inFlightRef.current = false;
    lockRef.current = { name: null, until: 0 }; prevKeyRef.current = null;
    setCameraOn(false); setHandPresent(false); setDetectedKey(null);
    setConfidence(0); setTop3([]); setBufSize(0); setShowModal(false);
    setDoubleMsg('Show both hands to the camera');
  }, [doCleanup]);

  // ── Switch mode — stop camera first ───────────────────────
  const switchMode = (m) => {
    if (m === mode) return;
    unlock(); // Enable voice engine on mode switch
    stopCamera();
    setMode(m);
    setDetectedKey(null);
    setTop3([]);
    setBufSize(0);
  };

  // ── Main loop ──────────────────────────────────────────────
  useEffect(() => {
    if (!cameraOn || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
    const loop = async () => {
      if (videoRef.current?.readyState >= 2 && handsRef.current)
        await handsRef.current.send({ image: videoRef.current }).catch(() => {});
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    const detect = mode === 'single' ? runSingleDetection : runDoubleDetection;
    intervalRef.current = setInterval(detect, mode === 'single' ? 150 : 300);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(intervalRef.current); };
  }, [cameraOn, mode, runSingleDetection, runDoubleDetection]);

  // ── Derived ────────────────────────────────────────────────
  const mudra      = detectedKey ? (mode === 'single' ? MUDRA_DATA[detectedKey] : DOUBLE_MUDRA_DATA[detectedKey]) : null;
  const isDetected = !!(detectedKey && mudra);
  const bufFull    = bufSize >= STABILITY_THRESHOLD;
  const status     = !cameraOn ? 'idle' : !handPresent ? 'no_hand' : isDetected ? 'detected' : bufFull ? 'no_mudra' : 'analyzing';

  const si         = STATUS[status];
  const confColor  = confidence >= 70 ? '#34d399' : confidence >= 45 ? '#fbbf24' : '#ef4444';
  const accentColor = mode === 'single' ? 'var(--accent)' : '#10B981';
  const skeletonColor = mode === 'single' ? 'var(--accent)' : '#10B981';

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card2)] mb-4 shadow-sm border border-[var(--border)]">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-[var(--accent)]">Premium AI Detection</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">Mudra Detect</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Real-time hand gesture recognition powered by GestureIQ AI.
          </p>
        </div>

        {/* ── Mode Toggle ── */}
        <div className="flex justify-center mb-8">
          <div className="flex p-1 rounded-2xl bg-white border border-slate-200 shadow-md gap-1">
            <button
              onClick={() => switchMode('single')}
              className="px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all"
              style={{
                background: mode === 'single' ? 'linear-gradient(135deg, #8B1A1A, #5D1111)' : 'transparent',
                color: mode === 'single' ? '#fff' : 'var(--text-muted)',
              }}>
              ✋ Single Hand
            </button>
            <button
              onClick={() => switchMode('double')}
              className="px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all"
              style={{
                background: mode === 'double' ? 'linear-gradient(135deg, #059669, #047857)' : 'transparent',
                color: mode === 'double' ? '#fff' : '#94A3B8',
              }}>
              🤲 Double Hand
            </button>
          </div>
        </div>

        {/* ── Mode description ── */}
        {mode === 'double' && (
          <div className="max-w-2xl mx-auto mb-6 px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-xs font-bold text-emerald-700">
              🤲 Show <strong>both hands</strong> simultaneously — detects 23 Samyuta (double-hand) Bharatanatyam mudras
            </p>
          </div>
        )}

        {!engineOk && (
          <div className="mb-6 max-w-2xl mx-auto px-6 py-4 rounded-3xl border shadow-lg flex items-center justify-between gap-4"
            style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-700">AI Engine Offline</p>
                <p className="text-[10px] text-red-500 font-medium">Ensure your Flask server is running on port 5001.</p>
              </div>
            </div>
            <button onClick={() => { setEngineOk(true); engineErrCount.current = 0; }}
              className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-200 hover:bg-red-50">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Camera ── */}
          <div className="lg:col-span-8">
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl bg-slate-900"
              style={{
                height: '65vh', minHeight: '480px',
                border: isDetected ? `4px solid ${accentColor}` : '4px solid var(--border)',
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isDetected ? `0 0 40px ${accentColor}40` : undefined,
              }}>
              {cameraOn ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                  <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />

                  {/* Status */}
                  <div className="absolute top-6 left-6 flex items-center gap-3 px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/20 bg-white/10 shadow-lg">
                    <div className={`w-2 h-2 rounded-full ${si.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: si.color }} />
                    <span className="text-[10px] text-white font-bold uppercase tracking-[2px]">
                      {mode === 'double' && !isDetected ? doubleMsg : si.label}
                    </span>
                  </div>

                  {/* Detected pill */}
                  {isDetected && (
                    <div className="absolute top-6 right-6">
                      <div className="px-6 py-3 rounded-2xl backdrop-blur-2xl text-right shadow-2xl border border-white/20"
                        style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                        <div className="text-[9px] uppercase tracking-[3px] text-white/60 mb-1 font-bold">Identified</div>
                        <div className="text-2xl font-black text-white uppercase tracking-tight">{mudra?.name}</div>
                        <div className="text-[10px] italic text-white/80">{mudra?.meaning}</div>
                      </div>
                    </div>
                  )}

                  {/* No hand prompt */}
                  {status === 'no_hand' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center space-y-4 animate-bounce">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto backdrop-blur-md border border-white/20">
                          <span className="text-4xl">{mode === 'double' ? '🤲' : '✋'}</span>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-white font-black drop-shadow-lg">
                          {mode === 'double' ? 'Show both hands' : 'Show your hand'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Analyzer bar */}
                  {status === 'analyzing' && (
                    <div className="absolute bottom-20 left-10 right-10 pointer-events-none">
                      <div className="flex justify-between items-center mb-2 px-2">
                        <span className="text-[10px] font-black uppercase tracking-[3px] text-white/80">Analyzing Signature...</span>
                        <span className="text-[10px] font-mono text-white/50">{bufSize}/{STABILITY_THRESHOLD}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${(bufSize / STABILITY_THRESHOLD) * 100}%`, background: mode === 'double' ? 'linear-gradient(to right, #10B981, #34D399)' : 'linear-gradient(to right, #7C3AED, #A78BFA)' }} />

                      </div>
                    </div>
                  )}

                  {/* Bottom HUD */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-5 backdrop-blur-2xl"
                    style={{ backgroundColor: 'rgba(15,23,42,0.8)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Mode</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                          style={{ color: mode === 'double' ? '#10B981' : '#A78BFA' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mode === 'double' ? '#10B981' : '#A78BFA', boxShadow: `0 0 8px ${mode === 'double' ? '#10B981' : '#A78BFA'}80` }} />
                          {mode === 'double' ? 'Double Hand' : 'Single Hand'}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Confidence</span>
                        <span className="text-sm font-black text-white">{Math.round(confidence)}%</span>
                      </div>
                    </div>
                    <button onClick={stopCamera}
                      className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all">
                      Stop Camera
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-32 h-32 rounded-[40px] bg-[var(--bg-card2)] flex items-center justify-center mb-8 border border-[var(--border)] shadow-inner">
                    <span className="text-5xl">{mode === 'double' ? '🤲' : '👋'}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">
                    {mode === 'double' ? 'Double Hand Detection' : 'AI Recognition Shield'}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-10">
                    {mode === 'double'
                      ? 'Show both hands simultaneously to detect 23 Samyuta (double-hand) Bharatanatyam mudras.'
                      : 'Identify any hand gesture using your webcam. Trained on 27 classical Asamyuta mudras.'}
                  </p>
                  <button onClick={startCamera}
                    className="px-12 py-5 rounded-3xl text-white text-[12px] font-black tracking-[4px] uppercase transition-all hover:scale-[1.05] hover:shadow-2xl"
                    style={{ background: mode === 'double' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: `0 20px 40px ${accentColor}40` }}>
                    Start Detection
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Results Card */}
            <div className="rounded-[40px] p-8 border shadow-xl transition-all duration-700 bg-white"
              style={{
                borderColor: isDetected ? (mode === 'double' ? '#6EE7B7' : '#A78BFA') : '#E2E8F0',
                boxShadow: isDetected ? `0 20px 50px ${accentColor}20` : '0 10px 30px rgba(0,0,0,0.02)',
              }}>
              <div className="flex items-center justify-between mb-8">
                <span className="text-[10px] font-black uppercase tracking-[4px] text-slate-400">Target Intel</span>
                {isDetected && (
                  <div className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                    style={{ background: mode === 'double' ? '#ECFDF5' : '#F5F3FF', color: mode === 'double' ? '#065F46' : '#5B21B6' }}>
                    {mode === 'double' ? '🤲 Samyuta' : '✋ Asamyuta'}
                  </div>
                )}
              </div>

              {isDetected && mudra ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl shrink-0 shadow-sm border"
                      style={{ background: mode === 'double' ? '#ECFDF5' : 'var(--bg)', borderColor: mode === 'double' ? '#A7F3D0' : 'var(--border)' }}>
                      {mudra.symbol}
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 leading-none mb-1 tracking-tighter uppercase">{mudra.name}</h2>
                      <p className="text-sm font-bold italic" style={{ color: accentColor }}>{mudra.meaning}</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[2px] text-slate-400">
                      <span>AI Signature Match</span>
                      <span style={{ color: confColor }}>{Math.round(confidence)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.round(confidence)}%`, background: confColor }} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-2">Usage in Dance</h4>
                    <p className="text-[11px] font-bold text-slate-800 p-3 rounded-2xl border"
                      style={{ background: mode === 'double' ? '#ECFDF5' : 'var(--bg)', borderColor: mode === 'double' ? '#A7F3D0' : 'var(--border)' }}>
                      {mudra.usage}
                    </p>
                  </div>

                  <button onClick={() => { setModalMudra({ ...mudra, isDouble: mode === 'double' }); setShowModal(true); }}
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white shadow-lg hover:opacity-90"
                    style={{ background: mode === 'double' ? 'linear-gradient(135deg, #059669, #047857)' : '#0F172A' }}>
                    Explore Full Mudra
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-3xl opacity-40">
                    {mode === 'double' ? '🤲' : '🤲'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">
                      {status === 'analyzing' ? 'Reading...' : 'Awaiting Input'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[2px]">
                      {mode === 'double' ? 'Show both hands simultaneously' : 'Show a hand gesture to identify'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Top Predictions */}
            {cameraOn && top3.length > 0 && (
              <div className="rounded-[40px] p-8 bg-white border border-slate-100 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[4px] text-slate-400 mb-6">Top Probabilities</h3>
                <div className="space-y-5">
                  {top3.map((p, i) => {
                    const d = mode === 'single' ? MUDRA_DATA[p.name] : DOUBLE_MUDRA_DATA[p.name];
                    const isWinner = i === 0 && isDetected;
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-[10px] font-black p-2 rounded-xl bg-slate-50 text-slate-400 w-8 h-8 flex items-center justify-center">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] font-black text-slate-700 capitalize">{d?.name || p.name}</span>
                            <span className="text-[10px] font-black" style={{ color: isWinner ? accentColor : '#94A3B8' }}>{p.conf?.toFixed(0) ?? Math.round(p.conf ?? 0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, p.conf || 0)}%`, background: isWinner ? `linear-gradient(to right, ${accentColor}, ${accentColor}99)` : '#CBD5E1' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guide */}
            {!cameraOn && (
              <div className="rounded-[40px] p-8 bg-white border border-slate-100 shadow-xl space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[4px] text-slate-400">Quick Guide</h3>
                <div className="space-y-4">
                  {(mode === 'single' ? [
                    { icon: '🎥', title: 'Allow Camera', desc: 'Secure local processing only.' },
                    { icon: '👋', title: 'Position Hand', desc: 'Keep hand visible in center.' },
                    { icon: '📖', title: 'Learn Meaning', desc: 'AI provides usage & context.' },
                  ] : [
                    { icon: '🎥', title: 'Allow Camera', desc: 'Secure local processing only.' },
                    { icon: '🤲', title: 'Both Hands', desc: 'Show both hands simultaneously.' },
                    { icon: '📖', title: '23 Samyuta', desc: 'Detects double-hand mudras.' },
                  ]).map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">{step.icon}</div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{step.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && modalMudra && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(16px)' }}
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[48px] p-10 max-w-xl w-full relative shadow-2xl overflow-hidden scale-in-center"
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-32 opacity-5"
              style={{ background: modalMudra.isDouble ? 'linear-gradient(135deg, #059669, #34D399)' : 'linear-gradient(135deg, #7C3AED, #EC4899)' }} />
            <div className="flex items-center gap-6 mb-10 relative">
              <div className="w-24 h-24 rounded-[32px] bg-white shadow-2xl flex items-center justify-center text-6xl border border-slate-100 transform -rotate-3 hover:rotate-0 transition-all duration-500">
                {modalMudra.symbol}
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-1 uppercase">{modalMudra.name}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: modalMudra.isDouble ? '#10B981' : '#7C3AED' }} />
                  <p className="text-sm font-bold uppercase tracking-widest" style={{ color: modalMudra.isDouble ? '#059669' : '#7C3AED' }}>{modalMudra.meaning}</p>
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {modalMudra.isDouble ? '🤲 Samyuta Hasta' : '✋ Asamyuta Hasta'}
                </div>
              </div>
              <button onClick={() => setShowModal(false)}
                className="absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">✕</button>
            </div>
            <div className="space-y-8 relative">
              {modalMudra.description && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[4px] text-slate-400 mb-4">Mudra Context</h4>
                  <p className="text-base text-slate-600 leading-relaxed font-serif">{modalMudra.description}</p>
                </div>
              )}
              <div className="p-6 rounded-[32px] border"
                style={{ background: modalMudra.isDouble ? '#ECFDF5' : 'var(--bg)', borderColor: modalMudra.isDouble ? '#A7F3D0' : 'var(--border)' }}>
                <h4 className="text-[10px] font-black uppercase tracking-[4px] mb-3" style={{ color: modalMudra.isDouble ? '#059669' : 'var(--accent)' }}>Ritual Usage</h4>
                <p className="text-sm font-black italic leading-relaxed" style={{ color: modalMudra.isDouble ? '#065F46' : 'var(--accent)' }}>{modalMudra.usage}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-full py-5 rounded-[24px] text-white font-black text-[10px] uppercase tracking-[4px] transition-all hover:scale-[1.02] shadow-2xl"
                style={{ background: modalMudra.isDouble ? 'linear-gradient(135deg, #059669, #047857)' : '#0F172A' }}>
                Return to Recognition
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scale-in-center { animation: scale-in-center 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes scale-in-center { 0%{transform:scale(0.95);opacity:0} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}
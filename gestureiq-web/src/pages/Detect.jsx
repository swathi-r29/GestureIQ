// src/pages/Detect.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }     from '../context/AuthContext';
import BorderPattern   from '../components/BorderPattern';

const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

const MUDRA_DATA = {
  pataka:       { name: 'Pataka',       meaning: 'Flag',               description: 'The Pataka mudra represents a flag, clouds, forest, beginning of dance, and river. It is one of the most fundamental mudras in Bharatanatyam, used to depict blessing, a forest, the sea, and the night sky.', usage: 'Clouds, forest, river, blessing', symbol: '🏳️' },
  tripataka:    { name: 'Tripataka',    meaning: 'Three-part Flag',    description: 'Tripataka is derived from Pataka with the ring finger bent. It represents a crown, tree, lamp flame, and arrow. Used widely in storytelling sequences to depict royalty and divine objects.', usage: 'Crown, tree, lamp flame, arrow', symbol: '🌿' },
  ardhapataka:  { name: 'Ardhapataka', meaning: 'Half Flag',           description: 'Ardhapataka represents a knife, two leaves, and river banks. This mudra is formed by bending the ring and little fingers while keeping the other two straight.', usage: 'Knife, two leaves, river banks', symbol: '🍃' },
  kartarimukha: { name: 'Kartarimukha', meaning: 'Scissors Face',      description: 'Kartarimukha resembles scissor blades and is used to depict separation, the corner of an eye, death, and lightning. A powerful expressive mudra in classical dance.', usage: 'Separation, lightning, corner of eye', symbol: '✂️' },
  mayura:       { name: 'Mayura',       meaning: 'Peacock',            description: 'Mayura represents the graceful peacock, and is used for applying tilak on forehead, a braid, and gentle touch. The thumb touches the ring finger base while others remain extended.', usage: 'Applying tilak, braid, gentle touch', symbol: '🦚' },
  ardhachandra: { name: 'Ardhachandra', meaning: 'Half Moon',          description: 'Ardhachandra depicts the crescent moon, a plate, and the beginning of prayer. All fingers are straight and the thumb is extended sideways. Used to show the moon and divine blessing.', usage: 'Moon, plate, beginning prayer', symbol: '🌙' },
  arala:        { name: 'Arala',        meaning: 'Bent',               description: 'Arala represents drinking nectar or poison, the wind, and blessings. Only the index finger is bent while others remain straight. Used in storytelling of Lord Shiva drinking poison.', usage: 'Drinking nectar, wind, poison', symbol: '💨' },
  shukatunda:   { name: 'Shukatunda',  meaning: 'Parrot Beak',        description: 'Shukatunda resembles a parrot\'s beak and represents shooting an arrow and pointing direction. The thumb presses against the ring finger base while other fingers are extended.', usage: 'Shooting arrow, direction', symbol: '🦜' },
  mushti:       { name: 'Mushti',       meaning: 'Fist',               description: 'Mushti is a tight fist representing grasping, wrestling, and holding hair. It symbolizes strength and determination. Used in depicting warriors and fierce characters.', usage: 'Grasping, wrestling, holding hair', symbol: '✊' },
  shikhara:     { name: 'Shikhara',     meaning: 'Spire / Peak',       description: 'Shikhara represents a temple spire, the husband, Shiva, and a pillar. The thumb is raised while all other fingers form a fist. A deeply spiritual mudra in classical tradition.', usage: 'Bow, pillar, husband, Shiva', symbol: '🏛️' },
  kapittha:     { name: 'Kapittha',     meaning: 'Wood Apple',         description: 'Kapittha represents Goddess Lakshmi holding a lotus, Saraswati holding a veena, and cymbals. It is a mudra of abundance and divine feminine energy.', usage: 'Lakshmi, Saraswati, holding cymbals', symbol: '🌸' },
  katakamukha:  { name: 'Katakamukha', meaning: 'Bracelet Opening',   description: 'Katakamukha depicts picking flowers, stringing a garland, and pulling a bow. The thumb, index, and middle fingertips come together while the remaining fingers are extended.', usage: 'Picking flowers, garland, pulling bow', symbol: '💐' },
  suchi:        { name: 'Suchi',        meaning: 'Needle',             description: 'Suchi represents the universe, the number one, and pointing to a single truth. Only the index finger is raised straight up while others are curled. A mudra of singular focus.', usage: 'Universe, number one, the city', symbol: '☝️' },
  chandrakala:  { name: 'Chandrakala',  meaning: 'Crescent Moon',      description: 'Chandrakala represents Shiva\'s crescent moon ornament and a forehead mark. The index finger and thumb are extended while middle, ring, and little fingers curl inward.', usage: "Shiva's moon, forehead mark", symbol: '🌛' },
  padmakosha:   { name: 'Padmakosha',  meaning: 'Lotus Bud',          description: 'Padmakosha represents a lotus bud, an apple, and a round ball. All fingers are curved inward like a cup to form the shape of a blooming lotus. A symbol of creation and beauty.', usage: 'Apple, round ball, lotus', symbol: '🪷' },
  sarpashira:   { name: 'Sarpashira',  meaning: 'Snake Head',         description: 'Sarpashira imitates the hood of a cobra and represents gentle touch, swimming, and the movement of a snake. All fingers are straight and pressed together with a slight curve.', usage: 'Gentle touch, swimming, snake', symbol: '🐍' },
  mrigashira:   { name: 'Mrigashira',  meaning: 'Deer Head',          description: 'Mrigashira represents the head of a deer, forest animals, and the gentle touch of a woman. The middle three fingers curl while thumb and little finger extend outward.', usage: 'Deer, forest, gentle touch, woman', symbol: '🦌' },
  simhamukha:   { name: 'Simhamukha',  meaning: 'Lion Face',          description: 'Simhamukha depicts the face of a lion, a horse, and fearless power. The index and little fingers are extended while the middle and ring fingers curl inward. Represents divine ferocity.', usage: 'Lion, horse, fearlessness, power', symbol: '🦁' },
  kangula:      { name: 'Kangula',      meaning: 'Bell',               description: 'Kangula represents a bell, fruit, and drops of water. The thumb touches the ring fingertip while index, middle, and little fingers are extended. A delicate and musical mudra.', usage: 'Bell, fruit, drop of water', symbol: '🔔' },
  alapadma:     { name: 'Alapadma',    meaning: 'Full Bloomed Lotus',  description: 'Alapadma is the fully bloomed lotus, representing full moon, beauty, a lake, and a disc. All five fingers are spread wide apart and slightly curved like petals of a blooming flower.', usage: 'Full moon, beauty, lake, disc', symbol: '🌺' },
  chatura:      { name: 'Chatura',      meaning: 'Clever / Wise',      description: 'Chatura represents cleverness, gold, wind, and slight movement. The thumb curls inward while index, middle, and ring fingers extend upward. Used to depict intellectual and subtle qualities.', usage: 'Gold, wind, slight movement', symbol: '🧠' },
  bhramara:     { name: 'Bhramara',    meaning: 'Bee',                 description: 'Bhramara imitates a bee and represents a bee, a bird, and the six seasons. The thumb touches the middle fingertip while the index finger bends and ring and little fingers extend.', usage: 'Bee, bird, six seasons', symbol: '🐝' },
  hamsasya:     { name: 'Hamsasya',    meaning: 'Swan Beak',           description: 'Hamsasya depicts the beak of a swan and represents a pearl, tying a thread, and the number five. All fingertips come together in a delicate pinch, like a swan gently picking at water.', usage: 'Pearl, tying thread, number five', symbol: '🦢' },
  hamsapaksha:  { name: 'Hamsapaksha', meaning: 'Swan Wing',          description: 'Hamsapaksha represents the wing of a swan and gentle waving motion. All fingers are slightly spread and curved at different angles to create a flowing, wing-like appearance.', usage: 'Swan, number six, gentle waving', symbol: '🕊️' },
  sandamsha:    { name: 'Sandamsha',   meaning: 'Tongs',               description: 'Sandamsha depicts tongs, a crab claw, and picking flowers. The index and middle fingertips are pinched together tightly while ring and little fingers curl inward.', usage: 'Picking flowers, tongs, crab claw', symbol: '🦀' },
  mukula:       { name: 'Mukula',       meaning: 'Flower Bud',         description: 'Mukula represents a flower bud, eating, and the navel. All five fingertips come together to form a closed bud shape. Used in rituals of offering food and depicting natural beauty.', usage: 'Lotus bud, eating, navel', symbol: '🌷' },
  tamrachuda:   { name: 'Tamrachuda',  meaning: 'Rooster Crest',      description: 'Tamrachuda represents a rooster, peacock, and bird crest. The thumb and little finger are raised straight up while index, middle, and ring fingers curl into the palm.', usage: 'Rooster, peacock, bird crest', symbol: '🐓' },
  trishula:     { name: 'Trishula',    meaning: 'Trident',             description: 'Trishula represents Lord Shiva\'s sacred trident and the three paths of dharma. Index, middle, and ring fingers extend upward while the thumb and little finger curl inward.', usage: "Shiva's trident, three paths", symbol: '🔱' },
};

const scoreColor = (s) => s >= 75 ? '#059669' : s >= 50 ? '#D97706' : '#DC2626';
const scoreBg   = (s) => s >= 75 ? '#ECFDF5' : s >= 50 ? '#FFFBEB' : '#FEF2F2';
const scoreBorder = (s) => s >= 75 ? '#A7F3D0' : s >= 50 ? '#FDE68A' : '#FECACA';

const STATUS = {
  idle:      { label: 'Camera Off',        color: '#94A3B8', pulse: false },
  no_hand:   { label: 'Show Your Hand',    color: '#94A3B8', pulse: false },
  analyzing: { label: 'Analyzing…',        color: '#D97706', pulse: true  },
  detected:  { label: 'Mudra Identified',  color: '#059669', pulse: true  },
  no_mudra:  { label: 'No Mudra Detected', color: '#64748B', pulse: false },
};

export default function Detect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cameraOn,    setCameraOn]    = useState(false);
  const [handPresent, setHandPresent] = useState(false);
  const [detectedKey, setDetectedKey] = useState(null);
  const [confidence,  setConfidence]  = useState(0);
  const [top3,        setTop3]        = useState([]);
  const [bufSize,     setBufSize]     = useState(0);
  const [engineOk,    setEngineOk]    = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [modalMudra,  setModalMudra]  = useState(null);

  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const handsRef     = useRef(null);
  const rafRef       = useRef(null);
  const intervalRef  = useRef(null);
  const landmarksRef = useRef(null);
  const bufferRef    = useRef([]);
  const inFlightRef  = useRef(false);
  const lockRef      = useRef({ name: null, until: 0 });
  const prevKeyRef   = useRef(null);
  const modalTimerRef  = useRef(null);
  const engineErrCount = useRef(0);

  const FLASK_URL   = (import.meta.env.VITE_FLASK_URL || '').replace(/\/$/, '');
  const BUFFER_SIZE = 8;
  const MIN_VOTES   = 7;
  const MIN_CONF    = 20;

  useEffect(() => {
    if (!user || user.role !== 'student') { navigate('/'); return; }
    return () => doCleanup();
  }, [user, navigate]);

  // Auto-show modal and Voice Announcement when new mudra detected
  useEffect(() => {
    window.speechSynthesis.cancel();
    if (detectedKey && detectedKey !== prevKeyRef.current) {
      prevKeyRef.current = detectedKey;
      const m = MUDRA_DATA[detectedKey];

      // Clear any pending modal timer
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);

      // Wait 1.5s hold before showing modal
      modalTimerRef.current = setTimeout(() => {
        setModalMudra(m);
        setShowModal(true);

        const text = `${m.name} mudra detected. ${m.meaning}. Used for ${m.usage}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang  = 'en-IN';
        utterance.rate  = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);

        // Auto-close after 4s
        modalTimerRef.current = setTimeout(() => setShowModal(false), 4000);
      }, 1500);

      return () => {
        if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
        window.speechSynthesis.cancel();
      };
    }
    
    if (!detectedKey) {
      prevKeyRef.current = null;
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
      setShowModal(false);
    }
  }, [detectedKey]);

  const doCleanup = useCallback(() => {
    if (rafRef.current)      cancelAnimationFrame(rafRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (handsRef.current)    { handsRef.current.close(); handsRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const initHands = useCallback(() => {
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
      if (results.multiHandLandmarks?.length > 0) {
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

  const runDetection = useCallback(async () => {
    if (inFlightRef.current) return;
    const lms = landmarksRef.current;
    if (!lms || lms.length !== 21) {
      setHandPresent(false);
      bufferRef.current = [];
      lockRef.current   = { name: null, until: 0 };
      setDetectedKey(null);
      prevKeyRef.current = null; // reset so modal can fire
      setConfidence(0);
      setBufSize(0);
      return;
    }
    setHandPresent(true);
    inFlightRef.current = true;
    try {
      const lmArray = Array.from(lms).map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
      const res = await fetch(`${FLASK_URL}/api/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landmarks: lmArray }), signal: AbortSignal.timeout(800),
      });
      if (!res.ok) throw new Error('Flask error');
      const json = await res.json();
      setEngineOk(true);
      engineErrCount.current = 0;
      const isValid = (json.confidence || 0) >= MIN_CONF && !!json.name;
      bufferRef.current.push(isValid ? json.name : '__none__');
      if (bufferRef.current.length > BUFFER_SIZE) bufferRef.current.shift();
      setBufSize(bufferRef.current.length);
      const votes = {};
      bufferRef.current.forEach(n => { votes[n] = (votes[n] || 0) + 1; });
      const sorted  = Object.entries(votes).sort((a, b) => b[1] - a[1]);
      const topName = sorted[0]?.[0] ?? '__none__';
      const topVot  = sorted[0]?.[1] ?? 0;
      const bufFull = bufferRef.current.length >= BUFFER_SIZE;
      const now     = Date.now();
      if (topVot >= MIN_VOTES && topName !== '__none__') {
        // If mudra changed, flush buffer so old votes don't linger
        if (lockRef.current.name && lockRef.current.name !== topName) {
           bufferRef.current = bufferRef.current.filter(n => n === topName);
        }
        lockRef.current = { name: topName, until: now + 800 };
        setDetectedKey(topName);
        const votes2 = bufferRef.current.filter(n => n === topName).length;
        setConfidence(Math.min(95, (votes2 / BUFFER_SIZE) * 100 + (json.confidence || 0) * 0.3));
      } else if (bufFull && now > lockRef.current.until) {
        setDetectedKey(null);
        setConfidence(0);
        lockRef.current = { name: null, until: 0 };
      }
      setTop3(json.top3 || []);
    } catch { 
      engineErrCount.current++;
      if (engineErrCount.current >= 3) setEngineOk(false);
    } finally { 
      inFlightRef.current = false; 
    }
  }, [FLASK_URL, MIN_CONF, MIN_VOTES, BUFFER_SIZE]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      streamRef.current = stream;
      initHands();
      setCameraOn(true);
    } catch {
      engineErrCount.current++;
      if (engineErrCount.current >= 3) setEngineOk(false);
      console.warn('[AI Engine] Unreachable or Camera denied.');
    }
  };

  const stopCamera = useCallback(() => {
    doCleanup();
    streamRef.current    = null;
    landmarksRef.current = null;
    bufferRef.current    = [];
    inFlightRef.current  = false;
    lockRef.current      = { name: null, until: 0 };
    prevKeyRef.current   = null;
    setCameraOn(false);
    setHandPresent(false);
    setDetectedKey(null);
    setConfidence(0);
    setTop3([]);
    setBufSize(0);
    setShowModal(false);
  }, [doCleanup]);

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
    intervalRef.current = setInterval(runDetection, 150);
    return () => { cancelAnimationFrame(rafRef.current); clearInterval(intervalRef.current); };
  }, [cameraOn, runDetection]);

  const mudra      = detectedKey ? MUDRA_DATA[detectedKey] : null;
  const isDetected = !!(detectedKey && mudra);
  const bufFull    = bufSize >= BUFFER_SIZE;
  const status     = !cameraOn ? 'idle' : !handPresent ? 'no_hand' : isDetected ? 'detected' : bufFull ? 'no_mudra' : 'analyzing';
  const si         = STATUS[status];
  const confColor  = confidence >= 70 ? '#34d399' : confidence >= 45 ? '#fbbf24' : '#ef4444';

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #EDE9FE 100%)' }}>
      <div className="max-w-7xl mx-auto">
        
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 mb-4 shadow-sm border border-violet-200">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[3px] text-violet-600">Premium AI Detection</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 mb-2">
            Mudra Detect
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Real-time hand gesture recognition powered by GestureIQ AI. 
            Show your hand to identify any Bharatanatyam mudra instantly.
          </p>
        </div>

        {!engineOk && (
          <div className="mb-6 max-w-2xl mx-auto px-6 py-4 rounded-3xl border shadow-lg flex items-center justify-between gap-4"
            style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-700">AI Engine Offline</p>
                <p className="text-[10px] text-red-500 font-medium">Ensure your Flask server is running on port 5001 or check your ngrok URL.</p>
              </div>
            </div>
            <button onClick={() => { setEngineOk(true); runDetection(); }}
              className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-200 hover:bg-red-50 transition-all">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left Side: Camera ── */}
          <div className="lg:col-span-8">
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl shadow-violet-200/50 bg-slate-900"
              style={{
                height: '65vh', minHeight: '480px',
                border: isDetected ? '4px solid #7C3AED' : '4px solid #DDD6FE',
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}>
              {cameraOn ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                  <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />

                  {/* Status Overlay */}
                  <div className="absolute top-6 left-6 flex items-center gap-3 px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/20 bg-white/10 shadow-lg">
                    <div className={`w-2 h-2 rounded-full ${si.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: si.color }} />
                    <span className="text-[10px] text-white font-bold uppercase tracking-[2px]">{si.label}</span>
                  </div>

                  {/* Prediction Pill Overlay */}
                  {isDetected && (
                    <div className="absolute top-6 right-6">
                      <div className="px-6 py-3 rounded-2xl backdrop-blur-2xl text-right shadow-2xl border border-white/20"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                        <div className="text-[9px] uppercase tracking-[3px] text-white/60 mb-1 font-bold">Identified</div>
                        <div className="text-2xl font-black text-white uppercase tracking-tight">{mudra?.name}</div>
                        <div className="text-[10px] italic text-white/80">{mudra?.meaning}</div>
                      </div>
                    </div>
                  )}

                  {/* Prompt: No Hand */}
                  {status === 'no_hand' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center space-y-4 animate-bounce">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto backdrop-blur-md border border-white/20">
                          <span className="text-4xl text-white">✋</span>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-white font-black drop-shadow-lg">Show your hand</p>
                      </div>
                    </div>
                  )}

                  {/* Analyzer Bar */}
                  {status === 'analyzing' && (
                    <div className="absolute bottom-20 left-10 right-10 pointer-events-none">
                      <div className="flex justify-between items-center mb-2 px-2">
                         <span className="text-[10px] font-black uppercase tracking-[3px] text-white/80">Analyzing Signature...</span>
                         <span className="text-[10px] font-mono text-white/50">{bufSize}/{BUFFER_SIZE}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                          style={{ width: `${(bufSize / BUFFER_SIZE) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Bottom HUD */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-5 backdrop-blur-2xl"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Mudra Engine</span>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                           Enabled
                        </span>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Confidence</span>
                        <span className="text-sm font-black text-white">{Math.round(confidence)}%</span>
                      </div>
                    </div>
                    <button onClick={stopCamera}
                      className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/30 text-red-400 transition-all hover:bg-red-500/20">
                      Stop Camera
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-32 h-32 rounded-[40px] bg-violet-100/50 flex items-center justify-center mb-8 border border-violet-100 shadow-inner">
                    <span className="text-5xl text-violet-300">👋</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">AI Recognition Shield</h3>
                  <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-10">
                    Identify any hand gesture using your webcam. Our AI is trained on 32+ classical Bharatanatyam mudras.
                  </p>
                  <button onClick={startCamera}
                    className="px-12 py-5 rounded-3xl text-white text-[12px] font-black tracking-[4px] uppercase transition-all hover:scale-[1.05] hover:shadow-2xl shadow-violet-500/40"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                    Start Detection
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Side: Insights ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Results Card */}
            <div className="rounded-[40px] p-8 border shadow-xl transition-all duration-700 relative overflow-hidden bg-white"
              style={{
                borderColor: isDetected ? '#A78BFA' : '#E2E8F0',
                boxShadow: isDetected ? '0 20px 50px rgba(124, 58, 237, 0.12)' : '0 10px 30px rgba(0,0,0,0.02)',
              }}>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[10px] font-black uppercase tracking-[4px] text-slate-400">Target Intel</span>
                  {isDetected && (
                    <div className="px-2 py-0.5 rounded-full bg-emerald-100 text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                       Optimal Match
                    </div>
                  )}
                </div>

                {isDetected && mudra ? (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center text-4xl shrink-0 shadow-sm">
                        {mudra.symbol}
                      </div>
                      <div>
                        <h2 className="text-4xl font-black text-slate-900 leading-none mb-1 tracking-tighter uppercase">
                          {mudra.name}
                        </h2>
                        <p className="text-sm text-violet-500 font-bold italic">{mudra.meaning}</p>
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[2px] text-slate-400">
                         <span>AI Signature Match</span>
                         <span style={{ color: confColor }}>{Math.round(confidence)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.round(confidence)}%`, background: confColor }} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-2">Description</h4>
                        <p className="text-xs leading-relaxed text-slate-600">{mudra.description.substring(0, 150)}...</p>
                      </div>
                      <div className="pt-4 border-t border-slate-100">
                         <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-2">Usage in Dance</h4>
                         <p className="text-[11px] font-bold text-slate-800 bg-violet-50/50 p-3 rounded-2xl border border-violet-100/50">{mudra.usage}</p>
                      </div>
                    </div>

                    <button onClick={() => { setModalMudra(mudra); setShowModal(true); }}
                      className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-slate-900 text-white hover:bg-slate-800 shadow-lg">
                      Explore Full Mudra
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-3xl opacity-40">
                       🤲
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">
                        {status === 'analyzing' ? 'Reading...' : 'Awaiting Input'}
                      </h2>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[2px]">
                        Show a hand gesture to identify
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Predictions Card */}
            {cameraOn && top3.length > 0 && (
              <div className="rounded-[40px] p-8 bg-white border border-slate-100 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[4px] text-slate-400 mb-6">Top Probabilities</h3>
                <div className="space-y-5">
                  {top3.map((p, i) => {
                    const d = MUDRA_DATA[p.name];
                    const isWinner = i === 0 && isDetected;
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-[10px] font-black p-2 rounded-xl bg-slate-50 text-slate-400 w-8 h-8 flex items-center justify-center">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] font-black text-slate-700 capitalize">
                              {d?.name || p.name}
                            </span>
                            <span className="text-[10px] font-black" style={{ color: isWinner ? '#7C3AED' : '#94A3B8' }}>
                              {p.conf.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, p.conf)}%`, background: isWinner ? 'linear-gradient(to right, #7C3AED, #A78BFA)' : '#CBD5E1' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Guide Card */}
            {!cameraOn && (
              <div className="rounded-[40px] p-8 bg-white border border-slate-100 shadow-xl space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[4px] text-slate-400">Quick Guide</h3>
                 <div className="space-y-4">
                    {[
                      { icon: '🎥', title: 'Allow Camera', desc: 'Secure local processing only.' },
                      { icon: '👋', title: 'Position Hand', desc: 'Keep hand visible in center.' },
                      { icon: '📖', title: 'Learn Meaning', desc: 'AI provides usage & context.' }
                    ].map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                           {step.icon}
                        </div>
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

      {/* ── Modal Overlay ── */}
      {showModal && modalMudra && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(16px)' }}
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[48px] p-10 max-w-xl w-full relative shadow-2xl overflow-hidden scale-in-center"
            onClick={e => e.stopPropagation()}>
            
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-violet-600 to-fuchsia-600 opacity-5" />

            {/* Header */}
            <div className="flex items-center gap-6 mb-10 relative">
              <div className="w-24 h-24 rounded-[32px] bg-white shadow-2xl flex items-center justify-center text-6xl border border-slate-100 transform -rotate-3 hover:rotate-0 transition-all duration-500">
                {modalMudra.symbol}
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-1 uppercase">
                  {modalMudra.name}
                </h2>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">{modalMudra.meaning}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)}
                className="absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-8 relative">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[4px] text-slate-400 mb-4">Mudra Context</h4>
                <p className="text-base text-slate-600 leading-relaxed font-serif">
                  {modalMudra.description}
                </p>
              </div>

              <div className="p-6 rounded-[32px] bg-violet-50 border border-violet-100">
                <h4 className="text-[10px] font-black uppercase tracking-[4px] text-violet-400 mb-3">Ritual Usage</h4>
                <p className="text-sm font-black text-violet-700 italic leading-relaxed">
                  {modalMudra.usage}
                </p>
              </div>

              <button onClick={() => setShowModal(false)}
                className="w-full py-5 rounded-[24px] bg-slate-900 text-white font-black text-[10px] uppercase tracking-[4px] transition-all hover:bg-slate-800 hover:scale-[1.02] shadow-2xl">
                Return to Recognition
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scale-in-center { animation: scale-in-center 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes scale-in-center {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
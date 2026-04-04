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

const FLASK_URL   = (import.meta.env.VITE_FLASK_URL || '').replace(/\/$/, '');
const BUFFER_SIZE = 10;
const MIN_VOTES   = 6;
const MIN_CONF    = 20;

const STATUS = {
  idle:      { label: 'Camera Off',        color: 'var(--text-muted)', pulse: false },
  no_hand:   { label: 'Show Your Hand',    color: 'var(--text-muted)', pulse: false },
  analyzing: { label: 'Analyzing…',        color: '#fbbf24',               pulse: true  },
  detected:  { label: 'Mudra Identified',  color: '#f59e0b',               pulse: true  },
  no_mudra:  { label: 'No Mudra Detected', color: '#6b7280',               pulse: false },
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

  useEffect(() => {
    if (!user || user.role !== 'student') { navigate('/'); return; }
    return () => doCleanup();
  }, []);

  // Auto-show modal and Voice Announcement when new mudra detected
  useEffect(() => {
    // Always cancel ongoing speech immediately on state change
    window.speechSynthesis.cancel();

    if (detectedKey && detectedKey !== prevKeyRef.current) {
      prevKeyRef.current = detectedKey;
      const m = MUDRA_DATA[detectedKey];
      setModalMudra(m);
      setShowModal(true);

      // Create and configure the speech utterance
      const text = `${m.name} mudra detected. ${m.meaning}. Used for ${m.usage}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang  = 'en-IN';
      utterance.rate  = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);

      const t = setTimeout(() => setShowModal(false), 4000);
      return () => {
        clearTimeout(t);
        window.speechSynthesis.cancel();
      };
    }
    
    if (!detectedKey) {
      prevKeyRef.current = null;
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
        drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#f59e0b', lineWidth: 3 });
        drawLandmarks(ctx, lms, { color: '#ffffff', lineWidth: 1, radius: 2 });
      } else {
        landmarksRef.current = null;
      }
      ctx.restore();
    });
    handsRef.current = h;
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      streamRef.current = stream;
      initHands();
      setCameraOn(true);
    } catch {
      alert('Camera permission denied. Please allow camera access and use HTTPS.');
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
  }, [cameraOn]);

  const runDetection = useCallback(async () => {
    if (inFlightRef.current) return;
    const lms = landmarksRef.current;
    if (!lms || lms.length !== 21) {
      setHandPresent(false);
      bufferRef.current = [];
      lockRef.current   = { name: null, until: 0 };
      setDetectedKey(null);
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
    } catch { setEngineOk(false); }
    finally { inFlightRef.current = false; }
  }, []);

  const mudra      = detectedKey ? MUDRA_DATA[detectedKey] : null;
  const isDetected = !!(detectedKey && mudra);
  const bufFull    = bufSize >= BUFFER_SIZE;
  const status     = !cameraOn ? 'idle' : !handPresent ? 'no_hand' : isDetected ? 'detected' : bufFull ? 'no_mudra' : 'analyzing';
  const si         = STATUS[status];
  const confColor  = confidence >= 70 ? '#34d399' : confidence >= 45 ? '#fbbf24' : '#ef4444';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen" style={{ fontFamily: "'Georgia', serif" }}>
      <style>{`
        .detect-text { color: var(--text) !important; }
        .detect-muted { color: var(--text-muted) !important; }
      `}</style>

      {/* ── Header ── */}
      <div className="text-center mb-10">
        <div className="text-[10px] tracking-[8px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
          Live AI Recognition · Both Hands
        </div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
          Mudra Detect
        </h1>
        <div className="max-w-xs mx-auto mt-3"><BorderPattern /></div>
        <p className="text-xs mt-3 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Show any Bharatanatyam hand gesture — the AI names it instantly.
          Works with left <em>and</em> right hand.
        </p>
      </div>

      {!engineOk && (
        <div className="mb-4 px-4 py-3 rounded-xl border text-xs font-bold text-center"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#ef4444' }}>
          ⚠ AI Engine offline — ensure Flask is running on port 5001
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Camera ── */}
        <div className="lg:col-span-8">
          <div className="relative rounded-2xl overflow-hidden border"
            style={{
              height: '62vh', minHeight: '440px', backgroundColor: '#060606',
              borderColor: isDetected ? 'rgba(245,158,11,0.50)' : handPresent ? 'rgba(255,255,255,0.10)' : 'var(--border)',
              boxShadow: isDetected ? '0 0 60px rgba(245,158,11,0.14)' : 'none',
              transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
            }}>
            {cameraOn ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }} />

                {/* Live badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[8px] text-white/60 uppercase tracking-[3px] font-bold">Live · AI Detection</span>
                </div>

                {/* Detected overlay top-right */}
                {isDetected && (
                  <div className="absolute top-4 right-4">
                    <div className="px-4 py-2.5 rounded-xl backdrop-blur-md text-right"
                      style={{ backgroundColor: 'rgba(0,0,0,0.88)', border: '1px solid rgba(245,158,11,0.4)' }}>
                      <div className="text-[8px] uppercase tracking-[3px] mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Detected</div>
                      <div className="text-lg font-black uppercase tracking-tight" style={{ color: '#fbbf24' }}>{mudra?.name}</div>
                      <div className="text-[9px] italic" style={{ color: 'rgba(245,158,11,0.55)' }}>{mudra?.meaning}</div>
                    </div>
                  </div>
                )}

                {/* Center states */}
                {status === 'no_hand' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center opacity-25">
                      <div className="text-6xl mb-3">✋</div>
                      <p className="text-[10px] uppercase tracking-widest text-white font-bold">Show your hand to the camera</p>
                    </div>
                  </div>
                )}
                {status === 'analyzing' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="px-5 py-2.5 rounded-full backdrop-blur-md"
                      style={{ backgroundColor: 'rgba(0,0,0,0.72)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(251,191,36,0.8)' }}>
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        Analyzing gesture…
                      </div>
                    </div>
                  </div>
                )}
                {status === 'no_mudra' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="px-5 py-2.5 rounded-full backdrop-blur-md"
                      style={{ backgroundColor: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>No Mudra Detected</p>
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {status === 'analyzing' && (
                  <div className="absolute bottom-14 left-4 right-4 pointer-events-none">
                    <div className="h-0.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${(bufSize / BUFFER_SIZE) * 100}%`, backgroundColor: 'rgba(245,158,11,0.55)' }} />
                    </div>
                  </div>
                )}

                {/* ── MODAL CARD — pops up when mudra detected ── */}
                {showModal && modalMudra && (
                  <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none"
                    style={{ zIndex: 20 }}>
                    <div className="mx-4 rounded-2xl p-5 pointer-events-auto"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,10,5,0.97) 100%)',
                        border: '1px solid rgba(245,158,11,0.5)',
                        boxShadow: '0 0 40px rgba(245,158,11,0.2), 0 20px 60px rgba(0,0,0,0.8)',
                        maxWidth: '580px', width: '100%',
                        animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
                      }}>
                      <div className="flex items-start gap-4">
                        {/* Symbol */}
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-3xl"
                          style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                          {modalMudra.symbol}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-black uppercase tracking-tight" style={{ color: '#fbbf24' }}>
                              {modalMudra.name}
                            </h3>
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest"
                              style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: 'rgba(245,158,11,0.8)' }}>
                              {modalMudra.meaning}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            {modalMudra.description}
                          </p>
                          <div className="mt-2 pt-2 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                            <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'rgba(245,158,11,0.5)' }}>Usage</span>
                            <span className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.35)' }}>{modalMudra.usage}</span>
                          </div>
                        </div>
                        <button onClick={() => setShowModal(false)}
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3 backdrop-blur-xl"
                  style={{ backgroundColor: 'rgba(0,0,0,0.90)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${si.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: si.color }} />
                    <span className="text-[9px] uppercase tracking-[3px] font-bold" style={{ color: si.color }}>{si.label}</span>
                  </div>
                  <button onClick={stopCamera}
                    className="px-4 py-1.5 rounded text-[9px] uppercase tracking-widest font-bold border transition-all hover:bg-red-500/20"
                    style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#f87171' }}>
                    ■ Stop Camera
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center px-10 text-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 border"
                  style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.15)' }}>
                  <span className="text-4xl" style={{ color: 'rgba(245,158,11,0.4)' }}>◎</span>
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight" style={{ color: 'var(--text)' }}>Mudra Recognition</h3>
                <p className="text-xs leading-relaxed mb-8 max-w-xs" style={{ color: 'var(--text-muted)', opacity: 0.55 }}>
                  Show any Bharatanatyam hand gesture. The AI identifies it instantly — use either hand.
                </p>
                <button onClick={startCamera}
                  className="px-12 py-3.5 rounded-xl text-white text-[10px] tracking-[5px] uppercase font-bold hover:scale-105 transition-all shadow-xl"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  ▶ Start Camera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* Detection card */}
          <div className="rounded-2xl border p-6 relative overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: isDetected ? 'rgba(245,158,11,0.50)' : 'var(--border)',
              boxShadow: isDetected ? '0 0 60px rgba(245,158,11,0.14)' : 'none',
              minHeight: '280px',
              transition: 'all 0.6s ease',
            }}>
            {isDetected && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 15%, rgba(245,158,11,0.07) 0%, transparent 65%)' }} />
            )}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-5">
                <div className={`w-2.5 h-2.5 rounded-full ${si.pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: si.color }} />
                <span className="text-[8px] uppercase tracking-[4px] font-bold" style={{ color: si.color }}>{si.label}</span>
              </div>

              {isDetected && mudra ? (
                <>
                  {/* Symbol + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      {mudra.symbol}
                    </div>
                    <div>
                      <h2 className="font-black uppercase leading-none tracking-tighter"
                        style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: 'var(--accent)' }}>
                        {mudra.name}
                      </h2>
                      <p className="text-sm italic mt-0.5" style={{ color: 'var(--text-muted)' }}>{mudra.meaning}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {mudra.description.substring(0, 120)}…
                  </p>

                  {/* Confidence */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] uppercase tracking-[3px]" style={{ color: 'var(--text-muted)' }}>Confidence</span>
                      <span className="text-sm font-bold" style={{ color: confColor }}>{Math.round(confidence)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, confidence)}%`, backgroundColor: confColor }} />
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="text-[9px] uppercase tracking-[3px] mb-1" style={{ color: 'var(--text-muted)' }}>Usage in Dance</div>
                    <p className="text-[10px] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{mudra.usage}</p>
                  </div>

                  {/* Info button */}
                  <button onClick={() => { setModalMudra(mudra); setShowModal(true); }}
                    className="mt-3 w-full py-2 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all hover:opacity-80"
                    style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'rgba(245,158,11,0.8)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    View Full Description
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-5xl mb-4 opacity-30">🤲</div>
                  <h2 className="font-black uppercase tracking-tighter mb-2"
                    style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>
                    {status === 'no_mudra' ? 'No Mudra' : status === 'analyzing' ? '…' : '—'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {status === 'no_mudra' ? 'Adjust your hand and try again'
                     : status === 'analyzing' ? 'Reading your gesture…'
                     : cameraOn ? 'Show a mudra to detect' : 'Start camera to begin'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top predictions */}
          {cameraOn && top3.length > 0 && (
            <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="text-[9px] uppercase tracking-[4px] mb-3 font-bold" style={{ color: 'var(--text-muted)' }}>Top Predictions</div>
              <div className="space-y-2.5">
                {top3.map((p, i) => {
                  const d = MUDRA_DATA[p.name];
                  const isWinner = i === 0 && isDetected;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[9px] font-black w-4 text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] font-bold capitalize" style={{ color: isWinner ? 'var(--accent)' : 'var(--text)' }}>
                            {d?.name || p.name}
                          </span>
                          <span className="text-[9px] font-bold" style={{ color: isWinner ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {p.conf.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, p.conf)}%`, backgroundColor: isWinner ? 'var(--accent)' : 'rgba(255,255,255,0.14)' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* How it works */}
          {!cameraOn && (
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="text-[9px] uppercase tracking-[4px] mb-4 font-bold" style={{ color: 'var(--text-muted)' }}>How It Works</div>
              <div className="space-y-3.5">
                {[['①','Start Camera','Allow camera access in your browser'],
                  ['②','Show a Mudra','Use left or right hand — both work'],
                  ['③','AI Identifies','The mudra name + description appears instantly']
                ].map(([num, title, desc]) => (
                  <div key={num} className="flex gap-3 items-start">
                    <span className="text-base font-black shrink-0" style={{ color: 'var(--accent)' }}>{num}</span>
                    <div>
                      <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--text)' }}>{title}</div>
                      <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Full Modal Overlay ── */}
      {showModal && modalMudra && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowModal(false)}>
          <div className="rounded-3xl p-8 max-w-lg w-full relative"
            style={{
              background: 'linear-gradient(135deg, #0f0a08 0%, #1a0e06 50%, #0f0a08 100%)',
              border: '1px solid rgba(245,158,11,0.4)',
              boxShadow: '0 0 80px rgba(245,158,11,0.15), 0 40px 100px rgba(0,0,0,0.9)',
              animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
            onClick={e => e.stopPropagation()}>

            {/* Close */}
            <button onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}>✕</button>

            {/* Symbol */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                {modalMudra.symbol}
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight" style={{ color: '#fbbf24' }}>
                  {modalMudra.name}
                </h2>
                <p className="text-base italic mt-1" style={{ color: 'rgba(245,158,11,0.6)' }}>{modalMudra.meaning}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.3), transparent)' }} />

            {/* Description */}
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Georgia, serif' }}>
              {modalMudra.description}
            </p>

            {/* Usage tag */}
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <span className="text-[9px] uppercase tracking-widest font-black mt-0.5 shrink-0" style={{ color: 'rgba(245,158,11,0.6)' }}>Used For</span>
              <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.45)' }}>{modalMudra.usage}</p>
            </div>

            <button onClick={() => setShowModal(false)}
              className="mt-6 w-full py-3 rounded-xl text-[10px] uppercase tracking-[4px] font-bold transition-all hover:opacity-80"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: 'rgba(245,158,11,0.8)', border: '1px solid rgba(245,158,11,0.2)' }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
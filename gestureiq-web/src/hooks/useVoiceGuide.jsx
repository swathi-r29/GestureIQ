// src/hooks/useVoiceGuide.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Single source of truth — voice instructions come from MUDRA_CONFIG,
//         which is also used by Learn.jsx for the Finger Guide UI.
//
// FIX 2: Wrong mudra voice guard — fromResult() now checks is_stable before
//         ever speaking "Wrong mudra", preventing false Ardhachandra calls.
//
// Languages: English (en-IN), Tamil (ta-IN), Hindi (hi-IN),
//            Telugu (te-IN), Kannada (kn-IN), Malayalam (ml-IN)
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback, useEffect, useMemo } from 'react';

// ── Voice priority levels ─────────────────────────────────────────────────────
const PRIO = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    ULTRA: 4, // Non-interruptible Narrative
};

// =============================================================================
// SINGLE SOURCE OF TRUTH — Mudra config
// =============================================================================
export const MUDRA_CONFIG = {
    pataka: { fingers: "Hold all four fingers straight together and bend your thumb inward across your palm.", meaning: "Flag", usage: "Clouds, forest, river, blessing" },
    tripataka: { fingers: "Keep index, middle, and little fingers straight. Bend only your ring finger fully down toward your palm.", meaning: "Three parts of flag", usage: "Crown, tree, lamp flame, arrow" },
    ardhapataka: { fingers: "Keep index and middle fingers straight. Bend your ring and little fingers halfway inward. Keep your thumb extended straight.", meaning: "Half flag", usage: "Knife, two leaves, river banks" },
    kartarimukha: { fingers: "Spread your index and middle fingers apart like scissors. Bend ring and little fingers into the palm. Bend your thumb inward.", meaning: "Scissors face", usage: "Separation, lightning, corner of eye" },
    mayura: { fingers: "Touch your thumb tip to your ring fingertip. Keep index, middle, and little fingers spread out straight.", meaning: "Peacock", usage: "Applying tilak, braid, gentle touch" },
    ardhachandra: { fingers: "Open all five fingers fully apart. Extend your thumb completely sideways away from your palm.", meaning: "Half moon", usage: "Moon, plate, beginning prayer" },
    arala: { fingers: "Bend only your index finger slightly inward. Keep all other fingers straight.", meaning: "Bent", usage: "Drinking nectar, wind, poison" },
    shukatunda: { fingers: "Press your thumb against the base of your ring finger. Point your index, middle, and little fingers forward.", meaning: "Parrot beak", usage: "Shooting arrow, direction" },
    mushti: { fingers: "Close all four fingers firmly into a tight fist. Place your thumb over them.", meaning: "Fist", usage: "Grasping, wrestling, holding hair" },
    shikhara: { fingers: "Make a tight fist with all four fingers. Raise only your thumb straight up.", meaning: "Spire", usage: "Bow, pillar, husband, Shiva" },
    kapittha: { fingers: "Curl all fingers loosely inward to a mid-range position. Press your thumb firmly against your curled index finger.", meaning: "Wood apple", usage: "Lakshmi, Saraswati, holding cymbals" },
    katakamukha: { fingers: "Curve your index and middle fingers toward your thumb, forming a bracelet opening. Keep ring and little fingers extended.", meaning: "Bracelet opening", usage: "Picking flowers, garland, pulling bow" },
    suchi: { fingers: "Point only your index finger straight up. Fold all other fingers into a fist.", meaning: "Needle", usage: "Universe, number one, the city" },
    chandrakala: { fingers: "Form a crescent shape with your thumb and index finger spread apart. Keep middle, ring, and little fingers curled into the palm.", meaning: "Crescent moon", usage: "Shiva's moon, forehead mark" },
    padmakosha: { fingers: "Curve all five fingers inward gently, like cupping a large mango. Tilt your wrist slightly forward.", meaning: "Lotus bud", usage: "Apple, round ball, lotus" },
    sarpashira: { fingers: "Hold all fingers flat and pressed tightly together with no gaps. Bend your wrist so fingers point forward like a snake head.", meaning: "Snake head", usage: "Snake, elephant trunk, water" },
    mrigashira: { fingers: "Raise your thumb and little finger straight up. Fold your index, middle, and ring fingers tightly inward.", meaning: "Deer head", usage: "Deer, forest, gentle touch, woman" },
    simhamukha: { fingers: "Extend your index and little fingers straight up. Bend middle and ring fingers inward. Bend your thumb inward.", meaning: "Lion face", usage: "Lion, horse, fearlessness, power" },
    kangula: { fingers: "Bend your ring finger fully inward toward your palm. Keep index, middle, and little fingers gently curved, not fully straight.", meaning: "Bell", usage: "Bell, fruit, drop of water" },
    alapadma: { fingers: "Spread all five fingers as wide as possible with a gentle curve, like a fully bloomed lotus.", meaning: "Full bloomed lotus", usage: "Full moon, beauty, lake, disc" },
    chatura: { fingers: "Extend index, middle, and ring fingers straight up together. Let the little finger curve slightly. Curl your thumb inward.", meaning: "Clever", usage: "Gold, wind, slight movement" },
    bhramara: { fingers: "Touch your index fingertip to your thumb tip forming a loop. Bend your middle finger inward. Extend your ring and little fingers.", meaning: "Bee", usage: "Bee, bird, six seasons" },
    hamsasya: { fingers: "Bring all five fingertips together to meet at a single point, like a swan's beak.", meaning: "Swan beak", usage: "Pearl, tying thread, number five" },
    hamsapaksha: { fingers: "Spread all fingers in a gentle wave shape, each finger at a slightly different angle.", meaning: "Swan wing", usage: "Swan, number six, gentle waving" },
    sandamsha: { fingers: "Pinch your index and middle fingertips tightly together. Curl your ring and little fingers inward.", meaning: "Tongs", usage: "Picking flowers, tongs, crab claw" },
    mukula: { fingers: "Bring all five fingertips loosely together in a flower bud shape.", meaning: "Bud", usage: "Lotus bud, eating, navel" },
    tamrachuda: { fingers: "Raise your thumb and little finger straight up. Fold your index, middle, and ring fingers into a fist.", meaning: "Rooster", usage: "Rooster, peacock, bird crest" },
    trishula: { fingers: "Raise index, middle, and ring fingers straight up like a trident. Curl your thumb and little finger inward.", meaning: "Trident", usage: "Shiva's trident, three paths" },
    palli: { fingers: "Extend index and middle fingers. Fold ring and little fingers. Tuck your thumb inward.", meaning: "Lizard", usage: "Regional mudra" },
    vyaaghr: { fingers: "Extend thumb, index, and little fingers. Fold middle and ring fingers inward.", meaning: "Tiger", usage: "Regional mudra" },

    // Double Hand Mudras (Samyuta Hastas)
    anjali: { fingers: "Join both palms together flat, fingers pointing upward. Keep elbows slightly out.", meaning: "Salutation", usage: "Worshipping Gods, greeting gurus, or welcoming guests." },
    kapotha: { fingers: "Join palms only at the edges (sides), creating a hollow space in the center.", meaning: "Pigeon", usage: "Taking an oath, respectful conversation, or showing a pigeon." },
    karkata: { fingers: "Interlock the fingers of both hands. Palms can face inward or outward.", meaning: "Crab", usage: "Arrival of people, blowing a conch, or twisting limbs." },
    svastika: { fingers: "Cross both hands at the wrists, palms facing opposite directions.", meaning: "Auspicious", usage: "Showing a crocodile, sky, or wide spread of water." },
    puspaputa: { fingers: "Hold both palms side-by-side, slightly cupped, like holding water or flowers.", meaning: "Flower Casket", usage: "Offering flowers to God, receiving fruits, or evening prayers." },
    utsanga: { fingers: "Cross the arms and place the palms on opposite shoulders.", meaning: "Embrace", usage: "Showing modesty, shyness, or an embrace." },
    sivalinga: { fingers: "Right hand in Shikhara (fist up) placed on the flat left palm.", meaning: "Lord Shiva", usage: "Representing the Lingam, Lord Shiva, or Phallic symbol." },

    chakra: { fingers: "Interlock the fingers and fan the palms out to form a circle.", meaning: "Wheel", usage: "The Sudarshana Chakra of Lord Vishnu." },
    sakata: { fingers: "Thumb and middle fingers touch; index and little fingers are extended.", meaning: "Cart", usage: "Gestures of demons or ancient transport carts." },
    sankha: { fingers: "The right thumb is enclosed by the left fingers, and left thumb touches the right index.", meaning: "Conch", usage: "Blowing the conch for rituals or war." },
    pasa: { fingers: "Interlock the index fingers of both hands like a chain.", meaning: "Noose", usage: "Quarrels, strings, or a noose." },
    kilaka: { fingers: "Interlock the little fingers of both hands.", meaning: "Bond", usage: "Affection, conversation between friends, or a link." },
    samputa: { fingers: "Both hands in Brahmara (index and thumb touch), held together.", meaning: "Box", usage: "Concealing secrets, holding a jewelry box." },

    matsya: { fingers: "Place one hand on the back of the other, thumbs extended like fins.", meaning: "Fish", usage: "Lord Vishnu's Matsya avatar, or a fish in water." },
    kurma: { fingers: "Interlock the middle and ring fingers, keeping others slightly curved.", meaning: "Tortoise", usage: "Lord Vishnu's Kurma avatar, stability." },
    varaha: { fingers: "Place one hand over the other in Mrigashira (deer head) position.", meaning: "Boar", usage: "Lord Vishnu's Varaha avatar." },
    garuda: { fingers: "Hook thumbs together and fan out the fingers like wings.", meaning: "Eagle", usage: "The mount of Lord Vishnu (Garuda)." },
    nagabandha: { fingers: "Cross the wrists and hold hands in Sarpasiras (snake head) posture.", meaning: "Serpent Tie", usage: "Coiled snakes, Atharvana veda charms." },
    bherunda: { fingers: "Cross the wrists and hold the hands in Kapitha (fist with thumb-index touch).", meaning: "Double-headed Bird", usage: "Strength, ancient bird Bherunda." },
    katva: { fingers: "Place one hand's index and middle fingers over the other hand's.", meaning: "Cot/Bed", usage: "Showing a bed, a palanquin, or a bridge." },
    katakavardhana: { fingers: "Both hands in Katakamukha crossed at the wrists.", meaning: "Link of Bracelets", usage: "Coronation, worship, marriage." },
    kartarisvastika: { fingers: "Cross the wrists while in Kartarimukha (scissors) position.", meaning: "Crossed Scissors", usage: "Stems, hills, or trees." },
    dola: { fingers: "Hang both hands loosely at the sides of the thighs in Pataka.", meaning: "Swing", usage: "Beginning of a dance, relaxation." },
};

// ── Translation dictionaries ──────────────────────────────────────────────────
export const TRANSLATIONS = {
    'ta': {
        "Show your hand to the camera": "உங்கள் கையை கேமராவில் காட்டுங்கள்",
        "Voice guidance is active": "குரல் வழிகாட்டல் செயல்படுகிறது",
        "Good! Now hold this position.": "நல்லது! இந்த நிலையை பிடித்திருங்கள்",
        "Correct! Great form.": "சரியானது! அருமையான கோலம்",
        "Try Again — almost there!": "மீண்டும் முயற்சிக்கவும், கிட்டத்தட்ட சரியாக உள்ளது",
        "Try Again — adjust your hand position.": "மீண்டும் முயற்சிக்கவும், கையின் நிலையை சரிசெய்யவும்",
        "Bend your ring finger fully": "மோதிர விரலை முழுமையாக மடக்கவும்",
        "Bend your ring finger more": "மோதிர விரலை மேலும் மடக்கவும்",
        "Straighten your index finger": "ஆட்காட்டி விரலை நேராக்குங்கள்",
        "Straighten your middle finger": "நடு விரலை நேராக்குங்கள்",
        "Straighten your ring finger": "மோதிர விரலை நேராக்குங்கள்",
        "Straighten your little finger": "சிறு விரலை நேராக்குங்கள்",
        "Bend your thumb inward": "கட்டை விரலை உள்ளே மடக்குங்கள்",
        "Full body not detected. Step back so your entire body is visible.": "முழு உடல் தெரியவில்லை. உங்கள் முழு உடலும் தெரிய பின்வாங்குங்கள்.",
        "Please step back — your feet and legs are out of frame.": "தயவுசெய்து பின்வாங்கவும் — உங்கள் கால்கள் கேமராவில் தெரியவில்லை.",
        "Please step back — you are framed too close to the camera.": "தயவுசெய்து பின்வாங்கவும் — கேமரா மிக அருகில் உள்ளது.",
        "Please adjust camera — your upper body is out of frame.": "கேமராவை சரிசெய்யவும் — மேல் உடல் கேமராவில் தெரியவில்லை.",
        "⚠️ Framing Warning": "⚠️ கேமரா எச்சரிக்கை",
        "Showing": "காட்டுவது"
    },
    'hi': {
        "Show your hand to the camera": "अपना हाथ कैमरे के सामने रखें",
        "Good! Now hold this position.": "अच्छा! अब इस स्थिति को बनाए रखें",
        "Correct! Great form.": "सही है! बहुत अच्छा",
        "Full body not detected. Step back so your entire body is visible.": "पूरा शरीर नहीं दिख रहा है। कृपया पीछे हटें।",
        "Please step back — your feet and legs are out of frame.": "कृपया पीछे हटें — आपके पैर कैमरे में दिखाई नहीं दे रहे हैं।",
        "Please step back — you are framed too close to the camera.": "कृपया पीछे हटें — आप कैमरे के बहुत करीब हैं।",
        "Please adjust camera — your upper body is out of frame.": "कैमरा समायोजित करें — आपका ऊपरी शरीर बाहर है।",
        "⚠️ Framing Warning": "⚠️ कैमरा चेतावनी",
        "Showing": "दिखाया जा रहा है"
    },
    'te': {
        "Show your hand to the camera": "కెమెరాకి మీ చేయి చూపించండి",
        "Good! Now hold this position.": "మంచిది! ఇప్పుడు ఈ స్థితిని పట్టుకోండి",
        "Correct! Great form.": "సరైనది! గొప్ప రూపం",
        "Full body not detected. Step back so your entire body is visible.": "పూర్తి శరీరం కనపడలేదు. దయచేసి వెనుకకు జరగండి.",
        "Please step back — your feet and legs are out of frame.": "దయచేసి వెనుకకు జరగండి — మీ కాళ్ళు కనిపించడం లేదు.",
        "Please step back — you are framed too close to the camera.": "దయచేసి వెనుకకు జరగండి — మీరు కెమెరాకి చాలా దగ్గరగా ఉన్నారు.",
        "Please adjust camera — your upper body is out of frame.": "కెమెరాను సర్దుబాటు చేయండి — మీ పై శరీరం కనిపించడం లేదు.",
        "⚠️ Framing Warning": "⚠️ కెమెరా హెచ్చరిక",
        "Showing": "చూపిస్తోంది"
    },
    'kn': {
        "Show your hand to the camera": "ಕ್ಯಾಮರಾಗೆ ನಿಮ್ಮ ಕೈ ತೋರಿಸಿ",
        "Good! Now hold this position.": "ಉತ್ತಮ! ಈಗ ಈ ಸ್ಥಿತಿಯನ್ನು ಹಿಡಿದುಕೊಳ್ಳಿ",
        "Correct! Great form.": "ಸರಿಯಾಗಿದೆ! ಅದ್ಭುತ ರೂಪ",
        "Full body not detected. Step back so your entire body is visible.": "ಪೂರ್ಣ ದೇಹ ಕಾಣಿಸುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಹಿಂದೆ ಸರಿಯಿರಿ.",
        "Please step back — your feet and legs are out of frame.": "ದಯವಿಟ್ಟು ಹಿಂದೆ ಸರಿಯಿರಿ — ನಿಮ್ಮ ಕಾಲುಗಳು ಕಾಣಿಸುತ್ತಿಲ್ಲ.",
        "Please step back — you are framed too close to the camera.": "ದಯವಿಟ್ಟು ಹಿಂದೆ ಸರಿಯಿರಿ — ನೀವು ಕ್ಯಾಮೆರಾಗೆ ತುಂಬಾ ಹತ್ತಿರದಲ್ಲಿದ್ದೀರಿ.",
        "Please adjust camera — your upper body is out of frame.": "ಕ್ಯಾಮೆರಾವನ್ನು ಹೊಂದಿಸಿ — ನಿಮ್ಮ ಮೇಲ್ಭಾಗದ ದೇಹ ಕಾಣಿಸುತ್ತಿಲ್ಲ.",
        "⚠️ Framing Warning": "⚠️ ಕ್ಯಾಮೆರಾ ಎಚ್ಚರಿಕೆ",
        "Showing": "ತೋರಿಸಲಾಗುತ್ತಿದೆ"
    },
    'ml': {
        "Show your hand to the camera": "ക്യാമറയിൽ കൈ കാണിക്കുക",
        "Good! Now hold this position.": "നന്നായിട്ടുണ്ട്! ഇനി ഈ നില തുടരുക",
        "Correct! Great form.": "ശരിയാണ്! മികച്ച രൂപം",
        "Full body not detected. Step back so your entire body is visible.": "പൂർണ്ണ ശരീരം കാണുന്നില്ല. ദയവായി പിന്നോട്ട് നീങ്ങുക.",
        "Please step back — your feet and legs are out of frame.": "ദയവായി പിന്നോട്ട് നീങ്ങുക — നിങ്ങളുടെ കാലുകൾ കാണുന്നില്ല.",
        "Please step back — you are framed too close to the camera.": "ദയവായി പിന്നോട്ട് നീങ്ങുക — നിങ്ങൾ ക്യാമറയ്ക്ക് വളരെ അടുത്താണ്.",
        "Please adjust camera — your upper body is out of frame.": "ക്യാമറ ക്രമീകരിക്കുക — നിങ്ങളുടെ മുകൾ ഭാഗം കാണുന്നില്ല.",
        "⚠️ Framing Warning": "⚠️ ക്യാമറ മുന്നറിയിപ്പ്",
        "Showing": "കാണിക്കുന്നത്"
    }
};

export function translate(lang = 'en', text = '') {
    if (!text) return '';
    if (lang === 'en' || !TRANSLATIONS[lang]) return text;
    return TRANSLATIONS[lang][text] || text;
}

export const MUDRA_NAMES = {
    ta: {
        pataka: "பதாக", tripataka: "திரிபதாக", ardhapataka: "அர்தபதாக",
        kartarimukha: "கர்தரிமுக", mayura: "மயூர", ardhachandra: "அர்தசந்திர",
        arala: "அரால", shukatunda: "சுகதுண்ட", mushti: "முஷ்டி",
        shikhara: "சிகர", kapittha: "கபித்த", katakamukha: "கடகமுக",
        suchi: "சூசி", chandrakala: "சந்திரகலா", padmakosha: "பத்மகோஷ",
        sarpashira: "சர்பசிர", mrigashira: "மிருகசிர", simhamukha: "சிம்ஹமுக",
        kangula: "கங்குல", alapadma: "அலபத்ம", chatura: "சதுர",
        bhramara: "பிரமர", hamsasya: "ஹம்ஸாஸ்ய", hamsapaksha: "ஹம்ஸபக்ஷ",
        sandamsha: "சண்டம்ச", mukula: "முகுல", tamrachuda: "தாம்ரசூட",
        trishula: "திரிசூல", palli: "பல்லி", vyaaghr: "வியாக்ர",
        anjali: "அஞ்சலி", kapotha: "கபோத", karkata: "கர்க்கட", svastika: "ஸ்வஸ்திக",
        dola: "தோலா", puspaputa: "புஷ்பபுட", utsanga: "உத்சங்க", sivalinga: "சிவலிங்க",
        katakavardhana: "கடகவர்த்தன", kartarisvastika: "கர்தரிஸ்வஸ்திக", sakata: "சகட",
        sankha: "சங்க", chakra: "சக்ர", samputa: "சம்புட", pasa: "பாச",
        kilaka: "கீலக", matsya: "மத்சய", kurma: "கூர்ம", varaha: "வராஹ",
        garuda: "கருட", nagabandha: "நாகபந்த", bherunda: "பேருண்ட", katva: "கட்வா"
    },
    hi: {
        pataka: "पताक", tripataka: "त्रिपताक", ardhapataka: "अर्धपताक",
        kartarimukha: "कर्तरीमुख", mayura: "मयूर", ardhachandra: "अर्धचंद्र",
        mushti: "मुष्टि", shikhara: "शिखर", suchi: "सूची",
        alapadma: "अलपद्म", padmakosha: "पद्मकोष", trishula: "त्रिशूल",
    },
    te: {
        pataka: "పతాక", tripataka: "త్రిపతాక", mushti: "ముష్టి", shikhara: "శిఖర",
    },
    kn: {
        pataka: "ಪತಾಕ", tripataka: "ತ್ರಿಪತಾಕ", mushti: "ಮುಷ್ಟಿ", shikhara: "ಶಿಖರ",
    },
    ml: {
        pataka: "പതാക", tripataka: "ത്രിപതാക", mushti: "മുഷ്ടി", shikhara: "ശിഖര",
    }
};

export function getMudraName(lang, key) {
    if (!key) return '';
    return MUDRA_NAMES[lang]?.[key.toLowerCase()] || key;
}


function getBestVoice(lang) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    if (lang === 'ta') {
        return voices.find(v => v.name.includes('தமிழ்')) ||
            voices.find(v => v.name.includes('Tamil')) ||
            voices.find(v => v.lang === 'ta-IN') ||
            voices.find(v => v.lang.startsWith('ta')) || null;
    }
    if (lang === 'hi') {
        return voices.find(v => v.name.includes('हिन्दी')) ||
            voices.find(v => v.name.includes('Hindi')) ||
            voices.find(v => v.lang === 'hi-IN') ||
            voices.find(v => v.lang.startsWith('hi')) || null;
    }
    if (lang === 'te') return voices.find(v => v.lang === 'te-IN') || voices.find(v => v.name.toLowerCase().includes('telugu')) || null;
    if (lang === 'kn') return voices.find(v => v.lang === 'kn-IN') || voices.find(v => v.name.toLowerCase().includes('kannada')) || null;
    if (lang === 'ml') return voices.find(v => v.lang === 'ml-IN') || voices.find(v => v.name.toLowerCase().includes('malayalam')) || null;

    return voices.find(v => v.name === 'Google UK English Female') ||
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
}

function langCode(lang) {
    const map = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN' };
    return map[lang] || 'en-IN';
}

export function useVoiceGuide({ language = 'en' } = {}) {
    const unlockedRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const currentPrioRef = useRef(0);
    const langRef = useRef(language);
    const globalVoiceCooldownRef = useRef(0);
    const lastCorrectionRef = useRef('');
    const lastCorrectionTimeRef = useRef(0);
    const corrRepeatCountRef = useRef(0);
    const lastFeedbackRef = useRef('');
    const lastOkVoiceRef = useRef(0);
    const wrongMudraCountRef = useRef(0);
    const WRONG_MUDRA_GATE = 3;

    // NEW: State Awareness Refs for Sync Fix
    const lastStatusRef = useRef('');
    const lastScoreRef = useRef(0);
    const lastMudraRef = useRef('');
    const isFetchingRef = useRef(false);  // Lock: prevents concurrent gTTS requests
    const fetchControllerRef = useRef(null); // ABORT: cancels outdated gTTS requests
    const activeAudioRef = useRef(null);   // Tracks the currently playing Audio object
    const pendingSpeechRef = useRef(null);

    useEffect(() => {
        langRef.current = language;
        // Warm up voices
        window.speechSynthesis.getVoices();
        const handleVoices = () => window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener('voiceschanged', handleVoices);

        // GLOBAL UNLOCK: Any click on the window enables audio context for this session
        const forceUnlock = () => { unlockedRef.current = true; };
        window.addEventListener('click', forceUnlock, { once: true });
        window.addEventListener('touchstart', forceUnlock, { once: true });

        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
            window.removeEventListener('click', forceUnlock);
            window.removeEventListener('touchstart', forceUnlock);
        };
    }, [language]);

    const _doSpeak = useCallback(async (message, priority = PRIO.MEDIUM, opts = {}) => {
        if (!unlockedRef.current || !message) return;

        // --- IDEMPOTENCY & PRIORITY CHECK (Speech Integrity Fix) ---
        // If we are currently speaking, we only interrupt for HIGHER priority messages (Task 12)
        if (isSpeakingRef.current || isFetchingRef.current) {
            // If the new request is lower priority, discard it
            if (priority < currentPrioRef.current) return;

            // If equal priority (and not urgent), queue it instead of killing current
            if (priority === currentPrioRef.current && priority < PRIO.HIGH) {
                pendingSpeechRef.current = { message, priority, opts };
                return;
            }
            // If it's a higher priority or same-urgent, it falls through to interrupt
        }

        const now = Date.now();
        const cooldown = priority >= PRIO.HIGH ? 1000 : 2500;
        if (now - globalVoiceCooldownRef.current < cooldown && message === lastFeedbackRef.current) return;

        globalVoiceCooldownRef.current = now;
        lastFeedbackRef.current = message;
        isFetchingRef.current = true; // LOCK

        // --- Interrupt only if priority warrants it (Interruption Logic) ---
        if (fetchControllerRef.current) {
            fetchControllerRef.current.abort();
            fetchControllerRef.current = null;
        }

        if (activeAudioRef.current) {
            try {
                activeAudioRef.current.pause();
                activeAudioRef.current.currentTime = 0;
                activeAudioRef.current.src = '';
                activeAudioRef.current.load();
            } catch (_) { }
            activeAudioRef.current = null;
        }
        window.speechSynthesis.cancel();

        const controller = new AbortController();
        fetchControllerRef.current = controller;
        isFetchingRef.current = true;

        // --- Natural Teacher Layer: Backend Voice Bridge ---
        const currentLang = langRef.current;
        const messageToSpeak = translate(currentLang, message);
        const containsIndic = /[\u0900-\u0DFF]/.test(messageToSpeak);
        const targetLang = containsIndic ? currentLang : 'en';

        try {
            const response = await fetch('/api/get_voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: messageToSpeak, lang: targetLang }),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();

            if (data.audio) {
                const audio = new Audio("data:audio/mp3;base64," + data.audio);
                activeAudioRef.current = audio;

                audio.onplay = () => {
                    isSpeakingRef.current = true;
                    currentPrioRef.current = priority;
                };
                audio.onended = () => {
                    isSpeakingRef.current = false;
                    currentPrioRef.current = 0;
                    activeAudioRef.current = null;
                    if (opts.onEnd) opts.onEnd();

                    // --- CHECK QUEUE (Queue Logic) ---
                    if (pendingSpeechRef.current) {
                        const next = pendingSpeechRef.current;
                        pendingSpeechRef.current = null;
                        // Brief pause for natural breath (200ms)
                        setTimeout(() => _doSpeak(next.message, next.priority, next.opts), 200);
                    }
                };
                audio.play().catch(e => {
                    if (e.name !== 'AbortError') console.error("[VOICE] Play error:", e);
                });
            }
        } catch (err) {
            // IF ABORTED: The request was intentionally cancelled by a newer instruction.
            // DO NOT fall back to legacy speech, as that causes overlaps.
            if (err.name === 'AbortError') return;

            console.error("[VOICE] Backend synthesis failed:", err);
            // Cancel any queued utterances before falling back, to prevent stacking
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(message);
            utt.lang = langCode(langRef.current);
            utt.rate = 1.0;
            utt.onerror = (event) => {
                if (event.error === 'not-allowed') {
                    console.warn('[VOICE] Speech blocked by browser autoplay policy. Awaiting user interaction.');
                } else {
                    console.warn('[VOICE] SpeechSynthesis error:', event.error);
                }
            };
            window.speechSynthesis.speak(utt);
        } finally {
            isFetchingRef.current = false;
            fetchControllerRef.current = null;
        }
    }, []);

    const speak = useCallback((text, { priority = PRIO.LOW, minInterval = 4000, mustRepeat = 0 } = {}) => {
        if (!text) return;
        const lang = langRef.current;
        const message = translate(lang, text);
        const now = Date.now();

        if (mustRepeat > 0) {
            if (message === lastCorrectionRef.current) {
                corrRepeatCountRef.current++;
            } else {
                lastCorrectionRef.current = message;
                corrRepeatCountRef.current = 1;
                return;
            }
            if (corrRepeatCountRef.current < mustRepeat + 1) return;
            corrRepeatCountRef.current = 0;
        }

        if (message === lastCorrectionRef.current && now - lastCorrectionTimeRef.current < minInterval) return;
        lastCorrectionTimeRef.current = now;
        _doSpeak(message, priority);
    }, [_doSpeak]);

    const unlock = useCallback(() => {
        unlockedRef.current = true; // Immediate unlock on user interaction

        // --- WebRTC Audio Unblocker ---
        // Resume AudioContext if it exists (some browsers require this to wake up WebRTC audio)
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                if (ctx.state === 'suspended') ctx.resume();
            }
        } catch (_) { }

        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
    }, []);

    const test = useCallback(() => {
        const lang = langRef.current;
        const testMessages = {
            ta: 'ஜெஸ்டர் ஐக்யூ தயாராக உள்ளது',
            hi: 'जेस्चर आईक्यू तैयार है',
            te: 'జెస్టర్ ఐక్యూ సిద్ధంగా ఉంది',
            kn: 'ಜೆಸ್ಟಾರ್ ಐಕ್ಯೂ ಸಿದ್ಧವಾಗಿದೆ',
            ml: 'ജെസ്റ്റർ ഐക്യു തയ്യാറാണ്',
            en: 'GestureIQ is ready'
        };
        const msg = testMessages[lang] || testMessages.en;
        unlockedRef.current = true;
        _doSpeak(msg, PRIO.HIGH);
    }, [_doSpeak]);

    const getInstruction = useCallback((mudraFolder) => {
        if (!mudraFolder) return '';
        const lang = langRef.current;
        const key = mudraFolder.toLowerCase();
        const config = MUDRA_CONFIG[key];
        const localizedName = getMudraName(lang, key);

        if (!config) {
            const msgs = {
                ta: `இப்போது ${localizedName} முத்திரை பயிற்சி செய்யுங்கள்`,
                hi: `अब ${localizedName} मुद्रा का अभ्यास करें`,
                te: `ఇప్పుడు ${localizedName} ముద్ర సాధన చేయండి`,
                kn: `ಈಗ ${localizedName} ಮುದ್ರೆ ಅಭ್ಯಾಸ ಮಾಡಿ`,
                ml: `ഇപ്പോൾ ${localizedName} മുദ്ര പരിശീലിക്കുക`,
                en: `Now practicing ${localizedName} mudra`
            };
            return msgs[lang] || msgs.en;
        }

        const fingerInstr = translate(lang, config.fingers);

        if (lang === 'ta') return `${localizedName} முத்திரை. ${fingerInstr}`;
        if (lang === 'hi') return `${localizedName} मुद्रा। ${fingerInstr}`;
        if (lang === 'te') return `${localizedName} ముద్ర. ${fingerInstr}`;
        if (lang === 'kn') return `${localizedName} ಮುದ್ರೆ. ${fingerInstr}`;
        if (lang === 'ml') return `${localizedName} മുദ്ര. ${fingerInstr}`;

        const name = mudraFolder.charAt(0).toUpperCase() + mudraFolder.slice(1);
        return `${name} mudra. ${config.fingers}`;
    }, []);

    const announce = useMemo(() => {
        const fn = (msg, priority = PRIO.MEDIUM, opts = {}) => {
            if (!msg) return '';
            const currentLang = langRef.current;
            const translatedMsg = translate(currentLang, msg);
            _doSpeak(translatedMsg, priority, opts);
            return translatedMsg;
        };

        fn.raw = fn;
        fn.cameraActive = (mudraName) => {
            const inst = getInstruction(mudraName);
            _doSpeak(inst, PRIO.HIGH);
        };
        fn.correct = () => {
            const lang = langRef.current;
            const msgs = {
                en: "Excellent!",
                ta: "அருமை!",
                hi: "बहुत बढ़िया!",
                te: "అద్భుతం!",
                kn: "ಅದ್ಭುತ!",
                ml: "മികച്ചത്!"
            };
            const msg = msgs[lang] || msgs.en;
            _doSpeak(msg, PRIO.HIGH);
            return msg;
        };
        fn.noHand = () => {
            const msg = "Show your hand to the camera";
            speak(msg, { minInterval: 6000, priority: PRIO.MEDIUM });
            return msg;
        };
        fn.start = (folder) => {
            const inst = getInstruction(folder);
            _doSpeak(inst, PRIO.HIGH);
            return inst;
        };
        fn.mastered = ({ mudra, score }) => {
            const lang = langRef.current;
            const name = getMudraName(lang, mudra);
            const msgs = {
                ta: `அற்புதம்! நீங்கள் ${name} முத்திரையை ${score} சதவீத துல்லியத்துடன் கற்றுக்கொண்டீர்கள்.`,
                hi: `शाबाश! आपने ${name} मुद्रा को ${score} प्रतिशत सटीकता के साथ सीख लिया है।`,
                te: `అద్భుతం! మీరు ${name} ముద్రను ${score} శాతం ఖచ్చితత్వంతో సాధించారు.`,
                kn: `ಅದ್ಭುತ! ನೀವು ${name} ಮುದ್ರೆಯನ್ನು ${score} ಶೇಕಡಾ ನಿಖರತೆಯೊಂದಿಗೆ ಕರಗತ ಮಾಡಿಕೊಂಡಿದ್ದೀರಿ.`,
                ml: `മികച്ചത്! നിങ്ങൾ ${name} മുദ്ര ${score} ശതമാനം കൃത്യതയോടെ പഠിച്ചു.`,
                en: `Excellent! You mastered ${mudra} with ${score} percent accuracy.`
            };
            const msg = msgs[lang] || msgs.en;
            _doSpeak(msg, PRIO.HIGH);
            return msg;
        };
        fn.raw = (msg, priority = PRIO.MEDIUM, opts = {}) => {
            const currentLang = langRef.current;
            const translatedMsg = translate(currentLang, msg);
            _doSpeak(translatedMsg, priority, opts);
            return translatedMsg;
        };
        fn.fromResult = (data, targetMudra = null) => {
            if (!data) return null;
            const lang = langRef.current;
            const now = Date.now();

            const currentStatus = data.status || 'Incorrect';
            const currentScore = data.score || 0;
            const currentMudra = data.name || data.matchedMudra || 'No Hand';

            const isStatusTransition = currentStatus !== lastStatusRef.current;
            const isMudraTransition = currentMudra !== lastMudraRef.current;
            const scoreJump = Math.abs(currentScore - lastScoreRef.current) > 20;

            lastStatusRef.current = currentStatus;
            lastScoreRef.current = currentScore;
            lastMudraRef.current = currentMudra;

            if (currentScore >= 95) {
                if (isStatusTransition || scoreJump || now - lastOkVoiceRef.current > 10000) {
                    lastOkVoiceRef.current = now;
                    const msgs = {
                        en: "Perfect! Hold it right there.",
                        ta: "மிகச்சிறப்பு! அப்படியே பிடியுங்கள்.",
                        hi: "बेहतरीन! इसे ऐसे ही बनाए रखें।",
                        te: "అద్భుతం! అలాగే పట్టుకోండి.",
                        kn: "ಅತ್ಯುತ್ತಮ! ಹಾಗೆಯೇ ಹಿಡಿದುಕೊಳ್ಳಿ.",
                        ml: "മികച്ചത്! അങ്ങനെ തന്നെ നിർത്തുക."
                    };
                    const msg = msgs[lang] || msgs.en;
                    _doSpeak(msg, PRIO.HIGH);
                    return msg;
                }
                return null;
            }

            if (currentScore >= 75) {
                if (isStatusTransition || now - lastOkVoiceRef.current > 8000) {
                    lastOkVoiceRef.current = now;
                    const msgs = {
                        en: "Good! Now hold this position.",
                        ta: "நல்லது! இந்த நிலையை பிடித்திருங்கள்.",
                        hi: "अच्छा! अब इस स्थिति को बनाए रखें।",
                        te: "బాగుంది! ఇప్పుడు ఈ స్థితిని పట్టుకోండి.",
                        kn: "ಉತ್ತಮ! ಈಗ ಈ ಸ್ಥಿತಿಯನ್ನು ಹಿಡಿದುಕೊಳ್ಳಿ.",
                        ml: "നന്നായിട്ടുണ്ട്! ഇനി ഈ നില തുടരുക."
                    };
                    const msg = msgs[lang] || msgs.en;
                    _doSpeak(msg, PRIO.MEDIUM);
                    return msg;
                }
                return null;
            }

            if (data.corrections && data.corrections.length > 0) {
                const correction = data.corrections[0];
                const translated = translate(lang, correction);
                if (translated !== lastCorrectionRef.current || now - lastCorrectionTimeRef.current > 5000) {
                    lastCorrectionRef.current = translated;
                    lastCorrectionTimeRef.current = now;
                    // _doSpeak(translated, PRIO.MEDIUM); // SILENCED: fold your fingers like that...
                    return translated;
                }
                return null;
            }

            if (data.is_stable && currentMudra !== 'No Hand' && currentMudra !== 'Joining...') {
                // DIFFERENTIAL GATE: If user is on the correct track, don't say "Showing [Target]"
                // This prevents the redundant loop for correct performance.
                const isCorrectTrack = targetMudra && currentMudra.toLowerCase().trim() === targetMudra.toLowerCase().trim();
                if (isCorrectTrack) return null;

                if (isMudraTransition || now - lastCorrectionTimeRef.current > 7000) {
                    lastCorrectionTimeRef.current = now;
                    const detName = currentMudra;
                    let voiceMsg = lang === 'ta'
                        ? `காட்டுவது ${getMudraName(lang, detName)}.`
                        : `Showing ${detName}.`;
                    _doSpeak(voiceMsg, PRIO.MEDIUM);
                    return voiceMsg;
                }
            }
        };
        fn.resetWrongGate = () => { wrongMudraCountRef.current = 0; };
        fn.poseFeedback = (feedbacks = []) => {
            if (!feedbacks || feedbacks.length === 0) return null;
            const lang = langRef.current;
            const now = Date.now();
            const primaryFeedback = feedbacks[0];
            const translated = translate(lang, primaryFeedback);

            if (translated !== lastCorrectionRef.current || now - lastCorrectionTimeRef.current > 4000) {
                lastCorrectionRef.current = translated;
                lastCorrectionTimeRef.current = now;
                _doSpeak(translated, PRIO.MEDIUM);
                return translated;
            }
            return null;
        };

        return fn;
    }, [getInstruction, _doSpeak, speak]);

    return {
        speak,
        stop: () => {
            window.speechSynthesis.cancel();
            if (activeAudioRef.current) {
                try {
                    activeAudioRef.current.pause();
                    activeAudioRef.current.src = '';
                } catch (_) { }
                activeAudioRef.current = null;
            }
            isSpeakingRef.current = false;
            currentPrioRef.current = 0;
            pendingSpeechRef.current = null;
        },
        test, unlock, announce, getInstruction
    };
}

export function LanguageSelector({ lang, setLang, onChange }) {
    const handleChange = onChange || setLang;
    const opts = [
        { code: 'en', label: '🇬🇧 English' },
        { code: 'ta', label: '🇮🇳 Tamil' },
        { code: 'hi', label: '🇮🇳 Hindi' },
        { code: 'te', label: '🇮🇳 Telugu' },
        { code: 'kn', label: '🇮🇳 Kannada' },
        { code: 'ml', label: '🇮🇳 Malay.' },
    ];
    return (
        <select value={lang} onChange={e => handleChange(e.target.value)} className="bg-transparent border rounded p-1 text-xs">
            {opts.map(o => <option key={o.code} value={o.code} className="bg-gray-800 text-white">{o.label}</option>)}
        </select>
    );
}
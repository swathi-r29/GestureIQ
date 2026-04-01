// src/hooks/useVoiceGuide.js
// ─────────────────────────────────────────────────────────────────────────────
// Voice feedback synchronized to Flask's is_stable flag.
// Voice ONLY fires when the prediction is confirmed stable by EMA smoothing.
// This eliminates the flickering / wrong-timing voice problem completely.
//
// Chrome autoplay fix:
//   Chrome blocks speechSynthesis.speak() unless unlocked by a user gesture.
//   The unlock() method must be called inside the Voice ON button's onClick.
//   After unlock() is called once, all future speak() calls work freely.
//
// Languages: English (en-IN), Tamil (ta-IN), Hindi (hi-IN),
//            Telugu (te-IN), Kannada (kn-IN), Malayalam (ml-IN)
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback, useEffect } from 'react';

// ── Voice priority levels ─────────────────────────────────────────────────────
// Higher number = higher priority = can interrupt lower priority speech
const PRIO = {
    LOW:    1,   // correction messages (fire every few seconds)
    MEDIUM: 2,   // hold steady, no hand
    HIGH:   3,   // correct!, mastered, wrong mudra
};

// ── Per-mudra voice instructions (full sentences for first announcement) ─────
const VOICE_INSTRUCTIONS_EN = {
    pataka:       "Pataka mudra. Hold all four fingers straight together and bend your thumb inward across your palm.",
    tripataka:    "Tripataka mudra. Keep index, middle and little fingers straight. Bend only your ring finger down.",
    ardhapataka:  "Ardhapataka mudra. Keep index and middle fingers straight. Bend your ring and little fingers down.",
    kartarimukha: "Kartarimukha mudra. Spread your index and middle fingers apart like scissors. Bend the other fingers.",
    mayura:       "Mayura mudra. Touch your index fingertip to your thumb tip. Spread the remaining three fingers.",
    ardhachandra: "Ardhachandra mudra. Open all five fingers and extend your thumb fully sideways.",
    arala:        "Arala mudra. Bend only your index finger slightly inward. Keep all other fingers straight.",
    shukatunda:   "Shukatunda mudra. Press your thumb against your ring finger. Point your index finger forward.",
    mushti:       "Mushti mudra. Close all four fingers firmly into a fist. Place your thumb over them.",
    shikhara:     "Shikhara mudra. Make a fist. Raise only your thumb straight up.",
    kapittha:     "Kapittha mudra. Curl your index finger to touch your thumb. Keep ring and little finger extended.",
    katakamukha:  "Katakamukha mudra. Curve your index and middle fingers toward your thumb forming a bracelet opening.",
    suchi:        "Suchi mudra. Point only your index finger straight up. Fold all other fingers into a fist.",
    chandrakala:  "Chandrakala mudra. Form a crescent with your thumb and index finger. Keep the other fingers relaxed.",
    padmakosha:   "Padmakosha mudra. Curve all five fingers inward like cupping a large ball. Tilt your wrist forward.",
    sarpashira:   "Sarpashira mudra. Hold all fingers flat and together. Bend your wrist so fingers point forward like a snake head.",
    mrigashira:   "Mrigashira mudra. Extend your ring and little fingers up like antlers. Fold index, middle and thumb inward.",
    simhamukha:   "Simhamukha mudra. Extend thumb, index and little fingers. Fold middle and ring fingers down.",
    kangula:      "Kangula mudra. Curl your index finger over your extended thumb. Keep the other fingers open.",
    alapadma:     "Alapadma mudra. Spread all five fingers as wide as possible like a fully bloomed lotus.",
    chatura:      "Chatura mudra. Hold four fingers together and bent. Extend your thumb sideways.",
    bhramara:     "Bhramara mudra. Curl your index finger and hold it with your thumb. Extend ring and little fingers.",
    hamsasya:     "Hamsasya mudra. Bring all five fingertips together to meet at a single point like a swan beak.",
    hamsapaksha:  "Hamsapaksha mudra. Bend all four fingers gently at the middle joint in a wave shape.",
    sandamsha:    "Sandamsha mudra. Pinch your index and middle fingers firmly together. Extend the other fingers.",
    mukula:       "Mukula mudra. Bring all five fingertips loosely together like a flower bud.",
    tamrachuda:   "Tamrachuda mudra. Raise your thumb and little finger straight up. Fold index, middle and ring fingers down.",
    trishula:     "Trishula mudra. Raise index, middle and ring fingers straight up like a trident. Fold thumb and little finger.",
    palli:        "Palli mudra. Extend index and middle fingers. Fold ring and little fingers. Thumb tucked.",
    vyaaghr:      "Vyaaghr mudra. Extend thumb, index and little fingers. Fold middle and ring fingers.",
};

// ── Tamil translations ────────────────────────────────────────────────────────
const TRANSLATIONS = {
    'ta': {
        // System messages
        "Show your hand to the camera":             "உங்கள் கையை கேமராவில் காட்டுங்கள்",
        "Show your hand more clearly":              "உங்கள் கையை தெளிவாக காட்டுங்கள்",
        "Voice guidance is active":                 "குரல் வழிகாட்டல் செயல்படுகிறது",
        "Good! Now hold this position.":            "நல்லது! இந்த நிலையை பிடித்திருங்கள்",
        "Correct! Great form.":                     "சரியானது! அருமையான கோலம்",
        "Try Again — almost there!":                "மீண்டும் முயற்சிக்கவும், கிட்டத்தட்ட சரியாக உள்ளது",
        "Try Again — adjust your hand position.":  "மீண்டும் முயற்சிக்கவும், கையின் நிலையை சரிசெய்யவும்",
        // Corrections — straighten
        "Straighten your index finger":             "ஆட்காட்டி விரலை நேராக்குங்கள்",
        "Straighten your middle finger":            "நடு விரலை நேராக்குங்கள்",
        "Straighten your ring finger":              "மோதிர விரலை நேராக்குங்கள்",
        "Straighten your little finger":            "சிறு விரலை நேராக்குங்கள்",
        "Extend your thumb outward":                "கட்டை விரலை வெளியே நீட்டுங்கள்",
        "Extend your thumb fully sideways away from palm": "கட்டை விரலை பக்கவாட்டில் நீட்டுங்கள்",
        // Corrections — curl
        "Curl your index finger more":              "ஆட்காட்டி விரலை மேலும் மடக்குங்கள்",
        "Curl your middle finger more":             "நடு விரலை மேலும் மடக்குங்கள்",
        "Curl your ring finger more":               "மோதிர விரலை மேலும் மடக்குங்கள்",
        "Curl your little finger more":             "சிறு விரலை மேலும் மடக்குங்கள்",
        "Curl all fingers tightly into a fist":     "அனைத்து விரல்களையும் இறுக்கமாக மடக்குங்கள்",
        "Bend your ring finger down completely":    "மோதிர விரலை முழுமையாக கீழே மடக்குங்கள்",
        "Bend your thumb inward":                   "கட்டை விரலை உள்ளே மடக்குங்கள்",
        // Corrections — relax
        "Relax your index finger slightly":         "ஆட்காட்டி விரலை சற்று தளர்த்துங்கள்",
        "Relax your middle finger slightly":        "நடு விரலை சற்று தளர்த்துங்கள்",
        "Relax your ring finger slightly":          "மோதிர விரலை சற்று தளர்த்துங்கள்",
        "Relax your little finger slightly":        "சிறு விரலை சற்று தளர்த்துங்கள்",
        "Relax your thumb slightly":                "கட்டை விரலை சற்று தளர்த்துங்கள்",
        // Special
        "Press your thumb against your ring finger":    "கட்டை விரலை மோதிர விரலில் அழுத்துங்கள்",
        "Bring all fingertips together to a point":     "அனைத்து விரல் நுனிகளையும் ஒரே இடத்தில் சேர்க்கவும்",
        "Press all fingers tightly together — no gaps": "அனைத்து விரல்களையும் இறுக்கமாக சேர்த்து பிடிக்கவும்",
        "Spread index and middle finger apart like scissors": "ஆட்காட்டி மற்றும் நடு விரலை கத்தரிக்கோல் போல் பரப்புங்கள்",
        "Spread all five fingers wide apart like a blooming lotus": "அனைத்து விரல்களையும் அகல விரிக்கவும்",
        "Curve ALL fingers inward — imagine holding a large mango": "அனைத்து விரல்களையும் உள்நோக்கி வளையுங்கள்",
        "Curve your fingers more to deepen the cup shape": "விரல்களை இன்னும் அதிகமாக வளையுங்கள்",
        "Lower your thumb to point sideways, not upward": "கட்டை விரலை பக்கவாட்டில் காட்டுங்கள்",
        "Raise your little finger straight up":     "சிறு விரலை நேரே மேலே தூக்குங்கள்",
        "Raise your thumb straight up":             "கட்டை விரலை நேரே மேலே தூக்குங்கள்",
        "Straighten your ring finger — only index should bend": "மோதிர விரலை நேராக்குங்கள்",
        // Mastery
        "இந்த முத்திரையை கற்றுக்கொண்டீர்கள்": "இந்த முத்திரையை கற்றுக்கொண்டீர்கள்",
    },
    'hi': {
        "Show your hand to the camera":             "अपना हाथ कैमरे के सामने रखें",
        "Show your hand more clearly":              "अपना हाथ स्पष्ट रूप से दिखाएं",
        "Good! Now hold this position.":            "अच्छा! अब इस स्थिति को बनाए रखें",
        "Correct! Great form.":                     "सही है! बहुत अच्छा",
        "Straighten your index finger":             "अपनी तर्जनी उंगली सीधी करें",
        "Straighten your middle finger":            "अपनी मध्यमा उंगली सीधी करें",
        "Straighten your ring finger":              "अपनी अनामिका उंगली सीधी करें",
        "Straighten your little finger":            "अपनी कनिष्ठा उंगली सीधी करें",
        "Curl your index finger more":              "तर्जनी उंगली को अधिक मोड़ें",
        "Curl your middle finger more":             "मध्यमा उंगली को अधिक मोड़ें",
        "Curl your ring finger more":               "अनामिका उंगली को अधिक मोड़ें",
        "Curl your little finger more":             "कनिष्ठा उंगली को अधिक मोड़ें",
        "Curl all fingers tightly into a fist":     "सभी उंगलियों को मुट्ठी में बंद करें",
        "Bend your thumb inward":                   "अंगूठे को अंदर की ओर मोड़ें",
        "Press your thumb against your ring finger": "अंगूठे को अनामिका उंगली से दबाएं",
        "Bring all fingertips together to a point": "सभी उंगलियों की नोक को एक बिंदु पर लाएं",
    },
    'te': {
        "Show your hand to the camera":             "మీ చేతిని కెమెరా ముందు పెట్టండి",
        "Correct! Great form.":                     "సరైనది! చాలా బాగుంది",
        "Straighten your index finger":             "మీ చూపుడు వేలిని నేరుగా పెట్టండి",
        "Curl your index finger more":              "మీ చూపుడు వేలిని మరింత వంచండి",
        "Bend your thumb inward":                   "బొటన వేలిని లోపలికి వంచండి",
        "Good! Now hold this position.":            "బాగుంది! ఇప్పుడు ఈ స్థితిలో ఉండండి",
    },
    'kn': {
        "Show your hand to the camera":             "ನಿಮ್ಮ ಕೈಯನ್ನು ಕ್ಯಾಮೆರಾ ಮುಂದೆ ತೋರಿಸಿ",
        "Correct! Great form.":                     "ಸರಿಯಾಗಿದೆ! ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ",
        "Straighten your index finger":             "ನಿಮ್ಮ ತೋರು ಬೆರಳನ್ನು ನೇರ ಮಾಡಿ",
        "Curl your index finger more":              "ನಿಮ್ಮ ತೋರು ಬೆರಳನ್ನು ಹೆಚ್ಚು ಬಾಗಿಸಿ",
        "Good! Now hold this position.":            "ಚೆನ್ನಾಗಿದೆ! ಈ ಸ್ಥಾನ ಹಿಡಿದಿರಿ",
    },
    'ml': {
        "Show your hand to the camera":             "നിങ്ങളുടെ കൈ ക്യാമറയ്ക്ക് മുന്നിൽ കാണിക്കൂ",
        "Correct! Great form.":                     "ശരിയാണ്! വളരെ നല്ലത്",
        "Straighten your index finger":             "ചൂണ്ടുവിരൽ നേരെ നിർത്തൂ",
        "Curl your index finger more":              "ചൂണ്ടുവിരൽ കൂടുതൽ വളയ്ക്കൂ",
        "Good! Now hold this position.":            "നല്ലത്! ഇനി ഈ നിലയിൽ പിടിക്കൂ",
    },
};

// ── Mudra names in Indian scripts ─────────────────────────────────────────────
const MUDRA_NAMES = {
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
    },
    hi: {
        pataka: "पताक", tripataka: "त्रिपताक", ardhapataka: "अर्धपताक",
        kartarimukha: "कर्तरीमुख", mayura: "मयूर", ardhachandra: "अर्धचंद्र",
        mushti: "मुष्टि", shikhara: "शिखर", suchi: "सूची",
        alapadma: "अलपद्म", padmakosha: "पद्मकोष", trishula: "त्रिशूल",
    },
};

function getMudraName(lang, key) {
    return MUDRA_NAMES[lang]?.[key] || key;
}

// ── Voice instructions in Tamil ───────────────────────────────────────────────
const VOICE_INSTRUCTIONS_TA = {
    pataka:       "பதாக முத்திரை. நான்கு விரல்களையும் நேராக வைக்கவும். கட்டை விரலை உள்ளே மடக்கவும்.",
    tripataka:    "திரிபதாக முத்திரை. ஆட்காட்டி, நடு, சிறு விரல்களை நேராக வைக்கவும். மோதிர விரலை மட்டும் கீழே மடக்கவும்.",
    ardhapataka:  "அர்தபதாக முத்திரை. ஆட்காட்டி மற்றும் நடு விரல்களை நேராக வைக்கவும். மோதிர மற்றும் சிறு விரல்களை மடக்கவும்.",
    kartarimukha: "கர்தரிமுக முத்திரை. ஆட்காட்டி மற்றும் நடு விரல்களை கத்தரிக்கோல் போல் பரப்புங்கள்.",
    mayura:       "மயூர முத்திரை. ஆட்காட்டி விரல் நுனியை கட்டை விரல் நுனியில் தொடுங்கள். மற்ற மூன்று விரல்களை விரிக்கவும்.",
    ardhachandra: "அர்தசந்திர முத்திரை. ஐந்து விரல்களையும் திறந்து கட்டை விரலை பக்கவாட்டில் நீட்டுங்கள்.",
    arala:        "அரால முத்திரை. ஆட்காட்டி விரலை மட்டும் சற்று உள்நோக்கி வளையுங்கள். மற்ற விரல்களை நேராக வைக்கவும்.",
    mushti:       "முஷ்டி முத்திரை. நான்கு விரல்களையும் இறுக்கமாக மடக்கி முஷ்டி செய்யுங்கள்.",
    shikhara:     "சிகர முத்திரை. முஷ்டி செய்து கட்டை விரலை மட்டும் மேலே நீட்டுங்கள்.",
    suchi:        "சூசி முத்திரை. ஆட்காட்டி விரலை மட்டும் மேலே நேராக நீட்டுங்கள். மற்ற விரல்களை மடக்கவும்.",
    padmakosha:   "பத்மகோஷ முத்திரை. அனைத்து விரல்களையும் உள்நோக்கி வளையுங்கள். பெரிய மாம்பழம் பிடித்தது போல் கைகளை வைக்கவும்.",
    alapadma:     "அலபத்ம முத்திரை. அனைத்து விரல்களையும் முழுவதும் விரிக்கவும். மலர்ந்த தாமரை போல் காட்டுங்கள்.",
    trishula:     "திரிசூல முத்திரை. ஆட்காட்டி, நடு, மோதிர விரல்களை மேலே நீட்டுங்கள். சிவபெருமான் திரிசூலம் போல் காட்டுங்கள்.",
};

// ── Translation helper ────────────────────────────────────────────────────────
function translate(lang, text) {
    if (!lang || lang === 'en') return text;
    const map = TRANSLATIONS[lang];
    if (!map) return text;

    // Exact match first
    if (map[text]) return map[text];

    // Starts-with match (handles "Curl your index finger more" type messages)
    for (const [key, val] of Object.entries(map)) {
        if (text.toLowerCase().startsWith(key.toLowerCase())) return val;
        if (key.toLowerCase().startsWith(text.toLowerCase().slice(0, 20))) return val;
    }

    // Contains match
    for (const [key, val] of Object.entries(map)) {
        if (text.toLowerCase().includes(key.toLowerCase()) && key.length > 10) return val;
    }

    return text; // fallback to English
}

// ── Best voice selector ───────────────────────────────────────────────────────
function getBestVoice(lang) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    if (lang === 'ta') {
        return (
            voices.find(v => v.name === 'Google தமிழ்')              ||
            voices.find(v => v.lang === 'ta-IN')                      ||
            voices.find(v => v.name.toLowerCase().includes('tamil'))  ||
            null
        );
    }
    if (lang === 'hi') {
        return (
            voices.find(v => v.name === 'Google हिन्दी')             ||
            voices.find(v => v.lang === 'hi-IN')                      ||
            null
        );
    }
    if (lang === 'te') return voices.find(v => v.lang === 'te-IN') || null;
    if (lang === 'kn') return voices.find(v => v.lang === 'kn-IN') || null;
    if (lang === 'ml') return voices.find(v => v.lang === 'ml-IN') || null;

    // English — prefer Google Neural voices
    return (
        voices.find(v => v.name === 'Google UK English Female')  ||
        voices.find(v => v.name === 'Google US English')         ||
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en-IN'))             ||
        voices.find(v => v.lang.startsWith('en'))                ||
        voices[0]
    );
}

// ── Language code for utterance ───────────────────────────────────────────────
function langCode(lang) {
    const map = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN' };
    return map[lang] || 'en-IN';
}

// ─────────────────────────────────────────────────────────────────────────────
//  HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useVoiceGuide({ language = 'en' } = {}) {
    // Voice system state
    const unlockedRef     = useRef(false);   // Chrome autoplay unlock flag
    const isSpeakingRef   = useRef(false);
    const currentPrioRef  = useRef(0);       // priority of currently playing utterance
    const utteranceRef    = useRef(null);    // prevent GC
    const watchdogRef     = useRef(null);    // timeout to reset stuck TTS
    const langRef         = useRef(language);
    const voicesReadyRef  = useRef(false);

    // Correction throttle state
    const lastCorrectionRef     = useRef('');
    const lastCorrectionTimeRef = useRef(0);
    const corrRepeatCountRef    = useRef(0);  // must appear N times before speaking

    // Last mudra state (prevent repeating same "correct" message)
    const lastSpokenMudraRef    = useRef('');
    const lastFeedbackRef       = useRef('');

    useEffect(() => { langRef.current = language; }, [language]);

    // Load Chrome voices asynchronously
    useEffect(() => {
        const load = () => { voicesReadyRef.current = window.speechSynthesis.getVoices().length > 0; };
        load();
        window.speechSynthesis.onvoiceschanged = load;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    // ── Core internal speak (bypasses throttle — for pre-translated strings) ──
    const _doSpeak = useCallback((message, priority = PRIO.LOW) => {
        if (!unlockedRef.current) return;  // must be unlocked first
        if (!message) return;

        // Cancel lower-priority ongoing speech
        if (isSpeakingRef.current && priority <= currentPrioRef.current) return;
        if (isSpeakingRef.current && priority > currentPrioRef.current) {
            window.speechSynthesis.cancel();
            isSpeakingRef.current = false;
            clearTimeout(watchdogRef.current);
        }

        const lang = langRef.current;
        const utt  = new SpeechSynthesisUtterance(message);
        utt.lang   = langCode(lang);
        utt.rate   = lang === 'ta' ? 0.85 : 0.88;
        utt.pitch  = 1.05;
        utt.volume = 1.0;

        const voice = getBestVoice(lang);
        if (voice) utt.voice = voice;

        utt.onstart = () => {
            isSpeakingRef.current  = true;
            currentPrioRef.current = priority;
        };
        utt.onend = () => {
            isSpeakingRef.current  = false;
            currentPrioRef.current = 0;
            clearTimeout(watchdogRef.current);
        };
        utt.onerror = () => {
            isSpeakingRef.current  = false;
            currentPrioRef.current = 0;
        };

        utteranceRef.current = utt;
        currentPrioRef.current = priority;

        // Watchdog: if onend never fires (Chrome bug), reset after 8s
        watchdogRef.current = setTimeout(() => {
            isSpeakingRef.current  = false;
            currentPrioRef.current = 0;
        }, 8000);

        window.speechSynthesis.speak(utt);
    }, []);

    // ── Public speak (with translation + correction throttle) ─────────────────
    const speak = useCallback((text, { priority = PRIO.LOW, minInterval = 4000, mustRepeat = 0 } = {}) => {
        if (!text) return;
        const lang    = langRef.current;
        const message = translate(lang, text);
        const now     = Date.now();

        // Correction throttle: same message must appear mustRepeat+1 times
        if (mustRepeat > 0) {
            if (message === lastCorrectionRef.current) {
                corrRepeatCountRef.current++;
            } else {
                lastCorrectionRef.current  = message;
                corrRepeatCountRef.current = 1;
                return; // first occurrence — wait for confirmation
            }
            if (corrRepeatCountRef.current < mustRepeat + 1) return;
            // Enough repeats — reset and allow speaking
            corrRepeatCountRef.current = 0;
        }

        // Minimum interval throttle
        if (message === lastCorrectionRef.current && now - lastCorrectionTimeRef.current < minInterval) return;
        lastCorrectionTimeRef.current = now;

        _doSpeak(message, priority);
    }, [_doSpeak]);

    // ── Unlock (call inside Voice ON button click handler) ────────────────────
    const unlock = useCallback(() => {
        // Chrome requires a real SpeechSynthesisUtterance to be spoken
        // inside a user gesture handler to unlock TTS for the session.
        // We use a zero-volume utterance so the user doesn't hear it.
        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0;
        dummy.onend  = () => { unlockedRef.current = true; };
        dummy.onerror = () => { unlockedRef.current = true; };
        window.speechSynthesis.speak(dummy);
        // Also mark unlocked immediately in case onend doesn't fire
        setTimeout(() => { unlockedRef.current = true; }, 300);
    }, []);

    // ── Stop all speech ───────────────────────────────────────────────────────
    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        isSpeakingRef.current  = false;
        currentPrioRef.current = 0;
        clearTimeout(watchdogRef.current);
    }, []);

    // ── Test (call after unlock to verify voice works) ────────────────────────
    const test = useCallback(() => {
        const lang = langRef.current;
        const msg  = lang === 'ta' ? 'GestureIQ தயாராக உள்ளது' :
                     lang === 'hi' ? 'GestureIQ तैयार है'       :
                     'GestureIQ is ready. Show your mudra.';
        unlockedRef.current = true;  // force-unlock on test
        _doSpeak(msg, PRIO.HIGH);
    }, [_doSpeak]);

    // ── Voice instruction for a mudra (first announcement) ───────────────────
    const getInstruction = useCallback((mudraFolder) => {
        const lang = langRef.current;
        if (lang === 'ta' && VOICE_INSTRUCTIONS_TA[mudraFolder]) {
            return VOICE_INSTRUCTIONS_TA[mudraFolder];
        }
        return VOICE_INSTRUCTIONS_EN[mudraFolder] || `Now practicing ${mudraFolder} mudra`;
    }, []);

    // ── announce shortcuts (the main API used by Detect/Learn) ───────────────
    const announce = {
        // Call when camera first activates
        cameraActive: (mudraName) => {
            const inst = getInstruction(mudraName);
            _doSpeak(inst, PRIO.HIGH);
            lastSpokenMudraRef.current = mudraName;
            lastFeedbackRef.current    = '';
        },

        // Call when accuracy is very high (reinforcement)
        correct: () => {
            const lang = langRef.current;
            const msgs = {
                en: "Excellent! Perfect form.",
                ta: "அருமை! மிகச் சரியாக உள்ளது.",
                hi: "उत्कृष्ट! एकदम सही।"
            };
            _doSpeak(msgs[lang] || msgs.en, PRIO.HIGH);
        },

        // Call when accuracy is almost there (encouragement)
        almost: () => {
            const lang = langRef.current;
            const msgs = {
                en: "Almost there! Just a small adjustment.",
                ta: "கிட்டத்தட்ட சரியாக உள்ளது! சற்று சரிசெய்யுங்கள்.",
                hi: "लगभग सही है! बस थोड़ा सुधारें।"
            };
            _doSpeak(msgs[lang] || msgs.en, PRIO.MEDIUM);
        },

        // Call when no hand is detected (throttled at 6s)
        noHand: () => speak("Show your hand to the camera", { minInterval: 6000, priority: PRIO.MEDIUM }),

        // ────────────────────────────────────────────────────────────────────
        // MAIN METHOD: Call this every time you get a new detection result.
        // Pass is_stable from the API response. Voice will ONLY fire when
        // the prediction is confirmed stable by Flask's EMA smoothing.
        // ────────────────────────────────────────────────────────────────────
        fromResult: (data) => {
            if (!data.detected) {
                speak("Show your hand to the camera", { minInterval: 6000, priority: PRIO.MEDIUM });
                return;
            }

            // GATE: do not speak anything if prediction is not stable yet
            if (!data.is_stable) return;

            const corrections = data.corrections || [];
            const accuracy    = data.accuracy    || 0;
            const feedback    = data.feedback    || '';

            // Separate wrong-mudra message from finger corrections
            const wrongMsg = corrections.find(c => c.toLowerCase().startsWith('wrong mudra'));
            const fingerCorr = corrections.filter(c => !c.toLowerCase().startsWith('wrong mudra'));

            if (wrongMsg) {
                // Extract mudra names and translate for ALL 6 languages
                const detMatch = wrongMsg.match(/showing ([a-z]+)/i);
                const tgtMatch = wrongMsg.match(/target is ([a-z]+)/i);
                const det  = detMatch ? detMatch[1] : '';
                const tgt  = tgtMatch ? tgtMatch[1] : '';
                const lang = langRef.current;

                let msg;
                if (lang !== 'en' && det && tgt) {
                    // Use native-script mudra names + translated sentence template
                    const detName = getMudraName(lang, det);
                    const tgtName = getMudraName(lang, tgt);
                    const templates = {
                        ta: `தவறான முத்திரை. நீங்கள் ${detName} காட்டுகிறீர்கள். இலக்கு ${tgtName}.`,
                        hi: `गलत मुद्रा। आप ${detName} दिखा रहे हैं। लक्ष्य ${tgtName} है।`,
                        te: `తప్పు ముద్ర. మీరు ${detName} చూపిస్తున్నారు. లక్ష్యం ${tgtName}.`,
                        kn: `ತಪ್ಪು ಮುದ್ರೆ. ನೀವು ${detName} ತೋರಿಸುತ್ತಿದ್ದೀರಿ. ಗುರಿ ${tgtName}.`,
                        ml: `തെറ്റായ മുദ്ര. നിങ്ങൾ ${detName} കാണിക്കുന്നു. ലക്ഷ്യം ${tgtName}.`,
                    };
                    msg = templates[lang] || wrongMsg;
                } else {
                    msg = wrongMsg; // English fallback
                }
                speak(msg, { priority: PRIO.HIGH, minInterval: 4000 });
                return;
            }

            if (accuracy >= 75 && fingerCorr.length === 0) {
                // Correct form — only say it if this is new feedback
                const key = `correct_${data.name}`;
                if (lastFeedbackRef.current !== key) {
                    lastFeedbackRef.current = key;
                    const lang = langRef.current;
                    const msg = lang === 'ta' ? "சரியானது! அருமையான கோலம்" : "Correct! Great form.";
                    _doSpeak(msg, PRIO.HIGH);
                }
            } else if (fingerCorr.length > 0) {
                // Finger correction — must appear twice (mustRepeat=1) before speaking
                speak(fingerCorr[0], { priority: PRIO.LOW, minInterval: 4000, mustRepeat: 1 });
                lastFeedbackRef.current = '';
            }
        },

        // Call when hold is detected (high priority)
        hold: () => {
            const lang = langRef.current;
            const msg  = lang === 'ta' ? "நல்லது! இந்த நிலையை பிடித்திருங்கள்" : "Good! Now hold this position.";
            _doSpeak(msg, PRIO.HIGH);
        },

        // Call when starting to practice a mudra (speaks full instruction)
        start: (mudraNameOrFolder) => {
            const lang = langRef.current;
            const folder = (mudraNameOrFolder || '').toLowerCase().trim();
            // Use getInstruction which checks VOICE_INSTRUCTIONS_TA/HI first
            const inst = getInstruction(folder);
            if (inst) {
                _doSpeak(inst, PRIO.HIGH);
            }
        },

        // ────────────────────────────────────────────────────────────────────
        // Updated: SMART VOICE SCRIPT (The "Teacher" mode)
        // Speaks a full sentence: "Excellent! You mastered Pataka with a score of 95% in 12 attempts."
        // ────────────────────────────────────────────────────────────────────
        mastered: ({ mudra, score, attempts } = {}) => {
            const lang = langRef.current;
            const name = getMudraName(lang, mudra);
            let msg = '';

            if (lang === 'ta') {
                const label = score > 85 ? "மிகச் சிறப்பு" : score > 75 ? "மிகவும் நன்று" : score > 60 ? "நன்று" : "இன்னும் முயற்சி தேவை";
                msg = `${label}! நீங்கள் ${name} முத்திரையை ${attempts} முயற்சிகளில், ${score} சதவீத மதிப்பெண்களுடன் கற்றுக்கொண்டீர்கள். அருமை!`;
            } else if (lang === 'hi') {
                const label = score > 85 ? "बहुत बढ़िया" : score > 75 ? "बहुत अच्छा" : score > 60 ? "अच्छा" : "और सुधार की आवश्यकता है";
                msg = `${label}! आपने ${attempts} प्रयासों में, ${score} प्रतिशत स्कोर के साथ ${name} मुद्रा में महारत हासिल की है।`;
            } else {
                const label = score > 85 ? "Excellent" : score > 75 ? "Very Good" : score > 60 ? "Good" : "Keep Practicing";
                msg = `${label}! You mastered ${mudra} with a score of ${score} percent in ${attempts} attempts.`;
            }

            _doSpeak(msg, PRIO.HIGH);
        },

        // Call when progress is saved
        saved: (mudraFolder) => {
            const lang = langRef.current;
            const name = getMudraName(lang, mudraFolder);
            const msg  = lang === 'ta'
                ? `${name} முத்திரை உங்கள் முன்னேற்றத்தில் சேமிக்கப்பட்டது`
                : `${mudraFolder} mudra saved to your progress`;
            _doSpeak(msg, PRIO.HIGH);
        },

        // Call when level is unlocked
        levelUnlocked: (level) => {
            const lang = langRef.current;
            const msg  = lang === 'ta'
                ? `${level} நிலை திறக்கப்பட்டது. வாழ்த்துக்கள்!`
                : `Congratulations! You have unlocked the ${level} level.`;
            _doSpeak(msg, PRIO.HIGH);
        },

        // Raw speak (already-translated string, bypasses translate())
        raw: (msg, priority = PRIO.MEDIUM) => _doSpeak(msg, priority),
    };

    return { speak, stop, test, unlock, announce, getInstruction };
}

// ── Language selector component ───────────────────────────────────────────────
export function LanguageSelector({ lang, setLang, onChange, compact = false }) {
    // Accept both onChange and setLang prop names
    const handleChange = onChange || setLang;
    const opts = [
        { code: 'en', label: '🇬🇧 English' },
        { code: 'ta', label: '🇮🇳 Tamil'   },
        { code: 'hi', label: '🇮🇳 Hindi'   },
        { code: 'te', label: '🇮🇳 Telugu'  },
        { code: 'kn', label: '🇮🇳 Kannada' },
        { code: 'ml', label: '🇮🇳 Malay.'  },
    ];
    return (
        <select
            value={lang}
            onChange={e => handleChange(e.target.value)}
            style={{
                background: 'var(--bg-card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
            }}
        >
            {opts.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
        </select>
    );
}
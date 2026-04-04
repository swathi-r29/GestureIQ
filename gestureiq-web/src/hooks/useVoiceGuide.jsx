// src/hooks/useVoiceGuide.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: Single source of truth — voice instructions come from MUDRA_CONFIG,
//         which is also used by Learn.jsx for the Finger Guide UI.
//         No more separate VOICE_INSTRUCTIONS_EN with mismatched text.
//
// FIX 2: Wrong mudra voice guard — fromResult() now checks is_stable before
//         ever speaking "Wrong mudra", preventing false Ardhachandra calls.
//
// Languages: English (en-IN), Tamil (ta-IN), Hindi (hi-IN),
//            Telugu (te-IN), Kannada (kn-IN), Malayalam (ml-IN)
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback, useEffect } from 'react';

// ── Voice priority levels ─────────────────────────────────────────────────────
const PRIO = {
    LOW:    1,
    MEDIUM: 2,
    HIGH:   3,
};

// =============================================================================
// SINGLE SOURCE OF TRUTH — Mudra config
// Learn.jsx imports MUDRA_CONFIG for its Finger Guide UI.
// useVoiceGuide reads MUDRA_CONFIG.fingers for voice instructions.
// There is NO separate VOICE_INSTRUCTIONS_EN anymore.
// =============================================================================
export const MUDRA_CONFIG = {
    pataka:       { fingers: "Hold all four fingers straight together and bend your thumb inward across your palm.",                                                  meaning: "Flag",                usage: "Clouds, forest, river, blessing"              },
    tripataka:    { fingers: "Keep index, middle, and little fingers straight. Bend only your ring finger fully down toward your palm.",                             meaning: "Three parts of flag", usage: "Crown, tree, lamp flame, arrow"               },
    ardhapataka:  { fingers: "Keep index and middle fingers straight. Bend your ring and little fingers halfway inward. Keep your thumb extended straight.",         meaning: "Half flag",           usage: "Knife, two leaves, river banks"               },
    kartarimukha: { fingers: "Spread your index and middle fingers apart like scissors. Bend ring and little fingers into the palm. Bend your thumb inward.",        meaning: "Scissors face",       usage: "Separation, lightning, corner of eye"         },
    mayura:       { fingers: "Touch your thumb tip to your ring fingertip. Keep index, middle, and little fingers spread out straight.",                             meaning: "Peacock",             usage: "Applying tilak, braid, gentle touch"          },
    ardhachandra: { fingers: "Open all five fingers fully apart. Extend your thumb completely sideways away from your palm.",                                         meaning: "Half moon",           usage: "Moon, plate, beginning prayer"                },
    arala:        { fingers: "Bend only your index finger slightly inward. Keep all other fingers straight.",                                                         meaning: "Bent",                usage: "Drinking nectar, wind, poison"                },
    shukatunda:   { fingers: "Press your thumb against the base of your ring finger. Point your index, middle, and little fingers forward.",                         meaning: "Parrot beak",         usage: "Shooting arrow, direction"                    },
    mushti:       { fingers: "Close all four fingers firmly into a tight fist. Place your thumb over them.",                                                          meaning: "Fist",                usage: "Grasping, wrestling, holding hair"             },
    shikhara:     { fingers: "Make a tight fist with all four fingers. Raise only your thumb straight up.",                                                           meaning: "Spire",               usage: "Bow, pillar, husband, Shiva"                  },
    kapittha:     { fingers: "Curl all fingers loosely inward to a mid-range position. Press your thumb firmly against your curled index finger.",                    meaning: "Wood apple",          usage: "Lakshmi, Saraswati, holding cymbals"          },
    katakamukha:  { fingers: "Curve your index and middle fingers toward your thumb, forming a bracelet opening. Keep ring and little fingers extended.",             meaning: "Bracelet opening",    usage: "Picking flowers, garland, pulling bow"        },
    suchi:        { fingers: "Point only your index finger straight up. Fold all other fingers into a fist.",                                                         meaning: "Needle",              usage: "Universe, number one, the city"               },
    chandrakala:  { fingers: "Form a crescent shape with your thumb and index finger spread apart. Keep middle, ring, and little fingers curled into the palm.",      meaning: "Crescent moon",       usage: "Shiva's moon, forehead mark"                  },
    padmakosha:   { fingers: "Curve all five fingers inward gently, like cupping a large mango. Tilt your wrist slightly forward.",                                   meaning: "Lotus bud",           usage: "Apple, round ball, lotus"                     },
    sarpashira:   { fingers: "Hold all fingers flat and pressed tightly together with no gaps. Bend your wrist so fingers point forward like a snake head.",          meaning: "Snake head",          usage: "Snake, elephant trunk, water"                 },
    mrigashira:   { fingers: "Raise your thumb and little finger straight up. Fold your index, middle, and ring fingers tightly inward.",                             meaning: "Deer head",           usage: "Deer, forest, gentle touch, woman"            },
    simhamukha:   { fingers: "Extend your index and little fingers straight up. Bend middle and ring fingers inward. Bend your thumb inward.",                        meaning: "Lion face",           usage: "Lion, horse, fearlessness, power"             },
    kangula:      { fingers: "Bend your ring finger fully inward toward your palm. Keep index, middle, and little fingers gently curved, not fully straight.",        meaning: "Bell",                usage: "Bell, fruit, drop of water"                   },
    alapadma:     { fingers: "Spread all five fingers as wide as possible with a gentle curve, like a fully bloomed lotus.",                                           meaning: "Full bloomed lotus",  usage: "Full moon, beauty, lake, disc"                },
    chatura:      { fingers: "Extend index, middle, and ring fingers straight up together. Let the little finger curve slightly. Curl your thumb inward.",            meaning: "Clever",              usage: "Gold, wind, slight movement"                  },
    bhramara:     { fingers: "Touch your index fingertip to your thumb tip forming a loop. Bend your middle finger inward. Extend your ring and little fingers.",     meaning: "Bee",                 usage: "Bee, bird, six seasons"                       },
    hamsasya:     { fingers: "Bring all five fingertips together to meet at a single point, like a swan's beak.",                                                     meaning: "Swan beak",           usage: "Pearl, tying thread, number five"             },
    hamsapaksha:  { fingers: "Spread all fingers in a gentle wave shape, each finger at a slightly different angle.",                                                  meaning: "Swan wing",           usage: "Swan, number six, gentle waving"              },
    sandamsha:    { fingers: "Pinch your index and middle fingertips tightly together. Curl your ring and little fingers inward.",                                     meaning: "Tongs",               usage: "Picking flowers, tongs, crab claw"            },
    mukula:       { fingers: "Bring all five fingertips loosely together in a flower bud shape.",                                                                      meaning: "Bud",                 usage: "Lotus bud, eating, navel"                     },
    tamrachuda:   { fingers: "Raise your thumb and little finger straight up. Fold your index, middle, and ring fingers into a fist.",                                meaning: "Rooster",             usage: "Rooster, peacock, bird crest"                 },
    trishula:     { fingers: "Raise index, middle, and ring fingers straight up like a trident. Curl your thumb and little finger inward.",                           meaning: "Trident",             usage: "Shiva's trident, three paths"                 },
    palli:        { fingers: "Extend index and middle fingers. Fold ring and little fingers. Tuck your thumb inward.",                                                 meaning: "Lizard",              usage: "Regional mudra"                               },
    vyaaghr:      { fingers: "Extend thumb, index, and little fingers. Fold middle and ring fingers inward.",                                                          meaning: "Tiger",               usage: "Regional mudra"                               },
};

// ── Tamil translations ────────────────────────────────────────────────────────
const TRANSLATIONS = {
    'ta': {
        "Show your hand to the camera":             "உங்கள் கையை கேமராவில் காட்டுங்கள்",
        "Show your hand more clearly":              "உங்கள் கையை தெளிவாக காட்டுங்கள்",
        "Voice guidance is active":                 "குரல் வழிகாட்டல் செயல்படுகிறது",
        "Good! Now hold this position.":            "நல்லது! இந்த நிலையை பிடித்திருங்கள்",
        "Correct! Great form.":                     "சரியானது! அருமையான கோலம்",
        "Try Again — almost there!":                "மீண்டும் முயற்சிக்கவும், கிட்டத்தட்ட சரியாக உள்ளது",
        "Try Again — adjust your hand position.":  "மீண்டும் முயற்சிக்கவும், கையின் நிலையை சரிசெய்யவும்",
        "Straighten your index finger":             "ஆட்காட்டி விரலை நேராக்குங்கள்",
        "Straighten your middle finger":            "நடு விரலை நேராக்குங்கள்",
        "Straighten your ring finger":              "மோதிர விரலை நேராக்குங்கள்",
        "Straighten your little finger":            "சிறு விரலை நேராக்குங்கள்",
        "Extend your thumb outward":                "கட்டை விரலை வெளியே நீட்டுங்கள்",
        "Curl your index finger more":              "ஆட்காட்டி விரலை மேலும் மடக்குங்கள்",
        "Curl your middle finger more":             "நடு விரலை மேலும் மடக்குங்கள்",
        "Curl your ring finger more":               "மோதிர விரலை மேலும் மடக்குங்கள்",
        "Curl your little finger more":             "சிறு விரலை மேலும் மடக்குங்கள்",
        "Bend your thumb inward":                   "கட்டை விரலை உள்ளே மடக்குங்கள்",
        "Relax your index finger slightly":         "ஆட்காட்டி விரலை சற்று தளர்த்துங்கள்",
        "Relax your middle finger slightly":        "நடு விரலை சற்று தளர்த்துங்கள்",
        "Relax your ring finger slightly":          "மோதிர விரலை சற்று தளர்த்துங்கள்",
        "Relax your little finger slightly":        "சிறு விரலை சற்று தளர்த்துங்கள்",
        "Relax your thumb slightly":                "கட்டை விரலை சற்று தளர்த்துங்கள்",
        "Press your thumb against your ring finger":    "கட்டை விரலை மோதிர விரலில் அழுத்துங்கள்",
        "Bring all fingertips together to a point":     "அனைத்து விரல் நுனிகளையும் ஒரே இடத்தில் சேர்க்கவும்",
        "Press all fingers tightly together — no gaps": "அனைத்து விரல்களையும் இறுக்கமாக சேர்த்து பிடிக்கவும்",
        "Spread index and middle finger apart like scissors": "ஆட்காட்டி மற்றும் நடு விரலை கத்தரிக்கோல் போல் பரப்புங்கள்",
        "Spread all five fingers wide apart like a blooming lotus": "அனைத்து விரல்களையும் அகல விரிக்கவும்",
        "Curve ALL fingers inward — imagine holding a large mango": "அனைத்து விரல்களையும் உள்நோக்கி வளையுங்கள்",
        "Raise your little finger straight up":     "சிறு விரலை நேரே மேலே தூக்குங்கள்",
        "Raise your thumb straight up":             "கட்டை விரலை நேரே மேலே தூக்குங்கள்",
    },
    'hi': {
        "Show your hand to the camera":             "अपना हाथ कैमरे के सामने रखें",
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
        "Bend your thumb inward":                   "अंगूठे को अंदर की ओर मोड़ें",
        "Press your thumb against your ring finger": "अंगूठे को अनामिका उंगली से दबाएं",
        "Bring all fingertips together to a point": "सभी उंगलियों की नोक को एक बिंदु पर लाएं",
    },
    'te': {
        "Show your hand to the camera":             "మీ చేతిని కెమెరా ముందు పెట్టండి",
        "Correct! Great form.":                     "సరైనది! చాలా బాగుంది",
        "Straighten your index finger":             "మీ చూపుడు వేలిని నేరుగా పెట్టండి",
        "Bend your thumb inward":                   "బొటన వేలిని లోపలికి వంచండి",
        "Good! Now hold this position.":            "బాగుంది! ఇప్పుడు ఈ స్థితిలో ఉండండి",
    },
    'kn': {
        "Show your hand to the camera":             "ನಿಮ್ಮ ಕೈಯನ್ನು ಕ್ಯಾಮೆರಾ ಮುಂದೆ ತೋರಿಸಿ",
        "Correct! Great form.":                     "ಸರಿಯಾಗಿದೆ! ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ",
        "Straighten your index finger":             "ನಿಮ್ಮ ತೋರು ಬೆರಳನ್ನು ನೇರ ಮಾಡಿ",
        "Good! Now hold this position.":            "ಚೆನ್ನಾಗಿದೆ! ಈ ಸ್ಥಾನ ಹಿಡಿದಿರಿ",
    },
    'ml': {
        "Show your hand to the camera":             "നിങ്ങളുടെ കൈ ക്യാമറയ്ക്ക് മുന്നിൽ കാണിക്കൂ",
        "Correct! Great form.":                     "ശരിയാണ്! വളരെ നല്ലത്",
        "Straighten your index finger":             "ചൂണ്ടുവിരൽ നേരെ നിർത്തൂ",
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

// ── Translation helper ────────────────────────────────────────────────────────
function translate(lang, text) {
    if (!lang || lang === 'en') return text;
    const map = TRANSLATIONS[lang];
    if (!map) return text;
    if (map[text]) return map[text];
    for (const [key, val] of Object.entries(map)) {
        if (text.toLowerCase().startsWith(key.toLowerCase())) return val;
        if (key.toLowerCase().startsWith(text.toLowerCase().slice(0, 20))) return val;
    }
    for (const [key, val] of Object.entries(map)) {
        if (text.toLowerCase().includes(key.toLowerCase()) && key.length > 10) return val;
    }
    return text;
}

// ── Best voice selector ───────────────────────────────────────────────────────
function getBestVoice(lang) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    if (lang === 'ta') {
        return voices.find(v => v.name === 'Google தமிழ்') ||
               voices.find(v => v.lang === 'ta-IN') ||
               voices.find(v => v.name.toLowerCase().includes('tamil')) || null;
    }
    if (lang === 'hi') {
        return voices.find(v => v.name === 'Google हिन्दी') ||
               voices.find(v => v.lang === 'hi-IN') || null;
    }
    if (lang === 'te') return voices.find(v => v.lang === 'te-IN') || null;
    if (lang === 'kn') return voices.find(v => v.lang === 'kn-IN') || null;
    if (lang === 'ml') return voices.find(v => v.lang === 'ml-IN') || null;
    return voices.find(v => v.name === 'Google UK English Female') ||
           voices.find(v => v.name === 'Google US English') ||
           voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
           voices.find(v => v.lang.startsWith('en-IN')) ||
           voices.find(v => v.lang.startsWith('en')) ||
           voices[0];
}

function langCode(lang) {
    const map = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN' };
    return map[lang] || 'en-IN';
}

// ─────────────────────────────────────────────────────────────────────────────
//  HOOK
// ─────────────────────────────────────────────────────────────────────────────
export function useVoiceGuide({ language = 'en' } = {}) {
    const unlockedRef            = useRef(false);
    const isSpeakingRef          = useRef(false);
    const currentPrioRef         = useRef(0);
    const utteranceRef           = useRef(null);
    const watchdogRef            = useRef(null);
    const langRef                = useRef(language);
    const voicesReadyRef         = useRef(false);

    // Correction throttle
    const lastCorrectionRef      = useRef('');
    const lastCorrectionTimeRef  = useRef(0);
    const corrRepeatCountRef     = useRef(0);

    // Last spoken state
    const lastSpokenMudraRef     = useRef('');
    const lastFeedbackRef        = useRef('');
    const globalVoiceCooldownRef = useRef(0);

    // ── FIX: Wrong mudra guard ─────────────────────────────────────────────
    // Track consecutive stable frames before allowing wrong-mudra voice.
    // Prevents false "Wrong mudra — Ardhachandra" during hand stabilization.
    const wrongMudraCountRef     = useRef(0);
    const WRONG_MUDRA_GATE       = 3; // must appear 3 consecutive stable frames

    useEffect(() => { langRef.current = language; }, [language]);

    useEffect(() => {
        const load = () => { voicesReadyRef.current = window.speechSynthesis.getVoices().length > 0; };
        load();
        window.speechSynthesis.onvoiceschanged = load;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, []);

    const _doSpeak = useCallback((message, priority = PRIO.LOW) => {
        if (!unlockedRef.current || !message) return;
        const now = Date.now();
        // High priority (Wrong Mudra) can interrupt at any time. 
        // Lower priority (corrections) must wait for cooldown.
        if (priority < PRIO.HIGH && now - globalVoiceCooldownRef.current < 2200) return;
        globalVoiceCooldownRef.current = now;

        window.speechSynthesis.cancel();
        const lang = langRef.current;
        const utt  = new SpeechSynthesisUtterance(message);
        utt.lang   = langCode(lang);
        utt.rate   = 0.9;
        utt.pitch  = 1.0;
        utt.volume = 1.0;
        const voice = getBestVoice(lang);
        if (voice) utt.voice = voice;

        utt.onstart  = () => { isSpeakingRef.current = true;  currentPrioRef.current = priority; };
        utt.onend    = () => { isSpeakingRef.current = false; currentPrioRef.current = 0; clearTimeout(watchdogRef.current); };
        utt.onerror  = () => { isSpeakingRef.current = false; currentPrioRef.current = 0; };
        utteranceRef.current   = utt;
        currentPrioRef.current = priority;
        watchdogRef.current    = setTimeout(() => { isSpeakingRef.current = false; currentPrioRef.current = 0; }, 8000);
        window.speechSynthesis.speak(utt);
    }, []);

    const speak = useCallback((text, { priority = PRIO.LOW, minInterval = 4000, mustRepeat = 0 } = {}) => {
        if (!text) return;
        const lang    = langRef.current;
        const message = translate(lang, text);
        const now     = Date.now();
        if (mustRepeat > 0) {
            if (message === lastCorrectionRef.current) {
                corrRepeatCountRef.current++;
            } else {
                lastCorrectionRef.current  = message;
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
        const dummy   = new SpeechSynthesisUtterance(' ');
        dummy.volume  = 0;
        dummy.onend   = () => { unlockedRef.current = true; };
        dummy.onerror = () => { unlockedRef.current = true; };
        window.speechSynthesis.speak(dummy);
        setTimeout(() => { unlockedRef.current = true; }, 300);
    }, []);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
        isSpeakingRef.current  = false;
        currentPrioRef.current = 0;
        clearTimeout(watchdogRef.current);
    }, []);

    const test = useCallback(() => {
        const lang = langRef.current;
        const msg  = lang === 'ta' ? 'GestureIQ தயாராக உள்ளது' :
                     lang === 'hi' ? 'GestureIQ तैयार है'       :
                     'GestureIQ is ready. Show your mudra.';
        unlockedRef.current = true;
        _doSpeak(msg, PRIO.HIGH);
    }, [_doSpeak]);

    // ── FIX: getInstruction reads from MUDRA_CONFIG.fingers (single source) ──
    const getInstruction = useCallback((mudraFolder) => {
        const lang   = langRef.current;
        const config = MUDRA_CONFIG[mudraFolder];
        if (!config) return `Now practicing ${mudraFolder} mudra`;

        // For Tamil, provide a localized intro + English finger instruction
        // (Full Tamil translations can be added to MUDRA_CONFIG later)
        if (lang === 'ta') {
            const taName = getMudraName('ta', mudraFolder);
            return `${taName} முத்திரை. ${config.fingers}`;
        }
        if (lang === 'hi') {
            const hiName = getMudraName('hi', mudraFolder);
            return hiName !== mudraFolder
                ? `${hiName} मुद्रा। ${config.fingers}`
                : `${mudraFolder} mudra. ${config.fingers}`;
        }

        // English — use exact fingers text from config
        const name = mudraFolder.charAt(0).toUpperCase() + mudraFolder.slice(1);
        return `${name} mudra. ${config.fingers}`;
    }, []);

    // ── announce API ──────────────────────────────────────────────────────────
    const announce = {

        cameraActive: (mudraName) => {
            const inst = getInstruction(mudraName);
            _doSpeak(inst, PRIO.HIGH);
            lastSpokenMudraRef.current = mudraName;
            lastFeedbackRef.current    = '';
            wrongMudraCountRef.current = 0;
        },

        correct: () => {
            const lang = langRef.current;
            const msgs = { en: "Excellent! Perfect form.", ta: "அருமை! மிகச் சரியாக உள்ளது.", hi: "उत्कृष्ट! एकदम सही।" };
            _doSpeak(msgs[lang] || msgs.en, PRIO.HIGH);
        },

        almost: () => {
            const lang = langRef.current;
            const msgs = { en: "Almost there! Just a small adjustment.", ta: "கிட்டத்தட்ட சரியாக உள்ளது! சற்று சரிசெய்யுங்கள்.", hi: "लगभग सही है! बस थोड़ा सुधारें।" };
            _doSpeak(msgs[lang] || msgs.en, PRIO.MEDIUM);
        },

        noHand: () => speak("Show your hand to the camera", { minInterval: 6000, priority: PRIO.MEDIUM }),

        // ─────────────────────────────────────────────────────────────────────
        // fromResult — MAIN method called by Learn.jsx every detection frame.
        //
        // FIX: Wrong mudra guard implemented here.
        //   • Checks data.is_stable before any wrong-mudra announcement.
        //   • wrongMudraCountRef must reach WRONG_MUDRA_GATE (3) consecutive
        //     stable frames before the voice fires.
        //   • This eliminates the false "Wrong mudra — Ardhachandra" that was
        //     firing immediately on every new mudra attempt.
        // ─────────────────────────────────────────────────────────────────────
        fromResult: (data) => {
            if (!data.detected) {
                speak("Show your hand to the camera", { minInterval: 6000, priority: PRIO.MEDIUM });
                wrongMudraCountRef.current = 0;
                return;
            }

            // GATE 1: Do not speak anything while prediction is not stable
            if (!data.is_stable) {
                wrongMudraCountRef.current = 0;
                return;
            }

            const corrections = data.corrections || [];
            const accuracy    = data.accuracy    || 0;

            const wrongMsg   = corrections.find(c => c.toLowerCase().startsWith('wrong mudra'));
            const fingerCorr = corrections.filter(c => !c.toLowerCase().startsWith('wrong mudra'));

            if (wrongMsg) {
                // GATE 2: Wrong mudra must be stable for WRONG_MUDRA_GATE frames
                // before we announce it — prevents transient false positives.
                wrongMudraCountRef.current++;
                if (wrongMudraCountRef.current < WRONG_MUDRA_GATE) return;

                const detMatch = wrongMsg.match(/showing ([a-zA-Z]+)/i);
                const tgtMatch = wrongMsg.match(/(?:target is|instead of) ([a-zA-Z]+)/i);
                const det  = detMatch ? detMatch[1] : '';
                const tgt  = tgtMatch ? tgtMatch[1] : '';
                const lang = langRef.current;

                let msg;
                if (lang !== 'en' && det && tgt) {
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
                    msg = wrongMsg;
                }
                speak(msg, { priority: PRIO.HIGH, minInterval: 7000 });
                return;
            }

            // Correct mudra — reset wrong counter
            wrongMudraCountRef.current = 0;

            if (accuracy >= 75 && fingerCorr.length === 0) {
                const key = `correct_${data.name}`;
                if (lastFeedbackRef.current !== key) {
                    lastFeedbackRef.current = key;
                    const lang = langRef.current;
                    const msg  = lang === 'ta' ? "சரியானது! அருமையான கோலம்" : "Correct! Great form.";
                    _doSpeak(msg, PRIO.HIGH);
                }
            } else if (fingerCorr.length > 0) {
                // Correction — must appear twice (mustRepeat=1) before speaking
                speak(fingerCorr[0], { priority: PRIO.LOW, minInterval: 5000, mustRepeat: 1 });
                lastFeedbackRef.current = '';
            }
        },

        hold: () => {
            const lang = langRef.current;
            const msg  = lang === 'ta' ? "நல்லது! இந்த நிலையை பிடித்திருங்கள்" : "Good! Now hold this position.";
            _doSpeak(msg, PRIO.HIGH);
        },

        start: (mudraNameOrFolder) => {
            const folder = (mudraNameOrFolder || '').toLowerCase().trim();
            const inst   = getInstruction(folder);
            if (inst) _doSpeak(inst, PRIO.HIGH);
        },

        mastered: ({ mudra, score, attempts } = {}) => {
            const lang           = langRef.current;
            const name           = getMudraName(lang, mudra);
            const attemptsText   = attempts <= 1 ? "just one attempt" : `${attempts} attempts`;
            const attemptsTextTa = attempts <= 1 ? "ஒரே முயற்சியில்"  : `${attempts} முயற்சிகளில்`;
            let msg = '';

            if (lang === 'ta') {
                const label = score > 85 ? "அற்புதம்" : score > 75 ? "மிகவும் நன்று" : score > 60 ? "நன்று" : "தொடர்ந்து முயற்சியுங்கள்";
                msg = `${label}! நீங்கள் ${name} முத்திரையை ${attemptsTextTa}, ${score} சதவீத துல்லியத்துடன் கற்றுக்கொண்டீர்கள். அருமை!`;
            } else if (lang === 'hi') {
                const label = score > 85 ? "बहुत बढ़िया" : score > 75 ? "बहुत अच्छा" : score > 60 ? "अच्छा" : "कोशिश करते रहें";
                msg = `${label}! आपने ${attempts} प्रयासों में, ${score} प्रतिशत सटीकता के साथ ${name} मुद्रा सीख ली है।`;
            } else {
                const label = score > 85 ? "Excellent" : score > 75 ? "Very Good" : score > 60 ? "Good Job" : "Keep Practicing";
                msg = `${label}! You mastered ${mudra} with ${score} percent accuracy in ${attemptsText}. Great work!`;
            }
            _doSpeak(msg, PRIO.HIGH);
        },

        saved: (mudraFolder) => {
            const lang = langRef.current;
            const name = getMudraName(lang, mudraFolder);
            const msg  = lang === 'ta'
                ? `${name} முத்திரை உங்கள் முன்னேற்றத்தில் சேமிக்கப்பட்டது`
                : `${mudraFolder} mudra saved to your progress`;
            _doSpeak(msg, PRIO.HIGH);
        },

        levelUnlocked: (level) => {
            const lang = langRef.current;
            const msg  = lang === 'ta'
                ? `${level} நிலை திறக்கப்பட்டது. வாழ்த்துக்கள்!`
                : `Congratulations! You have unlocked the ${level} level.`;
            _doSpeak(msg, PRIO.HIGH);
        },

        raw: (msg, priority = PRIO.MEDIUM) => _doSpeak(msg, priority),

        // Reset wrong-mudra gate (call when user switches target mudra)
        resetWrongGate: () => { wrongMudraCountRef.current = 0; },
    };

    return { speak, stop, test, unlock, announce, getInstruction };
}

// ── Language selector component ───────────────────────────────────────────────
export function LanguageSelector({ lang, setLang, onChange, compact = false }) {
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
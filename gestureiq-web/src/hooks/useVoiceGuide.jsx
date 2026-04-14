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

import { useRef, useCallback, useEffect } from 'react';

// ── Voice priority levels ─────────────────────────────────────────────────────
const PRIO = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
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
    anjali: { fingers: "Press both palms together in a prayer position at chest or head level.", meaning: "Offering", usage: "Greeting, prayer, respect" },
    kapotha: { fingers: "Bring both palms together but curve the center outward, forming a hollow space between them.", meaning: "Pigeon", usage: "Respectful address, humble request" },
    karkata: { fingers: "Interlace the fingers of both hands together, forming a mesh.", meaning: "Crab", usage: "Coming together, collective strength" },
    svastika: { fingers: "Cross both hands at the wrists, keeping fingers straight like flags.", meaning: "Crossed", usage: "Fear, praise, dispute" },
    dola: { fingers: "Hold both Pataka hands loosely at the sides of the thighs with wrists relaxed.", meaning: "Swing", usage: "Beginning of dance, relaxation" },
    puspaputa: { fingers: "Press the outer edges (little finger side) of both hands together to form a bowl-like cup.", meaning: "Flower casket", usage: "Offering flowers, receiving gifts" },
    utsanga: { fingers: "Cross the arms at the wrists so each hand touches the opposite shoulder.", meaning: "Embrace", usage: "Modesty, embrace, cold" },
    sivalinga: { fingers: "Place a right-hand Shikhara (thumb up) on top of a flat left-hand Pataka palm.", meaning: "Lord Shiva", usage: "Representation of Shiva Linga" },
    katakavardhana: { fingers: "Cross two Katakamukha hands at the wrists.", meaning: "Bracelet cross", usage: "Marriage, coronation, worship" },
    kartarisvastika: { fingers: "Cross two Kartarimukha hands at the wrists.", meaning: "Scissors cross", usage: "Trees, hill tops, peaks" },
    sakata: { fingers: "Hold two Bhramara hands with fingers spread to represent wheels.", meaning: "Demon / Cart", usage: "Representation of a demon or cart" },
    sankha: { fingers: "Enclose the left thumb with right fingers and touch the right thumb to the left index finger.", meaning: "Conch", usage: "Conch shell, ritual sound" },
    chakra: { fingers: "Place the palms flat against each other and rotate them perpendicular to form a wheel.", meaning: "Wheel / Disc", usage: "Lord Vishnu's discus, wheel" },
    samputa: { fingers: "Close the fingers of two Kapittha hands together to hide something.", meaning: "Casket", usage: "Hiding a secret, closing a box" },
    pasa: { fingers: "Interlock the index fingers of two Suchi hands like links in a chain.", meaning: "Noose", usage: "Quarrel, rope, bond" },
    kilaka: { fingers: "Interlock the little fingers of two Mrigashira hands.", meaning: "Bond", usage: "Friendship, affection, talk" },
    matsya: { fingers: "Place one palm on top of the other, pointing both thumbs outward like fish fins.", meaning: "Fish", usage: "Fish, Lord Vishnu's Matsya avatar" },
    kurma: { fingers: "Cross hands and bend fingers to represent a turtle's shell and head.", meaning: "Tortoise", usage: "Tortoise, Lord Vishnu's Kurma avatar" },
    varaha: { fingers: "Place one hand over the other with fingers interlocked to show a boar's snout.", meaning: "Boar", usage: "Wild boar, Lord Vishnu's Varaha avatar" },
    garuda: { fingers: "Interlock two thumbs and spread the fingers of both hands like bird wings.", meaning: "Eagle", usage: "Garuda bird, flying" },
    nagabandha: { fingers: "Intertwine both arms and hands to represent two snakes coiling together.", meaning: "Serpent bond", usage: "Snakes, coiling, twin bond" },
    bherunda: { fingers: "Join two Kapittha hands at the wrists, pointing in opposite directions.", meaning: "Two-headed bird", usage: "Mythical bird Bherunda" },
    katva: { fingers: "Invert two Chatura hands so the fingertips meet to form the legs of a cot.", meaning: "Cot", usage: "Bed, cot, litter" },
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
        "Straighten your index finger": "ஆட்காட்டி விரலை நேராக்குங்கள்",
        "Straighten your middle finger": "நடு விரலை நேராக்குங்கள்",
        "Straighten your ring finger": "மோதிர விரலை நேராக்குங்கள்",
        "Straighten your little finger": "சிறு விரலை நேராக்குங்கள்",
        "Extend your thumb outward": "கட்டை விரலை வெளியே நீட்டுங்கள்",
        "Curl your index finger more": "ஆட்காட்டி விரலை மேலும் மடக்குங்கள்",
        "Curl your middle finger more": "நடு விரலை மேலும் மடக்குங்கள்",
        "Curl your ring finger more": "மோதிர விரலை மேலும் மடக்குங்கள்",
        "Curl your little finger more": "சிறு விரலை மேலும் மடக்குங்கள்",
        "Bend your thumb inward": "கட்டை விரலை உள்ளே மடக்குங்கள்",
        "Relax your index finger slightly": "ஆட்காட்டி விரலை சற்று தளர்த்துங்கள்",
        "Relax your middle finger slightly": "நடு விரலை சற்று தளர்த்துங்கள்",
        "Relax your ring finger slightly": "மோதிர விரலை சற்று தளர்த்துங்கள்",
        "Relax your little finger slightly": "சிறு விரலை சற்று தளர்த்துங்கள்",
        "Relax your thumb slightly": "கட்டை விரலை சற்று தளர்த்துங்கள்",
        "Press your thumb against your ring finger": "கட்டை விரலை மோதிர விரலில் அழுத்துங்கள்",
        "Bring all fingertips together to a point": "அனைத்து விரல் நுனிகளையும் ஒரே இடத்தில் சேர்க்கவும்",
        "Press all fingers tightly together — no gaps": "அனைத்து விரல்களையும் இறுக்கமாக சேர்த்து பிடிக்கவும்",
        "Spread index and middle finger apart like scissors": "ஆட்காட்டி மற்றும் நடு விரலை கத்தரிக்கோல் போல் பரப்புங்கள்",
        "Spread all five fingers wide apart like a blooming lotus": "அனைத்து விரல்களையும் அகல விரிக்கவும்",
        "Curve ALL fingers inward — imagine holding a large mango": "அனைத்து விரல்களையும் உள்நோக்கி வளையுங்கள்",
        "Raise your little finger straight up": "சிறு விரலை நேரே மேலே தூக்குங்கள்",
        "Raise your thumb straight up": "கட்டை விரலை நேரே மேலே தூக்குங்கள்",
    },
    'hi': {
        "Show your hand to the camera": "अपना हाथ कैमरे के सामने रखें",
        "Good! Now hold this position.": "अच्छा! अब इस स्थिति को बनाए रखें",
        "Correct! Great form.": "सही है! बहुत अच्छा",
        "Straighten your index finger": "अपनी तर्जनी उंगली सीधी करें",
        "Straighten your middle finger": "अपनी मध्यमा उंगली सीधी करें",
        "Straighten your ring finger": "अपनी अनामिका उंगली सीधी करें",
        "Straighten your little finger": "अपनी कनिष्ठा उंगली सीधी करें",
        "Curl your index finger more": "तर्जनी उंगली को अधिक मोड़ें",
        "Curl your middle finger more": "मध्यमा उंगली को अधिक मोड़ें",
        "Curl your ring finger more": "अनामिका उंगली को अधिक मोड़ें",
        "Curl your little finger more": "कनिष्ठा उंगली को अधिक मोड़ें",
        "Bend your thumb inward": "अंगूठे को अंदर की ओर मोड़ें",
        "Press your thumb against your ring finger": "अंगूठे को अनामिका उंगली से दबाएं",
        "Bring all fingertips together to a point": "सभी उंगलियों की नोक को एक बिंदु पर लाएं",
    }
};

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
};

export function getMudraName(lang, key) {
    return MUDRA_NAMES[lang]?.[key.toLowerCase()] || key;
}

export function translate(lang, text) {
    if (!lang || lang === 'en' || !text) return text;
    const map = TRANSLATIONS[lang];
    if (!map) return text;

    // 1. Exact match
    if (map[text]) return map[text];

    // 2. Fuzzy match - strip technical suffixes
    let base = text.split(' — ')[0].split(' for ')[0].trim();
    if (map[base]) return map[base];

    // 3. Fallback to substring matching
    for (const [key, val] of Object.entries(map)) {
        if (base.toLowerCase().startsWith(key.toLowerCase())) return val;
        if (key.toLowerCase().startsWith(base.toLowerCase().slice(0, 20))) return val;
    }
    return text;
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

    useEffect(() => { langRef.current = language; }, [language]);

    const _doSpeak = useCallback((message, priority = PRIO.LOW) => {
        if (!unlockedRef.current || !message) return;
        const now = Date.now();
        
        // Use a stricter cooldown for low-priority messages
        const cooldown = priority >= PRIO.HIGH ? 1000 : 2500;
        if (now - globalVoiceCooldownRef.current < cooldown && message === lastFeedbackRef.current) return;
        
        globalVoiceCooldownRef.current = now;
        lastFeedbackRef.current = message;

        // Immediate cancel flushes the instruction queue to prevent lag
        window.speechSynthesis.cancel();
        const lang = langRef.current;
        const utt = new SpeechSynthesisUtterance(message);
        utt.lang = langCode(lang);
        utt.rate = 0.9;
        
        const voice = getBestVoice(lang);
        if (voice) utt.voice = voice;

        utt.onstart = () => { isSpeakingRef.current = true; currentPrioRef.current = priority; };
        utt.onend = () => { isSpeakingRef.current = false; currentPrioRef.current = 0; };
        window.speechSynthesis.speak(utt);
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
        const dummy = new SpeechSynthesisUtterance(' ');
        dummy.volume = 0;
        dummy.onend = () => { unlockedRef.current = true; };
        window.speechSynthesis.speak(dummy);
        setTimeout(() => { unlockedRef.current = true; }, 300);
    }, []);

    const test = useCallback(() => {
        const lang = langRef.current;
        const msg = lang === 'ta' ? 'ஜஸ்டர் ஐக்யூ தயாராக உள்ளது' : 
                    lang === 'hi' ? 'जेस्चर आईक्यू तैयार है' : 
                    'GestureIQ is ready';
        unlockedRef.current = true;
        _doSpeak(msg, PRIO.HIGH);
    }, [_doSpeak]);

    const getInstruction = useCallback((mudraFolder) => {
        const lang = langRef.current;
        const config = MUDRA_CONFIG[mudraFolder];
        if (!config) return `Now practicing ${mudraFolder} mudra`;

        if (lang === 'ta') {
            const taName = getMudraName('ta', mudraFolder);
            return `${taName} முத்திரை. ${translate('ta', config.fingers)}`;
        }
        if (lang === 'hi') {
            const hiName = getMudraName('hi', mudraFolder);
            return `${hiName} मुद्रा। ${translate('hi', config.fingers)}`;
        }
        const name = mudraFolder.charAt(0).toUpperCase() + mudraFolder.slice(1);
        return `${name} mudra. ${config.fingers}`;
    }, []);

    const announce = {
        cameraActive: (mudraName) => {
            const inst = getInstruction(mudraName);
            _doSpeak(inst, PRIO.HIGH);
        },
        correct: () => {
            const lang = langRef.current;
            const msgs = { en: "Excellent!", ta: "அருமை!", hi: "बहुत बढ़िया!" };
            _doSpeak(msgs[lang] || msgs.en, PRIO.HIGH);
        },
        noHand: () => speak("Show your hand to the camera", { minInterval: 6000, priority: PRIO.MEDIUM }),
        
        start: (folder) => {
            const inst = getInstruction(folder);
            _doSpeak(inst, PRIO.HIGH);
        },
        
        mastered: ({ mudra, score, attempts }) => {
            const lang = langRef.current;
            const name = getMudraName(lang, mudra);
            if (lang === 'ta') {
                _doSpeak(`அற்புதம்! நீங்கள் ${name} முத்திரையை ${score} சதவீத துல்லியத்துடன் கற்றுக்கொண்டீர்கள்.`, PRIO.HIGH);
            } else {
                _doSpeak(`Excellent! You mastered ${mudra} with ${score} percent accuracy.`, PRIO.HIGH);
            }
        },
        raw: (msg, priority = PRIO.MEDIUM) => _doSpeak(msg, priority),
        fromResult: (data) => {
            if (!data) return;
            const lang = langRef.current;
            const now = Date.now();
            
            const currentStatus = data.status || 'Incorrect';
            const currentScore = data.score || 0;
            const currentMudra = data.matchedMudra || 'No Hand';

            // Detect Transitions
            const isStatusTransition = currentStatus !== lastStatusRef.current;
            const isMudraTransition = currentMudra !== lastMudraRef.current;
            const scoreJump = Math.abs(currentScore - lastScoreRef.current) > 20;

            // Update refs for next frame
            lastStatusRef.current = currentStatus;
            lastScoreRef.current = currentScore;
            lastMudraRef.current = currentMudra;

            // Priority 1: Mastery (95+) - Transition Sensitive
            if (currentScore >= 95) {
                if (isStatusTransition || scoreJump || now - lastOkVoiceRef.current > 10000) {
                    lastOkVoiceRef.current = now;
                    const msgs = { en: "Perfect! Hold it right there.", ta: "மிகச்சிறப்பு! அப்படியே பிடியுங்கள்.", hi: "बेहतरीन! इसे ऐसे ही बनाए रखें।" };
                    _doSpeak(msgs[lang] || msgs.en, PRIO.HIGH);
                }
                return;
            }

            // Priority 2: Correct (75+)
            if (currentScore >= 75) {
                // Only speak if we just reached this state or if it's been a long time
                if (isStatusTransition || now - lastOkVoiceRef.current > 8000) {
                    lastOkVoiceRef.current = now;
                    const msgs = { en: "Good! Now hold this position.", ta: "நல்லது! இந்த நிலையை பிடித்திருங்கள்.", hi: "अच्छा! अब इस स्थिति को बनाए रखें।" };
                    _doSpeak(msgs[lang] || msgs.en, PRIO.MEDIUM);
                }
                return;
            }

            // Priority 3: Specific Corrections
            if (data.corrections && data.corrections.length > 0) {
                const correction = data.corrections[0];
                const translated = translate(lang, correction);
                
                // Only speak if it's a new correction or it's been a while (5s)
                if (translated !== lastCorrectionRef.current || now - lastCorrectionTimeRef.current > 5000) {
                    lastCorrectionRef.current = translated;
                    lastCorrectionTimeRef.current = now;
                    _doSpeak(translated, PRIO.MEDIUM);
                }
                return;
            }

            // Priority 4: Wrong Mudra (if is_stable is true but it's not the target)
            if (data.is_stable && currentMudra !== 'No Hand' && currentMudra !== 'Joining...') {
                if (isMudraTransition || now - lastCorrectionTimeRef.current > 7000) {
                    lastCorrectionTimeRef.current = now;
                    const mat = currentMudra;
                    const msgs = { 
                        en: `Showing ${mat}. Try adjusting your fingers.`, 
                        ta: `நீங்கள் ${getMudraName(lang, mat)} காட்டுகிறீர்கள். விரல்களை சரிசெய்யவும்.`, 
                        hi: `आप ${getMudraName(lang, mat)} दिखा रहे हैं। अपनी उंगलियों को ठीक करें।` 
                    };
                    _doSpeak(msgs[lang] || msgs.en, PRIO.MEDIUM);
                }
            }
        },
        resetWrongGate: () => { wrongMudraCountRef.current = 0; }
    };

    return { speak, stop: () => window.speechSynthesis.cancel(), test, unlock, announce, getInstruction };
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
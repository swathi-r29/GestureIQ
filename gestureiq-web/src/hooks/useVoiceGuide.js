// src/hooks/useVoiceGuide.js
// Reliable voice guidance hook using refs (not state) for throttling.
// This prevents stale closure bugs that caused voice to fire incorrectly.

import { useRef, useCallback } from 'react';

export function useVoiceGuide() {
    const lastSpokenRef = useRef(0);
    const lastTextRef = useRef("");
    const isSpeakingRef = useRef(false);
    const utteranceRef = useRef(null);

    const speak = useCallback((text, { priority = false, minInterval = 4000 } = {}) => {
        if (!window.speechSynthesis) return;

        const now = Date.now();
        const timeSinceLast = now - lastSpokenRef.current;

        // Don't repeat the same text within the interval
        if (!priority && text === lastTextRef.current && timeSinceLast < minInterval) return;

        // Don't interrupt unless priority or it's been too long (stuck)
        if (isSpeakingRef.current) {
            if (!priority && timeSinceLast < minInterval) return;
            // Force cancel if stuck for > 10s
            if (timeSinceLast > 10000) {
                window.speechSynthesis.cancel();
                isSpeakingRef.current = false;
            } else if (!priority) {
                return;
            } else {
                window.speechSynthesis.cancel();
                isSpeakingRef.current = false;
            }
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        utterance.onstart = () => { isSpeakingRef.current = true; };
        utterance.onend = () => { isSpeakingRef.current = false; };
        utterance.onerror = () => { isSpeakingRef.current = false; };

        // Prevent garbage collection
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);

        lastSpokenRef.current = now;
        lastTextRef.current = text;
    }, []);

    const stop = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            isSpeakingRef.current = false;
        }
    }, []);

    const test = useCallback(() => {
        stop();
        speak("Voice guidance is active. I will guide you through each mudra.", { priority: true });
    }, [speak, stop]);

    // Structured guidance scripts for each phase
    const announce = useCallback({
        start: (mudraName) => speak(`Now practicing ${mudraName}. Watch the image on the left and position your hand to match.`, { priority: true }),
        hold: () => speak("Good form. Hold this position steady.", { minInterval: 5000 }),
        perfect: () => speak("Perfect! Excellent mudra. Hold and keep it steady.", { priority: true }),
        mastered: (mudraName) => speak(`Outstanding! You have mastered ${mudraName}.`, { priority: true }),
        correction: (msg) => speak(msg, { minInterval: 4000 }),
        noHand: () => speak("Please show your hand clearly to the camera.", { minInterval: 6000 }),
        levelUnlocked: (level) => speak(`Congratulations! You have unlocked the ${level} level.`, { priority: true }),
    }, [speak]);

    return { speak, stop, test, announce };
}
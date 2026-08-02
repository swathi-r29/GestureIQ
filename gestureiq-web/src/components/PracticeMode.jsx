/**
 * PracticeMode.jsx — 5-Second Pose Hold Challenge
 * Shows a countdown ring. When user holds a stance for 5 seconds, captures the score,
 * shows a grade badge, and logs the result.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';

const HOLD_SECONDS = 5;

const GRADE = (score) => {
  if (score >= 90) return { label: 'S', color: '#f59e0b', glow: '#f59e0b', text: 'Perfect!' };
  if (score >= 80) return { label: 'A', color: '#10b981', glow: '#10b981', text: 'Excellent!' };
  if (score >= 65) return { label: 'B', color: '#3b82f6', glow: '#3b82f6', text: 'Good!' };
  return { label: 'C', color: '#ef4444', glow: '#ef4444', text: 'Keep practicing' };
};

export default function PracticeMode({ stanceName, score, isActive, onResult, voiceGuide }) {
  const [phase, setPhase] = useState('idle'); // idle | countdown | result
  const [countdown, setCountdown] = useState(HOLD_SECONDS);
  const [lastResult, setLastResult] = useState(null);
  const [log, setLog] = useState([]);
  const intervalRef = useRef(null);
  const prevStanceRef = useRef(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Reset countdown when stance changes mid-hold
  useEffect(() => {
    if (!isActive) {
      clearTimer();
      setPhase('idle');
      setCountdown(HOLD_SECONDS);
      prevStanceRef.current = null;
      return;
    }

    const hasValidStance = stanceName && score > 0 && !stanceName.includes('Step Back');

    if (!hasValidStance) {
      if (phase === 'countdown') {
        clearTimer();
        setPhase('idle');
        setCountdown(HOLD_SECONDS);
      }
      prevStanceRef.current = null;
      return;
    }

    // Stance changed — reset
    if (prevStanceRef.current && prevStanceRef.current !== stanceName) {
      clearTimer();
      setPhase('idle');
      setCountdown(HOLD_SECONDS);
    }
    prevStanceRef.current = stanceName;

    // Start countdown if idle
    if (phase === 'idle') {
      setPhase('countdown');
      setCountdown(HOLD_SECONDS);
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [isActive, stanceName, score, phase]);

  // When countdown hits 0 → capture result
  useEffect(() => {
    if (countdown === 0 && phase === 'countdown') {
      const grade = GRADE(score);
      const result = {
        stance: stanceName,
        score,
        grade: grade.label,
        gradeText: grade.text,
        time: new Date().toLocaleTimeString(),
      };
      setLastResult(result);
      setLog(prev => [result, ...prev.slice(0, 9)]);
      setPhase('result');
      if (onResult) onResult(result);

      // Voice announcement
      if (voiceGuide) {
        const msg = `${grade.text} ${stanceName}! Score: ${score} percent.`;
        voiceGuide.speak?.(msg) ?? voiceGuide.announce?.poseFeedback?.([msg]);
      }

      // Auto-reset after showing result
      setTimeout(() => {
        setPhase('idle');
        setCountdown(HOLD_SECONDS);
        prevStanceRef.current = null;
      }, 3000);
    }
  }, [countdown, phase]);

  useEffect(() => () => clearTimer(), []);

  // --- SVG ring params ---
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const progress = phase === 'countdown' ? ((HOLD_SECONDS - countdown) / HOLD_SECONDS) : (phase === 'result' ? 1 : 0);
  const grade = lastResult ? GRADE(lastResult.score) : null;

  return (
    <div className="w-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-400/80">
          ⏱ Practice Mode
        </div>
        {log.length > 0 && (
          <div className="text-[10px] text-slate-400">{log.length} attempt{log.length > 1 ? 's' : ''} today</div>
        )}
      </div>

      {/* Main ring panel */}
      <div className="bg-slate-950/80 border border-amber-500/15 rounded-2xl p-5 flex items-center gap-5">
        {/* SVG countdown ring */}
        <div className="relative flex-shrink-0">
          <svg width={108} height={108} className="-rotate-90">
            {/* Background track */}
            <circle cx={54} cy={54} r={radius} fill="none" stroke="#1e293b" strokeWidth={7} />
            {/* Progress arc */}
            <circle
              cx={54} cy={54} r={radius} fill="none"
              stroke={phase === 'result' ? (grade?.color || '#10b981') : '#f59e0b'}
              strokeWidth={7}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>

          {/* Center display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === 'idle' && (
              <>
                <span className="text-2xl font-black text-slate-300">{HOLD_SECONDS}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">hold</span>
              </>
            )}
            {phase === 'countdown' && (
              <>
                <span className="text-3xl font-black text-amber-400" style={{ textShadow: '0 0 20px #f59e0b88' }}>
                  {countdown}
                </span>
                <span className="text-[9px] text-amber-500/70 uppercase tracking-wider">sec</span>
              </>
            )}
            {phase === 'result' && grade && (
              <>
                <span className="text-3xl font-black" style={{ color: grade.color, textShadow: `0 0 20px ${grade.glow}88` }}>
                  {grade.label}
                </span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: grade.color }}>{lastResult?.score}%</span>
              </>
            )}
          </div>
        </div>

        {/* Right side instruction / result */}
        <div className="flex-1">
          {phase === 'idle' && (
            <>
              <div className="text-sm font-semibold text-slate-200 mb-1">
                {isActive && stanceName && score > 0
                  ? `Hold ${stanceName}`
                  : 'Stand in any Adavu stance'}
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed">
                {isActive && stanceName && score > 0
                  ? `Keep still for ${HOLD_SECONDS} seconds — the ring will track your hold.`
                  : 'Point your full body at the camera. When a stance is detected, a 5-second hold timer starts automatically.'}
              </div>
            </>
          )}
          {phase === 'countdown' && (
            <>
              <div className="text-sm font-semibold text-amber-300 mb-1 animate-pulse">
                Holding {stanceName}…
              </div>
              <div className="text-[11px] text-slate-400 mb-2">Current score</div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${score}%`,
                    background: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
              <div className="text-[11px] text-right mt-1 text-slate-400">{score}%</div>
            </>
          )}
          {phase === 'result' && lastResult && grade && (
            <>
              <div className="text-sm font-bold mb-0.5" style={{ color: grade.color }}>
                {grade.text}
              </div>
              <div className="text-[11px] text-slate-300 mb-1">{lastResult.stance}</div>
              <div className="text-xs text-slate-400">
                Score: <span className="font-bold text-white">{lastResult.score}%</span>
                {' · '}Grade: <span className="font-bold" style={{ color: grade.color }}>{grade.label}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Score log */}
      {log.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Session Log
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {log.map((entry, i) => {
              const g = GRADE(entry.score);
              return (
                <div key={i} className="flex items-center justify-between bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: `${g.color}18`, color: g.color }}
                    >
                      {g.label}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">{entry.stance}</div>
                      <div className="text-[10px] text-slate-500">{entry.time}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold" style={{ color: g.color }}>{entry.score}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

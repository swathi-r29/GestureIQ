/**
 * HolisticVisualiser.jsx — Unified Full-Body Bharatanatyam Analysis Display
 * Shows skeleton + hands + face landmarks on one canvas with 4 score cards.
 */
import React, { useEffect, useRef } from 'react';

// Score card configuration
const STREAMS = [
  { key: 'stance', label: 'Body Stance', icon: '🧍', color: '#f59e0b', weight: '40%' },
  { key: 'mudra',  label: 'Hand Mudra',  icon: '🖐', color: '#10b981', weight: '30%' },
  { key: 'face',   label: 'Drishti',     icon: '😐', color: '#3b82f6', weight: '20%' },
  { key: 'arms',   label: 'Arms',        icon: '💪', color: '#a78bfa', weight: '10%' },
];

function ScoreCard({ icon, label, score, color, weight, visible }) {
  const pct = Math.round(score || 0);
  return (
    <div style={{
      flex: 1, background: '#0f172a', border: `1px solid ${color}22`,
      borderRadius: 14, padding: '10px 12px',
      opacity: visible ? 1 : 0.4, transition: 'opacity 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 9, color: color + 'aa', fontFamily: 'DM Sans, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
          {weight}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'DM Sans, sans-serif', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: visible ? color : '#334155', fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>
        {visible ? `${pct}%` : '—'}
      </div>
      {/* Mini progress bar */}
      <div style={{ height: 2, background: '#1e293b', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${pct}%`, background: color,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

function CombinedScoreRing({ score, isPass }) {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const pct = Math.round(score || 0);
  const color = pct >= 85 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 16px' }}>
      <div style={{ position: 'relative', width: 88, height: 88 }}>
        <svg width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={44} cy={44} r={radius} fill="none" stroke="#1e293b" strokeWidth={6} />
          <circle cx={44} cy={44} r={radius} fill="none"
            stroke={color} strokeWidth={6}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'DM Sans, sans-serif', lineHeight: 1 }}>
            {pct > 0 ? pct : '—'}
          </span>
          {pct > 0 && <span style={{ fontSize: 9, color: '#64748b', letterSpacing: 0.5 }}>TOTAL</span>}
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', fontFamily: 'DM Sans, sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
        Combined
      </div>
    </div>
  );
}

export default function HolisticVisualiser({ poseLandmarks, faceLandmarks, leftHandLandmarks, rightHandLandmarks, holisticResult }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    // Draw pose skeleton
    if (poseLandmarks && poseLandmarks.length >= 33) {
      const CONNECTIONS = [
        [11,12],[11,23],[12,24],[23,24],
        [11,13],[13,15],[12,14],[14,16],
        [23,25],[25,27],[27,29],[27,31],
        [24,26],[26,28],[28,30],[28,32],
      ];
      const stancePass = holisticResult?.stance?.isPass;
      CONNECTIONS.forEach(([a, b]) => {
        const pA = poseLandmarks[a], pB = poseLandmarks[b];
        if (!pA || !pB) return;
        ctx.beginPath();
        ctx.moveTo(pA.x * W, pA.y * H);
        ctx.lineTo(pB.x * W, pB.y * H);
        ctx.strokeStyle = stancePass ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = stancePass ? '#10b981' : '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.stroke();
      });
      poseLandmarks.forEach((lm, i) => {
        if (i < 11) return;
        ctx.beginPath();
        ctx.arc(lm.x * W, lm.y * H, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 4;
        ctx.fill();
      });
    }

    // Draw face outline (simplified — draw key face points as small dots)
    if (faceLandmarks && faceLandmarks.length >= 468) {
      const facePass = holisticResult?.face?.isPass;
      const faceColor = facePass ? '#3b82f688' : '#ef444488';
      // Draw a subset of face outline points
      const FACE_OUTLINE = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
      ctx.beginPath();
      ctx.shadowBlur = 0;
      FACE_OUTLINE.forEach((idx, i) => {
        const lm = faceLandmarks[idx];
        if (!lm) return;
        if (i === 0) ctx.moveTo(lm.x * W, lm.y * H);
        else ctx.lineTo(lm.x * W, lm.y * H);
      });
      ctx.closePath();
      ctx.strokeStyle = faceColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw hand landmarks
    [[leftHandLandmarks, '#10b981'], [rightHandLandmarks, '#a78bfa']].forEach(([hand, color]) => {
      if (!hand || hand.length < 21) return;
      const HAND_CONNECTIONS = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
      ];
      HAND_CONNECTIONS.forEach(([a, b]) => {
        const pA = hand[a], pB = hand[b];
        if (!pA || !pB) return;
        ctx.beginPath();
        ctx.moveTo(pA.x * W, pA.y * H);
        ctx.lineTo(pB.x * W, pB.y * H);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.stroke();
      });
      hand.forEach(lm => {
        ctx.beginPath();
        ctx.arc(lm.x * W, lm.y * H, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fill();
      });
    });
  }, [poseLandmarks, faceLandmarks, leftHandLandmarks, rightHandLandmarks, holisticResult]);

  const scores = holisticResult?.scores || {};
  const stanceName = holisticResult?.stanceName;
  const mudraName = holisticResult?.mudraName;
  const combined = holisticResult?.combinedScore || 0;
  const streamsDetected = holisticResult?.streamsDetected || [];
  const natyamPoseName = holisticResult?.natyamPoseName || (stanceName ? `${stanceName}${mudraName ? ' + ' + mudraName : ''}` : null);

  return (
    <div style={{ width: '100%', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Canvas */}
      <div style={{ position: 'relative', width: '100%', height: 280, background: '#020817', borderRadius: 16, overflow: 'hidden', border: '1px solid #f59e0b22', marginBottom: 14 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* Top badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: '#0f172acc', backdropFilter: 'blur(8px)',
          border: '1px solid #ffffff18', borderRadius: 20,
          padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: combined > 0 ? '#10b981' : '#f59e0b', boxShadow: `0 0 8px ${combined > 0 ? '#10b981' : '#f59e0b'}` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
            {combined > 0 ? `Full Analysis · ${combined}%` : 'Full Analysis · Detecting…'}
          </span>
        </div>

        {/* Classical Natyam Pose Banner */}
        {natyamPoseName && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10, right: 10,
            background: '#0f172acc', backdropFilter: 'blur(8px)',
            border: '1px solid #f59e0b44', borderRadius: 10,
            padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', letterSpacing: 0.5 }}>
              🪔 Natyam: {natyamPoseName}
            </span>
            {mudraName && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981' }}>✦ {mudraName}</span>}
          </div>
        )}
      </div>

      {/* Score cards row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <ScoreCard icon="🧍" label="Body Stance" score={scores.stance} color="#f59e0b" weight="40%" visible={streamsDetected.includes('pose')} />
        <ScoreCard icon="🖐" label="Hand Mudra" score={scores.mudra} color="#10b981" weight="30%" visible={!!(holisticResult?.mudraKey)} />
        <CombinedScoreRing score={combined} isPass={holisticResult?.isPass} />
        <ScoreCard icon="😐" label="Drishti" score={scores.face} color="#3b82f6" weight="20%" visible={streamsDetected.includes('face')} />
        <ScoreCard icon="💪" label="Arms" score={scores.arms} color="#a78bfa" weight="10%" visible={scores.arms > 0} />
      </div>

      {/* Feedback banner */}
      {holisticResult?.feedbacks?.[0] && (
        <div style={{
          marginTop: 10, padding: '8px 14px',
          background: '#0f172a', border: '1px solid #f59e0b18',
          borderRadius: 10, fontSize: 11, color: '#94a3b8',
        }}>
          💬 {holisticResult.feedbacks[0]}
        </div>
      )}
    </div>
  );
}

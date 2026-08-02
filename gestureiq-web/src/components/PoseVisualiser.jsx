import React, { useEffect, useRef } from 'react';

// MediaPipe Pose connection pairs (33 landmarks)
const POSE_CONNECTIONS = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left Arm
  [11, 13], [13, 15],
  // Right Arm
  [12, 14], [14, 16],
  // Left Leg
  [23, 25], [25, 27], [27, 29], [27, 31],
  // Right Leg
  [24, 26], [26, 28], [28, 30], [28, 32]
];

const LEG_JOINTS = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const TORSO_JOINTS = [11, 12, 23, 24];
const ARM_JOINTS = [11, 12, 13, 14, 15, 16];

export default function PoseVisualiser({ landmarks = [], poseDetails = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 33) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '13px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Stand back in camera view to visualize pose', width / 2, height / 2);
      return;
    }

    const details = poseDetails?.details || {};
    const isLegPass = details.araimandi?.isPass || details.muzhumandi?.isPass || details.samapada?.isPass || details.nattadavu?.isPass || false;
    const isSpinePass = details.spine?.isPass ?? true;
    const isArmsPass = details.arms?.isPass ?? true;

    const getConnectionColor = (a, b) => {
      if (LEG_JOINTS.includes(a) && LEG_JOINTS.includes(b)) {
        return isLegPass ? '#10b981' : '#ef4444';
      }
      if (TORSO_JOINTS.includes(a) && TORSO_JOINTS.includes(b)) {
        return isSpinePass ? '#10b981' : '#f59e0b';
      }
      if (ARM_JOINTS.includes(a) && ARM_JOINTS.includes(b)) {
        return isArmsPass ? '#10b981' : '#ef4444';
      }
      return '#3b82f6';
    };

    // Draw connectors
    POSE_CONNECTIONS.forEach(([a, b]) => {
      const pA = landmarks[a];
      const pB = landmarks[b];
      if (!pA || !pB) return;
      const color = getConnectionColor(a, b);
      ctx.beginPath();
      ctx.moveTo(pA.x * width, pA.y * height);
      ctx.lineTo(pB.x * width, pB.y * height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();
    });

    // Draw keypoint joints
    landmarks.forEach((lm, idx) => {
      if (idx < 11) return;
      const x = lm.x * width;
      const y = lm.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 6;
      ctx.fill();
    });
  }, [landmarks, poseDetails]);

  const details = poseDetails?.details || {};
  const stanceName = poseDetails?.stanceName || '';
  const totalScore = poseDetails?.totalScore || 0;

  // Determine which leg stance is active
  const isMuzhumandi = details.muzhumandi?.isPass;
  const isSamapada = details.samapada?.isPass;
  const isNattadavu = details.nattadavu?.isPass;

  let legTitle = 'Araimandi (Knee Flexion)';
  let legFeedback = details.araimandi?.feedback || 'Bend knees outward ~125°';
  let legAngle = details.araimandi?.avgKneeAngle ? `${details.araimandi.avgKneeAngle}°` : '—';
  let legPass = details.araimandi?.isPass || false;

  if (isMuzhumandi) {
    legTitle = 'Muzhumandi (Full Squat)';
    legFeedback = details.muzhumandi?.feedback || 'Sit deep on toes';
    legAngle = details.muzhumandi?.avgKneeAngle ? `${details.muzhumandi.avgKneeAngle}°` : '—';
    legPass = true;
  } else if (isNattadavu) {
    legTitle = 'Nattadavu (Leg Extension)';
    legFeedback = details.nattadavu?.feedback || 'Extend one leg fully to the side';
    legAngle = details.nattadavu?.leftAngle ? `${details.nattadavu.leftAngle}° / ${details.nattadavu.rightAngle}°` : '—';
    legPass = true;
  } else if (isSamapada) {
    legTitle = 'Samapada (Erect Stand)';
    legFeedback = details.samapada?.feedback || 'Stand straight, knees extended';
    legAngle = details.samapada?.avgKneeAngle ? `${details.samapada.avgKneeAngle}°` : '—';
    legPass = true;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full font-sans">
      {/* Skeleton Canvas Box */}
      <div className="relative w-full md:w-80 h-72 rounded-2xl overflow-hidden bg-slate-950 border border-amber-500/20 shadow-lg shadow-amber-500/10">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${poseDetails?.isPass ? 'bg-emerald-500 shadow-emerald-500/50 shadow-md' : 'bg-amber-500'}`} />
          <span className="text-xs font-semibold text-slate-200">
            {poseDetails ? `Stance Score: ${totalScore}%` : 'Pose Visualizer'}
          </span>
        </div>
        {stanceName && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/20 text-center">
            <span className="text-xs font-bold text-amber-400">✦ {stanceName} ✦</span>
          </div>
        )}
      </div>

      {/* Posture Analysis Panel */}
      <div className="flex-1 bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-400/80">
          Real-Time Adavu Stance Analytics
        </div>

        {/* Leg Stance Card — auto-adapts to detected stance */}
        <div className={`bg-slate-950/60 border rounded-xl p-2.5 flex items-center justify-between ${legPass ? 'border-emerald-500/20' : 'border-white/5'}`}>
          <div>
            <div className="text-xs font-semibold text-slate-200">{legTitle}</div>
            <div className="text-[11px] text-slate-400">{legFeedback}</div>
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap ${legPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {legAngle}
          </div>
        </div>

        {/* Spine Verticality */}
        <div className={`bg-slate-950/60 border rounded-xl p-2.5 flex items-center justify-between ${details.spine?.isPass ? 'border-emerald-500/20' : 'border-white/5'}`}>
          <div>
            <div className="text-xs font-semibold text-slate-200">Spine Verticality</div>
            <div className="text-[11px] text-slate-400">{details.spine?.feedback || 'Keep back upright'}</div>
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded-md ${details.spine?.isPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {details.spine?.tiltAngle !== undefined ? `${details.spine.tiltAngle}° tilt` : '—'}
          </div>
        </div>

        {/* Natyarambham Arms */}
        <div className={`bg-slate-950/60 border rounded-xl p-2.5 flex items-center justify-between ${details.arms?.isPass ? 'border-emerald-500/20' : 'border-white/5'}`}>
          <div>
            <div className="text-xs font-semibold text-slate-200">Natyarambham (Arms)</div>
            <div className="text-[11px] text-slate-400">{details.arms?.feedback || 'Elbows lifted'}</div>
          </div>
          <div className={`text-xs font-bold px-2 py-1 rounded-md ${details.arms?.isPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {details.arms?.avgElbowAngle ? `${details.arms.avgElbowAngle}°` : '—'}
          </div>
        </div>

        {/* Overall Score Bar */}
        {totalScore > 0 && (
          <div className="mt-1">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Overall Posture Score</span>
              <span className={`font-bold ${totalScore >= 85 ? 'text-emerald-400' : totalScore >= 65 ? 'text-amber-400' : 'text-red-400'}`}>{totalScore}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${totalScore}%`,
                  background: totalScore >= 85 ? '#10b981' : totalScore >= 65 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

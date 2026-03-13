// src/pages/StudentLiveClass.jsx
// ─────────────────────────────────────────────────────────────────────────────
// NEW IMPLEMENTATION — Student-Side Live Class
// Workflow:
//   1. Student joins class via link → webcam opens automatically
//   2. Canvas captures frames periodically → POST /api/detect_frame (Flask)
//   3. Live display: mudra name, AI score, feedback (Correct / Try Again)
//   4. "End Session" → POST /api/session_report → inline performance report
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Camera,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Award,
  LogOut,
  Zap,
  Target,
  RefreshCw
} from 'lucide-react';

// ─── Previous implementation imports (kept for reference) ───────────────────
// import { io } from 'socket.io-client';
// import { Volume2, MessageCircle, XCircle } from 'lucide-react';
// ────────────────────────────────────────────────────────────────────────────

const FLASK_URL = import.meta.env.VITE_FLASK_URL || '';

// Utility: format seconds as mm:ss
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const StudentLiveClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Class data ────────────────────────────────────────────────────────────
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState(''); // separate from class-load error

  // ── Webcam & detection state ───────────────────────────────────────────────
  const [webcamActive, setWebcamActive] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // ── Detection results ──────────────────────────────────────────────────────
  const [detectedMudra, setDetectedMudra] = useState('');
  const [aiScore, setAiScore] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [feedback, setFeedback] = useState('Show your hand to the camera');
  const [corrections, setCorrections] = useState([]);
  const [bestScore, setBestScore] = useState(0);

  // ── Session timer ──────────────────────────────────────────────────────────
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // ── Report ─────────────────────────────────────────────────────────────────
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const bestScoreRef = useRef(0);
  const bestMudraRef = useRef('');
  const isDetectingRef = useRef(false); // prevent concurrent requests

  // ── 1. Fetch class data on mount ────────────────────────────────────────────
  useEffect(() => {
    const fetchClass = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/student/class/join/${classId}`
        );
        setClassData(res.data);
      } catch (err) {
        setError('Unable to join class. Please check the link.');
      } finally {
        setLoading(false);
      }
    };
    fetchClass();

    return () => {
      stopWebcam();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [classId]);

  // ── 2. Start webcam ────────────────────────────────────────────────────────
  const startWebcam = useCallback(async () => {
    setCameraError(''); // clear previous error
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setWebcamActive(true);
    } catch (err) {
      console.error('[Webcam] Access denied:', err);
      const msg = err.name === 'NotAllowedError'
        ? 'Camera permission was denied. Click the camera icon in your browser address bar and allow access, then click Try Again.'
        : err.name === 'NotFoundError'
          ? 'No camera found. Please connect a webcam and try again.'
          : err.name === 'NotReadableError'
            ? 'Camera is already in use by another application. Close it and try again.'
            : `Camera error: ${err.message}`;
      setCameraError(msg);
      setSessionStarted(false); // go back to pre-session screen
    }
  }, []);

  // ── 3. Stop webcam ─────────────────────────────────────────────────────────
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setWebcamActive(false);
  }, []);

  // ── 4. Capture a frame from the video and return base64 JPEG ───────────────
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState < video.HAVE_ENOUGH_DATA) return null;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    // Mirror the frame (natural for selfie view)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.6);
  }, []);

  // ── 5. Send frame to Flask and update detection state ──────────────────────
  const detectMudra = useCallback(async () => {
    if (isDetectingRef.current) return; // skip if previous request still running
    isDetectingRef.current = true;

    try {
      const frame = captureFrame();
      if (!frame) return;

      const res = await fetch(`${FLASK_URL}/api/detect_frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: user?.id || user?._id || 'unknown',
          frame,
          targetMudra: classData?.targetMudra || ''
        })
      });

      const data = await res.json();

      if (data.detected) {
        setDetectedMudra(data.name || '');
        setAiScore(data.accuracy || 0);
        setConfidence(data.confidence || 0);
        setFeedback(data.feedback || '');
        setCorrections(data.corrections || []);

        // Track best score across session
        if ((data.accuracy || 0) > bestScoreRef.current) {
          bestScoreRef.current = data.accuracy;
          bestMudraRef.current = data.name;
          setBestScore(data.accuracy);
        }
      } else {
        setFeedback('Show your hand to the camera');
        setCorrections([]);
      }
    } catch (err) {
      console.error('[detect_frame] Error:', err);
    } finally {
      isDetectingRef.current = false;
    }
  }, [captureFrame, classId, user, classData]);

  // ── 6. Start session (timer + detection loop) ──────────────────────────────
  const startSession = useCallback(async () => {
    await startWebcam();
    setSessionStarted(true);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    setBestScore(0);
    bestScoreRef.current = 0;
    bestMudraRef.current = '';
    setDetectedMudra('');
    setAiScore(0);

    // Timer tick every second
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Detection every 500ms
    detectIntervalRef.current = setInterval(detectMudra, 500);
  }, [startWebcam, detectMudra]);

  // ── 7. End session → save report ────────────────────────────────────────────
  const endSession = useCallback(async () => {
    // Stop loops
    if (timerRef.current) clearInterval(timerRef.current);
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    stopWebcam();

    const timeTaken = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
    const timestamp = new Date().toISOString();

    setReportLoading(true);
    try {
      const res = await fetch(`${FLASK_URL}/api/session_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId:  user?.id || user?._id || 'unknown',
          classId,
          mudraName:  bestMudraRef.current || detectedMudra || 'N/A',
          aiScore:    bestScoreRef.current || aiScore,
          timeTaken,
          timestamp
        })
      });
      const savedReport = await res.json();
      setReport(savedReport);
    } catch (err) {
      console.error('[session_report] Error:', err);
      // Fallback: build report locally
      setReport({
        studentId:  user?.id || user?._id || 'unknown',
        classId,
        mudraName:  bestMudraRef.current || detectedMudra || 'N/A',
        aiScore:    bestScoreRef.current || aiScore,
        timeTaken,
        timestamp,
        feedback:   (bestScoreRef.current || aiScore) >= 75 ? 'Excellent' : 'Needs Practice'
      });
    } finally {
      setReportLoading(false);
      setSessionEnded(true);
    }
  }, [stopWebcam, classId, user, detectedMudra, aiScore]);

  // ── Score color helper ─────────────────────────────────────────────────────
  const scoreColor = (score) => {
    if (score >= 75) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER STATES
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 text-sm tracking-widest uppercase">Joining class…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-6 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-white font-bold">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Note: cameraError does NOT replace the whole screen — shown inline in pre-session UI

  // ── Session Report Screen ──────────────────────────────────────────────────
  if (sessionEnded && report) {
    const grade = report.aiScore >= 75 ? 'A' : report.aiScore >= 50 ? 'B' : 'C';
    const gradeColor = report.aiScore >= 75 ? '#10B981' : report.aiScore >= 50 ? '#F59E0B' : '#EF4444';

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h1 className="text-3xl font-black text-white">Session Report</h1>
            <p className="text-neutral-400 text-sm">Your performance summary for this class</p>
          </div>

          {/* Grade card */}
          <div className="p-8 rounded-3xl border border-white/10 bg-neutral-900 text-center space-y-2">
            <p className="text-[10px] uppercase tracking-[4px] text-neutral-500">AI Grade</p>
            <div className="text-7xl font-black" style={{ color: gradeColor }}>{grade}</div>
            <p className="text-sm text-neutral-400">{report.feedback}</p>
          </div>

          {/* Detail rows */}
          <div className="p-6 rounded-3xl border border-white/10 bg-neutral-900 space-y-4">
            {[
              { label: 'Student ID',   value: report.studentId },
              { label: 'Class ID',     value: report.classId },
              { label: 'Best Mudra',   value: report.mudraName ? report.mudraName.charAt(0).toUpperCase() + report.mudraName.slice(1) : 'N/A' },
              { label: 'AI Score',     value: `${report.aiScore}%`, color: gradeColor },
              { label: 'Time Taken',   value: formatTime(report.timeTaken) },
              { label: 'Timestamp',    value: new Date(report.timestamp).toLocaleString() },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <span className="text-xs text-neutral-500 uppercase tracking-widest">{label}</span>
                <span className="text-sm font-bold text-white" style={color ? { color } : {}}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Score bar */}
          <div className="p-6 rounded-3xl border border-white/10 bg-neutral-900 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-500 uppercase tracking-widest">AI Score</span>
              <span className="text-xl font-black" style={{ color: gradeColor }}>{report.aiScore}%</span>
            </div>
            <div className="h-3 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${report.aiScore}%`, backgroundColor: gradeColor }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-sm transition-all border border-accent"
              style={{ backgroundColor: 'rgba(var(--accent-rgb, 139,92,246), 0.15)' }}
            >
              Download / Print
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-session screen ─────────────────────────────────────────────────────
  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-3xl font-black text-white">{classData?.title || 'Live Class'}</h1>
            <p className="text-neutral-400 text-sm">Instructor: <span className="text-white font-semibold">{classData?.staffName || '—'}</span></p>
          </div>

          {/* Camera error — inline, retryable */}
          {cameraError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-left space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{cameraError}</p>
              </div>
              <div className="text-[10px] text-red-400/70 leading-relaxed">
                <strong className="text-red-400">Quick fix:</strong> Click the 🔒 or 📷 icon in your browser address bar → set Camera to &quot;Allow&quot; → click Try Again below.
              </div>
              <button
                onClick={startSession}
                className="w-full py-3 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Try Again
              </button>
            </div>
          )}

          <div className="p-6 rounded-2xl bg-neutral-900 border border-white/10 text-left space-y-3">
            <p className="text-[10px] uppercase tracking-[4px] text-neutral-500 font-bold">What happens next</p>
            {[
              'Your webcam will open automatically',
              'Perform the required mudra in front of the camera',
              'The AI will detect and score your mudra in real time',
              'Click "End Session" when done to see your report'
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-sm text-neutral-300">{step}</p>
              </div>
            ))}
          </div>

          <button
            onClick={startSession}
            className="w-full py-4 rounded-2xl text-white font-black text-sm tracking-[3px] uppercase transition-all hover:scale-[1.02] shadow-2xl"
            style={{ backgroundColor: 'var(--accent, #8B5CF6)' }}
          >
            ▶ {cameraError ? 'Retry Session' : 'Start Session'}
          </button>
        </div>
      </div>
    );
  }

  // ── Active session screen ──────────────────────────────────────────────────
  const isCorrect = aiScore >= 75;
  const isTryAgain = aiScore > 0 && aiScore < 75;

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">

      {/* ── Top HUD Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 bg-neutral-900/80 backdrop-blur border-b border-white/5 flex-shrink-0">
        {/* Class info */}
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
            <Camera className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-black">{classData?.title || 'Live Class'}</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{classData?.staffName}</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Live</span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-neutral-500" />
          <span className="font-mono text-sm font-bold text-white">{formatTime(elapsedSeconds)}</span>
        </div>

        {/* End Session */}
        <button
          onClick={endSession}
          disabled={reportLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <LogOut className="w-3 h-3" />
          {reportLoading ? 'Saving…' : 'End Session'}
        </button>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Webcam Feed ───────────────────────────────────────────────── */}
        <div className="flex-1 relative bg-neutral-950 flex items-center justify-center p-6">

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Webcam video */}
          <div className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden border-2 border-white/10 bg-neutral-900 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Detected mudra badge */}
            {detectedMudra && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[3px] border backdrop-blur-md"
                style={{
                  backgroundColor: isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                  borderColor:     isCorrect ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)',
                  color:           isCorrect ? '#10B981' : '#F59E0B'
                }}>
                {isCorrect ? '✓' : '○'} {detectedMudra.charAt(0).toUpperCase() + detectedMudra.slice(1)}
              </div>
            )}

            {/* Score overlay — top right */}
            <div className="absolute top-5 right-5 bg-black/70 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex flex-col items-end gap-1">
              <span className="text-[8px] tracking-[3px] uppercase text-white/50">AI Score</span>
              <span className="text-2xl font-black" style={{ color: scoreColor(aiScore) }}>
                {aiScore > 0 ? `${aiScore}%` : '—'}
              </span>
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${aiScore}%`, backgroundColor: scoreColor(aiScore) }} />
              </div>
            </div>

            {/* Feedback banner — bottom */}
            <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 to-transparent">
              <div className="flex items-center gap-3">
                {isCorrect
                  ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  : isTryAgain
                    ? <RefreshCw className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    : <Activity className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                }
                <span className="text-sm font-bold" style={{ color: isCorrect ? '#10B981' : isTryAgain ? '#F59E0B' : '#6B7280' }}>
                  {feedback}
                </span>
              </div>
            </div>

            {/* No webcam fallback */}
            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-neutral-500 text-xs uppercase tracking-widest">Opening camera…</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Live Stats Sidebar ──────────────────────────────────────── */}
        <div className="w-72 border-l border-white/5 bg-neutral-900/40 flex flex-col p-5 gap-5 flex-shrink-0 overflow-y-auto">

          {/* Target Mudra */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-neutral-500" />
              <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Target Mudra</p>
            </div>
            <p className="text-lg font-black text-accent">{classData?.targetMudra || 'Any Mudra'}</p>
          </div>

          {/* Detected */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-neutral-500" />
              <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Detected</p>
            </div>
            <p className="text-lg font-black text-white">
              {detectedMudra
                ? detectedMudra.charAt(0).toUpperCase() + detectedMudra.slice(1)
                : '—'}
            </p>
            {confidence > 0 && (
              <p className="text-[10px] text-neutral-500">Confidence: {confidence}%</p>
            )}
          </div>

          {/* Live Score */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Live Score</p>
            <div className="text-3xl font-black" style={{ color: scoreColor(aiScore) }}>
              {aiScore > 0 ? `${aiScore}%` : '—'}
            </div>
            <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${aiScore}%`, backgroundColor: scoreColor(aiScore) }} />
            </div>
          </div>

          {/* Best Score this session */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-neutral-500" />
              <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Best Score</p>
            </div>
            <p className="text-2xl font-black" style={{ color: scoreColor(bestScore) }}>
              {bestScore > 0 ? `${bestScore}%` : '—'}
            </p>
          </div>

          {/* Corrections */}
          {corrections.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-2">
              <p className="text-[9px] uppercase tracking-[3px] text-red-400 font-bold">Corrections</p>
              <ul className="space-y-1.5">
                {corrections.slice(0, 3).map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-red-300">
                    <span className="text-red-500 mt-0.5">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Session time */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Session Time</p>
            <p className="text-2xl font-mono font-black text-white">{formatTime(elapsedSeconds)}</p>
          </div>

          {/* End session button (also in HUD but duplicated here for accessibility) */}
          <button
            onClick={endSession}
            disabled={reportLoading}
            className="w-full py-3 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-3 h-3" />
            {reportLoading ? 'Saving…' : 'End & Get Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLiveClass;


// =============================================================================
// Previous implementation (kept for reference)
// This section handled staff monitoring of student webcams via WebRTC and
// SocketIO. Both staff and students joined the same SocketIO room.
// Staff received annotated frames broadcast by the Flask SocketIO server.
// The student's webcam was streamed via WebRTC offer/answer exchange.
// =============================================================================

/*
// ── Previous SocketIO + WebRTC references ─────────────────────────────────

// const [socket, setSocket] = useState(null);
// const [flaskSocket, setFlaskSocket] = useState(null);
// const socketRef = useRef(null);
// const flaskSocketRef = useRef(null);
// const peerConnection = useRef(null);
// const instructorVideoRef = useRef(null);
// const localImgRef = useRef(null);
// const bestScoresRef = useRef({});

// ── Previous fetchClassAndConnect (staff-monitoring model) ────────────────

// const fetchClassAndConnect = async () => {
//   try {
//     const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/student/class/join/${classId}`);
//     setClassData(res.data);
//
//     const s = io(import.meta.env.VITE_BACKEND_URL);
//     setSocket(s);
//     socketRef.current = s;
//     s.emit('join_class_room', { classId, name: user.name, userId: user.id });
//
//     const fs = io(import.meta.env.VITE_FLASK_URL);
//     setFlaskSocket(fs);
//     flaskSocketRef.current = fs;
//     fs.emit('join_class', { classId });
//
//     let lastAttemptEmitted = 0;
//
//     fs.on('processed_frame', (data) => {
//       if (data.studentId === user.id) {
//         if (localImgRef.current) localImgRef.current.src = data.frame;
//         setAccuracy(data.accuracy);
//
//         if (data.detected) {
//           const now = Date.now();
//           if (now - lastAttemptEmitted > 1500) {
//             lastAttemptEmitted = now;
//             setAttemptCount(prev => {
//               const newCount = prev + 1;
//               s.emit('student_score_update', {
//                 classId, studentId: user.id, studentName: user.name,
//                 mudra: currentMudraRef.current, score: data.accuracy, attempts: newCount
//               });
//               return newCount;
//             });
//             if (!bestScoresRef.current[currentMudraRef.current] || data.accuracy > bestScoresRef.current[currentMudraRef.current]) {
//               bestScoresRef.current[currentMudraRef.current] = data.accuracy;
//             }
//             if (data.accuracy < 50 && data.accuracy > 0) speak(`Focus on ${currentMudraRef.current} finger positions`);
//             else if (data.accuracy >= 85 && Math.random() < 0.2) speak(`Perfect ${currentMudraRef.current}`);
//           }
//         }
//       }
//     });
//
//     s.on('mudra_changed', (newMudra) => {
//       setCurrentMudra(newMudra);
//       currentMudraRef.current = newMudra;
//       setAttemptCount(0);
//       fs.emit('set_target_mudra', { classId, target: newMudra });
//     });
//
//     s.on('class_ended_broadcast', () => handleSessionEnd());
//
//     // WebRTC: receive instructor's stream via offer/answer
//     s.on('teacher_broadcast_offer', async (data) => {
//       try {
//         const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
//         peerConnection.current = pc;
//         if (streamRef.current) {
//           streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
//         }
//         pc.onicecandidate = (event) => {
//           if (event.candidate) s.emit('webrtc_ice_candidate', { classId, to: data.from, candidate: event.candidate });
//         };
//         pc.ontrack = (event) => {
//           if (instructorVideoRef.current && instructorVideoRef.current.srcObject !== event.streams[0]) {
//             instructorVideoRef.current.srcObject = event.streams[0];
//             instructorVideoRef.current.play().catch(e => { if (e.name !== 'AbortError') console.error('Auto-play failed:', e); });
//           }
//         };
//         await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         s.emit('webrtc_answer', { to: data.from, answer });
//       } catch (err) { console.error('WebRTC Receiving Error:', err); }
//     });
//
//     s.on('ice_candidate_received', (data) => {
//       if (peerConnection.current && data.candidate)
//         peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
//     });
//
//   } catch (err) {
//     alert('Error joining live session');
//     navigate('/dashboard');
//   } finally {
//     setLoading(false);
//   }
// };

// ── Previous setupLocalStream (sent frames via SocketIO) ──────────────────

// const setupLocalStream = (stream) => {
//   if (canvasRef.current) return;
//   const canvas = document.createElement('canvas');
//   canvas.width = 400; canvas.height = 225;
//   canvas.style.position = 'absolute'; canvas.style.top = '-9999px';
//   document.body.appendChild(canvas);
//   canvasRef.current = canvas;
//
//   const hiddenVideo = document.createElement('video');
//   hiddenVideo.srcObject = stream;
//   hiddenVideo.play();
//
//   const loop = () => {
//     if (canvasRef.current && hiddenVideo.readyState === hiddenVideo.HAVE_ENOUGH_DATA) {
//       const ctx = canvasRef.current.getContext('2d');
//       ctx.save(); ctx.scale(-1, 1);
//       ctx.drawImage(hiddenVideo, -canvas.width, 0, canvas.width, canvas.height);
//       ctx.restore();
//       const base64Frame = canvasRef.current.toDataURL('image/jpeg', 0.5);
//       if (flaskSocket) {
//         flaskSocket.emit('student_frame', { classId, studentId: user.id, frame: base64Frame });
//       }
//     }
//   };
//   if (!window.studentBroadcastInterval) {
//     window.studentBroadcastInterval = setInterval(loop, 100); // 10 FPS
//   }
// };

// ── Previous instructor video element (shown in main feed area) ───────────

// <video
//   ref={instructorVideoRef}
//   autoPlay muted playsInline
//   className="w-full h-full object-cover"
// />
//
// Student annotated feed (corner) — received back from Flask SocketIO
// <img
//   ref={localImgRef}
//   src=""
//   className="w-full h-full object-cover"
//   alt="Your Detection"
// />
*/

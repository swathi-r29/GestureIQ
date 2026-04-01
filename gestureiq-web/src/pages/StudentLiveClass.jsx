// src/pages/StudentLiveClass.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useVoiceGuide, LanguageSelector } from '../hooks/useVoiceGuide';
import { getSocket } from '../utils/socket';
import {
    Camera, Activity, CheckCircle, AlertCircle, Clock,
    Award, LogOut, Zap, Target, RefreshCw, VideoOff
} from 'lucide-react';
const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

const FLASK_URL = import.meta.env.VITE_FLASK_URL || '';

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const StudentLiveClass = () => {
    const { classId } = useParams();
    const navigate    = useNavigate();
    const { user }    = useAuth();

    const [lang, setLang] = useState('en');
    const { stop, test, unlock, announce } = useVoiceGuide({ language: lang });

    const [classData,      setClassData]      = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState('');
    const [cameraError,    setCameraError]    = useState('');
    const [webcamActive,   setWebcamActive]   = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [sessionEnded,   setSessionEnded]   = useState(false);
    const [reportLoading,  setReportLoading]  = useState(false);
    const [report,         setReport]         = useState(null);

    const [detectedMudra, setDetectedMudra] = useState('');
    const [aiScore,       setAiScore]       = useState(0);
    const [confidence,    setConfidence]    = useState(0);
    const [feedback,      setFeedback]      = useState('Show your hand to the camera');
    const [corrections,   setCorrections]   = useState([]);
    const [activeModules, setActiveModules] = useState({ mudra: true, face: false, pose: false });
    const [rasaData,      setRasaData]      = useState({ rasa: '', rasa_confidence: 0, rasa_meaning: '', expression_match: false });
    const [bestScore,     setBestScore]     = useState(0);
    const [showJitsi,     setShowJitsi]     = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [announcement,   setAnnouncement]   = useState('');

    const videoRef         = useRef(null);
    const canvasRef        = useRef(null);
    const streamRef        = useRef(null);
    const timerRef         = useRef(null);
    const detectIntervalRef = useRef(null);
    const startTimeRef     = useRef(null);
    const bestScoreRef     = useRef(0);
    const bestMudraRef     = useRef('');
    const isDetectingRef   = useRef(false);
    const lastVoiceRef     = useRef(0);
    const socketRef        = useRef(null);
    const classDataRef     = useRef(null); // ref for use inside interval
    
    // MediaPipe Refs
    const handsRef = useRef(null);
    const landmarksRef = useRef(null);
    const requestRef = useRef(null);

    // Keep classDataRef in sync
    useEffect(() => {
        classDataRef.current = classData;
    }, [classData]);

    // ── 1. Fetch class + socket ───────────────────────────────
    useEffect(() => {
        const fetchClass = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_BACKEND_URL}/api/student/class/join/${classId}`
                );
                setClassData(res.data);
                classDataRef.current = res.data;

                // Connect socket via utility
                const sock = getSocket();
                socketRef.current = sock;

                const join = () => {
                    sock.emit('join_class', {
                        classId,
                        userId: user?.id || user?._id || 'unknown',
                        name:   user?.name || 'Student'
                    });
                };

                join();
                sock.on('reconnect', join); // Automatic room recovery

                sock.on('modules_changed', (data) => {
                    setActiveModules(data.modules || data);
                });

                sock.on('target_changed', (data) => {
                    setClassData(prev => prev ? { ...prev, targetMudra: data.target || data.mudra } : prev);
                });

                sock.on('class_ended_broadcast', () => {
                    handleEndSessionFromTeacher();
                });

                sock.on('class_announcement', (data) => {
                    setAnnouncement(data.message || '');
                    setTimeout(() => setAnnouncement(''), 10000);
                });

            } catch {
                setError('Unable to join class. Please check the link.');
            } finally {
                setLoading(false);
            }
        };

        fetchClass();

        return () => {
            stopWebcam();
            if (timerRef.current)         clearInterval(timerRef.current);
            if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
            if (socketRef.current)         socketRef.current.disconnect();
        };
    }, [classId]);

    // ── 1b. MediaPipe: Hands Setup ─────────────────────────────
    useEffect(() => {
        handsRef.current = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsRef.current.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        handsRef.current.onResults((results) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            
            ctx.save();
            ctx.scale(-1, 1);
            ctx.clearRect(-canvas.width, 0, canvas.width, canvas.height);
            
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                landmarksRef.current = landmarks;
                
                // Draw skeleton
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
                drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 2, radius: 2 });
            } else {
                landmarksRef.current = null;
            }
            ctx.restore();
        });

        return () => {
            if (handsRef.current) handsRef.current.close();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // ── 2. Stop webcam ────────────────────────────────────────
    const stopWebcam = useCallback(() => {
        if (detectIntervalRef.current) {
            clearInterval(detectIntervalRef.current);
            detectIntervalRef.current = null;
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setWebcamActive(false);
    }, []);

    // ── 3. Start webcam ───────────────────────────────────────
    const startWebcam = useCallback(async () => {
        setCameraError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
            setWebcamActive(true);
        } catch (err) {
            const msg =
                err.name === 'NotAllowedError'   ? 'Camera permission denied. Allow camera and try again.' :
                err.name === 'NotFoundError'     ? 'No camera found. Connect a webcam and try again.' :
                err.name === 'NotReadableError'  ? 'Camera in use by another app. Close it and try again.' :
                `Camera error: ${err.message}`;
            setCameraError(msg);
            setSessionStarted(false);
        }
    }, []);

    // ── 4. Capture frame ──────────────────────────────────────
    const captureFrame = useCallback(() => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return null;
        if (video.readyState < video.HAVE_ENOUGH_DATA) return null;
        canvas.width  = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -320, 0, 320, 240);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.4);
    }, []);

    // ── 5. Detect mudra ───────────────────────────────────────
    const detectMudra = useCallback(async () => {
        if (isDetectingRef.current) return;
        isDetectingRef.current = true;
        try {
            const frame = captureFrame();
            if (!frame) return;

            const currentClassData = classDataRef.current;
            const landmarks = landmarksRef.current;

            if (!landmarks) {
                setFeedback('Hand not detected. Center it in camera.');
                return;
            }

            const res = await fetch(`${FLASK_URL}/api/detect_landmarks`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    classId,
                    studentId:   user?.id || user?._id || 'unknown',
                    landmarks:   landmarks,
                    targetMudra: currentClassData?.targetMudra || ''
                })
            });
            const data = await res.json();

            setDetectedMudra(data.name        || '');
            setAiScore(data.accuracy          || 0);
            setConfidence(data.detected ? (data.confidence || 0) : 0);
            setFeedback(data.feedback         || 'Show your hand to the camera');
            setCorrections(data.corrections   || []);

            if (data.rasa) {
                setRasaData({
                    rasa:             data.rasa,
                    rasa_confidence:  data.rasa_confidence  || 0,
                    rasa_meaning:     data.rasa_meaning     || '',
                    expression_match: data.expression_match || false,
                });
            }

            if ((data.accuracy || 0) > bestScoreRef.current) {
                bestScoreRef.current = data.accuracy;
                bestMudraRef.current = data.name;
                setBestScore(data.accuracy);
            }

            const now = Date.now();
            if (now - lastVoiceRef.current > 5000) {
                lastVoiceRef.current = now;
                announce.fromResult(data);
            }

            // ── Throttled Telemetry to Teacher (Skeleton Monitoring) ───
            // ── Throttled Telemetry to Teacher (Skeleton Monitoring) ───
            if (socketRef.current && (!isTryAgain || Date.now() - lastVoiceRef.current > 100)) {
                // Throttle: 100ms ensures smooth movement without server lag
                const lastEmit = socketRef.current._lastLiveEmit || 0;
                const currentTime = Date.now();
                if (currentTime - lastEmit > 100) {
                    socketRef.current._lastLiveEmit = currentTime;
                    socketRef.current.emit('student_score_update', {
                        classId,
                        studentId:   user?.id || user?._id || 'unknown',
                        studentName: user?.name || 'Student',
                        mudra:       data.name  || 'None',
                        score:       data.accuracy || 0,
                        landmarks:   landmarksRef.current // Real-time skeleton data
                    });
                }
            }
        } catch (err) {
            console.error('[detect_frame] Error:', err);
        } finally {
            isDetectingRef.current = false;
        }
    }, [captureFrame, classId, user, announce]);

    // ── 6. Start session ──────────────────────────────────────
    const startSession = useCallback(async () => {
        unlock();
        setSessionStarted(true);
        setElapsedSeconds(0);
        startTimeRef.current = Date.now();
        setBestScore(0);
        bestScoreRef.current = 0;
        bestMudraRef.current = '';
        setDetectedMudra('');
        setAiScore(0);

        timerRef.current = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        // Delay to let video element mount
        setTimeout(async () => {
            await startWebcam();
            // Start detection after webcam is ready
            setTimeout(() => {
                if (!detectIntervalRef.current) {
                    if (videoRef.current && videoRef.current.readyState >= 2) {
                        handsRef.current.send({ image: videoRef.current });
                    }
                    detectIntervalRef.current = setInterval(detectMudra, 200); // 5 FPS for sync
                }
            }, 500);
        }, 300);
    }, [startWebcam, detectMudra]);

    // ── 7. Save report helper ─────────────────────────────────
    const saveReport = useCallback(async () => {
        const timeTaken = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
        const timestamp = new Date().toISOString();
        setReportLoading(true);
        try {
            const res = await fetch(`${FLASK_URL}/api/session_report`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    studentId: user?.id || user?._id || 'unknown',
                    classId,
                    mudraName: bestMudraRef.current || 'N/A',
                    aiScore:   bestScoreRef.current || 0,
                    timeTaken,
                    timestamp
                })
            });
            const saved = await res.json();
            setReport(saved);
        } catch {
            setReport({
                studentId: user?.id || user?._id || 'unknown',
                classId,
                mudraName: bestMudraRef.current || 'N/A',
                aiScore:   bestScoreRef.current || 0,
                timeTaken,
                timestamp,
                feedback: bestScoreRef.current >= 75 ? 'Excellent' : 'Needs Practice'
            });
        } finally {
            setReportLoading(false);
            setSessionEnded(true);
        }
    }, [classId, user]);

    // ── 8. Leave class (student choice) ──────────────────────
    const leaveClass = useCallback(async () => {
        if (timerRef.current)          clearInterval(timerRef.current);
        if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
        stopWebcam();
        stop();
        await saveReport();
    }, [stopWebcam, stop, saveReport]);

    // ── 9. End session (teacher ended class) ─────────────────
    const handleEndSessionFromTeacher = useCallback(async () => {
        if (timerRef.current)          clearInterval(timerRef.current);
        if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
        stopWebcam();
        stop();
        await saveReport();
    }, [stopWebcam, stop, saveReport]);

    const scoreColor = (s) => s >= 75 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';

    // ── LOADING ───────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center space-y-4">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-neutral-400 text-sm tracking-widest uppercase">Joining class…</p>
            </div>
        </div>
    );

    // ── ERROR ─────────────────────────────────────────────────
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center space-y-6 max-w-sm">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-white font-bold">{error}</p>
                <button onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-all">
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    // ── SESSION REPORT ────────────────────────────────────────
    if (sessionEnded && report) {
        const grade      = report.aiScore >= 75 ? 'A' : report.aiScore >= 50 ? 'B' : 'C';
        const gradeColor = scoreColor(report.aiScore);
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="w-full max-w-lg space-y-6">
                    <div className="text-center space-y-2">
                        <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                        <h1 className="text-3xl font-black text-white">Session Report</h1>
                        <p className="text-neutral-400 text-sm">Your performance summary</p>
                    </div>
                    <div className="p-8 rounded-3xl border border-white/10 bg-neutral-900 text-center space-y-2">
                        <p className="text-[10px] uppercase tracking-[4px] text-neutral-500">AI Grade</p>
                        <div className="text-7xl font-black" style={{ color: gradeColor }}>{grade}</div>
                        <p className="text-sm text-neutral-400">{report.feedback}</p>
                    </div>
                    <div className="p-6 rounded-3xl border border-white/10 bg-neutral-900 space-y-4">
                        {[
                            { label: 'Best Mudra', value: report.mudraName ? report.mudraName.charAt(0).toUpperCase() + report.mudraName.slice(1) : 'N/A' },
                            { label: 'AI Score',   value: `${report.aiScore}%`, color: gradeColor },
                            { label: 'Time Taken', value: formatTime(report.timeTaken) },
                            { label: 'Timestamp',  value: new Date(report.timestamp).toLocaleString() },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                <span className="text-xs text-neutral-500 uppercase tracking-widest">{label}</span>
                                <span className="text-sm font-bold text-white" style={color ? { color } : {}}>{value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => navigate('/dashboard')}
                            className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/10">
                            Back to Dashboard
                        </button>
                        <button onClick={() => window.print()}
                            className="flex-1 py-4 rounded-2xl text-white font-bold text-sm transition-all border border-accent"
                            style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}>
                            Download / Print
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── PRE-SESSION ───────────────────────────────────────────
    if (!sessionStarted) return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-6 text-center">
                <div className="space-y-3">
                    <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto border border-accent/30">
                        <Camera className="w-10 h-10 text-accent" />
                    </div>
                    <h1 className="text-2xl font-black text-white">{classData?.title || 'Live Class'}</h1>
                    <p className="text-neutral-400 text-sm">
                        Instructor: <span className="text-white font-semibold">{classData?.staffName || '—'}</span>
                    </p>
                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 w-fit mx-auto">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Class is Live</span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-white/10">
                    <span className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Voice:</span>
                    <LanguageSelector lang={lang} onChange={setLang} compact />
                    <button onClick={test} className="px-3 py-1.5 rounded border border-white/20 text-[9px] uppercase tracking-widest text-white/60 hover:bg-white/5 transition-all">
                        Test
                    </button>
                </div>

                {cameraError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-left space-y-3">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300">{cameraError}</p>
                        </div>
                        <button onClick={startSession}
                            className="w-full py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            <RefreshCw className="w-3 h-3" /> Try Again
                        </button>
                    </div>
                )}

                <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 text-left">
                    <p className="text-[9px] uppercase tracking-[4px] text-neutral-500 font-bold mb-2">Target Mudra</p>
                    <p className="text-xl font-black text-accent">{classData?.targetMudra || 'Any Mudra'}</p>
                </div>

                <button onClick={startSession}
                    className="w-full py-5 rounded-2xl text-white font-black text-sm tracking-[3px] uppercase transition-all hover:scale-[1.02] shadow-2xl shadow-accent/30"
                    style={{ backgroundColor: 'var(--accent, #8B5CF6)' }}>
                    📷 Allow Camera & Join Class
                </button>

                <p className="text-[10px] text-neutral-600">
                    Your camera will open. Show your hand to start AI detection.
                </p>
            </div>
        </div>
    );

    // ── ACTIVE SESSION ────────────────────────────────────────
    const isCorrect  = aiScore >= 75;
    const isTryAgain = aiScore > 0 && aiScore < 75;

    return (
        <div className="h-screen flex flex-col bg-black text-white overflow-hidden">

            {/* Top HUD */}
            <div className="flex items-center justify-between px-6 py-3 bg-neutral-900/80 backdrop-blur border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black">{classData?.title || 'Live Class'}</h1>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{classData?.staffName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Live</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    <span className="font-mono text-sm font-bold">{formatTime(elapsedSeconds)}</span>
                </div>
                <button onClick={leaveClass} disabled={reportLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 text-orange-400 text-xs font-bold uppercase tracking-widest transition-all">
                    <LogOut className="w-3 h-3" />
                    {reportLoading ? 'Saving…' : 'Leave Class'}
                </button>
            </div>

            {/* Announcement banner */}
            {announcement && (
                <div className="px-6 py-2 bg-blue-600/20 border-b border-blue-500/30 text-center">
                    <p className="text-xs text-blue-300 font-bold">📢 {announcement}</p>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: Student Webcam */}
                <div className="flex-1 relative bg-neutral-950 flex items-center justify-center p-6">
                    <div className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden border-2 border-white/10 bg-neutral-900 shadow-2xl">
                        <video ref={videoRef} autoPlay playsInline muted
                            className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                        <canvas ref={canvasRef} 
                            className="absolute inset-0 w-full h-full pointer-events-none z-10" 
                            width={1280} height={720} />

                        {/* Detected badge */}
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

                        {/* Score overlay */}
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

                        {/* Feedback */}
                        <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 to-transparent">
                            <div className="flex items-center gap-3">
                                {isCorrect
                                    ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                    : isTryAgain
                                        ? <RefreshCw className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                                        : <Activity className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                                }
                                <span className="text-sm font-bold"
                                    style={{ color: isCorrect ? '#10B981' : isTryAgain ? '#F59E0B' : '#6B7280' }}>
                                    {feedback}
                                </span>
                            </div>
                        </div>

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

                {/* RIGHT: Sidebar */}
                <div className="w-72 border-l border-white/5 bg-neutral-900/40 flex flex-col p-4 gap-4 flex-shrink-0 overflow-y-auto">

                    {/* Jitsi Voice — Teacher Video */}
                    <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">
                            🎙️ Class Voice & Teacher Video
                        </p>
                        <button onClick={() => { unlock(); setShowJitsi(v => !v); }}
                            className="w-full py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border"
                            style={{
                                backgroundColor: showJitsi ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                                borderColor:     showJitsi ? '#10B981' : 'rgba(255,255,255,0.1)',
                                color:           showJitsi ? '#10B981' : 'rgba(255,255,255,0.5)'
                            }}>
                            {showJitsi ? '🔊 In Call — See Teacher' : '📞 Join Voice & See Teacher'}
                        </button>
                        {showJitsi && (
                            <iframe
                                src={`https://meet.jit.si/GestureIQ-${classId}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.toolbarButtons=["microphone","camera","hangup"]&userInfo.displayName=%22${encodeURIComponent(user?.name || 'Student')}%22`}
                                width="100%"
                                height="200px"
                                allow="camera; microphone; fullscreen; display-capture; autoplay"
                                style={{ borderRadius: '8px', border: 'none' }}
                            />
                        )}
                        {!showJitsi && (
                            <p className="text-[9px] text-neutral-600 text-center">
                                Click to join voice call and see teacher video
                            </p>
                        )}
                    </div>

                    {/* Target Mudra */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-neutral-500" />
                            <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Target Mudra</p>
                        </div>
                        <p className="text-lg font-black text-accent">{classData?.targetMudra || 'Any Mudra'}</p>
                    </div>

                    {/* Detected */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-neutral-500" />
                            <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Detected</p>
                        </div>
                        <p className="text-lg font-black text-white">
                            {detectedMudra ? detectedMudra.charAt(0).toUpperCase() + detectedMudra.slice(1) : '—'}
                        </p>
                        {confidence > 0 && <p className="text-[10px] text-neutral-500">Confidence: {confidence}%</p>}
                    </div>

                    {/* Live Score */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Live Score</p>
                        <div className="text-3xl font-black" style={{ color: scoreColor(aiScore) }}>
                            {aiScore > 0 ? `${aiScore}%` : '—'}
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${aiScore}%`, backgroundColor: scoreColor(aiScore) }} />
                        </div>
                    </div>

                    {/* Best Score */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2">
                            <Award className="w-3.5 h-3.5 text-neutral-500" />
                            <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Best Score</p>
                        </div>
                        <p className="text-2xl font-black" style={{ color: scoreColor(bestScore) }}>
                            {bestScore > 0 ? `${bestScore}%` : '—'}
                        </p>
                    </div>

                    {/* Navarasa — only when teacher enables */}
                    {activeModules.face && (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                            <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">
                                😊 Expression · Navarasa
                            </p>
                            {rasaData.rasa ? (
                                <>
                                    <p className="text-lg font-black"
                                        style={{ color: rasaData.expression_match ? '#10B981' : '#F59E0B' }}>
                                        {rasaData.rasa.charAt(0).toUpperCase() + rasaData.rasa.slice(1)}
                                        {rasaData.expression_match ? ' ✓' : ' ↻'}
                                    </p>
                                    <p className="text-[10px] text-neutral-500">{rasaData.rasa_meaning}</p>
                                    <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${rasaData.rasa_confidence}%`,
                                                backgroundColor: rasaData.expression_match ? '#10B981' : '#F59E0B'
                                            }} />
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-neutral-600">Face the camera clearly</p>
                            )}
                        </div>
                    )}

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

                    {/* Session Time */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Session Time</p>
                        <p className="text-2xl font-mono font-black">{formatTime(elapsedSeconds)}</p>
                    </div>

                    {/* Voice Language */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <p className="text-[9px] uppercase tracking-[3px] text-neutral-500 font-bold">Voice Language</p>
                        <LanguageSelector lang={lang} onChange={setLang} />
                        <button onClick={test}
                            className="mt-1 text-[9px] px-3 py-1.5 rounded border border-white/20 text-white/60 hover:bg-white/5 uppercase tracking-widest transition-all w-full">
                            Test Voice
                        </button>
                    </div>

                    {/* Leave */}
                    <button onClick={leaveClass} disabled={reportLoading}
                        className="w-full py-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <LogOut className="w-3 h-3" />
                        {reportLoading ? 'Saving…' : 'Leave & Get Report'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentLiveClass;
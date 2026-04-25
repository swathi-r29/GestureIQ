// src/pages/StudentLiveClass.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useVoiceGuide, LanguageSelector } from '../hooks/useVoiceGuide';
import { checkGeometricAnchors } from '../utils/geometricRules';
import { getSocket } from '../utils/socket';
import { Video, VideoOff, Mic, MicOff, Users, Clock, Activity, AlertTriangle, LogOut, Send, UserCheck, Zap, Award, Target, RefreshCw, Camera, CheckCircle, AlertCircle } from 'lucide-react';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

const { Hands, HAND_CONNECTIONS } = window;
const { drawConnectors, drawLandmarks } = window;

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const scoreColor = (s) => s >= 75 ? '#059669' : s >= 50 ? '#D97706' : '#DC2626';
const scoreBg = (s) => s >= 75 ? '#ECFDF5' : s >= 50 ? '#FFFBEB' : '#FEF2F2';
const scoreBorder = (s) => s >= 75 ? '#A7F3D0' : s >= 50 ? '#FDE68A' : '#FECACA';

const StudentLiveClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lang, setLang] = useState('en');
  const { stop, test, unlock, announce } = useVoiceGuide({ language: lang });

  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [webcamActive, setWebcamActive] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [detectedMudra, setDetectedMudra] = useState('');
  const [aiScore, setAiScore] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [feedback, setFeedback] = useState('Show your hand to the camera');
  const [corrections, setCorrections] = useState([]);
  const [activeModules, setActiveModules] = useState({ mudra: true, face: true, pose: false });
  const activeModulesRef = useRef(activeModules);
  useEffect(() => { activeModulesRef.current = activeModules; }, [activeModules]);
  const [rasaData, setRasaData] = useState({ rasa: '', rasa_confidence: 0, rasa_meaning: '', expression_match: false });
  const [bestScore, setBestScore] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [sessionStatus, setSessionStatus] = useState('Incorrect');
  const [teacherConnected, setTeacherConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  // MUDRA SYNC & TOAST STATES
  const [targetMudra, setTargetMudra] = useState('');
  const [showMudraToast, setShowMudraToast] = useState(false);
  const [toastData, setToastData] = useState({ name: '', meaning: '', nameta: '', meaningta: '' });
  const [fingerDeviations, setFingerDeviations] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const socketRef = useRef(null);
  const handsRef = useRef(null);
  const landmarksRef = useRef(null);
  const lastResultTimeRef = useRef(Date.now());
  const requestRef = useRef(null);
  const frameCountRef = useRef(0);
  const isDetectingRef = useRef(false);
  const lastVoiceRef = useRef(0);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const teacherSocketIdRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const bestScoreRef = useRef(0);
  const bestMudraRef = useRef('');
  const smoothingBuffer = useRef([]);
  const lastLandmarkTimeRef = useRef(0);
  const classDataRef = useRef(null);

  // FIX A: store offer that arrives before camera is ready
  const pendingOfferRef = useRef(null);
  // FIX B: ICE restart timer
  const iceRestartTimerRef = useRef(null);
  // NEW: track last offer handshake to prevent duplicates
  const lastHandshakeTimeRef = useRef(0);

  const detectedMudraRef = useRef('');
  const aiScoreRef = useRef(0);
  const sessionStatusRef = useRef('Incorrect');
  const consecutiveRef = useRef({ name: null, count: 0 });
  const preStabilityRef = useRef({ name: null, count: 0 });
  const graceRef = useRef(0); // For stability grace window (hysteresis)
  const STABILITY_THRESHOLD = 10;
  const STABILITY_THRESHOLD_DOUBLE = 6;
  const smoothedScoreRef = useRef(0);
  const holdTimerRef = useRef(null);
  const frameBufferRef = useRef([]);
  const [toastType, setToastType] = useState('next'); // 'next', 'wrong', 'perfect'
  const perfectFiredRef = useRef(false);
  const perfectCountRef = useRef(0);
  const toastTimerRef = useRef(null);

  const targetMudraRef = useRef('');
  const fingerDeviationsRef = useRef(null);

  useEffect(() => { classDataRef.current = classData; }, [classData]);

  // FIX: Clear hold timer on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  // ── handleReceiveOffer ──────────────────────────────────────
  const handleReceiveOffer = useCallback(async (offer, fromSocketId) => {
    console.log('[WebRTC Student] Received offer from:', fromSocketId);

    // FIX C: if camera not started yet, store the offer and return
    if (!streamRef.current) {
      console.log('[WebRTC Student] Camera not ready — storing offer for later');
      pendingOfferRef.current = { offer, fromSocketId };
      teacherSocketIdRef.current = fromSocketId;
      return;
    }

    // NEW GUARD: Rate limit handshakes (max 1 per 2 seconds)
    const now = Date.now();
    if (now - lastHandshakeTimeRef.current < 2000) {
      console.warn('[WebRTC Student] Handshake rate limit — ignoring offer');
      return;
    }

    // FIX C.5: Guard against processing offers while state is not stable
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'stable') {
      console.warn('[WebRTC Student] Signal state is ' + peerConnectionRef.current.signalingState + ' — skipping concurrent offer');
      return;
    }

    // Close any existing stale connection
    const currentPC = peerConnectionRef.current;
    if (currentPC) {
      if ((currentPC.iceConnectionState === 'connected' || currentPC.iceConnectionState === 'completed') && currentPC.signalingState === 'stable') {
        console.log('[WebRTC Student] Already connected and stable — ignoring redundant offer');
        return;
      }
      // Detach handlers before closing to prevent stale events
      currentPC.ontrack = null;
      currentPC.onicecandidate = null;
      currentPC.oniceconnectionstatechange = null;
      currentPC.close();
      peerConnectionRef.current = null;
    }

    if (!offer) {
      console.warn('[WebRTC Student] Received null offer, skipping');
      return;
    }
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      console.log("🎧 Teacher stream received");
      const remoteStream = event.streams[0];
      
      console.log("🎧 Tracks from teacher:");
      if (remoteStream) {
        remoteStream.getTracks().forEach(t => {
          console.log(`[Remote Track] ${t.kind}: ${t.enabled} (${t.readyState})`);
        });

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false; 
          remoteVideoRef.current.volume = 1.0;

          remoteVideoRef.current.onloadedmetadata = () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(err => {
                console.warn("Autoplay blocked:", err);
              });
            }
          };
        }
        setTeacherConnected(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (peerConnectionRef.current !== pc) return;
      if (event.candidate && teacherSocketIdRef.current) {
        socketRef.current?.emit('webrtc_ice_candidate', {
          to: teacherSocketIdRef.current,
          candidate: event.candidate
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (peerConnectionRef.current !== pc) return;
      console.log('[WebRTC Student] ICE state:', pc.iceConnectionState);

      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setTeacherConnected(true);
        // Clear any pending restart timer
        if (iceRestartTimerRef.current) {
          clearTimeout(iceRestartTimerRef.current);
          iceRestartTimerRef.current = null;
        }
      }

      if (pc.iceConnectionState === 'disconnected') {
        setTeacherConnected(false);
        // Give 4s to recover before requesting new offer
        iceRestartTimerRef.current = setTimeout(() => {
          if (peerConnectionRef.current !== pc) return;
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            console.log('[WebRTC Student] ICE stuck — requesting new offer');
            socketRef.current?.emit('request_webrtc_offer', { classId: classId });
          }
        }, 4000);
      }

      if (pc.iceConnectionState === 'failed') {
        setTeacherConnected(false);
        console.log('[WebRTC Student] ICE failed — requesting new offer immediately');
        socketRef.current?.emit('request_webrtc_offer', { classId: classId });
      }

      if (pc.iceConnectionState === 'closed') {
        setTeacherConnected(false);
      }
    };

    try {
      if (pc.signalingState === 'stable') {
        // ✅ CORRECT — setRemoteDescription FIRST
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain queued ICE candidates AFTER remote description is set
        while (iceCandidatesQueueRef.current.length > 0) {
          const candidate = iceCandidatesQueueRef.current.shift();
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (e) { console.warn('[WebRTC Student] Queued ICE error:', e); }
        }

        // Add local tracks AFTER setRemoteDescription so browser can
        // correctly reuse the offer's recvonly transceivers
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, streamRef.current);
            console.log('[WebRTC Student] Adding local track to PC:', track.kind);
          });
        }

        lastHandshakeTimeRef.current = Date.now();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current?.emit('webrtc_answer', {
          to: teacherSocketIdRef.current,
          answer
        });
        console.log('[WebRTC Student] Answer sent to teacher');
      }
    } catch (err) {
      console.error('[WebRTC Student] Error handling offer:', err);
    }
  }, [classId]);

  // ── 1. Fetch Class Data & Setup Socket ─────────────────────
  useEffect(() => {
    // Autoplay Fix: Unmute on first click
    const handleFirstClick = () => {
      const vids = document.querySelectorAll('video');
      vids.forEach(v => {
        if (v !== videoRef.current) { // Don't unmute local preview (feedback)
          v.muted = false;
          v.play().catch(() => {});
        }
      });
      document.removeEventListener('click', handleFirstClick);
    };
    document.addEventListener('click', handleFirstClick);

    const fetchClass = async () => {
      try {
        const res = await axios.get(
          `/api/student/class/join/${classId}`
        );
        setClassData(res.data);
        classDataRef.current = res.data;

        const sock = getSocket();
        socketRef.current = sock;

        const join = () => sock.emit('join_class', {
          classId: classId,
          userId: user?.id || user?._id || 'unknown',
          name: user?.name || 'Student'
        });

        join();
        sock.on('reconnect', join);

        sock.on('modules_changed', (data) => setActiveModules(data.modules || data));
        sock.on('target_changed', (data) => {
          setClassData(prev => prev ? { ...prev, targetMudra: data.target || data.mudra } : prev);
          targetMudraRef.current = data.target || data.mudra;
        });

        // NEW: Real-Time Teacher-Controlled Spotlight & State Sync
        sock.on('update_class_state', (data) => {
          console.log('[Socket] Class state updated:', data);
          
          if (data.targetMudra) {
            const newMudra = data.targetMudra;
            setClassData(prev => prev ? { ...prev, targetMudra: newMudra } : prev);
            targetMudraRef.current = newMudra;
            setTargetMudra(newMudra);

            // --- GURU SYNC: CLEAR BUFFERS ON MUDRA CHANGE ---
            setDetectedMudra('');
            detectedMudraRef.current = '';
            setAiScore(0);
            aiScoreRef.current = 0;
            frameBufferRef.current = [];
            smoothedScoreRef.current = 0;
            consecutiveRef.current = { name: null, count: 0 };
            preStabilityRef.current = { name: null, count: 0 };
            isDetectingRef.current = false;
            perfectFiredRef.current = false;
            perfectCountRef.current = 0;
            setToastType('next');
            
            // SHOW TOAST
            setToastData({
              name: data.name || newMudra,
              meaning: data.meaning || `Practice ${newMudra}`,
              nameta: data.nameta || newMudra,
              meaningta: data.meaningta || ''
            });
            
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setShowMudraToast(true);
            toastTimerRef.current = setTimeout(() => setShowMudraToast(false), 5000);
          }

          if (data.activeModules) {
            setActiveModules(data.activeModules);
          }
        });

        sock.on('class_ended_broadcast', handleEndSessionFromTeacher);
        sock.on('class_announcement', (data) => {
          setAnnouncement(data.message || '');
          setTimeout(() => setAnnouncement(''), 10000);
        });

        // When teacher starts class, request offer
        sock.on('class_started', () => {
          console.log('[WebRTC Student] class_started — requesting offer');
          setTimeout(() => {
            sock.emit('request_webrtc_offer', { classId: classId });
          }, 500);
        });

        // Teacher sends offer
        sock.on('teacher_broadcast_offer', async (data) => {
          console.log('[WebRTC Student] teacher_broadcast_offer received');
          teacherSocketIdRef.current = data.from;
          await handleReceiveOffer(data.offer, data.from);
        });

        // ICE candidates from teacher
        sock.on('ice_candidate_received', async (data) => {
          const pc = peerConnectionRef.current;
          if (!pc || !data.candidate) return;
          if (pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
            catch (err) { console.warn('[WebRTC Student] ICE add error:', err); }
          } else {
            iceCandidatesQueueRef.current.push(data.candidate);
          }
        });

        // FIX F: request offer on page load — will be stored as pending if camera not ready yet
        // This handles the case where teacher is already broadcasting when student opens the page
        setTimeout(() => {
          console.log('[WebRTC Student] Requesting initial offer (camera may not be ready — will pend)');
          sock.emit('request_webrtc_offer', { classId: classId });
        }, 2000);

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
      if (socketRef.current) socketRef.current.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.close();
      }
      if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
    };
  }, [classId]);

  // ── 2. MediaPipe Setup ─────────────────────────────────────
  useEffect(() => {
    if (!Hands) return;
    handsRef.current = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    handsRef.current.setOptions({
      maxNumHands: 2, modelComplexity: 1,
      minDetectionConfidence: 0.6, minTrackingConfidence: 0.6
    });
    handsRef.current.onResults((results) => {
      lastResultTimeRef.current = Date.now();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(-1, 1);
      ctx.clearRect(-canvas.width, 0, canvas.width, canvas.height);
      
      // FIX: Use activeModulesRef to avoid stale closure in onResults
      if (activeModulesRef.current.mudra && results.multiHandLandmarks?.length > 0) {
        const hList = results.multiHandLandmarks;
        const hness = results.multiHandedness || [];
        
        // Landmark average smoothing (simplified for multi-hand)
        const averagedLms = hList.map(h => h.map((lm, i) => lm)); // for now just pass through
        
        landmarksRef.current = { 
          multiHandLandmarks: hList, 
          multiHandedness: hness.map((h, i) => {
              // [RECTIFICATION] Support spatial-relative identity tracking
              if (hList.length === 2) {
                  return { ...h, label: hList[i][0].x < 0.5 ? 'Right' : 'Left' };
              }
              return h;
          }),
          landmarks: hList[0], // backward compat for single hand logic
          handedness: hness[0]?.label || 'Right'
        };

        lastLandmarkTimeRef.current = Date.now();
        
        hList.forEach((lms, handIdx) => {
          // 1. Draw Connectors (Base Layer)
          const baseColor = handIdx === 0 ? '#7C3AED' : '#10B981';
          drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: baseColor, lineWidth: 3 });

          // 2. Draw Landmarks (Correction Layer)
          const deviations = fingerDeviationsRef.current;
          
          if (deviations) {
            // Finger-to-Landmark Index Mapping
            const fingerMap = {
              thumb: [1, 2, 3, 4],
              index: [5, 6, 7, 8],
              middle: [9, 10, 11, 12],
              ring: [13, 14, 15, 16],
              pinky: [17, 18, 19, 20]
            };

            // Draw individual joints with correction colors
            lms.forEach((lm, lmIdx) => {
              let jointColor = '#ffffff'; // Default: white

              // Check which finger this landmark belongs to
              for (const [fingerName, indices] of Object.entries(fingerMap)) {
                if (indices.includes(lmIdx)) {
                  jointColor = deviations[fingerName] || '#ffffff';
                  break;
                }
              }

              drawLandmarks(ctx, [lm], { 
                color: jointColor, 
                lineWidth: 1, 
                radius: lmIdx === 0 ? 4 : 3 // Larger wrist
              });
            });
          } else {
            // fallback to default white if no deviations data
            drawLandmarks(ctx, lms, { color: '#ffffff', lineWidth: 1, radius: 3 });
          }
        });
      } else {
        landmarksRef.current = null;
        lastLandmarkTimeRef.current = 0;
        smoothingBuffer.current = [];
      }

      ctx.restore();
    });
    return () => { handsRef.current?.close(); };
  }, []);

  // ── 3. Webcam control ──────────────────────────────────────
  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setWebcamActive(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, []);

  const startWebcam = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // --- AUDIO AUDIT: Verify Mic Capture ---
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        console.log(`[WebRTC Student] Using Mic: ${audioTracks[0].label} (${audioTracks[0].readyState})`);
        if (audioTracks[0].readyState === 'ended') {
          console.error('[WebRTC Student] Mic track is "ended". Audio will be silent.');
        }
      } else {
        console.warn('[WebRTC Student] No audio track found!');
      }

      unlock(); // UNBLOCK AUDIO CONTEXT ON CAPTURE
      streamRef.current = stream;

      // Force local review is ALWAYS muted to prevent feedback loop beep
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; 
        await videoRef.current.play();
      }
      setWebcamActive(true);

      // FIX H: process pending offer now that camera is ready
      if (pendingOfferRef.current) {
        console.log('[WebRTC Student] Camera ready — processing pending offer');
        const { offer, fromSocketId } = pendingOfferRef.current;
        pendingOfferRef.current = null;
        // Call handleReceiveOffer directly — streamRef.current is now set
        await handleReceiveOffer(offer, fromSocketId);
      } else if (peerConnectionRef.current &&
        (peerConnectionRef.current.iceConnectionState === 'connected' ||
          peerConnectionRef.current.iceConnectionState === 'completed')) {
        // FIX I: PC already connected — ensure tracks are added and renegotiate
        console.log('[WebRTC Student] PC already connected — adding tracks & requesting renegotiation');
        stream.getTracks().forEach(track => {
          if (!peerConnectionRef.current.getSenders().find(s => s.track === track)) {
            peerConnectionRef.current.addTrack(track, stream);
          }
        });
        // Request fresh offer to sync the new audio tracks
        socketRef.current?.emit('request_webrtc_offer', { classId: classId });
      } else {
        // FIX J: no pending offer and no active PC — request a fresh one
        console.log('[WebRTC Student] No pending offer — requesting fresh offer from teacher');
        socketRef.current?.emit('request_webrtc_offer', { classId: classId });
      }

      requestRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      setCameraError('Camera error: ' + err.message);
      setSessionStarted(false);
    }
  }, [classId, handleReceiveOffer]);

  // ── 4. Main Processing Loop ────────────────────────────────
  // NEW: Ensure local video element stays attached to the stream
  useEffect(() => {
    const fixVideo = async () => {
      if (webcamActive && streamRef.current && videoRef.current) {
        if (!videoRef.current.srcObject) {
          console.log('[Video Fix] Re-attaching camera stream');
          videoRef.current.srcObject = streamRef.current;
        }
        try {
          if (videoRef.current.paused) {
            await videoRef.current.play();
          }
        } catch (err) {
          console.warn('[Video Fix] Play failed:', err);
        }
      }
    };
    fixVideo();
    const interval = setInterval(fixVideo, 3000);
    return () => clearInterval(interval);
  }, [webcamActive, sessionStarted]);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }
    if (handsRef.current) {
      await handsRef.current.send({ image: videoRef.current });
    }
    frameCountRef.current++;
    if (frameCountRef.current % 5 === 0 && !isDetectingRef.current) {
      runDetection();
    }
    requestRef.current = requestAnimationFrame(processFrame);
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    if (!video || video.readyState < 2) return null;
    canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1); ctx.drawImage(video, -320, 0, 320, 240);
    return canvas.toDataURL('image/jpeg', 0.4);
  }, []);

  const runDetection = async () => {

    const isFresh = (Date.now() - lastLandmarkTimeRef.current) < 1000;
    const lmData = isFresh ? landmarksRef.current : null;
    const socket = socketRef.current;
    
    if (!lmData) {
      setSessionStatus('No Hand');
      sessionStatusRef.current = 'No Hand';
      setFeedback('Show your hand to the camera');
      
      // Reset stability counters immediately
      consecutiveRef.current = { name: null, count: 0 };
      preStabilityRef.current = { name: null, count: 0 };
      
      // [HYSTERESIS] Score and Mudra name are cleared only by the holdTimer (1.5s)
      // frameBuffer and smoothing are cleared to ensure no "legacy" score leaks back
      frameBufferRef.current = [];
      smoothedScoreRef.current = 0;
      
      if (socket && socket.connected) {
        socket.emit('student_performance_update', {
          classId: classId,
          studentId: user?.id || user?._id || 'unknown',
          studentName: user?.name || 'Student',
          mudra: 'No Hand',
          score: 0,
          status: 'Practicing',
          landmarks: null,
          frame: null
        });
      }
      return;
    }

    // 🚨 FIX 2: PRE-STABILITY FILTER (Skip API if unstable)
    const rawDetected = lmData ? 'hand_present' : null;
    if (rawDetected === preStabilityRef.current.name) {
      preStabilityRef.current.count++;
    } else {
      preStabilityRef.current = { name: rawDetected, count: 1 };
    }

    if (preStabilityRef.current.count < 2) {
      setFeedback('Stabilizing...');
      return; // Skip API call
    }

    // Determine target
    const targetMudra = targetMudraRef.current?.toLowerCase() || classDataRef.current?.targetMudra?.toLowerCase();
    const DOUBLE_MUDRAS = ['anjali', 'bherunda', 'chakra', 'dola', 'garuda', 'kapotha', 'karkata', 'kartarisvastika', 'katakavardhana', 'katva', 'kilaka', 'kurma', 'matsya', 'nagabandha', 'pasa', 'puspaputa', 'sakata', 'samputa', 'sankha', 'sivalinga', 'svastika', 'utsanga', 'varaha'];
    const isTargetDouble = targetMudra && DOUBLE_MUDRAS.includes(targetMudra);

    if (!activeModulesRef.current.mudra) {
      setFeedback('Mudra Detection Paused');
      return;
    }

    // 🚨 PRE-API TARGET CHECK
    if (!targetMudra) {
      setFeedback('Waiting for teacher to set target...');
      setAiScore(0);
      aiScoreRef.current = 0;
      return;
    }

    isDetectingRef.current = true;
    try {
      const endpoint = isTargetDouble ? '/api/detect_double_landmarks' : '/api/evaluate_session';
      let body = {};
      
      if (isTargetDouble) {
          let rightLm = null, leftLm = null;
          lmData.multiHandLandmarks.forEach((lms, idx) => {
              let label = lmData.multiHandedness?.[idx]?.label || 'Right';
              if (lmData.multiHandLandmarks.length === 2) {
                  label = lms[0].x < 0.5 ? 'Right' : 'Left';
              }
              if (label === 'Right') rightLm = lms; else leftLm = lms;
          });
          body = { right_landmarks: rightLm, left_landmarks: leftLm, targetMudra: targetMudra };
      } else {
          body = {
              landmarks: lmData.landmarks,
              activeModules: activeModules,
              activeMudras: targetMudra ? [targetMudra] : []
          };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();

      let detectedName = data.matchedMudra || data.name || '';
      const score = data.score || data.accuracy || 0;
      const detected = detectedName?.toLowerCase();
      const target = targetMudra?.toLowerCase();

      // 🚨 HARD BLOCK WRONG MUDRA (STRICT TARGET-CONSTRAINED ENFORCEMENT)
      if (target && detected && detected !== target) {
        setDetectedMudra(detectedName);
        detectedMudraRef.current = detectedName;
        
        // RESET EVERYTHING IMMEDIATELY
        setAiScore(0);
        aiScoreRef.current = 0;
        smoothedScoreRef.current = 0;
        frameBufferRef.current = [];
        
        // Reset all stability counters (consecutiveRef and preStabilityRef)
        consecutiveRef.current = { name: null, count: 0 }; 
        preStabilityRef.current = { name: null, count: 0 };
        
        // TRIGGER WARNING TOAST
        setToastType('wrong');
        setToastData({
          name: `❌ Incorrect: ${detectedName}`,
          meaning: `Please show ${targetMudra}`,
          nameta: `❌ தவறான: ${detectedName}`,
          meaningta: `${targetMudra} காட்டவும்`
        });
        
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setShowMudraToast(true);
        // Quick 2s hide for warnings
        toastTimerRef.current = setTimeout(() => setShowMudraToast(false), 2000);

        // Clear hold timer so score doesn't linger
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        
        setSessionStatus('Incorrect');
        sessionStatusRef.current = 'Incorrect';
        setFeedback(`❌ Wrong: ${detectedName}. Show ${targetMudra}`);
        
        if (socket && socket.connected) {
          socket.emit('student_performance_update', {
            classId: classId,
            studentId: user?.id || user?._id || 'unknown',
            studentName: user?.name || 'Student',
            mudra: detectedName,
            score: 0,
            status: 'Incorrect',
            landmarks: lmData.landmarks || null,
            frame: captureFrame()
          });
        }
        return; // Stop processing this frame immediately
      }

      // 🚨 HARD GATE BEFORE STABILITY: If target exists and mismatch, stop now
      if (target && detected !== target) {
        return;
      }

      // ── STABILITY (ONLY FOR CORRECT MUDRA) ──
      if (detected === consecutiveRef.current.name) {
        consecutiveRef.current.count++;
      } else {
        consecutiveRef.current = { name: detected, count: 1 };
      }

      const currentThreshold = isTargetDouble ? STABILITY_THRESHOLD_DOUBLE : STABILITY_THRESHOLD;
      
      if (consecutiveRef.current.count >= currentThreshold && detected) {
        // 🚨 TARGET-CONSTRAINED SCORE GATE (Strict 85% Precision)
        if (score < 85) {
          frameBufferRef.current = [];
          smoothedScoreRef.current = 0;
          setAiScore(0);
          aiScoreRef.current = 0;
          return;
        }
        
        frameBufferRef.current.push(score);
        if (frameBufferRef.current.length > 5) frameBufferRef.current.shift();
        
        const avgScore = frameBufferRef.current.reduce((a, b) => a + b, 0) / frameBufferRef.current.length;

        // 🚨 STEP 4: APPLY SMOOTHING (EMA)
        const alpha = 0.2;
        const smoothed = (alpha * avgScore) + ((1 - alpha) * smoothedScoreRef.current);
        smoothedScoreRef.current = smoothed;

        const finalScore = Math.round(smoothed);

        // 🚨 STEP 5: FINAL SCORE SET (WITH HOLD)
        setDetectedMudra(detectedName);
        detectedMudraRef.current = detectedName;
        setAiScore(finalScore);
        aiScoreRef.current = finalScore;
        setSessionStatus(finalScore >= 75 ? 'Correct' : 'Incorrect');
        sessionStatusRef.current = finalScore >= 75 ? 'Correct' : 'Incorrect';
        setFeedback(finalScore >= 90 ? '✓ Correct! Perfect form.' : 'Good! Keep holding...');

        if (finalScore > bestScoreRef.current) {
          bestScoreRef.current = finalScore;
          setBestScore(finalScore);
        }

        // 🌟 PERFECT FORM TOAST (Fire once per target after 5 stable frames)
        if (finalScore >= 90 && !perfectFiredRef.current) {
          perfectCountRef.current++;
          if (perfectCountRef.current >= 5) {
            perfectFiredRef.current = true;
            setToastType('perfect');
            setToastData({
              name: "🌟 PERFECT FORM!",
              meaning: `${targetMudra}: Perfected`,
              nameta: "🌟 சிறப்பான வடிவம்!",
              meaningta: `${targetMudra}: சரியானது`
            });
            
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setShowMudraToast(true);
            toastTimerRef.current = setTimeout(() => setShowMudraToast(false), 3000);
          }
        } else {
          perfectCountRef.current = 0;
        }

        // HOLD LOGIC: Clears score only after 1.5s of no valid detection
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
            setAiScore(0);
            aiScoreRef.current = 0;
            setDetectedMudra('');
            detectedMudraRef.current = '';
        }, 1500);

      } else {
        // Detecting but not yet stable
        // (🚨 DO NOT RESET SMOOTHING HERE)
        setSessionStatus('Analyzing');
        sessionStatusRef.current = 'Analyzing';
        setFeedback(lmData ? 'Hold steady...' : 'Show your hand');
      }

      if (socket && socket.connected) {
        socket.emit('student_performance_update', {
          classId: classId,
          studentId: user?.id || user?._id || 'unknown',
          studentName: user?.name || 'Student',
          mudra: detectedMudraRef.current || 'Practicing',
          score: aiScoreRef.current,
          status: sessionStatusRef.current,
          landmarks: lmData.landmarks || null,
          frame: captureFrame()
        });
      }

    } catch (err) {
      console.error('Detection Error:', err);
    } finally {
      isDetectingRef.current = false;
    }
  };


  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const startSession = useCallback(async () => {
    unlock();
    setTimeout(() => unlock(), 1500);
    setSessionStarted(true);
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    setBestScore(0);
    bestScoreRef.current = 0;
    bestMudraRef.current = '';
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    setCameraError('Initializing…');
    setTimeout(async () => { setCameraError(''); await startWebcam(); }, 1000);
  }, [startWebcam, unlock]);

  const saveReport = useCallback(async () => {
    const timeTaken = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
    const reportData = {
      studentId: user?.id || user?._id || 'unknown',
      classId,
      mudraName: bestMudraRef.current || 'N/A',
      aiScore: bestScoreRef.current || 0,
      timeTaken,
      timestamp: new Date().toISOString(),
      feedback: bestScoreRef.current >= 75 ? 'Excellent' : 'Needs Practice'
    };

    setReportLoading(true);
    try {
      // Send to backend for background processing/storage
      await fetch(`/api/session_report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      // Use local data for display since the API returns a generic success message
      setReport(reportData);
    } catch (error) {
      console.warn("Report save background sync failed, using local data", error);
      setReport(reportData);
    } finally {
      setReportLoading(false);
      setSessionEnded(true);
    }
  }, [classId, user]);

  const leaveClass = useCallback(async () => {
    stopWebcam(); stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
    }
    if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
    await saveReport();
  }, [stopWebcam, stop, saveReport]);

  const handleEndSessionFromTeacher = useCallback(async () => {
    stopWebcam(); stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
    }
    if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
    await saveReport();
  }, [stopWebcam, stop, saveReport]);

  // ── LOADING ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F7FF' }}>
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm tracking-widest uppercase font-medium">Joining class…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F7FF' }}>
      <div className="text-center space-y-6 max-w-sm">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-slate-800 font-bold">{error}</p>
        <button onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-violet-600 text-white rounded-2xl text-sm font-semibold hover:bg-violet-700 transition-all">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  // ── SESSION REPORT ─────────────────────────────────────────
  if (sessionEnded && report) {
    const grade = report.aiScore >= 75 ? 'A' : report.aiScore >= 50 ? 'B' : 'C';
    const col = scoreColor(report.aiScore);
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #EDE9FE 100%)' }}>
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Session Report</h1>
            <p className="text-slate-500 text-sm">Your performance summary</p>
          </div>

          <div className="p-8 rounded-3xl bg-white shadow-xl border border-slate-100 text-center space-y-1">
            <p className="text-[10px] uppercase tracking-[4px] text-slate-400 font-bold">AI Grade</p>
            <div className="text-8xl font-black" style={{ color: col }}>{grade}</div>
            <p className="text-sm text-slate-500 font-medium">{report.feedback}</p>
          </div>

          <div className="p-6 rounded-3xl bg-white shadow-lg border border-slate-100 space-y-4">
            {[
              { label: 'Best Mudra', value: report.mudraName?.charAt(0).toUpperCase() + report.mudraName?.slice(1) || 'N/A' },
              { label: 'AI Score', value: `${report.aiScore}%`, color: col },
              { label: 'Time Taken', value: formatTime(report.timeTaken) },
              { label: 'Date', value: new Date(report.timestamp).toLocaleString() },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{label}</span>
                <span className="text-sm font-bold text-slate-800" style={color ? { color } : {}}>{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex-1 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all">
              Dashboard
            </button>
            <button onClick={() => window.print()}
              className="flex-1 py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all">
              Download Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PRE-SESSION JOIN SCREEN ────────────────────────────────
  if (!sessionStarted) return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #EDE9FE 100%)' }}>
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-violet-100 flex items-center justify-center mx-auto shadow-lg shadow-violet-100">
            <Camera className="w-10 h-10 text-violet-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">{classData?.title || 'Live Class'}</h1>
          <p className="text-slate-500 text-sm">
            Instructor: <span className="text-slate-800 font-bold">{classData?.staffName || '—'}</span>
          </p>
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 w-fit mx-auto">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Class is Live</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-md border border-slate-100 text-left space-y-1">
          <p className="text-[9px] uppercase tracking-[4px] text-slate-400 font-bold">Target Mudra</p>
          <p className="text-2xl font-black text-violet-600">{classData?.targetMudra || 'Any Mudra'}</p>
        </div>

        {cameraError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-left space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{cameraError}</p>
            </div>
          </div>
        )}

        <button onClick={startSession}
          className="w-full py-5 rounded-2xl text-white font-black text-sm tracking-[2px] uppercase transition-all hover:scale-[1.02] shadow-xl shadow-violet-200"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
          📷 Allow Camera & Join Class
        </button>
      </div>
    </div>
  );

  // ── ACTIVE SESSION ─────────────────────────────────────────
  const isCorrect = aiScore >= 75;
  const isTryAgain = aiScore > 0 && aiScore < 75;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#F8F7FF' }}>

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Camera className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900">{classData?.title || 'Live Class'}</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{classData?.staffName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Live</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-sm font-bold text-slate-700">{formatTime(elapsedSeconds)}</span>
        </div>

        <button onClick={leaveClass} disabled={reportLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 text-xs font-bold uppercase tracking-widest transition-all">
          <LogOut className="w-3 h-3" />
          {reportLoading ? 'Saving…' : 'Leave'}
        </button>
      </div>

      {announcement && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 text-center">
          <p className="text-xs text-blue-700 font-bold">📢 {announcement}</p>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Camera (large) ── */}
        <div className="flex-1 relative flex items-center justify-center p-5"
          style={{ background: 'linear-gradient(135deg, #F8F7FF 0%, #EDE9FE 40%, #F8F7FF 100%)' }}>

          <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-violet-200/60"
            style={{ border: '2px solid #DDD6FE' }}>

            <video ref={videoRef} autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }} />
            <canvas ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              width={1280} height={720} />

            {/* MUDRA CHANGE TOAST OVERLAY */}
            {showMudraToast && (
              <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none animate-in fade-in zoom-in duration-500">
                <div className="px-8 py-6 rounded-[32px] backdrop-blur-2xl shadow-2xl border border-white/40 flex flex-col items-center gap-2 text-center"
                  style={{ 
                    background: toastType === 'wrong' ? 'rgba(220, 38, 38, 0.9)' : toastType === 'perfect' ? 'rgba(5, 150, 105, 0.9)' : 'rgba(124, 58, 237, 0.9)',
                    boxShadow: toastType === 'wrong' ? '0 25px 50px -12px rgba(220, 38, 38, 0.5)' : toastType === 'perfect' ? '0 25px 50px -12px rgba(5, 150, 105, 0.5)' : '0 25px 50px -12px rgba(124, 58, 237, 0.5)' 
                  }}>
                  <span className="text-[10px] font-black uppercase tracking-[5px] text-white/70">
                    {toastType === 'wrong' ? 'Alert' : toastType === 'perfect' ? 'Achievement' : 'Next Mudra'}
                  </span>
                  <h2 className="text-4xl font-black text-white py-1">
                    {lang === 'ta' ? toastData.nameta : toastData.name}
                  </h2>
                  <div className="h-[1px] w-20 bg-white/30 my-2" />
                  <p className="text-sm font-medium text-white/90 max-w-[280px] leading-relaxed italic">
                    {lang === 'ta' ? toastData.meaningta : toastData.meaning}
                  </p>
                </div>
              </div>
            )}

            {detectedMudra && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[3px] backdrop-blur-md shadow-lg"
                style={{
                  background: isCorrect ? 'rgba(236,253,245,0.95)' : 'rgba(255,251,235,0.95)',
                  border: `1.5px solid ${isCorrect ? '#A7F3D0' : '#FDE68A'}`,
                  color: isCorrect ? '#065F46' : '#92400E'
                }}>
                {isCorrect ? '✓' : '○'} {detectedMudra.charAt(0).toUpperCase() + detectedMudra.slice(1)}
              </div>
            )}

            <div className="absolute top-5 right-5 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg flex flex-col items-end gap-1"
              style={{ background: 'rgba(255,255,255,0.92)', border: '1.5px solid #E2E8F0' }}>
              <span className="text-[8px] tracking-[3px] uppercase text-slate-400 font-bold">AI Score</span>
              <span className="text-3xl font-black" style={{ color: scoreColor(aiScore) }}>
                {aiScore > 0 ? `${aiScore}%` : '—'}
              </span>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${aiScore}%`, background: scoreColor(aiScore) }} />
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-5"
              style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)' }}>
              <div className="flex items-center gap-3">
                {isCorrect
                  ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  : isTryAgain
                    ? <RefreshCw className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    : <Activity className="w-5 h-5 text-slate-400 flex-shrink-0" />
                }
                <span className="text-sm font-bold"
                  style={{ color: isCorrect ? '#065F46' : isTryAgain ? '#92400E' : '#94A3B8' }}>
                  {feedback}
                </span>
              </div>
            </div>

            {/* Media Controls & Recovery */}
            <div className="absolute bottom-5 right-5 flex items-center gap-2 z-20">
              {/* Refresh Camera Button */}
              <button
                onClick={() => {
                  console.log('[Recovery] Manual camera restart');
                  stopWebcam();
                  setTimeout(() => startWebcam(), 300);
                }}
                className="p-3 rounded-2xl backdrop-blur-md border bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500 hover:text-white transition-all shadow-lg shadow-amber-500/20"
                title="Restart Camera"
              >
                <RefreshCw size={18} />
              </button>

              <button
                onClick={toggleMic}
                className={`p-3 rounded-2xl backdrop-blur-md border transition-all ${isMicOn ? 'bg-white/90 border-slate-200 text-slate-600' : 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                  }`}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={toggleCamera}
                className={`p-3 rounded-2xl backdrop-blur-md border transition-all ${isCameraOn ? 'bg-white/90 border-slate-200 text-slate-600' : 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                  }`}
              >
                {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </div>

            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: '#F1F5F9' }}>
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400 text-xs uppercase tracking-widest">Opening camera…</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="w-64 border-l border-slate-100 bg-white flex flex-col gap-3 p-4 flex-shrink-0 overflow-y-auto shadow-xl">

          {/* Teacher video — no muted so audio plays */}
          <div className="space-y-2 flex-grow min-h-[150px]">
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-[3px] text-slate-400 font-bold">🎙 Teacher</p>
              {teacherConnected && (
                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div style={{ width: '100%', height: '180px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#0f172a', position: 'relative' }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {!teacherConnected && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                  <p style={{ color: '#94A3B8', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Waiting for teacher...
                  </p>
                  <button
                    onClick={() => {
                      console.log('[Recovery] Manual connection reset');
                      // Reset local PC state to allow fresh offer processing
                      if (peerConnectionRef.current) {
                        peerConnectionRef.current.close();
                        peerConnectionRef.current = null;
                      }
                      socketRef.current?.emit('request_webrtc_offer', { classId: classId });
                    }}
                    className="mt-1 px-3 py-1 bg-violet-500 hover:bg-violet-600 border border-violet-400 rounded-lg text-[8px] font-bold text-white uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all"
                  >
                    🚀 Fix Connection
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: '#F1F5F9' }} />

          {/* Target */}
          <div className="p-3 rounded-2xl space-y-0.5" style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE' }}>
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-violet-400" />
              <p className="text-[9px] uppercase tracking-[3px] text-violet-400 font-bold">Target</p>
            </div>
            <p className="text-lg font-black text-violet-700">{classData?.targetMudra || 'Any'}</p>
          </div>

          {/* Detected */}
          <div className="p-3 rounded-2xl space-y-0.5 bg-slate-50" style={{ border: '1.5px solid #E2E8F0' }}>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-slate-400" />
              <p className="text-[9px] uppercase tracking-[3px] text-slate-400 font-bold">Detected</p>
            </div>
            <p className="text-lg font-black text-slate-800">
              {detectedMudra ? detectedMudra.charAt(0).toUpperCase() + detectedMudra.slice(1) : '—'}
            </p>
          </div>

          {/* Live + Best Score */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl space-y-0.5"
              style={{ background: scoreBg(aiScore), border: `1.5px solid ${scoreBorder(aiScore)}` }}>
              <p className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: scoreColor(aiScore) }}>Live</p>
              <div className="text-xl font-black" style={{ color: scoreColor(aiScore) }}>
                {aiScore > 0 ? `${aiScore}%` : '—'}
              </div>
            </div>
            <div className="p-3 rounded-2xl space-y-0.5"
              style={{ background: scoreBg(bestScore), border: `1.5px solid ${scoreBorder(bestScore)}` }}>
              <div className="flex items-center gap-1">
                <Award className="w-3 h-3" style={{ color: scoreColor(bestScore) }} />
                <p className="text-[9px] uppercase tracking-[2px] font-bold" style={{ color: scoreColor(bestScore) }}>Best</p>
              </div>
              <div className="text-xl font-black" style={{ color: scoreColor(bestScore) }}>
                {bestScore > 0 ? `${bestScore}%` : '—'}
              </div>
            </div>
          </div>

          {/* Navarasa */}
          {activeModules.face && (
            <div className="p-3 rounded-2xl bg-slate-50 space-y-1" style={{ border: '1.5px solid #E2E8F0' }}>
              <p className="text-[9px] uppercase tracking-[3px] text-slate-400 font-bold">😊 Expression</p>
              {rasaData.rasa
                ? <p className="text-base font-black" style={{ color: rasaData.expression_match ? '#065F46' : '#92400E' }}>
                  {rasaData.rasa.charAt(0).toUpperCase() + rasaData.rasa.slice(1)}
                  {rasaData.expression_match ? ' ✓' : ' ↻'}
                </p>
                : <p className="text-xs text-slate-400">Face the camera</p>
              }
            </div>
          )}

          {/* Corrections */}
          {corrections.length > 0 && (
            <div className="p-3 rounded-2xl space-y-2" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
              <p className="text-[9px] uppercase tracking-[3px] text-red-500 font-bold">Corrections</p>
              <ul className="space-y-1">
                {corrections.slice(0, 3).map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timer */}
          <div className="p-3 rounded-2xl bg-slate-50 space-y-0.5" style={{ border: '1.5px solid #E2E8F0' }}>
            <p className="text-[9px] uppercase tracking-[3px] text-slate-400 font-bold">Session Time</p>
            <p className="text-xl font-mono font-black text-slate-800">{formatTime(elapsedSeconds)}</p>
          </div>

          {/* Leave */}
          <button onClick={leaveClass} disabled={reportLoading}
            className="w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#C2410C' }}>
            <LogOut className="w-3 h-3" />
            {reportLoading ? 'Saving…' : 'Leave & Get Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLiveClass;
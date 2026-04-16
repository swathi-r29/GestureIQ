//src/pages/staff/StaffConductClass.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { useAuth } from '../../context/AuthContext';
import { useVoiceGuide } from '../../hooks/useVoiceGuide';
import { useLayout } from '../../context/LayoutContext';
import { Video, VideoOff, Mic, MicOff, Users, Clock, Activity, AlertTriangle, LogOut, Send, UserCheck, Zap, Award, Target, RefreshCw, Camera, CheckCircle, AlertCircle, Volume2 } from 'lucide-react';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

// ── Skeleton overlay for student cards ──────────────────────
const SkeletonOverlay = ({ landmarks, color = '#10B981' }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !landmarks) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const connections = [
      [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20]
    ];
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
    connections.forEach(([s, e]) => {
      if (landmarks[s] && landmarks[e]) {
        ctx.beginPath();
        ctx.moveTo(landmarks[s].x * canvas.width, landmarks[s].y * canvas.height);
        ctx.lineTo(landmarks[e].x * canvas.width, landmarks[e].y * canvas.height);
        ctx.stroke();
      }
    });
    ctx.fillStyle = '#fff';
    landmarks.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [landmarks, color]);
  return (
    <canvas ref={canvasRef} width={320} height={180}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ transform: 'scaleX(-1)' }} />
  );
};

const StudentVideo = ({ stream, name }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        console.log('[WebRTC Teacher] Attaching stream to monitor for:', name);
        videoRef.current.srcObject = stream;
      }
      
      // Auto-play the monitor (Audio will play if the browser is 'unlocked' by a user gesture)
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[WebRTC Teacher] Monitor playback blocked (gesture needed):', name, err);
        });
      }
    }
  }, [stream, name]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={false} // --- FIX: ENABLE STUDENT AUDIO MONITORING ---
      className="w-full h-full object-cover"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
};

// ── Shared Premium Utilities ──────────────────────────
const CircularScore = ({ score, color = '#10B981', size = 42 }) => {
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center transition-all duration-700" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/5" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth="3" fill="transparent"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.8s ease-in-out', strokeLinecap: 'round' }}
        />
      </svg>
      <span className="absolute text-[10px] font-black text-white">{Math.round(score)}</span>
    </div>
  );
};

const StaffConductClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSidebarHidden } = useLayout();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState({});
  const [currentMudra, setCurrentMudra] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState({ mudra: true, face: true, pose: false });
  const [announcement, setAnnouncement] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const { announce, unlock } = useVoiceGuide({ language: 'en' });

  const timerRef = useRef(null);
  const studentScoresRef = useRef({});
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());      // studentSocketId -> RTCPeerConnection
  const iceCandidatesQueuesRef = useRef(new Map());  // studentSocketId -> candidate[]
  const streamReadyRef = useRef(false);

  // FIX 1: prevent duplicate simultaneous offers for the same student
  const offerInProgressRef = useRef(new Set());
  // FIX 2: track ICE restart timers so we can cancel them on cleanup
  const iceRestartTimersRef = useRef(new Map());
  // NEW: track last offer time to prevent rapid-fire signaling
  const lastOfferTimeRef = useRef(new Map());
  // NEW: lock to prevent concurrent answer processing for same student
  const processingAnswerRef = useRef(new Map());
  const socketToUserIdRef = useRef({});

  useEffect(() => {
    const init = async () => {
      await fetchClassAndStart();
      await startLocalStream();
    };
    init();

    return () => {
      setSidebarHidden(false); // Restore sidebar on leave
      if (timerRef.current) clearInterval(timerRef.current);
      iceRestartTimersRef.current.forEach(t => clearTimeout(t));
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, []);

  // NEW: Ensure local video element stays attached to the stream
  useEffect(() => {
    const fixVideo = async () => {
      if (localVideoRef.current && localStreamRef.current) {
        if (!localVideoRef.current.srcObject) {
          console.log('[Video Fix] Re-attaching camera stream');
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        try {
          // Force play in case it was paused
          if (localVideoRef.current.paused) {
            await localVideoRef.current.play();
          }
        } catch (err) {
          console.warn('[Video Fix] Play failed:', err);
        }
      }
    };
    fixVideo();
    // Also re-check on a periodic interval to catch any weird state changes
    const interval = setInterval(fixVideo, 3000);
    return () => clearInterval(interval);
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      localStreamRef.current = stream;
      streamReadyRef.current = true;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      unlock(); // Bypass browser autoplay blocks
      console.log('[WebRTC Teacher] Camera ready — sending offers to existing students');

      peerConnectionsRef.current.forEach((pc, studentSocketId) => {
        if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
          handleCreateOffer(studentSocketId);
        }
      });

    } catch (err) {
      console.error('[WebRTC Teacher] Camera access error:', err);
      alert('Could not access camera/microphone. Please allow permissions and refresh.');
    }
  };

  // FIX 3: createPeerConnection takes studentSocketId so ICE handler closure is correct
  const createPeerConnection = (studentSocketId) => {
    // Close existing cleanly
    if (peerConnectionsRef.current.has(studentSocketId)) {
      const old = peerConnectionsRef.current.get(studentSocketId);
      // Detach handlers before closing to prevent stale events
      old.onicecandidate = null;
      old.oniceconnectionstatechange = null;
      old.ontrack = null;
      old.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current.set(studentSocketId, pc);

    // Add all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
        console.log('[WebRTC Teacher] Added track:', track.kind, 'for student:', studentSocketId);
      });
    }

    pc.onicecandidate = (event) => {
      // FIX 4: guard — only send if this PC is still the current one
      if (peerConnectionsRef.current.get(studentSocketId) !== pc) return;
      if (event.candidate) {
        socketRef.current?.emit('webrtc_ice_candidate', {
          classId: classId,
          to: studentSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      // FIX 5: stale-PC guard — ignore events from replaced connections
      if (peerConnectionsRef.current.get(studentSocketId) !== pc) return;

      console.log(`[WebRTC Teacher] ICE state for ${studentSocketId}:`, pc.iceConnectionState);

      if (pc.iceConnectionState === 'disconnected') {
        // Give it 4s to recover on its own before restarting
        const timer = setTimeout(() => {
          if (peerConnectionsRef.current.get(studentSocketId) !== pc) return;
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            console.log('[WebRTC Teacher] ICE stuck — restarting offer for:', studentSocketId);
            handleCreateOffer(studentSocketId);
          }
        }, 4000);
        iceRestartTimersRef.current.set(studentSocketId, timer);
      }

      if (pc.iceConnectionState === 'failed') {
        // Immediate restart on hard fail
        console.log('[WebRTC Teacher] ICE failed — immediate restart for:', studentSocketId);
        handleCreateOffer(studentSocketId);
      }

      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        // Clear any pending restart timer
        if (iceRestartTimersRef.current.has(studentSocketId)) {
          clearTimeout(iceRestartTimersRef.current.get(studentSocketId));
          iceRestartTimersRef.current.delete(studentSocketId);
        }
      }
    };

    pc.ontrack = (event) => {
      // FIX 6: stale-PC guard
      if (peerConnectionsRef.current.get(studentSocketId) !== pc) return;

      console.log(`[WebRTC Teacher] Got track from student ${studentSocketId}:`, event.track.kind);
      
      const studentId = socketToUserIdRef.current[studentSocketId];
      if (!studentId) {
        console.warn('[WebRTC Teacher] ontrack — no userId registered for socket:', studentSocketId);
        return;
      }

      // Use the first stream provided by the browser (Standard Unified Plan behavior)
      const remoteStream = event.streams[0];
      if (!remoteStream) {
        console.error('[WebRTC Teacher] No stream provided in ontrack for:', studentSocketId);
        return;
      }

      setStudents(prev => {
        if (!prev[studentId]) return prev;

        // Only update state if it's a new stream object or if we don't have one yet
        if (prev[studentId].remoteStream === remoteStream) return prev;

        console.log('[WebRTC Teacher] Updating remoteStream for student:', studentId);
        return {
          ...prev,
          [studentId]: { ...prev[studentId], remoteStream: remoteStream }
        };
      });
    };

    return pc;
  };

  const handleCreateOffer = async (studentSocketId) => {
    if (!streamReadyRef.current || !localStreamRef.current) {
      console.warn('[WebRTC Teacher] Stream not ready, skipping offer for:', studentSocketId);
      return;
    }

    // NEW GUARD: Rate limit offers (max 1 per 2 seconds per student)
    const now = Date.now();
    const lastTime = lastOfferTimeRef.current.get(studentSocketId) || 0;
    if (now - lastTime < 2000) {
      console.warn('[WebRTC Teacher] Signaling rate limit — skipping offer for:', studentSocketId);
      return;
    }

    // FIX 7: prevent duplicate simultaneous offers for same student
    if (offerInProgressRef.current.has(studentSocketId)) {
      console.warn('[WebRTC Teacher] Offer already in progress for:', studentSocketId);
      return;
    }

    const pc = peerConnectionsRef.current.get(studentSocketId);
    
    // GUARD: If already processing a handshake, don't interrupt it
    if (pc && pc.signalingState !== 'stable') {
      console.warn('[WebRTC Teacher] signalingState is', pc.signalingState, '— skipping reset for:', studentSocketId);
      return;
    }

    // GUARD: If already connected and stable, skip unless specifically requested
    if (pc && pc.signalingState === 'stable' && (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
      console.log('[WebRTC Teacher] Connection already stable for:', studentSocketId);
      return;
    }

    offerInProgressRef.current.add(studentSocketId);
    lastOfferTimeRef.current.set(studentSocketId, now);

    try {
      console.log('[WebRTC Teacher] Starting new handshake for:', studentSocketId);
      const newPC = createPeerConnection(studentSocketId);
      const offer = await newPC.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await newPC.setLocalDescription(offer);
      
      socketRef.current?.emit('webrtc_offer', {
        classId: classId,
        to: studentSocketId,
        offer
      });
      console.log('[WebRTC Teacher] Offer sent to:', studentSocketId);
    } catch (err) {
      console.error('[WebRTC Teacher] Error creating offer:', err);
    } finally {
      offerInProgressRef.current.delete(studentSocketId);
    }
  };

  const fetchClassAndStart = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `/api/staff/class/${classId}`,
        { headers: { 'x-auth-token': token } }
      );
      setClassData(res.data);
      setCurrentMudra(res.data.mudrasList?.[0] || '');

      const s = getSocket();
      socketRef.current = s;

      const joinRoom = () => {
        if (s.connected) {
          s.emit('join_class', {
            classId: classId,
            name: 'Teacher',
            userId: user?.id || user?._id || 'teacher',
            isTeacher: true
          });
        }
      };

      if (s.connected) joinRoom();
      s.on('connect', joinRoom);
      s.on('reconnect', joinRoom);

      await axios.post(
        `/api/staff/class/${classId}/start`, {},
        { headers: { 'x-auth-token': token } }
      );

      if (s.connected) {
        s.emit('start_live_session', classId);
        s.emit('set_target_mudra', {
          classId: classId,
          target: res.data.mudrasList?.[0] || ''
        });
      }

      setSidebarHidden(true); // Hide sidebar when live

      // Student joins → create offer for them
      s.on('participant_joined', (data) => {
        if (data.name === 'Teacher' || data.isTeacher) return;
        console.log('[WebRTC Teacher] Student joined:', data.name, data.id);

        // ✅ Register mapping immediately
        socketToUserIdRef.current[data.id] = data.userId;

        setStudents(prev => prev[data.userId] ? prev : {
          ...prev,
          [data.userId]: {
            socketId: data.id, name: data.name || 'Student',
            score: 0, attempts: 0, mudra: 'Joining...', status: 'Connecting...', lastSeen: Date.now(), frame: null
          }
        });

        if (streamReadyRef.current) {
          handleCreateOffer(data.id);
        }
      });

      // Students already in room when teacher joins
      s.on('current_participants', (participants) => {
        participants.forEach(p => {
            if (p.name === 'Teacher' || p.isTeacher) return;
            
            // ✅ Register mapping for existing participants
            socketToUserIdRef.current[p.id] = p.userId;

            setStudents(prev => prev[p.userId] ? prev : {
            ...prev,
            [p.userId]: {
              socketId: p.id, name: p.name || 'Student',
              score: 0, attempts: 0, mudra: 'Joining...', status: 'Connecting...', lastSeen: Date.now(), frame: null
            }
          });
          if (streamReadyRef.current) {
            handleCreateOffer(p.id);
          }
        });
      });

      // Student's answer to our offer
      s.on('webrtc_answer_response', async (data) => {
        const studentSocketId = data.from;
        const pc = peerConnectionsRef.current.get(studentSocketId);
        if (!pc) return;

        // NEW: Answer Processing Lock
        if (processingAnswerRef.current.get(studentSocketId)) {
          console.warn('[WebRTC Teacher] Answer already being processed for:', studentSocketId);
          return;
        }

        // FIX 9: if we get an answer and we're stable, check if it's a "zombie" connection
        if (pc.signalingState === 'stable') {
          // If we are stable but don't have tracks OR connection is failed, allow a reset
          const hasTracks = pc.getReceivers().some(r => r.track && r.track.readyState === 'live');
          if (!hasTracks || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.log('[WebRTC Teacher] Connection looks stale/zombie — force-restarting for:', studentSocketId);
            processingAnswerRef.current.delete(studentSocketId);
            handleCreateOffer(studentSocketId);
          } else {
            console.warn('[WebRTC Teacher] Got answer but state is already stable and active — ignoring');
          }
          return;
        }

        if (pc.signalingState !== 'have-local-offer') {
          console.warn('[WebRTC Teacher] Got answer but state is', pc.signalingState, '— ignoring');
          return;
        }

        processingAnswerRef.current.set(studentSocketId, true);

        try {
          console.log('[WebRTC Teacher] Setting remote answer for:', studentSocketId);
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('[WebRTC Teacher] Answer successfully accepted from:', studentSocketId);

          // Drain queued ICE candidates
          const queue = iceCandidatesQueuesRef.current.get(studentSocketId) || [];
          while (queue.length > 0) {
            const candidate = queue.shift();
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
            catch (err) { console.warn('[WebRTC Teacher] ICE queue error:', err); }
          }
          iceCandidatesQueuesRef.current.delete(studentSocketId);
        } catch (err) {
          console.error('[WebRTC Teacher] Error setting answer:', err);
        } finally {
          processingAnswerRef.current.delete(studentSocketId);
        }
      });

      // ICE candidates from students
      s.on('ice_candidate_received', async (data) => {
        const pc = peerConnectionsRef.current.get(data.from);
        if (!pc || !data.candidate) return;
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
          catch (err) { console.warn('[WebRTC Teacher] ICE error:', err); }
        } else {
          const queue = iceCandidatesQueuesRef.current.get(data.from) || [];
          queue.push(data.candidate);
          iceCandidatesQueuesRef.current.set(data.from, queue);
        }
      });

      s.on('update_class_state_ack', (data) => {
        console.log('[Socket] State update acknowledging:', data);
      });

      // --- NEW: AI VOICE PROXY LISTENER ---
      // Allows the teacher to hear what the student's AI is saying
      s.on('receive_proxy_voice', (data) => {
        console.log(`[Proxy Voice] Student ${data.from} AI says: ${data.text}`);
        // Use priority 2 to ensure it doesn't drown out essential classroom alerts
        announce?.raw(`Student AI: ${data.text}`, 2);
      });

      // Student requests offer (e.g. they refreshed or joined late)
      s.on('request_webrtc_offer', async ({ from }) => {
        console.log('[WebRTC Teacher] Student requested offer:', from);
        if (streamReadyRef.current) {
          handleCreateOffer(from);
        }
      });

      s.on('participant_left', (data) => {
        // ✅ Cleanup mapping
        delete socketToUserIdRef.current[data.id];

        setStudents(prev => { const u = { ...prev }; delete u[data.userId]; return u; });
        const pc = peerConnectionsRef.current.get(data.id);
        if (pc) {
          pc.onicecandidate = null;
          pc.oniceconnectionstatechange = null;
          pc.ontrack = null;
          pc.close();
          peerConnectionsRef.current.delete(data.id);
        }
        iceCandidatesQueuesRef.current.delete(data.id);
        offerInProgressRef.current.delete(data.id);
        if (iceRestartTimersRef.current.has(data.id)) {
          clearTimeout(iceRestartTimersRef.current.get(data.id));
          iceRestartTimersRef.current.delete(data.id);
        }
      });

      s.on('score_update', updateStudentData);
      s.on('student_performance_update', updateStudentData);

      timerRef.current = setInterval(() => setTimer(p => p + 1), 1000);

    } catch (err) {
      console.error('Error entering classroom:', err);
      alert('Error entering classroom');
      navigate('/staff/classes');
    } finally {
      setLoading(false);
    }
  };

  const updateStudentData = (data) => {
    setStudents(prev => {
      const studentId = data.studentId;
      if (!studentId) return prev;
      const currentStudent = prev[studentId] || {};
      const status = data.score >= 90 ? 'Excellent' : data.score >= 75 ? 'Good' : 'Practicing';
      return {
        ...prev,
        [studentId]: {
          ...currentStudent,
          name: data.studentName || currentStudent.name || 'Student',
          score: data.score !== undefined ? data.score : currentStudent.score || 0,
          mudra: data.mudra || currentStudent.mudra || '',
          status,
          lastSeen: Date.now(),
          frame: data.frame || currentStudent.frame || null,
          landmarks: data.landmarks || currentStudent.landmarks || null
        }
      };
    });

    if (!studentScoresRef.current[data.studentId]) {
      studentScoresRef.current[data.studentId] = {
        studentId: data.studentId, studentName: data.studentName, mudraScores: {}
      };
    }
    const report = studentScoresRef.current[data.studentId];
    if (data.mudra) {
      if (!report.mudraScores[data.mudra]) {
        report.mudraScores[data.mudra] = { mudra: data.mudra, attempts: 0, bestScore: 0 };
      }
      const ms = report.mudraScores[data.mudra];
      if (data.score > 0) ms.attempts++;
      if (data.score > ms.bestScore) ms.bestScore = data.score;
    }
  };

  const handleMudraChange = (newMudra) => {
    setCurrentMudra(newMudra);
    const sock = socketRef.current;
    if (sock && sock.connected) {
      // NEW: Use update_class_state for better sync
      sock.emit('update_class_state', {
        classId: classId,
        targetMudra: newMudra,
        activeModules: activeModules
      });
      // Backward compatibility
      sock.emit('set_target_mudra', { classId: classId, target: newMudra });
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const handleModuleToggle = async (module) => {
    const updated = { ...activeModules, [module]: !activeModules[module] };
    setActiveModules(updated);
    const sock = socketRef.current;
    if (sock && sock.connected) {
      // NEW: Use update_class_state
      sock.emit('update_class_state', {
        classId: classId,
        targetMudra: currentMudra,
        activeModules: updated
      });
      // Backward compatibility
      sock.emit('modules_changed', { classId: classId, modules: updated });
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/live/modules/${classId}`,
        updated,
        { headers: { 'x-auth-token': token } }
      );
    } catch (error) { console.error('Failed to save modules', error); }
  };

  const handleBroadcastAnnouncement = () => {
    const sock = socketRef.current;
    if (!announcement.trim() || !sock || !sock.connected) return;
    sock.emit('class_announcement', { classId: classId, message: announcement });
    setAnnouncement('');
  };

  const handleEndClass = async () => {
    if (!window.confirm('End this class? Reports will be generated for all students.')) return;
    try {
      const token = localStorage.getItem('token');
      socketRef.current?.emit('class_ended', classId);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      peerConnectionsRef.current.forEach(pc => {
        pc.onicecandidate = null;
        pc.oniceconnectionstatechange = null;
        pc.ontrack = null;
        pc.close();
      });

      const studentReports = Object.values(studentScoresRef.current).map(s => ({
        ...s, mudraScores: Object.values(s.mudraScores)
      }));
      await axios.post(
        `/api/staff/class/${classId}/end`,
        { studentReports },
        { headers: { 'x-auth-token': token } }
      );
      setSidebarHidden(false); // Restore sidebar on end
      alert('Session completed. Report generated.');
      navigate('/staff/reports');
    } catch (error) { 
      setSidebarHidden(false); // Restore sidebar even on error
      alert('Error ending session'); 
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">Loading Classroom...</div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>

      <div className="h-16 flex items-center justify-between px-6 border-b shrink-0"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center space-x-4">
          <div className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold animate-pulse">LIVE</div>
          <h1 className="font-bold truncate max-w-[200px]" style={{ color: 'var(--text)' }}>{classData?.title}</h1>
        </div>
        <div className="flex items-center space-x-6">
          {/* Unified Spotlight Pill */}
          <div className="flex items-center bg-zinc-950 rounded-2xl p-1 border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
            <div className="flex items-center px-4 py-1.5 space-x-3 border-r border-white/5 bg-gradient-to-r from-orange-500/10 to-transparent">
              <Target className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 leading-none mb-1">Target Mudra</span>
                <select 
                  value={currentMudra} 
                  onChange={e => handleMudraChange(e.target.value)}
                  className="bg-transparent text-xs font-black text-[#f97316] outline-none cursor-pointer hover:text-orange-400 transition-colors"
                  style={{ textShadow: '0 0 10px rgba(249,115,22,0.3)' }}
                >
                  {(classData?.mudrasList || []).map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center px-5 py-1.5 space-x-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 leading-none mb-1">AI Module</span>
                <div
                  onClick={() => handleModuleToggle('mudra')}
                  className="w-9 h-4.5 rounded-full cursor-pointer transition-all duration-500 relative border border-white/10 shadow-inner"
                  style={{
                    backgroundColor: activeModules.mudra ? '#10B981' : '#374151',
                    boxShadow: activeModules.mudra ? '0 0 15px rgba(16,185,129,0.2)' : 'none'
                  }}
                >
                  <div className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-md transition-all duration-500 ${activeModules.mudra ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Volume2 
              className="w-4 h-4 text-emerald-500 cursor-pointer hover:scale-110 transition-transform" 
              onClick={() => {
                const audios = document.querySelectorAll('video');
                audios.forEach(a => {
                  a.play().catch(() => {});
                  if (a.paused) a.muted = false;
                });
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                if (ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + 0.1);
                console.log('[Audio] Browser audio context manually unlocked');
                setAnnouncement('Audio playback unblocked');
                setTimeout(() => setAnnouncement(''), 3000);
              }}
              title="Unblock Student Audio"
            />
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="font-mono text-sm font-bold">{formatTime(timer)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold">{Object.keys(students).length}</span>
          </div>
          <button onClick={handleEndClass}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:brightness-110 flex items-center space-x-2 transition-all active:scale-95 shadow-lg shadow-red-600/20">
            <LogOut className="w-3 h-3" /><span>End Class</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r p-4 overflow-y-auto shrink-0 flex flex-col gap-6"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          <div className="p-4 rounded-xl border border-dashed text-center space-y-2"
            style={{ borderColor: 'var(--accent)', backgroundColor: 'rgba(139,92,246,0.05)' }}>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-black tracking-widest uppercase text-green-500">Live AI Session</p>
            </div>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Mudra Sync Active</p>
          </div>

          {/* Removed redundant Target Mudra and AI Modules from sidebar — now in header */}

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Rankings</p>
              <Award className="w-3.5 h-3.5 text-yellow-500" />
            </div>
            <div className="space-y-3 custom-scrollbar max-h-[200px] overflow-y-auto pr-2">
              {Object.values(students)
                .sort((a, b) => b.score - a.score)
                .map((s, idx) => (
                  <div key={s.socketId || idx} className="space-y-1.5 animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-2">
                        <span className={`w-4 font-black ${idx === 0 ? 'text-yellow-500' : 'text-zinc-600'}`}>{idx + 1}</span>
                        <span className="font-bold text-zinc-300 truncate max-w-[80px]">{s.name}</span>
                      </div>
                      <span className="font-black text-white">{s.score}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${s.score}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-auto p-4 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Broadcast</p>
            </div>
            <textarea 
              value={announcement} 
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="Type announcement..." 
              className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none h-20" 
            />
            <button 
              onClick={handleBroadcastAnnouncement}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              Push To Students
            </button>
          </div>
        </div>

        {/* Center: Teacher camera */}
        <div className="flex-1 bg-black relative">
          <video ref={localVideoRef} autoPlay playsInline muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} />
          <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 rounded text-white text-[10px] font-black uppercase">
            🔴 Your Camera — Live
          </div>

          {/* Teacher Media Controls */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-5 z-20">
            <button
              onClick={toggleMic}
              className={`p-5 rounded-[2.5rem] backdrop-blur-xl border-2 transition-all duration-500 hover:scale-110 active:scale-95 ${
                isMicOn 
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                : 'bg-red-500 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              }`}
            >
              {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-5 rounded-[2.5rem] backdrop-blur-xl border-2 transition-all duration-500 hover:scale-110 active:scale-95 ${
                isCameraOn 
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                : 'bg-red-500 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              }`}
            >
              {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          </div>

          {!localStreamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <div className="text-center space-y-3 opacity-40">
                <Camera className="w-10 h-10 text-white mx-auto" />
                <p className="text-white text-xs uppercase tracking-widest">Requesting camera…</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Student monitoring */}
        <div className="w-[450px] border-l overflow-y-auto shrink-0 bg-zinc-950 p-6"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-[3px] text-zinc-400">Student Monitoring</h2>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Real-time AI</span>
          </div>

          {Object.keys(students).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(students).map(([studentId, data], idx) => (
                <div key={studentId}
                  className={`relative p-5 rounded-[2rem] border-2 transition-all duration-700 animate-fadeIn overflow-hidden ${
                    data.score >= 90 ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.15)]' :
                    data.score >= 75 ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.1)]' :
                    'border-red-500/40 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
                  }`}
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  {/* Decorative corner glow */}
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 ${
                    data.score >= 90 ? 'bg-emerald-500' : data.score >= 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />

                  <div className="relative aspect-video rounded-2xl bg-black mb-5 overflow-hidden border border-white/10 group shadow-2xl">
                    {data.remoteStream ? (
                      <StudentVideo stream={data.remoteStream} name={data.name} />
                    ) : data.frame ? (
                      <img src={data.frame} className="w-full h-full object-cover grayscale-[0.2]"
                        style={{ transform: 'scaleX(-1)' }} alt={data.name} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <Users className="w-8 h-8 mb-3 text-white animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[3px]">Awaiting Stream</span>
                      </div>
                    )}
                    
                    {/* Floating Circular Score Overlay */}
                    <div className="absolute top-3 right-3 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <CircularScore 
                        score={data.score} 
                        color={data.score >= 90 ? '#10B981' : data.score >= 75 ? '#F59E0B' : '#EF4444'} 
                      />
                    </div>

                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 flex items-center space-x-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${data.score >= 90 ? 'bg-emerald-500' : 'bg-zinc-500 opacity-50'} animate-pulse`} />
                      <span className="text-[8px] font-black uppercase text-white/70">Secure Handshake</span>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-black text-white tracking-wide">{data.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Activity className="w-3 h-3 text-zinc-500" />
                          <span className={`text-[11px] font-black uppercase tracking-tight ${
                            data.mudra && data.mudra !== 'No Hand' ? 'text-blue-400' : 'text-zinc-500'
                          }`}>
                            {activeModules.mudra ? (data.mudra || 'No Action') : 'AI Paused'}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl border ${
                        data.score >= 90 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                        data.score >= 75 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                        'text-red-400 border-red-500/30 bg-red-500/10'
                      }`}>{data.status}</span>
                    </div>

                    {/* Premium Gradient Progress Bar */}
                    <div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full bg-gradient-to-r ${
                          data.score >= 90 ? 'from-emerald-600 to-emerald-400' :
                          data.score >= 75 ? 'from-amber-600 to-amber-400' :
                          'from-red-600 to-red-400'
                        }`}
                        style={{ width: `${data.score}%`, boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center opacity-20 space-y-6 text-center">
              <div className="relative">
                <Users size={80} className="text-white" />
                <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-30" />
              </div>
              <p className="text-sm font-black uppercase tracking-[6px] text-white">Observing Classroom Presence</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.23, 1, 0.32, 1) both; }
      `}</style>
    </div>
  );
};

export default StaffConductClass;
//src/pages/staff/StaffConductClass.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { useAuth } from '../../context/AuthContext';
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
      // Force play
      videoRef.current.play().catch(err => {
        console.warn('[WebRTC Teacher] Monitor play failed:', err);
      });
    }
  }, [stream, name]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
};

const StaffConductClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState({});
  const [currentMudra, setCurrentMudra] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState({ mudra: true, face: true, pose: false });
  const [announcement, setAnnouncement] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

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

  useEffect(() => {
    const init = async () => {
      await fetchClassAndStart();
      await startLocalStream();
    };
    init();

    return () => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      streamReadyRef.current = true;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

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
      setStudents(prev => {
        const studentId = Object.keys(prev).find(id => prev[id].socketId === studentSocketId);
        if (!studentId) return prev;

        // FIX: Create a NEW MediaStream instance so React detects the reference change
        // This ensures the StudentVideo component re-attaches the stream when new tracks arrive
        const oldStream = prev[studentId].remoteStream;
        const newStream = new MediaStream(oldStream ? oldStream.getTracks() : []);
        newStream.addTrack(event.track);

        return {
          ...prev,
          [studentId]: { ...prev[studentId], remoteStream: newStream }
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

      // Student joins → create offer for them
      s.on('participant_joined', (data) => {
        if (data.name === 'Teacher' || data.isTeacher) return;
        console.log('[WebRTC Teacher] Student joined:', data.name, data.id);

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
          // If we are stable but don't have tracks or connection is failed, allow a reset
          const hasTracks = pc.getReceivers().some(r => r.track && r.track.readyState === 'live');
          if (!hasTracks || pc.iceConnectionState === 'failed') {
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

      // Student requests offer (e.g. they refreshed or joined late)
      s.on('request_webrtc_offer', (data) => {
        console.log('[WebRTC Teacher] Student requested offer:', data.from);
        if (streamReadyRef.current) {
          handleCreateOffer(data.from);
        }
      });

      s.on('participant_left', (data) => {
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
    } catch { console.error('Failed to save modules'); }
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
      alert('Session completed. Report generated.');
      navigate('/staff/reports');
    } catch { alert('Error ending session'); }
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
          {/* Spotlight Controls in Header */}
          <div className="flex items-center bg-zinc-900/50 rounded-xl p-1 border border-white/5">
            <div className="flex items-center px-3 space-x-3 border-r border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target</span>
              <select 
                value={currentMudra} 
                onChange={e => handleMudraChange(e.target.value)}
                className="bg-transparent text-xs font-black text-orange-500 outline-none cursor-pointer"
              >
                {(classData?.mudrasList || []).map(m => <option key={m} value={m} className="bg-zinc-900">{m}</option>)}
              </select>
            </div>
            <div className="flex items-center px-3 space-x-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI Practice</span>
              <div
                onClick={() => handleModuleToggle('mudra')}
                className="w-10 h-5 rounded-full cursor-pointer transition-all duration-300 relative border border-white/10"
                style={{
                  backgroundColor: activeModules.mudra ? '#10B981' : '#374151',
                  boxShadow: activeModules.mudra ? '0 0 10px rgba(16,185,129,0.3)' : 'none'
                }}
              >
                <div className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all duration-300 ${activeModules.mudra ? 'left-5.5' : 'left-0.5'}`}
                  style={{ left: activeModules.mudra ? '22px' : '2px' }} />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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

          <div className="mt-auto p-4 rounded-2xl bg-zinc-900 space-y-2">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Broadcast</p>
            <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)}
              placeholder="Message..." className="w-full bg-transparent border-b border-white/10 text-xs py-1" />
            <button onClick={handleBroadcastAnnouncement}
              className="w-full py-2 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase">
              Send
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-2xl backdrop-blur-md border transition-all ${
                isMicOn ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
              }`}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-2xl backdrop-blur-md border transition-all ${
                isCameraOn ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
              }`}
            >
              {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
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
              {Object.entries(students).map(([studentId, data]) => (
                <div key={studentId}
                  className={`p-4 rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
                    data.score >= 90 ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_25px_rgba(16,185,129,0.2)]' :
                    data.score >= 75 ? 'border-yellow-500/50 bg-yellow-500/5' :
                    'border-red-500/50 bg-red-500/5'
                  }`}>

                  <div className="relative aspect-video rounded-xl bg-black mb-4 overflow-hidden border border-white/5">
                    {data.remoteStream ? (
                      <StudentVideo stream={data.remoteStream} name={data.name} />
                    ) : data.frame ? (
                      <img src={data.frame} className="w-full h-full object-cover grayscale-[0.3]"
                        style={{ transform: 'scaleX(-1)' }} alt={data.name} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <Users className="w-6 h-6 mb-2 text-white" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Waiting for feed...</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-0.5 rounded bg-black/80 border border-white/10">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        !activeModules.mudra ? 'bg-zinc-600' :
                        data.score >= 90 ? 'bg-emerald-500' : data.score >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      } ${activeModules.mudra ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] font-black text-white">
                        {activeModules.mudra ? `${data.score}%` : 'Off'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-white mb-0.5">{data.name}</h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Current:</span>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">
                            {activeModules.mudra ? (data.mudra || 'None') : 'Paused'}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 ${
                        data.score >= 90 ? 'text-emerald-400' :
                        data.score >= 75 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>{data.status}</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${
                          data.score >= 90 ? 'bg-emerald-500' :
                          data.score >= 75 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${data.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4 py-20 text-center">
              <Users size={48} />
              <p className="text-xs font-bold uppercase tracking-widest">Waiting for students to join...</p>
            </div>
          )}

          {Object.keys(students).length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <h3 className="text-[10px] font-black uppercase tracking-[2px] text-zinc-500 mb-4">Rankings</h3>
              <div className="space-y-2">
                {Object.values(students)
                  .sort((a, b) => b.score - a.score)
                  .map((s, idx) => (
                    <div key={s.socketId || idx} className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-600 w-4 font-black">{idx + 1}</span>
                      <span className="flex-1 font-bold text-zinc-400 truncate px-2">{s.name}</span>
                      <span className="font-black text-zinc-200">{s.score}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffConductClass;
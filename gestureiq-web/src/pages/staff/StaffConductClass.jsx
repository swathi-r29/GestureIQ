import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import {
  Video,
  Users,
  Clock,
  Activity,
  AlertTriangle,
  LogOut,
  Send,
  UserCheck
} from 'lucide-react';

// ── SKELETON RENDERER ───────────────────────────────────────
const SkeletonOverlay = ({ landmarks, color = '#10B981' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !landmarks) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Joint connections (simplified for overview)
    const connections = [
      [0,1],[1,2],[2,3],[3,4],        // Thumb
      [0,5],[5,6],[6,7],[7,8],        // Index
      [0,9],[9,10],[10,11],[11,12],   // Middle
      [0,13],[13,14],[14,15],[15,16], // Ring
      [0,17],[17,18],[18,19],[19,20]  // Little
    ];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    connections.forEach(([s, e]) => {
      const start = landmarks[s];
      const end = landmarks[e];
      if (start && end) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.stroke();
      }
    });

    // Draw points
    ctx.fillStyle = '#fff';
    landmarks.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [landmarks, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={320} 
      height={180} 
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
};

const StaffConductClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState({});
  const [currentMudra, setCurrentMudra] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState({
    mudra: true, face: false, pose: false
  });
  const [showJitsi, setShowJitsi] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const videoRef          = useRef(null);
  const streamRef         = useRef(null);
  const timerRef          = useRef(null);
  const studentScoresRef  = useRef({});
  const socketRef         = useRef(null);

  useEffect(() => {
    fetchClassAndStart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && videoRef.current) {
      startWebcam();
    }
  }, [loading]);

  const fetchClassAndStart = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}`,
        { headers: { 'x-auth-token': token } }
      );
      setClassData(res.data);
      setCurrentMudra(res.data.mudrasList?.[0] || '');

      // Single socket connection via utility
      const s = getSocket();
      socketRef.current = s;

      const join = () => {
        s.emit('join_class', { classId, name: 'Teacher', userId: 'teacher', isTeacher: true });
      };
      
      join();
      s.on('reconnect', join);

      // Start class in DB and notify students (global broadcast)
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}/start`,
        {},
        { headers: { 'x-auth-token': token } }
      );
      s.emit('start_live_session', classId);

      // Set initial target mudra
      s.emit('set_target_mudra', { classId, target: res.data.mudrasList?.[0] || '' });

      // Student joins
      s.on('participant_joined', (data) => {
        if (data.name === 'Teacher' || data.isTeacher) return;
        setStudents(prev => {
          if (prev[data.userId]) return prev;
          return {
            ...prev,
            [data.userId]: {
              socketId:  data.id,
              name:      data.name || 'Student',
              score:     0,
              attempts:  0,
              mudra:     'Joining...',
              status:    'Connecting...',
              lastSeen:  Date.now(),
              frame:     null
            }
          };
        });
      });

      // Student leaves
      s.on('participant_left', (data) => {
        setStudents(prev => {
          const updated = { ...prev };
          delete updated[data.userId];
          return updated;
        });
      });

      // Score update from student — this is the main way scores arrive
      s.on('score_update', (data) => {
        updateStudentData(data);
      });

      // Timer
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);

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
      const updated = { ...prev };
      const status = data.score >= 75 ? 'Excellent' : data.score >= 50 ? 'Good' : 'Practicing';
      updated[data.studentId] = {
        ...updated[data.studentId],
        name:      data.studentName || updated[data.studentId]?.name || 'Student',
        score:     data.score || 0,
        mudra:     data.mudra || '',
        status,
        lastSeen:  Date.now(),
        frame:     data.frame || updated[data.studentId]?.frame || null,
        landmarks: data.landmarks || updated[data.studentId]?.landmarks || null
      };
      return updated;
    });

    // Save for final report
    if (!studentScoresRef.current[data.studentId]) {
      studentScoresRef.current[data.studentId] = {
        studentId:   data.studentId,
        studentName: data.studentName,
        mudraScores: {}
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
    if (socketRef.current) {
      socketRef.current.emit('set_target_mudra', { classId, target: newMudra });
    }
  };

  const handleModuleToggle = async (module) => {
    const updated = { ...activeModules, [module]: !activeModules[module] };
    setActiveModules(updated);
    if (socketRef.current) {
      socketRef.current.emit('modules_changed', { classId, modules: updated });
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/live/modules/${classId}`,
        updated,
        { headers: { 'x-auth-token': token } }
      );
    } catch (err) {
      console.error('Failed to save modules', err);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Autoplay:', e));
      }
      streamRef.current = stream;
    } catch (err) {
      console.error('Teacher camera denied:', err);
    }
  };

  const handleBroadcastAnnouncement = () => {
    if (!announcement.trim() || !socketRef.current) return;
    socketRef.current.emit('class_announcement', { classId, message: announcement });
    setAnnouncement('');
  };

  const handleEndClass = async () => {
    if (!window.confirm('End this class session? Reports will be generated for all students.')) return;
    try {
      const token = localStorage.getItem('token');
      if (socketRef.current) socketRef.current.emit('class_ended', classId);

      const studentReports = Object.values(studentScoresRef.current).map(s => ({
        ...s,
        mudraScores: Object.values(s.mudraScores)
      }));

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}/end`,
        { studentReports },
        { headers: { 'x-auth-token': token } }
      );

      alert('Session completed. Report generated.');
      navigate('/staff/reports');
    } catch (err) {
      alert('Error ending session');
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      Loading Classroom...
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>

      {/* ── Top Header ── */}
      <div className="h-16 flex items-center justify-between px-6 border-b shrink-0"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center space-x-4">
          <div className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold animate-pulse">LIVE</div>
          <h1 className="font-bold truncate max-w-[200px]" style={{ color: 'var(--text)' }}>
            {classData?.title}
          </h1>
        </div>
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="font-mono text-sm font-bold">{formatTime(timer)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold">{Object.keys(students).length} Joined</span>
          </div>
          <button onClick={handleEndClass}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:brightness-110 flex items-center space-x-2">
            <LogOut className="w-3 h-3" />
            <span>End Class</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Column ── */}
        <div className="w-72 border-r p-4 overflow-y-auto shrink-0 flex flex-col gap-5"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Jitsi Voice Room */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>
              🎙️ Class Voice Room
            </label>
            <button onClick={() => setShowJitsi(v => !v)}
              className="w-full py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border"
              style={{
                backgroundColor: showJitsi ? 'rgba(16,185,129,0.2)' : 'var(--bg-card2)',
                borderColor:     showJitsi ? '#10B981' : 'var(--border)',
                color:           showJitsi ? '#10B981' : 'var(--text-muted)'
              }}>
              {showJitsi ? '🔊 Voice Active' : '📞 Start Voice'}
            </button>
            {showJitsi && (
              <iframe
                src={`https://meet.jit.si/GestureIQ-${classId}#config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.toolbarButtons=["microphone","hangup"]&userInfo.displayName=%22Teacher%22`}
                width="100%"
                height="160px"
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                style={{ borderRadius: '8px', border: 'none' }}
              />
            )}
          </div>

          {/* Teacher Webcam */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border shadow-inner"
            style={{ borderColor: 'var(--border)' }}>
            <video ref={videoRef} muted autoPlay playsInline
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-green-500 text-[8px] font-black text-white animate-pulse">
              BROADCASTING
            </div>
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[8px] text-white">
              Teacher Preview
            </div>
          </div>

          {/* Mudra Switcher */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>Focus Mudra</label>
            <select value={currentMudra} onChange={e => handleMudraChange(e.target.value)}
              className="w-full p-3 rounded-xl border font-bold text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              {(classData?.mudrasList || []).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="p-3 rounded-xl border border-dashed text-center"
              style={{ borderColor: 'var(--accent)' }}>
              <p className="text-[10px] uppercase font-bold text-orange-500 mb-1">Target</p>
              <p className="text-lg font-black" style={{ color: 'var(--text)' }}>{currentMudra}</p>
            </div>
          </div>

          {/* AI Detection Modules */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>
              AI Detection Modules
            </label>
            {[
              { key: 'mudra', label: '🤚 Mudra',      desc: 'Hand position scoring'  },
              { key: 'face',  label: '😊 Expression', desc: 'Navarasa facial scoring' },
              { key: 'pose',  label: '🧍 Posture',    desc: 'Body stance scoring'     },
            ].map(({ key, label, desc }) => (
              <div key={key}
                className="flex items-center justify-between p-3 rounded-xl border"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{label}</p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <button onClick={() => handleModuleToggle(key)}
                  className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                  style={{ backgroundColor: activeModules[key] ? 'var(--accent)' : 'var(--border)' }}>
                  <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                    style={{ left: activeModules[key] ? '22px' : '2px' }} />
                </button>
              </div>
            ))}
          </div>

          {/* Announcement */}
          <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--bg-card2)' }}>
            <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Class Announcement</p>
            <textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="Type here..."
              className="w-full bg-transparent text-sm resize-none outline-none border-b py-1"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              rows={2}
            />
            <button onClick={handleBroadcastAnnouncement}
              className="w-full py-2 bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2">
              <Send className="w-3 h-3" />
              <span>Broadcast</span>
            </button>
          </div>
        </div>

        {/* ── Center: Student Grid ── */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ backgroundColor: 'var(--bg)' }}>
          {Object.keys(students).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.values(students).map((data) => (
                <div key={data.studentId}
                  className={`p-5 rounded-2xl border-4 transition-all duration-300 ${
                    data.score >= 75 ? 'border-green-500 shadow-lg shadow-green-500/10' :
                    data.score >= 50 ? 'border-yellow-500 shadow-lg shadow-yellow-500/10' :
                    'border-red-500 shadow-lg shadow-red-500/10'
                  }`}
                  style={{ backgroundColor: 'var(--bg-card)' }}>

                  {/* Student video / frame */}
                  <div className="w-full aspect-video rounded-xl bg-black/80 mb-4 overflow-hidden relative flex items-center justify-center border shadow-inner"
                    style={{ borderColor: 'var(--border)' }}>
                    {data.landmarks ? (
                      <SkeletonOverlay 
                        landmarks={data.landmarks} 
                        color={data.score >= 75 ? '#10B981' : data.score >= 50 ? '#F59E0B' : '#EF4444'} 
                      />
                    ) : null}

                    {data.frame ? (
                      <img src={data.frame}
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                        alt={`${data.name}'s feed`} />
                    ) : (
                      <div className="flex flex-col items-center opacity-30">
                        <Users className="w-8 h-8 mb-2 text-white" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                          {data.status || 'Active'}
                        </span>
                      </div>
                    )}
                    {/* Score badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md backdrop-blur-md border"
                      style={{
                        backgroundColor: data.score >= 75 ? 'rgba(16,185,129,0.9)' :
                          data.score >= 50 ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.9)',
                        borderColor: 'rgba(255,255,255,0.2)'
                      }}>
                      <p className="text-sm font-black text-white leading-none">{data.score}%</p>
                    </div>
                  </div>

                  <h3 className="font-bold truncate mb-1" style={{ color: 'var(--text)' }}>{data.name}</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <Activity className={`w-3 h-3 ${data.score < 50 ? 'text-red-500' : 'text-green-500'}`} />
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                      {data.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t"
                    style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center space-x-1">
                      <UserCheck className="w-3 h-3 opacity-50" />
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                        {data.attempts} attempts
                      </span>
                    </div>
                    {data.score < 50 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
              <Users className="w-24 h-24" />
              <p className="text-xl font-bold">Waiting for students to connect...</p>
            </div>
          )}
        </div>

        {/* ── Right: Leaderboard ── */}
        <div className="w-56 border-l overflow-y-auto shrink-0"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="p-4">
            <h2 className="text-[10px] font-black uppercase tracking-[2px] mb-4"
              style={{ color: 'var(--text-muted)' }}>Engagement</h2>
            <div className="space-y-3">
              {Object.entries(students)
                .sort((a, b) => b[1].score - a[1].score)
                .map(([id, data], idx) => (
                  <div key={id} className="flex items-center space-x-3">
                    <span className="text-xs font-bold opacity-30 w-4">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                        {data.name}
                      </p>
                      <div className="w-full bg-black/10 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${data.score}%`,
                            backgroundColor: data.score >= 75 ? '#10B981' :
                              data.score >= 50 ? '#F59E0B' : '#EF4444'
                          }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-black">{data.score}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffConductClass;
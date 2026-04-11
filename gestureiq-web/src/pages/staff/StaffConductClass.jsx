//src/pages/staff/StaffConductClass.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../../utils/socket';
import { useAuth } from '../../context/AuthContext';
import { Video, Users, Clock, Activity, AlertTriangle, LogOut, Send, UserCheck } from 'lucide-react';

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
  const [showJitsi, setShowJitsi] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  const timerRef = useRef(null);
  const studentScoresRef = useRef({});
  const socketRef = useRef(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    fetchClassAndStart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && classData && jitsiContainerRef.current && !jitsiApiRef.current) {
      const roomName = `gestureiq-${String(classId).toLowerCase().trim().slice(-6)}`.replace(/[^a-z0-9-]/g, '-');
      
      try {
        const domain = 'meet.jit.si';
        const options = {
          roomName: roomName,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableLobbyChat: false,
            disableModeratorIndicator: false,
            // Force lobby off if we are moderator
            lobby: { enabled: false },
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
              'security'
            ],
          },
          userInfo: {
            displayName: user?.name || 'Teacher'
          }
        };
        
        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        // Auto-disable lobby if we join as moderator
        api.addEventListener('videoConferenceJoined', () => {
          try {
            api.executeCommand('toggleLobby', false);
            api.executeCommand('overwriteConfig', { 
              membersOnly: false,
              lobby: { enabled: false }
            });
          } catch(e) {}
          // Retry after 3s to ensure it takes effect
          setTimeout(() => {
            try { api.executeCommand('toggleLobby', false); } catch(e) {}
          }, 3000);
        });

      } catch (err) {
        console.error('Jitsi API Error:', err);
      }
    }
  }, [loading, classData, user]);

  // Jitsi is now handled via popup window

  const fetchClassAndStart = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}`,
        { headers: { 'x-auth-token': token } }
      );
      setClassData(res.data);
      setCurrentMudra(res.data.mudrasList?.[0] || '');

      const s = getSocket();
      socketRef.current = s;
      
      const joinRoom = () => {
        if (s.connected) {
          s.emit('join_class', { classId: classId?.toLowerCase(), name: 'Teacher', userId: 'teacher', isTeacher: true });
        }
      };

      if (s.connected) joinRoom();
      s.on('connect', joinRoom);
      s.on('reconnect', joinRoom);

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}/start`, {},
        { headers: { 'x-auth-token': token } }
      );

      if (s.connected) {
        s.emit('start_live_session', classId?.toLowerCase());
        s.emit('set_target_mudra', { classId: classId?.toLowerCase(), target: res.data.mudrasList?.[0] || '' });
      }

      s.on('participant_joined', (data) => {
        if (data.name === 'Teacher' || data.isTeacher) return;
        setStudents(prev => prev[data.userId] ? prev : {
          ...prev,
          [data.userId]: {
            socketId: data.id, name: data.name || 'Student',
            score: 0, attempts: 0, mudra: 'Joining...', status: 'Connecting...', lastSeen: Date.now(), frame: null
          }
        });
      });

      s.on('participant_left', (data) => {
        setStudents(prev => { const u = { ...prev }; delete u[data.userId]; return u; });
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
      studentScoresRef.current[data.studentId] = { studentId: data.studentId, studentName: data.studentName, mudraScores: {} };
    }
    const report = studentScoresRef.current[data.studentId];
    if (data.mudra) {
      if (!report.mudraScores[data.mudra]) report.mudraScores[data.mudra] = { mudra: data.mudra, attempts: 0, bestScore: 0 };
      const ms = report.mudraScores[data.mudra];
      if (data.score > 0) ms.attempts++;
      if (data.score > ms.bestScore) ms.bestScore = data.score;
    }
  };

  const handleMudraChange = (newMudra) => {
    setCurrentMudra(newMudra);
    const roomName = `gestureiq-${String(classId).toLowerCase().trim().slice(-6)}`.replace(/[^a-z0-9-]/g, '-');
    socketRef.current?.emit('set_target_mudra', { classId: classId?.toLowerCase(), target: newMudra });
  };

  const handleModuleToggle = async (module) => {
    const updated = { ...activeModules, [module]: !activeModules[module] };
    setActiveModules(updated);
    socketRef.current?.emit('modules_changed', { classId: classId?.toLowerCase(), modules: updated });
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/live/modules/${classId}`, updated, { headers: { 'x-auth-token': token } });
    } catch { console.error('Failed to save modules'); }
  };

  const handleBroadcastAnnouncement = () => {
    if (!announcement.trim() || !socketRef.current) return;
    socketRef.current.emit('class_announcement', { classId: classId?.toLowerCase(), message: announcement });
    setAnnouncement('');
  };

  const handleEndClass = async () => {
    if (!window.confirm('End this class? Reports will be generated for all students.')) return;
    try {
      const token = localStorage.getItem('token');
      socketRef.current?.emit('class_ended', classId?.toLowerCase());
      const studentReports = Object.values(studentScoresRef.current).map(s => ({
        ...s, mudraScores: Object.values(s.mudraScores)
      }));
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}/end`,
        { studentReports }, { headers: { 'x-auth-token': token } });
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
            <LogOut className="w-3 h-3" /><span>End Class</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Target Mudra</label>
            <select value={currentMudra} onChange={e => handleMudraChange(e.target.value)}
              className="w-full p-3 rounded-xl border font-bold text-sm outline-none bg-zinc-900 border-white/5">
              {(classData?.mudrasList || []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-center">
              <p className="text-2xl font-black text-orange-500">{currentMudra}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">AI Modules</label>
            {[['mudra','Mudra'], ['face','Expression'], ['pose','Posture']].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-bold">{label}</span>
                <div
                  onClick={() => handleModuleToggle(key)}
                  className="w-8 h-4 rounded-full cursor-pointer transition-all duration-300"
                  style={{
                    backgroundColor: activeModules[key] ? '#10B981' : '#374151',
                    boxShadow: activeModules[key] ? '0 0 8px rgba(16,185,129,0.4)' : 'none'
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-auto p-4 rounded-2xl bg-zinc-900 space-y-2">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Broadcast</p>
            <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)}
              placeholder="Message..." className="w-full bg-transparent border-b border-white/10 text-xs py-1" />
            <button onClick={handleBroadcastAnnouncement} className="w-full py-2 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase">Send</button>
          </div>
        </div>

        <div className="flex-1 bg-black relative flex flex-col">
          <div ref={jitsiContainerRef} style={{ width: '100%', flex: 1 }} />
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => {
                const roomName = `gestureiq-${String(classId).toLowerCase().trim().slice(-6)}`.replace(/[^a-z0-9-]/g, '-');
                window.open(
                  `https://meet.jit.si/${roomName}?config.prejoinPageEnabled=false&config.lobby.enabled=false&config.membersOnly=false#userInfo.displayName="${encodeURIComponent(user?.name || 'Teacher')}"`,
                  'JitsiRoom', 'width=900,height=650,left=50,top=50'
                );
              }}
              className="px-3 py-2 bg-green-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg hover:brightness-110 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Open & Disable Lobby</span>
            </button>
          </div>
        </div>

        <div className="w-[450px] border-l overflow-y-auto shrink-0 bg-zinc-950 p-6"
           style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-[10px] font-black uppercase tracking-[3px] text-zinc-400">Student Monitoring</h2>
             <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Real-time AI</span>
          </div>

          {Object.keys(students).length > 0 ? (
            <div className="space-y-6">
              {Object.values(students).map(data => (
                <div key={data.studentId || data.socketId || data.name || Math.random()}
                  className={`p-4 rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
                    data.score >= 90 ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_25px_rgba(16,185,129,0.2)]' :
                    data.score >= 75 ? 'border-yellow-500/50 bg-yellow-500/5' :
                    'border-red-500/50 bg-red-500/5'
                  }`}>
                  
                  {/* Stream Preview */}
                  <div className="relative aspect-video rounded-xl bg-black mb-4 overflow-hidden border border-white/5">
                    {data.frame ? (
                      <img src={data.frame} className="w-full h-full object-cover grayscale-[0.3]"
                        style={{ transform: 'scaleX(-1)' }} alt={data.name} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20">
                        <Users className="w-6 h-6 mb-2 text-white" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Waiting for feed...</span>
                      </div>
                    )}
                    
                    {/* Floating Status Tag */}
                    <div className="absolute top-2 right-2 flex items-center space-x-1 px-2 py-0.5 rounded bg-black/80 border border-white/10">
                       <div className={`w-1.5 h-1.5 rounded-full ${data.score >= 90 ? 'bg-emerald-500' : data.score >= 75 ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
                       <span className="text-[10px] font-black text-white">{data.score}%</span>
                    </div>
                  </div>

                  {/* Info & Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-white mb-0.5">{data.name}</h3>
                        <div className="flex items-center space-x-2">
                           <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Current:</span>
                           <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{data.mudra || 'None'}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded bg-white/5 ${
                        data.score >= 90 ? 'text-emerald-400' :
                        data.score >= 75 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>{data.status}</span>
                    </div>

                    {/* Progress Bar (The 0-100% Score) */}
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
                     .sort((a,b) => b.score - a.score)
                     .map((s, idx) => (
                       <div key={s.userId} className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-600 w-4 font-black">{idx+1}</span>
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
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Video, 
  Users, 
  Clock, 
  ChevronRight, 
  Activity, 
  AlertTriangle,
  LogOut,
  Send,
  UserCheck
} from 'lucide-react';

const StaffConductClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState({}); // { studentId: { name, score, attempts, mudra, status } }
  const [currentMudra, setCurrentMudra] = useState('');
  const [timer, setTimer] = useState(0);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const peerConnections = useRef({}); // { studentSocketId: RTCPeerConnection }
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const studentScoresRef = useRef({}); // Persistent storage for end-class report

  useEffect(() => {
    fetchClassAndStart();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socket) socket.disconnect();
      // Stop webcam stream on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize webcam once loading is finished and videoRef is available
  useEffect(() => {
    if (!loading && videoRef.current) {
      startWebcam();
    }
  }, [loading]);

  const fetchClassAndStart = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}`, {
        headers: { 'x-auth-token': token }
      });
      setClassData(res.data);
      setCurrentMudra(res.data.mudrasList[0]);

      // Connect Socket
      const s = io(import.meta.env.VITE_BACKEND_URL);
      setSocket(s);
      s.emit('join_class_room', classId);

      // Start Class in DB
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}/start`, {}, {
        headers: { 'x-auth-token': token }
      });

      // Listen for scores
      s.on('score_update', (data) => {
        updateStudentData(data);
      });

      // WebRTC: Handle new student joining
      s.on('participant_joined', (data) => {
        console.log("[Socket] Student joined:", data.name);
        setStudents(prev => ({
          ...prev,
          [data.userId]: {
            socketId: data.id,
            name: data.name,
            score: 0,
            attempts: 0,
            mudra: 'Joining...',
            status: 'Connecting...',
            lastSeen: Date.now()
          }
        }));
        initiateBroadcast(s, data.id);
      });

      s.on('participant_left', (data) => {
        console.log("[Socket] Student left:", data.userId);
        setStudents(prev => {
          const updated = { ...prev };
          delete updated[data.userId];
          return updated;
        });
        // Cleanup peer connection if exists
        if (peerConnections.current[data.id]) {
          peerConnections.current[data.id].close();
          delete peerConnections.current[data.id];
        }
      });

      s.on('webrtc_answer_response', (data) => {
        const pc = peerConnections.current[data.from]; 
        if (pc) pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      });

      s.on('ice_candidate_received', (data) => {
        const pc = peerConnections.current[data.from];
        if (pc && data.candidate) pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      });

      // Start Timer
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
        captureAndSync();
      }, 1000);

    } catch (err) {
      alert('Error entering classroom');
      navigate('/staff/classes');
    } finally {
      setLoading(false);
    }
  };

  const updateStudentData = (data) => {
    // data: { studentId, studentName, mudra, score, attempts }
    setStudents(prev => {
      const updated = { ...prev };
      const status = data.score >= 75 ? 'Good' : data.score >= 50 ? 'Developing' : 'Needs Help';
      updated[data.studentId] = {
        ...updated[data.studentId],
        name: data.studentName,
        score: parseInt(data.score),
        attempts: data.attempts,
        mudra: data.mudra,
        status: status,
        lastSeen: Date.now()
      };
      return updated;
    });

    // Save for final report
    if (!studentScoresRef.current[data.studentId]) {
      studentScoresRef.current[data.studentId] = {
        studentId: data.studentId,
        studentName: data.studentName,
        mudraScores: {}
      };
    }

    const studentReport = studentScoresRef.current[data.studentId];
    if (!studentReport.mudraScores[data.mudra]) {
      studentReport.mudraScores[data.mudra] = { mudra: data.mudra, attempts: 0, bestScore: 0 };
    }

    const mudraStats = studentReport.mudraScores[data.mudra];
    mudraStats.attempts = data.attempts;
    if (data.score > mudraStats.bestScore) {
      mudraStats.bestScore = data.score;
    }
  };

  const handleMudraChange = (newMudra) => {
    setCurrentMudra(newMudra);
    if (socket) {
      socket.emit('staff_change_mudra', { classId, newMudra });
    }
  };

  const startWebcam = async () => {
    // We now use the Flask MJPEG feed to avoid conflict with the AI detection engine
    console.log("[Webcam] UI ready to display AI feed");
    setupBroadcastStream();
  };

  const setupBroadcastStream = () => {
    // Create a stream from the canvas that draws the AI image
    if (canvasRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800; // Better resolution
    canvas.height = 450;
    canvasRef.current = canvas;
    streamRef.current = canvas.captureStream(24); // Solid 24 FPS
    
    const loop = () => {
      if (!imgRef.current || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      // Mirror the image on canvas so student sees it correctly
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(imgRef.current, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  const captureAndSync = () => {
    // Logic moved to requestAnimationFrame for performance
  };

  const initiateBroadcast = async (s, studentId) => {
    try {
      if (!streamRef.current) setupBroadcastStream();
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnections.current[studentId] = pc;
      
      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] Sending Ice Candidate to:", studentId);
          s.emit('webrtc_ice_candidate', { classId, to: studentId, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection with ${studentId}: ${pc.connectionState}`);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Sending Offer to student:", studentId);
      s.emit('webrtc_offer', { classId, to: studentId, offer });
      
    } catch (err) {
      console.error("WebRTC Error:", err);
    }
  };

  const handleEndClass = async () => {
    if (window.confirm('End this class session? This will generate reports for all students.')) {
      try {
        const token = localStorage.getItem('token');
        if (socket) socket.emit('class_ended', classId);

        // Format reports for backend
        const studentReports = Object.values(studentScoresRef.current).map(s => ({
          ...s,
          mudraScores: Object.values(s.mudraScores)
        }));

        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}/end`, {
          studentReports
        }, {
          headers: { 'x-auth-token': token }
        });

        alert('Session completed. Report generated.');
        navigate('/staff/reports');
      } catch (err) {
        alert('Error ending session');
      }
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Classroom...</div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Top Header */}
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
          <button 
            onClick={handleEndClass}
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:brightness-110 flex items-center space-x-2"
          >
            <LogOut className="w-3 h-3" />
            <span>End Class</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Controls */}
        <div className="w-72 border-r p-6 overflow-y-auto shrink-0 flex flex-col space-y-8" 
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          
          {/* Staff Webcam - Powered by AI Feed */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border shadow-inner" style={{ borderColor: 'var(--border)' }}>
            <img 
              ref={imgRef}
              src={`${import.meta.env.VITE_FLASK_URL}/video_feed`} 
              crossOrigin="anonymous"
              className="w-full h-full object-cover mirror"
              alt="AI Processor Feed"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800";
              }}
            />
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-green-500 text-[8px] font-black text-white animate-pulse">AI ENGINE ACTIVE</div>
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[8px] text-white">Teacher Preview</div>
          </div>

          {/* Mudra Switcher */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Focus Mudra</label>
            <select 
              value={currentMudra}
              onChange={(e) => handleMudraChange(e.target.value)}
              className="w-full p-3 rounded-xl border font-bold text-sm outline-none transition-all focus:ring-2"
              style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {classData?.mudrasList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="p-4 rounded-xl border border-dashed text-center" style={{ borderColor: 'var(--accent)' }}>
              <p className="text-[10px] uppercase font-bold text-orange-500 mb-1">Target</p>
              <p className="text-xl font-black" style={{ color: 'var(--text)' }}>{currentMudra}</p>
            </div>
          </div>

          {/* Announcements */}
          <div className="flex-1 flex flex-col justify-end pb-4">
            <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--bg-card2)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Class Announcement</p>
              <textarea 
                placeholder="Type here..."
                className="w-full bg-transparent text-sm resize-none outline-none border-b py-1"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button className="w-full py-2 bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2">
                <Send className="w-3 h-3" />
                <span>Broadcast</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center Canvas: Student Grid */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg)' }}>
          {Object.keys(students).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(students).map(([id, data]) => (
                <div key={id} className={`p-5 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${
                  data.score >= 75 ? 'border-green-500 shadow-lg shadow-green-500/10' : 
                  data.score >= 50 ? 'border-yellow-500 shadow-lg shadow-yellow-500/10' : 
                  'border-red-500 animate-pulse shadow-lg shadow-red-500/10'
                }`} style={{ backgroundColor: 'var(--bg-card)' }}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center">
                      <Users className="w-5 h-5 opacity-30" />
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black" style={{ color: data.score < 50 ? '#EF4444' : 'var(--text)' }}>{data.score}%</p>
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Accuracy</p>
                    </div>
                  </div>

                  <h3 className="font-bold truncate mb-1" style={{ color: 'var(--text)' }}>{data.name}</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <Activity className={`w-3 h-3 ${data.score < 50 ? 'text-red-500' : 'text-green-500'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{data.status}</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center space-x-1">
                      <UserCheck className="w-3 h-3 opacity-50" />
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{data.attempts} attempts</span>
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

        {/* Right Column: Leaderboard/List */}
        <div className="w-64 border-l overflow-y-auto shrink-0" 
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="p-6">
            <h2 className="text-xs font-black uppercase tracking-[2px] mb-6" style={{ color: 'var(--text-muted)' }}>Engagement</h2>
            <div className="space-y-4">
              {Object.entries(students)
                .sort((a, b) => b[1].score - a[1].score)
                .map(([id, data], idx) => (
                  <div key={id} className="flex items-center space-x-4">
                    <span className="text-xs font-bold opacity-30 w-4">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{data.name}</p>
                      <div className="w-full bg-black/5 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" 
                             style={{ 
                               width: `${data.score}%`, 
                               backgroundColor: data.score >= 75 ? '#10B981' : data.score >= 50 ? '#F59E0B' : '#EF4444' 
                             }} 
                        />
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

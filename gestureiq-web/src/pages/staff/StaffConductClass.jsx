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
  const [flaskSocket, setFlaskSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const peerConnections = useRef({}); // { studentSocketId: RTCPeerConnection }
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const studentScoresRef = useRef({}); // Persistent storage for end-class report

  const socketRef = useRef(null);
  const flaskSocketRef = useRef(null);

  useEffect(() => {
    fetchClassAndStart();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
      if (flaskSocketRef.current) flaskSocketRef.current.disconnect();
      // Stop webcam stream on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (window.broadcastInterval) {
        clearInterval(window.broadcastInterval);
        window.broadcastInterval = null;
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
      socketRef.current = s;
      s.emit('join_class_room', classId);

      const fs = io(import.meta.env.VITE_FLASK_URL);
      setFlaskSocket(fs);
      flaskSocketRef.current = fs;
      fs.emit('join_class', { classId });
      fs.emit('set_target_mudra', { classId, target: res.data.mudrasList[0] });

      // Listen for AI processed frames from students
      fs.on('processed_frame', (data) => {
        setStudents(prev => {
          if (!prev[data.studentId]) return prev;
          return {
            ...prev,
            [data.studentId]: {
              ...prev[data.studentId],
              frame: data.frame,
              score: data.accuracy,
              mudra: data.name,
              status: data.accuracy >= 75 ? 'Good' : data.accuracy >= 50 ? 'Developing' : 'Needs Help',
              lastSeen: Date.now()
            }
          };
        });

        // Update score report logic based on the same data
        if (!studentScoresRef.current[data.studentId]) {
          studentScoresRef.current[data.studentId] = {
            studentId: data.studentId,
            studentName: prev => prev[data.studentId]?.name || 'Student',
            mudraScores: {}
          };
        }

        const studentReport = studentScoresRef.current[data.studentId];
        if (!studentReport.mudraScores[data.name]) {
          studentReport.mudraScores[data.name] = { mudra: data.name, attempts: 0, bestScore: 0 };
        }

        const mudraStats = studentReport.mudraScores[data.name];
        if (data.accuracy > mudraStats.bestScore) {
          mudraStats.bestScore = data.accuracy;
        }
      });

      // Start Class in DB
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}/start`, {}, {
        headers: { 'x-auth-token': token }
      });

      // Listen for traditional scores (fallback)
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
            lastSeen: Date.now(),
            stream: null
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
    if (flaskSocket) {
      flaskSocket.emit('set_target_mudra', { classId, target: newMudra });
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(err => {
        console.warn("Audio/Video failed, trying video only", err);
        return navigator.mediaDevices.getUserMedia({ video: true });
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch(e) {
          console.error("Autoplay failed", e);
        }
      }
      setupBroadcastStream(stream);

      // Retry broadcasting to students who already connected
      if (socketRef.current) {
         Object.values(students).forEach(student => {
            if (student.socketId && !peerConnections.current[student.socketId]) {
               initiateBroadcast(socketRef.current, student.socketId);
            }
         });
      }
    } catch (err) {
      console.error("Teacher camera access denied:", err);
      alert("Microphone/Camera access denied or device not found. " + err.message);
    }
  };

  const setupBroadcastStream = (stream) => {
    streamRef.current = stream;
  };

  const captureAndSync = () => {
    // Logic moved to requestAnimationFrame for performance
  };

  const initiateBroadcast = async (s, studentId) => {
    try {
      if (!streamRef.current) {
        console.warn("Instructor stream not ready yet for student:", studentId);
        return; // Prevents crash when stream is not yet available
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnections.current[studentId] = pc;

      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current);
      });

      pc.ontrack = (event) => {
        console.log("[WebRTC] Received track from student:", studentId);
        setStudents(prev => {
          const updated = { ...prev };
          const studentKey = Object.keys(updated).find(k => updated[k].socketId === studentId);
          if (studentKey) {
            updated[studentKey] = {
              ...updated[studentKey],
              stream: event.streams[0]
            };
          }
          return updated;
        });
      };

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

          {/* Staff Webcam - Powered by Local Feed */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border shadow-inner" style={{ borderColor: 'var(--border)' }}>
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className="w-full h-full object-cover mirror"
            />
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-green-500 text-[8px] font-black text-white animate-pulse">BROADCASTING</div>
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
                <div key={id} className={`p-5 rounded-2xl border-4 transition-all duration-300 transform hover:scale-105 ${data.score >= 75 ? 'border-green-500 shadow-lg shadow-green-500/10' :
                    data.score >= 50 ? 'border-yellow-500 shadow-lg shadow-yellow-500/10' :
                      'border-red-500 animate-pulse shadow-lg shadow-red-500/10'
                  }`} style={{ backgroundColor: 'var(--bg-card)' }}>

                  {/* Video Feed */}
                  <div className="w-full aspect-video rounded-xl bg-black/80 mb-4 overflow-hidden relative flex items-center justify-center border shadow-inner" style={{ borderColor: 'var(--border)' }}>
                    {data.frame ? (
                      <img
                        src={data.frame}
                        className="w-full h-full object-cover mirror"
                        alt={`${data.name}'s feed`}
                      />
                    ) : data.stream ? (
                      <video
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover mirror"
                        ref={el => { if (el && el.srcObject !== data.stream) el.srcObject = data.stream; }}
                      />
                    ) : (
                      <div className="flex flex-col items-center opacity-30">
                        <Users className="w-8 h-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">Connecting...</span>
                      </div>
                    )}

                    {/* Score Ribbon */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md backdrop-blur-md shadow-lg border"
                      style={{
                        backgroundColor: data.score >= 75 ? 'rgba(16, 185, 129, 0.9)' : data.score >= 50 ? 'rgba(245, 158, 11, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                        borderColor: 'rgba(255,255,255,0.2)'
                      }}>
                      <div className="text-right">
                        <p className="text-sm font-black text-white leading-none">{data.score}%</p>
                      </div>
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

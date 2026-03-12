import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, 
  Activity, 
  MessageCircle, 
  Volume2, 
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

const StudentLiveClass = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [currentMudra, setCurrentMudra] = useState('');
  const [accuracy, setAccuracy] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classEnded, setClassEnded] = useState(false);
  const [summary, setSummary] = useState(null);
  
  const videoRef = useRef(null);
  const instructorVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const intervalRef = useRef(null);
  const bestScoresRef = useRef({});

  useEffect(() => {
    fetchClassAndConnect();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (socket) socket.disconnect();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && videoRef.current) {
      startWebcam();
    }
  }, [loading]);

  const fetchClassAndConnect = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/student/class/join/${classId}`);
      setClassData(res.data);
      
      const s = io(import.meta.env.VITE_BACKEND_URL);
      setSocket(s);
      s.emit('join_class_room', { classId, name: user.name, userId: user.id });

      s.on('mudra_changed', (newMudra) => {
        setCurrentMudra(newMudra);
        setAttemptCount(0); // Reset for new mudra
      });

      s.on('class_ended_broadcast', () => {
        handleSessionEnd();
      });

      // WebRTC Signaling listeners
      s.on('teacher_broadcast_offer', async (data) => {
        try {
          console.log("[WebRTC] Received offer from teacher");
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          peerConnection.current = pc;

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              console.log("[WebRTC] Sending Ice Candidate to teacher");
              s.emit('webrtc_ice_candidate', { classId, to: data.from, candidate: event.candidate });
            }
          };

          pc.ontrack = (event) => {
            console.log("[WebRTC] Stream track received!", event.streams[0].id);
            if (instructorVideoRef.current) {
              instructorVideoRef.current.srcObject = event.streams[0];
              instructorVideoRef.current.play().catch(e => console.error("Auto-play failed:", e));
            }
          };

          pc.onconnectionstatechange = () => {
            console.log("[WebRTC] Connection State:", pc.connectionState);
          };

          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("[WebRTC] Sending Answer to teacher");
          s.emit('webrtc_answer', { to: data.from, answer });

        } catch (err) {
          console.error("WebRTC Receiving Error:", err);
        }
      });

      s.on('ice_candidate_received', (data) => {
        if (peerConnection.current && data.candidate) {
          peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      // Start data tracking every 2 seconds
      intervalRef.current = setInterval(() => {
        if (currentMudra) {
          fetchAIFeedback();
        }
      }, 2000);

    } catch (err) {
      alert('Error joining live session');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIFeedback = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_FLASK_URL}/mudra_data?target=${currentMudra.toLowerCase()}`);
      const score = res.data.accuracy || 0;
      setAccuracy(score);
      
      if (res.data.hand_detected) {
        setAttemptCount(prev => {
          const newCount = prev + 1;
          // Emit to teacher
          socket.emit('student_score_update', {
            classId,
            studentId: user.id,
            studentName: user.name,
            mudra: currentMudra,
            score: score,
            attempts: newCount
          });
          return newCount;
        });

        // Update local best score
        if (!bestScoresRef.current[currentMudra] || score > bestScoresRef.current[currentMudra]) {
          bestScoresRef.current[currentMudra] = score;
        }

        // Voice feedback if accuracy is critical or perfect
        if (score < 50 && score > 0) {
          speak(`Focus on ${currentMudra} finger positions`);
        } else if (score >= 85) {
          // Speak perfect sparingly
          if (attemptCount % 5 === 0) speak(`Perfect ${currentMudra}`);
        }
      }
    } catch (err) {
      console.error("AI API Down");
    }
  };

  const speak = (msg) => {
    const utterance = new SpeechSynthesisUtterance(msg);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleSessionEnd = () => {
    setClassEnded(true);
    setSummary({
      bestScores: bestScoresRef.current,
      totalAttempts: Object.values(bestScoresRef.current).length
    });
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeout(() => {
      navigate('/dashboard');
    }, 8000);
  };

  const startWebcam = async () => {
    // We now use the Flask MJPEG feed to avoid conflict with the AI detection engine
    console.log("[Webcam] UI ready to display AI feed");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Establishing secure stream...</div>;

  if (classEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <div className="max-w-md w-full p-10 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-3xl font-black text-white">Class Completed!</h2>
          <p className="text-neutral-400">Great session! Here is your performance summary:</p>
          
          <div className="space-y-3 pt-6">
            {Object.entries(summary.bestScores).map(([m, s]) => (
              <div key={m} className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <span className="text-sm font-bold text-white">{m}</span>
                <span className="text-lg font-black text-green-500">{s}%</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-500 pt-8 animate-pulse italic">Redirecting to history in 8 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* HUD Header */}
      <div className="h-20 flex items-center justify-between px-8 bg-neutral-900/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center space-x-6">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Camera className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">{classData?.title}</h1>
            <p className="text-[10px] uppercase font-bold text-neutral-500">Instructor: {classData?.staffName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-12">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Target Mudra</p>
            <p className="text-xl font-black text-accent">{currentMudra || 'Wait...'}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Live Precision</p>
            <p className="text-3xl font-black" style={{ color: accuracy >= 75 ? '#10B981' : accuracy >= 50 ? '#F59E0B' : '#EF4444' }}>
              {accuracy}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-neutral-500 mb-1">Attempts</p>
            <p className="text-3xl font-black text-white">{attemptCount}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Stream Area: Instructor Feed */}
        <div className="flex-1 relative bg-neutral-950 flex items-center justify-center p-8">
          <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 bg-neutral-900 flex items-center justify-center">
            
            {/* Instructor Feed comes via WebRTC */}
            <video 
              ref={instructorVideoRef} 
              autoPlay 
              muted
              playsInline 
              className="w-full h-full object-cover" 
            />

            {!instructorVideoRef.current?.srcObject && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest text-center">
                  Waiting for Instructor's <br/> live demonstration...
                </p>
              </div>
            )}
            
            {/* Instructor Label */}
            <div className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">Instructor Live Demo</span>
            </div>

            {/* Student's Private Feed (Smaller Corner) - Shared Flask Feed */}
            <div className="absolute bottom-6 right-6 w-64 aspect-video rounded-2xl overflow-hidden border-2 border-accent shadow-2xl z-10 bg-black">
              <img 
                src={`${import.meta.env.VITE_FLASK_URL}/video_feed`} 
                className="w-full h-full object-cover mirror"
                alt="Your Detection"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800";
                }}
              />
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-[8px] font-bold">Your AI Detection</div>
              
              {/* AI Detection Overlay on small feed */}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                <span className="text-[10px] font-black text-accent">{accuracy}%</span>
                <span className="text-[8px] opacity-60 uppercase">{currentMudra}</span>
              </div>
            </div>

            {/* AI Warning Overlay (Main) */}
            {accuracy < 50 && accuracy > 0 && (
              <div className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-red-500/90 text-white flex items-center space-x-2 animate-bounce z-20">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Correction Required</span>
              </div>
            )}

            {/* HUD Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-8 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex items-end">
               <div className="flex items-center space-x-4">
                 <div className="p-3 rounded-full bg-accent text-white shadow-xl">
                   <Activity className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase opacity-60">Session Status</p>
                   <p className="text-sm font-bold">{accuracy >= 75 ? 'Optimal Pose' : accuracy >= 50 ? 'Pose Needs Adjust' : 'Initializing Detection...'}</p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Chat & Instructions */}
        <div className="w-80 border-l border-white/5 bg-neutral-900/30 flex flex-col p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[3px] text-neutral-500">Live Feedback</h3>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
              <p className="text-xs leading-relaxed italic text-neutral-300">
                "{accuracy >= 75 ? 'Great consistency! Keep your fingers firm but relaxed.' : 'Watch your thumb position relative to your index finger.'}"
              </p>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-accent">
                <Volume2 className="w-3 h-3" />
                <span>AI ASSISTANT ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-[3px] text-neutral-500 mb-4">Class Chat</h3>
            <div className="flex-1 bg-black/20 rounded-2xl p-4 text-xs text-neutral-500 text-center flex items-center justify-center">
              Chat restricted to view only mode
            </div>
            <div className="mt-4 p-4 rounded-xl bg-white/5 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-[10px]">
                {user.name[0]}
              </div>
              <p className="text-[10px] font-bold opacity-50">Listening...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLiveClass;
const AlertTriangle = AlertCircle;

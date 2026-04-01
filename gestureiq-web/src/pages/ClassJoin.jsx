// src/pages/ClassJoin.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Calendar, 
  Clock, 
  User, 
  Briefcase, 
  ArrowRight, 
  LogIn, 
  AlertCircle,
  Video,
  CheckCircle,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const ClassJoin = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classDetails, setClassDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [inWaitingRoom, setInWaitingRoom] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    fetchClassDetails();
  }, [classId]);

  useEffect(() => {
    let timer;
    if (inWaitingRoom && classDetails?.scheduledAt) {
      timer = setInterval(() => {
        const now = new Date();
        const scheduled = new Date(classDetails.scheduledAt);
        const diff = scheduled - now;

        if (diff <= 0) {
          setCountdown('Session is about to start...');
        } else {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setCountdown(`${m}m ${s}s`);
        }
      }, 1000);
    }

    // Socket listener for class start
    let socket;
    if (inWaitingRoom) {
      socket = io('/', {
        path: '/socket.io',
        secure: false,
        rejectUnauthorized: false
      });
      socket.emit('join_class_room', { classId });
      socket.on('class_started', () => {
        navigate(`/class/live/${classId}`);
      });
    }

    return () => {
      if (timer) clearInterval(timer);
      if (socket) socket.disconnect();
    };
  }, [inWaitingRoom, classDetails]);

  const fetchClassDetails = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/student/class/join/${classId}`);
      setClassDetails(res.data);
      if (res.data.status === 'live') {
        // If already live, maybe skip waiting room if they click join later
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Error loading class details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      navigate(`/login?redirect=/class/join/${classId}`);
      return;
    }
    if (user.role !== 'student') {
      alert('Only students can join this class');
      return;
    }

    setJoining(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/student/class/${classId}/join`, {}, {
        headers: { 'x-auth-token': token }
      });
      setInWaitingRoom(true);
      if (classDetails.status === 'live') {
        navigate(`/class/live/${classId}`);
      }
    } catch (err) {
      alert('Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Authenticating Session...</div>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl border text-center space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Invalid Session</h2>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="w-full py-3 rounded-xl bg-black/5 font-bold" style={{ color: 'var(--text)' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (inWaitingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-lg w-full p-10 rounded-3xl border text-center space-y-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
          <div className="animate-pulse w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-accent/20">
            <Video className="w-10 h-10" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>Waiting for Teacher</h1>
            <p style={{ color: 'var(--text-muted)' }}>The class will start as soon as your instructor goes live.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-black/5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Countdown</p>
            <p className="text-4xl font-black tracking-tighter" style={{ color: 'var(--accent)' }}>{countdown || '--:--'}</p>
          </div>

          <div className="pt-4 text-xs font-medium space-y-1" style={{ color: 'var(--text-muted)' }}>
            <p>Session: {classDetails.title}</p>
            <p>Instructor: {classDetails.staffName}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Class Info */}
        <div className="p-10 rounded-3xl space-y-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div>
            <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>{classDetails.title}</h1>
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{classDetails.institutionName}</p>
          </div>

          <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 opacity-40" />
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Instructor: {classDetails.staffName}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 opacity-40" />
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{new Date(classDetails.scheduledAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 opacity-40" />
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                {new Date(classDetails.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({classDetails.duration}m)
              </span>
            </div>
          </div>

          {!user && (
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You must be signed in as a student to participate.</span>
            </div>
          )}

          <button 
            disabled={joining}
            onClick={handleJoin}
            className="w-full py-4 rounded-2xl font-black text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-accent/30"
            style={{ backgroundColor: 'var(--accent)', opacity: joining ? 0.7 : 1 }}
          >
            {joining ? 'Processing...' : user ? 'Join Class Now' : 'Sign in to Join'}
          </button>
        </div>

        {/* Benefits/Visual Side */}
        <div className="hidden md:flex flex-col justify-center p-10 space-y-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Why join live?</h2>
            <div className="space-y-4">
              {[
                { title: 'Real-time Feedback', desc: 'Get instant feedback on your mudras from your teacher.' },
                { title: 'AI Score Sync', desc: 'Our AI engine tracks your precision during the session.' },
                { title: 'Peer Comparison', desc: 'See how you rank among your classmates live.' }
              ].map((item, id) => (
                <div key={id} className="flex space-x-4">
                  <div className="pt-1"><CheckCircle className="w-5 h-5 text-green-500" /></div>
                  <div>
                    <h4 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{item.title}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-6 rounded-2xl bg-black/5 border border-dashed flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center space-x-3">
              <Briefcase className="w-6 h-6 opacity-30" />
              <div>
                <p className="text-[10px] font-bold uppercase opacity-50">Powered By</p>
                <p className="text-sm font-black" style={{ color: 'var(--text)' }}>GestureIQ Engine</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 opacity-20" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClassJoin;

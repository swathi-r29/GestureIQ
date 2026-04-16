//src/pages/staff/StaffCreateClass.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Calendar, Clock, Users, Globe, CheckCircle, Copy, ChevronRight } from 'lucide-react';

// Mudras now fetched dynamically from backend

// ── FIX: Always use VITE_PUBLIC_URL (ngrok) so link works for anyone ──
const getJoinLink = (classId) => {
  const base = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  return `${base}/class/join/${classId}`;
};

const StaffCreateClass = () => {
  const [formData, setFormData] = useState({
    title: '', description: '', scheduledAt: '', time: '',
    duration: 60, language: 'English', mudrasList: []
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [mudraCategory, setMudraCategory] = useState(null); // 'Single' or 'Double'
  const [mudraList, setMudraList] = useState([]);
  const navigate = useNavigate();

  // 1. Fetch mudras based on category
  React.useEffect(() => {
    if (!mudraCategory) return;
    const fetchMudras = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/mudras?type=${mudraCategory}`, {
                headers: { 'x-auth-token': token }
            });
            setMudraList(res.data);
            // Reset selection when category changes
            setFormData(prev => ({ ...prev, mudrasList: [] }));
        } catch (err) {
            console.error("Error fetching mudras:", err);
        }
    };
    fetchMudras();
  }, [mudraCategory]);

  const handleMudraToggle = (mudraFolder) => {
    setFormData(prev => ({
      ...prev,
      mudrasList: prev.mudrasList.includes(mudraFolder)
        ? prev.mudrasList.filter(m => m !== mudraFolder)
        : [...prev.mudrasList, mudraFolder]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const scheduledDateTime = new Date(`${formData.scheduledAt}T${formData.time}`);
      
      // Default maxStudents to 500 as it's no longer a field but expected by backend
      const payload = { 
        ...formData, 
        scheduledAt: scheduledDateTime,
        maxStudents: 500 
      };
      delete payload.time;

      const res = await axios.post(
        `/api/staff/class/create`,
        payload,
        { headers: { 'x-auth-token': token } }
      );
      setSuccess(res.data);
      setTimeout(() => navigate('/staff/classes'), 5000);
    } catch (error) {
      alert('Failed to create class. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (success) {
      const link = getJoinLink(success.classId);
      navigator.clipboard.writeText(link);
      alert('Link copied! Share this with students.');
    }
  };

  if (success) {
    const classLink = getJoinLink(success.classId);
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full p-8 rounded-2xl border text-center space-y-6"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Class Created!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Share this link with your students:</p>
          <div className="p-4 rounded-xl border border-dashed text-left" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Join Link (works from anywhere)
            </p>
            <div className="flex items-center justify-between space-x-2">
              <code className="text-xs truncate" style={{ color: 'var(--accent)' }}>{classLink}</code>
              <button onClick={copyLink} className="p-2 hover:bg-black/10 rounded-lg flex-shrink-0">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
            Redirecting in 5 seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Schedule New Class</h1>
        <p style={{ color: 'var(--text-muted)' }}>Set up a live session for your students</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl border space-y-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
                  Class Title
                </label>
                <input type="text" required value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="e.g. Asamyuta Hastas - Beginner Level" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
                  Description
                </label>
                <textarea rows="4" required value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border resize-none"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="What will students learn?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 w-4 h-4 opacity-50" />
                    <input type="date" required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.scheduledAt}
                      onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border"
                      style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-3.5 w-4 h-4 opacity-50" />
                    <input type="time" required value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border"
                      style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Mudra Selection */}
            <div className="p-6 rounded-2xl border space-y-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>
                  Select Mudra Category
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setMudraCategory('Single')}
                    className={`p-4 border rounded-2xl transition-all flex flex-col items-center gap-2 ${
                      mudraCategory === 'Single' 
                        ? 'border-violet-500 bg-violet-500/10 shadow-lg scale-[1.02]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-3xl">🖐️</span>
                    <div className="text-center">
                      <div className="text-sm font-black" style={{ color: 'var(--text)' }}>Single Hand</div>
                      <div className="text-[10px] opacity-50 uppercase tracking-widest font-bold">Asamyuta</div>
                    </div>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMudraCategory('Double')}
                    className={`p-4 border rounded-2xl transition-all flex flex-col items-center gap-2 ${
                      mudraCategory === 'Double' 
                        ? 'border-violet-500 bg-violet-500/10 shadow-lg scale-[1.02]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-3xl">🙌</span>
                    <div className="text-center">
                      <div className="text-sm font-black" style={{ color: 'var(--text)' }}>Double Hand</div>
                      <div className="text-[10px] opacity-50 uppercase tracking-widest font-bold">Samyuta</div>
                    </div>
                  </button>
                </div>
              </div>

              {mudraCategory && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold" style={{ color: 'var(--text)' }}>
                      Select Mudras to Cover
                    </label>
                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded">
                      {formData.mudrasList.length} Selected
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1 pr-2 scrollbar-thin">
                    {mudraList.map(m => (
                      <div 
                        key={m.folder} 
                        onClick={() => handleMudraToggle(m.folder)}
                        className={`flex items-center space-x-2 p-3 rounded-xl cursor-pointer transition-all border ${
                          formData.mudrasList.includes(m.folder)
                            ? 'bg-violet-600 border-violet-600 shadow-lg shadow-violet-600/20 scale-[1.02]'
                            : 'bg-white border-slate-200 hover:border-violet-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          formData.mudrasList.includes(m.folder) ? 'border-white bg-white/20' : 'border-slate-300'
                        }`}>
                          {formData.mudrasList.includes(m.folder) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-xs font-bold transition-colors ${
                          formData.mudrasList.includes(m.folder) ? 'text-white' : 'text-slate-700'
                        }`}>
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.mudrasList.length === 0 && mudraCategory && (
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Select at least one mudra to continue
                </p>
              )}
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border space-y-6"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
                  Duration (min)
                </label>
                <input type="number" required min="15" max="180" value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
                  Instruction Language
                </label>
                <select value={formData.language}
                  onChange={e => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <option>English</option>
                  <option>Sanskrit</option>
                  <option>Hindi</option>
                  <option>Tamil</option>
                </select>
              </div>
            </div>
            <button type="submit"
              disabled={loading || formData.mudrasList.length === 0}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--accent)', color: '#fff',
                opacity: (loading || formData.mudrasList.length === 0) ? 0.6 : 1
              }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Schedule Class</span><Plus className="w-5 h-5" /></>
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StaffCreateClass;
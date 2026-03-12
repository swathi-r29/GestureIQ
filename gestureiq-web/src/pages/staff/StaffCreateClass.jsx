import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Globe, 
  CheckCircle,
  Copy,
  ChevronRight
} from 'lucide-react';

const MUDRAS = [
  "Pataka", "Tripataka", "Ardhapataka", "Kartarimukha", "Mayura", 
  "Ardhachandra", "Arala", "Shukatunda", "Mushti", "Shikhara", 
  "Kapittha", "Katakamukha", "Suchi", "Chandrakala", "Padmakosha", 
  "Sarpashirsha", "Mrigashirsha", "Simhamukha", "Langula", "Alapadma", 
  "Chatura", "Bhramara", "Hamsasya", "Hamsapaksha", "Sandamsha", 
  "Mukula", "Tamrachuda", "Trishula"
];

const StaffCreateClass = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    time: '',
    duration: 60,
    maxStudents: 50,
    language: 'English',
    mudrasList: []
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleMudraToggle = (mudra) => {
    setFormData(prev => ({
      ...prev,
      mudrasList: prev.mudrasList.includes(mudra)
        ? prev.mudrasList.filter(m => m !== mudra)
        : [...prev.mudrasList, mudra]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      // Combine date and time
      const scheduledDateTime = new Date(`${formData.scheduledAt}T${formData.time}`);
      
      const payload = {
        ...formData,
        scheduledAt: scheduledDateTime
      };
      delete payload.time;

      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/staff/class/create`, payload, {
        headers: { 'x-auth-token': token }
      });

      setSuccess(res.data);
      setTimeout(() => {
        navigate('/staff/classes');
      }, 5000);
    } catch (err) {
      alert('Failed to create class. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (success) {
      navigator.clipboard.writeText(success.joinLink);
      alert('Link copied to clipboard!');
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full p-8 rounded-2xl border text-center space-y-6" 
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Class Created Successfully!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Emails and notifications have been sent to your students.</p>
          
          <div className="p-4 rounded-xl bg-black/5 border border-dashed text-left" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Class Join Link</p>
            <div className="flex items-center justify-between space-x-2">
              <code className="text-xs truncate" style={{ color: 'var(--accent)' }}>{success.joinLink}</code>
              <button onClick={copyLink} className="p-2 hover:bg-black/10 rounded-lg">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Redirecting to My Classes in 5 seconds...</p>
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
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl border space-y-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Class Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="e.g. Asamyuta Hastas - Beginner Level"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Description</label>
                <textarea
                  rows="4"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border resize-none"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="What will students learn in this session?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 w-4 h-4 opacity-50" />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border"
                      style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-3.5 w-4 h-4 opacity-50" />
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border"
                      style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mudra Selection */}
            <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Select Mudras to Cover</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MUDRAS.map((mudra) => (
                  <div
                    key={mudra}
                    onClick={() => handleMudraToggle(mudra)}
                    className="flex items-center space-x-2 p-3 rounded-xl cursor-pointer transition-all border"
                    style={{ 
                      backgroundColor: formData.mudrasList.includes(mudra) ? 'var(--accent)' : 'var(--bg-card2)',
                      borderColor: formData.mudrasList.includes(mudra) ? 'var(--accent)' : 'var(--border)',
                      color: formData.mudrasList.includes(mudra) ? '#fff' : 'var(--text)'
                    }}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${formData.mudrasList.includes(mudra) ? 'border-white' : 'border-current opacity-30'}`}>
                      {formData.mudrasList.includes(mudra) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-xs font-medium">{mudra}</span>
                  </div>
                ))}
              </div>
              {formData.mudrasList.length === 0 && (
                <p className="mt-4 text-xs text-red-500">* Please select at least one mudra</p>
              )}
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border space-y-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center" style={{ color: 'var(--text)' }}>
                  <Clock className="w-4 h-4 mr-2" /> Duration (min)
                </label>
                <input
                  type="number"
                  required
                  min="15"
                  max="180"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 flex items-center" style={{ color: 'var(--text)' }}>
                  <Users className="w-4 h-4 mr-2" /> Max Students
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="500"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({...formData, maxStudents: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 flex items-center" style={{ color: 'var(--text)' }}>
                  <Globe className="w-4 h-4 mr-2" /> Instruction Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({...formData, language: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="English">English</option>
                  <option value="Sanskrit">Sanskrit</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || formData.mudrasList.length === 0}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: (loading || formData.mudrasList.length === 0) ? 0.6 : 1 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Schedule Class</span>
                  <Plus className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StaffCreateClass;

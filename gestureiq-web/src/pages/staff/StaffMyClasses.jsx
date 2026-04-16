//src/pages/staff/StaffMyClasses.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Users, Play, Copy, Trash2,
  Search, CheckCircle, AlertCircle, FileText, MoreVertical
} from 'lucide-react';

// ── FIX: Always use VITE_PUBLIC_URL so copied link works for remote students ──
const getJoinLink = (classId) => {
  const base = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  return `${base}/class/join/${classId}`;
};

const StaffMyClasses = () => {
  const [activeTab, setActiveTab] = useState('scheduled');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchClasses(); }, [activeTab]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `/api/staff/classes?status=${activeTab}`,
        { headers: { 'x-auth-token': token } }
      );
      setClasses(res.data);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (classId) => {
    const link = getJoinLink(classId);
    navigator.clipboard.writeText(link);
    alert(`Link copied!\n\n${link}\n\nShare this with students — works from anywhere.`);
  };

  const handleCancel = async (classId) => {
    if (!window.confirm('Cancel this class? Students will be notified.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `/api/staff/class/${classId}`,
        { headers: { 'x-auth-token': token } }
      );
      fetchClasses();
    } catch (error) {
      alert('Failed to cancel class');
    }
  };

  const filteredClasses = classes.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>My Classes</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your teaching sessions</p>
        </div>
        <button onClick={() => navigate('/staff/class/create')}
          className="px-6 py-3 rounded-xl font-bold text-white flex items-center space-x-2 hover:scale-105 transition-transform"
          style={{ backgroundColor: 'var(--accent)' }}>
          <Play className="w-4 h-4 fill-current" />
          <span>Schedule New</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 rounded-xl w-full max-w-md"
        style={{ backgroundColor: 'var(--bg-card2)' }}>
        {['scheduled', 'live', 'ended'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-bold capitalize transition-all"
            style={{
              backgroundColor: activeTab === tab ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
            }}>
            {tab === 'ended' ? 'Past' : tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3.5 w-4 h-4 opacity-50" />
        <input type="text" placeholder="Search by title..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl animate-pulse"
              style={{ backgroundColor: 'var(--bg-card2)' }} />
          ))}
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map(item => (
            <div key={item._id}
              className="group relative p-6 rounded-2xl border transition-all hover:shadow-xl"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  item.status === 'live' ? 'bg-red-500 text-white animate-pulse' :
                  item.status === 'ended' ? 'bg-gray-500/10 text-gray-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {item.status}
                </div>
              </div>

              <h3 className="text-lg font-bold mb-4 line-clamp-1" style={{ color: 'var(--text)' }}>
                {item.title}
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Calendar className="w-4 h-4 mr-3 opacity-50" />
                  {new Date(item.scheduledAt).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-4 h-4 mr-3 opacity-50" />
                  {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.duration}m)
                </div>
                <div className="flex items-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Users className="w-4 h-4 mr-3 opacity-50" />
                  {item.studentsEnrolled?.length || 0} Students
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 h-12 overflow-hidden">
                {(item.mudrasList || []).slice(0, 3).map(m => (
                  <span key={m} className="px-2 py-1 rounded-md text-[10px] bg-black/5"
                    style={{ color: 'var(--text-muted)' }}>{m}</span>
                ))}
                {(item.mudrasList || []).length > 3 && (
                  <span className="px-2 py-1 rounded-md text-[10px] bg-black/5"
                    style={{ color: 'var(--text-muted)' }}>+{item.mudrasList.length - 3} more</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {item.status === 'scheduled' && (
                  <>
                    <button onClick={() => navigate(`/staff/class/conduct/${item.classId}`)}
                      className="flex-1 py-2.5 rounded-xl font-bold text-xs hover:opacity-90 flex items-center justify-center space-x-1"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                      <Play className="w-3 h-3 fill-current" /><span>Start Class</span>
                    </button>
                    <button onClick={() => handleCopyLink(item.classId)}
                      title="Copy join link"
                      className="p-2.5 rounded-xl border flex items-center justify-center hover:bg-black/5"
                      style={{ borderColor: 'var(--border)' }}>
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleCancel(item.classId)}
                      className="p-2.5 rounded-xl border flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20"
                      style={{ borderColor: 'var(--border)' }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </>
                )}
                {item.status === 'live' && (
                  <button onClick={() => navigate(`/staff/class/conduct/${item.classId}`)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-500 text-white hover:brightness-110 flex items-center justify-center space-x-1">
                    <Play className="w-3 h-3 fill-current" /><span>Resume Class</span>
                  </button>
                )}
                {item.status === 'ended' && (
                  <button onClick={() => navigate(`/staff/reports?session=${item._id}`)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs border hover:bg-black/5 flex items-center justify-center space-x-1"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                    <FileText className="w-3 h-3" /><span>View Report</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 opacity-50 space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
          <p className="text-lg">No classes found</p>
          {activeTab === 'scheduled' && (
            <button onClick={() => navigate('/staff/class/create')}
              className="px-6 py-2 rounded-lg border font-bold"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              Create your first class
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffMyClasses;
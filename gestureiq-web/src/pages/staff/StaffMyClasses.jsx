import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  MoreVertical, 
  Play, 
  Copy, 
  Trash2, 
  Edit3,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const StaffMyClasses = () => {
  const [activeTab, setActiveTab] = useState('scheduled');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
  }, [activeTab]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/classes?status=${activeTab}`, {
        headers: { 'x-auth-token': token }
      });
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (classId) => {
    const host = import.meta.env.VITE_NETWORK_IP || window.location.hostname;
    const link = `${window.location.protocol}//${host}${window.location.port ? ':' + window.location.port : ''}/class/join/${classId}`;
    navigator.clipboard.writeText(link);
    alert('Link copied!');
  };

  const handleCancel = async (classId) => {
    if (window.confirm('Are you sure you want to cancel this class? Students will be notified.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/staff/class/${classId}`, {
          headers: { 'x-auth-token': token }
        });
        fetchClasses();
      } catch (err) {
        alert('Failed to cancel class');
      }
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
          <p style={{ color: 'var(--text-muted)' }}>Manage your scheduled and past teaching sessions</p>
        </div>
        <button 
          onClick={() => navigate('/staff/class/create')}
          className="px-6 py-3 rounded-xl font-bold text-white flex items-center space-x-2 transition-transform hover:scale-105"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Schedule New</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 rounded-xl w-full max-w-md" style={{ backgroundColor: 'var(--bg-card2)' }}>
        {['scheduled', 'live', 'ended'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-bold capitalize transition-all"
            style={{ 
              backgroundColor: activeTab === tab ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none'
            }}
          >
            {tab === 'ended' ? 'Past' : tab}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3.5 w-4 h-4 opacity-50" />
        <input 
          type="text"
          placeholder="Search by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
      </div>

      {/* Class Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-card2)' }}></div>
          ))}
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((item) => (
            <div key={item._id} className="group relative p-6 rounded-2xl border transition-all hover:shadow-xl" 
                 style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  item.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                  item.status === 'ended' ? 'bg-gray-500/10 text-gray-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {item.status}
                </div>
                <div className="dropdown relative group shadow-sm">
                  <MoreVertical className="w-5 h-5 cursor-pointer opacity-50 hover:opacity-100" />
                </div>
              </div>

              <h3 className="text-lg font-bold mb-4 line-clamp-1" style={{ color: 'var(--text)' }}>{item.title}</h3>

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
                  {item.studentsEnrolled?.length || 0} Students Joined
                </div>
              </div>

              {/* Mudras Badge Area */}
              <div className="flex flex-wrap gap-2 mb-6 h-12 overflow-hidden">
                {item.mudrasList.slice(0, 3).map(m => (
                  <span key={m} className="px-2 py-1 rounded-md text-[10px] bg-black/5" style={{ color: 'var(--text-muted)' }}>
                    {m}
                  </span>
                ))}
                {item.mudrasList.length > 3 && (
                  <span className="px-2 py-1 rounded-md text-[10px] bg-black/5" style={{ color: 'var(--text-muted)' }}>
                    +{item.mudrasList.length - 3} more
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {item.status === 'scheduled' && (
                  <>
                    <button 
                      onClick={() => navigate(`/staff/class/conduct/${item.classId}`)}
                      className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 flex items-center justify-center space-x-1"
                      style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Class</span>
                    </button>
                    <button 
                      onClick={() => handleCopyLink(item.classId)}
                      className="p-2.5 rounded-xl border flex items-center justify-center transition-all hover:bg-black/5"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleCancel(item.classId)}
                      className="p-2.5 rounded-xl border flex items-center justify-center transition-all hover:bg-red-500/10 hover:border-red-500/20"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </>
                )}
                
                {item.status === 'live' && (
                  <button 
                    onClick={() => navigate(`/staff/class/conduct/${item.classId}`)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-500 text-white transition-all hover:brightness-110 flex items-center justify-center space-x-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Resume Class</span>
                  </button>
                )}

                {item.status === 'ended' && (
                  <button 
                    onClick={() => navigate('/staff/reports')}
                    className="w-full py-2.5 rounded-xl font-bold text-xs border transition-all hover:bg-black/5 flex items-center justify-center space-x-1"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <FileText className="w-3 h-3" />
                    <span>View Report</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 opacity-50 space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
          <p className="text-lg">No classes found in this category</p>
          {activeTab === 'scheduled' && (
            <button 
              onClick={() => navigate('/staff/class/create')}
              className="px-6 py-2 rounded-lg border font-bold"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Set up your first class
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffMyClasses;

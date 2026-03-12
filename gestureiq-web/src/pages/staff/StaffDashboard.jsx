import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Video, 
  Bell, 
  Calendar, 
  ArrowRight, 
  FileText,
  Clock
} from 'lucide-react';

const StaffDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/dashboard`, {
        headers: { 'x-auth-token': token }
      });
      setData(res.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
    </div>
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Staff Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back! Here's what's happening today.</p>
        </div>
        <div className="relative cursor-pointer">
          <Bell className="w-6 h-6" style={{ color: 'var(--text)' }} />
          {data?.notifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {data.notifications}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Video, label: 'Total Classes', value: data?.totalClasses || 0, color: '#3B82F6' },
          { icon: Users, label: 'Total Students', value: data?.totalStudents || 0, color: '#10B981' },
          { icon: Clock, label: 'Upcoming Class', value: data?.nextClass ? '1' : '0', color: '#F59E0B' },
          { icon: Bell, label: 'Alerts', value: data?.notifications || 0, color: '#EF4444' }
        ].map((stat, idx) => (
          <div key={idx} className="p-6 rounded-2xl shadow-sm border transition-all hover:translate-y-[-4px]" 
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${stat.color}20` }}>
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Next Class / Upcoming Section */}
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Next Scheduled Class</h2>
            <button onClick={() => navigate('/staff/classes')} className="text-sm font-medium flex items-center" style={{ color: 'var(--accent)' }}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          {data?.nextClass ? (
            <div className="p-6 rounded-xl border border-dashed transition-hover hover:border-solid" 
                 style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>{data.nextClass.title}</h3>
              <div className="space-y-2 mb-6">
                <p className="text-sm flex items-center" style={{ color: 'var(--text-muted)' }}>
                  <Calendar className="w-4 h-4 mr-2" /> {new Date(data.nextClass.scheduledAt).toLocaleDateString()}
                </p>
                <p className="text-sm flex items-center" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-4 h-4 mr-2" /> {new Date(data.nextClass.scheduledAt).toLocaleTimeString()}
                </p>
                <p className="text-sm flex items-center" style={{ color: 'var(--text-muted)' }}>
                  <Users className="w-4 h-4 mr-2" /> {data.nextClass.studentsEnrolled?.length || 0} Students Enrolled
                </p>
              </div>
              <button 
                onClick={() => navigate(`/staff/class/conduct/${data.nextClass.classId}`)}
                className="w-full py-3 rounded-lg font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Go to Classroom
              </button>
            </div>
          ) : (
            <div className="text-center py-12 opacity-50">
              <Calendar className="w-12 h-12 mx-auto mb-4" />
              <p>No classes scheduled today</p>
              <button 
                onClick={() => navigate('/staff/class/create')}
                className="mt-4 px-6 py-2 rounded-lg border text-sm font-bold"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                Create New Class
              </button>
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Recent Session Reports</h2>
            <button onClick={() => navigate('/staff/reports')} className="text-sm font-medium flex items-center" style={{ color: 'var(--accent)' }}>
              All Reports <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="space-y-4">
            {data?.recentSessions?.length > 0 ? (
              data.recentSessions.map((session, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl transition-all hover:bg-black/5" 
                     style={{ backgroundColor: 'var(--bg-card2)' }}>
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <FileText className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{session.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(session.conductedAt).toLocaleDateString()} | Avg Accuracy: {session.classAverage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/staff/reports?session=${session._id}`)} className="p-2 rounded-full hover:bg-black/10">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center py-12 opacity-50 text-sm">No recent sessions found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;

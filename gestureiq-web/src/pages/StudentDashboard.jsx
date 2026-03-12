import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { 
  Bell, 
  Calendar, 
  BookOpen, 
  Award, 
  Clock, 
  CheckCircle,
  Video,
  ChevronRight
} from 'lucide-react';

export default function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('token');
                const [dashRes, notifRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/dashboard`, {
                        headers: { 'x-auth-token': token }
                    }),
                    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/student/notifications`, {
                        headers: { 'x-auth-token': token }
                    })
                ]);
                setDashboardData(dashRes.data);
                setNotifications(notifRes.data);
            } catch (err) {
                setError('Failed to load dashboard data. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    const markNotificationAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/student/notification/${id}/read`, {}, {
                headers: { 'x-auth-token': token }
            });
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (err) {
            console.error('Failed to mark read');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center p-8 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <p className="text-sm tracking-widest uppercase mb-4" style={{ color: 'var(--accent)' }}>Error</p>
                    <p style={{ color: 'var(--text-muted)' }}>{error}</p>
                </div>
            </div>
        );
    }

    const { stats, user: userData } = dashboardData;

    // Simple SVG Circle logic
    const circleRadius = 40;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = circleCircumference - (stats.percentage / 100) * circleCircumference;

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-fade-in space-y-12">

            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex-1">
                    <div className="text-[10px] tracking-[6px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                        Student Dashboard
                    </div>
                    <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                        Welcome, <span style={{ color: 'var(--copper)' }}>{userData.name}</span>
                    </h1>
                    <BorderPattern />
                </div>

                {/* Notifications Panel */}
                <div className="w-full md:w-80 shrink-0">
                  <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-black uppercase tracking-widest flex items-center">
                        <Bell className="w-4 h-4 mr-2" /> Notifications
                      </h3>
                      {notifications.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{notifications.length}</span>
                      )}
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? notifications.map(notif => (
                        <div key={notif._id} className="p-3 rounded-xl bg-black/5 border border-dashed text-xs group relative transition-all hover:bg-black/10" style={{ borderColor: 'var(--border)' }}>
                          <p className="font-bold mb-1" style={{ color: 'var(--text)' }}>{notif.title}</p>
                          <p className="opacity-70 line-clamp-2">{notif.message}</p>
                          <button 
                            onClick={() => markNotificationAsRead(notif._id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                        </div>
                      )) : (
                        <p className="text-center py-8 text-[10px] uppercase opacity-30 italic">No new alerts</p>
                      )}
                    </div>
                  </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Progress circular bar */}
                <div className="p-6 border rounded-3xl flex flex-col items-center justify-center text-center shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="relative w-24 h-24 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r={circleRadius} stroke="var(--border)" strokeWidth="6" fill="transparent" />
                            <circle cx="48" cy="48" r={circleRadius} stroke="var(--copper)" strokeWidth="6" fill="transparent"
                                strokeDasharray={circleCircumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-lg font-black">{stats.percentage}%</div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Overall Mudras</p>
                    <p className="text-sm font-bold">{stats.mastered} / {stats.total}</p>
                </div>

                <div className="px-8 py-6 rounded-3xl border flex flex-col justify-center gap-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <Calendar className="w-6 h-6" style={{ color: 'var(--copper)' }} />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Last Session</p>
                    <p className="text-xl font-bold">{stats.lastPracticedMudra}</p>
                </div>

                <div className="px-8 py-6 rounded-3xl border flex flex-col justify-center gap-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <Award className="w-6 h-6" style={{ color: 'var(--copper)' }} />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Current Level</p>
                    <p className="text-xl font-bold">{stats.currentLevel}</p>
                </div>

                <div className="px-8 py-6 rounded-3xl border flex flex-col justify-center gap-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <Video className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Live Access</p>
                    <Link to="/live-classes" className="text-sm font-bold underline decoration-accent/30 underline-offset-4 hover:text-accent transition-colors">View Scheduled Classes</Link>
                </div>
            </div>

            {/* Main Action Banner */}
            <div className="p-8 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-8 border-2 shadow-2xl relative overflow-hidden" 
                 style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10 flex-1">
                    <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text)' }}>
                        {dashboardData.nextClass ? 'Your Next Class is Ready' : 'Ready for class?'}
                    </h2>
                    {dashboardData.nextClass ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{dashboardData.nextClass.title}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs opacity-80">
                                    <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(dashboardData.nextClass.scheduledAt).toLocaleDateString()}</span>
                                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {new Date(dashboardData.nextClass.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span className="flex items-center"><Video className="w-3 h-3 mr-1" /> Join via Portal</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm max-w-lg opacity-70 leading-relaxed">
                            Practice makes perfect. Join a scheduled live session to interact with instructors, or sharpen your skills in the solo training hub.
                        </p>
                    )}
                </div>
                <div className="flex gap-4 relative z-10 w-full md:w-auto">
                    {dashboardData.nextClass ? (
                        <button 
                            onClick={() => navigate(`/class/join/${dashboardData.nextClass.classId}`)}
                            className="flex-1 md:flex-none px-10 py-4 bg-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 transition-all hover:scale-105 active:scale-95 text-center"
                        >
                            Join Class Room
                        </button>
                    ) : (
                        <Link to="/learn" className="flex-1 md:flex-none px-10 py-4 bg-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 transition-all hover:scale-105 active:scale-95 text-center">
                            Practice Now
                        </Link>
                    )}
                    <Link to="/live-classes" className="flex-1 md:flex-none px-10 py-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-black/5 text-center" style={{ borderColor: 'var(--border)' }}>
                        Browse Classes
                    </Link>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Hubs */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { title: 'Learn Hub', desc: 'Step-by-step mudra masterclass', to: '/learn', icon: BookOpen },
                        { title: 'Camera Lab', desc: 'Real-time AI gesture analysis', to: '/detect', icon: Activity },
                        { title: 'Achievements', desc: 'Your collection of certificates', to: '/certificates', icon: Award },
                        { title: 'Account Settings', desc: 'Update profile and preferences', to: '/profile', icon: Settings }
                    ].map((hub, i) => (
                        <Link key={i} to={hub.to} className="p-8 rounded-3xl border bg-[var(--bg-card)] border-[var(--border)] group hover:border-accent transition-all flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-black/5 group-hover:bg-accent/10 group-hover:text-accent transition-all"><hub.icon className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-bold mb-1">{hub.title}</h3>
                                <p className="text-xs opacity-50">{hub.desc}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-30 transition-all" />
                        </Link>
                    ))}
                </div>

                {/* Sidebar Info/Tips */}
                <div className="space-y-6">
                    <div className="p-8 rounded-3xl border bg-accent/5 border-dashed" style={{ borderColor: 'var(--accent)' }}>
                        <h4 className="text-xs font-black uppercase tracking-widest mb-4">Pro Tip</h4>
                        <p className="text-xs italic opacity-70 leading-relaxed">
                            "Consistent practice of 15 minutes daily improves muscle memory by 40%. Try scheduling a fixed time for your mudra practice."
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
const Activity = BookOpen;
const Settings = Calendar;


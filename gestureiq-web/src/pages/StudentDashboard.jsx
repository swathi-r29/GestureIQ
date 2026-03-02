import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';

export default function StudentDashboard() {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/user/dashboard', {
                    headers: { 'x-auth-token': token }
                });
                setDashboardData(res.data);
            } catch (err) {
                setError('Failed to load dashboard data. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

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
        <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">

            {/* Header section */}
            <div className="mb-12">
                <div className="text-[10px] tracking-[6px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                    Student Dashboard
                </div>
                <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                    Welcome, <span style={{ color: 'var(--copper)' }}>{userData.name}</span>
                </h1>
                <BorderPattern />
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">

                {/* Progress Circular Bar */}
                <div className="p-6 border rounded flex flex-col items-center justify-center text-center shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="relative w-24 h-24 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r={circleRadius} stroke="var(--border)" strokeWidth="6" fill="transparent" />
                            <circle cx="48" cy="48" r={circleRadius} stroke="var(--copper)" strokeWidth="6" fill="transparent"
                                strokeDasharray={circleCircumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                            <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>{stats.percentage}%</span>
                        </div>
                    </div>
                    <div className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Overall Progress</div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{stats.mastered} / {stats.total} Mudras</div>
                </div>

                {/* Level */}
                <div className="p-6 border rounded flex flex-col justify-center shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="text-3xl mb-4" style={{ color: 'var(--copper)' }}>✦</div>
                    <div className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Current Level</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{stats.currentLevel}</div>
                    <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Experience: {userData.experience_level}</div>
                </div>

                {/* Last Practiced */}
                <div className="p-6 border rounded flex flex-col justify-center shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="text-3xl mb-4" style={{ color: 'var(--copper)' }}>❧</div>
                    <div className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Last Practiced</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{stats.lastPracticedMudra}</div>
                </div>

                {/* Streak */}
                <div className="p-6 border rounded flex flex-col justify-center shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="text-3xl mb-4" style={{ color: 'var(--copper)' }}>◎</div>
                    <div className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Practice Streak</div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>{stats.practiceStreak} <span className="text-sm font-normal">Days</span></div>
                </div>
            </div>

            {/* Main Action Area */}
            <div className="mb-12 p-8 border rounded flex flex-col md:flex-row items-center justify-between" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Resume Practice</h2>
                    <p className="text-sm max-w-xl" style={{ color: 'var(--text-muted)' }}>
                        You are currently working on {stats.currentLevel} mudras. Continue learning and perfect your hand gestures with the AI camera.
                    </p>
                </div>
                <Link to="/learn" className="mt-6 md:mt-0 px-8 py-4 text-xs tracking-[3px] uppercase rounded shadow-md hover:scale-105 transition-all" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                    Continue Where You Left Off
                </Link>
            </div>

            {/* Quick Navigation Cards */}
            <div>
                <div className="text-[10px] tracking-[6px] uppercase mb-6" style={{ color: 'var(--text-muted)' }}>
                    Quick Links
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link to="/learn" className="group p-6 border rounded hover:shadow-lg transition-all flex justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>Learn Hub</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Explore all 28 mudras</p>
                        </div>
                        <span className="text-2xl group-hover:translate-x-2 transition-transform" style={{ color: 'var(--copper)' }}>→</span>
                    </Link>

                    <Link to="/profile" className="group p-6 border rounded hover:shadow-lg transition-all flex justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>My Profile</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>View detailed stats</p>
                        </div>
                        <span className="text-2xl group-hover:translate-x-2 transition-transform" style={{ color: 'var(--copper)' }}>→</span>
                    </Link>

                    <Link to="/certificates" className="group p-6 border rounded hover:shadow-lg transition-all flex justify-between items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>Certificates</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Download achievements</p>
                        </div>
                        <span className="text-2xl group-hover:translate-x-2 transition-transform" style={{ color: 'var(--copper)' }}>→</span>
                    </Link>
                </div>
            </div>

        </div>
    );
}

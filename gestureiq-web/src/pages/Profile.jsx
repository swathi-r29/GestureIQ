import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { User, Mail, Shield, Award, Calendar, BarChart2 } from 'lucide-react';

export default function Profile() {
    const { user: authUser } = useAuth();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/user/progress', {
                    headers: { 'x-auth-token': token }
                });
                setUserData(res.data);
            } catch (err) {
                setError('Failed to load profile data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--copper)' }}></div>
            </div>
        );
    }

    if (error || !userData) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-6">
                <div className="text-center p-8 rounded border w-full max-w-md" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <p className="text-sm tracking-widest uppercase mb-4" style={{ color: 'var(--accent)' }}>Error</p>
                    <p style={{ color: 'var(--text-muted)' }}>{error || 'User not found'}</p>
                </div>
            </div>
        );
    }

    const { progress } = userData;
    const masteredCount = progress?.detectedMudras?.length || 0;
    const bestScores = progress?.mudraScores || {};
    const scoresArray = Object.values(bestScores);
    const avgScore = scoresArray.length > 0
        ? Math.round(scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length)
        : 0;

    return (
        <div className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
            {/* Header */}
            <div className="mb-12 text-center md:text-left">
                <div className="text-[10px] tracking-[6px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                    Your Sanctuary
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                    User <span style={{ color: 'var(--copper)' }}>Profile</span>
                </h1>
                <BorderPattern />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="p-8 border rounded shadow-sm text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center border-2" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--bg-card2)' }}>
                            <User size={40} style={{ color: 'var(--accent)' }} />
                        </div>
                        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{userData.name}</h2>
                        <div className="text-[10px] tracking-[4px] uppercase opacity-60 mb-6" style={{ color: 'var(--text-muted)' }}>{userData.role}</div>

                        <div className="space-y-4 text-left">
                            <div className="flex items-center gap-3">
                                <Mail size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
                                <div className="text-xs truncate" style={{ color: 'var(--text)' }}>{userData.email}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Shield size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
                                <div className="text-xs" style={{ color: 'var(--text)' }}>Status: <span className="capitalize">{userData.status}</span></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Award size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
                                <div className="text-xs" style={{ color: 'var(--text)' }}>Level: {userData.experience_level || 'Beginner'}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
                                <div className="text-xs" style={{ color: 'var(--text)' }}>Joined: {new Date(userData.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Shield size={14} style={{ color: 'var(--accent)' }} className="shrink-0" />
                                <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>Institution: {userData.institution_name || 'Individual'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Column */}
                    <div className="p-6 border rounded shadow-sm" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                        <h3 className="text-[10px] tracking-[4px] uppercase mb-4 font-bold" style={{ color: 'var(--text-muted)' }}>Account Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Practice Count</span>
                                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{progress?.practiceCount || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg. Accuracy</span>
                                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{avgScore}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress & Achievements */}
                <div className="md:col-span-2 space-y-8">
                    <div className="p-8 border rounded shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <BarChart2 style={{ color: 'var(--accent)' }} />
                            <h3 className="text-lg font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>Mudra Mastery</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="p-4 rounded border-l-4" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--accent)' }}>
                                <div className="text-2xl font-black mb-1" style={{ color: 'var(--accent)' }}>{masteredCount}</div>
                                <div className="text-[9px] tracking-[2px] uppercase opacity-60" style={{ color: 'var(--text-muted)' }}>Mudras Mastered</div>
                            </div>
                            <div className="p-4 rounded border-l-4" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--copper)' }}>
                                <div className="text-2xl font-black mb-1" style={{ color: 'var(--copper)' }}>{28 - masteredCount}</div>
                                <div className="text-[9px] tracking-[2px] uppercase opacity-60" style={{ color: 'var(--text-muted)' }}>Mudras Remaining</div>
                            </div>
                        </div>

                        {/* Mastery Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] tracking-[3px] uppercase" style={{ color: 'var(--text-muted)' }}>Total Progress</span>
                                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{Math.round((masteredCount / 28) * 100)}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                                <div
                                    className="h-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${(masteredCount / 28) * 100}%`,
                                        backgroundColor: 'var(--accent)'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Best Scores List */}
                        {Object.keys(bestScores).length > 0 ? (
                            <div>
                                <h4 className="text-[10px] tracking-[4px] uppercase mb-4 opacity-70" style={{ color: 'var(--text-muted)' }}>Personal Bests</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(bestScores).map(([mudra, score]) => (
                                        <div key={mudra} className="flex items-center justify-between p-3 rounded border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                            <span className="text-[10px] font-bold uppercase tracking-widest capitalize" style={{ color: 'var(--text)' }}>{mudra}</span>
                                            <span className="text-xs font-black" style={{ color: 'var(--copper)' }}>{score}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 border rounded border-dashed" style={{ borderColor: 'var(--border)' }}>
                                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Start practicing to see your performance metrics here.</p>
                            </div>
                        )}
                    </div>

                    {/* Additional Info / Settings Placeholder */}
                    <div className="p-6 border rounded border-dashed" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>Platform Settings</h4>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Edit your account preferences and notification settings.</p>
                            </div>
                            <span className="px-3 py-1 text-[8px] tracking-[2px] uppercase rounded border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Coming Soon</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

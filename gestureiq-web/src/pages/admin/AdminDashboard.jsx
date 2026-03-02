import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Users,
    GraduationCap,
    Camera,
    Flame,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    BarChart2,
    PieChart as PieIcon,
    LineChart as LineIcon,
    Award as AwardIcon
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <div className="p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md group"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card2)' }}>
                <Icon size={24} style={{ color: color || 'var(--accent)' }} />
            </div>
            {trend && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 tracking-tighter">
                    <ArrowUpRight size={12} /> {trend}
                </div>
            )}
        </div>
        <div className="text-[10px] tracking-[4px] uppercase mb-1 font-bold" style={{ color: 'var(--text-muted)' }}>{title}</div>
        <div className="text-3xl font-black" style={{ color: 'var(--text)' }}>{value}</div>
    </div>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [mudraStats, setMudraStats] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [topStudents, setTopStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };

                const [overviewRes, mudraRes, regRes, studentRes] = await Promise.all([
                    axios.get('/api/admin/analytics/overview', config),
                    axios.get('/api/admin/analytics/mudra-stats', config),
                    axios.get('/api/admin/analytics/registrations', config),
                    axios.get('/api/admin/analytics/top-students', config)
                ]);

                setStats(overviewRes.data);
                setMudraStats(mudraRes.data);
                setRegistrations(regRes.data);
                setTopStudents(studentRes.data);
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="p-12 text-center tracking-[10px] uppercase text-[10px] opacity-50">Synchronizing Data...</div>;

    const COLORS = ['var(--accent)', 'var(--copper)', 'var(--gold)', '#8B7355', '#4A3728'];

    const levelData = [
        { name: 'Beginner', value: 40 },
        { name: 'Intermediate', value: 35 },
        { name: 'Advanced', value: 25 }
    ];

    return (
        <div className="space-y-10 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Command Center</h1>
                <p className="text-xs tracking-widest uppercase opacity-50" style={{ color: 'var(--text-muted)' }}>Real-time Platform Analytics</p>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Students" value={stats?.totalStudents} icon={GraduationCap} trend="+12%" color="#10b981" />
                <StatCard title="Approved Staff" value={stats?.totalStaff} icon={Users} trend="+5%" color="#3b82f6" />
                <StatCard title="Practices Today" value={stats?.practicesToday} icon={Flame} trend="+28%" color="#f59e0b" />
                <StatCard title="Popular Mudra" value={stats?.mostPopularMudra} icon={TrendingUp} color="#8b5cf6" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-8">
                        <BarChart2 size={16} style={{ color: 'var(--accent)' }} />
                        <h3 className="text-[10px] tracking-[4px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Top 10 Practiced Mudras</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mudraStats}>
                                <XAxis dataKey="mudraName" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'var(--text)', fontSize: '12px' }}
                                />
                                <Bar dataKey="practiceCount" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Line Chart */}
                <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-8">
                        <LineIcon size={16} style={{ color: 'var(--accent)' }} />
                        <h3 className="text-[10px] tracking-[4px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>New Registrations (Last 7 Days)</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={registrations}>
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="staff" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pie Chart */}
                <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-8">
                        <PieIcon size={16} style={{ color: 'var(--accent)' }} />
                        <h3 className="text-[10px] tracking-[4px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Students by Level</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={levelData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {levelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Students Table */}
                <div className="lg:col-span-2 p-8 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-8">
                        <AwardIcon size={16} style={{ color: 'var(--accent)' }} />
                        <h3 className="text-[10px] tracking-[4px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Top 10 Students by Progress</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b" style={{ borderColor: 'var(--border)' }}>
                                <tr className="text-[10px] tracking-widest uppercase opacity-40">
                                    <th className="py-4">Rank</th>
                                    <th className="py-4">Student</th>
                                    <th className="py-4 text-center">Mudras</th>
                                    <th className="py-4 text-center">Avg. Score</th>
                                    <th className="py-4 text-right">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                {topStudents.map((s) => (
                                    <tr key={s.email} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="py-4 font-mono text-xs pr-4">#{s.rank.toString().padStart(2, '0')}</td>
                                        <td className="py-4">
                                            <div className="font-bold text-xs">{s.name}</div>
                                            <div className="text-[10px] opacity-40">{s.email}</div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="px-2 py-1 rounded text-[10px] font-bold"
                                                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--copper)' }}>
                                                {s.mudrasMastered}/28
                                            </span>
                                        </td>
                                        <td className="py-4 text-center font-bold text-xs" style={{ color: 'var(--accent)' }}>{s.averageScore}%</td>
                                        <td className="py-4 text-right text-[10px] opacity-50">{new Date(s.lastActive).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

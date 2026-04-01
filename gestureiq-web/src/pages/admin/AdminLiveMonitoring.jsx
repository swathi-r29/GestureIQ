import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Video,
    Activity,
    Users,
    Calendar,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Play,
    BarChart3
} from 'lucide-react';

export default function AdminLiveMonitoring() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClasses();
        const interval = setInterval(fetchClasses, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/live/all', {
                headers: { 'x-auth-token': token }
            });
            setClasses(res.data);
        } catch (err) {
            console.error('Failed to fetch classes', err);
        } finally {
            setLoading(false);
        }
    };

    const activeClasses = classes.filter(c => c.status === 'active');
    const scheduledClasses = classes.filter(c => c.status === 'scheduled');
    const finishedClasses = classes.filter(c => c.status === 'completed' || c.status === 'cancelled');

    const StatusBadge = ({ status }) => {
        const styles = {
            active: { bg: 'bg-red-500/10', text: 'text-red-500', icon: Activity, label: 'Live Now' },
            scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: Calendar, label: 'Scheduled' },
            completed: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle2, label: 'Finished' },
            cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: XCircle, label: 'Cancelled' }
        };
        const style = styles[status] || styles.scheduled;
        return (
            <div className={`px-3 py-1 rounded-full ${style.bg} ${style.text} text-[8px] font-bold tracking-widest uppercase flex items-center gap-2 border border-current w-fit`}>
                <style.icon size={10} className={status === 'active' ? 'animate-pulse' : ''} /> {style.label}
            </div>
        );
    };

    return (
        <div className="space-y-10 animate-fadeIn text-[var(--text)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Live Class Monitoring</h1>
                    <p className="text-xs tracking-widest uppercase opacity-50">Oversee real-time sessions and platform activity</p>
                </div>

                <div className="flex gap-4">
                    <div className="p-4 rounded-2xl border flex items-center gap-4 bg-[var(--bg-card)] border-[var(--border)]">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                            <Activity size={20} />
                        </div>
                        <div>
                            <div className="text-lg font-black">{activeClasses.length}</div>
                            <div className="text-[9px] tracking-widest uppercase opacity-50 font-bold">Active Sessions</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border overflow-hidden shadow-sm bg-[var(--bg-card)] border-[var(--border)]">
                <table className="w-full text-left">
                    <thead className="border-b border-[var(--border)]">
                        <tr className="text-[10px] tracking-widest uppercase opacity-40 font-bold">
                            <th className="p-6">Session Details</th>
                            <th className="p-6">Instructor / Institution</th>
                            <th className="p-6 text-center">Participation</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Monitoring</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {loading ? (
                            <tr><td colSpan="5" className="p-20 text-center text-[10px] tracking-widest opacity-30 uppercase animate-pulse">Scanning Satellite Feeds...</td></tr>
                        ) : classes.length === 0 ? (
                            <tr><td colSpan="5" className="p-20 text-center text-[10px] tracking-widest opacity-30 uppercase italic">No active or scheduled classes</td></tr>
                        ) : classes.map((c) => (
                            <tr key={c._id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="p-6">
                                    <div className="font-bold text-xs">{c.title}</div>
                                    <div className="text-[10px] opacity-40 mt-1 flex items-center gap-2">
                                        <Calendar size={10} /> {new Date(c.startTime).toLocaleString()}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="text-[10px] font-bold tracking-tight uppercase">{c.hostId?.name}</div>
                                    <div className="text-[10px] opacity-40">{c.hostId?.institution_name || 'Independent'}</div>
                                </td>
                                <td className="p-6">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <Users size={14} className="opacity-40" />
                                            {c.attendees?.length || 0}
                                        </div>
                                        <div className="text-[8px] tracking-tighter uppercase opacity-30 font-bold mt-1">Students Joined</div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <StatusBadge status={c.status} />
                                </td>
                                <td className="p-6 text-right">
                                    {c.status === 'active' ? (
                                        <a href={c.meetingLink} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-[9px] font-bold tracking-widest uppercase hover:bg-red-700 transition-all shadow-lg shadow-red-900/20">
                                            <Play size={10} fill="currentColor" /> Enter Room
                                        </a>
                                    ) : (
                                        <button disabled className="px-4 py-2 border border-[var(--border)] text-[9px] font-bold tracking-widest uppercase opacity-30 rounded-lg">
                                            View Logs
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl border bg-[var(--bg-card)] border-[var(--border)] flex items-center gap-6 group hover:border-red-500/20 transition-all">
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="text-[10px] tracking-widest uppercase opacity-40 font-bold mb-1">Real-time Safety</div>
                        <h3 className="text-sm font-black uppercase">Active Monitoring Enabled</h3>
                        <p className="text-[10px] opacity-30 mt-1">System automatically logs all entry/exit for security audit.</p>
                    </div>
                </div>

                <div className="p-8 rounded-3xl border bg-[var(--bg-card)] border-[var(--border)] flex items-center gap-6 group hover:border-blue-500/20 transition-all">
                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <div className="text-[10px] tracking-widest uppercase opacity-40 font-bold mb-1">Platform Analytics</div>
                        <h3 className="text-sm font-black uppercase">Engagement Insight</h3>
                        <p className="text-[10px] opacity-30 mt-1">Average {classes.length > 0 ? (classes.reduce((acc, c) => acc + (c.attendees?.length || 0), 0) / classes.length).toFixed(1) : 0} attendance per session.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Video,
    Calendar,
    Clock,
    Play,
    Users,
    CheckCircle2,
    ChevronRight,
    Search,
    Info
} from 'lucide-react';

export default function StudentLiveClasses() {
    const [upcoming, setUpcoming] = useState([]);
    const [active, setActive] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClasses();
        const interval = setInterval(fetchClasses, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const [upcomingRes, activeRes] = await Promise.all([
                axios.get('/api/live/upcoming', { headers: { 'x-auth-token': token } }),
                axios.get('/api/live/active', { headers: { 'x-auth-token': token } })
            ]);
            setUpcoming(upcomingRes.data);
            setActive(activeRes.data);
        } catch (err) {
            console.error('Failed to fetch classes', err);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/live/join/${id}`, {}, {
                headers: { 'x-auth-token': token }
            });
            window.open(res.data.meetingLink, '_blank');
            fetchClasses(); // Refresh to show joined status if needed
        } catch (err) {
            alert('Could not join class');
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-16 animate-fadeIn text-[var(--text)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">Live Classrooms</h1>
                    <p className="text-xs tracking-[6px] uppercase opacity-40 font-bold">Learn from masters in real-time</p>
                </div>
            </div>

            {/* LIVE NOW SECTION */}
            {active.length > 0 && (
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                        <h2 className="text-sm font-black uppercase tracking-[4px]">Happening Now</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {active.map(c => (
                            <div key={c._id} className="p-8 rounded-3xl border-2 border-red-500/20 bg-red-500/5 relative overflow-hidden group hover:border-red-500 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Video size={64} />
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Active Session</div>
                                        <h3 className="text-2xl font-black tracking-tight">{c.title}</h3>
                                        <p className="text-[10px] opacity-60 font-medium uppercase tracking-widest mt-1 flex items-center gap-2">
                                            Hosted by <span className="text-[var(--accent)]">{c.hostId?.name}</span> • {c.hostId?.institution_name}
                                        </p>
                                    </div>
                                    <p className="text-xs opacity-50 italic line-clamp-2">"{c.description}"</p>

                                    <button onClick={() => handleJoin(c._id)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] tracking-[4px] uppercase flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-900/20">
                                        <Play size={14} fill="currentColor" /> Enter Classroom
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* UPCOMING SECTION */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Calendar className="opacity-40" size={20} />
                    <h2 className="text-sm font-black uppercase tracking-[4px]">Scheduled Classes</h2>
                </div>

                {loading ? (
                    <div className="py-20 text-center opacity-30 tracking-[10px] uppercase text-[10px] animate-pulse">Syncing Calendar Feeds...</div>
                ) : upcoming.length === 0 ? (
                    <div className="py-20 text-center rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card)]">
                        <p className="text-[10px] opacity-30 uppercase tracking-[4px] font-bold">No upcoming classes scheduled</p>
                        <p className="text-[8px] opacity-20 uppercase tracking-[2px] mt-2 italic">Check back later for new sessions</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {upcoming.map(c => (
                            <div key={c._id} className="p-6 rounded-2xl border bg-[var(--bg-card2)] border-[var(--border)] flex flex-col md:flex-row items-start md:items-center justify-between group hover:bg-[var(--bg-card)] transition-all">
                                <div className="flex gap-6 items-center">
                                    <div className="w-14 h-14 rounded-2xl bg-accent/5 border border-accent/10 flex flex-col items-center justify-center text-accent">
                                        <span className="text-[10px] font-black uppercase">{new Date(c.startTime).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-lg font-black leading-none">{new Date(c.startTime).getDate()}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{c.title}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">{new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">•</span>
                                            <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold">{c.duration} Mins</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 md:mt-0 flex items-center gap-10">
                                    <div className="text-right hidden md:block">
                                        <div className="text-[9px] tracking-widest uppercase opacity-30 font-bold">Instructor</div>
                                        <div className="text-[10px] font-black uppercase">{c.hostId?.name}</div>
                                    </div>
                                    <button disabled className="px-6 py-2.5 border border-[var(--border)] rounded-xl text-[9px] font-black tracking-widest uppercase opacity-30">
                                        Closed
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* INFORMATION BANNER */}
            <div className="p-8 rounded-3xl bg-accent/5 border border-accent/10 flex items-start gap-6">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <Info size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest mb-2">Classroom Guidelines</h3>
                    <ul className="text-xs space-y-2 opacity-50 list-disc pl-4 italic">
                        <li>Sessions open 15 minutes before the scheduled start time.</li>
                        <li>Ensure your camera and microphone are calibrated during the session.</li>
                        <li>Automated attendance is recorded upon entry.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

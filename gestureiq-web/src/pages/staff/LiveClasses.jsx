import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Video,
    Plus,
    Play,
    Trash2,
    Clock,
    ExternalLink,
    Users,
    CheckCircle2,
    X,
    Calendar,
    Settings,
    Layers
} from 'lucide-react';

export default function StaffLiveClasses() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        title: '',
        description: '',
        startTime: '',
        duration: 60,
        meetingLink: ''
    });

    useEffect(() => {
        fetchMyClasses();
    }, []);

    const fetchMyClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/live/my-hosting', {
                headers: { 'x-auth-token': token }
            });
            setClasses(res.data);
        } catch (err) {
            console.error('Failed to fetch classes', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/live/create', form, {
                headers: { 'x-auth-token': token }
            });
            setShowModal(false);
            setForm({ title: '', description: '', startTime: '', duration: 60, meetingLink: '' });
            fetchMyClasses();
        } catch (err) {
            alert('Creation failed');
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/live/status/${id}`, { status }, {
                headers: { 'x-auth-token': token }
            });
            fetchMyClasses();
        } catch (err) {
            alert('Status update failed');
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-12 animate-fadeIn text-[var(--text)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border)] pb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">Live Session Portal</h1>
                    <p className="text-xs tracking-[6px] uppercase opacity-40 font-bold">Manage your virtual classrooms</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-3 px-8 py-4 bg-accent text-white rounded-2xl font-bold text-[11px] tracking-[4px] uppercase hover:scale-[1.02] shadow-xl shadow-accent/20 transition-all">
                    <Plus size={18} /> Schedule Session
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="py-20 text-center opacity-30 tracking-[10px] uppercase text-[10px] animate-pulse">Syncing Scheduled Data...</div>
                ) : classes.length === 0 ? (
                    <div className="py-32 text-center rounded-3xl border-4 border-dashed border-[var(--border)] bg-[var(--bg-card)]">
                        <Video size={48} className="mx-auto mb-6 opacity-10" />
                        <h3 className="text-lg font-bold opacity-30 uppercase tracking-widest">No Sessions Found</h3>
                        <p className="text-[10px] opacity-20 uppercase tracking-[4px] mt-2 italic">Start by scheduling your first Bharatanatyam class</p>
                    </div>
                ) : classes.map((c) => (
                    <div key={c._id} className="p-8 rounded-3xl border bg-[var(--bg-card2)] border-[var(--border)] relative overflow-hidden group transition-all hover:bg-[var(--bg-card)]">
                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-current ${c.status === 'active' ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-blue-500/10 text-blue-500 opacity-60'}`}>
                                        {c.status}
                                    </div>
                                    <div className="text-[10px] opacity-40 font-bold tracking-widest flex items-center gap-2">
                                        <Clock size={12} /> {c.duration} MINS
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{c.title}</h2>
                                    <p className="text-[10px] opacity-40 mt-1 uppercase tracking-widest flex items-center gap-2 font-bold">
                                        <Calendar size={12} /> {new Date(c.startTime).toLocaleString()}
                                    </p>
                                </div>
                                <p className="text-xs opacity-50 max-w-2xl italic">"{c.description || 'No description provided'}"</p>
                            </div>

                            <div className="flex items-center gap-3">
                                {c.status === 'scheduled' && (
                                    <button onClick={() => updateStatus(c._id, 'active')} className="px-8 py-3 bg-accent text-white rounded-xl text-[9px] font-bold tracking-[3px] uppercase flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-accent/20">
                                        <Play size={12} fill="currentColor" /> Go Live
                                    </button>
                                )}
                                {c.status === 'active' && (
                                    <>
                                        <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className="px-8 py-3 border-2 border-accent text-accent rounded-xl text-[9px] font-bold tracking-[3px] uppercase flex items-center gap-3 hover:bg-accent hover:text-white transition-all">
                                            <ExternalLink size={12} /> Enter Studio
                                        </a>
                                        <button onClick={() => updateStatus(c._id, 'completed')} className="px-8 py-3 bg-green-600 text-white rounded-xl text-[9px] font-bold tracking-[3px] uppercase flex items-center gap-3 hover:opacity-90 transition-all shadow-lg shadow-green-900/20">
                                            <CheckCircle2 size={12} /> End Session
                                        </button>
                                    </>
                                )}
                                {c.status === 'completed' && (
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-[9px] font-black uppercase text-green-500 tracking-widest flex items-center gap-2">
                                            <CheckCircle2 size={12} /> Session Finished
                                        </div>
                                        <div className="text-[8px] opacity-40 tracking-widest uppercase font-bold">
                                            {c.attendees?.length || 0} Students Attended
                                        </div>
                                    </div>
                                )}
                                {c.status === 'scheduled' && (
                                    <button onClick={() => updateStatus(c._id, 'cancelled')} className="p-3 opacity-20 hover:opacity-100 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 rounded-xl">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Scheduling */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                        <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 opacity-40 hover:opacity-100 transition-all"><X size={24} /></button>

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                <Video />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight uppercase">Schedule New Studio Session</h3>
                                <p className="text-[9px] tracking-[4px] uppercase opacity-40 font-bold">Prepare your virtual Bharatanatyam stage</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] tracking-widest uppercase font-black opacity-40">Class Title</label>
                                    <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-accent transition-all" placeholder="e.g. Masterclass: Alapadma Mudra" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] tracking-widest uppercase font-black opacity-40">Meeting Link (Zoom/Jitsi)</label>
                                    <input required type="url" value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-accent transition-all" placeholder="https://meet.jit.si/..." />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] tracking-widest uppercase font-black opacity-40">Description</label>
                                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-accent transition-all resize-none" placeholder="What will students learn in this session?" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] tracking-widest uppercase font-black opacity-40">Start Date & Time</label>
                                    <input required type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-accent transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] tracking-widest uppercase font-black opacity-40">Duration (Minutes)</label>
                                    <select value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-accent transition-all">
                                        <option value={30}>30 Minutes</option>
                                        <option value={45}>45 Minutes</option>
                                        <option value={60}>60 Minutes</option>
                                        <option value={90}>90 Minutes</option>
                                        <option value={120}>120 Minutes</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button type="submit" className="w-full py-5 bg-accent text-white rounded-2xl font-black text-xs tracking-[6px] uppercase hover:scale-[1.01] shadow-2xl shadow-accent/30 transition-all">
                                    Seal & Broadcast Session
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

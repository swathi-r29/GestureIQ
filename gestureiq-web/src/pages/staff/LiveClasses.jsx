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
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 text-[var(--text)] pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[var(--border)] pb-12 px-2">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-3">Studio Broadcast</h1>
                    <p className="text-[10px] tracking-[6px] uppercase opacity-40 font-black">Virtual Stage Management Protocol</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-3 px-10 py-5 bg-accent text-white rounded-[20px] font-black text-[10px] tracking-[4px] uppercase hover:scale-[1.02] active:scale-95 shadow-2xl shadow-accent/40 transition-all">
                    <Plus size={18} /> Seal New Session
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {loading ? (
                    <div className="py-24 text-center opacity-30 tracking-[12px] font-black uppercase text-[10px] animate-pulse">Synchronizing Data...</div>
                ) : classes.length === 0 ? (
                    <div className="py-40 text-center rounded-[40px] border-[3px] border-dashed border-[var(--border)] bg-[var(--bg-card)]">
                        <Video size={56} className="mx-auto mb-8 opacity-10" />
                        <h3 className="text-lg font-black opacity-30 uppercase tracking-[6px]">No Active Broadcasts</h3>
                        <p className="text-[10px] opacity-20 uppercase tracking-[4px] mt-4 italic font-bold">Start by scheduling your first Bharatanatyam class</p>
                    </div>
                ) : classes.map((c) => (
                    <div key={c._id} className="p-10 rounded-[35px] border shadow-sm bg-[var(--bg-card)] border-[var(--border)] relative overflow-hidden group transition-all hover:bg-[var(--bg-card2)] hover:shadow-2xl hover:border-accent/20">
                        <div className="flex flex-col md:flex-row gap-10 items-start md:items-center justify-between">
                            <div className="flex-1 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-current ${c.status === 'active' ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-[var(--bg)] text-accent opacity-60'}`}>
                                        {c.status}
                                    </div>
                                    <div className="text-[9px] opacity-40 font-black tracking-widest flex items-center gap-2 uppercase">
                                        <Clock size={14} /> {c.duration} MINUTES
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter">{c.title}</h2>
                                    <p className="text-[10px] opacity-40 mt-3 uppercase tracking-[4px] flex items-center gap-2 font-black">
                                        <Calendar size={14} /> {new Date(c.startTime).toLocaleString()}
                                    </p>
                                </div>
                                <p className="text-sm opacity-50 max-w-2xl font-medium leading-relaxed italic border-l-2 border-accent/20 pl-4">"{c.description || 'No description provided'}"</p>
                            </div>

                            <div className="flex items-center gap-4">
                                {c.status === 'scheduled' && (
                                    <button onClick={() => updateStatus(c._id, 'active')} className="px-10 py-4 bg-accent text-white rounded-[18px] text-[10px] font-black tracking-[4px] uppercase flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/30">
                                        <Play size={14} fill="currentColor" /> Initiate
                                    </button>
                                )}
                                {c.status === 'active' && (
                                    <>
                                        <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className="px-10 py-4 border-2 border-accent text-accent rounded-[18px] text-[10px] font-black tracking-[4px] uppercase flex items-center gap-3 hover:bg-accent hover:text-white transition-all shadow-xl shadow-accent/10">
                                            <ExternalLink size={14} /> Enter Room
                                        </a>
                                        <button onClick={() => updateStatus(c._id, 'completed')} className="px-10 py-4 bg-emerald-600 text-white rounded-[18px] text-[10px] font-black tracking-[4px] uppercase flex items-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-emerald-900/30">
                                            <CheckCircle2 size={14} /> Terminate
                                        </button>
                                    </>
                                )}
                                {c.status === 'completed' && (
                                    <div className="flex flex-col items-end gap-2 pr-4">
                                        <div className="text-[10px] font-black uppercase text-emerald-500 tracking-[3px] flex items-center gap-2 bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/10">
                                            <CheckCircle2 size={14} /> Archived
                                        </div>
                                        <div className="text-[9px] opacity-40 tracking-[2px] uppercase font-black">
                                            {c.attendees?.length || 0} Students Verified
                                        </div>
                                    </div>
                                )}
                                {c.status === 'scheduled' && (
                                    <button onClick={() => updateStatus(c._id, 'cancelled')} className="p-4 opacity-10 hover:opacity-100 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 rounded-2xl hover:bg-red-500/5">
                                        <X size={24} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Scheduling */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[40px] p-12 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
                        <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 opacity-20 hover:opacity-100 transition-all hover:scale-110"><X size={28} /></button>

                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-inner">
                                <Video size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter uppercase mb-1">New Broadcast Slot</h3>
                                <p className="text-[9px] tracking-[5px] uppercase opacity-40 font-black">Prepare the digital Bharatanatyam stage</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] tracking-[4px] uppercase font-black opacity-30 ml-2">Broadcast Title</label>
                                    <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-2xl p-5 text-sm font-black focus:outline-none focus:border-accent transition-all shadow-inner" placeholder="e.g. Masterclass: Alapadma" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] tracking-[4px] uppercase font-black opacity-30 ml-2">Studio URL</label>
                                    <input required type="url" value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-2xl p-5 text-sm font-black focus:outline-none focus:border-accent transition-all shadow-inner" placeholder="https://meet.jit.si/..." />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] tracking-[4px] uppercase font-black opacity-30 ml-2">Class Manifesto</label>
                                <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-2xl p-5 text-sm font-black focus:outline-none focus:border-accent transition-all resize-none shadow-inner" placeholder="Define the objectives of this session..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] tracking-[4px] uppercase font-black opacity-30 ml-2">Execution Timestamp</label>
                                    <input required type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-2xl p-5 text-sm font-black focus:outline-none focus:border-accent transition-all shadow-inner select-none" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] tracking-[4px] uppercase font-black opacity-30 ml-2">Temporal Duration</label>
                                    <select value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} className="w-full bg-[var(--bg-card2)] border border-[var(--border)] rounded-2xl p-5 text-sm font-black focus:outline-none focus:border-accent transition-all shadow-inner cursor-pointer appearance-none">
                                        <option value={30}>30 Minutes</option>
                                        <option value={45}>45 Minutes</option>
                                        <option value={60}>60 Minutes</option>
                                        <option value={90}>90 Minutes</option>
                                        <option value={120}>120 Minutes</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-8">
                                <button type="submit" className="w-full py-6 bg-accent text-white rounded-[25px] font-black text-[11px] tracking-[8px] uppercase hover:scale-[1.01] active:scale-95 shadow-[0_20px_40px_-5px_var(--accent)] transition-all">
                                    Broadcast to Academy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

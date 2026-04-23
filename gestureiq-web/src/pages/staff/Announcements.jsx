import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Megaphone,
    Send,
    Search,
    Plus,
    Clock,
    Eye,
    Trash2,
    Users,
    Layout,
    AlertTriangle,
    Info,
    CheckCircle2,
    Filter,
    Loader2
} from 'lucide-react';

const AnnouncementItem = ({ id, title, message, date, priority, target, reads, onDelete }) => {
    const getPriorityStyle = (p) => {
        switch (p) {
            case 'Urgent': return 'bg-red-500 text-white border-red-500';
            case 'Important': return 'opacity-100 border-accent/20';
            default: return 'opacity-60 border-border';
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="rounded-2xl border p-8 transition-all group relative overflow-hidden shadow-sm"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onDelete(id)}
                    className="p-2 opacity-40 hover:opacity-100 hover:text-red-400 transition-all rounded-lg">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="flex items-start gap-6">
                <div className={`p-4 rounded-xl flex-shrink-0 transition-all duration-500 ${priority === 'Urgent' ? 'bg-red-500 shadow-xl shadow-red-500/20' : ''}`}
                    style={priority !== 'Urgent' ? { backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' } : { color: 'white' }}>
                    <Megaphone size={24} />
                </div>
                <div className="flex-1 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <h3 className="font-black text-lg leading-tight uppercase tracking-tight" style={{ color: 'var(--text)' }}>{title}</h3>
                        <div className="flex gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-[2px] px-3 py-1 rounded-full border ${getPriorityStyle(priority)}`}
                                style={priority === 'Important' ? { color: 'var(--accent)', backgroundColor: 'var(--bg-card2)' } : {}}>
                                {priority}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[2px] px-3 py-1 rounded-full border"
                                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                                {target}
                            </span>
                        </div>
                    </div>
                    <p className="text-sm leading-relaxed max-w-2xl opacity-70 font-medium" style={{ color: 'var(--text)' }}>{message}</p>

                    <div className="flex items-center gap-8 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={14} />
                            {formatDate(date)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-muted)' }}>
                            <Eye size={14} />
                            {reads} Reads
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Announcements = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        priority: 'Normal',
        target: 'All Students'
    });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/staff/announcements', {
                headers: { 'x-auth-token': token }
            });
            setHistory(res.data);
        } catch (err) {
            console.error('Error fetching announcements:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.message) return;
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/staff/announcements', formData, {
                headers: { 'x-auth-token': token }
            });
            setHistory([res.data, ...history]);
            setFormData({ title: '', message: '', priority: 'Normal', target: 'All Students' });
        } catch (err) {
            console.error('Error posting announcement:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/staff/announcement/${id}`, {
                headers: { 'x-auth-token': token }
            });
            setHistory(history.filter(ann => (ann._id || ann.id) !== id));
        } catch (err) {
            console.error('Error deleting announcement:', err);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="px-2">
                <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Announcements</h1>
                <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-40" style={{ color: 'var(--text-muted)' }}>Broadcast important updates and notices to your students</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Create Announcement Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-3xl border p-8 sticky top-10 shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h2 className="text-sm font-black tracking-[4px] uppercase mb-8 flex items-center gap-4"
                            style={{ color: 'var(--text)' }}>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                                <Megaphone size={20} />
                            </div>
                            New Broadcast
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50 block" style={{ color: 'var(--text-muted)' }}>Subject Title</label>
                                <input type="text" placeholder="Subject..."
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-2xl px-5 py-4 text-sm border focus:outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50 block" style={{ color: 'var(--text-muted)' }}>Message Body</label>
                                <textarea rows="4" placeholder="Compose message..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full rounded-2xl px-5 py-4 text-sm border resize-none focus:outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50 block" style={{ color: 'var(--text-muted)' }}>Priority</label>
                                    <select 
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest border focus:outline-none appearance-none"
                                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                        <option>Normal</option>
                                        <option>Important</option>
                                        <option>Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50 block" style={{ color: 'var(--text-muted)' }}>Send To</label>
                                    <select 
                                        value={formData.target}
                                        onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                        className="w-full rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest border focus:outline-none appearance-none"
                                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                        <option>All Students</option>
                                        <option>Beginners</option>
                                        <option>Intermediate</option>
                                    </select>
                                </div>
                            </div>
                            <button 
                                onClick={handleSubmit}
                                disabled={submitting || !formData.title || !formData.message}
                                className="w-full py-5 text-white rounded-2xl font-black text-[10px] tracking-[4px] uppercase shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 15px 30px -10px var(--accent)' }}>
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
                                Send Update
                            </button>
                        </div>
                    </div>
                </div>

                {/* History Feed */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-black tracking-[4px] uppercase" style={{ color: 'var(--text)' }}>Message History</h2>
                        <div className="flex gap-3">
                            <button className="p-2.5 rounded-xl border opacity-40 hover:opacity-100 transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}><Search size={18} /></button>
                            <button className="p-2.5 rounded-xl border opacity-40 hover:opacity-100 transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}><Filter size={18} /></button>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-20 opacity-30">
                                <Loader2 size={40} className="animate-spin" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-20 rounded-3xl border border-dashed opacity-30" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                <Megaphone size={40} className="mx-auto mb-4" />
                                <p className="text-[10px] font-bold uppercase tracking-[4px]">No announcements yet</p>
                            </div>
                        ) : (
                            history.map((ann) => (
                                <AnnouncementItem 
                                    key={ann._id || ann.id} 
                                    id={ann._id || ann.id}
                                    title={ann.title}
                                    message={ann.message}
                                    date={ann.createdAt}
                                    priority={ann.priority}
                                    target={ann.target}
                                    reads={ann.reads}
                                    onDelete={handleDelete}
                                />
                            ))
                        )}
                    </div>
                    {history.length > 5 && (
                        <button className="w-full py-10 text-[10px] font-black tracking-[6px] uppercase border border-dashed rounded-3xl opacity-30 hover:opacity-100 transition-all"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                            Load Older Broadcasts
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Announcements;

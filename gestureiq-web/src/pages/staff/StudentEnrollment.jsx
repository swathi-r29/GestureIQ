import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    UserPlus,
    CheckCircle2,
    XCircle,
    Mail,
    Link as LinkIcon,
    Trash2,
    Search,
    Filter,
    ExternalLink,
    Users,
    Clock,
    ChevronRight,
    ShieldCheck,
    UserCheck,
    Loader2
} from 'lucide-react';

const EnrollmentRequest = ({ id, name, email, date, level, onApprove, onReject }) => (
    <div className="p-8 hover:bg-[var(--bg-card2)] transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-8 border-b border-[var(--border)] last:border-0"
        style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border shadow-inner transition-transform group-hover:scale-110"
                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)', borderColor: 'var(--border)' }}>
                {name ? name[0] : '?'}
            </div>
            <div>
                <h3 className="text-lg font-black tracking-tighter uppercase" style={{ color: 'var(--text)' }}>{name}</h3>
                <p className="text-xs mt-1 lowercase font-medium opacity-40" style={{ color: 'var(--text)' }}>{email}</p>
                <div className="flex items-center gap-3 mt-3">
                    <span className="text-[9px] font-black uppercase tracking-[2px] px-3 py-1 rounded-lg border"
                        style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                        Joined: {new Date(date).toLocaleDateString()}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[2px] px-3 py-1 rounded-lg border"
                        style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)', borderColor: 'var(--border)' }}>
                        {level}
                    </span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => onApprove(id)}
                className="flex-1 sm:flex-none py-4 px-8 bg-accent text-white rounded-2xl text-[10px] font-black tracking-[3px] uppercase transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95">
                <CheckCircle2 size={16} /> Approve
            </button>
            <button 
                onClick={() => onReject(id)}
                className="flex-1 sm:flex-none py-4 px-8 border rounded-2xl text-[10px] font-black tracking-[3px] uppercase transition-all flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95"
                style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <XCircle size={16} /> Reject
            </button>
        </div>
    </div>
);

const StudentEnrollment = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pending, setPending] = useState([]);
    const [verified, setVerified] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [pendingRes, verifiedRes] = await Promise.all([
                axios.get('/api/staff/enrollment/pending', { headers: { 'x-auth-token': token } }),
                axios.get('/api/staff/enrollment/verified', { headers: { 'x-auth-token': token } })
            ]);
            setPending(pendingRes.data);
            setVerified(verifiedRes.data);
        } catch (err) {
            console.error('Failed to fetch enrollment data');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/staff/enrollment/${id}/approve`, {}, {
                headers: { 'x-auth-token': token }
            });
            fetchData();
        } catch (err) {
            alert('Approval failed');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this student?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/staff/enrollment/${id}/reject`, {}, {
                headers: { 'x-auth-token': token }
            });
            fetchData();
        } catch (err) {
            alert('Rejection failed');
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border)] pb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-3" style={{ color: 'var(--text)' }}>Enrollment Console</h1>
                    <p className="text-[10px] tracking-[6px] uppercase opacity-40 font-black">Manage Academy Candidate Protocols</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Main List Management */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center gap-2 p-1.5 border rounded-2xl w-fit shadow-inner"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[3px] transition-all ${activeTab === 'pending' ? 'bg-accent text-white shadow-2xl shadow-accent/30' : 'opacity-40 hover:opacity-100'}`} style={{ color: activeTab === 'pending' ? 'white' : 'var(--text)' }}
                        >
                            Pending ({pending.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[3px] transition-all ${activeTab === 'active' ? 'bg-accent text-white shadow-2xl shadow-accent/30' : 'opacity-40 hover:opacity-100'}`} style={{ color: activeTab === 'active' ? 'white' : 'var(--text)' }}
                        >
                            All Verified ({verified.length})
                        </button>
                    </div>

                    <div className="border rounded-[35px] overflow-hidden shadow-sm min-h-[400px] flex flex-col"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center opacity-20">
                                <Loader2 size={40} className="animate-spin" />
                            </div>
                        ) : activeTab === 'pending' ? (
                            pending.length > 0 ? (
                                pending.map((req) => (
                                    <EnrollmentRequest 
                                        key={req._id} 
                                        id={req._id}
                                        name={req.name}
                                        email={req.email}
                                        date={req.createdAt}
                                        level={req.experience_level || 'Beginner'}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                    />
                                ))
                            ) : (
                                <div className="p-20 text-center opacity-30 font-black text-[10px] uppercase tracking-[6px]">No pending protocols found</div>
                            )
                        ) : (
                            verified.length > 0 ? (
                                verified.map((req) => (
                                    <div key={req._id} className="p-8 border-b border-[var(--border)] last:border-0 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold">
                                                {req.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold uppercase text-xs" style={{ color: 'var(--text)' }}>{req.name}</p>
                                                <p className="text-[10px] opacity-40" style={{ color: 'var(--text)' }}>{req.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Verified</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-24 text-center space-y-8">
                                    <Users size={56} className="mx-auto opacity-10" />
                                    <div>
                                        <p className="text-lg font-black tracking-tighter mb-2" style={{ color: 'var(--text)' }}>0 Verified Students</p>
                                        <p className="text-[10px] font-black opacity-30 uppercase tracking-[4px]">Active Enrollment Database</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Invite Sidebar */}
                <div className="space-y-8">
                    <div className="rounded-[40px] p-10 space-y-8 relative overflow-hidden shadow-2xl shadow-accent/20 border"
                        style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #4a0404 100%)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />

                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md flex items-center justify-center rounded-[25px] text-white border border-white/20 shadow-2xl mx-auto">
                            <LinkIcon size={36} />
                        </div>
                        <div className="text-center space-y-3">
                            <h3 className="text-white font-black text-xl uppercase tracking-tighter">Direct Invitation</h3>
                            <p className="text-white/50 text-[10px] font-black uppercase tracking-[3px] leading-relaxed">
                                Generate Secure Access Tokens
                            </p>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-white/10">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-white/40 uppercase tracking-[4px] ml-2">Temporal Limit</label>
                                <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none cursor-pointer hover:bg-white/10 transition-all appearance-none">
                                    <option className="bg-neutral-900">24 Hours</option>
                                    <option className="bg-neutral-900">7 Days</option>
                                    <option className="bg-neutral-900">Permanent</option>
                                </select>
                            </div>
                            <button className="w-full py-5 bg-white rounded-2xl font-black text-[10px] uppercase tracking-[4px] hover:shadow-[0_20px_40px_-5px_rgba(255,255,255,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3"
                                style={{ color: 'var(--accent)' }}>
                                Seal Invite Token <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="border rounded-[35px] p-8 space-y-8 shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h3 className="text-[9px] font-black uppercase tracking-[4px] flex items-center gap-3 opacity-40 px-2" style={{ color: 'var(--text)' }}>
                            <ShieldCheck className="text-emerald-500" size={18} /> Enrollment Protocol
                        </h3>
                        <div className="space-y-5">
                            {[
                                { label: 'Expansion rate', value: '+12%', color: '#10b981' },
                                { label: 'Retention cycle', value: '94%', color: 'var(--accent)' },
                                { label: 'Dropout factor', value: '2.1%', color: '#f59e0b' },
                            ].map(stat => (
                                <div key={stat.label} className="flex items-center justify-between border-b border-[var(--border)] pb-4 last:border-0 last:pb-0 px-2">
                                    <span className="text-[9px] font-black uppercase tracking-[2px] opacity-40" style={{ color: 'var(--text)' }}>{stat.label}</span>
                                    <span className="text-sm font-black tracking-tight" style={{ color: stat.color }}>{stat.value}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] leading-relaxed italic opacity-20 px-2 text-center" style={{ color: 'var(--text)' }}>
                            * Analytic nodes synchronized 24 hours ago.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentEnrollment;

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users,
    CheckCircle,
    XCircle,
    AlertCircle,
    Search,
    Clock,
    ShieldAlert,
    MoreVertical,
    Check,
    X
} from 'lucide-react';

export default function StaffApprovals() {
    const [activeTab, setActiveTab] = useState('pending');
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchStaff();
    }, [activeTab]);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = activeTab === 'pending' ? '/api/admin/staff/pending' : '/api/admin/staff/all';
            const res = await axios.get(endpoint, {
                headers: { 'x-auth-token': token }
            });
            setStaff(res.data);
        } catch (err) {
            console.error('Failed to fetch staff', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/staff/approve', { staffId: id }, {
                headers: { 'x-auth-token': token }
            });
            fetchStaff();
        } catch (err) {
            alert('Action failed');
        }
    };

    const handleReject = async () => {
        if (!rejectReason) return alert('Please provide a reason');
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/staff/reject', { staffId: rejectingId, reason: rejectReason }, {
                headers: { 'x-auth-token': token }
            });
            setRejectingId(null);
            setRejectReason('');
            fetchStaff();
        } catch (err) {
            alert('Action failed');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/staff/status', { staffId: id, status }, {
                headers: { 'x-auth-token': token }
            });
            fetchStaff();
        } catch (err) {
            alert('Action failed');
        }
    };

    const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.institution_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const StatusBadge = ({ status }) => {
        const styles = {
            pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock },
            approved: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle },
            rejected: { bg: 'bg-red-500/10', text: 'text-red-500', icon: XCircle },
            suspended: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: ShieldAlert }
        };
        const style = styles[status] || styles.pending;
        return (
            <div className={`px-3 py-1 rounded-full ${style.bg} ${style.text} text-[8px] font-bold tracking-widest uppercase flex items-center gap-2 border border-current w-fit`}>
                <style.icon size={10} /> {status}
            </div>
        );
    };

    return (
        <div className="space-y-10 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Staff Approvals</h1>
                    <p className="text-xs tracking-widest uppercase opacity-50" style={{ color: 'var(--text-muted)' }}>Validate and manage platform educators</p>
                </div>

                <div className="flex gap-2 p-1 rounded-2xl border w-fit" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                    <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 rounded-xl text-[10px] tracking-[3px] uppercase font-bold transition-all ${activeTab === 'pending' ? 'bg-accent text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                        Pending Req.
                    </button>
                    <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 rounded-xl text-[10px] tracking-[3px] uppercase font-bold transition-all ${activeTab === 'all' ? 'bg-accent text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>
                        Staff Logs
                    </button>
                </div>
            </div>

            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={16} />
                <input
                    type="text"
                    placeholder="Search by name, email or institution..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-4 py-3 text-sm border focus:outline-none transition-all shadow-sm"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
            </div>

            <div className="rounded-3xl border overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <table className="w-full text-left">
                    <thead className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <tr className="text-[10px] tracking-widest uppercase opacity-40">
                            <th className="p-6">Instructor Details</th>
                            <th className="p-6">Institution / Contact</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {loading ? (
                            <tr><td colSpan="4" className="p-20 text-center text-[10px] tracking-widest opacity-30 uppercase animate-pulse">Scanning DB...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="4" className="p-20 text-center text-[10px] tracking-widest opacity-30 uppercase italic">No records found</td></tr>
                        ) : filtered.map((s) => (
                            <tr key={s._id} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center font-black text-accent">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs" style={{ color: 'var(--text)' }}>{s.name}</div>
                                            <div className="text-[10px] opacity-40">{s.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="text-[10px] font-bold tracking-tight">{s.institution_name}</div>
                                    <div className="text-[10px] opacity-40">{s.contact_number}</div>
                                </td>
                                <td className="p-6">
                                    <StatusBadge status={s.status} />
                                    {s.status === 'rejected' && s.rejectionReason && (
                                        <div className="mt-2 text-[8px] italic opacity-40 max-w-[150px] truncate" title={s.rejectionReason}>
                                            Reason: {s.rejectionReason}
                                        </div>
                                    )}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        {s.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleApprove(s._id)} className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all border border-green-500/20 shadow-sm" title="Approve">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => setRejectingId(s._id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20 shadow-sm" title="Reject">
                                                    <X size={16} />
                                                </button>
                                            </>
                                        )}
                                        {s.status === 'approved' && (
                                            <button onClick={() => handleStatusUpdate(s._id, 'suspended')} className="text-[9px] tracking-widest uppercase font-bold text-gray-400 hover:text-red-500 transition-colors">
                                                Suspend
                                            </button>
                                        )}
                                        {s.status === 'suspended' && (
                                            <button onClick={() => handleStatusUpdate(s._id, 'approved')} className="text-[9px] tracking-widest uppercase font-bold text-green-500">
                                                Reactivate
                                            </button>
                                        )}
                                        {s.status === 'rejected' && (
                                            <button onClick={() => handleApprove(s._id)} className="text-[9px] tracking-widest uppercase font-bold text-accent">
                                                Re-Approve
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Rejection Modal */}
            {rejectingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md rounded-3xl p-8 border shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <AlertCircle className="text-red-500" />
                            <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>Reject Registration</h3>
                        </div>
                        <p className="text-[10px] tracking-widest uppercase mb-4 opacity-50" style={{ color: 'var(--text-muted)' }}>Reason for Rejection</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full rounded-xl p-4 text-xs border focus:outline-none resize-none mb-8"
                            style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                            rows={4}
                            placeholder="Provide a detailed reason so the instructor knows why..."
                        />
                        <div className="flex flex-col gap-3">
                            <button onClick={handleReject} className="w-full py-4 bg-red-600 text-white rounded-xl text-[10px] tracking-[4px] uppercase font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/20">
                                Confirm Rejection
                            </button>
                            <button onClick={() => setRejectingId(null)} className="w-full py-4 bg-black/5 dark:bg-white/5 rounded-xl text-[10px] tracking-[4px] uppercase font-bold opacity-50 hover:opacity-100 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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
    const [selectedStaff, setSelectedStaff] = useState(null);

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
                            <tr key={s._id} className="group hover:bg-black/2 transition-colors border-b" style={{ borderColor: 'var(--border)' }}>
                                <td className="p-6 align-top">
                                    <div className="flex items-start gap-4">
                                        {s.profile_image ? (
                                            <img 
                                                src={`${axios.defaults.baseURL || ''}${s.profile_image}`} 
                                                alt={s.name}
                                                className="w-14 h-14 rounded-xl object-cover border border-accent/20"
                                                onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + s.name; }}
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center font-black text-accent text-xl">
                                                {s.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-sm hover:underline cursor-pointer" style={{ color: 'var(--text)' }} onClick={() => setSelectedStaff(s)}>
                                                {s.name}
                                            </div>
                                            <div className="text-[10px] opacity-60 mb-2">{s.email}</div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[8px] font-bold uppercase tracking-wider">
                                                    {s.years_of_experience || 0} Yrs Exp
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md bg-copper/10 text-copper text-[8px] font-bold uppercase tracking-wider">
                                                    {s.institution_type || 'Instructor'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* BIO & SPECIALIZATION */}
                                    <div className="mt-4 p-4 rounded-xl bg-ivory-warm/30 border border-border/40 max-w-lg">
                                        <div className="text-[8px] uppercase tracking-widest text-muted mb-2 font-bold">Background / Bio</div>
                                        <p className="text-[11px] leading-relaxed opacity-80 italic line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                            "{s.bio || 'No bio provided.'}"
                                        </p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-accent uppercase tracking-tighter">Status:</span>
                                            <span className="text-[10px] font-medium opacity-70">{s.status}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 align-top">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-[8px] uppercase tracking-widest text-muted mb-1 font-bold">Institution</div>
                                            <div className="text-xs font-bold tracking-tight">{s.institution_name}</div>
                                            <div className="text-[10px] opacity-60">{s.location || 'Location unknown'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] uppercase tracking-widest text-muted mb-1 font-bold">Contact</div>
                                            <div className="text-[11px] font-medium">{s.contact_number}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 align-top">
                                    <div className="mt-1">
                                        <StatusBadge status={s.status} />
                                        {s.status === 'rejected' && s.rejectionReason && (
                                            <div className="mt-3 p-2 rounded bg-red-50 border border-red-100 text-[9px] italic text-red-600 max-w-[150px]">
                                                <strong>Reason:</strong> {s.rejectionReason}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-6 text-right align-top">
                                    <div className="flex justify-end gap-2 mt-1">
                                        {s.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleApprove(s._id)} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-900/20 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                                    <Check size={14} /> Approve
                                                </button>
                                                <button onClick={() => setRejectingId(s._id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-200 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                                    <X size={14} /> Deny
                                                </button>
                                            </>
                                        )}
                                        {s.status === 'approved' && (
                                            <button onClick={() => handleStatusUpdate(s._id, 'suspended')} className="px-3 py-1.5 border border-gray-200 rounded-lg text-[9px] tracking-widest uppercase font-bold text-gray-400 hover:text-red-500 hover:border-red-200 transition-all">
                                                Suspend Access
                                            </button>
                                        )}
                                        {s.status === 'suspended' && (
                                            <button onClick={() => handleStatusUpdate(s._id, 'approved')} className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-[9px] tracking-widest uppercase font-bold transition-all">
                                                Reactivate
                                            </button>
                                        )}
                                        {s.status === 'rejected' && (
                                            <button onClick={() => handleApprove(s._id)} className="px-3 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-lg text-[9px] tracking-widest uppercase font-bold transition-all">
                                                Review & Re-Approve
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

            {/* Profile Details Modal */}
            {selectedStaff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-2xl rounded-3xl overflow-hidden border shadow-2xl flex flex-col md:flex-row" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        {/* Sidebar with Image */}
                        <div className="md:w-1/3 bg-ivory-warm/40 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--border)' }}>
                            <div className="relative mb-6">
                                {selectedStaff.profile_image ? (
                                    <img 
                                        src={`${axios.defaults.baseURL || ''}${selectedStaff.profile_image}`} 
                                        alt={selectedStaff.name}
                                        className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl"
                                        onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + selectedStaff.name; }}
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-3xl bg-accent text-white flex items-center justify-center text-4xl font-black shadow-xl">
                                        {selectedStaff.name.charAt(0)}
                                    </div>
                                )}
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                                    <StatusBadge status={selectedStaff.status} />
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-center mb-1" style={{ color: 'var(--text)' }}>{selectedStaff.name}</h3>
                            <p className="text-[10px] tracking-[2px] uppercase opacity-40 font-bold mb-6">{selectedStaff.institution_type || 'Instructor'}</p>
                            
                            <div className="w-full space-y-4">
                                <div className="text-center">
                                    <div className="text-[9px] uppercase tracking-widest text-muted mb-1">Experience</div>
                                    <div className="text-sm font-bold text-accent">{selectedStaff.years_of_experience || 0} Years</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[9px] uppercase tracking-widest text-muted mb-1">Teaching Mode</div>
                                    <div className="text-sm font-bold text-copper">{selectedStaff.teaching_mode || 'Both'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="md:w-2/3 p-8 flex flex-col max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className="text-[10px] tracking-[4px] uppercase font-bold text-accent mb-2">Professional Profile</h4>
                                    <div className="text-2xl font-black italic" style={{ color: 'var(--text)' }}>Natya Credentials</div>
                                </div>
                                <button onClick={() => setSelectedStaff(null)} className="p-2 rounded-full hover:bg-black/5 opacity-40 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <div className="text-[10px] tracking-[2px] uppercase font-bold opacity-30 mb-3">Teaching Bio</div>
                                    <p className="text-sm leading-relaxed opacity-70 italic">
                                        "{selectedStaff.bio || 'The instructor has not provided a detailed bio yet.'}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <div className="text-[10px] tracking-[2px] uppercase font-bold opacity-30 mb-2">Institution</div>
                                        <div className="text-sm font-bold">{selectedStaff.institution_name}</div>
                                        <div className="text-xs opacity-50">{selectedStaff.location || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] tracking-[2px] uppercase font-bold opacity-30 mb-2">Contact</div>
                                        <div className="text-sm font-bold">{selectedStaff.contact_number}</div>
                                        <div className="text-xs opacity-50">{selectedStaff.email}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-8 flex gap-3">
                                {selectedStaff.status === 'pending' ? (
                                    <>
                                        <button onClick={() => { handleApprove(selectedStaff._id); setSelectedStaff(null); }} className="flex-1 py-4 bg-green-600 text-white rounded-xl text-[10px] tracking-[4px] uppercase font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-900/20">
                                            Approve User
                                        </button>
                                        <button onClick={() => { setRejectingId(selectedStaff._id); setSelectedStaff(null); }} className="px-6 py-4 bg-red-50 text-red-600 rounded-xl text-[10px] tracking-[4px] uppercase font-bold border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                                            Deny
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => setSelectedStaff(null)} className="w-full py-4 bg-charcoal text-white rounded-xl text-[10px] tracking-[4px] uppercase font-bold">
                                        Close Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

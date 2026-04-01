import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    GraduationCap,
    Search,
    Filter,
    User,
    Award,
    Calendar,
    MoreVertical,
    ChevronRight,
    X,
    FileJson,
    Trash2,
    RefreshCw,
    CheckCircle
} from 'lucide-react';

const MUDRA_COUNT = 28;

export default function StudentManagement() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        fetchStudents();
    }, [levelFilter]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/admin/students/all?search=${search}&level=${levelFilter}`, {
                headers: { 'x-auth-token': token }
            });
            setStudents(res.data);
        } catch (err) {
            console.error('Failed to fetch students', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (id) => {
        if (!window.confirm('Are you SURE? This will permanently wipe all progress for this student.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/student/reset-progress', { studentId: id }, {
                headers: { 'x-auth-token': token }
            });
            fetchStudents();
        } catch (err) {
            alert('Reset failed');
        }
    };

    const exportToCSV = () => {
        const headers = ["Name", "Email", "Level", "Mudras Mastered", "Joined Date"];
        const rows = students.map(s => [
            s.name,
            s.email,
            s.experience_level || 'Beginner',
            s.progress?.detectedMudras?.length || 0,
            new Date(s.createdAt).toLocaleDateString()
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "GestureIQ_Students.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-10 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Student Directory</h1>
                    <p className="text-xs tracking-widest uppercase opacity-50" style={{ color: 'var(--text-muted)' }}>Monitor progress and manage student lifecycle</p>
                </div>

                <button onClick={exportToCSV} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-accent/20 bg-accent/5 text-accent text-[10px] tracking-[3px] uppercase font-bold hover:bg-accent hover:text-white transition-all shadow-sm">
                    <FileJson size={14} /> Export CSV
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={16} />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={search}
                        onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl pl-12 pr-4 py-3 text-sm border focus:outline-none transition-all shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                </div>

                <div className="flex gap-2 p-1 rounded-xl border" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                    {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                        <button key={lvl} onClick={() => setLevelFilter(lvl)} className={`px-4 py-2 rounded-lg text-[9px] tracking-[2px] uppercase font-bold transition-all ${levelFilter === lvl ? 'bg-accent text-white shadow-sm' : 'opacity-40 hover:opacity-100'}`}>
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-3xl border overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <table className="w-full text-left">
                    <thead className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <tr className="text-[10px] tracking-widest uppercase opacity-40">
                            <th className="p-6">Student Information</th>
                            <th className="p-6">Experience Level</th>
                            <th className="p-6">Mastery Status</th>
                            <th className="p-6">Joined Date</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {loading ? (
                            <tr><td colSpan="5" className="p-20 text-center text-[10px] tracking-widest opacity-30 uppercase animate-pulse">Syncing Directory...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan="5" className="p-20 text-center text-[10px] tracking-widest opacity-30 uppercase italic">No students found</td></tr>
                        ) : students.map((s) => (
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
                                    <div className="px-3 py-1 rounded-full bg-accent/5 text-accent text-[8px] font-black tracking-widest uppercase border border-accent/10 w-fit">
                                        {s.experience_level || 'Beginner'}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                                            {s.progress?.detectedMudras?.length || 0} / {MUDRA_COUNT}
                                        </div>
                                        <div className="w-24 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-accent" style={{ width: `${((s.progress?.detectedMudras?.length || 0) / MUDRA_COUNT) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-[10px] opacity-40 font-mono">
                                    {new Date(s.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setSelectedStudent(s)} className="p-2.5 hover:bg-accent/10 text-accent rounded-xl transition-all" title="View Progress">
                                            <ChevronRight size={18} />
                                        </button>
                                        <button onClick={() => handleReset(s._id)} className="p-2.5 hover:bg-red-500/10 text-red-500 rounded-xl opacity-30 group-hover:opacity-100 transition-all" title="Reset Data">
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Progress Detailed Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-10 border shadow-2xl relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-8 right-8 text-muted hover:text-accent transition-colors">
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-6 mb-12">
                            <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-accent/20">
                                {selectedStudent.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{selectedStudent.name}</h3>
                                <p className="text-[10px] tracking-[6px] uppercase opacity-40" style={{ color: 'var(--text-muted)' }}>Mudra Mastery Breakdown</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {Array.from({ length: MUDRA_COUNT }).map((_, i) => {
                                const mIdx = i + 1;
                                const isMastered = selectedStudent.progress?.detectedMudras?.some(m => m.toLowerCase().includes(`mudra_${mIdx}`) || (i < 10 && selectedStudent.progress?.detectedMudras?.length > i)); // Approximation
                                return (
                                    <div key={i} className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${isMastered ? 'border-green-500/50 bg-green-500/5' : 'border-dashed opacity-20'}`}>
                                        <div className={`text-[10px] font-black ${isMastered ? 'text-green-500' : ''}`}>M{mIdx}</div>
                                        {isMastered && <CheckCircle size={12} className="text-green-500 mt-1" />}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-12 p-6 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Award className="text-accent" size={24} />
                                <div>
                                    <div className="text-xs font-bold" style={{ color: 'var(--text)' }}>Overall Proficiency</div>
                                    <div className="text-[10px] opacity-40 uppercase tracking-widest">{selectedStudent.experience_level || 'Beginner'} Stage</div>
                                </div>
                            </div>
                            <div className="text-3xl font-black text-accent">{Math.round(((selectedStudent.progress?.detectedMudras?.length || 0) / MUDRA_COUNT) * 100)}%</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

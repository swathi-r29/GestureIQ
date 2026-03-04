import React, { useState } from 'react';
import {
    Users,
    Search,
    Filter,
    MoreHorizontal,
    Trophy,
    Activity,
    Mail,
    Trash2,
    Eye,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';

const MyStudents = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('all');

    const students = [
        { id: 1, name: "Aravind Kumar", level: "Beginner", mudras: 12, avgScore: 84, lastActive: "2 hours ago", status: "active" },
        { id: 2, name: "Priya Sharma", level: "Intermediate", mudras: 22, avgScore: 91, lastActive: "Today", status: "active" },
        { id: 3, name: "Rahul Mehra", level: "Beginner", mudras: 8, avgScore: 65, lastActive: "Yesterday", status: "inactive" },
        { id: 4, name: "Sanya Gupta", level: "Advanced", mudras: 28, avgScore: 98, lastActive: "1 hour ago", status: "active" },
        { id: 5, name: "Vijay Deshmukh", level: "Intermediate", mudras: 18, avgScore: 78, lastActive: "3 days ago", status: "away" },
        { id: 6, name: "Meera Reddy", level: "Beginner", mudras: 15, avgScore: 82, lastActive: "Today", status: "active" },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'away': return '#f59e0b';
            case 'inactive': return '#6b7280';
            default: return '#6b7280';
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>My Students</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-40" style={{ color: 'var(--text-muted)' }}>Manage and track progress of your session participants</p>
                </div>
                <button className="px-8 py-4 text-white rounded-2xl font-black text-[10px] tracking-[4px] uppercase border transition-all hover:shadow-2xl flex items-center gap-3"
                    style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', boxShadow: '0 15px 30px -10px var(--accent)' }}>
                    <Mail size={18} />
                    Message All
                </button>
            </div>

            {/* Filters Area */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors opacity-30 group-focus-within:opacity-100" size={20} style={{ color: 'var(--accent)' }} />
                    <input
                        type="text"
                        placeholder="Search students by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl pl-14 pr-6 py-5 text-sm border focus:outline-none transition-all shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30" size={18} style={{ color: 'var(--text)' }} />
                        <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="rounded-2xl pl-14 pr-12 py-5 text-[10px] font-black uppercase tracking-widest border focus:outline-none appearance-none cursor-pointer shadow-sm"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        >
                            <option value="all">All Levels</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="rounded-3xl border overflow-hidden shadow-sm backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Student</th>
                                <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Level</th>
                                <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>Mastery</th>
                                <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>Accuracy</th>
                                <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Last Seen</th>
                                <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest text-right" style={{ color: 'var(--text-muted)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {students.map((student) => (
                                <tr key={student.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border transition-all group-hover:scale-110"
                                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                                    {student.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-4 rounded-full"
                                                    style={{ backgroundColor: getStatusColor(student.status), borderColor: 'var(--bg-card)' }} />
                                            </div>
                                            <span className="text-sm font-black tracking-tight" style={{ color: 'var(--text)' }}>{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                                            style={{
                                                backgroundColor: 'var(--bg-card2)',
                                                borderColor: 'var(--border)',
                                                color: student.level === 'Advanced' ? '#a855f7' : student.level === 'Intermediate' ? '#3b82f6' : '#14b8a6'
                                            }}>
                                            {student.level}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-center gap-2">
                                            <Trophy size={14} style={{ color: '#f59e0b' }} />
                                            <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{student.mudras}/28</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className="text-[10px] font-black" style={{ color: student.avgScore > 90 ? '#10b981' : '#f59e0b' }}>
                                                {student.avgScore}%
                                            </span>
                                            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                                <div className={`h-full ${student.avgScore > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${student.avgScore}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-[10px] font-black opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{student.lastActive}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center justify-end gap-3">
                                            <button className="p-3 rounded-xl border opacity-30 hover:opacity-100 transition-all"
                                                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} title="View Progress">
                                                <Eye size={18} />
                                            </button>
                                            <button className="p-3 rounded-xl border opacity-30 hover:opacity-100 transition-all hover:text-red-500"
                                                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} title="Remove Student">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                    <p className="text-[10px] font-black uppercase tracking-[2px] opacity-40" style={{ color: 'var(--text-muted)' }}>
                        Showing <span style={{ color: 'var(--text)' }}>1-6</span> of <span style={{ color: 'var(--text)' }}>152</span> students
                    </p>
                    <div className="flex gap-3">
                        <button className="p-3 rounded-xl border opacity-30 hover:opacity-100 disabled:opacity-10 transition-all"
                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                            <ChevronLeft size={18} />
                        </button>
                        <button className="p-3 rounded-xl border transition-all shadow-lg"
                            style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', color: 'white' }}>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyStudents;

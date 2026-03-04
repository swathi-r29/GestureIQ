import React, { useState } from 'react';
import {
    ClipboardList,
    Plus,
    Search,
    Calendar,
    Clock,
    Users,
    MoreVertical,
    CheckCircle2,
    Clock3,
    XCircle,
    AlertCircle,
    FileText
} from 'lucide-react';

const AssignmentCard = ({ title, mudras, deadline, submissions, status }) => (
    <div className="rounded-2xl border p-8 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-start mb-8">
            <div className="p-4 rounded-xl shadow-lg shadow-black/10 transition-all group-hover:scale-110"
                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                <FileText size={28} />
            </div>
            <button className="p-2 opacity-20 hover:opacity-100 transition-all">
                <MoreVertical size={20} style={{ color: 'var(--text)' }} />
            </button>
        </div>

        <div className="space-y-6">
            <div>
                <h3 className="font-black text-xl tracking-tight leading-tight" style={{ color: 'var(--text)' }}>{title}</h3>
                <div className="flex flex-wrap gap-2 mt-4">
                    {mudras.map(m => (
                        <span key={m} className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-current opacity-60"
                            style={{ color: 'var(--accent)' }}>
                            {m}
                        </span>
                    ))}
                </div>
            </div>

            <div className="pt-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[2px] opacity-40 ml-1" style={{ color: 'var(--text-muted)' }}>Deadline</p>
                    <div className="flex items-center gap-2 text-xs font-bold leading-none" style={{ color: 'var(--text)' }}>
                        <Calendar size={14} style={{ color: 'var(--accent)' }} />
                        {deadline}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xl font-black leading-none" style={{ color: 'var(--text)' }}>{submissions}%</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1" style={{ color: 'var(--text-muted)' }}>Completed</p>
                </div>
            </div>

            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                <div className="h-full transition-all duration-1000" style={{ width: `${submissions}%`, backgroundColor: 'var(--accent)' }} />
            </div>
        </div>
    </div>
);

const Assignments = () => {
    const [isCreating, setIsCreating] = useState(false);

    const assignments = [
        { title: "Single Hand Mudras Basics", mudras: ["Pataka", "Tripataka"], deadline: "Mar 10, 2026", submissions: 85 },
        { title: "Advanced Fluidity Test", mudras: ["Mayura", "Alapadma", "Hamsasya"], deadline: "Mar 15, 2026", submissions: 42 },
        { title: "Posture Correction Task", mudras: ["Mushti", "Shikhara"], deadline: "Mar 08, 2026", submissions: 98 },
    ];

    const submissions = [
        { id: 1, name: "Aravind Kumar", date: "Today, 14:20", score: 92, status: "passed" },
        { id: 2, name: "Priya Sharma", date: "Yesterday", score: 96, status: "passed" },
        { id: 3, name: "Rahul Mehra", date: "2 days ago", score: 45, status: "failed" },
        { id: 4, name: "Sanya Gupta", date: "Just now", score: 88, status: "pending" },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Practice Tasks</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-40" style={{ color: 'var(--text-muted)' }}>Create tasks for students to practice and track their progress</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-10 py-5 text-white rounded-2xl font-black text-[10px] tracking-[4px] uppercase border transition-all hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                    style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', boxShadow: '0 15px 30px -10px var(--accent)' }}
                >
                    <Plus size={20} />
                    Create Assignment
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Assignments List */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-black tracking-[4px] uppercase" style={{ color: 'var(--text)' }}>Active Tasks</h2>
                        <div className="flex gap-4 p-1 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                            <button className="px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: 'var(--accent)' }}>Recent</button>
                            <button className="px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all font-bold">Older</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {assignments.map((asgn, i) => (
                            <AssignmentCard key={i} {...asgn} />
                        ))}
                    </div>
                </div>

                {/* Real-time Submissions Feed */}
                <div className="space-y-8">
                    <h2 className="text-sm font-black tracking-[4px] uppercase px-2" style={{ color: 'var(--text)' }}>Latest Submissions</h2>
                    <div className="rounded-3xl border overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {submissions.map((sub) => (
                                <div key={sub.id} className="p-5 flex items-center gap-5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                    <div className="p-3 rounded-2xl flex-shrink-0 transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: 'var(--bg-card2)', color: sub.status === 'passed' ? '#10b981' : sub.status === 'failed' ? '#ef4444' : 'var(--accent)' }}>
                                        {sub.status === 'passed' ? <CheckCircle2 size={20} /> :
                                            sub.status === 'failed' ? <XCircle size={20} /> : <Clock3 size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black tracking-tight truncate" style={{ color: 'var(--text)' }}>{sub.name}</p>
                                        <p className="text-[9px] font-black uppercase tracking-[2px] opacity-40 mt-1" style={{ color: 'var(--text-muted)' }}>{sub.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black" style={{ color: sub.score > 80 ? '#10b981' : sub.score < 50 ? '#ef4444' : 'var(--text)' }}>
                                            {sub.score}%
                                        </p>
                                        <p className="text-[9px] font-bold uppercase tracking-tight opacity-40 mt-1" style={{ color: 'var(--text-muted)' }}>{sub.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl border relative overflow-hidden group shadow-sm transition-all hover:shadow-xl"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        {/* Interactive background shapes */}
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/5 blur-3xl rounded-full" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                                    <AlertCircle size={20} />
                                </div>
                                <h3 className="text-xs font-black tracking-[3px] uppercase" style={{ color: 'var(--text)' }}>Grading AI</h3>
                            </div>
                            <p className="text-[10px] font-bold tracking-tight opacity-50 leading-loose mb-8" style={{ color: 'var(--text-muted)' }}>
                                AI automatically grades submissions based on pose accuracy and duration. You can manually override any grade from the detailed view.
                            </p>
                            <button className="w-full py-4 rounded-xl text-[10px] font-black tracking-[4px] uppercase border transition-all hover:shadow-xl active:scale-95"
                                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                Manage Protocols
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Assignments;

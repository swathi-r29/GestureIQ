import React from 'react';
import {
    BarChart3,
    Download,
    Users,
    Clock,
    Target,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    FileSpreadsheet,
    FileJson
} from 'lucide-react';

const SummaryItem = ({ label, value, trend, trendType, icon: Icon }) => (
    <div className="rounded-2xl border p-8 transition-all shadow-sm"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                <Icon size={22} />
            </div>
            <span className="text-[10px] font-black opacity-40 uppercase tracking-[3px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
        <div className="flex items-end justify-between">
            <p className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{value}</p>
            <span className={`flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full border ${trendType === 'up' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-amber-500 border-amber-500/20 bg-amber-500/5'}`}>
                {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trend}
            </span>
        </div>
    </div>
);

const ClassReport = () => {
    const students = [
        { name: "Aravind Kumar", mudras: 12, avgScore: 88, bestScore: 94, duration: "58m" },
        { name: "Priya Sharma", mudras: 15, avgScore: 92, bestScore: 98, duration: "60m" },
        { name: "Rahul Mehra", mudras: 10, avgScore: 74, bestScore: 82, duration: "45m" },
        { name: "Sanya Gupta", mudras: 14, avgScore: 91, bestScore: 96, duration: "60m" },
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-4 mb-3">
                        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Class Analytics</h1>
                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border"
                            style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.05)' }}>GENERATED</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-40" style={{ color: 'var(--text-muted)' }}>Beginner Mudras Session 4 • March 3, 2026</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-4 rounded-xl text-[10px] font-black tracking-[4px] uppercase border transition-all hover:shadow-xl flex items-center gap-3"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                        <FileSpreadsheet size={18} /> CSV
                    </button>
                    <button className="px-8 py-4 text-white rounded-xl text-[10px] font-black tracking-[4px] uppercase border transition-all hover:shadow-2xl flex items-center gap-3"
                        style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', boxShadow: '0 15px 30px -10px var(--accent)' }}>
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <SummaryItem label="Attendance" value="48 / 50" trend="+12%" trendType="up" icon={Users} />
                <SummaryItem label="Avg Accuracy" value="82.4%" trend="+4.2%" trendType="up" icon={Target} />
                <SummaryItem label="Total Duration" value="62m 14s" trend="-2m" trendType="down" icon={Clock} />
                <SummaryItem label="Top Performance" value="Priya S." trend="98%" trendType="up" icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Performance Breakdown Table */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-sm font-black tracking-[4px] uppercase px-2" style={{ color: 'var(--text)' }}>Student breakdown</h2>
                    <div className="rounded-3xl border overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                                        <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Student</th>
                                        <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>Mudras</th>
                                        <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>Accuracy</th>
                                        <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>Peak</th>
                                        <th className="px-8 py-6 text-[10px] font-black opacity-40 uppercase tracking-widest text-right" style={{ color: 'var(--text-muted)' }}>Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                    {students.map((student, i) => (
                                        <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-black transition-colors group-hover:underline decoration-accent" style={{ color: 'var(--text)' }}>{student.name}</span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-[10px] font-black transition-all" style={{ color: 'var(--text-muted)' }}>{student.mudras}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-[10px] font-black ${student.avgScore > 85 ? 'text-emerald-500' : 'text-amber-500'}`}>{student.avgScore}%</span>
                                                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                                        <div className={`h-full ${student.avgScore > 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${student.avgScore}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-xs font-black uppercase" style={{ color: 'var(--accent)' }}>{student.bestScore}%</span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className="text-[9px] font-black opacity-40 px-3 py-1 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{student.duration}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Analytics Insights */}
                <div className="space-y-10">
                    <h2 className="text-sm font-black tracking-[4px] uppercase px-2" style={{ color: 'var(--text)' }}>Insights Engine</h2>

                    <div className="rounded-3xl border p-10 relative overflow-hidden group shadow-sm transition-all hover:shadow-2xl"
                        style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>
                        {/* Interactive background shapes */}
                        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />

                        <div className="relative z-10 text-white">
                            <h3 className="text-[10px] font-black uppercase tracking-[3px] opacity-40 mb-4">Most Mastered Mudra</h3>
                            <p className="text-4xl font-black tracking-tighter uppercase mb-4">PATAKA</p>
                            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[2px] mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                                Avg Hold Duration
                                <span className="text-white opacity-100">12m 04s</span>
                            </p>
                        </div>
                    </div>

                    <div className="rounded-3xl border p-8 space-y-6 shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-[4px] opacity-40 mb-6" style={{ color: 'var(--text-muted)' }}>Retention Challenges</h3>
                        <div className="space-y-6">
                            {[
                                { name: 'Simhamukha', difficulty: '85%' },
                                { name: 'Kangula', difficulty: '62%' },
                                { name: 'Mayura', difficulty: '44%' },
                            ].map(item => (
                                <div key={item.name} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>{item.name}</span>
                                        <span className="text-[10px] font-black text-red-500 tracking-widest">{item.difficulty} ERROR</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                        <div className="h-full bg-red-500" style={{ width: item.difficulty }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[9px] font-bold italic opacity-40 leading-relaxed pt-2" style={{ color: 'var(--text-muted)' }}>Recommend focused practice for Simhamukha in next session.</p>
                    </div>

                    <div className="rounded-3xl border p-8 shadow-sm transition-all hover:shadow-xl"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(16,185,129,0.2)' }}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                <Target size={20} />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[3px]" style={{ color: '#10b981' }}>Progress Alert</h3>
                        </div>
                        <p className="text-[11px] font-bold tracking-tight leading-loose opacity-60" style={{ color: 'var(--text)' }}>
                            Overall class accuracy increased by <span className="font-black" style={{ color: '#10b981' }}>2.4%</span> compared to previous session.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassReport;

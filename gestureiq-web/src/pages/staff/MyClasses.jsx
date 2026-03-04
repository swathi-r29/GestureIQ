import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Video,
    History,
    Play,
    Edit,
    Trash2,
    Eye,
    Users,
    Target,
    FileText,
    Clock,
    ExternalLink,
    ChevronRight,
    Radio
} from 'lucide-react';

const ClassCard = ({ title, date, time, students, status, type }) => (
    <div className="border rounded-[32px] p-8 hover:shadow-2xl transition-all group relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="p-4 rounded-2xl shadow-xl shadow-black/5 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                <Video size={28} />
            </div>
            <div className="flex flex-col items-end gap-2">
                <span className={`text-[10px] font-black tracking-[3px] uppercase px-4 py-1.5 rounded-full border shadow-sm
          ${status === 'upcoming' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}
        `}>
                    {status}
                </span>
                <span className="text-[10px] font-black opacity-30 uppercase tracking-[2px]" style={{ color: 'var(--text-muted)' }}>IDX-{Math.floor(Math.random() * 9000 + 1000)}</span>
            </div>
        </div>

        <div className="space-y-6 relative z-10">
            <div>
                <h3 className="font-black text-xl tracking-tighter leading-tight transition-colors" style={{ color: 'var(--text)' }}>
                    {title}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[3px] mt-2 opacity-40" style={{ color: 'var(--text-muted)' }}>Class Segment Alpha</p>
            </div>

            <div className="flex items-center gap-6 text-[11px] font-black uppercase tracking-[2px]">
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Calendar size={16} className="opacity-40" />
                    <span>{date}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={16} className="opacity-40" />
                    <span>{time}</span>
                </div>
            </div>

            <div className="pt-6 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-sm"
                                style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--bg-card)', color: 'var(--accent)' }}>
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1" style={{ color: 'var(--text-muted)' }}>{students} Enrolled</span>
                </div>

                <div className="flex gap-3">
                    {status === 'upcoming' ? (
                        <>
                            <button className="p-3 rounded-xl border opacity-30 hover:opacity-100 transition-all"
                                style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                <Edit size={18} />
                            </button>
                            <button className="px-8 py-3 bg-accent text-white rounded-xl text-[10px] font-black tracking-[4px] uppercase shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all">
                                Launch
                            </button>
                        </>
                    ) : (
                        <button className="px-6 py-3 rounded-xl text-[10px] font-black tracking-[4px] uppercase border transition-all flex items-center gap-3 hover:bg-accent hover:text-white"
                            style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--accent)' }}>
                            <Eye size={18} /> Replay
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const PastClassRow = ({ title, date, students, accuracy }) => (
    <tr className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer border-b" style={{ borderColor: 'var(--border)' }}>
        <td className="px-8 py-6">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl transition-transform group-hover:scale-110" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                    <Calendar size={18} />
                </div>
                <span className="text-sm font-black tracking-tight" style={{ color: 'var(--text)' }}>{title}</span>
            </div>
        </td>
        <td className="px-8 py-6 text-[10px] font-black uppercase tracking-[2px] opacity-40" style={{ color: 'var(--text-muted)' }}>{date}</td>
        <td className="px-8 py-6">
            <div className="flex items-center gap-2">
                <Users size={16} className="opacity-30" style={{ color: 'var(--text)' }} />
                <span className="text-xs font-black" style={{ color: 'var(--text)' }}>{students} Students</span>
            </div>
        </td>
        <td className="px-8 py-6">
            <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-emerald-500">{accuracy}% Accuracy</span>
                    <div className="w-20 h-1 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${accuracy}%` }} />
                    </div>
                </div>
            </div>
        </td>
        <td className="px-8 py-6 text-right">
            <button className="text-[10px] font-black uppercase tracking-[3px] flex items-center gap-2 justify-end ml-auto group-hover:text-accent transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <FileText size={16} className="opacity-40" /> Analysis
            </button>
        </td>
    </tr>
);

const MyClasses = () => {
    const [activeTab, setActiveTab] = useState('upcoming');
    const navigate = useNavigate();

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b pb-10" style={{ borderColor: 'var(--border)' }}>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2" style={{ color: 'var(--text)' }}>Class Inventory</h1>
                    <p className="text-[10px] font-black uppercase tracking-[5px] opacity-40" style={{ color: 'var(--text-muted)' }}>Deployment Schedule & Historical Archives</p>
                </div>
                <button className="px-10 py-5 border-2 rounded-[20px] font-black text-[10px] tracking-[4px] uppercase transition-all hover:bg-accent hover:text-white active:scale-95 shadow-2xl"
                    style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}>
                    Visual Calendar
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-2 border rounded-[25px] w-fit shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                {[
                    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                    { id: 'live', label: 'Live Now', icon: Video },
                    { id: 'past', label: 'Past Classes', icon: History },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-8 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[3px] transition-all
              ${activeTab === tab.id ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'opacity-40 hover:opacity-100'}
            `}
                        style={activeTab !== tab.id ? { color: 'var(--text)' } : {}}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'upcoming' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                    <div className="col-span-full py-40 text-center space-y-8 rounded-[40px] border-2 border-dashed transition-colors"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <Calendar className="opacity-20" size={48} style={{ color: 'var(--text)' }} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[8px] opacity-20 italic">No Operational Targets Scheduled</p>
                            <button
                                onClick={() => navigate('/staff/create-class')}
                                className="mt-8 px-10 py-5 bg-accent text-white rounded-[20px] font-black text-[10px] tracking-[5px] uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all"
                            >
                                + Initiate First Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'live' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                    <div className="col-span-full py-40 text-center space-y-8 rounded-[40px] border-2 border-dashed"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <Radio className="opacity-20 animate-pulse" size={48} style={{ color: 'var(--accent)' }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[8px] opacity-20 italic">Zero Active Broadcasts</p>
                    </div>
                </div>
            )}

            {activeTab === 'past' && (
                <div className="rounded-[40px] border overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="py-40 text-center space-y-8">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--bg-card2)' }}>
                            <History className="opacity-20" size={48} style={{ color: 'var(--text)' }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[8px] opacity-20 italic">No Historical Data Recovered</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyClasses;

import React from 'react';
import {
    Users,
    Video,
    Calendar,
    Target,
    TrendingUp,
    PlusCircle,
    ArrowRight,
    Clock,
    UserPlus,
    CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <div className="p-6 rounded-2xl border transition-all duration-500 group relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {/* Hover glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-black/10"
                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                <Icon size={24} />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
                <TrendingUp size={10} />
                {trend}
            </span>
        </div>
        <h3 className="text-[10px] font-bold uppercase tracking-[3px] mb-2 opacity-50" style={{ color: 'var(--text-muted)' }}>{title}</h3>
        <p className="text-3xl font-black" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
);

const QuickAction = ({ title, icon: Icon, onClick, color }) => (
    <button
        onClick={onClick}
        className="flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 group shadow-sm hover:shadow-xl hover:-translate-y-1"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
        <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl transition-colors group-hover:text-white"
                style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                <Icon size={20} />
            </div>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text)' }}>{title}</span>
        </div>
        <ArrowRight size={18} className="opacity-20 group-hover:opacity-100 transition-all group-hover:translate-x-1"
            style={{ color: 'var(--text)' }} />
    </button>
);

const StaffDashboard = () => {
    const { user } = useAuth();
    const teacherName = user?.name || "Instructor";
    const institutionName = user?.institution_name || "GestureIQ Academy";

    const stats = [
        { title: "Total Students", value: "0", icon: Users, trend: "0%", color: "indigo" },
        { title: "Classes Conducted", value: "0", icon: Video, trend: "0%", color: "purple" },
        { title: "Upcoming Classes", value: "0", icon: Calendar, trend: "Upcoming", color: "blue" },
        { title: "Avg. Accuracy", value: "0%", icon: Target, trend: "0%", color: "emerald" },
    ];

    const activities = [];
    const teacherInitials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8" style={{ borderColor: 'var(--border)' }}>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2" style={{ color: 'var(--text)' }}>
                        Welcome back, <span style={{ color: 'var(--accent)' }}>{teacherName}!</span>
                    </h1>
                    <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[4px]" style={{ color: 'var(--text-muted)' }}>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500"></span>
                        {institutionName} • Global Instructor
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-black tracking-tight" style={{ color: 'var(--text)' }}>{currentDate}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[3px] opacity-40 leading-none mt-1" style={{ color: 'var(--text)' }}>{currentTime}</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl p-[1px] shadow-2xl" style={{ backgroundColor: 'var(--border)' }}>
                        <div className="w-full h-full rounded-[15px] flex items-center justify-center font-black text-lg shadow-inner"
                            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)' }}>
                            {teacherInitials}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black tracking-[5px] uppercase opacity-40" style={{ color: 'var(--text)' }}>Recent Activity</h2>
                        <button className="text-[10px] font-black tracking-[4px] uppercase hover:underline"
                            style={{ color: 'var(--accent)' }}>View All</button>
                    </div>
                    <div className="rounded-[40px] border overflow-hidden shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="p-24 text-center space-y-6 opacity-20">
                            <Clock className="mx-auto" size={56} style={{ color: 'var(--text-muted)' }} />
                            <p className="text-[10px] font-black tracking-[6px] uppercase italic">Initializing System Logs...</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-8">
                    <h2 className="text-[10px] font-black tracking-[5px] uppercase px-2 opacity-40" style={{ color: 'var(--text)' }}>Tactical Console</h2>
                    <div className="space-y-4">
                        <QuickAction title="Create New Class" icon={PlusCircle} onClick={() => { }} />
                        <QuickAction title="View My Students" icon={Users} onClick={() => { }} />
                        <QuickAction title="View Schedule" icon={Calendar} onClick={() => { }} />
                    </div>

                    {/* Upcoming Highlight */}
                    <div className="mt-12 p-10 rounded-[40px] relative overflow-hidden group shadow-2xl border transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'var(--accent)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/5 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />

                        <div className="relative z-10 text-white">
                            <p className="text-[9px] font-black uppercase tracking-[5px] mb-4 opacity-50">Operational Target</p>
                            <h3 className="text-2xl font-black tracking-tighter mb-5">Advance Mudras Part 2</h3>
                            <div className="flex items-center gap-4 text-[10px] mb-10">
                                <Clock size={18} className="opacity-50" />
                                <span className="font-black tracking-[3px] uppercase">Commencing in 45m</span>
                            </div>
                            <button className="w-full py-5 bg-white rounded-2xl font-black text-[10px] tracking-[4px] uppercase transition-all active:scale-[0.98] shadow-2xl"
                                style={{ color: 'var(--accent)' }}>
                                Initiate Protocol
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;

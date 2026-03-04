import React from 'react';
import {
    User,
    Mail,
    Phone,
    Building,
    MapPin,
    Award,
    TrendingUp,
    Users,
    Video,
    Edit2,
    Camera,
    LogOut,
    Shield,
    Bell,
    Globe,
    Lock,
    ChevronRight
} from 'lucide-react';

const ProfileStat = ({ label, value, icon: Icon, color }) => (
    <div className="rounded-3xl border p-8 group transition-all shadow-sm hover:translate-y-[-4px]"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg"
            style={{
                backgroundColor: 'var(--bg-card2)',
                color: 'var(--accent)',
                boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)'
            }}>
            <Icon size={26} />
        </div>
        <p className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text)' }}>{value}</p>
        <p className="text-[10px] font-black opacity-40 uppercase tracking-[3px] mt-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
);

const StaffProfile = () => {
    const stats = [
        { label: "Total Classes", value: "482", icon: Video, color: "accent" },
        { label: "Students Taught", value: "12,408", icon: Users, color: "accent" },
        { label: "Avg Improvement", value: "+24%", icon: TrendingUp, color: "accent" },
        { label: "Global Rank", value: "#14", icon: Award, color: "accent" },
    ];

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            <div className="relative rounded-[40px] overflow-hidden border shadow-sm"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full" />

                <div className="p-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="flex items-center gap-8 relative z-10">
                        <div className="relative group">
                            <div className="w-44 h-44 rounded-[35px] flex items-center justify-center font-black text-6xl shadow-inner relative overflow-hidden border-2"
                                style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--accent)' }}>
                                {initials}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm">
                                    <Camera size={32} className="text-white" />
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-2xl flex items-center justify-center text-white border-[4px] shadow-lg animate-bounce"
                                style={{ backgroundColor: '#10b981', borderColor: 'var(--bg-card)' }} title="Verified Profile">
                                <Shield size={20} fill="currentColor" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-5xl font-black tracking-tighter" style={{ color: 'var(--text)' }}>Swathi Reddy</h1>
                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[3px]">
                                <span className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}><Building size={14} /> Academy Lead</span>
                                <span className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}><MapPin size={14} /> Hyderabad • India</span>
                            </div>
                        </div>
                    </div>
                    <button className="px-10 py-5 bg-accent text-white text-[10px] font-black uppercase tracking-[4px] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 relative z-10">
                        <Edit2 size={20} /> Edit Protocol
                    </button>
                </div>
            </div>

            <div className="pt-24 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Statistics & Bio */}
                <div className="lg:col-span-2 space-y-12">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {stats.map((stat, i) => (
                            <ProfileStat key={i} {...stat} />
                        ))}
                    </div>

                    <div className="rounded-[35px] border p-10 space-y-8 shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h2 className="text-sm font-black tracking-[4px] uppercase" style={{ color: 'var(--text)' }}>Biography</h2>
                        <p className="text-base leading-relaxed opacity-60 font-medium" style={{ color: 'var(--text)' }}>
                            Passionate Indian Classical Dance instructor with over 12 years of experience. Specializing in Mudra accuracy and hand gesture recognition training. Certified Global Instructor at GestureIQ Academy, focusing on blending traditional arts with cutting-edge AI technology for better learning outcomes.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-4">
                            {['Bharatanatyam', 'Classical Dance', 'AI Education', 'Gestural Arts'].map(tag => (
                                <span key={tag} className="px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all hover:bg-accent hover:text-white"
                                    style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-sm font-black tracking-[4px] uppercase px-4" style={{ color: 'var(--text)' }}>Contact Matrix</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                { label: 'Direct Email', value: 'swathi.reddy@gestureiq.com', icon: Mail },
                                { label: 'Verified Phone', value: '+91 98765 43210', icon: Phone },
                                { label: 'Dialects', value: 'English, Telugu, Hindi', icon: Globe },
                                { label: 'Position', value: 'Senior Lead Instructor', icon: User },
                            ].map(item => (
                                <div key={item.label} className="border p-6 rounded-3xl flex items-center gap-6 shadow-sm transition-all hover:shadow-xl"
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center opacity-40 transition-opacity group-hover:opacity-100"
                                        style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                                        <item.icon size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black opacity-40 uppercase tracking-[2px] mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                                        <p className="text-sm font-black tracking-tight" style={{ color: 'var(--text)' }}>{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Settings Sidebar */}
                <div className="space-y-8">
                    <div className="border rounded-[35px] overflow-hidden shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="p-8">
                            <h2 className="text-sm font-black tracking-[4px] uppercase mb-8" style={{ color: 'var(--text)' }}>Authority Control</h2>
                            <div className="space-y-2">
                                {[
                                    { label: 'Security & Access', icon: Lock },
                                    { label: 'Protocol Prefs', icon: Bell },
                                    { label: 'Verification Tier', icon: Shield },
                                ].map(item => (
                                    <button key={item.label} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <item.icon size={20} className="opacity-30 group-hover:opacity-100 group-hover:text-accent transition-all" />
                                            <span className="text-xs font-black uppercase tracking-widest opacity-40 group-hover:opacity-100" style={{ color: 'var(--text)' }}>{item.label}</span>
                                        </div>
                                        <ChevronRight size={18} className="opacity-10 group-hover:opacity-100" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                            <button className="w-full py-5 rounded-3xl font-black text-[10px] uppercase tracking-[4px] transition-all flex items-center justify-center gap-3 border bg-red-500/5 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-lg hover:shadow-red-500/20">
                                <LogOut size={18} /> Exit Console
                            </button>
                        </div>
                    </div>

                    <div className="border rounded-[35px] p-10 text-center space-y-6 relative overflow-hidden shadow-xl"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto border-2 shadow-2xl"
                            style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                            <Award size={40} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[4px]" style={{ color: 'var(--text)' }}>Instructor Merit</h3>
                        <p className="text-[10px] font-bold leading-relaxed opacity-40 px-4" style={{ color: 'var(--text-muted)' }}>
                            Your credentials are synchronized. You are eligible for the Global Master Class certification layer.
                        </p>
                        <button className="text-[10px] font-black uppercase tracking-[3px] py-4 px-6 rounded-xl border border-accent/20 transition-all hover:bg-accent hover:text-white"
                            style={{ color: 'var(--accent)' }}>Seal Document</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffProfile;

import React, { useState } from 'react';
import {
    Mic,
    Video as VideoIcon,
    ScreenShare,
    PhoneOff,
    Users,
    MessageSquare,
    ChevronRight,
    ChevronLeft,
    Settings,
    MoreVertical,
    Flag,
    Send,
    Zap
} from 'lucide-react';

const StudentTile = ({ name, accuracy }) => {
    const isLow = accuracy < 50;

    // Theme-compliant colors for accuracy
    const getColorStyle = () => {
        if (accuracy > 75) return { text: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' };
        if (accuracy > 50) return { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' };
        return { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' };
    };

    const styles = getColorStyle();

    return (
        <div className={`relative rounded-[25px] border aspect-video overflow-hidden transition-all duration-500 group hover:shadow-2xl ${isLow ? 'animate-pulse' : ''}`}
            style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: isLow ? styles.text : 'var(--border)',
                boxShadow: isLow ? `0 0 30px ${styles.bg}` : 'none'
            }}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <div className="font-black text-[10px] tracking-[6px] uppercase opacity-20" style={{ color: 'white' }}>Live Feed</div>
            </div>

            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl text-[10px] font-black border backdrop-blur-xl shadow-lg transition-transform group-hover:scale-110"
                style={{ color: styles.text, backgroundColor: styles.bg, borderColor: styles.border }}>
                {accuracy}%
            </div>

            {isLow && (
                <div className="absolute top-4 left-4 p-2 rounded-xl text-white shadow-2xl animate-bounce"
                    style={{ backgroundColor: '#ef4444' }}>
                    <Flag size={14} fill="currentColor" />
                </div>
            )}

            <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                <span className="text-white text-[10px] font-black uppercase tracking-widest">{name}</span>
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
            </div>
        </div>
    );
};

const LiveClassConduct = () => {
    const [currentMudra, setCurrentMudra] = useState("Pataka");
    const [activeTab, setActiveTab] = useState('controls');

    const students = [
        { id: 1, name: "Aravind K.", accuracy: 88 },
        { id: 2, name: "Priya S.", accuracy: 42 },
        { id: 3, name: "Rahul M.", accuracy: 76 },
        { id: 4, name: "Sanya G.", accuracy: 92 },
        { id: 5, name: "Vijay D.", accuracy: 48 },
        { id: 6, name: "Meera R.", accuracy: 65 },
    ];

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Top Dashboard Header */}
            <div className="flex items-center justify-between p-6 rounded-[30px] shadow-xl border"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-6">
                    <div className="px-4 py-2 rounded-xl font-black text-[10px] tracking-[3px] flex items-center gap-3 border shadow-inner"
                        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-glow shadow-red-500" />
                        BROADCASTING
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter hidden sm:block" style={{ color: 'var(--text)' }}>Beginner Mudras: Session 04</h1>
                        <p className="text-[10px] font-bold opacity-30 hidden sm:block uppercase tracking-[2px]">Academy Main Stage Protocol</p>
                    </div>
                    <div className="h-10 w-px hidden sm:block opacity-10" style={{ backgroundColor: 'var(--text)' }} />
                    <div className="text-sm font-black flex items-center gap-3 opacity-60" style={{ color: 'var(--text)' }}>
                        <Users size={18} className="text-accent" />
                        <span className="tracking-tighter uppercase text-[11px]">24 Enrolled</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-5 py-2.5 rounded-2xl font-black text-xs tracking-[4px] border shadow-inner"
                        style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)', borderColor: 'var(--border)' }}>
                        00:42:15
                    </div>
                    <button className="p-3.5 rounded-2xl transition-all border hover:scale-105"
                        style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                        <Settings size={20} />
                    </button>
                    <button className="hidden sm:flex items-center gap-3 px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] tracking-[3px] uppercase transition-all shadow-2xl shadow-red-500/30">
                        <PhoneOff size={18} />
                        Terminate
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden pb-4">
                {/* Main Grid Feed */}
                <div className="flex-1 space-y-6 overflow-y-auto pr-4 scrollbar-thin hover:scrollbar-thumb-accent/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {/* Instructor Main Feed */}
                        <div className="relative rounded-[30px] border-[3px] shadow-2xl aspect-video overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
                            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-card2)' }}>
                                <div className="text-accent font-black text-4xl tracking-tighter uppercase italic opacity-10">Live Instructor</div>
                            </div>
                            <div className="absolute top-5 left-5 px-4 py-1.5 bg-accent text-white rounded-xl text-[9px] font-black tracking-[4px] uppercase shadow-2xl">PRIMARY (YOU)</div>

                            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4 opacity-0 hover:opacity-100 transition-all duration-500 translate-y-4 hover:translate-y-0">
                                <button className="p-4 bg-black/80 text-white rounded-2xl hover:bg-accent hover:scale-110 transition-all shadow-2xl"><Mic size={20} /></button>
                                <button className="p-4 bg-black/80 text-white rounded-2xl hover:bg-accent hover:scale-110 transition-all shadow-2xl"><VideoIcon size={20} /></button>
                                <button className="p-4 bg-black/80 text-white rounded-2xl hover:bg-accent hover:scale-110 transition-all shadow-2xl"><ScreenShare size={20} /></button>
                            </div>
                        </div>

                        {/* Student Observer Cards */}
                        {students.map(student => (
                            <StudentTile key={student.id} {...student} />
                        ))}
                    </div>
                </div>

                {/* Command & Control Sidebar */}
                <div className="w-full lg:w-96 flex flex-col border rounded-[40px] overflow-hidden shadow-2xl shrink-0"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                    <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
                        <button onClick={() => setActiveTab('controls')} className={`flex-1 py-6 text-[10px] font-black tracking-[4px] transition-all ${activeTab === 'controls' ? 'text-accent border-b-4 border-accent bg-accent/5' : 'opacity-40 hover:opacity-100'}`} style={{ color: activeTab === 'controls' ? 'var(--accent)' : 'var(--text)' }}>
                            CONSOLE
                        </button>
                        <button onClick={() => setActiveTab('chat')} className={`flex-1 py-6 text-[10px] font-black tracking-[4px] transition-all ${activeTab === 'chat' ? 'text-accent border-b-4 border-accent bg-accent/5' : 'opacity-40 hover:opacity-100'}`} style={{ color: activeTab === 'chat' ? 'var(--accent)' : 'var(--text)' }}>
                            COMMUNICATION
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col p-8 overflow-y-auto scrollbar-hide">
                        {activeTab === 'controls' ? (
                            <div className="space-y-10">
                                <div className="space-y-6">
                                    <h3 className="text-[9px] font-black opacity-30 uppercase tracking-[4px] px-2">Active Mudra Sync</h3>
                                    <div className="p-8 rounded-[35px] border-2 shadow-inner space-y-6 text-center group transition-all"
                                        style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                                        <div className="w-40 h-40 mx-auto rounded-[30px] flex items-center justify-center border-2 shadow-2xl group-hover:scale-105 transition-transform"
                                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                            <Zap size={56} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black opacity-30 uppercase tracking-[2px] mb-2">Current Target</p>
                                            <p className="text-3xl font-black tracking-tighter uppercase" style={{ color: 'var(--text)' }}>{currentMudra}</p>
                                        </div>
                                        <button className="w-full py-5 bg-accent text-white rounded-2xl font-black text-[10px] tracking-[4px] uppercase hover:shadow-2xl hover:shadow-accent/40 active:scale-95 transition-all">
                                            Switch Protocol
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[9px] font-black opacity-30 uppercase tracking-[4px] px-2">Global Alert</h3>
                                    <textarea placeholder="Broadcast message to all students..." className="w-full border rounded-[25px] p-5 text-sm font-medium resize-none h-32 focus:outline-none focus:border-accent shadow-inner transition-all"
                                        style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                                    <button className="w-full py-4 rounded-2xl font-black text-[10px] tracking-[4px] uppercase transition-all flex items-center justify-center gap-3 border shadow-lg hover:bg-accent hover:text-white"
                                        style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                        <Send size={16} /> Transmit
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="flex-1 space-y-6">
                                    <div className="p-5 rounded-[25px] border space-y-2 shadow-sm"
                                        style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                                        <p className="text-[9px] font-black uppercase tracking-[2px]" style={{ color: 'var(--accent)' }}>Academy Core</p>
                                        <p className="text-xs font-medium leading-relaxed opacity-60" style={{ color: 'var(--text)' }}>Welcome to the session. Real-time gestural verification is active across all channels.</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <input type="text" placeholder="Type internal memo..." className="flex-1 border rounded-2xl px-6 py-4 text-xs font-medium focus:outline-none focus:border-accent shadow-inner transition-all"
                                        style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                                    <button className="p-4 bg-accent text-white rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-xl shadow-accent/20"><Send size={18} /></button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner"
                                style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black opacity-30 uppercase tracking-[3px]">Internal AI Engine</p>
                                <p className="text-xs font-black tracking-tight" style={{ color: '#10b981' }}>OPTIMIZED <span className="opacity-40 font-bold ml-2">(0.02ms Protocol)</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveClassConduct;

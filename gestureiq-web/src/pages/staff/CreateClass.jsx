import React, { useState } from 'react';
import {
    Calendar,
    Clock,
    Users,
    Globe2,
    Repeat,
    CheckSquare,
    ChevronRight,
    Info,
    Laptop
} from 'lucide-react';

const CreateClass = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        duration: '60',
        maxStudents: '30',
        type: 'open',
        language: 'English',
        recurring: 'one-time'
    });

    const mudras = [
        "Pataka", "Tripataka", "Ardhapataka", "Kartarimukha", "Mayura", "Ardhachandra",
        "Arala", "Shukatunda", "Mushti", "Shikhara", "Kapittha", "Katakamukha",
        "Suchi", "Chandrakala", "Padmakosha", "Sarpashirsha", "Mrigashirsha", "Simhamukha",
        "Kangula", "Alapadma", "Chatura", "Bhramara", "Hamsasya", "Hamsapaksha",
        "Sandamsha", "Mukula", "Tamrachuda", "Trishula"
    ];

    const [selectedMudras, setSelectedMudras] = useState([]);

    const toggleMudra = (mudra) => {
        setSelectedMudras(prev =>
            prev.includes(mudra) ? prev.filter(m => m !== mudra) : [...prev, mudra]
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            <div className="px-2">
                <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text)' }}>Create New Class</h1>
                <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-40" style={{ color: 'var(--text-muted)' }}>Schedule a live interactive session with your students</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="md:col-span-2 space-y-6">
                    {/* General Info */}
                    <div className="rounded-3xl border p-8 space-y-6 shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h2 className="text-sm font-black tracking-[3px] uppercase flex items-center gap-3"
                            style={{ color: 'var(--text)' }}>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                                <Info size={20} />
                            </div>
                            General Information
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Class Title</label>
                                <input
                                    type="text"
                                    placeholder='e.g. Beginner Mudras Session 1'
                                    className="w-full rounded-2xl px-5 py-4 text-sm border focus:outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Description</label>
                                <textarea
                                    rows="3"
                                    placeholder="What will students learn in this class?"
                                    className="w-full rounded-2xl px-5 py-4 text-sm border focus:outline-none transition-all resize-none"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Schedule & Metadata */}
                    <div className="rounded-3xl border p-8 space-y-8 shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <h2 className="text-sm font-black tracking-[3px] uppercase flex items-center gap-3"
                            style={{ color: 'var(--text)' }}>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                                <Calendar size={20} />
                            </div>
                            Schedule & Settings
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                                    <input type="date" className="w-full rounded-2xl pl-12 pr-5 py-4 text-sm border focus:outline-none transition-all"
                                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                                    <input type="time" className="w-full rounded-2xl pl-12 pr-5 py-4 text-sm border focus:outline-none transition-all"
                                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Duration (minutes)</label>
                                <select className="w-full rounded-2xl px-5 py-4 text-sm border focus:outline-none transition-all appearance-none"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                    <option value="30">30 min</option>
                                    <option value="60">60 min</option>
                                    <option value="90">90 min</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Max Students</label>
                                <div className="relative">
                                    <Users className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                                    <input type="number" placeholder="30" className="w-full rounded-2xl pl-12 pr-5 py-4 text-sm border focus:outline-none transition-all"
                                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[3px] ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Class Type</label>
                                <div className="flex gap-2 p-1.5 rounded-xl border shadow-inner"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                                    <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg text-white"
                                        style={{ backgroundColor: 'var(--accent)' }}>Open</button>
                                    <button className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg opacity-40 hover:opacity-100 transition-colors">Private</button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[3px] ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Language</label>
                                <select className="w-full rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border focus:outline-none"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                    <option>English</option>
                                    <option>Sanskrit</option>
                                    <option>Hindi</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black uppercase tracking-[3px] ml-1 opacity-50"
                                    style={{ color: 'var(--text-muted)' }}>Recurring</label>
                                <select className="w-full rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border focus:outline-none"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                    <option>One-time</option>
                                    <option>Daily</option>
                                    <option>Weekly</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Mudras Checklist */}
                    <div className="rounded-3xl border p-8 space-y-6 shadow-sm"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black tracking-[3px] uppercase flex items-center gap-3"
                                style={{ color: 'var(--text)' }}>
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--accent)' }}>
                                    <CheckSquare size={20} />
                                </div>
                                Select Mudras to Cover
                            </h2>
                            <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-current"
                                style={{ color: 'var(--accent)', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                {selectedMudras.length} Selected
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-48 overflow-y-auto pr-3 scrollbar-hide">
                            {mudras.map((mudra) => (
                                <button
                                    key={mudra}
                                    onClick={() => toggleMudra(mudra)}
                                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all text-left truncate
                    ${selectedMudras.includes(mudra)
                                            ? 'text-white'
                                            : 'opacity-40 hover:opacity-100'}
                  `}
                                    style={{
                                        backgroundColor: selectedMudras.includes(mudra) ? 'var(--accent)' : 'var(--bg)',
                                        borderColor: selectedMudras.includes(mudra) ? 'var(--accent)' : 'var(--border)',
                                        color: selectedMudras.includes(mudra) ? 'white' : 'var(--text)'
                                    }}
                                >
                                    {mudra}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preview Sidebar */}
                <div className="space-y-6">
                    <div className="rounded-3xl border p-8 sticky top-10 shadow-2xl transition-all duration-500 overflow-hidden group"
                        style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>
                        {/* Interactive background shapes */}
                        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-black/20 blur-2xl rounded-full group-hover:translate-x-10 transition-transform duration-1000" />

                        <div className="relative z-10 text-white">
                            <h3 className="text-sm font-black tracking-[4px] uppercase mb-8 flex items-center gap-3">
                                <Laptop size={18} />
                                Class Preview
                            </h3>

                            <div className="space-y-6 mb-10">
                                <div className="pb-6 border-b border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-[3px] opacity-40 mb-2">Title</p>
                                    <p className="text-lg font-black tracking-tight leading-tight">{formData.title || 'Untitled Class'}</p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-[3px] opacity-40 mb-2">Date</p>
                                        <p className="text-sm font-bold tracking-widest uppercase">March 15, 2026</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-[3px] opacity-40 mb-2">Time</p>
                                        <p className="text-sm font-bold tracking-widest uppercase">10:30 AM</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[3px] opacity-40 mb-3">Covering</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedMudras.length > 0 ? (
                                            selectedMudras.slice(0, 3).map(m => (
                                                <span key={m} className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10">{m}</span>
                                            ))
                                        ) : <span className="text-white/40 text-[10px] italic">No mudras selected</span>}
                                        {selectedMudras.length > 3 && <span className="text-[10px] font-black tracking-widest uppercase ml-1">+{selectedMudras.length - 3} more</span>}
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-5 bg-white text-black hover:bg-white/90 rounded-2xl font-black text-[10px] tracking-[4px] uppercase transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3">
                                Create Session
                                <ChevronRight size={18} />
                            </button>
                            <p className="text-center text-[8px] font-bold tracking-widest uppercase opacity-40 mt-6 px-4">
                                Auto-Notifications will be sent to all enrolled students
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateClass;

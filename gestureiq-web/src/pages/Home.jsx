// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';
import { useEffect, useState } from 'react';

const Mudra = ["patak"]
const MUDRA_NAMES = [
    "Pataka", "Tripataka", "Ardhapataka", "Kartarimukha", "Mayura",
    "Ardhachandra", "Arala", "Shukatunda", "Mushti", "Shikhara",
    "Kapittha", "Katakamukha", "Suchi", "Chandrakala", "Padmakosha",
    "Sarpashira", "Mrigashira", "Simhamukha", "Kangula", "Alapadma",
    "Chatura", "Bhramara", "Hamsasya", "Hamsapaksha", "Sandamsha",
    "Mukula", "Tamrachuda", "Trishula"
];

const Lotus = ({ size = 60, opacity = 1 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ opacity }}>
        <ellipse cx="50" cy="70" rx="12" ry="20" fill="var(--accent)" opacity="0.7" transform="rotate(-30 50 70)" />
        <ellipse cx="50" cy="70" rx="12" ry="20" fill="var(--accent)" opacity="0.7" transform="rotate(30 50 70)" />
        <ellipse cx="50" cy="65" rx="10" ry="22" fill="var(--accent)" opacity="0.85" transform="rotate(-60 50 65)" />
        <ellipse cx="50" cy="65" rx="10" ry="22" fill="var(--accent)" opacity="0.85" transform="rotate(60 50 65)" />
        <ellipse cx="50" cy="60" rx="10" ry="24" fill="var(--accent)" />
        <circle cx="50" cy="72" r="8" fill="var(--accent)" />
        <circle cx="50" cy="72" r="4" fill="var(--bg)" opacity="0.6" />
    </svg>
);

export default function Home() {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [currentMudra, setCurrentMudra] = useState(0);

    useEffect(() => {
        setTimeout(() => setVisible(true), 100);
        const interval = setInterval(() => {
            setCurrentMudra(prev => (prev + 1) % MUDRA_NAMES.length);
        }, 1800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Hero */}
            <div className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
                <div className="absolute top-10 left-10 opacity-5 rotate-12">
                    <Lotus size={200} />
                </div>
                <div className="absolute bottom-10 right-10 opacity-5 -rotate-12">
                    <Lotus size={160} />
                </div>

                <div className="mb-6 h-6 overflow-hidden">
                    <div key={currentMudra}
                        className="text-[10px] tracking-[8px] uppercase transition-all duration-500 animate-slideUp"
                        style={{ color: 'var(--text-muted)' }}>
                        {MUDRA_NAMES[currentMudra]}
                    </div>
                </div>

                <div className="mb-8">
                    <Lotus size={80} />
                </div>

                <h1 className="text-6xl md:text-7xl font-bold mb-4 leading-tight" style={{ color: 'var(--text)' }}>
                    The Language of<br />
                    <span style={{ color: 'var(--copper)' }}>Sacred Hands</span>
                </h1>

                <BorderPattern />

                <p className="mt-6 text-base max-w-xl leading-relaxed font-light tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    An AI-powered system that recognises all 28 Asamyuta Mudras of Bharatanatyam
                    in real time — bridging ancient classical art with modern computer vision.
                </p>

                <div className="flex gap-4 mt-10">
                    <Link to={user ? "/detect" : "/register"}
                        className="px-8 py-3 tracking-[3px] uppercase text-xs hover:opacity-80 transition-all duration-300 rounded"
                        style={{ backgroundColor: 'var(--accent)', color: '#FAF6F0' }}>
                        {user ? "Start Detection" : "Get Started"}
                    </Link>
                    <Link to="/learn"
                        className="px-8 py-3 border tracking-[3px] uppercase text-xs hover:opacity-80 transition-all duration-300 rounded"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        Learn Mudras
                    </Link>
                </div>

                {user && (
                    <p className="mt-6 text-xs tracking-[3px] uppercase" style={{ color: 'var(--text-muted)' }}>
                        Welcome back, {user.name}
                    </p>
                )}
            </div>

            {/* Stats */}
            <div className="border-y" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x" style={{ borderColor: 'var(--border)' }}>
                    {[
                        { value: "96.18%", label: "Model Accuracy" },
                        { value: "28", label: "Mudras Detected" },
                        { value: "4051", label: "Training Images" },
                        { value: "Real-time", label: "Detection" },
                    ].map((s, i) => (
                        <div key={i} className="py-8 text-center" style={{ borderColor: 'var(--border)' }}>
                            <div className="text-2xl font-bold" style={{ color: 'var(--copper)' }}>{s.value}</div>
                            <div className="text-[10px] tracking-[3px] uppercase mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features */}
            <div className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-12">
                    <div className="text-[10px] tracking-[6px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>What We Offer</div>
                    <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Features</h2>
                    <BorderPattern />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: "◎",
                            title: "Real-Time Detection",
                            desc: "MediaPipe extracts 21 hand landmarks per frame for instant mudra recognition through your webcam with 80%+ confidence."
                        },
                        {
                            icon: "✦",
                            title: "Learn All 28 Mudras",
                            desc: "Detailed descriptions, finger positions, traditional meanings and usage for every Asamyuta Hasta from Natya Shastra."
                        },
                        {
                            icon: "❧",
                            title: "Track Your Progress",
                            desc: "Your detected mudras and practice count are saved to your account — see how many you've mastered over time."
                        },
                    ].map((f, i) => (
                        <div key={i}
                            className="p-7 border rounded hover:shadow-md transition-all duration-300 group"
                            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                            <div className="text-3xl mb-5 group-hover:scale-110 transition-transform duration-300" style={{ color: 'var(--copper)' }}>
                                {f.icon}
                            </div>
                            <h3 className="text-base font-bold mb-3 tracking-wide" style={{ color: 'var(--text)' }}>{f.title}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mudra strip */}
            <div className="border-t py-16 overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card2)' }}>
                <div className="text-center mb-8">
                    <div className="text-[10px] tracking-[6px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Asamyuta Hastas</div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>28 Sacred Gestures</h2>
                    <BorderPattern />
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto px-6">
                    {MUDRA_NAMES.map((name, i) => (
                        <Link to="/learn" key={name}
                            style={{ animationDelay: `${i * 40}ms`, borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                            className="px-3 py-1.5 border text-[10px] tracking-[2px] hover:opacity-80 transition-all duration-300 uppercase rounded-sm">
                            {name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-2xl mx-auto px-6 py-20 text-center">
                <Lotus size={50} />
                <h2 className="text-3xl font-bold mt-6 mb-3" style={{ color: 'var(--text)' }}>
                    Ready to Begin?
                </h2>
                <p className="text-sm mb-8 tracking-wide leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {user
                        ? "Head to the detection page and start practising your mudras."
                        : "Create a free account and start your Bharatanatyam journey today."}
                </p>
                <Link to={user ? "/detect" : "/register"}
                    className="inline-block px-10 py-3 rounded tracking-[3px] uppercase text-xs hover:opacity-80 transition-all duration-300"
                    style={{ backgroundColor: 'var(--accent)', color: '#FAF6F0' }}>
                    {user ? "Go to Detection" : "Create Free Account"}
                </Link>
            </div>

            {/* Footer */}
            <footer className="border-t py-8 text-center" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] tracking-[3px] uppercase" style={{ color: 'var(--text-muted)' }}>
                    Developed by{' '}
                    <span style={{ color: 'var(--copper)' }}>Divyadharshini R V · Swathi R · Muniyammal M</span>
                    {' '}· Guide:{' '}
                    <span style={{ color: 'var(--copper)' }}>Dr. S. Dheenathayalan</span>
                </p>
            </footer>

            <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.4s ease forwards; }
      `}</style>
        </div>
    );
}
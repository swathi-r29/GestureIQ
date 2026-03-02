// src/pages/About.jsx
import BorderPattern from '../components/BorderPattern';

export default function About() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-16 animate-fadeIn">
            <div className="text-center mb-16">
                <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Project Overview</div>
                <h1 className="text-4xl font-bold" style={{ color: 'var(--text)' }}>About GestureIQ</h1>
                <div className="max-w-md mx-auto mt-6">
                    <BorderPattern />
                </div>
            </div>

            <div className="space-y-12">
                <section className="border p-8 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--copper)' }}>Bridging Tradition & Technology</h2>
                    <p className="leading-relaxed font-light" style={{ color: 'var(--text-muted)' }}>
                        GestureIQ is an advanced computer vision platform designed to preserve and digitise the ancient art
                        of Bharatanatyam. By leveraging Google's MediaPipe framework and a custom-trained Random Forest model,
                        our system interprets the 28 fundamental single-hand gestures (Asamyuta Hastas) documented in the Natya Shastra
                        with over 95% real-time accuracy.
                    </p>
                </section>

                <section className="grid md:grid-cols-2 gap-8">
                    <div className="border p-8 rounded-lg group transition-all" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <h3 className="text-[10px] tracking-[4px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>The Technology</h3>
                        <ul className="space-y-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <li className="flex items-start gap-3">
                                <span style={{ color: 'var(--copper)' }}>◎</span>
                                <span><strong style={{ color: 'var(--text)' }}>Frontend:</strong> React, Vite, Tailwind CSS</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span style={{ color: 'var(--copper)' }}>◎</span>
                                <span><strong style={{ color: 'var(--text)' }}>Backend API:</strong> Node.js, Express, MongoDB</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span style={{ color: 'var(--copper)' }}>◎</span>
                                <span><strong style={{ color: 'var(--text)' }}>Vision Engine:</strong> Python, Flask, OpenCV</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span style={{ color: 'var(--copper)' }}>◎</span>
                                <span><strong style={{ color: 'var(--text)' }}>Machine Learning:</strong> Scikit-Learn Random Forest Classifier trained on 4,000+ custom spatial-invariant landmarks</span>
                            </li>
                        </ul>
                    </div>

                    <div className="border p-8 rounded-lg group transition-all" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                        <h3 className="text-[10px] tracking-[4px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>The Team</h3>
                        <div className="space-y-6" style={{ color: 'var(--text-muted)' }}>
                            <div>
                                <p className="text-sm font-bold mb-1" style={{ color: 'var(--copper)' }}>Developers</p>
                                <p className="text-xs tracking-widest uppercase">Divyadharshini R V</p>
                                <p className="text-xs tracking-widest uppercase mt-1">Swathi R</p>
                                <p className="text-xs tracking-widest uppercase mt-1">Muniyammal M</p>
                            </div>
                            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                <p className="text-sm font-bold mb-1" style={{ color: 'var(--copper)' }}>Project Guide</p>
                                <p className="text-xs tracking-widest uppercase">Dr. S. Dheenathayalan</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

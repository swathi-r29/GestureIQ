import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import BorderPattern from '../../components/BorderPattern';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/admin/login', form);
            login(res.data.token, res.data.user);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.msg || 'Invalid Admin Credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg)' }}>

            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ backgroundColor: 'var(--accent)' }}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ backgroundColor: 'var(--copper)' }}></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl mb-6 border shadow-lg"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <ShieldCheck size={32} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="text-[10px] tracking-[10px] uppercase mb-2 font-bold" style={{ color: 'var(--text-muted)' }}>
                        System Control
                    </div>
                    <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                        Gesture<span style={{ color: 'var(--accent)' }}>IQ</span> Admin
                    </h1>
                    <div className="max-w-[100px] mx-auto mt-4">
                        <BorderPattern />
                    </div>
                </div>

                <div className="rounded-3xl p-10 border shadow-2xl backdrop-blur-md transition-all duration-500"
                    style={{ backgroundColor: 'rgba(var(--bg-card-rgb), 0.8)', borderColor: 'var(--border)' }}>

                    {error && (
                        <div className="mb-8 px-5 py-4 border rounded-xl text-xs tracking-widest flex items-center gap-3 animate-shake"
                            style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="group">
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2 ml-1 font-bold"
                                style={{ color: 'var(--text-muted)' }}>Administrator Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={16} />
                                <input type="email" value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    required
                                    className="w-full rounded-xl pl-12 pr-4 py-4 text-sm border focus:outline-none focus:ring-2 transition-all"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                    placeholder="admin@gestureiq.com" />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2 ml-1 font-bold"
                                style={{ color: 'var(--text-muted)' }}>Security Key</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={16} />
                                <input type="password" value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required
                                    className="w-full rounded-xl pl-12 pr-4 py-4 text-sm border focus:outline-none focus:ring-2 transition-all"
                                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                    placeholder="••••••••" />
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-4 text-xs tracking-[4px] uppercase rounded-xl transition-all disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 group hover:shadow-xl shadow-accent/20"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            {loading ? 'Authenticating...' : (
                                <>
                                    Secure Login <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[10px] tracking-widest mt-10 uppercase opacity-30" style={{ color: 'var(--text-muted)' }}>
                    Authorized Personnel Only • IP Logged
                </p>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';

export default function Login() {
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
            const res = await axios.post('/api/auth/login', form);
            const { token, user } = res.data;
            login(token, user);

            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (user.role === 'staff') {
                navigate('/staff/live-classes');
            } else {
                navigate('/detect');
            }
        } catch (err) {
            setError(err.response?.data?.msg || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                        Welcome Back
                    </div>
                    <h1 className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>GestureIQ</h1>
                    <BorderPattern />
                    <p className="text-xs tracking-[4px] uppercase mt-2" style={{ color: 'var(--text-muted)' }}>
                        Sign in to continue
                    </p>
                </div>

                <div className="rounded-lg p-8 border shadow-sm transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                    {error && (
                        <div className="mb-5 px-4 py-3 border rounded text-xs tracking-widest"
                            style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2"
                                style={{ color: 'var(--text-muted)' }}>Email</label>
                            <input type="email" value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required
                                className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors"
                                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                placeholder="your@email.com" />
                        </div>

                        <div>
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2"
                                style={{ color: 'var(--text-muted)' }}>Password</label>
                            <input type="password" value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required
                                className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors"
                                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                placeholder="••••••••" />
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-3 text-xs tracking-[4px] uppercase rounded transition-all disabled:opacity-50 text-white"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <BorderPattern />

                    <p className="text-center text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Don't have an account?{' '}
                        <Link to="/register" className="font-bold" style={{ color: 'var(--accent)' }}>
                            Register
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

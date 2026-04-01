import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import BorderPattern from '../components/BorderPattern';

export default function Register() {
    const [form, setForm] = useState({
        name: '', email: '', password: '', confirm: '',
        role: 'student',
        age: '', experience_level: 'Beginner',
        institution_name: '', contact_number: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) return setError('Passwords do not match');
        if (form.password.length < 6) return setError('Password must be at least 6 characters');
        setLoading(true);
        setError('');
        try {
            const payload = {
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
            };

            if (form.role === 'student') {
                payload.age = form.age;
                payload.experience_level = form.experience_level;
            } else {
                payload.contact_number = form.contact_number;
            }
            // All roles can have an institution
            payload.institution_name = form.institution_name;

            const res = await axios.post(`/api/auth/register/${form.role}`, payload);

            if (form.role === 'staff') {
                setError('Registration successful! Please wait for admin approval before logging in.');
                setLoading(false);
                // Optionally redirect to login after a delay
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            const { token, user } = res.data;
            login(token, user);

            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.msg || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        backgroundColor: 'var(--bg)',
        borderColor: 'var(--border)',
        color: 'var(--text)'
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 flex-col">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="text-[10px] tracking-[8px] uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                        Join GestureIQ
                    </div>
                    <h1 className="text-4xl font-bold" style={{ color: 'var(--accent)' }}>Create Account</h1>
                    <BorderPattern />
                </div>

                <div className="rounded-lg p-8 border shadow-sm transition-colors duration-300"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                    {/* Role Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-md mb-6 dark:bg-gray-800" style={{ backgroundColor: 'var(--bg)' }}>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, role: 'student' })}
                            className={`flex-1 py-2 text-xs uppercase tracking-widest rounded transition-all ${form.role === 'student' ? 'shadow-sm text-white' : 'opacity-60'}`}
                            style={form.role === 'student' ? { backgroundColor: 'var(--accent)' } : {}}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, role: 'staff' })}
                            className={`flex-1 py-2 text-xs uppercase tracking-widest rounded transition-all ${form.role === 'staff' ? 'shadow-sm' : 'opacity-60'}`}
                            style={form.role === 'staff' ? { backgroundColor: 'var(--text)', color: 'var(--bg)' } : {}}
                        >
                            Staff/Institution
                        </button>
                    </div>

                    {error && (
                        <div className="mb-5 px-4 py-3 border rounded text-xs tracking-widest"
                            style={{ color: 'var(--accent)', backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="Your name" />
                        </div>

                        <div>
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Email</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="your@email.com" />
                        </div>

                        {form.role === 'student' ? (
                            <>
                                <div>
                                    <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Age</label>
                                    <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="15" />
                                </div>
                                <div>
                                    <label className="block text-[10px] tracking-[4px] uppercase mb-2"
                                        style={{ color: 'var(--text-muted)' }}>Dance Experience Level</label>
                                    <select
                                        value={form.experience_level}
                                        onChange={e => setForm({ ...form, experience_level: e.target.value })}
                                        className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors"
                                        style={{ ...inputStyle, WebkitAppearance: 'none', appearance: 'none' }}
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Institution Name</label>
                                    <input type="text" value={form.institution_name} onChange={e => setForm({ ...form, institution_name: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="E.g. Sastra Academy" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Institution Name</label>
                                    <input type="text" value={form.institution_name} onChange={e => setForm({ ...form, institution_name: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="Dance Academy Name" />
                                </div>
                                <div>
                                    <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Contact Number</label>
                                    <input type="text" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="+1 234 567 8900" />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Password</label>
                            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="Min 6 characters" />
                        </div>

                        <div>
                            <label className="block text-[10px] tracking-[4px] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Confirm Password</label>
                            <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required className="w-full rounded px-4 py-3 text-sm border focus:outline-none transition-colors" style={inputStyle} placeholder="Repeat password" />
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-3 text-xs tracking-[4px] uppercase rounded transition-all disabled:opacity-50 text-white mt-6"
                            style={{ backgroundColor: form.role === 'student' ? 'var(--accent)' : 'var(--text)', color: form.role === 'staff' ? 'var(--bg)' : 'white' }}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <BorderPattern />

                    <p className="text-center text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold" style={{ color: 'var(--accent)' }}>
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

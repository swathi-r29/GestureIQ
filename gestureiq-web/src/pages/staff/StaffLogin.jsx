import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const StaffLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`/api/auth/login`, {
        email,
        password
      });

      const { user } = res.data;

      if (user.role !== 'staff') {
        setError('Access denied. This login is for staff only.');
        setLoading(false);
        return;
      }

      if (user.status !== 'approved') {
        if (user.status === 'pending') {
          setError('Your account is pending approval by an administrator.');
        } else if (user.status === 'rejected') {
          setError('Your account has been rejected.');
        } else {
          setError(`Access denied. Account status: ${user.status}`);
        }
        setLoading(false);
        return;
      }

      login(res.data.token, user);
      navigate('/staff/dashboard');
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-md w-full p-8 rounded-2xl shadow-xl transition-all duration-300" 
           style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Staff Portal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to manage your classes</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl transition-all duration-200"
              style={{ 
                backgroundColor: 'var(--bg-card2)', 
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
              placeholder="teacher@institution.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl transition-all duration-200"
              style={{ 
                backgroundColor: 'var(--bg-card2)', 
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ 
              backgroundColor: 'var(--accent)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Need an account? <Link to="/staff/register" style={{ color: 'var(--accent)' }}>Register as Staff</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;

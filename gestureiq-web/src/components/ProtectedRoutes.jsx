// src/components/ProtectedRoutes.jsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center tracking-widest uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Synchronizing Identity...</div>;

  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;

  return children;
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/" />;
  return children;
}
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  Settings, 
  LogOut,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StaffProfile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/profile`, {
        headers: { 'x-auth-token': token }
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse">Loading Profile...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>My Profile</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your teaching credentials and account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-8 rounded-3xl border text-center space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mx-auto border-4 border-white/10">
              <User className="w-12 h-12" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{profile.name}</h2>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Staff Member</p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-[10px] font-bold py-1 px-3 bg-green-500/10 text-green-500 rounded-full w-max mx-auto">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Instructor</span>
            </div>
            
            <button 
              onClick={logout}
              className="w-full mt-4 py-3 rounded-xl border border-red-500/20 text-red-500 text-sm font-bold flex items-center justify-center space-x-2 hover:bg-red-500 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl border space-y-4" style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Classes Taught</span>
                <span className="font-bold">{profile.stats.classesTaught}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Students Guided</span>
                <span className="font-bold">{profile.stats.studentsReached}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Info */}
        <div className="md:col-span-2 space-y-8">
          <div className="p-8 rounded-3xl border space-y-8" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-50 flex items-center">
                  <Mail className="w-3 h-3 mr-2" /> Email Address
                </label>
                <div className="font-bold p-3 rounded-xl bg-black/5">{profile.email}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-50 flex items-center">
                  <Phone className="w-3 h-3 mr-2" /> Phone Number
                </label>
                <div className="font-bold p-3 rounded-xl bg-black/5">{profile.contact_number}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-50 flex items-center">
                  <MapPin className="w-3 h-3 mr-2" /> Institution
                </label>
                <div className="font-bold p-3 rounded-xl bg-black/5">{profile.institution_name}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase opacity-50 flex items-center">
                  <Calendar className="w-3 h-3 mr-2" /> Joined On
                </label>
                <div className="font-bold p-3 rounded-xl bg-black/5">{new Date(profile.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="pt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-8 h-8 opacity-20" />
                <div>
                  <p className="text-xs font-bold">Account Security</p>
                  <p className="text-[10px] opacity-50">Your account is secured with end-to-end encryption</p>
                </div>
              </div>
              <button className="px-6 py-2 rounded-xl border text-sm font-bold transition-all hover:bg-black/5" style={{ borderColor: 'var(--border)' }}>
                Edit Settings
              </button>
            </div>
          </div>

          <div className="p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-4" 
               style={{ backgroundColor: 'var(--bg-card2)', borderColor: 'var(--border)' }}>
            <Award className="w-12 h-12 opacity-20" />
            <h3 className="font-bold">Badges & Recognition</h3>
            <p className="text-xs max-w-xs opacity-50">Badges are awarded based on teaching quality and student feedback. Keep hosting classes to unlock more!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;

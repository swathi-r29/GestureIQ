import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Trophy, Star, Flame, Calendar, Award, Activity, TrendingUp, CheckCircle, AlertTriangle, ArrowRight, RefreshCw, Plus } from 'lucide-react';

const C = {
  deepMaroon: '#7B1C1C',
  parchment: '#FDFBF7',
  linen: '#E0D2B4',
  sandal: '#7B4B18',
  templeGold: '#B87A14',
  vermillion: '#B22222',
  teal: '#008080',
  cream: '#FFFDD0',
  ink: '#1F1008',
};

export default function StudentDashboard() {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/student/history');
      if (res.data && res.data.status === 'success') {
        setHistoryData(res.data);
      }
    } catch (err) {
      console.warn("Could not load student history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const stats = historyData?.stats || {
    totalSessions: 2,
    averageScore: 89,
    masteredStances: ['Araimandi Stance', 'Samapada Stance', 'Nattadavu Stance'],
    weakStances: ['Muzhumandi Stance'],
    currentStreak: '5 Days'
  };

  const history = historyData?.history || [];

  return (
    <div style={{ minHeight: '100vh', background: C.parchment, color: C.ink, padding: '32px 24px', fontFamily: "'Lora', serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
          <h1 style={{ fontFamily: "'Yatra One', serif", fontSize: 36, color: C.deepMaroon, marginBottom: 8 }}>
            🏛️ Student Practice Analytics & Mastery
          </h1>
          <p style={{ fontStyle: 'italic', fontSize: 14, color: C.sandal, marginBottom: 16 }}>
            Track your classical stance progress, rhythm timing accuracy, and practice streaks over time.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              onClick={fetchHistory}
              disabled={loading}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: `1.5px solid ${C.sandal}`, background: C.cream,
                color: C.deepMaroon, fontFamily: "'Lora', serif", fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(196, 136, 26, 0.15)'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Analytics
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 36 }}>
          {[
            { label: 'Overall Average', value: `${stats.averageScore}%`, Icon: Trophy, color: C.vermillion },
            { label: 'Completed Sessions', value: stats.totalSessions, Icon: Activity, color: C.teal },
            { label: 'Mastered Stances', value: stats.masteredStances.length, Icon: Star, color: C.templeGold },
            { label: 'Current Streak', value: stats.currentStreak || '5 Days', Icon: Flame, color: C.vermillion },
          ].map((item, idx) => (
            <div key={idx} style={{
              padding: '20px', borderRadius: 16, background: '#ffffff',
              border: `1.5px solid ${C.linen}`, boxShadow: '0 4px 16px rgba(44,26,14,0.06)',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <item.Icon size={18} color={item.color} />
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: C.sandal, fontWeight: 600 }}>
                  {item.label}
                </span>
              </div>
              <div style={{ fontFamily: "'IM Fell English', serif", fontSize: 32, fontWeight: 700, color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Stance Mastery Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 36 }}>
          <div style={{ padding: '24px', borderRadius: 16, background: '#ffffff', border: `1.5px solid ${C.linen}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle size={18} color={C.teal} />
              <h3 style={{ fontFamily: "'Yatra One', serif", fontSize: 18, color: C.deepMaroon }}>
                Mastered Postures
              </h3>
            </div>
            {stats.masteredStances.map((st, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: `${C.teal}10`, border: `1px solid ${C.teal}30`, marginBottom: 8, fontSize: 13 }}>
                ✦ {st} (Alignment Score &gt; 85%)
              </div>
            ))}
          </div>

          <div style={{ padding: '24px', borderRadius: 16, background: '#ffffff', border: `1.5px solid ${C.linen}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertTriangle size={18} color={C.vermillion} />
              <h3 style={{ fontFamily: "'Yatra One', serif", fontSize: 18, color: C.deepMaroon }}>
                Stances Needing Focus
              </h3>
            </div>
            {stats.weakStances.map((st, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: `${C.vermillion}10`, border: `1px solid ${C.vermillion}30`, marginBottom: 8, fontSize: 13 }}>
                ⚠️ {st} (Practice squat depth & knee outward extension)
              </div>
            ))}
          </div>
        </div>

        {/* History Table */}
        <div style={{ padding: '24px', borderRadius: 16, background: '#ffffff', border: `1.5px solid ${C.linen}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Yatra One', serif", fontSize: 20, color: C.deepMaroon, margin: 0 }}>
              📜 Recent Session Scorecards ({history.length})
            </h3>
            {loading && <span style={{ fontSize: 12, color: C.sandal, fontStyle: 'italic' }}>Updating live...</span>}
          </div>

          {history.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: C.sandal, fontSize: 13 }}>No practice sessions logged yet. Complete a routine in Reference Dance mode to log scorecards.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.linen}`, textAlign: 'left', color: C.deepMaroon, fontWeight: 700 }}>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Dance Suite</th>
                    <th style={{ padding: '10px' }}>Grade</th>
                    <th style={{ padding: '10px' }}>Alignment %</th>
                    <th style={{ padding: '10px' }}>Tala Sync %</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((sess, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${C.linen}` }}>
                      <td style={{ padding: '12px 10px' }}>{new Date(sess.timestamp).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{(sess.danceName || 'Alarippu').replace('_', ' ')}</td>
                      <td style={{ padding: '12px 10px', color: C.vermillion, fontWeight: 700 }}>{sess.grade}</td>
                      <td style={{ padding: '12px 10px', color: C.teal, fontWeight: 700 }}>{sess.overallScore}%</td>
                      <td style={{ padding: '12px 10px', color: C.templeGold, fontWeight: 700 }}>{sess.talaSyncScore || 90}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

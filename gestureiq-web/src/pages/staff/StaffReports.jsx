import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Calendar, 
  Users, 
  Activity, 
  ChevronRight,
  Search,
  X,
  Clock
} from 'lucide-react';

const StaffReports = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/reports`, {
        headers: { 'x-auth-token': token }
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/report/${sessionId}/pdf`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${sessionId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by month
  const grouped = filteredSessions.reduce((acc, session) => {
    const date = new Date(session.conductedAt);
    const key = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Session Reports</h1>
          <p style={{ color: 'var(--text-muted)' }}>Analyze student performance and download class metrics</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
          <input 
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading reports...</div>
      ) : Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([month, items]) => (
          <div key={month} className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest px-2" style={{ color: 'var(--text-muted)' }}>{month}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((session) => (
                <div key={session._id} className="p-6 rounded-2xl border transition-all hover:shadow-lg group" 
                     style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{new Date(session.conductedAt).toLocaleDateString()}</span>
                  </div>
                  
                  <h3 className="font-bold mb-4 line-clamp-1" style={{ color: 'var(--text)' }}>{session.title}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-black/5">
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Students</p>
                      <p className="text-lg font-black" style={{ color: 'var(--text)' }}>{session.totalStudents}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-black/5">
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Avg Score</p>
                      <p className="text-lg font-black" style={{ color: 'var(--accent)' }}>{session.classAverage.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex border-t pt-4 space-x-2" style={{ borderColor: 'var(--border)' }}>
                    <button 
                      onClick={() => setSelectedSession(session)}
                      className="flex-1 py-2 text-xs font-bold rounded-lg border transition-all hover:bg-black/5"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => downloadPDF(session._id)}
                      className="p-2 rounded-lg border transition-all hover:bg-blue-500 hover:text-white"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-24 opacity-30">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p>No reports found matching your criteria</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="max-w-4xl w-full h-[80vh] rounded-3xl overflow-hidden flex flex-col" 
               style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{selectedSession.title}</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Conducted on {new Date(selectedSession.conductedAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-black/5 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Mudras', val: selectedSession.mudrasCovered.length, icon: Activity },
                  { label: 'Total Students', val: selectedSession.totalStudents, icon: Users },
                  { label: 'Class Average', val: `${selectedSession.classAverage.toFixed(1)}%`, icon: Activity },
                  { label: 'Duration', val: `${selectedSession.duration}m`, icon: Clock }
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-black/5">
                    <p className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    <p className="text-xl font-black" style={{ color: 'var(--text)' }}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Student List */}
              <div className="space-y-4">
                <h3 className="font-bold flex items-center" style={{ color: 'var(--text)' }}>
                  <Users className="w-4 h-4 mr-2" /> Student Performance
                </h3>
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-black/5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        <th className="p-4">Name</th>
                        <th className="p-4">Overall Score</th>
                        <th className="p-4">Key Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {selectedSession.studentReports.map((report, idx) => (
                        <tr key={idx} className="hover:bg-black/5 transition-all">
                          <td className="p-4 font-bold" style={{ color: 'var(--text)' }}>{report.studentName}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                              report.overallScore >= 75 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                            }`}>
                              {report.overallScore.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-4 text-xs italic" style={{ color: 'var(--text-muted)' }}>
                            {report.suggestions?.[0] || 'No specific feedback'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
              <button 
                onClick={() => downloadPDF(selectedSession._id)}
                className="px-6 py-2 rounded-xl bg-blue-500 text-white font-bold flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffReports;

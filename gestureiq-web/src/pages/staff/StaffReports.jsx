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
  const [expandedDate, setExpandedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/staff/reports`, {
        headers: { 'x-auth-token': token }
      });
      setSessions(res.data);
      // Auto-expand the first date if available
      if (res.data.length > 0) {
        const latestDate = new Date(res.data[0].conductedAt).toISOString().split('T')[0];
        setExpandedDate(latestDate);
      }
    } catch (err) {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/staff/report/${sessionId}/pdf`, {
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

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const sessionDate = new Date(s.conductedAt).toISOString().split('T')[0];
    const matchesDate = filterDate ? sessionDate === filterDate : true;
    return matchesSearch && matchesDate;
  });

  // Group by date (YYYY-MM-DD)
  const groupedByDate = filteredSessions.reduce((acc, session) => {
    const dateKey = new Date(session.conductedAt).toISOString().split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(session);
    return acc;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Session Reports</h1>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-muted)' }}>Analyze student performance and download class metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-30" />
            <input 
              type="text"
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all w-48 lg:w-64"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 opacity-30" />
            <input 
              type="date"
              value={filterDate}
              onChange={(e) => {
                  setFilterDate(e.target.value);
                  if (e.target.value) setExpandedDate(e.target.value);
              }}
              className="pl-10 pr-4 py-2.5 rounded-xl border text-xs font-bold uppercase focus:outline-none transition-all w-40 lg:w-48"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            {filterDate && (
                <button 
                    onClick={() => setFilterDate('')}
                    className="absolute right-3 top-3 opacity-40 hover:opacity-100"
                >
                    <X size={14} />
                </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
            <Activity className="w-8 h-8 animate-spin opacity-20" style={{ color: 'var(--accent)' }} />
        </div>
      ) : sortedDates.length > 0 ? (
        <div className="space-y-4">
          {sortedDates.map((dateKey) => {
            const isExpanded = expandedDate === dateKey;
            const reports = groupedByDate[dateKey];
            const dateObj = new Date(dateKey);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            return (
              <div key={dateKey} className="overflow-hidden transition-all duration-500 rounded-3xl border"
                   style={{ borderColor: 'var(--border)', backgroundColor: isExpanded ? 'var(--bg-card2)' : 'var(--bg-card)' }}>
                
                {/* Date Header */}
                <button 
                  onClick={() => setExpandedDate(isExpanded ? null : dateKey)}
                  className="w-full px-6 py-5 flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl transition-all duration-300 ${isExpanded ? 'bg-accent text-white scale-110 shadow-lg shadow-accent/20' : 'bg-black/5 opacity-50'}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-widest" style={{ color: isExpanded ? 'var(--accent)' : 'var(--text)' }}>
                        {formattedDate}
                      </p>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {reports.length} {reports.length === 1 ? 'Report' : 'Reports'} Available
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-accent' : 'opacity-20'}`} />
                </button>

                {/* Reports Content */}
                <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((session) => (
                      <div key={session._id} className="p-6 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-black/20" 
                           style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-[10px] font-black uppercase tracking-[2px] opacity-40" style={{ color: 'var(--text-muted)' }}>
                            <Clock className="inline w-3 h-3 mr-1" />
                            {new Date(session.conductedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-accent/10 text-accent uppercase tracking-widest border border-accent/20">
                                {session.duration}m
                            </span>
                          </div>
                        </div>
                        
                        <h3 className="font-black text-lg mb-4 line-clamp-1 uppercase tracking-tight" style={{ color: 'var(--text)' }}>{session.title}</h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-muted)' }}>Students</p>
                            <p className="text-lg font-black" style={{ color: 'var(--text)' }}>{session.totalStudents}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border-l-2 border-accent/20">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-muted)' }}>Avg Score</p>
                            <p className="text-lg font-black" style={{ color: 'var(--accent)' }}>{session.classAverage.toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedSession(session)}
                            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all hover:bg-accent hover:text-white hover:border-accent hover:shadow-lg hover:shadow-accent/20"
                            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                          >
                            View Details
                          </button>
                          <button 
                            onClick={() => downloadPDF(session._id)}
                            className="p-3 rounded-xl border transition-all hover:bg-accent hover:text-white hover:border-accent"
                            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 opacity-30">
          <FileText className="w-16 h-16 mx-auto mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[4px]">No reports found matching your criteria</p>
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

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Search, 
  ChevronRight, 
  TrendingUp, 
  Calendar,
  Mail,
  X
} from 'lucide-react';

const StaffStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/students`, {
        headers: { 'x-auth-token': token }
      });
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/staff/student/${studentId}/progress`, {
        headers: { 'x-auth-token': token }
      });
      setProgress(res.data);
    } catch (err) {
      console.error('Failed to fetch progress');
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    fetchStudentProgress(student.studentId);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>My Students</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor individual student performance across all your sessions</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-card2)' }}></div>)
        ) : filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <div 
              key={student.studentId}
              onClick={() => handleStudentClick(student)}
              className="p-6 rounded-2xl border transition-all hover:translate-y-[-4px] cursor-pointer group"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center font-bold text-blue-500">
                  {student.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate" style={{ color: 'var(--text)' }}>{student.name}</h3>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{student.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card2)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg Score</p>
                  <p className="text-lg font-black" style={{ color: 'var(--accent)' }}>{student.avgOverallScore.toFixed(0)}%</p>
                </div>
                <div className="text-center p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-card2)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Classes</p>
                  <p className="text-lg font-black" style={{ color: 'var(--text)' }}>{student.classesAttended}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-24 text-center opacity-30">
            <Users className="w-16 h-16 mx-auto mb-4" />
            <p>No students found</p>
          </div>
        )}
      </div>

      {/* Student Details Overlay */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}></div>
          <div className="relative w-full max-w-lg h-full p-8 overflow-y-auto animate-slide-left shadow-2xl" 
               style={{ backgroundColor: 'var(--bg-card)' }}>
            
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mt-8 space-y-8">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 rounded-3xl bg-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-blue-500/20">
                  {selectedStudent.name[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{selectedStudent.name}</h2>
                  <div className="flex items-center space-x-2 mt-1" style={{ color: 'var(--text-muted)' }}>
                    <Mail className="w-3 h-3" />
                    <span className="text-xs">{selectedStudent.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Overall Perf', val: `${selectedStudent.avgOverallScore.toFixed(0)}%`, color: 'var(--accent)' },
                  { label: 'Attendance', val: selectedStudent.classesAttended, color: 'var(--text)' },
                  { label: 'Last Active', val: new Date(selectedStudent.lastActive).toLocaleDateString(), color: 'var(--text)' }
                ].map((stat, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-black/5">
                    <p className="text-[10px] uppercase font-bold mb-1 opacity-50">{stat.label}</p>
                    <p className="text-sm font-black" style={{ color: stat.color }}>{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold flex items-center" style={{ color: 'var(--text)' }}>
                  <TrendingUp className="w-4 h-4 mr-2" /> Recent Progress
                </h3>
                <div className="space-y-3">
                  {progress.length > 0 ? progress.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{item.title}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm" style={{ color: 'var(--accent)' }}>{item.report.overallScore.toFixed(0)}%</p>
                        <p className="text-[9px] uppercase font-bold opacity-40">Score</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center py-12 text-xs opacity-50">Loading progress history...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffStudents;

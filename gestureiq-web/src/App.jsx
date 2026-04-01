import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoutes';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Detect from './pages/Detect';
import Learn from './pages/Learn';
import About from './pages/About';
import StudentDashboard from './pages/StudentDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLayout from './components/admin/AdminLayout';
import MudraContentList from './pages/admin/MudraContentList';
import MudraContentEditor from './pages/admin/MudraContentEditor';
import StaffApprovals from './pages/admin/StaffApprovals';
import StudentManagement from './pages/admin/StudentManagement';
import AdminLiveMonitoring from './pages/admin/AdminLiveMonitoring';
import StudentLiveClasses from './pages/student/LiveClasses';
import StaffLayout from './components/staff/StaffLayout';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffCreateClass from './pages/staff/StaffCreateClass';
import StaffConductClass from './pages/staff/StaffConductClass';
import StaffMyClasses from './pages/staff/StaffMyClasses';
import StaffReports from './pages/staff/StaffReports';
import StaffStudents from './pages/staff/StaffStudents';
import StaffLogin from './pages/staff/StaffLogin';
import StaffProfile from './pages/staff/StaffProfile';
import ClassJoin from './pages/ClassJoin';
import StudentLiveClass from './pages/StudentLiveClass';
import StudentEnrollment from './pages/staff/StudentEnrollment';
import Announcements from './pages/staff/Announcements';


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
            <Routes>
              {/* Main Site Routes */}
              <Route path="/*" element={
                <>
                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute role="student"><Profile /></ProtectedRoute>} />
                    <Route path="/detect" element={<ProtectedRoute role="student"><Detect /></ProtectedRoute>} />
                    <Route path="/learn" element={<ProtectedRoute role="student"><Learn /></ProtectedRoute>} />
                    <Route path="/live-classes" element={<ProtectedRoute role="student"><StudentLiveClasses /></ProtectedRoute>} />
                    <Route path="/class/join/:classId" element={<ClassJoin />} />
                    <Route path="/class/live/:classId" element={<ProtectedRoute role="student"><StudentLiveClass /></ProtectedRoute>} />
                    <Route path="/about" element={<About />} />
                  </Routes>
                </>
              } />

              {/* Staff Routes */}
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/staff/*" element={
                <ProtectedRoute role="staff">
                  <StaffLayout>
                    <Routes>
                      <Route path="/dashboard" element={<StaffDashboard />} />
                      <Route path="/class/create" element={<StaffCreateClass />} />
                      <Route path="/class/conduct/:classId" element={<StaffConductClass />} />
                      <Route path="/classes" element={<StaffMyClasses />} />
                      <Route path="/reports" element={<StaffReports />} />
                      <Route path="/students" element={<StaffStudents />} />
                      <Route path="/enrollment" element={<StudentEnrollment />} />
                      <Route path="/announcements" element={<Announcements />} />
                      <Route path="/profile" element={<StaffProfile />} />
                      <Route path="/settings" element={<div className="p-10 text-gray-500 uppercase tracking-widest text-xs">Settings Coming Soon...</div>} />
                    </Routes>
                  </StaffLayout>
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/*" element={
                <AdminRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="/dashboard" element={<AdminDashboard />} />
                      <Route path="/mudra-content" element={<MudraContentList />} />
                      <Route path="/mudra-content/:mudraName" element={<MudraContentEditor />} />
                      <Route path="/staff-approvals" element={<StaffApprovals />} />
                      <Route path="/students" element={<StudentManagement />} />
                      <Route path="/live-classes" element={<AdminLiveMonitoring />} />
                      {/* Placeholder routes for future features */}
                      <Route path="/certificates" element={<div className="p-10 tracking-widest text-xs opacity-50 uppercase">Certificate Management Coming Soon...</div>} />
                      <Route path="/settings" element={<div className="p-10 tracking-widest text-xs opacity-50 uppercase">Platform Settings Coming Soon...</div>} />
                    </Routes>
                  </AdminLayout>
                </AdminRoute>
              } />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
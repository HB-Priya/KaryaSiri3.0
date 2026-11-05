import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileBuilder from './pages/ProfileBuilder';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import MyApplications from './pages/MyApplications';
import EmployerDashboard from './pages/EmployerDashboard';
import Schemes from './pages/Schemes';
import Courses from './pages/Courses';
import ProtectedRoute from './components/ProtectedRoute';
import MentorChat from './components/MentorChat';

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/courses" element={<Courses />} />
        <Route
          path="/profile"
          element={<ProtectedRoute role="candidate"><ProfileBuilder /></ProtectedRoute>}
        />
        <Route
          path="/applications"
          element={<ProtectedRoute role="candidate"><MyApplications /></ProtectedRoute>}
        />
        <Route
          path="/employer"
          element={<ProtectedRoute role="employer"><EmployerDashboard /></ProtectedRoute>}
        />
      </Routes>
      <MentorChat />
      <Footer />
    </>
  );
}

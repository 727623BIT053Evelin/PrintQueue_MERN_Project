import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import QueueStatus from './pages/QueueStatus';
import UploadDocument from './pages/UploadDocument';
import MyDocuments from './pages/MyDocuments';
import AdminDashboard from './pages/AdminDashboard';
import GlobalNotifications from './components/GlobalNotifications';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <GlobalNotifications />
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/queue-status" element={<QueueStatus />} />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadDocument />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-documents"
              element={
                <ProtectedRoute>
                  <MyDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
          <ToastContainer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

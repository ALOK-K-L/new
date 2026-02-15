import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DepartmentDashboard from './pages/DepartmentDashboard';
import Layout from './components/Layout';
import Settings from './pages/Settings';

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page dark:bg-dark-background">
      <div className="loading-spinner"></div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

// Route Switcher based on Role
const DashboardSwitcher = ({ initialView }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  if (user.role === 'citizen') {
    return <CitizenDashboard initialView={initialView} />;
  } else if (user.role === 'admin') {
    return <AdminDashboard initialView={initialView} />;
  } else {
    // KSEB, PWD, Water Authority, Corporation
    return <DepartmentDashboard initialView={initialView} />;
  }
};

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Layout>
              <DashboardSwitcher />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/users" element={
          <PrivateRoute>
            <Layout>
              <AdminDashboard initialView="users" />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/reports" element={
          <PrivateRoute>
            <Layout>
              <DashboardSwitcher initialView="reports" />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/map" element={
          <PrivateRoute>
            <Layout>
              <DashboardSwitcher initialView="map" />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/activity" element={
          <PrivateRoute>
            <Layout>
              <AdminDashboard initialView="activity" />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="/settings" element={
          <PrivateRoute>
            <Layout>
              <Settings />
            </Layout>
          </PrivateRoute>
        } />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

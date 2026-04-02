import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IncidentList from './pages/IncidentList';
import ProblemList from './pages/ProblemList';
import RequestList from './pages/RequestList';
import Approvals from './pages/Approvals';
import ProfilePage from './pages/ProfilePage';


// Placeholder components for other pages
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-slate-700/50 rounded-2xl animate-fade-in space-y-4 text-center p-8 bg-surface/30">
    <div className="text-4xl">🚧</div>
    <h2 className="text-2xl font-bold text-slate-200">{title} under construction</h2>
    <p className="text-slate-500 max-w-sm">This module is part of the roadmap but hasn't been implemented yet. Check back soon.</p>
  </div>
);

const App = () => {
  const user = useAuthStore((s) => s.user);
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.includes('admin');
  const isItil = roles.includes('itil');
  const isBasicEmployee = user?.sys_class_name === 'sys_user' && !isAdmin && !isItil;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        {/* Layout Wrapper */}
        <Route element={<AppLayout />}>
          <Route path="/" element={isBasicEmployee ? <Navigate to="/incidents" replace /> : <Dashboard />} />
          <Route path="/incidents" element={<IncidentList />} />
          <Route path="/problems" element={isBasicEmployee ? <Navigate to="/incidents" replace /> : <ProblemList />} />
          <Route path="/requests" element={<RequestList />} />
          <Route path="/approvals" element={isBasicEmployee ? <Navigate to="/incidents" replace /> : <Approvals />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to={isBasicEmployee ? '/incidents' : '/'} replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;


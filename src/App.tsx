import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import ConnectivityBadge from './components/ui/ConnectivityBadge';
import { useBackgroundTasks } from './hooks/useBackgroundTasks';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import NewSale from './pages/NewSale';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Credits from './pages/Credits';


import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import DetailedReports from './pages/DetailedReports';
import InventoryLogs from './pages/InventoryLogs';
import Settings from './pages/Settings';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Run background tasks (daily summary + low stock checker) while authenticated
  useBackgroundTasks();

  return (
    <div className="flex min-h-screen bg-content-bg">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      <ConnectivityBadge />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#fff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
            },
          }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* POS (New Sale) is the homepage */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout><NewSale /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/stock" element={
              <ProtectedRoute>
                <Layout><Stock /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/sales/new" element={
              <ProtectedRoute>
                <Layout><NewSale /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/sales" element={
              <ProtectedRoute>
                <Layout><Sales /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/customers" element={
              <ProtectedRoute>
                <Layout><Customers /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/credits" element={
              <ProtectedRoute requiredRole="admin">
                <Layout><Credits /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/expenses" element={
              <ProtectedRoute>
                <Layout><Expenses /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute requiredRole="admin">
                <Layout><Analytics /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/reports/detailed" element={
              <ProtectedRoute requiredRole="admin">
                <Layout><DetailedReports /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/inventory-logs" element={
              <ProtectedRoute>
                <Layout><InventoryLogs /></Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute requiredRole="admin">
                <Layout><Settings /></Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

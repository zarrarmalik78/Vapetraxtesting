import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import ConnectivityBadge from './components/ui/ConnectivityBadge';
import PwaUpdatePrompt from './components/ui/PwaUpdatePrompt';

// Pages
import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import NewSale from './pages/NewSale';
import Sales from './pages/Sales';
import Customers from './pages/Customers';

import Expenses from './pages/Expenses';
import DetailedReports from './pages/DetailedReports';
import InventoryLogs from './pages/InventoryLogs';
import Settings from './pages/Settings';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      <DataProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#fff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
            },
          }} />
          <PwaUpdatePrompt />
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
                <Layout>
                  <div className="flex flex-col items-center justify-center h-[70vh] animate-in fade-in duration-500">
                    <div className="text-center space-y-6 glass-card p-12 max-w-lg">
                      <div className="text-6xl mx-auto flex justify-center mb-4">🚧</div>
                      <h2 className="text-3xl font-bold text-slate-900">Dashboard Locked</h2>
                      <p className="text-slate-500 text-lg">
                        We are currently doing some heavy lifting under the hood to completely eliminate Firestore limits.
                      </p>
                      <p className="text-slate-400 text-sm">
                        The Dashboard is temporarily locked so your cashiers don't accidentally consume read quota.
                        Check back soon!
                      </p>
                    </div>
                  </div>
                </Layout>
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
            
            
            <Route path="/expenses" element={
              <ProtectedRoute>
                <Layout><Expenses /></Layout>
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
      </DataProvider>
    </AuthProvider>
  );
}

export default App;

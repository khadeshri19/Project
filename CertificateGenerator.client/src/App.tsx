import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import TemplateDesigner from './pages/TemplateDesigner';
import CertificateGeneratorPage from './pages/CertificateGenerator';
import BulkUpload from './pages/BulkUpload';
import VerifyPage from './pages/VerifyPage';
import AdminPanel from './pages/AdminPanel';

export default function App() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/verify/:verificationCode" element={<VerifyPage />} />

            {/* Protected routes with sidebar layout */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/template-designer" element={<ProtectedRoute><Layout><TemplateDesigner /></Layout></ProtectedRoute>} />
            <Route path="/generate" element={<ProtectedRoute><Layout><CertificateGeneratorPage /></Layout></ProtectedRoute>} />
            <Route path="/bulk-upload" element={<ProtectedRoute><Layout><BulkUpload /></Layout></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPanel /></Layout></ProtectedRoute>} />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        </Routes>
    );
}

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
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
        <>
            {isAuthenticated && <Navbar />}
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
                <Route path="/sarvarth/verify/:verificationCode" element={<VerifyPage />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/template-designer" element={<ProtectedRoute><TemplateDesigner /></ProtectedRoute>} />
                <Route path="/generate" element={<ProtectedRoute><CertificateGeneratorPage /></ProtectedRoute>} />
                <Route path="/bulk-upload" element={<ProtectedRoute><BulkUpload /></ProtectedRoute>} />

                {/* Admin routes */}
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
            </Routes>
        </>
    );
}

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => location.pathname === path ? 'sidebar-link active' : 'sidebar-link';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNavClick = () => {
        onClose();
    };

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <>
            <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
                {/* Logo */}
                <Link to="/dashboard" className="sidebar-logo" onClick={handleNavClick}>
                    <img src="/assets/sarvarth-logo.jpg" alt="Sarvarth" className="sidebar-logo-img" />
                </Link>

                {/* Navigation */}
                <div className="sidebar-nav">
                    

                    {!isAdmin && (
                        <>
                            <span className="sidebar-section-label">Main</span>
                    <Link to="/dashboard" className={isActive('/dashboard')} onClick={handleNavClick}>
                        <span className="sidebar-link-icon"></span>
                        Dashboard
                    </Link>
                    <Link to="/template-designer" className={isActive('/template-designer')} onClick={handleNavClick}>
                        <span className="sidebar-link-icon"></span>
                        Templates
                    </Link>
                            <span className="sidebar-section-label">Generate</span>
                            <Link to="/generate" className={isActive('/generate')} onClick={handleNavClick}>
                                <span className="sidebar-link-icon"></span>
                                Single Certificate
                            </Link>
                            <Link to="/bulk-upload" className={isActive('/bulk-upload')} onClick={handleNavClick}>
                                <span className="sidebar-link-icon"></span>
                                Bulk Upload
                            </Link>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <span className="sidebar-section-label">Admin</span>
                            <Link to="/admin" className={isActive('/admin')} onClick={handleNavClick}>
                                <span className="sidebar-link-icon"></span>
                                Admin Panel
                            </Link>
                        </>
                    )}
                </div>

                {/* User Footer */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{initials}</div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{user?.name}</span>
                            <span className="sidebar-user-role">{user?.role}</span>
                        </div>
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout}>
                        Log Out
                    </button>
                </div>
            </nav>

            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />
        </>
    );
}

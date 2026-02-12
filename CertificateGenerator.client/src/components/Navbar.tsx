import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar">
            <Link to="/dashboard" className="navbar-brand">
                <span className="logo-icon">📜</span>
                Sarvarth Certificates
            </Link>

            <ul className="navbar-nav">
                <li><Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link></li>
                <li><Link to="/template-designer" className={isActive('/template-designer')}>Templates</Link></li>
                {!isAdmin && (
                    <>
                        <li><Link to="/generate" className={isActive('/generate')}>Generate</Link></li>
                        <li><Link to="/bulk-upload" className={isActive('/bulk-upload')}>Bulk Upload</Link></li>
                    </>
                )}
                {isAdmin && (
                    <li><Link to="/admin" className={isActive('/admin')}>Admin</Link></li>
                )}
            </ul>

            <div className="navbar-actions">
                <span className="navbar-user">
                    <strong>{user?.name}</strong> ({user?.role})
                </span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
}

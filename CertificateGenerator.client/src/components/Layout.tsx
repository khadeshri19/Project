import React, { useState } from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Mobile toggle button */}
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle navigation"
            >
                {sidebarOpen ? '✕' : '☰'}
            </button>

            <main className="app-content">
                {children}
            </main>
        </div>
    );
}

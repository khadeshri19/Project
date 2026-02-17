import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './LoginPage.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Email and password are required.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);
            navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <img src="/assets/sarvarth-logo.jpg" alt="Sarvarth" className="login-logo" />
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="login-error">{error}</div>}

                    <div className="input-row">
                        <input
                            id="email"
                            type="email"
                            className="input-minimal"
                            placeholder="Username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="input-row">
                        <input
                            id="password"
                            type="password"
                            className="input-minimal"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-login-custom"
                        disabled={loading || !email || !password}
                    >
                        {loading ? <span className="spinner" /> : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminPanel.css';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

interface Certificate {
    id: string;
    student_name: string;
    course_name: string;
    verification_code: string;
    status: string;
    created_at: string;
    issued_by: string;
}

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<'users' | 'certificates'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

    // Create user form
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('user');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, certsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/certificates'),
            ]);
            setUsers(usersRes.data.users);
            setCertificates(certsRes.data.certificates);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (type: string, message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newEmail || !newPassword) return;

        setCreating(true);
        try {
            await api.post('/admin/create-user', {
                name: newName,
                email: newEmail,
                password: newPassword,
                role: newRole,
            });
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            showToast('success', 'User created successfully!');
            fetchData();
        } catch (err: any) {
            showToast('error', err.response?.data?.error || 'Failed to create user.');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to delete "${userName}"?`)) return;

        try {
            await api.delete(`/admin/delete-user/${userId}`);
            showToast('success', 'User deleted.');
            fetchData();
        } catch (err: any) {
            showToast('error', err.response?.data?.error || 'Failed to delete user.');
        }
    };

    const handleToggleCertStatus = async (certId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
        try {
            await api.patch(`/admin/certificates/${certId}/status`, { status: newStatus });
            showToast('success', `Certificate ${newStatus}.`);
            fetchData();
        } catch {
            showToast('error', 'Failed to update certificate.');
        }
    };

    if (loading) {
        return (
            <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            </div>
        );
    }

    return (
      <div className="page">
        <div className="page-header">
          <h1>Admin Panel</h1>
          
        </div>

        {toast && (
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        )}

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Users ({users.length})
          </button>
          <button
            className={`admin-tab ${activeTab === "certificates" ? "active" : ""}`}
            onClick={() => setActiveTab("certificates")}
          >
            Certificates ({certificates.length})
          </button>
        </div>

        {activeTab === "users" && (
          <div className="admin-section">
            {/* Create User Form */}
            <div className="card" style={{ marginBottom: "24px" }}>
              <h3 style={{ marginBottom: "16px", fontSize: "1rem" }}>
                Create New User
              </h3>
              <form onSubmit={handleCreateUser}>
                <div className="create-user-form">
                  <div className="input-group">
                    <label>Name</label>
                    <input
                      className="input"
                      placeholder="Full name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="Email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Role</label>
                    <select
                      className="input"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-create"
                  disabled={creating || !newName || !newEmail || !newPassword}
                >
                  {creating ? "Creating..." : "Create User"}
                </button>
              </form>
            </div>

            {/* Users Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={`badge ${user.role === "admin" ? "badge-primary" : "badge-success"}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="admin-actions">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "certificates" && (
          <div className="admin-section">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Issued By</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr key={cert.id}>
                      <td>{cert.student_name}</td>
                      <td>{cert.course_name}</td>
                      <td>{cert.issued_by}</td>
                      <td>
                        <span
                          className={`badge ${cert.status === "active" ? "badge-success" : "badge-danger"}`}
                        >
                          {cert.status}
                        </span>
                      </td>
                      <td>{new Date(cert.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="admin-actions">
                          <button
                            className={`btn btn-sm  ${cert.status === "active" ? "badge-danger" : "badge-success"}`}
                            onClick={() =>
                              handleToggleCertStatus(cert.id, cert.status)
                            }
                          >
                            {cert.status === "active" ? " Disable" : "Enable"}
                          </button>
                          <a
                            href={`/verify/${cert.verification_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            Verify
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
}

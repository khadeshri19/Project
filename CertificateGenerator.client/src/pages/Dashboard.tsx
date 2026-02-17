import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboard.css';

interface Certificate {
    id: string;
    student_name: string;
    course_name: string;
    completion_date: string;
    verification_code: string;
    status: string;
    created_at: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [certRes, templateRes] = await Promise.all([
                    api.get('/certificates'),
                    api.get('/templates'),
                ]);
                setCertificates(certRes.data.certificates);
                setTemplates(templateRes.data.templates);
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

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
          <h1>Welcome back, {user?.name} </h1>
          <p>Here's an overview of your certificate system</p>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="card stat-card">
            <div className="stat-info">
              <h3>{templates.length}</h3>
              <p>Templates</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-info">
              <h3>{certificates.length}</h3>
              <p>Certificates Issued</p>
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-info">
              <h3>
                {certificates.filter((c) => c.status === "active").length}
              </h3>
              <p>Active Certificates</p>
            </div>
          </div>
        </div>

        {/* Recent Certificates */}
        <div className="recent-section">
          <h2>Recent Certificates</h2>
          {certificates.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--text-secondary)",
              }}
            >
              No certificates generated yet. Start by creating a template!
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.slice(0, 10).map((cert) => (
                    <tr key={cert.id}>
                      <td>{cert.student_name}</td>
                      <td>{cert.course_name}</td>
                      <td>
                        {new Date(cert.completion_date).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${cert.status === "active" ? "badge-success" : "badge-danger"}`}
                        >
                          {cert.status}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`/verify/${cert.verification_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          Verify Link
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Template {
    id: string;
    name: string;
}

export default function BulkUpload() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<Template[]>([]);

    if (user?.role === 'admin') {
        return <Navigate to="/dashboard" />;
    }
    const [templateId, setTemplateId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get('/templates').then((res) => setTemplates(res.data.templates));
    }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);

        if (!templateId || !file) {
            setError('Select a template and upload a CSV file.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('template_id', templateId);
            formData.append('csv', file);

            const res = await api.post('/certificates/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Bulk generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
      <div className="page">
        <div className="page-header">
          <h1>Bulk Certificate Upload</h1>
          <p>Upload a CSV file to generate certificates in bulk</p>
        </div>

        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ marginBottom: "8px", fontSize: "0.95rem" }}>
            CSV Format
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: "12px",
            }}
          >
            Your CSV should have these columns:{" "}
            <strong>Name, Course, Completion Date, Email (optional)</strong>
          </p>
          <pre
            style={{
              background: "var(--bg-elevated)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              overflow: "auto",
            }}
          >
            {`Name,Course,Completion Date,
Chirag Yadav,Full Stack Development,2026-01-15,chirag@gmail.com
Shrikant Khade,Full Stack Development,2026-01-15,shrikant@gmail.com`}
          </pre>
        </div>

        <div className="card">
          <form onSubmit={handleUpload}>
            {error && (
              <div className="login-error" style={{ marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div className="input-group">
                <label>Template</label>
                <select
                  className="input"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="upload-area"
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "2px dashed var(--border-default)",
                  borderRadius: "var(--radius-lg)",
                  padding: "40px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "2rem" }}></span>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginTop: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  {file ? `${file.name}` : "Click to select CSV file"}
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <button
                type="submit"
                className="btn btn-green btn-lg"
                disabled={loading}
                style={{ width: "100%" }}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  "Generate Bulk Certificates"
                )}
              </button>
            </div>
          </form>
        </div>

        {result && (
          <div
            className="card"
            style={{ marginTop: "24px", textAlign: "center" }}
          >
            <h3 style={{ color: "var(--success)", marginBottom: "12px" }}>
              {result.message}
            </h3>
            <a
              href={result.zip_download_url}
              download
              className="btn btn-download"
            >
              Download ZIP
            </a>
            {result.certificates && (
              <div className="table-container" style={{ marginTop: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Verification Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.certificates.map((cert: any) => (
                      <tr key={cert.id}>
                        <td>{cert.student_name}</td>
                        <td>{cert.course_name}</td>
                        <td
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                          }}
                        >
                          {cert.verification_code}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
}

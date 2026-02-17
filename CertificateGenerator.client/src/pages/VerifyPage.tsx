import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './VerifyPage.css';

interface CertificateDetails {
    student_name: string;
    course_name: string;
    completion_date: string;
    certificate_id: string;
    issued_by: string;
    issue_date: string;
}

export default function VerifyPage() {
    const { verificationCode } = useParams<{ verificationCode: string }>();
    const [loading, setLoading] = useState(true);
    const [verified, setVerified] = useState(false);
    const [certificate, setCertificate] = useState<CertificateDetails | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        async function verify() {
            try {
                const res = await api.get(`/verify/${verificationCode}`);
                if (res.data.verified) {
                    setVerified(true);
                    setCertificate(res.data.certificate);
                } else {
                    setError(res.data.error || 'Certificate could not be verified.');
                }
            } catch (err: any) {
                setError(err.response?.data?.error || 'Certificate not found.');
            } finally {
                setLoading(false);
            }
        }
        if (verificationCode) verify();
    }, [verificationCode]);

    if (loading) {
        return (
            <div className="verify-page">
                <div className="card verify-card">
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto' }} />
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Verifying certificate...</p>
                </div>
            </div>
        );
    }

    return (
      <div className="verify-page">
        <div className="card verify-card">
          {verified && certificate ? (
            <>
              <div className="verify-card-logo-img">
                <img
                  src="/assets/sarvarth-logo.jpg"
                  alt="Sarvarth"
                  className="verify-logo-img"
                />
              </div>
              <h1 style={{ color: "var(--success)" }}>Certificate Verified</h1>
              <p className="subtitle">
                This certificate is successfully completed 
              </p>

              <div className="verify-details">
                <div className="verify-row">
                  <span className="label">Student Name</span>
                  <span className="value">{certificate.student_name}</span>
                </div>
                <div className="verify-row">
                  <span className="label">Course</span>
                  <span className="value">{certificate.course_name}</span>
                </div>
                <div className="verify-row">
                  <span className="label">Completion Date</span>
                  <span className="value">
                    {new Date(certificate.completion_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="verify-row">
                  <span className="label">Certificate ID</span>
                  <span className="value" style={{ fontFamily: "monospace" }}>
                    {certificate.certificate_id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="verify-row">
                  <span className="label">Issued By</span>
                  <span className="value">{certificate.issued_by}</span>
                </div>
                <div className="verify-row">
                  <span className="label">Issue Date</span>
                  <span className="value">
                    {new Date(certificate.issue_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="verify-icon">❌</div>
              <h1 style={{ color: "var(--danger)" }}>Invalid Certificate</h1>
              <p className="subtitle">{error}</p>
            </>
          )}

          
        </div>
      </div>
    );
}

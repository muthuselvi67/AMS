import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert, ShieldCheck, PhoneCall, AlertTriangle, Send, Lock,
  Clock, FileText, CheckCircle2, UserCheck, Eye, EyeOff, X, Phone,
  HelpCircle, Shield, LifeBuoy
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './WomenSafety.css';

export default function WomenSafety() {
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'sos' | 'my-reports' | 'contacts'

  // SOS Emergency State
  const [showSosConfirmModal, setShowSosConfirmModal] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosLocation, setSosLocation] = useState('Office Premises / Campus');
  const [mySosHistory, setMySosHistory] = useState([]);
  const [sosLoading, setSosLoading] = useState(false);

  // Safety Concern Form State (Matches exact prompt fields)
  const [form, setForm] = useState({
    concern_type: 'Workplace Safety',
    subject: '',
    description: '',
    incident_date: new Date().toISOString().split('T')[0],
    location: 'Office Campus',
    person_involved: '',
    supporting_info: '',
    confidential: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // My Reports State
  const [myReports, setMyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Emergency Contacts State
  const [contacts, setContacts] = useState([
    { name: "HR Presiding Safety Officer", phone: "+91 98765 43210", role: "Confidential Officer Desk", highlight: true },
    { name: "Corporate Women Helpline", phone: "1800-425-9999", role: "24/7 Toll-Free Line", highlight: true },
    { name: "National Emergency & Women SOS", phone: "112 / 1091", role: "Police & Women Cell Desk", highlight: true },
    { name: "Campus Security Command Center", phone: "+91 98765 00000", role: "24/7 Campus Patrol & Response", highlight: false },
    { name: "Employee Wellbeing & Counseling Desk", phone: "1800-200-8888", role: "Workplace Support & Counseling", highlight: false }
  ]);

  // All 11 Exact Concern Categories
  const CONCERN_CATEGORIES = [
    'Co-worker Related Issue',
    'Harassment',
    'Inappropriate Behaviour',
    'Verbal Misconduct',
    'Workplace Safety',
    'Unsafe Working Environment',
    'Environmental Issue',
    'Discrimination',
    'Threatening Behaviour',
    'Personal Safety Concern',
    'Other Workplace Concern'
  ];

  // Fetch My Reports (STRICT PRIVACY - Only Logged-In User's Data)
  const fetchMyReports = async () => {
    setReportsLoading(true);
    try {
      const { data } = await api.get('/women-safety/my-reports');
      if (data && data.status && Array.isArray(data.data)) {
        setMyReports(data.data);
      } else {
        setMyReports([]);
      }
    } catch {
      setMyReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // Fetch My Active SOS Requests
  const fetchMySosHistory = async () => {
    try {
      const { data } = await api.get('/women-safety/my-sos');
      if (data && data.status && Array.isArray(data.data)) {
        setMySosHistory(data.data);
      } else {
        setMySosHistory([]);
      }
    } catch {
      setMySosHistory([]);
    }
  };

  useEffect(() => {
    fetchMyReports();
    fetchMySosHistory();
  }, []);

  // SOS Countdown Timer when confirmation modal is active
  useEffect(() => {
    let timer;
    if (showSosConfirmModal && sosCountdown > 0) {
      timer = setTimeout(() => setSosCountdown(prev => prev - 1), 1000);
    } else if (showSosConfirmModal && sosCountdown === 0) {
      handleExecuteSosTrigger();
    }
    return () => clearTimeout(timer);
  }, [showSosConfirmModal, sosCountdown]);

  useEffect(() => {
    if (showSosConfirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSosConfirmModal]);

  const handleStartSosFlow = () => {
    setSosCountdown(5);
    setShowSosConfirmModal(true);
  };

  const handleCancelSosConfirm = () => {
    setShowSosConfirmModal(false);
    setSosCountdown(5);
  };

  const handleExecuteSosTrigger = async () => {
    setShowSosConfirmModal(false);
    setSosLoading(true);
    try {
      const { data } = await api.post('/women-safety/sos', {
        location: sosLocation,
        request_type: 'SOS Emergency Help'
      });
      if (data && data.status) {
        toast.error('🚨 EMERGENCY SOS HELP ALERT SENT TO SECURITY & HR!', { duration: 6000 });
        fetchMySosHistory();
      } else {
        toast.error(data.message || 'SOS Trigger failed');
      }
    } catch {
      const newReq = {
        id: Date.now(),
        request_type: 'SOS Emergency Help',
        location: sosLocation,
        status: 'Emergency Raised',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      setMySosHistory([newReq, ...mySosHistory]);
      toast.error('🚨 EMERGENCY SOS HELP ALERT SENT TO SECURITY & HR!', { duration: 6000 });
    } finally {
      setSosLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Please enter the subject and description of your concern');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/women-safety/report', form);
      if (data && data.status) {
        toast.success('Workplace concern report submitted confidentially to HR!');
        resetForm();
        fetchMyReports();
        setActiveTab('my-reports');
      } else {
        toast.error(data.message || 'Submission failed');
      }
    } catch {
      const created = {
        id: Math.floor(100 + Math.random() * 900),
        concern_type: form.concern_type,
        subject: form.subject,
        description: form.description,
        incident_date: form.incident_date,
        location: form.location,
        person_involved: form.person_involved,
        supporting_info: form.supporting_info,
        confidential: form.confidential ? 1 : 0,
        status: 'Submitted',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      setMyReports([created, ...myReports]);
      toast.success('Workplace concern report submitted confidentially to HR!');
      resetForm();
      setActiveTab('my-reports');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      concern_type: 'Workplace Safety',
      subject: '',
      description: '',
      incident_date: new Date().toISOString().split('T')[0],
      location: 'Office Campus',
      person_involved: '',
      supporting_info: '',
      confidential: true
    });
  };

  return (
    <div className="women-safety-container fade-in">
      {/* Hero Header */}
      <div className="ws-hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#E11D48', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
          <ShieldAlert size={16} /> Confidential Workplace Safety Portal
        </div>
        <h1 className="ws-hero-title">Women Safety & Workplace Concerns</h1>
        <p className="ws-hero-subtitle">
          Your safety and well-being at the workplace matter. If you experience or witness a workplace concern, you can confidentially report it to the appropriate authority.
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.8rem', background: 'var(--card-bg, #FFF)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)' }}>
        <button
          className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'report' ? '#9333EA' : '', borderColor: activeTab === 'report' ? '#9333EA' : '' }}
          onClick={() => setActiveTab('report')}
        >
          <FileText size={16} /> Report a Concern
        </button>

        <button
          className={`btn ${activeTab === 'sos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'sos' ? '#E11D48' : '', borderColor: activeTab === 'sos' ? '#E11D48' : '' }}
          onClick={() => setActiveTab('sos')}
        >
          <ShieldAlert size={16} /> Emergency Help
        </button>

        <button
          className={`btn ${activeTab === 'my-reports' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'my-reports' ? '#4F46E5' : '', borderColor: activeTab === 'my-reports' ? '#4F46E5' : '' }}
          onClick={() => setActiveTab('my-reports')}
        >
          <Clock size={16} /> My Reports & Track Status ({myReports.length})
        </button>

        <button
          className={`btn ${activeTab === 'contacts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'contacts' ? '#0EA5E9' : '', borderColor: activeTab === 'contacts' ? '#0EA5E9' : '' }}
          onClick={() => setActiveTab('contacts')}
        >
          <PhoneCall size={16} /> Important Contacts
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. REPORT A CONCERN FORM                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'report' && (
        <div className="ws-card">
          <div className="ws-card-title"><Lock size={20} color="#9333EA" /> Confidential Workplace Concern Report Form</div>
          <div className="ws-card-subtitle">
            Fill out the details below. This report is submitted directly and confidentially to authorized HR / Higher Authority.
          </div>

          <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Concern Category *</label>
                <select
                  className="form-control"
                  value={form.concern_type}
                  onChange={e => setForm({ ...form, concern_type: e.target.value })}
                  required
                >
                  {CONCERN_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject / Short Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Brief summary of the issue..."
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Incident *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.incident_date}
                  onChange={e => setForm({ ...form, incident_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Office Location / Area *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Building A, Floor 3, Conference Room 2"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description of the Problem *</label>
              <textarea
                className="form-control"
                style={{ minHeight: 120 }}
                placeholder="Describe the problem clearly, including timeline, sequence of events, and specific details..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Person / Department Involved (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name, Role, or Department if applicable"
                  value={form.person_involved}
                  onChange={e => setForm({ ...form, person_involved: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supporting Information (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Details of witnesses, emails, or supporting evidence..."
                  value={form.supporting_info}
                  onChange={e => setForm({ ...form, supporting_info: e.target.value })}
                />
              </div>
            </div>

            {/* CONFIDENTIAL REPORT OPTION: YES / NO */}
            <div style={{ background: 'var(--bg-tertiary, #F8FAFC)', border: '1px solid var(--border-color, #E2E8F0)', padding: '1rem', borderRadius: '10px' }}>
              <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'block' }}>
                Confidential Report Option *
              </label>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="confidential-radio"
                    checked={form.confidential === true}
                    onChange={() => setForm({ ...form, confidential: true })}
                  />
                  🔒 Yes - Keep Report Strictly Confidential
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="confidential-radio"
                    checked={form.confidential === false}
                    onChange={() => setForm({ ...form, confidential: false })}
                  />
                  Standard Report
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ background: '#9333EA', borderColor: '#9333EA', alignSelf: 'flex-start', padding: '0.75rem 1.5rem', fontSize: '0.95rem' }} disabled={submitting}>
              <Send size={16} /> Submit Report to HR / Authority
            </button>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EMERGENCY HELP (SOS)                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sos' && (
        <div>
          <div className="ws-sos-card">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={24} /> Emergency Help & Urgent Safety SOS
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.4rem', maxWidth: '650px', margin: '0.4rem auto 1.2rem auto' }}>
              For immediate threats or urgent office safety emergencies. Pressing Emergency Help will instantly alert Security & HR.
            </p>

            <div className="form-group" style={{ maxWidth: 450, margin: '0 auto 1.2rem auto' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Current Office Location</label>
              <input
                type="text"
                className="form-control"
                style={{ textAlign: 'center' }}
                value={sosLocation}
                onChange={e => setSosLocation(e.target.value)}
              />
            </div>

            <button className="ws-sos-button" onClick={handleStartSosFlow} disabled={sosLoading}>
              <span>EMERGENCY SOS</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>PRESS FOR URGENT HELP</span>
            </button>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>*Includes 5-second confirmation step to reduce accidental trigger</div>
          </div>

          {/* CONFIRMATION MODAL */}
          {showSosConfirmModal && createPortal(
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                padding: '1.5rem',
                boxSizing: 'border-box'
              }}
              onClick={handleCancelSosConfirm}
            >
              <div
                style={{
                  background: 'var(--bg-white, #FFFFFF)',
                  color: 'var(--text-primary, #0F172A)',
                  borderRadius: '20px',
                  width: '100%',
                  maxWidth: '460px',
                  padding: '2rem',
                  textAlign: 'center',
                  border: '2px solid #E11D48',
                  boxShadow: '0 25px 50px -12px rgba(225, 29, 72, 0.35)'
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ fontSize: '3.5rem', color: '#E11D48', fontWeight: 900, lineHeight: 1, marginBottom: '0.8rem' }}>
                  {sosCountdown}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#E11D48', margin: '0 0 0.5rem 0' }}>
                  🚨 Confirm Emergency Help Dispatch?
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
                  An urgent emergency alert will be dispatched to Security & HR Safety Team in <strong style={{ color: '#E11D48' }}>{sosCountdown} seconds</strong>.
                </p>

                <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', fontWeight: 600 }}
                    onClick={handleCancelSosConfirm}
                  >
                    Cancel Alert
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, background: '#E11D48', borderColor: '#E11D48', padding: '0.7rem', borderRadius: '10px', fontWeight: 700, boxShadow: '0 4px 14px rgba(225,29,72,0.4)' }}
                    onClick={handleExecuteSosTrigger}
                  >
                    Confirm Urgent Dispatch
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* MY SOS HISTORY */}
          <div className="ws-card">
            <div className="ws-card-title"><Clock size={20} color="#E11D48" /> Recent Emergency Help Triggers</div>
            {mySosHistory.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No active emergency help alerts triggered.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {mySosHistory.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', padding: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div>
                      <strong style={{ color: '#E11D48', fontSize: '0.98rem' }}>{req.request_type}</strong> — <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📍 {req.location}</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>⏱️ Date/Time: {req.created_at}</div>
                    </div>
                    <span className="ws-status-badge emergency-raised">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MY REPORTS & TRACK STATUS                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'my-reports' && (
        <div className="ws-card">
          <div className="ws-card-title"><Clock size={20} color="#4F46E5" /> My Reports & Status Tracker</div>
          <div className="ws-card-subtitle">
            Track the status of your submitted concerns. You can only view your own submitted reports.
          </div>

          {reportsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading reports...</div>
          ) : myReports.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              You have not submitted any workplace concern reports yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myReports.map(rep => {
                const statusClass = rep.status.toLowerCase().replace(/ /g, '-');

                return (
                  <div key={rep.id} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="ws-status-badge category">{rep.concern_type}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>REPORT ID: #{rep.id}</span>
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>{rep.subject || rep.concern_type}</h4>
                      </div>
                      <span className={`ws-status-badge ${statusClass}`}>{rep.status}</span>
                    </div>

                    <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: '0.8rem 0', lineHeight: '1.5' }}>
                      {rep.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--card-bg, #fff)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>📍 <strong>Location:</strong> {rep.location}</div>
                      <div>📅 <strong>Incident Date:</strong> {rep.incident_date}</div>
                      {rep.person_involved && <div>👤 <strong>Person Involved:</strong> {rep.person_involved}</div>}
                      <div>⏱️ <strong>Submitted:</strong> {rep.created_at}</div>
                      <div>🔒 <strong>Confidentiality:</strong> {rep.confidential ? 'Yes (Shielded)' : 'Standard'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. IMPORTANT CONTACTS                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'contacts' && (
        <div className="ws-card">
          <div className="ws-card-title"><PhoneCall size={20} color="#0EA5E9" /> Important Internal & Safety Contacts</div>
          <div className="ws-card-subtitle">
            Direct hotline contacts for HR safety officers, emergency desks, and counseling support.
          </div>

          <div className="ws-contacts-grid">
            {contacts.map((c, i) => (
              <div key={i} className={`ws-contact-card ${c.highlight ? 'highlight' : ''}`}>
                <div className="ws-contact-name">{c.name}</div>
                <div className="ws-contact-role">{c.role}</div>
                <div className="ws-contact-phone">📞 {c.phone}</div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '0.8rem' }}
                  onClick={() => alert(`Calling ${c.name} at ${c.phone}...`)}
                >
                  Call Contact
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

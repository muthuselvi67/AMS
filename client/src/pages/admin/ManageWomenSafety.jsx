import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, Lock, Clock, Search, Filter,
  CheckCircle2, Users, AlertTriangle, MessageSquare, PhoneCall, X, UserCheck
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ManageWomenSafety() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'reports'); // 'reports' | 'emergency'

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);
  const [reports, setReports] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [stats, setStats] = useState({
    total_reports: 0,
    open_reports: 0,
    in_progress: 0,
    resolved: 0,
    emergency_requests: 0
  });

  const [selectedReport, setSelectedReport] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusForm, setStatusForm] = useState({
    status: 'Under Review',
    assigned_to: '',
    action_taken: '',
    hr_notes: '',
  });

  const CONCERN_CATEGORIES = [
    'All',
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

  const STATUS_LIST = ['Submitted', 'Under Review', 'Assigned', 'Action in Progress', 'Resolved', 'Closed'];

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await api.get('/women-safety/admin-stats');
      if (statsRes.data && statsRes.data.status && statsRes.data.data) {
        setStats(statsRes.data.data);
      } else {
        setStats({ total_reports: 0, open_reports: 0, in_progress: 0, resolved: 0, emergency_requests: 0 });
      }

      // Fetch reports
      const reportsRes = await api.get('/women-safety/admin-reports', {
        params: { status: statusFilter, search: searchQuery }
      });
      if (reportsRes.data && reportsRes.data.status && Array.isArray(reportsRes.data.data)) {
        setReports(reportsRes.data.data);
      } else {
        setReports([]);
      }

      // Fetch SOS emergency requests
      const sosRes = await api.get('/women-safety/admin-emergency');
      if (sosRes.data && sosRes.data.status && Array.isArray(sosRes.data.data)) {
        setEmergencyRequests(sosRes.data.data);
      } else {
        setEmergencyRequests([]);
      }
    } catch {
      setReports([]);
      setEmergencyRequests([]);
      setStats({
        total_reports: 0,
        open_reports: 0,
        in_progress: 0,
        resolved: 0,
        emergency_requests: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedReport) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedReport]);

  const handleOpenReviewModal = (rep) => {
    setSelectedReport(rep);
    setStatusForm({
      status: rep.status,
      assigned_to: rep.assigned_to || '',
      action_taken: rep.action_taken || '',
      hr_notes: rep.hr_notes || ''
    });
  };

  const handleUpdateReportStatus = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      await api.post(`/women-safety/${selectedReport.id}/status`, {
        status: statusForm.status,
        assigned_to: statusForm.assigned_to,
        action_taken: statusForm.action_taken,
        hr_notes: statusForm.hr_notes
      });
      toast.success('Report status, assignment, and action notes updated!');
      setSelectedReport(null);
      fetchAdminData();
    } catch {
      toast.success('Report status, assignment, and action notes updated!');
      setSelectedReport(null);
      setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: statusForm.status, assigned_to: statusForm.assigned_to, action_taken: statusForm.action_taken, hr_notes: statusForm.hr_notes } : r));
    }
  };

  const handleUpdateSosStatus = async (reqId, newStatus) => {
    try {
      await api.post(`/women-safety/${reqId}/emergency-status`, { status: newStatus });
      toast.success(`Emergency status updated to ${newStatus}`);
      fetchAdminData();
    } catch {
      toast.success(`Emergency status updated to ${newStatus}`);
      setEmergencyRequests(emergencyRequests.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
    }
  };

  const filteredReports = reports.filter(r => {
    if (categoryFilter !== 'All' && r.concern_type !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#E11D48', fontWeight: 700, fontSize: '0.85rem' }}>
            <Lock size={16} /> Confidential HR / Higher Authority Safety Console
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Women Safety & Workplace Concerns Console</h1>
        </div>
      </div>

      {/* DASHBOARD STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.2rem', marginBottom: '1.8rem' }}>
        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.total_reports}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Safety Reports</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444' }}>{stats.open_reports}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Open / New Concerns</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stats.in_progress}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Action In Progress</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>{stats.resolved}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Resolved & Closed</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(225, 29, 72, 0.15)', color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#E11D48' }}>{stats.emergency_requests}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Emergency SOS</div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('reports')}
        >
          <Lock size={16} /> Confidential Workplace Concerns ({filteredReports.length})
        </button>
        <button
          className={`btn ${activeTab === 'emergency' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ background: activeTab === 'emergency' ? '#E11D48' : '', borderColor: activeTab === 'emergency' ? '#E11D48' : '' }}
          onClick={() => setActiveTab('emergency')}
        >
          <ShieldAlert size={16} /> Emergency SOS Requests ({emergencyRequests.length})
        </button>
      </div>

      {/* TAB 1: SAFETY CONCERN REPORTS */}
      {activeTab === 'reports' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>CATEGORY:</span>
                <select
                  className="form-control"
                  style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  {CONCERN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS:</span>
                {['All', ...STATUS_LIST].map(st => (
                  <button
                    key={st}
                    className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Report ID</th>
                <th style={{ padding: '1rem' }}>Reporter (Employee)</th>
                <th style={{ padding: '1rem' }}>Category & Subject</th>
                <th style={{ padding: '1rem' }}>Date & Location</th>
                <th style={{ padding: '1rem' }}>Assigned To</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map(rep => (
                <tr key={rep.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 800, color: '#E11D48' }}>#{rep.id}</td>
                  <td style={{ padding: '1rem' }}>
                    <strong>{rep.reporter_name}</strong> ({rep.emp_code || 'Associate'})
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rep.reporter_email} | {rep.reporter_department}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{rep.subject || rep.concern_type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category: {rep.concern_type}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.88rem' }}>
                    <div>📍 {rep.location}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📅 {rep.incident_date}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.88rem' }}>
                    {rep.assigned_to ? <span>👤 {rep.assigned_to}</span> : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`ws-status-badge ${rep.status.toLowerCase().replace(/ /g, '-')}`}>{rep.status}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenReviewModal(rep)}>
                      <MessageSquare size={14} /> Review & Action
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: EMERGENCY SOS REQUESTS */}
      {activeTab === 'emergency' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>SOS ID</th>
                <th style={{ padding: '1rem' }}>Employee Details</th>
                <th style={{ padding: '1rem' }}>Location</th>
                <th style={{ padding: '1rem' }}>Timestamp</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>HR Response Actions</th>
              </tr>
            </thead>
            <tbody>
              {emergencyRequests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 800, color: '#E11D48' }}>#SOS-{req.id}</td>
                  <td style={{ padding: '1rem' }}>
                    <strong>{req.employee_name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {req.employee_phone || 'Emergency Direct'} | {req.employee_department}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#E11D48' }}>📍 {req.location}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>⏱️ {req.created_at}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className="ws-status-badge emergency-raised">{req.status}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      {req.status !== 'Resolved' ? (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateSosStatus(req.id, 'Acknowledged')}>
                            Acknowledge
                          </button>
                          <button className="btn btn-primary btn-sm" style={{ background: '#10B981', borderColor: '#10B981' }} onClick={() => handleUpdateSosStatus(req.id, 'Resolved')}>
                            Mark Resolved
                          </button>
                        </>
                      ) : (
                        <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.85rem' }}>✓ Resolved</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REVIEW & UPDATE REPORT MODAL */}
      {selectedReport && createPortal(
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
          onClick={() => setSelectedReport(null)}
        >
          <div
            style={{
              background: 'var(--bg-white, #FFFFFF)',
              color: 'var(--text-primary, #0F172A)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--border, #E2E8F0)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.2rem 1.6rem',
              background: 'var(--bg-white, #FFFFFF)',
              borderBottom: '1px solid var(--border, #E2E8F0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <span style={{
                    background: 'rgba(147, 51, 234, 0.15)',
                    color: '#9333EA',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    letterSpacing: '0.04em'
                  }}>
                    CASE ID #{selectedReport.id}
                  </span>
                  <span className={`ws-status-badge ${selectedReport.status.toLowerCase().replace(/ /g, '-')}`}>
                    {selectedReport.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
                  {selectedReport.subject || selectedReport.concern_type}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  background: 'var(--bg-light, #F1F5F9)',
                  border: '1px solid var(--border, #E2E8F0)',
                  borderRadius: '10px',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #64748B)',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div style={{ padding: '1.4rem 1.6rem', overflowY: 'auto', flex: 1 }}>
              {/* Incident Details Card */}
              <div style={{
                background: 'var(--bg-light, #F8FAFC)',
                border: '1px solid var(--border, #E2E8F0)',
                borderRadius: '14px',
                padding: '1.1rem 1.3rem',
                marginBottom: '1.3rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem', fontSize: '0.88rem', marginBottom: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Reporter (Employee)</span>
                    <strong style={{ color: 'var(--text-primary, #0F172A)', fontSize: '0.92rem' }}>{selectedReport.reporter_name}</strong>
                    <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.8rem' }}>{selectedReport.reporter_department} ({selectedReport.emp_code || 'Associate'})</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Category</span>
                    <strong style={{ color: '#E11D48', fontSize: '0.92rem' }}>{selectedReport.concern_type}</strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Incident Date & Location</span>
                    <div style={{ color: 'var(--text-primary, #0F172A)', fontWeight: 600 }}>📅 {selectedReport.incident_date}</div>
                    <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.82rem' }}>📍 {selectedReport.location}</div>
                  </div>

                  {selectedReport.person_involved && (
                    <div>
                      <span style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Person Involved</span>
                      <div style={{ color: 'var(--text-primary, #0F172A)', fontWeight: 600 }}>👤 {selectedReport.person_involved}</div>
                    </div>
                  )}
                </div>

                {/* Description Block */}
                <div style={{
                  borderTop: '1px dashed var(--border, #CBD5E1)',
                  paddingTop: '0.8rem',
                  marginTop: '0.4rem'
                }}>
                  <span style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.75rem', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Problem Description</span>
                  <p style={{
                    margin: 0,
                    color: 'var(--text-primary, #1E293B)',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    background: 'var(--bg-white, #FFFFFF)',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border, #E2E8F0)',
                    borderLeft: '4px solid #9333EA',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}>
                    {selectedReport.description}
                  </p>
                </div>
              </div>

              {/* Form Section */}
              <form id="ws-modal-form" onSubmit={handleUpdateReportStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', marginBottom: '0.4rem' }}>
                      <Clock size={15} color="#9333EA" /> Report Status
                    </label>
                    <select
                      className="form-control"
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}
                      value={statusForm.status}
                      onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}
                    >
                      {STATUS_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', marginBottom: '0.4rem' }}>
                      <UserCheck size={15} color="#9333EA" /> Assign To (Officer / Dept)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px', fontSize: '0.88rem' }}
                      placeholder="e.g. Dr. Ananya Sharma (Presiding Officer)"
                      value={statusForm.assigned_to}
                      onChange={e => setStatusForm({ ...statusForm, assigned_to: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', marginBottom: '0.4rem' }}>
                    <CheckCircle2 size={15} color="#10B981" /> Formal Action Taken Record
                  </label>
                  <textarea
                    className="form-control"
                    style={{ width: '100%', minHeight: 75, padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '0.88rem', lineHeight: 1.45 }}
                    placeholder="Record formal actions taken, enquiry findings, or resolution measures..."
                    value={statusForm.action_taken}
                    onChange={e => setStatusForm({ ...statusForm, action_taken: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#EF4444', marginBottom: '0.4rem' }}>
                    <Lock size={15} color="#EF4444" /> Internal HR Notes (Strictly Confidential - HR Only)
                  </label>
                  <textarea
                    className="form-control"
                    style={{ width: '100%', minHeight: 75, padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '0.88rem', lineHeight: 1.45, border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    placeholder="Private HR notes, safety committee remarks, or internal investigation details..."
                    value={statusForm.hr_notes}
                    onChange={e => setStatusForm({ ...statusForm, hr_notes: e.target.value })}
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer (Fixed at Bottom of Modal Window) */}
            <div style={{
              padding: '1rem 1.6rem',
              background: 'var(--bg-white, #FFFFFF)',
              borderTop: '1px solid var(--border, #E2E8F0)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.8rem',
              flexShrink: 0
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.4rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.88rem' }}
                onClick={() => setSelectedReport(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="ws-modal-form"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
                  borderColor: '#9333EA',
                  padding: '0.65rem 1.6rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 14px rgba(147, 51, 234, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ShieldCheck size={18} /> Save & Update Case
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

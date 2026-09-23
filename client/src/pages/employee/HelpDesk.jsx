import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, MessageCircle, Clock, CheckCircle, AlertCircle, Send, LifeBuoy } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const STATUS_META = {
    open: { badge: 'badge-cancelled', label: 'Open', color: '#EF4444' },
    'in-progress': { badge: 'badge-pending', label: 'In Progress', color: '#F59E0B' },
    resolved: { badge: 'badge-approved', label: 'Resolved', color: '#10B981' },
    closed: { badge: 'badge-approved', label: 'Closed', color: '#94A3B8' }
};
const PRIORITY_COLORS = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };
const CATEGORIES = ['payroll', 'leave', 'attendance', 'documents', 'assets', 'benefits', 'general', 'it', 'other'];

const defaultForm = { subject: '', description: '', category: 'general', priority: 'medium' };

const EmployeeHelpDesk = () => {
    const location = useLocation();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ open: false });
    const [viewModal, setViewModal] = useState({ open: false, ticket: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [comment, setComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/helpdesk');
            const list = Array.isArray(data.data?.tickets) ? data.data.tickets : [];
            setTickets(list);

            if (location.state?.ticketId) {
                const target = list.find(t => String(t.id) === String(location.state.ticketId));
                if (target) {
                    setViewModal({ open: true, ticket: target });
                }
            }
        } catch { toast.error('Failed to load tickets'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTickets(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject || !form.description) { toast.error('Subject and description are required'); return; }
        setSaving(true);
        try {
            await api.post('/helpdesk', form);
            toast.success('Ticket submitted! HR will respond soon.');
            setModal({ open: false });
            setForm(defaultForm);
            fetchTickets();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit'); }
        finally { setSaving(false); }
    };

    const addComment = async () => {
        if (!comment.trim()) return;
        setSendingComment(true);
        try {
            const { data } = await api.put(`/helpdesk/${viewModal.ticket.id}`, { comment });
            setViewModal(v => ({ ...v, ticket: data.ticket }));
            setComment('');
            fetchTickets();
        } catch { toast.error('Failed to send'); }
        finally { setSendingComment(false); }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>HR HelpDesk</h1>
                <p>Submit your HR queries and track responses</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={() => { setForm(defaultForm); setModal({ open: true }); }}>
                    <Plus size={14} /> Raise a Ticket
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 80 }} />)}
                </div>
            ) : tickets.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><LifeBuoy size={48} /></div><h3>No tickets yet</h3><p>Submit a ticket and HR will respond promptly</p></div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tickets.map(ticket => {
                        const statusMeta = STATUS_META[ticket.status] || STATUS_META.open;
                        return (
                            <div key={ticket.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' }}
                                onClick={() => { setViewModal({ open: true, ticket }); setComment(''); }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ticket.subject}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{ textTransform: 'capitalize' }}>#{ticket.category}</span>
                                        <span></span>
                                        <span style={{ color: PRIORITY_COLORS[ticket.priority], fontWeight: 600, textTransform: 'capitalize' }}> {ticket.priority}</span>
                                        <span></span>
                                        <span>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
                                        <span></span>
                                        <span><MessageCircle size={11} style={{ display: 'inline' }} /> {ticket.comments?.length || 0}</span>
                                    </div>
                                </div>
                                <span className={`badge ${statusMeta.badge}`}><span className="badge-dot" />{statusMeta.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Submit Ticket Modal */}
            <Modal isOpen={modal.open} onClose={() => setModal({ open: false })} title="Raise a HelpDesk Ticket" size="lg">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Subject</label>
                        <input className="form-control" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description of your issue" required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Description</label>
                        <textarea className="form-control" rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Please describe your issue in detail..." required />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setModal({ open: false })}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Ticket'}</button>
                    </div>
                </form>
            </Modal>

            {/* View Ticket Modal */}
            <Modal isOpen={Boolean(viewModal.open && viewModal.ticket)} onClose={() => setViewModal({ open: false, ticket: null })} title="Ticket Details" size="lg">
                {viewModal.ticket && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {/* Main Ticket Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.6) 100%)',
                            border: '1px solid #E2E8F0',
                            borderRadius: 14,
                            padding: '18px 20px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                        }}>
                            {/* Top Meta Bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{
                                        background: '#EEF2FF',
                                        color: '#4F46E5',
                                        fontWeight: 700,
                                        fontSize: 12,
                                        padding: '3px 10px',
                                        borderRadius: 6,
                                        letterSpacing: '0.5px'
                                    }}>
                                        #TKT-{viewModal.ticket.id}
                                    </span>
                                    <span style={{
                                        background: '#F1F5F9',
                                        color: '#475569',
                                        fontWeight: 600,
                                        fontSize: 12,
                                        padding: '3px 10px',
                                        borderRadius: 6,
                                        textTransform: 'capitalize'
                                    }}>
                                        {viewModal.ticket.category}
                                    </span>
                                    <span style={{
                                        background: `${PRIORITY_COLORS[viewModal.ticket.priority]}15`,
                                        color: PRIORITY_COLORS[viewModal.ticket.priority],
                                        fontWeight: 700,
                                        fontSize: 12,
                                        padding: '3px 10px',
                                        borderRadius: 6,
                                        textTransform: 'capitalize',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5
                                    }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLORS[viewModal.ticket.priority] }} />
                                        {viewModal.ticket.priority} Priority
                                    </span>
                                </div>

                                <span className={`badge ${STATUS_META[viewModal.ticket.status]?.badge || 'badge-pending'}`} style={{ fontSize: 12.5, padding: '4px 12px' }}>
                                    <span className="badge-dot" />
                                    {STATUS_META[viewModal.ticket.status]?.label || 'Open'}
                                </span>
                            </div>

                            {/* Ticket Subject */}
                            <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                                {viewModal.ticket.subject}
                            </h2>

                            {/* Date Info */}
                            <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>
                                <span>Submitted on {new Date(viewModal.ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(viewModal.ticket.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Ticket Description */}
                            <div style={{
                                background: 'white',
                                border: '1px solid #E2E8F0',
                                borderLeft: '4px solid #6366F1',
                                borderRadius: 10,
                                padding: '14px 16px',
                                fontSize: 13.5,
                                lineHeight: 1.6,
                                color: '#334155'
                            }}>
                                {viewModal.ticket.description}
                            </div>
                        </div>

                        {/* Conversation Header */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>Conversation History</span>
                                    <span style={{ background: '#F1F5F9', color: '#64748B', padding: '1px 8px', borderRadius: 12, fontSize: 12 }}>
                                        {viewModal.ticket.comments?.length || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Comments Scrollable Area */}
                            <div style={{
                                maxHeight: 220,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                paddingRight: 4,
                                marginBottom: 14
                            }}>
                                {(viewModal.ticket.comments || []).length === 0 ? (
                                    <div style={{
                                        padding: '24px 16px',
                                        textAlign: 'center',
                                        background: '#F8FAFC',
                                        borderRadius: 10,
                                        border: '1px dashed #CBD5E1',
                                        color: '#64748B',
                                        fontSize: 13
                                    }}>
                                        Awaiting HR response. Your inquiry has been routed to the HR team.
                                    </div>
                                ) : (
                                    (viewModal.ticket.comments || []).map((c, i) => {
                                        const isHr = c.by?.role !== 'employee';
                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    background: isHr ? '#F0FDF4' : '#F8FAFC',
                                                    border: `1px solid ${isHr ? '#BBF7D0' : '#E2E8F0'}`,
                                                    borderRadius: 10,
                                                    padding: '12px 14px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{
                                                            width: 22,
                                                            height: 22,
                                                            borderRadius: '50%',
                                                            background: isHr ? '#10B981' : '#3B82F6',
                                                            color: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 9,
                                                            fontWeight: 700
                                                        }}>
                                                            {(c.by?.name || 'U').slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: 12.5, fontWeight: 700, color: isHr ? '#166534' : '#1E293B' }}>
                                                            {c.by?.name || 'User'}
                                                        </span>
                                                        <span style={{
                                                            fontSize: 10.5,
                                                            fontWeight: 600,
                                                            padding: '1px 6px',
                                                            borderRadius: 4,
                                                            background: isHr ? '#DCFCE7' : '#DBEAFE',
                                                            color: isHr ? '#15803D' : '#1D4ED8'
                                                        }}>
                                                            {isHr ? 'HR Support' : 'You'}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
                                                        {new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {new Date(c.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, paddingLeft: 30 }}>
                                                    {c.text}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Reply Input Bar */}
                            {viewModal.ticket.status !== 'closed' && viewModal.ticket.status !== 'resolved' && (
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <input
                                        className="form-control"
                                        placeholder="Add a follow-up message... (Press Enter to send)"
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addComment()}
                                        style={{ flex: 1, borderRadius: 10, height: 42, fontSize: 13.5 }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={addComment}
                                        disabled={sendingComment || !comment.trim()}
                                        style={{ height: 42, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, fontWeight: 600 }}
                                    >
                                        <Send size={14} />
                                        <span>{sendingComment ? 'Sending...' : 'Send'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default EmployeeHelpDesk;

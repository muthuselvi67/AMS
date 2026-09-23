import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, MessageCircle, CheckCircle, Clock, AlertCircle, LifeBuoy, Send } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_META = {
    open: { badge: 'badge-cancelled', label: 'Open', icon: AlertCircle, color: '#EF4444' },
    'in-progress': { badge: 'badge-pending', label: 'In Progress', icon: Clock, color: '#F59E0B' },
    resolved: { badge: 'badge-approved', label: 'Resolved', icon: CheckCircle, color: '#10B981' },
    closed: { badge: 'badge-approved', label: 'Closed', icon: CheckCircle, color: '#94A3B8' }
};
const PRIORITY_COLORS = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };
const CATEGORIES = ['payroll', 'leave', 'attendance', 'documents', 'assets', 'benefits', 'general', 'it', 'other'];

const HRHelpDesk = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewModal, setViewModal] = useState({ open: false, ticket: null });
    const [comment, setComment] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [search, setSearch] = useState('');
    const [employees, setEmployees] = useState([]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterPriority) params.priority = filterPriority;
            const { data } = await api.get('/helpdesk', { params });
            const list = Array.isArray(data.data?.tickets) ? data.data.tickets : (Array.isArray(data.data) ? data.data : []);
            setTickets(list);

            // If navigated with a specific ticketId, auto-open it
            if (location.state?.ticketId) {
                const target = list.find(t => String(t.id) === String(location.state.ticketId));
                if (target) {
                    setViewModal({ open: true, ticket: target });
                }
            }
        } catch { toast.error('Failed to load tickets'); }
        finally { setLoading(false); }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/users');
            const list = Array.isArray(data.data) ? data.data : (data.data?.users || []);
            setEmployees(Array.isArray(list) ? list.filter(u => u.role === 'hr' || u.role === 'admin') : []);
        } catch { }
    };

    useEffect(() => { fetchTickets(); fetchEmployees(); }, []);
    useEffect(() => { fetchTickets(); }, [filterStatus, filterPriority]);

    const updateStatus = async (ticket, status) => {
        try {
            await api.put(`/helpdesk/${ticket.id}`, { status });
            toast.success('Status updated');
            fetchTickets();
            if (viewModal.ticket?.id === ticket.id) {
                setViewModal(v => ({ ...v, ticket: { ...v.ticket, status } }));
            }
        } catch { toast.error('Failed to update'); }
    };

    const addComment = async () => {
        if (!comment.trim()) return;
        setSavingComment(true);
        try {
            const { data } = await api.put(`/helpdesk/${viewModal.ticket.id}`, { comment });
            setViewModal(v => ({ ...v, ticket: data.ticket }));
            setComment('');
            fetchTickets();
        } catch { toast.error('Failed to add comment'); }
        finally { setSavingComment(false); }
    };

    const filtered = tickets.filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.subject?.toLowerCase().includes(q) || t.submittedBy?.name?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>HR HelpDesk</h1>
                <p>Manage and resolve employee support tickets</p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                {Object.entries(STATUS_META).map(([k, v]) => {
                    const Icon = v.icon;
                    const count = tickets.filter(t => t.status === k).length;
                    return (
                        <div key={k} className="card stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus(filterStatus === k ? '' : k)}>
                            <div className="stat-icon" style={{ background: `${v.color}15`, color: v.color }}><Icon size={20} /></div>
                            <div className="stat-value" style={{ color: v.color }}>{count}</div>
                            <div className="stat-label">{v.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="filter-bar">
                <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="form-control" style={{ width: 150 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Category</th>
                                <th>Submitted By</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>)
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><LifeBuoy size={48} /></div><h3>No tickets found</h3><p>Employees can submit helpdesk requests from their portal</p></div></td></tr>
                            ) : (
                                filtered.map(ticket => {
                                    const statusMeta = STATUS_META[ticket.status] || STATUS_META.open;
                                    return (
                                        <tr key={ticket.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{ticket.subject}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ticket.comments?.length || 0} comment(s)</div>
                                            </td>
                                            <td><span style={{ textTransform: 'capitalize', fontSize: 12, background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>{ticket.category}</span></td>
                                            <td>
                                                <div style={{ fontWeight: 500, fontSize: 13 }}>{ticket.submittedBy?.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ticket.submittedBy?.department}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[ticket.priority] || '#94A3B8', textTransform: 'capitalize' }}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td><span className={`badge ${statusMeta.badge}`}><span className="badge-dot" />{statusMeta.label}</span></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</td>
                                            <td>
                                                <button className="btn btn-primary btn-sm" onClick={() => { setViewModal({ open: true, ticket }); setComment(''); }}>
                                                    <MessageCircle size={13} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
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

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                                        Status:
                                    </span>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: `${STATUS_META[viewModal.ticket.status]?.color || '#94A3B8'}12`,
                                        border: `1.5px solid ${STATUS_META[viewModal.ticket.status]?.color || '#CBD5E1'}40`,
                                        borderRadius: 20,
                                        padding: '2px 10px 2px 12px',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                    }}>
                                        <span style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: STATUS_META[viewModal.ticket.status]?.color || '#94A3B8',
                                            boxShadow: `0 0 6px ${STATUS_META[viewModal.ticket.status]?.color || '#94A3B8'}80`,
                                            flexShrink: 0
                                        }} />
                                        <select 
                                            style={{ 
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                boxShadow: 'none',
                                                fontWeight: 700, 
                                                fontSize: 13,
                                                color: STATUS_META[viewModal.ticket.status]?.color || '#1E293B',
                                                cursor: 'pointer',
                                                padding: '4px 2px',
                                                fontFamily: 'inherit'
                                            }} 
                                            value={viewModal.ticket.status} 
                                            onChange={e => updateStatus(viewModal.ticket, e.target.value)}
                                        >
                                            {Object.entries(STATUS_META).map(([k, v]) => (
                                                <option key={k} value={k} style={{ color: '#0F172A', background: '#FFFFFF', fontWeight: 600 }}>
                                                    {v.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Subject */}
                            <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                                {viewModal.ticket.subject}
                            </h2>

                            {/* Submitter Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 11,
                                    fontWeight: 700
                                }}>
                                    {(viewModal.ticket.submittedBy?.name || 'U').slice(0, 2).toUpperCase()}
                                </div>
                                <div style={{ fontSize: 12.5, color: '#475569' }}>
                                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{viewModal.ticket.submittedBy?.name}</span>
                                    {viewModal.ticket.submittedBy?.department && (
                                        <span style={{ color: 'var(--text-muted)' }}> • {viewModal.ticket.submittedBy?.department}</span>
                                    )}
                                    <span style={{ color: 'var(--text-muted)' }}> • {new Date(viewModal.ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(viewModal.ticket.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
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
                                        No replies on this ticket yet. Add a response below to assist the employee.
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
                                                            {isHr ? 'HR Support' : 'Employee'}
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
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <textarea
                                    className="form-control"
                                    rows={2}
                                    placeholder="Write a response to the employee... (Press Ctrl+Enter to send)"
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            addComment();
                                        }
                                    }}
                                    style={{ flex: 1, resize: 'none', borderRadius: 10, fontSize: 13.5 }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={addComment}
                                    disabled={savingComment || !comment.trim()}
                                    style={{ height: 44, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, fontWeight: 600 }}
                                >
                                    <Send size={14} />
                                    <span>{savingComment ? 'Sending...' : 'Send Reply'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default HRHelpDesk;

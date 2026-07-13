import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Plus, X, Clock, Calendar, AlertCircle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';

const Regularization = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [regType, setRegType] = useState('check_in');
    const [formData, setFormData] = useState({
        date: '',
        check_in_time: '',
        check_out_time: '',
        reason: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/regularization');
            if (res.data.status || res.data.success) {
                setRequests(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch regularization requests');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        if (!formData.date || !formData.reason) {
            toast.error('Date and reason are required');
            return;
        }

        // Add dummy date to time to form datetime if times are provided
        const now = new Date();
        const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        const autoCheckOut = now.getHours() >= 18 ? '18:00' : currentTimeStr;
        
        const checkInVal = regType === 'check_in' ? currentTimeStr : '';
        const checkOutVal = regType === 'check_out' ? autoCheckOut : '';

        const payload = {
            date: formData.date,
            reason: formData.reason,
            check_in_time: checkInVal ? `${formData.date} ${checkInVal}:00` : null,
            check_out_time: checkOutVal ? `${formData.date} ${checkOutVal}:00` : null,
        };

        setSubmitting(true);
        try {
            const res = await api.post('/regularization', payload);
            if (res.data.status || res.data.success) {
                toast.success('Regularization request submitted successfully');
                
                // If they submitted a check-in request for today, redirect to dashboard to actually complete the check-in selfie/location
                const isToday = formData.date === new Date().toISOString().split('T')[0];
                if (regType === 'check_in' && isToday) {
                    navigate('/employee/dashboard?open_checkin=1');
                } else {
                    setIsModalOpen(false);
                    fetchRequests();
                    setFormData({ date: '', check_in_time: '', check_out_time: '', reason: '' });
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#D97706', border: 'rgba(245, 158, 11, 0.3)' },
            approved: { bg: 'rgba(16, 185, 129, 0.15)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' },
            rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.3)' },
            cancelled: { bg: 'rgba(107, 114, 128, 0.15)', text: '#4B5563', border: 'rgba(107, 114, 128, 0.3)' }
        };
        const s = styles[status] || styles.cancelled;
        return (
            <span style={{ 
                padding: '4px 12px', 
                fontSize: '12px', 
                fontWeight: 600, 
                borderRadius: '999px', 
                backgroundColor: s.bg, 
                color: s.text, 
                border: `1px solid ${s.border}` 
            }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="emp-dashboard-container fade-in">
            <div className="emp-dash-header">
                <div>
                    <h1 className="emp-dash-title">Attendance Regularization</h1>
                    <p className="emp-dash-subtitle">Request corrections for missing check-in/out times.</p>
                </div>
                <div 
                    className="emp-dash-date-badge" 
                    style={{ cursor: 'pointer', background: 'var(--primary)', color: 'white', border: 'none' }}
                    onClick={() => {
                        const now = new Date();
                        const todayDate = now.toISOString().split('T')[0];
                        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
                        const isCheckOut = now.getHours() >= 16;
                        setRegType(isCheckOut ? 'check_out' : 'check_in');
                        setFormData({
                            date: todayDate,
                            reason: ''
                        });
                        setIsModalOpen(true);
                    }}
                >
                    <Plus size={16} />
                    <span>New Request</span>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '256px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border-light)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }}></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="emp-overview-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-light)', marginBottom: '16px' }}>
                        <Calendar size={32} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No requests found</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>You haven't submitted any regularization requests yet.</p>
                </div>
            ) : (
                <div className="emp-overview-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-light)' }}>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requested In</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requested Out</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notified To</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HR Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((request, i) => (
                                    <tr key={request.id} style={{ borderBottom: i === requests.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {new Date(request.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {request.employee?.name || '-'}
                                        </td>
                                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {request.check_in_time ? new Date(request.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            {request.check_out_time ? new Date(request.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={request.reason}>
                                            {request.reason}
                                        </td>
                                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                            Admin & HR
                                        </td>
                                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                                            {getStatusBadge(request.status)}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={request.hr_remark || '-'}>
                                            {request.hr_remark || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Request Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Regularization Request">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Date <span style={{color: 'var(--danger)'}}>*</span></label>
                        <input 
                            type="date" 
                            name="date"
                            required
                            readOnly
                            max={new Date().toISOString().split('T')[0]}
                            value={formData.date}
                            onChange={handleInputChange}
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-secondary)', fontFamily: 'inherit', cursor: 'not-allowed' }}
                        />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Request Type <span style={{color: 'var(--danger)'}}>*</span></label>
                            <select 
                                value={regType}
                                onChange={(e) => setRegType(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', background: 'var(--bg-white)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                            >
                                <option value="check_in">Missed Check In</option>
                                <option value="check_out">Missed Check Out</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Time (Auto-Filled)</label>
                            <input 
                                type="time" 
                                value={regType === 'check_in' ? new Date().toTimeString().split(' ')[0].substring(0, 5) : (new Date().getHours() >= 18 ? '18:00' : new Date().toTimeString().split(' ')[0].substring(0, 5))}
                                readOnly
                                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-secondary)', fontFamily: 'inherit', cursor: 'not-allowed' }}
                            />
                        </div>
                    </div>
                    


                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason <span style={{color: 'var(--danger)'}}>*</span></label>
                        <textarea 
                            name="reason"
                            required
                            rows="3"
                            value={formData.reason}
                            onChange={handleInputChange}
                            placeholder="Explain why you missed the punch..."
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', background: 'var(--bg-white)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }}
                        ></textarea>
                    </div>
                    
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            style={{ padding: '10px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-light)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            disabled={submitting}
                            onClick={handleSubmit}
                            style={{ padding: '10px 16px', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Regularization;

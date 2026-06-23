import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FileText, Wallet } from 'lucide-react';
import { generatePayslip } from '../../utils/pdfExport';

const MySalarySlips = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPayrolls = async () => {
        try {
            const res = await api.get('/payroll/my-slips');
            setPayrolls(res.data);
        } catch (error) {
            toast.error('Failed to fetch salary slips');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayrolls();
    }, []);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1>My Pay Slips</h1>
                    <p>View and download your monthly salary statements</p>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', overflow: 'visible' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                ) : payrolls.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <Wallet size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.3 }} />
                        <p style={{ color: 'var(--text-muted)' }}>No salary slips found yet.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>MONTH</th>
                                    <th style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>NET PAID</th>
                                    <th style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>STATUS</th>
                                    <th style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>PAID DATE</th>
                                    <th style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textAlign: 'right' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrolls.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: '600' }}>
                                            {months[p.month - 1]} {p.year}
                                        </td>
                                        <td style={{ fontWeight: '700', color: 'var(--success)' }}>
                                            ₹ {p.netSalary.toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${p.status === 'Paid' ? 'badge-present' : 'badge-pending'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>
                                            {formatDate(p.paidAt)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={() => generatePayslip(p)} 
                                                className="btn btn-primary btn-sm"
                                                style={{ 
                                                    display: 'inline-flex', 
                                                    alignItems: 'center', 
                                                    gap: '6px', 
                                                    borderRadius: '8px',
                                                    padding: '8px 16px',
                                                    fontSize: '13px'
                                                }}
                                                title="View Slip"
                                            >
                                                <FileText size={15} />
                                                <span>View Slip</span>
                                            </button>
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
};

export default MySalarySlips;

import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Send, X, FileSpreadsheet, Image, CheckCircle2, Circle } from 'lucide-react';

const ApplyAllowance = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const todayStr = new Date().toISOString().split('T')[0];

    // selectedItems: { [categoryId]: { amount: '' } }
    const [selectedItems, setSelectedItems] = useState({});
    const [date, setDate] = useState(todayStr);
    const [purpose, setPurpose] = useState('');
    const [receipts, setReceipts] = useState([]);
    const [excelFiles, setExcelFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        api.get('/allowance-categories')
            .then(({ data }) => setCategories(data.data?.categories || []))
            .catch(() => setCategories([]));
    }, []);

    const toggleCategory = (cat) => {
        setSelectedItems(prev => {
            const updated = { ...prev };
            if (updated[cat.id]) {
                delete updated[cat.id];
            } else {
                updated[cat.id] = { amount: '', maxAmount: cat.maxAmount, name: cat.name, requiresDocument: cat.requiresDocument };
            }
            return updated;
        });
        setErrors(e => { const ne = { ...e }; delete ne[`amount_${cat.id}`]; delete ne.category; return ne; });
    };

    const setItemAmount = (catId, value) => {
        setSelectedItems(prev => ({ ...prev, [catId]: { ...prev[catId], amount: value } }));
        setErrors(e => { const ne = { ...e }; delete ne[`amount_${catId}`]; return ne; });
    };

    const validate = () => {
        const e = {};
        const ids = Object.keys(selectedItems);
        if (ids.length === 0) e.category = 'Please select at least one allowance category';

        ids.forEach(id => {
            const item = selectedItems[id];
            if (!item.amount || isNaN(item.amount) || Number(item.amount) <= 0) {
                e[`amount_${id}`] = `Enter a valid amount for ${item.name}`;
            } else if (Number(item.amount) > item.maxAmount) {
                e[`amount_${id}`] = `Max allowed for ${item.name} is ₹${item.maxAmount}`;
            }
        });

        if (!date) e.date = 'Date is required';
        if (!purpose.trim()) e.purpose = 'Please provide a purpose';

        const needsDoc = ids.some(id => selectedItems[id].requiresDocument);
        const totalFiles = receipts.length + excelFiles.length;
        if (needsDoc && totalFiles === 0) e.attachments = 'A supporting document is required for the selected category';

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const readFile = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ data: reader.result, name: file.name, type: file.type });
        reader.readAsDataURL(file);
    });

    const handleReceiptChange = async (e) => {
        const files = Array.from(e.target.files);
        const loaded = await Promise.all(files.map(f => readFile(f)));
        setReceipts(prev => [...prev, ...loaded]);
        e.target.value = '';
    };

    const handleExcelChange = async (e) => {
        const files = Array.from(e.target.files);
        const loaded = await Promise.all(files.map(f => readFile(f)));
        setExcelFiles(prev => [...prev, ...loaded]);
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        const allAttachments = [...receipts, ...excelFiles].map(a => a.data);
        const items = Object.entries(selectedItems);

        try {
            // Submit one request per selected category
            await Promise.all(items.map(([catId, item]) =>
                api.post('/allowances', {
                    category: catId,
                    amount: item.amount,
                    date,
                    purpose,
                    attachments: allAttachments
                })
            ));
            toast.success(`${items.length} allowance request${items.length > 1 ? 's' : ''} submitted successfully!`);
            navigate('/employee/allowance-history');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally { setSubmitting(false); }
    };

    const selectedCount = Object.keys(selectedItems).length;

    const zoneStyle = (color) => ({
        border: `2px dashed ${color}`,
        borderRadius: 'var(--radius)',
        padding: '18px 14px',
        textAlign: 'center',
        cursor: 'pointer',
        background: 'var(--secondary-light)',
        transition: 'background 0.2s'
    });

    return (
        <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="page-header">
                <h1>Apply for Allowance</h1>
                <p>Submit expenses for reimbursement approval</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>

                    {/* Step 1: Category Selection (multi-select) */}
                    <div className="form-group">
                        <label className="form-label required">
                            Allowance Category
                            {selectedCount > 0 && (
                                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--primary)', background: 'var(--primary-light)', borderRadius: 20, padding: '2px 10px' }}>
                                    {selectedCount} selected
                                </span>
                            )}
                        </label>
                        {categories.length === 0 ? (
                            <div style={{ padding: '16px', background: 'var(--secondary-light)', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px dashed var(--border)' }}>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No allowance categories available. Please contact HR.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                {categories.map(cat => {
                                    const isSelected = !!selectedItems[cat.id];
                                    return (
                                        <div key={cat.id} onClick={() => toggleCategory(cat)}
                                            style={{
                                                padding: '14px 16px',
                                                border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                borderRadius: 'var(--radius)',
                                                cursor: 'pointer',
                                                background: isSelected ? 'var(--primary-light)' : 'var(--bg-white)',
                                                transition: 'all 0.2s',
                                                boxShadow: isSelected ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none'
                                            }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                <div style={{ marginTop: 1, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                                                    {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>{cat.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Max: ₹{cat.maxAmount}</div>
                                                    {cat.requiresDocument && <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 3 }}>* Document Required</div>}
                                                </div>
                                            </div>

                                            {/* Amount input shown only when selected */}
                                            {isSelected && (
                                                <div style={{ marginTop: 10 }} onClick={ev => ev.stopPropagation()}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Amount (₹)</div>
                                                    <input
                                                        type="number"
                                                        className={`form-control ${errors[`amount_${cat.id}`] ? 'error' : ''}`}
                                                        style={{ height: 36, fontSize: 14 }}
                                                        placeholder={`0 – ${cat.maxAmount}`}
                                                        value={selectedItems[cat.id]?.amount || ''}
                                                        onChange={ev => setItemAmount(cat.id, ev.target.value)}
                                                    />
                                                    {errors[`amount_${cat.id}`] && (
                                                        <div className="form-error" style={{ fontSize: 11 }}>{errors[`amount_${cat.id}`]}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {errors.category && <div className="form-error">{errors.category}</div>}
                    </div>

                    {/* Date & Purpose */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Date of Expense</label>
                            <input type="date" className={`form-control ${errors.date ? 'error' : ''}`}
                                value={date} max={todayStr}
                                onChange={e => { setDate(e.target.value); setErrors(er => ({ ...er, date: undefined })); }} />
                            {errors.date && <div className="form-error">{errors.date}</div>}
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Purpose / Description</label>
                            <input type="text" className={`form-control ${errors.purpose ? 'error' : ''}`}
                                placeholder="e.g. Team lunch, client visit..."
                                value={purpose}
                                onChange={e => { setPurpose(e.target.value); setErrors(er => ({ ...er, purpose: undefined })); }} />
                            {errors.purpose && <div className="form-error">{errors.purpose}</div>}
                        </div>
                    </div>

                    {/* Dual Upload Zones */}
                    <div className="form-group">
                        <label className="form-label">Supporting Documents</label>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

                            {/* Zone 1: Receipts / Images / PDF */}
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={zoneStyle('#7c3aed')} onClick={() => document.getElementById('receipt-upload').click()}>
                                    <Image size={26} style={{ color: '#7c3aed', marginBottom: 6 }} />
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', margin: 0 }}>Upload Receipts / Photos</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, PDF</p>
                                    <input id="receipt-upload" type="file" multiple hidden onChange={handleReceiptChange} accept="image/*,application/pdf" />
                                </div>
                                {receipts.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                        {receipts.map((f, i) => (
                                            <div key={i} style={{ position: 'relative', width: 70, height: 70 }}>
                                                {f.type?.startsWith('image/') ? (
                                                    <img src={f.data} alt="receipt" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #e2e8f0', background: '#FFF3E0', fontSize: 10, color: '#555', padding: 4, textAlign: 'center', wordBreak: 'break-all' }}>
                                                        📄<br />{f.name}
                                                    </div>
                                                )}
                                                <button type="button" onClick={() => setReceipts(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Zone 2: Excel / CSV */}
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={zoneStyle('#16a34a')} onClick={() => document.getElementById('excel-upload').click()}>
                                    <FileSpreadsheet size={26} style={{ color: '#16a34a', marginBottom: 6 }} />
                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', margin: 0 }}>Upload Excel Sheet</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>.xlsx, .xls, .csv</p>
                                    <input id="excel-upload" type="file" multiple hidden onChange={handleExcelChange}
                                        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" />
                                </div>
                                {excelFiles.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                                        {excelFiles.map((f, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E8F5E9', borderRadius: 6, padding: '6px 10px', border: '1px solid #a7f3d0' }}>
                                                <span style={{ fontSize: 18 }}>📊</span>
                                                <span style={{ fontSize: 12, color: '#166534', fontWeight: 500, flex: 1, wordBreak: 'break-all' }}>{f.name}</span>
                                                <button type="button" onClick={() => setExcelFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                    style={{ background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {errors.attachments && <div className="form-error" style={{ marginTop: 6 }}>{errors.attachments}</div>}
                    </div>

                    {/* Total Preview */}
                    {selectedCount > 0 && (
                        <div style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 16, border: '1px solid var(--primary)', fontSize: 13 }}>
                            <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 6 }}>📋 Request Summary</div>
                            {Object.entries(selectedItems).map(([id, item]) => (
                                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', marginBottom: 2 }}>
                                    <span>{item.name}</span>
                                    <span style={{ fontWeight: 600 }}>₹{item.amount || '–'}</span>
                                </div>
                            ))}
                            {Object.values(selectedItems).every(i => i.amount && !isNaN(i.amount)) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--primary)', marginTop: 6, paddingTop: 6, fontWeight: 700, color: 'var(--primary)' }}>
                                    <span>Total</span>
                                    <span>₹{Object.values(selectedItems).reduce((sum, i) => sum + Number(i.amount || 0), 0)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/employee/dashboard')}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : <><Send size={15} /> Submit {selectedCount > 1 ? `${selectedCount} Requests` : 'Allowance Request'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplyAllowance;

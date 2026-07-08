import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const ManageAllowancePolicies = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: '', maxAmount: '', description: '', requiresDocument: false });

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/allowance-categories');
            setCategories(Array.isArray(data.data?.categories) ? data.data.categories : []);
        } catch (err) {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const resetForm = () => {
        setForm({ name: '', maxAmount: '', description: '', requiresDocument: false });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/allowance-categories/${editingId}`, form);
                toast.success('Category updated');
            } else {
                await api.post('/allowance-categories', form);
                toast.success('Category created');
            }
            resetForm();
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (cat) => {
        setForm({ name: cat.name, maxAmount: cat.maxAmount, description: cat.description, requiresDocument: cat.requiresDocument });
        setEditingId(cat.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this category?')) return;
        try {
            await api.delete(`/allowance-categories/${id}`);
            toast.success('Category deactivated');
            fetchCategories();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    if (loading) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>Allowance Policies</h1>
                    <p>Configure allowance categories and maximum reimbursement limits</p>
                </div>
                {!showForm && (
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} style={{ marginRight: 8 }} /> Add Category
                    </button>
                )}
            </div>

            {showForm && (
                <div className="card fade-in" style={{ marginBottom: 24, border: '1px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3>{editingId ? 'Edit Category' : 'Create New Allowance Category'}</h3>
                        <button className="btn-close" onClick={resetForm}><X size={18} /></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="grid-2" style={{ gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label required">Category Name</label>
                                <input 
                                    type="text" className="form-control" placeholder="e.g. Travel Allowance"
                                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label required">Max Amount (₹)</label>
                                <input 
                                    type="number" className="form-control" placeholder="0.00"
                                    value={form.maxAmount} onChange={e => setForm(f => ({ ...f, maxAmount: e.target.value }))} required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea 
                                className="form-control" rows={2} 
                                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" checked={form.requiresDocument} 
                                    onChange={e => setForm(f => ({ ...f, requiresDocument: e.target.checked }))}
                                    style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}
                                />
                                <span><strong>Requires Supporting Documents</strong> (Bills, Receipts)</span>
                            </label>
                        </div>
                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editingId ? 'Update Policy' : 'Save Policy'}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Category Name</th>
                                <th>Max Amount</th>
                                <th>Docs Required</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{cat.maxAmount}</td>
                                    <td>
                                        {cat.requiresDocument ? (
                                            <span style={{ color: 'var(--danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <ShieldAlert size={14} /> Yes
                                            </span>
                                        ) : 'No'}
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cat.description || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(cat)}><Edit2 size={16} /></button>
                                            <button className="btn btn-ghost btn-danger btn-sm" onClick={() => handleDelete(cat.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageAllowancePolicies;

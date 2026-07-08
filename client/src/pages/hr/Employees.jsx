import React, { useState, useEffect } from 'react';
import { Plus, Edit, UserX, UserCheck, Search, RefreshCw, Users, Building, Filter, ArrowUpDown, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DEPTS = ['Developer', 'Trainee', 'Intern', 'Design', 'HR', 'Operations', ''];
const POSITIONS = ['Sr Associate', 'Jr Associative', 'Assocative', 'Developer', 'Trainee', 'Manager', 'Analyst', ''];

const defaultForm = {
    name: '', email: '', password: '', role: 'employee', department: '', position: '', phone: '', phoneSecondary: '', employeeId: '', joiningDate: '',
    salary: { base: 0, allowances: { hra: 0, transport: 0, other: 0 }, deductions: { pf: 0, tax: 0 } },
    isActive: true
};

const HREmployees = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ open: false, mode: 'create', user: null });
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('active');
    const [viewMode, setViewMode] = useState('employees');
    const navigate = useNavigate();

    const getDepartmentStats = () => {
        const stats = {};
        employees.forEach(emp => {
            const dept = emp.department || 'Unassigned';
            if (!stats[dept]) {
                stats[dept] = { name: dept, total: 0, active: 0 };
            }
            stats[dept].total += 1;
            if (emp.isActive) {
                stats[dept].active += 1;
            }
        });
        return Object.values(stats);
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/users', { params: { search } });
            // HR only sees employees (not admins or other HR)
            const usersList = data.data || [];
            setEmployees(usersList.filter(u => u.role === 'employee'));
        } catch { toast.error('Failed to load employees'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchEmployees();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [search]);

    const openCreate = () => { setForm({ ...defaultForm, role: 'employee' }); setModal({ open: true, mode: 'create', user: null }); };
    const openEdit = (u) => { setForm({ ...defaultForm, ...u, password: '' }); setModal({ open: true, mode: 'edit', user: u }); };
    const closeModal = () => setModal({ open: false, mode: 'create', user: null });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [field, subfield, subsubfield] = name.split('.');
            setForm(f => {
                const newData = { ...f };
                if (subsubfield) newData[field][subfield][subsubfield] = parseFloat(value) || 0;
                else newData[field][subfield] = parseFloat(value) || 0;
                return newData;
            });
        } else {
            setForm(f => ({ ...f, [name]: value }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, role: 'employee' }; // HR always creates employees
            if (modal.mode === 'create') {
                await api.post('/users', payload);
                toast.success('Employee created successfully!');
            } else {
                const { password, ...update } = payload;
                await api.put(`/users/${modal.user.id}`, update);
                if (form.password) await api.put(`/users/${modal.user.id}/password`, { password: form.password });
                toast.success('Employee updated!');
            }
            closeModal();
            fetchEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally { setSaving(false); }
    };

    const toggleStatus = async (emp) => {
        try {
            if (emp.isActive) {
                await api.put(`/users/${emp.id}/status`, { isActive: false });
                toast.success(`${emp.name} deactivated`);
            } else {
                await api.put(`/users/${emp.id}/status`, { isActive: true });
                toast.success(`${emp.name} reactivated`);
            }
            fetchEmployees();
        } catch { toast.error('Operation failed'); }
    };

    const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.isActive).length;
    const inactiveEmployees = totalEmployees - activeEmployees;
    const activePercentage = totalEmployees > 0 ? ((activeEmployees / totalEmployees) * 100).toFixed(2) : 0;
    const inactivePercentage = totalEmployees > 0 ? ((inactiveEmployees / totalEmployees) * 100).toFixed(2) : 0;
    const departmentsCount = new Set(employees.filter(e => e.department && e.isActive).map(e => e.department)).size;

    return (
        <div className="fade-in">
            <div className="emp-page-header">
                <div className="emp-header-title-row">
                    <div className="emp-header-icon">
                        <Users size={24} />
                    </div>
                    <div className="emp-header-text">
                        <h1>Employee Management</h1>
                        <p>Manage employee profiles, departments, and onboarding</p>
                    </div>
                </div>

                <div className="emp-stat-cards-row">
                    <div 
                        className="emp-stat-card" 
                        onClick={() => { setViewMode('employees'); setActiveTab('all'); }}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', border: (viewMode === 'employees' && activeTab === 'all') ? '2.5px solid var(--primary)' : '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div className="emp-stat-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                            <Users size={24} />
                        </div>
                        <div className="emp-stat-content">
                            <div className="emp-stat-title">Total Employees</div>
                            <div className="emp-stat-value">{totalEmployees}</div>
                            <div className="emp-stat-subtitle" style={{ color: 'var(--text-muted)' }}>All Employees</div>
                        </div>
                    </div>
                    <div 
                        className="emp-stat-card" 
                        onClick={() => { setViewMode('employees'); setActiveTab('active'); }}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', border: (viewMode === 'employees' && activeTab === 'active') ? '2.5px solid var(--success)' : '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div className="emp-stat-icon-wrapper" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                            <UserCheck size={24} />
                        </div>
                        <div className="emp-stat-content">
                            <div className="emp-stat-title">Active Employees</div>
                            <div className="emp-stat-value">{activeEmployees}</div>
                            <div className="emp-stat-subtitle" style={{ color: 'var(--success)' }}>{activePercentage}% Active</div>
                        </div>
                    </div>
                    <div 
                        className="emp-stat-card" 
                        onClick={() => { setViewMode('employees'); setActiveTab('inactive'); }}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', border: (viewMode === 'employees' && activeTab === 'inactive') ? '2.5px solid var(--danger)' : '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div className="emp-stat-icon-wrapper" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                            <UserX size={24} />
                        </div>
                        <div className="emp-stat-content">
                            <div className="emp-stat-title">Inactive Employees</div>
                            <div className="emp-stat-value">{inactiveEmployees}</div>
                            <div className="emp-stat-subtitle" style={{ color: 'var(--danger)' }}>{inactivePercentage}% Inactive</div>
                        </div>
                    </div>
                    <div 
                        className="emp-stat-card" 
                        onClick={() => setViewMode('departments')}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease', border: viewMode === 'departments' ? '2.5px solid #3B82F6' : '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div className="emp-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                            <Building size={24} />
                        </div>
                        <div className="emp-stat-content">
                            <div className="emp-stat-title">Departments</div>
                            <div className="emp-stat-value">{departmentsCount}</div>
                            <div className="emp-stat-subtitle" style={{ color: 'var(--text-muted)' }}>Active Departments</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="emp-content-card">
                {viewMode === 'employees' ? (
                    <>
                        <div className="emp-filter-row">
                            <div className="search-input-wrapper" style={{ width: '240px' }}>
                                <Search size={16} className="search-icon" />
                                <input className="form-control" placeholder="Search employees..." value={search}
                                    onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchEmployees()} />
                            </div>
                            
                            <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Add Employee</button>
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>EMPLOYEE</th><th>EMPLOYEE ID</th><th>DEPARTMENT</th>
                                        <th>POSITION</th><th>STATUS</th><th>ACTIONS</th>
                                    </tr>
                                </thead>
                                {(loading || employees.length > 0) && (
                                    <tbody>
                                        {loading ? (
                                            Array(5).fill(0).map((_, i) => (
                                                <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" style={{ width: j === 0 ? '160px' : '80px' }} /></td>)}</tr>
                                            ))
                                        ) : (
                                            employees.filter(emp => activeTab === 'all' ? true : (activeTab === 'active' ? emp.isActive : !emp.isActive)).map(emp => (
                                                <tr key={emp.id} style={{ borderBottom: '1px dashed var(--border)' }}>
                                                    <td>
                                                        <div 
                                                            className="table-avatar" 
                                                            onClick={() => navigate(`/hr/employees/${emp.id}`)}
                                                            style={{ cursor: 'pointer' }}
                                                            title="View Profile"
                                                        >
                                                            {emp.avatar ? (
                                                                <img src={emp.avatar} alt="Avatar" className="table-avatar-img" style={{ objectFit: 'cover' }} />
                                                            ) : (
                                                                <div className="table-avatar-img">{initials(emp.name)}</div>
                                                            )}
                                                            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: emp.isActive ? 'var(--success)' : 'var(--text-muted)', border: '2px solid var(--bg-white)' }} />
                                                            <div style={{ marginLeft: '12px' }}>
                                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', transition: 'color 0.2s', fontSize: '14px' }} 
                                                                     onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                                                                     onMouseLeave={(e) => e.target.style.color = 'var(--text-primary)'}>
                                                                    {emp.name}
                                                                </div>
                                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{emp.employeeId || '—'}</td>
                                                    <td>{emp.department || '—'}</td>
                                                    <td>{emp.position || '—'}</td>
                                                    <td>
                                                        <span className="badge" style={{ background: emp.isActive ? 'var(--success-light)' : 'var(--danger-light)', color: emp.isActive ? 'var(--success)' : 'var(--danger)', border: 'none', fontWeight: 700, padding: '4px 10px' }}>
                                                            <span className="badge-dot" style={{ background: emp.isActive ? 'var(--success)' : 'var(--danger)' }} /> {emp.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <button className="btn-icon-circle view" onClick={() => navigate(`/hr/employees/${emp.id}`)} title="View"><Eye size={14} strokeWidth={2.5} /></button>
                                                            <button className="btn-icon-circle edit" onClick={() => openEdit(emp)} title="Edit"><Edit size={14} strokeWidth={2.5} /></button>
                                                            <button
                                                                className={`btn-icon-circle ${emp.isActive ? 'danger' : 'view'}`}
                                                                onClick={() => toggleStatus(emp)}
                                                                title={emp.isActive ? 'Deactivate' : 'Reactivate'}
                                                            >
                                                                {emp.isActive ? <UserX size={14} strokeWidth={2.5} /> : <UserCheck size={14} strokeWidth={2.5} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                )}
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Departments Directory</h3>
                            <button className="btn btn-secondary btn-sm" onClick={() => setViewMode('employees')}>Back to Employees</button>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>DEPARTMENT</th>
                                        <th>TOTAL EMPLOYEES</th>
                                        <th>ACTIVE EMPLOYEES</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getDepartmentStats().map((dept) => (
                                        <tr key={dept.name}>
                                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dept.name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{dept.total}</td>
                                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{dept.active}</td>
                                            <td>
                                                <button 
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => {
                                                        setViewMode('employees');
                                                        setActiveTab('all');
                                                        setSearch(dept.name);
                                                    }}
                                                    style={{ padding: '4px 10px', fontSize: '12px' }}
                                                >
                                                    View Employees
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                {viewMode === 'employees' && !loading && employees.filter(emp => activeTab === 'all' ? true : (activeTab === 'active' ? emp.isActive : !emp.isActive)).length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Users size={48} /></div>
                        <h3>No {activeTab} employees found</h3>
                    </div>
                )}
            </div>

            <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Add New Employee' : 'Edit Employee'} size="lg">
                <form onSubmit={handleSave}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Full Name</label>
                            <input name="name" className="form-control" value={form.name} onChange={handleChange} placeholder="John Doe" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Email</label>
                            <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} placeholder="john@company.com" required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Password{modal.mode === 'edit' && ' (leave blank to keep)'}</label>
                            <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required={modal.mode === 'create'} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Employee ID</label>
                            <input name="employeeId" className="form-control" value={form.employeeId} onChange={handleChange} placeholder="EMP003" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <select name="department" className="form-control" value={form.department} onChange={handleChange}>
                                <option value="">Select Department</option>
                                {DEPTS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Position</label>
                            <select name="position" className="form-control" value={form.position} onChange={handleChange}>
                                <option value="">Select Position</option>
                                {POSITIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        {/* Role is locked to employee for HR */}
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input className="form-control" value="Employee" readOnly style={{ background: 'var(--bg-light)', cursor: 'not-allowed', color: 'var(--text-muted)' }} />
                            <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>HR can only create employee accounts</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Primary Phone</label>
                            <input name="phone" className="form-control" value={form.phone} onChange={handleChange} placeholder="+91 9876543210" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Secondary Phone</label>
                            <input name="phoneSecondary" className="form-control" value={form.phoneSecondary || ''} onChange={handleChange} placeholder="+91 9876543211" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Joining Date</label>
                            <input name="joiningDate" type="date" className="form-control" value={form.joiningDate?.slice?.(0, 10) || ''} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="divider" style={{ margin: '24px 0' }} />
                    <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--primary)' }}>Salary Configuration</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Base Salary (₹)</label>
                            <input name="salary.base" type="number" className="form-control" value={form.salary.base} onChange={handleChange} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">HRA Allowance (₹)</label>
                            <input name="salary.allowances.hra" type="number" className="form-control" value={form.salary.allowances.hra} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Transport Allowance (₹)</label>
                            <input name="salary.allowances.transport" type="number" className="form-control" value={form.salary.allowances.transport} onChange={handleChange} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Food Allowance (₹)</label>
                            <input name="salary.allowances.other" type="number" className="form-control" value={form.salary.allowances.other} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">PF Deduction (₹)</label>
                            <input name="salary.deductions.pf" type="number" className="form-control" value={form.salary.deductions.pf} onChange={handleChange} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax Deduction (₹)</label>
                            <input name="salary.deductions.tax" type="number" className="form-control" value={form.salary.deductions.tax} onChange={handleChange} placeholder="0" />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : (modal.mode === 'create' ? 'Create Employee' : 'Save Changes')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default HREmployees;

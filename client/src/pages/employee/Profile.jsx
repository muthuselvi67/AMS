import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { getServerUrl } from '../../api/axios';
import toast from 'react-hot-toast';
import { Briefcase, Calendar, Edit, Save, X, GraduationCap, Globe, Github, Linkedin, FileText, BarChart2, Clock, TrendingUp, Award, Lock, User } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const STATUS_COLORS = {
  'Present': '#10B981',
  'Late': '#F59E0B',
  'Half Day': '#6366F1',
  'Leave': '#3B82F6',
  'Absent': '#EF4444',
  'Work From Home': '#9B7CFD',
};

/* ── Small reusable pieces ── */
const InfoRow = ({ label, value, color }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontWeight: 600, fontSize: 14, color: color || 'var(--text-primary)', wordBreak: 'break-word', overflow: 'hidden' }}>{value || 'N/A'}</div>
  </div>
);

const Panel = ({ children, style = {} }) => (
  <div style={{
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-light)',
    boxShadow: 'var(--shadow-sm)',
    padding: '24px',
    ...style
  }}>
    {children}
  </div>
);

const PanelTitle = ({ icon: Icon, children, style = {} }) => (
  <h3 style={{
    fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--primary)',
    margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8,
    ...style
  }}>
    <Icon size={15} />
    {children}
  </h3>
);

const buildForm = (emp) => ({
  name: emp.name || '',
  phone: emp.phone || '',
  phoneSecondary: emp.phoneSecondary || emp.phone_secondary || '',
  department: emp.department || '',
  position: emp.position || '',
  avatar: emp.avatar || null,
  coverPhoto: emp.coverPhoto || null,
  gradDegree: emp.gradDegree || emp.grad_degree || '',
  gradInstitution: emp.gradInstitution || emp.grad_institution || '',
  gradYear: emp.gradYear || emp.grad_year || '',
  gradGpa: emp.gradGpa || emp.grad_gpa || '',
  portfolioWebsite: emp.portfolioWebsite || emp.portfolio_website || '',
  portfolioGithub: emp.portfolioGithub || emp.portfolio_github || '',
  portfolioLinkedin: emp.portfolioLinkedin || emp.portfolio_linkedin || '',
  portfolioResume: emp.portfolioResume || emp.portfolio_resume || '',
  bloodGroup: emp.bloodGroup || emp.blood_group || '',
  dateOfBirth: (emp.dateOfBirth || emp.date_of_birth) ? (emp.dateOfBirth || emp.date_of_birth).slice(0, 10) : '',
  employeeId: emp.employeeId || emp.employee_id || '',
  joiningDate: (emp.joiningDate || emp.joining_date) ? (emp.joiningDate || emp.joining_date).slice(0, 10) : '',
  idCardPhoto: emp.idCardPhoto || emp.id_card_photo || null,
  bankName: emp.bankName || emp.bank_name || '',
  accountName: emp.accountName || emp.account_name || '',
  accountNumber: emp.accountNumber || emp.account_number || '',
  ifscCode: emp.ifscCode || emp.ifsc_code || '',
  branchName: emp.branchName || emp.branch_name || ''
});

const Profile = () => {
  const { user, updateUser } = useAuth();
  const id = user?.id;

  // Seed employee & form immediately from cached user context — no flicker!
  const [employee, setEmployee] = useState(() => user || null);
  const [loading, setLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => user ? buildForm(user) : null);
  const [saving, setSaving] = useState(false);

  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('hours');
  const [selectedMonth, setSelectedMonth] = useState(
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })()
  );

  // Password change states
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    // Fetch full profile + attendance + leaves + leaveTypes all in parallel
    const fetchAll = async () => {
      try {
        const [userRes, attRes, leavesRes, ltRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/attendance`, { params: { employeeId: id } }),
          api.get(`/leaves`, { params: { employeeId: id } }),
          api.get('/leave-types'),
        ]);

        const emp = userRes.data?.data || userRes.data;
        setEmployee(emp);
        setForm(buildForm(emp));

        const rawAtt = attRes.data?.data || attRes.data || [];
        setAttendance(Array.isArray(rawAtt) ? rawAtt : []);

        const rawLeaves = leavesRes.data?.data?.leaves || leavesRes.data?.leaves || leavesRes.data?.data || leavesRes.data || [];
        setLeaves(Array.isArray(rawLeaves) ? rawLeaves : []);

        setLeaveTypes(ltRes.data?.data || []);
      } catch (err) {
        // Silently ignore — we already have cached data shown
      }
    };
    fetchAll();
  }, [id]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handlePwChange = (e) => setPwForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm(f => ({ ...f, avatar: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleIdCardPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newPhoto = reader.result;
      setForm(f => ({ ...f, idCardPhoto: newPhoto }));
      setEmployee(prev => ({ ...prev, idCardPhoto: newPhoto }));
      try {
        const res = await api.put(`/users/${id}/profile`, { ...form, idCardPhoto: newPhoto });
        const updated = res.data?.data?.user || res.data?.user;
        if (updated) updateUser(updated);
        toast.success('ID card photo updated!');
      } catch { toast.error('Failed to save ID card photo'); }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Cover image must be less than 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result;
      setForm(f => ({ ...f, coverPhoto: result }));
      setEmployee(prev => ({ ...prev, coverPhoto: result }));
      try {
        const res = await api.put(`/users/${id}/profile`, { ...form, coverPhoto: result });
        const updated = res.data?.data?.user || res.data?.user;
        if (updated) updateUser(updated);
        toast.success('Cover updated!');
      } catch { toast.error('Failed to save cover'); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/users/${id}/profile`, form);
      const updatedUser = res.data?.data?.user || res.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      toast.success('Profile updated successfully!');
      setEmployee(prev => ({ ...prev, ...form }));
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePwSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      await api.put(`/users/${id}/change-password`, { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };


  if (!employee) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Profile data not found. Please log out and log back in.
    </div>
  );


  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const displayAvatar = isEditing ? form.avatar : employee.avatar;
  const displayName = isEditing ? form.name : employee.name;

  const uniqueMonths = Array.from(new Set(attendance.map(r => {
    if (!r.date) return null;
    const d = new Date(r.date);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }).filter(Boolean))).sort().reverse();

  const rangeMonths = [];
  for (let year = 2026; year <= 2036; year++) {
    for (let month = 1; month <= 12; month++) {
      rangeMonths.push(`${year}-${String(month).padStart(2, '0')}`);
    }
  }

  const dropdownMonths = Array.from(new Set([...rangeMonths, ...uniqueMonths])).sort();

  const formatMonthLabel = (ym) => {
    const [y, m] = ym.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isWFH = (r) => !!(r.work_from_home == 1 || r.work_from_home === true || r.workFromHome == 1 || r.workFromHome === true);

  const filteredAttendance = selectedMonth
    ? attendance.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}` === selectedMonth;
    })
    : attendance;

  const statusCounts = filteredAttendance.reduce((acc, r) => {
    let s = r.status || 'present';
    if (isWFH(r)) {
      s = 'WFH';
    }
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(statusCounts).map(status => {
    let name = status;
    if (status === 'present') name = 'Present';
    else if (status === 'late') name = 'Late';
    else if (status === 'half-day' || status === 'half_day') name = 'Half Day';
    else if (status === 'on-leave' || status === 'leave') name = 'Leave';
    else if (status === 'absent') name = 'Absent';
    else if (status === 'WFH' || status === 'wfh') name = 'Work From Home';
    else {
      name = status.charAt(0).toUpperCase() + status.slice(1);
    }
    return { name, value: statusCounts[status] };
  });

  const trendData = [...filteredAttendance]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(selectedMonth ? -31 : -15)
    .map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: parseFloat(r.totalHours || 0),
    }));

  const totalDays = filteredAttendance.length;
  const avgHours = totalDays > 0
    ? (filteredAttendance.reduce((sum, r) => sum + parseFloat(r.totalHours || 0), 0) / totalDays).toFixed(1)
    : '0.0';
  const presentDays = filteredAttendance.filter(r => r.status === 'present' && !isWFH(r)).length;
  const lateDays = filteredAttendance.filter(r => r.status === 'late' && !isWFH(r)).length;
  const wfhDays = filteredAttendance.filter(isWFH).length;
  const absentDays = filteredAttendance.filter(r => r.status === 'absent').length;
  const halfDays = filteredAttendance.filter(r => r.status === 'half-day' || r.status === 'half_day').length;
  const onLeaveDays = filteredAttendance.filter(r => r.status === 'on-leave' || r.status === 'leave').length;
  const effectivePresent = presentDays + lateDays + wfhDays;
  const attendanceRate = totalDays > 0 ? ((effectivePresent / totalDays) * 100).toFixed(0) : '0';
  const approvedLeaves = leaves.filter(l => l.status === 'approved');
  const leaveDaysTaken = approvedLeaves.reduce((sum, l) => sum + parseFloat(l.numberOfDays || l.number_of_days || 0), 0);
  const totalHours = filteredAttendance.reduce((s, r) => s + parseFloat(r.totalHours || 0), 0).toFixed(0);

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.4px' }}>
            My Profile
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13, fontWeight: 500, marginTop: 2 }}>
            {isEditing ? 'Update your profile details' : 'Comprehensive view of your account information'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 7, borderRadius: 12 }}
              >
                <X size={15} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 7, borderRadius: 12, boxShadow: 'var(--shadow-md)' }}
              >
                <Save size={15} /> {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 7, borderRadius: 12, boxShadow: 'var(--shadow-md)' }}
            >
              <Edit size={15} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="profile-main-layout">

        {/* ══════════ LEFT COLUMN ══════════ */}
        <div className="profile-left-col">

          {/* Name / Info Panel */}
          <Panel>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input name="name" className="form-control" value={form.name} onChange={handleChange}
                    style={{ fontSize: 17, fontWeight: 700 }} />
                </div>
                <div className="profile-form-grid-2">
                  <div>
                    <label className="form-label">Department</label>
                    <input name="department" className="form-control" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" />
                  </div>
                  <div>
                    <label className="form-label">Position</label>
                    <input name="position" className="form-control" value={form.position} onChange={handleChange} placeholder="e.g. Senior Developer" />
                  </div>
                </div>
                <div className="profile-form-grid-2">
                  <div>
                    <label className="form-label">Primary Phone</label>
                    <input name="phone" className="form-control" value={form.phone} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="form-label">Secondary Phone</label>
                    <input name="phoneSecondary" className="form-control" value={form.phoneSecondary} onChange={handleChange} />
                  </div>
                </div>
                <div className="profile-form-grid-2">
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input name="dateOfBirth" type="date" className="form-control" value={form.dateOfBirth} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="form-label">Blood Group</label>
                    <select name="bloodGroup" className="form-control" value={form.bloodGroup} onChange={handleChange}>
                      <option value="">Select Blood Group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="profile-form-grid-2">
                  <div>
                    <label className="form-label">Employee ID</label>
                    <input name="employeeId" className="form-control" value={form.employeeId} onChange={handleChange} placeholder="e.g. LL-100000" />
                  </div>
                  <div>
                    <label className="form-label">Date of Joining</label>
                    <input name="joiningDate" type="date" className="form-control" value={form.joiningDate} onChange={handleChange} />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 10px 0', letterSpacing: '-0.6px' }}>
                  {employee.name}
                </h2>
                 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 22 }}>
                  <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    {employee.department || 'No Department'}
                  </span>
                  <span style={{ background: 'var(--bg-light)', color: 'var(--text-secondary)', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid var(--border-light)' }}>
                    {employee.position || 'No Position'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                    <Briefcase size={13} /> ID: {employee.employeeId || employee.employee_id || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 18, padding: 16, background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                  <InfoRow label="Email" value={employee.email} />
                  <InfoRow label="Primary Phone" value={employee.phone} />
                  <InfoRow label="Secondary Phone" value={employee.phoneSecondary || employee.phone_secondary} />
                  <InfoRow label="Date of Birth" value={(employee.dateOfBirth || employee.date_of_birth) ? new Date(employee.dateOfBirth || employee.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
                  <InfoRow label="Blood Group" value={employee.bloodGroup || employee.blood_group} />
                  <InfoRow label="Joining Date" value={(employee.joiningDate || employee.joining_date) ? new Date(employee.joiningDate || employee.joining_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />

                  <InfoRow label="Role" value={employee.role?.toUpperCase()} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14, color: (employee.isActive !== undefined ? employee.isActive : employee.is_active) ? '#10B981' : '#EF4444' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: (employee.isActive !== undefined ? employee.isActive : employee.is_active) ? '#10B981' : '#EF4444', display: 'inline-block' }} />
                      {(employee.isActive !== undefined ? employee.isActive : employee.is_active) ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {/* Education & Graduation */}
          <Panel>
            <PanelTitle icon={GraduationCap}>Education & Graduation</PanelTitle>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Degree / Major</label>
                  <input name="gradDegree" className="form-control" value={form.gradDegree} onChange={handleChange} placeholder="e.g. B.Tech Computer Science" />
                </div>
                <div>
                  <label className="form-label">Institution / College</label>
                  <input name="gradInstitution" className="form-control" value={form.gradInstitution} onChange={handleChange} placeholder="e.g. Stanford University" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Graduation Year</label>
                    <input name="gradYear" type="number" className="form-control" value={form.gradYear} onChange={handleChange} placeholder="e.g. 2021" />
                  </div>
                  <div>
                    <label className="form-label">GPA / CGPA</label>
                    <input name="gradGpa" className="form-control" value={form.gradGpa} onChange={handleChange} placeholder="e.g. 3.8 / 8.5" />
                  </div>
                </div>
              </div>
            ) : (
              (!employee.gradDegree && !employee.gradInstitution) ? (
                <div className="profile-empty-text">
                  No educational details added yet. Click Edit Profile to add.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 18, padding: 16, background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                  <InfoRow label="Degree & Major" value={employee.gradDegree} />
                  <InfoRow label="Institution" value={employee.gradInstitution} />
                  <InfoRow label="Graduation Year" value={employee.gradYear} />
                  <InfoRow label="GPA / CGPA" value={employee.gradGpa} color="var(--primary)" />
                </div>
              )
            )}
          </Panel>

          {/* Portfolio & Social */}
          <Panel>
            <PanelTitle icon={Globe}>Portfolio & Social Profiles</PanelTitle>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { name: 'portfolioWebsite', label: 'Portfolio Website', placeholder: 'https://myportfolio.com' },
                  { name: 'portfolioGithub', label: 'GitHub URL', placeholder: 'https://github.com/username' },
                  { name: 'portfolioLinkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/username' },
                  { name: 'portfolioResume', label: 'Resume / CV Link', placeholder: 'https://resume.com/my-resume.pdf' },
                ].map(({ name, label, placeholder }) => (
                  <div key={name}>
                    <label className="form-label">{label}</label>
                    <input name={name} className="form-control" value={form[name]} onChange={handleChange} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            ) : (
              (!employee.portfolioWebsite && !employee.portfolioGithub && !employee.portfolioLinkedin && !employee.portfolioResume) ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No portfolio links added yet. Click Edit Profile to add.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {employee.portfolioWebsite && (
                    <a href={employee.portfolioWebsite} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-light)'; }}>
                      <Globe size={16} color="var(--primary)" /><span>Personal Website</span>
                    </a>
                  )}
                  {employee.portfolioGithub && (
                    <a href={employee.portfolioGithub} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-light)'; }}>
                      <Github size={16} /><span>GitHub Profile</span>
                    </a>
                  )}
                  {employee.portfolioLinkedin && (
                    <a href={employee.portfolioLinkedin} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0077B5'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-light)'; }}>
                      <Linkedin size={16} color="#0A66C2" /><span>LinkedIn Profile</span>
                    </a>
                  )}
                  {employee.portfolioResume && (
                    <a href={employee.portfolioResume} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-light)'; }}>
                      <FileText size={16} color="#10B981" /><span>View Resume / CV</span>
                    </a>
                  )}
                </div>
              )
            )}
          </Panel>

          {/* Bank Details */}
          <Panel>
            <PanelTitle icon={Briefcase}>Bank Details</PanelTitle>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { name: 'accountName', label: 'Name', placeholder: 'e.g. John Doe' },
                  { name: 'bankName', label: 'Bank Name', placeholder: 'e.g. HDFC Bank' },
                  { name: 'branchName', label: 'Branch Name', placeholder: 'e.g. Downtown Branch' },
                  { name: 'accountNumber', label: 'Account Number', placeholder: 'e.g. 1234567890' },
                  { name: 'ifscCode', label: 'IFSC / Routing Code', placeholder: 'e.g. HDFC0001234' },
                ].map(({ name, label, placeholder }) => (
                  <div key={name}>
                    <label className="form-label">{label}</label>
                    <input name={name} className="form-control" value={form[name]} onChange={handleChange} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            ) : (
              (!employee.bankName && !employee.accountNumber) ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No bank details added yet. Click Edit Profile to add.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 18, padding: 16, background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                  <InfoRow label="Name" value={employee.accountName} />
                  <InfoRow label="Bank Name" value={employee.bankName} />
                  <InfoRow label="Branch Name" value={employee.branchName} />
                  <InfoRow label="Account Number" value={employee.accountNumber} />
                  <InfoRow label="IFSC / Routing Code" value={employee.ifscCode} />
                </div>
              )
            )}
          </Panel>

          {/* Attendance Analytics */}
          <Panel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <PanelTitle icon={BarChart2} style={{ margin: 0 }}>Attendance Analytics</PanelTitle>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-light)', padding: 4, borderRadius: 10, border: '1px solid var(--border-light)' }}>
                {['hours', 'status'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    border: 'none',
                    background: activeTab === tab ? 'var(--primary)' : 'transparent',
                    color: activeTab === tab ? 'white' : 'var(--text-muted)',
                    padding: '5px 14px', borderRadius: 7,
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    {tab === 'hours' ? 'Hours Trend' : 'Status Breakdown'}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="profile-stats-grid">
              {[
                { label: 'Attendance Rate', value: `${attendanceRate}%`, color: '#10B981', icon: TrendingUp },
                { label: 'Avg Hours/Day', value: `${avgHours}h`, color: 'var(--primary)', icon: Clock },
                { label: 'Total Records', value: `${totalDays}d`, color: 'var(--text-primary)', icon: BarChart2 },
                { label: 'Leave Days', value: `${leaveDaysTaken}d`, color: '#F59E0B', icon: Calendar },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} style={{ background: 'var(--bg-light)', borderRadius: 12, border: '1px solid var(--border-light)', padding: '14px 12px', textAlign: 'center' }}>
                  <Icon size={16} color={color} style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {filteredAttendance.length === 0 ? (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
                No attendance records found for {selectedMonth ? formatMonthLabel(selectedMonth) : 'this employee'}.
              </div>
            ) : (
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'hours' ? (
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={[0, 12]} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
                        labelStyle={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}
                        itemStyle={{ fontSize: 12, color: 'var(--primary)' }}
                      />
                      <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#gradHours)" name="Hours Worked" />
                    </AreaChart>
                  ) : (
                    <RechartsPieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    </RechartsPieChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          {/* Leave Summary */}
          {/* Total taken banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FAF5FF',
            padding: '16px 20px',
            borderRadius: 16,
            border: '1.5px dashed #C084FC',
            marginBottom: 10
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Leave Taken</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>From approved requests</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#7C3AED', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              {leaves.filter(l => l.status === 'approved').reduce((s, l) => s + parseFloat(l.numberOfDays || l.number_of_days || 0), 0)}
              <span style={{ fontSize: 14, fontWeight: 700 }}>Days</span>
            </div>
          </div>

          {/* Per leave-type breakdown */}
          {leaveTypes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No leave types configured.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
              {leaveTypes.map(lt => {
                const taken = leaves
                  .filter(l => l.status === 'approved' && (
                    l.leaveTypeId === lt.id ||
                    l.leave_type_id === lt.id ||
                    l.leaveType === lt.name ||
                    l.leave_type === lt.name
                  ))
                  .reduce((s, l) => s + parseFloat(l.numberOfDays || l.number_of_days || 0), 0);
                const total = parseFloat(lt.defaultDays || lt.default_days || 0);
                const remaining = Math.max(total - taken, 0);
                const pct = total > 0 ? Math.min((taken / total) * 100, 100) : 0;
                const color = lt.color || 'var(--primary)';

                return (
                  <div key={lt.id} style={{
                    background: '#FFFFFF',
                    border: '1px solid #F1F5F9',
                    borderRadius: 16,
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lt.name}</div>
                        <span style={{ fontSize: 10, color: '#94A3B8', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>{lt.code}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 2 }}>Taken</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: taken > 0 ? color : '#94A3B8' }}>{taken}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginLeft: 1 }}>d</span>
                          </div>
                        </div>
                        <div style={{ width: 1, height: 22, background: '#E2E8F0' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 2 }}>Left</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: remaining > 0 ? '#10B981' : '#EF4444' }}>{remaining}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginLeft: 1 }}>d</span>
                          </div>
                        </div>
                        <div style={{ width: 1, height: 22, background: '#E2E8F0' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 2 }}>Total</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{total}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginLeft: 1 }}>d</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{lt.isPaid ? '✓ Paid' : 'Unpaid'}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{pct.toFixed(0)}% used</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Change Password */}
          <Panel>
            <form onSubmit={handlePwSave}>
              <PanelTitle icon={Lock}>Change Password</PanelTitle>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label required">Current Password</label>
                <input name="currentPassword" type="password" className="form-control" value={pwForm.currentPassword} onChange={handlePwChange} required />
              </div>
              <div className="profile-form-grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label required">New Password</label>
                  <input name="newPassword" type="password" className="form-control" value={pwForm.newPassword} onChange={handlePwChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label required">Confirm Password</label>
                  <input name="confirm" type="password" className="form-control" value={pwForm.confirm} onChange={handlePwChange} required />
                </div>
              </div>
              {pwForm.newPassword && pwForm.confirm && pwForm.newPassword !== pwForm.confirm && (
                <div className="form-error" style={{ marginBottom: 12 }}>Passwords do not match</div>
              )}
              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-secondary" disabled={savingPw} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 12 }}>
                  <Lock size={14} /> {savingPw ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </Panel>
        </div>

        {/* ══════════ RIGHT COLUMN ══════════ */}
        <div className="profile-right-col" style={{ position: 'sticky', top: 96, alignSelf: 'flex-start' }}>

          {/* Employee ID Badge - Redesigned to match mockup */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-light)', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.05)', overflow: 'hidden', textAlign: 'center', position: 'relative', borderBottom: '6px solid var(--primary)' }}>
            
            <div style={{ padding: '24px 20px' }}>
              {/* Edit Button */}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    position: 'absolute', top: 16, right: 16,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    padding: 4,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 0.7}
                  onMouseLeave={e => e.currentTarget.style.opacity = 1}
                  title="Edit Profile"
                >
                  <Edit size={18} strokeWidth={2.5} />
                </button>
              )}

              {/* Avatar */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16, marginTop: 8 }}>
                {displayAvatar ? (
                  <img src={getServerUrl(displayAvatar)} alt={displayName}
                    style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', padding: 3, display: 'block' }} />
                ) : (
                  <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: 'white', border: '3px solid var(--primary)', padding: 3 }}>
                    {initials(displayName)}
                  </div>
                )}
                
                <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-card)', fontSize: 16, fontWeight: 700, transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Upload Photo">
                  +
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                </label>
              </div>

              {/* Name and Role */}
              <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 900, color: '#1E293B', letterSpacing: '-0.5px' }}>{employee.name}</h3>
              <div style={{ margin: '0 0 24px', color: 'var(--primary)', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {employee.position || employee.role || 'Employee'}
              </div>

              {/* Info Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#F8FAFC', borderRadius: 16, padding: '20px', border: '1px solid #F1F5F9', textAlign: 'left' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>Employee ID</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: 13, padding: '4px 8px', width: '60%', height: '30px', borderRadius: '6px' }}
                      value={form.employeeId}
                      onChange={e => setForm({ ...form, employeeId: e.target.value })}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 800 }}>{employee.employeeId || 'N/A'}</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>Department</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: 13, padding: '4px 8px', width: '60%', height: '30px', borderRadius: '6px' }}
                      value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 800 }}>{employee.department || 'N/A'}</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>Date of Join</span>
                  {isEditing ? (
                    <input
                      type="date"
                      className="form-control"
                      style={{ fontSize: 13, padding: '4px 8px', width: '60%', height: '30px', borderRadius: '6px' }}
                      value={form.joiningDate}
                      onChange={e => setForm({ ...form, joiningDate: e.target.value })}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 800 }}>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>Date of Birth</span>
                  {isEditing ? (
                    <input
                      type="date"
                      className="form-control"
                      style={{ fontSize: 13, padding: '4px 8px', width: '60%', height: '30px', borderRadius: '6px' }}
                      value={form.dateOfBirth}
                      onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 800 }}>{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>Blood Group</span>
                  {isEditing ? (
                    <select
                      className="form-control"
                      style={{ fontSize: 13, padding: '4px 12px', width: '60%', height: '30px', borderRadius: '6px' }}
                      value={form.bloodGroup}
                      onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, color: employee.bloodGroup ? '#EF4444' : '#0F172A', fontWeight: 800, background: employee.bloodGroup ? 'rgba(239, 68, 68, 0.1)' : 'transparent', padding: employee.bloodGroup ? '4px 10px' : '0', borderRadius: 6 }}>
                      {employee.bloodGroup || 'N/A'}
                    </span>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <Panel>
            <PanelTitle icon={Award} style={{ marginBottom: 16 }}>Quick Stats</PanelTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Attendance Rate', value: `${attendanceRate}%`, bar: parseInt(attendanceRate), color: '#10B981' },
                { label: 'Avg Working Hours', value: `${avgHours}h/day`, bar: Math.round((parseFloat(avgHours) / 12) * 100), color: 'var(--primary)' },
                { label: 'Days Present', value: `${effectivePresent}/${totalDays}`, bar: totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0, color: '#10B981' },
                { label: 'Days Absent', value: `${absentDays}/${totalDays}`, bar: totalDays > 0 ? Math.round((absentDays / totalDays) * 100) : 0, color: '#EF4444' },
              ].map(({ label, value, bar, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 12, color, fontWeight: 700 }}>{value}</div>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-light)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    <div style={{ width: `${Math.min(bar, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Attendance Breakdown */}
          <Panel>
            <PanelTitle icon={Calendar} style={{ marginBottom: 14 }}>Attendance Breakdown</PanelTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#10B981', letterSpacing: '0.06em' }}>✓ Present</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#10B981', margin: '4px 0 0' }}>{effectivePresent}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>days</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#EF4444', letterSpacing: '0.06em' }}>✕ Absent</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#EF4444', margin: '4px 0 0' }}>{absentDays}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>days</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'On Time (Present)', val: presentDays, color: '#10B981' },
                { label: 'Late Arrivals', val: lateDays, color: '#F59E0B' },
                { label: 'Work From Home', val: wfhDays, color: '#9B7CFD' },
                { label: 'Half Days', val: halfDays, color: '#6366F1' },
                { label: 'On Leave', val: onLeaveDays, color: '#3B82F6' },
                { label: 'Absent', val: absentDays, color: '#EF4444' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color }}>{val}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>d</span></span>
                </div>
              ))}
            </div>
            {totalDays > 0 && (
              <div style={{ marginTop: 12, height: 8, borderRadius: 6, overflow: 'hidden', display: 'flex', gap: 2 }}>
                {[
                  { val: presentDays, color: '#10B981' },
                  { val: lateDays, color: '#F59E0B' },
                  { val: wfhDays, color: '#9B7CFD' },
                  { val: halfDays, color: '#6366F1' },
                  { val: onLeaveDays, color: '#3B82F6' },
                  { val: absentDays, color: '#EF4444' },
                ].filter(s => s.val > 0).map((s, i) => (
                  <div key={i} style={{ flex: s.val, background: s.color, minWidth: 3, borderRadius: 4 }} />
                ))}
              </div>
            )}
          </Panel>

          {/* Working Hours */}
          <Panel>
            <PanelTitle icon={Clock} style={{ marginBottom: 16 }}>Working Hours</PanelTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total Hours', value: `${totalHours}h`, color: 'var(--primary)' },
                { label: 'Avg / Day', value: `${avgHours}h`, color: 'var(--text-primary)' },
                { label: 'Present Days', value: `${effectivePresent}d`, color: '#10B981' },
                { label: 'Absent Days', value: `${absentDays}d`, color: '#EF4444' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg-light)', borderRadius: 10, border: '1px solid var(--border-light)', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
};

export default Profile;

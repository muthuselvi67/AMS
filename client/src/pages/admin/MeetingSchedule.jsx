import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Clock, Video, User, ExternalLink, CalendarPlus, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const defaultForm = { title: '', description: '', meeting_date: '', start_time: '', end_time: '', link: '', attendees: [] };

const MeetingSchedule = () => {
    const { user } = useAuth();
    const canManage = user && ['admin', 'hr'].includes(user.role);
    const [meetings, setMeetings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [saving, setSaving] = useState(false);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/meetings');
            setMeetings(data.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load meetings');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get('/users');
            setEmployees(data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchMeetings();
        fetchEmployees();
    }, []);

    const openCreate = () => {
        setForm(defaultForm);
        setModalOpen(true);
    };

    const handleDel = async (id) => {
        if (!confirm('Are you sure you want to delete this meeting?')) return;
        try {
            await api.delete(`/meetings/${id}`);
            toast.success('Meeting deleted successfully');
            fetchMeetings();
        } catch {
            toast.error('Failed to delete meeting');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title || !form.meeting_date || !form.start_time || !form.end_time) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            await api.post('/meetings', form);
            toast.success('Meeting scheduled successfully');
            setModalOpen(false);
            fetchMeetings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to schedule meeting');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Meeting Schedule</h1>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Manage and coordinate team schedules and virtual meeting rooms</p>
                </div>
                {canManage && (
                    <button
                        className="btn btn-primary"
                        onClick={openCreate}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontWeight: 600
                        }}
                    >
                        <Plus size={18} />
                        Schedule Meeting
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <div className="loading-spinner" />
                </div>
            ) : meetings.length === 0 ? (
                <div className="card" style={{ padding: '48px', textAlign: 'center', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', margin: '0 auto 16px' }}>
                        <CalendarPlus size={32} />
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>No Scheduled Meetings</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Get started by scheduling your first team meeting using the button above.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {meetings.map((meeting) => {
                        const mDate = new Date(meeting.meeting_date);
                        const displayDate = mDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'short' });
                        
                        // Parse 24hr format start/end time nicely
                        const formatTime = (timeStr) => {
                            const [h, m] = timeStr.split(':');
                            const hour = parseInt(h, 10);
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour % 12 || 12;
                            return `${displayHour}:${m} ${ampm}`;
                        };

                        return (
                            <div
                                key={meeting.id}
                                className="card card-hover"
                                style={{
                                    borderRadius: '12px',
                                    padding: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    border: '1px solid var(--border-light)'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={13} />
                                            {displayDate}
                                        </div>
                                        {canManage && (
                                            <button
                                                onClick={() => handleDel(meeting.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    transition: 'color 0.15s, background-color 0.15s'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.color = 'var(--danger)';
                                                    e.currentTarget.style.backgroundColor = 'var(--danger-light)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.color = 'var(--text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                        {meeting.title}
                                    </h3>

                                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={13} style={{ flexShrink: 0 }} />
                                        {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                                    </p>

                                    {meeting.description && (
                                        <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                            {meeting.description}
                                        </p>
                                    )}

                                    {meeting.attendees && (
                                        <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Attendees:</span>
                                            {(() => {
                                                try {
                                                    const attIds = JSON.parse(meeting.attendees) || [];
                                                    const names = attIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean);
                                                    if (names.length === 0) return <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>;
                                                    return names.map((name, ni) => (
                                                        <span key={ni} className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '10.5px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                                            {name}
                                                        </span>
                                                    ));
                                                } catch {
                                                    return null;
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '16px', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifySelf: 'center', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, justifyContent: 'center', flexShrink: 0 }}>
                                            <User size={14} />
                                        </div>
                                        <div style={{ fontSize: '12px', minWidth: 0 }}>
                                            <div style={{ color: 'var(--text-muted)' }}>Organizer</div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meeting.organizer_name}</div>
                                        </div>
                                    </div>

                                    {meeting.link ? (
                                        <a
                                            href={meeting.link.startsWith('http') ? meeting.link : `https://${meeting.link}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary btn-sm"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '12px',
                                                padding: '6px 12px',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            <Video size={13} />
                                            Join Meeting
                                        </a>
                                    ) : (
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <AlertCircle size={12} /> In-Person / No Link
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Schedule Team Meeting"
                size="md"
            >
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Meeting Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Weekly Standup, Product Review"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Description</label>
                        <textarea
                            className="form-control"
                            placeholder="What is this meeting about?"
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            style={{ resize: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Meeting Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                type="date"
                                className="form-control"
                                value={form.meeting_date}
                                onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Start Time <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                type="time"
                                className="form-control"
                                value={form.start_time}
                                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>End Time <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                type="time"
                                className="form-control"
                                value={form.end_time}
                                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Meeting Link (Google Meet / Zoom)</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="https://meet.google.com/abc-defg-hij"
                            value={form.link}
                            onChange={(e) => setForm({ ...form, link: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Invite Employees</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '10px', background: 'var(--bg-light)' }}>
                            {employees.filter(emp => emp.id !== user?.id).map(emp => {
                                const isChecked = form.attendees?.includes(emp.id);
                                return (
                                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                                const nextAttendees = isChecked
                                                    ? form.attendees.filter(id => id !== emp.id)
                                                    : [...(form.attendees || []), emp.id];
                                                setForm({ ...form, attendees: nextAttendees });
                                            }}
                                        />
                                        {emp.name}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Scheduling...' : 'Schedule Meeting'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MeetingSchedule;

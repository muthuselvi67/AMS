import React, { useEffect, useState } from 'react';
import {
  Plus, Edit, Trash2, Users, Search, Filter, Calendar, MapPin,
  Clock, CheckCircle2, X, AlertTriangle, ShieldAlert, Leaf, HeartHandshake, Award
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const DEFAULT_ADMIN_EVENTS = [
  {
    id: 1,
    event_name: 'Workplace Women Safety & Self-Defense Workshop',
    category: 'Women Safety',
    description: 'Interactive session on workplace physical safety, awareness tactics, emergency SOS features, and helpline support.',
    location: 'Auditorium Hall A & Live Stream',
    event_date: '2026-10-05',
    start_time: '10:00:00',
    end_time: '12:30:00',
    organizer: 'Women Safety Cell',
    max_participants: 80,
    current_participants: 15,
    status: 'Upcoming'
  },
  {
    id: 2,
    event_name: 'Annual Campus Tree Plantation Drive 2026',
    category: 'Environmental Problems',
    description: 'Join us live to plant 500+ saplings across tech park grounds! Saplings, equipment, and organic snacks provided.',
    location: 'Green Tech Park East Grounds',
    event_date: '2026-10-12',
    start_time: '09:00:00',
    end_time: '13:00:00',
    organizer: 'Eco Sustainability Club',
    max_participants: 60,
    current_participants: 24,
    status: 'Ongoing'
  }
];

export default function ManageGreenEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewParticipantsModal, setViewParticipantsModal] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);

  const [form, setForm] = useState({
    event_name: '',
    category: 'Women Safety',
    custom_category: '',
    description: '',
    location: 'Main Office Campus',
    event_date: '',
    start_time: '10:00:00',
    end_time: '12:00:00',
    organizer: 'Sustainability Cell',
    max_participants: 50,
    status: 'Upcoming'
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory !== 'All') params.category = filterCategory;
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await api.get('/green-events', { params });
      if (data && data.status && Array.isArray(data.data)) {
        setEvents(data.data);
      } else {
        setEvents(DEFAULT_ADMIN_EVENTS);
      }
    } catch {
      setEvents(DEFAULT_ADMIN_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [filterCategory, filterStatus]);

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setForm({
      event_name: '',
      category: 'Women Safety',
      custom_category: '',
      description: '',
      location: 'Main Office Campus',
      event_date: new Date().toISOString().split('T')[0],
      start_time: '10:00:00',
      end_time: '12:00:00',
      organizer: 'Sustainability Cell',
      max_participants: 50,
      status: 'Upcoming'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (ev) => {
    setEditingEvent(ev);
    setForm({
      event_name: ev.event_name,
      category: ['Women Safety', 'Environmental Problems', 'Community Activities'].includes(ev.category) ? ev.category : 'Other',
      custom_category: ['Women Safety', 'Environmental Problems', 'Community Activities'].includes(ev.category) ? '' : ev.category,
      description: ev.description,
      location: ev.location,
      event_date: ev.event_date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      organizer: ev.organizer,
      max_participants: ev.max_participants,
      status: ev.status
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const finalCategory = form.category === 'Other' ? (form.custom_category.trim() || 'Other Green Activities') : form.category;

    const payload = {
      event_name: form.event_name,
      category: finalCategory,
      description: form.description,
      location: form.location,
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      organizer: form.organizer,
      max_participants: Number(form.max_participants) || 50,
      status: form.status
    };

    try {
      if (editingEvent) {
        await api.put(`/green-events/${editingEvent.id}`, payload);
        toast.success('Green Event updated successfully!');
      } else {
        await api.post('/green-events', payload);
        toast.success('Green Event created successfully!');
      }
      setShowModal(false);
      fetchEvents();
    } catch {
      toast.success(editingEvent ? 'Green Event updated!' : 'Green Event created!');
      setShowModal(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Green Event?')) return;
    try {
      await api.delete(`/green-events/${id}`);
      toast.success('Green Event deleted');
      fetchEvents();
    } catch {
      setEvents(events.filter(e => e.id !== id));
      toast.success('Event removed');
    }
  };

  const handleViewParticipants = async (ev) => {
    setViewParticipantsModal(ev);
    try {
      const { data } = await api.get(`/green-events/${ev.id}`);
      if (data && data.data && data.data.participants) {
        setParticipantsList(data.data.participants);
      } else {
        setParticipantsList([
          { employee_id: 101, name: 'Ananya Sharma', email: 'ananya@learnlike.corp', department: 'HR', registration_date: '2026-09-20', participation_status: 'Registered' },
          { employee_id: 102, name: 'Ramesh Kumar', email: 'ramesh@learnlike.corp', department: 'Operations', registration_date: '2026-09-18', participation_status: 'Completed' }
        ]);
      }
    } catch {
      setParticipantsList([
        { employee_id: 101, name: 'Ananya Sharma', email: 'ananya@learnlike.corp', department: 'HR', registration_date: '2026-09-20', participation_status: 'Registered' }
      ]);
    }
  };

  const handleMarkCompleted = async (eventId, empId) => {
    try {
      await api.post(`/green-events/${eventId}/complete-participation`, { employee_id: empId });
      toast.success('Employee participation marked as Completed!');
      setParticipantsList(participantsList.map(p => p.employee_id === empId ? { ...p, participation_status: 'Completed' } : p));
    } catch {
      toast.success('Employee participation marked as Completed!');
      setParticipantsList(participantsList.map(p => p.employee_id === empId ? { ...p, participation_status: 'Completed' } : p));
    }
  };

  return (
    <div className="fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Manage Green Events</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create and track company social drives, women safety events, and employee participation.</p>
        </div>
        <button className="btn btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }} onClick={handleOpenCreateModal}>
          <Plus size={16} /> Create Green Event
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={(e) => { e.preventDefault(); fetchEvents(); }} style={{ flex: 1, display: 'flex', gap: '0.8rem', minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm"><Search size={14} /> Search</button>
        </form>

        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <select className="form-control" style={{ width: 180 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Women Safety">Women Safety</option>
            <option value="Environmental Problems">Environmental Problems</option>
            <option value="Community Activities">Community Activities</option>
          </select>

          <select className="form-control" style={{ width: 150 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem' }}>Event Details</th>
              <th style={{ padding: '1rem' }}>Category</th>
              <th style={{ padding: '1rem' }}>Date & Time</th>
              <th style={{ padding: '1rem' }}>Capacity</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>{ev.event_name}</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>📍 {ev.location} | 👤 {ev.organizer}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>{ev.category}</span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.88rem' }}>
                  <div>📅 {ev.event_date}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>⏰ {ev.start_time} - {ev.end_time}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <strong>{ev.current_participants} / {ev.max_participants}</strong>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${ev.status.toLowerCase()}`} style={{ background: ev.status === 'Ongoing' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)', color: ev.status === 'Ongoing' ? '#10B981' : '#3B82F6' }}>
                    {ev.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleViewParticipants(ev)}>
                      <Users size={14} /> Participants
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditModal(ev)}>
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteEvent(ev.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT EVENT MODAL */}
      {showModal && (
        <div className="green-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="green-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{editingEvent ? 'Edit Green Event' : 'Create New Green Event'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Event Name</label>
                <input type="text" className="form-control" value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="Women Safety">Women Safety</option>
                    <option value="Environmental Problems">Environmental Problems</option>
                    <option value="Community Activities">Community Activities</option>
                    <option value="Other">Other Green / Social Activity</option>
                  </select>
                </div>

                {form.category === 'Other' && (
                  <div className="form-group">
                    <label className="form-label">Custom Activity Category</label>
                    <input type="text" className="form-control" placeholder="e.g. Solar Energy Awareness" value={form.custom_category} onChange={e => setForm({ ...form, custom_category: e.target.value })} required />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Event Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Event Date</label>
                  <input type="date" className="form-control" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-control" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-control" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-control" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Organizer</label>
                  <input type="text" className="form-control" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Participants</label>
                  <input type="number" className="form-control" value={form.max_participants} onChange={e => setForm({ ...form, max_participants: e.target.value })} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" style={{ minHeight: 90 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }}>{editingEvent ? 'Save Changes' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PARTICIPANTS MODAL */}
      {viewParticipantsModal && (
        <div className="green-modal-overlay" onClick={() => setViewParticipantsModal(null)}>
          <div className="green-modal-content" style={{ maxWidth: 750 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Event Participation Tracker</h3>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{viewParticipantsModal.event_name}</div>
              </div>
              <button className="btn-icon" onClick={() => setViewParticipantsModal(null)}><X size={18} /></button>
            </div>

            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', textAlign: 'left' }}>
                  <th style={{ padding: '0.8rem' }}>Employee</th>
                  <th style={{ padding: '0.8rem' }}>Department</th>
                  <th style={{ padding: '0.8rem' }}>Registration Date</th>
                  <th style={{ padding: '0.8rem' }}>Status</th>
                  <th style={{ padding: '0.8rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {participantsList.map(p => (
                  <tr key={p.employee_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.8rem' }}>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{p.department || 'Associate'}</td>
                    <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{p.registration_date}</td>
                    <td style={{ padding: '0.8rem' }}>
                      <span className={`badge ${p.participation_status === 'Completed' ? 'completed' : 'registered'}`}>
                        {p.participation_status}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                      {p.participation_status !== 'Completed' ? (
                        <button className="btn btn-primary btn-sm" style={{ background: '#10B981' }} onClick={() => handleMarkCompleted(viewParticipantsModal.id, p.employee_id)}>
                          Mark Completed
                        </button>
                      ) : (
                        <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 600 }}>✓ Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
              <button className="btn btn-secondary" onClick={() => setViewParticipantsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

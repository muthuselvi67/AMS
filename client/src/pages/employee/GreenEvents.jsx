import React, { useEffect, useState } from 'react';
import {
  Leaf, ShieldAlert, Users, Calendar, MapPin, Clock, Award,
  CheckCircle2, Search, Filter, Plus, X, UserCheck, AlertTriangle,
  HeartHandshake, ChevronRight, Activity, Globe, CheckSquare, RefreshCw
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './GreenEvents.css';

const DEFAULT_EVENTS = [
  {
    id: 1,
    event_name: 'Workplace Women Safety & Self-Defense Workshop',
    category: 'Women Safety',
    description: 'Interactive session on workplace physical safety, self-defense tactics, 24/7 SOS features, and helpline awareness.',
    location: 'Auditorium Hall A & Live Stream',
    event_date: '2026-10-05',
    start_time: '10:00:00',
    end_time: '12:30:00',
    organizer: 'Women Safety Cell',
    max_participants: 80,
    current_participants: 15,
    status: 'Upcoming',
    is_registered: false
  },
  {
    id: 2,
    event_name: 'Annual Campus Tree Plantation & Afforestation Drive',
    category: 'Environmental Problems',
    description: 'Join us live to plant 500+ saplings across tech park grounds! Saplings, equipment, and organic snacks provided.',
    location: 'Green Tech Park East Grounds',
    event_date: '2026-10-12',
    start_time: '09:00:00',
    end_time: '13:00:00',
    organizer: 'Eco Sustainability Club',
    max_participants: 60,
    current_participants: 24,
    status: 'Ongoing',
    is_registered: true,
    my_participation_status: 'Registered'
  },
  {
    id: 3,
    event_name: 'E-Waste & Electronics Recycling Drive',
    category: 'Environmental Problems',
    description: 'Bring old laptops, batteries, chargers, and unused gadgets for certified eco-friendly safe recycling.',
    location: 'Building B Lobby Station',
    event_date: '2026-10-18',
    start_time: '10:00:00',
    end_time: '16:00:00',
    organizer: 'Facilities & IT Dept',
    max_participants: 50,
    current_participants: 18,
    status: 'Upcoming',
    is_registered: false
  },
  {
    id: 4,
    event_name: 'Community Mentorship & Digital Literacy Drive',
    category: 'Community Activities',
    description: 'Volunteering drive with local school students for digital literacy training and book donation.',
    location: 'City Community Youth Center',
    event_date: '2026-09-15',
    start_time: '14:00:00',
    end_time: '17:00:00',
    organizer: 'CSR & Employee Volunteering Desk',
    max_participants: 40,
    current_participants: 40,
    status: 'Completed',
    is_registered: true,
    my_participation_status: 'Completed'
  }
];

export default function GreenEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [stats, setStats] = useState({
    total_available_events: 0,
    upcoming_events: 0,
    my_registered_events: 0,
    completed_events: 0,
    my_participation_count: 0
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await api.get('/green-events', { params });
      if (data && data.status && Array.isArray(data.data)) {
        setEvents(data.data);
      } else {
        setEvents(DEFAULT_EVENTS);
      }
    } catch (err) {
      console.warn('API fallback to client state:', err);
      let filtered = [...DEFAULT_EVENTS];
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(e => e.category === selectedCategory);
      }
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'My Registered Events') {
          filtered = filtered.filter(e => e.is_registered);
        } else {
          filtered = filtered.filter(e => e.status === selectedStatus);
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(e => e.event_name.toLowerCase().includes(q) || e.location.toLowerCase().includes(q));
      }
      setEvents(filtered);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const { data } = await api.get('/green-events/dashboard/stats');
      if (data && data.status && data.data) {
        setStats(data.data);
      } else {
        calcLocalStats(DEFAULT_EVENTS);
      }
    } catch {
      calcLocalStats(events.length ? events : DEFAULT_EVENTS);
    }
  };

  const calcLocalStats = (evList) => {
    const avail = evList.filter(e => e.status === 'Upcoming' || e.status === 'Ongoing').length;
    const up = evList.filter(e => e.status === 'Upcoming').length;
    const myReg = evList.filter(e => e.is_registered && e.my_participation_status !== 'Completed').length;
    const comp = evList.filter(e => e.my_participation_status === 'Completed').length;
    const myTotal = evList.filter(e => e.is_registered).length;

    setStats({
      total_available_events: avail,
      upcoming_events: up,
      my_registered_events: myReg,
      completed_events: comp,
      my_participation_count: myTotal
    });
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchDashboardStats();
  }, [events]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleRegister = async (eventId) => {
    try {
      const { data } = await api.post(`/green-events/${eventId}/register`);
      if (data.status) {
        toast.success(data.message || 'Successfully registered for event!');
        fetchEvents();
        fetchDashboardStats();
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) {
      // Local state fallback update
      const updated = events.map(ev => {
        if (ev.id === eventId) {
          return { ...ev, is_registered: true, my_participation_status: 'Registered', current_participants: ev.current_participants + 1 };
        }
        return ev;
      });
      setEvents(updated);
      toast.success('Successfully registered for Green Event!');
    }
  };

  const handleCancelRegistration = async (eventId) => {
    try {
      const { data } = await api.post(`/green-events/${eventId}/cancel`);
      if (data.status) {
        toast.success('Registration cancelled successfully');
        fetchEvents();
        fetchDashboardStats();
      }
    } catch (err) {
      const updated = events.map(ev => {
        if (ev.id === eventId) {
          return { ...ev, is_registered: false, my_participation_status: null, current_participants: Math.max(0, ev.current_participants - 1) };
        }
        return ev;
      });
      setEvents(updated);
      toast.success('Registration cancelled');
    }
  };

  const categories = [
    { label: 'All Categories', value: 'All', icon: Globe },
    { label: 'Women Safety', value: 'Women Safety', icon: ShieldAlert },
    { label: 'Environmental Problems', value: 'Environmental Problems', icon: Leaf },
    { label: 'Community Activities', value: 'Community Activities', icon: Users },
    { label: 'Other Green Activities', value: 'Other Green/Social Activities', icon: HeartHandshake },
  ];

  return (
    <div className="green-events-container fade-in">

      {/* Top Hero Banner */}
      <div className="green-hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10B981', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
          <Leaf size={16} /> Employee Social & Sustainability Drive Module
        </div>
        <h1 className="green-hero-title">Green Events & Social Responsibility</h1>
        <p className="green-hero-subtitle">
          Participate in company-organized environmental drives, women safety workshops, and community volunteering activities. Earn green credits and track your social impact.
        </p>

        {/* EMPLOYEE DASHBOARD STATS WIDGETS */}
        <div className="green-stats-grid">
          <div className="green-stat-card">
            <div className="green-stat-icon emerald"><Globe size={24} /></div>
            <div>
              <div className="green-stat-val">{stats.total_available_events}</div>
              <div className="green-stat-lbl">Total Available Events</div>
            </div>
          </div>

          <div className="green-stat-card">
            <div className="green-stat-icon blue"><Calendar size={24} /></div>
            <div>
              <div className="green-stat-val">{stats.upcoming_events}</div>
              <div className="green-stat-lbl">Upcoming Events</div>
            </div>
          </div>

          <div className="green-stat-card">
            <div className="green-stat-icon purple"><UserCheck size={24} /></div>
            <div>
              <div className="green-stat-val">{stats.my_registered_events}</div>
              <div className="green-stat-lbl">My Registered Events</div>
            </div>
          </div>

          <div className="green-stat-card">
            <div className="green-stat-icon amber"><CheckSquare size={24} /></div>
            <div>
              <div className="green-stat-val">{stats.completed_events}</div>
              <div className="green-stat-lbl">Completed Events</div>
            </div>
          </div>

          <div className="green-stat-card">
            <div className="green-stat-icon rose"><Award size={24} /></div>
            <div>
              <div className="green-stat-val">{stats.my_participation_count}</div>
              <div className="green-stat-lbl">My Participation Count</div>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY & SEARCH FILTER BAR */}
      <div className="green-filter-bar">
        <div className="category-pills">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                className={`cat-pill ${selectedCategory === cat.value ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.value)}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS:</span>
            {['All', 'Upcoming', 'Ongoing', 'Completed', 'My Registered Events'].map(st => (
              <button
                key={st}
                className={`btn btn-sm ${selectedStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem' }}
                onClick={() => setSelectedStatus(st)}
              >
                {st === 'My Registered Events' ? '✓ My Registered' : st}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '360px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 32, fontSize: '0.88rem' }}
                placeholder="Search event name, location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm"><Search size={14} /> Search</button>
          </form>
        </div>
      </div>

      {/* EVENTS GRID */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {Array(4).fill(0).map((_, i) => <div key={i} className="card skeleton" style={{ height: 260 }} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textCenter: 'center' }}>
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: '#10B981' }}><Leaf size={48} /></div>
            <h3>No Green Events Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Try adjusting your category or status filters.</p>
          </div>
        </div>
      ) : (
        <div className="green-events-grid">
          {events.map(ev => {
            const isFull = ev.current_participants >= ev.max_participants;
            const pct = Math.min(100, Math.round((ev.current_participants / ev.max_participants) * 100));
            const catClass = ev.category === 'Women Safety' ? 'women-safety' : ev.category === 'Environmental Problems' ? 'environmental' : ev.category === 'Community Activities' ? 'community' : 'other';

            return (
              <div key={ev.id} className="green-event-card">
                <div>
                  <div className="event-card-header">
                    <span className={`category-badge ${catClass}`}>{ev.category}</span>
                    <span className={`status-badge ${ev.status.toLowerCase()}`}>{ev.status}</span>
                  </div>

                  <div className="event-card-title">{ev.event_name}</div>
                  <p className="event-card-desc">{ev.description}</p>

                  <div className="event-card-meta">
                    <div><Calendar size={14} style={{ display: 'inline', marginRight: 6 }} /> <strong>Date:</strong> {ev.event_date}</div>
                    <div><Clock size={14} style={{ display: 'inline', marginRight: 6 }} /> <strong>Time:</strong> {ev.start_time} - {ev.end_time}</div>
                    <div><MapPin size={14} style={{ display: 'inline', marginRight: 6 }} /> <strong>Location:</strong> {ev.location}</div>
                    <div><Users size={14} style={{ display: 'inline', marginRight: 6 }} /> <strong>Organizer:</strong> {ev.organizer}</div>
                  </div>

                  <div className="capacity-progress">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Participants: <strong>{ev.current_participants} / {ev.max_participants}</strong></span>
                      <span>{pct}% Full</span>
                    </div>
                    <div className="capacity-bar">
                      <div className="capacity-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {ev.is_registered && (
                    <div className={`reg-status-pill ${ev.my_participation_status === 'Completed' ? 'completed' : 'registered'}`}>
                      <CheckCircle2 size={14} />
                      <span>{ev.my_participation_status === 'Completed' ? '✓ Participation Completed' : '✓ You are Registered'}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                  {!ev.is_registered ? (
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, background: '#10B981', borderColor: '#10B981' }}
                      disabled={isFull || ev.status === 'Completed' || ev.status === 'Cancelled'}
                      onClick={() => handleRegister(ev.id)}
                    >
                      {isFull ? 'Capacity Full' : ev.status === 'Completed' ? 'Event Ended' : '+ Register / Join Event'}
                    </button>
                  ) : ev.my_participation_status !== 'Completed' ? (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                      onClick={() => handleCancelRegistration(ev.id)}
                    >
                      Cancel Registration
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ flex: 1 }} disabled>
                      ✓ Completed
                    </button>
                  )}

                  <button className="btn btn-secondary" onClick={() => setSelectedEvent(ev)}>
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="green-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="green-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <div>
                <span className="category-badge environmental">{selectedEvent.category}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>{selectedEvent.event_name}</h3>
              </div>
              <button className="btn-icon" onClick={() => setSelectedEvent(null)}><X size={20} /></button>
            </div>

            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>{selectedEvent.description}</p>

            <div className="event-card-meta" style={{ marginTop: '1.2rem', fontSize: '0.9rem' }}>
              <div><strong>📅 Date:</strong> {selectedEvent.event_date}</div>
              <div><strong>⏰ Time:</strong> {selectedEvent.start_time} - {selectedEvent.end_time}</div>
              <div><strong>📍 Location:</strong> {selectedEvent.location}</div>
              <div><strong>🏢 Organizer:</strong> {selectedEvent.organizer}</div>
              <div><strong>👥 Maximum Capacity:</strong> {selectedEvent.max_participants} Participants</div>
              <div><strong>📊 Status:</strong> <span className={`status-badge ${selectedEvent.status.toLowerCase()}`}>{selectedEvent.status}</span></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
              {!selectedEvent.is_registered ? (
                <button className="btn btn-primary" style={{ background: '#10B981' }} onClick={() => { handleRegister(selectedEvent.id); setSelectedEvent(null); }}>
                  + Register Now
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ color: '#EF4444' }} onClick={() => { handleCancelRegistration(selectedEvent.id); setSelectedEvent(null); }}>
                  Cancel Registration
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

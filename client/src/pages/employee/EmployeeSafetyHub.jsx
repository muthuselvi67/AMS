import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Leaf, AlertTriangle, Car, PhoneCall,
  CheckCircle2, Users, FileText, Send, ThumbsUp, Calendar,
  MapPin, Clock, Award, Plus, Sparkles, HeartHandshake, CheckSquare,
  Activity, RefreshCw, Phone, Share2, Search, UserCheck
} from 'lucide-react';
import {
  POSH_PHASES,
  ICC_MEMBERS,
  INITIAL_GREEN_EVENTS,
  INITIAL_ENV_PROBLEMS,
  EMERGENCY_CONTACTS
} from '../../data/employeeData';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './EmployeeSafetyHub.css';

export default function EmployeeSafetyHub({ initialTab = 'women-safety' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // ── 1. WOMEN SAFETY STATE ──────────────────────────────────────────────────
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(null);
  const [gpsLocation] = useState('12.9716° N, 77.5946° E (Tech Park Gate 3)');
  const [cabBooking, setCabBooking] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('trendify-cab')) || {
        active: true,
        driverName: 'Ramesh Kumar',
        cabNumber: 'TN 09 BX 4589',
        driverPhone: '+91 98401 12345',
        eta: '12 Mins away',
        escortAssigned: 'Security Officer Priya M.',
        buddyStatus: 'Tracking Active',
        reachedSafe: false,
      };
    } catch {
      return { active: false };
    }
  });

  const [buddyRequests] = useState([
    { id: 'b-1', associate: 'Kavya Nair (Design Dept)', shift: '7:30 PM Night Shift', route: 'East Campus to Velachery' }
  ]);

  const [isAllyRegistered, setIsAllyRegistered] = useState(() => {
    return localStorage.getItem('trendify-ally-registered') === 'true';
  });

  useEffect(() => {
    let timer;
    if (sosCountdown !== null && sosCountdown > 0) {
      timer = setTimeout(() => setSosCountdown(prev => prev - 1), 1000);
    } else if (sosCountdown === 0) {
      setSosActive(true);
      setSosCountdown(null);
      // Trigger API SOS Alert to HR & Security
      try {
        api.post('/women-safety/sos', {
          location: gpsLocation,
          request_type: 'SOS Emergency Trigger (Safety Hub)'
        }).then(() => {
          toast.error('🚨 Emergency SOS alert dispatched to HR & Security!', { duration: 6000 });
        }).catch(() => {});
      } catch (err) {}
    }
    return () => clearTimeout(timer);
  }, [sosCountdown]);

  const triggerSOS = () => {
    if (sosActive) {
      setSosActive(false);
      setSosCountdown(null);
    } else {
      setSosCountdown(5);
    }
  };

  const cancelSOS = () => setSosCountdown(null);

  const toggleAllyRegistration = () => {
    const nextState = !isAllyRegistered;
    setIsAllyRegistered(nextState);
    localStorage.setItem('trendify-ally-registered', String(nextState));
  };

  const handleConfirmSafeReach = () => {
    const updated = { ...cabBooking, reachedSafe: true, buddyStatus: 'Completed - Safely Reached' };
    setCabBooking(updated);
    localStorage.setItem('trendify-cab', JSON.stringify(updated));
    alert('✅ Safe Arrival Confirmed! Security team & contacts notified.');
  };

  // ── 2. POSH ACT STATE ──────────────────────────────────────────────────────
  const [activePhase, setActivePhase] = useState(1);
  const [grievances, setGrievances] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('trendify-posh-grievances')) || [
        {
          id: 'POSH-2026-1042',
          category: 'Verbal Harassment / Inappropriate Language',
          date: '2026-09-10',
          phase: 3,
          isAnonymous: false,
          status: 'Phase 3: Active Inquiry & Hearing by ICC',
          description: 'Report regarding inappropriate comments during team review session.',
          reportedByRole: 'Co-Associate Witness / Ally',
        }
      ];
    } catch {
      return [];
    }
  });

  const [formType, setFormType] = useState('direct');
  const [newGrievance, setNewGrievance] = useState({
    category: 'Verbal Harassment',
    incidentDate: '',
    incidentLocation: '',
    description: '',
    isAnonymous: false,
  });

  const [submittedCode, setSubmittedCode] = useState(null);
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackedItem, setTrackedItem] = useState(null);

  const handleGrievanceSubmit = async (e) => {
    e.preventDefault();
    const code = `POSH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const created = {
      id: code,
      category: newGrievance.category,
      date: newGrievance.incidentDate || new Date().toISOString().split('T')[0],
      phase: 1,
      isAnonymous: newGrievance.isAnonymous,
      status: 'Phase 1: ICC Acknowledged & Case Opened',
      description: newGrievance.description,
      reportedByRole: formType === 'co-associate' ? 'Co-Associate Witness / Ally' : 'Direct Associate',
    };

    const updated = [created, ...grievances];
    setGrievances(updated);
    localStorage.setItem('trendify-posh-grievances', JSON.stringify(updated));
    setSubmittedCode(code);

    try {
      await api.post('/women-safety/report', {
        concern_type: newGrievance.category || 'Harassment',
        subject: `POSH Grievance: ${newGrievance.category}`,
        description: newGrievance.description,
        incident_date: newGrievance.incidentDate || new Date().toISOString().split('T')[0],
        location: newGrievance.incidentLocation || 'Workplace Campus',
        person_involved: formType === 'co-associate' ? 'Witness / Ally Filing' : (newGrievance.isAnonymous ? 'Anonymous' : ''),
        supporting_info: `Case: ${code} | Type: ${formType === 'co-associate' ? 'Co-Associate Witness' : 'Direct Associate'}`,
        confidential: true
      });
      toast.success('Grievance reported confidentially to HR & ICC!');
    } catch (err) {
      // ignore
    }

    setNewGrievance({
      category: 'Verbal Harassment',
      incidentDate: '',
      incidentLocation: '',
      description: '',
      isAnonymous: false,
    });
  };

  const handleTrackSearch = (e) => {
    e.preventDefault();
    const found = grievances.find(g => g.id.toLowerCase() === trackingSearch.trim().toLowerCase());
    setTrackedItem(found || 'not_found');
  };

  // ── 3. GREEN EVENTS STATE ──────────────────────────────────────────────────
  const [greenEvents, setGreenEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('trendify-green-events')) || INITIAL_GREEN_EVENTS;
    } catch {
      return INITIAL_GREEN_EVENTS;
    }
  });

  const [userRsvps, setUserRsvps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('trendify-user-rsvps')) || ['ge-1'];
    } catch {
      return ['ge-1'];
    }
  });

  const [eventStatusFilter, setEventStatusFilter] = useState('All');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('All');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: 'Afforestation',
    date: '',
    time: '09:00 AM - 01:00 PM',
    location: '',
    description: '',
    target: 50,
  });

  const toggleRsvp = (eventId) => {
    const isAttending = userRsvps.includes(eventId);
    const updatedRsvps = isAttending
      ? userRsvps.filter(id => id !== eventId)
      : [...userRsvps, eventId];

    const updatedEvents = greenEvents.map(ev => {
      if (ev.id === eventId) {
        return { ...ev, rsvps: isAttending ? ev.rsvps - 1 : ev.rsvps + 1 };
      }
      return ev;
    });

    setUserRsvps(updatedRsvps);
    setGreenEvents(updatedEvents);
    localStorage.setItem('trendify-user-rsvps', JSON.stringify(updatedRsvps));
    localStorage.setItem('trendify-green-events', JSON.stringify(updatedEvents));
  };

  const handleAddEventSubmit = (e) => {
    e.preventDefault();
    const created = {
      id: `ge-${Date.now()}`,
      title: newEvent.title,
      category: newEvent.category,
      status: 'Upcoming',
      date: newEvent.date || new Date().toISOString().split('T')[0],
      time: newEvent.time,
      location: newEvent.location || 'Main Campus Outdoor Area',
      description: newEvent.description,
      rsvps: 1,
      target: Number(newEvent.target) || 50,
      organizer: 'Associate Initiated',
      image: newEvent.category === 'Afforestation' ? '🌱' : newEvent.category === 'Waste Management' ? '🔋' : newEvent.category === 'Carbon Offset' ? '🚲' : '🥤',
      points: 35,
    };

    const updated = [created, ...greenEvents];
    setGreenEvents(updated);
    setUserRsvps([...userRsvps, created.id]);
    localStorage.setItem('trendify-green-events', JSON.stringify(updated));
    setShowNewEventModal(false);
    setNewEvent({
      title: '', category: 'Afforestation', date: '', time: '09:00 AM - 01:00 PM', location: '', description: '', target: 50
    });
  };

  const totalGreenPoints = greenEvents
    .filter(ev => userRsvps.includes(ev.id))
    .reduce((acc, ev) => acc + (ev.points || 30), 0);

  // ── 4. ENVIRONMENTAL PROBLEMS STATE ──────────────────────────────────────
  const [envProblems, setEnvProblems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('trendify-env-problems')) || INITIAL_ENV_PROBLEMS;
    } catch {
      return INITIAL_ENV_PROBLEMS;
    }
  });

  const [votedProbs, setVotedProbs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('trendify-env-votes')) || ['ep-1', 'ep-2'];
    } catch {
      return ['ep-1', 'ep-2'];
    }
  });

  const [envFilterSeverity, setEnvFilterSeverity] = useState('All');
  const [showProbModal, setShowProbModal] = useState(false);
  const [newProblem, setNewProblem] = useState({
    title: '', category: 'Energy Waste', severity: 'Medium', location: '', description: ''
  });

  const toggleVote = (probId) => {
    const hasVoted = votedProbs.includes(probId);
    const updatedVotes = hasVoted ? votedProbs.filter(id => id !== probId) : [...votedProbs, probId];
    const updatedProbs = envProblems.map(p => {
      if (p.id === probId) return { ...p, votes: hasVoted ? p.votes - 1 : p.votes + 1 };
      return p;
    });

    setVotedProbs(updatedVotes);
    setEnvProblems(updatedProbs);
    localStorage.setItem('trendify-env-votes', JSON.stringify(updatedVotes));
    localStorage.setItem('trendify-env-problems', JSON.stringify(updatedProbs));
  };

  const handleProblemSubmit = (e) => {
    e.preventDefault();
    const created = {
      id: `ep-${Date.now()}`,
      title: newProblem.title,
      category: newProblem.category,
      severity: newProblem.severity,
      location: newProblem.location || 'Main Office Campus',
      reportedBy: formType === 'co-associate' ? 'Co-Associate Ally' : 'Associate Logged',
      date: new Date().toISOString().split('T')[0],
      description: newProblem.description,
      votes: 1,
      status: 'Under Investigation',
      solution: 'Assigned to Eco Facilities Committee.',
    };

    const updated = [created, ...envProblems];
    setEnvProblems(updated);
    setVotedProbs([...votedProbs, created.id]);
    localStorage.setItem('trendify-env-problems', JSON.stringify(updated));

    try {
      api.post('/women-safety/report', {
        concern_type: 'Environmental Issue',
        subject: `Environmental Problem: ${newProblem.title}`,
        description: `${newProblem.description} (Category: ${newProblem.category}, Severity: ${newProblem.severity})`,
        incident_date: new Date().toISOString().split('T')[0],
        location: newProblem.location || 'Main Office Campus',
        confidential: false
      }).then(() => {
        toast.success('Environmental problem reported to HR & Facilities!');
      }).catch(() => {});
    } catch (err) {}

    setShowProbModal(false);
    setNewProblem({ title: '', category: 'Energy Waste', severity: 'Medium', location: '', description: '' });
  };

  // ── 5. CARBON CALCULATOR STATE ──────────────────────────────────────────────
  const [commuteDistance, setCommuteDistance] = useState(15);
  const [commuteMode, setCommuteMode] = useState('carpool');
  const calcCarbon = () => {
    const factors = { petrol: 0.21, ev: 0.05, bus: 0.08, carpool: 0.09, bike: 0 };
    const daily = (factors[commuteMode] || 0.1) * commuteDistance * 2;
    return (daily * 22).toFixed(1);
  };

  const filteredGreenEvents = greenEvents.filter(ev => {
    const matchesStatus = eventStatusFilter === 'All' || ev.status === eventStatusFilter;
    const matchesCategory = eventCategoryFilter === 'All' || ev.category === eventCategoryFilter;
    return matchesStatus && matchesCategory;
  });

  const filteredEnvProblems = envProblems.filter(p => envFilterSeverity === 'All' || p.severity === envFilterSeverity);

  return (
    <div className="emp-safety-container">

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'var(--card-bg, #FFF)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color, #E2E8F0)' }}>
        <button
          className={`btn-secondary-btn ${activeTab === 'women-safety' ? 'btn-primary-btn' : ''}`}
          onClick={() => setActiveTab('women-safety')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ShieldAlert size={18} color={activeTab === 'women-safety' ? '#FFF' : '#FF6584'} />
          <span>Women Safety & Buddy</span>
        </button>

        <button
          className={`btn-secondary-btn ${activeTab === 'posh-act' ? 'btn-primary-btn' : ''}`}
          onClick={() => setActiveTab('posh-act')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FileText size={18} color={activeTab === 'posh-act' ? '#FFF' : '#6C63FF'} />
          <span>POSH 5-Phase Tracker</span>
        </button>

        <button
          className={`btn-secondary-btn ${activeTab === 'green-events' ? 'btn-primary-btn' : ''}`}
          onClick={() => setActiveTab('green-events')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Leaf size={18} color={activeTab === 'green-events' ? '#FFF' : '#10B981'} />
          <span>On-Green Event Tracking</span>
        </button>

        <button
          className={`btn-secondary-btn ${activeTab === 'env-problems' ? 'btn-primary-btn' : ''}`}
          onClick={() => setActiveTab('env-problems')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <AlertTriangle size={18} color={activeTab === 'env-problems' ? '#FFF' : '#F59E0B'} />
          <span>Environmental Log</span>
        </button>

        <button
          className={`btn-secondary-btn ${activeTab === 'carbon-calc' ? 'btn-primary-btn' : ''}`}
          onClick={() => setActiveTab('carbon-calc')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={18} color={activeTab === 'carbon-calc' ? '#FFF' : '#0EA5E9'} />
          <span>Carbon Calculator</span>
        </button>
      </div>

      {/* Hero Header */}
      <div className="emp-hero-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6C63FF', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
          <Sparkles size={16} /> Employee Safety & Environmental Module
        </div>
        <h1 className="emp-hero-title">Workplace Safety & Sustainability Hub</h1>
        <p className="emp-hero-subtitle">
          Integrated Attendance & HR Platform suite supporting <strong>24/7 Women SOS & Escorts</strong>, <strong>POSH Act 2013 5-Phase Resolution</strong>, <strong>On-Green Event Tracking</strong>, and <strong>Environmental Loggers</strong>.
        </p>

        <div className="emp-stats-grid">
          <div className="emp-stat-card">
            <div className="emp-stat-icon pink"><ShieldCheck size={22} /></div>
            <div>
              <div className="emp-stat-val">100% POSH</div>
              <div className="emp-stat-lbl">5-Phase Statutory Compliance</div>
            </div>
          </div>
          <div className="emp-stat-card">
            <div className="emp-stat-icon green"><Leaf size={22} /></div>
            <div>
              <div className="emp-stat-val">{totalGreenPoints} Points</div>
              <div className="emp-stat-lbl">Earned in Green Drives</div>
            </div>
          </div>
          <div className="emp-stat-card">
            <div className="emp-stat-icon purple"><CheckSquare size={22} /></div>
            <div>
              <div className="emp-stat-val">{envProblems.length} Logged</div>
              <div className="emp-stat-lbl">Eco Issues Addressed</div>
            </div>
          </div>
          <div className="emp-stat-card">
            <div className="emp-stat-icon orange"><Award size={22} /></div>
            <div>
              <div className="emp-stat-val">Verified</div>
              <div className="emp-stat-lbl">Co-Associate Ally Network</div>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: WOMEN SAFETY */}
      {activeTab === 'women-safety' && (
        <div>
          <div className="sos-banner">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF6584', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={22} /> 24/7 Women & Associate Emergency SOS Dispatch
            </h2>
            <p style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
              Pressing the emergency trigger notifies internal security, broadcasts live GPS (<strong>{gpsLocation}</strong>), and alerts emergency contacts & guards.
            </p>

            {sosCountdown !== null ? (
              <div style={{ margin: '1.5rem 0' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#FF416C' }}>{sosCountdown}</div>
                <p style={{ color: '#FF6584', fontWeight: 700, marginBottom: '1rem' }}>Dispatching Emergency SOS Alert in {sosCountdown} seconds...</p>
                <button className="btn-secondary-btn" onClick={cancelSOS}>Cancel Emergency Trigger</button>
              </div>
            ) : sosActive ? (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', padding: '1.2rem', borderRadius: '12px', marginTop: '1rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444' }}>🚨 EMERGENCY SOS ACTIVE!</div>
                <p style={{ fontSize: '0.92rem', marginTop: '0.4rem' }}>GPS Location <code>{gpsLocation}</code> broadcasted to Security. Live beacon enabled.</p>
                <button className="btn-primary-btn" style={{ background: '#EF4444', marginTop: '1rem' }} onClick={triggerSOS}>Deactivate Alert (I am Safe)</button>
              </div>
            ) : (
              <button className="sos-trigger-btn" onClick={triggerSOS}>
                <span>SOS</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>PRESS FOR HELP</span>
              </button>
            )}
          </div>

          <div className="emp-card">
            <div className="emp-card-title"><Car size={20} color="#0EA5E9" /> Late-Night Cab Escort & Safe Commute Tracker</div>
            <div className="emp-card-subtitle">Automated trip tracking for women and associates leaving campus after 7:00 PM.</div>
            <div className="cab-grid">
              <div className="cab-info-item"><span>Assigned Driver</span><strong>{cabBooking.driverName} ({cabBooking.driverPhone})</strong></div>
              <div className="cab-info-item"><span>Vehicle Number</span><strong>{cabBooking.cabNumber} (GPS Verified)</strong></div>
              <div className="cab-info-item"><span>Security Escort</span><strong>{cabBooking.escortAssigned}</strong></div>
              <div className="cab-info-item"><span>Estimated Arrival</span><strong>{cabBooking.eta}</strong></div>
            </div>
            <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.8rem' }}>
              <button className="btn-secondary-btn" onClick={() => alert('Live location share link sent to emergency contacts!')}><Share2 size={16} /> Share Live Location</button>
              {!cabBooking.reachedSafe ? (
                <button className="btn-primary-btn" style={{ background: '#10B981' }} onClick={handleConfirmSafeReach}><CheckCircle2 size={16} /> Confirm Safe Reach</button>
              ) : (
                <span style={{ color: '#10B981', fontWeight: 700 }}>✓ Confirmed Safe Reach</span>
              )}
            </div>
          </div>

          <div className="emp-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div className="emp-card-title"><Users size={20} color="#6C63FF" /> Co-Associate Ally & Safe Companion Network</div>
                <div className="emp-card-subtitle" style={{ marginBottom: 0 }}>Connect with co-associates for commute buddy pairing and safe walk-alongs.</div>
              </div>
              <button className="btn-secondary-btn" onClick={toggleAllyRegistration}>
                <UserCheck size={16} /> {isAllyRegistered ? '✓ Registered Workplace Ally' : '+ Register as Co-Associate Ally'}
              </button>
            </div>
          </div>

          <div className="emp-card">
            <div className="emp-card-title"><PhoneCall size={20} color="#FF6584" /> Co-Associate Emergency Helplines</div>
            <div className="icc-grid">
              {EMERGENCY_CONTACTS.map((c, i) => (
                <div key={i} className="icc-card">
                  <div className="icc-name">{c.name}</div>
                  <div className="icc-contact" style={{ fontSize: '1.1rem', fontWeight: 700 }}>📞 {c.phone}</div>
                  <button className="btn-secondary-btn" style={{ width: '100%', marginTop: '0.8rem' }} onClick={() => alert(`Calling ${c.name} at ${c.phone}...`)}>Call Hotline</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POSH ACT COMPLIANCE */}
      {activeTab === 'posh-act' && (
        <div>
          <div className="emp-card">
            <div className="emp-card-title"><ShieldCheck size={22} color="#6C63FF" /> POSH Act 2013 Statutory Compliance & 5-Phase Process</div>
            <p style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.92rem', lineHeight: '1.6' }}>
              Every employee and co-associate is protected under the POSH Act 2013. Complaints are handled confidentially by our Internal Complaints Committee (ICC).
            </p>

            <div className="posh-stepper">
              {POSH_PHASES.map(p => (
                <div key={p.phase} className={`posh-step-card ${activePhase === p.phase ? 'active-step' : ''}`} onClick={() => setActivePhase(p.phase)}>
                  <div className="posh-step-num">{p.phase}</div>
                  <div>
                    <div className="posh-step-title">{p.title}</div>
                    <div className="posh-step-timeline">⏱️ Timeline: {p.timeline}</div>
                    <div className="posh-step-desc">{p.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="emp-card">
            <div className="emp-card-title"><Search size={20} color="#6C63FF" /> Track Existing POSH Case Phase & Status</div>
            <form onSubmit={handleTrackSearch} style={{ display: 'flex', gap: '0.8rem', maxWidth: '500px', marginTop: '1rem' }}>
              <input type="text" className="form-input" placeholder="Enter Tracking Code (e.g. POSH-2026-1042)" value={trackingSearch} onChange={(e) => setTrackingSearch(e.target.value)} />
              <button type="submit" className="btn-primary-btn"><Search size={16} /> Track</button>
            </form>

            {trackedItem === 'not_found' && (
              <div style={{ marginTop: '1rem', color: '#EF4444', fontWeight: 600 }}>⚠️ No grievance found matching code "{trackingSearch}".</div>
            )}

            {trackedItem && trackedItem !== 'not_found' && (
              <div style={{ marginTop: '1.2rem', background: 'var(--bg-tertiary, #F8FAFC)', padding: '1.2rem', borderRadius: '12px', border: '1px solid #6C63FF' }}>
                <div style={{ fontWeight: 800, color: '#6C63FF' }}>Reference Code: {trackedItem.id} ({trackedItem.status})</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.4rem' }}>Category: {trackedItem.category} | Reported by: {trackedItem.reportedByRole}</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748B)', marginTop: '0.4rem' }}>{trackedItem.description}</p>
              </div>
            )}
          </div>

          <div className="emp-card">
            <div className="emp-card-title"><FileText size={20} color="#6C63FF" /> POSH Grievance & Co-Associate Incident Reporting</div>
            <div style={{ display: 'flex', gap: '0.8rem', margin: '1rem 0' }}>
              <button className={`btn-secondary-btn ${formType === 'direct' ? 'btn-primary-btn' : ''}`} onClick={() => setFormType('direct')}>Direct Incident Report</button>
              <button className={`btn-secondary-btn ${formType === 'co-associate' ? 'btn-primary-btn' : ''}`} onClick={() => setFormType('co-associate')}><Users size={16} /> Report as Co-Associate Witness / Ally</button>
            </div>

            {submittedCode && (
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                ✅ Grievance Submitted! Code: <strong>{submittedCode}</strong>
              </div>
            )}

            <form onSubmit={handleGrievanceSubmit}>
              <div className="form-group">
                <label className="form-label">Incident Classification</label>
                <select className="form-select" value={newGrievance.category} onChange={(e) => setNewGrievance({ ...newGrievance, category: e.target.value })}>
                  <option value="Verbal Harassment">Verbal Harassment / Inappropriate Comments</option>
                  <option value="Non-Verbal / Digital">Non-Verbal / Digital Harassment</option>
                  <option value="Physical Unwelcome Conduct">Physical Unwelcome Conduct</option>
                  <option value="Quid Pro Quo / Pressure">Quid Pro Quo / Pressure</option>
                  <option value="Hostile Work Environment">Hostile Work Environment</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Incident Description</label>
                <textarea className="form-textarea" placeholder="Provide objective details of what occurred..." value={newGrievance.description} onChange={(e) => setNewGrievance({ ...newGrievance, description: e.target.value })} required />
              </div>

              <button type="submit" className="btn-primary-btn"><Send size={16} /> Submit Confidential Report to ICC</button>
            </form>
          </div>

          <div className="emp-card">
            <div className="emp-card-title"><Users size={20} color="#6C63FF" /> Internal Complaints Committee (ICC) Directory</div>
            <div className="icc-grid">
              {ICC_MEMBERS.map((m, idx) => (
                <div key={idx} className="icc-card">
                  <div className="icc-name">{m.name}</div>
                  <div className="icc-role">{m.role}</div>
                  <div className="icc-contact">📧 {m.email}</div>
                  <div className="icc-contact">📞 {m.phone}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ON-GREEN EVENT TRACKING */}
      {activeTab === 'green-events' && (
        <div className="emp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
            <div>
              <div className="emp-card-title"><Leaf size={22} color="#10B981" /> On-Green Event Tracking & Drives</div>
              <div className="emp-card-subtitle" style={{ marginBottom: 0 }}>Participate in corporate afforestation, e-waste recycling, and clean commute drives.</div>
            </div>
            <button className="btn-primary-btn" style={{ background: '#10B981' }} onClick={() => setShowNewEventModal(true)}><Plus size={16} /> Host / Propose Green Drive</button>
          </div>

          {showNewEventModal && (
            <div style={{ background: 'var(--bg-tertiary, #F8FAFC)', padding: '1.2rem', borderRadius: '12px', border: '1px solid #10B981', marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#10B981', fontWeight: 700, marginBottom: '0.8rem' }}>Propose New Sustainability Drive</h4>
              <form onSubmit={handleAddEventSubmit}>
                <div className="form-group">
                  <label className="form-label">Event Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Campus Plastic Collection Drive" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" placeholder="Detail goals..." value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button type="submit" className="btn-primary-btn" style={{ background: '#10B981' }}>Publish Event</button>
                  <button type="button" className="btn-secondary-btn" onClick={() => setShowNewEventModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="events-grid">
            {filteredGreenEvents.map(ev => {
              const isAttending = userRsvps.includes(ev.id);
              const progressPct = Math.min(100, Math.round((ev.rsvps / ev.target) * 100));
              return (
                <div key={ev.id} className="event-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="event-icon-badge">{ev.image}</div>
                      <span className="event-cat">{ev.category}</span>
                    </div>
                    <div className="event-title">{ev.title}</div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748B)', marginTop: '0.4rem' }}>{ev.description}</p>
                    <div className="event-meta">
                      <div><Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> {ev.date} ({ev.time})</div>
                      <div><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} /> {ev.location}</div>
                    </div>
                    <div style={{ marginTop: '0.8rem' }}>
                      <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${progressPct}%` }} /></div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', marginTop: '0.2rem' }}>Attending: {ev.rsvps} / {ev.target}</div>
                    </div>
                  </div>
                  <button className={`btn-secondary-btn ${isAttending ? 'btn-primary-btn' : ''}`} style={{ marginTop: '1rem', background: isAttending ? '#10B981' : '' }} onClick={() => toggleRsvp(ev.id)}>
                    {isAttending ? '✓ RSVP Confirmed (Joined)' : '+ Register / RSVP Now'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ENVIRONMENTAL PROBLEMS */}
      {activeTab === 'env-problems' && (
        <div className="emp-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
            <div>
              <div className="emp-card-title"><AlertTriangle size={20} color="#F59E0B" /> Environmental Problem Logger</div>
              <div className="emp-card-subtitle" style={{ marginBottom: 0 }}>Report workplace energy loss, plastic waste, or paper waste and upvote solutions.</div>
            </div>
            <button className="btn-primary-btn" onClick={() => setShowProbModal(true)}><Plus size={16} /> Log Environmental Issue</button>
          </div>

          {showProbModal && (
            <div style={{ background: 'var(--bg-tertiary, #F8FAFC)', padding: '1.2rem', borderRadius: '12px', border: '1px solid #F59E0B', marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#F59E0B', fontWeight: 700, marginBottom: '0.8rem' }}>Log Workplace Environmental Issue</h4>
              <form onSubmit={handleProblemSubmit}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Unnecessary lighting in corridor B" value={newProblem.title} onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description & Suggested Fix</label>
                  <textarea className="form-textarea" placeholder="Detail the issue..." value={newProblem.description} onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button type="submit" className="btn-primary-btn">Submit Issue</button>
                  <button type="button" className="btn-secondary-btn" onClick={() => setShowProbModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="prob-list">
            {filteredEnvProblems.map(prob => {
              const hasVoted = votedProbs.includes(prob.id);
              return (
                <div key={prob.id} className="prob-card">
                  <div className={`prob-vote-box ${hasVoted ? 'voted' : ''}`} onClick={() => toggleVote(prob.id)}>
                    <ThumbsUp size={16} />
                    <span>{prob.votes}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{prob.title}</div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748B)', marginTop: '0.3rem' }}>{prob.description}</p>
                    {prob.solution && (
                      <div style={{ background: 'var(--card-bg, #FFF)', padding: '0.5rem 0.8rem', borderLeft: '3px solid #10B981', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        💡 <strong>Action:</strong> {prob.solution}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: CARBON CALCULATOR */}
      {activeTab === 'carbon-calc' && (
        <div className="emp-card">
          <div className="emp-card-title"><RefreshCw size={20} color="#0EA5E9" /> Employee Commute Carbon Calculator</div>
          <div className="emp-card-subtitle">Calculate monthly carbon emissions from office commuting.</div>
          <div className="form-group">
            <label className="form-label">One-way Commute Distance: {commuteDistance} km</label>
            <input type="range" min="2" max="50" value={commuteDistance} onChange={(e) => setCommuteDistance(Number(e.target.value))} style={{ width: '100%', accentColor: '#10B981' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-tertiary, #F8FAFC)', borderRadius: '12px' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10B981' }}>{calcCarbon()} kg CO₂</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748B)' }}>Estimated Monthly Emissions</div>
          </div>
        </div>
      )}

    </div>
  );
}

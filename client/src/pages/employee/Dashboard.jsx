import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, Hourglass, MapPin, UserCheck, LogIn, TrendingUp, CheckCircle, Gift, Newspaper } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardCalendar from '../../components/ui/DashboardCalendar';
import SelfieCapture from '../../components/ui/SelfieCapture';

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [todayRecord, setTodayRecord] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showSelfieModal, setShowSelfieModal] = useState(false);
    const [pendingCheckInCoords, setPendingCheckInCoords] = useState(null);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                // Fetch user's attendance records
                const attsRes = await api.get('/attendance');
                const att = attsRes.data.data || attsRes.data || [];

                const localToday = new Date();
                const y = localToday.getFullYear();
                const m = String(localToday.getMonth() + 1).padStart(2, '0');
                const d = String(localToday.getDate()).padStart(2, '0');
                const todayStr = `${y}-${m}-${d}`;

                // Find today's record for this employee
                const record = att.find(a => a.date === todayStr);
                setTodayRecord(record || null);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            }
        };
        const fetchAnnouncements = async () => {
            try {
                const { data } = await api.get('/announcements');
                setAnnouncements(Array.isArray(data.data?.announcements) ? data.data.announcements : []);
            } catch (err) {
                console.error('Dashboard fetch announcements error:', err);
            }
        };
        fetchAttendance();
        fetchAnnouncements();
    }, []);

    // Live clock ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleQuickAttendance = async () => {
        if (todayRecord?.checkIn?.time && !todayRecord?.checkOut?.time) {
            setShowCheckInModal(true);
        } else if (!todayRecord?.checkIn?.time) {
            if (currentTime.getHours() >= 10) {
                navigate('/employee/regularization');
            } else {
                setShowCheckInModal(true);
            }
        }
    };

    const confirmCheckIn = (officeName) => {
        let coords;
        if (officeName === 'Work From Home') {
            coords = { work_from_home: 1, latitude: 0, longitude: 0, address: 'Work From Home' };
        } else {
            coords = officeName === 'Hicas' 
                ? { latitude: 11.0126179, longitude: 76.9905965, address: 'Hicas' }
                : { latitude: 10.9984474, longitude: 76.9914006, address: 'LearnLike' };
        }
            
        setPendingCheckInCoords(coords);
        setShowCheckInModal(false);
        setShowSelfieModal(true);
    };

    const handleSelfieConfirm = async (selfieBase64) => {
        if (!pendingCheckInCoords) return;
        const payload = { ...pendingCheckInCoords, photo: selfieBase64 };
        try {
            const endpoint = todayRecord?.checkIn?.time ? '/attendance/checkout' : '/attendance/checkin';
            await api.post(endpoint, payload);
            const attsRes = await api.get('/attendance');
            const att = attsRes.data.data || attsRes.data || [];
            const localToday = new Date();
            const y = localToday.getFullYear();
            const m = String(localToday.getMonth() + 1).padStart(2, '0');
            const d = String(localToday.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${d}`;
            setTodayRecord(att.find(a => a.date === todayStr) || null);
            setShowSelfieModal(false);
            setPendingCheckInCoords(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit attendance');
        }
    };

    const confirmCheckOut = async () => {
        try {
            await api.post('/attendance/checkout', { latitude: 10.9984474, longitude: 76.9914006, address: 'LearnLike' });
            // refresh
            const attsRes = await api.get('/attendance');
            const att = attsRes.data.data || attsRes.data || [];
            const localToday = new Date();
            const y = localToday.getFullYear();
            const m = String(localToday.getMonth() + 1).padStart(2, '0');
            const d = String(localToday.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${d}`;
            setTodayRecord(att.find(a => a.date === todayStr) || null);
            setShowCheckoutModal(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to check out');
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatClock = (dateObj) => {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Calculate elapsed hours if checked in but not checked out, else use recorded totalHours
    let hoursWorked = 0;
    let minsWorked = 0;
    let workPercent = 0;

    if (todayRecord) {
        if (todayRecord.totalHours) {
            hoursWorked = Math.floor(todayRecord.totalHours);
            minsWorked = Math.round((todayRecord.totalHours - hoursWorked) * 60);
        } else if (todayRecord.checkIn?.time) {
            const checkInDate = new Date(todayRecord.checkIn.time);
            const diffMs = currentTime - checkInDate;
            const diffHrs = diffMs / (1000 * 60 * 60);
            if (diffHrs > 0) {
                hoursWorked = Math.floor(diffHrs);
                minsWorked = Math.round((diffHrs - hoursWorked) * 60);
            }
        }
    }

    let totalFractionalHours = hoursWorked + (minsWorked / 60);
    workPercent = Math.min(Math.round((totalFractionalHours / 9) * 100), 100);

    let remHrs = Math.max(0, 8 - hoursWorked); // Displaying remaining from 9 hours total (usually 8 or 9)
    let remMins = 0;
    if (totalFractionalHours < 9) {
        let totalRem = 9 - totalFractionalHours;
        remHrs = Math.floor(totalRem);
        remMins = Math.round((totalRem - remHrs) * 60);
    }

    const checkInText = todayRecord?.checkIn?.time ? formatTime(todayRecord.checkIn.time) : '--:--';
    const statusText = todayRecord ? todayRecord.status.replace('-', ' ').toUpperCase() : 'ABSENT';
    const locationText = todayRecord?.is_wfh ? 'REMOTE' : 'OFFICE';
    const isLate = todayRecord?.status === 'late';

    // Formatting today's date for header
    const todayFormatted = currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="emp-dashboard-container fade-in">
            {/* Header section */}
            <div className="emp-dash-header">
                <div>
                    <h1 className="emp-dash-title">Welcome, {user?.name?.split(' ')[0]}! <span role="img" aria-label="wave">👋</span></h1>
                    <p className="emp-dash-subtitle">Here's your attendance summary for today.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {(!todayRecord?.checkIn?.time || !todayRecord?.checkOut?.time) && (
                        <button
                            onClick={handleQuickAttendance}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                                fontSize: '13px', fontWeight: 600, border: 'none', borderRadius: '8px',
                                background: todayRecord?.checkIn?.time ? '#EF4444' : '#10B981', // red or green
                                color: '#fff', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap'
                            }}
                            onMouseOver={e => { e.currentTarget.style.opacity = 0.9; }}
                            onMouseOut={e => { e.currentTarget.style.opacity = 1; }}
                        >
                            {todayRecord?.checkIn?.time ? 'Check Out' : 'Check In'}
                        </button>
                    )}
                    <button
                        onClick={() => navigate(user?.role?.toLowerCase() === 'employee' ? '/employee/attendance' : `/${user?.role?.toLowerCase() || 'employee'}/my-attendance`)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--primary)', borderRadius: '8px', background: 'var(--bg-white)', color: 'var(--primary)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-light)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-white)'; }}
                    >
                        <Clock size={16} />
                        {user?.role?.toLowerCase() === 'employee' ? 'Add Attendance' : 'View Attendance'}
                    </button>
                    <div className="emp-dash-date-badge">
                        <Calendar size={15} />
                        <span>{todayFormatted}</span>
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="emp-metrics-grid">

                {/* 1. Check-In */}
                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-blue">
                        <LogIn size={20} color="#3B82F6" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Check-In Time</span>
                        <div className="emp-metric-value">{checkInText}</div>
                        <span className="emp-metric-subtext color-blue">Today</span>
                    </div>
                </div>

                {/* 2. Current Time */}
                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-green">
                        <Clock size={20} color="#10B981" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Current Time</span>
                        <div className="emp-metric-value">{formatClock(currentTime)}</div>
                        <span className="emp-metric-subtext color-green">{currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* 3. Hours Worked */}
                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-purple">
                        <Hourglass size={20} color="#8B5CF6" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Hours Worked</span>
                        <div className="emp-metric-value">{String(hoursWorked).padStart(2, '0')}:{String(minsWorked).padStart(2, '0')}</div>
                        <span className="emp-metric-subtext color-purple">{hoursWorked} Hour {minsWorked} Minutes</span>
                    </div>
                </div>

                {/* 4. Hours Remaining */}
                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-orange">
                        <Hourglass size={20} color="#F59E0B" style={{ transform: 'rotate(180deg)' }} />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Hours Remaining</span>
                        <div className="emp-metric-value">{String(remHrs).padStart(2, '0')}:{String(remMins).padStart(2, '0')}</div>
                        <span className="emp-metric-subtext color-orange">{remHrs} Hours {remMins} Minutes</span>
                    </div>
                </div>

                {/* 5. Status */}
                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-emerald">
                        <UserCheck size={20} color="#059669" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Status</span>
                        <div className="emp-metric-value" style={{ fontSize: '18px' }}>{statusText}</div>
                        <span className="emp-metric-subtext color-emerald">{isLate ? 'Late Arrival' : (todayRecord ? 'On Time' : 'Not Checked In')}</span>
                    </div>
                </div>

                {/* 6. Work Location */}
                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-pink">
                        <MapPin size={20} color="#EC4899" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Work Location</span>
                        <div className="emp-metric-value" style={{ fontSize: '18px' }}>{locationText}</div>
                        <span className="emp-metric-subtext color-pink">{todayRecord?.is_wfh ? 'Remote Work' : 'Onsite'}</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="emp-progress-container">
                <span className="emp-progress-title">Work Progress</span>
                <div className="emp-progress-track">
                    <div className="emp-progress-fill" style={{ width: `${workPercent}%` }}>
                        <div className="emp-progress-tooltip">{workPercent}%</div>
                    </div>
                </div>
                <span className="emp-progress-text">{Math.floor(totalFractionalHours)} of 9 Hours Completed</span>
            </div>

            {/* Bottom 2-Column Layout */}
            <div className="emp-bottom-grid">

                {/* Left Column: Announcements and Birthdays */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', justifyContent: 'space-between' }}>
                    <div className="emp-overview-panel" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                        <div className="emp-panel-header">
                            <h3>Announcements 📢</h3>
                        </div>

                        <div className="emp-overview-list" style={{ flex: 1, overflowY: 'auto' }}>
                            {announcements.filter(a => ['announcement', 'event'].includes(a.type)).slice(0, 5).length > 0 ? (
                                announcements.filter(a => ['announcement', 'event'].includes(a.type)).slice(0, 5).map(item => (
                                    <div key={item.id} className="emp-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                            <Newspaper size={16} color="#3B82F6" />
                                            <div className="emp-list-label" style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1, textTransform: 'capitalize' }}>{item.title}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '24px' }}>
                                            {item.content}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No announcements right now.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="emp-overview-panel" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                        <div className="emp-panel-header">
                            <h3>🎈 This Month's Birthday Stars</h3>
                        </div>

                        <div className="emp-overview-list" style={{ flex: 1, overflowY: 'auto' }}>
                            {announcements.filter(a => a.type === 'birthday').slice(0, 5).length > 0 ? (
                                announcements.filter(a => a.type === 'birthday').slice(0, 5).map(item => (
                                    <div key={item.id} className="emp-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                            <Gift size={16} color="#EC4899" />
                                            <div className="emp-list-label" style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1, textTransform: 'capitalize' }}>{item.title}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '24px' }}>
                                            {item.content}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No birthdays this month.
                                </div>
                            )}
                        </div>

                        <div className="emp-success-banner" style={{ background: '#FDF2F8', color: '#BE185D', border: '1px solid #FCE7F3', marginTop: '16px' }}>
                            <Gift size={16} color="#EC4899" />
                            <span>Stay updated with team celebrations!</span>
                        </div>
                    </div>
                </div>

                {/* Right: Calendar Component */}
                <div className="emp-calendar-panel">
                    <DashboardCalendar />
                </div>
            </div>

            {/* Check Out Modal */}
            {showCheckoutModal && createPortal(
                <div
                    onClick={() => setShowCheckoutModal(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        backdropFilter: 'blur(3px)', animation: 'fadeIn 0.15s ease'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            width: 'calc(100% - 32px)', maxWidth: 400, display: 'flex', flexDirection: 'column',
                            overflow: 'hidden', animation: 'slideUp 0.2s ease', padding: 24, textAlign: 'center'
                        }}
                    >
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#EF4444' }}>
                            <LogIn size={24} style={{ transform: 'rotate(180deg)' }} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1A1A2E', fontWeight: 700 }}>Confirm Check Out</h3>
                        <p style={{ color: '#6B7280', marginBottom: 24, fontSize: '14px', lineHeight: 1.5 }}>
                            Are you sure you want to check out? This will record your end time for today.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                            <button
                                onClick={confirmCheckOut}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                                    background: '#EF4444', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#DC2626'}
                                onMouseOut={e => e.currentTarget.style.background = '#EF4444'}
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => setShowCheckoutModal(false)}
                                style={{
                                    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                                    background: '#10B981', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#059669'}
                                onMouseOut={e => e.currentTarget.style.background = '#10B981'}
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Check In Office Selection Modal */}
            {showCheckInModal && createPortal(
                <div
                    onClick={() => setShowCheckInModal(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        backdropFilter: 'blur(3px)', animation: 'fadeIn 0.15s ease'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            width: 'calc(100% - 32px)', maxWidth: 400, display: 'flex', flexDirection: 'column',
                            overflow: 'hidden', animation: 'slideUp 0.2s ease', padding: 24, textAlign: 'center'
                        }}
                    >
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#10B981' }}>
                            <MapPin size={24} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1A1A2E', fontWeight: 700 }}>Select {todayRecord?.checkIn?.time ? 'Check Out' : 'Check In'} Location</h3>
                        <p style={{ color: '#6B7280', marginBottom: 24, fontSize: '14px', lineHeight: 1.5 }}>
                            Where are you checking {todayRecord?.checkIn?.time ? 'out' : 'in'} from today?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button
                                onClick={() => confirmCheckIn('LearnLike')}
                                style={{
                                    width: '100%', padding: '12px 0', borderRadius: 8, border: '1px solid #10B981',
                                    background: '#F0FDF4', color: '#10B981', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#D1FAE5'}
                                onMouseOut={e => e.currentTarget.style.background = '#F0FDF4'}
                            >
                                LearnLike Office
                            </button>
                            <button
                                onClick={() => confirmCheckIn('Hicas')}
                                style={{
                                    width: '100%', padding: '12px 0', borderRadius: 8, border: '1px solid #3B82F6',
                                    background: '#EFF6FF', color: '#3B82F6', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#DBEAFE'}
                                onMouseOut={e => e.currentTarget.style.background = '#EFF6FF'}
                            >
                                HICAS Office
                            </button>
                            <button
                                onClick={() => confirmCheckIn('Work From Home')}
                                style={{
                                    width: '100%', padding: '12px 0', borderRadius: 8, border: '1px solid #8B5CF6',
                                    background: '#F5F3FF', color: '#8B5CF6', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#EDE9FE'}
                                onMouseOut={e => e.currentTarget.style.background = '#F5F3FF'}
                            >
                                Work From Home
                            </button>
                        </div>
                        <button
                            onClick={() => setShowCheckInModal(false)}
                            style={{
                                marginTop: 16, padding: '8px 0', background: 'transparent', border: 'none',
                                color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: 13
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {showSelfieModal && (
                <SelfieCapture 
                    onConfirm={handleSelfieConfirm} 
                    onCancel={() => { setShowSelfieModal(false); setPendingCheckInCoords(null); }} 
                />
            )}
        </div>
    );
};

export default EmployeeDashboard;

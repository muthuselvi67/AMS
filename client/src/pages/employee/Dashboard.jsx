import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Hourglass, MapPin, UserCheck, LogIn, TrendingUp, CheckCircle } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardCalendar from '../../components/ui/DashboardCalendar';

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [todayRecord, setTodayRecord] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

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
        fetchAttendance();
    }, []);

    // Live clock ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
                <div className="emp-dash-date-badge">
                    <Calendar size={15} />
                    <span>{todayFormatted}</span>
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
                
                {/* Left: Overview List */}
                <div className="emp-overview-panel">
                    <div className="emp-panel-header">
                        <TrendingUp size={16} color="#8B5CF6" />
                        <h3>Today's Attendance Overview</h3>
                    </div>
                    
                    <div className="emp-overview-list">
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Clock size={16} className="color-gray" /> Office Time
                            </div>
                            <div className="emp-list-value">09:30 AM - 06:30 PM</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <LogIn size={16} className="color-green" /> Check-In Time
                            </div>
                            <div className="emp-list-value color-green">{checkInText}</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Clock size={16} className="color-blue" /> Current Time
                            </div>
                            <div className="emp-list-value color-blue">{formatClock(currentTime)}</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Hourglass size={16} className="color-purple" /> Hours Worked
                            </div>
                            <div className="emp-list-value">{String(hoursWorked).padStart(2, '0')}:{String(minsWorked).padStart(2, '0')} ({hoursWorked} Hour)</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Hourglass size={16} className="color-orange" style={{ transform: 'rotate(180deg)' }} /> Hours Remaining
                            </div>
                            <div className="emp-list-value">{String(remHrs).padStart(2, '0')}:{String(remMins).padStart(2, '0')} ({remHrs} Hours)</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <UserCheck size={16} className="color-emerald" /> Status
                            </div>
                            <div className="emp-list-value bg-emerald-light">{statusText}</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <MapPin size={16} className="color-pink" /> Work Location
                            </div>
                            <div className="emp-list-value bg-pink-light">{locationText}</div>
                        </div>
                    </div>

                    <div className="emp-success-banner">
                        <CheckCircle size={16} color="#059669" />
                        <span>You are all set! Keep up your good work.</span>
                    </div>
                </div>

                {/* Right: Calendar Component */}
                <div className="emp-calendar-panel">
                    <DashboardCalendar />
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;

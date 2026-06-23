import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
    MapPin, LogIn, LogOut, AlertCircle, RefreshCw,
    CheckCircle2, Navigation, Home, Send, Clock,
    FileText, ChevronRight, Info, Loader
} from 'lucide-react';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const fmtTime  = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '--';

/* ── Office Geofence Configurations ── */
const OFFICE_LOCATIONS = [
    {
        name: 'LearnLike',
        latitude: 10.9984474,
        longitude: 76.9914006
    },
    {
        name: 'Hicas',
        latitude: 11.0126179,
        longitude: 76.9905965
    }
];
const GEOFENCE_RADIUS = 500; // meters

/* Haversine formula — returns distance in meters */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * getLocation — enforces the full GPS security chain:
 *  1. GPS Enabled?       NO  → reject
 *  2. Mock Location?     YES → reject  (accuracy === 0 is a definitive red flag)
 *  3. Accuracy < 200 m?   NO  → reject  (poor signal or high-accuracy mock)
 *  YES → resolve with { latitude, longitude, accuracy }
 */
const getLocation = () => new Promise((resolve, reject) => {
    // If running on localhost/development, auto-resolve with office coordinates to bypass physical GPS/accuracy requirements
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        resolve({
            latitude: 10.9984474,
            longitude: 76.9914006,
            accuracy: 10
        });
        return;
    }

    // GATE 1: GPS supported
    if (!navigator.geolocation) {
        reject('GPS is not supported by your browser. Attendance cannot be marked.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;

            // GATE 2: Mock Location Detection
            // Real GPS hardware never reports 0 m accuracy.
            if (accuracy === 0) {
                reject('Mock location detected (accuracy 0 m). Disable any fake-GPS app and try again.');
                return;
            }

            // GATE 3: Accuracy must be < 200 m (indoor GPS typically gives 50–100 m)
            if (accuracy >= 200) {
                reject(`GPS accuracy too low (${Math.round(accuracy)} m). Need < 200 m to mark attendance.`);
                return;
            }

            resolve({ latitude, longitude, accuracy });
        },
        (err) => {
            // GATE 1 failure path
            if (err.code === 1) {
                reject('GPS permission denied. Enable Location access in your browser / device settings and try again.');
            } else if (err.code === 2) {
                reject('GPS signal unavailable. Move to an open area and try again.');
            } else {
                reject('GPS request timed out. Ensure GPS is enabled and try again.');
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
});

const getAddress = async (lat, lng) => {
    try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
        const data = await res.json();
        return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
};

/* ─────────────────────────────────────────
   Selfie Capture Modal
───────────────────────────────────────── */
const SelfieCapture = ({ onConfirm, onCancel }) => {
    const videoRef  = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [stream,   setStream]   = React.useState(null);
    const [preview,  setPreview]  = React.useState(null);
    const [camError, setCamError] = React.useState('');
    const [starting, setStarting] = React.useState(true);

    React.useEffect(() => {
        let mediaStream;
        if (!navigator.mediaDevices?.getUserMedia) {
            setCamError('Camera API not available in this browser.');
            setStarting(false);
            return;
        }
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
            .then(s => {
                mediaStream = s;
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    videoRef.current.play().catch(() => {});
                }
                setStarting(false);
            })
            .catch(err => {
                const name = err?.name || '';
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    setCamError('Camera permission denied. Click the 🔒 icon in your browser’s address bar → "Allow" camera, then click Retry.');
                } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                    setCamError('No camera found on this device.');
                } else {
                    setCamError('Unable to access camera. You can skip and still mark attendance.');
                }
                setStarting(false);
            });
        return () => { mediaStream?.getTracks().forEach(t => t.stop()); };
    }, []);

    const retryCamera = () => {
        setCamError('');
        setStarting(true);
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user' } })
            .then(s => {
                setStream(s);
                if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
                setStarting(false);
            })
            .catch(() => setCamError('Camera still unavailable. You can skip selfie and mark attendance.'));
    };

    const capture = () => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1); // mirror so selfie feels natural
        ctx.drawImage(video, 0, 0);
        setPreview(canvas.toDataURL('image/jpeg', 0.80));
        stream?.getTracks().forEach(t => t.stop());
    };

    const retake = () => {
        setPreview(null);
        setStarting(true);
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user' } })
            .then(s => {
                setStream(s);
                if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
                setStarting(false);
            })
            .catch(() => setCamError('Camera unavailable. You can skip selfie and mark attendance.'));
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', borderRadius: 24, padding: '32px 28px',
                maxWidth: 420, width: '92%', textAlign: 'center',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5)'
            }}>
                <div style={{ fontSize: 38, marginBottom: 6 }}>📸</div>
                <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>Selfie Verification</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>
                    Look straight at the camera and press <strong>Capture</strong>
                </p>

                {camError ? (
                    <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 12, color: '#DC2626', fontSize: 13, marginBottom: 20, lineHeight: 1.6, textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Camera Unavailable</div>
                        <div>{camError}</div>
                        <button onClick={retryCamera} style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, border: '1.5px solid #DC2626', background: 'white', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            🔄 Retry Camera
                        </button>
                    </div>
                ) : preview ? (
                    <img src={preview} alt="Selfie preview" style={{
                        width: '100%', borderRadius: 14, marginBottom: 20,
                        border: '3px solid #10B981', boxShadow: '0 4px 16px rgba(16,185,129,0.2)'
                    }} />
                ) : (
                    <div style={{
                        borderRadius: 14, overflow: 'hidden', marginBottom: 20,
                        background: '#111', minHeight: 240, position: 'relative'
                    }}>
                        {starting && (
                            <div style={{
                                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                color: 'rgba(255,255,255,0.55)', fontSize: 13, gap: 8
                            }}>
                                <span style={{ fontSize: 30 }}>📷</span>Starting camera…
                            </div>
                        )}
                        <video ref={videoRef} autoPlay playsInline muted
                            style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
                    </div>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={onCancel} style={{
                        flex: 1, minWidth: 70, padding: '12px 0', borderRadius: 10,
                        border: '1.5px solid #E5E7EB', background: 'white',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#6B7280'
                    }}>✕ Cancel</button>

                    {/* Camera error: Skip button — allows attendance WITHOUT selfie */}
                    {camError && (
                        <button onClick={() => onConfirm('')} style={{
                            flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg,#F59E0B,#D97706)',
                            color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                        }}>⚡ Skip & Mark Attendance</button>
                    )}

                    {!camError && !preview && (
                        <button onClick={capture} disabled={starting} style={{
                            flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
                            background: starting ? '#E5E7EB' : 'linear-gradient(135deg,#7C5CFC,#6B46FA)',
                            color: starting ? '#9CA3AF' : 'white',
                            fontSize: 14, fontWeight: 700,
                            cursor: starting ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                        }}>📸 Capture</button>
                    )}

                    {preview && (
                        <>
                            <button onClick={retake} style={{
                                flex: 1, padding: '12px 0', borderRadius: 10,
                                border: '1.5px solid #E5E7EB', background: '#F9FAFB',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer'
                            }}>↺ Retake</button>
                            <button onClick={() => onConfirm(preview)} style={{
                                flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg,#10B981,#059669)',
                                color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                            }}>✓ Use Photo</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────
   Component
───────────────────────────────────────── */
const Attendance = () => {
    const [attendance,     setAttendance]     = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [actionLoading,  setActionLoading]  = useState(false);
    const [locError,       setLocError]       = useState('');
    const [history,        setHistory]        = useState([]);
    const [wfhMode,        setWfhMode]        = useState(false);          // toggle before check-in
    const [wfhUpdates,     setWfhUpdates]     = useState([]);             // today's WFH update log
    const [updateText,     setUpdateText]     = useState('');
    const [isFinal,        setIsFinal]        = useState(false);
    const [submitLoading,  setSubmitLoading]  = useState(false);
    const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState(0);
    const [inEODWindow, setInEODWindow] = useState(false);
    const [currentCoords,   setCurrentCoords]  = useState(null);
    const [showSelfie,      setShowSelfie]      = useState(false);   // selfie modal open
    const [pendingAction,   setPendingAction]   = useState(null);    // { type, loc, isWFH }
    const [selfieViewModal, setSelfieViewModal] = useState(null);
    const [showLocSelectModal, setShowLocSelectModal] = useState(false);
    const [pendingLocActionType, setPendingLocActionType] = useState(null); // 'in' or 'out'
    const [selectedLoc, setSelectedLoc] = useState(OFFICE_LOCATIONS[0]);

    useEffect(() => {
        getLocation()
            .then(loc => setCurrentCoords(loc))
            .catch(() => {}); // silently ignore on initial page load
    }, []);

    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const isCheckedIn  = !!attendance?.checkIn?.time;
    const isCheckedOut = !!attendance?.checkOut?.time;
    const isWFHToday   = !!attendance?.workFromHome;
    const hasFinalEOD  = wfhUpdates.some(u => u.is_final);

    /* ── Fetch today + history + WFH updates ── */
    const fetchData = useCallback(async () => {
        try {
            const [todayRes, histRes] = await Promise.all([
                api.get('/attendance/today'),
                api.get('/attendance')
            ]);
            const att = todayRes.data.data?.attendance || null;
            setAttendance(att);
            setHistory(histRes.data.data || []);

            // If already WFH today, fetch updates
            if (att?.workFromHome) {
                fetchWFHUpdates();
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []); // eslint-disable-line

    const fetchWFHUpdates = async () => {
        try {
            const res = await api.get('/wfh-updates');
            setWfhUpdates(res.data.data?.updates || []);
        } catch (e) { console.error('WFH updates fetch error', e); }
    };

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!isCheckedIn || !isWFHToday || isCheckedOut) return;

        const checkTime = () => {
            const now = new Date();
            
            // Check EOD window (17:30 - 18:00)
            const hrs = now.getHours();
            const mins = now.getMinutes();
            const timeInMins = hrs * 60 + mins;
            setInEODWindow(timeInMins >= 17 * 60 + 30 && timeInMins <= 18 * 60);

            // Find last update time
            const lastTime = wfhUpdates.length > 0 
                ? wfhUpdates[wfhUpdates.length - 1].submitted_at 
                : attendance?.checkIn?.time;

            if (!lastTime) return;

            // Compute elapsed time in minutes
            const lastTimeStr = String(lastTime);
            const parsedLast = new Date(lastTimeStr.replace(' ', 'T'));
            const diffMs = now - parsedLast;
            const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
            setTimeSinceLastUpdate(diffMins);
        };

        checkTime();
        const interval = setInterval(checkTime, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [isCheckedIn, isWFHToday, isCheckedOut, wfhUpdates, attendance]);

    /* ── Check-in / Check-out ── Strict GPS + Selfie flow ── */
    const handleAction = async (type) => {
        const isWFH = type === 'in' && wfhMode;
        if (!isWFH) {
            // It's an office check-in / check-out. Show the Location Selector Modal first
            setPendingLocActionType(type);
            setSelectedLoc(OFFICE_LOCATIONS[0]);
            setShowLocSelectModal(true);
            return;
        }
        
        proceedWithLocation(type, null);
    };

    const proceedWithLocation = async (type, selectedOffice) => {
        setActionLoading(true);
        setLocError('');
        try {
            // STEP 1 → 3: Get GPS, detect mock, check accuracy
            let loc;
            try {
                loc = await getLocation();
            } catch (gpsErr) {
                setLocError(gpsErr);
                toast.error(gpsErr);
                setActionLoading(false);
                return;
            }

            // STEP 4: Distance from chosen office (skip for WFH)
            const isWFH = type === 'in' && wfhMode;
            if (!isWFH && selectedOffice) {
                const distance = haversineDistance(
                    loc.latitude, loc.longitude,
                    selectedOffice.latitude, selectedOffice.longitude
                );
                if (distance > GEOFENCE_RADIUS) {
                    const distM = Math.round(distance);
                    const msg = `Outside Office Area — You are ${distM} m away from ${selectedOffice.name}. Must be within ${GEOFENCE_RADIUS} m to mark attendance.`;
                    setLocError(msg);
                    toast.error(msg);
                    setActionLoading(false);
                    return;
                }
            }

            // STEP 5: All gates passed → open selfie capture
            setPendingAction({ type, loc, isWFH, selectedOfficeName: selectedOffice?.name });
            setShowSelfie(true);
            // flow continues inside handleSubmitWithSelfie after photo is taken
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setLocError(msg);
            toast.error(msg);
        } finally {
            setActionLoading(false);
        }
    };

    /* ── Called by SelfieCapture once photo is confirmed ── */
    const handleSubmitWithSelfie = async (photoDataUrl) => {
        setShowSelfie(false);
        setActionLoading(true);
        setLocError('');
        try {
            const { type, loc, isWFH, selectedOfficeName } = pendingAction;
            let address = '';
            if (isWFH) {
                address = await getAddress(loc.latitude, loc.longitude);
            } else {
                address = selectedOfficeName || 'LearnLike';
            }
            const payload = { ...loc, address, photo: photoDataUrl, work_from_home: isWFH ? 1 : 0 };
            await api.post(type === 'in' ? '/attendance/checkin' : '/attendance/checkout', payload);
            toast.success(`Successfully ${type === 'in' ? 'Checked In ✅' : 'Checked Out ✅'}!`);
            await fetchData();
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setLocError(msg);
            toast.error(msg);
        } finally {
            setActionLoading(false);
            setPendingAction(null);
        }
    };

    /* ── Submit WFH update ── */
    const handleWFHUpdate = async (e) => {
        e.preventDefault();
        if (!updateText.trim()) { toast.error('Please enter your update.'); return; }
        setSubmitLoading(true);
        try {
            await api.post('/wfh-updates', { update_text: updateText.trim(), is_final: isFinal ? 1 : 0 });
            toast.success(isFinal ? '✅ Final EOD report submitted!' : '📝 WFH update submitted!');
            setUpdateText(''); setIsFinal(false);
            fetchWFHUpdates();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit update.');
        } finally { setSubmitLoading(false); }
    };


    if (loading) {
        return (
            <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                <Loader size={32} className="spin" color="var(--primary)" />
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading attendance…</span>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>My Attendance</h1>
                <p>{today}</p>
            </div>

            <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>

                {/* ── Check-In Card ── */}
                <div className="card" style={{ padding: 32, textAlign: 'center' }}>

                    {/* Status circle */}
                    <div style={{
                        position: 'relative', width: 220, height: 220, margin: '0 auto 24px',
                        borderRadius: '50%', overflow: 'hidden', border: '6px solid white',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                        background: isCheckedOut ? '#1E293B' : isCheckedIn ? '#0D1F12' : isWFHToday ? '#1A0E3A' : '#1E293B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
                    }}>
                        {isCheckedOut ? (
                            <><LogOut size={56} color="rgba(255,255,255,0.25)" /><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 8, fontWeight: 600 }}>Day Done</p></>
                        ) : isCheckedIn && isWFHToday ? (
                            <><Home size={56} color="#9B7CFD" /><p style={{ color: '#9B7CFD', fontSize: 14, marginTop: 8, fontWeight: 700 }}>WFH Active</p></>
                        ) : isCheckedIn ? (
                            <><CheckCircle2 size={56} color="#10B981" /><p style={{ color: '#10B981', fontSize: 14, marginTop: 8, fontWeight: 600 }}>Checked In</p></>
                        ) : (
                            <>
                                <MapPin size={56} color="rgba(255,255,255,0.7)" />
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, textAlign: 'center', paddingInline: 16 }}>
                                    Location Ready
                                    {currentCoords && (
                                        <span style={{ display: 'block', fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.4)' }}>
                                            ({currentCoords.latitude.toFixed(6)}, {currentCoords.longitude.toFixed(6)})
                                            {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                                                <span style={{ display: 'block', fontSize: 10, marginTop: 4, color: '#F59E0B', fontWeight: 'bold' }}>
                                                    ⚙️ Localhost Bypass Active
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Status label */}
                    <div style={{ marginBottom: 20 }}>
                        <span style={{
                            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                            color: isCheckedOut ? 'var(--text-muted)' : isWFHToday ? '#9B7CFD' : isCheckedIn ? '#10B981' : 'var(--text-muted)'
                        }}>
                            {isCheckedOut ? 'Work Completed' : isWFHToday && isCheckedIn ? 'Working From Home' : isCheckedIn ? 'Active Session' : 'Ready to Check In'}
                        </span>
                        <h2 style={{ fontSize: 34, margin: '4px 0 0', fontWeight: 800 }}>
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h2>
                    </div>

                    {locError && (
                        <div className="badge badge-danger" style={{ marginBottom: 14, padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                            <AlertCircle size={14} /> {locError}
                        </div>
                    )}

                    {/* WFH toggle — only before first check-in */}
                    {!isCheckedIn && !isCheckedOut && (
                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            cursor: 'pointer', marginBottom: 14, padding: '10px 16px',
                            borderRadius: 12, border: `1.5px solid ${wfhMode ? '#9B7CFD' : 'var(--border-light)'}`,
                            background: wfhMode ? '#F5F3FF' : 'var(--bg-light)', transition: 'all 0.2s ease'
                        }}>
                            <input
                                type="checkbox"
                                checked={wfhMode}
                                onChange={e => setWfhMode(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: '#9B7CFD' }}
                            />
                            <Home size={16} color={wfhMode ? '#9B7CFD' : 'var(--text-muted)'} />
                            <span style={{ fontWeight: 600, fontSize: 14, color: wfhMode ? '#9B7CFD' : 'var(--text-secondary)' }}>
                                Work From Home today
                            </span>
                        </label>
                    )}

                    {/* CTA button */}
                    {!isCheckedIn ? (
                        <button className="btn btn-primary btn-lg" onClick={() => handleAction('in')} disabled={actionLoading} style={{ width: '100%', height: 52, background: wfhMode ? 'linear-gradient(135deg,#9B7CFD,#7C5CFC)' : undefined }}>
                            {actionLoading ? <RefreshCw className="spin" size={20} /> : <><LogIn size={18} /> {wfhMode ? 'Check In (WFH)' : 'Check In with Location'}</>}
                        </button>
                    ) : !isCheckedOut ? (
                        <button className="btn btn-danger btn-lg" onClick={() => handleAction('out')} disabled={actionLoading} style={{ width: '100%', height: 52 }}>
                            {actionLoading ? <RefreshCw className="spin" size={20} /> : <><LogOut size={18} /> Check Out</>}
                        </button>
                    ) : (
                        <div style={{ padding: '14px', background: 'var(--bg-light)', borderRadius: 12, color: 'var(--text-muted)', fontWeight: 600, fontSize: 14 }}>
                            <CheckCircle2 size={18} style={{ marginRight: 8, color: '#10B981', verticalAlign: 'middle' }} />
                            Work completed for today
                        </div>
                    )}

                    {/* Check-in / out times */}
                    {isCheckedIn && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                            <div style={{ background: '#E6FDF4', borderRadius: 10, padding: '10px 14px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Check In</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#065F46' }}>{fmtTime(attendance.checkIn?.time)}</div>
                            </div>
                            <div style={{ background: isCheckedOut ? '#FEF2F2' : 'var(--bg-light)', borderRadius: 10, padding: '10px 14px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: isCheckedOut ? '#DC2626' : 'var(--text-muted)', textTransform: 'uppercase' }}>Check Out</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: isCheckedOut ? '#991B1B' : 'var(--text-muted)' }}>{fmtTime(attendance.checkOut?.time)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Stats + History ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="card" style={{ padding: 20, textAlign: 'center', background: 'var(--secondary-light)', border: 'none' }}>
                            <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--secondary-dark)' }}>{history.filter(h => h.status === 'present').length}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-dark)', opacity: 0.8 }}>Present Days</div>
                        </div>
                        <div className="card" style={{ padding: 20, textAlign: 'center', background: 'var(--primary-light)', border: 'none' }}>
                            <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary-dark)' }}>{attendance?.totalHours || 0}h</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-dark)', opacity: 0.8 }}>Today's Hours</div>
                        </div>
                    </div>

                    {/* Recent Logs */}
                    <div className="card" style={{ padding: 0, flex: 1 }}>
                        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)' }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>Recent Attendance Logs</h3>
                        </div>
                        <div className="table-container" style={{ maxHeight: 280, overflowY: 'auto' }}>
                            <table style={{ border: 'none' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                                    <tr><th>Date</th><th>In / Out</th><th>Type</th><th>Location</th><th>Selfie</th></tr>
                                </thead>
                                <tbody>
                                    {history.length === 0 ? (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>No records yet</td></tr>
                                    ) : history.slice(0, 12).map(h => (
                                        <tr key={h.id}>
                                            <td style={{ fontSize: 13, fontWeight: 600 }}>{fmtShort(h.date)}</td>
                                            <td>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary)' }}>{fmtTime(h.check_in_time)}</div>
                                                <div style={{ fontSize: 11, color: 'var(--danger)' }}>{h.check_out_time ? fmtTime(h.check_out_time) : '--:--'}</div>
                                            </td>
                                            <td>
                                                {h.work_from_home ? (
                                                    <span style={{ fontSize: 11, fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px', borderRadius: 20 }}>Work From Home</span>
                                                ) : (
                                                    <span style={{ fontSize: 11, fontWeight: 700, background: '#E6FDF4', color: '#059669', padding: '2px 8px', borderRadius: 20 }}>Office</span>
                                                )}
                                            </td>
                                            <td style={{ maxWidth: 220 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {h.check_in_latitude ? (
                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${h.check_in_latitude},${h.check_in_longitude}`}
                                                           target="_blank" rel="noopener noreferrer"
                                                           style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.3 }}>
                                                            <MapPin size={10} style={{ marginTop: 2, flexShrink: 0 }} />
                                                            <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', display: 'inline-block', textAlign: 'left' }}>
                                                                {h.work_from_home 
                                                                    ? (h.check_in_address || `WFH: ${parseFloat(h.check_in_latitude).toFixed(3)}, ${parseFloat(h.check_in_longitude).toFixed(3)}`) 
                                                                    : (h.check_in_address || 'LearnLike')}
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                                    )}
                                                    {h.check_out_time ? (
                                                        h.check_out_latitude ? (
                                                            <a href={`https://www.google.com/maps/search/?api=1&query=${h.check_out_latitude},${h.check_out_longitude}`}
                                                               target="_blank" rel="noopener noreferrer"
                                                               style={{ color: 'var(--danger)', textDecoration: 'none', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: 4, lineHeight: 1.3 }}>
                                                                <MapPin size={10} style={{ marginTop: 2, flexShrink: 0 }} />
                                                                <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', display: 'inline-block', textAlign: 'left' }}>
                                                                    {h.work_from_home 
                                                                        ? (h.check_out_address || `WFH: ${parseFloat(h.check_out_latitude).toFixed(3)}, ${parseFloat(h.check_out_longitude).toFixed(3)}`) 
                                                                        : (h.check_out_address || 'LearnLike')}
                                                                </span>
                                                            </a>
                                                        ) : (
                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                                        )
                                                    ) : (
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>--:--</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {h.checkIn?.photo || h.checkOut?.photo ? (
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                        {h.checkIn?.photo && (
                                                            <button
                                                                onClick={() => setSelfieViewModal({
                                                                    src: h.checkIn.photo,
                                                                    date: fmtShort(h.date),
                                                                    time: fmtTime(h.check_in_time),
                                                                    type: 'Check-In',
                                                                    latitude: h.checkIn?.latitude || h.check_in_latitude,
                                                                    longitude: h.checkIn?.longitude || h.check_in_longitude,
                                                                    address: h.checkIn?.address || h.check_in_address,
                                                                    workFromHome: h.work_from_home
                                                                })}
                                                                title="View Check-In Selfie"
                                                                style={{
                                                                    border: '2px solid #10B981', borderRadius: 8, padding: 0,
                                                                    cursor: 'pointer', background: 'none', overflow: 'hidden',
                                                                    width: 32, height: 32, flexShrink: 0
                                                                }}
                                                            >
                                                                <img src={h.checkIn.photo} alt="Check-In Selfie"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </button>
                                                        )}
                                                        {h.checkOut?.photo && (
                                                            <button
                                                                onClick={() => setSelfieViewModal({
                                                                    src: h.checkOut.photo,
                                                                    date: fmtShort(h.date),
                                                                    time: fmtTime(h.check_out_time),
                                                                    type: 'Check-Out',
                                                                    latitude: h.checkOut?.latitude || h.check_out_latitude,
                                                                    longitude: h.checkOut?.longitude || h.check_out_longitude,
                                                                    address: h.checkOut?.address || h.check_out_address,
                                                                    workFromHome: h.work_from_home
                                                                })}
                                                                title="View Check-Out Selfie"
                                                                style={{
                                                                    border: '2px solid #EF4444', borderRadius: 8, padding: 0,
                                                                    cursor: 'pointer', background: 'none', overflow: 'hidden',
                                                                    width: 32, height: 32, flexShrink: 0
                                                                }}
                                                            >
                                                                <img src={h.checkOut.photo} alt="Check-Out Selfie"
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── WFH Update Panel (only shown when checked in with WFH) ── */}
            {isWFHToday && isCheckedIn && (
                <div style={{ marginBottom: 24 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#9B7CFD,#7C5CFC)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Home size={18} color="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>WFH Updates</h2>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Submit progress updates every 2 hours · Final EOD between 5:30–6:00 PM</p>
                        </div>
                    </div>

                    {/* Policy compliance timer */}
                    {!isCheckedOut && (
                        <div style={{
                            marginBottom: 16,
                            padding: '12px 18px',
                            borderRadius: 12,
                            border: timeSinceLastUpdate >= 120 ? '1.5px solid #FCA5A5' : '1.5px solid #C7D2FE',
                            background: timeSinceLastUpdate >= 120 ? '#FEF2F2' : '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            boxShadow: timeSinceLastUpdate >= 120 ? '0 0 12px rgba(239, 68, 68, 0.15)' : 'none',
                            transition: 'all 0.3s ease',
                            animation: timeSinceLastUpdate >= 120 ? 'pulse 2s infinite' : 'none'
                        }}>
                            <style>{`
                                @keyframes pulse {
                                    0%, 100% { opacity: 1; transform: scale(1); }
                                    50% { opacity: 0.92; transform: scale(1.005); }
                                }
                            `}</style>
                            <span style={{ fontSize: 16 }}>{timeSinceLastUpdate >= 120 ? '⚠️' : '⏱️'}</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: timeSinceLastUpdate >= 120 ? '#991B1B' : '#1E40AF', flex: 1 }}>
                                {timeSinceLastUpdate >= 120 
                                    ? `WFH Policy Alert: It has been ${Math.floor(timeSinceLastUpdate / 60)}h ${timeSinceLastUpdate % 60}m since your last update. Please submit a progress update.` 
                                    : `Next update due in ${120 - timeSinceLastUpdate} minutes.`
                                }
                            </div>
                        </div>
                    )}

                    <div className="grid-2" style={{ gap: 20 }}>
                        {/* Submit form */}
                        <div className="card" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
                                {isFinal ? '📋 Final EOD Report' : '📝 Progress Update'}
                            </h3>

                            <form onSubmit={handleWFHUpdate}>
                                <textarea
                                    value={updateText}
                                    onChange={e => setUpdateText(e.target.value)}
                                    rows={5}
                                    placeholder={isFinal
                                        ? "Summarise what you completed today, any blockers, and tomorrow's plan…"
                                        : "What are you currently working on?"}
                                    style={{
                                        width: '100%', borderRadius: 10, border: `1.5px solid ${isFinal ? '#9B7CFD' : 'var(--border-light)'}`,
                                        padding: '12px 14px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit',
                                        outline: 'none', background: isFinal ? '#FAF8FF' : 'white', boxSizing: 'border-box'
                                    }}
                                    required
                                />

                                {/* Final toggle */}
                                {!hasFinalEOD && !isCheckedOut && (
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                                        cursor: inEODWindow ? 'pointer' : 'not-allowed', padding: '10px 14px',
                                        borderRadius: 10,
                                        border: `1.5px solid ${isFinal ? '#EF4444' : 'var(--border-light)'}`,
                                        background: isFinal ? '#FEF2F2' : 'var(--bg-light)',
                                        opacity: inEODWindow ? 1 : 0.65,
                                        transition: 'all 0.2s'
                                    }} title={!inEODWindow ? "The final EOD report can only be submitted between 5:30 PM and 6:00 PM" : ""}>
                                        <input 
                                            type="checkbox" 
                                            checked={isFinal} 
                                            onChange={e => inEODWindow && setIsFinal(e.target.checked)}
                                            disabled={!inEODWindow}
                                            style={{ width: 15, height: 15, accentColor: '#EF4444', cursor: inEODWindow ? 'pointer' : 'not-allowed' }} 
                                        />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: isFinal ? '#DC2626' : 'var(--text-secondary)' }}>
                                            This is my final EOD report (5:30–6:00 PM only) {!inEODWindow && "🔒"}
                                        </span>
                                    </label>
                                )}

                                {hasFinalEOD && (
                                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#E6FDF4', borderRadius: 10, fontSize: 13, color: '#065F46', fontWeight: 600 }}>
                                        <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                        Final EOD report already submitted today.
                                    </div>
                                )}

                                <button type="submit" disabled={submitLoading || !updateText.trim()}
                                    className="btn btn-primary" style={{ marginTop: 14, width: '100%', height: 46, background: isFinal ? 'linear-gradient(135deg,#EF4444,#DC2626)' : undefined }}>
                                    {submitLoading ? <Loader size={16} className="spin" /> : <><Send size={15} /> {isFinal ? 'Submit EOD Report' : 'Submit Update'}</>}
                                </button>
                            </form>
                        </div>

                        {/* Update timeline */}
                        <div className="card" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={16} color="var(--text-muted)" /> Today's Updates
                                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', padding: '2px 10px', borderRadius: 20 }}>
                                    {wfhUpdates.length} submitted
                                </span>
                            </h3>

                            {wfhUpdates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
                                    <FileText size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                                    <p style={{ fontSize: 13, margin: 0 }}>No updates submitted yet.<br />Submit your first progress update.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                                    {wfhUpdates.map((u, i) => (
                                        <div key={u.id} style={{
                                            borderRadius: 10, padding: '12px 14px',
                                            background: u.is_final ? '#FEF2F2' : 'var(--bg-light)',
                                            border: `1px solid ${u.is_final ? '#FCA5A5' : 'var(--border-light)'}`
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                                                    background: u.is_final ? '#EF4444' : '#9B7CFD',
                                                    color: 'white', padding: '2px 8px', borderRadius: 6
                                                }}>
                                                    {u.is_final ? '⚡ EOD' : `Update ${i + 1}`}
                                                </span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                                    <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                                                    {new Date(u.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{u.update_text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Policy reminder */}
                            <div style={{ marginTop: 14, padding: '10px 14px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <Info size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                                <p style={{ margin: 0, fontSize: 11.5, color: '#92400E', lineHeight: 1.6 }}>
                                    Submit an update every 2 hours. Missing the 5:30–6:00 PM EOD window marks the day as leave.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Geolocation Banner ── */}
            <div className="card" style={{ background: 'linear-gradient(135deg,#1E40AF 0%,#1E293B 100%)', color: 'white', border: 'none', padding: '26px 30px' }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.15)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Navigation size={28} />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 5px', fontSize: 18, fontWeight: 800 }}>Secure Geolocation Verification</h4>
                        <p style={{ margin: 0, fontSize: 13.5, opacity: 0.82, lineHeight: 1.6 }}>
                            Your attendance is verified using GPS. Data is processed securely and used only for check-in verification.
                        </p>
                    </div>
                    <ChevronRight size={20} style={{ marginLeft: 'auto', opacity: 0.4, flexShrink: 0 }} />
                </div>
            </div>

            {/* ── Selfie Lightbox Modal ── */}
            {selfieViewModal && (
                <div
                    onClick={() => setSelfieViewModal(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: 20, padding: 24,
                            maxWidth: 380, width: '90%', textAlign: 'center',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 850, fontSize: 16, color: 'var(--text-primary)' }}>Selfie Preview</div>
                                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                                    <span style={{
                                        fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 20,
                                        background: selfieViewModal.type === 'Check-In' ? '#E6FDF4' : '#FEF2F2',
                                        color: selfieViewModal.type === 'Check-In' ? '#059669' : '#DC2626',
                                        marginRight: 6
                                    }}>{selfieViewModal.type}</span>
                                    {selfieViewModal.date ? `${selfieViewModal.date} · ${selfieViewModal.time}` : selfieViewModal.time}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelfieViewModal(null)}
                                style={{
                                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                                    background: '#F3F4F6', cursor: 'pointer', fontSize: 18,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >✕</button>
                        </div>
                        <div style={{
                            position: 'relative',
                            borderRadius: 14,
                            overflow: 'hidden',
                            border: `3px solid ${selfieViewModal.type === 'Check-In' ? '#10B981' : '#EF4444'}`,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                        }}>
                            <img
                                src={selfieViewModal.src}
                                alt={`${selfieViewModal.type} Selfie`}
                                style={{
                                    width: '100%',
                                    display: 'block'
                                }}
                            />
                            {(selfieViewModal.latitude || selfieViewModal.longitude || selfieViewModal.address) && (
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(15, 23, 42, 0.75)',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                    color: 'white',
                                    padding: '12px 14px',
                                    textAlign: 'left',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                        <MapPin size={14} color={selfieViewModal.type === 'Check-In' ? '#10B981' : '#EF4444'} style={{ marginTop: 2, flexShrink: 0 }} />
                                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#F8FAFC', lineHeight: 1.3 }}>
                                            {selfieViewModal.workFromHome 
                                                ? (selfieViewModal.address || 'WFH Location')
                                                : (selfieViewModal.address || 'LearnLike Office')}
                                        </span>
                                    </div>
                                    {selfieViewModal.latitude && selfieViewModal.longitude && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${selfieViewModal.latitude},${selfieViewModal.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '10.5px',
                                                color: '#38BDF8',
                                                textDecoration: 'none',
                                                marginLeft: 20,
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseOver={e => e.target.style.color = '#7DD3FC'}
                                            onMouseOut={e => e.target.style.color = '#38BDF8'}
                                        >
                                            📍 {selfieViewModal.latitude.toFixed(6)}, {selfieViewModal.longitude.toFixed(6)}
                                            <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.8 }}>(View Map)</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Location Selector Modal ── */}
            {showLocSelectModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'white', borderRadius: 20, padding: 30,
                            maxWidth: 400, width: '90%', textAlign: 'center',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                            Select Work Location
                        </h3>
                        <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--text-muted)' }}>
                            Please select the office location where you are checking {pendingLocActionType === 'in' ? 'in' : 'out'}:
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                            {OFFICE_LOCATIONS.map(office => (
                                <button
                                    key={office.name}
                                    onClick={() => setSelectedLoc(office)}
                                    style={{
                                        display: 'flex', alignItems: 'center',
                                        padding: '16px 20px', borderRadius: 12,
                                        border: `2px solid ${selectedLoc?.name === office.name ? 'var(--primary)' : 'var(--border-light)'}`,
                                        background: selectedLoc?.name === office.name ? '#EEF2FF' : 'white',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                                        fontWeight: 700, color: selectedLoc?.name === office.name ? 'var(--primary)' : 'var(--text-secondary)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <MapPin size={18} color={selectedLoc?.name === office.name ? 'var(--primary)' : 'var(--text-muted)'} />
                                        <span>{office.name} Office</span>
                                    </div>
                                    <div style={{
                                        marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%',
                                        border: `2px solid ${selectedLoc?.name === office.name ? 'var(--primary)' : 'var(--border-light)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {selectedLoc?.name === office.name && (
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => {
                                    setShowLocSelectModal(false);
                                    setPendingLocActionType(null);
                                }}
                                style={{
                                    flex: 1, padding: '12px 0', borderRadius: 10,
                                    border: '1.5px solid #E5E7EB', background: 'white',
                                    fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#6B7280'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!selectedLoc) {
                                        toast.error('Please select a location.');
                                        return;
                                    }
                                    const type = pendingLocActionType;
                                    const office = selectedLoc;
                                    setShowLocSelectModal(false);
                                    setPendingLocActionType(null);
                                    proceedWithLocation(type, office);
                                }}
                                style={{
                                    flex: 1.5, padding: '12px 0', borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg,#7C5CFC,#6B46FA)',
                                    color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Selfie Capture Modal ── */}
            {showSelfie && (
                <SelfieCapture
                    onConfirm={handleSubmitWithSelfie}
                    onCancel={() => {
                        setShowSelfie(false);
                        setPendingAction(null);
                        setActionLoading(false);
                    }}
                />
            )}
        </div>
    );
};

export default Attendance;

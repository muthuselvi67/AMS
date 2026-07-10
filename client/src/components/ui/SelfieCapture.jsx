import React from 'react';
import { createPortal } from 'react-dom';

const SelfieCapture = ({ onConfirm, onCancel }) => {
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [stream, setStream] = React.useState(null);
    const [preview, setPreview] = React.useState(null);
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
                    videoRef.current.play().catch(() => { });
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
                if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => { }); }
                setStarting(false);
            })
            .catch(() => setCamError('Camera still unavailable. You can skip selfie and mark attendance.'));
    };

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 640;
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
                if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => { }); }
                setStarting(false);
            })
            .catch(() => setCamError('Camera unavailable. You can skip selfie and mark attendance.'));
    };

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', borderRadius: 24, padding: '32px 28px',
                maxWidth: 420, width: '92%', textAlign: 'center',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                maxHeight: '90vh', overflowY: 'auto'
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
        </div>,
        document.body
    );
};

export default SelfieCapture;

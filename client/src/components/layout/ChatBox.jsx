import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    MessageSquare, X, Search, Send, Check, CheckCheck,
    ChevronLeft, Users, Bell, Shield, ArrowRight, Zap
} from 'lucide-react';
import api, { getServerUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import './ChatBox.css';

/* ═══════════════════════════════════════════════════════════
   FEATURE CARDS DATA
═══════════════════════════════════════════════════════════ */
const FEATURES = [
    {
        icon: <MessageSquare size={22} />,
        emoji: '💬',
        title: 'Real-time Messaging',
        desc: 'Instant messaging with your colleagues anytime, anywhere.',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg,#6366f1 0%,#818cf8 100%)',
    },
    {
        icon: <Users size={22} />,
        emoji: '👥',
        title: 'Team Collaboration',
        desc: 'Work together, share ideas, and improve productivity.',
        color: '#8b5cf6',
        gradient: 'linear-gradient(135deg,#8b5cf6 0%,#a78bfa 100%)',
    },
    {
        icon: <Bell size={22} />,
        emoji: '🔔',
        title: 'Instant Notifications',
        desc: 'Receive notifications for new messages and updates.',
        color: '#7c3aed',
        gradient: 'linear-gradient(135deg,#7c3aed 0%,#9d67ea 100%)',
    },
    {
        icon: <Shield size={22} />,
        emoji: '🔒',
        title: 'Secure & Private',
        desc: 'All conversations are encrypted and protected.',
        color: '#4f46e5',
        gradient: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)',
    },
];

/* ═══════════════════════════════════════════════════════════
   PREMIUM 3-D CHAT ILLUSTRATION (pure SVG)
═══════════════════════════════════════════════════════════ */
const Illustration3D = () => (
    <svg viewBox="0 0 320 230" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}>
        <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
            <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ddd6fe" />
                <stop offset="100%" stopColor="#ede9fe" />
            </linearGradient>
            <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#6366f1" floodOpacity="0.22" />
            </filter>
            <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.18" />
            </filter>
        </defs>

        {/* ── Ground shadow / glow ── */}
        <ellipse cx="160" cy="210" rx="100" ry="14" fill="url(#gS)" />

        {/* ── Back bubble (received) ── */}
        <g filter="url(#shadow2)">
            <rect x="22" y="50" width="138" height="52" rx="18" fill="url(#g3)" />
            <polygon points="30,102 18,118 52,102" fill="#ddd6fe" />
        </g>
        {/* text lines in back bubble */}
        <rect x="36" y="65" width="80" height="8" rx="4" fill="#a78bfa" opacity=".55"/>
        <rect x="36" y="79" width="55" height="6" rx="3" fill="#c4b5fd" opacity=".45"/>
        {/* avatar in back bubble */}
        <circle cx="145" cy="76" r="14" fill="url(#g2)" />
        <text x="145" y="81" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">HR</text>

        {/* ── Front bubble (sent) ── */}
        <g filter="url(#shadow)">
            <rect x="160" y="100" width="138" height="62" rx="18" fill="url(#g1)" />
            <polygon points="290,162 308,176 278,162" fill="#6366f1" />
        </g>
        {/* text lines in front bubble */}
        <rect x="176" y="116" width="90" height="8" rx="4" fill="rgba(255,255,255,.7)"/>
        <rect x="176" y="130" width="65" height="6" rx="3" fill="rgba(255,255,255,.5)"/>
        <rect x="176" y="143" width="45" height="6" rx="3" fill="rgba(255,255,255,.35)"/>
        {/* double tick */}
        <path d="M274 154 L278 158 L286 150" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".8"/>
        <path d="M269 154 L273 158" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity=".6"/>

        {/* ── Small notification badge bubble ── */}
        <g filter="url(#shadow2)">
            <rect x="100" y="158" width="100" height="36" rx="12" fill="white" stroke="#e8e4ff" strokeWidth="1.5"/>
        </g>
        <circle cx="118" cy="176" r="10" fill="url(#g2)" />
        <text x="118" y="180" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">ME</text>
        <rect x="133" y="170" width="50" height="5" rx="2.5" fill="#c4b5fd" />
        <rect x="133" y="179" width="35" height="4" rx="2" fill="#ddd6fe" />
        <circle cx="192" cy="176" r="8" fill="url(#g1)" />
        <text x="192" y="180" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">3</text>

        {/* ── Floating star top-right ── */}
        <circle cx="290" cy="38" r="6" fill="#a78bfa" opacity=".55">
            <animate attributeName="cy" values="38;32;38" dur="4s" repeatCount="indefinite"/>
        </circle>
        {/* ── Floating circle top-left ── */}
        <circle cx="28" cy="24" r="9" fill="#c4b5fd" opacity=".4">
            <animate attributeName="cy" values="24;30;24" dur="5s" repeatCount="indefinite"/>
        </circle>
        {/* ── Paper plane ── */}
        <g opacity=".7">
            <polygon points="302,78 318,70 306,90" fill="#818cf8" />
            <line x1="302" y1="78" x2="310" y2="82" stroke="#6366f1" strokeWidth="1.5"/>
            <animate attributeName="opacity" values=".7;.9;.7" dur="3s" repeatCount="indefinite"/>
        </g>
        {/* ── Mini sparkles ── */}
        <circle cx="70" cy="180" r="3" fill="#818cf8" opacity=".35">
            <animate attributeName="r" values="3;5;3" dur="3.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="240" cy="42" r="4" fill="#c4b5fd" opacity=".5">
            <animate attributeName="r" values="4;2;4" dur="4.5s" repeatCount="indefinite"/>
        </circle>
    </svg>
);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const ChatBox = () => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [isOpen,           setIsOpen]           = useState(false);
    const [users,            setUsers]            = useState([]);
    const [searchQuery,      setSearchQuery]      = useState('');
    const [selectedUser,     setSelectedUser]     = useState(null);
    const [messages,         setMessages]         = useState([]);
    const [messageText,      setMessageText]      = useState('');
    const [loadingUsers,     setLoadingUsers]     = useState(false);
    const [loadingMessages,  setLoadingMessages]  = useState(false);
    const [sending,          setSending]          = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);

    const showChatWidget =
        isAuthenticated && user &&
        location.pathname !== '/login' &&
        !location.pathname.includes('/chat');

    /* ── Data fetching ── */
    const fetchUsers = async (showLoader = false) => {
        if (!showChatWidget) return;
        if (showLoader) setLoadingUsers(true);
        try {
            const res = await api.get('/chat/users');
            if (res.data.status) setUsers(res.data.data || []);
        } catch (err) { console.error('Chat users fetch:', err); }
        finally { if (showLoader) setLoadingUsers(false); }
    };

    const fetchMessages = async (recipientId, showLoader = false) => {
        if (!showChatWidget) return;
        if (showLoader) setLoadingMessages(true);
        try {
            const res = await api.get(`/chat/messages/${recipientId}`);
            if (res.data.status) setMessages(res.data.data || []);
        } catch (err) { console.error('Chat messages fetch:', err); }
        finally { if (showLoader) setLoadingMessages(false); }
    };

    /* ── Polling ── */
    useEffect(() => {
        if (!showChatWidget) return;
        fetchUsers(true);
        const iv = setInterval(() => fetchUsers(false), 5000);
        return () => clearInterval(iv);
    }, [showChatWidget]);

    useEffect(() => {
        if (!showChatWidget || !selectedUser || !isOpen) return;
        fetchMessages(selectedUser.id, true);
        const iv = setInterval(() => fetchMessages(selectedUser.id, false), 2500);
        return () => clearInterval(iv);
    }, [showChatWidget, selectedUser, isOpen]);

    /* ── Scroll & focus ── */
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { if (selectedUser) setTimeout(() => inputRef.current?.focus(), 120); }, [selectedUser]);

    /* ── Derived ── */
    const totalUnread   = users.reduce((s, u) => s + (u.unread_count || 0), 0);
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    /* ── Send message ── */
    const handleSend = async (e) => {
        e.preventDefault();
        const text = messageText.trim();
        if (!text || !selectedUser) return;
        setSending(true);
        try {
            const res = await api.post('/chat/messages', { recipient_id: selectedUser.id, message: text });
            if (res.data.status) {
                setMessages(p => [...p, res.data.data]);
                setMessageText('');
                setUsers(p => p.map(u =>
                    u.id === selectedUser.id
                        ? { ...u, last_message: text, last_message_time: new Date().toISOString() }
                        : u
                ));
            }
        } catch { toast.error('Failed to send message'); }
        finally { setSending(false); }
    };

    /* ── Helpers ── */
    const fmtTime = (t) => {
        if (!t) return '';
        try {
            const d = new Date(t.replace(/-/g, '/'));
            const now = new Date();
            return d.toDateString() === now.toDateString()
                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    const initials = n => n ? n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() : 'U';

    const selectUser = (u) => {
        setSelectedUser(u);
        setSidebarCollapsed(true);
        setUsers(p => p.map(i => i.id === u.id ? { ...i, unread_count: 0 } : i));
    };

    const backToList = () => {
        setSelectedUser(null);
        setSidebarCollapsed(false);
        setMessages([]);
    };

    /* ── Date grouping ── */
    const groupByDate = (msgs) => {
        const out = []; let last = null;
        msgs.forEach(m => {
            const d = new Date((m.created_at || '').replace(/-/g, '/'));
            const ds = d.toDateString();
            if (ds !== last) {
                const now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
                out.push({
                    type: 'divider',
                    label: ds === now.toDateString() ? 'Today' : ds === y.toDateString() ? 'Yesterday'
                        : d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
                });
                last = ds;
            }
            out.push({ type: 'msg', data: m });
        });
        return out;
    };

    if (!showChatWidget) return null;

    /* ═══════════════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════════════ */
    return (
        <div className="fcw">

            {/* ══════════ PANEL ══════════ */}
            {isOpen && (
                <div className={`cp ${sidebarCollapsed ? 'cp--conv' : ''}`}>

                    {/* ── LEFT sidebar ── */}
                    <div className={`cs ${sidebarCollapsed ? 'cs--hidden' : ''}`}>

                        {/* Header */}
                        <div className="cs-hdr">
                            <div className="cs-hdr-title">
                                <MessageSquare size={16} />
                                <span>Team Chat</span>
                                {totalUnread > 0 && <span className="cs-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>}
                            </div>
                            <button className="chbtn" onClick={() => setIsOpen(false)}><X size={16} /></button>
                        </div>

                        {/* Search */}
                        <div className="cs-search">
                            <div className="cs-sw">
                                <Search className="cs-si" size={14} />
                                <input className="cs-inp" type="text" placeholder="Search colleagues..."
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                {searchQuery && <button className="cs-clr" onClick={() => setSearchQuery('')}><X size={12} /></button>}
                            </div>
                        </div>

                        {/* Contacts */}
                        <div className="cs-list">
                            {loadingUsers
                                ? <div className="cs-center"><LoadingSpinner /></div>
                                : filteredUsers.length === 0
                                    ? <div className="cs-empty"><MessageSquare size={26} opacity={.3} /><span>No colleagues found</span></div>
                                    : filteredUsers.map(u => (
                                        <div key={u.id}
                                            className={`cs-item ${selectedUser?.id === u.id ? 'cs-item--active' : ''}`}
                                            onClick={() => selectUser(u)}>
                                            <div className="cs-av-wrap">
                                                {u.avatar
                                                    ? <img src={getServerUrl(u.avatar)} alt={u.name} className="cs-av-img" />
                                                    : <div className="cs-av">{initials(u.name)}</div>}
                                                <div className="cs-dot" />
                                            </div>
                                            <div className="cs-info">
                                                <div className="cs-row1">
                                                    <span className="cs-name">{u.name}</span>
                                                    <span className="cs-time">{fmtTime(u.last_message_time)}</span>
                                                </div>
                                                <div className="cs-row2">
                                                    <span className="cs-prev">{u.last_message || <em className="cs-em">Start a conversation</em>}</span>
                                                    {u.unread_count > 0 && <span className="cs-ubadge">{u.unread_count}</span>}
                                                </div>
                                                <div className="cs-dept">{u.position || u.department || u.role}</div>
                                            </div>
                                        </div>
                                    ))
                            }
                        </div>
                    </div>

                    {/* ── RIGHT: conversation or welcome ── */}
                    <div className={`cc ${sidebarCollapsed ? 'cc--full' : ''}`}>

                        {selectedUser ? (
                            /* ════ CONVERSATION ════ */
                            <>
                                {/* Header */}
                                <div className="cc-hdr">
                                    <div className="cc-hdr-l">
                                        <button className="chbtn cc-back" onClick={backToList} title="Back">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="cs-av-wrap" style={{ width: 38, height: 38 }}>
                                            {selectedUser.avatar
                                                ? <img src={getServerUrl(selectedUser.avatar)} alt={selectedUser.name} className="cs-av-img" style={{ width: 38, height: 38 }} />
                                                : <div className="cs-av" style={{ width: 38, height: 38, fontSize: 13 }}>{initials(selectedUser.name)}</div>}
                                            <div className="cs-dot" />
                                        </div>
                                        <div>
                                            <div className="cc-name">{selectedUser.name}</div>
                                            <div className="cc-status"><span className="cc-sdot" />Online · {selectedUser.position || selectedUser.role}</div>
                                        </div>
                                    </div>
                                    <button className="chbtn" onClick={() => setIsOpen(false)}><X size={16} /></button>
                                </div>

                                {/* Messages */}
                                <div className="cc-msgs">
                                    {loadingMessages
                                        ? <div className="cs-center" style={{ paddingTop: 80 }}><LoadingSpinner /></div>
                                        : messages.length === 0
                                            ? <div className="cc-empty">
                                                <div className="cc-empty-ico"><MessageSquare size={28} /></div>
                                                <div className="cc-empty-t">No messages yet</div>
                                                <div className="cc-empty-s">Say hello to {selectedUser.name}!</div>
                                              </div>
                                            : groupByDate(messages).map((item, idx) => {
                                                if (item.type === 'divider')
                                                    return <div key={`d${idx}`} className="cc-date"><span>{item.label}</span></div>;
                                                const m = item.data, out = m.sender_id === user.id;
                                                return (
                                                    <div key={m.id} className={`cc-row ${out ? 'out' : 'inc'}`}>
                                                        {!out && (
                                                            <div className="cc-av">
                                                                {selectedUser.avatar
                                                                    ? <img src={getServerUrl(selectedUser.avatar)} alt="" />
                                                                    : <span>{initials(selectedUser.name)}</span>}
                                                            </div>
                                                        )}
                                                        <div className="cc-msg-wrap">
                                                            <div className="cc-bubble">{m.message}</div>
                                                            <div className="cc-meta">
                                                                <span>{fmtTime(m.created_at)}</span>
                                                                {out && <span className="cc-tick">
                                                                    {m.is_read
                                                                        ? <CheckCheck size={12} style={{ color: '#818cf8' }} />
                                                                        : <Check      size={12} style={{ color: '#94a3b8' }} />}
                                                                </span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    }
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="cc-inp-bar">
                                    <form className="cc-inp-form" onSubmit={handleSend}>
                                        <input ref={inputRef} type="text" className="cc-inp-field"
                                            placeholder={`Message ${selectedUser.name}...`}
                                            value={messageText} onChange={e => setMessageText(e.target.value)}
                                            disabled={sending} />
                                        <button type="submit" className="cc-send" disabled={!messageText.trim() || sending}>
                                            <Send size={15} />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (

                            /* ════ PREMIUM WELCOME SCREEN ════ */
                            <div className="wlc">

                                {/* Close */}
                                <button className="chbtn wlc-close" onClick={() => setIsOpen(false)}><X size={16} /></button>

                                {/* ── Animated background shapes ── */}
                                <div className="wlc-bg" aria-hidden="true">
                                    <div className="wlc-blob wlc-blob--1" />
                                    <div className="wlc-blob wlc-blob--2" />
                                    <div className="wlc-blob wlc-blob--3" />
                                    <div className="wlc-blob wlc-blob--4" />
                                    <div className="wlc-blob wlc-blob--5" />
                                    {/* Floating icons */}
                                    <span className="wlc-fi wlc-fi--1">💬</span>
                                    <span className="wlc-fi wlc-fi--2">✈️</span>
                                    <span className="wlc-fi wlc-fi--3">⭐</span>
                                    <span className="wlc-fi wlc-fi--4">✨</span>
                                    <span className="wlc-fi wlc-fi--5">🔵</span>
                                    <span className="wlc-fi wlc-fi--6">💜</span>
                                </div>

                                {/* ── Scrollable content ── */}
                                <div className="wlc-body">

                                    {/* 3-D Illustration */}
                                    <div className="wlc-illus">
                                        <div className="wlc-illus-glow" />
                                        <Illustration3D />
                                    </div>

                                    {/* Heading */}
                                    <h2 className="wlc-h">Welcome to Employee Chat&nbsp;👋</h2>

                                    {/* Subtitle */}
                                    <p className="wlc-sub">
                                        Connect, collaborate, and communicate with your colleagues in real time.
                                    </p>

                                    {/* Feature cards */}
                                    <div className="wlc-cards">
                                        {FEATURES.map((f, i) => (
                                            <div key={i} className="wlc-card" style={{ '--card-color': f.color, '--card-grad': f.gradient }}>
                                                <div className="wlc-card-ico">
                                                    <span className="wlc-card-emoji">{f.emoji}</span>
                                                </div>
                                                <div className="wlc-card-body">
                                                    <div className="wlc-card-title">{f.title}</div>
                                                    <div className="wlc-card-desc">{f.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tip box */}
                                    <div className="wlc-tip">
                                        <span className="wlc-tip-ico">💡</span>
                                        <span className="wlc-tip-txt">
                                            <strong>Tip:</strong> Select a colleague from the list to start a conversation.
                                        </span>
                                        <button className="wlc-tip-btn" aria-label="Select a colleague">
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>

                                </div>{/* end wlc-body */}
                            </div>
                            /* ════ end welcome ════ */
                        )}
                    </div>
                </div>
            )}

            {/* ── FAB ── */}
            <button className="chat-fab" onClick={() => navigate(`/${user?.role || 'employee'}/chat`)} title="Team Chat">
                <MessageSquare size={22} />
                {totalUnread > 0 && (
                    <span className="chat-fab-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
                )}
            </button>
        </div>
    );
};

export default ChatBox;

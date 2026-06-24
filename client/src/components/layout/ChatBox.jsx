import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, ArrowLeft, Search, Send, Check, CheckCheck } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import './ChatBox.css';

const ChatBox = () => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);

    // Hide chat box on login page and full chat pages
    const showChatWidget = isAuthenticated && user && location.pathname !== '/login' && !location.pathname.includes('/chat');

    // Fetch user list
    const fetchUsers = async (showLoader = false) => {
        if (!showChatWidget) return;
        if (showLoader) setLoadingUsers(true);
        try {
            const res = await api.get('/chat/users');
            if (res.data.status) {
                setUsers(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching chat widget users:', err);
        } finally {
            if (showLoader) setLoadingUsers(false);
        }
    };

    // Fetch message history
    const fetchMessages = async (recipientId, showLoader = false) => {
        if (!showChatWidget) return;
        if (showLoader) setLoadingMessages(true);
        try {
            const res = await api.get(`/chat/messages/${recipientId}`);
            if (res.data.status) {
                setMessages(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching chat widget messages:', err);
        } finally {
            if (showLoader) setLoadingMessages(false);
        }
    };

    // Fetch user list on mount & periodic polling
    useEffect(() => {
        if (!showChatWidget) return;
        fetchUsers(true);

        const interval = setInterval(() => {
            fetchUsers(false);
        }, 5000);

        return () => clearInterval(interval);
    }, [showChatWidget]);

    // Poll message list when a user is active
    useEffect(() => {
        if (!showChatWidget || !selectedUser || !isOpen) return;

        fetchMessages(selectedUser.id, true);

        const interval = setInterval(() => {
            fetchMessages(selectedUser.id, false);
        }, 2500);

        return () => clearInterval(interval);
    }, [showChatWidget, selectedUser, isOpen]);

    // Scroll to bottom when messages load
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Calculate total unread count
    const totalUnreadCount = users.reduce((sum, u) => sum + (u.unread_count || 0), 0);

    // Filtered users list
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Send a message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = messageText.trim();
        if (!text || !selectedUser) return;

        setSending(true);
        try {
            const res = await api.post('/chat/messages', {
                recipient_id: selectedUser.id,
                message: text
            });

            if (res.data.status) {
                const newMsg = res.data.data;
                setMessages(prev => [...prev, newMsg]);
                setMessageText('');
                
                // Update local preview immediately
                setUsers(prevUsers => 
                    prevUsers.map(u => 
                        u.id === selectedUser.id 
                            ? { ...u, last_message: text, last_message_time: new Date().toISOString() } 
                            : u
                    )
                );
            }
        } catch (err) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    // Format message time snippet
    const formatMessageTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            const date = new Date(timeStr.replace(/-/g, '/'));
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            if (isToday) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    const handleSelectUser = (u) => {
        setSelectedUser(u);
        // Clear unread count locally instantly
        setUsers(prev => 
            prev.map(item => item.id === u.id ? { ...item, unread_count: 0 } : item)
        );
    };

    if (!showChatWidget) return null;

    return (
        <div className="floating-chat-widget">
            {/* Expanded Chat Card */}
            {isOpen && (
                <div className="chat-card">
                    {/* Header */}
                    <div className="chat-card-header">
                        {selectedUser ? (
                            <div className="chat-card-header-userinfo">
                                <button className="chat-card-header-btn" onClick={() => setSelectedUser(null)}>
                                    <ArrowLeft size={16} />
                                </button>
                                <div>
                                    <div className="chat-card-title">{selectedUser.name}</div>
                                    <div className="chat-card-subtitle">{selectedUser.position || selectedUser.role}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="chat-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MessageSquare size={16} /> Team Chat
                            </div>
                        )}
                        <button className="chat-card-header-btn" onClick={() => setIsOpen(false)}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    {selectedUser ? (
                        <>
                            {/* Messages Container */}
                            <div className="chat-card-messages-container">
                                {loadingMessages ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                                        <LoadingSpinner />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '12.5px' }}>
                                        No messages yet. Say hello!
                                    </div>
                                ) : (
                                    messages.map(m => {
                                        const isOutgoing = m.sender_id === user.id;
                                        return (
                                            <div 
                                                key={m.id} 
                                                className={`chat-card-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
                                            >
                                                <div className="chat-card-msg-bubble">
                                                    {m.message}
                                                </div>
                                                <div className="chat-card-msg-time">
                                                    {formatMessageTime(m.created_at)}
                                                    {isOutgoing && (
                                                        <span>
                                                            {m.is_read ? (
                                                                <CheckCheck size={11} style={{ color: '#ffffff' }} />
                                                            ) : (
                                                                <Check size={11} />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input Panel */}
                            <div className="chat-card-input-pane">
                                <form className="chat-card-input-form" onSubmit={handleSendMessage}>
                                    <input 
                                        type="text"
                                        className="chat-card-input"
                                        placeholder="Type a message..."
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        disabled={sending}
                                    />
                                    <button 
                                        type="submit" 
                                        className="chat-card-send-btn"
                                        disabled={!messageText.trim() || sending}
                                    >
                                        <Send size={14} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Search bar */}
                            <div className="chat-card-search-container">
                                <div className="chat-card-search-wrapper">
                                    <Search className="chat-card-search-icon" size={14} />
                                    <input 
                                        type="text"
                                        className="chat-card-search-input"
                                        placeholder="Search colleagues..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* User List */}
                            <div className="chat-card-users-list">
                                {loadingUsers ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                                        <LoadingSpinner />
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="chat-card-empty">No colleagues found</div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <div 
                                            key={u.id}
                                            className="chat-card-user-item"
                                            onClick={() => handleSelectUser(u)}
                                        >
                                            <div className="chat-card-avatar-container">
                                                <div className="chat-card-avatar">
                                                    {getInitials(u.name)}
                                                </div>
                                                <div className="chat-card-online-badge" />
                                            </div>
                                            <div className="chat-card-user-info">
                                                <div className="chat-card-user-top">
                                                    <div className="chat-card-user-name">{u.name}</div>
                                                    <div className="chat-card-user-time">{formatMessageTime(u.last_message_time)}</div>
                                                </div>
                                                <div className="chat-card-user-bottom">
                                                    <div className="chat-card-last-msg">
                                                        {u.last_message || "Start a conversation"}
                                                    </div>
                                                    {u.unread_count > 0 && (
                                                        <span className="chat-card-unread-badge">{u.unread_count}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Circular FAB */}
            <button className="chat-fab" onClick={() => setIsOpen(!isOpen)}>
                <MessageSquare size={24} />
                {totalUnreadCount > 0 && (
                    <span className="chat-fab-badge">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default ChatBox;

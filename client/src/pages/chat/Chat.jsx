import React, { useEffect, useState, useRef } from 'react';
import { Search, Send, MessageSquare, ArrowLeft, Check, CheckCheck, UserCircle } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import './Chat.css';

const Chat = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Fetch users list
    const fetchUsers = async (showLoader = false) => {
        if (showLoader) setLoadingUsers(true);
        try {
            const res = await api.get('/chat/users');
            if (res.data.status) {
                setUsers(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching chat users:', err);
        } finally {
            if (showLoader) setLoadingUsers(false);
        }
    };

    // Fetch messages list
    const fetchMessages = async (recipientId, showLoader = false) => {
        if (showLoader) setLoadingMessages(true);
        try {
            const res = await api.get(`/chat/messages/${recipientId}`);
            if (res.data.status) {
                setMessages(res.data.data || []);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            if (showLoader) setLoadingMessages(false);
        }
    };

    // Initial load of users
    useEffect(() => {
        fetchUsers(true);

        // Poll for user list updates (e.g., new messages, last message updates)
        const userInterval = setInterval(() => {
            fetchUsers(false);
        }, 4000);

        return () => clearInterval(userInterval);
    }, []);

    // Load messages when selected user changes
    useEffect(() => {
        if (!selectedUser) {
            setMessages([]);
            return;
        }

        fetchMessages(selectedUser.id, true);

        // Poll messages for active conversation
        const msgInterval = setInterval(() => {
            fetchMessages(selectedUser.id, false);
        }, 2500);

        return () => clearInterval(msgInterval);
    }, [selectedUser]);

    // Scroll to bottom when messages load or change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Filter users list based on search query
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.position && u.position.toLowerCase().includes(searchQuery.toLowerCase()))
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
                // Add the sent message to state immediately for real-time feel
                const newMsg = res.data.data;
                setMessages(prev => [...prev, newMsg]);
                setMessageText('');
                
                // Instantly update user list last message preview
                setUsers(prevUsers => 
                    prevUsers.map(u => 
                        u.id === selectedUser.id 
                            ? { ...u, last_message: text, last_message_time: new Date().toISOString() } 
                            : u
                    )
                );
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    // Format message time
    const formatMessageTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            const date = new Date(timeStr.replace(/-/g, '/'));
            const now = new Date();
            
            // Format to today/yesterday/date
            const isToday = date.toDateString() === now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const isYesterday = date.toDateString() === yesterday.toDateString();

            if (isToday) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (isYesterday) {
                return 'Yesterday';
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch (e) {
            return '';
        }
    };

    // Get avatar placeholder letters
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="fade-in" style={{ height: '100%' }}>
            <div className={`chat-container ${selectedUser ? 'chat-active' : ''}`}>
                
                {/* Chat Sidebar (User List) */}
                <div className="chat-sidebar">
                    <div className="chat-sidebar-header">
                        <h2>Chats</h2>
                        <div className="chat-search-wrapper">
                            <Search className="chat-search-icon" size={16} />
                            <input 
                                type="text"
                                className="chat-search-input"
                                placeholder="Search colleagues..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="chat-users-list">
                        {loadingUsers ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                                <LoadingSpinner />
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '13.5px' }}>
                                No colleagues found
                            </div>
                        ) : (
                            filteredUsers.map(u => {
                                const isSelected = selectedUser?.id === u.id;
                                return (
                                    <div 
                                        key={u.id}
                                        className={`chat-user-item ${isSelected ? 'active' : ''}`}
                                        onClick={() => setSelectedUser(u)}
                                    >
                                        <div className="chat-avatar-container">
                                            {u.avatar ? (
                                                <img 
                                                    src={u.avatar} 
                                                    alt={u.name} 
                                                    className="chat-user-avatar"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                            ) : null}
                                            <div className="chat-user-avatar chat-user-avatar-default" style={{ display: u.avatar ? 'none' : 'flex' }}>
                                                {getInitials(u.name)}
                                            </div>
                                            {/* online status mock */}
                                            <div className="chat-online-badge"></div>
                                        </div>

                                        <div className="chat-user-details">
                                            <div className="chat-user-meta-top">
                                                <div className="chat-user-name">{u.name}</div>
                                                <div className="chat-user-time">{formatMessageTime(u.last_message_time)}</div>
                                            </div>
                                            <div className="chat-user-meta-bottom">
                                                <div className="chat-last-msg">
                                                    {u.last_message || "Start a conversation"}
                                                </div>
                                                {u.unread_count > 0 && (
                                                    <span className="chat-unread-badge">{u.unread_count}</span>
                                                )}
                                            </div>
                                            <div className="chat-user-role-dept">
                                                {u.position || u.role} {u.department ? `• ${u.department}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Main Messages Pane */}
                <div className="chat-main-pane">
                    {selectedUser ? (
                        <>
                            {/* Chat Pane Header */}
                            <div className="chat-pane-header">
                                <div className="chat-header-userinfo">
                                    <button className="chat-back-btn" onClick={() => setSelectedUser(null)}>
                                        <ArrowLeft size={20} />
                                    </button>
                                    
                                    <div className="chat-avatar-container" style={{ marginRight: 10 }}>
                                        {selectedUser.avatar ? (
                                            <img 
                                                src={selectedUser.avatar} 
                                                alt={selectedUser.name} 
                                                className="chat-user-avatar"
                                                style={{ width: 38, height: 38 }}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className="chat-user-avatar chat-user-avatar-default" style={{ display: selectedUser.avatar ? 'none' : 'flex', width: 38, height: 38, fontSize: '14px' }}>
                                            {getInitials(selectedUser.name)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="chat-header-title">{selectedUser.name}</div>
                                        <div className="chat-header-subtitle">
                                            {selectedUser.position || selectedUser.role} {selectedUser.department ? `| ${selectedUser.department}` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="chat-messages-container" ref={messagesContainerRef}>
                                {loadingMessages ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                        <LoadingSpinner />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        <MessageSquare size={36} style={{ marginBottom: 10, opacity: 0.6 }} />
                                        <div style={{ fontSize: '14px' }}>No messages yet. Say hello!</div>
                                    </div>
                                ) : (
                                    messages.map(m => {
                                        const isOutgoing = m.sender_id === user?.id;
                                        return (
                                            <div 
                                                key={m.id}
                                                className={`chat-message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
                                            >
                                                <div className="chat-bubble">
                                                    {m.message}
                                                </div>
                                                <div className="chat-msg-time">
                                                    {formatMessageTime(m.created_at)}
                                                    {isOutgoing && (
                                                        <span className="chat-msg-status">
                                                            {m.is_read ? (
                                                                <CheckCheck size={13} style={{ color: 'var(--primary)' }} />
                                                            ) : (
                                                                <Check size={13} />
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

                            {/* Chat Input Bar */}
                            <div className="chat-input-pane">
                                <form className="chat-input-form" onSubmit={handleSendMessage}>
                                    <input 
                                        type="text"
                                        className="chat-text-input"
                                        placeholder="Type your message here..."
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        disabled={sending}
                                    />
                                    <button 
                                        type="submit" 
                                        className="chat-send-btn"
                                        disabled={!messageText.trim() || sending}
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        /* Empty State placeholder */
                        <div className="chat-empty-state">
                            <div className="chat-empty-icon-wrapper">
                                <MessageSquare size={36} />
                            </div>
                            <h3>Start Messaging</h3>
                            <p>Select a colleague from the list on the left to begin a conversation.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Chat;

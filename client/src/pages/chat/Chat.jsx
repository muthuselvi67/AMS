import React, { useEffect, useState, useRef } from 'react';
import { Search, Send, MessageSquare, ArrowLeft, Check, CheckCheck, ChevronLeft, Users, Bell, Lock, HelpCircle, Shield, ArrowRight, MoreVertical, MessageCircle, CircleDashed, Filter, Plus, Smile, Paperclip, Mic, FileText, Image as ImageIcon, Camera, User as UserIcon, BarChart2, Pencil, X } from 'lucide-react';
import api, { getServerUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import './Chat.css';

/* ═══════════════════════════════════════════════════════════
   FEATURE CARDS DATA
═══════════════════════════════════════════════════════════ */
const FEATURES = [
    {
        icon: <MessageSquare size={24} />,
        emoji: '💬',
        title: 'Real-time Messaging',
        desc: 'Instant messaging with your colleagues anytime, anywhere.',
        color: '#6366f1', // Indigo
        gradient: 'linear-gradient(135deg,#6366f1 0%,#818cf8 100%)',
    },
    {
        icon: <Users size={24} />,
        emoji: '👥',
        title: 'Team Collaboration',
        desc: 'Work together, share ideas, and improve productivity.',
        color: '#22c55e', // Green
        gradient: 'linear-gradient(135deg,#22c55e 0%,#4ade80 100%)',
    },
    {
        icon: <Bell size={24} />,
        emoji: '🔔',
        title: 'Instant Notifications',
        desc: 'Receive notifications for new messages and updates.',
        color: '#f97316', // Orange
        gradient: 'linear-gradient(135deg,#f97316 0%,#fb923c 100%)',
    },
    {
        icon: <Shield size={24} />,
        emoji: '🔒',
        title: 'Secure & Private',
        desc: 'All conversations are encrypted and protected.',
        color: '#3b82f6', // Blue
        gradient: 'linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)',
    },
];

/* ═══════════════════════════════════════════════════════════
   PREMIUM 3-D CHAT ILLUSTRATION (pure SVG)
═══════════════════════════════════════════════════════════ */
const Illustration3D = () => (
    <svg viewBox="0 -30 320 260" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}>
        <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3e8ff" />
                <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ddd6fe" />
                <stop offset="100%" stopColor="#ede9fe" />
            </linearGradient>
            <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#8b5cf6" floodOpacity="0.35" />
            </filter>
            <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.12" />
            </filter>
        </defs>

        {/* ── Ground shadow / glow ── */}
        <ellipse cx="160" cy="210" rx="110" ry="16" fill="url(#gS)" />

        {/* ── Plant Base ── */}
        <g transform="translate(10, 100)">
            <path d="M40 90 Q30 50 10 30 Q30 50 40 70 Z" fill="#c4b5fd" opacity="0.8" />
            <path d="M40 90 Q50 40 60 20 Q45 45 40 70 Z" fill="#a78bfa" opacity="0.9" />
            <path d="M40 90 Q35 60 20 40 Q35 55 40 75 Z" fill="#8b5cf6" opacity="0.85" />
            <path d="M40 90 Q45 50 50 30 Q45 55 40 80 Z" fill="#7c3aed" opacity="0.8" />
            <path d="M26 90 L54 90 L48 115 L32 115 Z" fill="#a78bfa" />
            <path d="M26 90 L54 90 L51 98 L29 98 Z" fill="#8b5cf6" />
        </g>

        {/* ── Back bubble (white) ── */}
        <g filter="url(#shadow2)">
            <rect x="180" y="80" width="100" height="60" rx="30" fill="url(#g2)" />
            <polygon points="260,135 270,155 240,138" fill="#ffffff" />
            {/* Inner lines */}
            <rect x="200" y="100" width="60" height="6" rx="3" fill="#a78bfa" />
            <rect x="200" y="114" width="40" height="6" rx="3" fill="#a78bfa" />
        </g>

        {/* ── Front bubble (purple) ── */}
        <g filter="url(#shadow)">
            <rect x="100" y="30" width="140" height="90" rx="45" fill="url(#g1)" />
            <polygon points="120,110 100,140 145,115" fill="#8b5cf6" />
            {/* Dots inside */}
            <circle cx="140" cy="75" r="8" fill="#ffffff" />
            <circle cx="170" cy="75" r="8" fill="#ffffff" />
            <circle cx="200" cy="75" r="8" fill="#ffffff" />
        </g>

        {/* ── Decorative circles & icons ── */}
        <circle cx="50" cy="40" r="14" fill="#ddd6fe" opacity="0.8" />
        <circle cx="270" cy="45" r="22" fill="#ffffff" filter="url(#shadow2)" />
        <path d="M266 40 L274 40 C276 40 277 41 277 43 L277 48 C277 50 276 51 274 51 L266 51 C264 51 263 50 263 48 L263 43 C263 41 264 40 266 40 Z" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <path d="M270 38 L270 40 M265 51 L262 54 M275 51 L278 54 M270 51 L270 53" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />

        <circle cx="280" cy="110" r="18" fill="#a78bfa" opacity="0.6" />
        <circle cx="270" cy="180" r="16" fill="#8b5cf6" opacity="0.5" />
        <path d="M265 175 L275 175 M270 170 L270 180" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

        {/* ── Paper plane ── */}
        <g transform="translate(230, 20) rotate(15)">
            <polygon points="10,0 40,10 10,20 15,10" fill="#a78bfa" />
            <path d="M15 10 L40 10" stroke="#ffffff" strokeWidth="1" />
            {/* Flight trail */}
            <path d="M-50 40 C-30 40 -10 20 5 15" stroke="#ddd6fe" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
        </g>

        {/* ── Floating stars/crosses ── */}
        <path d="M140 10 L140 20 M135 15 L145 15" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
        <path d="M220 5 L220 15 M215 10 L225 10" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
        <path d="M80 140 L80 150 M75 145 L85 145" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
        <path d="M280 80 L280 86 M277 83 L283 83" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M310 120 L310 128 M306 124 L314 124" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

// Simple Emoji List
const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"];

const Chat = () => {
    const { user, updateUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    
    // Sidebar view state
    const [sidebarView, setSidebarView] = useState('default');
    
    // Profile Edit states
    const profilePhotoInputRef = useRef(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAbout, setEditAbout] = useState('');

    useEffect(() => {
        if (user) {
            setEditName(user.chatName || user.name || '');
            setEditAbout(user.chatAbout || user.about || 'Available');
        }
    }, [user]);

    const handleSaveProfile = async (field) => {
        try {
            const updateData = {
                name: field === 'name' ? editName : (user.chatName || user.name),
                about: field === 'about' ? editAbout : (user.chatAbout || user.about || 'Available')
            };
            const response = await api.put(`/chat/profile`, updateData);
            if (response.data?.status || response.data?.success || response.status === 200) {
                updateUser({ chatName: updateData.name, chatAbout: updateData.about });
                if (field === 'name') setIsEditingName(false);
                if (field === 'about') setIsEditingAbout(false);
                toast.success('Profile updated');
            }
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;
            // Show preview immediately in chatAvatar
            updateUser({ chatAvatar: base64Image });
            try {
                const response = await api.put(`/chat/profile`, {
                    avatar: base64Image
                });
                if (response.data?.status || response.data?.success || response.status === 200) {
                    const updatedAvatar = response.data?.data?.user?.avatar || response.data?.user?.avatar || base64Image;
                    // Update only chatAvatar so main AMS profile remains untouched
                    updateUser({ chatAvatar: updatedAvatar });
                    toast.success('Profile photo updated');
                }
            } catch (err) {
                toast.error('Failed to update profile photo');
            }
        };
        reader.readAsDataURL(file);
    };
    
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    // Dropdown states
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Camera states
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [showSidebarMenu, setShowSidebarMenu] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);

    // Poll states
    const [showPollModal, setShowPollModal] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);

    // Menu Action States
    const [showContactInfoModal, setShowContactInfoModal] = useState(false);
    const [actionMode, setActionMode] = useState(null); // 'edit' or 'delete'

    // Voice Recording States
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const autoScrollRef = useRef(true);
    const prevUserRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const photoInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

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
        const userInterval = setInterval(() => fetchUsers(false), 4000);
        return () => clearInterval(userInterval);
    }, []);

    // Load messages when selected user changes
    useEffect(() => {
        if (!selectedUser) {
            setMessages([]);
            return;
        }
        fetchMessages(selectedUser.id, true);
        const msgInterval = setInterval(() => fetchMessages(selectedUser.id, false), 2500);
        return () => clearInterval(msgInterval);
    }, [selectedUser]);

    // Scroll to bottom when messages load or change
    useEffect(() => {
        if (selectedUser?.id !== prevUserRef.current) {
            autoScrollRef.current = true;
            prevUserRef.current = selectedUser?.id;
        }
        if (autoScrollRef.current && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [messages, selectedUser]);

    // Auto-focus input when conversation opens
    useEffect(() => {
        if (selectedUser && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [selectedUser]);

    // Filter users list based on search query and active filter
    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.last_message && u.last_message.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeFilter === 'Unread') return u.unread_count > 0;
        if (activeFilter === 'Favourites') return u.is_favourite; // Or some other logic, assume none match if field doesn't exist

        return true;
    });

    // Send a message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = messageText.trim();
        if (!text || !selectedUser) return;

        setSending(true);
        autoScrollRef.current = true; // force scroll down for own message
        try {
            const res = await api.post('/chat/messages', {
                recipient_id: selectedUser.id,
                message: text
            });

            if (res.data.status) {
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

    // Handle File Upload
    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return;

        setSending(true);
        try {
            // 1. Upload the file
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (!uploadRes.data.status) throw new Error("Upload failed");

            const fileUrl = uploadRes.data.data.url;
            const fileName = uploadRes.data.data.name;
            const text = `[attachment:${fileUrl}:${fileName}]`;

            // 2. Send the message
            const res = await api.post('/chat/messages', {
                recipient_id: selectedUser.id,
                message: text
            });

            if (res.data.status) {
                const newMsg = res.data.data;
                setMessages(prev => [...prev, newMsg]);

                // Instantly update user list last message preview
                const previewText = type === 'Photo/Video' ? '📷 Photo' : '📎 Document';
                setUsers(prevUsers =>
                    prevUsers.map(u =>
                        u.id === selectedUser.id
                            ? { ...u, last_message: previewText, last_message_time: new Date().toISOString() }
                            : u
                    )
                );
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload file');
        } finally {
            setSending(false);
            setShowAttachMenu(false);
        }
    };

    // Handle Clear Messages / Delete Chat
    const handleClearMessages = async (closeChat = false) => {
        if (!selectedUser) return;
        
        if (!window.confirm(`Are you sure you want to ${closeChat ? 'delete this chat' : 'clear all messages'}?`)) {
            return;
        }

        try {
            const res = await api.delete(`/chat/messages/${selectedUser.id}`);
            if (res.data.status || res.status === 200) {
                toast.success('Messages cleared');
                setMessages([]);
                setUsers(prevUsers => prevUsers.map(u =>
                    u.id === selectedUser.id ? { ...u, last_message: '', last_message_time: null } : u
                ));
                if (closeChat) {
                    setSelectedUser(null);
                }
            }
        } catch (err) {
            toast.error('Failed to clear messages');
        }
        setShowChatMenu(false);
    };

    // Voice Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                const formData = new FormData();
                formData.append('file', audioBlob, `VoiceMessage_${Date.now()}.webm`);
                
                setSending(true);
                try {
                    const res = await api.post('/chat/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (res.data.status) {
                        const url = res.data.data.url;
                        const filename = res.data.data.name;
                        
                        const msgRes = await api.post('/chat/messages', {
                            recipient_id: selectedUser.id,
                            message: `[attachment:${url}:${filename}]`
                        });
                        
                        if (msgRes.data.status) {
                            setMessages(prev => [...prev, msgRes.data.data]);
                            setUsers(prev => prev.map(u => 
                                u.id === selectedUser.id 
                                    ? { ...u, last_message: `🎤 Voice Message`, last_message_time: msgRes.data.data.created_at } 
                                    : u
                            ));
                        }
                    }
                } catch(err) {
                    toast.error('Failed to send voice message');
                } finally {
                    setSending(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            
            timerIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch(err) {
            toast.error("Microphone access denied or unavailable");
        }
    };

    const stopRecording = (cancel = false) => {
        if (mediaRecorderRef.current && isRecording) {
            if (cancel) {
                mediaRecorderRef.current.onstop = () => {
                    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                };
            }
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleMessageClick = async (m) => {
        if (!actionMode) return;
        
        if (m.sender_id !== user?.id) {
            toast.error(`You can only ${actionMode} your own messages`);
            setActionMode(null);
            return;
        }

        if (actionMode === 'delete') {
            if (window.confirm("Are you sure you want to delete this message?")) {
                try {
                    const res = await api.delete(`/chat/message/${m.id}`);
                    if (res.data.status || res.status === 200) {
                        toast.success("Message deleted");
                        if (selectedUser) fetchMessages(selectedUser.id);
                    }
                } catch(err) {
                    toast.error("Failed to delete message");
                }
            }
        } else if (actionMode === 'edit') {
            const newText = window.prompt("Edit your message:", m.message);
            if (newText !== null && newText.trim() !== '' && newText !== m.message) {
                try {
                    const res = await api.put(`/chat/message/${m.id}`, { message: newText.trim() });
                    if (res.data.status || res.status === 200) {
                        toast.success("Message updated");
                        if (selectedUser) fetchMessages(selectedUser.id);
                    }
                } catch(err) {
                    toast.error("Failed to update message");
                }
            }
        }
        setActionMode(null);
    };

    // Handle Web Camera
    const openCamera = async () => {
        setShowAttachMenu(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            setShowCamera(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            toast.error("Could not access camera. Please check permissions.");
        }
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current || !selectedUser) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to file
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });

            closeCamera();
            setSending(true);
            try {
                const formData = new FormData();
                formData.append('file', file);

                const uploadRes = await api.post('/chat/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (!uploadRes.data.status) throw new Error("Upload failed");

                const fileUrl = uploadRes.data.data.url;
                const fileName = uploadRes.data.data.name;
                const text = `[attachment:${fileUrl}:${fileName}]`;

                const res = await api.post('/chat/messages', {
                    recipient_id: selectedUser.id,
                    message: text
                });

                if (res.data.status) {
                    const newMsg = res.data.data;
                    setMessages(prev => [...prev, newMsg]);
                    setUsers(prevUsers => prevUsers.map(u =>
                        u.id === selectedUser.id ? { ...u, last_message: '📷 Photo', last_message_time: new Date().toISOString() } : u
                    ));
                }
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to upload photo');
            } finally {
                setSending(false);
            }
        }, 'image/jpeg', 0.9);
    };

    // Handle Poll Creation
    const sendPoll = async () => {
        const question = pollQuestion.trim();
        const validOptions = pollOptions.map(o => o.trim()).filter(o => o !== '');

        if (!question) {
            toast.error("Please enter a question.");
            return;
        }
        if (validOptions.length < 2) {
            toast.error("Please enter at least 2 options.");
            return;
        }

        const pollData = {
            question,
            options: validOptions
        };

        const text = `[poll:${JSON.stringify(pollData)}]`;

        setSending(true);
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['', '']);

        try {
            const res = await api.post('/chat/messages', {
                recipient_id: selectedUser.id,
                message: text
            });

            if (res.data.status) {
                const newMsg = res.data.data;
                setMessages(prev => [...prev, newMsg]);
                setUsers(prevUsers => prevUsers.map(u =>
                    u.id === selectedUser.id ? { ...u, last_message: '📊 Poll', last_message_time: new Date().toISOString() } : u
                ));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send poll');
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
            const isToday = date.toDateString() === now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const isYesterday = date.toDateString() === yesterday.toDateString();

            if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (isYesterday) return 'Yesterday';
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    };

    // Handle casting a vote
    const handleVote = async (messageId, optionIndex) => {
        try {
            const res = await api.post('/chat/vote', {
                message_id: messageId,
                option_index: optionIndex
            });
            if (res.data.status) {
                // Instantly update UI by modifying the messages state
                setMessages(prev => prev.map(m => {
                    if (m.id === messageId) {
                        // Remove user's previous vote if any
                        const newVotes = (m.votes || []).filter(v => v.user_id !== user.id);
                        // Add new vote
                        newVotes.push({ user_id: user.id, option_index: optionIndex });
                        return { ...m, votes: newVotes };
                    }
                    return m;
                }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cast vote');
        }
    };

    // URL-encode a file path while preserving slashes
    const encodeFilePath = (filePath) => {
        return filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    };

    // Format last_message for sidebar preview (convert attachment tags to friendly text)
    const formatLastMessage = (msg) => {
        if (!msg) return 'Start a conversation';
        if (msg.startsWith('[attachment:')) {
            const fnMatch = msg.match(/\[attachment:.+:([^:]+)\]$/);
            if (fnMatch) {
                const fn = fnMatch[1];
                if (/\.(jpg|jpeg|png|gif|webp)$/i.test(fn)) return '📷 Photo';
                if (/\.(mp3|wav|ogg|webm|m4a)$/i.test(fn)) return '🎤 Voice Message';
                return '📎 Document';
            }
            return '📎 Document';
        }
        if (msg.startsWith('[poll:')) return '📊 Poll';
        return msg;
    };



    // Render message content (handles attachments and polls)
    const renderMessageContent = (mObj) => {
        const message = mObj.message;
        // Use greedy first group to capture the full URL (last colon is the separator)
        const attachmentRegex = /^\[attachment:(.+):([^:]+)\]$/;
        const attachMatch = message.match(attachmentRegex);
        if (attachMatch) {
            const rawPath = attachMatch[1];
            const filename = attachMatch[2];
            // URL-encode the path to handle spaces and special characters in filenames
            const encodedPath = encodeFilePath(rawPath);
            const url = getServerUrl(encodedPath);
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

            if (isImage) {
                return (
                    <div style={{ position: 'relative', maxWidth: '280px', borderRadius: '8px', overflow: 'hidden', display: 'inline-block' }}>
                        <img
                            src={url}
                            alt={filename}
                            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                );
            } else if (/\.(mp3|wav|ogg|webm|m4a)$/i.test(filename)) {
                return (
                    <div style={{ padding: '4px 0 20px 0', minWidth: '240px' }}>
                        <audio controls src={url} style={{ height: '44px', width: '100%', outline: 'none', borderRadius: '22px' }} />
                    </div>
                );
            } else {
                return (
                    <div style={{ paddingBottom: '20px' }}>
                        <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit', textDecoration: 'none', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px', minWidth: '180px' }}>
                            <FileText size={24} color="#6366f1" />
                            <span style={{ wordBreak: 'break-all', fontSize: '14px' }}>{filename}</span>
                        </a>
                    </div>
                );
            }
        }

        const pollRegex = /^\[poll:(.*)\]$/;
        const pollMatch = message.match(pollRegex);
        if (pollMatch) {
            try {
                const pollData = JSON.parse(pollMatch[1]);
                const votes = mObj.votes || [];
                const totalVotes = votes.length;
                const userVote = votes.find(v => v.user_id === user?.id)?.option_index;

                return (
                    <div className="wa-poll-bubble">
                        <div className="wa-poll-question">
                            <BarChart2 size={18} color="#00a884" style={{ flexShrink: 0 }} />
                            <span>{pollData.question}</span>
                        </div>
                        <div className="wa-poll-options">
                            {pollData.options.map((opt, idx) => {
                                const optionVotes = votes.filter(v => v.option_index === idx).length;
                                const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                                const isSelected = userVote === idx;

                                return (
                                    <div
                                        key={idx}
                                        className="wa-poll-option-row"
                                        onClick={() => handleVote(mObj.id, idx)}
                                    >
                                        <div className={`wa-poll-radio ${isSelected ? 'selected' : ''}`}>
                                            {isSelected && <div className="wa-poll-radio-inner" />}
                                        </div>
                                        <div className="wa-poll-option-content">
                                            <div className="wa-poll-option-text">
                                                <span>{opt}</span>
                                                {optionVotes > 0 && <span className="wa-poll-option-count">{optionVotes}</span>}
                                            </div>
                                            <div className="wa-poll-progress-bar">
                                                <div className="wa-poll-progress-fill" style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="wa-poll-footer">
                            View votes
                        </div>
                    </div>
                );
            } catch (e) {
                // Fallback if parsing fails
            }
        }

        return (
            <>
                <span className="chat-bubble-text">{message}</span>
                <span className="chat-bubble-spacer" />
            </>
        );
    };

    // Group messages by date
    const groupMessagesByDate = (msgs) => {
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

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length > 1) return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="fade-in" style={{ height: '100%' }}>
            <div className={`chat-container ${selectedUser ? 'chat-active' : ''}`}>

                {/* ════════════════════════════════════════════════════════════
                    CHAT SIDEBAR (User List)
                ════════════════════════════════════════════════════════════ */}
                <div className="chat-sidebar">
                    <div className="wa-sidebar-header" style={{ background: '#ffffff', borderBottom: 'none', padding: '20px 20px 10px 20px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
                            Chats
                        </div>
                        <div className="wa-header-avatar" onClick={() => setSidebarView('profile')} style={{ cursor: 'pointer', border: '2px solid transparent', transition: 'border 0.2s', borderRadius: '50%' }} title="Edit Chat Profile">
                            {(user?.chatAvatar || user?.avatar) ? (
                                <img
                                    src={(() => {
                                        const src = user.chatAvatar || user.avatar;
                                        return src.startsWith('data:') ? src : getServerUrl(src);
                                    })()}
                                    alt={user.chatName || user.name}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                            ) : null}
                            <div className="chat-user-avatar chat-user-avatar-default" style={{ display: (user?.chatAvatar || user?.avatar) ? 'none' : 'flex', width: 40, height: 40, fontSize: '15px' }}>
                                {getInitials(user?.chatName || user?.name)}
                            </div>
                        </div>
                    </div>

                    {sidebarView === 'default' ? (
                        <>
                            <div className="wa-search-container" style={{ borderBottom: '1px solid transparent', padding: '10px 20px 20px 20px' }}>
                                <div className="chat-search-wrapper" style={{ borderRadius: '10px', padding: '10px 14px' }}>
                                    <Search className="chat-search-icon" size={18} />
                                    <input
                                        type="text"
                                        className="chat-search-input"
                                        placeholder="Search colleagues..."
                                        spellCheck="false"
                                        style={{ padding: '0 0 0 34px', fontSize: '15px' }}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                                            <X size={16} color="#94a3b8" />
                                        </button>
                                    )}
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
                                                    src={u.avatar.startsWith('data:') ? u.avatar : getServerUrl(u.avatar)}
                                                    alt={u.name}
                                                    className="chat-user-avatar"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                            ) : null}
                                            <div className="chat-user-avatar chat-user-avatar-default" style={{ display: u.avatar ? 'none' : 'flex' }}>
                                                {getInitials(u.name)}
                                            </div>
                                            <div className="chat-online-badge"></div>
                                        </div>

                                        <div className="chat-user-details">
                                            <div className="chat-user-meta-top">
                                                <div className="chat-user-name">{u.name}</div>
                                                <div className="chat-user-time">{formatMessageTime(u.last_message_time)}</div>
                                            </div>
                                            <div className="chat-user-meta-bottom">
                                                <div className="chat-last-msg">
                                                    <span>{formatLastMessage(u.last_message)}</span>
                                                </div>
                                                {u.unread_count > 0 && (
                                                    <span className="chat-unread-badge">{u.unread_count}</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#8696a0', marginTop: '3px' }}>
                                                {u.position || u.role} {u.department ? `• ${u.department}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                        </>
                    ) : (
                        <div className="wa-sidebar-secondary-view fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div className="wa-sidebar-secondary-header" style={{ background: 'var(--primary-dark, #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', gap: '20px', padding: '20px 15px', height: 'auto', flexShrink: 0 }}>
                                <button className="wa-icon-btn" style={{ color: 'white' }} onClick={() => setSidebarView('default')}><ArrowLeft size={20} color="white" /></button>
                                <span style={{ fontSize: '18px', fontWeight: '500' }}>
                                    {sidebarView === 'profile' && 'Profile'}
                                    {sidebarView === 'archived' && 'Archived'}
                                    {sidebarView === 'starred' && 'Starred messages'}
                                    {sidebarView === 'settings' && 'Settings'}
                                </span>
                            </div>
                            <div className="wa-secondary-content" style={{ padding: '20px', overflowY: 'auto', flexGrow: 1 }}>
                                {sidebarView === 'profile' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                        <div 
                                            className="profile-avatar-container" 
                                            onClick={() => profilePhotoInputRef.current?.click()}
                                            style={{ position: 'relative', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', width: 150, height: 150 }}
                                        >
                                            <input 
                                                type="file" 
                                                ref={profilePhotoInputRef} 
                                                style={{ display: 'none' }} 
                                                accept="image/*" 
                                                onChange={handleAvatarChange} 
                                            />
                                            {(user?.chatAvatar || user?.avatar) ? (
                                                <img
                                                    src={(() => {
                                                        const src = user.chatAvatar || user.avatar;
                                                        return src.startsWith('data:') ? src : getServerUrl(src);
                                                    })()}
                                                    alt={user.chatName || user.name}
                                                    style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover' }}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="chat-user-avatar-default" style={{ width: 150, height: 150, borderRadius: '50%', fontSize: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                                                    {getInitials(user?.chatName || user?.name)}
                                                </div>
                                            )}
                                            <div style={{
                                                position: 'absolute', bottom: 5, right: 5, 
                                                background: '#008069', color: 'white', 
                                                width: 36, height: 36, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                                border: '2px solid white'
                                            }}>
                                                <Plus size={20} />
                                            </div>
                                        </div>
                                        <div className="chat-profile-card">
                                            <div className="chat-profile-card-label">Your name</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {isEditingName ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', borderBottom: '2px solid var(--primary, #7c3aed)' }}>
                                                            <input 
                                                                type="text" 
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                autoFocus
                                                                className="chat-profile-input"
                                                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '17px', padding: '5px 0' }}
                                                            />
                                                        <button className="wa-icon-btn" onClick={() => handleSaveProfile('name')}><Check size={20} color="#008069" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="chat-profile-value">{user?.chatName || user?.name || 'User'}</div>
                                                        <button className="wa-icon-btn" onClick={() => setIsEditingName(true)}><Pencil size={20} color="#8696a0" /></button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="chat-profile-hint">This is not your username or pin. This name will be visible to your AMS contacts.</div>
                                        </div>
                                        <div className="chat-profile-card">
                                            <div className="chat-profile-card-label">About</div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {isEditingAbout ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', borderBottom: '2px solid var(--primary, #7c3aed)' }}>
                                                            <input 
                                                                type="text" 
                                                                value={editAbout}
                                                                onChange={(e) => setEditAbout(e.target.value)}
                                                                autoFocus
                                                                className="chat-profile-input"
                                                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '17px', padding: '5px 0' }}
                                                            />
                                                        <button className="wa-icon-btn" onClick={() => handleSaveProfile('about')}><Check size={20} color="#008069" /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="chat-profile-value">{user?.chatAbout || user?.about || 'Available'}</div>
                                                        <button className="wa-icon-btn" onClick={() => setIsEditingAbout(true)}><Pencil size={20} color="#8696a0" /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {(sidebarView === 'archived' || sidebarView === 'starred') && (
                                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#667781' }}>
                                        <div style={{ marginBottom: '15px' }}>
                                            {sidebarView === 'archived' ? <Filter size={40} opacity={0.3} /> : <Check size={40} opacity={0.3} />}
                                        </div>
                                        No {sidebarView} messages found.
                                    </div>
                                )}
                                {sidebarView === 'settings' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                            <Bell size={24} color="#54656f" /> <span style={{ fontSize: '16px' }}>Notifications</span>
                                        </div>
                                        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                            <Lock size={24} color="#54656f" /> <span style={{ fontSize: '16px' }}>Privacy</span>
                                        </div>
                                        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                            <HelpCircle size={24} color="#54656f" /> <span style={{ fontSize: '16px' }}>Help</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════════════════════════════════════════════════════════
                    CHAT MAIN PANE
                ════════════════════════════════════════════════════════════ */}
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
                                                style={{ width: 40, height: 40 }}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className="chat-user-avatar chat-user-avatar-default" style={{ display: selectedUser.avatar ? 'none' : 'flex', width: 40, height: 40, fontSize: '15px' }}>
                                            {getInitials(selectedUser.name)}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div className="chat-header-title" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {selectedUser.name}
                                        </div>
                                        <div className="chat-header-subtitle">
                                            {(() => {
                                                if (selectedUser.last_active) {
                                                    // Convert from UTC if your DB is UTC, or if it's local, keep as is
                                                    // Note: PHP date might be passed as string without 'Z', assuming local timezone
                                                    const lastActive = new Date(selectedUser.last_active.replace(/-/g, '/')); 
                                                    const now = new Date();
                                                    const diffMinutes = (now - lastActive) / (1000 * 60);
                                                    
                                                    if (diffMinutes < 2) {
                                                        return 'Online';
                                                    } else {
                                                        const isToday = lastActive.toDateString() === now.toDateString();
                                                        const timeStr = lastActive.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        if (isToday) {
                                                            return `last seen today at ${timeStr}`;
                                                        }
                                                        return `last seen ${lastActive.toLocaleDateString()} at ${timeStr}`;
                                                    }
                                                }
                                                return 'click here for contact info';
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="wa-header-actions">
                                    <div className="wa-dropdown-container">
                                        <button className="wa-icon-btn" onClick={() => setShowChatMenu(!showChatMenu)}><MoreVertical size={20} /></button>
                                        {showChatMenu && (
                                            <div className="wa-dropdown-menu">
                                                <ul>
                                                    <li onClick={() => { setShowContactInfoModal(true); setShowChatMenu(false); }}>Contact info</li>
                                                    <li onClick={() => { 
                                                        setActionMode(actionMode === 'edit' ? null : 'edit'); 
                                                        setShowChatMenu(false); 
                                                        if (actionMode !== 'edit') toast.success("Select a message to edit");
                                                    }}>
                                                        {actionMode === 'edit' ? 'Cancel edit' : 'Edit message'}
                                                    </li>
                                                    <li onClick={() => { 
                                                        setActionMode(actionMode === 'delete' ? null : 'delete'); 
                                                        setShowChatMenu(false); 
                                                        if (actionMode !== 'delete') toast.success("Select a message to delete");
                                                    }}>
                                                        {actionMode === 'delete' ? 'Cancel delete' : 'Delete message'}
                                                    </li>
                                                    <li onClick={() => { setSelectedUser(null); setShowChatMenu(false); }}>Close chat</li>
                                                    <li onClick={() => handleClearMessages(false)}>Clear messages</li>
                                                    <li onClick={() => handleClearMessages(true)}>Delete chat</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div 
                                className="chat-messages-container" 
                                ref={messagesContainerRef}
                                onScroll={(e) => {
                                    const { scrollTop, scrollHeight, clientHeight } = e.target;
                                    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 150;
                                }}
                            >
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
                                    groupMessagesByDate(messages).map((item, idx) => {
                                        if (item.type === 'divider') {
                                            return (
                                                <div key={`d${idx}`} className="chat-date-divider">
                                                    <span>{item.label}</span>
                                                </div>
                                            );
                                        }
                                        const m = item.data;
                                        const attachmentRegex = /^\[attachment:(.*?):(.*?)\]$/;
                                        const isImage = attachmentRegex.test(m.message) && /\.(jpg|jpeg|png|gif|webp)\]$/i.test(m.message);
                                        const isPoll = /^\[poll:(.*)\]$/.test(m.message);
                                        const isOutgoing = m.sender_id === user?.id;
                                        
                                        let bubbleClass = "chat-bubble";
                                        if (isPoll) bubbleClass += " poll-bubble";
                                        else if (isImage) bubbleClass += " image-bubble";

                                        return (
                                            <div
                                                key={m.id}
                                                className={`chat-message-row ${isOutgoing ? 'outgoing' : 'incoming'}`}
                                            >
                                                <div 
                                                    className={bubbleClass}
                                                    onClick={() => handleMessageClick(m)}
                                                    style={actionMode ? { cursor: 'pointer', outline: actionMode === 'delete' ? '2px solid #ef4444' : '2px solid #3b82f6', outlineOffset: '2px' } : {}}
                                                >
                                                    {renderMessageContent(m)}
                                                    <span className="chat-msg-time">
                                                        {formatMessageTime(m.created_at)}
                                                        {isOutgoing && (
                                                            <span className="chat-msg-status">
                                                                {m.is_read ? <CheckCheck size={14} color="#53bdeb" /> : <CheckCheck size={14} />}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input Bar */}
                            <div className="chat-input-pane">
                                {showEmojiPicker && (
                                    <div className="wa-emoji-picker">
                                        <div className="wa-emoji-grid">
                                            {EMOJIS.map(e => (
                                                <span key={e} className="wa-emoji-item" onClick={() => setMessageText(prev => prev + e)}>
                                                    {e}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {showAttachMenu && (
                                    <div className="wa-attach-menu">
                                        <div className="wa-attach-item" onClick={() => { fileInputRef.current?.click(); }}>
                                            <div className="wa-attach-icon" style={{ background: '#7f66ff' }}><FileText size={20} color="white" /></div>
                                            <span>Document</span>
                                        </div>
                                        <div className="wa-attach-item" onClick={() => { photoInputRef.current?.click(); }}>
                                            <div className="wa-attach-icon" style={{ background: '#007bfc' }}><ImageIcon size={20} color="white" /></div>
                                            <span>Photos & Videos</span>
                                        </div>
                                        <div className="wa-attach-item" onClick={openCamera}>
                                            <div className="wa-attach-icon" style={{ background: '#ff2e74' }}><Camera size={20} color="white" /></div>
                                            <span>Camera</span>
                                        </div>
                                        <div className="wa-attach-item" onClick={() => { setShowPollModal(true); setShowAttachMenu(false); }}>
                                            <div className="wa-attach-icon" style={{ background: '#01c38d' }}><BarChart2 size={20} color="white" /></div>
                                            <span>Poll</span>
                                        </div>
                                    </div>
                                )}

                                {/* Hidden File Inputs for Simulation / Upload */}
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'Document')} />
                                <input type="file" ref={photoInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'Photo/Video')} />

                                {/* Camera Modal */}
                                {showCamera && (
                                    <div className="camera-modal-overlay">
                                        <div className="camera-modal-content">
                                            <div className="camera-header">
                                                <span>Take Photo</span>
                                                <button className="camera-close-btn" onClick={closeCamera}>×</button>
                                            </div>
                                            <div className="camera-video-container">
                                                <video ref={videoRef} autoPlay playsInline className="camera-video"></video>
                                                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                                            </div>
                                            <div className="camera-footer">
                                                <button className="camera-capture-btn" onClick={capturePhoto}>
                                                    <div className="camera-capture-inner"></div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Poll Creation Modal */}
                                {showPollModal && (
                                    <div className="camera-modal-overlay">
                                        <div className="wa-poll-modal-content">
                                            <div className="camera-header">
                                                <span>Create Poll</span>
                                                <button className="camera-close-btn" onClick={() => setShowPollModal(false)}>×</button>
                                            </div>
                                            <div className="wa-poll-modal-body">
                                                <div className="wa-poll-input-group">
                                                    <label>Question</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ask a question"
                                                        value={pollQuestion}
                                                        onChange={(e) => setPollQuestion(e.target.value)}
                                                    />
                                                </div>
                                                <div className="wa-poll-input-group">
                                                    <label>Options</label>
                                                    {pollOptions.map((opt, idx) => (
                                                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder={`Option ${idx + 1}`}
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newOpts = [...pollOptions];
                                                                    newOpts[idx] = e.target.value;
                                                                    if (idx === pollOptions.length - 1 && e.target.value.trim() !== '') {
                                                                        newOpts.push(''); // auto add new option row
                                                                    }
                                                                    setPollOptions(newOpts);
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="wa-poll-modal-footer">
                                                <button className="wa-poll-send-btn" onClick={sendPoll} disabled={sending}>
                                                    <Send size={18} /> Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Contact Info Modal */}
                                {showContactInfoModal && selectedUser && (
                                    <div className="camera-modal-overlay" onClick={() => setShowContactInfoModal(false)}>
                                        <div className="wa-poll-modal-content" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden' }}>
                                            <div style={{ background: '#008069', color: 'white', padding: '20px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => setShowContactInfoModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
                                                </div>
                                                <div style={{ width: 150, height: 150, margin: '0 auto 15px', borderRadius: '50%', background: '#dfe5e7', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {selectedUser.avatar ? (
                                                        <img src={selectedUser.avatar} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '48px', color: '#54656f' }}>{getInitials(selectedUser.name)}</span>
                                                    )}
                                                </div>
                                                <h2 style={{ margin: '0 0 5px 0' }}>{selectedUser.name}</h2>
                                                <div style={{ opacity: 0.9 }}>{selectedUser.email}</div>
                                            </div>
                                            <div style={{ padding: '20px', background: '#f0f2f5' }}>
                                                <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                                    <div style={{ color: '#008069', fontSize: '14px', marginBottom: '8px' }}>About</div>
                                                    <div style={{ fontSize: '16px' }}>Available</div>
                                                </div>
                                                <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                                    <div style={{ color: '#008069', fontSize: '14px', marginBottom: '8px' }}>Department & Role</div>
                                                    <div style={{ fontSize: '16px' }}>{selectedUser.department} • {selectedUser.position || selectedUser.role}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form className="wa-input-container" onSubmit={(e) => { e.preventDefault(); setShowEmojiPicker(false); setShowAttachMenu(false); handleSendMessage(e); }}>
                                    {isRecording ? (
                                        <div className="wa-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 15px', color: '#ef4444', fontWeight: '500', flexGrow: 1 }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></div>
                                            <span>Recording... {formatDuration(recordingDuration)}</span>
                                            <div style={{ flexGrow: 1 }}></div>
                                        </div>
                                    ) : (
                                        <>
                                            <button type="button" className={`wa-icon-btn ${showEmojiPicker ? 'active' : ''}`} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                                <Smile size={24} />
                                            </button>
                                            <button type="button" className={`wa-icon-btn ${showAttachMenu ? 'active' : ''}`} onClick={() => setShowAttachMenu(!showAttachMenu)}>
                                                <Plus size={24} />
                                            </button>
        
                                            <div className="wa-input-wrapper">
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    className="wa-text-input"
                                                    placeholder="Type a message"
                                                    value={messageText}
                                                    onChange={(e) => setMessageText(e.target.value)}
                                                    disabled={sending}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {isRecording ? (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button type="button" className="wa-icon-btn" onClick={() => stopRecording(true)} title="Cancel">
                                                <X size={24} color="#ef4444" />
                                            </button>
                                            <button type="button" className="wa-icon-btn" onClick={() => stopRecording(false)} title="Send">
                                                <Send size={24} color="#00a884" />
                                            </button>
                                        </div>
                                    ) : (
                                        messageText.trim() ? (
                                            <button
                                                type="button"
                                                className="wa-icon-btn"
                                                disabled={sending}
                                                onClick={(e) => { e.preventDefault(); setShowEmojiPicker(false); setShowAttachMenu(false); handleSendMessage(e); }}
                                            >
                                                <Send size={24} />
                                            </button>
                                        ) : (
                                            <button type="button" className="wa-icon-btn" onClick={startRecording} disabled={sending}><Mic size={24} /></button>
                                        )
                                    )}
                                </form>
                            </div>
                        </>
                    ) : (

                        /* ════════════════════════════════════════════════════════════
                            PREMIUM WELCOME SCREEN
                        ════════════════════════════════════════════════════════════ */
                        <div className="fp-wlc">
                            {/* Animated background */}
                            <div className="fp-wlc-bg" aria-hidden="true">
                                <div className="fp-wlc-pattern"></div>
                            </div>

                            {/* Main content */}
                            <div className="fp-wlc-body">

                                {/* Illustration */}
                                <div className="fp-wlc-illus-container">
                                    <Illustration3D />
                                </div>

                                {/* Text content */}
                                <h2 className="fp-wlc-heading">
                                    Welcome to Employee Chat <span className="wave-emoji">👋</span>
                                </h2>
                                <p className="fp-wlc-subtitle">
                                    Connect, collaborate, and communicate<br />with your colleagues in real time.
                                </p>

                                {/* Feature Cards */}
                                <div className="fp-wlc-features">
                                    {FEATURES.map((f, i) => (
                                        <div key={i} className="fp-wlc-card">
                                            <div className="fp-wlc-card-icon" style={{ color: f.color }}>
                                                {f.icon}
                                            </div>
                                            <h4 className="fp-wlc-card-title">{f.title}</h4>
                                            <p className="fp-wlc-card-desc">{f.desc}</p>
                                            <div className="fp-wlc-card-indicator" style={{ background: f.color }}></div>
                                        </div>
                                    ))}
                                </div>



                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Chat;

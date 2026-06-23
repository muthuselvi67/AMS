import React, { useEffect, useState } from 'react';
import { Pin, Newspaper } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const TYPE_META = {
    announcement: { label: 'Announcement', emoji: '📢', color: '#4F9CF9', rgba: 'rgba(79, 156, 249, 0.15)' },
    event:        { label: 'Event',         emoji: '🎉', color: '#8B5CF6', rgba: 'rgba(139, 92, 246, 0.15)' },
    birthday:     { label: 'Birthday',      emoji: '🎂', color: '#EC4899', rgba: 'rgba(236, 72, 153, 0.15)' },
    anniversary:  { label: 'Anniversary',   emoji: '🏆', color: '#F59E0B', rgba: 'rgba(245, 158, 11, 0.15)'  },
    policy:       { label: 'Policy',        emoji: '📋', color: '#10B981', rgba: 'rgba(16, 185, 129, 0.15)' },
    alert:        { label: 'Alert',         emoji: '🚨', color: '#EF4444', rgba: 'rgba(239, 68, 68, 0.15)'  },
};

const SocialFeed = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');

    const fetchFeed = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterType) params.type = filterType;
            const { data } = await api.get('/announcements', { params });
            setItems(Array.isArray(data.data?.announcements) ? data.data.announcements : []);
        } catch { toast.error('Failed to load feed'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFeed(); }, [filterType]);

    // Group pinned at top, then by date
    const pinned = items.filter(a => a.pinned);
    const rest   = items.filter(a => !a.pinned);
    const all    = [...pinned, ...rest];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Company Feed</h1>
                <p>Stay updated with company news, events, and celebrations</p>
            </div>

            {/* Type filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button
                    className="btn btn-sm"
                    onClick={() => setFilterType('')}
                    style={{
                        background: filterType === '' ? 'var(--primary)' : 'var(--bg-card)',
                        color: filterType === '' ? '#fff' : 'var(--text-secondary)',
                        border: `1.5px solid ${filterType === '' ? 'var(--primary)' : 'var(--border)'}`,
                        fontWeight: filterType === '' ? 700 : 500,
                        transition: 'all 0.2s',
                    }}
                >All</button>
                {Object.entries(TYPE_META).map(([k, v]) => {
                    const isActive = filterType === k;
                    return (
                        <button
                            key={k}
                            className="btn btn-sm"
                            onClick={() => setFilterType(filterType === k ? '' : k)}
                            style={{
                                background: isActive ? v.color : 'var(--bg-card)',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                border: `1.5px solid ${isActive ? v.color : 'var(--border)'}`,
                                fontWeight: isActive ? 700 : 500,
                                transition: 'all 0.2s',
                            }}
                        >
                            {v.emoji} {v.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="card skeleton" style={{ height: 120 }} />
                    ))}
                </div>
            ) : all.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}>
                            <Newspaper size={48} />
                        </div>
                        <h3>No posts yet</h3>
                        <p>Company announcements will appear here</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {all.map(item => {
                        const meta = TYPE_META[item.type] || TYPE_META.announcement;
                        return (
                            <div
                                key={item.id}
                                className="card"
                                style={{
                                    padding: '20px 22px',
                                    borderLeft: `4px solid ${meta.color}`,
                                    background: item.pinned ? meta.rgba : undefined,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                                        {meta.emoji}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                            {item.pinned && <Pin size={13} color={meta.color} />}
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>
                                                {item.title}
                                            </h3>
                                            <span style={{
                                                fontSize: 11,
                                                background: meta.rgba,
                                                color: meta.color,
                                                padding: '3px 10px',
                                                borderRadius: 6,
                                                fontWeight: 700,
                                                flexShrink: 0,
                                                border: `1px solid ${meta.color}55`,
                                            }}>
                                                {meta.emoji} {meta.label}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                                            {item.content}
                                        </p>
                                        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                                            <span>Posted by {item.postedBy?.name || 'HR'}</span>
                                            <span>·</span>
                                            <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SocialFeed;

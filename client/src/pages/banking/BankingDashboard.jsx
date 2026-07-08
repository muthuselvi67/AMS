import React, { useState } from 'react';
import { 
    ArrowUpRight, ArrowDownRight, Wallet, Activity, CreditCard, 
    Send, Shield, HelpCircle, MessageSquare, Plus, Clock 
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const data = [
  { name: 'Mon', balance: 4000, botUsage: 24 },
  { name: 'Tue', balance: 3000, botUsage: 13 },
  { name: 'Wed', balance: 2000, botUsage: 58 },
  { name: 'Thu', balance: 2780, botUsage: 39 },
  { name: 'Fri', balance: 1890, botUsage: 48 },
  { name: 'Sat', balance: 2390, botUsage: 38 },
  { name: 'Sun', balance: 3490, botUsage: 43 },
];

const BankingDashboard = () => {
    const [botActive, setBotActive] = useState(true);

    return (
        <div className="banking-dashboard fade-in">
            <div className="banking-page-title">
                <h1>Overview</h1>
                <p>Welcome back, here is your banking and bot activity summary.</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="banking-grid banking-stats-grid">
                <div className="banking-card banking-stat-card">
                    <div className="banking-stat-label">Total Balance</div>
                    <div className="banking-stat-value">$24,562.00</div>
                    <div className="banking-trend trend-up">
                        <ArrowUpRight size={16} /> +2.4% from last month
                    </div>
                </div>
                <div className="banking-card banking-stat-card">
                    <div className="banking-stat-label">Monthly Spending</div>
                    <div className="banking-stat-value">$3,240.50</div>
                    <div className="banking-trend trend-down">
                        <ArrowDownRight size={16} /> -1.2% from last month
                    </div>
                </div>
                <div className="banking-card banking-stat-card">
                    <div className="banking-stat-label">Bot Resolutions</div>
                    <div className="banking-stat-value">843</div>
                    <div className="banking-trend trend-up">
                        <ArrowUpRight size={16} /> +12% efficiency
                    </div>
                </div>
                <div className="banking-card banking-stat-card">
                    <div className="banking-stat-label">Pending Requests</div>
                    <div className="banking-stat-value">12</div>
                    <div className="banking-trend trend-down" style={{ color: 'var(--bank-warning)' }}>
                        <Clock size={16} /> Requires human agent
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="banking-grid banking-main-grid">
                
                {/* Analytics Chart */}
                <div className="banking-card">
                    <div className="banking-card-header">
                        <div className="banking-card-title">
                            <Activity size={18} color="var(--bank-primary)" />
                            Transaction & Bot Activity
                        </div>
                        <select style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--bank-border)', background: 'var(--bank-bg)', color: 'var(--bank-text)' }}>
                            <option>Last 7 Days</option>
                            <option>This Month</option>
                        </select>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--bank-primary)" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="var(--bank-primary)" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--bank-accent)" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="var(--bank-accent)" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="var(--bank-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--bank-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={val => `$${val}`} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bank-card-bg)', border: '1px solid var(--bank-border)', borderRadius: '8px', boxShadow: 'var(--bank-shadow-lg)' }}
                                    itemStyle={{ color: 'var(--bank-text)' }}
                                />
                                <Area type="monotone" dataKey="balance" stroke="var(--bank-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                                <Area type="monotone" dataKey="botUsage" stroke="var(--bank-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorBot)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions & Chatbot Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="banking-card">
                        <div className="banking-card-header" style={{ marginBottom: '12px' }}>
                            <div className="banking-card-title">Quick Actions</div>
                        </div>
                        <div className="quick-action-grid">
                            <button className="quick-action-btn">
                                <Send size={20} /> Transfer Funds
                            </button>
                            <button className="quick-action-btn">
                                <Plus size={20} /> Add Account
                            </button>
                            <button className="quick-action-btn">
                                <CreditCard size={20} /> Manage Cards
                            </button>
                            <button className="quick-action-btn">
                                <HelpCircle size={20} /> Get Support
                            </button>
                        </div>
                    </div>

                    <div className="banking-card" style={{ flex: 1 }}>
                        <div className="banking-card-header">
                            <div className="banking-card-title">
                                <MessageSquare size={18} color="var(--bank-primary)" />
                                Chatbot Status
                            </div>
                            <div className={`banking-badge ${botActive ? 'badge-success' : 'badge-warning'}`}>
                                {botActive ? 'Online' : 'Offline'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bank-primary-ultra-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, position: 'relative' }}>
                                <Shield size={40} color="var(--bank-primary)" />
                                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, background: 'var(--bank-success)', borderRadius: '50%', border: '3px solid var(--bank-card-bg)' }}></div>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>FinBank AI Assistant</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--bank-text-muted)', margin: 0 }}>Processing 45 concurrent sessions.</p>
                            
                            <button style={{ marginTop: 16, background: 'var(--bank-primary)', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 600, cursor: 'pointer' }}>
                                View Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="banking-grid banking-bottom-grid">
                {/* Recent Transactions */}
                <div className="banking-card" style={{ gridColumn: 'span 2' }}>
                    <div className="banking-card-header">
                        <div className="banking-card-title">Recent Transactions</div>
                        <button style={{ background: 'transparent', border: 'none', color: 'var(--bank-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>View All</button>
                    </div>
                    <div className="banking-list">
                        {[
                            { name: 'Apple Store', date: 'Today, 10:42 AM', amount: '-$1,299.00', type: 'expense', icon: '🍎' },
                            { name: 'Salary Deposit', date: 'Yesterday, 09:00 AM', amount: '+$4,500.00', type: 'income', icon: '💼' },
                            { name: 'Amazon Prime', date: 'Jul 28, 2026', amount: '-$14.99', type: 'expense', icon: '📦' },
                            { name: 'Coffee Shop', date: 'Jul 27, 2026', amount: '-$4.50', type: 'expense', icon: '☕' }
                        ].map((tx, i) => (
                            <div className="banking-list-item" key={i}>
                                <div className="banking-list-info">
                                    <div className="banking-icon-box" style={{ background: 'var(--bank-primary-ultra-light)', fontSize: '1.2rem' }}>
                                        {tx.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tx.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--bank-text-muted)' }}>{tx.date}</div>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 700, color: tx.type === 'income' ? 'var(--bank-success)' : 'var(--bank-text)' }}>
                                    {tx.amount}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Escalated Requests */}
                <div className="banking-card">
                    <div className="banking-card-header">
                        <div className="banking-card-title">Agent Escalations</div>
                        <span className="banking-badge badge-warning">4 New</span>
                    </div>
                    <div className="banking-list">
                        {[
                            { user: 'Sarah Jenkins', issue: 'Fraud Report', time: '10 min ago' },
                            { user: 'Mike Ross', issue: 'Card Replacement', time: '24 min ago' },
                            { user: 'Elena Gilbert', issue: 'Loan Inquiry', time: '1 hour ago' },
                        ].map((req, i) => (
                            <div className="banking-list-item" key={i} style={{ alignItems: 'flex-start' }}>
                                <div className="banking-list-info">
                                    <img src={`https://ui-avatars.com/api/?name=${req.user}&background=random`} alt="User" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{req.user}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--bank-text-muted)' }}>{req.issue}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--bank-text-muted)', fontWeight: 600 }}>
                                    {req.time}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button style={{ marginTop: 'auto', background: 'var(--bank-primary-ultra-light)', color: 'var(--bank-primary)', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                        View Support Queue
                    </button>
                </div>
            </div>

        </div>
    );
};

export default BankingDashboard;

import React, { useState } from 'react';
import { Home, Clock, FileText, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';

const rules = [
    {
        icon: Clock,
        color: '#9B7CFD',
        bg: '#F5F3FF',
        title: 'Regular Check-In Updates',
        description: 'Employees working from home must provide a status update every 2 hours during work hours.',
        detail: 'Updates should briefly describe what you are working on. This ensures team coordination and accountability during remote work days.'
    },
    {
        icon: FileText,
        color: '#10B981',
        bg: '#E6FDF4',
        title: 'Final Update Window',
        description: 'The final end-of-day report must be submitted between 5:30 PM and 6:00 PM.',
        detail: 'The final update window is strictly between 17:30 and 18:00. Updates submitted outside this window do not count as the final EOD report.'
    },
    {
        icon: CheckCircle,
        color: '#3B82F6',
        bg: '#EFF6FF',
        title: 'Mandatory EOD Report',
        description: 'Submission of the end-of-day report is mandatory for all WFH days.',
        detail: 'The EOD report should summarise the work completed during the day, any blockers encountered, and tasks planned for the next day.'
    },
    {
        icon: AlertCircle,
        color: '#EF4444',
        bg: '#FEF2F2',
        title: 'Leave Consequence',
        description: 'If the EOD report is not submitted, the WFH day will be marked as leave.',
        detail: 'Failure to submit the mandatory EOD report by 6:00 PM will automatically trigger an absence/leave mark for that day in the attendance records.'
    },
];

const faqs = [
    {
        q: 'What happens if I miss the 5:30–6:00 PM window?',
        a: 'If you do not submit your final EOD report within the 5:30 PM – 6:00 PM window, the system will automatically mark that day as leave. If you have a valid reason, please contact HR immediately.'
    },
    {
        q: 'Can I submit more than one update every 2 hours?',
        a: 'Yes, you can submit additional updates at any time. The requirement is a minimum of one update every 2 hours — more frequent updates are always welcome.'
    },
    {
        q: 'What should the 2-hourly updates contain?',
        a: 'Each update should briefly describe what you are currently working on, your progress, and any blockers. It does not need to be exhaustive — a short 1–2 sentence summary is sufficient.'
    },
    {
        q: 'Does this policy apply on public holidays?',
        a: 'No. This policy only applies on working days when you are marked as Working From Home. Public holidays and approved leave days are excluded.'
    },
    {
        q: 'Who can I contact if I have an issue with WFH attendance?',
        a: 'Please reach out to your HR team via the HelpDesk module in the system, or contact your direct manager for urgent escalations.'
    },
];

const timeline = [
    { time: '9:00 AM', label: 'Check In (WFH)', desc: 'Start your WFH day by checking in via the Attendance module.' },
    { time: '11:00 AM', label: '2-Hour Update #1', desc: 'Submit your first progress update.' },
    { time: '1:00 PM', label: '2-Hour Update #2', desc: 'Submit your second progress update.' },
    { time: '3:00 PM', label: '2-Hour Update #3', desc: 'Submit your third progress update.' },
    { time: '5:00 PM', label: '2-Hour Update #4', desc: 'Submit your fourth progress update.' },
    { time: '5:30–6:00 PM', label: 'Final EOD Report ⚡', desc: 'Mandatory final end-of-day report. Must be submitted in this window.', highlight: true },
];

const WFHPolicy = () => {
    const [openFaq, setOpenFaq] = useState(null);

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #9B7CFD, #7C5CFC)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Home size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0 }}>Work From Home Policy</h1>
                        <p style={{ margin: 0 }}>Guidelines and rules for remote working days</p>
                    </div>
                </div>
            </div>

            {/* Policy Banner */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, #9B7CFD 0%, #7C5CFC 50%, #6D28D9 100%)',
                color: 'white', border: 'none', marginBottom: 24, padding: '32px 36px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{
                        width: 72, height: 72, background: 'rgba(255,255,255,0.15)',
                        borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 36
                    }}>🏠</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ color: 'white', margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>
                            Remote Work Standards
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: 15, lineHeight: 1.7, maxWidth: 640 }}>
                            Our Work From Home policy ensures team productivity and accountability during remote work days.
                            All employees working remotely must adhere to the following guidelines to maintain seamless
                            collaboration and ensure fair attendance tracking.
                        </p>
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '16px 24px',
                        textAlign: 'center', flexShrink: 0, backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>4</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            Core Rules
                        </div>
                    </div>
                </div>
            </div>

            {/* 4 Rule Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
                {rules.map((rule, i) => {
                    const Icon = rule.icon;
                    return (
                        <div key={i} className="card" style={{ padding: 24 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: rule.bg, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', marginBottom: 16
                            }}>
                                <Icon size={22} color={rule.color} />
                            </div>
                            <div style={{
                                display: 'inline-block', fontSize: 11, fontWeight: 700,
                                background: rule.bg, color: rule.color, padding: '3px 10px',
                                borderRadius: 20, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase'
                            }}>
                                Rule {i + 1}
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
                                {rule.title}
                            </h3>
                            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                                {rule.description}
                            </p>
                            <div style={{
                                background: rule.bg, borderRadius: 10, padding: '10px 14px',
                                display: 'flex', gap: 8, alignItems: 'flex-start'
                            }}>
                                <Info size={14} color={rule.color} style={{ flexShrink: 0, marginTop: 2 }} />
                                <p style={{ fontSize: 12, color: rule.color, margin: 0, lineHeight: 1.6 }}>
                                    {rule.detail}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Typical WFH Day Timeline */}
            <div className="card" style={{ marginBottom: 32, padding: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
                    📅 Typical WFH Day Timeline
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 28 }}>
                    Here's an example of an ideal WFH day starting at 9:00 AM.
                </p>
                <div style={{ position: 'relative', paddingLeft: 32 }}>
                    {/* Vertical line */}
                    <div style={{
                        position: 'absolute', left: 11, top: 8, bottom: 8,
                        width: 2, background: 'linear-gradient(to bottom, #9B7CFD, #7C5CFC40)'
                    }} />
                    {timeline.map((item, i) => (
                        <div key={i} style={{ position: 'relative', marginBottom: i < timeline.length - 1 ? 28 : 0 }}>
                            {/* Dot */}
                            <div style={{
                                position: 'absolute', left: -32, top: 4,
                                width: 22, height: 22, borderRadius: '50%',
                                background: item.highlight ? '#EF4444' : '#9B7CFD',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: item.highlight ? '0 0 0 4px #FEF2F2' : '0 0 0 4px #F5F3FF',
                                zIndex: 1
                            }}>
                                {item.highlight
                                    ? <AlertCircle size={12} color="white" />
                                    : <CheckCircle size={12} color="white" />
                                }
                            </div>
                            <div style={{
                                background: item.highlight ? '#FEF2F2' : 'var(--bg-light)',
                                borderRadius: 12, padding: '12px 18px',
                                border: item.highlight ? '1.5px solid #FCA5A5' : '1px solid var(--border-light)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <span style={{
                                        fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                                        color: item.highlight ? '#EF4444' : '#9B7CFD',
                                        textTransform: 'uppercase',
                                        background: item.highlight ? '#FEE2E2' : '#EDE9FE',
                                        padding: '2px 10px', borderRadius: 8
                                    }}>{item.time}</span>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: item.highlight ? '#EF4444' : 'var(--text-primary)' }}>
                                        {item.label}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ */}
            <div className="card" style={{ marginBottom: 32, padding: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)' }}>
                    ❓ Frequently Asked Questions
                </h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 24 }}>
                    Common questions about the Work From Home policy.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {faqs.map((faq, i) => (
                        <div key={i} style={{
                            border: '1px solid var(--border-light)', borderRadius: 12,
                            overflow: 'hidden', transition: 'all 0.2s ease'
                        }}>
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                style={{
                                    width: '100%', padding: '14px 18px', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: openFaq === i ? 'var(--primary-light)' : 'var(--bg-white)',
                                    transition: 'background 0.2s ease', cursor: 'pointer',
                                    border: 'none', font: 'inherit'
                                }}
                            >
                                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', paddingRight: 16, lineHeight: 1.4 }}>
                                    {faq.q}
                                </span>
                                {openFaq === i
                                    ? <ChevronUp size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                                    : <ChevronDown size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                }
                            </button>
                            {openFaq === i && (
                                <div style={{ padding: '14px 18px', background: 'var(--primary-light)', borderTop: '1px solid var(--border-light)' }}>
                                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                        {faq.a}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Policy Footer Notice */}
            <div style={{
                background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                border: '1px solid #FDE68A', borderRadius: 16, padding: '20px 24px',
                display: 'flex', gap: 14, alignItems: 'flex-start'
            }}>
                <div style={{
                    width: 40, height: 40, background: '#F59E0B20', borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <AlertCircle size={20} color="#F59E0B" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 6 }}>
                        Policy Effective Date & Updates
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#78350F', lineHeight: 1.7 }}>
                        This policy is effective immediately and applies to all employees who opt for Work From Home.
                        The HR department reserves the right to update this policy. Any changes will be communicated
                        via official announcements. For queries, please contact HR through the HelpDesk module.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WFHPolicy;

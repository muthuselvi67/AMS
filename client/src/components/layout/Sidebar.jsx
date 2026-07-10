import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, FileText, CalendarDays, Clock,
    Gift, BarChart3, Bell, LogOut, ChevronLeft, ChevronRight,
    Settings, UserCircle, PlusCircle, History, X, Banknote, Star,
    Laptop, FileCheck, Megaphone, LifeBuoy, BookOpen, BookMarked,
    Newspaper, Phone, Briefcase, ListTodo, Clock3, ShieldAlert, Bug, BarChart2, Users2, ClipboardList,
    CalendarCheck, Coins, TrendingUp, ClipboardCheck, CalendarPlus, BadgePlus, Receipt, Home, MessageSquare
} from 'lucide-react';

const adminLinks = [
    {
        section: 'Main', links: [
            { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/admin/employees', icon: Users, label: 'Employees' },
            { to: '/admin/appraisals', icon: Star, label: 'Appraisals' },
            { to: '/admin/chat', icon: MessageSquare, label: 'Chat' },
        ]
    },
    {
        section: 'Meetings', links: [
            { to: '/admin/meetings/schedule', icon: CalendarPlus, label: 'Meeting Schedule' },
        ]
    },
    {
        section: 'Leave', links: [
            { to: '/admin/leave-requests', icon: FileText, label: 'Leave Requests' },
            { to: '/admin/leave-types', icon: CalendarCheck, label: 'Leave Types' },
            { to: '/admin/wfh-policy', icon: Home, label: 'WFH Policy' },
        ]
    },
    {
        section: 'Attendance & Time', links: [
            { to: '/admin/my-attendance', icon: Clock, label: 'View Attendance' },
            { to: '/admin/attendance', icon: ClipboardCheck, label: 'Team Attendance' },
            { to: '/admin/timesheets', icon: Clock3, label: 'Timesheets' },
            { to: '/admin/regularization', icon: Clock, label: 'Regularization' },
            { to: '/admin/holidays', icon: Gift, label: 'Holidays' },
        ]
    },
    {
        section: 'Analytics & Payroll', links: [
            { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
            { to: '/admin/payroll', icon: Banknote, label: 'Payroll & Payslips' },
            { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
        ]
    },
    {
        section: 'HRMS Modules', links: [
            { to: '/admin/assets', icon: Laptop, label: 'Asset Management' },
            { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
            { to: '/admin/pm-appraisals', icon: ClipboardList, label: 'PM Appraisals' },
        ]
    },
    {
        section: 'Allowance System', links: [
            { to: '/admin/allowance-policies', icon: Coins, label: 'Allowance Policies' },
            { to: '/admin/allowance-reports', icon: TrendingUp, label: 'Allowance Reports' },
            { to: '/admin/allowance-review', icon: ClipboardCheck, label: 'Review Allowances' },
        ]
    },
];

const hrLinks = [
    {
        section: 'Main', links: [
            { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/hr/employees', icon: Users, label: 'Employees' },
            { to: '/hr/appraisals', icon: Star, label: 'Appraisals' },
            { to: '/hr/chat', icon: MessageSquare, label: 'Chat' },
        ]
    },
    {
        section: 'Meetings', links: [
            { to: '/hr/meetings/schedule', icon: CalendarPlus, label: 'Meeting Schedule' },
        ]
    },
    {
        section: 'Leave', links: [
            { to: '/hr/leave-requests', icon: FileText, label: 'Leave Requests' },
            { to: '/hr/leave-types', icon: CalendarCheck, label: 'Leave Types' },
            { to: '/hr/wfh-policy', icon: Home, label: 'WFH Policy' },
        ]
    },
    {
        section: 'Attendance & Time', links: [
            { to: '/hr/my-attendance', icon: Clock, label: 'View Attendance' },
            { to: '/hr/attendance', icon: ClipboardCheck, label: 'Team Attendance' },
            { to: '/hr/timesheets', icon: Clock3, label: 'Timesheets' },
            { to: '/hr/regularization', icon: Clock, label: 'Regularization' },
            { to: '/hr/holidays', icon: Gift, label: 'Holidays' },
        ]
    },
    {
        section: 'Analytics & Payroll', links: [
            { to: '/hr/reports', icon: BarChart3, label: 'Reports' },
            { to: '/hr/payroll', icon: Banknote, label: 'Payroll & Payslips' },
            { to: '/hr/notifications', icon: Bell, label: 'Notifications' },
        ]
    },
    {
        section: 'HRMS Modules', links: [
            { to: '/hr/lifecycle', icon: BookOpen, label: 'Lifecycle / Onboarding' },
            { to: '/hr/assets', icon: Laptop, label: 'Asset Management' },
            { to: '/hr/documents', icon: FileCheck, label: 'Documents' },
            { to: '/hr/announcements', icon: Megaphone, label: 'Announcements' },
            { to: '/hr/helpdesk', icon: LifeBuoy, label: 'HelpDesk' },
            { to: '/hr/pm-appraisals', icon: ClipboardList, label: 'PM Appraisals' },
        ]
    },
    {
        section: 'Allowance System', links: [
            { to: '/hr/allowance-policies', icon: Coins, label: 'Allowance Policies' },
            { to: '/hr/allowance-reports', icon: TrendingUp, label: 'Allowance Reports' },
            { to: '/hr/allowance-review', icon: ClipboardCheck, label: 'Review Allowances' },
        ]
    },
];

const employeeLinks = [
    {
        section: 'Main', links: [
            { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/employee/profile', icon: UserCircle, label: 'My Profile' },
            { to: '/employee/chat', icon: MessageSquare, label: 'Chat' },
        ]
    },
    {
        section: 'Meetings', links: [
            { to: '/employee/meetings/schedule', icon: CalendarPlus, label: 'Meeting Schedule' },
        ]
    },
    {
        section: 'Leave', links: [
            { to: '/employee/apply-leave', icon: CalendarPlus, label: 'Apply Leave' },
            { to: '/employee/leave-status', icon: FileText, label: 'Leave Status' },
            { to: '/employee/assigned-tasks', icon: ClipboardList, label: 'Assigned Tasks' },
            { to: '/employee/wfh-policy', icon: Home, label: 'WFH Policy' },
        ]
    },
    {
        section: 'Attendance', links: [
            { to: '/employee/attendance', icon: Clock, label: 'Attendance' },
            { to: '/employee/timesheets', icon: Clock3, label: 'Timesheets' },
            { to: '/employee/regularization', icon: Clock, label: 'Regularization' },
            { to: '/employee/holidays', icon: CalendarDays, label: 'Holiday Calendar' },
        ]
    },
    {
        section: 'Financials & More', links: [
            { to: '/employee/payroll', icon: FileText, label: 'Pay Slips' },
            { to: '/employee/notifications', icon: Bell, label: 'Notifications' },
        ]
    },
    {
        section: 'Self Service', links: [
            { to: '/employee/directory', icon: Phone, label: 'Employee Directory' },
            { to: '/employee/feed', icon: Newspaper, label: 'Company Feed' },
            { to: '/employee/documents', icon: BookMarked, label: 'My Documents' },
            { to: '/employee/helpdesk', icon: LifeBuoy, label: 'HR HelpDesk' },
            { to: '/employee/pm-appraisal', icon: ClipboardList, label: 'My Appraisal' },
        ]
    },
    {
        section: 'Allowances', links: [
            { to: '/employee/apply-allowance', icon: BadgePlus, label: 'Apply Allowance' },
            { to: '/employee/allowance-history', icon: Receipt, label: 'Allowance History' },
        ]
    },
];

const pmLinks = [
    {
        section: 'PM Main', links: [
            { to: '/pm/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/pm/projects', icon: Briefcase, label: 'Projects' },
            { to: '/pm/tasks', icon: ListTodo, label: 'Tasks' },
            { to: '/pm/team', icon: Users2, label: 'Team' },
            { to: '/pm/chat', icon: MessageSquare, label: 'Chat' },
        ]
    },
    {
        section: 'Attendance & Time', links: [
            { to: '/pm/my-attendance', icon: Clock, label: 'View Attendance' },
        ]
    },
    {
        section: 'Tracking', links: [
            { to: '/pm/risks', icon: ShieldAlert, label: 'Risks' },
            { to: '/pm/issues', icon: Bug, label: 'Issue Tracker' },
        ]
    },
    {
        section: 'Analytics', links: [
            { to: '/pm/reports', icon: BarChart2, label: 'Reports' },
            { to: '/pm/appraisals', icon: ClipboardList, label: 'Appraisals' },
        ]
    },
    {
        section: 'Allowances', links: [
            { to: '/pm/allowance-review', icon: ClipboardCheck, label: 'Review Allowances' },
        ]
    },
];

const clientLinks = [
    {
        section: 'My Projects', links: [
            { to: '/client/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/client/projects', icon: Briefcase, label: 'My Projects' },
        ]
    },
];

import logoLight from '../../assets/logo.svg';
import logoDark from '../../assets/logo-dark.svg';
import logoHeader from '../../assets/logo-header.svg';



const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen, unreadCount = 0 }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    let links = employeeLinks;
    if (user?.role === 'admin') links = adminLinks;
    if (user?.role === 'hr') links = hrLinks;
    if (user?.role === 'pm') links = pmLinks;
    if (user?.role === 'client') links = clientLinks;

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-logo" onClick={() => setCollapsed(c => !c)}>
                <div className="sidebar-logo-img-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={logoHeader} alt="LL Logo" style={{ height: '36px', width: '36px', maxWidth: 'none', marginLeft: 0, display: 'block' }} />
                </div>
                <div className="sidebar-logo-text">
                    <span className="sidebar-logo-text-title">Attendance</span>
                    <span className="sidebar-logo-text-subtitle">Management System</span>
                </div>
                <button className="mobile-close-btn" onClick={(e) => { e.stopPropagation(); setMobileOpen(false); }}>
                    <X size={18} />
                </button>
            </div>
            <nav className="sidebar-nav">
                {links.map(({ section, links: slinks }) => (
                    <div className="sidebar-section" key={section}>
                        <div className="sidebar-section-title">{section}</div>
                        {slinks.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to} to={to}
                                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon size={18} className="sidebar-link-icon" />
                                <span className="sidebar-link-label">{label}</span>
                                {label === 'Notifications' && unreadCount > 0 && (
                                    <span className="sidebar-link-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-powered" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {/* Show LL icon only when collapsed */}
                <div className="sidebar-logo-img-wrapper" style={{
                    display: collapsed ? 'flex' : 'none',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <img src={logoHeader} alt="LL Logo" style={{ height: '36px', width: '36px', maxWidth: 'none', display: 'block' }} />
                </div>
                {/* Show "Powered by Learnlike" only when expanded */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 1,
                    opacity: collapsed ? 0 : 1,
                    maxWidth: collapsed ? 0 : 200,
                    overflow: 'hidden',
                    transition: 'opacity var(--transition), max-width var(--transition)',
                    whiteSpace: 'nowrap',
                    pointerEvents: collapsed ? 'none' : 'auto',
                }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Powered by</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img src={logoLight} alt="Learnlike" className="sidebar-powered-logo logo-light" style={{ height: '18px', width: 'auto' }} />
                        <img src={logoDark} alt="Learnlike" className="sidebar-powered-logo logo-dark" style={{ height: '18px', width: 'auto' }} />
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

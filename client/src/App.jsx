import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import AnimatedBackground from './components/layout/AnimatedBackground';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';

const Login = lazy(() => import('./pages/Login'));
const Chat = lazy(() => import('./pages/chat/Chat'));


// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const EmployeeProfileView = lazy(() => import('./pages/admin/EmployeeProfileView'));
const LeaveRequests = lazy(() => import('./pages/admin/LeaveRequests'));
const LeaveTypes = lazy(() => import('./pages/admin/LeaveTypes'));
const AttendanceRecords = lazy(() => import('./pages/admin/AttendanceRecords'));
const Holidays = lazy(() => import('./pages/admin/Holidays'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const PayrollAdmin = lazy(() => import('./pages/admin/PayrollDashboard'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminAssets = lazy(() => import('./pages/admin/Assets'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));
const AdminMeetingSchedule = lazy(() => import('./pages/admin/MeetingSchedule'));
const AdminRegularizationRequests = lazy(() => import('./pages/admin/RegularizationRequests'));
const AdminTimesheets = lazy(() => import('./pages/admin/Timesheets'));
// HR Pages
const HRDashboard = lazy(() => import('./pages/hr/Dashboard'));
const HREmployees = lazy(() => import('./pages/hr/Employees'));
const HRLeaveRequests = lazy(() => import('./pages/hr/LeaveRequests'));
const HRLeaveTypes = lazy(() => import('./pages/hr/LeaveTypes'));
const HRAttendanceRecords = lazy(() => import('./pages/hr/AttendanceRecords'));
const HRRegularizationRequests = lazy(() => import('./pages/hr/RegularizationRequests'));
const HRTimesheets = lazy(() => import('./pages/hr/Timesheets'));
const HRHolidays = lazy(() => import('./pages/hr/Holidays'));
const HRReports = lazy(() => import('./pages/hr/Reports'));
const HRPayroll = lazy(() => import('./pages/hr/PayrollDashboard'));
const HRNotifications = lazy(() => import('./pages/hr/Notifications'));
const HRAppraisal = lazy(() => import('./pages/hr/Appraisal'));
const HRAssets = lazy(() => import('./pages/hr/Assets'));
const HRDocuments = lazy(() => import('./pages/hr/Documents'));
const HRAnnouncements = lazy(() => import('./pages/hr/Announcements'));
const HRHelpDesk = lazy(() => import('./pages/hr/HelpDesk'));
const HROnboarding = lazy(() => import('./pages/hr/Onboarding'));
const WFHPolicyManager = lazy(() => import('./pages/hr/WFHPolicyManager'));

// Allowance System
const ApplyAllowance = lazy(() => import('./pages/employee/ApplyAllowance'));
const AllowanceHistory = lazy(() => import('./pages/employee/AllowanceHistory'));
const ReviewAllowances = lazy(() => import('./pages/pm/ReviewAllowances'));
const ManageAllowancePolicies = lazy(() => import('./pages/hr/ManageAllowancePolicies'));
const AllowanceReports = lazy(() => import('./pages/hr/AllowanceReports'));

// Banking System (Standalone)
const BankingLayout = lazy(() => import('./components/layout/BankingLayout'));
const BankingDashboard = lazy(() => import('./pages/banking/BankingDashboard'));

// Employee Pages
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard'));
const ApplyLeave = lazy(() => import('./pages/employee/ApplyLeave'));
const LeaveHistory = lazy(() => import('./pages/employee/LeaveHistory'));
const AssignedTasks = lazy(() => import('./pages/employee/AssignedTasks'));
const Attendance = lazy(() => import('./pages/employee/Attendance'));
const Regularization = lazy(() => import('./pages/employee/Regularization'));
const HolidayCalendar = lazy(() => import('./pages/employee/HolidayCalendar'));
const Profile = lazy(() => import('./pages/employee/Profile'));
const MyPayroll = lazy(() => import('./pages/employee/MySalarySlips'));
const EmployeeNotifications = lazy(() => import('./pages/employee/Notifications'));
const EmployeeDirectory = lazy(() => import('./pages/employee/Directory'));
const MyDocuments = lazy(() => import('./pages/employee/Documents'));
const EmployeeHelpDesk = lazy(() => import('./pages/employee/HelpDesk'));
const SocialFeed = lazy(() => import('./pages/employee/SocialFeed'));
const WFHPolicy = lazy(() => import('./pages/employee/WFHPolicy'));

// PM Pages
const PMDashboard = lazy(() => import('./pages/pm/Dashboard'));
const PMProjects = lazy(() => import('./pages/pm/Projects'));
const PMTasks = lazy(() => import('./pages/pm/Tasks'));
const PMTimesheets = lazy(() => import('./pages/pm/Timesheets'));
const PMNotifications = lazy(() => import('./pages/pm/Notifications'));
const PMTeam = lazy(() => import('./pages/pm/Team'));
const PMRisks = lazy(() => import('./pages/pm/Risks'));
const PMIssues = lazy(() => import('./pages/pm/Issues'));
const PMReports = lazy(() => import('./pages/pm/Reports'));
const PMAppraisalsList = lazy(() => import('./pages/pm/Appraisals'));
const PMAppraisalReview = lazy(() => import('./pages/pm/AppraisalReview'));

// Appraisal pages
const EmployeePMAppraisal = lazy(() => import('./pages/employee/PMAppraisal'));
const HRPMAppraisals = lazy(() => import('./pages/hr/PMAppraisals'));

const Loading = () => (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
    </div>
);

function App() {
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthProvider>
                <AnimatedBackground />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 500,
                        style: { background: 'white', color: '#1E293B', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', fontSize: '14px', fontWeight: 500 }
                    }}
                />
                <Suspense fallback={<Loading />}>
                    <Routes>
                        {/* Public */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<Login />} />

                        {/* Admin Routes */}
                        <Route element={<ProtectedRoute role="admin" />}>
                            <Route element={<AppLayout />}>
                                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                                <Route path="/admin/employees" element={<Employees />} />
                                <Route path="/admin/employees/:id" element={<EmployeeProfileView />} />
                                <Route path="/admin/leave-requests" element={<LeaveRequests />} />
                                <Route path="/admin/leave-types" element={<LeaveTypes />} />
                                <Route path="/admin/attendance" element={<AttendanceRecords />} />
                                <Route path="/admin/regularization" element={<AdminRegularizationRequests />} />
                                <Route path="/admin/timesheets" element={<AdminTimesheets />} />
                                <Route path="/admin/my-attendance" element={<Attendance />} />
                                <Route path="/admin/holidays" element={<Holidays />} />
                                <Route path="/admin/reports" element={<Reports />} />
                                <Route path="/admin/payroll" element={<PayrollAdmin />} />
                                <Route path="/admin/notifications" element={<AdminNotifications />} />
                                <Route path="/admin/assets" element={<AdminAssets />} />
                                <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                                <Route path="/admin/meetings/schedule" element={<AdminMeetingSchedule />} />
                                <Route path="/admin/chat" element={<Chat />} />
                                <Route path="/admin/allowance-policies" element={<ManageAllowancePolicies />} />
                                <Route path="/admin/allowance-reports" element={<AllowanceReports />} />
                                <Route path="/admin/allowance-review" element={<ReviewAllowances />} />
                                <Route path="/admin/appraisals" element={<HRAppraisal />} />
                                <Route path="/admin/pm-appraisals" element={<HRPMAppraisals />} />
                                <Route path="/admin/wfh-policy" element={<WFHPolicyManager />} />
                                <Route path="/admin/profile" element={<Profile />} />
                            </Route>
                        </Route>

                        {/* HR Routes */}
                        <Route element={<ProtectedRoute role="hr" />}>
                            <Route element={<AppLayout />}>
                                <Route path="/hr/dashboard" element={<HRDashboard />} />
                                <Route path="/hr/employees" element={<HREmployees />} />
                                <Route path="/hr/employees/:id" element={<EmployeeProfileView />} />
                                <Route path="/hr/leave-requests" element={<HRLeaveRequests />} />
                                <Route path="/hr/leave-types" element={<HRLeaveTypes />} />
                                <Route path="/hr/attendance" element={<HRAttendanceRecords />} />
                                <Route path="/hr/regularization" element={<HRRegularizationRequests />} />
                                <Route path="/hr/timesheets" element={<HRTimesheets />} />
                                <Route path="/hr/my-attendance" element={<Attendance />} />
                                <Route path="/hr/holidays" element={<HRHolidays />} />
                                <Route path="/hr/reports" element={<HRReports />} />
                                <Route path="/hr/payroll" element={<HRPayroll />} />
                                <Route path="/hr/notifications" element={<HRNotifications />} />
                                <Route path="/hr/appraisals" element={<HRAppraisal />} />
                                <Route path="/hr/pm-appraisals" element={<HRPMAppraisals />} />
                                <Route path="/hr/assets" element={<HRAssets />} />
                                <Route path="/hr/documents" element={<HRDocuments />} />
                                <Route path="/hr/announcements" element={<HRAnnouncements />} />
                                <Route path="/hr/meetings/schedule" element={<AdminMeetingSchedule />} />
                                <Route path="/hr/chat" element={<Chat />} />
                                <Route path="/hr/helpdesk" element={<HRHelpDesk />} />
                                <Route path="/hr/lifecycle" element={<HROnboarding />} />
                                <Route path="/hr/allowance-policies" element={<ManageAllowancePolicies />} />
                                <Route path="/hr/allowance-reports" element={<AllowanceReports />} />
                                <Route path="/hr/allowance-review" element={<ReviewAllowances />} />
                                <Route path="/hr/wfh-policy" element={<WFHPolicyManager />} />
                                <Route path="/hr/profile" element={<Profile />} />
                            </Route>
                        </Route>
                        {/* Banking Standalone Route */}
                        <Route element={<ProtectedRoute allowedRoles={['admin', 'hr', 'employee', 'developer']} />}>
                            <Route element={<BankingLayout />}>
                                <Route path="/banking-dashboard" element={<BankingDashboard />} />
                            </Route>
                        </Route>

                        {/* Employee Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['employee', 'developer']} />}>
                            <Route element={<AppLayout />}>
                                <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                                <Route path="/employee/apply-leave" element={<ApplyLeave />} />
                                <Route path="/employee/leave-history" element={<LeaveHistory />} />
                                <Route path="/employee/leave-status" element={<LeaveHistory />} />
                                <Route path="/employee/attendance" element={<Attendance />} />
                                <Route path="/employee/regularization" element={<Regularization />} />
                                <Route path="/employee/holidays" element={<HolidayCalendar />} />
                                <Route path="/employee/profile" element={<Profile />} />
                                <Route path="/employee/payroll" element={<MyPayroll />} />
                                <Route path="/employee/notifications" element={<EmployeeNotifications />} />
                                <Route path="/employee/directory" element={<EmployeeDirectory />} />
                                <Route path="/employee/documents" element={<MyDocuments />} />
                                <Route path="/employee/helpdesk" element={<EmployeeHelpDesk />} />
                                <Route path="/employee/feed" element={<SocialFeed />} />
                                <Route path="/employee/pm-appraisal" element={<EmployeePMAppraisal />} />
                                <Route path="/employee/apply-allowance" element={<ApplyAllowance />} />
                                <Route path="/employee/allowance-history" element={<AllowanceHistory />} />
                                <Route path="/employee/wfh-policy" element={<WFHPolicy />} />
                                <Route path="/employee/assigned-tasks" element={<AssignedTasks />} />
                                <Route path="/employee/chat" element={<Chat />} />
                                <Route path="/employee/meetings/schedule" element={<AdminMeetingSchedule />} />
                            </Route>
                        </Route>

                        {/* PM Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['pm', 'admin', 'developer']} />}>
                            <Route element={<AppLayout />}>
                                <Route path="/pm/dashboard" element={<PMDashboard />} />
                                <Route path="/pm/my-attendance" element={<Attendance />} />
                                <Route path="/pm/projects" element={<PMProjects />} />
                                <Route path="/pm/tasks" element={<PMTasks />} />
                                <Route path="/pm/timesheets" element={<PMTimesheets />} />
                                <Route path="/pm/team" element={<PMTeam />} />
                                <Route path="/pm/risks" element={<PMRisks />} />
                                <Route path="/pm/issues" element={<PMIssues />} />
                                <Route path="/pm/reports" element={<PMReports />} />
                                <Route path="/pm/appraisals" element={<PMAppraisalsList />} />
                                <Route path="/pm/appraisals/:id" element={<PMAppraisalReview />} />
                                <Route path="/pm/notifications" element={<PMNotifications />} />
                                <Route path="/pm/chat" element={<Chat />} />
                                <Route path="/pm/allowance-review" element={<ReviewAllowances />} />
                            </Route>
                        </Route>

                        {/* Catch All */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Suspense>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

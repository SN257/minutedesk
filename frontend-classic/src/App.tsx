import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import AdminCenterLayout from "./layouts/AdminCenterLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { MeetingsProvider } from "./contexts/MeetingsContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import SuperAdminRoute from "./components/SuperAdminRoute";

// Lazy load all page components to reduce initial bundle size
// Pages are only loaded when their route is accessed
const Login = lazy(() => import("./pages/Login"));
const MeetingDashboard = lazy(() => import("./pages/MeetingDashboard"));
const TaskDashboard = lazy(() => import("./pages/TaskDashboard"));
const WorkLogDashboard = lazy(() => import("./pages/WorkLogDashboard"));
const ReportDashboard = lazy(() => import("./pages/ReportDashboard"));
const AddMeeting = lazy(() => import("./pages/MeetingMinutes"));
const AddMeetingForm = lazy(() => import("./pages/AddMeetingForm"));
const ViewMeeting = lazy(() => import("./pages/ViewMeeting"));
const ScheduleMeeting = lazy(() => import("./pages/ScheduleMeeting"));
const MeetingReports = lazy(() => import("./pages/MeetingReports"));
const Settings = lazy(() => import("./pages/Settings"));
const Board = lazy(() => import("./pages/Board"));
const WorkLogs = lazy(() => import("./pages/WorkLogs"));
const TaskReports = lazy(() => import("./pages/TaskReports"));
const WorkLogReports = lazy(() => import("./pages/WorkLogReports"));
const Home = lazy(() => import("./pages/Home"));
const Platform = lazy(() => import("./pages/Platform"));
const Launchpad = lazy(() => import("./pages/Launchpad"));
const Capabilities = lazy(() => import("./pages/Capabilities"));
const About = lazy(() => import("./pages/About"));
const Support = lazy(() => import("./pages/Support"));
const Documentation = lazy(() => import("./pages/Documentation"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const Insights = lazy(() => import("./pages/Insights"));
const AdminUsers = lazy(() => import("./pages/admin-center/AdminUsers"));
const AdminOverview = lazy(() => import("./pages/admin-center/AdminOverview"));
const AdminAnalytics = lazy(() => import("./pages/admin-center/AdminAnalytics"));
const AdminUserActivity = lazy(() => import("./pages/admin-center/AdminUserActivity"));
const AdminActivityLog = lazy(() => import("./pages/admin-center/AdminActivityLog"));
const AdminErrorLog = lazy(() => import("./pages/admin-center/AdminErrorLog"));
const AdminBackups = lazy(() => import("./pages/admin-center/AdminBackups"));
const AdminBranding = lazy(() => import("./pages/admin-center/AdminBranding"));
const AdminSystemHealth = lazy(() => import("./pages/admin-center/AdminSystemHealth"));
const AdminBroadcast = lazy(() => import("./pages/admin-center/AdminBroadcast"));
const AdminCenters = lazy(() => import("./pages/admin-center/AdminCenters"));
const AdminRoles = lazy(() => import("./pages/admin-center/AdminRoles"));
const AdminSchema = lazy(() => import("./pages/admin-center/AdminSchema"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[400px] w-full bg-slate-50 dark:bg-slate-900 transition-colors">
    <div className="text-center">
      <div className="relative inline-block">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-400 mx-auto"></div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-500/20 to-slate-700/20 dark:from-slate-400/10 dark:to-slate-600/10 blur-xl animate-pulse"></div>
      </div>
      <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium text-base">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrandingProvider>
    <AuthProvider>
      <SettingsProvider>
        <MeetingsProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <Home />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/platform"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <Platform />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/launchpad"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <Launchpad />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/capabilities"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <Capabilities />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/about"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <About />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/docs"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <Documentation />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <Support />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/login"
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Login />
                  </Suspense>
                }
              />

              <Route
                path="/user-dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <UserDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={<Navigate to="/user-dashboard" replace />}
              />

              <Route
                path="/add-meeting"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <AddMeeting />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-meeting/new"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <AddMeetingForm />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-meeting/:id/edit"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <AddMeetingForm />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-meeting/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <ViewMeeting />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/meetings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <MeetingDashboard />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/meetings/reports"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <MeetingReports />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/meetings/schedule"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <ScheduleMeeting />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <TaskDashboard />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/reports"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <TaskReports />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/boards"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <Board />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/boards/:boardId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <Board />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/task/:cardId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <Board />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <ReportDashboard />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/insights"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <Insights />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback />}>
                      <Settings />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Legacy path — the User Management page now lives inside the Admin Center */}
              <Route path="/admin/users" element={<Navigate to="/admin-center/users" replace />} />

              <Route
                path="/admin-center"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminOverview />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/analytics"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminAnalytics />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/user-activity"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminUserActivity />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/users"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminUsers />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/activity"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminActivityLog />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/errors"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminErrorLog />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/backups"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminBackups />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/branding"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminBranding />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/health"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminSystemHealth />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/broadcast"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminBroadcast />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/centers"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminCenters />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/roles"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminRoles />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-center/schema"
                element={
                  <ProtectedRoute>
                    <SuperAdminRoute>
                      <AdminCenterLayout>
                        <Suspense fallback={<LoadingFallback />}>
                          <AdminSchema />
                        </Suspense>
                      </AdminCenterLayout>
                    </SuperAdminRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/work-logs"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <WorkLogDashboard />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/work-logs/reports"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <WorkLogReports />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/work-logs/daily"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<LoadingFallback />}>
                        <WorkLogs />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </MeetingsProvider>
      </SettingsProvider>
    </AuthProvider>
    </BrandingProvider>
  );
}

export default App;
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthLayout from "./layouts/AuthLayout";
import AppLayout from "./layouts/AppLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { MeetingsProvider } from "./contexts/MeetingsContext";

// Lazy load all page components to reduce initial bundle size
// Pages are only loaded when their route is accessed
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AddMeeting = lazy(() => import("./pages/MeetingMinutes"));
const AddMeetingForm = lazy(() => import("./pages/AddMeetingForm"));
const ViewMeeting = lazy(() => import("./pages/ViewMeeting"));
const ScheduleMeeting = lazy(() => import("./pages/ScheduleMeeting"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Board = lazy(() => import("./pages/Board"));
const WorkLogs = lazy(() => import("./pages/WorkLogs"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="text-center">
      <div className="relative inline-block">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-600 mx-auto"></div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-500/20 to-slate-700/20 blur-xl animate-pulse"></div>
      </div>
      <p className="mt-6 text-slate-700 font-semibold text-lg">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <MeetingsProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/login" replace />}
              />

              <Route
                path="/login"
                element={
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-meeting"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AddMeeting />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-meeting/new"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AddMeetingForm />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-meeting/:id/edit"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AddMeetingForm />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-meeting/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ViewMeeting />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/meetings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ScheduleMeeting />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/boards"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Board />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/boards/:boardId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Board />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />


              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Reports />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/work-logs"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <WorkLogs />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </MeetingsProvider>
    </AuthProvider>
  );
}

export default App;
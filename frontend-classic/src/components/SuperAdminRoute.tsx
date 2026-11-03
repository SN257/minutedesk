import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Gates an entire route subtree to super_admin users only. Assumes it is
// nested inside <ProtectedRoute> (or an equivalent auth check) already.
const SuperAdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/user-dashboard" replace />;
  }

  return children;
};

export default SuperAdminRoute;

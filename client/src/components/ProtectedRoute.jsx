import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-aurora-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-aurora-border border-t-aurora-violet" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

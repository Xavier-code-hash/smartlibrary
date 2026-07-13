import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
        <p>Required role: {roles.join(' or ')}</p>
        <p>Your role: {user.role}</p>
      </div>
    );
  }

  return children;
}

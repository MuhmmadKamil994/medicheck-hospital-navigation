import { Navigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext.jsx';

// Route guard for /admin/* — no admin token, no console.
export default function RequireAdmin({ children }) {
  const { isAdminAuthenticated, initialising } = useAdmin();

  if (initialising) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-deep">
        <span className="mc-spinner !border-white/20 !border-t-amber-bright !w-8 !h-8" aria-label="Loading" />
      </div>
    );
  }

  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

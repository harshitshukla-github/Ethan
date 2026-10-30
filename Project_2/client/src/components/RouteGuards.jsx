import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from './Feedback.jsx';

// Wraps routes that need an account. Visitors are sent to sign in, then returned to where they were
// going. Someone who has just signed out on purpose goes to the home page instead.
export function RequireAuth() {
  const { user, loading, signedOut } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Checking your session…" />;
  if (!user && signedOut) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

// Wraps the sign-in and sign-up pages. Signing in changes `user`, which triggers the redirect here.
export function GuestOnly() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Checking your session…" />;
  if (user) return <Navigate to={location.state?.from ?? '/dashboard'} replace />;
  return <Outlet />;
}

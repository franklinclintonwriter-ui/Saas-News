import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/auth-context';

export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

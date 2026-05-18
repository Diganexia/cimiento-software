import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [checking, setChecking] = useState(!!token && !usuario);

  useEffect(() => {
    if (!token || usuario) return;
    api.get('/auth/me')
      .then(({ data }) => setAuth(token, data))
      .catch(() => clearAuth())
      .finally(() => setChecking(false));
  }, []);

  if (!token) return <Navigate to="/login" replace />;
  if (checking) return null;
  return <Outlet />;
}

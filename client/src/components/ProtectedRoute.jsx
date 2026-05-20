import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useLicenciaStore from '../store/licenciaStore';
import api from '../lib/api';
import { checkLicencia, getLicenseKey, registerSession } from '../services/licenciaService';

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [checking, setChecking] = useState(!!token && !usuario);
  const { resultado: licResultado, setChecking: setLicChecking, setResultado, startHeartbeat } = useLicenciaStore();

  useEffect(() => {
    if (!token || usuario) return;
    api.get('/auth/me')
      .then(async ({ data }) => {
        setAuth(token, data);
        if (window.electronAPI && window.electronAPI.getMode?.() !== 'client') {
          const key = getLicenseKey();
          if (key) {
            const r = await registerSession(key);
            if (r.ok) startHeartbeat(key);
            else if (r.error === 'limite_usuarios') clearAuth();
          }
        }
      })
      .catch(() => clearAuth())
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!window.electronAPI || licResultado) return;
    if (window.electronAPI.getMode?.() === 'client') return;
    const key = getLicenseKey();
    if (!key) return;
    setLicChecking(true);
    checkLicencia(key).then(setResultado).catch(() => setLicChecking(false));
  }, []);

  if (!token) return <Navigate to="/login" replace />;
  if (checking) return null;
  return <Outlet />;
}

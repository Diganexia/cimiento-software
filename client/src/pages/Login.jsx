import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useLicenciaStore from '../store/licenciaStore';
import api from '../lib/api';
import { version } from '../../package.json';
import { getSessionId } from '../services/licenciaService';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Read mode once on mount to avoid calling sendSync during re-renders
  const [mode] = useState(() => window.electronAPI?.getMode?.() ?? null);
  const [serverUrl] = useState(() => window.electronAPI?.getServerUrl?.() ?? null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const startHeartbeat = useLicenciaStore((s) => s.startHeartbeat);
  const setSesiones = useLicenciaStore((s) => s.setSesiones);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.electronAPI && mode !== 'client' && !window.electronAPI.getLicenseKey?.()) {
      navigate('/activacion', { replace: true });
      return;
    }
    if (mode === 'client' && !serverUrl) {
      navigate('/server-config', { replace: true });
    }
  }, [mode, serverUrl, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session_id = window.electronAPI ? getSessionId() : undefined;
      const { data } = await api.post('/auth/login', { username, password, session_id });
      if (data.sesiones) setSesiones(data.sesiones);
      startHeartbeat();
      setAuth(data.token, data.usuario);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">Cimiento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">Sistema de gestión</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-4">v{version}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-6">Un producto de <span className="font-medium text-gray-500 dark:text-gray-400">Diganexia</span></p>

        {mode === 'client' && serverUrl && (
          <div className="mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Servidor: <span className="font-mono text-gray-700 dark:text-gray-300">{serverUrl}</span></span>
            <button onClick={() => navigate('/server-config')} className="text-blue-600 hover:underline ml-2">Cambiar</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.97 9.97 0 014.9 1.275M15 12a3 3 0 11-4.5-2.598M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

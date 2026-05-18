import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { version } from '../../package.json';

const SERVER_STEPS = [
  'Iniciando base de datos...',
  'Inicializando base de datos por primera vez...',
  'Ejecutando migraciones de base de datos...',
  'Cargando datos iniciales...',
  'Iniciando servidor...',
  'Verificando conexión...'
];

export default function Splash() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Iniciando...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (!window.electronAPI) {
      navigate('/login', { replace: true });
      return;
    }

    const m = window.electronAPI.getMode();
    setMode(m);

    if (m !== 'server' && m !== 'client') {
      navigate('/login', { replace: true });
      return;
    }

    if (m === 'client') setStatus('Buscando servidor en la red local...');

    const off = window.electronAPI.onBootStatus((msg) => {
      setStatus(msg);
      if (m === 'server') {
        const idx = SERVER_STEPS.findIndex((s) => msg.includes(s.slice(0, 20)));
        if (idx >= 0) setProgress(Math.round(((idx + 1) / SERVER_STEPS.length) * 90));
      }
    });

    window.electronAPI.onBootComplete(() => {
      setProgress(100);
      setStatus('¡Sistema listo!');
      setTimeout(() => navigate('/login', { replace: true }), 800);
    });

    window.electronAPI.onBootError((msg) => {
      setError(msg);
      setProgress(0);
    });

    return () => { if (typeof off === 'function') off(); };
  }, [navigate]);

  const handleManualConfig = () => navigate('/server-config', { replace: true });

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-1">Cimiento</h1>
        <p className="text-gray-400 text-sm">Sistema de gestión</p>
      </div>

      {!error ? (
        <div className="w-80">
          {mode === 'server' && (
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {mode === 'client' && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          <p className="text-gray-400 text-sm text-center">{status}</p>
        </div>
      ) : (
        <div className="w-96 bg-red-900 border border-red-700 rounded-lg p-5 text-center">
          <p className="text-red-300 font-medium mb-2">
            {mode === 'client' ? 'No se encontró el servidor' : 'Error al iniciar'}
          </p>
          <p className="text-red-400 text-sm break-words">{error}</p>
          {mode === 'client' ? (
            <button
              onClick={handleManualConfig}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Configurar manualmente
            </button>
          ) : (
            <p className="text-gray-500 text-xs mt-4">Cerrá y volvé a abrir la aplicación.</p>
          )}
        </div>
      )}

      <p className="text-gray-700 text-xs absolute bottom-6">v{version}</p>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { version } from '../../package.json';

const STEPS = [
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

  useEffect(() => {
    // If not in Electron server mode, redirect to login
    if (!window.electronAPI || window.electronAPI.getMode() !== 'server') {
      navigate('/login', { replace: true });
      return;
    }

    const off = window.electronAPI.onBootStatus((msg) => {
      setStatus(msg);
      const idx = STEPS.findIndex((s) => msg.includes(s.slice(0, 20)));
      if (idx >= 0) setProgress(Math.round(((idx + 1) / STEPS.length) * 90));
    });

    window.electronAPI.onBootComplete(() => {
      setProgress(100);
      setStatus('¡Sistema listo!');
      setTimeout(() => navigate('/', { replace: true }), 800);
    });

    window.electronAPI.onBootError((msg) => {
      setError(msg);
      setProgress(0);
    });

    return () => { if (typeof off === 'function') off(); };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-1">Ferretería</h1>
        <p className="text-gray-400 text-sm">Sistema de gestión</p>
      </div>

      {!error ? (
        <div className="w-80">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm text-center">{status}</p>
        </div>
      ) : (
        <div className="w-96 bg-red-900 border border-red-700 rounded-lg p-5 text-center">
          <p className="text-red-300 font-medium mb-2">Error al iniciar</p>
          <p className="text-red-400 text-sm break-words">{error}</p>
          <p className="text-gray-500 text-xs mt-4">Cerrá y volvé a abrir la aplicación.</p>
        </div>
      )}

      <p className="text-gray-700 text-xs absolute bottom-6">v{version}</p>
    </div>
  );
}

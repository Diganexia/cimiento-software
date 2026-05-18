import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { version } from '../../package.json';

export default function Setup() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.electronAPI) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleSelect = async (mode) => {
    setSaving(true);
    setError('');
    try {
      await window.electronAPI.saveMode(mode);
      // main.js destroys this window and opens the next one
    } catch (err) {
      setError(err?.message || 'Error inesperado');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-1">Cimiento</h1>
        <p className="text-gray-400 text-sm">Configuración inicial</p>
      </div>

      <p className="text-gray-300 text-sm mb-6">¿Cómo vas a usar esta PC?</p>

      <div className="flex gap-4 w-full max-w-md">
        <button
          disabled={saving}
          onClick={() => handleSelect('server')}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors rounded-xl p-6 text-left group"
        >
          <div className="text-2xl mb-3">🖥️</div>
          <div className="text-white font-semibold text-sm mb-1">Servidor</div>
          <div className="text-blue-200 text-xs leading-relaxed">
            Esta PC administra la base de datos. Los demás equipos se conectan a esta.
          </div>
        </button>

        <button
          disabled={saving}
          onClick={() => handleSelect('client')}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors rounded-xl p-6 text-left group"
        >
          <div className="text-2xl mb-3">💻</div>
          <div className="text-white font-semibold text-sm mb-1">Cliente</div>
          <div className="text-gray-300 text-xs leading-relaxed">
            Esta PC se conecta a un servidor ya configurado en la red local.
          </div>
        </button>
      </div>

      {saving && (
        <p className="text-gray-400 text-xs mt-6 animate-pulse">Aplicando configuración...</p>
      )}

      {error && (
        <p className="text-red-400 text-xs mt-4">{error}</p>
      )}

      <p className="text-gray-700 text-xs absolute bottom-6">v{version}</p>
    </div>
  );
}

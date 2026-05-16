import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ServerConfig() {
  const navigate = useNavigate();
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('3001');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // Only accessible in Electron client mode
  useEffect(() => {
    if (!window.electronAPI || window.electronAPI.getMode() !== 'client') {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const buildUrl = () => `http://${ip.trim()}:${port.trim()}`;

  const handleTest = async () => {
    if (!ip.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.electronAPI.testConnection(buildUrl());
      setTestResult(result);
    } catch {
      setTestResult({ ok: false, error: 'Error de conexión' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!testResult?.ok) return;
    setSaving(true);
    try {
      await window.electronAPI.saveServerUrl(buildUrl());
      // Reload the app with the new server URL
      window.location.href = '/login';
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresá la dirección IP del servidor Ferretería</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP del servidor
            </label>
            <input
              value={ip}
              onChange={(e) => { setIp(e.target.value); setTestResult(null); }}
              placeholder="Ej: 192.168.1.100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              El operador del servidor puede ver la IP en su pantalla principal.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
            <input
              value={port}
              onChange={(e) => { setPort(e.target.value); setTestResult(null); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {testResult && (
            <div className={`rounded-lg px-4 py-3 text-sm ${testResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {testResult.ok
                ? '✓ Conexión exitosa. Podés guardar la configuración.'
                : `✗ No se pudo conectar: ${testResult.error || 'Sin respuesta'}`}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTest}
              disabled={!ip.trim() || testing}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {testing ? 'Probando...' : 'Probar conexión'}
            </button>
            <button
              onClick={handleSave}
              disabled={!testResult?.ok || saving}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Conectar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

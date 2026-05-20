import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkLicencia, saveLicenseKey } from '../services/licenciaService';
import { version } from '../../package.json';

export default function Activacion() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivar = async (e) => {
    e.preventDefault();
    const k = key.trim().toUpperCase();
    if (!k) return;
    setLoading(true);
    setError('');
    try {
      const resultado = await checkLicencia(k);
      if (resultado.estado === 'suspendida') {
        setError('Esta licencia está suspendida. Contacte a su proveedor.');
      } else if (resultado.estado === 'invalida' || resultado.source === 'offline_no_cache') {
        setError(resultado.source === 'offline_no_cache'
          ? 'No se pudo verificar la clave. Necesitás conexión a internet para activar.'
          : 'Clave de licencia inválida. Verificá que esté escrita correctamente.');
      } else {
        await saveLicenseKey(k);
        navigate('/login', { replace: true });
      }
    } catch {
      setError('Error al verificar la licencia. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-white">Cimiento</h1>
          <p className="text-gray-400 text-sm mt-1">Activación de licencia</p>
          <p className="text-gray-600 text-xs mt-0.5">v{version}</p>
        </div>
        <form onSubmit={handleActivar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Clave de licencia</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="CIMIENTO-XXXX-XXXX-XXXX"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 uppercase"
              autoFocus
              required
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded font-medium text-sm transition-colors"
          >
            {loading ? 'Verificando...' : 'Activar'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-5">
          Necesitás conexión a internet para activar.<br />
          Un producto de <span className="text-gray-500">Diganexia</span>
        </p>
      </div>
    </div>
  );
}

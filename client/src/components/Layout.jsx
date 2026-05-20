import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useLicenciaStore from '../store/licenciaStore';
import { checkLicencia, getLicenseKey } from '../services/licenciaService';

const ESTADOS_BLOQUEADOS = ['vencida', 'suspendida', 'offline_expirado', 'invalida'];

const MENSAJES = {
  vencida:          'Tu licencia de Cimiento venció. Contactá a tu proveedor para renovarla.',
  suspendida:       'Tu licencia fue suspendida. Contactá a tu proveedor para más información.',
  offline_expirado: 'No se pudo verificar la licencia en los últimos 7 días. Conectate a internet y reintentá.',
  invalida:         'Esta licencia no es válida. Contactá a tu proveedor.',
};

function BloqueoLicencia({ resultado, onReintentar, reintentando }) {
  const msg = resultado?.mensaje || MENSAJES[resultado?.estado] || 'Licencia inválida.';
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Acceso bloqueado</h2>
        <p className="text-gray-400 text-sm mb-6">{msg}</p>
        <button
          onClick={onReintentar}
          disabled={reintentando}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded font-medium text-sm transition-colors"
        >
          {reintentando ? 'Verificando...' : 'Reintentar'}
        </button>
        <p className="text-gray-600 text-xs mt-4">Un producto de Diganexia</p>
      </div>
    </div>
  );
}

export default function Layout() {
  const { resultado, setChecking, setResultado } = useLicenciaStore();
  const [reintentando, setReintentando] = useState(false);

  const bloqueado = resultado && ESTADOS_BLOQUEADOS.includes(resultado.estado);

  const handleReintentar = async () => {
    const key = getLicenseKey();
    if (!key) return;
    setReintentando(true);
    setChecking(true);
    try {
      const r = await checkLicencia(key);
      setResultado(r);
    } catch {
      setChecking(false);
    } finally {
      setReintentando(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      {bloqueado && (
        <BloqueoLicencia
          resultado={resultado}
          onReintentar={handleReintentar}
          reintentando={reintentando}
        />
      )}
    </div>
  );
}

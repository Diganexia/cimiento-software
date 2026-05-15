import { useEffect, useState } from 'react';

const fmtSize = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

export default function Backup() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doing, setDoing] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const load = async () => {
    if (!isElectron) return;
    setLoading(true);
    try {
      const list = await window.electronAPI.listBackups();
      setBackups(list || []);
    } catch (e) {
      setErr(e.message || 'Error al cargar backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleBackup = async () => {
    setDoing(true); setMsg(''); setErr('');
    try {
      const { filename } = await window.electronAPI.doBackup();
      setMsg(`Backup creado: ${filename}`);
      load();
    } catch (e) {
      setErr(e.message || 'Error al crear backup');
    } finally {
      setDoing(false);
    }
  };

  const handleRestore = async (filename) => {
    if (!window.confirm(`¿Restaurar backup "${filename}"?\n\nEsto sobreescribirá todos los datos actuales. Esta acción no se puede deshacer.`)) return;
    setRestoring(filename); setMsg(''); setErr('');
    try {
      await window.electronAPI.restoreBackup(filename);
      setMsg(`Backup restaurado correctamente. Reiniciá la aplicación para asegurarte de que todo funcione.`);
    } catch (e) {
      setErr(e.message || 'Error al restaurar');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`¿Eliminar backup "${filename}"?`)) return;
    try {
      await window.electronAPI.deleteBackup(filename);
      load();
    } catch (e) {
      setErr(e.message || 'Error al eliminar');
    }
  };

  if (!isElectron) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-gray-500 text-sm">Esta función solo está disponible en la aplicación de escritorio (build servidor).</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Backup y restauración</h1>
          <p className="text-sm text-gray-500">Backups automáticos diarios a las 02:00 hs. Retención: 30 días.</p>
        </div>
        <button
          onClick={handleBackup}
          disabled={doing}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {doing ? 'Creando backup...' : 'Crear backup ahora'}
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{msg}</div>
      )}
      {err && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{err}</div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Backups disponibles ({backups.length})</p>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-gray-400 text-sm text-center">Cargando...</p>
        ) : backups.length === 0 ? (
          <p className="px-4 py-8 text-gray-400 text-sm text-center">Sin backups. Creá uno ahora.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">Archivo</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-right">Tamaño</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map((b) => (
                <tr key={b.filename} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{b.filename}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {new Date(b.date).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{fmtSize(b.size)}</td>
                  <td className="px-4 py-2.5 text-right space-x-3">
                    <button
                      onClick={() => handleRestore(b.filename)}
                      disabled={restoring === b.filename}
                      className="text-blue-600 hover:text-blue-800 text-xs disabled:opacity-50"
                    >
                      {restoring === b.filename ? 'Restaurando...' : 'Restaurar'}
                    </button>
                    <button
                      onClick={() => handleDelete(b.filename)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
        <strong>Importante:</strong> Los backups se guardan en el equipo servidor. Recomendamos copiarlos periódicamente a un disco externo o unidad de red.
      </div>
    </div>
  );
}

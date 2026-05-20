import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoles, deleteRol } from '../../services/usuariosService';

export default function Roles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    getRoles().then(({ data }) => setRoles(data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (rol) => {
    setErr('');
    try {
      await deleteRol(rol.id);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al eliminar');
    }
  };

  const permisosLabel = (permisos) => {
    if (!permisos) return '—';
    const p = typeof permisos === 'string' ? JSON.parse(permisos) : permisos;
    if (p.all) return 'Acceso total';
    const modulos = Object.keys(p).filter((k) => Object.values(p[k] || {}).some(Boolean));
    if (!modulos.length) return 'Sin permisos';
    return modulos.length === 1 ? modulos[0] : `${modulos.length} módulos`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Roles</h1>
        <button onClick={() => navigate('/configuracion/roles/nuevo')}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
          Nuevo rol
        </button>
      </div>

      {err && <p className="mb-4 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{err}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Permisos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{r.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{permisosLabel(r.permisos)}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => navigate(`/configuracion/roles/${r.id}/editar`)}
                      className="text-blue-600 hover:text-blue-800 text-xs">Editar</button>
                    <button onClick={() => handleDelete(r)}
                      className="text-red-500 hover:text-red-700 text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

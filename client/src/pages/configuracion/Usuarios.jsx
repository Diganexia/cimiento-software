import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsuarios, updateUsuario } from '../../services/usuariosService';

export default function Usuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    getUsuarios()
      .then(({ data }) => setUsuarios(data))
      .catch((e) => setErr(e.response?.data?.error || 'Error al cargar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleActivo = async (u) => {
    try {
      await updateUsuario(u.id, { activo: !u.activo });
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Error');
    }
  };

  if (loading) return <div className="p-6 text-gray-500 dark:text-gray-400">Cargando...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Usuarios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Administración de usuarios del sistema</p>
        </div>
        <button
          onClick={() => navigate('/configuracion/usuarios/nuevo')}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          + Nuevo usuario
        </button>
      </div>

      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{u.nombre}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono">{u.username}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email || '—'}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{u.rol}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    onClick={() => navigate(`/configuracion/usuarios/${u.id}/editar`)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActivo(u)}
                    className={`text-xs ${u.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {!usuarios.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin usuarios</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

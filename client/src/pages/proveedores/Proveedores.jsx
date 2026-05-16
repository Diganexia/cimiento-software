import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProveedores } from '../../services/proveedoresService';
import Pagination from '../../components/Pagination';
import { usePermission } from '../../hooks/usePermission';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [activo, setActivo] = useState('true');
  const [loading, setLoading] = useState(false);
  const canCreate = usePermission('proveedores', 'crear');
  const navigate = useNavigate();
  const LIMIT = 50;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getProveedores({ q: busqueda, activo, page, limit: LIMIT });
      setProveedores(data.data);
      setTotal(data.total);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [busqueda, activo, page]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-800">Proveedores</h1>
        {canCreate && (
          <Link to="/proveedores/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nuevo proveedor
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Buscar por nombre..." value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={activo} onChange={(e) => { setActivo(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">CUIT</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Teléfono</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
              <th className="text-center px-4 py-3 text-gray-600 font-medium">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin proveedores</td></tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.nombre}</p>
                    {p.razon_social && p.razon_social !== p.nombre && (
                      <p className="text-xs text-gray-400">{p.razon_social}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.cuit || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.telefono || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`/proveedores/${p.id}/editar`)} className="text-xs text-blue-600 hover:underline">
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
      </div>
    </div>
  );
}

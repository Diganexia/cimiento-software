import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProductos, getRubros, deleteProducto } from '../../services/productosService';
import StockBadge from '../../components/StockBadge';
import Pagination from '../../components/Pagination';
import { usePermission } from '../../hooks/usePermission';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [rubroId, setRubroId] = useState('');
  const [activo, setActivo] = useState('true');

  const [confirmId, setConfirmId] = useState(null);

  const canCreate  = usePermission('productos', 'crear');
  const canEdit    = usePermission('productos', 'editar');
  const canDelete  = usePermission('productos', 'eliminar');
  const navigate   = useNavigate();

  const LIMIT = 50;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getProductos({ q: busqueda, rubro_id: rubroId, activo, page, limit: LIMIT });
      setProductos(data.data);
      setTotal(data.total);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [busqueda, rubroId, activo, page]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { getRubros().then((r) => setRubros(flattenRubros(r.data))).catch(() => {}); }, []);

  const flattenRubros = (tree, nivel = 0) => {
    const result = [];
    tree.forEach((r) => {
      result.push({ ...r, label: '  '.repeat(nivel) + r.nombre });
      if (r.hijos?.length) result.push(...flattenRubros(r.hijos, nivel + 1));
    });
    return result;
  };

  const handleBaja = async (id) => {
    await deleteProducto(id);
    setConfirmId(null);
    cargar();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Productos</h1>
        {canCreate && (
          <Link to="/stock/productos/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nuevo producto
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, código..."
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={rubroId}
          onChange={(e) => { setRubroId(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los rubros</option>
          {rubros.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select
          value={activo}
          onChange={(e) => { setActivo(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Código</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Rubro</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Unidad</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">P. Venta</th>
                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Stock</th>
                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Cargando...</td></tr>
              ) : productos.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Sin resultados</td></tr>
              ) : (
                productos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.codigo || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.rubro || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.unidad_abreviatura}</td>
                    <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-100 font-medium">
                      ${parseFloat(p.precio_venta).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge stock={p.stock_total} minimo={p.stock_minimo} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {canEdit && (
                          <button onClick={() => navigate(`/stock/productos/${p.id}/editar`)} className="text-xs text-blue-600 hover:underline">
                            Editar
                          </button>
                        )}
                        {canDelete && p.activo && (
                          confirmId === p.id ? (
                            <span className="flex gap-1 items-center">
                              <button onClick={() => handleBaja(p.id)} className="text-xs text-red-600 font-medium hover:underline">Sí</button>
                              <span className="text-gray-300 dark:text-gray-600">|</span>
                              <button onClick={() => setConfirmId(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">No</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmId(p.id)} className="text-xs text-red-500 hover:underline">
                              Baja
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
      </div>
    </div>
  );
}

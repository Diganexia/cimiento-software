import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCompras, confirmarCompra } from '../../services/comprasService';
import Pagination from '../../components/Pagination';
import { usePermission } from '../../hooks/usePermission';

const ESTADO_META = {
  borrador:   { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600' },
  confirmada: { label: 'Confirmada', cls: 'bg-green-100 text-green-700' },
  anulada:    { label: 'Anulada',    cls: 'bg-red-100 text-red-600' }
};

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const canCreate   = usePermission('compras', 'crear');
  const canConfirm  = usePermission('compras', 'confirmar');
  const navigate    = useNavigate();
  const LIMIT = 50;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCompras({ estado, desde, hasta, page, limit: LIMIT });
      setCompras(data.data);
      setTotal(data.total);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [estado, desde, hasta, page]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleConfirmar = async (id) => {
    if (!confirm('¿Confirmar compra? Se ingresará el stock automáticamente.')) return;
    await confirmarCompra(id);
    cargar();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-800">Compras</h1>
        {canCreate && (
          <Link to="/compras/nueva" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nueva compra
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="confirmada">Confirmada</option>
          <option value="anulada">Anulada</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span>hasta</span>
          <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">#</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Proveedor</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Remito</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Depósito</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : compras.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Sin compras</td></tr>
              ) : (
                compras.map((c) => {
                  const meta = ESTADO_META[c.estado] || { label: c.estado, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.id}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(c.created_at).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.proveedor}</td>
                      <td className="px-4 py-3 text-gray-500">{c.numero_remito || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.deposito}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        ${parseFloat(c.total).toLocaleString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => navigate(`/compras/${c.id}`)} className="text-xs text-blue-600 hover:underline">
                            Ver
                          </button>
                          {c.estado === 'borrador' && canCreate && (
                            <button onClick={() => navigate(`/compras/${c.id}/editar`)} className="text-xs text-gray-600 hover:underline">
                              Editar
                            </button>
                          )}
                          {c.estado === 'borrador' && canConfirm && (
                            <button onClick={() => handleConfirmar(c.id)} className="text-xs text-green-600 hover:underline font-medium">
                              Confirmar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
      </div>
    </div>
  );
}

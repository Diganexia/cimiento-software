import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStock, getDepositos } from '../../services/stockService';
import StockBadge from '../../components/StockBadge';

const fmtQty = (n) => parseFloat(parseFloat(n).toFixed(3)).toString();

export default function StockView() {
  const [stock, setStock] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [depositoId, setDepositoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getDepositos().then((r) => setDepositos(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getStock({ deposito_id: depositoId, q: busqueda })
      .then((r) => setStock(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [depositoId, busqueda]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Stock por depósito</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/stock/transferencia')}
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Transferir
          </button>
          <button
            onClick={() => navigate('/stock/ajuste')}
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Ajustar stock
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={depositoId}
          onChange={(e) => setDepositoId(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los depósitos</option>
          {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Producto</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Código</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Rubro</th>
                {!depositoId && <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Depósito</th>}
                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Mínimo</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Unidad</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Cargando...</td></tr>
              ) : stock.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Sin datos</td></tr>
              ) : (
                stock.map((s) => (
                  <tr key={`${s.producto_id}-${s.deposito_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{s.producto}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{s.codigo || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.rubro || '—'}</td>
                    {!depositoId && <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.deposito}</td>}
                    <td className="px-4 py-3 text-center">
                      <StockBadge stock={s.cantidad} minimo={s.stock_minimo} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{fmtQty(s.stock_minimo)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{s.unidad}</td>
                    <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-500 text-xs">
                      {new Date(s.updated_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

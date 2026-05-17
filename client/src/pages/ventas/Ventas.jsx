import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVentas, anularVenta, downloadPdf } from '../../services/ventasService';
import Pagination from '../../components/Pagination';

const ESTADO_BADGE = {
  borrador: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-green-100 text-green-700',
  anulada: 'bg-red-100 text-red-600'
};
const TIPO_LABEL = {
  remito: 'Remito', factura_interna: 'Comp. Interno',
  factura_a: 'Factura A', factura_b: 'Factura B'
};

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Ventas() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ estado: '', tipo_comprobante: '', desde: '', hasta: '' });
  const limit = 50;

  const load = async (pg = 1) => {
    const params = { page: pg, limit, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
    const { data: res } = await getVentas(params);
    setData(res.data);
    setTotal(res.total);
  };

  useEffect(() => { load(1); setPage(1); }, [filters]);

  const setF = (f) => (e) => setFilters((p) => ({ ...p, [f]: e.target.value }));

  const handleAnular = async (id) => {
    if (!confirm('¿Anular esta venta? Se revertirá el stock.')) return;
    await anularVenta(id);
    load(page);
  };

  const handlePdf = (id) => downloadPdf(id).catch(console.error);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Ventas</h1>
        <Link to="/ventas/nueva"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
          + Nueva venta
        </Link>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filters.estado} onChange={setF('estado')} className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="confirmada">Confirmada</option>
          <option value="anulada">Anulada</option>
        </select>
        <select value={filters.tipo_comprobante} onChange={setF('tipo_comprobante')} className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los tipos</option>
          <option value="remito">Remito</option>
          <option value="factura_interna">Comp. Interno</option>
          <option value="factura_a">Factura A</option>
          <option value="factura_b">Factura B</option>
        </select>
        <input type="date" value={filters.desde} onChange={setF('desde')} className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={filters.hasta} onChange={setF('hasta')} className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">N°</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Depósito</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-200">{String(v.numero).padStart(8, '0')}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{TIPO_LABEL[v.tipo_comprobante] || v.tipo_comprobante}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{v.cliente || <span className="text-gray-400 dark:text-gray-500">Consumidor final</span>}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.deposito}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">${fmt(v.total)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[v.estado]}`}>{v.estado}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(v.created_at).toLocaleDateString('es-AR')}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => navigate(`/ventas/${v.id}`)} className="text-blue-600 hover:text-blue-800 text-xs">Ver</button>
                  <button onClick={() => handlePdf(v.id)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-xs">PDF</button>
                  {v.estado === 'confirmada' && (
                    <button onClick={() => handleAnular(v.id)} className="text-red-500 hover:text-red-700 text-xs">Anular</button>
                  )}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin ventas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={limit} onChange={(p) => { setPage(p); load(p); }} />
    </div>
  );
}

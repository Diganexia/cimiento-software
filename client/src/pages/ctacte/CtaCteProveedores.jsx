import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResumenProveedores } from '../../services/ctaCteService';
import Pagination from '../../components/Pagination';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CtaCteProveedores() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const limit = 50;

  const load = async (pg = 1, qv = '') => {
    const { data: res } = await getResumenProveedores({ page: pg, limit, q: qv || undefined });
    setData(res.data);
    setTotal(res.total);
  };

  useEffect(() => { load(1, search); setPage(1); }, [search]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Cuentas corrientes — Proveedores</h1>

      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proveedor..."
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-sm hover:bg-gray-200">Buscar</button>
        {search && <button type="button" onClick={() => { setQ(''); setSearch(''); }} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700">Limpiar</button>}
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Proveedor</th>
              <th className="px-4 py-3 text-left">CUIT</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-right">Saldo (deuda)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => navigate(`/cta-cte/proveedores/${p.id}`)}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{p.nombre}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.cuit || '—'}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.telefono || '—'}</td>
                <td className={`px-4 py-3 text-right font-semibold ${parseFloat(p.saldo) > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  ${fmt(p.saldo)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-blue-600 hover:text-blue-800 text-xs">Ver cuenta</button>
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin proveedores</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={limit} onChange={(p) => { setPage(p); load(p, search); }} />
    </div>
  );
}

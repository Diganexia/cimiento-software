import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getArqueos, downloadPdfArqueo } from '../../services/cajaService';
import Pagination from '../../components/Pagination';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Arqueos() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 30;

  const load = async (pg = 1) => {
    const { data: res } = await getArqueos({ page: pg, limit });
    setData(res.data);
    setTotal(res.total);
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Historial de arqueos</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Caja</th>
              <th className="px-4 py-3 text-left">Apertura</th>
              <th className="px-4 py-3 text-left">Cierre</th>
              <th className="px-4 py-3 text-left">Operador</th>
              <th className="px-4 py-3 text-right">Saldo calc.</th>
              <th className="px-4 py-3 text-right">Diferencia</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{a.caja}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{new Date(a.abierto_at).toLocaleString('es-AR')}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{a.cerrado_at ? new Date(a.cerrado_at).toLocaleString('es-AR') : '—'}</td>
                <td className="px-4 py-3 text-gray-600">{a.usuario_apertura}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {a.saldo_calculado_cierre != null ? `$${fmt(a.saldo_calculado_cierre)}` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {a.diferencia_cierre != null ? (
                    <span className={Math.abs(a.diferencia_cierre) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                      ${fmt(a.diferencia_cierre)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.estado === 'abierto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => navigate(`/tesoreria/arqueos/${a.id}`)} className="text-blue-600 hover:text-blue-800 text-xs">Ver</button>
                  <button onClick={() => downloadPdfArqueo(a.id).catch(console.error)} className="text-gray-500 hover:text-gray-700 text-xs">PDF</button>
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin arqueos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={limit} onChange={(p) => { setPage(p); load(p); }} />
    </div>
  );
}

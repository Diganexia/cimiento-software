import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { downloadPdf } from '../../services/ventasService';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIPO_LABEL = {
  remito: 'Remito',
  factura_interna: 'Comp. Interno',
  factura_a: 'Factura A',
  factura_b: 'Factura B',
  nota_debito_a: 'ND A',
  nota_debito_b: 'ND B',
  nota_credito_a: 'NC A',
  nota_credito_b: 'NC B',
};

const ESTADO_BADGE = {
  borrador: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  confirmada: 'bg-green-100 text-green-700',
  anulada: 'bg-red-100 text-red-600',
};

export default function VentasCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState('');
  const limit = 50;

  const load = async (pg = 1) => {
    const params = {
      cliente_id: clienteId,
      page: pg,
      limit,
      desde: desde || undefined,
      hasta: hasta || undefined,
      estado: estado || undefined,
    };
    const { data } = await api.get('/ventas', { params });
    setVentas(data.data);
    setTotal(data.total);
    setPage(pg);
  };

  useEffect(() => {
    api.get(`/clientes/${clienteId}`).then(({ data }) => setCliente(data));
    load(1);
  }, [clienteId]);

  const totalVentas = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Ventas — {cliente?.nombre || '...'}
          </h1>
          {cliente?.cuit && <p className="text-sm text-gray-500 dark:text-gray-400">CUIT: {cliente.cuit}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total filtrado</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">${fmt(totalVentas)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{total} comprobantes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="confirmada">Confirmadas</option>
            <option value="borrador">Borrador</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => load(1)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
            Filtrar
          </button>
        </div>
        {(desde || hasta || estado) && (
          <div className="flex items-end">
            <button onClick={() => { setDesde(''); setHasta(''); setEstado(''); setTimeout(() => load(1), 0); }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 py-1.5">
              Limpiar
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">N°</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Pago</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {ventas.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-200 text-xs">
                  {String(v.numero).padStart(8, '0')}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
                  {new Date(v.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{TIPO_LABEL[v.tipo_comprobante] || v.tipo_comprobante}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[v.estado]}`}>
                    {v.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs capitalize">{v.tipo_pago}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">${fmt(v.total)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => downloadPdf(v.id, cliente?.nombre, v.numero).catch(console.error)}
                    className="text-blue-600 hover:text-blue-800 text-xs mr-3">PDF</button>
                  <button onClick={() => navigate(`/ventas/${v.id}`)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-xs">Ver</button>
                </td>
              </tr>
            ))}
            {!ventas.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin ventas para este cliente</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => load(p)}
              className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

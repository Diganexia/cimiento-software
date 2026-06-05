import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFacturas, downloadFacturaPdf } from '../../services/facturacionService';
import { getClientes } from '../../services/clientesService';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS = [
  { key: '',               label: 'Todas' },
  { key: 'factura_a',      label: 'Factura A' },
  { key: 'factura_b',      label: 'Factura B' },
  { key: 'nota_debito_a',  label: 'N. Débito A' },
  { key: 'nota_debito_b',  label: 'N. Débito B' },
  { key: 'nota_credito_a', label: 'N. Crédito A' },
  { key: 'nota_credito_b', label: 'N. Crédito B' },
];

const TIPO_NUEVA = {
  '':               'factura_a',
  'factura_a':      'factura_a',
  'factura_b':      'factura_b',
  'nota_debito_a':  'nota_debito_a',
  'nota_debito_b':  'nota_debito_b',
  'nota_credito_a': 'nota_credito_a',
  'nota_credito_b': 'nota_credito_b',
};

const ESTADO_BADGE = {
  borrador: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  emitida:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  error:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const TIPO_LABEL = {
  factura_a: 'Factura A', factura_b: 'Factura B',
  nota_debito_a: 'ND A', nota_debito_b: 'ND B',
  nota_credito_a: 'NC A', nota_credito_b: 'NC B',
};

export default function Facturas() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState(null);

  useEffect(() => {
    getClientes({ limit: 200, activo: 'true' }).then((r) => setClientes(r.data.data || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 50 };
    if (tab) params.tipo = tab;
    if (clienteId) params.cliente_id = clienteId;
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    getFacturas(params)
      .then((r) => { setData(r.data.data); setTotal(parseInt(r.data.total)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, clienteId, desde, hasta, page]);

  const handleTab = (key) => { setTab(key); setPage(1); };

  const handleDescargar = async (f) => {
    setDescargando(f.id);
    try { await downloadFacturaPdf(f.id, f.cliente, f.numero); } catch (_) {}
    setDescargando(null);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Facturación</h1>
        <button
          onClick={() => navigate(`/facturacion/nueva?tipo=${TIPO_NUEVA[tab]}`)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          + Nueva {tab ? TIPO_LABEL[tab] : 'Factura'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-4 flex flex-wrap gap-2">
        <select
          value={clienteId}
          onChange={(e) => { setClienteId(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">N°</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Tipo</th>
              <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Total</th>
              <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">Estado</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">CAE</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Cargando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Sin resultados</td></tr>
            ) : data.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/facturacion/${f.id}`)}>
                <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-100">{String(f.numero).padStart(8, '0')}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {f.fecha ? new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-AR') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{f.cliente || <span className="text-gray-400 dark:text-gray-500">Consumidor Final</span>}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{TIPO_LABEL[f.tipo]}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">${fmt(f.total)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[f.estado]}`}>
                    {f.estado}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{f.cae || '—'}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDescargar(f)}
                    disabled={descargando === f.id}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {descargando === f.id ? '...' : 'PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {total > 50 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600 dark:text-gray-300">
          <span>{total} resultados</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">Anterior</button>
            <span className="px-3 py-1">Pág. {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 50 >= total}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

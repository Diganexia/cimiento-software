import { useEffect, useState, useCallback } from 'react';
import { getMovimientos } from '../../services/stockService';
import Pagination from '../../components/Pagination';

const TIPOS = ['ENTRADA_COMPRA','SALIDA_VENTA','TRANSFERENCIA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','INVENTARIO'];

const TIPO_LABEL = {
  ENTRADA_COMPRA:       { label: 'Entrada compra',  cls: 'bg-green-100 text-green-700' },
  SALIDA_VENTA:         { label: 'Salida venta',    cls: 'bg-red-100 text-red-700' },
  TRANSFERENCIA:        { label: 'Transferencia',   cls: 'bg-blue-100 text-blue-700' },
  // compatibilidad con registros viejos
  TRANSFERENCIA_ENTRADA: { label: 'Transferencia', cls: 'bg-blue-100 text-blue-700' },
  TRANSFERENCIA_SALIDA:  { label: 'Transferencia', cls: 'bg-blue-100 text-blue-700' },
  AJUSTE_POSITIVO:      { label: 'Ajuste +',         cls: 'bg-teal-100 text-teal-700' },
  AJUSTE_NEGATIVO:      { label: 'Ajuste -',         cls: 'bg-yellow-100 text-yellow-700' },
  INVENTARIO:           { label: 'Inventario',       cls: 'bg-purple-100 text-purple-700' }
};

export default function Movimientos() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const LIMIT = 50;

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getMovimientos({ tipo, desde, hasta, page, limit: LIMIT });
      setData(res.data);
      setTotal(res.total);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [tipo, desde, hasta, page]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-5">Historial de movimientos</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4 flex flex-wrap gap-3">
        <select
          value={tipo}
          onChange={(e) => { setTipo(e.target.value); setPage(1); }}
          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]?.label || t}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span>hasta</span>
          <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => { setTipo(''); setDesde(''); setHasta(''); setPage(1); }}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 underline">
          Limpiar
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">Fecha</th>
                <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium">Producto</th>
                <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">Tipo</th>
                <th className="text-right px-3 py-2 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">Cant.</th>
                <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">Dep. origen</th>
                <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">Dep. destino</th>
                <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">Usuario</th>
                <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Cargando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">Sin movimientos</td></tr>
              ) : (
                data.map((m) => {
                  const meta = TIPO_LABEL[m.tipo] || { label: m.tipo, cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' };
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-3 py-2 max-w-[180px]">
                        <span className="font-medium text-gray-800 dark:text-gray-100 truncate block">{m.producto}</span>
                        {m.codigo && <span className="text-gray-400 dark:text-gray-500 font-mono">{m.codigo}</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap">{parseFloat(m.cantidad)}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{m.deposito_origen || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{m.deposito_destino || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{m.usuario}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{m.motivo || '—'}</td>
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

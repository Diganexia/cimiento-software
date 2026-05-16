import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line
} from 'recharts';
import {
  getVentasPeriodo, getRankingProductos, getStockValorizado,
  getRotacionStock, getKardex, getDeudoresClientes, getComprobantesAfip,
  downloadPDF, downloadCSV
} from '../../services/reportesService';
import api from '../../lib/api';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().split('T')[0];
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// ── Shared components ─────────────────────────────────────────────────────────

function ExportButtons({ onPDF, onCSV, loading }) {
  return (
    <div className="flex gap-2">
      <button onClick={onCSV} disabled={loading}
        className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs hover:bg-gray-50 disabled:opacity-50 transition-colors">
        Exportar CSV
      </button>
      {onPDF && (
        <button onClick={onPDF} disabled={loading}
          className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs hover:bg-gray-50 disabled:opacity-50 transition-colors">
          Exportar PDF
        </button>
      )}
    </div>
  );
}

function FilterRow({ children, onGenerate, loading }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-5">
      {children}
      <button onClick={onGenerate} disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? 'Generando...' : 'Generar'}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
const SELECT = INPUT;

// ── Tab: Ventas por período ───────────────────────────────────────────────────

function TabVentas() {
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());
  const [periodo, setPeriodo] = useState('dia');
  const [rows, setRows] = useState(null);
  const [totales, setTotales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const generar = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await getVentasPeriodo({ periodo, desde, hasta });
      setRows(data.rows); setTotales(data.totales);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const params = { periodo, desde, hasta };

  return (
    <div>
      <FilterRow onGenerate={generar} loading={loading}>
        <Field label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} /></Field>
        <Field label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} /></Field>
        <Field label="Agrupar por">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={SELECT}>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </Field>
      </FilterRow>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {rows && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {rows.length} período{rows.length !== 1 ? 's' : ''} — Total: <span className="font-semibold text-gray-800">${fmt(totales?.total)}</span>
            </p>
            <ExportButtons
              onPDF={() => downloadPDF('/reportes/ventas-periodo', params, 'ventas-periodo.pdf').catch(console.error)}
              onCSV={() => downloadCSV('/reportes/ventas-periodo', params, 'ventas-periodo.csv').catch(console.error)}
              loading={loading}
            />
          </div>
          {rows.length > 0 && (
            <div className="mb-5 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={55}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip formatter={(v) => [`$${fmt(v)}`, 'Total']} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-right">Cant. ventas</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Descuentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700">{r.fecha}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.cantidad}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">${fmt(r.total)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">${fmt(r.descuentos)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Sin ventas en el período</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Tab: Ranking productos ────────────────────────────────────────────────────

function TabRanking() {
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());
  const [limit, setLimit] = useState('20');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const generar = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await getRankingProductos({ desde, hasta, limit });
      setRows(data);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const params = { desde, hasta, limit };

  return (
    <div>
      <FilterRow onGenerate={generar} loading={loading}>
        <Field label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} /></Field>
        <Field label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} /></Field>
        <Field label="Top N">
          <select value={limit} onChange={(e) => setLimit(e.target.value)} className={SELECT}>
            <option value="10">Top 10</option>
            <option value="20">Top 20</option>
            <option value="50">Top 50</option>
          </select>
        </Field>
      </FilterRow>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {rows && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">{rows.length} producto{rows.length !== 1 ? 's' : ''}</p>
            <ExportButtons
              onPDF={() => downloadPDF('/reportes/ranking-productos', params, 'ranking-productos.pdf').catch(console.error)}
              onCSV={() => downloadCSV('/reportes/ranking-productos', params, 'ranking-productos.csv').catch(console.error)}
              loading={loading}
            />
          </div>
          {rows.length > 0 && (
            <div className="mb-5 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nombre" width={140}
                    tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.length > 22 ? v.slice(0, 22) + '…' : v} />
                  <Tooltip formatter={(v, n) => [v, 'Cant. vendida']} />
                  <Bar dataKey="total_vendido" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-right">Cant. vendida</th>
                <th className="px-3 py-2 text-right">Total $</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.posicion} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 font-mono">{r.posicion}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono">{r.codigo || '—'}</td>
                  <td className="px-3 py-2 text-gray-800">{r.nombre}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{r.total_vendido}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">${fmt(r.total_monto)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sin ventas en el período</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Tab: Stock valorizado ─────────────────────────────────────────────────────

function TabStockValorizado() {
  const [depositos, setDepositos] = useState([]);
  const [depositoId, setDepositoId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/depositos').then(({ data: d }) => setDepositos(d)).catch(() => {});
  }, []);

  const generar = async () => {
    setLoading(true); setErr('');
    try {
      const params = depositoId ? { deposito_id: depositoId } : {};
      const { data: d } = await getStockValorizado(params);
      setData(d);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const params = depositoId ? { deposito_id: depositoId } : {};

  return (
    <div>
      <FilterRow onGenerate={generar} loading={loading}>
        <Field label="Depósito">
          <select value={depositoId} onChange={(e) => setDepositoId(e.target.value)} className={SELECT}>
            <option value="">Todos los depósitos</option>
            {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </Field>
      </FilterRow>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {data && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {data.rows.length} producto{data.rows.length !== 1 ? 's' : ''} —
              Valor costo: <span className="font-semibold text-gray-800">${fmt(data.totales.valor_costo)}</span>{' '}
              | Valor venta: <span className="font-semibold text-gray-800">${fmt(data.totales.valor_venta)}</span>
            </p>
            <ExportButtons
              onPDF={() => downloadPDF('/reportes/stock-valorizado', params, 'stock-valorizado.pdf').catch(console.error)}
              onCSV={() => downloadCSV('/reportes/stock-valorizado', params, 'stock-valorizado.csv').catch(console.error)}
              loading={loading}
            />
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">Depósito</th>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">P. Costo</th>
                <th className="px-3 py-2 text-right">P. Venta</th>
                <th className="px-3 py-2 text-right">Valor costo</th>
                <th className="px-3 py-2 text-right">Valor venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{r.deposito}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono">{r.codigo || '—'}</td>
                  <td className="px-3 py-2 text-gray-800">{r.nombre}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{r.cantidad}</td>
                  <td className="px-3 py-2 text-right text-gray-600">${fmt(r.precio_costo)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">${fmt(r.precio_venta)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">${fmt(r.valor_costo)}</td>
                  <td className="px-3 py-2 text-right font-medium text-blue-700">${fmt(r.valor_venta)}</td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Sin stock disponible</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Tab: Rotación de stock ────────────────────────────────────────────────────

function TabRotacion() {
  const [dias, setDias] = useState('30');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const generar = async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await getRotacionStock({ dias });
      setRows(data);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <FilterRow onGenerate={generar} loading={loading}>
        <Field label="Sin movimiento en (días)">
          <select value={dias} onChange={(e) => setDias(e.target.value)} className={SELECT}>
            <option value="7">7 días</option>
            <option value="15">15 días</option>
            <option value="30">30 días</option>
            <option value="60">60 días</option>
            <option value="90">90 días</option>
          </select>
        </Field>
      </FilterRow>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {rows && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">{rows.length} producto{rows.length !== 1 ? 's' : ''} sin rotación</p>
            <ExportButtons
              onCSV={() => downloadCSV('/reportes/rotacion-stock', { dias }, 'rotacion-stock.csv').catch(console.error)}
              onPDF={() => downloadPDF('/reportes/rotacion-stock', { dias }, 'rotacion-stock.pdf').catch(console.error)}
              loading={loading}
            />
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Última venta</th>
                <th className="px-3 py-2 text-right">Días sin venta</th>
                <th className="px-3 py-2 text-right">Stock actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 font-mono">{r.codigo || '—'}</td>
                  <td className="px-3 py-2 text-gray-800">{r.nombre}</td>
                  <td className="px-3 py-2 text-gray-500">{r.ultimo_movimiento}</td>
                  <td className={`px-3 py-2 text-right font-medium ${r.dias_sin_movimiento > 60 ? 'text-red-600' : 'text-orange-600'}`}>
                    {r.dias_sin_movimiento === '—' ? '—' : `${r.dias_sin_movimiento}d`}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{r.stock_actual}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Todos los productos tienen rotación activa</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Tab: Kardex ───────────────────────────────────────────────────────────────

function TabKardex() {
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [depositos, setDepositos] = useState([]);
  const [depositoId, setDepositoId] = useState('');
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/productos').then(({ data: d }) => setProductos(d.data || d.rows || d)).catch(() => {});
    api.get('/depositos').then(({ data: d }) => setDepositos(d)).catch(() => {});
  }, []);

  const generar = async () => {
    if (!productoId) return setErr('Seleccioná un producto');
    setLoading(true); setErr('');
    try {
      const params = { desde, hasta };
      if (depositoId) params.deposito_id = depositoId;
      const { data: d } = await getKardex(productoId, params);
      setData(d);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const exportParams = { desde, hasta, ...(depositoId ? { deposito_id: depositoId } : {}) };

  const TIPO_COLOR = {
    ENTRADA_COMPRA: 'text-green-700', SALIDA_VENTA: 'text-red-600',
    AJUSTE_POSITIVO: 'text-green-600', AJUSTE_NEGATIVO: 'text-red-500',
    TRANSFERENCIA_ENTRADA: 'text-blue-600', TRANSFERENCIA_SALIDA: 'text-blue-500',
    INVENTARIO: 'text-gray-600'
  };

  return (
    <div>
      <FilterRow onGenerate={generar} loading={loading}>
        <Field label="Producto *">
          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className={`${SELECT} min-w-48`}>
            <option value="">Seleccionar producto...</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `[${p.codigo}] ` : ''}{p.nombre}</option>)}
          </select>
        </Field>
        <Field label="Depósito">
          <select value={depositoId} onChange={(e) => setDepositoId(e.target.value)} className={SELECT}>
            <option value="">Todos</option>
            {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </Field>
        <Field label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} /></Field>
        <Field label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} /></Field>
      </FilterRow>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {data && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">{data.producto.nombre}</span>
              {data.producto.codigo && <span className="text-gray-400 ml-1">({data.producto.codigo})</span>}
              {' — '}{data.rows.length} movimiento{data.rows.length !== 1 ? 's' : ''}
            </p>
            <ExportButtons
              onPDF={() => downloadPDF(`/reportes/kardex/${productoId}`, exportParams, `kardex-${productoId}.pdf`).catch(console.error)}
              onCSV={() => downloadCSV(`/reportes/kardex/${productoId}`, exportParams, `kardex-${productoId}.csv`).catch(console.error)}
              loading={loading}
            />
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Dep. origen</th>
                <th className="px-3 py-2 text-left">Dep. destino</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Ant.</th>
                <th className="px-3 py-2 text-right">Post.</th>
                <th className="px-3 py-2 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">{r.fecha}</td>
                  <td className={`px-3 py-2 text-xs font-medium ${TIPO_COLOR[r.tipo] || 'text-gray-600'}`}>{r.tipo}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{r.deposito_origen}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{r.deposito_destino}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">{r.cantidad}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{r.cantidad_anterior}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{r.cantidad_posterior}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{r.motivo || '—'}</td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Sin movimientos en el período</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Tab: Deudores ─────────────────────────────────────────────────────────────

function TabDeudores() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const generar = async () => {
    setLoading(true); setErr('');
    try {
      const { data: d } = await getDeudoresClientes();
      setData(d);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { generar(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Clientes con saldo deudor en cuenta corriente</p>
        <div className="flex gap-2">
          <button onClick={generar} disabled={loading}
            className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors">
            Actualizar
          </button>
          {data && (
            <ExportButtons
              onPDF={() => downloadPDF('/reportes/deudores-clientes', {}, 'deudores-clientes.pdf').catch(console.error)}
              onCSV={() => downloadCSV('/reportes/deudores-clientes', {}, 'deudores-clientes.csv').catch(console.error)}
              loading={loading}
            />
          )}
        </div>
      </div>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {data && (
        <>
          {data.rows.length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
              Total deuda: <span className="font-bold">${fmt(data.total)}</span> en {data.rows.length} cliente{data.rows.length !== 1 ? 's' : ''}
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">CUIT</th>
                <th className="px-3 py-2 text-left">Teléfono</th>
                <th className="px-3 py-2 text-right">Saldo deudor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-800 font-medium">{r.nombre}</td>
                  <td className="px-3 py-2 text-gray-500">{r.cuit || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{r.telefono || '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-red-600">${fmt(r.saldo)}</td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Sin clientes deudores</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Tab: Comprobantes ARCA ────────────────────────────────────────────────────

function TabAfip() {
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const generar = async () => {
    setLoading(true); setErr('');
    try {
      const params = { desde, hasta };
      if (estadoFiltro) params.estado = estadoFiltro;
      const { data: d } = await getComprobantesAfip(params);
      setData(d);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const params = { desde, hasta, ...(estadoFiltro ? { estado: estadoFiltro } : {}) };
  const ESTADO_COLOR = { emitido: 'bg-green-100 text-green-700', error: 'bg-red-100 text-red-700', pendiente: 'bg-yellow-100 text-yellow-700' };

  return (
    <div>
      <FilterRow onGenerate={generar} loading={loading}>
        <Field label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} /></Field>
        <Field label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} /></Field>
        <Field label="Estado">
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={SELECT}>
            <option value="">Todos</option>
            <option value="emitido">Emitido</option>
            <option value="pendiente">Pendiente</option>
            <option value="error">Error</option>
          </select>
        </Field>
      </FilterRow>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {data && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {data.totales.cantidad} comprobante{data.totales.cantidad !== 1 ? 's' : ''} —
              Total: <span className="font-semibold text-gray-800">${fmt(data.totales.total)}</span>
            </p>
            <ExportButtons
              onPDF={() => downloadPDF('/reportes/comprobantes-afip', params, 'comprobantes-afip.pdf').catch(console.error)}
              onCSV={() => downloadCSV('/reportes/comprobantes-afip', params, 'comprobantes-afip.csv').catch(console.error)}
              loading={loading}
            />
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-right">N°</th>
                <th className="px-3 py-2 text-left">CAE</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 text-xs">{r.fecha}</td>
                  <td className="px-3 py-2 text-gray-700 capitalize text-xs">{r.tipo_comprobante.replace('_', ' ')}</td>
                  <td className="px-3 py-2 text-right text-gray-600 font-mono">{r.numero}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs">{r.cae || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLOR[r.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.cliente}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">${fmt(r.total)}</td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">Sin comprobantes en el período</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Tab: Ventas por cliente ───────────────────────────────────────────────────

function TabVentasCliente() {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(today());
  const [estado, setEstado] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/clientes', { params: { limit: 200 } }).then(({ data: d }) => setClientes(d.data || []));
  }, []);

  const params = { cliente_id: clienteId || undefined, desde, hasta, estado: estado || undefined };

  const generar = async () => {
    if (!clienteId) { setErr('Seleccioná un cliente'); return; }
    setLoading(true); setErr('');
    try {
      const { data: d } = await api.get('/reportes/ventas-por-cliente', { params });
      setData(d);
    } catch (e) { setErr(e.response?.data?.error || 'Error'); }
    finally { setLoading(false); }
  };

  const TIPO_LABEL = {
    remito: 'Remito', factura_interna: 'Comp. Interno',
    factura_a: 'Factura A', factura_b: 'Factura B',
    nota_debito_a: 'ND A', nota_debito_b: 'ND B',
    nota_credito_a: 'NC A', nota_credito_b: 'NC B'
  };

  return (
    <div>
      <FilterRow onGenerate={generar} loading={loading}>
        <Field label="Cliente *">
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={SELECT}>
            <option value="">Seleccioná un cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.cuit ? ` — ${c.cuit}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} /></Field>
        <Field label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} /></Field>
        <Field label="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={SELECT}>
            <option value="">Todos</option>
            <option value="confirmada">Confirmadas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </Field>
      </FilterRow>
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {data && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {data.total} comprobante{data.total !== 1 ? 's' : ''} —
              Total: <span className="font-semibold text-gray-800">${fmt(data.total_monto)}</span>
            </p>
            <ExportButtons
              onPDF={() => downloadPDF('/reportes/ventas-por-cliente', params, 'ventas-cliente.pdf').catch(console.error)}
              onCSV={() => downloadCSV('/reportes/ventas-por-cliente', params, 'ventas-cliente.csv').catch(console.error)}
              loading={loading}
            />
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left">N°</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Pago</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-700 text-xs">{String(r.numero).padStart(8, '0')}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-3 py-2 text-gray-700">{TIPO_LABEL[r.tipo_comprobante] || r.tipo_comprobante}</td>
                  <td className="px-3 py-2 text-gray-600 capitalize text-xs">{r.estado}</td>
                  <td className="px-3 py-2 text-gray-600 capitalize text-xs">{r.tipo_pago}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-800">${fmt(r.total)}</td>
                </tr>
              ))}
              {!data.data.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Sin ventas para este cliente</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Ventas', component: <TabVentas key="ventas" /> },
  { label: 'Ventas por cliente', component: <TabVentasCliente key="ventas-cliente" /> },
  { label: 'Ranking productos', component: <TabRanking key="ranking" /> },
  { label: 'Stock valorizado', component: <TabStockValorizado key="stock" /> },
  { label: 'Rotación', component: <TabRotacion key="rotacion" /> },
  { label: 'Kardex', component: <TabKardex key="kardex" /> },
  { label: 'Deudores', component: <TabDeudores key="deudores" /> },
  { label: 'Comprobantes ARCA', component: <TabAfip key="afip" /> }
];

export default function Reportes() {
  const [tab, setTab] = useState(0);

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Reportes</h1>
        <p className="text-sm text-gray-500">Análisis y exportaciones. Los reportes se generan en tiempo real.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6 flex-wrap">
        {TABS.map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm transition-colors whitespace-nowrap ${
              tab === i
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {TABS[tab].component}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getArqueoActual, getCajas, abrirCaja, cerrarCaja, movimientoManual, downloadPdfArqueo } from '../../services/cajaService';
import api from '../../lib/api';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CONCEPTO_LABEL = {
  venta: 'Venta', cobro_cta_cte: 'Cobro cta cte', pago_proveedor: 'Pago proveedor',
  gasto: 'Gasto', apertura: 'Apertura', cierre: 'Cierre', manual: 'Manual'
};

export default function Caja() {
  const [estado, setEstado] = useState(null);     // null = loading
  const [cajas, setCajas] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Apertura
  const [cajaId, setCajaId] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('0');

  // Cierre
  const [showCierre, setShowCierre] = useState(false);
  const [saldoDeclarado, setSaldoDeclarado] = useState('');

  // Movimiento manual
  const [showMovManual, setShowMovManual] = useState(false);
  const [movForm, setMovForm] = useState({ tipo: 'ingreso', monto: '', descripcion: '', medio_pago_id: '' });

  const load = async () => {
    const { data } = await getArqueoActual();
    setEstado(data);
    if (data.arqueo) setSaldoDeclarado(fmt(data.saldo_calculado).replace(/\./g, '').replace(',', '.'));
  };

  useEffect(() => {
    load();
    getCajas().then(({ data }) => { setCajas(data); if (data[0]) setCajaId(String(data[0].id)); });
    api.get('/medios-pago').then(({ data }) => {
      setMediosPago(data);
      if (data[0]) setMovForm((p) => ({ ...p, medio_pago_id: String(data[0].id) }));
    });
  }, []);

  const handleAbrir = async () => {
    setError('');
    setLoading(true);
    try {
      await abrirCaja({ caja_id: parseInt(cajaId), saldo_inicial: parseFloat(saldoInicial) || 0 });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await cerrarCaja({ saldo_declarado: parseFloat(saldoDeclarado) || 0 });
      setShowCierre(false);
      await load();
      if (Math.abs(data.diferencia) > 0.01) {
        alert(`Caja cerrada.\nSaldo calculado: $${fmt(data.saldo_calculado)}\nDiferencia: $${fmt(data.diferencia)}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  };

  const handleMovManual = async () => {
    if (!movForm.monto || parseFloat(movForm.monto) <= 0) { setError('Ingrese un monto válido'); return; }
    setError('');
    setLoading(true);
    try {
      await movimientoManual({
        tipo: movForm.tipo,
        monto: parseFloat(movForm.monto),
        descripcion: movForm.descripcion || undefined,
        medio_pago_id: parseInt(movForm.medio_pago_id)
      });
      setShowMovManual(false);
      setMovForm((p) => ({ ...p, monto: '', descripcion: '' }));
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar movimiento');
    } finally {
      setLoading(false);
    }
  };

  if (estado === null) return <div className="p-6 text-gray-500 dark:text-gray-400">Cargando...</div>;

  // ── No hay caja abierta ────────────────────────────────────────────────────
  if (!estado.arqueo) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 max-w-sm w-full space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Caja cerrada</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No hay ningún turno abierto</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Caja</label>
              <select value={cajaId} onChange={(e) => setCajaId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Saldo inicial</label>
              <input type="number" min="0" step="0.01" value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button onClick={handleAbrir} disabled={loading || !cajaId}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </div>
      </div>
    );
  }

  // ── Caja abierta ──────────────────────────────────────────────────────────
  const { arqueo, resumen, ingresos, egresos, saldo_calculado, movimientos } = estado;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{arqueo.caja}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Abierta {new Date(arqueo.abierto_at).toLocaleString('es-AR')} · por {arqueo.usuario_apertura}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Saldo actual</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${fmt(saldo_calculado)}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 animate-pulse" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Saldo inicial</p>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100">${fmt(arqueo.saldo_inicial)}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-xl font-bold text-green-700">+${fmt(ingresos)}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-xs text-red-500 uppercase tracking-wide mb-1">Egresos</p>
          <p className="text-xl font-bold text-red-600">-${fmt(egresos)}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        {/* Por medio de pago */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Por medio de pago</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                <th className="text-left pb-2">Medio</th>
                <th className="text-right pb-2">Ingresos</th>
                <th className="text-right pb-2">Egresos</th>
                <th className="text-right pb-2">Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {resumen.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 text-gray-700 dark:text-gray-200">{r.medio_pago}</td>
                  <td className="py-1.5 text-right text-green-700">${fmt(r.ingresos)}</td>
                  <td className="py-1.5 text-right text-red-600">{r.egresos > 0 ? `-$${fmt(r.egresos)}` : '—'}</td>
                  <td className="py-1.5 text-right font-medium text-gray-800 dark:text-gray-100">${fmt(r.neto)}</td>
                </tr>
              ))}
              {!resumen.length && <tr><td colSpan={4} className="py-3 text-center text-gray-400 dark:text-gray-500 text-xs">Sin movimientos aún</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Últimos movimientos */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Últimos movimientos</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {movimientos.map((m) => (
              <div key={m.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-gray-700 dark:text-gray-200">{CONCEPTO_LABEL[m.concepto] || m.concepto}</span>
                  {m.descripcion && <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">— {m.descripcion.slice(0, 30)}</span>}
                  <span className="text-gray-400 dark:text-gray-500 text-xs block">{m.medio_pago}</span>
                </div>
                <span className={`font-semibold ${m.tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                  {m.tipo === 'ingreso' ? '+' : '-'}${fmt(m.monto)}
                </span>
              </div>
            ))}
            {!movimientos.length && <p className="text-center text-gray-400 dark:text-gray-500 text-xs py-4">Sin movimientos</p>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => setShowMovManual(true)}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
          + Movimiento manual
        </button>
        <button onClick={() => downloadPdfArqueo('actual').catch(console.error)}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
          Imprimir resumen
        </button>
        <button onClick={() => { setShowCierre(true); setError(''); setSaldoDeclarado(String(saldo_calculado.toFixed(2))); }}
          className="ml-auto bg-red-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors">
          Cerrar caja
        </button>
      </div>

      {/* Cierre modal */}
      {showCierre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Cerrar caja</h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-300"><span>Saldo inicial:</span><span>${fmt(arqueo.saldo_inicial)}</span></div>
              <div className="flex justify-between text-green-700"><span>Ingresos:</span><span>+${fmt(ingresos)}</span></div>
              <div className="flex justify-between text-red-600"><span>Egresos:</span><span>-${fmt(egresos)}</span></div>
              <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-100 pt-1 border-t border-gray-200 dark:border-gray-700"><span>Saldo calculado:</span><span>${fmt(saldo_calculado)}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Saldo declarado (dinero en caja)</label>
              <input type="number" min="0" step="0.01" value={saldoDeclarado}
                onChange={(e) => setSaldoDeclarado(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus />
              {saldoDeclarado !== '' && (
                <p className={`text-xs mt-1 ${Math.abs(parseFloat(saldoDeclarado) - saldo_calculado) > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                  Diferencia: ${fmt(parseFloat(saldoDeclarado || 0) - saldo_calculado)}
                </p>
              )}
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleCerrar} disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {loading ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
              <button onClick={() => setShowCierre(false)}
                className="px-4 py-2 rounded text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movimiento manual modal */}
      {showMovManual && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Movimiento manual</h2>
            <div className="flex gap-2">
              {['ingreso', 'egreso'].map((t) => (
                <button key={t} onClick={() => setMovForm((p) => ({ ...p, tipo: t }))}
                  className={`flex-1 py-2 rounded text-sm font-medium capitalize transition-colors ${movForm.tipo === t
                    ? (t === 'ingreso' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Monto *</label>
              <input type="number" min="0.01" step="0.01" value={movForm.monto}
                onChange={(e) => setMovForm((p) => ({ ...p, monto: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Medio de pago *</label>
              <select value={movForm.medio_pago_id} onChange={(e) => setMovForm((p) => ({ ...p, medio_pago_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {mediosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descripción</label>
              <input value={movForm.descripcion} onChange={(e) => setMovForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Ej: Pago de luz, retiro de efectivo..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleMovManual} disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? 'Guardando...' : 'Registrar'}
              </button>
              <button onClick={() => { setShowMovManual(false); setError(''); }}
                className="px-4 py-2 rounded text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

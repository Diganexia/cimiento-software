import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEstadoCuentaCliente, cobrar, downloadPdfCliente, downloadPdfCobro } from '../../services/ctaCteService';
import api from '../../lib/api';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CtaCteCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();

  const [estado, setEstado] = useState(null);
  const [mediosPago, setMediosPago] = useState([]);
  const [showCobro, setShowCobro] = useState(false);
  const [cobro, setCobro] = useState({ monto: '', descripcion: '', medio_pago_id: '' });
  const [cheque, setCheque] = useState({ numero: '', banco: '', emisor: '', fecha_emision: '', fecha_acreditacion: '' });
  const [retenciones, setRetenciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ultimoCobroId, setUltimoCobroId] = useState(null);

  const medioSeleccionado = mediosPago.find((m) => String(m.id) === String(cobro.medio_pago_id));
  const esCheque = medioSeleccionado?.nombre === 'Cheque';

  const addRetencion = () => setRetenciones((p) => [...p, { tipo: 'ganancias', descripcion: '', porcentaje: '', monto: '' }]);
  const removeRetencion = (i) => setRetenciones((p) => p.filter((_, idx) => idx !== i));
  const updateRetencion = (i, field, value) => setRetenciones((p) => p.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const load = async () => {
    const { data } = await getEstadoCuentaCliente(clienteId);
    setEstado(data);
  };

  useEffect(() => {
    load();
    api.get('/medios-pago').then(({ data }) => {
      setMediosPago(data);
      if (data[0]) setCobro((p) => ({ ...p, medio_pago_id: String(data[0].id) }));
    });
  }, [clienteId]);

  const handleCobrar = async () => {
    if (!cobro.monto || parseFloat(cobro.monto) <= 0) { setError('Ingrese un monto válido'); return; }
    setError('');
    setLoading(true);
    try {
      if (esCheque && (!cheque.numero || !cheque.fecha_acreditacion)) {
        setError('Ingrese número de cheque y fecha de acreditación');
        setLoading(false);
        return;
      }
      const { data } = await cobrar({
        cliente_id: parseInt(clienteId),
        monto: parseFloat(cobro.monto),
        descripcion: cobro.descripcion || undefined,
        medio_pago_id: cobro.medio_pago_id ? parseInt(cobro.medio_pago_id) : undefined,
        cheque: esCheque ? cheque : undefined,
        retenciones: retenciones.filter((r) => r.monto && parseFloat(r.monto) > 0)
      });
      setUltimoCobroId(data.id);
      setShowCobro(false);
      setCobro((p) => ({ ...p, monto: '', descripcion: '' }));
      setCheque({ numero: '', banco: '', emisor: '', fecha_emision: '', fecha_acreditacion: '' });
      setRetenciones([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar cobro');
    } finally {
      setLoading(false);
    }
  };

  if (!estado) return <div className="p-6 text-gray-500 dark:text-gray-400">Cargando...</div>;

  const { cliente, movimientos, saldo_actual } = estado;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{cliente.nombre}</h1>
          {cliente.cuit && <p className="text-sm text-gray-500 dark:text-gray-400">CUIT: {cliente.cuit}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Saldo actual</p>
          <p className={`text-2xl font-bold ${parseFloat(saldo_actual) > 0 ? 'text-red-600' : 'text-green-700'}`}>
            ${fmt(saldo_actual)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{parseFloat(saldo_actual) > 0 ? 'Debe' : 'Sin deuda'}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <button onClick={() => { setUltimoCobroId(null); setShowCobro(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors">
          Registrar cobro
        </button>
        {ultimoCobroId && (
          <button onClick={() => downloadPdfCobro(ultimoCobroId).catch(console.error)}
            className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded text-sm font-medium hover:bg-green-200 transition-colors">
            Imprimir último recibo
          </button>
        )}
        <button onClick={() => downloadPdfCliente(clienteId, cliente.nombre).catch(console.error)}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
          Estado de cuenta PDF
        </button>
      </div>

      {/* Cobro modal */}
      {showCobro && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Registrar cobro</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Monto *</label>
              <input type="number" min="0.01" step="0.01" value={cobro.monto}
                onChange={(e) => setCobro((p) => ({ ...p, monto: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Medio de pago</label>
              <select value={cobro.medio_pago_id} onChange={(e) => setCobro((p) => ({ ...p, medio_pago_id: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sin movimiento de caja</option>
                {mediosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Descripción</label>
              <input value={cobro.descripcion}
                onChange={(e) => setCobro((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Cobro en efectivo..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {esCheque && (
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 space-y-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Datos del cheque</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">N° de cheque *</label>
                    <input value={cheque.numero}
                      onChange={(e) => setCheque((p) => ({ ...p, numero: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Banco</label>
                    <input value={cheque.banco}
                      onChange={(e) => setCheque((p) => ({ ...p, banco: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Emisor</label>
                    <input value={cheque.emisor}
                      onChange={(e) => setCheque((p) => ({ ...p, emisor: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Fecha emisión</label>
                    <input type="date" value={cheque.fecha_emision}
                      onChange={(e) => setCheque((p) => ({ ...p, fecha_emision: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Fecha acreditación *</label>
                  <input type="date" value={cheque.fecha_acreditacion}
                    onChange={(e) => setCheque((p) => ({ ...p, fecha_acreditacion: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            {/* Retenciones */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Retenciones</p>
                <button type="button" onClick={addRetencion}
                  className="text-xs text-blue-600 hover:underline">+ Agregar</button>
              </div>
              {retenciones.map((ret, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-end">
                  <div className="col-span-3">
                    <select value={ret.tipo} onChange={(e) => updateRetencion(i, 'tipo', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="ganancias">Ganancias</option>
                      <option value="iva">IVA</option>
                      <option value="iibb">IIBB</option>
                      <option value="suss">SUSS</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input placeholder="Descripción" value={ret.descripcion}
                      onChange={(e) => updateRetencion(i, 'descripcion', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-3">
                    <input type="number" placeholder="Monto" value={ret.monto}
                      onChange={(e) => updateRetencion(i, 'monto', e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2 text-right">
                    <button type="button" onClick={() => removeRetencion(i)}
                      className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                </div>
              ))}
              {retenciones.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">Sin retenciones</p>
              )}
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={handleCobrar} disabled={loading}
                className="bg-green-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex-1">
                {loading ? 'Guardando...' : 'Confirmar cobro'}
              </button>
              <button onClick={() => { setShowCobro(false); setError(''); }}
                className="px-4 py-2 rounded text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movements table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-right">Debe</th>
              <th className="px-4 py-3 text-right">Haber</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {movimientos.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200">
                  {m.descripcion}
                  {m.venta_numero && <span className="text-gray-400 dark:text-gray-500 ml-1 text-xs">V#{String(m.venta_numero).padStart(8, '0')}</span>}
                </td>
                <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                  {m.tipo === 'debito' ? `$${fmt(m.monto)}` : ''}
                </td>
                <td className="px-4 py-2.5 text-right text-green-700 font-medium">
                  {m.tipo === 'credito' ? `$${fmt(m.monto)}` : ''}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-100">${fmt(m.saldo_posterior)}</td>
              </tr>
            ))}
            {!movimientos.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Sin movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

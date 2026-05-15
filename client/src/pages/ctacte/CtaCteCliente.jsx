import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEstadoCuentaCliente, cobrar, downloadPdfCliente } from '../../services/ctaCteService';
import api from '../../lib/api';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CtaCteCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();

  const [estado, setEstado] = useState(null);
  const [mediosPago, setMediosPago] = useState([]);
  const [showCobro, setShowCobro] = useState(false);
  const [cobro, setCobro] = useState({ monto: '', descripcion: '', medio_pago_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await cobrar({
        cliente_id: parseInt(clienteId),
        monto: parseFloat(cobro.monto),
        descripcion: cobro.descripcion || undefined,
        medio_pago_id: cobro.medio_pago_id ? parseInt(cobro.medio_pago_id) : undefined
      });
      setShowCobro(false);
      setCobro((p) => ({ ...p, monto: '', descripcion: '' }));
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar cobro');
    } finally {
      setLoading(false);
    }
  };

  if (!estado) return <div className="p-6 text-gray-500">Cargando...</div>;

  const { cliente, movimientos, saldo_actual } = estado;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-800">{cliente.nombre}</h1>
          {cliente.cuit && <p className="text-sm text-gray-500">CUIT: {cliente.cuit}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo actual</p>
          <p className={`text-2xl font-bold ${parseFloat(saldo_actual) > 0 ? 'text-red-600' : 'text-green-700'}`}>
            ${fmt(saldo_actual)}
          </p>
          <p className="text-xs text-gray-400">{parseFloat(saldo_actual) > 0 ? 'Debe' : 'Sin deuda'}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <button onClick={() => setShowCobro(true)}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors">
          Registrar cobro
        </button>
        <button onClick={() => downloadPdfCliente(clienteId).catch(console.error)}
          className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
          Descargar PDF
        </button>
      </div>

      {/* Cobro modal */}
      {showCobro && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Registrar cobro</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input type="number" min="0.01" step="0.01" value={cobro.monto}
                onChange={(e) => setCobro((p) => ({ ...p, monto: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
              <select value={cobro.medio_pago_id} onChange={(e) => setCobro((p) => ({ ...p, medio_pago_id: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sin movimiento de caja</option>
                {mediosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input value={cobro.descripcion}
                onChange={(e) => setCobro((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Cobro en efectivo..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={handleCobrar} disabled={loading}
                className="bg-green-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex-1">
                {loading ? 'Guardando...' : 'Confirmar cobro'}
              </button>
              <button onClick={() => { setShowCobro(false); setError(''); }}
                className="px-4 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movements table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-right">Debe</th>
              <th className="px-4 py-3 text-right">Haber</th>
              <th className="px-4 py-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movimientos.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {m.descripcion}
                  {m.venta_numero && <span className="text-gray-400 ml-1 text-xs">V#{String(m.venta_numero).padStart(8, '0')}</span>}
                </td>
                <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                  {m.tipo === 'debito' ? `$${fmt(m.monto)}` : ''}
                </td>
                <td className="px-4 py-2.5 text-right text-green-700 font-medium">
                  {m.tipo === 'credito' ? `$${fmt(m.monto)}` : ''}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">${fmt(m.saldo_posterior)}</td>
              </tr>
            ))}
            {!movimientos.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

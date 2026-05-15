import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCuotas, pagarCuota } from '../../services/ctaCteService';
import api from '../../lib/api';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTADO_BADGE = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  pagada:    'bg-green-100 text-green-700',
  vencida:   'bg-red-100 text-red-600'
};

export default function Cuotas() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState('pendiente');
  const [mediosPago, setMediosPago] = useState([]);
  const [pagando, setPagando] = useState(null); // cuota being paid
  const [medioId, setMedioId] = useState('');
  const [error, setError] = useState('');

  const load = async (est = estado) => {
    const params = est === 'todas' ? {} : { estado: est };
    const { data: res } = await getCuotas(params);
    setData(res);
  };

  useEffect(() => {
    load();
    api.get('/medios-pago').then(({ data: m }) => {
      setMediosPago(m);
      if (m[0]) setMedioId(String(m[0].id));
    });
  }, []);

  useEffect(() => { load(estado); }, [estado]);

  const handlePagar = async () => {
    if (!pagando) return;
    setError('');
    setLoading(true);
    try {
      await pagarCuota(pagando.id, { medio_pago_id: medioId ? parseInt(medioId) : undefined });
      setPagando(null);
      load(estado);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const hoy = new Date();
  const isVencida = (fecha) => new Date(fecha) < hoy;
  const isProxima = (fecha) => {
    const d = new Date(fecha);
    const diff = (d - hoy) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Cuotas de clientes</h1>

      <div className="flex gap-2 mb-4">
        {['pendiente', 'vencida', 'pagada', 'todas'].map((e) => (
          <button key={e} onClick={() => setEstado(e)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors ${estado === e ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {e === 'todas' ? 'Todas' : e}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Venta</th>
              <th className="px-4 py-3 text-center">Cuota</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-left">Vencimiento</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{c.cliente}</td>
                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
                  #{String(c.venta_numero).padStart(8, '0')}
                </td>
                <td className="px-4 py-2.5 text-center text-gray-700">{c.numero_cuota}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-800">${fmt(c.monto)}</td>
                <td className="px-4 py-2.5">
                  <span className={
                    c.estado === 'pendiente' && isVencida(c.fecha_vencimiento) ? 'text-red-600 font-medium' :
                    c.estado === 'pendiente' && isProxima(c.fecha_vencimiento) ? 'text-yellow-600 font-medium' :
                    'text-gray-600'
                  }>
                    {new Date(c.fecha_vencimiento).toLocaleDateString('es-AR')}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[c.estado]}`}>
                    {c.estado}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {(c.estado === 'pendiente' || c.estado === 'vencida') && (
                    <button onClick={() => setPagando(c)}
                      className="text-green-600 hover:text-green-800 text-xs font-medium">
                      Cobrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin cuotas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pago modal */}
      {pagando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Cobrar cuota</h2>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p className="text-gray-700"><span className="font-medium">Cliente:</span> {pagando.cliente}</p>
              <p className="text-gray-700"><span className="font-medium">Cuota:</span> {pagando.numero_cuota}</p>
              <p className="text-gray-700"><span className="font-medium">Monto:</span> ${fmt(pagando.monto)}</p>
              <p className="text-gray-700"><span className="font-medium">Vence:</span> {new Date(pagando.fecha_vencimiento).toLocaleDateString('es-AR')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
              <select value={medioId} onChange={(e) => setMedioId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Sin movimiento de caja</option>
                {mediosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={handlePagar} disabled={loading}
                className="bg-green-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex-1">
                {loading ? 'Guardando...' : 'Confirmar cobro'}
              </button>
              <button onClick={() => { setPagando(null); setError(''); }}
                className="px-4 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

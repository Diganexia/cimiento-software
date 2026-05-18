import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDepositos, transferir } from '../../services/stockService';
import { getProductos } from '../../services/productosService';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Label = ({ children }) => <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{children}</label>;

export default function Transferencia() {
  const navigate = useNavigate();
  const [depositos, setDepositos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({ producto_id: '', deposito_origen_id: '', deposito_destino_id: '', cantidad: '', motivo: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    getDepositos().then((r) => setDepositos(r.data));
  }, []);

  useEffect(() => {
    if (busqueda.length < 2) { setProductos([]); return; }
    getProductos({ q: busqueda, activo: 'true', limit: 10 }).then((r) => setProductos(r.data.data));
  }, [busqueda]);

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await transferir({ ...form, cantidad: parseFloat(form.cantidad) });
      setOk(true);
      setTimeout(() => navigate('/stock/vista'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al transferir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Transferencia entre depósitos</h1>
      </div>

      {ok && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-4 text-sm">
          Transferencia realizada. Redirigiendo...
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div>
          <Label>Buscar producto</Label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setForm((f) => ({ ...f, producto_id: '' })); }}
            placeholder="Nombre o código..."
            className={inputCls}
          />
          {productos.length > 0 && !form.producto_id && (
            <ul className="border border-gray-200 dark:border-gray-700 rounded mt-1 divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-auto">
              {productos.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setForm((f) => ({ ...f, producto_id: p.id })); setBusqueda(p.nombre); setProductos([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex justify-between">
                    <span>{p.nombre}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">Stock: {p.stock_total}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Label>Depósito origen</Label>
          <select value={form.deposito_origen_id} onChange={set('deposito_origen_id')} className={inputCls} required>
            <option value="">Seleccionar...</option>
            {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>

        <div>
          <Label>Depósito destino</Label>
          <select value={form.deposito_destino_id} onChange={set('deposito_destino_id')} className={inputCls} required>
            <option value="">Seleccionar...</option>
            {depositos.filter((d) => d.id !== parseInt(form.deposito_origen_id)).map((d) => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>Cantidad</Label>
          <input type="number" min="0.001" step="0.001" value={form.cantidad} onChange={set('cantidad')} className={inputCls} required />
        </div>

        <div>
          <Label>Motivo (opcional)</Label>
          <input type="text" value={form.motivo} onChange={set('motivo')} className={inputCls} />
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || !form.producto_id}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Transfiriendo...' : 'Confirmar transferencia'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2 rounded text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

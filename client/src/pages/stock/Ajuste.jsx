import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { ajustar, getDepositos } from '../../services/stockService';

export default function Ajuste() {
  const navigate = useNavigate();

  const [depositos, setDepositos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);

  const [depositoId, setDepositoId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [productoNombre, setProductoNombre] = useState('');
  const [productoUnidad, setProductoUnidad] = useState('');
  const [cantidadActual, setCantidadActual] = useState(null);
  const [cantidadNueva, setCantidadNueva] = useState('');
  const [motivo, setMotivo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    getDepositos().then((r) => {
      setDepositos(r.data);
      if (r.data[0]) setDepositoId(String(r.data[0].id));
    });
  }, []);

  // Debounce búsqueda de producto
  useEffect(() => {
    if (!busqueda.trim()) { setProductos([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      const { data } = await api.get('/productos', { params: { q: busqueda, activo: 'true', limit: 10 } });
      setProductos(data.data || []);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Buscar stock actual cuando cambia producto o depósito
  useEffect(() => {
    if (!productoId || !depositoId) { setCantidadActual(null); return; }
    api.get('/stock', { params: { producto_id: productoId, deposito_id: depositoId } })
      .then((r) => {
        const fila = r.data.find((s) => String(s.producto_id) === String(productoId));
        setCantidadActual(fila ? parseFloat(fila.cantidad) : 0);
      })
      .catch(() => setCantidadActual(0));
  }, [productoId, depositoId]);

  const seleccionarProducto = (prod) => {
    setProductoId(String(prod.id));
    setProductoNombre(prod.nombre);
    setProductoUnidad(prod.unidad_abreviatura || prod.unidad || '');
    setBusqueda('');
    setProductos([]);
    setCantidadNueva('');
  };

  const limpiar = () => {
    setProductoId('');
    setProductoNombre('');
    setProductoUnidad('');
    setCantidadActual(null);
    setCantidadNueva('');
    setMotivo('');
    setError('');
    setExito(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!productoId) { setError('Seleccioná un producto'); return; }
    if (!depositoId) { setError('Seleccioná un depósito'); return; }
    if (cantidadNueva === '') { setError('Ingresá la cantidad nueva'); return; }
    if (!motivo.trim()) { setError('Ingresá un motivo'); return; }

    setLoading(true);
    try {
      await ajustar({ producto_id: parseInt(productoId), deposito_id: parseInt(depositoId), cantidad_nueva: parseFloat(cantidadNueva), motivo });
      setExito(true);
      setCantidadActual(parseFloat(cantidadNueva));
      setCantidadNueva('');
      setMotivo('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al ajustar stock');
    } finally {
      setLoading(false);
    }
  };

  const delta = cantidadNueva !== '' && cantidadActual !== null ? parseFloat(cantidadNueva) - cantidadActual : null;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/stock/vista')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Ajuste de stock</h1>
      </div>

      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          Ajuste registrado correctamente.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">

        {/* Depósito */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Depósito</label>
          <select
            value={depositoId}
            onChange={(e) => { setDepositoId(e.target.value); setCantidadActual(null); }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar depósito...</option>
            {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>

        {/* Producto */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Producto</label>
          {productoId ? (
            <div className="flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700">
              <span className="text-gray-800 dark:text-gray-100">{productoNombre}</span>
              <button type="button" onClick={limpiar} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 ml-2">✕</button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {buscando && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Buscando...</p>}
              {productos.length > 0 && (
                <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {productos.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => seleccionarProducto(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between"
                      >
                        <span>{p.nombre}</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs">{p.codigo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Stock actual */}
        {productoId && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded px-4 py-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Stock actual en depósito: </span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {cantidadActual !== null ? parseFloat(parseFloat(cantidadActual).toFixed(3)).toString() : '—'}
              {cantidadActual !== null && productoUnidad && <span className="text-gray-500 dark:text-gray-400 ml-1">{productoUnidad}</span>}
            </span>
          </div>
        )}

        {/* Cantidad nueva */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cantidad nueva</label>
          <input
            type="number"
            min="0"
            step="1"
            value={cantidadNueva}
            onChange={(e) => { setCantidadNueva(e.target.value); setExito(false); }}
            placeholder="0"
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {delta !== null && (
            <p className={`text-xs mt-1 ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>
              {delta === 0 ? 'Sin cambio' : `${delta > 0 ? '+' : ''}${parseFloat(delta.toFixed(3))} ${productoUnidad || 'unidades'}`}
            </p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Motivo</label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Conteo físico, devolución, merma..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando...' : 'Guardar ajuste'}
        </button>
      </form>
    </div>
  );
}

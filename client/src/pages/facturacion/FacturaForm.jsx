import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { crearFactura, getVentasDisponibles } from '../../services/facturacionService';
import { getClientes } from '../../services/clientesService';
import { getPuntosVenta } from '../../services/ventasService';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIPO_OPTIONS = [
  { value: 'factura_a',      label: 'Factura A' },
  { value: 'factura_b',      label: 'Factura B' },
  { value: 'nota_debito_a',  label: 'Nota de Débito A' },
  { value: 'nota_debito_b',  label: 'Nota de Débito B' },
  { value: 'nota_credito_a', label: 'Nota de Crédito A' },
  { value: 'nota_credito_b', label: 'Nota de Crédito B' },
];

export default function FacturaForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo') || 'factura_a';

  const [clientes, setClientes] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [ventasDisponibles, setVentasDisponibles] = useState([]);

  const [clienteId, setClienteId] = useState('');
  const [tipo, setTipo] = useState(tipoParam);
  const [puntoVentaId, setPuntoVentaId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([]);
  const [ventasSeleccionadas, setVentasSeleccionadas] = useState(new Set());
  const [panelVentas, setPanelVentas] = useState(false);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getClientes({ limit: 200, activo: 'true' }),
      getPuntosVenta()
    ]).then(([cli, pv]) => {
      setClientes(cli.data.data || cli.data);
      setPuntosVenta(pv.data);
      if (pv.data[0]) setPuntoVentaId(String(pv.data[0].id));
    }).catch(() => {});
  }, []);

  // Cargar ventas disponibles cuando cambia el cliente
  useEffect(() => {
    if (!panelVentas) return;
    setLoadingVentas(true);
    const params = {};
    if (clienteId) params.cliente_id = clienteId;
    getVentasDisponibles(params)
      .then((r) => setVentasDisponibles(r.data))
      .catch(() => {})
      .finally(() => setLoadingVentas(false));
  }, [clienteId, panelVentas]);

  const abrirPanelVentas = () => {
    setPanelVentas(true);
    setLoadingVentas(true);
    const params = {};
    if (clienteId) params.cliente_id = clienteId;
    getVentasDisponibles(params)
      .then((r) => setVentasDisponibles(r.data))
      .catch(() => {})
      .finally(() => setLoadingVentas(false));
  };

  const toggleVenta = (venta) => {
    const sel = new Set(ventasSeleccionadas);
    if (sel.has(venta.id)) {
      sel.delete(venta.id);
      setItems((prev) => prev.filter((i) => i._venta_id !== venta.id));
    } else {
      sel.add(venta.id);
      const nuevos = (venta.items || []).map((vi) => ({
        _key: `v${venta.id}_i${vi.id}`,
        _venta_id: venta.id,
        _venta_numero: venta.numero,
        descripcion: vi.descripcion,
        cantidad: parseFloat(vi.cantidad),
        precio_unitario: parseFloat(vi.precio_unitario),
        subtotal: parseFloat(vi.subtotal),
        producto_id: vi.producto_id,
        es_manual: false
      }));
      setItems((prev) => [...prev, ...nuevos]);
    }
    setVentasSeleccionadas(sel);
  };

  const agregarManual = () => {
    setItems((prev) => [...prev, {
      _key: `m_${Date.now()}`,
      _venta_id: null,
      _venta_numero: null,
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
      producto_id: null,
      es_manual: true
    }]);
  };

  const updateItem = (key, field, value) => {
    setItems((prev) => prev.map((i) => {
      if (i._key !== key) return i;
      const updated = { ...i, [field]: value };
      updated.subtotal = parseFloat(updated.cantidad || 0) * parseFloat(updated.precio_unitario || 0);
      return updated;
    }));
  };

  const removeItem = (key) => {
    const item = items.find((i) => i._key === key);
    if (item?._venta_id) {
      const sel = new Set(ventasSeleccionadas);
      sel.delete(item._venta_id);
      setVentasSeleccionadas(sel);
      setItems((prev) => prev.filter((i) => i._venta_id !== item._venta_id));
    } else {
      setItems((prev) => prev.filter((i) => i._key !== key));
    }
  };

  const subtotal = items.reduce((acc, i) => acc + (parseFloat(i.subtotal) || 0), 0);

  const handleSubmit = async (emitir = false) => {
    setError('');
    if (!items.length) { setError('Agregá al menos un ítem o nota de venta'); return; }

    setLoading(true);
    try {
      const venta_ids = [...ventasSeleccionadas];
      const items_manuales = items
        .filter((i) => i.es_manual)
        .map((i) => ({ descripcion: i.descripcion, cantidad: parseFloat(i.cantidad), precio_unitario: parseFloat(i.precio_unitario) }));

      const { data } = await crearFactura({
        cliente_id: clienteId || null,
        tipo,
        punto_venta_id: puntoVentaId || null,
        venta_ids,
        items_manuales,
        observaciones: observaciones || null
      });

      navigate(`/facturacion/${data.id}${emitir ? '?emitir=1' : ''}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/facturacion')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm">← Volver</button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Nueva Factura</h1>
      </div>

      {/* Cabecera */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cliente</label>
          <select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setVentasSeleccionadas(new Set()); setItems((prev) => prev.filter((i) => i.es_manual)); }}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Consumidor Final</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Punto de venta ARCA</label>
          <select value={puntoVentaId} onChange={(e) => setPuntoVentaId(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sin punto de venta</option>
            {puntosVenta.map((pv) => <option key={pv.id} value={pv.id}>{pv.nombre} (N°{pv.numero})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Observaciones</label>
          <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Opcional..." />
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Ítems de la factura</p>
          <div className="flex gap-2">
            <button onClick={abrirPanelVentas}
              className="text-xs border border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400 px-3 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              + Desde notas de venta
            </button>
            <button onClick={agregarManual}
              className="text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              + Ítem manual
            </button>
          </div>
        </div>

        {/* Panel notas de venta */}
        {panelVentas && (
          <div className="mb-4 border border-blue-200 dark:border-blue-700 rounded-lg overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Notas de venta disponibles {clienteId ? 'para este cliente' : '(todos los clientes)'}
              </span>
              <button onClick={() => setPanelVentas(false)} className="text-blue-500 hover:text-blue-700 text-xs">Cerrar</button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {loadingVentas ? (
                <p className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">Cargando...</p>
              ) : ventasDisponibles.length === 0 ? (
                <p className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">
                  No hay notas de venta disponibles para facturar
                </p>
              ) : ventasDisponibles.map((v) => (
                <label key={v.id} className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${ventasSeleccionadas.has(v.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                  <input type="checkbox" checked={ventasSeleccionadas.has(v.id)} onChange={() => toggleVenta(v)}
                    className="mt-0.5 rounded border-gray-300 dark:border-gray-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        N° {String(v.numero).padStart(8, '0')}
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{v.tipo_comprobante === 'remito' ? 'Remito' : 'Comp. Interno'}</span>
                      </span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">${fmt(v.total)}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {v.cliente || 'Ocasional'} — {v.created_at ? new Date(v.created_at).toLocaleDateString('es-AR') : ''}
                      {v.items?.length ? ` — ${v.items.length} ítem${v.items.length > 1 ? 's' : ''}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tabla ítems */}
        {items.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            Usá los botones de arriba para agregar ítems
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 pb-1">
              <span className="col-span-5">Descripción</span>
              <span className="col-span-2 text-center">Origen</span>
              <span className="col-span-1 text-right">Cant</span>
              <span className="col-span-2 text-right">P.Unit.</span>
              <span className="col-span-1 text-right">Subtotal</span>
              <span className="col-span-1"></span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => (
                <div key={item._key} className="grid grid-cols-12 gap-2 items-center py-2 px-2">
                  <div className="col-span-5">
                    {item.es_manual ? (
                      <input value={item.descripcion} onChange={(e) => updateItem(item._key, 'descripcion', e.target.value)}
                        placeholder="Descripción del ítem..."
                        className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    ) : (
                      <span className="text-sm text-gray-800 dark:text-gray-100 truncate block">{item.descripcion}</span>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    {item._venta_numero
                      ? <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">#{String(item._venta_numero).padStart(8, '0')}</span>
                      : <span className="text-xs text-gray-400 dark:text-gray-500">Manual</span>
                    }
                  </div>
                  <div className="col-span-1">
                    <input type="number" min="0.001" step="0.001" value={item.cantidad}
                      onChange={(e) => updateItem(item._key, 'cantidad', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" value={item.precio_unitario}
                      onChange={(e) => updateItem(item._key, 'precio_unitario', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="col-span-1 text-right text-sm font-medium text-gray-800 dark:text-gray-100">
                    ${fmt(item.subtotal)}
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => removeItem(item._key)} className="text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <div className="text-right space-y-1">
              <div className="flex gap-8 text-sm text-gray-600 dark:text-gray-300">
                <span>Subtotal:</span><span>${fmt(subtotal)}</span>
              </div>
              <div className="flex gap-8 text-lg font-bold text-gray-900 dark:text-gray-100">
                <span>Total:</span><span>${fmt(subtotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mb-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{error}</p>}

      <div className="flex justify-between">
        <button onClick={() => navigate('/facturacion')}
          className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Cancelar
        </button>
        <div className="flex gap-2">
          <button onClick={() => handleSubmit(false)} disabled={loading}
            className="border border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400 px-4 py-2 rounded text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button onClick={() => handleSubmit(true)} disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
            {loading ? 'Procesando...' : 'Guardar y emitir con ARCA'}
          </button>
        </div>
      </div>
    </div>
  );
}

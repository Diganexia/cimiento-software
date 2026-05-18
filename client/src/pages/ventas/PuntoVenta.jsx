import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { crearVenta, getMediosPago, getPuntosVenta, downloadPdf } from '../../services/ventasService';
import { getClientes } from '../../services/clientesService';
import { getArqueoActual } from '../../services/cajaService';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIPO_OPTIONS = [
  { value: 'remito', label: 'Remito' },
  { value: 'factura_interna', label: 'Comp. Interno' },
  { value: 'factura_b', label: 'Factura B' },
  { value: 'factura_a', label: 'Factura A' },
  { value: 'nota_debito_a', label: 'Nota Débito A' },
  { value: 'nota_debito_b', label: 'Nota Débito B' },
  { value: 'nota_credito_a', label: 'Nota Crédito A' },
  { value: 'nota_credito_b', label: 'Nota Crédito B' },
];

const REQUIERE_AFIP = new Set(['factura_a', 'factura_b', 'nota_debito_a', 'nota_debito_b', 'nota_credito_a', 'nota_credito_b']);

export default function PuntoVenta() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [cart, setCart] = useState([]);

  const [depositos, setDepositos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);

  const [depositoId, setDepositoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('remito');
  const [tipoPago, setTipoPago] = useState('contado');
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [puntoVentaId, setPuntoVentaId] = useState('');
  const [pagos, setPagos] = useState([{ medio_pago_id: '', monto: '' }]);

  const [redondeo, setRedondeo] = useState(false);
  const [redondeoStep, setRedondeoStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmada, setConfirmada] = useState(null);
  const [cajaAbierta, setCajaAbierta] = useState(null); // null=cargando, true=ok, false=cerrada

  useEffect(() => {
    Promise.all([
      api.get('/depositos'),
      getClientes({ limit: 200, activo: 'true' }),
      getMediosPago(),
      getPuntosVenta(),
      getArqueoActual().then(({ data }) => data).catch(() => null)
    ]).then(([dep, cli, med, pv, arqueo]) => {
      setDepositos(dep.data);
      setClientes(cli.data.data || cli.data);
      setMediosPago(med.data);
      setPuntosVenta(pv.data);
      if (dep.data[0]) setDepositoId(String(dep.data[0].id));
      if (med.data[0]) setPagos([{ medio_pago_id: String(med.data[0].id), monto: '' }]);
      setCajaAbierta(!!(arqueo?.arqueo));
    });
  }, []);

  // Debounce product search
  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      const { data } = await api.get('/productos', { params: { q: busqueda, activo: 'true', limit: 10 } });
      setResultados(data.data || []);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const agregarProducto = (prod) => {
    setBusqueda('');
    setResultados([]);
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.producto_id === prod.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, {
        producto_id: prod.id,
        nombre: prod.nombre,
        codigo: prod.codigo,
        cantidad: 1,
        precio_unitario: parseFloat(prod.precio_venta || 0),
        descuento_porcentaje: 0
      }];
    });
    searchRef.current?.focus();
  };

  const updateItem = (idx, field, value) => {
    setCart((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: parseFloat(value) || 0 };
      return next;
    });
  };

  const removeItem = (idx) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = cart.reduce((acc, i) => acc + i.precio_unitario * i.cantidad * (1 - i.descuento_porcentaje / 100), 0);
  const descM = subtotal * (parseFloat(descuentoGlobal) || 0) / 100;
  const total = subtotal - descM;
  const totalBase = Math.floor(total / 100) * 100;
  const hayDecimales = total - totalBase > 0.01;
  const totalEfectivo = redondeo ? totalBase + redondeoStep * 50 : total;
  const montoRedondeo = total - totalEfectivo;

  // Resetear redondeo si cambia el total
  useEffect(() => { setRedondeo(false); }, [total]);

  const handleRedondeo = (checked) => {
    setRedondeo(checked);
    if (checked) {
      const savedStep = Math.min(2, parseInt(localStorage.getItem('ferreteria_redondeo_step') || '0'));
      setRedondeoStep(savedStep);
      if (pagos.length === 1) {
        setPagos([{ ...pagos[0], monto: String(totalBase + savedStep * 50) }]);
      }
    }
  };

  const handleStepChange = (delta) => {
    setRedondeoStep(prev => {
      const next = Math.max(0, Math.min(2, prev + delta));
      localStorage.setItem('ferreteria_redondeo_step', String(next));
      if (pagos.length === 1) {
        setPagos(p => [{ ...p[0], monto: String(totalBase + next * 50) }]);
      }
      return next;
    });
  };

  const agregarPago = () => {
    const primerMedio = mediosPago[0]?.id ? String(mediosPago[0].id) : '';
    setPagos((p) => [...p, { medio_pago_id: primerMedio, monto: '' }]);
  };
  const removePago = (i) => setPagos((p) => p.filter((_, idx) => idx !== i));
  const setPago = (i, f, v) => setPagos((p) => { const n = [...p]; n[i] = { ...n[i], [f]: v }; return n; });

  const totalPagado = pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);

  const handleSubmit = async () => {
    setError('');
    if (!depositoId) { setError('Seleccione un depósito'); return; }
    if (!cart.length) { setError('Agregue al menos un producto'); return; }
    if (tipoPago !== 'cuenta_corriente' && Math.abs(totalPagado - totalEfectivo) > 0.01) {
      setError(`El total pagado ($${fmt(totalPagado)}) no coincide con el total ($${fmt(totalEfectivo)})`);
      return;
    }
    if (REQUIERE_AFIP.has(tipoComprobante) && !puntoVentaId) {
      setError('Seleccione un punto de venta ARCA para emitir este comprobante');
      return;
    }

    setLoading(true);
    try {
      const { data } = await crearVenta({
        cliente_id: clienteId || null,
        deposito_id: parseInt(depositoId),
        tipo_comprobante: tipoComprobante,
        tipo_pago: tipoPago,
        descuento_porcentaje: parseFloat(descuentoGlobal) || 0,
        redondeo_monto: redondeo ? montoRedondeo : 0,
        observaciones: observaciones || null,
        punto_venta_id: puntoVentaId ? parseInt(puntoVentaId) : null,
        items: cart.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          descuento_porcentaje: i.descuento_porcentaje
        })),
        pagos: tipoPago !== 'cuenta_corriente'
          ? pagos.filter((p) => p.medio_pago_id && parseFloat(p.monto) > 0).map((p) => ({
              medio_pago_id: parseInt(p.medio_pago_id),
              monto: parseFloat(p.monto)
            }))
          : [],
        confirmar: true
      });
      setConfirmada(data);
    } catch (err) {
      const esTimeout = !err.response;
      const msg = err.response?.data?.error || 'Error al procesar la venta';
      setError(esTimeout
        ? `${msg} — Verificá en el listado de Ventas que no se haya generado antes de reintentar.`
        : msg
      );
    } finally {
      setLoading(false);
    }
  };

  if (confirmada) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Venta confirmada</h2>
          <p className="text-gray-600 dark:text-gray-300">N° {String(confirmada.numero).padStart(8, '0')}</p>
          {confirmada.arca_error && (
            <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 rounded text-sm text-left">
              <p className="font-medium">Comprobante ARCA no emitido</p>
              <p className="text-xs mt-1">{confirmada.arca_error}</p>
            </div>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => downloadPdf(confirmada.id).catch(console.error)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
              Descargar PDF
            </button>
            <button onClick={() => { setConfirmada(null); setCart([]); setClienteId(''); setObservaciones(''); setDescuentoGlobal(0); setRedondeo(false); setRedondeoStep(0); }}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
              Nueva venta
            </button>
          </div>
          <button onClick={() => navigate('/ventas')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 underline">
            Ver todas las ventas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Punto de Venta</h1>
      </div>
      {cajaAbierta === false && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded text-sm">
          Caja cerrada. Abrí la caja en <strong>Tesorería → Caja</strong> antes de realizar ventas.
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: product search + cart */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <input
              ref={searchRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre o código..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {resultados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {resultados.map((p) => (
                  <button key={p.id} onClick={() => agregarProducto(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.nombre}</span>
                        {p.codigo && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">[{p.codigo}]</span>}
                      </div>
                      <span className="text-sm font-semibold text-blue-700">${fmt(p.precio_venta)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {buscando && (
              <div className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 text-xs">Buscando...</div>
            )}
          </div>

          {/* Cart */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide grid grid-cols-12 gap-2">
              <span className="col-span-4">Producto</span>
              <span className="col-span-2 text-right">Precio</span>
              <span className="col-span-2 text-right">Cant</span>
              <span className="col-span-2 text-right">Desc%</span>
              <span className="col-span-1 text-right">Subtotal</span>
              <span className="col-span-1"></span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {cart.map((item, idx) => {
                const sub = item.precio_unitario * item.cantidad * (1 - item.descuento_porcentaje / 100);
                return (
                  <div key={idx} className="px-4 py-2 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{item.nombre}</p>
                      {item.codigo && <p className="text-xs text-gray-400 dark:text-gray-500">{item.codigo}</p>}
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01" value={item.precio_unitario}
                        onChange={(e) => updateItem(idx, 'precio_unitario', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0.001" step="any" value={item.cantidad}
                        onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" max="100" step="0.1" value={item.descuento_porcentaje}
                        onChange={(e) => updateItem(idx, 'descuento_porcentaje', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="col-span-1 text-right text-sm font-medium text-gray-800 dark:text-gray-100">${fmt(sub)}</div>
                    <div className="col-span-1 text-right">
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              {!cart.length && (
                <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm">
                  Busque productos para agregar al carrito
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: sale config + totals */}
        <div className="w-72 flex flex-col gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Depósito *</label>
              <select value={depositoId} onChange={(e) => setDepositoId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar...</option>
                {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cliente</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Consumidor final</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo comprobante</label>
              <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {REQUIERE_AFIP.has(tipoComprobante) && puntosVenta.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Punto de venta ARCA</label>
                <select value={puntoVentaId} onChange={(e) => setPuntoVentaId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar...</option>
                  {puntosVenta.map((pv) => <option key={pv.id} value={pv.id}>{pv.nombre} (N°{pv.numero})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tipo de pago</label>
              <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="contado">Contado</option>
                <option value="cuenta_corriente">Cuenta corriente</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descuento global (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={descuentoGlobal}
                onChange={(e) => setDescuentoGlobal(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Payments */}
          {tipoPago !== 'cuenta_corriente' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Formas de pago</p>
              {pagos.map((pago, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <select value={pago.medio_pago_id} onChange={(e) => setPago(i, 'medio_pago_id', e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {mediosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                  <input type="number" min="0" step="0.01" value={pago.monto} placeholder="$0"
                    onChange={(e) => setPago(i, 'monto', e.target.value)}
                    className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  {pagos.length > 1 && (
                    <button onClick={() => removePago(i)} className="text-red-400 hover:text-red-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={agregarPago} className="text-xs text-blue-600 hover:text-blue-800">+ Agregar forma de pago</button>
            </div>
          )}

          {/* Totals */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Subtotal:</span><span>${fmt(subtotal)}</span>
            </div>
            {descM > 0 && (
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Descuento:</span><span>-${fmt(descM)}</span>
              </div>
            )}
            {hayDecimales && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={redondeo}
                    onChange={(e) => handleRedondeo(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Redondear
                </label>
                {redondeo && (
                  <>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 ml-1">${fmt(totalEfectivo)}</span>
                    <button type="button" onClick={() => handleStepChange(-1)} disabled={redondeoStep === 0}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-800 disabled:opacity-25 leading-none px-0.5">▼</button>
                    <button type="button" onClick={() => handleStepChange(1)} disabled={redondeoStep >= 2}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-800 disabled:opacity-25 leading-none px-0.5">▲</button>
                  </>
                )}
              </div>
            )}
            {redondeo && (
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>Redondeo:</span>
                <span>{montoRedondeo >= 0 ? '-' : '+'}{fmt(Math.abs(montoRedondeo))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100 pt-1 border-t border-gray-200 dark:border-gray-700">
              <span>Total:</span><span>${fmt(totalEfectivo)}</span>
            </div>
            {tipoPago !== 'cuenta_corriente' && (
              <div className={`flex justify-between text-sm ${Math.abs(totalPagado - totalEfectivo) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                <span>Pagado:</span><span>${fmt(totalPagado)}</span>
              </div>
            )}
          </div>

          {error && <p className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading || !cart.length || cajaAbierta === false}
            className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
            {loading ? 'Procesando...' : 'Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getFactura, emitirFactura, downloadFacturaPdf } from '../../services/facturacionService';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIPO_LABEL = {
  factura_a: 'FACTURA A', factura_b: 'FACTURA B',
  nota_debito_a: 'NOTA DE DÉBITO A', nota_debito_b: 'NOTA DE DÉBITO B',
  nota_credito_a: 'NOTA DE CRÉDITO A', nota_credito_b: 'NOTA DE CRÉDITO B',
};

const ESTADO_BADGE = {
  borrador: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  emitida:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  error:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function FacturaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emitiendo, setEmitiendo] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');
  const [arcaMsg, setArcaMsg] = useState('');

  useEffect(() => {
    getFactura(id)
      .then((r) => setFactura(r.data))
      .catch(() => setError('No se pudo cargar la factura'))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-emitir si viene ?emitir=1 y está en borrador
  useEffect(() => {
    if (factura?.estado === 'borrador' && searchParams.get('emitir') === '1') {
      handleEmitir();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factura?.id]);

  const handleEmitir = async () => {
    setError('');
    setArcaMsg('');
    setEmitiendo(true);
    try {
      const { data } = await emitirFactura(id);
      setFactura((prev) => ({ ...prev, estado: 'emitida', cae: data.cae, cae_vencimiento: data.cae_vencimiento }));
      setArcaMsg(`CAE emitido: ${data.cae} — Vence: ${data.cae_vencimiento}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al emitir con ARCA';
      setError(msg);
      if (err.response?.data?.estado === 'error') {
        setFactura((prev) => ({ ...prev, estado: 'error' }));
      }
    } finally {
      setEmitiendo(false);
    }
  };

  const handleDescargar = async () => {
    setDescargando(true);
    try { await downloadFacturaPdf(id, factura?.cliente_nombre, factura?.numero); } catch (_) {}
    setDescargando(false);
  };

  if (loading) return <div className="p-6 text-center text-gray-400 dark:text-gray-500">Cargando...</div>;
  if (!factura) return <div className="p-6 text-center text-gray-400 dark:text-gray-500">{error || 'Factura no encontrada'}</div>;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/facturacion')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm">← Volver</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {TIPO_LABEL[factura.tipo]} N° {String(factura.numero).padStart(8, '0')}
              </h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[factura.estado]}`}>
                {factura.estado}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {factura.fecha ? new Date(factura.fecha + 'T00:00:00').toLocaleDateString('es-AR') : '—'} — {factura.usuario}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDescargar} disabled={descargando}
            className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            {descargando ? 'Descargando...' : 'Descargar PDF'}
          </button>
          {factura.estado === 'borrador' && (
            <button onClick={handleEmitir} disabled={emitiendo || !factura.punto_venta_id}
              title={!factura.punto_venta_id ? 'Asigná un punto de venta ARCA para emitir' : ''}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
              {emitiendo ? 'Emitiendo...' : 'Emitir con ARCA'}
            </button>
          )}
        </div>
      </div>

      {arcaMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded text-sm">
          {arcaMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded text-sm">
          {error}
        </div>
      )}

      {/* Datos principales */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">{factura.cliente_nombre || 'Consumidor Final'}</p>
          {factura.cliente_cuit && <p className="text-sm text-gray-500 dark:text-gray-400">CUIT: {factura.cliente_cuit}</p>}
          {factura.cliente_dni && <p className="text-sm text-gray-500 dark:text-gray-400">DNI: {factura.cliente_dni}</p>}
          {factura.cliente_direccion && <p className="text-sm text-gray-500 dark:text-gray-400">{factura.cliente_direccion}</p>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Comprobante</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Tipo: <span className="font-medium text-gray-800 dark:text-gray-100">{TIPO_LABEL[factura.tipo]}</span></p>
          {factura.punto_venta_nombre && (
            <p className="text-sm text-gray-600 dark:text-gray-300">Pto. venta: <span className="font-medium text-gray-800 dark:text-gray-100">{factura.punto_venta_nombre} (N°{factura.punto_venta_numero})</span></p>
          )}
          {factura.cae && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">CAE: <span className="font-mono text-gray-800 dark:text-gray-100">{factura.cae}</span></p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Vence: <span className="text-gray-800 dark:text-gray-100">{factura.cae_vencimiento}</span></p>
            </>
          )}
          {factura.observaciones && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{factura.observaciones}</p>}
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide grid grid-cols-12 gap-2">
          <span className="col-span-5">Descripción</span>
          <span className="col-span-2">Origen</span>
          <span className="col-span-1 text-right">Cant</span>
          <span className="col-span-2 text-right">P. Unit.</span>
          <span className="col-span-2 text-right">Subtotal</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {(factura.items || []).map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2.5">
              <div className="col-span-5 text-sm text-gray-800 dark:text-gray-100">{item.descripcion}</div>
              <div className="col-span-2">
                {item.venta_numero
                  ? <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">#{String(item.venta_numero).padStart(8, '0')}</span>
                  : <span className="text-xs text-gray-400 dark:text-gray-500">Manual</span>
                }
              </div>
              <div className="col-span-1 text-right text-sm text-gray-600 dark:text-gray-300">{fmt(item.cantidad)}</div>
              <div className="col-span-2 text-right text-sm text-gray-600 dark:text-gray-300">${fmt(item.precio_unitario)}</div>
              <div className="col-span-2 text-right text-sm font-medium text-gray-800 dark:text-gray-100">${fmt(item.subtotal)}</div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Total: ${fmt(factura.total)}</p>
          </div>
        </div>
      </div>

      {/* Notas de venta cubiertas */}
      {factura.ventas_cubiertas?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Notas de venta incluidas ({factura.ventas_cubiertas.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {factura.ventas_cubiertas.map((v) => (
              <button key={v.id} onClick={() => navigate(`/ventas/${v.id}`)}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                N° {String(v.numero).padStart(8, '0')} — ${fmt(v.total)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

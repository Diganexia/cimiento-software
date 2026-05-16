import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getVenta, anularVenta, downloadPdf } from '../../services/ventasService';

const TIPO_LABEL = {
  remito: 'Remito', factura_interna: 'Comprobante Interno',
  factura_a: 'Factura A', factura_b: 'Factura B'
};
const ESTADO_BADGE = {
  borrador: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-green-100 text-green-700',
  anulada: 'bg-red-100 text-red-600'
};
const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function VentaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await getVenta(id);
    setVenta(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleAnular = async () => {
    if (!confirm('¿Anular esta venta? Se revertirá el stock.')) return;
    await anularVenta(id);
    load();
  };

  if (loading) return <div className="p-6 text-gray-500">Cargando...</div>;
  if (!venta) return <div className="p-6 text-red-500">Venta no encontrada</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {TIPO_LABEL[venta.tipo_comprobante]} N° {String(venta.numero).padStart(8, '0')}
        </h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[venta.estado]}`}>{venta.estado}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
          <p className="font-medium text-gray-700">Datos de la venta</p>
          <p className="text-gray-600">Fecha: {new Date(venta.created_at).toLocaleDateString('es-AR')}</p>
          <p className="text-gray-600">Depósito: {venta.deposito}</p>
          <p className="text-gray-600">Usuario: {venta.usuario}</p>
          <p className="text-gray-600">Tipo pago: {venta.tipo_pago}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
          <p className="font-medium text-gray-700">Cliente</p>
          {venta.cliente
            ? <>
                <p className="text-gray-800 font-medium">{venta.cliente}</p>
                {venta.cliente_cuit && <p className="text-gray-600">CUIT: {venta.cliente_cuit}</p>}
                {venta.cliente_dni && <p className="text-gray-600">DNI: {venta.cliente_dni}</p>}
                {venta.cliente_direccion && <p className="text-gray-600">{venta.cliente_direccion}</p>}
              </>
            : <p className="text-gray-400">Consumidor final</p>}
        </div>
      </div>

      {venta.cae && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
          <p className="font-medium text-blue-800 mb-1">Comprobante AFIP</p>
          <p className="text-blue-700">CAE: {venta.cae} — Vence: {venta.cae_vencimiento}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Cód</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-right">Cant</th>
              <th className="px-4 py-3 text-right">Precio unit.</th>
              <th className="px-4 py-3 text-right">Desc%</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {venta.items?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-gray-500 font-mono text-xs">{item.codigo || '—'}</td>
                <td className="px-4 py-2 text-gray-800">{item.producto}</td>
                <td className="px-4 py-2 text-right text-gray-700">{fmt(item.cantidad)} {item.unidad}</td>
                <td className="px-4 py-2 text-right text-gray-700">${fmt(item.precio_unitario)}</td>
                <td className="px-4 py-2 text-right text-gray-500">{fmt(item.descuento_porcentaje)}%</td>
                <td className="px-4 py-2 text-right font-medium text-gray-800">${fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>${fmt(venta.subtotal)}</span></div>
          {parseFloat(venta.descuento_monto) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Descuento ({fmt(venta.descuento_porcentaje)}%):</span>
              <span>-${fmt(venta.descuento_monto)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total:</span><span>${fmt(venta.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => downloadPdf(id).catch(console.error)}
          className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
          Descargar PDF
        </button>
        {venta.estado === 'confirmada' && (
          <button onClick={handleAnular}
            className="bg-red-50 border border-red-300 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-100 transition-colors">
            Anular venta
          </button>
        )}
      </div>
    </div>
  );
}

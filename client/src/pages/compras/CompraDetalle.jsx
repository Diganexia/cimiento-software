import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompra, confirmarCompra } from '../../services/comprasService';
import { usePermission } from '../../hooks/usePermission';

const ESTADO_META = {
  borrador:   { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600' },
  confirmada: { label: 'Confirmada', cls: 'bg-green-100 text-green-700' },
  anulada:    { label: 'Anulada',    cls: 'bg-red-100 text-red-600' }
};

export default function CompraDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [compra, setCompra] = useState(null);
  const canConfirm = usePermission('compras', 'confirmar');
  const canEdit    = usePermission('compras', 'crear');

  useEffect(() => {
    getCompra(id).then(({ data }) => setCompra(data)).catch(() => navigate('/compras'));
  }, [id, navigate]);

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar compra? Se ingresará el stock automáticamente.')) return;
    await confirmarCompra(id);
    getCompra(id).then(({ data }) => setCompra(data));
  };

  if (!compra) return <div className="p-6 text-gray-400">Cargando...</div>;

  const meta = ESTADO_META[compra.estado] || { label: compra.estado, cls: 'bg-gray-100 text-gray-600' };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-800">Compra #{compra.id}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.cls}`}>{meta.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{new Date(compra.created_at).toLocaleString('es-AR')}</p>
        </div>
        <div className="flex gap-2">
          {compra.estado === 'borrador' && canEdit && (
            <button onClick={() => navigate(`/compras/${id}/editar`)}
              className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors">
              Editar
            </button>
          )}
          {compra.estado === 'borrador' && canConfirm && (
            <button onClick={handleConfirmar}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 transition-colors">
              Confirmar
            </button>
          )}
        </div>
      </div>

      {/* Datos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-gray-500">Proveedor</p><p className="font-medium text-gray-800 mt-0.5">{compra.proveedor}</p></div>
        <div><p className="text-gray-500">Depósito destino</p><p className="font-medium text-gray-800 mt-0.5">{compra.deposito}</p></div>
        <div><p className="text-gray-500">Número de remito</p><p className="font-medium text-gray-800 mt-0.5">{compra.numero_remito || '—'}</p></div>
        <div><p className="text-gray-500">Fecha comprobante</p><p className="font-medium text-gray-800 mt-0.5">{compra.fecha_comprobante ? new Date(compra.fecha_comprobante).toLocaleDateString('es-AR') : '—'}</p></div>
        <div><p className="text-gray-500">Registrado por</p><p className="font-medium text-gray-800 mt-0.5">{compra.usuario}</p></div>
        {compra.observaciones && <div className="col-span-2"><p className="text-gray-500">Observaciones</p><p className="font-medium text-gray-800 mt-0.5">{compra.observaciones}</p></div>}
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Producto</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Cantidad</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Precio unit.</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {compra.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{item.producto}</p>
                  {item.codigo && <p className="text-xs text-gray-400 font-mono">{item.codigo}</p>}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{parseFloat(item.cantidad)} {item.unidad}</td>
                <td className="px-4 py-3 text-right text-gray-700">${parseFloat(item.precio_unitario).toLocaleString('es-AR')}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">${parseFloat(item.subtotal).toLocaleString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">Total:</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">
                ${parseFloat(compra.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

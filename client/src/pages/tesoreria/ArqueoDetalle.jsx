import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getArqueo, downloadPdfArqueo } from '../../services/cajaService';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CONCEPTO_LABEL = {
  venta: 'Venta', cobro_cta_cte: 'Cobro cta cte', pago_proveedor: 'Pago proveedor',
  gasto: 'Gasto', apertura: 'Apertura', cierre: 'Cierre', manual: 'Manual'
};

export default function ArqueoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    getArqueo(id).then(({ data: res }) => setData(res));
  }, [id]);

  if (!data) return <div className="p-6 text-gray-500">Cargando...</div>;

  const { arqueo, movimientos, resumen, ingresos, egresos, saldo_calculado } = data;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-800">{arqueo.caja}</h1>
          <p className="text-sm text-gray-500">
            {new Date(arqueo.abierto_at).toLocaleString('es-AR')}
            {arqueo.cerrado_at && ` → ${new Date(arqueo.cerrado_at).toLocaleString('es-AR')}`}
          </p>
        </div>
        <button onClick={() => downloadPdfArqueo(id).catch(console.error)}
          className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
          Descargar PDF
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Saldo inicial</p>
          <p className="text-xl font-bold text-gray-800">${fmt(arqueo.saldo_inicial)}</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Ingresos</p>
          <p className="text-xl font-bold text-green-700">+${fmt(ingresos)}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-xs text-red-500 uppercase tracking-wide mb-1">Egresos</p>
          <p className="text-xl font-bold text-red-600">-${fmt(egresos)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Resumen por medio */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Por medio de pago</p>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500">
              <th className="text-left pb-1">Medio</th>
              <th className="text-right pb-1">Ingresos</th>
              <th className="text-right pb-1">Egresos</th>
              <th className="text-right pb-1">Neto</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {resumen.map((r, i) => (
                <tr key={i}>
                  <td className="py-1.5 text-gray-700">{r.medio_pago}</td>
                  <td className="py-1.5 text-right text-green-700">${fmt(r.ingresos)}</td>
                  <td className="py-1.5 text-right text-red-600">{r.egresos > 0 ? `-$${fmt(r.egresos)}` : '—'}</td>
                  <td className="py-1.5 text-right font-medium">${fmt(r.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pt-3 border-t border-gray-200 mt-2">
            <div className="flex justify-between text-sm font-semibold text-gray-800">
              <span>Saldo calculado:</span><span>${fmt(saldo_calculado)}</span>
            </div>
          </div>
        </div>

        {/* Cierre */}
        {arqueo.estado === 'cerrado' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Datos del cierre</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Operador cierre:</span><span>{arqueo.usuario_cierre || '—'}</span></div>
              <div className="flex justify-between text-gray-600"><span>Saldo calculado:</span><span>${fmt(arqueo.saldo_calculado_cierre)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Saldo declarado:</span><span>${fmt(arqueo.saldo_declarado_cierre)}</span></div>
              <div className={`flex justify-between font-semibold pt-2 border-t border-gray-200 ${Math.abs(arqueo.diferencia_cierre) < 0.01 ? 'text-green-700' : 'text-red-600'}`}>
                <span>Diferencia:</span><span>${fmt(arqueo.diferencia_cierre)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Movements */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Movimientos del turno ({movimientos.length})</p>
        </div>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-xs uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left">Hora</th>
              <th className="px-4 py-2 text-left">Concepto / Descripción</th>
              <th className="px-4 py-2 text-left">Medio</th>
              <th className="px-4 py-2 text-right">Ingreso</th>
              <th className="px-4 py-2 text-right">Egreso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movimientos.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  <span>{CONCEPTO_LABEL[m.concepto] || m.concepto}</span>
                  {m.descripcion && <span className="text-gray-400 text-xs ml-1">— {m.descripcion}</span>}
                </td>
                <td className="px-4 py-2 text-gray-500">{m.medio_pago}</td>
                <td className="px-4 py-2 text-right text-green-700 font-medium">
                  {m.tipo === 'ingreso' ? `$${fmt(m.monto)}` : ''}
                </td>
                <td className="px-4 py-2 text-right text-red-600 font-medium">
                  {m.tipo === 'egreso' ? `$${fmt(m.monto)}` : ''}
                </td>
              </tr>
            ))}
            {!movimientos.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin movimientos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

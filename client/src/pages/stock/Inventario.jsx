import { useEffect, useState } from 'react';
import { getDepositos, abrirInventario, getInventario, updateInventarioItems, confirmarInventario, cancelarInventario } from '../../services/stockService';

const STEP = { INICIO: 'inicio', CONTEO: 'conteo', DIFERENCIAS: 'diferencias', CONFIRMADO: 'confirmado' };

export default function Inventario() {
  const [step, setStep] = useState(STEP.INICIO);
  const [depositos, setDepositos] = useState([]);
  const [depositoId, setDepositoId] = useState('');
  const [inventarioId, setInventarioId] = useState(null);
  const [inventario, setInventario] = useState(null);
  const [conteos, setConteos] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getDepositos().then((r) => setDepositos(r.data)); }, []);

  const cargarInventario = async (id) => {
    const { data: inv } = await getInventario(id);
    setInventarioId(id);
    setInventario(inv);
    const c = {};
    inv.items.forEach((i) => { c[i.producto_id] = i.cantidad_sistema; });
    setConteos(c);
    setStep(STEP.CONTEO);
  };

  const handleAbrir = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await abrirInventario({ deposito_id: depositoId });
      await cargarInventario(data.id);
    } catch (err) {
      const responseData = err.response?.data;
      if (err.response?.status === 409 && responseData?.inventario_id) {
        setError(`${responseData.error} — ¿Querés continuar ese inventario?`);
        setInventarioId(responseData.inventario_id);
      } else {
        setError(responseData?.error || 'Error al abrir inventario');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinuarExistente = async () => {
    setError('');
    setLoading(true);
    try {
      await cargarInventario(inventarioId);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm('¿Cancelar el inventario? Se descartarán los conteos ingresados.')) return;
    setLoading(true);
    try {
      await cancelarInventario(inventarioId);
      setStep(STEP.INICIO);
      setInventario(null);
      setInventarioId(null);
      setDepositoId('');
      setConteos({});
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarConteos = async () => {
    setError('');
    setLoading(true);
    try {
      const items = Object.entries(conteos).map(([producto_id, cantidad_contada]) => ({
        producto_id: parseInt(producto_id),
        cantidad_contada: parseInt(cantidad_contada, 10) || 0
      }));
      await updateInventarioItems(inventarioId, items);
      const { data: inv } = await getInventario(inventarioId);
      setInventario(inv);
      setStep(STEP.DIFERENCIAS);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar conteos');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!confirm('¿Confirmar inventario? Se ajustarán los stocks automáticamente.')) return;
    setLoading(true);
    try {
      await confirmarInventario(inventarioId);
      setStep(STEP.CONFIRMADO);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al confirmar');
    } finally {
      setLoading(false);
    }
  };

  const hasDiferencias = inventario?.items?.some((i) => i.diferencia !== null && parseFloat(i.diferencia) !== 0);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-5">Inventario físico</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {['Abrir', 'Contar', 'Revisar', 'Confirmar'].map((label, i) => {
          const steps = [STEP.INICIO, STEP.CONTEO, STEP.DIFERENCIAS, STEP.CONFIRMADO];
          const done = Object.values(STEP).indexOf(step) > i;
          const active = Object.values(STEP).indexOf(step) === i;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${done ? 'bg-blue-400' : 'bg-gray-200'}`} />}
              <div className={`flex items-center gap-1.5 ${active ? 'text-blue-600 font-medium' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${active ? 'bg-blue-600 text-white' : done ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4">
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          {inventarioId && step === STEP.INICIO && (
            <button onClick={handleContinuarExistente} disabled={loading}
              className="mt-2 text-sm bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50 transition-colors">
              {loading ? 'Cargando...' : 'Continuar inventario existente'}
            </button>
          )}
        </div>
      )}

      {/* Step 1: Abrir */}
      {step === STEP.INICIO && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-sm space-y-4">
          <p className="text-sm text-gray-600">Seleccioná el depósito a inventariar. Se va a bloquear para edición durante el proceso.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Depósito</label>
            <select value={depositoId} onChange={(e) => setDepositoId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <button onClick={handleAbrir} disabled={!depositoId || loading}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Abriendo...' : 'Abrir inventario'}
          </button>
        </div>
      )}

      {/* Step 2: Conteo */}
      {step === STEP.CONTEO && inventario && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">Depósito: {inventario.deposito}</p>
              <p className="text-xs text-gray-500">{inventario.items.length} productos — ingresá la cantidad contada de cada uno</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCancelar} disabled={loading}
                className="border border-red-300 text-red-600 px-3 py-2 rounded text-sm hover:bg-red-50 transition-colors">
                Cancelar inventario
              </button>
              <button onClick={handleGuardarConteos} disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? 'Guardando...' : 'Ver diferencias →'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Producto</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Stock sistema</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-medium w-36">Cantidad contada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventario.items.map((item) => (
                  <tr key={item.producto_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-800">{item.producto}</p>
                      {item.codigo && <p className="text-xs text-gray-400 font-mono">{item.codigo}</p>}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">{parseFloat(item.cantidad_sistema)} {item.unidad}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={conteos[item.producto_id] ?? ''}
                        onChange={(e) => setConteos((c) => ({ ...c, [item.producto_id]: e.target.value }))}
                        className="w-28 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3: Diferencias */}
      {step === STEP.DIFERENCIAS && inventario && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">Revisión de diferencias — {inventario.deposito}</p>
              <p className="text-xs text-gray-500">{hasDiferencias ? 'Hay diferencias que serán ajustadas automáticamente al confirmar.' : 'No hay diferencias.'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCancelar} disabled={loading}
                className="border border-red-300 text-red-600 px-3 py-2 rounded text-sm hover:bg-red-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => setStep(STEP.CONTEO)} className="border border-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-50 transition-colors">
                ← Volver a contar
              </button>
              <button onClick={handleConfirmar} disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? 'Confirmando...' : 'Confirmar inventario'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Producto</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Sistema</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Contado</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventario.items.filter((i) => i.cantidad_contada !== null).map((item) => {
                  const dif = parseFloat(item.diferencia || 0);
                  return (
                    <tr key={item.producto_id} className={`hover:bg-gray-50 ${dif !== 0 ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-2 font-medium text-gray-800">{item.producto}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{parseFloat(item.cantidad_sistema)}</td>
                      <td className="px-4 py-2 text-right text-gray-800 font-medium">{parseFloat(item.cantidad_contada)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${dif > 0 ? 'text-green-600' : dif < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {dif > 0 ? '+' : ''}{dif}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 4: Confirmado */}
      {step === STEP.CONFIRMADO && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center max-w-sm">
          <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-green-800 mb-1">Inventario confirmado</h2>
          <p className="text-sm text-green-600 mb-4">Los ajustes de stock fueron aplicados correctamente.</p>
          <button onClick={() => { setStep(STEP.INICIO); setInventario(null); setInventarioId(null); setDepositoId(''); setConteos({}); }}
            className="bg-white border border-green-300 text-green-700 px-4 py-2 rounded text-sm hover:bg-green-50 transition-colors">
            Nuevo inventario
          </button>
        </div>
      )}
    </div>
  );
}

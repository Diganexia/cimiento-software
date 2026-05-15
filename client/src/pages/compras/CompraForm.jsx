import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCompra, updateCompra, getCompra } from '../../services/comprasService';
import { getProveedores } from '../../services/proveedoresService';
import { getDepositos } from '../../services/stockService';
import { getProductos } from '../../services/productosService';

const EMPTY_HEADER = {
  proveedor_id: '', deposito_destino_id: '',
  numero_remito: '', fecha_comprobante: '', observaciones: ''
};

export default function CompraForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [header, setHeader] = useState(EMPTY_HEADER);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProveedores({ activo: 'true', limit: 200 }).then((r) => setProveedores(r.data.data));
    getDepositos().then((r) => setDepositos(r.data));
    if (isEdit) {
      getCompra(id).then(({ data }) => {
        setHeader({
          proveedor_id: data.proveedor_id,
          deposito_destino_id: data.deposito_destino_id,
          numero_remito: data.numero_remito || '',
          fecha_comprobante: data.fecha_comprobante ? data.fecha_comprobante.substring(0, 10) : '',
          observaciones: data.observaciones || ''
        });
        setItems(data.items.map((i) => ({
          producto_id: i.producto_id,
          nombre: i.producto,
          unidad: i.unidad,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario
        })));
      });
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (busquedaProd.length < 2) { setResultados([]); return; }
    getProductos({ q: busquedaProd, activo: 'true', limit: 8 })
      .then((r) => setResultados(r.data.data));
  }, [busquedaProd]);

  const agregarItem = (producto) => {
    if (items.find((i) => i.producto_id === producto.id)) return;
    setItems((prev) => [...prev, {
      producto_id: producto.id,
      nombre: producto.nombre,
      unidad: producto.unidad_abreviatura,
      cantidad: 1,
      precio_unitario: parseFloat(producto.precio_costo) || 0
    }]);
    setBusquedaProd('');
    setResultados([]);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((acc, i) => acc + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precio_unitario) || 0), 0);

  const submit = async (confirmar) => {
    setError('');
    if (!header.proveedor_id || !header.deposito_destino_id) {
      return setError('Proveedor y depósito son requeridos');
    }
    if (!items.length) return setError('Agregá al menos un producto');

    setLoading(true);
    try {
      const payload = {
        ...header,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          cantidad: parseFloat(i.cantidad),
          precio_unitario: parseFloat(i.precio_unitario),
          subtotal: parseFloat(i.cantidad) * parseFloat(i.precio_unitario)
        })),
        confirmar
      };
      if (isEdit) {
        await updateCompra(id, payload);
        navigate(`/compras/${id}`);
      } else {
        const { data } = await createCompra(payload);
        navigate(`/compras/${data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const Label = ({ children }) => <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800">{isEdit ? 'Editar compra' : 'Nueva compra'}</h1>
      </div>

      <div className="space-y-4">
        {/* Cabecera */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos de la compra</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Proveedor *</Label>
              <select value={header.proveedor_id} onChange={(e) => setHeader((h) => ({ ...h, proveedor_id: e.target.value }))} className={inputCls} required>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label>Depósito destino *</Label>
              <select value={header.deposito_destino_id} onChange={(e) => setHeader((h) => ({ ...h, deposito_destino_id: e.target.value }))} className={inputCls} required>
                <option value="">Seleccionar depósito...</option>
                {depositos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label>Número de remito</Label>
              <input value={header.numero_remito} onChange={(e) => setHeader((h) => ({ ...h, numero_remito: e.target.value }))} className={inputCls} placeholder="Ej: 0001-00012345" />
            </div>
            <div>
              <Label>Fecha del comprobante</Label>
              <input type="date" value={header.fecha_comprobante} onChange={(e) => setHeader((h) => ({ ...h, fecha_comprobante: e.target.value }))} className={inputCls} />
            </div>
            <div className="col-span-2">
              <Label>Observaciones</Label>
              <input value={header.observaciones} onChange={(e) => setHeader((h) => ({ ...h, observaciones: e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">Productos</h2>
            <span className="text-xs text-gray-500">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Buscador de productos */}
          <div className="px-5 py-3 border-b border-gray-100 relative">
            <input
              type="text"
              value={busquedaProd}
              onChange={(e) => setBusquedaProd(e.target.value)}
              placeholder="Buscar producto por nombre o código para agregar..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {resultados.length > 0 && (
              <ul className="absolute left-5 right-5 bg-white border border-gray-200 rounded shadow-lg mt-1 z-10 divide-y divide-gray-100 max-h-52 overflow-auto">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => agregarItem(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-800">{p.nombre}</span>
                        {p.codigo && <span className="ml-2 text-xs text-gray-400 font-mono">{p.codigo}</span>}
                      </div>
                      <span className="text-xs text-gray-500">Costo: ${parseFloat(p.precio_costo).toLocaleString('es-AR')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tabla de items */}
          {items.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600 font-medium">Producto</th>
                  <th className="text-center px-4 py-2 text-gray-600 font-medium w-28">Cantidad</th>
                  <th className="text-center px-4 py-2 text-gray-600 font-medium w-36">Precio unitario</th>
                  <th className="text-right px-4 py-2 text-gray-600 font-medium w-32">Subtotal</th>
                  <th className="w-10 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const subtotal = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0);
                  return (
                    <tr key={item.producto_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-800">{item.nombre}</p>
                        {item.unidad && <p className="text-xs text-gray-400">{item.unidad}</p>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input type="number" min="0.001" step="0.001" value={item.cantidad}
                          onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input type="number" min="0" step="0.01" value={item.precio_unitario}
                          onChange={(e) => updateItem(idx, 'precio_unitario', e.target.value)}
                          className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">
                        ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700">Total:</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                    ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-center text-gray-400 text-sm py-6">Buscá productos arriba para agregarlos</p>
          )}
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        {/* Botones */}
        <div className="flex gap-3">
          <button onClick={() => submit(false)} disabled={loading}
            className="border border-gray-300 px-5 py-2 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : 'Guardar como borrador'}
          </button>
          <button onClick={() => submit(true)} disabled={loading}
            className="bg-green-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : 'Guardar y confirmar (ingresa stock)'}
          </button>
          <button onClick={() => navigate(-1)}
            className="px-5 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProducto, createProducto, updateProducto, getRubros, getUnidades, getProveedores } from '../../services/productosService';

const EMPTY = {
  nombre: '', codigo: '', codigo_barra: '', descripcion: '',
  rubro_id: '', unidad_medida_id: '', proveedor_habitual_id: '',
  precio_costo: '', precio_venta: '', stock_minimo: ''
};

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const Field = ({ label, children, required }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

export default function ProductoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [rubros, setRubros] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const flattenRubros = (tree, nivel = 0) => {
      const result = [];
      tree.forEach((r) => {
        result.push({ ...r, label: '  '.repeat(nivel) + r.nombre });
        if (r.hijos?.length) result.push(...flattenRubros(r.hijos, nivel + 1));
      });
      return result;
    };

    Promise.all([
      getRubros().then((r) => setRubros(flattenRubros(r.data))),
      getUnidades().then((r) => setUnidades(r.data)),
      getProveedores({ activo: 'true' }).then((r) => setProveedores(r.data?.data || r.data)).catch(() => {})
    ]);

    if (isEdit) {
      getProducto(id).then(({ data }) => {
        setForm({
          nombre: data.nombre || '',
          codigo: data.codigo || '',
          codigo_barra: data.codigo_barra || '',
          descripcion: data.descripcion || '',
          rubro_id: data.rubro_id || '',
          unidad_medida_id: data.unidad_medida_id || '',
          proveedor_habitual_id: data.proveedor_habitual_id || '',
          precio_costo: data.precio_costo ?? '',
          precio_venta: data.precio_venta ?? '',
          stock_minimo: data.stock_minimo ?? ''
        });
      });
    }
  }, [id, isEdit]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        rubro_id: form.rubro_id || null,
        proveedor_habitual_id: form.proveedor_habitual_id || null,
        precio_costo: parseFloat(form.precio_costo) || 0,
        precio_venta: parseFloat(form.precio_venta) || 0,
        stock_minimo: parseFloat(form.stock_minimo) || 0
      };
      if (isEdit) {
        await updateProducto(id, payload);
      } else {
        await createProducto(payload);
      }
      navigate('/stock/productos');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Nombre" required>
              <input value={form.nombre} onChange={set('nombre')} className={inputCls} required />
            </Field>
          </div>
          <Field label="Código interno">
            <input value={form.codigo} onChange={set('codigo')} className={inputCls} />
          </Field>
          <Field label="Código de barras">
            <input value={form.codigo_barra} onChange={set('codigo_barra')} className={inputCls} />
          </Field>
          <Field label="Rubro">
            <select value={form.rubro_id} onChange={set('rubro_id')} className={inputCls}>
              <option value="">Sin rubro</option>
              {rubros.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Unidad de medida" required>
            <select value={form.unidad_medida_id} onChange={set('unidad_medida_id')} className={inputCls} required>
              <option value="">Seleccionar...</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Proveedor habitual">
              <select value={form.proveedor_habitual_id} onChange={set('proveedor_habitual_id')} className={inputCls}>
                <option value="">Sin proveedor asignado</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Precio costo ($)">
            <input type="number" min="0" step="0.01" value={form.precio_costo} onChange={set('precio_costo')} className={inputCls} />
          </Field>
          <Field label="Precio venta ($)">
            <input type="number" min="0" step="0.01" value={form.precio_venta} onChange={set('precio_venta')} className={inputCls} />
          </Field>
          <Field label="Stock mínimo">
            <input type="number" min="0" step="0.001" value={form.stock_minimo} onChange={set('stock_minimo')} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Descripción">
              <textarea value={form.descripcion} onChange={set('descripcion')} rows={3} className={inputCls} />
            </Field>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

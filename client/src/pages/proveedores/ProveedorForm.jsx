import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProveedor, createProveedor, updateProveedor, deleteProveedor } from '../../services/proveedoresService';

const EMPTY = { nombre: '', razon_social: '', cuit: '', telefono: '', email: '', direccion: '', activo: true };

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

export default function ProveedorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      getProveedor(id).then(({ data }) => setForm({
        nombre: data.nombre || '',
        razon_social: data.razon_social || '',
        cuit: data.cuit || '',
        telefono: data.telefono || '',
        email: data.email || '',
        direccion: data.direccion || '',
        activo: data.activo !== false && data.activo !== 0
      }));
    }
  }, [id, isEdit]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await updateProveedor(id, form);
      } else {
        await createProveedor(form);
      }
      navigate('/proveedores');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Eliminar este proveedor? Solo es posible si no tiene compras registradas.')) return;
    setError('');
    setLoading(true);
    try {
      await deleteProveedor(id);
      navigate('/proveedores');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label required>Nombre comercial</Label>
            <input value={form.nombre} onChange={set('nombre')} className={inputCls} required />
          </div>
          <div className="col-span-2">
            <Label>Razón social</Label>
            <input value={form.razon_social} onChange={set('razon_social')} className={inputCls} />
          </div>
          <div>
            <Label>CUIT</Label>
            <input value={form.cuit} onChange={set('cuit')} className={inputCls} placeholder="30-12345678-9" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <input value={form.telefono} onChange={set('telefono')} className={inputCls} />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
          </div>
          <div className="col-span-2">
            <Label>Dirección</Label>
            <input value={form.direccion} onChange={set('direccion')} className={inputCls} />
          </div>
          {isEdit && (
            <div>
              <Label>Estado</Label>
              <select
                value={form.activo ? 'true' : 'false'}
                onChange={(e) => setForm((p) => ({ ...p, activo: e.target.value === 'true' }))}
                className={inputCls}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2 rounded text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          {isEdit && (
            <button type="button" onClick={handleEliminar} disabled={loading}
              className="ml-auto px-5 py-2 rounded text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors">
              Eliminar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

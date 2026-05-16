import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProveedor, createProveedor, updateProveedor } from '../../services/proveedoresService';

const EMPTY = { nombre: '', razon_social: '', cuit: '', telefono: '', email: '', direccion: '' };

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Label = ({ children, required }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1">
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
        direccion: data.direccion || ''
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

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800">{isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
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
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

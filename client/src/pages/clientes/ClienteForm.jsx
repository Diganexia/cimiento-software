import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCliente, createCliente, updateCliente } from '../../services/clientesService';

const EMPTY = {
  nombre: '', razon_social: '', cuit: '', dni: '', telefono: '', email: '',
  direccion: '', tipo_iva: 'consumidor_final', tiene_cuenta_corriente: false, limite_credito: ''
};

export default function ClienteForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      getCliente(id).then(({ data }) => setForm({
        nombre: data.nombre || '',
        razon_social: data.razon_social || '',
        cuit: data.cuit || '',
        dni: data.dni || '',
        telefono: data.telefono || '',
        email: data.email || '',
        direccion: data.direccion || '',
        tipo_iva: data.tipo_iva || 'consumidor_final',
        tiene_cuenta_corriente: Boolean(data.tiene_cuenta_corriente),
        limite_credito: data.limite_credito || ''
      }));
    }
  }, [id, isEdit]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const setCheck = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.checked }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) await updateCliente(id, form);
      else await createCliente(form);
      navigate('/clientes');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800">{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label required>Nombre</Label>
            <input value={form.nombre} onChange={set('nombre')} className={inputCls} required />
          </div>
          <div className="col-span-2">
            <Label>Razón social</Label>
            <input value={form.razon_social} onChange={set('razon_social')} className={inputCls} />
          </div>
          <div>
            <Label>CUIT</Label>
            <input value={form.cuit} onChange={set('cuit')} className={inputCls} placeholder="20-12345678-9" />
          </div>
          <div>
            <Label>DNI</Label>
            <input value={form.dni} onChange={set('dni')} className={inputCls} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <input value={form.telefono} onChange={set('telefono')} className={inputCls} />
          </div>
          <div>
            <Label>Email</Label>
            <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
          </div>
          <div className="col-span-2">
            <Label>Dirección</Label>
            <input value={form.direccion} onChange={set('direccion')} className={inputCls} />
          </div>
          <div>
            <Label>Condición IVA</Label>
            <select value={form.tipo_iva} onChange={set('tipo_iva')} className={inputCls}>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributista">Monotributista</option>
              <option value="exento">Exento</option>
            </select>
          </div>
          <div>
            <Label>Límite crédito</Label>
            <input type="number" min="0" step="0.01" value={form.limite_credito} onChange={set('limite_credito')} className={inputCls} placeholder="0.00" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="cta_cte" checked={form.tiene_cuenta_corriente} onChange={setCheck('tiene_cuenta_corriente')} className="w-4 h-4" />
            <label htmlFor="cta_cte" className="text-sm text-gray-700">Habilitar cuenta corriente</label>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
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

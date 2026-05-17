import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUsuario, createUsuario, updateUsuario, cambiarPassword, getRoles } from '../../services/usuariosService';

export default function UsuarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ nombre: '', email: '', username: '', password: '', rol_id: '' });
  const [pwForm, setPwForm] = useState({ password_actual: '', password_nuevo: '', confirmar: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState(false);

  useEffect(() => {
    getRoles().then(({ data }) => setRoles(data));
    if (esEdicion) {
      getUsuario(id).then(({ data }) => {
        setForm({ nombre: data.nombre, email: data.email || '', username: data.username, password: '', rol_id: data.rol_id });
      });
    }
  }, [id, esEdicion]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const payload = { nombre: form.nombre, email: form.email, username: form.username, rol_id: form.rol_id };
      if (!esEdicion) payload.password = form.password;
      if (esEdicion) {
        await updateUsuario(id, payload);
      } else {
        await createUsuario(payload);
      }
      navigate('/configuracion/usuarios');
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarPw = async (e) => {
    e.preventDefault();
    setPwErr('');
    setPwOk(false);
    if (pwForm.password_nuevo !== pwForm.confirmar) {
      setPwErr('Los passwords no coinciden');
      return;
    }
    try {
      await cambiarPassword(id, { password_actual: pwForm.password_actual, password_nuevo: pwForm.password_nuevo });
      setPwOk(true);
      setPwForm({ password_actual: '', password_nuevo: '', confirmar: '' });
    } catch (e) {
      setPwErr(e.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/configuracion/usuarios')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {err && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nombre completo *</label>
          <input value={form.nombre} onChange={set('nombre')} required
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
          <input type="email" value={form.email} onChange={set('email')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Username *</label>
          <input value={form.username} onChange={set('username')} required disabled={esEdicion}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
        </div>

        {!esEdicion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password *</label>
            <input type="password" value={form.password} onChange={set('password')} required minLength={6}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Rol *</label>
          <select value={form.rol_id} onChange={set('rol_id')} required
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar rol...</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </button>
          <button type="button" onClick={() => navigate('/configuracion/usuarios')}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
        </div>
      </form>

      {esEdicion && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Cambiar contraseña</p>
            <button onClick={() => setShowPw(!showPw)} className="text-xs text-blue-600 hover:text-blue-800">
              {showPw ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {showPw && (
            <form onSubmit={handleCambiarPw} className="space-y-3">
              {pwErr && <p className="text-red-600 text-sm">{pwErr}</p>}
              {pwOk && <p className="text-green-600 text-sm">Contraseña actualizada.</p>}
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Contraseña actual</label>
                <input type="password" value={pwForm.password_actual}
                  onChange={(e) => setPwForm((f) => ({ ...f, password_actual: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Nueva contraseña (mín. 6 caracteres)</label>
                <input type="password" value={pwForm.password_nuevo} minLength={6}
                  onChange={(e) => setPwForm((f) => ({ ...f, password_nuevo: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Confirmar nueva contraseña</label>
                <input type="password" value={pwForm.confirmar}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmar: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit"
                className="bg-gray-700 text-white px-3 py-1.5 rounded text-xs hover:bg-gray-800 transition-colors">
                Actualizar contraseña
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

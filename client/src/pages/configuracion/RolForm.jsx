import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRol, createRol, updateRol } from '../../services/usuariosService';

const MODULOS = [
  { key: 'productos',     label: 'Productos',       acciones: ['ver', 'crear', 'editar', 'eliminar'] },
  { key: 'stock',         label: 'Stock',            acciones: ['ver', 'ajustar', 'transferir', 'inventario'] },
  { key: 'ventas',        label: 'Ventas',           acciones: ['ver', 'crear', 'anular'] },
  { key: 'compras',       label: 'Compras',          acciones: ['ver', 'crear', 'confirmar'] },
  { key: 'clientes',      label: 'Clientes',         acciones: ['ver', 'crear', 'editar'] },
  { key: 'proveedores',   label: 'Proveedores',      acciones: ['ver', 'crear', 'editar'] },
  { key: 'caja',          label: 'Caja',             acciones: ['abrir', 'cerrar', 'ver_movimientos'] },
  { key: 'cta_cte',       label: 'Cta. Corriente',   acciones: ['ver', 'cobrar', 'pagar'] },
  { key: 'usuarios',      label: 'Usuarios',         acciones: ['ver', 'crear', 'editar'] },
  { key: 'reportes',      label: 'Reportes',         acciones: ['ver'] },
  { key: 'configuracion', label: 'Configuración',    acciones: ['ver', 'editar'] },
];

const ACTION_LABELS = {
  ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar',
  ajustar: 'Ajustar', transferir: 'Transferir', inventario: 'Inventario',
  anular: 'Anular', confirmar: 'Confirmar',
  abrir: 'Abrir', cerrar: 'Cerrar', ver_movimientos: 'Ver mov.',
  cobrar: 'Cobrar', pagar: 'Pagar',
};

function buildEmpty() {
  const p = {};
  MODULOS.forEach(({ key, acciones }) => {
    p[key] = {};
    acciones.forEach((a) => { p[key][a] = false; });
  });
  return p;
}

function normalizePermisos(raw) {
  const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!p || p.all) return p;
  const base = buildEmpty();
  MODULOS.forEach(({ key, acciones }) => {
    acciones.forEach((a) => {
      if (p[key]?.[a]) base[key][a] = true;
    });
  });
  return base;
}

export default function RolForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [nombre, setNombre] = useState('');
  const [accesoTotal, setAccesoTotal] = useState(false);
  const [permisos, setPermisos] = useState(buildEmpty());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!esEdicion) return;
    getRol(id).then(({ data }) => {
      setNombre(data.nombre);
      const p = typeof data.permisos === 'string' ? JSON.parse(data.permisos) : data.permisos;
      if (p?.all) {
        setAccesoTotal(true);
      } else {
        setPermisos(normalizePermisos(p));
      }
    });
  }, [id, esEdicion]);

  const toggleAccion = (modulo, accion) => {
    setPermisos((prev) => ({
      ...prev,
      [modulo]: { ...prev[modulo], [accion]: !prev[modulo][accion] },
    }));
  };

  const toggleModulo = (modulo, acciones) => {
    const todas = acciones.every((a) => permisos[modulo][a]);
    setPermisos((prev) => ({
      ...prev,
      [modulo]: Object.fromEntries(acciones.map((a) => [a, !todas])),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const payload = { nombre, permisos: accesoTotal ? { all: true } : permisos };
    try {
      if (esEdicion) await updateRol(id, payload);
      else await createRol(payload);
      navigate('/configuracion/roles');
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/configuracion/roles')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{esEdicion ? 'Editar rol' : 'Nuevo rol'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {err && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{err}</p>}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nombre del rol *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={accesoTotal} onChange={(e) => setAccesoTotal(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Acceso total (Administrador)</span>
          </label>
        </div>

        {!accesoTotal && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Permisos por módulo</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {MODULOS.map(({ key, label, acciones }) => {
                const todasActivas = acciones.every((a) => permisos[key]?.[a]);
                return (
                  <div key={key} className="px-5 py-3 flex items-start gap-4">
                    <button type="button" onClick={() => toggleModulo(key, acciones)}
                      className="mt-0.5 shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-20 text-left">
                      <span className={`font-medium ${todasActivas ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
                    </button>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {acciones.map((accion) => (
                        <label key={accion} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox"
                            checked={permisos[key]?.[accion] || false}
                            onChange={() => toggleAccion(key, accion)}
                            className="w-3.5 h-3.5 text-blue-600 rounded" />
                          <span className="text-xs text-gray-600 dark:text-gray-300">{ACTION_LABELS[accion] || accion}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear rol'}
          </button>
          <button type="button" onClick={() => navigate('/configuracion/roles')}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

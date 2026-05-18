import { useEffect, useState, useCallback } from 'react';
import useThemeStore from '../../store/themeStore';
import {
  getEmpresa, updateEmpresa,
  getPuntosVenta, createPuntoVenta, updatePuntoVenta, deletePuntoVenta,
  getRubros, createRubro, updateRubro, deleteRubro,
  getUnidades, createUnidad, updateUnidad, deleteUnidad,
  getMediosPago, createMedioPago, updateMedioPago, deleteMedioPago,
  getDepositos, createDeposito, updateDeposito, deleteDeposito,
  getCajas, createCaja, updateCaja, deleteCaja
} from '../../services/configuracionService';

const TABS = ['Empresa', 'ARCA', 'Rubros', 'Unidades', 'Medios de pago', 'Depósitos', 'Cajas'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function useList(loader) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    loader().then(({ data }) => setItems(data)).finally(() => setLoading(false));
  }, [loader]);
  useEffect(() => { load(); }, [load]);
  return { items, loading, reload: load };
}

function RowActions({ onEdit, onDelete, deleteLabel = 'Eliminar' }) {
  return (
    <td className="px-4 py-2 text-right space-x-3">
      {onEdit && <button onClick={onEdit} className="text-blue-600 hover:text-blue-800 text-xs">Editar</button>}
      {onDelete && <button onClick={onDelete} className="text-red-500 hover:text-red-700 text-xs">{deleteLabel}</button>}
    </td>
  );
}

function InlineForm({ fields, onSave, onCancel, initial = {} }) {
  const [vals, setVals] = useState(() => {
    const v = { ...initial };
    fields.forEach((f) => {
      if (f.type === 'select' && v[f.key] != null) v[f.key] = String(v[f.key]);
    });
    return v;
  });
  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }));
  return (
    <tr className="bg-blue-50 dark:bg-blue-900/20">
      {fields.map((f) => (
        <td key={f.key} className="px-4 py-2">
          {f.type === 'select' ? (
            <select value={vals[f.key] || ''} onChange={set(f.key)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input value={vals[f.key] || ''} onChange={set(f.key)} placeholder={f.placeholder || f.label}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          )}
        </td>
      ))}
      <td className="px-4 py-2 text-right space-x-2">
        <button onClick={() => onSave(vals)} className="text-green-700 hover:text-green-900 text-xs font-medium">Guardar</button>
        <button onClick={onCancel} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-xs">Cancelar</button>
      </td>
    </tr>
  );
}

// ── Tab: Empresa ──────────────────────────────────────────────────────────────

function TabEmpresa() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getEmpresa().then(({ data }) => setForm(data));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setOk(false); setErr('');
    try {
      await updateEmpresa(form);
      setOk(true);
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <p className="text-gray-400 dark:text-gray-500 text-sm">Cargando...</p>;

  const field = (label, key, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>
      <input type={type} value={form[key] || ''} onChange={set(key)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-4">
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {ok && <p className="text-green-600 text-sm">Datos guardados correctamente.</p>}
      {field('Nombre del negocio', 'nombre')}
      {field('CUIT', 'cuit')}
      {field('Dirección', 'direccion')}
      {field('Teléfono', 'telefono')}
      {field('Email', 'email', 'email')}
      {field('Condición IVA', 'condicionIva')}
      {field('Ingresos Brutos', 'ingresosBrutos')}
      {field('Inicio de actividades', 'inicioActividades')}
      <button type="submit" disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? 'Guardando...' : 'Guardar datos'}
      </button>
    </form>
  );
}

// ── Tab: ARCA (puntos de venta) ────────────────────────────────────────────────

function TabARCA() {
  const { items, reload } = useList(getPuntosVenta);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const handleCreate = async (vals) => {
    setErr('');
    try { await createPuntoVenta(vals); reload(); setAdding(false); }
    catch (e) { setErr(e.response?.data?.error || 'Error al guardar'); }
  };

  const handleUpdate = async (id, vals) => {
    setErr('');
    try {
      const payload = { ...vals, activo: vals.activo === 'true' || vals.activo === true };
      await updatePuntoVenta(id, payload); reload(); setEditing(null);
    }
    catch (e) { setErr(e.response?.data?.error || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este punto de venta?')) return;
    setErr('');
    try { await deletePuntoVenta(id); reload(); }
    catch (e) { setErr(e.response?.data?.error || 'Error al eliminar'); }
  };

  const createFields = [
    { key: 'numero', label: 'Número', placeholder: '1' },
    { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Punto Venta 1' },
    { key: 'tipo', label: 'Tipo', type: 'select', options: [{ value: 'electronica', label: 'Electrónica' }, { value: 'manual', label: 'Manual' }] }
  ];
  const editFields = [
    { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Punto Venta 1' },
    { key: 'tipo', label: 'Tipo', type: 'select', options: [{ value: 'electronica', label: 'Electrónica' }, { value: 'manual', label: 'Manual' }] },
    { key: 'activo', label: 'Activo', type: 'select', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">Puntos de venta habilitados en ARCA</p>
        <button onClick={() => setAdding(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ Agregar</button>
      </div>
      {err && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 mb-3">{err}</p>}
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">N°</th>
            <th className="px-4 py-2 text-left">Nombre</th>
            <th className="px-4 py-2 text-left">Tipo</th>
            <th className="px-4 py-2 text-center">Activo</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {adding && (
            <InlineForm fields={createFields} onSave={handleCreate} onCancel={() => setAdding(false)} />
          )}
          {items.map((r) => editing === r.id ? (
            <InlineForm key={r.id} fields={editFields} initial={{ ...r, activo: String(r.activo) }}
              onSave={(v) => handleUpdate(r.id, v)} onCancel={() => setEditing(null)} />
          ) : (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-200">{r.numero}</td>
              <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{r.nombre}</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400 capitalize">{r.tipo}</td>
              <td className="px-4 py-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                  {r.activo ? 'Sí' : 'No'}
                </span>
              </td>
              <RowActions onEdit={() => setEditing(r.id)} onDelete={() => handleDelete(r.id)} />
            </tr>
          ))}
          {!items.length && !adding && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">Sin puntos de venta</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Generic simple-list tab ───────────────────────────────────────────────────

function SimpleListTab({ loader, creator, updater, deleter, columns, fields, editFields = null, booleanFields = [], title }) {
  const { items, reload } = useList(loader);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const resolveFields = (f) => typeof f === 'function' ? f(items) : f;

  const handleCreate = async (vals) => {
    setErr('');
    try { await creator(vals); reload(); setAdding(false); }
    catch (e) { setErr(e.response?.data?.error || 'Error al guardar'); }
  };

  const handleUpdate = async (id, vals) => {
    setErr('');
    try {
      const payload = { ...vals };
      booleanFields.forEach((k) => {
        if (payload[k] !== undefined) payload[k] = payload[k] === 'true' || payload[k] === true;
      });
      await updater(id, payload); reload(); setEditing(null);
    }
    catch (e) { setErr(e.response?.data?.error || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`¿Eliminar este ${title}?`)) return;
    setErr('');
    try { await deleter(id); reload(); }
    catch (e) { setErr(e.response?.data?.error || 'Error al eliminar'); }
  };

  return (
    <div>
      {err && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 mb-3">{err}</p>}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">{title}s del sistema</p>
        <button onClick={() => setAdding(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ Agregar</button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((c) => <th key={c.key} className="px-4 py-2 text-left">{c.label}</th>)}
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {adding && (
            <InlineForm fields={resolveFields(fields)} onSave={handleCreate} onCancel={() => setAdding(false)} />
          )}
          {items.map((r) => editing === r.id ? (
            <InlineForm key={r.id} fields={resolveFields(editFields || fields)} initial={r}
              onSave={(v) => handleUpdate(r.id, v)} onCancel={() => setEditing(null)} />
          ) : (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2 text-gray-700 dark:text-gray-200">
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
              <RowActions onEdit={() => setEditing(r.id)} onDelete={deleter ? () => handleDelete(r.id) : null} />
            </tr>
          ))}
          {!items.length && !adding && (
            <tr><td colSpan={columns.length + 1} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">Sin registros</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Cajas ────────────────────────────────────────────────────────────────

function TabCajas() {
  const { items, reload } = useList(getCajas);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const handleCreate = async (vals) => {
    setErr('');
    try { await createCaja(vals); reload(); setAdding(false); }
    catch (e) { setErr(e.response?.data?.error || 'Error al guardar'); }
  };

  const handleUpdate = async (id, vals) => {
    setErr('');
    try {
      const payload = { ...vals, activo: vals.activo === 'true' || vals.activo === true };
      await updateCaja(id, payload); reload(); setEditing(null);
    }
    catch (e) { setErr(e.response?.data?.error || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta caja? Si tiene arqueos no se podrá eliminar.')) return;
    setErr('');
    try { await deleteCaja(id); reload(); }
    catch (e) { setErr(e.response?.data?.error || 'Error al eliminar'); }
  };

  const addFields = [{ key: 'nombre', label: 'Nombre', placeholder: 'Ej: Caja principal' }];
  const editFields = [
    { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Caja principal' },
    { key: 'activo', label: 'Activo', type: 'select', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">Cajas del sistema</p>
        <button onClick={() => setAdding(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">+ Agregar</button>
      </div>
      {err && <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 mb-3">{err}</p>}
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">Nombre</th>
            <th className="px-4 py-2 text-center">Activo</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {adding && (
            <InlineForm fields={addFields} onSave={handleCreate} onCancel={() => setAdding(false)} />
          )}
          {items.map((r) => editing === r.id ? (
            <InlineForm key={r.id} fields={editFields} initial={{ ...r, activo: String(r.activo) }}
              onSave={(v) => handleUpdate(r.id, v)} onCancel={() => setEditing(null)} />
          ) : (
            <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{r.nombre}</td>
              <td className="px-4 py-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                  {r.activo ? 'Sí' : 'No'}
                </span>
              </td>
              <RowActions onEdit={() => setEditing(r.id)} onDelete={() => handleDelete(r.id)} />
            </tr>
          ))}
          {!items.length && !adding && (
            <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">Sin cajas registradas</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Configuracion() {
  const [tab, setTab] = useState(0);
  const { dark, toggle } = useThemeStore();

  const tabContent = [
    <TabEmpresa key="empresa" />,
    <TabARCA key="arca" />,
    <SimpleListTab key="rubros"
      loader={getRubros} creator={createRubro} updater={updateRubro} deleter={deleteRubro}
      title="Rubro"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'rubro_padre', label: 'Rubro padre', render: (r) => r.rubro_padre || '—' }
      ]}
      fields={(items) => [
        { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Materiales de construcción' },
        { key: 'rubro_padre_id', label: 'Rubro padre', type: 'select', options: [
          { value: '', label: '— Sin padre —' },
          ...items.map((r) => ({ value: String(r.id), label: r.nombre }))
        ]}
      ]}
    />,
    <SimpleListTab key="unidades"
      loader={getUnidades} creator={createUnidad} updater={updateUnidad} deleter={deleteUnidad}
      title="Unidad"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'abreviatura', label: 'Abreviatura' }
      ]}
      fields={[
        { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Kilogramo' },
        { key: 'abreviatura', label: 'Abreviatura', placeholder: 'Ej: kg' }
      ]}
    />,
    <SimpleListTab key="medios"
      loader={getMediosPago} creator={createMedioPago} updater={updateMedioPago} deleter={deleteMedioPago}
      booleanFields={['activo']}
      title="Medio de pago"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'activo', label: 'Activo', render: (r) => (
          <span className={`text-xs px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
            {r.activo ? 'Sí' : 'No'}
          </span>
        )}
      ]}
      fields={[
        { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Transferencia bancaria' }
      ]}
      editFields={[
        { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Transferencia bancaria' },
        { key: 'activo', label: 'Activo', type: 'select', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] }
      ]}
    />,
    <SimpleListTab key="depositos"
      loader={getDepositos} creator={createDeposito} updater={updateDeposito} deleter={deleteDeposito}
      booleanFields={['activo']}
      title="Depósito"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción', render: (r) => r.descripcion || '—' },
        { key: 'activo', label: 'Activo', render: (r) => (
          <span className={`text-xs px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
            {r.activo ? 'Sí' : 'No'}
          </span>
        )}
      ]}
      fields={[
        { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Depósito central' },
        { key: 'descripcion', label: 'Descripción', placeholder: 'Descripción (opcional)' }
      ]}
      editFields={[
        { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Depósito central' },
        { key: 'descripcion', label: 'Descripción', placeholder: 'Descripción (opcional)' },
        { key: 'activo', label: 'Activo', type: 'select', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] }
      ]}
    />,
    <TabCajas key="cajas" />
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Configuración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Parámetros generales del sistema</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <svg className={`w-4 h-4 transition-colors ${!dark ? 'text-amber-500' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${dark ? 'bg-indigo-600' : 'bg-amber-400'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <svg className={`w-4 h-4 transition-colors ${dark ? 'text-indigo-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm transition-colors ${
              tab === i
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {tabContent[tab]}
      </div>
    </div>
  );
}

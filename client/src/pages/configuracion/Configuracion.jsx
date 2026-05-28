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

const TABS = ['Empresa', 'ARCA', 'Rubros', 'Unidades', 'Medios de pago', 'Depósitos', 'Cajas', 'Apariencia'];

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
      if (f.type === 'select' && v[f.key] != null) {
        const val = v[f.key];
        if (val === true || val === 1) v[f.key] = 'true';
        else if (val === false || val === 0) v[f.key] = 'false';
        else v[f.key] = String(val);
      }
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

// ── Sección: Carpeta de PDFs ──────────────────────────────────────────────────

function PdfPathSection() {
  const [pdfPath, setPdfPath] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (window.electronAPI?.getPdfPath) {
      window.electronAPI.getPdfPath().then((p) => setPdfPath(p || ''));
    }
  }, []);

  if (!window.electronAPI?.getPdfPath) return null;

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const handlePick = async () => {
    const selected = await window.electronAPI.pickPdfFolder();
    if (selected) {
      await window.electronAPI.setPdfPath(selected);
      setPdfPath(selected);
      flash('Carpeta guardada.');
    }
  };

  const handleReset = async () => {
    await window.electronAPI.setPdfPath('');
    const def = await window.electronAPI.getPdfPath();
    setPdfPath(def);
    flash('Restablecida la carpeta por defecto.');
  };

  return (
    <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Carpeta de PDFs</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Dónde se guardan los comprobantes, recibos y reportes
      </p>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          readOnly
          value={pdfPath}
          title={pdfPath}
          className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-mono truncate"
        />
        <button
          onClick={handlePick}
          className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Cambiar...
        </button>
        <button
          onClick={handleReset}
          className="shrink-0 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 px-3 py-2 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Restablecer
        </button>
      </div>
      {msg && <p className="text-green-600 dark:text-green-400 text-xs mt-2">{msg}</p>}
    </div>
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
    <div className="max-w-lg">
      <form onSubmit={handleSave} className="space-y-4">
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
      <PdfPathSection />
    </div>
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

// ── Widget: Actualizaciones ───────────────────────────────────────────────────

function UpdateChecker() {
  const [status, setStatus] = useState(null);
  const [info, setInfo] = useState({});

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((data) => {
      setStatus(data.status);
      setInfo(data);
      if (data.status === 'not-available') setTimeout(() => setStatus(null), 4000);
    });
    return unsub;
  }, []);

  if (!window.electronAPI?.checkForUpdates) return null;

  const handleCheck = async () => {
    setStatus('checking');
    setInfo({});
    const result = await window.electronAPI.checkForUpdates();
    if (result?.status === 'dev') { setStatus('dev'); setTimeout(() => setStatus(null), 3000); }
  };

  const statusUI = (() => {
    switch (status) {
      case 'checking':
        return <span className="text-xs text-gray-500 dark:text-gray-400">Buscando actualizaciones...</span>;
      case 'downloading':
        return <span className="text-xs text-blue-600 dark:text-blue-400">Descargando... {info.percent ?? 0}%</span>;
      case 'available':
        return <span className="text-xs text-blue-600 dark:text-blue-400">Actualización disponible (v{info.version}) — descargando...</span>;
      case 'downloaded':
        return (
          <span className="flex items-center gap-2">
            <span className="text-xs text-green-600 dark:text-green-400">v{info.version} lista para instalar</span>
            <button onClick={() => window.electronAPI.installUpdate?.()}
              className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700 transition-colors">
              Reiniciar e instalar
            </button>
          </span>
        );
      case 'not-available':
        return <span className="text-xs text-green-600 dark:text-green-400">Estás en la última versión.</span>;
      case 'error':
        return <span className="text-xs text-red-500 dark:text-red-400">Error: {info.error}</span>;
      case 'dev':
        return <span className="text-xs text-gray-400">No disponible en modo desarrollo.</span>;
      default:
        return null;
    }
  })();

  return (
    <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
      <button
        onClick={handleCheck}
        disabled={status === 'checking' || status === 'downloading'}
        className="shrink-0 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        Buscar actualizaciones
      </button>
      {statusUI}
    </div>
  );
}

// ── Tab: Apariencia ───────────────────────────────────────────────────────────

const WINDOW_MODES = [
  { value: 'normal',           label: 'Ventana',          desc: 'Tamaño estándar (1366×768)' },
  { value: 'maximizada',       label: 'Maximizada',       desc: 'Ocupa toda la pantalla manteniendo la barra de tareas' },
  { value: 'pantalla_completa', label: 'Pantalla completa', desc: 'Sin bordes ni barra de tareas' },
];

function TabApariencia() {
  const { dark, toggle } = useThemeStore();
  const [windowMode, setWindowModeLocal] = useState('normal');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (window.electronAPI?.getWindowMode) {
      window.electronAPI.getWindowMode().then((m) => setWindowModeLocal(m || 'normal'));
    }
  }, []);

  const handleWindowMode = async (mode) => {
    setWindowModeLocal(mode);
    if (window.electronAPI?.setWindowMode) {
      await window.electronAPI.setWindowMode(mode);
      setMsg('Modo de ventana aplicado.');
      setTimeout(() => setMsg(''), 2500);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tema</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Apariencia visual de la aplicación</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">Claro</span>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${dark ? 'bg-indigo-600' : 'bg-amber-400'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300">Oscuro</span>
        </div>
      </div>

      {window.electronAPI?.getWindowMode && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Modo de ventana</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Se aplica inmediatamente y se recuerda al reiniciar</p>
          <div className="space-y-2">
            {WINDOW_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleWindowMode(m.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  windowMode === m.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <p className={`text-sm font-medium ${windowMode === m.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{m.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
          {msg && <p className="text-green-600 dark:text-green-400 text-xs mt-2">{msg}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Configuracion() {
  const [tab, setTab] = useState(0);

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
    <TabCajas key="cajas" />,
    <TabApariencia key="apariencia" />,
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Configuración</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Parámetros generales del sistema</p>
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

      <UpdateChecker />
    </div>
  );
}

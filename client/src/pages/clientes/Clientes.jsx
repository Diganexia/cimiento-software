import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClientes, deleteCliente } from '../../services/clientesService';
import Pagination from '../../components/Pagination';

const TIPO_IVA_LABEL = {
  consumidor_final: 'Consumidor Final',
  responsable_inscripto: 'Resp. Inscripto',
  monotributista: 'Monotributista',
  exento: 'Exento'
};

export default function Clientes() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const limit = 50;

  const load = async (pg = page, qv = search) => {
    const params = { page: pg, limit, q: qv || undefined };
    const { data: res } = await getClientes(params);
    setData(res.data);
    setTotal(res.total);
  };

  useEffect(() => { load(1, search); setPage(1); }, [search]);

  const handleBuscar = (e) => { e.preventDefault(); setSearch(q); };

  const handleEliminar = async (id) => {
    if (!confirm('¿Dar de baja este cliente?')) return;
    await deleteCliente(id);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Clientes</h1>
        <Link to="/clientes/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
          + Nuevo cliente
        </Link>
      </div>

      <form onSubmit={handleBuscar} className="flex gap-2 mb-4">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, CUIT o DNI..."
          className="border border-gray-300 rounded px-3 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-gray-100 border border-gray-300 rounded px-4 py-2 text-sm hover:bg-gray-200">Buscar</button>
        {search && <button type="button" onClick={() => { setQ(''); setSearch(''); }} className="text-sm text-gray-500 hover:text-gray-700">Limpiar</button>}
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">CUIT / DNI</th>
              <th className="px-4 py-3 text-left">Tipo IVA</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Cta. Cte.</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.cuit ? `CUIT: ${c.cuit}` : c.dni ? `DNI: ${c.dni}` : c.pasaporte ? `PAS: ${c.pasaporte}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{TIPO_IVA_LABEL[c.tipo_iva] || c.tipo_iva}</td>
                <td className="px-4 py-3 text-gray-600">{c.telefono || '—'}</td>
                <td className="px-4 py-3">
                  {c.tiene_cuenta_corriente
                    ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">Sí</span>
                    : <span className="text-gray-400 text-xs">No</span>}
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link to={`/clientes/${c.id}/ventas`} className="text-green-600 hover:text-green-800 text-xs">Ventas</Link>
                  <Link to={`/clientes/${c.id}/editar`} className="text-blue-600 hover:text-blue-800 text-xs">Editar</Link>
                  <button onClick={() => handleEliminar(c.id)} className="text-red-500 hover:text-red-700 text-xs">Dar de baja</button>
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} limit={limit} onChange={(p) => { setPage(p); load(p, search); }} />
    </div>
  );
}

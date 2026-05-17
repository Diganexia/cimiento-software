import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import AlertasBanner from '../components/AlertasBanner';
import useAuthStore from '../store/authStore';
import { getKPIs, getVentasPeriodo } from '../services/reportesService';
import { version } from '../../package.json';

const fmt = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = (n) => {
  const v = parseFloat(n || 0);
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${fmt(v)}`;
};

function KPICard({ label, value, sub, color, to }) {
  const inner = (
    <div className={`rounded-lg border p-4 ${color}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return { desde: days[0], hasta: days[6] };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      <p className="text-blue-600">Ventas: <span className="font-semibold">${fmt(payload[0]?.value)}</span></p>
    </div>
  );
};

export default function Dashboard() {
  const usuario = useAuthStore((s) => s.usuario);
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [localIP, setLocalIP] = useState('');

  useEffect(() => {
    if (window.electronAPI?.getMode() === 'server') {
      setLocalIP(window.electronAPI.getLocalIP());
    }
  }, []);

  useEffect(() => {
    getKPIs().then(({ data }) => setKpis(data)).catch(() => {});

    const { desde, hasta } = getLast7Days();
    getVentasPeriodo({ periodo: 'dia', desde, hasta })
      .then(({ data }) => {
        const rowMap = {};
        data.rows.forEach((r) => { rowMap[r.fecha] = r.total; });

        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('es-AR');
          days.push({ fecha: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), total: rowMap[key] || 0 });
        }
        setChartData(days);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Bienvenido, {usuario?.nombre}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">v{version}</span>
      </div>

      <div className="mb-5">
        <AlertasBanner />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Ventas hoy"
          value={kpis ? fmtCompact(kpis.ventasHoy.total) : '—'}
          sub={kpis ? `${kpis.ventasHoy.cantidad} operacion${kpis.ventasHoy.cantidad !== 1 ? 'es' : ''}` : null}
          color="bg-blue-50 border-blue-200 text-blue-700"
          to="/ventas"
        />
        <KPICard
          label="Saldo en caja"
          value={kpis?.cajaActual ? fmtCompact(kpis.cajaActual.saldo) : 'Sin caja'}
          sub={kpis?.cajaActual ? 'Caja abierta' : 'No hay arqueo abierto'}
          color="bg-green-50 border-green-200 text-green-700"
          to="/tesoreria/caja"
        />
        <KPICard
          label="Deudores"
          value={kpis ? fmtCompact(kpis.deudores.total) : '—'}
          sub={kpis ? `${kpis.deudores.cantidad} cliente${kpis.deudores.cantidad !== 1 ? 's' : ''}` : null}
          color="bg-orange-50 border-orange-200 text-orange-700"
          to="/cta-cte/clientes"
        />
        <KPICard
          label="Stock bajo mínimo"
          value={kpis != null ? String(kpis.stockBajo) : '—'}
          sub="productos"
          color={kpis?.stockBajo > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}
          to="/stock/productos"
        />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">Ventas — últimos 7 días</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={45} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
            Sin datos de ventas
          </div>
        )}
      </div>

      {/* Server IP banner */}
      {localIP && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm text-blue-800">
            IP del servidor: <span className="font-bold font-mono">{localIP}:3001</span>
            <span className="text-blue-500 ml-2">— ingresá esta dirección en los equipos cliente</span>
          </p>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Punto de venta', to: '/ventas/nueva', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { label: 'Stock', to: '/stock/vista', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'Reportes', to: '/reportes', color: 'bg-purple-50 border-purple-200 text-purple-700' },
          { label: 'Configuración', to: '/configuracion', color: 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200' }
        ].map((c) => (
          <Link key={c.to} to={c.to}
            className={`block p-3 rounded-lg border text-sm font-medium transition-shadow hover:shadow-sm ${c.color}`}>
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

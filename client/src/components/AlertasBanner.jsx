import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAlertas } from '../services/stockService';

export default function AlertasBanner() {
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    getAlertas()
      .then((r) => setAlertas(r.data))
      .catch(() => {});
  }, []);

  if (alertas.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
      <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-yellow-800">
          {alertas.length} producto{alertas.length > 1 ? 's' : ''} con stock bajo mínimo
        </p>
        <p className="text-xs text-yellow-600 mt-0.5 truncate">
          {alertas.slice(0, 3).map((a) => a.nombre).join(', ')}
          {alertas.length > 3 && ` y ${alertas.length - 3} más`}
        </p>
      </div>
      <Link to="/stock/vista" className="text-xs text-yellow-700 font-medium hover:underline shrink-0">
        Ver stock
      </Link>
    </div>
  );
}

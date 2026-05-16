const fmt = (n) => parseFloat(parseFloat(n).toFixed(3)).toString();

export default function StockBadge({ stock, minimo }) {
  const s = parseFloat(stock);
  const m = parseFloat(minimo);

  let cls, label;
  if (s <= 0) {
    cls = 'bg-red-100 text-red-700 border border-red-200';
    label = 'Sin stock';
  } else if (s <= m) {
    cls = 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    label = fmt(s);
  } else {
    cls = 'bg-green-100 text-green-700 border border-green-200';
    label = fmt(s);
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

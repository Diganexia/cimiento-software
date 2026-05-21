const IS_SQLITE = process.env.CIMIENTO_DB === 'sqlite';

// Búsqueda case-insensitive compatible con PG (ILIKE) y SQLite (LIKE, case-insensitive para ASCII)
function whereIlike(qb, col, val) {
  return IS_SQLITE ? qb.whereLike(col, val) : qb.whereIlike(col, val);
}

function orWhereIlike(qb, col, val) {
  return IS_SQLITE ? qb.orWhereLike(col, val) : qb.orWhereIlike(col, val);
}

// SQL para "menor al fin del día" en filtros de fecha hasta
// PG:     col < (?::date + INTERVAL '1 day')
// SQLite: col < date(?, '+1 day')
function sqlHastaFinDia(col) {
  return IS_SQLITE
    ? `${col} < date(?, '+1 day')`
    : `${col} < (?::date + INTERVAL '1 day')`;
}

// PG: db.raw() → { rows: [...] }   SQLite: db.raw() → [...]
async function rawRows(db, sql, params) {
  const result = await db.raw(sql, params);
  return result.rows || result;
}

module.exports = { IS_SQLITE, whereIlike, orWhereIlike, sqlHastaFinDia, rawRows };

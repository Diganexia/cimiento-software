const db = require('../config/db');

async function upsertStock(producto_id, deposito_id, delta, trx = db) {
  const existing = await trx('stock_por_deposito').where({ producto_id, deposito_id }).first();
  if (existing) {
    await trx('stock_por_deposito')
      .where({ producto_id, deposito_id })
      .update({ cantidad: db.raw('cantidad + ?', [delta]), updated_at: db.fn.now() });
  } else {
    await trx('stock_por_deposito').insert({ producto_id, deposito_id, cantidad: Math.max(0, delta) });
  }
}

async function registrarMovimiento(data, trx = db) {
  const [{ id }] = await trx('movimientos_stock').insert(data).returning('id');
  return id;
}

async function getStockTotal(producto_id, trx = db) {
  const result = await trx('stock_por_deposito').where('producto_id', producto_id).sum('cantidad as total').first();
  return parseFloat(result?.total) || 0;
}

async function getStockDeposito(producto_id, deposito_id, trx = db) {
  const row = await trx('stock_por_deposito').where({ producto_id, deposito_id }).first();
  return row ? parseFloat(row.cantidad) : 0;
}

module.exports = { upsertStock, registrarMovimiento, getStockTotal, getStockDeposito };

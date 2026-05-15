const path = require('path');

let _afip = null;

function getClient() {
  if (_afip) return _afip;
  const Afip = require('node-afip');
  _afip = new Afip({
    cuit: process.env.AFIP_CUIT,
    certPath: process.env.AFIP_CERT_PATH || path.resolve(__dirname, '../../certs/cert.crt'),
    keyPath: process.env.AFIP_KEY_PATH || path.resolve(__dirname, '../../certs/private.key'),
    production: process.env.NODE_ENV === 'production'
  });
  return _afip;
}

// Tipos de comprobante AFIP
const TIPO_CBTE = { factura_a: 1, factura_b: 6 };
// Tipos de IVA
const IVA_21 = { id: 5, alicuota: 0.21 };
// Tipos de documento
const DOC_TIPO = { cuit: 80, dni: 96, sin_identificar: 99 };

async function getUltimoCbte(puntoVenta, tipoCbte) {
  const client = getClient();
  return await client.FECompUltimoAutorizado(puntoVenta, tipoCbte);
}

async function emitirFactura({ venta, items, cliente, puntoVenta }) {
  const client = getClient();
  const tipoCbte = TIPO_CBTE[venta.tipo_comprobante];
  if (!tipoCbte) throw new Error('Tipo de comprobante no soportado para AFIP');

  const ultimoCbte = await client.FECompUltimoAutorizado(puntoVenta, tipoCbte);
  const numeroCbte = (ultimoCbte.CbteNro || 0) + 1;

  const total = parseFloat(venta.total);
  const neto = parseFloat((total / 1.21).toFixed(2));
  const iva = parseFloat((total - neto).toFixed(2));

  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`;

  let docTipo = DOC_TIPO.sin_identificar;
  let docNro = 0;
  if (cliente?.cuit) { docTipo = DOC_TIPO.cuit; docNro = parseInt(cliente.cuit.replace(/-/g, '')); }
  else if (cliente?.dni) { docTipo = DOC_TIPO.dni; docNro = parseInt(cliente.dni); }

  const request = {
    FeCAEReq: {
      FeCabReq: { CantReg: 1, PtoVta: puntoVenta, CbteTipo: tipoCbte },
      FeDetReq: {
        FECAEDetRequest: {
          Concepto: 1,
          DocTipo: docTipo,
          DocNro: docNro,
          CbteDesde: numeroCbte,
          CbteHasta: numeroCbte,
          CbteFch: fecha,
          ImpTotal: total,
          ImpTotConc: 0,
          ImpNeto: neto,
          ImpOpEx: 0,
          ImpIVA: iva,
          ImpTrib: 0,
          MonId: 'PES',
          MonCotiz: 1,
          Iva: {
            AlicIva: [{ Id: IVA_21.id, BaseImp: neto, Importe: iva }]
          }
        }
      }
    }
  };

  const resultado = await client.FECAESolicitar(request);
  const det = resultado.FeDetResp?.FECAEDetResponse;

  if (!det || det.Resultado !== 'A') {
    const obs = det?.Observaciones?.Obs
      ? (Array.isArray(det.Observaciones.Obs) ? det.Observaciones.Obs : [det.Observaciones.Obs])
          .map((o) => `[${o.Code}] ${o.Msg}`).join(', ')
      : 'Sin detalle';
    throw new Error(`AFIP rechazó el comprobante: ${obs}`);
  }

  return {
    numero: numeroCbte,
    cae: det.CAE,
    cae_vencimiento: det.CAEFchVto,
    respuesta: resultado
  };
}

module.exports = { getUltimoCbte, emitirFactura, TIPO_CBTE };

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes       = require('./routes/auth');
const productosRoutes  = require('./routes/productos');
const rubrosRoutes     = require('./routes/rubros');
const unidadesRoutes   = require('./routes/unidadesMedida');
const depositosRoutes  = require('./routes/depositos');
const stockRoutes      = require('./routes/stock');
const inventarioRoutes = require('./routes/inventario');
const alertasRoutes    = require('./routes/alertas');
const proveedoresRoutes = require('./routes/proveedores');
const comprasRoutes     = require('./routes/compras');
const clientesRoutes    = require('./routes/clientes');
const mediosPagoRoutes  = require('./routes/mediosPago');
const ctaCteRoutes      = require('./routes/ctaCte');
const cajaRoutes        = require('./routes/caja');
const ventasRoutes      = require('./routes/ventas');
const afipRoutes        = require('./routes/afip');
const usuariosRoutes    = require('./routes/usuarios');
const configuracionRoutes = require('./routes/configuracion');
const reportesRoutes      = require('./routes/reportes');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth',           authRoutes);
app.use('/api/productos',      productosRoutes);
app.use('/api/rubros',         rubrosRoutes);
app.use('/api/unidades-medida',unidadesRoutes);
app.use('/api/depositos',      depositosRoutes);
app.use('/api/stock',          stockRoutes);
app.use('/api/inventario',     inventarioRoutes);
app.use('/api/alertas',        alertasRoutes);
app.use('/api/proveedores',    proveedoresRoutes);
app.use('/api/compras',        comprasRoutes);
app.use('/api/clientes',       clientesRoutes);
app.use('/api/medios-pago',    mediosPagoRoutes);
app.use('/api/cta-cte',        ctaCteRoutes);
app.use('/api/cajas',          cajaRoutes);
app.use('/api/ventas',         ventasRoutes);
app.use('/api/afip',           afipRoutes);
app.use('/api/usuarios',       usuariosRoutes);
app.use('/api/configuracion',  configuracionRoutes);
app.use('/api/reportes',       reportesRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

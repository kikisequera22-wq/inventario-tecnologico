require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { connectDB, initDB } = require('./config/database');

const app = express();

// ── Middlewares globales ───────────────────────────────────
app.use(cors({ origin: '*' }));              // en producción cambia '*' por tu dominio
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Servir el frontend estático ────────────────────────────
app.use(express.static(path.join(__dirname, '..'), {
    etag: false,
    setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// ── Rutas API ──────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/equipos',  require('./routes/equipos'));
app.use('/api/areas',    require('./routes/areas'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/ips',      require('./routes/ips'));

// Ruta de salud (útil para verificar que el servidor corre)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cualquier ruta que no sea /api → sirve el frontend
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '..', 'Login2.html'));
    }
});

// ── Arrancar servidor ──────────────────────────────────────
const PORT = process.env.PORT || 3001;

connectDB()
    .then(() => initDB())
    .then(() => {
        app.listen(PORT, () => {
            console.log('');
            console.log('════════════════════════════════════════');
            console.log(' INVENTARIO TECNOLÓGICO - Backend listo');
            console.log(`════════════════════════════════════════`);
            console.log(` URL:  http://localhost:${PORT}`);
            console.log(` API:  http://localhost:${PORT}/api`);
            console.log('════════════════════════════════════════');
        });
    })
    .catch(err => {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        console.error('   Verifica los datos en backend/.env');
        process.exit(1);
    });

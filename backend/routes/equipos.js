const router       = require('express').Router();
const auth         = require('../middleware/auth');
const requireAdmin = auth.requireAdmin;
const { getPool }  = require('../config/database');

router.use(auth);

// GET /api/equipos
router.get('/', async (req, res) => {
    try {
        const { area, estado, tipo, search } = req.query;
        const pool   = getPool();
        let query    = 'SELECT * FROM equipos WHERE 1=1';
        const params = [];

        if (area)   { params.push(area);              query += ` AND area_nombre = $${params.length}`; }
        if (estado) { params.push(estado);            query += ` AND estado = $${params.length}`; }
        if (tipo)   { params.push(tipo);              query += ` AND tipo = $${params.length}`; }
        if (search) { params.push(`%${search}%`);    query += ` AND (codigo_qr ILIKE $${params.length} OR marca ILIKE $${params.length} OR modelo ILIKE $${params.length} OR area_nombre ILIKE $${params.length} OR tipo ILIKE $${params.length})`; }

        query += ' ORDER BY fecha_creacion DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener equipos' });
    }
});

// GET /api/equipos/tipos/lista
router.get('/tipos/lista', async (req, res) => {
    try {
        const result = await getPool().query(
            'SELECT nombre FROM tipos_equipo ORDER BY es_predefinido DESC, nombre'
        );
        res.json(result.rows.map(r => r.nombre));
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tipos' });
    }
});

// GET /api/equipos/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool().query(
            'SELECT * FROM equipos WHERE codigo_qr = $1', [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Equipo no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener equipo' });
    }
});

// POST /api/equipos
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { codigo_qr, tipo, marca, modelo, numero_serie, area_id, area_nombre,
                responsable, estado, direccion_ip, fecha_registro, cantidad, observaciones } = req.body;

        if (!codigo_qr || !tipo) return res.status(400).json({ error: 'Código QR y Tipo son obligatorios' });

        const pool = getPool();

        const dup = await pool.query('SELECT 1 FROM equipos WHERE codigo_qr = $1', [codigo_qr]);
        if (dup.rows.length) return res.status(409).json({ error: 'Ya existe un equipo con ese Código QR' });

        await pool.query(
            `INSERT INTO equipos
             (codigo_qr, tipo, marca, modelo, numero_serie, area_id, area_nombre,
              responsable, estado, direccion_ip, fecha_registro, cantidad, observaciones)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [codigo_qr, tipo, marca||null, modelo||null, numero_serie||null,
             area_id||null, area_nombre||null, responsable||null,
             estado||'Activo', direccion_ip||null,
             fecha_registro ? new Date(fecha_registro) : null,
             cantidad||1, observaciones||null]
        );

        await pool.query(
            'INSERT INTO tipos_equipo (nombre, es_predefinido) VALUES ($1, false) ON CONFLICT (nombre) DO NOTHING',
            [tipo]
        );

        const nuevo = await pool.query('SELECT * FROM equipos WHERE codigo_qr = $1', [codigo_qr]);
        res.status(201).json(nuevo.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear equipo' });
    }
});

// PUT /api/equipos/:id
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { tipo, marca, modelo, numero_serie, area_id, area_nombre,
                responsable, estado, direccion_ip, fecha_registro, cantidad, observaciones } = req.body;

        const pool   = getPool();
        const exists = await pool.query('SELECT 1 FROM equipos WHERE codigo_qr = $1', [req.params.id]);
        if (!exists.rows.length) return res.status(404).json({ error: 'Equipo no encontrado' });

        await pool.query(
            `UPDATE equipos SET
             tipo=$1, marca=$2, modelo=$3, numero_serie=$4, area_id=$5, area_nombre=$6,
             responsable=$7, estado=$8, direccion_ip=$9, fecha_registro=$10,
             cantidad=$11, observaciones=$12
             WHERE codigo_qr = $13`,
            [tipo, marca||null, modelo||null, numero_serie||null,
             area_id||null, area_nombre||null, responsable||null,
             estado, direccion_ip||null,
             fecha_registro ? new Date(fecha_registro) : null,
             cantidad||1, observaciones||null, req.params.id]
        );

        await pool.query(
            'INSERT INTO tipos_equipo (nombre, es_predefinido) VALUES ($1, false) ON CONFLICT (nombre) DO NOTHING',
            [tipo]
        );

        const updated = await pool.query('SELECT * FROM equipos WHERE codigo_qr = $1', [req.params.id]);
        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar equipo' });
    }
});

// DELETE /api/equipos/:id
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const pool   = getPool();
        const exists = await pool.query('SELECT 1 FROM equipos WHERE codigo_qr = $1', [req.params.id]);
        if (!exists.rows.length) return res.status(404).json({ error: 'Equipo no encontrado' });

        await pool.query('DELETE FROM equipos WHERE codigo_qr = $1', [req.params.id]);
        res.json({ message: 'Equipo eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar equipo' });
    }
});

module.exports = router;

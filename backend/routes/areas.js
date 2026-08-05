const router       = require('express').Router();
const auth         = require('../middleware/auth');
const requireAdmin = auth.requireAdmin;
const { getPool }  = require('../config/database');

router.use(auth);

// GET /api/areas
router.get('/', async (req, res) => {
    try {
        const result = await getPool().query(`
            SELECT a.id, a.nombre, a.fecha_creacion,
                   COUNT(e.codigo_qr) AS total_equipos
            FROM areas a
            LEFT JOIN equipos e ON e.area_nombre = a.nombre
            GROUP BY a.id, a.nombre, a.fecha_creacion
            ORDER BY a.nombre
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener áreas' });
    }
});

// POST /api/areas
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

        const pool = getPool();
        const dup  = await pool.query('SELECT id FROM areas WHERE nombre = $1', [nombre]);
        if (dup.rows.length) return res.status(409).json({ error: 'El área ya existe' });

        const result = await pool.query(
            'INSERT INTO areas (nombre) VALUES ($1) RETURNING *', [nombre]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear área' });
    }
});

// PUT /api/areas/:id
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

        const pool = getPool();
        const old  = await pool.query('SELECT nombre FROM areas WHERE id = $1', [req.params.id]);
        if (!old.rows.length) return res.status(404).json({ error: 'Área no encontrada' });

        const oldName = old.rows[0].nombre;
        await pool.query('UPDATE areas SET nombre = $1 WHERE id = $2', [nombre, req.params.id]);
        await pool.query(
            'UPDATE equipos SET area_nombre = $1 WHERE area_nombre = $2', [nombre, oldName]
        );

        res.json({ id: parseInt(req.params.id), nombre });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar área' });
    }
});

// DELETE /api/areas/:id
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const pool = getPool();
        const old  = await pool.query('SELECT nombre FROM areas WHERE id = $1', [req.params.id]);
        if (old.rows.length) {
            await pool.query(
                'UPDATE equipos SET area_id = NULL, area_nombre = NULL WHERE area_nombre = $1',
                [old.rows[0].nombre]
            );
        }
        await pool.query('DELETE FROM areas WHERE id = $1', [req.params.id]);
        res.json({ message: 'Área eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar área' });
    }
});

module.exports = router;

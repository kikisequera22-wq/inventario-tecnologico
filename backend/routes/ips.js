const router       = require('express').Router();
const auth         = require('../middleware/auth');
const requireAdmin = auth.requireAdmin;
const { getPool }  = require('../config/database');

router.use(auth);

// ── RESERVAS ──────────────────────────────────────────────

// GET /api/ips/reservadas
router.get('/reservadas', async (req, res) => {
    try {
        const result = await getPool().query('SELECT * FROM ips_reservadas ORDER BY ip');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
});

// POST /api/ips/reservadas
router.post('/reservadas', requireAdmin, async (req, res) => {
    try {
        const { ip, nota, responsable } = req.body;
        if (!ip || !nota) return res.status(400).json({ error: 'IP y nota son requeridas' });

        const pool = getPool();
        const dup  = await pool.query('SELECT 1 FROM ips_reservadas WHERE ip = $1', [ip]);
        if (dup.rows.length) return res.status(409).json({ error: 'IP ya reservada' });

        const result = await pool.query(
            'INSERT INTO ips_reservadas (ip, nota, responsable) VALUES ($1, $2, $3) RETURNING *',
            [ip, nota, responsable || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear reserva' });
    }
});

// PUT /api/ips/reservadas/:id
router.put('/reservadas/:id', requireAdmin, async (req, res) => {
    try {
        const { ip, nota, responsable } = req.body;
        await getPool().query(
            'UPDATE ips_reservadas SET ip=$1, nota=$2, responsable=$3 WHERE id=$4',
            [ip, nota, responsable || null, req.params.id]
        );
        res.json({ id: parseInt(req.params.id), ip, nota, responsable });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar reserva' });
    }
});

// DELETE /api/ips/reservadas/:id
router.delete('/reservadas/:id', requireAdmin, async (req, res) => {
    try {
        await getPool().query('DELETE FROM ips_reservadas WHERE id = $1', [req.params.id]);
        res.json({ message: 'Reserva eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar reserva' });
    }
});

// ── CONFLICTOS ────────────────────────────────────────────

// GET /api/ips/conflictos
router.get('/conflictos', async (req, res) => {
    try {
        const pool       = getPool();
        const result     = await pool.query('SELECT * FROM ips_conflictos ORDER BY fecha DESC');
        const conflictos = result.rows;

        for (const c of conflictos) {
            const eq = await pool.query(
                `SELECT e.codigo_qr, e.marca, e.modelo, e.area_nombre
                 FROM ips_conflictos_equipos ice
                 JOIN equipos e ON e.codigo_qr = ice.equipo_id
                 WHERE ice.conflicto_id = $1`,
                [c.id]
            );
            c.equipos = eq.rows;
        }
        res.json(conflictos);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener conflictos' });
    }
});

// POST /api/ips/conflictos
router.post('/conflictos', requireAdmin, async (req, res) => {
    try {
        const { ip, nota, responsable, tipo = 'manual', equipos = [] } = req.body;
        if (!ip || !nota) return res.status(400).json({ error: 'IP y nota son requeridas' });

        const pool   = getPool();
        const result = await pool.query(
            'INSERT INTO ips_conflictos (ip, nota, responsable, tipo) VALUES ($1,$2,$3,$4) RETURNING id',
            [ip, nota, responsable || null, tipo]
        );
        const conflictoId = result.rows[0].id;

        for (const eqId of equipos) {
            await pool.query(
                `INSERT INTO ips_conflictos_equipos (conflicto_id, equipo_id)
                 SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM equipos WHERE codigo_qr = $2)`,
                [conflictoId, eqId]
            );
        }

        res.status(201).json({ id: conflictoId, ip, nota, responsable, tipo, equipos });
    } catch (err) {
        res.status(500).json({ error: 'Error al crear conflicto' });
    }
});

// PUT /api/ips/conflictos/:id
router.put('/conflictos/:id', requireAdmin, async (req, res) => {
    try {
        const { ip, nota, responsable } = req.body;
        await getPool().query(
            'UPDATE ips_conflictos SET ip=$1, nota=$2, responsable=$3 WHERE id=$4',
            [ip, nota, responsable || null, req.params.id]
        );
        res.json({ id: parseInt(req.params.id), ip, nota, responsable });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar conflicto' });
    }
});

// DELETE /api/ips/conflictos/:id
router.delete('/conflictos/:id', requireAdmin, async (req, res) => {
    try {
        await getPool().query('DELETE FROM ips_conflictos WHERE id = $1', [req.params.id]);
        res.json({ message: 'Conflicto eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar conflicto' });
    }
});

// GET /api/ips/estado
router.get('/estado', async (req, res) => {
    try {
        const pool = getPool();
        const [equipos, reservas, conflictos] = await Promise.all([
            pool.query(`SELECT codigo_qr,marca,modelo,tipo,area_nombre,responsable,estado,direccion_ip
                        FROM equipos WHERE direccion_ip IS NOT NULL AND direccion_ip != ''`),
            pool.query('SELECT * FROM ips_reservadas'),
            pool.query('SELECT * FROM ips_conflictos'),
        ]);
        res.json({
            equipos:    equipos.rows,
            reservas:   reservas.rows,
            conflictos: conflictos.rows,
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener estado de IPs' });
    }
});

module.exports = router;

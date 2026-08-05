const router       = require('express').Router();
const bcrypt       = require('bcryptjs');
const auth         = require('../middleware/auth');
const requireAdmin = auth.requireAdmin;
const { getPool }  = require('../config/database');

router.use(auth);

// GET /api/usuarios
router.get('/', async (req, res) => {
    try {
        const result = await getPool().query(
            'SELECT id, nombre, email, rol, activo, fecha_creacion, ultima_sesion FROM usuarios ORDER BY nombre'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// POST /api/usuarios
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { nombre, email, password, rol = 'Operador' } = req.body;
        if (!nombre || !email || !password) return res.status(400).json({ error: 'Todos los campos son requeridos' });

        const pool = getPool();
        const dup  = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (dup.rows.length) return res.status(409).json({ error: 'El correo ya está registrado' });

        const hash   = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO usuarios (nombre, email, password_hash, rol)
             VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol`,
            [nombre, email, hash, rol]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// PUT /api/usuarios/:id
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        const pool = getPool();

        const exists = await pool.query('SELECT id FROM usuarios WHERE id = $1', [req.params.id]);
        if (!exists.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (password) {
            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE usuarios SET nombre=$1, email=$2, password_hash=$3, rol=$4 WHERE id=$5',
                [nombre, email, hash, rol, req.params.id]
            );
        } else {
            await pool.query(
                'UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4',
                [nombre, email, rol, req.params.id]
            );
        }
        res.json({ id: parseInt(req.params.id), nombre, email, rol });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// PATCH /api/usuarios/:id/toggle — activa o desactiva
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id)
            return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });

        const pool   = getPool();
        const result = await pool.query(
            'UPDATE usuarios SET activo = NOT activo WHERE id = $1 RETURNING activo',
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ activo: result.rows[0].activo });
    } catch (err) {
        res.status(500).json({ error: 'Error al cambiar estado del usuario' });
    }
});

// DELETE /api/usuarios/:id — elimina permanentemente
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id)
            return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });

        await getPool().query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = router;

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const auth   = require('../middleware/auth');
const { getPool } = require('../config/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

        const pool   = getPool();
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]
        );

        if (!result.rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });

        const user  = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

        await pool.query('UPDATE usuarios SET ultima_sesion = NOW() WHERE id = $1', [user.id]);

        const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
        const token   = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });

        res.json({ token, user: payload });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(req.user));

module.exports = router;

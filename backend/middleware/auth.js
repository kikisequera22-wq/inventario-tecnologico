const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'Token requerido' });

    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user?.rol === 'Visualizador') {
        return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }
    next();
}

authMiddleware.requireAdmin = requireAdmin;
module.exports = authMiddleware;

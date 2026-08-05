/**
 * api-client.js
 * Cliente HTTP para conectar el frontend con el backend Node.js
 *
 * Cuando actives el backend, incluye este archivo en tus páginas:
 *   <script src="api-client.js"></script>
 * antes de app.js y los JS de cada página.
 */

const API_URL = '/api';

// ── TOKEN JWT ─────────────────────────────────────────────
function getToken()          { return localStorage.getItem('inv_token'); }
function setToken(t)         { localStorage.setItem('inv_token', t); }
function removeToken()       { localStorage.removeItem('inv_token'); }

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// ── PETICIÓN BASE ─────────────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
    const options = { method, headers: authHeaders() };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (res.status === 401) {
        removeToken();
        window.location.href = 'Login2.html';
        return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
}

const api = {
    get:    (ep)          => apiRequest('GET',    ep),
    post:   (ep, body)    => apiRequest('POST',   ep, body),
    put:    (ep, body)    => apiRequest('PUT',    ep, body),
    delete: (ep)          => apiRequest('DELETE', ep),
};

// ── AUTH ──────────────────────────────────────────────────
const Auth = {
    async login(email, password) {
        const data = await api.post('/auth/login', { email, password });
        setToken(data.token);
        localStorage.setItem('inv_session', JSON.stringify({ logged: true, user: data.user }));
        return data.user;
    },
    async register(nombre, email, password) {
        const data = await api.post('/auth/register', { nombre, email, password });
        setToken(data.token);
        localStorage.setItem('inv_session', JSON.stringify({ logged: true, user: data.user }));
        return data.user;
    },
    logout() {
        removeToken();
        localStorage.removeItem('inv_session');
        window.location.href = 'Login2.html';
    }
};

// ── EQUIPOS ───────────────────────────────────────────────
const Equipos = {
    getAll(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        return api.get(`/equipos${params ? '?' + params : ''}`);
    },
    getById(id)     { return api.get(`/equipos/${encodeURIComponent(id)}`); },
    create(data)    { return api.post('/equipos', data); },
    update(id, data){ return api.put(`/equipos/${encodeURIComponent(id)}`, data); },
    delete(id)      { return api.delete(`/equipos/${encodeURIComponent(id)}`); },
    getTipos()      { return api.get('/equipos/tipos/lista'); },
};

// ── ÁREAS ─────────────────────────────────────────────────
const Areas = {
    getAll()        { return api.get('/areas'); },
    create(nombre)  { return api.post('/areas', { nombre }); },
    update(id, nombre) { return api.put(`/areas/${id}`, { nombre }); },
    delete(id)      { return api.delete(`/areas/${id}`); },
};

// ── USUARIOS ──────────────────────────────────────────────
const Usuarios = {
    getAll()             { return api.get('/usuarios'); },
    create(data)         { return api.post('/usuarios', data); },
    update(id, data)     { return api.put(`/usuarios/${id}`, data); },
    delete(id)           { return api.delete(`/usuarios/${id}`); },
};

// ── IPs ───────────────────────────────────────────────────
const IPs = {
    getEstado()               { return api.get('/ips/estado'); },
    // Reservas
    getReservas()             { return api.get('/ips/reservadas'); },
    crearReserva(data)        { return api.post('/ips/reservadas', data); },
    editarReserva(id, data)   { return api.put(`/ips/reservadas/${id}`, data); },
    eliminarReserva(id)       { return api.delete(`/ips/reservadas/${id}`); },
    // Conflictos
    getConflictos()           { return api.get('/ips/conflictos'); },
    crearConflicto(data)      { return api.post('/ips/conflictos', data); },
    editarConflicto(id, data) { return api.put(`/ips/conflictos/${id}`, data); },
    eliminarConflicto(id)     { return api.delete(`/ips/conflictos/${id}`); },
};

// Exponemos globalmente (compatible con el código existente)
window.API = { Auth, Equipos, Areas, Usuarios, IPs };

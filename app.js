// ========== AUTH ==========
function getToken()  { return localStorage.getItem('inv_token'); }

function checkAuth() {
    const token   = getToken();
    const session = JSON.parse(localStorage.getItem('inv_session') || 'null');
    if (!token || !session || !session.logged) {
        if (window.location.search.includes('id='))
            sessionStorage.setItem('loginRedirect', window.location.href);
        window.location.href = 'Login2.html';
        return null;
    }
    return session.user;
}

function logout() {
    localStorage.removeItem('inv_session');
    localStorage.removeItem('inv_token');
    window.location.href = 'Login2.html';
}

// ========== API HELPER ==========
async function apiFetch(url, options = {}) {
    const token = getToken();
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(options.headers || {}),
            },
        });
        if (res.status === 401) { logout(); return null; }
        return res;
    } catch {
        return null;
    }
}

// ========== MAPEO EQUIPO ==========
function mapEquipo(e) {
    return {
        id:            e.codigo_qr,
        tipo:          e.tipo          || '',
        marca:         e.marca         || '',
        modelo:        e.modelo        || '',
        serie:         e.numero_serie  || '',
        area:          e.area_nombre   || '',
        area_id:       e.area_id       ?? null,
        responsable:   e.responsable   || '',
        estado:        e.estado        || 'Activo',
        ip:            e.direccion_ip  || '',
        fecha:         e.fecha_registro ? String(e.fecha_registro).split('T')[0] : '',
        cantidad:      e.cantidad      ?? 1,
        observaciones: e.observaciones || '',
    };
}

// ========== DATOS (API) ==========
async function getEquipos() {
    const r = await apiFetch('/api/equipos');
    if (!r?.ok) return [];
    const data = await r.json();
    return data.map(mapEquipo);
}

async function getAreas() {
    const r = await apiFetch('/api/areas');
    return r?.ok ? r.json() : [];
}

async function getUsuarios() {
    const r = await apiFetch('/api/usuarios');
    return r?.ok ? r.json() : [];
}

async function getTipos() {
    const r = await apiFetch('/api/equipos/tipos/lista');
    return r?.ok ? r.json() : TIPOS_BASE;
}

// ========== EQUIPOS CRUD ==========
function equipoToAPI(eq) {
    return {
        codigo_qr:      eq.id,
        tipo:           eq.tipo,
        marca:          eq.marca,
        modelo:         eq.modelo,
        numero_serie:   eq.serie,
        area_nombre:    eq.area,
        responsable:    eq.responsable,
        estado:         eq.estado,
        direccion_ip:   eq.ip,
        fecha_registro: eq.fecha,
        cantidad:       eq.cantidad,
        observaciones:  eq.observaciones,
    };
}

async function createEquipo(eq) {
    return apiFetch('/api/equipos', { method: 'POST', body: JSON.stringify(equipoToAPI(eq)) });
}

async function updateEquipo(id, eq) {
    return apiFetch(`/api/equipos/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(equipoToAPI(eq)) });
}

async function deleteEquipoById(id) {
    return apiFetch(`/api/equipos/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ========== AREAS CRUD ==========
async function createArea(nombre) {
    return apiFetch('/api/areas', { method: 'POST', body: JSON.stringify({ nombre }) });
}

async function updateArea(id, nombre) {
    return apiFetch(`/api/areas/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) });
}

async function deleteAreaById(id) {
    return apiFetch(`/api/areas/${id}`, { method: 'DELETE' });
}

// ========== USUARIOS CRUD ==========
async function createUsuario(data) {
    return apiFetch('/api/usuarios', { method: 'POST', body: JSON.stringify(data) });
}

async function updateUsuario(id, data) {
    return apiFetch(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteUsuarioById(id) {
    return apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
}

// ========== IPS ==========
async function getIPsEstado() {
    const r = await apiFetch('/api/ips/estado');
    return r?.ok ? r.json() : { equipos: [], reservas: [], conflictos: [] };
}

async function createReserva(data) {
    return apiFetch('/api/ips/reservadas', { method: 'POST', body: JSON.stringify(data) });
}

async function updateReservaById(id, data) {
    return apiFetch(`/api/ips/reservadas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteReservaById(id) {
    return apiFetch(`/api/ips/reservadas/${id}`, { method: 'DELETE' });
}

async function createConflicto(data) {
    return apiFetch('/api/ips/conflictos', { method: 'POST', body: JSON.stringify(data) });
}

async function updateConflictoById(id, data) {
    return apiFetch(`/api/ips/conflictos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteConflictoById(id) {
    return apiFetch(`/api/ips/conflictos/${id}`, { method: 'DELETE' });
}

// ========== TIPOS BASE ==========
const TIPOS_BASE = [
    'Computadora','Laptop','Impresora','Monitor','Servidor','Switch','Router',
    'UPS','Proyector','Teléfono IP','Cámara IP',
    'Cable Ethernet','Cable VGA','Cable HDMI','Cable USB','Cable DisplayPort',
    'Teclado','Mouse','Audífonos','Memoria USB','Cartucho / Tóner','Adaptador','Consumible'
];
const CONSUMIBLES = [
    'Cable Ethernet','Cable VGA','Cable HDMI','Cable USB','Cable DisplayPort',
    'Teclado','Mouse','Audífonos','Memoria USB','Cartucho / Tóner','Adaptador','Consumible'
];
function esConsumible(tipo) { return CONSUMIBLES.includes(tipo); }

// ========== PE LOGO SVG ==========
const PE_LOGO_SVG = `
<svg width="44" height="38" viewBox="0 0 56 48" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="54" height="46" rx="8" fill="#c8c8c8" stroke="#999" stroke-width="1.5"/>
  <rect x="5" y="5" width="46" height="38" rx="5" fill="#f2f2f2" stroke="#bbb" stroke-width="1"/>
  <rect x="5" y="5" width="46" height="8" rx="0" fill="#d0d0d0"/>
  <rect x="5" y="35" width="46" height="8" rx="0" fill="#d0d0d0"/>
  <text x="28" y="33" font-family="'Arial Black',Arial,sans-serif" font-size="20" font-weight="900"
        fill="#cc1111" text-anchor="middle" letter-spacing="1">PE</text>
</svg>`;

const PE_LOGO_SVG_LG = `
<svg width="70" height="58" viewBox="0 0 56 48" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="54" height="46" rx="8" fill="#c8c8c8" stroke="#999" stroke-width="1.5"/>
  <rect x="5" y="5" width="46" height="38" rx="5" fill="#f2f2f2" stroke="#bbb" stroke-width="1"/>
  <rect x="5" y="5" width="46" height="8" rx="0" fill="#d0d0d0"/>
  <rect x="5" y="35" width="46" height="8" rx="0" fill="#d0d0d0"/>
  <text x="28" y="33" font-family="'Arial Black',Arial,sans-serif" font-size="20" font-weight="900"
        fill="#cc1111" text-anchor="middle" letter-spacing="1">PE</text>
</svg>`;

const EMPRESA_NOMBRE  = 'Plomería Eléctrica';
const EMPRESA_DETALLE = 'de Reynosa, S.A. de C.V.';
const EMPRESA_FULL    = 'PLOMERÍA ELÉCTRICA DE REYNOSA, S.A. DE C.V.';

// ========== SIDEBAR ==========
function renderSidebar(activePage) {
    const session  = JSON.parse(localStorage.getItem('inv_session') || 'null');
    const isViewer = session?.user?.rol === 'Visualizador';

    const nav = isViewer ? [
        { id: 'equipos', label: 'Equipos', icon: 'bx-devices', href: 'Equipos.html' },
    ] : [
        { id: 'dashboard', label: 'Dashboard',    icon: 'bxs-dashboard',    href: 'Dashboard.html' },
        { id: 'equipos',   label: 'Equipos',      icon: 'bx-devices',       href: 'Equipos.html' },
        { id: 'ips',       label: 'Control IPs',  icon: 'bx-network-chart', href: 'IPs.html' },
        { id: 'areas',     label: 'Áreas',        icon: 'bx-building',      href: 'Areas.html' },
        { id: 'usuarios',  label: 'Usuarios',     icon: 'bxs-user-account', href: 'Usuarios.html' },
        { id: 'reportes',  label: 'Reportes',     icon: 'bxs-report',       href: 'Reportes.html' },
    ];
    document.getElementById('sidebar').innerHTML = `
        <div class="sidebar-logo">
            <div class="sb-logo-icon">${PE_LOGO_SVG}</div>
            <div class="sb-logo-text">
                <span>${EMPRESA_NOMBRE}</span>
                <small>${EMPRESA_DETALLE}</small>
            </div>
        </div>
        <nav class="sidebar-nav">
            ${nav.map(n => `
            <a class="nav-item ${activePage === n.id ? 'active' : ''}" href="${n.href}">
                <i class='bx ${n.icon}'></i> ${n.label}
            </a>`).join('')}
        </nav>
        <button class="logout-btn" onclick="logout()">
            <i class='bx bx-log-out'></i> Cerrar sesión
        </button>
    `;
}

// ========== TOPBAR ==========
function renderTopbar(user) {
    document.getElementById('topbarName').textContent = user.nombre;
    document.getElementById('topbarRol').textContent  = user.rol;
}

// ========== BADGE ==========
function badge(estado) {
    const map = {
        'Activo':            'badge-activo',
        'En mantenimiento':  'badge-mantenimiento',
        'Fuera de servicio': 'badge-fuera',
    };
    return `<span class="badge ${map[estado] || 'badge-fuera'}">${estado}</span>`;
}

// ========== INIT ==========
function initPage(activePage) {
    const user = checkAuth();
    if (!user) return null;

    // El Visualizador solo puede acceder a Equipos
    if (user.rol === 'Visualizador' && activePage !== 'equipos') {
        window.location.href = 'Equipos.html';
        return null;
    }

    renderSidebar(activePage);
    renderTopbar(user);
    document.getElementById('app').style.display = 'flex';

    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }
    overlay.onclick = () => {
        document.getElementById('sidebar').classList.remove('open');
        overlay.classList.remove('active');
    };

    const toggle = document.getElementById('menuToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }
    return user;
}

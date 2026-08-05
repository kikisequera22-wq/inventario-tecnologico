initPage('ips');

const IPS_PER_PAGE = 30;
let currentPage        = 1;
let deleteReservaTarget = null;
let ipData             = { equipos: [], reservas: [], conflictos: [] };

// El rango se guarda en localStorage (es preferencia de UI, no dato)
function getRango() {
    return JSON.parse(localStorage.getItem('inv_ip_rango') || '{"base":"192.168.1","desde":1,"hasta":254}');
}
function saveRango(r) { localStorage.setItem('inv_ip_rango', JSON.stringify(r)); }

function cargarRangoUI() {
    const r = getRango();
    document.getElementById('rangoBase').value  = r.base;
    document.getElementById('rangoDesde').value = r.desde;
    document.getElementById('rangoHasta').value = r.hasta;
}

// ===== CONSTRUIR MAPA =====
function buildIPMap() {
    const equipos    = ipData.equipos    || [];
    const reservas   = ipData.reservas   || [];
    const conflictos = ipData.conflictos || [];
    const rango      = getRango();
    const map        = {};

    // IPs de equipos (normalizar campos de la API)
    equipos.forEach(raw => {
        const ip = (raw.direccion_ip || '').trim();
        if (!ip) return;
        const e = {
            id:          raw.codigo_qr,
            marca:       raw.marca,
            modelo:      raw.modelo,
            tipo:        raw.tipo,
            area:        raw.area_nombre || '',
            responsable: raw.responsable || '',
        };
        if (!map[ip]) map[ip] = { tipo: 'ocupada', equipos: [], reserva: null, conflicto: null };
        map[ip].equipos.push(e);
    });

    // Duplicados → conflicto
    Object.values(map).forEach(entry => {
        if (entry.equipos.length > 1) entry.tipo = 'conflicto';
    });

    // Conflictos registrados
    conflictos.forEach(c => {
        if (!map[c.ip]) map[c.ip] = { tipo: 'conflicto', equipos: [], reserva: null, conflicto: null };
        map[c.ip].tipo      = 'conflicto';
        map[c.ip].conflicto = c;
    });

    // Reservas
    reservas.forEach(r => {
        if (!map[r.ip]) {
            map[r.ip] = { tipo: 'reservada', equipos: [], reserva: r, conflicto: null };
        } else if (map[r.ip].tipo !== 'conflicto') {
            map[r.ip].reserva = r;
        }
    });

    // Generar lista del rango
    const list = [];
    for (let i = rango.desde; i <= rango.hasta; i++) {
        const ip = `${rango.base}.${i}`;
        list.push(map[ip] ? { ip, ...map[ip] } : { ip, tipo: 'libre', equipos: [], reserva: null, conflicto: null });
    }

    // IPs fuera del rango pero asignadas
    Object.entries(map).forEach(([ip, data]) => {
        const parts  = ip.split('.');
        const last   = parseInt(parts[3]);
        if (parts.slice(0, 3).join('.') !== rango.base || last < rango.desde || last > rango.hasta) {
            list.push({ ip, ...data });
        }
    });

    return list;
}

// ===== RENDERIZAR =====
async function renderIPs() {
    ipData = await getIPsEstado();

    const search  = document.getElementById('searchIP').value.toLowerCase();
    const estadoF = document.getElementById('filterIPEstado').value;
    const allIPs  = buildIPMap();

    const filtered = allIPs.filter(entry => {
        const matchSearch = !search ||
            entry.ip.includes(search) ||
            entry.equipos.some(e =>
                (e.id     || '').toLowerCase().includes(search) ||
                (e.marca  || '').toLowerCase().includes(search) ||
                (e.modelo || '').toLowerCase().includes(search) ||
                (e.area   || '').toLowerCase().includes(search)
            ) ||
            (entry.reserva   && (entry.reserva.nota   || '').toLowerCase().includes(search)) ||
            (entry.conflicto && (entry.conflicto.nota || '').toLowerCase().includes(search));

        if (estadoF === 'ocupada' && entry.tipo === 'ocupada') return matchSearch;
        if (estadoF && estadoF !== entry.tipo) return false;
        return matchSearch;
    });

    document.getElementById('ipTotal').textContent      = allIPs.length;
    document.getElementById('ipOcupadas').textContent   = allIPs.filter(e => e.tipo === 'ocupada').length;
    document.getElementById('ipLibres').textContent     = allIPs.filter(e => e.tipo === 'libre').length;
    document.getElementById('ipReservadas').textContent = allIPs.filter(e => e.tipo === 'reservada').length;
    document.getElementById('ipConflictos').textContent = allIPs.filter(e => e.tipo === 'conflicto').length;

    const totalPages = Math.max(1, Math.ceil(filtered.length / IPS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * IPS_PER_PAGE;
    const paged = filtered.slice(start, start + IPS_PER_PAGE);

    const tbody = document.getElementById('ipsBody');
    tbody.innerHTML = '';

    if (!paged.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#aaa;padding:32px">Sin resultados</td></tr>`;
    } else {
        paged.forEach(entry => {
            const tr = document.createElement('tr');
            let equipoCell = '—', areaCell = '—', tipoCell = '—', notaCell = '—';
            let estadoCell = '', accionesCell = '';

            if (entry.tipo === 'conflicto') {
                const eq = entry.equipos;
                if (eq.length > 0) {
                    equipoCell = eq.map(e => `<span class="code-badge">${e.id}</span> ${e.marca} ${e.modelo}`).join('<br>');
                    areaCell   = [...new Set(eq.map(e => e.area))].join(', ');
                    tipoCell   = [...new Set(eq.map(e => e.tipo))].join(', ');
                } else if (entry.conflicto) {
                    equipoCell = `<em style="color:#6b7280">${entry.conflicto.nota}</em>`;
                }
                notaCell   = entry.conflicto ? (entry.conflicto.nota || '—') : 'IP duplicada en equipos';
                estadoCell = `<span class="badge badge-conflicto"><i class='bx bx-wifi' style="font-size:.8rem"></i> Conflicto</span>`;
                const cid  = entry.conflicto ? entry.conflicto.id : '';
                accionesCell = `
                    <div class="action-btns">
                        <button class="icon-btn edit"   title="Editar conflicto" onclick="editConflicto(${cid},'${entry.ip}')"><i class='bx bx-edit'></i></button>
                        <button class="icon-btn delete" title="Quitar conflicto" onclick="deleteConflicto(${cid},'${entry.ip}')"><i class='bx bx-trash'></i></button>
                    </div>`;

            } else if (entry.tipo === 'ocupada') {
                const e     = entry.equipos[0];
                equipoCell  = `<span style="font-weight:600">${e.marca} ${e.modelo}</span><br><span class="code-badge" style="font-size:.72rem">${e.id}</span>`;
                areaCell    = e.area;
                tipoCell    = e.tipo;
                notaCell    = e.responsable || '—';
                estadoCell  = `<span class="badge badge-fuera" style="background:#fef2f2;color:#b91c1c"><i class='bx bx-lock-alt' style="font-size:.8rem"></i> Ocupada</span>`;
                accionesCell = `
                    <div class="action-btns">
                        <a href="Equipos.html" class="icon-btn view" title="Ver equipo"><i class='bx bx-show'></i></a>
                        <button class="icon-btn qr" title="Marcar conflicto" onclick="preFillConflicto('${entry.ip}')"><i class='bx bx-error'></i></button>
                    </div>`;

            } else if (entry.tipo === 'reservada') {
                const r    = entry.reserva;
                equipoCell = `<em style="color:#6b7280">${r.nota}</em>`;
                notaCell   = r.responsable || '—';
                estadoCell = `<span class="badge badge-mantenimiento"><i class='bx bx-bookmark' style="font-size:.8rem"></i> Reservada</span>`;
                accionesCell = `
                    <div class="action-btns">
                        <button class="icon-btn edit"   title="Editar"     onclick="editReserva(${r.id})"><i class='bx bx-edit'></i></button>
                        <button class="icon-btn delete" title="Liberar IP" onclick="openDeleteReserva(${r.id})"><i class='bx bx-trash'></i></button>
                    </div>`;

            } else {
                estadoCell  = `<span class="badge badge-activo"><i class='bx bx-wifi' style="font-size:.8rem"></i> Libre</span>`;
                accionesCell = `
                    <div class="action-btns">
                        <button class="icon-btn qr"   title="Reservar IP"      onclick="preFillReserva('${entry.ip}')"><i class='bx bx-plus'></i></button>
                        <button class="icon-btn edit" title="Marcar conflicto" onclick="preFillConflicto('${entry.ip}')" style="background:#fff7ed;color:#d97706"><i class='bx bx-error'></i></button>
                    </div>`;
            }

            tr.innerHTML = `
                <td style="font-weight:700;font-family:monospace;font-size:.9rem">${entry.ip}</td>
                <td>${equipoCell}</td>
                <td>${areaCell}</td>
                <td>${tipoCell}</td>
                <td>${estadoCell}</td>
                <td style="color:#6b7280;font-size:.85rem">${notaCell}</td>
                <td>${accionesCell}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const pag = document.getElementById('ipsPag');
    pag.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderIPs(); };
        pag.appendChild(btn);
    }
}

// ===== RANGO =====
document.getElementById('btnAplicarRango').onclick = () => {
    const base  = document.getElementById('rangoBase').value.trim();
    const desde = parseInt(document.getElementById('rangoDesde').value);
    const hasta = parseInt(document.getElementById('rangoHasta').value);
    if (!base || isNaN(desde) || isNaN(hasta) || desde > hasta) { alert('Rango inválido.'); return; }
    saveRango({ base, desde, hasta });
    currentPage = 1;
    renderIPs();
};

// ===== MODAL RESERVA =====
function openReservaModal(ip = '', nota = '', responsable = '', editId = '') {
    document.getElementById('reservaIP').value          = ip;
    document.getElementById('reservaNota').value        = nota;
    document.getElementById('reservaResponsable').value = responsable;
    document.getElementById('reservaEditId').value      = editId;
    document.getElementById('reservaModal').classList.remove('hidden');
}
function preFillReserva(ip) { openReservaModal(ip); }
function closeReservaModal() { document.getElementById('reservaModal').classList.add('hidden'); }

document.getElementById('btnReservarIP').onclick    = () => openReservaModal();
document.getElementById('closeReservaBtn').onclick  = closeReservaModal;
document.getElementById('cancelReservaBtn').onclick = closeReservaModal;

function editReserva(id) {
    const r = (ipData.reservas || []).find(r => r.id === id);
    if (!r) return;
    openReservaModal(r.ip, r.nota, r.responsable || '', r.id);
}

document.getElementById('reservaForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const ip          = document.getElementById('reservaIP').value.trim();
    const nota        = document.getElementById('reservaNota').value.trim();
    const responsable = document.getElementById('reservaResponsable').value.trim();
    const editId      = document.getElementById('reservaEditId').value;
    if (!ip || !nota) return;

    const r = editId
        ? await updateReservaById(parseInt(editId), { ip, nota, responsable })
        : await createReserva({ ip, nota, responsable });

    if (!r?.ok) {
        const err = r ? await r.json() : { error: 'Error de conexión' };
        alert(err.error || 'Error al guardar la reserva');
        return;
    }
    closeReservaModal();
    await renderIPs();
});

// ===== MODAL CONFLICTO =====
function openConflictoModal(ip = '', nota = '', responsable = '', editId = '') {
    document.getElementById('conflictoIP').value          = ip;
    document.getElementById('conflictoNota').value        = nota;
    document.getElementById('conflictoResponsable').value = responsable;
    document.getElementById('conflictoEditId').value      = editId;
    document.getElementById('conflictoModal').classList.remove('hidden');
}
function preFillConflicto(ip) { openConflictoModal(ip); }
function closeConflictoModal() { document.getElementById('conflictoModal').classList.add('hidden'); }

document.getElementById('btnMarcarConflicto').onclick  = () => openConflictoModal();
document.getElementById('closeConflictoBtn').onclick   = closeConflictoModal;
document.getElementById('cancelConflictoBtn').onclick  = closeConflictoModal;

function editConflicto(id, ip) {
    const c = id ? (ipData.conflictos || []).find(c => c.id === id) : null;
    openConflictoModal(ip, c ? c.nota : '', c ? (c.responsable || '') : '', id || '');
}

async function deleteConflicto(id, ip) {
    if (!confirm(`¿Quitar el marcador de conflicto para la IP ${ip}?`)) return;
    if (id) await deleteConflictoById(id);
    await renderIPs();
}

document.getElementById('conflictoForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const ip          = document.getElementById('conflictoIP').value.trim();
    const nota        = document.getElementById('conflictoNota').value.trim();
    const responsable = document.getElementById('conflictoResponsable').value.trim();
    const editId      = document.getElementById('conflictoEditId').value;
    if (!ip || !nota) return;

    let r;
    if (editId) {
        r = await updateConflictoById(parseInt(editId), { ip, nota, responsable });
    } else {
        const equiposConIP = (ipData.equipos || [])
            .filter(eq => (eq.direccion_ip || '') === ip)
            .map(eq => eq.codigo_qr);
        r = await createConflicto({ ip, nota, responsable, tipo: 'manual', equipos: equiposConIP });
    }

    if (!r?.ok) {
        const err = r ? await r.json() : { error: 'Error de conexión' };
        alert(err.error || 'Error al guardar el conflicto');
        return;
    }
    closeConflictoModal();
    await renderIPs();
});

// ===== ELIMINAR RESERVA =====
function openDeleteReserva(id) {
    deleteReservaTarget = id;
    document.getElementById('deleteReservaModal').classList.remove('hidden');
}
function closeDeleteReserva() {
    deleteReservaTarget = null;
    document.getElementById('deleteReservaModal').classList.add('hidden');
}
document.getElementById('closeDeleteReservaBtn').onclick   = closeDeleteReserva;
document.getElementById('cancelDeleteReservaBtn').onclick  = closeDeleteReserva;
document.getElementById('confirmDeleteReservaBtn').onclick = async () => {
    if (!deleteReservaTarget) return;
    const r = await deleteReservaById(deleteReservaTarget);
    if (!r?.ok) { alert('Error al eliminar la reserva'); return; }
    closeDeleteReserva();
    await renderIPs();
};

// ===== FILTROS =====
document.getElementById('searchIP').addEventListener('input',        () => { currentPage = 1; renderIPs(); });
document.getElementById('filterIPEstado').addEventListener('change', () => { currentPage = 1; renderIPs(); });

// ===== INIT =====
cargarRangoUI();
renderIPs();

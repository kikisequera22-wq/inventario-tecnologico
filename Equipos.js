const currentUser  = initPage('equipos');
const isViewer     = currentUser?.rol === 'Visualizador';

const ITEMS_PER_PAGE = 7;
let allEquipos     = [];
let allAreas       = [];
let allTipos       = [];
let currentPage    = 1;
let editingId      = null;
let deleteTargetId = null;
let scanner        = null;
let detailEquipoId = null;
let pendingEquipo  = null;

// ===== CARGA DE DATOS =====
async function loadAllData() {
    [allEquipos, allAreas, allTipos] = await Promise.all([
        getEquipos(), getAreas(), getTipos()
    ]);
}

// ===== VISTAS =====
function showView(name) {
    ['view-list', 'view-detail', 'view-form'].forEach(id =>
        document.getElementById(id).classList.add('hidden')
    );
    document.getElementById('view-' + name).classList.remove('hidden');
    const titles = {
        list:   'Equipos',
        detail: 'Detalle del Equipo',
        form:   editingId ? 'Editar Equipo' : 'Nuevo Equipo',
    };
    document.getElementById('pageTitle').textContent = titles[name];
    window.scrollTo(0, 0);
}

// ===== FILTROS =====
function populateFilters() {
    const filterArea = document.getElementById('filterArea');
    const filterTipo = document.getElementById('filterTipo');
    const fArea      = document.getElementById('fArea');
    const fAreaVal   = fArea.value;

    filterArea.innerHTML = '<option value="">Área: Todas</option>';
    filterTipo.innerHTML = '<option value="">Tipo: Todos</option>';
    fArea.innerHTML      = '<option value="">Seleccionar</option>';

    allAreas.forEach(a => {
        filterArea.innerHTML += `<option value="${a.nombre}">${a.nombre}</option>`;
        fArea.innerHTML      += `<option value="${a.nombre}">${a.nombre}</option>`;
    });
    allTipos.forEach(t => { filterTipo.innerHTML += `<option value="${t}">${t}</option>`; });

    if (fAreaVal) fArea.value = fAreaVal;

    const dl = document.getElementById('tiposDatalist');
    if (dl) dl.innerHTML = allTipos.map(t => `<option value="${t}">`).join('');
}

// ===== BADGE CANTIDAD =====
function cantidadBadge(e) {
    const cant = e.cantidad !== undefined ? e.cantidad : 1;
    if (esConsumible(e.tipo)) {
        const cls = cant === 0 ? 'badge-fuera' : cant <= 5 ? 'badge-mantenimiento' : 'badge-activo';
        return `<span class="badge ${cls}">${cant} uds.</span>`;
    }
    return `<span style="color:#aaa;font-size:.82rem">—</span>`;
}

// ===== TABLA (sync — usa allEquipos en memoria) =====
function renderTable() {
    const search  = document.getElementById('searchInput').value.toLowerCase();
    const areaF   = document.getElementById('filterArea').value;
    const estadoF = document.getElementById('filterEstado').value;
    const tipoF   = document.getElementById('filterTipo').value;

    const filtered = allEquipos.filter(e => {
        const matchSearch = !search ||
            e.id.toLowerCase().includes(search) ||
            e.marca.toLowerCase().includes(search) ||
            e.modelo.toLowerCase().includes(search) ||
            e.area.toLowerCase().includes(search) ||
            e.tipo.toLowerCase().includes(search);
        return matchSearch
            && (!areaF   || e.area   === areaF)
            && (!estadoF || e.estado === estadoF)
            && (!tipoF   || e.tipo   === tipoF);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const paged = filtered.slice(start, start + ITEMS_PER_PAGE);

    const tbody = document.getElementById('equiposBody');
    tbody.innerHTML = '';
    if (!paged.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#aaa;padding:32px">Sin resultados</td></tr>`;
    } else {
        paged.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="code-badge">${e.id}</span></td>
                <td>${e.tipo}</td>
                <td>${e.marca}</td>
                <td>${e.modelo}</td>
                <td>${e.area}</td>
                <td>${cantidadBadge(e)}</td>
                <td>${badge(e.estado)}</td>
                <td>
                    <div class="action-btns">
                        <button class="icon-btn view" title="Ver detalle" onclick="openDetail('${e.id}')"><i class='bx bx-show'></i></button>
                        ${!isViewer ? `<button class="icon-btn edit" title="Editar" onclick="openForm('${e.id}')"><i class='bx bx-edit'></i></button>` : ''}
                        <button class="icon-btn qr" title="Ver QR" onclick="openPrintModal('${e.id}')"><i class='bx bx-qr'></i></button>
                        ${!isViewer ? `<button class="icon-btn delete" title="Eliminar" onclick="openDelete('${e.id}')"><i class='bx bx-trash'></i></button>` : ''}
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    const pag = document.getElementById('paginacion');
    pag.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderTable(); };
        pag.appendChild(btn);
    }
}

// Recarga datos de API y re-renderiza todo
async function refreshAndRender() {
    await loadAllData();
    populateFilters();
    renderTable();
}

// ===== DETALLE =====
async function openDetail(id) {
    let e = allEquipos.find(eq => eq.id === id);
    if (!e) {
        const r = await apiFetch(`/api/equipos/${encodeURIComponent(id)}`);
        if (r?.ok) e = mapEquipo(await r.json());
    }
    if (!e) return;

    detailEquipoId = id;
    const cant = e.cantidad !== undefined ? e.cantidad : 1;

    const qrContainer = document.getElementById('detailQR');
    qrContainer.innerHTML = '';
    const qrURL = buildQRUrl(e.id);
    new QRCode(qrContainer, { text: qrURL, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.H });
    document.getElementById('detailQRLabel').textContent = e.id;

    const rows = [
        ['Código QR',        e.id],
        ['Tipo de Equipo',   e.tipo],
        ['Marca',            e.marca],
        ['Modelo',           e.modelo],
        ['Número de Serie',  e.serie || '—'],
        ['Cantidad Stock',   esConsumible(e.tipo) ? `${cant} unidades` : '—'],
        ['Estado',           badge(e.estado)],
        ['Área',             e.area],
        ['Responsable',      e.responsable || '—'],
        ['Dirección IP',     e.ip || '—'],
        ['Fecha Registro',   e.fecha || '—'],
        ['Observaciones',    e.observaciones || '—'],
    ];
    document.getElementById('detailTable').innerHTML =
        rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

    showView('detail');
}

function buildQRUrl(id) {
    const base = window.location.href.split('?')[0];
    return `${base}?id=${encodeURIComponent(id)}`;
}

document.getElementById('btnBackDetail').onclick     = () => showView('list');
document.getElementById('btnEditFromDetail').onclick = () => { if (detailEquipoId) openForm(detailEquipoId); };

// ===== FORMULARIO =====
async function openForm(id = null) {
    editingId = id;
    populateFilters();
    document.getElementById('equipoForm').reset();

    if (id) {
        let e = allEquipos.find(eq => eq.id === id);
        if (!e) {
            const r = await apiFetch(`/api/equipos/${encodeURIComponent(id)}`);
            if (r?.ok) e = mapEquipo(await r.json());
        }
        if (!e) return;

        document.getElementById('fId').value          = e.id;
        document.getElementById('fId').readOnly       = true;
        document.getElementById('fTipo').value        = e.tipo;
        document.getElementById('fMarca').value       = e.marca;
        document.getElementById('fModelo').value      = e.modelo;
        document.getElementById('fSerie').value       = e.serie        || '';
        document.getElementById('fArea').value        = e.area;
        document.getElementById('fResponsable').value = e.responsable  || '';
        document.getElementById('fEstado').value      = e.estado;
        document.getElementById('fIp').value          = e.ip           || '';
        document.getElementById('fFecha').value       = e.fecha        || '';
        document.getElementById('fCantidad').value    = e.cantidad !== undefined ? e.cantidad : 1;
        document.getElementById('fObs').value         = e.observaciones || '';
    } else {
        document.getElementById('fId').readOnly    = false;
        document.getElementById('fFecha').value    = new Date().toISOString().split('T')[0];
        document.getElementById('fCantidad').value = 1;
    }

    document.getElementById('formTitle').textContent = id ? 'Editar Equipo' : 'Nuevo Equipo';
    showView('form');
}

document.getElementById('btnNuevo').onclick        = () => openForm();
document.getElementById('btnBackForm').onclick     = () => { editingId = null; showView('list'); };
document.getElementById('btnCancelarForm').onclick = () => { editingId = null; showView('list'); };

function buildEquipoFromForm() {
    return {
        id:            document.getElementById('fId').value.trim(),
        tipo:          document.getElementById('fTipo').value.trim(),
        marca:         document.getElementById('fMarca').value.trim(),
        modelo:        document.getElementById('fModelo').value.trim(),
        serie:         document.getElementById('fSerie').value.trim(),
        area:          document.getElementById('fArea').value,
        responsable:   document.getElementById('fResponsable').value.trim(),
        estado:        document.getElementById('fEstado').value,
        ip:            document.getElementById('fIp').value.trim(),
        fecha:         document.getElementById('fFecha').value,
        cantidad:      parseInt(document.getElementById('fCantidad').value) || 1,
        observaciones: document.getElementById('fObs').value.trim(),
    };
}

async function doSaveEquipo(equipo) {
    const r = editingId
        ? await updateEquipo(editingId, equipo)
        : await createEquipo(equipo);

    if (!r)     { alert('Error de conexión. Verifica que el servidor esté corriendo.'); return; }
    if (!r.ok)  { const err = await r.json(); alert(err.error || 'Error al guardar el equipo'); return; }

    // Registrar conflicto si IP duplicada
    if (equipo.ip) {
        const nuevos = await getEquipos();
        const conIP  = nuevos.filter(eq => eq.ip === equipo.ip);
        if (conIP.length > 1) {
            await createConflicto({
                ip:      equipo.ip,
                nota:    `IP duplicada entre: ${conIP.map(e => e.id).join(', ')}`,
                tipo:    'duplicada',
                equipos: conIP.map(e => e.id),
            });
        }
    }

    editingId     = null;
    pendingEquipo = null;
    await refreshAndRender();
    showView('list');
}

document.getElementById('equipoForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const equipo = buildEquipoFromForm();
    if (!equipo.id)   { alert('El Código QR es obligatorio.'); return; }
    if (!equipo.tipo) { alert('El Tipo de Equipo es obligatorio.'); return; }

    if (!editingId && allEquipos.find(eq => eq.id === equipo.id)) {
        alert('Ya existe un equipo con ese Código QR.'); return;
    }

    // Verificar conflicto de IP antes de guardar
    if (equipo.ip) {
        const ocupadaPor = allEquipos.filter(eq => eq.ip === equipo.ip && eq.id !== (editingId || ''));
        if (ocupadaPor.length > 0) {
            pendingEquipo = equipo;
            document.getElementById('ipConflictMsg').innerHTML =
                `La IP <strong>${equipo.ip}</strong> ya está asignada a:<br><br>` +
                ocupadaPor.map(eq =>
                    `<span class="code-badge">${eq.id}</span> &mdash; ${eq.marca} ${eq.modelo} <em style="color:#aaa">(${eq.area})</em>`
                ).join('<br>') +
                `<br><br>¿Seguro que quieres usar esta IP de todas formas?`;
            document.getElementById('ipConflictModal').classList.remove('hidden');
            return;
        }
    }
    await doSaveEquipo(equipo);
});

document.getElementById('closeIPConflictBtn').onclick  = () => { pendingEquipo = null; document.getElementById('ipConflictModal').classList.add('hidden'); };
document.getElementById('cancelIPConflictBtn').onclick = () => { pendingEquipo = null; document.getElementById('ipConflictModal').classList.add('hidden'); };
document.getElementById('confirmIPConflictBtn').onclick = async () => {
    document.getElementById('ipConflictModal').classList.add('hidden');
    if (pendingEquipo) await doSaveEquipo(pendingEquipo);
};

// ===== ELIMINAR =====
function openDelete(id) {
    deleteTargetId = id;
    document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDelete() {
    deleteTargetId = null;
    document.getElementById('deleteModal').classList.add('hidden');
}
document.getElementById('closeDeleteBtn').onclick  = closeDelete;
document.getElementById('cancelDeleteBtn').onclick = closeDelete;
document.getElementById('confirmDeleteBtn').onclick = async () => {
    if (!deleteTargetId) return;
    const r = await deleteEquipoById(deleteTargetId);
    if (!r?.ok) { alert('Error al eliminar el equipo'); return; }
    closeDelete();
    await refreshAndRender();
};

// ===== QR SCANNER =====
document.getElementById('openScannerBtn').onclick = () => {
    document.getElementById('scannerModal').classList.remove('hidden');
    scanner = new Html5Qrcode('qr-reader');
    scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            stopScanner();
            let equipoId = decodedText;
            try {
                const url = new URL(decodedText);
                equipoId = url.searchParams.get('id') || decodedText;
            } catch (_) {}
            const equipo = allEquipos.find(e => e.id === equipoId);
            if (equipo) openDetail(equipo.id);
            else alert(`QR escaneado: "${equipoId}"\nNo se encontró ningún equipo con ese código.`);
        },
        () => {}
    ).catch(() => {
        alert('No se pudo acceder a la cámara.');
        document.getElementById('scannerModal').classList.add('hidden');
    });
};
function stopScanner() {
    if (scanner) { scanner.stop().catch(() => {}); scanner = null; }
    document.getElementById('scannerModal').classList.add('hidden');
}
document.getElementById('closeScannerBtn').onclick = stopScanner;

// ===== IMPRIMIR QR =====
function openPrintModal(id) {
    const e = allEquipos.find(eq => eq.id === id);
    if (!e) return;
    const container = document.getElementById('printQRContainer');
    container.innerHTML = '';
    const qrURL = buildQRUrl(e.id);
    new QRCode(container, { text: qrURL, width: 192, height: 192, correctLevel: QRCode.CorrectLevel.H });
    document.getElementById('printLabelId').textContent = e.id;
    document.getElementById('printPELogo').innerHTML    = PE_LOGO_SVG_LG;
    document.getElementById('printQRInfo').textContent  = `${e.tipo} · ${e.marca} ${e.modelo} · ${e.area}`;
    document.getElementById('printModal').classList.remove('hidden');
}
document.getElementById('closePrintBtn').onclick = () => document.getElementById('printModal').classList.add('hidden');
document.getElementById('doPrintBtn').onclick    = () => window.print();
document.getElementById('btnPrintQR').onclick    = () => { if (detailEquipoId) openPrintModal(detailEquipoId); };

// ===== FILTROS EVENTOS =====
document.getElementById('searchInput').addEventListener('input',   () => { currentPage = 1; renderTable(); });
document.getElementById('filterArea').addEventListener('change',   () => { currentPage = 1; renderTable(); });
document.getElementById('filterEstado').addEventListener('change', () => { currentPage = 1; renderTable(); });
document.getElementById('filterTipo').addEventListener('change',   () => { currentPage = 1; renderTable(); });

// ===== INIT =====
(async () => {
    await loadAllData();
    populateFilters();
    renderTable();
    showView('list');

    // Ocultar controles de escritura para Visualizador
    if (isViewer) {
        const btnNuevo = document.getElementById('btnNuevo');
        if (btnNuevo) btnNuevo.style.display = 'none';
        const btnEdit = document.getElementById('btnEditFromDetail');
        if (btnEdit) btnEdit.style.display = 'none';
    }

    // Si se abrió con ?id=XXX (desde QR escaneado con cámara del celular)
    const params = new URLSearchParams(window.location.search);
    const id     = params.get('id');
    if (id) {
        window.history.replaceState({}, '', window.location.pathname);
        openDetail(decodeURIComponent(id));
    }
})();

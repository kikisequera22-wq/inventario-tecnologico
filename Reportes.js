initPage('reportes');

let allEquipos = [];
let allAreas   = [];

async function populateFilters() {
    [allEquipos, allAreas] = await Promise.all([getEquipos(), getAreas()]);
    const tipos = [...new Set(allEquipos.map(e => e.tipo))].filter(Boolean);

    const repFilterArea = document.getElementById('repFilterArea');
    repFilterArea.innerHTML = '<option value="">Área: Todas</option>';
    allAreas.forEach(a => repFilterArea.innerHTML += `<option value="${a.nombre}">${a.nombre}</option>`);

    const repFilterTipo = document.getElementById('repFilterTipo');
    repFilterTipo.innerHTML = '<option value="">Tipo: Todos</option>';
    tipos.forEach(t => repFilterTipo.innerHTML += `<option value="${t}">${t}</option>`);
}

function renderReporte() {
    const areaF   = document.getElementById('repFilterArea').value;
    const estadoF = document.getElementById('repFilterEstado').value;
    const tipoF   = document.getElementById('repFilterTipo').value;

    const filtered = allEquipos.filter(e =>
        (!areaF   || e.area   === areaF)  &&
        (!estadoF || e.estado === estadoF) &&
        (!tipoF   || e.tipo   === tipoF)
    );

    document.getElementById('repTotal').textContent   = filtered.length;
    document.getElementById('repActivos').textContent = filtered.filter(e => e.estado === 'Activo').length;
    document.getElementById('repMant').textContent    = filtered.filter(e => e.estado === 'En mantenimiento').length;
    document.getElementById('repFuera').textContent   = filtered.filter(e => e.estado === 'Fuera de servicio').length;

    const tbody = document.getElementById('reporteBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#aaa;padding:32px">Sin resultados</td></tr>`;
        return;
    }

    filtered.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="code-badge">${e.id}</span></td>
            <td>${e.tipo}</td>
            <td>${e.marca}</td>
            <td>${e.modelo}</td>
            <td style="color:#6b7280;font-size:.82rem">${e.serie || '—'}</td>
            <td>${e.area}</td>
            <td>${e.responsable || '—'}</td>
            <td>${badge(e.estado)}</td>
            <td style="color:#6b7280;font-size:.82rem">${e.fecha || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ===== EXPORTAR CSV =====
document.getElementById('exportCSVBtn').onclick = () => {
    const areaF   = document.getElementById('repFilterArea').value;
    const estadoF = document.getElementById('repFilterEstado').value;
    const tipoF   = document.getElementById('repFilterTipo').value;
    const equipos = allEquipos.filter(e =>
        (!areaF   || e.area   === areaF)  &&
        (!estadoF || e.estado === estadoF) &&
        (!tipoF   || e.tipo   === tipoF)
    );

    const headers = ['Código QR', 'Tipo', 'Marca', 'Modelo', 'Número de Serie', 'Área', 'Responsable', 'Estado', 'IP', 'Fecha', 'Observaciones'];
    const rows = equipos.map(e => [
        e.id, e.tipo, e.marca, e.modelo, e.serie || '',
        e.area, e.responsable || '', e.estado, e.ip || '', e.fecha || '', e.observaciones || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `inventario_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ===== FILTROS EVENTOS =====
document.getElementById('repFilterArea').addEventListener('change',   renderReporte);
document.getElementById('repFilterEstado').addEventListener('change', renderReporte);
document.getElementById('repFilterTipo').addEventListener('change',   renderReporte);

(async () => {
    await populateFilters();
    renderReporte();
})();

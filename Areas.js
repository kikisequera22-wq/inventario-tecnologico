initPage('areas');

let allAreas       = [];
let deleteTargetId = null;

async function renderAreas() {
    allAreas = await getAreas();
    const tbody = document.getElementById('areasBody');
    tbody.innerHTML = '';

    if (allAreas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:32px">No hay áreas registradas</td></tr>`;
        return;
    }

    allAreas.forEach((a, idx) => {
        const count = a.total_equipos || 0;
        const tr = document.createElement('tr');
        const nombreEsc = a.nombre.replace(/'/g, "\\'");
        tr.innerHTML = `
            <td style="color:#aaa;font-size:.85rem">${idx + 1}</td>
            <td style="font-weight:600">${a.nombre}</td>
            <td>
                <span class="badge badge-activo">${count} equipo${count !== 1 ? 's' : ''}</span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn edit" title="Editar" onclick="editArea(${a.id})">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="icon-btn delete" title="Eliminar" onclick="openDelete(${a.id},'${nombreEsc}',${count})">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ===== FORM =====
document.getElementById('btnNuevaArea').onclick = () => {
    document.getElementById('areaFormTitle').textContent = 'Nueva Área';
    document.getElementById('areaName').value            = '';
    document.getElementById('areaEditId').value          = '';
    document.getElementById('areaFormCard').style.display = 'block';
    document.getElementById('areaName').focus();
};

document.getElementById('cancelAreaBtn').onclick = () => {
    document.getElementById('areaFormCard').style.display = 'none';
};

function editArea(id) {
    const area = allAreas.find(a => a.id === id);
    if (!area) return;
    document.getElementById('areaFormTitle').textContent  = 'Editar Área';
    document.getElementById('areaName').value             = area.nombre;
    document.getElementById('areaEditId').value           = area.id;
    document.getElementById('areaFormCard').style.display = 'block';
    document.getElementById('areaName').focus();
}

document.getElementById('areaForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const nombre = document.getElementById('areaName').value.trim();
    const editId = document.getElementById('areaEditId').value;
    if (!nombre) return;

    const r = editId
        ? await updateArea(parseInt(editId), nombre)
        : await createArea(nombre);

    if (!r)    { alert('Error de conexión.'); return; }
    if (!r.ok) { const err = await r.json(); alert(err.error || 'Error al guardar el área'); return; }

    document.getElementById('areaFormCard').style.display = 'none';
    await renderAreas();
});

// ===== ELIMINAR =====
function openDelete(id, nombre, count) {
    deleteTargetId = id;
    const msg = count > 0
        ? `¿Eliminar el área "${nombre}"? Tiene ${count} equipo(s) asignado(s) — estos quedarán sin área.`
        : `¿Eliminar el área "${nombre}"?`;
    document.getElementById('deleteMsg').textContent = msg;
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
    const r = await deleteAreaById(deleteTargetId);
    if (!r?.ok) { alert('Error al eliminar el área'); return; }
    closeDelete();
    await renderAreas();
};

renderAreas();

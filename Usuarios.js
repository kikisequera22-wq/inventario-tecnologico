const currentUser = initPage('usuarios');

let allUsuarios    = [];
let deleteTargetId = null;

const rolColors = {
    'Administrador': 'badge-fuera',
    'Operador':      'badge-mantenimiento',
    'Visualizador':  'badge-activo',
};

async function renderUsuarios() {
    allUsuarios = await getUsuarios();
    const tbody = document.getElementById('usuariosBody');
    tbody.innerHTML = '';

    if (allUsuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:32px">No hay usuarios registrados</td></tr>`;
        return;
    }

    allUsuarios.forEach(u => {
        const isSelf   = currentUser && u.id === currentUser.id;
        const isActive = u.activo !== false;
        const tr = document.createElement('tr');
        if (!isActive) tr.style.opacity = '0.55';

        tr.innerHTML = `
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:50%;background:${isActive ? '#fff0f0' : '#f0f0f0'};display:flex;align-items:center;justify-content:center;color:${isActive ? '#d50909' : '#aaa'};font-weight:700;font-size:.9rem;flex-shrink:0">
                        ${u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span style="font-weight:600">${u.nombre}${isSelf ? ' <span style="font-size:.7rem;color:#aaa">(tú)</span>' : ''}</span>
                        ${!isActive ? '<div style="font-size:.7rem;color:#e57373;font-weight:500">Inactivo</div>' : ''}
                    </div>
                </div>
            </td>
            <td style="color:#6b7280;font-size:.88rem">${u.email}</td>
            <td><span class="badge ${rolColors[u.rol] || 'badge-activo'}">${u.rol}</span></td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn edit" title="Editar" onclick="editUsuario(${u.id})">
                        <i class='bx bx-edit'></i>
                    </button>
                    ${!isSelf ? `
                    <button class="icon-btn" style="color:${isActive ? '#16a34a' : '#aaa'}" title="${isActive ? 'Desactivar usuario' : 'Activar usuario'}" onclick="toggleUsuario(${u.id}, ${isActive})">
                        <i class='bx bx-power-off'></i>
                    </button>
                    <button class="icon-btn delete" title="Eliminar permanentemente" onclick="openDelete(${u.id})">
                        <i class='bx bx-trash'></i>
                    </button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ===== ACTIVAR / DESACTIVAR =====
async function toggleUsuario(id, currentlyActive) {
    const accion = currentlyActive ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} este usuario?`)) return;

    const r = await toggleUsuarioById(id);
    if (!r)    { alert('Error de conexión.'); return; }
    if (!r.ok) { const err = await r.json(); alert(err.error || 'Error al cambiar estado'); return; }
    await renderUsuarios();
}

// ===== FORM =====
document.getElementById('btnNuevoUsuario').onclick = () => {
    document.getElementById('usuarioFormTitle').textContent = 'Nuevo Usuario';
    document.getElementById('usuarioForm').reset();
    document.getElementById('uEditId').value              = '';
    document.getElementById('passNote').style.display     = 'none';
    document.getElementById('uPassword').required         = true;
    document.getElementById('usuarioFormCard').style.display = 'block';
};

document.getElementById('cancelUsuarioBtn').onclick = () => {
    document.getElementById('usuarioFormCard').style.display = 'none';
};

function editUsuario(id) {
    const u = allUsuarios.find(u => u.id === id);
    if (!u) return;
    document.getElementById('usuarioFormTitle').textContent = 'Editar Usuario';
    document.getElementById('uNombre').value               = u.nombre;
    document.getElementById('uEmail').value                = u.email;
    document.getElementById('uPassword').value             = '';
    document.getElementById('uRol').value                  = u.rol;
    document.getElementById('uEditId').value               = u.id;
    document.getElementById('passNote').style.display      = 'inline';
    document.getElementById('uPassword').required          = false;
    document.getElementById('usuarioFormCard').style.display = 'block';
}

document.getElementById('usuarioForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const nombre   = document.getElementById('uNombre').value.trim();
    const email    = document.getElementById('uEmail').value.trim();
    const password = document.getElementById('uPassword').value;
    const rol      = document.getElementById('uRol').value;
    const editId   = document.getElementById('uEditId').value;

    let r;
    if (editId) {
        r = await updateUsuario(parseInt(editId), { nombre, email, password, rol });
    } else {
        if (!password) { alert('La contraseña es obligatoria para usuarios nuevos.'); return; }
        r = await createUsuario({ nombre, email, password, rol });
    }

    if (!r)    { alert('Error de conexión.'); return; }
    if (!r.ok) { const err = await r.json(); alert(err.error || 'Error al guardar el usuario'); return; }

    document.getElementById('usuarioFormCard').style.display = 'none';
    await renderUsuarios();
});

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
    const r = await deleteUsuarioById(deleteTargetId);
    if (!r)    { alert('Error de conexión.'); return; }
    if (!r.ok) { const err = await r.json(); alert(err.error || 'Error al eliminar usuario'); return; }
    closeDelete();
    await renderUsuarios();
};

renderUsuarios();

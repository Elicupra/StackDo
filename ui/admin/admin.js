const loginPanel = document.getElementById('loginPanel');
const adminPanel = document.getElementById('adminPanel');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');
const currentAdmin = document.getElementById('currentAdmin');

const refreshUsersBtn = document.getElementById('refreshUsers');
const refreshProjectsBtn = document.getElementById('refreshProjects');
const refreshLogsBtn = document.getElementById('refreshLogs');
const createJsonBackupBtn = document.getElementById('createJsonBackup');
const createCsvBackupBtn = document.getElementById('createCsvBackup');

let authToken = localStorage.getItem('authToken') || null;
let authEnabled = false;
let currentRole = null;

async function fetchAuthStatus() {
    try {
        const res = await fetch('/auth/status');
        if (!res.ok) return false;
        const data = await res.json();
        return !!data.enabled;
    } catch (e) {
        return false;
    }
}

function setAuthHeaders(init = {}) {
    const headers = new Headers(init.headers || {});
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
    }
    return { ...init, headers };
}

async function fetchMe() {
    const res = await fetch('/me', setAuthHeaders());
    if (!res.ok) return null;
    return res.json();
}

function showLogin() {
    loginPanel.classList.remove('hidden');
    adminPanel.classList.add('hidden');
    currentAdmin.textContent = 'No autenticado';
}

function showAdmin(name, role) {
    loginPanel.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    currentAdmin.textContent = `${name} (${role})`;
}

function isAdminRole(role) {
    return role === 'ITAdmin' || role === 'SuperAdmin';
}

async function init() {
    authEnabled = await fetchAuthStatus();
    if (!authEnabled) {
        showLogin();
        loginError.textContent = 'JWT deshabilitado. Activa AUTH_ENABLED.';
        loginError.classList.remove('hidden');
        return;
    }

    if (authToken) {
        const me = await fetchMe();
        if (me && isAdminRole(me.rol)) {
            currentRole = me.rol;
            showAdmin(`${me.nombre} ${me.primer_apellido}`.trim(), me.rol);
            await loadAll();
            return;
        }
    }

    showLogin();
}

loginBtn.addEventListener('click', async () => {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    loginError.classList.add('hidden');

    if (!identifier || !password) {
        loginError.textContent = 'Completa tus credenciales.';
        loginError.classList.remove('hidden');
        return;
    }

    const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
    });

    if (!res.ok) {
        loginError.textContent = 'Credenciales invalidas.';
        loginError.classList.remove('hidden');
        return;
    }

    const data = await res.json();
    authToken = data.access_token;
    localStorage.setItem('authToken', authToken);

    const me = await fetchMe();
    if (!me || !isAdminRole(me.rol)) {
        loginError.textContent = 'No autorizado para consola IT.';
        loginError.classList.remove('hidden');
        return;
    }

    currentRole = me.rol;
    showAdmin(`${me.nombre} ${me.primer_apellido}`.trim(), me.rol);
    await loadAll();
});

logoutBtn.addEventListener('click', () => {
    authToken = null;
    localStorage.removeItem('authToken');
    showLogin();
});

function bindTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

async function loadAll() {
    await Promise.all([loadUsers(), loadProjects(), loadLogs(), loadBackups()]);
}

async function loadUsers() {
    const container = document.getElementById('usersTable');
    container.innerHTML = '<div class="table-row header"><div>ID</div><div>Nombre</div><div>Apellido</div><div>Rol</div><div>Correo</div><div>Acciones</div></div>';

    const res = await fetch('/admin/users', setAuthHeaders());
    if (!res.ok) {
        container.innerHTML += '<div class="table-row">Error cargando usuarios</div>';
        return;
    }
    const users = await res.json();
    users.forEach(user => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div>${user.id} (${user.id_usuario})</div>
            <div><input value="${escapeHtml(user.nombre || '')}" data-field="nombre" /></div>
            <div><input value="${escapeHtml(user.primer_apellido || '')}" data-field="primer_apellido" /></div>
            <div>
                <select data-field="rol">
                    ${roleOptions(user.rol)}
                </select>
            </div>
            <div><input value="${escapeHtml(user.correo_electronico || '')}" data-field="correo_electronico" /></div>
            <div class="actions">
                <button class="btn ghost" data-action="save">Guardar</button>
                <button class="btn ghost" data-action="reset">Reset</button>
                <button class="btn ghost" data-action="delete">Borrar</button>
            </div>
        `;

        row.querySelector('[data-action="save"]').addEventListener('click', async () => {
            const payload = collectRow(row);
            const updateRes = await fetch(`/admin/users/${user.id}`, setAuthHeaders({
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }));
            if (!updateRes.ok) {
                alert('Error al actualizar usuario');
                return;
            }
            await loadUsers();
        });

        row.querySelector('[data-action="reset"]').addEventListener('click', async () => {
            const temp = generatePassword();
            const ok = confirm(`Resetear password a: ${temp}`);
            if (!ok) return;
            const resetRes = await fetch(`/admin/users/${user.id}/reset-password`, setAuthHeaders({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: temp })
            }));
            if (!resetRes.ok) {
                alert('Error al resetear password');
                return;
            }
            alert(`Password temporal: ${temp}`);
        });

        row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
            const ok = confirm('Borrar usuario?');
            if (!ok) return;
            const delRes = await fetch(`/admin/users/${user.id}`, setAuthHeaders({ method: 'DELETE' }));
            if (!delRes.ok) {
                alert('Error al borrar usuario');
                return;
            }
            await loadUsers();
        });

        container.appendChild(row);
    });
}

function roleOptions(current) {
    const roles = ['SuperAdmin', 'ITAdmin', 'AdminProyecto', 'CoordinadorProyecto', 'Usuario'];
    return roles.map(r => `<option value="${r}" ${r === current ? 'selected' : ''}>${r}</option>`).join('');
}

function collectRow(row) {
    const inputs = row.querySelectorAll('input, select');
    const payload = {};
    inputs.forEach(input => {
        payload[input.dataset.field] = input.value || null;
    });
    return payload;
}

async function loadProjects() {
    const container = document.getElementById('projectsTable');
    container.innerHTML = '<div class="table-row header"><div>ID</div><div>Nombre</div><div>Descripcion</div><div>Color</div><div>Acciones</div></div>';

    const res = await fetch('/admin/projects', setAuthHeaders());
    if (!res.ok) {
        container.innerHTML += '<div class="table-row">Error cargando proyectos</div>';
        return;
    }
    const projects = await res.json();
    projects.forEach(project => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div>${project.id}</div>
            <div>${escapeHtml(project.name || '')}</div>
            <div>${escapeHtml(project.description || '')}</div>
            <div>${escapeHtml(project.color || '')}</div>
            <div class="actions">
                <button class="btn ghost" data-action="delete">Borrar</button>
            </div>
        `;

        row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
            const ok = confirm('Borrar proyecto?');
            if (!ok) return;
            const delRes = await fetch(`/admin/projects/${project.id}`, setAuthHeaders({ method: 'DELETE' }));
            if (!delRes.ok) {
                alert('No se pudo borrar el proyecto (tareas activas?)');
                return;
            }
            await loadProjects();
        });
        container.appendChild(row);
    });
}

async function loadLogs() {
    const container = document.getElementById('logsTable');
    container.innerHTML = '<div class="table-row header"><div>Fecha</div><div>Nivel</div><div>Mensaje</div><div>Contexto</div></div>';

    const res = await fetch('/admin/logs?limit=200', setAuthHeaders());
    if (!res.ok) {
        container.innerHTML += '<div class="table-row">Error cargando logs</div>';
        return;
    }
    const logs = await res.json();
    logs.forEach(log => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div>${escapeHtml(formatDate(log.created_at))}</div>
            <div>${escapeHtml(log.level)}</div>
            <div>${escapeHtml(log.message)}</div>
            <div>${escapeHtml(log.context || '')}</div>
        `;
        container.appendChild(row);
    });
}

async function loadBackups() {
    const container = document.getElementById('backupsTable');
    container.innerHTML = '<div class="table-row header"><div>Archivo</div><div>Tamano</div><div>Acciones</div></div>';

    const res = await fetch('/admin/backups', setAuthHeaders());
    if (!res.ok) {
        container.innerHTML += '<div class="table-row">Error cargando backups</div>';
        return;
    }
    const data = await res.json();
    data.files.forEach(file => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div>${escapeHtml(file.name)}</div>
            <div>${formatSize(file.size)}</div>
            <div class="actions">
                <a class="btn ghost" href="/admin/backups/${encodeURIComponent(file.name)}" target="_blank">Descargar</a>
            </div>
        `;
        container.appendChild(row);
    });
}

createJsonBackupBtn.addEventListener('click', async () => {
    const res = await fetch('/admin/backups?kind=json', setAuthHeaders({ method: 'POST' }));
    if (!res.ok) {
        alert('Error creando backup');
        return;
    }
    await loadBackups();
});

createCsvBackupBtn.addEventListener('click', async () => {
    const res = await fetch('/admin/backups?kind=csv', setAuthHeaders({ method: 'POST' }));
    if (!res.ok) {
        alert('Error creando backup');
        return;
    }
    await loadBackups();
});

refreshUsersBtn.addEventListener('click', loadUsers);
refreshProjectsBtn.addEventListener('click', loadProjects);
refreshLogsBtn.addEventListener('click', loadLogs);

function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 10; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, idx);
    return `${val.toFixed(1)} ${units[idx]}`;
}

bindTabs();
init();

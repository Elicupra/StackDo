// ui/main.js
const API = "/tasks";
const API_PROJECTS = "/projects";
const API_USERS = "/users";
const DEFAULT_PRIMARY_COLOR = '#007bff';

// Estado global
let currentViewMode = localStorage.getItem('viewMode') || 'table';
let currentProjectId = localStorage.getItem('currentProjectId') || null;
let currentUserId = localStorage.getItem('currentUserId') || null;
let currentUserRole = localStorage.getItem('currentUserRole') || null;
let authToken = localStorage.getItem('authToken') || null;
let authEnabled = false;
let currentFilters = {
    search: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: ''
};
let allTasks = [];
let lastFilteredTasks = [];
let filterTimeout;
let projectsCache = new Map();
let usersCache = [];
let projectEditId = null;
let projectLogoDataUrl = null;
let projectLogoChanged = false;
let authFetchConfigured = false;

// ==================== INICIALIZACIÓN ====================

async function initApp() {
    initTheme();
    authEnabled = await fetchAuthStatus();

    if (authEnabled) {
        if (authToken) {
            configureAuthFetch();
            const me = await fetchCurrentUser();
            if (me) {
                setActiveUser(me);
                hideLoginView();
                const hasCurrentProject = await loadProjects();
                if (!hasCurrentProject) {
                    showProjectSelectionModal(true);
                    return;
                }
                loadTasks();
                return;
            }
        }
        showLoginView();
        return;
    }

    hideLoginView();
    const hasUsers = await loadUsers();
    if (!hasUsers) {
        showUserSelectionModal(true);
        return;
    }
    const hasCurrentUser = ensureActiveUser();
    if (!hasCurrentUser) {
        showUserSelectionModal(true);
        return;
    }
    configureAuthFetch();
    const hasCurrentProject = await loadProjects();
    if (!hasCurrentProject) {
        showProjectSelectionModal(true);
        return;
    }
    loadTasks();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
        return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
}

function applyTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    const toggleIcon = document.querySelector('#themeToggleBtn i');
    if (toggleIcon) {
        toggleIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function showLoginView() {
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');
    if (loginView) loginView.classList.remove('d-none');
    if (appView) appView.classList.add('d-none');
}

function hideLoginView() {
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');
    if (loginView) loginView.classList.add('d-none');
    if (appView) appView.classList.remove('d-none');
}

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

async function fetchCurrentUser() {
    try {
        const res = await fetch('/me');
        if (!res.ok) throw new Error('No autorizado');
        return await res.json();
    } catch (e) {
        authToken = null;
        localStorage.removeItem('authToken');
        return null;
    }
}

function configureAuthFetch() {
    if (authFetchConfigured) return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers || {});
        if (authEnabled && authToken) {
            headers.set('Authorization', `Bearer ${authToken}`);
        } else if (!authEnabled && currentUserId) {
            headers.set('X-User-Id', currentUserId);
        }
        return originalFetch(input, { ...init, headers });
    };
    authFetchConfigured = true;
}

function ensureActiveUser() {
    if (!currentUserId) return false;
    const user = usersCache.find(u => String(u.id) === String(currentUserId));
    if (!user) {
        currentUserId = null;
        currentUserRole = null;
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUserRole');
        return false;
    }
    setActiveUser(user);
    return true;
}

function setActiveUser(user) {
    currentUserId = String(user.id);
    currentUserRole = user.rol || 'Usuario';
    localStorage.setItem('currentUserId', currentUserId);
    localStorage.setItem('currentUserRole', currentUserRole);
    usersCache = [user];
    document.getElementById('currentUserName').textContent = `${user.nombre} ${user.primer_apellido}`.trim();
    applyUserPermissions();
}

function applyUserPermissions() {
    const exportDropdown = document.getElementById('exportDropdown');
    const dashboardBtn = document.getElementById('streamlitDashboardBtn');
    const createProjectBtn = document.getElementById('createProjectBtn');
    const editProjectBtn = document.getElementById('editProjectBtn');
    const openUserModalBtn = document.getElementById('openUserModalBtn');
    const createProjectFromSelection = document.getElementById('createProjectFromSelection');
    const openUserPickerBtn = document.getElementById('openUserPickerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminConsoleBtn = document.getElementById('adminConsoleBtn');
    const role = currentUserRole || 'Usuario';

    const canExport = role !== 'Usuario';
    const canDashboard = role !== 'Usuario';
    const canManageProjects = role === 'SuperAdmin' || role === 'AdminProyecto';
    const canManageUsers = role === 'SuperAdmin' || role === 'AdminProyecto';
    const canAccessAdmin = role === 'SuperAdmin' || role === 'ITAdmin';

    if (exportDropdown) exportDropdown.classList.toggle('d-none', !canExport);
    if (dashboardBtn) dashboardBtn.classList.toggle('d-none', !canDashboard);
    if (createProjectBtn) createProjectBtn.classList.toggle('d-none', !canManageProjects);
    if (editProjectBtn) editProjectBtn.classList.toggle('d-none', !canManageProjects);
    if (openUserModalBtn) openUserModalBtn.classList.toggle('d-none', !canManageUsers);
    if (createProjectFromSelection) createProjectFromSelection.classList.toggle('d-none', !canManageProjects);
    if (openUserPickerBtn) openUserPickerBtn.classList.toggle('d-none', authEnabled);
    if (logoutBtn) logoutBtn.classList.toggle('d-none', !authEnabled);
    if (adminConsoleBtn) adminConsoleBtn.classList.toggle('d-none', !canAccessAdmin);
}

// ==================== MODAL DE SELECCIÓN DE PROYECTO ====================

document.getElementById('loginBtn').addEventListener('click', async () => {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.classList.add('d-none');

    if (!identifier || !password) {
        if (errorEl) {
            errorEl.textContent = 'Completa las credenciales';
            errorEl.classList.remove('d-none');
        }
        return;
    }

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });
        if (!res.ok) throw new Error('Credenciales invalidas');
        const data = await res.json();
        authToken = data.access_token;
        localStorage.setItem('authToken', authToken);
        configureAuthFetch();

        const me = await fetchCurrentUser();
        if (!me) throw new Error('No se pudo obtener el usuario');
        setActiveUser(me);

        hideLoginView();

        const hasCurrentProject = await loadProjects();
        if (!hasCurrentProject) {
            showProjectSelectionModal(true);
            return;
        }
        loadTasks();
    } catch (e) {
        if (errorEl) {
            errorEl.textContent = 'Credenciales invalidas';
            errorEl.classList.remove('d-none');
        }
    }
});

document.getElementById('showLoginFormBtn').addEventListener('click', () => {
    document.getElementById('loginForm').classList.remove('d-none');
    document.getElementById('registerForm').classList.add('d-none');
});

document.getElementById('showRegisterFormBtn').addEventListener('click', () => {
    document.getElementById('registerForm').classList.remove('d-none');
    document.getElementById('loginForm').classList.add('d-none');
});

document.getElementById('registerBtn').addEventListener('click', async () => {
    const idUsuario = document.getElementById('registerId').value.trim();
    const nombre = document.getElementById('registerName').value.trim();
    const primerApellido = document.getElementById('registerLastName').value.trim();
    const correo = document.getElementById('registerEmail').value.trim() || null;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');

    if (errorEl) {
        errorEl.classList.add('d-none');
        errorEl.textContent = '';
    }
    if (successEl) successEl.classList.add('d-none');

    if (!idUsuario || !nombre || !primerApellido || !password) {
        if (errorEl) {
            errorEl.textContent = 'Completa los campos obligatorios';
            errorEl.classList.remove('d-none');
        }
        return;
    }

    try {
        const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_usuario: idUsuario,
                nombre,
                primer_apellido: primerApellido,
                correo_electronico: correo,
                password
            })
        });
        if (!res.ok) {
            let errorMessage = 'Error al crear usuario';
            try {
                const data = await res.json();
                errorMessage = data.detail || errorMessage;
            } catch (parseError) {
                const text = await res.text();
                if (text) errorMessage = text;
            }
            throw new Error(errorMessage);
        }

        document.getElementById('registerId').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerLastName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';

        if (successEl) successEl.classList.remove('d-none');
        document.getElementById('loginForm').classList.remove('d-none');
        document.getElementById('registerForm').classList.add('d-none');
    } catch (e) {
        if (errorEl) {
            errorEl.textContent = e.message;
            errorEl.classList.remove('d-none');
        }
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    authToken = null;
    currentUserId = null;
    currentUserRole = null;
    currentProjectId = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUserRole');
    localStorage.removeItem('currentProjectId');
    showLoginView();
});

// ==================== MODAL DE SELECCIÓN DE PROYECTO ====================

function showUserSelectionModal(forceSelect = false) {
    const modalEl = document.getElementById('userSelectionModal');
    const closeBtn = document.getElementById('userSelectionCloseBtn');
    if (forceSelect) {
        closeBtn.classList.add('d-none');
    } else {
        closeBtn.classList.remove('d-none');
    }
    const modal = new bootstrap.Modal(modalEl, {
        backdrop: forceSelect ? 'static' : true,
        keyboard: !forceSelect
    });
    modal.show();
}

document.getElementById('userListContainer').addEventListener('click', async (e) => {
    const option = e.target.closest('.user-option');
    if (!option) return;

    const selectedId = option.dataset.userId;
    const user = usersCache.find(u => String(u.id) === String(selectedId));
    if (!user) return;

    setActiveUser(user);
    configureAuthFetch();

    const modal = bootstrap.Modal.getInstance(document.getElementById('userSelectionModal'));
    modal.hide();

    const hasCurrentProject = await loadProjects();
    if (!hasCurrentProject) {
        showProjectSelectionModal(true);
        return;
    }
    loadTasks();
});

document.getElementById('openUserPickerBtn').addEventListener('click', () => {
    showUserSelectionModal(false);
});

// ==================== MODAL DE SELECCIÓN DE PROYECTO ====================

function showProjectSelectionModal(forceSelect = false) {
    const modalEl = document.getElementById('projectSelectionModal');
    const closeBtn = document.getElementById('projectSelectionCloseBtn');
    if (forceSelect) {
        closeBtn.classList.add('d-none');
    } else {
        closeBtn.classList.remove('d-none');
    }
    const modal = new bootstrap.Modal(modalEl, {
        backdrop: forceSelect ? 'static' : true,
        keyboard: !forceSelect
    });
    modal.show();
}

document.getElementById('projectListContainer').addEventListener('click', async (e) => {
    const option = e.target.closest('.project-option');
    if (!option) return;

    const selectedId = option.dataset.projectId;
    const project = projectsCache.get(parseInt(selectedId));
    if (!project) return;

    setActiveProject(project);
    document.getElementById('projectSelect').value = currentProjectId;

    const modal = bootstrap.Modal.getInstance(document.getElementById('projectSelectionModal'));
    modal.hide();
    resetFilters();
    loadTasks();
});

// ==================== CARGAR PROYECTOS ====================

async function loadProjects() {
    try {
        const res = await fetch(API_PROJECTS);
        if (!res.ok) throw new Error('No se pudieron cargar proyectos');
        const projects = await res.json();

        projectsCache = new Map(projects.map(p => [p.id, p]));
        
        const sel = document.getElementById('projectSelect');
        sel.innerHTML = '<option value="">-- Cambiar Proyecto --</option>';
        
        const projectList = document.getElementById('projectListContainer');
        projectList.innerHTML = '';
        
        const noProjectsMsg = document.getElementById('noProjectsMessage');
        
        if (projects.length === 0) {
            // No hay proyectos, mostrar mensaje
            noProjectsMsg.classList.remove('d-none');
            projectList.classList.add('d-none');
        } else {
            // Hay proyectos, mostrar lista
            noProjectsMsg.classList.add('d-none');
            projectList.classList.remove('d-none');
            
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                sel.appendChild(opt);
                
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'list-group-item list-group-item-action project-option';
                btn.dataset.projectId = p.id;
                const logo = p.logo ? `<img src="${p.logo}" alt="Logo" class="me-2 project-logo" />` : '';
                btn.innerHTML = `${logo}<span>${p.name}</span>`;
                projectList.appendChild(btn);
            });
        }
        
        const taskProjectSel = document.getElementById('taskProjectSelect');
        taskProjectSel.innerHTML = '<option value="">Sin proyecto</option>';
        projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            taskProjectSel.appendChild(opt);
        });
        
        let hasCurrentProject = false;
        if (currentProjectId) {
            const currentProject = projects.find(p => p.id == currentProjectId);
            if (currentProject) {
                setActiveProject(currentProject);
                document.getElementById('projectSelect').value = currentProjectId;
                hasCurrentProject = true;
            } else {
                // Proyecto guardado ya no existe, limpiar
                currentProjectId = null;
                localStorage.removeItem('currentProjectId');
            }
        }
        if (!hasCurrentProject && projects.length) {
            setActiveProject(projects[0]);
            document.getElementById('projectSelect').value = projects[0].id;
            hasCurrentProject = true;
        }
        if (!hasCurrentProject) {
            document.getElementById('currentProjectName').textContent = 'Sin proyecto';
            applyProjectBrand(null);
        }

        return hasCurrentProject;
    } catch (e) {
        console.error('Error cargando proyectos:', e);
        showToast('Error al cargar proyectos', 'danger');
        return false;
    }
}

// ==================== CARGAR USUARIOS ====================

async function loadUsers() {
    try {
        if (authEnabled && currentUserRole && !['SuperAdmin', 'AdminProyecto'].includes(currentUserRole)) {
            const userSelect = document.getElementById('taskUserSelect');
            userSelect.innerHTML = '<option value="">Seleccionar usuario...</option>';
            if (currentUserId) {
                const label = document.getElementById('currentUserName').textContent || 'Usuario actual';
                const opt = document.createElement('option');
                opt.value = currentUserId;
                opt.textContent = label;
                userSelect.appendChild(opt);
                userSelect.value = currentUserId;
            }
            return true;
        }

        const res = await fetch(API_USERS);
        if (!res.ok) throw new Error('No se pudieron cargar usuarios');
        const users = await res.json();

        usersCache = users;

        const userSelect = document.getElementById('taskUserSelect');
        userSelect.innerHTML = '<option value="">Seleccionar usuario...</option>';

        const userList = document.getElementById('userListContainer');
        const noUsersMsg = document.getElementById('noUsersMessage');
        userList.innerHTML = '';
        if (!users.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No hay usuarios disponibles';
            opt.disabled = true;
            userSelect.appendChild(opt);
            if (noUsersMsg) {
                noUsersMsg.classList.remove('d-none');
                userList.classList.add('d-none');
            }
            return false;
        }

        if (noUsersMsg) {
            noUsersMsg.classList.add('d-none');
            userList.classList.remove('d-none');
        }

        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            const label = `${u.nombre} ${u.primer_apellido}`.trim();
            opt.textContent = u.id_usuario ? `${label} (${u.id_usuario})` : label;
            userSelect.appendChild(opt);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'list-group-item list-group-item-action user-option';
            btn.dataset.userId = u.id;
            btn.innerHTML = `<span>${opt.textContent}</span>`;
            userList.appendChild(btn);
        });
        return true;
    } catch (e) {
        console.error('Error cargando usuarios:', e);
        showToast('Error al cargar usuarios', 'danger');
        return false;
    }
}

// ==================== CARGAR TAREAS ====================

async function loadTasks() {
    try {
        const url = currentProjectId ? `${API}?project_id=${currentProjectId}` : API;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al cargar tareas');
        allTasks = await res.json();
        applyFilters();
    } catch (e) {
        console.error('Error cargando tareas:', e);
        showToast('Error al cargar tareas', 'danger');
    }
}

// ==================== FILTROS ====================

function applyFilters() {
    let filtered = allTasks;
    
    if (currentFilters.search) {
        const search = currentFilters.search.toLowerCase();
        filtered = filtered.filter(t => 
            t.titulo.toLowerCase().includes(search) ||
            (t.descripcion && t.descripcion.toLowerCase().includes(search))
        );
    }
    
    if (currentFilters.status) {
        filtered = filtered.filter(t => t.estado === currentFilters.status);
    }
    
    if (currentFilters.priority) {
        filtered = filtered.filter(t => t.prioridad == currentFilters.priority);
    }
    
    if (currentFilters.dateFrom) {
        filtered = filtered.filter(t => {
            if (!t.fecha_vencimiento) return false;
            return new Date(t.fecha_vencimiento) >= new Date(currentFilters.dateFrom);
        });
    }
    if (currentFilters.dateTo) {
        filtered = filtered.filter(t => {
            if (!t.fecha_vencimiento) return false;
            return new Date(t.fecha_vencimiento) <= new Date(currentFilters.dateTo);
        });
    }
    
    filtered.sort((a, b) => {
        if (a.prioridad !== b.prioridad) return b.prioridad - a.prioridad;
        const dateA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento) : new Date(9999, 0);
        const dateB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento) : new Date(9999, 0);
        return dateA - dateB;
    });
    
    lastFilteredTasks = filtered;
    updateStats(filtered);
    document.getElementById('taskCount').textContent = `${filtered.length} tareas`;
    
    if (currentViewMode === 'table') {
        renderTable(filtered);
    } else {
        renderCards(filtered);
    }
}

function updateStats(tasks) {
    const total = tasks.length;
    const pending = tasks.filter(t => t.estado === 'pendiente').length;
    const inProgress = tasks.filter(t => t.estado === 'en_progreso').length;
    const completed = tasks.filter(t => t.estado === 'completada').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = tasks.filter(t => {
        if (!t.fecha_vencimiento || t.estado === 'completada') return false;
        const dueDate = new Date(t.fecha_vencimiento + 'T00:00:00');
        return dueDate < today;
    }).length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statProgress').textContent = inProgress;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statOverdue').textContent = overdue;
}

// ==================== RENDERIZADO - TABLA ====================

function renderTable(tasks) {
    const tbody = document.getElementById('taskTable');
    tbody.innerHTML = '';
    
    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay tareas</td></tr>';
        return;
    }
    
    tasks.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = t.estado === 'completada' ? 'completed' : '';
        tr.style.cursor = 'pointer';
        
        const statusBadge = getStatusBadge(t.estado);
        const priorityIcon = getPriorityIcon(t.prioridad);
        const orphanWarning = !t.project_id ? '<i class="fas fa-exclamation-circle text-warning" title="Sin proyecto asignado"></i>' : '';
        
        tr.innerHTML = `
            <td>${t.titulo} ${orphanWarning}</td>
            <td>${statusBadge}</td>
            <td class="text-center">${priorityIcon}</td>
            <td>${fmtDate(t.fecha_vencimiento)}</td>
            <td class="text-muted small">${t.project_id ? 'Asignado' : 'Huérfano'}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary me-1" onclick="event.stopPropagation(); editTask(${t.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); delTask(${t.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tr.addEventListener('click', () => openDetail(t.id));
        tbody.appendChild(tr);
    });
}

// ==================== RENDERIZADO - CARDS ====================

function renderCards(tasks) {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';
    
    if (tasks.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-4">No hay tareas</div>';
        return;
    }
    
    tasks.forEach(t => {
        const statusBadge = getStatusBadge(t.estado);
        const priorityStars = getPriorityStars(t.prioridad);
        const orphanWarning = !t.project_id ? '<span class="badge bg-warning text-dark"><i class="fas fa-exclamation-circle"></i> Sin proyecto</span>' : '';
        const descPreview = t.descripcion ? t.descripcion.substring(0, 60) + (t.descripcion.length > 60 ? '...' : '') : '<em class="text-muted">Sin descripción</em>';
        
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 col-lg-4 mb-3';
        card.innerHTML = `
            <div class="card h-100 shadow-sm task-card" style="cursor: pointer;">
                <div class="card-body d-flex flex-column">
                    <h6 class="card-title mb-2">${t.titulo}</h6>
                    <p class="card-text text-muted small flex-grow-1 mb-2">${descPreview}</p>
                    
                    <div class="mb-2">
                        ${statusBadge}
                        ${orphanWarning}
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center small mb-3">
                        <div title="Prioridad">${priorityStars}</div>
                        <div class="text-muted">${fmtDate(t.fecha_vencimiento) || '-'}</div>
                    </div>
                    
                    <div class="btn-group btn-group-sm d-none" role="group">
                        <button class="btn btn-outline-secondary" onclick="event.stopPropagation(); editTask(${t.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="event.stopPropagation(); delTask(${t.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const cardDiv = card.querySelector('.card');
        const btnGroup = card.querySelector('.btn-group');
        cardDiv.addEventListener('mouseenter', () => btnGroup.classList.remove('d-none'));
        cardDiv.addEventListener('mouseleave', () => btnGroup.classList.add('d-none'));
        cardDiv.addEventListener('click', () => openDetail(t.id));
        
        container.appendChild(card);
    });
}

// ==================== UTILIDADES DE RENDERIZADO ====================

function getStatusBadge(estado) {
    const statusMap = {
        'pendiente': { color: 'warning', label: 'Pendiente' },
        'en_progreso': { color: 'info', label: 'En progreso' },
        'completada': { color: 'success', label: 'Completada' }
    };
    const status = statusMap[estado] || { color: 'secondary', label: estado };
    return `<span class="badge bg-${status.color}">${status.label}</span>`;
}

function getPriorityIcon(prioridad) {
    const stars = Math.min(prioridad || 0, 5);
    return '⭐'.repeat(stars);
}

function getPriorityStars(prioridad) {
    const stars = Math.min(prioridad || 0, 5);
    return '<span title="Prioridad: ' + prioridad + '">' + '⭐'.repeat(stars) + '</span>';
}

function fmtDate(iso) {
    if (!iso) return '';
    const date = new Date(iso + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ==================== TOGGLE DE VISTAS ====================

document.getElementById('viewTableBtn').addEventListener('click', () => {
    currentViewMode = 'table';
    localStorage.setItem('viewMode', 'table');
    document.getElementById('tableView').classList.remove('d-none');
    document.getElementById('cardsView').classList.add('d-none');
    document.getElementById('viewTableBtn').classList.add('active');
    document.getElementById('viewCardsBtn').classList.remove('active');
    applyFilters();
});

document.getElementById('viewCardsBtn').addEventListener('click', () => {
    currentViewMode = 'cards';
    localStorage.setItem('viewMode', 'cards');
    document.getElementById('tableView').classList.add('d-none');
    document.getElementById('cardsView').classList.remove('d-none');
    document.getElementById('viewTableBtn').classList.remove('active');
    document.getElementById('viewCardsBtn').classList.add('active');
    applyFilters();
});

// ==================== CONTROLES DE FILTROS ====================

document.getElementById('searchInput').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => applyFilters(), 500);
});

document.getElementById('filterStatus').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    applyFilters();
});

document.getElementById('filterPriority').addEventListener('change', (e) => {
    currentFilters.priority = e.target.value;
    applyFilters();
});

document.getElementById('filterDateFrom').addEventListener('change', (e) => {
    currentFilters.dateFrom = e.target.value;
    applyFilters();
});

document.getElementById('filterDateTo').addEventListener('change', (e) => {
    currentFilters.dateTo = e.target.value;
    applyFilters();
});

document.getElementById('searchDropdownBtn').addEventListener('click', () => {
    document.getElementById('searchInput').focus();
});

document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    resetFilters();
});

function resetFilters() {
    currentFilters = {
        search: '',
        status: '',
        priority: '',
        dateFrom: '',
        dateTo: ''
    };
    
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    
    applyFilters();
}

// ==================== EXPORTAR ====================

document.getElementById('exportJsonBtn').addEventListener('click', async () => {
    const tasks = await fetchExportTasks();
    if (!tasks.length) {
        showToast('No hay tareas para exportar', 'warning');
        return;
    }
    const payload = JSON.stringify(tasks, null, 2);
    try {
        await copyToClipboard(payload);
        showToast('JSON copiado al portapapeles', 'success');
    } catch (e) {
        console.error('Error copiando JSON:', e);
        showToast('No se pudo copiar el JSON', 'danger');
    }
});

document.getElementById('exportCsvBtn').addEventListener('click', () => {
    exportCsv();
});

async function fetchExportTasks() {
    const projectIdNum = currentProjectId ? parseInt(currentProjectId, 10) : NaN;
    const query = Number.isFinite(projectIdNum) ? `?project_id=${projectIdNum}` : '';
    try {
        const res = await fetch(`/tasks/export${query}`);
        if (!res.ok) throw new Error('No se pudieron exportar tareas');
        return await res.json();
    } catch (e) {
        console.error('Error exportando tareas:', e);
        showToast('Error al exportar tareas', 'danger');
        return [];
    }
}

async function exportCsv() {
    const tasks = await fetchExportTasks();
    if (!tasks.length) {
        showToast('No hay tareas para exportar', 'warning');
        return;
    }
    const csv = buildCsv(tasks);
    const fileName = `stackdo_tareas_${getTodayStamp()}.csv`;
    downloadFile(csv, fileName, 'text/csv;charset=utf-8');
    showToast('CSV generado', 'success');
}

async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(temp);
    if (!ok) throw new Error('Clipboard no disponible');
}

function buildCsv(tasks) {
    const headers = [
        'id',
        'titulo',
        'descripcion',
        'comentario',
        'estado',
        'prioridad',
        'fecha_vencimiento',
        'fecha_creacion',
        'active',
        'user_id',
        'project_id'
    ];
    const rows = tasks.map(t => headers.map(h => csvEscape(t[h])));
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const text = String(value).replace(/\r?\n/g, ' ').replace(/"/g, '""');
    return /[",]/.test(text) ? `"${text}"` : text;
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getTodayStamp() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// ==================== CAMBIAR PROYECTO ====================

document.getElementById('projectSelect').addEventListener('change', (e) => {
    if (e.target.value) {
        const selectedId = parseInt(e.target.value);
        const project = projectsCache.get(selectedId);
        if (project) {
            setActiveProject(project);
        }
        resetFilters();
        loadTasks();
    }
});

document.getElementById('openProjectPickerBtn').addEventListener('click', () => {
    showProjectSelectionModal(false);
});

document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const currentTheme = document.body.dataset.theme || 'light';
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

document.getElementById('streamlitDashboardBtn').addEventListener('click', () => {
    window.open('http://localhost:8501', '_blank');
});

document.getElementById('adminConsoleBtn').addEventListener('click', () => {
    window.open('/static/admin/index.html', '_blank');
});

function setActiveProject(project) {
    currentProjectId = String(project.id);
    localStorage.setItem('currentProjectId', currentProjectId);
    document.getElementById('currentProjectName').textContent = project.name;
    applyProjectBrand(project);
}

function applyProjectBrand(project) {
    const color = project && project.color ? project.color : DEFAULT_PRIMARY_COLOR;
    document.documentElement.style.setProperty('--primary-color', color);

    const logoEl = document.getElementById('currentProjectLogo');
    if (project && project.logo) {
        logoEl.src = project.logo;
        logoEl.classList.remove('d-none');
    } else {
        logoEl.classList.add('d-none');
        logoEl.removeAttribute('src');
    }
}

function setProjectSelectMode(mode) {
    const projectSelect = document.getElementById('taskProjectSelect');
    const projectInfo = document.getElementById('taskProjectInfo');

    if (mode === 'create') {
        projectSelect.classList.add('d-none');
        projectSelect.required = false;
        projectInfo.classList.remove('d-none');
        const activeName = document.getElementById('currentProjectName').textContent;
        projectInfo.textContent = `Proyecto activo: ${activeName}`;
        projectSelect.value = currentProjectId || '';
        return;
    }

    projectSelect.classList.remove('d-none');
    projectSelect.required = true;
    projectInfo.classList.add('d-none');
}

// ==================== CREAR TAREA ====================

document.getElementById('openCreateBtn').addEventListener('click', async () => {
    const hasUsers = await loadUsers();
    if (!hasUsers) {
        showToast('No hay usuarios disponibles. Crea uno primero.', 'warning');
    }

    if (!currentProjectId) {
        showToast('Selecciona un proyecto activo antes de crear tareas', 'warning');
        return;
    }

    resetTaskForm();
    setProjectSelectMode('create');
    document.getElementById('taskModalLabel').textContent = 'Crear tarea';
    document.getElementById('taskSaveBtn').textContent = 'Guardar';
    document.getElementById('taskProjectSelect').value = currentProjectId;
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
});

// ==================== GUARDAR TAREA ====================

let editId = null;

document.getElementById('taskSaveBtn').addEventListener('click', async () => {
    const title = document.getElementById('title');
    if (!title.value.trim()) {
        showToast('El título es obligatorio', 'warning');
        return;
    }

    const projectId = editId
        ? document.getElementById('taskProjectSelect').value
        : currentProjectId;
    if (!projectId) {
        showToast('Debes seleccionar un proyecto', 'warning');
        return;
    }
    
    const userId = document.getElementById('taskUserSelect').value;
    if (!userId) {
        showToast('Debes seleccionar un usuario', 'warning');
        return;
    }

    const commentInput = document.getElementById('comment').value.trim();
    const payload = {
        titulo: document.getElementById('title').value.trim(),
        descripcion: document.getElementById('desc').value.trim() || null,
        estado: document.getElementById('status').value,
        prioridad: parseInt(document.getElementById('prio').value) || 1,
        fecha_vencimiento: document.getElementById('due').value || null,
        project_id: parseInt(projectId),
        user_id: parseInt(userId),
        comentario: commentInput.length ? commentInput : null
    };
    
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API}/${editId}` : API;
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Error al guardar tarea');
        }
        
        showToast(editId ? 'Tarea actualizada' : 'Tarea creada', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
        modal.hide();
        resetTaskForm();
        loadTasks();
    } catch (e) {
        console.error('Error:', e);
        showToast(e.message, 'danger');
    }
});

// ==================== EDITAR TAREA ====================

async function editTask(id) {
    try {
        await loadUsers();
        const res = await fetch(`${API}/${id}`);
        if (!res.ok) throw new Error('Tarea no encontrada');
        
        const t = await res.json();
        
        document.getElementById('title').value = t.titulo;
        document.getElementById('desc').value = t.descripcion || '';
        document.getElementById('status').value = t.estado;
        document.getElementById('prio').value = t.prioridad || 1;
        document.getElementById('due').value = t.fecha_vencimiento?.slice(0, 10) || '';
        document.getElementById('taskProjectSelect').value = t.project_id || '';
        document.getElementById('taskUserSelect').value = t.user_id || '';
        document.getElementById('comment').value = t.comentario || '';
        
        editId = id;
        setProjectSelectMode('edit');
        document.getElementById('taskModalLabel').textContent = 'Editar tarea';
        document.getElementById('taskSaveBtn').textContent = 'Actualizar';
        
        const modal = new bootstrap.Modal(document.getElementById('taskModal'));
        modal.show();
    } catch (e) {
        showToast('Error al cargar tarea', 'danger');
    }
}

// ==================== ELIMINAR TAREA ====================

async function delTask(id) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
        const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('No se pudo eliminar');
        
        showToast('Tarea eliminada', 'success');
        loadTasks();
    } catch (e) {
        showToast('Error al eliminar tarea', 'danger');
    }
}

// ==================== DETALLE DE TAREA ====================

let currentDetailId = null;

async function openDetail(id) {
    try {
        const res = await fetch(`${API}/${id}`);
        if (!res.ok) throw new Error('Tarea no encontrada');
        
        const t = await res.json();
        currentDetailId = id;
        
        const statusBadge = getStatusBadge(t.estado);
        const priorityStars = getPriorityStars(t.prioridad);
        const orphanWarning = !t.project_id ? '<div class="alert alert-warning small mb-2"><i class="fas fa-exclamation-circle"></i> Esta tarea no tiene proyecto asignado</div>' : '';
        const comentario = t.comentario ? t.comentario : '<em>Sin comentario</em>';
        
        const body = document.getElementById('taskDetailBody');
        body.innerHTML = `
            <h6 class="mb-3">${t.titulo}</h6>
            ${orphanWarning}
            <p class="text-muted">${t.descripcion || '<em>Sin descripción</em>'}</p>
            <div class="mb-3">
                <small class="text-muted">Comentario:</small><br>${comentario}
            </div>
            <div class="row g-2 mb-3">
                <div class="col-6">
                    <small class="text-muted">Estado:</small><br>${statusBadge}
                </div>
                <div class="col-6">
                    <small class="text-muted">Prioridad:</small><br>${priorityStars}
                </div>
            </div>
            <div class="row g-2">
                <div class="col-6">
                    <small class="text-muted">Vence:</small><br><span>${fmtDate(t.fecha_vencimiento) || '-'}</span>
                </div>
                <div class="col-6">
                    <small class="text-muted">ID:</small><br><span class="text-monospace">#${t.id}</span>
                </div>
            </div>
        `;
        
        document.getElementById('taskDetailLabel').textContent = t.titulo;
        const modal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
        modal.show();
    } catch (e) {
        showToast('Error al cargar tarea', 'danger');
    }
}

document.getElementById('detailEditBtn').addEventListener('click', async () => {
    if (!currentDetailId) return;
    await editTask(currentDetailId);
    const detailModal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
    if (detailModal) detailModal.hide();
});

document.getElementById('detailDeleteBtn').addEventListener('click', async () => {
    if (!currentDetailId) return;
    const detailModal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
    if (detailModal) detailModal.hide();
    await delTask(currentDetailId);
});

// ==================== RESET FORMULARIO ====================

function resetTaskForm() {
    document.getElementById('taskForm').reset();
    document.getElementById('prio').value = '1';
    document.getElementById('comment').value = '';
    editId = null;
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type} border-0`;
    toast.role = 'alert';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ==================== CREAR PROYECTO (Modal) ====================

document.getElementById('projectFormBtn').addEventListener('click', async () => {
    const name = document.getElementById('projectName').value.trim();
    const desc = document.getElementById('projectDesc').value.trim() || null;
    const color = document.getElementById('projectColor').value || DEFAULT_PRIMARY_COLOR;

    if (!name) {
        showToast('El nombre del proyecto es obligatorio', 'warning');
        return;
    }

    const payload = {
        name,
        description: desc,
        color
    };

    if (projectLogoChanged) {
        payload.logo = projectLogoDataUrl;
    }

    const method = projectEditId ? 'PUT' : 'POST';
    const url = projectEditId ? `${API_PROJECTS}/${projectEditId}` : API_PROJECTS;

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Error al guardar proyecto');
        }

        const savedProject = await res.json();

        showToast(projectEditId ? 'Proyecto actualizado' : 'Proyecto creado', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('projectModal'));
        modal.hide();

        await loadProjects();

        if (!projectEditId) {
            const selectionModal = bootstrap.Modal.getInstance(document.getElementById('projectSelectionModal'));
            if (selectionModal) {
                setActiveProject(savedProject);
                selectionModal.hide();
            }
        } else if (currentProjectId && parseInt(currentProjectId) === savedProject.id) {
            setActiveProject(savedProject);
        }

        loadTasks();
    } catch (e) {
        console.error('Error guardando proyecto:', e);
        showToast(e.message, 'danger');
    }
});

document.getElementById('createProjectBtn').addEventListener('click', () => {
    openProjectModal('create');
});

document.getElementById('editProjectBtn').addEventListener('click', () => {
    if (!currentProjectId) {
        showToast('Selecciona un proyecto para editar', 'warning');
        return;
    }
    const project = projectsCache.get(parseInt(currentProjectId));
    if (!project) {
        showToast('Proyecto no encontrado', 'warning');
        return;
    }
    openProjectModal('edit', project);
});

// ==================== CREAR USUARIO ====================

document.getElementById('openUserModalBtn').addEventListener('click', () => {
    document.getElementById('userForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
});

document.getElementById('userSaveBtn').addEventListener('click', async () => {
    const idUsuario = document.getElementById('userId').value.trim();
    const nombre = document.getElementById('userName').value.trim();
    const primerApellido = document.getElementById('userLastName').value.trim();
    const segundoApellido = document.getElementById('userSecondLastName').value.trim() || null;
    const sexo = document.getElementById('userGender').value || null;
    const edadValue = document.getElementById('userAge').value;
    const rol = document.getElementById('userRole').value.trim() || null;
    const correo = document.getElementById('userEmail').value.trim() || null;
    const password = document.getElementById('userPassword').value;

    if (!idUsuario || !nombre || !primerApellido) {
        showToast('Completa los campos obligatorios', 'warning');
        return;
    }

    const payload = {
        id_usuario: idUsuario,
        nombre,
        primer_apellido: primerApellido,
        segundo_apellido: segundoApellido,
        sexo,
        edad: edadValue ? parseInt(edadValue) : null,
        correo_electronico: correo,
        rol,
        password: password || null
    };

    try {
        const res = await fetch(API_USERS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            let errorMessage = 'Error al crear usuario';
            try {
                const error = await res.json();
                errorMessage = error.detail || errorMessage;
            } catch (parseError) {
                const text = await res.text();
                if (text) errorMessage = text;
            }
            throw new Error(errorMessage);
        }

        showToast('Usuario creado', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
        modal.hide();
        await loadUsers();
    } catch (e) {
        console.error('Error creando usuario:', e);
        showToast(e.message, 'danger');
    }
});

// Botón para crear proyecto desde modal de selección inicial
document.getElementById('createProjectFromSelection').addEventListener('click', () => {
    openProjectModal('create');
});

document.getElementById('projectLogo').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
        projectLogoDataUrl = null;
        projectLogoChanged = false;
        updateProjectLogoPreview(null);
        return;
    }

    const validTypes = ['image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
        showToast('Solo se permite PNG o SVG', 'warning');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        projectLogoDataUrl = reader.result;
        projectLogoChanged = true;
        updateProjectLogoPreview(projectLogoDataUrl);
    };
    reader.readAsDataURL(file);
});

function openProjectModal(mode, project = null) {
    const title = document.getElementById('projectModalTitle');
    const actionBtn = document.getElementById('projectFormBtn');
    const logoInput = document.getElementById('projectLogo');
    const logoPreview = document.getElementById('projectLogoPreview');

    projectEditId = null;
    projectLogoDataUrl = null;
    projectLogoChanged = false;
    logoInput.value = '';

    if (mode === 'edit' && project) {
        projectEditId = project.id;
        document.getElementById('projectName').value = project.name || '';
        document.getElementById('projectDesc').value = project.description || '';
        document.getElementById('projectColor').value = project.color || DEFAULT_PRIMARY_COLOR;
        projectLogoDataUrl = project.logo || null;
        updateProjectLogoPreview(projectLogoDataUrl);
        title.innerHTML = '<i class="fas fa-project-diagram"></i> Editar Proyecto';
        actionBtn.textContent = 'Actualizar';
    } else {
        document.getElementById('projectName').value = '';
        document.getElementById('projectDesc').value = '';
        document.getElementById('projectColor').value = DEFAULT_PRIMARY_COLOR;
        updateProjectLogoPreview(null);
        title.innerHTML = '<i class="fas fa-project-diagram"></i> Crear Proyecto';
        actionBtn.textContent = 'Crear';
    }

    if (!projectLogoDataUrl) {
        logoPreview.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    modal.show();
}

function updateProjectLogoPreview(dataUrl) {
    const preview = document.getElementById('projectLogoPreview');
    if (!dataUrl) {
        preview.classList.add('d-none');
        preview.innerHTML = '';
        return;
    }
    preview.classList.remove('d-none');
    preview.innerHTML = `<img src="${dataUrl}" alt="Logo del proyecto">`;
}

// ==================== INICIALIZAR APP ====================

document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('load', () => {
    if (currentViewMode === 'cards') {
        document.getElementById('tableView').classList.add('d-none');
        document.getElementById('cardsView').classList.remove('d-none');
        document.getElementById('viewCardsBtn').classList.add('active');
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildCsv,
        copyToClipboard,
        csvEscape,
        getTodayStamp,
        loadProjects,
        updateStats
    };
}

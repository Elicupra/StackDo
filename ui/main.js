// ui/main.js
const API = "/tasks";
const API_PROJECTS = "/projects";
const API_USERS = "/users";

// Estado global
let currentViewMode = localStorage.getItem('viewMode') || 'table';
let currentProjectId = localStorage.getItem('currentProjectId') || null;
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

// ==================== INICIALIZACIÓN ====================

async function initApp() {
    await loadUsers();
    const hasCurrentProject = await loadProjects();
    if (!hasCurrentProject) {
        showProjectSelectionModal(true);
        return;
    }
    loadTasks();
}

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
    if (e.target.classList.contains('project-option')) {
        currentProjectId = e.target.dataset.projectId;
        localStorage.setItem('currentProjectId', currentProjectId);
        const projectName = e.target.textContent.trim();
        document.getElementById('currentProjectName').textContent = projectName;
        document.getElementById('projectSelect').value = currentProjectId;
        const modal = bootstrap.Modal.getInstance(document.getElementById('projectSelectionModal'));
        modal.hide();
        resetFilters();
        loadTasks();
    }
});

// ==================== CARGAR PROYECTOS ====================

async function loadProjects() {
    try {
        const res = await fetch(API_PROJECTS);
        if (!res.ok) throw new Error('No se pudieron cargar proyectos');
        const projects = await res.json();
        
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
                btn.textContent = p.name;
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
                document.getElementById('currentProjectName').textContent = currentProject.name;
                document.getElementById('projectSelect').value = currentProjectId;
                hasCurrentProject = true;
            } else {
                // Proyecto guardado ya no existe, limpiar
                currentProjectId = null;
                localStorage.removeItem('currentProjectId');
            }
        }
        if (!hasCurrentProject) {
            document.getElementById('currentProjectName').textContent = 'Sin proyecto';
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
        const res = await fetch(API_USERS);
        if (!res.ok) throw new Error('No se pudieron cargar usuarios');
        const users = await res.json();

        const userSelect = document.getElementById('taskUserSelect');
        userSelect.innerHTML = '<option value="">Seleccionar usuario...</option>';
        if (!users.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No hay usuarios disponibles';
            opt.disabled = true;
            userSelect.appendChild(opt);
            return false;
        }

        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            const label = `${u.nombre} ${u.primer_apellido}`.trim();
            opt.textContent = u.id_usuario ? `${label} (${u.id_usuario})` : label;
            userSelect.appendChild(opt);
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
    const query = currentProjectId ? `?project_id=${currentProjectId}` : '';
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
        currentProjectId = e.target.value;
        localStorage.setItem('currentProjectId', currentProjectId);
        
        const selectedOption = e.target.options[e.target.selectedIndex];
        document.getElementById('currentProjectName').textContent = selectedOption.textContent;
        
        resetFilters();
        loadTasks();
    }
});

document.getElementById('openProjectPickerBtn').addEventListener('click', () => {
    showProjectSelectionModal(false);
});

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
    
    if (!name) {
        showToast('El nombre del proyecto es obligatorio', 'warning');
        return;
    }
    
    try {
        const res = await fetch(API_PROJECTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Error al crear proyecto');
        }
        
        const newProject = await res.json();
        
        showToast('Proyecto creado', 'success');
        document.getElementById('projectName').value = '';
        document.getElementById('projectDesc').value = '';
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('projectModal'));
        modal.hide();
        
        await loadProjects();
        
        // Si venimos del modal de selección inicial, auto-seleccionar el nuevo proyecto
        const selectionModal = bootstrap.Modal.getInstance(document.getElementById('projectSelectionModal'));
        if (selectionModal) {
            currentProjectId = newProject.id;
            localStorage.setItem('currentProjectId', currentProjectId);
            document.getElementById('currentProjectName').textContent = newProject.name;
            selectionModal.hide();
            loadTasks();
        }
    } catch (e) {
        console.error('Error creando usuario:', e);
        showToast(e.message, 'danger');
    }
});

document.getElementById('createProjectBtn').addEventListener('click', () => {
    document.getElementById('projectName').value = '';
    document.getElementById('projectDesc').value = '';
    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    modal.show();
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
        rol
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
        showToast(e.message, 'danger');
    }
});

// Botón para crear proyecto desde modal de selección inicial
document.getElementById('createProjectFromSelection').addEventListener('click', () => {
    document.getElementById('projectName').value = '';
    document.getElementById('projectDesc').value = '';
    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    modal.show();
});

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

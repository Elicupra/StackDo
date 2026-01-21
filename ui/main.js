// ui/main.js
const API = "/tasks";          // endpoint base
const API_PROJECTS = "/projects";

// ------------------------------------------------------------------
// 1️⃣ Cargar tareas al arrancar y después cada vez que se modifique
async function loadTasks() {
    const sel = document.getElementById("projectSelect");
    const projectId = sel.value || null;
    const url = projectId ? `${API}?project_id=${projectId}` : API;
    const res = await fetch(url);
    if (!res.ok) return alert("Error al cargar tareas");
    const tasks = await res.json();

    const tbody = document.getElementById("taskTable");
    tbody.innerHTML = "";            // limpia

    for (const t of tasks) {
        const tr = document.createElement("tr");
        tr.className = t.estado === "completada" ? "completed" : "";
        tr.innerHTML = `
            <td>${t.titulo}</td>
            <td>${t.estado}</td>
            <td class="text-end">${t.prioridad ?? ""}</td>
            <td>${fmtDate(t.fecha_vencimiento)}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary me-1" data-id="${t.id}" onclick="event.stopPropagation(); editTask(${t.id})">✏️</button>
                <button class="btn btn-sm btn-outline-danger" data-id="${t.id}" onclick="event.stopPropagation(); delTask(${t.id})">🗑️</button>
            </td>`;
        // click en fila abre detalle
        tr.addEventListener('click', () => openDetail(t.id));
        tbody.appendChild(tr);
    }
}

// ------------------------------------------------------------------
// 2️⃣ Formularios – Añadir / Editar
let editId = null;      // <null> → nuevo, id → edición
// Ahora manejamos el guardado vía botón en el modal
document.getElementById("taskSaveBtn").addEventListener("click", async () => {
    const form = document.getElementById("taskForm");
    // simple validación
    const title = document.getElementById("title");
    if (!title.value) return alert("El título es obligatorio");

    const payload = {
        titulo:   document.getElementById("title").value,
        descripcion: document.getElementById("desc").value || null,
        estado:  document.getElementById("status").value,
        prioridad: Number(document.getElementById("prio").value) || null,
        fecha_vencimiento: document.getElementById("due").value || null,
        project_id: document.getElementById("taskProjectSelect").value || null
    };

    const method = editId ? "PUT" : "POST";
    const url    = editId ? `${API}/${editId}` : API;

    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!res.ok) return alert("Error al guardar la tarea");

    // cerrar modal y recargar
    const modal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
    modal.hide();
    resetForm();
    loadTasks();
});

// ------------------------------------------------------------------
// 3️⃣ Eliminar (lógica “soft delete”)
async function delTask(id) {
    const ok = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (!ok.ok) return alert("No se pudo eliminar");
    loadTasks();
}

// ------------------------------------------------------------------
// 4️⃣ Editar – rellenar el formulario con los datos
async function editTask(id) {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) return alert("Tarea no encontrada");

    const t = await res.json();
    document.getElementById("title").value = t.titulo;
    document.getElementById("desc").value  = t.descripcion ?? "";
    document.getElementById("status").value = t.estado;
    document.getElementById("prio").value   = t.prioridad ?? "";
    document.getElementById("due").value    = t.fecha_vencimiento?.slice(0,10) || "";
    document.getElementById("taskProjectSelect").value = t.project_id ?? "";

    editId = id;                       // <‑‑ modo edición
    document.getElementById('taskModalLabel').textContent = 'Editar tarea';
    document.getElementById('taskSaveBtn').textContent = 'Actualizar';
    // abrir modal
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
}

// ------------------------------------------------------------------
// 5️⃣ Resetear el formulario y volver al “modo nuevo”
function resetForm() {
    document.getElementById("taskForm").reset();
    editId = null;
    document.getElementById('taskModalLabel').textContent = 'Crear tarea';
    document.getElementById('taskSaveBtn').textContent = 'Guardar';
}

// ------------------------------------------------------------------
// 6️⃣ Formato de fecha (ISO → DD/MM/YYYY)
function fmtDate(iso) {
    return iso ? new Date(iso).toLocaleDateString() : "";
}

// ------------------------------------------------------------------
// 7️⃣ Inicializar
async function loadProjects() {
    const res = await fetch(API_PROJECTS);
    if (!res.ok) return console.warn('No se pudieron cargar proyectos');
    const projects = await res.json();

    const sel = document.getElementById('projectSelect');
    const sel2 = document.getElementById('taskProjectSelect');
    sel.innerHTML = '<option value="">Todos los proyectos</option>';
    sel2.innerHTML = '<option value="">Sin proyecto</option>';
    for (const p of projects) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);

        const opt2 = opt.cloneNode(true);
        sel2.appendChild(opt2);
    }
}

document.getElementById('createProjectBtn').addEventListener('click', async () => {
    const name = prompt('Nombre del proyecto:');
    if (!name) return;
    const res = await fetch(API_PROJECTS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!res.ok) return alert('No se pudo crear el proyecto');
    await loadProjects();
});

document.getElementById('projectSelect').addEventListener('change', () => loadTasks());

document.getElementById('openCreateBtn').addEventListener('click', () => {
    resetForm();
    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
});

// detalle: abrir modal con info y acciones
let currentDetailId = null;
async function openDetail(id) {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) return alert('No se pudo cargar la tarea');
    const t = await res.json();
    currentDetailId = id;
    const body = document.getElementById('taskDetailBody');
    body.innerHTML = `
        <p><strong>${t.titulo}</strong></p>
        <p>${t.descripcion ?? ''}</p>
        <p>Estado: ${t.estado}</p>
        <p>Prioridad: ${t.prioridad ?? ''}</p>
        <p>Vence: ${fmtDate(t.fecha_vencimiento)}</p>
    `;
    document.getElementById('taskDetailLabel').textContent = t.titulo;
    const modal = new bootstrap.Modal(document.getElementById('taskDetailModal'));
    modal.show();
}

document.getElementById('detailDeleteBtn').addEventListener('click', async () => {
    if (!currentDetailId) return;
    if (!confirm('Eliminar tarea?')) return;
    const res = await fetch(`${API}/${currentDetailId}`, { method: 'DELETE' });
    if (!res.ok) return alert('No se pudo eliminar');
    const modal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
    modal.hide();
    loadTasks();
});

document.getElementById('detailCompleteBtn').addEventListener('click', async () => {
    if (!currentDetailId) return;
    const res = await fetch(`${API}/${currentDetailId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'completada' })
    });
    if (!res.ok) return alert('No se pudo completar la tarea');
    const modal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
    modal.hide();
    loadTasks();
});

document.getElementById('detailEditBtn').addEventListener('click', async () => {
    if (!currentDetailId) return;
    // abrir modal de edición
    await editTask(currentDetailId);
    const detailModal = bootstrap.Modal.getInstance(document.getElementById('taskDetailModal'));
    if (detailModal) detailModal.hide();
});

// Inicializar datos
await loadProjects();
loadTasks();

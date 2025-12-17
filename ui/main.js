// ui/main.js
const API = "/tasks";          // endpoint base

// ------------------------------------------------------------------
// 1️⃣ Cargar tareas al arrancar y después cada vez que se modifique
async function loadTasks() {
    const res = await fetch(API);
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
                <button class="btn btn-sm btn-outline-secondary me-1"
                    onclick="editTask(${t.id})">✏️</button>
                <button class="btn btn-sm btn-outline-danger"
                    onclick="delTask(${t.id})">🗑️</button>
            </td>`;
        tbody.appendChild(tr);
    }
}

// ------------------------------------------------------------------
// 2️⃣ Formularios – Añadir / Editar
let editId = null;      // <null> → nuevo, id → edición

document.getElementById("taskForm").addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
        titulo:   document.getElementById("title").value,
        descripcion: document.getElementById("desc").value || null,
        estado:  document.getElementById("status").value,
        prioridad: Number(document.getElementById("prio").value) || null,
        fecha_vencimiento: document.getElementById("due").value || null
    };

    // Si editamos, usamos PUT; si es nuevo, POST
    const method = editId ? "PUT" : "POST";
    const url    = editId ? `${API}/${editId}` : API;

    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!res.ok) return alert("Error al guardar la tarea");

    // Reiniciar formulario y recargar lista
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

    editId = id;                       // <‑‑ modo edición
    document.querySelector("#taskForm button")
        .textContent = "Actualizar";
}

// ------------------------------------------------------------------
// 5️⃣ Resetear el formulario y volver al “modo nuevo”
function resetForm() {
    document.getElementById("taskForm").reset();
    editId = null;
    document.querySelector("#taskForm button")
        .textContent = "Añadir";
}

// ------------------------------------------------------------------
// 6️⃣ Formato de fecha (ISO → DD/MM/YYYY)
function fmtDate(iso) {
    return iso ? new Date(iso).toLocaleDateString() : "";
}

// ------------------------------------------------------------------
// 7️⃣ Inicializar
loadTasks();

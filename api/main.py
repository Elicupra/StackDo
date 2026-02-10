# api/main.py
from fastapi import FastAPI, HTTPException, status
from .crud import (
    create_task,
    get_task,
    list_active_tasks,
    soft_delete,
    update_task,
    create_project,
    list_projects,
    get_project,
    list_users,
    create_user,
)
from .models import TaskCreate, TaskUpdate, TaskOut, ProjectCreate, ProjectOut, UserOut, UserCreate
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from typing import Optional


app = FastAPI(
    title="StackDo - API de Gestión de Tareas",
    description="Una API simple que gestiona tareas con SQLite.",
    version="1.0.0",
)

from .db import init_db

@app.on_event("startup")
def on_startup():
    init_db()

# Montamos la carpeta `ui` en /static y añadimos una ruta / que redirige allí.
app.mount("/static", StaticFiles(directory="ui", html=True), name="static")


@app.get("/")
def root():
    """Redirige a `/static/` para servir `index.html` explícitamente."""
    return RedirectResponse(url="/static/")

# --------------------------------------------------------------------
@app.post("/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def api_create_task(task: TaskCreate) -> TaskOut:
    new_id = create_task(task)
    return get_task(new_id)  # devuelvo el objeto completo

# --------------------------------------------------------------------
@app.get("/tasks/{id}", response_model=TaskOut)
def api_get_task(id: int):
    task = get_task(id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    return task

# --------------------------------------------------------------------
@app.get("/tasks", response_model=list[TaskOut])
def api_list_tasks(project_id: Optional[int] = None):
    return list_active_tasks(project_id=project_id)


# ---------------- Projects endpoints ----------------
@app.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def api_create_project(p: ProjectCreate) -> ProjectOut:
    new_id = create_project(p)
    return get_project(new_id)


@app.get("/projects", response_model=list[ProjectOut])
def api_list_projects():
    return list_projects()


@app.get("/projects/{id}", response_model=ProjectOut)
def api_get_project(id: int):
    p = get_project(id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    return p


# ---------------- Users endpoints ----------------
@app.get("/users", response_model=list[UserOut])
def api_list_users():
    return list_users()


@app.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def api_create_user(payload: UserCreate):
    new_id = create_user(payload)
    users = list_users()
    return next(u for u in users if u.id == new_id)

# --------------------------------------------------------------------
@app.put("/tasks/{id}", response_model=TaskOut)
def api_update_task(id: int, payload: TaskUpdate):
    ok = update_task(id, payload)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            "Tarea no encontrada o sin cambios")
    return get_task(id)

# --------------------------------------------------------------------
@app.delete("/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_task(id: int):
    if not soft_delete(id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
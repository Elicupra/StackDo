# api/main.py
from fastapi import FastAPI, HTTPException, status, Depends, Request
from .crud import (
    create_task,
    get_task,
    list_active_tasks,
    soft_delete,
    update_task,
    create_project,
    list_projects,
    list_projects_by_ids,
    get_project,
    update_project,
    list_users,
    create_user,
    assign_user_to_project,
    get_user_by_identifier,
    update_user_admin,
    reset_user_password,
    delete_user_admin,
    delete_project,
    list_logs,
    log_event,
)
from .models import (
    TaskCreate,
    TaskUpdate,
    TaskOut,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    UserOut,
    UserCreate,
    LoginRequest,
    TokenOut,
    UserProjectAssign,
    AdminUserUpdate,
    AdminResetPassword,
    AppLogOut,
)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from typing import Optional
import os
import json
import csv
import zipfile
from datetime import datetime

from .auth import (
    AUTH_ENABLED,
    ROLE_ADMIN,
    ROLE_SUPERADMIN,
    ROLE_ITADMIN,
    can_export,
    can_access_admin_console,
    create_access_token,
    ensure_project_access,
    get_allowed_project_ids,
    get_current_user,
    get_optional_user,
    normalize_role,
    require_roles,
    verify_password,
)
from .db import User

BACKUP_DIR = os.getenv("BACKUP_DIR", "backups")


def _to_csv(items: list) -> str:
    if not items:
        return ""
    rows = [i.model_dump() for i in items]
    headers = list(rows[0].keys())
    output = []
    output.append(",".join(headers))
    for row in rows:
        output.append(",".join([_csv_escape(row.get(h)) for h in headers]))
    return "\n".join(output)


def _csv_escape(value: object) -> str:
    if value is None:
        return ""
    text = str(value).replace("\n", " ").replace("\r", " ").replace("\"", "\"\"")
    return f'"{text}"' if "," in text or '"' in text else text


app = FastAPI(
    title="StackDo - API de Gestión de Tareas",
    description="Una API simple que gestiona tareas con SQLite.",
    version="1.0.0",
)


@app.middleware("http")
async def log_server_errors(request: Request, call_next):
    try:
        response = await call_next(request)
        if response.status_code >= 500:
            log_event(
                "error",
                f"HTTP {response.status_code}",
                context=f"{request.method} {request.url.path}",
            )
        return response
    except Exception as exc:
        log_event(
            "error",
            str(exc),
            context=f"{request.method} {request.url.path}",
        )
        raise

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


# ---------------- Auth endpoints ----------------
@app.post("/auth/login", response_model=TokenOut)
def api_login(payload: LoginRequest):
    if not AUTH_ENABLED:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Autenticacion deshabilitada")
    user = get_user_by_identifier(payload.identifier)
    if not user or not user.password_hash or not user.password_salt:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales invalidas")
    if not verify_password(payload.password, user.password_salt, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales invalidas")
    token = create_access_token(user)
    return TokenOut(access_token=token)


@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def api_register(payload: UserCreate):
    if not payload.password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password requerido")
    data = payload.model_copy()
    data.rol = "Usuario"
    new_id = create_user(data)
    users = list_users()
    return next(u for u in users if u.id == new_id)


@app.get("/auth/status")
def api_auth_status():
    return {"enabled": AUTH_ENABLED}


@app.get("/me", response_model=UserOut)
def api_me(current_user: User = Depends(get_current_user)):
    return UserOut(**current_user.model_dump())

# --------------------------------------------------------------------
@app.post("/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def api_create_task(task: TaskCreate, current_user: User = Depends(get_current_user)) -> TaskOut:
    if task.project_id is not None:
        ensure_project_access(current_user, task.project_id)
    new_id = create_task(task)
    return get_task(new_id)  # devuelvo el objeto completo

# --------------------------------------------------------------------
@app.get("/tasks/export", response_model=list[TaskOut])
def api_export_tasks(project_id: Optional[int] = None, current_user: User = Depends(get_current_user)):
    if not can_export(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado para exportar")
    if project_id is not None:
        ensure_project_access(current_user, project_id)
    allowed_ids = get_allowed_project_ids(current_user)
    return list_active_tasks(project_id=project_id, project_ids=allowed_ids)

# --------------------------------------------------------------------
@app.get("/tasks/{id}", response_model=TaskOut)
def api_get_task(id: int, current_user: User = Depends(get_current_user)):
    task = get_task(id)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    if task.project_id is not None:
        ensure_project_access(current_user, task.project_id)
    return task

# --------------------------------------------------------------------
@app.get("/tasks", response_model=list[TaskOut])
def api_list_tasks(project_id: Optional[int] = None, current_user: User = Depends(get_current_user)):
    if project_id is not None:
        ensure_project_access(current_user, project_id)
    allowed_ids = get_allowed_project_ids(current_user)
    return list_active_tasks(project_id=project_id, project_ids=allowed_ids)


# ---------------- Projects endpoints ----------------
@app.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def api_create_project(p: ProjectCreate, current_user: User = Depends(get_current_user)) -> ProjectOut:
    require_roles(current_user, {ROLE_SUPERADMIN, ROLE_ADMIN})
    new_id = create_project(p)
    if normalize_role(current_user.rol) == ROLE_ADMIN:
        assign_user_to_project(current_user.id, new_id)
    return get_project(new_id)


@app.get("/projects", response_model=list[ProjectOut])
def api_list_projects(current_user: User = Depends(get_current_user)):
    allowed_ids = get_allowed_project_ids(current_user)
    if allowed_ids is None:
        return list_projects()
    return list_projects_by_ids(allowed_ids)


@app.get("/projects/{id}", response_model=ProjectOut)
def api_get_project(id: int, current_user: User = Depends(get_current_user)):
    p = get_project(id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")
    ensure_project_access(current_user, id)
    return p


@app.put("/projects/{id}", response_model=ProjectOut)
def api_update_project(id: int, payload: ProjectUpdate, current_user: User = Depends(get_current_user)):
    require_roles(current_user, {ROLE_SUPERADMIN, ROLE_ADMIN})
    ensure_project_access(current_user, id)
    ok = update_project(id, payload)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado o sin cambios")
    return get_project(id)


@app.post("/projects/{id}/users", status_code=status.HTTP_204_NO_CONTENT)
def api_assign_user_to_project(
    id: int,
    payload: UserProjectAssign,
    current_user: User = Depends(get_current_user),
):
    require_roles(current_user, {ROLE_SUPERADMIN, ROLE_ADMIN})
    if normalize_role(current_user.rol) == ROLE_ADMIN:
        ensure_project_access(current_user, id)
    assign_user_to_project(payload.user_id, id)


# ---------------- Users endpoints ----------------
@app.get("/users", response_model=list[UserOut])
def api_list_users(current_user: Optional[User] = Depends(get_optional_user)):
    if AUTH_ENABLED:
        if not current_user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token requerido")
        require_roles(current_user, {ROLE_SUPERADMIN, ROLE_ADMIN})
    return list_users()


@app.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def api_create_user(payload: UserCreate, current_user: Optional[User] = Depends(get_optional_user)):
    if AUTH_ENABLED:
        if not current_user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token requerido")
        require_roles(current_user, {ROLE_SUPERADMIN, ROLE_ADMIN})
    new_id = create_user(payload)
    users = list_users()
    return next(u for u in users if u.id == new_id)


# ---------------- Admin Console endpoints ----------------
@app.get("/admin/users", response_model=list[UserOut])
def api_admin_list_users(current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return list_users()


@app.put("/admin/users/{id}", response_model=UserOut)
def api_admin_update_user(
    id: int,
    payload: AdminUserUpdate,
    current_user: User = Depends(get_current_user),
):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    ok = update_user_admin(id, payload)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    users = list_users()
    return next(u for u in users if u.id == id)


@app.post("/admin/users/{id}/reset-password")
def api_admin_reset_password(
    id: int,
    payload: AdminResetPassword,
    current_user: User = Depends(get_current_user),
):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    if current_user.id == id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se puede reiniciar tu propia password aqui")
    ok = reset_user_password(id, payload.password)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    return {"ok": True}


@app.delete("/admin/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_admin_delete_user(id: int, current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    if current_user.id == id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se puede borrar tu propio usuario")
    if not delete_user_admin(id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")


@app.get("/admin/projects", response_model=list[ProjectOut])
def api_admin_list_projects(current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return list_projects()


@app.delete("/admin/projects/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_admin_delete_project(id: int, current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    if not delete_project(id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proyecto no encontrado")


@app.get("/admin/logs", response_model=list[AppLogOut])
def api_admin_logs(limit: int = 200, current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    return list_logs(limit=limit)


@app.get("/admin/backups")
def api_admin_list_backups(current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    files = []
    for name in sorted(os.listdir(BACKUP_DIR), reverse=True):
        path = os.path.join(BACKUP_DIR, name)
        if os.path.isfile(path):
            files.append({"name": name, "size": os.path.getsize(path)})
    return {"files": files}


@app.post("/admin/backups")
def api_admin_create_backup(kind: str = "json", current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    if kind not in {"json", "csv"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tipo de backup invalido")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    users = list_users()
    projects = list_projects()
    tasks = list_active_tasks(project_id=None, project_ids=None)

    if kind == "json":
        filename = f"stackdo_backup_{stamp}.json"
        path = os.path.join(BACKUP_DIR, filename)
        payload = {
            "users": [u.model_dump() for u in users],
            "projects": [p.model_dump() for p in projects],
            "tasks": [t.model_dump() for t in tasks],
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=True, indent=2)
        return {"file": filename}

    filename = f"stackdo_backup_{stamp}.zip"
    path = os.path.join(BACKUP_DIR, filename)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr("users.csv", _to_csv(users))
        zipf.writestr("projects.csv", _to_csv(projects))
        zipf.writestr("tasks.csv", _to_csv(tasks))
    return {"file": filename}


@app.get("/admin/backups/{name}")
def api_admin_download_backup(name: str, current_user: User = Depends(get_current_user)):
    if not can_access_admin_console(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acceso denegado")
    path = os.path.join(BACKUP_DIR, name)
    if not os.path.isfile(path):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archivo no encontrado")
    return FileResponse(path, filename=name)

# --------------------------------------------------------------------
@app.put("/tasks/{id}", response_model=TaskOut)
def api_update_task(id: int, payload: TaskUpdate, current_user: User = Depends(get_current_user)):
    current = get_task(id)
    if not current:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    if current.project_id is not None:
        ensure_project_access(current_user, current.project_id)
    if payload.project_id is not None:
        ensure_project_access(current_user, payload.project_id)
    ok = update_task(id, payload)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            "Tarea no encontrada o sin cambios")
    return get_task(id)

# --------------------------------------------------------------------
@app.delete("/tasks/{id}", status_code=status.HTTP_204_NO_CONTENT)
def api_delete_task(id: int, current_user: User = Depends(get_current_user)):
    current = get_task(id)
    if not current:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
    if current.project_id is not None:
        ensure_project_access(current_user, current.project_id)
    if not soft_delete(id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarea no encontrada")
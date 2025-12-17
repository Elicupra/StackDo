# api/crud.py
from .db import get_conn
from .models import TaskCreate, TaskUpdate, TaskOut
from typing import List
import sqlite3

def _execute(query: str, params: tuple = (), fetchone=False) -> sqlite3.Cursor:
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(query, params)
        if fetchone:
            return cur.fetchone()
        else:
            return cur.fetchall()

# ── CRUD ---------------------------

def create_task(t: TaskCreate) -> int:
    """Devuelve el id de la tarea creada."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO tareas (titulo,descripcion,estado,prioridad,fecha_vencimiento,Active)
            VALUES (?, ?, ?, ?, ?, 1);
        """, (
            t.titulo,
            t.descripcion,
            t.estado,
            t.prioridad,
            t.fecha_vencimiento
        ))
        conn.commit()
        return cur.lastrowid

def get_task(id: int) -> TaskOut | None:
    row = _execute(
        "SELECT * FROM tareas WHERE id = ? AND Active = 1",
        (id,), fetchone=True)
    if not row:
        return None
    return TaskOut(**dict(row))

def list_active_tasks() -> List[TaskOut]:
    rows = _execute("SELECT * FROM tareas WHERE Active = 1")
    return [TaskOut(**dict(r)) for r in rows]

def soft_delete(id: int) -> bool:
    """Marca la fila como “inactiva”. Devuelve True si se afectó 1 registro."""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE tareas SET Active = 0 WHERE id = ? AND Active = 1",
            (id,),
        )
        conn.commit()
        return cur.rowcount == 1


def update_task(id: int, t: TaskUpdate) -> bool:
    """Actualiza los campos que el cliente envíe."""
    # Construimos la sentencia dinámica
    fields = []
    values: List[str] = []

    for name, value in t.dict(exclude_unset=True).items():
        fields.append(f"{name} = ?")
        values.append(value)

    if not fields:          # nada a actualizar → no hacemos nada
        return False

    values.append(id)
    query = f"UPDATE tareas SET {', '.join(fields)} WHERE id = ? AND Active = 1"
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(query, tuple(values))
        conn.commit()
        return cur.rowcount == 1
# api/db.py
import sqlite3
from contextlib import contextmanager
from typing import Generator

DB_FILE = "todo.db"

@contextmanager
def get_conn() -> Generator[sqlite3.Connection, None, None]:
    """Context manager que devuelve una conexión y la cierra al salir del bloque `with`.
    Se puede usar como: ``with get_conn() as conn:``
    """
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row   # permite acceder por nombre
    try:
        yield conn
    finally:
        conn.close()

def init_db() -> None:
    """Crea la tabla si no existe."""
    with get_conn() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tareas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                descripcion TEXT,
                estado TEXT NOT NULL,
                prioridad INTEGER NOT NULL,
                fecha_vencimiento DATE,
                Active INTEGER DEFAULT 1
            );
        """)
        conn.commit()

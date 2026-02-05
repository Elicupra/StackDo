import os
import dotenv
from contextlib import contextmanager
from typing import Generator, Optional
from datetime import date
from sqlmodel import SQLModel, Field, create_engine, Session, select

# CARGA DE VARIABLES DE ENTORNO
file_env = os.path.join(os.path.dirname(__file__), os.path.pardir, '.env')
dotenv.load_dotenv(file_env)

# VARIABLES PARA BASES DE DATOS POSTGRES
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_SCHEMA = os.getenv("DB_SCHEMA") # Start with "public" if None usually, or handle None.

# URL DE LA BASE DE DATOS POSTGRES
# Se recomienda usar el driver psycopg2 (postgresql+psycopg2://...)
DB_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Crear el engine
# echo=True para ver las queries en consola (útil en dev)
engine = create_engine(DB_URL, echo=False)

# ----------------- MODELOS SQLMODEL -----------------

class Project(SQLModel, table=True):
    __tablename__ = "projects"
    # Si se usa un esquema específico en Postgres:
    if DB_SCHEMA:
        __table_args__ = {"schema": DB_SCHEMA}
        
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, max_length=200)
    description: Optional[str] = None

class Tarea(SQLModel, table=True):
    __tablename__ = "tareas"
    if DB_SCHEMA:
        __table_args__ = {"schema": DB_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    titulo: str = Field(max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    estado: str = Field(max_length=50)
    prioridad: int
    fecha_vencimiento: Optional[date] = None
    active: bool = Field(default=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id")


# ----------------- CONEXIÓN -----------------

@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Context manager para obtener una sesión de DB."""
    with Session(engine) as session:
        yield session

def init_db():
    """Crea las tablas en la base de datos PostgreSQL."""
    # Si usas esquemas, a veces necesitas crearlos manualmente o asegurar que existan
    # SQLModel.metadata.create_all creará las tablas.
    SQLModel.metadata.create_all(engine)
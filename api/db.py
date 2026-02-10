import os
import dotenv
from contextlib import contextmanager
from typing import Generator, Optional
from datetime import date
from urllib.parse import quote_plus
from sqlmodel import SQLModel, Field, create_engine, Session, select
from sqlalchemy import text

# CARGA DE VARIABLES DE ENTORNO
file_env = os.path.join(os.path.dirname(__file__), os.path.pardir, '.env')
dotenv.load_dotenv(file_env)

# VARIABLES PARA BASES DE DATOS POSTGRES
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_SCHEMA = os.getenv("DB_SCHEMA") or os.getenv("SCHEMA")

# URL DE LA BASE DE DATOS POSTGRES
# quote_plus para escapar caracteres especiales en usuario y contraseña
DB_URL = f"postgresql+psycopg2://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

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

class User(SQLModel, table=True):
    __tablename__ = "usuarios"
    if DB_SCHEMA:
        __table_args__ = {"schema": DB_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    id_usuario: str = Field(max_length=255)
    nombre: str = Field(max_length=255)
    primer_apellido: str = Field(max_length=255)
    segundo_apellido: Optional[str] = Field(default=None, max_length=255)
    sexo: Optional[str] = Field(default=None, max_length=1)
    edad: Optional[int] = None
    correo_electronico: Optional[str] = Field(default=None, max_length=255)
    rol: Optional[str] = Field(default=None, max_length=255)

class Tarea(SQLModel, table=True):
    __tablename__ = "tareas"
    if DB_SCHEMA:
        __table_args__ = {"schema": DB_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    titulo: str = Field(max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    estado: str = Field(max_length=50)
    prioridad: int
    fecha_creacion: date = Field(default_factory=date.today)
    fecha_vencimiento: Optional[date] = None
    active: bool = Field(default=True)
    user_id: Optional[int] = Field(
        default=None,
        foreign_key=f"{DB_SCHEMA}.usuarios.id" if DB_SCHEMA else "usuarios.id",
    )
    project_id: Optional[int] = Field(
        default=None,
        foreign_key=f"{DB_SCHEMA}.projects.id" if DB_SCHEMA else "projects.id",
    )


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
    with engine.begin() as conn:
        if DB_SCHEMA:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {DB_SCHEMA}"))

    SQLModel.metadata.create_all(engine)

    # Migración mínima: asegurar que active sea boolean para evitar casts inválidos
    table_name = f"{DB_SCHEMA}.tareas" if DB_SCHEMA else "tareas"
    with engine.begin() as conn:
        # Quitar default antes del cambio de tipo y restaurarlo despues
        conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN active DROP DEFAULT"))
        conn.execute(
            text(
                f"ALTER TABLE {table_name} "
                "ALTER COLUMN active TYPE boolean USING (active::boolean)"
            )
        )
        conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN active SET DEFAULT true"))

    # Asegurar columna user_id para asignacion de tareas
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS user_id int4"))
import os
import dotenv
import hashlib
import secrets
from contextlib import contextmanager
from typing import Generator, Optional
from datetime import date, datetime
from urllib.parse import quote_plus
from sqlmodel import SQLModel, Field, create_engine, Session, select
from sqlalchemy import text, UniqueConstraint

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
ADMIN_SEED_ENABLED = os.getenv("ADMIN_SEED_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
ADMIN_ID_USUARIO = os.getenv("ADMIN_ID_USUARIO", "admin")
ADMIN_NOMBRE = os.getenv("ADMIN_NOMBRE", "Administrador")
ADMIN_APELLIDO = os.getenv("ADMIN_APELLIDO", "General")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@stackdo.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

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
    color: Optional[str] = Field(default=None, max_length=20)
    logo: Optional[str] = None

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
    password_hash: Optional[str] = Field(default=None, max_length=255)
    password_salt: Optional[str] = Field(default=None, max_length=255)

class UserProject(SQLModel, table=True):
    __tablename__ = "user_projects"
    if DB_SCHEMA:
        __table_args__ = (
            UniqueConstraint("user_id", "project_id", name="uq_user_project"),
            {"schema": DB_SCHEMA},
        )
    else:
        __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        foreign_key=f"{DB_SCHEMA}.usuarios.id" if DB_SCHEMA else "usuarios.id",
    )
    project_id: int = Field(
        foreign_key=f"{DB_SCHEMA}.projects.id" if DB_SCHEMA else "projects.id",
    )

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
    comentario: Optional[str] = Field(default=None, max_length=1000)
    active: bool = Field(default=True)
    user_id: Optional[int] = Field(
        default=None,
        foreign_key=f"{DB_SCHEMA}.usuarios.id" if DB_SCHEMA else "usuarios.id",
    )
    project_id: Optional[int] = Field(
        default=None,
        foreign_key=f"{DB_SCHEMA}.projects.id" if DB_SCHEMA else "projects.id",
    )


class AppLog(SQLModel, table=True):
    __tablename__ = "app_logs"
    if DB_SCHEMA:
        __table_args__ = {"schema": DB_SCHEMA}

    id: Optional[int] = Field(default=None, primary_key=True)
    level: str = Field(max_length=20)
    message: str = Field(max_length=1000)
    context: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)


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

    # Migracion minima: agregar color y logo a projects
    projects_table = f"{DB_SCHEMA}.projects" if DB_SCHEMA else "projects"
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {projects_table} ADD COLUMN IF NOT EXISTS color varchar(20)"))
        conn.execute(text(f"ALTER TABLE {projects_table} ADD COLUMN IF NOT EXISTS logo text"))

    # Migración mínima: asegurar que active sea boolean para evitar casts inválidos
    table_name = f"{DB_SCHEMA}.tareas" if DB_SCHEMA else "tareas"
    users_table = f"{DB_SCHEMA}.usuarios" if DB_SCHEMA else "usuarios"
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

    # Asegurar columna comentario para notas de tarea
    with engine.begin() as conn:
        conn.execute(
            text(
                f"ALTER TABLE {table_name} "
                "ADD COLUMN IF NOT EXISTS comentario varchar(1000)"
            )
        )

    # Asegurar columnas de password para usuarios
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {users_table} ADD COLUMN IF NOT EXISTS password_hash varchar(255)"))
        conn.execute(text(f"ALTER TABLE {users_table} ADD COLUMN IF NOT EXISTS password_salt varchar(255)"))

    if not ADMIN_SEED_ENABLED:
        return

    # Seed de SuperAdmin si no existe (no modifica usuarios existentes)
    with Session(engine) as session:
        statement = select(User).where(
            (User.id_usuario == ADMIN_ID_USUARIO) | (User.correo_electronico == ADMIN_EMAIL)
        )
        existing = session.exec(statement).first()
        if existing:
            return

        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", ADMIN_PASSWORD.encode("utf-8"), salt, 100_000)
        admin_user = User(
            id_usuario=ADMIN_ID_USUARIO,
            nombre=ADMIN_NOMBRE,
            primer_apellido=ADMIN_APELLIDO,
            segundo_apellido=None,
            sexo=None,
            edad=None,
            correo_electronico=ADMIN_EMAIL,
            rol="SuperAdmin",
            password_hash=digest.hex(),
            password_salt=salt.hex(),
        )
        session.add(admin_user)
        session.commit()
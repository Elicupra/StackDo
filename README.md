# StackDo - Gestor de Tareas

Sistema MVP de gestion de tareas por proyectos, construido con FastAPI (backend) y Bootstrap 5 (frontend).

## Caracteristicas

- Gestion de proyectos: crear, seleccionar y cambiar proyecto activo.
- Gestion de tareas: crear, editar, eliminar (soft-delete).
- Asignacion de usuario obligatoria en tareas.
- Comentarios en tareas (hasta 1000 caracteres).
- Vistas tabla y cards (responsive 1/2/3 columnas).
- Filtros en menu desplegable (busqueda, estado, prioridad, fechas).
- Exportacion: JSON (portapapeles) y CSV (descarga desde navegador) usando endpoint.
- Persistencia: proyecto activo y vista guardados en localStorage.
- Notificaciones toast.

---

## Instalacion

### 1) Clonar el repositorio

```bash
git clone <url-repo>
cd python
```

### 2) Configurar variables de entorno

Copiar .env.example a .env y rellenar con tus datos de PostgreSQL:

```bash
cp .env.example .env
```

Ejemplo de .env:
```ini
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stackdo
DB_SCHEMA=stackdo
```

### 3) Instalar dependencias

```bash
# Crear entorno virtual
python -m venv .venv

# Activar entorno
# Windows:
.venv\Scripts\Activate.ps1
# Linux/Mac:
source .venv/bin/activate

# Instalar dependencias backend
pip install fastapi uvicorn sqlmodel python-dotenv psycopg2-binary python-jose
# Instalar dependencias para Dashboard Streamlit (opcional)
pip install streamlit plotly pandas
# Dependencias frontend (tests)
npm install
```

### 4) Inicializar base de datos

```bash
python -c "from api.db import init_db; init_db()"
```

Si la tabla tareas ya existe, aplica esta migracion para comentario:

```sql
ALTER TABLE stackdo.tareas
ADD COLUMN IF NOT EXISTS comentario varchar(1000) NULL;
```

### 5) Ejecutar servidor

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Abre: http://localhost:8000

### 6) Dashboard de Estadísticas con Streamlit (Opcional)

Para visualizar estadísticas interactivas por proyecto con gráficos:

```bash
streamlit run streamlit_dashboard.py
```

Abre: http://localhost:8501

**Características del Dashboard:**
- ✅ Selector de proyectos
- ✅ Métricas resumen (total, completadas, en progreso, pendientes)
- ✅ Gráfico de barras: Tareas por estado (Pendiente, En progreso, Completada)
- ✅ Gráfico de pastel: Distribución por prioridad (⭐ a ⭐⭐⭐⭐⭐)
- ✅ Gráfico de línea: Timeline de creación (últimos 7 días)
- ✅ Tabla de tareas con filtros y detalles
- ✅ Interfaz responsive y temas claros

---

## Autorizacion (roles)

La app usa el campo `rol` de `usuarios` para controlar permisos:

- **SuperAdmin**: control total de proyectos y tareas, exportacion y dashboard.
- **ITAdmin**: consola backend para usuarios, proyectos, logs y backups.
- **AdminProyecto**: crea/edita su proyecto, gestiona tareas, exporta y ve dashboard solo de su proyecto.
- **CoordinadorProyecto**: gestiona tareas y dashboard solo de su proyecto, sin crear proyectos.
- **Usuario**: gestiona tareas solo en su proyecto, sin exportacion ni dashboard.

Asignacion de proyectos por usuario: tabla `user_projects` (user_id, project_id).

### Activar autenticacion JWT

Por defecto, la autenticacion esta deshabilitada y la app usa el header `X-User-Id`.
Para activar JWT:

1. En `.env` establece `AUTH_ENABLED=true` y configura `JWT_SECRET`.
2. Crea usuarios con password (campo `password` en POST `/users`).
3. Usa POST `/auth/login` con `identifier` (email o id_usuario) y `password` para obtener el token.
4. Envia `Authorization: Bearer <token>` en cada request.

### Usuario administrador de prueba

Si `ADMIN_SEED_ENABLED=true`, en el arranque se crea un usuario **SuperAdmin** solo si no existe:

- `ADMIN_ID_USUARIO=admin`
- `ADMIN_EMAIL=admin@stackdo.local`
- `ADMIN_PASSWORD=admin123`

### Consola IT (backend)

UI independiente en: `/static/admin/index.html`

Funciones:
- Gestion de usuarios (editar, reset password, borrar)
- Gestion de proyectos (borrar)
- Logs de errores
- Backups (json/csv)

---

## Estructura del proyecto

```
python/
├── api/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, rutas
│   ├── models.py            # Esquemas Pydantic
│   ├── db.py                # Conexion BD, modelos SQLModel
│   ├── crud.py              # Operaciones BD
│   └── __pycache__/
├── ui/
│   ├── index.html           # Interfaz principal
│   ├── main.js              # Logica frontend
│   ├── styles.css           # Estilos
├── scripts/
│   └── init_db.py           # Script inicial (opcional)
├── tests/                   # Tests backend
├── ui/__tests__/            # Tests frontend
├── .env.example             # Plantilla variables entorno
├── .env                     # Archivo real (NO subir a git)
├── README.md                # Esta documentacion
└── __pycache__/
```

---

## API Endpoints

### Tareas

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /tasks | Listar tareas activas |
| GET | /tasks?project_id=1 | Tareas de un proyecto |
| GET | /tasks/{id} | Detalle de tarea |
| POST | /tasks | Crear tarea |
| PUT | /tasks/{id} | Actualizar tarea |
| DELETE | /tasks/{id} | Eliminar (soft-delete) |
| GET | /tasks/export | Export JSON (filtro project_id opcional) |

### Autenticacion

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | /auth/login | Login (JWT) |
| GET | /me | Usuario actual |
| POST | /auth/register | Registro inicial |

Payload POST/PUT:
```json
{
  "titulo": "Mi tarea",
  "descripcion": "Descripcion opcional",
  "comentario": "Comentario opcional",
  "estado": "pendiente",
  "prioridad": 3,
  "fecha_vencimiento": "2026-12-31",
  "project_id": 1,
  "user_id": 10
}
```

Reglas:
- Crear tarea usa el proyecto activo del frontend y requiere usuario.
- Solo en editar puedes cambiar el proyecto.
- Comentario no puede ser texto vacio (solo espacios).

### Proyectos

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /projects | Listar proyectos |
| GET | /projects/{id} | Detalle proyecto |
| POST | /projects | Crear proyecto |
| POST | /projects/{id}/users | Asignar usuario a proyecto |

### Usuarios

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /users | Listar usuarios |
| POST | /users | Crear usuario |

### Admin IT

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /admin/users | Listar usuarios |
| PUT | /admin/users/{id} | Editar usuario |
| POST | /admin/users/{id}/reset-password | Resetear password |
| DELETE | /admin/users/{id} | Borrar usuario |
| GET | /admin/projects | Listar proyectos |
| DELETE | /admin/projects/{id} | Borrar proyecto |
| GET | /admin/logs | Logs de aplicacion |
| GET | /admin/backups | Listar backups |
| POST | /admin/backups | Crear backup (json/csv) |
| GET | /admin/backups/{name} | Descargar backup |

Payload POST:
```json
{
  "id_usuario": "user-001",
  "nombre": "Ana",
  "primer_apellido": "Lopez",
  "segundo_apellido": null,
  "sexo": "M",
  "edad": 30,
  "correo_electronico": "ana@example.com",
  "rol": "admin"
}
```

---

## Base de datos (resumen)

### Tabla projects
```sql
id              INT PRIMARY KEY
name            VARCHAR(200) UNIQUE
description     TEXT NULL
```

### Tabla usuarios
```sql
id                  INT PRIMARY KEY
id_usuario          VARCHAR(255) UNIQUE
nombre              VARCHAR(255)
primer_apellido     VARCHAR(255)
segundo_apellido    VARCHAR(255) NULL
sexo                CHAR(1) NULL
edad                INT NULL
correo_electronico  VARCHAR(255) NULL
rol                 VARCHAR(255) NULL
password_hash       VARCHAR(255) NULL
password_salt       VARCHAR(255) NULL
```

### Tabla user_projects
```sql
id          INT PRIMARY KEY
user_id     INT FK -> usuarios.id
project_id  INT FK -> projects.id
```

### Tabla tareas
```sql
id                  INT PRIMARY KEY
titulo              VARCHAR(200)
descripcion         VARCHAR(255) NULL
comentario          VARCHAR(1000) NULL
estado              VARCHAR(50)              -- pendiente, en_progreso, completada
prioridad           INT                      -- 1-5
fecha_creacion      DATE NOT NULL
fecha_vencimiento   DATE NULL
active              BOOLEAN DEFAULT TRUE     -- soft-delete
user_id             INT FK -> usuarios.id
project_id          INT FK -> projects.id
```

---

## Flujo de uso

1. Iniciar app: se muestra modal de seleccion de proyecto.
2. Seleccionar proyecto: se guarda en localStorage.
3. Crear usuario (si no hay): boton Nuevo Usuario.
4. Crear tarea: se asigna al proyecto activo y requiere usuario.
5. Editar tarea: permite cambiar proyecto y actualizar comentario.
6. Exportar: JSON al portapapeles o CSV con descarga.

---

## Tests

Frontend:
```bash
npm run test:ui
```

Backend:
```bash
pytest
```

---

## Debugging

Logs del servidor:
```bash
uvicorn api.main:app --reload --log-level debug
```

Limpiar localStorage:
```javascript
localStorage.removeItem('currentProjectId');
localStorage.removeItem('viewMode');
```

---

---

## Estado de caracteristicas

### Completadas ✅
- Comentarios en tareas
- Asignación de tareas a usuarios
- Temas (dark mode / light mode)
- Exportar tareas a CSV (descarga)
- Estadísticas y gráficos (conteos básicos)
- Gestion de proyectos con logo y color personalizado
- Consola IT (usuarios, proyectos, logs, backups)

### Pendientes ⏳
- Autenticación y autorización
- Exportar tareas a PDF
- Drag & drop para cambiar estado
- Notificaciones por email
- Ordenamiento personalizable
- Recurrencia de tareas
- Vista calendario

---

## Mejoras y pendientes (Consola IT)

- Filtros avanzados de logs (nivel, rango de fechas, texto libre).
- Retencion y borrado programado de logs.
- Historial de auditoria para cambios de usuarios/proyectos.
- Backups incrementales y cifrados.
- UI para asignacion usuario-proyecto.
- Export de logs en CSV/JSON.

---

## Roadmap futuro

Las siguientes funcionalidades estan en la lista de desarrollo:

1. **Autenticación**: Login/registro con roles (admin, usuario).
2. **PDF Export**: Exportar tareas a PDF con estilos.
3. **Drag & Drop**: Cambiar estado de tarea arrastrando entre columnas Kanban.
4. **Email Notifications**: Notificar cambios de tarea a usuarios asignados.
5. **Ordenamiento**: Permitir ordenar por cualquier columna (titulo, fecha, prioridad).
6. **Recurrencia**: Crear tareas recurrentes (diaria, semanal, mensual).


## Licencia

MIT

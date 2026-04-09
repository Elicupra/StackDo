# StackDo - Gestor de Tareas

Sistema fullstack de gestion de tareas por proyectos, construido con:
- **Backend**: FastAPI (async, SQLModel, JWT auth)
- **Frontend**: Vanilla JS + Bootstrap 5 + Modular Architecture
- **Architecture**: Refactorized with StateManager, ModalManager, FormValidator, and Design Tokens

## ✨ Caracteristicas

### Gestion de Tareas y Proyectos
- ✅ Gestion de proyectos: crear, seleccionar y cambiar proyecto activo
- ✅ Gestion de tareas: crear, editar, eliminar (soft-delete)
- ✅ Asignacion de usuario obligatoria en tareas
- ✅ Comentarios en tareas (hasta 1000 caracteres)
- ✅ Vistas tabla y cards (responsive 1/2/3 columnas)
- ✅ Filtros en menu desplegable (busqueda, estado, prioridad, fechas)

### Exportacion y Persistencia
- ✅ Exportacion: JSON (portapapeles) y CSV (descarga desde navegador)
- ✅ Persistencia: proyecto activo y vista guardados en localStorage
- ✅ Notificaciones toast para feedback del usuario

### Frontend Refactorizado (Fase 1 & 2)
- ✅ **StateManager**: Gestión centralizada de estado global con watchers y eventos
- ✅ **ModalManager**: Control de modales Bootstrap 5 sin backdrops huérfanos
- ✅ **FormValidator**: Validación en tiempo real con feedback visual Bootstrap-native
- ✅ **Design Tokens**: 150+ tokens CSS para colores, tipografía, espacios, dark mode
- ✅ **Test Suite**: 50+ tests automatizados pre-refactorización
- ✅ **Modular Architecture**: Código organizado en módulos core reutilizables

### Autenticacion y Autorizacion
- ✅ JWT Authentication (configurable)
- ✅ Roles: SuperAdmin, ITAdmin, AdminProyecto, CoordinadorProyecto, Usuario
- ✅ Consola IT para administradores (usuarios, proyectos, logs, backups)

### Consola IT
- ✅ Gestion de usuarios (editar, reset password, borrar)
- ✅ Gestion de proyectos (borrar)
- ✅ Logs de aplicacion
- ✅ Backups (JSON/CSV)

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
├── .agents/                                 # SKILLS locales del proyecto
│   ├── config.json                         # Configuracion de SKILLS
│   └── skills/
│       ├── systematic-debugging/           # Metodologia de debugging
│       │   ├── SKILL.md
│       │   ├── root-cause-tracing.md
│       │   ├── condition-based-waiting.md
│       │   └── ...otros archivos
│       └── python-fastapi-development/     # Workflow FastAPI
│           └── SKILL.md
│
├── api/                                     # Backend FastAPI
│   ├── __init__.py
│   ├── main.py                             # FastAPI app, rutas
│   ├── models.py                           # Esquemas Pydantic
│   ├── db.py                               # Conexion BD, modelos SQLModel
│   ├── crud.py                             # Operaciones BD
│   ├── auth.py                             # Autenticacion JWT
│   └── __pycache__/
│
├── ui/                                      # Frontend
│   ├── index.html                          # Interfaz principal
│   ├── main.js                             # Logica frontend (refactorizado)
│   ├── styles.css                          # Estilos personalizados
│   │
│   ├── admin/                              # Consola IT
│   │   ├── index.html
│   │   ├── admin.js
│   │   └── admin.css
│   │
│   ├── css/
│   │   └── design-tokens.css               # 150+ tokens de diseño (NEW)
│   │
│   ├── js/core/                            # Modulos core reutilizables (NEW)
│   │   ├── stateManager.js                 # Gestor de estado global
│   │   ├── modalManager.js                 # Gestor de modales Bootstrap
│   │   └── formValidator.js                # Validador de formularios
│   │
│   └── tests/                              # Suite de tests (NEW)
│       ├── index.html
│       └── pre-refactor-tests.js           # 50+ tests automatizados
│
├── scripts/
│   └── init_db.py                          # Script inicial (opcional)
│
├── .agents/                                 # Configuracion de SKILLS (NEW)
│   ├── config.json
│   └── skills/
├── .env.example                            # Plantilla variables entorno
├── .env                                    # Archivo real (NO subir a git)
├── .gitignore
├── README.md                               # Esta documentacion (ACTUALIZADO)
├── SKILLS_MIGRATION.md                     # Documentacion migracion SKILLS (NEW)
├── TEST_RESULTS.md                         # Resultados de tests (NEW)
├── requirements.txt                        # Dependencias Python
├── validate-structure.js                   # Validador de estructura (NEW)
├── run-tests.js                            # Ejecutor de tests (NEW)
└── __pycache__/
```

---

## 🏗️ Arquitectura Frontend Refactorizada

### Fase 1: Foundation (StateManager, ModalManager, Design Tokens)

**StateManager** (`ui/js/core/stateManager.js`)
- Gestión centralizada de estado global con watchers y eventos
- Auto-persistencia en localStorage
- Debugging: `window.STATE.inspect()`

```javascript
// Uso
window.STATE.setState('currentProjectId', 5);
window.STATE.watch('currentProjectId', (oldVal, newVal) => {
  console.log(`Project changed: ${oldVal} → ${newVal}`);
});
```

**ModalManager** (`ui/js/core/modalManager.js`)
- Instancia única por modal (evita duplicados)
- Stack automático de modales
- Limpieza automática de backdrops huérfanos
- Modo obligatorio configurable

```javascript
// Uso
window.MODALS.show('taskModal');
window.MODALS.hide('taskModal');
window.MODALS.setMandatory('projectModal', true);
```

**Design Tokens** (`ui/css/design-tokens.css`)
- 150+ CSS custom properties
- Paleta de colores, tipografía, espacios
- Dark mode WCAG 2.1 AA compliant
- Overrides Bootstrap 5 con tokens

```css
/* Uso */
color: var(--color-primary);
background: var(--color-surface-secondary);
font-size: var(--font-size-lg);
```

### Fase 2: Form Validation (FormValidator)

**FormValidator** (`ui/js/core/formValidator.js`)
- Validación en tiempo real con Bootstrap 5 native classes
- Reglas: required, minLength, maxLength, pattern, custom, match
- Feedback visual inmediato
- Focus en primer error

```javascript
// Uso
const validator = new FormValidator('taskForm', {
  title: { required: true, minLength: 3, maxLength: 200 },
  desc: { maxLength: 255 }
});
validator.watchAllFields('blur');
if (validator.validate()) {
  // Enviar formulario
}
```

### Fase 3-5 (Próximas)
- Components & Services (TaskComponent, ProjectService)
- Admin Console Refactoring
- Final Testing & Optimization

---

## 📊 Test Suite

**Pre-Refactor Tests** (`ui/tests/pre-refactor-tests.js`)
- 50+ tests automatizados
- Valida: inicialización, DOM, funciones críticas, modales, formularios
- Ejecutar: http://localhost:8000/ui/tests/index.html

```bash
# Validar estructura
node validate-structure.js

# Ejecutar tests
npm run test:ui
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

**Core Functionality**
- ✅ Comentarios en tareas
- ✅ Asignación de tareas a usuarios
- ✅ Temas (dark mode / light mode)
- ✅ Exportar tareas a CSV (descarga) y JSON (portapapeles)
- ✅ Estadísticas y gráficos (conteos básicos)
- ✅ Gestion de proyectos con logo y color personalizado
- ✅ Consola IT (usuarios, proyectos, logs, backups)
- ✅ Autenticación JWT (configurable)
- ✅ Autorizacion por roles

**Architecture Refactoring (Fases 1 & 2)**
- ✅ **Fase 1**: StateManager, ModalManager, Design Tokens (150+ tokens)
- ✅ **Fase 1**: Test Suite (50+ tests automatizados)
- ✅ **Fase 2**: FormValidator con validación en tiempo real
- ✅ **Fase 2**: Integración FormValidator en taskForm y userForm
- ✅ **Fase 2**: SKILLS migrados a proyecto local

### En Progreso 🔄

**Fases 3-5 de Refactorización**
- 🔄 **Fase 3**: Components & Services (TaskComponent, ProjectService, UserService)
- 🔄 **Fase 4**: Refactorizar Admin Console
- 🔄 **Fase 5**: Testing final y optimización

### Pendientes ⏳

**Funcionalidades Futuras**
- ⏳ PDF Export: Exportar tareas a PDF con estilos
- ⏳ Drag & Drop: Cambiar estado de tarea en vista Kanban
- ⏳ Notificaciones por email
- ⏳ Ordenamiento personalizable por columna
- ⏳ Recurrencia de tareas
- ⏳ Vista calendario

---

## 🚀 Roadmap de Refactorización

```
Phase 1 ✅ (COMPLETADA)
├── StateManager (estado centralizado)
├── ModalManager (control de modales)
├── Design Tokens (sistema de tokens CSS)
└── Test Suite (50+ tests)

Phase 2 ✅ (COMPLETADA)
├── FormValidator (validación en tiempo real)
├── Integración en taskForm y userForm
└── SKILLS migrados al proyecto

Phase 3 (EN PLAN)
├── Components.js (TaskComponent, ProjectComponent, UserComponent)
├── Services (TaskService, ProjectService, UserService, AuthService)
└── Tests para nuevos módulos

Phase 4 (EN PLAN)
├── Refactorizar admin.js con misma arquitectura
└── Aplicar SKILLS e integraciones

Phase 5 (EN PLAN)
├── Testing final exhaustivo
├── Optimización de performance
└── Documentación completa
```

---

## 📚 SKILLS del Proyecto

El proyecto incluye SKILLS especializados en `.agents/skills/`:

### 1. **systematic-debugging** 🐛
- **Descripción**: Metodología estructurada para debugging y resolución de problemas
- **Core Principle**: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"
- **Ubicación**: `.agents/skills/systematic-debugging/`
- **Uso**: Cuando encuentres bugs, test failures o comportamiento inesperado

### 2. **python-fastapi-development** 🚀
- **Descripción**: Workflow para desarrollo de FastAPI con async, SQLAlchemy, Pydantic
- **Ubicación**: `.agents/skills/python-fastapi-development/`
- **Uso**: Cuando implementes nuevas APIs o servicios backend

Ver `.agents/skills/README.md` para documentación completa.

---

## 🛠️ Mejoras y Pendientes

### Consola IT (Backend)
- ⏳ Filtros avanzados de logs (nivel, rango de fechas, texto libre)
- ⏳ Retencion y borrado programado de logs
- ⏳ Historial de auditoria para cambios de usuarios/proyectos
- ⏳ Backups incrementales y cifrados
- ⏳ UI para asignacion usuario-proyecto
- ⏳ Export de logs en CSV/JSON

### Frontend Refactorización
- ⏳ Migrar variables globales a StateManager completamente
- ⏳ Aplicar FormValidator a todos los formularios (projectForm, etc.)
- ⏳ Crear Components para reutilizar (TaskRow, TaskCard, StatusBadge)
- ⏳ Centralizar servicios (TaskService, ProjectService, UserService)
- ⏳ Implementar request/response interceptors
- ⏳ Cache en cliente con invalidación inteligente

---

## 🔗 Documentación Adicional

- **SKILLS_MIGRATION.md**: Documentación sobre migracion de SKILLS a proyecto
- **TEST_RESULTS.md**: Resultados y guía de tests
- **.agents/skills/README.md**: Documentación de SKILLS disponibles
- **.agents/config.json**: Configuración de SKILLS del proyecto

---

## 📖 Guia de Desarrollo

### Invocar un SKILL
```
skill load systematic-debugging
skill load python-fastapi-development
```

### Usar StateManager
```javascript
// Leer estado
const projectId = window.STATE.getState('currentProjectId');

// Escribir estado
window.STATE.setState('currentProjectId', 5);

// Escuchar cambios
window.STATE.watch('currentProjectId', (old, newVal) => {
  console.log(`Cambio: ${old} → ${newVal}`);
});

// Emitir eventos
window.STATE.emit('projectChanged', { projectId: 5 });
window.STATE.on('projectChanged', (data) => { ... });
```

### Usar FormValidator
```javascript
const validator = new FormValidator('myForm', {
  email: { pattern: 'email' },
  name: { required: true, minLength: 3 }
});

validator.watchAllFields('blur');

if (validator.validate()) {
  const values = validator.getValues();
  // Enviar
}
```

### Usar ModalManager
```javascript
// Mostrar modal
window.MODALS.show('taskModal');

// Ocultarlo
window.MODALS.hide('taskModal');

// Modo obligatorio (no se puede cerrar)
window.MODALS.setMandatory('projectModal', true);

// Limpiar backdrops huérfanos
window.MODALS.cleanupBackdrops();
```

---

## 🚀 Roadmap Futuro

Las siguientes funcionalidades estan planificadas:

1. **Fase 3**: Components & Services para reutilizar código
2. **Fase 4**: Refactorizar Admin Console con misma arquitectura
3. **Fase 5**: Testing final y optimización
4. **PDF Export**: Exportar tareas a PDF con estilos
5. **Drag & Drop**: Cambiar estado en vista Kanban
6. **Email Notifications**: Notificar cambios a usuarios
7. **Ordenamiento**: Permitir ordenar por cualquier columna
8. **Recurrencia**: Crear tareas recurrentes (diaria, semanal, mensual)
9. **Vista Calendario**: Visualización en modo calendario


## Licencia

MIT

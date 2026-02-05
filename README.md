# 📋 StackDo - Gestor de Tareas

Sistema MVP de gestión de tareas por proyectos, construido con **FastAPI** (backend) y **Bootstrap 5** (frontend).

## ✨ Características

- ✅ **Gestión de Proyectos**: Crear y seleccionar proyectos
- ✅ **Gestión de Tareas**: Crear, editar, eliminar tareas por proyecto
- ✅ **Dos Vistas**: Tabla y Cards (responsive 1/2/3 columnas)
- ✅ **Filtros Avanzados**: Búsqueda, estado, prioridad, rango de fechas
- ✅ **Persistencia**: Proyecto seleccionado y vista guardados en localStorage
- ✅ **Modal de Selección**: Al iniciar, elige proyecto (no intrusivo)
- ✅ **Avisos Huérfanos**: Indica tareas sin proyecto asignado
- ✅ **Notificaciones Toast**: Confirmaciones y mensajes de error
- ✅ **Estética Mejorada**: Diseño limpio con Bootstrap + Font Awesome

---

## 🚀 Instalación

### 1. **Clonar el repositorio**

```bash
git clone <url-repo>
cd python
```

### 2. **Configurar variables de entorno**

Copiar `.env.example` a `.env` y rellenar con tus datos de PostgreSQL:

```bash
cp .env.example .env
```

**Contenido de `.env`:**
```ini
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stackdo
DB_SCHEMA=public
```

### 3. **Instalar dependencias**

```bash
# Crear entorno virtual
python -m venv .venv

# Activar entorno
# Windows:
.venv\Scripts\Activate.ps1
# Linux/Mac:
source .venv/bin/activate

# Instalar dependencias
pip install fastapi uvicorn sqlmodel python-dotenv psycopg2-binary
```

### 4. **Crear base de datos e inicializar tablas**

```bash
# Python script para crear BD y tablas
python -c "from api.db import init_db; init_db()"
```

### 5. **Ejecutar servidor**

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Abre en tu navegador: **http://localhost:8000**

---

## 📋 Estructura del Proyecto

```
python/
├── api/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, rutas
│   ├── models.py            # Esquemas Pydantic
│   ├── db.py                # Conexión BD, modelos SQLModel
│   ├── crud.py              # Operaciones BD (Create, Read, Update, Delete)
│   └── __pycache__/
├── ui/
│   ├── index.html           # Interfaz principal
│   ├── main.js              # Lógica frontend
│   ├── styles.css           # Estilos personalizados
├── scripts/
│   └── init_db.py           # Script inicial (opcional)
├── .env.example             # Plantilla variables entorno
├── .env                     # Archivo real (NO subir a git)
├── README.md                # Esta documentación
└── __pycache__/
```

---

## 🌐 API Endpoints

### **Tareas**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/tasks` | Listar todas las tareas |
| `GET` | `/tasks?project_id=1` | Tareas de un proyecto |
| `GET` | `/tasks/{id}` | Obtener detalle de tarea |
| `POST` | `/tasks` | Crear tarea |
| `PUT` | `/tasks/{id}` | Actualizar tarea |
| `DELETE` | `/tasks/{id}` | Eliminar (soft-delete, marca como inactiva) |

**Payload POST/PUT:**
```json
{
  "titulo": "Mi tarea",
  "descripcion": "Descripción opcional",
  "estado": "pendiente",          // pendiente | en_progreso | completada
  "prioridad": 3,                 // 1-5
  "fecha_vencimiento": "2026-12-31",
  "project_id": 1
}
```

### **Proyectos**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/projects` | Listar todos los proyectos |
| `GET` | `/projects/{id}` | Obtener detalle proyecto |
| `POST` | `/projects` | Crear proyecto |

**Payload POST:**
```json
{
  "name": "Mi Proyecto",
  "description": "Descripción opcional"
}
```

---

## 🎨 Colores Estándar (Bootstrap)

| Estado | Color | Badge |
|--------|-------|-------|
| Pendiente | Amarillo | `bg-warning` |
| En Progreso | Azul | `bg-info` |
| Completada | Verde | `bg-success` |
| Sin Proyecto | Gris/Amarillo | `bg-warning` |

---

## 💾 Estructura de Base de Datos

### **Tabla `projects`**
```sql
id              INT PRIMARY KEY
name            VARCHAR(200) UNIQUE
description     TEXT NULL
```

### **Tabla `tareas`**
```sql
id                  INT PRIMARY KEY
titulo              VARCHAR(200)
descripcion         VARCHAR(255) NULL
estado              VARCHAR(50)              -- pendiente, en_progreso, completada
prioridad           INT                      -- 1-5
fecha_vencimiento   DATE NULL
active              BOOLEAN DEFAULT TRUE     -- soft-delete
project_id          INT FK → projects.id     -- NULL para tareas huérfanas
```

---

## 🔄 Flujo de Uso

1. **Iniciar app**: Se muestra modal de selección de proyecto (modal no intrusivo)
2. **Seleccionar proyecto**: Elige uno de la lista y se carga en localStorage
3. **Ver tareas**: Se cargan todas las tareas del proyecto seleccionado
4. **Filtrar**: Usa barra de filtros (búsqueda, estado, prioridad, fechas)
5. **Cambiar vista**: Toggle tabla ↔ cards según preferencia
6. **Crear tarea**: Botón "Nueva Tarea", rellena formulario modal, requiere proyecto
7. **Editar tarea**: Click en fila/card → abre detalle → botón "Editar"
8. **Eliminar tarea**: Soft-delete (se marca como inactiva, no aparece en lista)
9. **Cambiar proyecto**: Selector en navbar → actualiza vista y localStorage

---

## 📌 Notas Importantes

### **Tareas Huérfanas**
- Si una tarea NO tiene `project_id`, aparece un icono ⚠️ gris y texto "Huérfano"
- Las tareas huérfanas se pueden ver pero **no se pueden crear** (formulario requiere proyecto)
- Se pueden editar si cargan una tarea existente y asignarle proyecto

### **Soft-Delete**
- Eliminar una tarea pone `active = false`
- No aparece en lista pero se queda en BD (recuperable en futuro)
- Frontend filtra por `active = true` automáticamente

### **Persistencia**
- **`currentProjectId`**: Guardado en `localStorage` → permanece entre sesiones
- **`viewMode`**: Tabla o Cards guardado en `localStorage`
- **Filtros**: Reset al cambiar proyecto

### **Validaciones**
- Título: obligatorio, max 200 caracteres
- Descripción: opcional, max 255 caracteres
- Prioridad: 1-5 (default 1)
- Proyecto: **obligatorio** al crear/editar tarea
- Estado: solo valores válidos (`pendiente`, `en_progreso`, `completada`)

---

## 🔒 Seguridad (MVP)

**Nota**: Esta es una versión MVP **sin autenticación**. Para producción:
- [ ] Agregar JWT tokens
- [ ] Autorización por usuario/rol
- [ ] Rate limiting
- [ ] CORS configurado
- [ ] Validación de permisos

---

## 🐛 Debugging

### **Revisar logs del servidor**
```bash
# El servidor muestra logs en consola si hay errores
uvicorn api.main:app --reload --log-level debug
```

### **Revisar BD directamente**
```bash
# Conectar a PostgreSQL
psql -U postgres -d stackdo

# Ver tablas
\dt

# Ver contenido
SELECT * FROM projects;
SELECT * FROM tareas;
```

### **Limpiar localStorage** (JavaScript console)
```javascript
localStorage.removeItem('currentProjectId');
localStorage.removeItem('viewMode');
```

---

## 📊 Estadísticas del Proyecto

- **Backend**: FastAPI + SQLModel + PostgreSQL
- **Frontend**: Vanilla JavaScript + Bootstrap 5 + Font Awesome
- **Vistas**: 2 (tabla + cards responsive)
- **Filtros**: 5 (búsqueda, estado, prioridad, fecha inicio, fecha fin)
- **Modales**: 4 (selección proyecto, crear tarea, crear proyecto, detalle tarea)
- **Líneas de código**: ~1500 (frontend + backend)

---

## 🚀 Próximas Mejoras (Futuro)

- [ ] Autenticación y autorización
- [ ] Exportar tareas a PDF/CSV
- [ ] Comentarios en tareas
- [ ] Asignación de tareas a usuarios
- [ ] Drag & drop para cambiar estado
- [ ] Estadísticas y gráficos
- [ ] Notificaciones por email
- [ ] Temas (dark mode)
- [ ] Ordenamiento personalizable
- [ ] Recurrencia de tareas

---

## 📝 Licencia

MIT

---

## ✉️ Soporte

Para reportar bugs o sugerir mejoras, abre un issue en el repositorio.

---

**Última actualización**: Febrero 2026
**Versión**: 1.0.0 (MVP)

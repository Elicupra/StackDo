# 🚀 QUICK START - Guía Rápida

## ⚡ Iniciar en 5 minutos

### **Paso 1: Configurar entorno**
```powershell
# Windows
cd D:\GitHub\python
cp .env.example .env

# Editar .env con credenciales PostgreSQL
# Abrir con editor favorito y rellenar:
# DB_USER=tu_usuario
# DB_PASSWORD=tu_password
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=stackdo
# DB_SCHEMA=public

# NOTA: Si tu contraseña contiene caracteres especiales (@, :, /, etc.)
# no te preocupes, el código los maneja automáticamente con URL encoding
```

### **Paso 2: Crear entorno virtual e instalar dependencias**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1

pip install fastapi uvicorn sqlmodel python-dotenv psycopg2-binary
```

### **Paso 3: Inicializar base de datos**
```powershell
# Opción 1: Usando el script
python scripts/init_db.py

# Opción 2: Comando directo (sin emoji)
python -c "from api.db import init_db; init_db(); print('BD inicializada correctamente')"
```

### **Paso 4: Ejecutar servidor**
```powershell
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### **Paso 5: Abrir en navegador**
```
http://localhost:8000
```

---

## 📋 Primera Vez Usando StackDo

1. **Se abre modal**: "Selecciona un Proyecto"
2. **Sin proyectos**: Crear uno con botón "Nuevo Proyecto"
3. **Con proyectos**: Elige uno y entra
4. **Crear tarea**: Botón "Nueva Tarea" → rellena formulario
5. **Filtrar**: Usa barra de filtros (búsqueda, estado, prioridad, fechas)
6. **Cambiar vista**: Toggle tabla/cards en toolbar
7. **Ver detalle**: Click en tarea → modal con info

---

## 🎯 Funcionalidades Clave

| Función | Cómo hacerlo |
|---------|-------------|
| **Crear proyecto** | Botón "Nuevo Proyecto" en navbar |
| **Cambiar proyecto** | Selector "-- Cambiar Proyecto --" en navbar |
| **Crear tarea** | Botón "Nueva Tarea" + rellenar modal |
| **Filtrar por nombre** | Barra de búsqueda (debounce 500ms) |
| **Filtrar por estado** | Dropdown "Estado" |
| **Filtrar por prioridad** | Dropdown "Prioridad" (⭐⭐⭐ = 3 estrellas) |
| **Filtrar por fecha** | Campos "Desde" y "Hasta" |
| **Reset filtros** | Botón "Reset" |
| **Ver tabla** | Botón tabla en toolbar |
| **Ver cards** | Botón cards en toolbar |
| **Editar tarea** | Click en tarea → "Editar" en detalle |
| **Eliminar tarea** | Click en tarea → "Eliminar" en detalle |
| **Cambiar de vista** | Se guarda automáticamente en localStorage |
| **Cambiar proyecto** | Se guarda automáticamente en localStorage |

---

## 📱 Responsive Design

| Dispositivo | Layout |
|-------------|--------|
| **Mobile** (< 576px) | 1 columna, navbar colapsable |
| **Tablet** (576px - 992px) | 2 columnas cards, navbar expandido |
| **Desktop** (> 992px) | 3 columnas cards, navbar completo |

---

## ⚠️ Tareas Huérfanas

Si una tarea **NO tiene proyecto asignado**:
- Aparece icono ⚠️ gris al lado del nombre
- Tooltip: "Sin proyecto asignado"
- **NO se pueden crear** (formulario requiere proyecto)
- Se pueden **editar** y asignarle un proyecto

---

## 🔄 Troubleshooting

| Problema | Solución |
|----------|----------|
| **Error BD**: "No such table" | Ejecutar: `python scripts/init_db.py` |
| **Error conexión**: "psycopg2" | Instalar: `pip install psycopg2-binary` |
| **Port 8000 ocupado** | Cambiar: `uvicorn api.main:app --port 8001` |
| **No carga proyectos** | Verificar `.env` con credenciales PostgreSQL |
| **Modal stuck** | Abrir DevTools → Console → `localStorage.clear()` |
| **Tareas no se guardan** | Verificar proyecto está seleccionado en header |

---

## 📊 Colores de Estados

```
🟨 Pendiente    → Amarillo (#ffc107)
🔵 En progreso  → Azul (#0dcaf0)
🟢 Completada   → Verde (#198754)
⚠️ Sin proyecto → Gris/Amarillo
```

---

## 📚 Documentación Adicional

- **README.md**: Documentación completa
- **CHANGELOG.md**: Historial de cambios
- **IMPLEMENTACION_COMPLETADA.md**: Resumen de correcciones
- **API Docs**: http://localhost:8000/docs (Swagger)

---

## 🎨 Estructura Visual

```
┌─────────────────────────────────────────┐
│  NAVBAR: Logo | Proyecto | Toggle View  │
├─────────────────────────────────────────┤
│ [Cambiar Proyecto] [Nuevo Proyecto] [+] │
├─────────────────────────────────────────┤
│ BARRA DE FILTROS:                       │
│ [🔍 Búsqueda] [Estado] [Prioridad]      │
│ [Desde] [Hasta] [Reset]                 │
├─────────────────────────────────────────┤
│ 📊 Tareas | [📋] [📇] (toggle vistas)   │
├─────────────────────────────────────────┤
│                                         │
│  VISTA TABLA o CARDS                    │
│  (Se intercambian con toggle)           │
│                                         │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist Pre-Producción

- [ ] `.env` creado con credenciales reales
- [ ] PostgreSQL corriendo en `localhost:5432`
- [ ] BD `stackdo` creada
- [ ] Tablas inicializadas con `init_db.py`
- [ ] Dependencies instalados: `pip install -r requirements.txt`
- [ ] Servidor corriendo: `uvicorn api.main:app --reload`
- [ ] Frontend accesible: `http://localhost:8000`
- [ ] Al menos 1 proyecto creado
- [ ] Al menos 1 tarea creada con proyecto
- [ ] Filtros funcionan correctamente
- [ ] Vistas tabla/cards intercambiables
- [ ] localStorage persiste proyecto y vista
- [ ] Avisos ⚠️ aparecen para tareas huérfanas

---

## 🔗 URLs Importantes

| URL | Propósito |
|-----|-----------|
| `http://localhost:8000` | Frontend principal |
| `http://localhost:8000/docs` | Swagger API docs |
| `http://localhost:8000/redoc` | ReDoc API docs |
| `http://localhost:8000/tasks` | Endpoint tareas |
| `http://localhost:8000/projects` | Endpoint proyectos |

---

## 💾 Base de Datos - Comandos Útiles

```sql
-- Conectar a PostgreSQL
psql -U postgres -d stackdo

-- Ver proyectos
SELECT * FROM projects;

-- Ver tareas
SELECT * FROM tareas;

-- Ver tareas de un proyecto
SELECT * FROM tareas WHERE project_id = 1;

-- Ver tareas activas
SELECT * FROM tareas WHERE active = TRUE;

-- Ver tareas inactivas (eliminadas)
SELECT * FROM tareas WHERE active = FALSE;

-- Contar tareas por estado
SELECT estado, COUNT(*) FROM tareas WHERE active = TRUE GROUP BY estado;
```

---

## 🚨 Importante

- ⚠️ **NO subir `.env` a git** (contiene contraseñas)
- ⚠️ **MVP sin autenticación** (agregar en producción)
- ✅ **Soft-delete activo** (tareas no se borran, solo se marcan inactivas)
- ✅ **Foreign key activa** (no puedes referenciar proyecto que no existe)
- ✅ **Proyecto obligatorio** (no puedes crear tarea sin proyecto)

---

**Última actualización**: Febrero 5, 2026
**Estado**: ✅ Listo para usar
**Versión**: 1.0.0

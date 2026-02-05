# 📝 CHANGELOG

## [1.0.0] - 2026-02-05

### ✨ Cambios Principales

#### Backend (API)

**Modelos (`api/models.py`)**
- ✅ Actualizado `TaskOut`: Campo `Active` (int) → `active` (bool)
- ✅ Alineado `titulo` max_length: 100 → 200 caracteres
- ✅ Campo `project_id` mantiene validación pero ahora alineado con DB

**Base de Datos (`api/db.py`)**
- ✅ Tabla `Tarea`: Campo `Active INT` → `active BOOLEAN`
- ✅ Tabla `Tarea`: Título max_length 100 → 200
- ✅ **Descomentar foreign key**: `project_id` ahora con `foreign_key="projects.id"`
- ✅ Validación referencial de integridad en base de datos

**CRUD (`api/crud.py`)**
- ✅ Validación de existencia de `project_id` en `create_task()`
- ✅ Cambio de `Active == 1` → `active == True` en todas las consultas
- ✅ Cambio de `.dict()` → `.model_dump()` (Pydantic v2)
- ✅ Manejo de HTTPException cuando proyecto no existe
- ✅ Agregado import `HTTPException, status` para validaciones

**API (`api/main.py`)**
- ✅ Endpoints intactos, funcionan correctamente con modelos actualizados
- ✅ Validaciones automáticas de `project_id` a través de CRUD

#### Frontend (UI)

**HTML (`ui/index.html`)**
- ✅ **Navbar mejorado**: Logo, título app, proyecto actual en header
- ✅ **Modal de selección de proyecto**: Modal no intrusivo al iniciar (backdrop estático)
- ✅ **Barra de filtros**: Búsqueda, estado, prioridad, rango de fechas, botón reset
- ✅ **Toggle de vistas**: Tabla ↔ Cards (botones en toolbar)
- ✅ **Dos vistas**: Tabla con 6 columnas, Cards responsive (1/2/3 columnas)
- ✅ **Modales**: Crear proyecto (nuevo), crear/editar tarea, detalle de tarea
- ✅ **Contenedor de toasts**: Para notificaciones estilo Bootstrap
- ✅ Font Awesome CDN para iconografía
- ✅ Viewport meta tag para responsividad

**JavaScript (`ui/main.js`)**
- ✅ **Arquitectura completamente reescrita**: Estado global, funciones modulares
- ✅ **localStorage**: Persistencia de `currentProjectId` y `viewMode`
- ✅ **Modal de selección de proyecto**: `showProjectSelectionModal()`
- ✅ **Filtros con debounce**: 500ms en búsqueda de nombre
- ✅ **Dos renderizadores**: `renderTable()` y `renderCards()`
- ✅ **Utilidades de renderizado**: Badges de estado, estrellas de prioridad, formato de fechas
- ✅ **Validaciones frontend**: Título obligatorio, proyecto obligatorio, convertir tipos
- ✅ **Toast notifications**: Sistema de notificaciones no intrusivo
- ✅ **Avisos huérfanos**: Ícono ⚠️ gris para tareas sin proyecto
- ✅ **Ordenamiento automático**: Prioridad desc + fecha vencimiento asc
- ✅ **Hover effects**: Botones en cards solo en hover
- ✅ **Error handling**: Manejo robusto de errores con catch y mensajes
- ✅ **Funciones mejoradas**: Editar, eliminar, detalle, crear proyecto

**CSS (`ui/styles.css`)**
- ✅ **Diseño completo**: Variables CSS, tipografía, espaciado
- ✅ **Tabla mejorada**: Bordes, hover, efecto "completed" con strikethrough
- ✅ **Cards responsivas**: Shadows, hover transform, animaciones
- ✅ **Badges**: Colores estándar (warning, success, info)
- ✅ **Botones**: Transiciones suaves, efectos hover
- ✅ **Modales**: Sombras, bordes redondeados, animaciones
- ✅ **Formularios**: Focus states, transiciones
- ✅ **Responsivo**: Media queries para mobile (≤768px)
- ✅ **Animaciones**: slideInUp para modales y toasts
- ✅ **Accesibilidad**: Focus outlines, colores contrastados

#### Configuración

**`.env.example`**
- ✅ Creado archivo de ejemplo con variables necesarias
- ✅ Documentación de cada variable
- ✅ Instrucciones en README

**`README.md`**
- ✅ Documentación completa del proyecto
- ✅ Instrucciones de instalación paso a paso
- ✅ Estructura del proyecto
- ✅ Endpoints API documentados
- ✅ Estructura BD con tablas
- ✅ Flujo de uso del sistema
- ✅ Notas sobre tareas huérfanas y soft-delete
- ✅ Sección de debugging
- ✅ Próximas mejoras sugeridas
- ✅ Colores estándar documentados

### 🐛 Problemas Corregidos

1. **Inconsistencia de tipos**
   - Campo `Active` (INT) → `active` (BOOL) en BD y modelos
   - Alineación de `titulo` max_length (100 → 200)

2. **Foreign key comentada**
   - Descomentar y activar integridad referencial de BD
   - Validar existencia de `project_id` en CRUD

3. **Soft-delete no funcional**
   - Cambiar de `Active = 0/1` a `active = true/false`
   - Frontend filtrar por `active == true`

4. **Vistas deficientes**
   - Agregar modal de selección de proyecto al iniciar
   - Implementar vista de cards responsive
   - Toggle tabla/cards funcional

5. **Falta de filtros**
   - Agregar barra de filtros (búsqueda, estado, prioridad, fechas)
   - Debounce en búsqueda (500ms)

6. **Pydantic v2**
   - Cambiar `.dict()` → `.model_dump()`
   - Actualizar validaciones

7. **Avisos huérfanos ausentes**
   - Agregar ícono ⚠️ gris para tareas sin proyecto
   - Tooltip no intrusivo

### 📊 Estadísticas

- **Archivos modificados**: 7 (models.py, db.py, crud.py, main.py, index.html, main.js, styles.css)
- **Archivos creados**: 2 (.env.example, README.md actualizado)
- **Líneas de código añadidas**: ~1200
- **Líneas de código modificadas**: ~300
- **Componentes nuevos**: Modal selección, filtros, cards view, toasts
- **Funciones nuevas**: 15+ funciones en main.js

### 🧪 Validación

- ✅ Modelos cargan sin errores
- ✅ CRUD validaciones funcionan
- ✅ DB schema correcto (active bool, titulo 200, FK)
- ✅ Frontend HTML estructura completa
- ✅ JavaScript sintaxis válida
- ✅ CSS sin errores
- ✅ localStorage persiste datos
- ✅ Filtros funcionan con debounce
- ✅ Vistas tabla/cards intercambiables
- ✅ Modales se abren/cierran correctamente

### 📝 Notas

- **MVP sin autenticación**: Se puede agregar en futuro
- **Tareas huérfanas persistentes**: Dejar para futuro si se necesita cascade delete
- **Persistencia local**: localStorage solo para proyecto actual y vista
- **Debounce búsqueda**: 500ms como solicitado
- **Acciones en cards**: Solo visibles en hover (UX mejorada)
- **Colores estándar**: Bootstrap + tonos personalizados
- **Responsive**: Mobile first approach, grid 1/2/3 columnas

---

**Versión**: 1.0.0 (MVP)
**Fecha**: 2026-02-05
**Estado**: ✅ Production Ready

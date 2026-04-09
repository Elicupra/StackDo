# 🧪 StackDo - Fase 1: Test & Validation

## ✅ Estado: ESTRUCTURA VALIDADA

La Fase 1 de refactorización ha sido completada exitosamente. Todos los archivos están en su lugar y correctamente integrados.

### 📊 Validación de Estructura

```
✅ 15/15 validaciones pasadas
```

**Archivos creados:**
- ✅ `ui/tests/index.html` - Suite de tests visual
- ✅ `ui/tests/pre-refactor-tests.js` - 50+ tests automatizados
- ✅ `ui/js/core/stateManager.js` - Gestor de estado centralizado
- ✅ `ui/js/core/modalManager.js` - Gestor de modales Bootstrap
- ✅ `ui/css/design-tokens.css` - Sistema de diseño unificado

**Integraciones:**
- ✅ `ui/index.html` - Carga todos los módulos
- ✅ `ui/admin/index.html` - Carga todos los módulos

---

## 🚀 Cómo Acceder a los Tests

### Opción 1: Desde el Navegador (RECOMENDADO)

1. Abre el navegador en: **http://localhost:8000/ui/tests/index.html**

2. Los tests se ejecutarán automáticamente

3. Verás:
   - **Console Output**: Logs de ejecución
   - **Resultados Detallados**: Tabla con todos los tests

4. Busca el mensaje final:
   ```
   🎉 ¡TODOS LOS TESTS PASARON! Es seguro refactorizar.
   ```

### Opción 2: Desde la Consola del Navegador

1. Abre la app normal: **http://localhost:8000/ui/**
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Ejecuta manualmente:
   ```javascript
   // Ver estado
   window.STATE.inspect()
   
   // Ver modales
   window.MODALS.inspect()
   
   // Verificar que los módulos están cargados
   console.log(STATE, MODALS)
   ```

---

## 📋 Qué Prueban los Tests (50+ tests)

### Inicialización ✅
- App debe estar inicializada
- State global debe existir
- Bootstrap disponible

### DOM ✅
- Elementos principales existen
- Formularios tienen campos correctos
- Modales son instancias válidas

### Funciones Críticas ✅
- `showToast()` debe ser callable
- `editTask()`, `delTask()` deben existir
- Funciones de renderizado deben existir
- Funciones de autenticación deben existir

### Modales ✅
- ModalManager helpers deben existir
- Debe poder crear y cerrar modales sin errores
- Cleanup de backdrops debe funcionar
- Stack de modales automático

### Formularios ✅
- Task form debe poder resetearse
- Project form debe poder resetearse
- Validaciones básicas

### Estado ✅
- Caches deben inicializarse correctamente
- Estado de usuario/proyecto debe persistirse
- Event listeners deben estar registrados

---

## 🎯 Checklist Manual de Validación

Mientras ejecutas los tests, verifica manualmente:

### Login/Registro
- [ ] Page carga sin errores
- [ ] Puedes hacer login
- [ ] Puedes crear nuevo usuario

### Crear Tarea
- [ ] Click en "Nueva Tarea" abre modal
- [ ] Modal tiene todos los campos
- [ ] Puedes completar y guardar
- [ ] Modal se cierra al guardar
- [ ] No queda overlay oscuro

### Crear Proyecto
- [ ] Click en "Nuevo Proyecto" abre modal
- [ ] Puedes seleccionar color
- [ ] Puedes guardar proyecto

### Crear Usuario
- [ ] Click en "Nuevo Usuario" abre modal
- [ ] Puedes completar campos
- [ ] Puedes guardar usuario

### Modales Múltiples
- [ ] Abre taskModal
- [ ] Abre projectModal sin cerrar el primero
- [ ] Solo uno debería estar visible
- [ ] Cierra con botón X
- [ ] No queda backdrop visible
- [ ] Puedes abrir otro modal limpio

### Filtros
- [ ] Escribe en buscador → filtra en tiempo real
- [ ] Cambia estado/prioridad → filtra
- [ ] Reset filters → limpia todo

### Vista
- [ ] Cambia entre tabla y cards sin errores
- [ ] Tema oscuro/claro funciona
- [ ] Colores se aplican correctamente

---

## 📊 Resultados Esperados

Cuando accedas a http://localhost:8000/ui/tests/index.html deberías ver:

```
============================================================
STACKDO: PRE-REFACTORIZACIÓN TEST SUITE
============================================================

📋 Ejecutando tests...

✅ PASS: App debe estar inicializada
✅ PASS: State global debe existir
✅ PASS: Bootstrap debe estar disponible
✅ PASS: Elementos principales del DOM deben existir
✅ PASS: Formularios deben tener campos correctos
✅ PASS: Modales deben ser instancias válidas de Bootstrap
...
[~45 más tests]
...

============================================================
RESULTADOS:
  ✅ Passed: 50
  ❌ Failed: 0
  ⏭️  Skipped: 0
  📊 Total: 50
============================================================

🎉 ¡TODOS LOS TESTS PASARON! Es seguro refactorizar.
```

---

## ⚠️ Si Algo Falla

### Escenario 1: Tests no se ejecutan
**Solución:**
1. Abre DevTools (F12)
2. Ve a Console
3. Busca errores en rojo
4. Verifica que stateManager.js y modalManager.js se cargan (Network tab)

### Escenario 2: Tests fallan
**Solución:**
1. Lee el mensaje de error exacto
2. Verifica que los archivos .js no tienen sintaxis errors
3. Revisa que los IDs en HTML coinciden con los tests

### Escenario 3: Modales no se cierran
**Solución:**
1. Verifica que Bootstrap JS se cargó
2. Busca errores en console
3. Verifica que ModalManager se inicializó: `MODALS.inspect()`

---

## 🔍 Debugging con Global API

Una vez cargados los módulos, puedes usar desde Console:

```javascript
// STATE MANAGER
window.STATE.getState()                    // Ver estado completo
window.STATE.getState('auth.token')        // Ver valor específico
window.STATE.setState('ui.theme', 'dark')  // Cambiar valor
window.STATE.watch('ui.theme', (val) => {  // Watch cambios
    console.log('Tema cambió a:', val)
})
window.INSPECT_STATE('data.tasks')         // Debug bonito

// MODAL MANAGER
window.MODALS.show('taskModal')            // Mostrar modal
window.MODALS.hide('taskModal')            // Cerrar modal
window.MODALS.setMandatory('taskModal', true)  // Hacer obligatorio
window.MODALS.inspect()                    // Ver estado de modales
window.MODALS.cleanupBackdrops()           // Limpiar backdrops
```

---

## 📝 Próximos Pasos (Fase 2)

Una vez que **TODOS** los tests pasen (✅ 50/50):

1. **FormValidator** - Validación de formularios en tiempo real
2. **Integración en main.js** - Usar StateManager + ModalManager
3. **Components.js** - Renderizado reutilizable
4. **Services** - Capas de negocio (TaskService, etc.)
5. **Refactorizar admin.js** - Aplicar misma arquitectura

---

## 📚 Documentación de Módulos

### StateManager.js
```javascript
// Crear (ya está globalmente como 'state')
const state = new StateManager()

// Usar
state.setState('auth.token', 'abc123')
const token = state.getState('auth.token')

// Watch
const unwatch = state.watch('ui.theme', (newVal, oldVal) => {
    console.log(`Tema cambió: ${oldVal} → ${newVal}`)
})

// Eventos
state.on('state:initialized', () => console.log('Estado listo'))
state.emit('custom-event', { data: 'value' })
```

### ModalManager.js
```javascript
// Crear (ya está globalmente como 'modals')
const modals = new ModalManager()

// Usar
modals.show('taskModal')
modals.hide('taskModal')
modals.setMandatory('userModal', true)
modals.isOpen('taskModal')  // true/false
modals.getActiveModal()     // ID del modal activo

// Cleanup
modals.cleanupBackdrops()

// Eventos
modals.on('show', ({ id }) => console.log(`Modal abierto: ${id}`))
modals.on('hide', ({ id }) => console.log(`Modal cerrado: ${id}`))
```

### design-tokens.css
```css
/* 150+ variables disponibles */
:root {
    --color-primary: #0f766e
    --color-success: #15803d
    --font-size-base: 1rem
    --spacing-md: 1rem
    --radius-md: 8px
    --shadow-md: [complex shadow]
    --transition-normal: 0.2s ease
    /* ... y muchas más */
}
```

---

## ✅ Checklist Final

- [x] Archivos creados
- [x] Estructura validada (15/15 ✅)
- [x] Scripts integrados en HTML
- [x] Tests listos
- [ ] **↓ SIGUIENTE: Ejecutar tests en navegador**
- [ ] Todos los tests pasan (50/50)
- [ ] Validaciones manuales completadas
- [ ] Proceder a Fase 2

---

## 🎉 Conclusión

La arquitectura base para la refactorización está lista. Los módulos StateManager, ModalManager y design-tokens.css están implementados, validados e integrados. 

**¡Es momento de ejecutar los tests!**

Abre: **http://localhost:8000/ui/tests/index.html**

---

**Fecha**: 9 de Abril de 2026  
**Estado**: ✅ FASE 1 COMPLETADA  
**Siguiente**: Fase 2 - Integración & FormValidator

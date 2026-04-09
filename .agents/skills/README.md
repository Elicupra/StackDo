# SKILLS - Herramientas Especializadas del Proyecto

Este directorio contiene SKILLS personalizados para el proyecto StackDo. Los SKILLS son herramientas que proporcionan workflows y metodologías especializadas para tareas específicas.

## SKILLS Disponibles

### 1. `systematic-debugging/`

**Descripción**: Metodología estructurada para debugging y resolución sistemática de problemas técnicos.

**Cuándo usar**:
- Test failures
- Bugs en producción
- Comportamiento inesperado
- Problemas de performance
- Fallos de build
- Issues de integración

**Contenido**:
- `SKILL.md` - Guía completa (4 fases de debugging)
- `root-cause-tracing.md` - Técnicas de trazado de raíz
- `condition-based-waiting.md` - Patrones de espera condicional
- `defense-in-depth.md` - Estrategia de defensa profunda
- Ejemplos y documentación de test pressure

**Principio Core**: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"

### 2. `python-fastapi-development/`

**Descripción**: Workflow especializado para desarrollo de backends Python/FastAPI con patrones async, SQLAlchemy, Pydantic, y autenticación.

**Cuándo usar**:
- Construir nuevas APIs REST con FastAPI
- Crear backends Python async
- Implementar integración con bases de datos
- Configurar autenticación en API
- Desarrollar microservicios

**Contenido**:
- `SKILL.md` - Guía de workflow en fases (Setup, Database, Routes, Auth, Testing)

**Categoría**: granular-workflow-bundle  
**Riesgo**: safe  
**Agregado**: 2026-02-27

## Cómo Usar los SKILLS

Los SKILLS se cargan automáticamente cuando está activo el agente OpenCode. Para invocar un skill:

```
skill load systematic-debugging
skill load python-fastapi-development
```

O en prompts:

```
"Usa el skill systematic-debugging para investigar este problema..."
"Usa python-fastapi-development para implementar esta API..."
```

## Estructura del Proyecto

```
.agents/
└── skills/
    ├── systematic-debugging/
    │   ├── SKILL.md
    │   ├── CREATION-LOG.md
    │   ├── root-cause-tracing.md
    │   ├── condition-based-waiting.md
    │   ├── condition-based-waiting-example.ts
    │   ├── defense-in-depth.md
    │   ├── find-polluter.sh
    │   ├── test-academic.md
    │   ├── test-pressure-1.md
    │   ├── test-pressure-2.md
    │   └── test-pressure-3.md
    ├── python-fastapi-development/
    │   └── SKILL.md
    └── README.md (este archivo)
```

## Notas Importantes

- Los SKILLS son específicos del proyecto StackDo
- Se versionan junto con el código en GitHub
- Se pueden extender o personalizar según necesidades
- Cada skill tiene su propia documentación interna
- Los skills guían la metodología de trabajo del agente

---

**Última actualización**: 09/04/2026  
**Fuente**: Movidos de directorio global de usuario a proyecto local

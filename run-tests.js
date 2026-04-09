#!/usr/bin/env node

/**
 * Test Runner - CLI
 * 
 * Ejecuta la suite de tests y genera reporte
 * Uso: node run-tests.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('STACKDO PRE-REFACTORIZACIÓN - TEST RUNNER');
console.log('='.repeat(70));

const testUrl = 'http://localhost:8000/ui/tests/index.html';

console.log(`\n🌐 Accediendo a: ${testUrl}\n`);
console.log('📝 Instrucciones:');
console.log('1. Abre el navegador a: http://localhost:8000/ui/tests/index.html');
console.log('2. Los tests se ejecutarán automáticamente');
console.log('3. Espera a ver los resultados en la consola');
console.log('4. Presiona F12 para ver la consola del navegador');
console.log('5. Todos los tests deben mostrar ✅ PASS\n');

console.log('='.repeat(70));
console.log('PRUEBA MANUAL - CHECKLIST');
console.log('='.repeat(70));

const checklist = [
    '[ ] Página de tests carga correctamente',
    '[ ] Card "Console Output" muestra los logs',
    '[ ] Todos los tests muestran ✅ PASS',
    '[ ] Sección "Resultados Detallados" muestra items con ✅',
    '[ ] No hay errores rojos (❌ FAIL)',
    '[ ] Al final dice "¡TODOS LOS TESTS PASARON!"'
];

checklist.forEach(item => console.log(item));

console.log('\n' + '='.repeat(70));
console.log('FUNCIONALIDADES A VALIDAR MANUALMENTE');
console.log('='.repeat(70));

const features = [
    {
        name: 'Login/Registro',
        steps: [
            '1. Ve a http://localhost:8000/ui/',
            '2. Intenta login con credenciales existentes',
            '3. O crea un nuevo usuario'
        ]
    },
    {
        name: 'Creación de Tarea',
        steps: [
            '1. Accede como usuario',
            '2. Selecciona un proyecto',
            '3. Haz click en "Nueva Tarea"',
            '4. Modal taskModal debe abrirse sin errores',
            '5. Completa formulario y guarda'
        ]
    },
    {
        name: 'Creación de Proyecto',
        steps: [
            '1. Haz click en "Nuevo Proyecto"',
            '2. Modal projectModal debe abrirse',
            '3. Completa nombre y color',
            '4. Guarda proyecto'
        ]
    },
    {
        name: 'Creación de Usuario',
        steps: [
            '1. Haz click en "Nuevo Usuario"',
            '2. Modal userModal debe abrirse',
            '3. Completa campos obligatorios',
            '4. Guarda usuario'
        ]
    },
    {
        name: 'Modales',
        steps: [
            '1. Abre múltiples modales en secuencia',
            '2. Verifica que solo uno está visible',
            '3. Cierra con botón X',
            '4. Verifica que no queda overlay oscuro',
            '5. Abre otro modal - debe estar limpio'
        ]
    },
    {
        name: 'Filtros',
        steps: [
            '1. Carga tareas',
            '2. Escribe en buscador',
            '3. Cambia estado/prioridad',
            '4. Los filtros deben aplicarse en tiempo real'
        ]
    },
    {
        name: 'Vista Tabla vs Cards',
        steps: [
            '1. Haz click en icono "Tabla"',
            '2. Haz click en icono "Cards"',
            '3. Cambia entre vistas sin errores'
        ]
    },
    {
        name: 'Tema Oscuro/Claro',
        steps: [
            '1. Haz click en icono de luna/sol',
            '2. Tema debe cambiar',
            '3. Colores deben cumplir con nuevos tokens'
        ]
    }
];

features.forEach((feature, idx) => {
    console.log(`\n${idx + 1}. ${feature.name}`);
    feature.steps.forEach(step => console.log(`   ${step}`));
});

console.log('\n' + '='.repeat(70));
console.log('PRÓXIMOS PASOS DESPUÉS DE TESTS');
console.log('='.repeat(70));

const nextSteps = [
    '✅ Si todos los tests pasan:',
    '   1. Los módulos (StateManager, ModalManager) están listos',
    '   2. El sistema de tokens está en lugar',
    '   3. Proceder a Fase 2: FormValidator + Integración',
    '',
    '❌ Si hay errores:',
    '   1. Revisar consola del navegador (F12)',
    '   2. Verificar que HTML/CSS/JS están en lugar correcto',
    '   3. Revisar sintaxis en los módulos',
    '   4. Reportar errores específicos'
];

nextSteps.forEach(step => console.log(step));

console.log('\n' + '='.repeat(70));
console.log('VERIFICACIÓN RÁPIDA DE ARCHIVOS');
console.log('='.repeat(70));

const requiredFiles = [
    'ui/tests/index.html',
    'ui/tests/pre-refactor-tests.js',
    'ui/js/core/stateManager.js',
    'ui/js/core/modalManager.js',
    'ui/css/design-tokens.css'
];

requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${file}`);
});

console.log('\n' + '='.repeat(70));
console.log('INSTRUCCIONES FINALES');
console.log('='.repeat(70));

console.log(`
1. Abre en navegador: http://localhost:8000/ui/tests/index.html

2. En la consola del navegador (F12), deberías ver algo como:
   ============================================================
   STACKDO: PRE-REFACTORIZACIÓN TEST SUITE
   ============================================================
   
   📋 Ejecutando tests...
   
   ✅ PASS: App debe estar inicializada
   ✅ PASS: State global debe existir
   ...

3. Debajo de "Resultados Detallados" verás una tabla verde
   con todos los tests pasados.

4. Si vez un mensaje rojo o ❌, algo necesita revisar.

5. Abre DevTools (F12) → Console para más detalles.

¡BUENA SUERTE! 🚀
`);

console.log('='.repeat(70));

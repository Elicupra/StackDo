#!/usr/bin/env node

/**
 * Validador de Estructura
 * 
 * Verifica que todos los archivos necesarios están en lugar
 * y que los índices HTML tienen las referencias correctas
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('VALIDACIÓN DE ESTRUCTURA - PRE-REFACTORIZACIÓN');
console.log('='.repeat(70));

const checks = [];

function check(description, fn) {
    checks.push({ description, fn });
}

// Validar archivos existen
check('Archivo: ui/tests/index.html', () => {
    const exists = fs.existsSync('ui/tests/index.html');
    if (!exists) throw new Error('No encontrado');
    return true;
});

check('Archivo: ui/tests/pre-refactor-tests.js', () => {
    const exists = fs.existsSync('ui/tests/pre-refactor-tests.js');
    if (!exists) throw new Error('No encontrado');
    return true;
});

check('Archivo: ui/js/core/stateManager.js', () => {
    const exists = fs.existsSync('ui/js/core/stateManager.js');
    if (!exists) throw new Error('No encontrado');
    return true;
});

check('Archivo: ui/js/core/modalManager.js', () => {
    const exists = fs.existsSync('ui/js/core/modalManager.js');
    if (!exists) throw new Error('No encontrado');
    return true;
});

check('Archivo: ui/css/design-tokens.css', () => {
    const exists = fs.existsSync('ui/css/design-tokens.css');
    if (!exists) throw new Error('No encontrado');
    return true;
});

// Validar referencias en HTML
check('ui/index.html carga design-tokens.css', () => {
    const html = fs.readFileSync('ui/index.html', 'utf8');
    if (!html.includes('css/design-tokens.css')) {
        throw new Error('design-tokens.css no referenciado');
    }
    return true;
});

check('ui/index.html carga stateManager.js', () => {
    const html = fs.readFileSync('ui/index.html', 'utf8');
    if (!html.includes('js/core/stateManager.js')) {
        throw new Error('stateManager.js no referenciado');
    }
    return true;
});

check('ui/index.html carga modalManager.js', () => {
    const html = fs.readFileSync('ui/index.html', 'utf8');
    if (!html.includes('js/core/modalManager.js')) {
        throw new Error('modalManager.js no referenciado');
    }
    return true;
});

check('ui/admin/index.html carga design-tokens.css', () => {
    const html = fs.readFileSync('ui/admin/index.html', 'utf8');
    if (!html.includes('design-tokens.css')) {
        throw new Error('design-tokens.css no referenciado');
    }
    return true;
});

check('ui/admin/index.html carga stateManager.js', () => {
    const html = fs.readFileSync('ui/admin/index.html', 'utf8');
    if (!html.includes('stateManager.js')) {
        throw new Error('stateManager.js no referenciado');
    }
    return true;
});

check('ui/admin/index.html carga modalManager.js', () => {
    const html = fs.readFileSync('ui/admin/index.html', 'utf8');
    if (!html.includes('modalManager.js')) {
        throw new Error('modalManager.js no referenciado');
    }
    return true;
});

// Validar contenido de módulos
check('stateManager.js tiene clase StateManager', () => {
    const content = fs.readFileSync('ui/js/core/stateManager.js', 'utf8');
    if (!content.includes('class StateManager')) {
        throw new Error('Clase StateManager no encontrada');
    }
    return true;
});

check('modalManager.js tiene clase ModalManager', () => {
    const content = fs.readFileSync('ui/js/core/modalManager.js', 'utf8');
    if (!content.includes('class ModalManager')) {
        throw new Error('Clase ModalManager no encontrada');
    }
    return true;
});

check('design-tokens.css tiene variables CSS', () => {
    const content = fs.readFileSync('ui/css/design-tokens.css', 'utf8');
    if (!content.includes('--color-primary') || !content.includes(':root')) {
        throw new Error('Variables CSS no encontradas');
    }
    return true;
});

check('pre-refactor-tests.js tiene TestRunner', () => {
    const content = fs.readFileSync('ui/tests/pre-refactor-tests.js', 'utf8');
    if (!content.includes('class TestRunner')) {
        throw new Error('Clase TestRunner no encontrada');
    }
    return true;
});

// Ejecutar validaciones
let passed = 0;
let failed = 0;

console.log('\n🔍 Ejecutando validaciones...\n');

checks.forEach(check => {
    try {
        check.fn();
        console.log(`✅ ${check.description}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${check.description}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
});

console.log('\n' + '='.repeat(70));
console.log(`RESULTADOS: ${passed} ✅ | ${failed} ❌`);
console.log('='.repeat(70));

if (failed === 0) {
    console.log('\n🎉 ¡ESTRUCTURA VÁLIDA! Todos los archivos están en lugar.\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Abre navegador: http://localhost:8000/ui/tests/index.html');
    console.log('   2. Espera a que se ejecuten los tests automáticamente');
    console.log('   3. Verifica que todos muestren ✅ PASS');
    console.log('   4. Si hay ❌ FAIL, revisa la consola del navegador\n');
} else {
    console.log(`\n⚠️  ${failed} validaciones fallaron. Revisa los errores arriba.\n`);
    process.exit(1);
}

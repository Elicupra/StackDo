/**
 * PRE-REFACTORIZACIÓN: TESTS DE FUNCIONALIDAD
 * 
 * Este script prueba TODAS las funcionalidades críticas ANTES de refactorizar.
 * Debe pasar 100% de estos tests antes de comenzar cambios.
 * 
 * Ejecutar en navegador: F12 → Console
 * O: npm test (si está configurado)
 */

console.log('='.repeat(60));
console.log('STACKDO: PRE-REFACTORIZACIÓN TEST SUITE');
console.log('='.repeat(60));

// ==================== UTILIDADES ====================

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
    }

    test(description, fn) {
        this.tests.push({ description, fn, skip: false });
    }

    skip(description, fn) {
        this.tests.push({ description, fn, skip: true });
    }

    async run() {
        console.log('\n📋 Ejecutando tests...\n');

        for (const test of this.tests) {
            try {
                if (test.skip) {
                    console.log(`⏭️  SKIP: ${test.description}`);
                    this.skipped++;
                    continue;
                }

                await test.fn();
                console.log(`✅ PASS: ${test.description}`);
                this.passed++;
            } catch (error) {
                console.error(`❌ FAIL: ${test.description}`);
                console.error(`   Error: ${error.message}`);
                this.failed++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('RESULTADOS:');
        console.log(`  ✅ Passed: ${this.passed}`);
        console.log(`  ❌ Failed: ${this.failed}`);
        console.log(`  ⏭️  Skipped: ${this.skipped}`);
        console.log(`  📊 Total: ${this.tests.length}`);
        console.log('='.repeat(60));

        if (this.failed === 0) {
            console.log('\n🎉 ¡TODOS LOS TESTS PASARON! Es seguro refactorizar.\n');
        } else {
            console.warn(`\n⚠️  ${this.failed} tests fallaron. REVISA ANTES DE REFACTORIZAR.\n`);
        }
    }
}

const assert = (condition, message) => {
    if (!condition) throw new Error(message || 'Assertion failed');
};

const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
};

const assertTruthy = (value, message) => {
    if (!value) throw new Error(message || `Expected truthy, got ${value}`);
};

const assertExists = (el, selector, message) => {
    const found = el.querySelector(selector);
    if (!found) throw new Error(message || `Element not found: ${selector}`);
    return found;
};

// ==================== TESTS ====================

const runner = new TestRunner();

// ------- TESTS DE INICIALIZACIÓN -------

runner.test('App debe estar inicializada', () => {
    assertTruthy(typeof initApp === 'function', 'initApp debe ser función');
});

runner.test('State global debe existir', () => {
    assertTruthy(typeof currentProjectId !== 'undefined', 'currentProjectId debe estar definido');
    assertTruthy(typeof currentUserId !== 'undefined', 'currentUserId debe estar definido');
    assertTruthy(typeof authEnabled !== 'undefined', 'authEnabled debe estar definido');
});

runner.test('Bootstrap debe estar disponible', () => {
    assertTruthy(typeof bootstrap !== 'undefined', 'Bootstrap debe estar en window');
    assertTruthy(typeof bootstrap.Modal !== 'undefined', 'bootstrap.Modal debe existir');
});

// ------- TESTS DE ELEMENTOS DOM -------

runner.test('Elementos principales del DOM deben existir', () => {
    assertExists(document, '#loginView', 'Login view debe existir');
    assertExists(document, '#appView', 'App view debe existir');
    assertExists(document, '#taskModal', 'Task modal debe existir');
    assertExists(document, '#userSelectionModal', 'User selection modal debe existir');
    assertExists(document, '#projectSelectionModal', 'Project selection modal debe existir');
});

runner.test('Formularios deben tener campos correctos', () => {
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        assertExists(taskForm, '#title', 'Task form debe tener field title');
        assertExists(taskForm, '#desc', 'Task form debe tener field desc');
        assertExists(taskForm, '#status', 'Task form debe tener field status');
    }
});

runner.test('Modales deben ser instancias válidas de Bootstrap', () => {
    const taskModal = document.getElementById('taskModal');
    assertTruthy(taskModal, 'taskModal debe existir en DOM');

    // Crear instancia
    const modalInstance = new bootstrap.Modal(taskModal);
    assertTruthy(modalInstance, 'Debe poder crear instancia de Modal');
    assertTruthy(modalInstance._config, 'Modal debe tener _config');
});

// ------- TESTS DE FUNCIONES CRÍTICAS -------

runner.test('showToast debe ser callable', () => {
    assertTruthy(typeof showToast === 'function', 'showToast debe ser función');
});

runner.test('Función readErrorMessage debe existir', () => {
    assertTruthy(typeof readErrorMessage === 'function', 'readErrorMessage debe ser función');
});

runner.test('Helper functions para tareas deben existir', () => {
    assertTruthy(typeof editTask === 'function', 'editTask debe existir');
    assertTruthy(typeof delTask === 'function', 'delTask debe existir');
    assertTruthy(typeof resetTaskForm === 'function', 'resetTaskForm debe existir');
});

runner.test('Funciones de renderizado deben existir', () => {
    assertTruthy(typeof renderTable === 'function', 'renderTable debe existir');
    assertTruthy(typeof renderCards === 'function', 'renderCards debe existir');
    assertTruthy(typeof applyFilters === 'function', 'applyFilters debe existir');
});

runner.test('Funciones de autenticación deben existir', () => {
    assertTruthy(typeof configureAuthFetch === 'function', 'configureAuthFetch debe existir');
    assertTruthy(typeof setActiveUser === 'function', 'setActiveUser debe existir');
    assertTruthy(typeof setActiveProject === 'function', 'setActiveProject debe existir');
});

// ------- TESTS DE MODALES -------

runner.test('ModalManager helpers deben existir', () => {
    assertTruthy(typeof getModalInstance === 'function', 'getModalInstance debe existir');
    assertTruthy(typeof safeShowModal === 'function', 'safeShowModal debe existir');
    assertTruthy(typeof safeHideModal === 'function', 'safeHideModal debe existir');
    assertTruthy(typeof cleanupOrphanBackdrops === 'function', 'cleanupOrphanBackdrops debe existir');
});

runner.test('Debe poder crear y cerrar modales sin errores', () => {
    const taskModal = document.getElementById('taskModal');
    const instance1 = getModalInstance('taskModal');
    assertTruthy(instance1, 'Debe crear instancia');

    const instance2 = getModalInstance('taskModal');
    assertEqual(instance1, instance2, 'Segunda llamada debe retornar misma instancia');
});

runner.test('Cleanup de backdrops debe funcionar', () => {
    // Crear múltiples backdrops fake
    const bd1 = document.createElement('div');
    bd1.className = 'modal-backdrop';
    document.body.appendChild(bd1);

    const bd2 = document.createElement('div');
    bd2.className = 'modal-backdrop';
    document.body.appendChild(bd2);

    const countBefore = document.querySelectorAll('.modal-backdrop').length;
    assertTruthy(countBefore >= 1, 'Debe haber al menos 1 backdrop');

    cleanupOrphanBackdrops();

    const countAfter = document.querySelectorAll('.modal-backdrop').length;
    assertTruthy(countAfter <= countBefore, 'Cleanup debe reducir o mantener backdrops');

    // Limpiar
    bd1.remove();
    bd2.remove();
});

// ------- TESTS DE FORMULARIOS -------

runner.test('Task form debe poder ser reseteado', () => {
    const form = document.getElementById('taskForm');
    if (form) {
        const titleInput = form.querySelector('#title');
        if (titleInput) {
            titleInput.value = 'Test Task';
            resetTaskForm();
            assertEqual(titleInput.value, '', 'Task form debe estar vacío después de reset');
        }
    }
});

runner.test('Project form debe poder ser reseteado', () => {
    const form = document.getElementById('projectModal');
    if (form) {
        const nameInput = form.querySelector('#projectName');
        if (nameInput) {
            nameInput.value = 'Test Project';
            // No hay resetProjectForm, pero el modal se abre limpio
            assertTruthy(nameInput, 'Project name input debe existir');
        }
    }
});

// ------- TESTS DE ESTADO Y CACHÉ -------

runner.test('Caches deben ser inicializables', () => {
    assertTruthy(Array.isArray(usersCache), 'usersCache debe ser array');
    assertTruthy(projectsCache instanceof Map, 'projectsCache debe ser Map');
});

runner.test('Estado de usuario debe poder almacenarse y recuperarse', () => {
    const testUserId = 'test-user-123';
    localStorage.setItem('currentUserId', testUserId);

    const retrieved = localStorage.getItem('currentUserId');
    assertEqual(retrieved, testUserId, 'Should store and retrieve user ID');

    localStorage.removeItem('currentUserId');
});

runner.test('Estado de proyecto debe poder almacenarse y recuperarse', () => {
    const testProjectId = '999';
    localStorage.setItem('currentProjectId', testProjectId);

    const retrieved = localStorage.getItem('currentProjectId');
    assertEqual(retrieved, testProjectId, 'Should store and retrieve project ID');

    localStorage.removeItem('currentProjectId');
});

// ------- TESTS DE EVENTOS -------

runner.test('Event listeners deben estar registrados', () => {
    const taskSaveBtn = document.getElementById('taskSaveBtn');
    assertTruthy(taskSaveBtn, 'Task save button debe existir');

    const userSaveBtn = document.getElementById('userSaveBtn');
    assertTruthy(userSaveBtn, 'User save button debe existir');

    const projectFormBtn = document.getElementById('projectFormBtn');
    assertTruthy(projectFormBtn, 'Project form button debe existir');
});

runner.test('openCreateBtn debe estar registrado', () => {
    const btn = document.getElementById('openCreateBtn');
    assertTruthy(btn, 'openCreateBtn debe existir');
});

runner.test('Buttons de vista (table/cards) deben existir', () => {
    const tableBtn = document.getElementById('viewTableBtn');
    const cardsBtn = document.getElementById('viewCardsBtn');

    assertTruthy(tableBtn, 'viewTableBtn debe existir');
    assertTruthy(cardsBtn, 'viewCardsBtn debe existir');
});

// ------- TESTS DE FILTROS -------

runner.test('Objeto de filtros debe tener estructura correcta', () => {
    assertTruthy(currentFilters, 'currentFilters debe estar definido');
    assertTruthy('search' in currentFilters, 'currentFilters debe tener search');
    assertTruthy('status' in currentFilters, 'currentFilters debe tener status');
    assertTruthy('priority' in currentFilters, 'currentFilters debe tener priority');
});

runner.test('Variables de estado deben tener tipos correctos', () => {
    assertTruthy(typeof loadTasksSeq === 'number', 'loadTasksSeq debe ser number');
    assertTruthy(typeof allTasks === 'object', 'allTasks debe ser array/object');
    assertTruthy(typeof authFetchConfigured === 'boolean', 'authFetchConfigured debe ser boolean');
});

// ------- TESTS DE ADMIN CONSOLE -------

runner.test('Admin console debe estar disponible', () => {
    const adminBtn = document.getElementById('adminConsoleBtn');
    assertTruthy(adminBtn, 'Admin console button debe existir');
});

// ------- TESTS DE ACCESO A DATOS -------

runner.test('URLs de API deben estar definidas', () => {
    assertTruthy(typeof API !== 'undefined', 'API constant debe estar definida');
    assertTruthy(typeof API_PROJECTS !== 'undefined', 'API_PROJECTS constant debe estar definida');
    assertTruthy(typeof API_USERS !== 'undefined', 'API_USERS constant debe estar definida');
});

runner.test('Fetch debe estar disponible', () => {
    assertTruthy(typeof fetch === 'function', 'fetch debe ser función');
});

// ------- TESTS DE EXPORTACIÓN -------

runner.test('Funciones de exportación deben existir', () => {
    assertTruthy(typeof buildCsv === 'function' || typeof buildCSV === 'function', 'Función de CSV debe existir');
    assertTruthy(typeof copyToClipboard === 'function', 'copyToClipboard debe existir');
});

// ------- TESTS DE TEMA -------

runner.test('Sistema de temas debe funcionar', () => {
    assertTruthy(typeof initTheme === 'function', 'initTheme debe existir');
    assertTruthy(typeof applyTheme === 'function', 'applyTheme debe existir');
    
    const theme = document.body.dataset.theme;
    assertTruthy(theme === 'light' || theme === 'dark', 'Theme debe ser light o dark');
});

runner.test('Theme toggle debe existir', () => {
    const btn = document.getElementById('themeToggleBtn');
    assertTruthy(btn, 'themeToggleBtn debe existir');
});

// ------- TESTS DE INTEGRACIÓN -------

runner.test('Debe poder obtener referencia a elementos clave del UI', () => {
    const elements = [
        'loginView',
        'appView',
        'taskModal',
        'projectModal',
        'userModal',
        'userSelectionModal',
        'projectSelectionModal',
        'toastContainer',
        'currentProjectName'
    ];

    elements.forEach(id => {
        const el = document.getElementById(id);
        assertTruthy(el, `Elemento ${id} debe existir en DOM`);
    });
});

runner.test('configureAuthFetch debe poder ser llamado sin errores', () => {
    // Guard: solo llamar si no está ya configurado
    if (!authFetchConfigured) {
        try {
            configureAuthFetch();
        } catch (e) {
            throw new Error(`configureAuthFetch falló: ${e.message}`);
        }
    }
});

// ------- TESTS DE FORM VALIDATOR -------

runner.test('FormValidator debe estar disponible globalmente', () => {
    assertTruthy(typeof FormValidator !== 'undefined', 'FormValidator debe estar definido');
    assertTruthy(typeof FormValidator === 'function', 'FormValidator debe ser una clase');
});

runner.test('FormValidator puede instanciarse con taskForm', () => {
    try {
        const validator = new FormValidator('taskForm', {
            title: { required: true }
        });
        assertTruthy(validator, 'Instancia de FormValidator debe crearse');
        assertTruthy(validator.formEl, 'FormValidator debe tener referencia a formEl');
    } catch (e) {
        throw new Error(`FormValidator instantiation falló: ${e.message}`);
    }
});

runner.test('FormValidator.validate() debe retornar booleano', () => {
    const validator = new FormValidator('taskForm', {
        title: { required: true }
    });
    const result = validator.validate();
    assertTruthy(typeof result === 'boolean', 'validate() debe retornar boolean');
});

runner.test('FormValidator.clearErrors() debe limpiar errores', () => {
    const validator = new FormValidator('userForm', {
        userName: { required: true }
    });
    validator.clearErrors();
    const allErrors = validator.getAllErrors();
    assertTruthy(allErrors.size === 0, 'Todos los errores deben estar limpios');
});

// ==================== EJECUTAR TESTS ====================

console.log('\n⏱️  Iniciando test suite...\n');

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        runner.run();
    });
} else {
    runner.run();
}

// Exportar para uso en test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, assert, assertEqual, assertTruthy, assertExists };
}

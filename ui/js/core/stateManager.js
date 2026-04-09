/**
 * StateManager.js
 * 
 * Gestión centralizada de estado de la aplicación.
 * 
 * Beneficios:
 * - Estado único y predecible
 * - Watchers automáticos para reactividad
 * - Sincronización automática con localStorage
 * - Debugging fácil
 * - No requiere cambios en HTML
 */

class StateManager {
    constructor(options = {}) {
        // Estado inicial estructurado
        this.state = {
            auth: {
                token: null,
                enabled: false,
                user: null,
                role: null
            },
            ui: {
                viewMode: 'table',
                theme: 'light',
                currentLanguage: 'es',
                filters: {
                    search: '',
                    status: '',
                    priority: '',
                    dateFrom: '',
                    dateTo: ''
                }
            },
            data: {
                currentProjectId: null,
                currentUserId: null,
                tasks: [],
                filteredTasks: [],
                projects: new Map(),
                users: [],
                loadingTasks: false,
                loadingProjects: false,
                loadingUsers: false
            },
            forms: {
                taskEditId: null,
                projectEditId: null,
                validationErrors: {}
            }
        };

        // Sistema de watchers
        this.watchers = new Map();
        
        // Opciones
        this.options = {
            persistKey: 'stackdo_',
            persistedPaths: [
                'auth.token',
                'ui.viewMode',
                'ui.theme',
                'data.currentProjectId',
                'data.currentUserId'
            ],
            ...options
        };

        // Restaurar desde localStorage
        this.restoreFromLocalStorage();

        // Emitir evento de inicialización
        this.emit('state:initialized');
    }

    /**
     * Obtener valor del estado
     * @param {string} path - Ruta de punto (ej: "auth.token", "data.tasks")
     * @returns {any} Valor en la ruta
     */
    getState(path) {
        if (!path) return this.state;
        
        const keys = path.split('.');
        let obj = this.state;
        
        for (const key of keys) {
            if (obj === null || obj === undefined) return undefined;
            obj = obj[key];
        }
        
        return obj;
    }

    /**
     * Establecer valor del estado
     * @param {string} path - Ruta de punto
     * @param {any} value - Nuevo valor
     */
    setState(path, value) {
        const keys = path.split('.');
        let obj = this.state;
        let oldValue = this.getState(path);

        // Navegar hasta el penúltimo nivel
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in obj)) {
                obj[key] = {};
            }
            obj = obj[key];
        }

        // Establecer el valor
        const lastKey = keys[keys.length - 1];
        obj[lastKey] = value;

        // Disparar watchers
        this.notifyWatchers(path, value, oldValue);

        // Persistir si aplica
        if (this.options.persistedPaths.includes(path)) {
            this.persistToLocalStorage(path, value);
        }

        // Emitir evento genérico
        this.emit('state:changed', { path, newValue: value, oldValue });

        return value;
    }

    /**
     * Actualizar múltiples valores
     * @param {object} updates - Objeto con múltiples actualizaciones
     */
    setStates(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            this.setState(path, value);
        });
    }

    /**
     * Registrar watcher para cambios de estado
     * @param {string} path - Ruta de punto
     * @param {function} callback - Función a ejecutar
     * @returns {function} Función para desuscribirse
     */
    watch(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, new Set());
        }
        
        this.watchers.get(path).add(callback);

        // Retornar función para unsubscribe
        return () => {
            const callbacks = this.watchers.get(path);
            callbacks.delete(callback);
        };
    }

    /**
     * Disparar watchers para una ruta
     * @private
     */
    notifyWatchers(path, newVal, oldVal) {
        // Watchers para la ruta exacta
        if (this.watchers.has(path)) {
            this.watchers.get(path).forEach(callback => {
                try {
                    callback(newVal, oldVal, path);
                } catch (e) {
                    console.error(`Error en watcher para ${path}:`, e);
                }
            });
        }

        // Watchers para rutas padre (wildcard)
        const parts = path.split('.');
        for (let i = 0; i < parts.length; i++) {
            const parentPath = parts.slice(0, i).join('.');
            if (this.watchers.has(parentPath + '*')) {
                this.watchers.get(parentPath + '*').forEach(callback => {
                    try {
                        callback(newVal, oldVal, path);
                    } catch (e) {
                        console.error(`Error en watcher wildcard:`, e);
                    }
                });
            }
        }
    }

    /**
     * Sistema de eventos
     */
    on(event, callback) {
        if (!this.watchers.has(`event:${event}`)) {
            this.watchers.set(`event:${event}`, new Set());
        }
        this.watchers.get(`event:${event}`).add(callback);
        
        return () => {
            this.watchers.get(`event:${event}`).delete(callback);
        };
    }

    emit(event, data) {
        if (this.watchers.has(`event:${event}`)) {
            this.watchers.get(`event:${event}`).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error en evento ${event}:`, e);
                }
            });
        }
    }

    /**
     * Persistir valor en localStorage
     * @private
     */
    persistToLocalStorage(path, value) {
        try {
            const key = this.options.persistKey + path;
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`Error persistiendo ${path}:`, e);
        }
    }

    /**
     * Restaurar valores de localStorage
     * @private
     */
    restoreFromLocalStorage() {
        this.options.persistedPaths.forEach(path => {
            const key = this.options.persistKey + path;
            const stored = localStorage.getItem(key);
            
            if (stored !== null) {
                try {
                    const value = JSON.parse(stored);
                    // Usar seteo directo para evitar triggers de watchers durante init
                    const keys = path.split('.');
                    let obj = this.state;
                    
                    for (let i = 0; i < keys.length - 1; i++) {
                        obj = obj[keys[i]];
                    }
                    
                    obj[keys[keys.length - 1]] = value;
                } catch (e) {
                    console.warn(`Error restaurando ${path}:`, e);
                }
            }
        });
    }

    /**
     * Limpiar estado
     */
    reset() {
        // Reset a estado inicial
        Object.keys(this.state).forEach(key => {
            if (key !== 'ui') { // Preservar UI preferences
                this.state[key] = {};
            }
        });

        // Limpiar localStorage de datos sensibles
        [
            'auth.token',
            'auth.user',
            'auth.role',
            'data.currentProjectId',
            'data.currentUserId'
        ].forEach(path => {
            localStorage.removeItem(this.options.persistKey + path);
        });

        this.emit('state:reset');
    }

    /**
     * Exportar estado (para debugging)
     */
    export() {
        return JSON.stringify(this.state, (key, value) => {
            if (value instanceof Map) {
                return Array.from(value.entries());
            }
            if (value instanceof Set) {
                return Array.from(value);
            }
            return value;
        }, 2);
    }

    /**
     * Debugging: inspect estado
     */
    inspect(path) {
        const value = this.getState(path);
        console.table(value);
        return value;
    }
}

// Crear instancia global
const state = new StateManager();

// Exponerla globalmente para acceso desde console
window.STATE = state;
window.INSPECT_STATE = (path) => state.inspect(path);

// Logging en development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    state.on('state:changed', ({ path, newValue, oldValue }) => {
        if (!path.startsWith('data.tasks')) { // Evitar spam
            console.log(`[STATE] ${path}: ${oldValue} → ${newValue}`);
        }
    });
}

/**
 * ModalManager.js
 * 
 * Gestión centralizada de modales Bootstrap.
 * 
 * Características:
 * - Una única instancia de Modal por ID (no duplicadas)
 * - Stack de modales automático
 * - Limpieza de backdrops automática
 * - Modo obligatorio configurable
 * - Eventos para coordinación
 * - No requiere cambios en HTML
 */

class ModalManager {
    constructor(options = {}) {
        this.instances = new Map();
        this.stack = [];
        this.config = {
            backdrop: 'static',
            keyboard: false,
            focus: true,
            ...options
        };

        // Sistema de eventos
        this.listeners = new Map();

        // Auto-registrar todos los modales
        this.autoRegisterModals();

        // Escuchar eventos de Bootstrap
        this.setupBootstrapListeners();
    }

    /**
     * Auto-registrar modales que existan en el DOM
     * @private
     */
    autoRegisterModals() {
        document.querySelectorAll('[id$="Modal"]').forEach(modalEl => {
            this.register(modalEl.id);
        });
    }

    /**
     * Registrar un modal
     * @param {string} id - ID del modal
     * @param {object} options - Opciones de configuración
     * @returns {bootstrap.Modal} Instancia de Modal
     */
    register(id, options = {}) {
        // Si ya existe, retornar la existente
        if (this.instances.has(id)) {
            return this.instances.get(id);
        }

        const modalEl = document.getElementById(id);
        if (!modalEl) {
            console.warn(`Modal ${id} no encontrado en DOM`);
            return null;
        }

        // Crear instancia con opciones mergeadas
        const finalConfig = { ...this.config, ...options };
        const instance = new bootstrap.Modal(modalEl, finalConfig);

        // Almacenar
        this.instances.set(id, instance);

        // Configurar cleanup de backdrop al cerrar
        modalEl.addEventListener('hidden.bs.modal', () => {
            setTimeout(() => this.cleanupBackdrops(), 50);
        });

        return instance;
    }

    /**
     * Obtener o registrar una instancia
     * @param {string} id - ID del modal
     * @returns {bootstrap.Modal | null}
     */
    getInstance(id) {
        return this.instances.get(id) || this.register(id);
    }

    /**
     * Mostrar un modal
     * @param {string} id - ID del modal
     * @param {object} options - Opciones adicionales
     */
    show(id, options = {}) {
        const instance = this.getInstance(id);
        if (!instance) return;

        // Limpiar backdrops antes de mostrar
        this.cleanupBackdrops();

        // Agregar al stack
        if (!this.stack.includes(id)) {
            this.stack.push(id);
        }

        // Mostrar con potencial delay para animación
        setTimeout(() => {
            instance.show();
            this.emit('show', { id });
        }, 0);
    }

    /**
     * Cerrar un modal
     * @param {string} id - ID del modal
     * @param {boolean} cleanup - Si ejecutar cleanup automático
     */
    hide(id, cleanup = true) {
        const instance = this.getInstance(id);
        if (!instance) return;

        // Remover del stack
        this.stack = this.stack.filter(m => m !== id);

        // Cerrar
        instance.hide();
        this.emit('hide', { id });

        // Cleanup
        if (cleanup) {
            setTimeout(() => this.cleanupBackdrops(), 100);
        }
    }

    /**
     * Cerrar todos los modales
     */
    hideAll() {
        const stackCopy = [...this.stack];
        stackCopy.forEach(id => this.hide(id, false));
        this.cleanupBackdrops();
    }

    /**
     * Verificar si un modal está abierto
     * @param {string} id - ID del modal
     * @returns {boolean}
     */
    isOpen(id) {
        const instance = this.getInstance(id);
        if (!instance) return false;

        const modalEl = instance._element;
        return modalEl.classList.contains('show');
    }

    /**
     * Obtener modal activo (el más reciente del stack)
     * @returns {string | null}
     */
    getActiveModal() {
        return this.stack[this.stack.length - 1] || null;
    }

    /**
     * Establecer modo obligatorio (no se puede cerrar)
     * @param {string} id - ID del modal
     * @param {boolean} mandatory - True = obligatorio
     */
    setMandatory(id, mandatory = true) {
        const modalEl = document.getElementById(id);
        if (!modalEl) return;

        // Ocultar botón de cerrar
        const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]');
        if (closeBtn) {
            closeBtn.classList.toggle('d-none', mandatory);
        }

        // Configurar instancia
        const instance = this.getInstance(id);
        if (instance) {
            instance._config.backdrop = mandatory ? 'static' : true;
            instance._config.keyboard = !mandatory;
        }
    }

    /**
     * Limpiar backdrops huérfanos
     * @private
     */
    cleanupBackdrops() {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        
        // Mantener solo el último si hay múltiples
        if (backdrops.length > 1) {
            Array.from(backdrops).slice(0, -1).forEach(backdrop => {
                backdrop.remove();
            });
        }

        // Si no hay modales abiertos pero quedan backdrops, limpiar
        if (this.stack.length === 0 && backdrops.length > 0) {
            backdrops.forEach(backdrop => backdrop.remove());
        }
    }

    /**
     * Escuchar eventos de Bootstrap
     * @private
     */
    setupBootstrapListeners() {
        document.addEventListener('show.bs.modal', (event) => {
            const id = event.target.id;
            if (!this.stack.includes(id)) {
                this.stack.push(id);
            }
        });

        document.addEventListener('hidden.bs.modal', (event) => {
            const id = event.target.id;
            this.stack = this.stack.filter(m => m !== id);
            this.cleanupBackdrops();
        });
    }

    /**
     * Sistema de eventos
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Retornar función para unsubscribe
        return () => {
            this.listeners.get(event).delete(callback);
        };
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error en evento ${event}:`, e);
                }
            });
        }
    }

    /**
     * Debugging
     */
    getState() {
        return {
            stack: [...this.stack],
            active: this.getActiveModal(),
            registered: Array.from(this.instances.keys()),
            backdrops: document.querySelectorAll('.modal-backdrop').length
        };
    }

    inspect() {
        console.table(this.getState());
        return this.getState();
    }
}

// Crear instancia global
const modals = new ModalManager();

// Exponerla globalmente
window.MODALS = modals;
window.INSPECT_MODALS = () => modals.inspect();

// Aliases para compatibilidad con código existente
window.getModalInstance = (id) => modals.getInstance(id);
window.safeShowModal = (id, options) => modals.show(id, options);
window.safeHideModal = (id) => modals.hide(id);
window.cleanupOrphanBackdrops = () => modals.cleanupBackdrops();

// Logging en development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    modals.on('show', ({ id }) => console.log(`[MODAL] show: ${id}`));
    modals.on('hide', ({ id }) => console.log(`[MODAL] hide: ${id}`));
}

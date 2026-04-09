/**
 * FORM VALIDATOR
 * 
 * Sistema de validación de formularios reutilizable con Bootstrap 5 integration.
 * Proporciona validación en tiempo real, mensajes de error visuales, y manejo de estados.
 * 
 * Uso:
 *   const validator = new FormValidator('taskForm', {
 *       title: { required: true, minLength: 3, maxLength: 200 },
 *       desc: { maxLength: 255 },
 *       email: { pattern: 'email' }
 *   });
 * 
 *   // Validar en tiempo real
 *   validator.watchField('title', 'input');
 * 
 *   // Validar completo antes de enviar
 *   if (validator.validate()) { ... }
 */

class FormValidator {
    constructor(formId, rules = {}) {
        this.formEl = document.getElementById(formId);
        if (!this.formEl) {
            throw new Error(`Form with id "${formId}" not found`);
        }

        this.formId = formId;
        this.rules = rules;
        this.fields = new Map();
        this.errors = new Map();
        this.touched = new Set();

        // Patrones de validación comunes
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            url: /^https?:\/\/.+/,
            number: /^\d+$/,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            slug: /^[a-z0-9-]+$/
        };

        this._initFields();
    }

    /**
     * Inicializa referencias a los campos del formulario
     */
    _initFields() {
        const inputs = this.formEl.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            const fieldName = input.id;
            if (fieldName) {
                this.fields.set(fieldName, input);
            }
        });
    }

    /**
     * Vigila un campo para validación en tiempo real
     * @param {string} fieldName - ID del campo
     * @param {string} eventType - 'input', 'change', 'blur' (default: 'blur')
     */
    watchField(fieldName, eventType = 'blur') {
        const field = this.fields.get(fieldName);
        if (!field) return;

        field.addEventListener(eventType, () => {
            this.validateField(fieldName);
            this._updateFieldVisuals(fieldName);
        });

        // También validar al salir del campo
        if (eventType !== 'blur') {
            field.addEventListener('blur', () => {
                this.touched.add(fieldName);
                this._updateFieldVisuals(fieldName);
            });
        }
    }

    /**
     * Vigila todos los campos
     * @param {string} eventType - Tipo de evento
     */
    watchAllFields(eventType = 'blur') {
        const fieldNames = Array.from(this.fields.keys());
        fieldNames.forEach(name => this.watchField(name, eventType));
    }

    /**
     * Valida un único campo
     * @param {string} fieldName - ID del campo
     * @returns {boolean} true si válido
     */
    validateField(fieldName) {
        const field = this.fields.get(fieldName);
        if (!field) return true;

        const rules = this.rules[fieldName];
        const value = field.value.trim();
        const errors = [];

        if (!rules) {
            this.errors.delete(fieldName);
            return true;
        }

        // Validación: required
        if (rules.required && !value) {
            errors.push('Este campo es requerido');
        }

        // Si está vacío y no es requerido, saltamos validaciones
        if (!value && !rules.required) {
            this.errors.delete(fieldName);
            return true;
        }

        // Validación: minLength
        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`Mínimo ${rules.minLength} caracteres`);
        }

        // Validación: maxLength
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Máximo ${rules.maxLength} caracteres`);
        }

        // Validación: pattern
        if (rules.pattern) {
            const pattern = typeof rules.pattern === 'string' 
                ? this.patterns[rules.pattern]
                : rules.pattern;
            
            if (pattern && !pattern.test(value)) {
                errors.push(rules.patternMessage || 'Formato inválido');
            }
        }

        // Validación: custom
        if (rules.custom && typeof rules.custom === 'function') {
            const customError = rules.custom(value, field);
            if (customError) {
                errors.push(customError);
            }
        }

        // Validación: match (e.g., confirm password)
        if (rules.match) {
            const otherField = this.fields.get(rules.match);
            if (otherField && value !== otherField.value) {
                errors.push(rules.matchMessage || 'Los valores no coinciden');
            }
        }

        // Almacenar errores
        if (errors.length > 0) {
            this.errors.set(fieldName, errors);
            return false;
        } else {
            this.errors.delete(fieldName);
            return true;
        }
    }

    /**
     * Valida todo el formulario
     * @returns {boolean} true si todo es válido
     */
    validate() {
        let isValid = true;
        const fieldNames = Array.from(this.fields.keys());

        fieldNames.forEach(fieldName => {
            if (!this.validateField(fieldName)) {
                isValid = false;
            }
            this.touched.add(fieldName);
            this._updateFieldVisuals(fieldName);
        });

        return isValid;
    }

    /**
     * Actualiza visuals del campo (clases y mensajes de error)
     * @private
     */
    _updateFieldVisuals(fieldName) {
        const field = this.fields.get(fieldName);
        if (!field) return;

        const hasError = this.errors.has(fieldName);
        const isTouched = this.touched.has(fieldName);
        const wrapper = field.closest('.col-12, .col-md-6, .mb-3, .mb-2') || field.parentElement;

        // Limpiar clases anteriores
        field.classList.remove('is-invalid', 'is-valid');

        // Remover feedback anterior
        const oldFeedback = wrapper.querySelector('.invalid-feedback');
        if (oldFeedback) oldFeedback.remove();

        // Aplicar nuevas clases y feedback
        if (isTouched || hasError) {
            if (hasError) {
                field.classList.add('is-invalid');

                // Crear elemento de feedback
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback d-block';
                const errorMessages = this.errors.get(fieldName);
                feedback.textContent = errorMessages[0]; // Mostrar primer error

                wrapper.appendChild(feedback);
            } else {
                field.classList.add('is-valid');
            }
        }
    }

    /**
     * Obtiene errores de un campo
     * @param {string} fieldName - ID del campo
     * @returns {Array} Array de mensajes de error
     */
    getFieldErrors(fieldName) {
        return this.errors.get(fieldName) || [];
    }

    /**
     * Obtiene todos los errores
     * @returns {Object} Map de fieldName -> errores
     */
    getAllErrors() {
        return new Map(this.errors);
    }

    /**
     * Resetea el formulario
     */
    reset() {
        this.formEl.reset();
        this.errors.clear();
        this.touched.clear();

        // Limpiar clases de validación
        this.fields.forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
            const feedback = field.parentElement.querySelector('.invalid-feedback');
            if (feedback) feedback.remove();
        });
    }

    /**
     * Resetea errores pero no el formulario
     */
    clearErrors() {
        this.errors.clear();
        this.touched.clear();
        this.fields.forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
            const feedback = field.parentElement.querySelector('.invalid-feedback');
            if (feedback) feedback.remove();
        });
    }

    /**
     * Obtiene los valores del formulario como objeto
     * @returns {Object} { fieldName: value, ... }
     */
    getValues() {
        const values = {};
        this.fields.forEach((field, fieldName) => {
            values[fieldName] = field.value;
        });
        return values;
    }

    /**
     * Asigna valores al formulario
     * @param {Object} values - { fieldName: value, ... }
     */
    setValues(values) {
        Object.entries(values).forEach(([fieldName, value]) => {
            const field = this.fields.get(fieldName);
            if (field) {
                field.value = value;
            }
        });
    }

    /**
     * Enfoca el primer campo con error
     */
    focusFirstError() {
        for (const [fieldName] of this.errors) {
            const field = this.fields.get(fieldName);
            if (field) {
                field.focus();
                break;
            }
        }
    }
}

// Exportar para uso global
window.FormValidator = FormValidator;

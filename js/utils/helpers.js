// Utilidades generales
const Utils = {
    // Selección segura de elementos
    qs(selector, context = document) {
        return context.querySelector(selector);
    },
    
    qsa(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    },
    
    // Debounce para eventos
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Formatear números
    formatNumber(num) {
        return new Intl.NumberFormat('es-PE').format(num);
    },
    
    // Guardar en localStorage con manejo de errores
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Error guardando en localStorage:', e);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Error leyendo localStorage:', e);
                return defaultValue;
            }
        },
        
        remove(key) {
            localStorage.removeItem(key);
        }
    },
    
    // Validar email
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    // Generar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Copiar al portapapeles
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Error al copiar:', err);
            return false;
        }
    }
};

// Exportar para módulos o usar globalmente
window.Utils = Utils;
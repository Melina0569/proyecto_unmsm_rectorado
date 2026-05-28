class Toast {
    constructor(options = {}) {
        this.container = null;
        this.defaults = {
            duration: 3000,
            position: 'top-right',
            ...options
        };
        this.init();
    }
    
    init() {
        // Crear contenedor si no existe
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }
    
    show(message, type = 'info') {
        const toast = document.createElement('div');
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-amber-500',
            info: 'bg-blue-500'
        };
        
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        
        toast.className = `
            ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl 
            flex items-center gap-3 min-w-[300px] transform translate-x-full 
            transition-all duration-300
        `;
        
        toast.innerHTML = `
            <span class="material-icons-round">${icons[type]}</span>
            <span class="font-medium">${message}</span>
            <button class="ml-auto opacity-75 hover:opacity-100">
                <span class="material-icons-round text-sm">close</span>
            </button>
        `;
        
        // Botón cerrar
        toast.querySelector('button').addEventListener('click', () => {
            this.hide(toast);
        });
        
        this.container.appendChild(toast);
        
        // Animación de entrada
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });
        
        // Auto-cerrar
        setTimeout(() => this.hide(toast), this.defaults.duration);
    }
    
    hide(toast) {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }
    
    // Métodos de conveniencia
    success(message) { this.show(message, 'success'); }
    error(message) { this.show(message, 'error'); }
    warning(message) { this.show(message, 'warning'); }
    info(message) { this.show(message, 'info'); }
}

// Singleton global
window.toast = new Toast();
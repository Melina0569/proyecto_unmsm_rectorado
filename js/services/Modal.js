class Modal {
    constructor(id, options = {}) {
        this.id = id;
        this.element = document.getElementById(id);
        this.options = {
            closeOnOverlay: true,
            closeOnEscape: true,
            ...options
        };
        
        if (this.element) {
            this.init();
        }
    }
    
    init() {
        // Cerrar con overlay
        if (this.options.closeOnOverlay) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) this.close();
            });
        }
        
        // Cerrar con Escape
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen()) this.close();
            });
        }
        
        // Botones de cerrar
        this.element.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
    }
    
    open() {
        this.element.classList.remove('hidden');
        this.element.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        // Animación
        requestAnimationFrame(() => {
            this.element.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
            this.element.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
        });
        
        this.element.dispatchEvent(new CustomEvent('modal:open'));
    }
    
    close() {
        const content = this.element.querySelector('.modal-content');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            this.element.classList.add('hidden');
            this.element.classList.remove('flex');
            document.body.style.overflow = '';
            this.element.dispatchEvent(new CustomEvent('modal:close'));
        }, 200);
    }
    
    isOpen() {
        return !this.element.classList.contains('hidden');
    }
    
    setContent(html) {
        const body = this.element.querySelector('.modal-body');
        if (body) body.innerHTML = html;
    }
    
    setTitle(title) {
        const titleEl = this.element.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = title;
    }
}

// Gestor de modales
window.ModalManager = {
    modals: {},
    
    register(id, options) {
        this.modals[id] = new Modal(id, options);
        return this.modals[id];
    },
    
    open(id) {
        this.modals[id]?.open();
    },
    
    close(id) {
        this.modals[id]?.close();
    }
};
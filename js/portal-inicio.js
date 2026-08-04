/**
 * Portal Inicio - Gestión Institucional
 * Universidad Nacional Mayor de San Marcos
 * Sistema de Racionalización v2.0
 */

// ============================================
// DARK MODE TOGGLE
// ============================================

(function() {
    'use strict';

    // Elementos del DOM
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // ============================================
    // FUNCIONES DE UTILIDAD
    // ============================================

    /**
     * Obtiene el tema guardado en localStorage
     * @returns {string|null} 'dark', 'light' o null
     */
    function getSavedTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            console.warn('No se pudo acceder a localStorage:', e);
            return null;
        }
    }

    /**
     * Guarda el tema en localStorage
     * @param {string} theme - 'dark' o 'light'
     */
    function saveTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    }

    /**
     * Detecta la preferencia del sistema operativo
     * @returns {boolean} true si prefiere dark mode
     */
    function getSystemPreference() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Aplica el tema al documento
     * @param {string} theme - 'dark' o 'light'
     */
    function applyTheme(theme) {
        if (theme === 'dark') {
            html.classList.remove('light');
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
            html.classList.add('light');
        }
        
        // Disparar evento personalizado para otros componentes
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: theme }
        }));
    }

    /**
     * Alterna entre temas
     */
    function toggleTheme() {
        const isDark = html.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';
        
        applyTheme(newTheme);
        saveTheme(newTheme);
    }

    /**
     * Inicializa el tema al cargar la página
     */
    function initTheme() {
        const savedTheme = getSavedTheme();
        
        if (savedTheme) {
            // Usar tema guardado
            applyTheme(savedTheme);
        } else {
            // Detectar preferencia del sistema
            const systemDark = getSystemPreference();
            applyTheme(systemDark ? 'dark' : 'light');
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    // Botón de toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleTheme();
        });

        // Soporte para teclado (accesibilidad)
        themeToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    // Escuchar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function(e) {
        // Solo cambiar si el usuario no ha establecido preferencia manual
        if (!getSavedTheme()) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // ============================================
    // INICIAR
    // ============================================

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Exponer función global para uso externo si es necesario
    window.PortalTheme = {
        toggle: toggleTheme,
        set: applyTheme,
        get: function() {
            return html.classList.contains('dark') ? 'dark' : 'light';
        }
    };

})();

// ============================================
// EFECTOS ADICIONALES
// ============================================

/**
 * Efecto parallax suave para las burbujas al mover el mouse
 */
(function() {
    'use strict';

    const bubbles = document.querySelectorAll('.bubble');
    let ticking = false;

    function updateBubbles(x, y) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        bubbles.forEach((bubble, index) => {
            const speed = (index + 1) * 0.02;
            const offsetX = (x - centerX) * speed;
            const offsetY = (y - centerY) * speed;

            bubble.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });

        ticking = false;
    }

    document.addEventListener('mousemove', function(e) {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                updateBubbles(e.clientX, e.clientY);
            });
            ticking = true;
        }
    });

})();

/**
 * Animación de entrada para las cards al cargar
 */
(function() {
    'use strict';

    const cards = document.querySelectorAll('.glass-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry, index) {
            if (entry.isIntersecting) {
                setTimeout(function() {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach(function(card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

})();

// ============================================
// EFECTOS ADICIONALES
// ============================================

/**
 * Efecto parallax suave para las burbujas al mover el mouse
 */
(function() {
    'use strict';
    // ... (tu código actual de burbujas)
})();

/**
 * Animación de entrada para las cards al cargar
 */
(function() {
    'use strict';
    // ... (tu código actual de cards)
})();

// ============================================
// REDIRECCIÓN AL PRESIONAR "ATRÁS"
// ============================================

(function() {
    'use strict';

    // Preparar el historial para interceptar el botón "Atrás"
    history.pushState(null, null, location.href);

    window.addEventListener('popstate', function () {
        window.location.href = 'index.html';
    });
})();
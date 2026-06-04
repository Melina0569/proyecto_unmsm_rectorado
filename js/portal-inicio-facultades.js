/**
 * Portal Inicio Facultades - Login
 * Universidad Nacional Mayor de San Marcos
 * Sistema de Racionalización v2.0
 */

// ============================================
// DARK MODE TOGGLE - ESTILO UNIFICADO
// ============================================

(function() {
    'use strict';

    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Funciones de utilidad
    function getSavedTheme() {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            console.warn('No se pudo acceder a localStorage:', e);
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    }

    function getSystemPreference() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            html.classList.remove('light');
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
            html.classList.add('light');
        }
        
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: theme }
        }));
    }

    function toggleTheme() {
        const isDark = html.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';
        
        applyTheme(newTheme);
        saveTheme(newTheme);
    }

    function initTheme() {
        const savedTheme = getSavedTheme();
        
        if (savedTheme) {
            applyTheme(savedTheme);
        } else {
            const systemDark = getSystemPreference();
            applyTheme(systemDark ? 'dark' : 'light');
        }
    }

    // Event listeners
    if (themeToggle) {
        themeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleTheme();
        });

        themeToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    // Escuchar cambios del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function(e) {
        if (!getSavedTheme()) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Exponer globalmente
    window.PortalTheme = {
        toggle: toggleTheme,
        set: applyTheme,
        get: function() {
            return html.classList.contains('dark') ? 'dark' : 'light';
        }
    };

})();

// ============================================
// MANEJO DEL FORMULARIO DE LOGIN - API REAL UNMSM
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const correo = document.getElementById('correo').value.trim();
            const password = document.getElementById('password').value;
            
            if (!correo || !password) {
                showNotification('Por favor, complete todos los campos.', 'error');
                return;
            }
            
            if (!correo.endsWith('@unmsm.edu.pe')) {
                showNotification('Debe usar un correo institucional @unmsm.edu.pe', 'error');
                return;
            }
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> <span>Verificando...</span>';
            
            try {
                // ✅ LLAMADA A LA API - ya hace persistSession internamente
                const result = await API.auth.login(correo, password);
                
                if (result.success) {
                    // ✅ API.auth.login YA guardó el token y usuario en localStorage
                    // Solo verificamos que se guardó correctamente
                    const user = API.auth.getUser();
                    console.log('Usuario autenticado:', user);
                    
                    showNotification('¡Bienvenido! Redirigiendo...', 'success');

                    // Detectar rol para redirección
                    const roleText = String(user?.rol || user?.role || '').toLowerCase();
                    const isAdmin = roleText.includes('admin');

                    setTimeout(() => {
                        if (isAdmin) {
                            window.location.href = 'portal-inicio-racio.html';
                        } else {
                            window.location.href = 'facultades-inicio.html';
                        }
                    }, 1500);
                } else {
                    showNotification(result.error || 'Credenciales incorrectas', 'error');
                }
            } catch (error) {
                console.error('Error en login:', error);
                showNotification(
                    'Error de conexión. ' + (error.message?.includes('timeout') 
                        ? 'El servidor está iniciando, espere 60 segundos e intente de nuevo.' 
                        : 'Intente nuevamente.'), 
                    'error'
                );
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
});

// ============================================
// NOTIFICACIONES
// ============================================

function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg glass-card transform transition-all duration-300 translate-x-full opacity-0`;
    
    const colors = {
        success: 'text-green-600 dark:text-green-400',
        error: 'text-red-600 dark:text-red-400',
        info: 'text-primary dark:text-blue-400'
    };
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };
    
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="material-symbols-outlined ${colors[type]}">${icons[type]}</span>
            <span class="text-slate-700 dark:text-slate-200 font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    requestAnimationFrame(function() {
        notification.classList.remove('translate-x-full', 'opacity-0');
    });
    
    // Remover después de 3 segundos
    setTimeout(function() {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(function() {
            notification.remove();
        }, 300);
    }, 3000);
}

// ============================================
// EFECTOS ADICIONALES
// ============================================

// Efecto parallax para burbujas
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
// ============================================
// REDIRECCIÓN AL RETROCEDER CON BOTÓN DEL NAVEGADOR
// ============================================

(function() {
    'use strict';

    // Solo aplicar en páginas específicas (login y solicitud de acceso)
    const currentPage = window.location.pathname.split('/').pop();
    const pagesToRedirect = ['portal-inicio-racio.html', 'portal-inicio-facultades.html'];

    if (!pagesToRedirect.includes(currentPage)) return;

    // Guardar la página de destino según la página actual
    const redirectTarget = 'portal-inicio.html';

    // Reemplazar entrada actual en historial y agregar entrada dummy
    history.replaceState({ page: 'redirect' }, '', redirectTarget);
    history.pushState({ page: 'current' }, '', window.location.href);

    // Interceptar el evento popstate (botón Atrás del navegador)
    window.addEventListener('popstate', function(event) {
        // Si el estado indica que debe redirigir, ir a portal-inicio.html
        if (event.state && event.state.page === 'redirect') {
            window.location.replace(redirectTarget);
        }
    });

})();
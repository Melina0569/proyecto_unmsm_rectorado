/**
 * SIGPRO - Facultades Nuevo JavaScript
 * Maneja la funcionalidad de creación de documentos con API híbrida
 */

// ============================================
// CONFIGURACIÓN
// ============================================

const APP_CONFIG = {
    selectors: {
        profileBtn: '#profile-btn',
        profileDropdown: '#profile-dropdown',
        logoutBtn: '#logout-btn',
        logoutModal: '#logout-modal',
        logoutCancel: '#logout-cancel',
        logoutConfirm: '#logout-confirm',
        themeToggle: '#theme-toggle',
        toastContainer: '#toast-container',
        loadingState: '#loading-state',
        profileNombre: '#profile-nombre',
        profileEmail: '#profile-email',
        profileIniciales: '#profile-iniciales',
        profileRol: '#profile-rol',
        profileFacultad: '#profile-facultad',
        profileAvatar: '#profile-avatar'
    }
};

// Mapeo de tipos de documentos con URLs de creación
const DOCUMENT_TYPES = {
    indicador: {
        name: 'Ficha de Indicador',
        icon: 'add_chart',
        color: 'orange',
        // En esta carpeta solo existe ficha-indicador.html (sin '-nuevo')
        url: 'ficha-indicador.html',
        apiEndpoint: '/indicadores'
    },
    tecnica: {
        name: 'Ficha Técnica',
        icon: 'description',
        color: 'blue',
        // En esta carpeta solo existe ficha-caracterizacion.html (sin '-nuevo')
        url: 'ficha-caracterizacion.html',
        apiEndpoint: '/documentos'
    },
    flujograma: {
        name: 'Ficha de Flujograma',
        icon: 'account_tree',
        color: 'cyan',
        // En esta carpeta solo existe ficha-flujograma.html (sin '-nuevo')
        url: 'ficha-flujograma.html',
        apiEndpoint: '/documentos'
    },
    reporte: {
        name: 'Hoja de Reporte',
        icon: 'summarize',
        color: 'emerald',
        // En esta carpeta solo existe hoja-reportes.html (sin '-nuevo')
        url: 'hoja-reportes.html',
        apiEndpoint: '/documentos'
    },
    inventario: {
        name: 'Ficha de Inventario',
        icon: 'inventory_2',
        color: 'green',
        url: 'ficha-inventario.html',
        apiEndpoint: '/documentos'
    }
};

const PERFIL_FALLBACK = {
    nombre: 'Usuario SIGPRO',
    email: 'usuario@unmsm.edu.pe',
    iniciales: 'US',
    rol: 'Usuario',
    facultad: 'UNMSM',
    color: 'bg-slate-600'
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Muestra una notificación toast
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.querySelector(APP_CONFIG.selectors.toastContainer);
    if (!container) return;

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };

    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-amber-500'
    };

    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] toast-enter`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icons[type]}</span>
        <span class="font-medium text-sm">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Muestra/oculta el estado de carga
 */
function toggleLoading(show) {
    const loadingEl = document.querySelector(APP_CONFIG.selectors.loadingState);
    if (loadingEl) {
        loadingEl.classList.toggle('hidden', !show);
    }
}

// ============================================
// TEMA OSCURO/CLARO (Copiado de facultades-documentos)
// ============================================

function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Verificar preferencia guardada o usar 'light' por defecto
    const currentTheme = localStorage.getItem('theme') || 'light';
    html.classList.toggle('dark', currentTheme === 'dark');
    
    // Aplicar tema inicial a iframes existentes
    setTimeout(() => notifyIframesThemeChange(currentTheme), 500);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark');
            const isDark = html.classList.contains('dark');
            const newTheme = isDark ? 'dark' : 'light';
            
            localStorage.setItem('theme', newTheme);
            
            // Actualizar icono
            const icon = themeToggle.querySelector('span');
            if (icon) {
                icon.textContent = isDark ? 'light_mode' : 'dark_mode';
            }
            
            // 🔔 NOTIFICAR A TODOS LOS IFRAMES HIJOS
            notifyIframesThemeChange(newTheme);
            
            showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
        });
    }
}

// Notificar cambio de tema a todos los iframes
function notifyIframesThemeChange(theme) {
    const iframes = document.querySelectorAll('iframe');
    console.log('Notificando tema a', iframes.length, 'iframes:', theme);
    
    iframes.forEach(iframe => {
        try {
            // Enviar mensaje al iframe
            iframe.contentWindow.postMessage({
                type: 'theme-change',
                theme: theme
            }, '*');
        } catch (e) {
            console.log('Error notificando al iframe:', e);
        }
    });
}

// ============================================
// MANEJO DE USUARIO Y PERFIL (Copiado de facultades-documentos)
// ============================================

function getColorPorRol(rol) {
    const colores = {
        administrador: 'bg-blue-600',
        admin: 'bg-blue-600',
        editor: 'bg-emerald-600',
        visualizador: 'bg-purple-600',
        'usuario facultad': 'bg-amber-600',
        'administrador global': 'bg-blue-700'
    };
    const rolKey = String(rol || '').trim().toLowerCase();
    return colores[rolKey] || 'bg-slate-600';
}

function getInicialesDesdeNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return 'US';
    return nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0]?.toUpperCase())
        .join('') || 'US';
}

function obtenerCargoORol(user) {
    return user?.cargo
        || user?.cargoNombre
        || user?.puesto
        || user?.rol
        || user?.role
        || 'Usuario';
}

function obtenerNombreFacultad(user) {
    const facultadRaw = user?.facultad || user?.faculty;
    if (typeof facultadRaw === 'string' && facultadRaw.trim()) return facultadRaw;
    if (facultadRaw && typeof facultadRaw === 'object') {
        return facultadRaw.nombre
            || facultadRaw.descripcion
            || facultadRaw.name
            || 'UNMSM';
    }
    return user?.facultadNombre
        || user?.nombreFacultad
        || user?.nombre_facultad
        || user?.facultadName
        || user?.facultad_id_nombre
        || 'UNMSM';
}

function renderizarPerfil(usuario) {
    const elementos = {
        iniciales: document.querySelector(APP_CONFIG.selectors.profileIniciales),
        nombre: document.querySelector(APP_CONFIG.selectors.profileNombre),
        email: document.querySelector(APP_CONFIG.selectors.profileEmail),
        rol: document.querySelector(APP_CONFIG.selectors.profileRol),
        facultad: document.querySelector(APP_CONFIG.selectors.profileFacultad),
        avatar: document.querySelector(APP_CONFIG.selectors.profileAvatar)
    };

    // Verificar que existan todos los elementos
    for (const [key, el] of Object.entries(elementos)) {
        if (!el) {
            console.warn(`No se encontró el elemento: ${key}`);
            continue;
        }
    }

    if (elementos.iniciales) elementos.iniciales.textContent = usuario.iniciales;
    if (elementos.nombre) elementos.nombre.textContent = usuario.nombre;
    if (elementos.email) elementos.email.textContent = usuario.email;
    if (elementos.rol) elementos.rol.textContent = usuario.rol;
    if (elementos.facultad) elementos.facultad.textContent = usuario.facultad;
    if (elementos.avatar) {
        elementos.avatar.className = `w-10 h-10 rounded-full ${usuario.color} flex items-center justify-center text-white font-semibold`;
    }
}

async function cargarPerfilDesdeBackend() {
    try {
        // Intentar usar la API si está disponible
        if (typeof API !== 'undefined' && API.auth && API.auth.getUser) {
            const response = await Promise.resolve(API.auth.getUser());
            const user = response && response.success && response.data ? response.data : response;
            if (user) {
                const email = user.correo || user.email || 'usuario@unmsm.edu.pe';
                const nombreCompleto = (user.nombreCompleto || user.nombre || email.split('@')[0] || 'usuario').replace(/\./g, ' ');
                const iniciales = user.iniciales || getInicialesDesdeNombre(nombreCompleto);
                const rol = obtenerCargoORol(user);
                
                renderizarPerfil({
                    nombre: nombreCompleto,
                    email,
                    iniciales: iniciales,
                    rol,
                    facultad: obtenerNombreFacultad(user),
                    color: getColorPorRol(rol)
                });
                return;
            }
        }
        
        // Fallback a localStorage
        const raw = localStorage.getItem('usuario')
            || localStorage.getItem('sigpro_usuario')
            || localStorage.getItem('usuario_actual')
            || localStorage.getItem('user')
            || localStorage.getItem('unmsm_user');
        const usuario = raw ? JSON.parse(raw) : null;
        if (usuario) {
            const email = usuario.correo || usuario.email || 'usuario@unmsm.edu.pe';
            const nombreCompleto = (usuario.nombreCompleto || usuario.nombre || email.split('@')[0] || 'usuario').replace(/\./g, ' ');
            const rol = obtenerCargoORol(usuario);
            renderizarPerfil({
                ...usuario,
                nombre: nombreCompleto,
                email,
                iniciales: usuario.iniciales || getInicialesDesdeNombre(nombreCompleto),
                rol,
                facultad: obtenerNombreFacultad(usuario),
                color: usuario.color || getColorPorRol(rol)
            });
            return;
        }
        
        // Si no hay nada, usar fallback neutro
        renderizarPerfil(PERFIL_FALLBACK);
        
    } catch (error) {
        console.error('Error cargando perfil:', error);
        renderizarPerfil(PERFIL_FALLBACK);
    }
}

// ============================================
// DROPDOWN DE PERFIL Y LOGOUT (Copiado de facultades-documentos)
// ============================================

function initProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (!profileBtn || !profileDropdown) {
        console.error('No se encontraron elementos del perfil');
        return;
    }

    let hideTimer = null;

    function openProfileDropdown() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        profileDropdown.classList.remove('hidden', 'hide-profile');
        void profileDropdown.offsetWidth;
        profileDropdown.classList.add('show-profile');
    }

    function closeProfileDropdown(immediate = false) {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        if (immediate) {
            profileDropdown.classList.remove('show-profile', 'hide-profile');
            profileDropdown.classList.add('hidden');
            return;
        }

        if (profileDropdown.classList.contains('hidden')) return;

        profileDropdown.classList.remove('show-profile');
        profileDropdown.classList.add('hide-profile');

        hideTimer = setTimeout(() => {
            profileDropdown.classList.add('hidden');
            profileDropdown.classList.remove('hide-profile');
            hideTimer = null;
        }, 180);
    }
    
    profileBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const isVisible = !profileDropdown.classList.contains('hidden') &&
            !profileDropdown.classList.contains('hide-profile');

        if (isVisible) {
            closeProfileDropdown();
        } else {
            openProfileDropdown();
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            closeProfileDropdown();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeProfileDropdown();
        }
    });
}

function initLogoutModal() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const logoutCancel = document.getElementById('logout-cancel');
    const logoutConfirm = document.getElementById('logout-confirm');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (!logoutBtn || !logoutModal) return;

    function abrirModalLogout() {
        logoutModal.classList.remove('hidden');
        void logoutModal.offsetWidth; // Trigger reflow
        logoutModal.classList.add('show-modal');
    }

    function cerrarModalLogout() {
        logoutModal.classList.add('hide-modal');
        logoutModal.classList.remove('show-modal');
        
        setTimeout(() => {
            if (logoutModal.classList.contains('hide-modal')) {
                logoutModal.classList.add('hidden');
                logoutModal.classList.remove('hide-modal');
            }
        }, 400);
    }

    function ejecutarLogout() {
        logoutModal.classList.add('hide-modal');
        logoutModal.classList.remove('show-modal');
        
        setTimeout(() => {
            // Limpiar storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Llamar al logout de API si existe
            if (typeof API !== 'undefined' && API.auth && API.auth.logout) {
                API.auth.logout().catch(() => {});
            }
            
            window.location.href = 'login.html';
        }, 400);
    }

    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Cerrar dropdown primero
        if (profileDropdown) {
            profileDropdown.classList.remove('show-profile', 'hide-profile');
            profileDropdown.classList.add('hidden');
        }
        
        abrirModalLogout();
    });
    
    if (logoutCancel) {
        logoutCancel.addEventListener('click', cerrarModalLogout);
    }
    
    if (logoutConfirm) {
        logoutConfirm.addEventListener('click', ejecutarLogout);
    }
    
    logoutModal.addEventListener('click', function(e) {
        if (e.target === logoutModal) {
            cerrarModalLogout();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !logoutModal.classList.contains('hidden')) {
            cerrarModalLogout();
        }
    });
}

// ============================================
// CREACIÓN DE DOCUMENTOS
// ============================================

function getEmbedByType(type) {
    const sectionId = `embed-ficha-${type}`;
    const iframeId = type === 'tecnica' ? 'ficha-caracterizacion-iframe' : `ficha-${type}-iframe`;
    return {
        section: document.getElementById(sectionId),
        iframe: document.getElementById(iframeId)
    };
}

function hideAndResetEmbed(type) {
    const { section, iframe } = getEmbedByType(type);
    if (section) {
        section.classList.add('hidden');
    }
    if (iframe) {
        iframe.src = '';
    }
}

function hideAndResetOtherEmbeds(activeType) {
    ['indicador', 'flujograma', 'tecnica', 'reporte', 'inventario']
        .filter(type => type !== activeType)
        .forEach(type => hideAndResetEmbed(type));
}

async function selectDocumentType(type) {
    const docInfo = DOCUMENT_TYPES[type];
    if (!docInfo) {
        console.error(`Tipo de documento no válido: ${type}`);
        return;
    }

    showToast(`Preparando ${docInfo.name}...`, 'info');
    toggleLoading(true);

    try {
        await new Promise(resolve => setTimeout(resolve, 800));
        toggleLoading(false);
        const cacheBuster = `v=${Date.now()}`;
        const urlConVersion = `${docInfo.url}${docInfo.url.includes('?') ? '&' : '?'}${cacheBuster}`;

        const { section, iframe } = getEmbedByType(type);
        if (!section || !iframe) {
            throw new Error(`No se encontró sección embebida para ${type}`);
        }

        hideAndResetOtherEmbeds(type);
        iframe.src = urlConVersion;
        section.classList.remove('hidden');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;

    } catch (error) {
        toggleLoading(false);
        console.error('Error al preparar documento:', error);
        showToast('Error al preparar el documento. Intenta de nuevo.', 'error');
    }
}

function closeEmbed(type) {
    const sectionId = `embed-ficha-${type}`;
    // Manejar el ID especial de técnica
    const iframeId = type === 'tecnica' ? 'ficha-caracterizacion-iframe' : `ficha-${type}-iframe`;
    
    const section = document.getElementById(sectionId);
    const iframe = document.getElementById(iframeId);
    
    if (section) {
        section.classList.add('hidden');
    }
    
    if (iframe) {
        iframe.src = '';  // Limpiar para liberar memoria
    }
    
    showToast(`${DOCUMENT_TYPES[type]?.name || 'Ficha'} cerrada`, 'info');
}

window.closeEmbed = closeEmbed;

// ============================================
// ANIMACIONES Y UTILIDADES
// ============================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.quick-action-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.5s ease ${index * 0.1}s`;
        observer.observe(card);
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================

function init() {
    console.log('🚀 SIGPRO Nuevo Documento - Inicializando...');

    initThemeToggle();
    cargarPerfilDesdeBackend();
    initProfileDropdown();
    initLogoutModal();
    initScrollAnimations();

    // Abrir ficha automáticamente si viene en la URL
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    console.log('URL params:', { open, search: window.location.search });
    
    // Mapeo: URL param → tipo interno
    const paramToType = {
        'ficha-indicador': 'indicador',
        'ficha-flujograma': 'flujograma',
        'ficha-caracterizacion': 'tecnica',
        'hoja-reportes': 'reporte',
        'ficha-inventario': 'inventario'
    };
    
    if (open && paramToType[open]) {
        console.log(`Abriendo ${open} automáticamente...`);
        selectDocumentType(paramToType[open]);
    }

    console.log('✅ Sistema cargado correctamente');
}

window.addEventListener('message', (event) => {
    const data = event.data || {};
    
    if (data.type === 'navigate-to' && data.url) {
        console.log('📨 Navegación desde iframe:', data.url);
        window.location.href = data.url;
    }
    
    if (data.type === 'report-created' && data.docCode) {
        console.log('📨 Reporte creado desde iframe:', data.docCode);
        // Opcional: mostrar notificación
        showToast(`Reporte ${data.docCode} creado exitosamente`, 'success');
    }
});

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exportar funciones globales necesarias
window.selectDocumentType = selectDocumentType;
window.showToast = showToast;
/**
 * SIGPRO Dashboard - JavaScript Functionality
 * Handles interactions, animations, and data management
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initThemeToggle();
    initTooltips();
    cargarDashboardUsuario();   // ← Carga contadores del dashboard con animación
    cargarNotificacionesDashboard();
});

// ============================================
// ANTI-BACK BUTTON: Prevenir volver con sesión cerrada
// ============================================

// Cuando el navegador restaura la página desde bfcache (botón Atrás)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // La página viene del caché, verificar sesión
        const hasToken = !!(
            localStorage.getItem('token') ||
            localStorage.getItem('unmsm_token') ||
            localStorage.getItem('auth_token') ||
            localStorage.getItem('accessToken')
        );
        
        if (!hasToken) {
            // Sin sesión = redirigir al login
            window.location.replace('portal-inicio-facultades.html');
        } else {
            // Con sesión = recargar para estado fresco
            window.location.reload();
        }
    }
});

// Verificar sesión inmediatamente
(function() {
    const token = localStorage.getItem('token') || localStorage.getItem('unmsm_token');
    if (!token) {
        window.location.replace('portal-inicio-facultades.html');
        return;
    }
})();

window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        const token = localStorage.getItem('token') || localStorage.getItem('unmsm_token');
        if (!token) window.location.replace('portal-inicio-facultades.html');
    }
});


// ============================================
// PROTECCIÓN: Verificar sesión al cargar
// ============================================

(function checkSessionOnLoad() {
    // Verificar si hay token de autenticación
    const hasToken = !!(
        localStorage.getItem('token') ||
        localStorage.getItem('unmsm_token') ||
        localStorage.getItem('auth_token') ||
        localStorage.getItem('accessToken')
    );
    
    // Si no hay token, redirigir al login inmediatamente
    if (!hasToken) {
        window.location.replace('portal-inicio-facultades.html');
        return; // Detener ejecución del resto del script
    }
})();

// ==========================================
// Función global para redirección
// ==========================================
function irAFacultadesNuevo(tipo) {
    console.log('irAFacultadesNuevo called with:', tipo);
    const mapping = {
        indicador: 'ficha-indicador',
        tecnica: 'ficha-caracterizacion',
        flujograma: 'ficha-flujograma',
        reporte: 'hoja-reportes',
        inventario: 'ficha-inventario'
    };
    const target = mapping[tipo] || 'ficha-indicador';
    const url = `facultades-nuevo.html?open=${encodeURIComponent(target)}`;
    console.log('Redirecting to:', url);
    window.location.href = url;
}

// ==========================================
// Theme Management
// ==========================================
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Check for saved theme preference or default to 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';
    html.classList.toggle('dark', currentTheme === 'dark');
    
    themeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Update icon
        const icon = themeToggle.querySelector('span');
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
        
        showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
    });
}

// ==========================================
// Toast Notifications - Con cierre al click
// ==========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const icons = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error'
    };
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 20px;">${icons[type]}</span>
        <span style="flex: 1;">${message}</span>
        <span class="material-symbols-outlined close-icon">close</span>
    `;
    
    // Cerrar al hacer click en cualquier parte del toast
    toast.addEventListener('click', () => {
        closeToast(toast);
    });
    
    container.appendChild(toast);
    
    // Auto-cerrar después de duration
    const autoCloseTimeout = setTimeout(() => {
        closeToast(toast);
    }, duration);
    
    // Limpiar timeout si se cierra manualmente
    toast.addEventListener('remove', () => {
        clearTimeout(autoCloseTimeout);
    });
}

function closeToast(toast) {
    if (toast.classList.contains('hiding')) return; // Evitar doble cierre
    
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

// Cerrar todas las notificaciones con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.toast').forEach(toast => closeToast(toast));
    }
});

// ==========================================
// Tooltips
// ==========================================
function initTooltips() {
    // Simple tooltip implementation using title attribute
    document.querySelectorAll('[title]').forEach(el => {
        el.addEventListener('mouseenter', (e) => {
            const title = e.target.getAttribute('title');
            if (!title) return;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'fixed z-50 bg-slate-800 text-white text-xs px-2 py-1 rounded pointer-events-none opacity-0 transition-opacity';
            tooltip.textContent = title;
            tooltip.id = 'active-tooltip';
            
            document.body.appendChild(tooltip);
            
            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
            
            requestAnimationFrame(() => tooltip.classList.remove('opacity-0'));
        });
        
        el.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('active-tooltip');
            if (tooltip) tooltip.remove();
        });
    });
}

// ==========================================
// Keyboard Shortcuts
// ==========================================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search (if implemented)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        showToast('Búsqueda rápida (Ctrl+K)', 'info');
    }
    
    // Escape to close modals/toasts
    if (e.key === 'Escape') {
        document.querySelectorAll('.toast').forEach(t => t.remove());
    }
});

// ==========================================
// Real-time Updates Simulation
// ==========================================
setInterval(() => {
    // Randomly update a status dot
    const badges = document.querySelectorAll('.status-badge');
    if (badges.length > 0) {
        const randomBadge = badges[Math.floor(Math.random() * badges.length)];
        randomBadge.classList.add('scale-110');
        setTimeout(() => randomBadge.classList.remove('scale-110'), 200);
    }
}, 5000);

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showToast, formatDate, reportsData };
}

// ==========================================
// DASHBOARD: Contadores desde API + Fallback local + Animación
// ==========================================
async function cargarDashboardUsuario() {
    const countPendientes = document.getElementById('count-pendientes');
    const countEnProceso = document.getElementById('count-en-proceso');
    const countCompletados = document.getElementById('count-completados');

    let datosFinales = null;

    // 1) Intentar cargar desde el backend
    try {
        const resultado = await API.portal.dashboard.get();
        console.log('🔍 Dashboard API response:', resultado);

        if (resultado.success && resultado.data) {
            datosFinales = resultado.data;
            console.log('✅ Dashboard cargado desde API');
        }
    } catch (error) {
        console.warn('⚠️ API dashboard falló:', error.message);
    }

    // 2) Si el backend falló, calcular desde localStorage
    if (!datosFinales) {
        console.log('🔄 Calculando contadores desde localStorage...');
        datosFinales = calcularContadoresDesdeLocalStorage();
    }

    // 3) Extraer valores finales
    const valorPendientes = datosFinales.pendingCount ?? datosFinales.pendientes ?? 0;
    const valorEnProceso = datosFinales.inProgressCount ?? datosFinales.enProceso ?? 0;
    const valorCompletados = datosFinales.completedCount ?? datosFinales.completados ?? 0;

    // 4) Animar los contadores
    if (countPendientes) animarContador(countPendientes, valorPendientes, 1200);
    if (countEnProceso) animarContador(countEnProceso, valorEnProceso, 1200);
    if (countCompletados) animarContador(countCompletados, valorCompletados, 1200);

    console.log('📊 Contadores finales:', {
        pendientes: valorPendientes,
        enProceso: valorEnProceso,
        completados: valorCompletados
    });
}

// ==========================================
// ANIMACIÓN: Contador con efecto de números subiendo
// ==========================================
function animarContador(elemento, valorFinal, duracion = 1200) {
    const valorInicial = parseInt(elemento.textContent) || 0;
    if (valorInicial === valorFinal) return; // No animar si es el mismo valor

    const inicio = performance.now();
    const diferencia = valorFinal - valorInicial;

    // Función de easing (ease-out-expo para efecto "frenado" al final)
    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function actualizar(tiempoActual) {
        const transcurrido = tiempoActual - inicio;
        const progreso = Math.min(transcurrido / duracion, 1);
        const easing = easeOutExpo(progreso);
        
        const valorActual = Math.round(valorInicial + (diferencia * easing));
        elemento.textContent = valorActual;
        elemento.setAttribute('data-count', valorFinal);

        if (progreso < 1) {
            requestAnimationFrame(actualizar);
        } else {
            // Asegurar que termine exactamente en el valor final
            elemento.textContent = valorFinal;
            elemento.setAttribute('data-count', valorFinal);
            
            // Efecto de "pop" al finalizar
            elemento.classList.add('scale-110');
            setTimeout(() => elemento.classList.remove('scale-110'), 200);
        }
    }

    requestAnimationFrame(actualizar);
}

// ==========================================
// FALLBACK: Calcular contadores desde localStorage
// ==========================================
function calcularContadoresDesdeLocalStorage() {
    let pendientes = 0;
    let enProceso = 0;
    let completados = 0;

    // 🔥 FIX: Mismas claves que usa facultades-documentos
    const clavesRevisar = [
        'sigpro_documentos_lista',
        'local_sigpro_documentos_lista',
        'remote_sigpro_documentos_lista',
        'sigpro_reportes',
        'sigpro_user_documents',
        'local_sigpro_user_documents'
    ];

    //const FECHA_SEED = new Date('2026-07-22T00:00:00Z').getTime();//
    
    // 🔥 FIX: Set para evitar contar el mismo documento 2 veces
    const procesados = new Set();

    for (const clave of clavesRevisar) {
        try {
            const raw = localStorage.getItem(clave);
            if (!raw) continue;

            const datos = JSON.parse(raw);
            if (!Array.isArray(datos)) continue;

            for (const doc of datos) {
                if (!doc || typeof doc !== 'object') continue;
                if (doc.isDemo === true) continue;

                // 🔥 FIX: Identificador único para deduplicar
                const codigo = String(doc.codigo || doc.code || doc.id || '').trim().toUpperCase();
                if (!codigo) continue;
                
                // Si ya contamos este documento, saltarlo
                if (procesados.has(codigo)) continue;
                procesados.add(codigo);

                // Filtrar códigos de demo
                if (codigo.includes('PE01-001') || codigo.includes('PE01-002')) continue;
                if (codigo.includes('IND-FM-PE01')) continue;

                // Filtrar fechas antiguas (solo si tiene fecha válida)
                //const fechaDoc = doc.fecha || doc.createdAt || doc.fechaCreacion;
                //if (fechaDoc) {
                //    const fechaMs = new Date(fechaDoc).getTime();
                //    if (!isNaN(fechaMs) && fechaMs < FECHA_SEED) continue;
                //}
                //

                // Normalizar estado y contar
                const estado = normalizarEstado(doc.estado || doc.status);
                if (estado === 'pendiente') pendientes++;
                else if (estado === 'en_proceso') enProceso++;
                else if (estado === 'completado') completados++;
            }

        } catch (e) {
            console.warn(`Error leyendo ${clave}:`, e);
        }
    }

    console.log('📊 Contadores desde localStorage (deduplicados):', {
        pendientes, enProceso, completados, totalUnicos: procesados.size
    });

    window._sigproDocumentosCodes = procesados;

    return {
        pendingCount: pendientes,
        inProgressCount: enProceso,
        completedCount: completados
    };
}

// ==========================================
// UTILIDAD: Normalizar estado de documento
// ==========================================
function normalizarEstado(estado) {
    if (!estado) return 'pendiente';
    
    const valor = String(estado)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');
    
    if (valor === 'aprobado' || valor === 'completado' || valor === 'completed' || valor === 'approved') return 'completado';
    if (valor === 'en_proceso' || valor === 'revision' || valor === 'in_progress' || valor === 'inprogress') return 'en_proceso';
    if (valor === 'pendiente' || valor === 'pending' || valor === 'rechazado' || valor === 'rejected') return 'pendiente';
    
    return 'pendiente';
}

// ==========================================
// NOTIFICACIONES DE RACIONALIZACIÓN
// ==========================================

let notificacionesData = [];

// ==========================================
// PERSISTENCIA: IDs de notificaciones leídas (modo offline)
// ==========================================
const NOTIF_LEIDAS_KEY = 'sigpro_notificaciones_leidas';

function getNotificacionesLeidas() {
    try {
        const raw = localStorage.getItem(NOTIF_LEIDAS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? new Set(arr) : new Set();
    } catch (e) {
        return new Set();
    }
}

function guardarNotificacionLeida(id) {
    const set = getNotificacionesLeidas();
    set.add(id);
    localStorage.setItem(NOTIF_LEIDAS_KEY, JSON.stringify(Array.from(set)));
}

function esNotificacionLeida(id) {
    return getNotificacionesLeidas().has(id);
}

// ==========================================
// FILTRO: Solo notificaciones enviadas por Racionalización
// ==========================================
function esNotificacionDeRacio(notif) {
    // 1) Detectar si es explícitamente una respuesta de la facultad
    const responsable = String(notif.responsable || notif.generadoPor || '').toLowerCase().trim();
    if (responsable === 'facultad') return false;

    const remitente = String(
        notif.from || notif.sender || notif.creadoPor ||
        notif.createdBy?.fullName || notif.createdBy?.email ||
        notif.author || ''
    ).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Si el remitente explícito es facultad, descartar
    if (remitente.includes('facultad')) return false;

    // Si el remitente explícito es racio/admin, incluir
    if (remitente.includes('racionalizacion') || remitente.includes('racio') ||
        remitente.includes('admin') || remitente.includes('sistema') ||
        remitente.includes('ogp')) {
        return true;
    }

    // Si responsable explícito es racio/admin, incluir
    if (responsable.includes('racionalizacion') || responsable.includes('racio') ||
        responsable.includes('admin') || responsable.includes('sistema')) {
        return true;
    }

    // Si no hay remitente definido pero es una corrección/observación del sistema,
    // y NO está marcada como facultad, asumimos que viene de Racionalización
    const tipo = String(notif.type || '').toUpperCase();
    if (!responsable && !remitente &&
        (tipo === 'CORRECTION' || tipo === 'APPROVAL' || tipo === 'REJECTION')) {
        return true;
    }

    return false;
}

async function cargarNotificacionesDashboard() {
    const tbody = document.getElementById('notifications-tbody');
    const empty = document.getElementById('notif-empty');
    const badge = document.getElementById('notif-badge-header');

    if (!tbody) return;

    tbody.innerHTML = `
        <tr id="notif-loading">
            <td colspan="5" class="text-center py-8 text-slate-400">
                <span class="material-symbols-outlined animate-spin text-2xl">refresh</span>
                <p class="text-sm mt-2">Cargando notificaciones...</p>
            </td>
        </tr>
    `;
    if (empty) empty.classList.add('hidden');

    let notificaciones = [];
    let apiOk = false;

    // 1) Intentar API
    try {
        const resultado = await API.portal.notifications.getAll('UNREAD', 10);
        console.log('🔍 API notificaciones raw:', resultado);

        if (resultado.success && Array.isArray(resultado.data)) {
            notificaciones = resultado.data;
            apiOk = true;
            console.log('✅ Notificaciones desde API (array directo):', notificaciones.length);
        } else if (resultado.success && resultado.data && Array.isArray(resultado.data.notifications)) {
            // Formato alternativo: { data: { notifications: [...] } }
            notificaciones = resultado.data.notifications;
            apiOk = true;
            console.log('✅ Notificaciones desde API (nested):', notificaciones.length);
        } else {
            console.warn('⚠️ API respondió pero sin array válido:', resultado);
        }
    } catch (e) {
        console.warn('API notificaciones falló:', e);
    }

    // 2) Fallback si la API no devolvió nada
    if (!apiOk || notificaciones.length === 0) {
        console.log('🔄 Fallback a localStorage...');
        notificaciones = generarNotificacionesDesdeCorrecciones();
    }

    // 3) 🔥 FILTRAR: solo las que envió Racionalización (API + fallback)
    const notificacionesRacio = notificaciones.filter(n => esNotificacionDeRacio(n));
    console.log('📊 Notificaciones de RACIO finales:', notificacionesRacio.length);

    notificacionesData = notificacionesRacio;

    // 4) Badge
    const noLeidas = notificacionesRacio.filter(n => n.status === 'UNREAD' || !n.read);
    if (badge) {
        if (noLeidas.length > 0) {
            badge.textContent = noLeidas.length > 9 ? '9+' : noLeidas.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // 5) Renderizar
    const loading = document.getElementById('notif-loading');
    if (loading) loading.remove();

    if (notificacionesRacio.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');
    renderizarNotificacionesTabla(notificacionesRacio, tbody);
}

// 🔥 NUEVA FUNCIÓN: Crear notificaciones desde correcciones locales
function generarNotificacionesDesdeCorrecciones() {
    const claves = [
        'sigpro_correcciones_shared',
        'sigpro_correcciones_solicitudes',
        'local_sigpro_correcciones_solicitudes',
        'remote_sigpro_correcciones_solicitudes',
        'sigpro_correcciones',
        'sigpro_observaciones',
        'local_sigpro_observaciones',
        'remote_sigpro_observaciones'
    ];

    let correcciones = [];
    for (const clave of claves) {
        const raw = localStorage.getItem(clave);
        if (!raw) continue;
        try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) correcciones = correcciones.concat(list);
        } catch (e) {}
    }

    console.log('📦 Correcciones totales en localStorage:', correcciones.length);

    // Deduplicar
    const vistas = new Set();
    const unicas = [];
    for (const c of correcciones) {
        const key = c.id || `${c.codigoDocumento || c.codigo}-${c.fecha}`;
        if (!vistas.has(key)) {
            vistas.add(key);
            unicas.push(c);
        }
    }

    // Construir set de documentos existentes
    const docsExistentes = new Set();
    if (window._sigproDocumentosCodes && window._sigproDocumentosCodes.size > 0) {
        window._sigproDocumentosCodes.forEach(c => docsExistentes.add(c));
    }

    const docClaves = [
        'sigpro_documentos_lista',
        'local_sigpro_documentos_lista',
        'remote_sigpro_documentos_lista',
        'sigpro_reportes',
        'sigpro_user_documents',
        'local_sigpro_user_documents'
    ];
    for (const dk of docClaves) {
        try {
            const raw = localStorage.getItem(dk);
            if (!raw) continue;
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                list.forEach(d => docsExistentes.add(String(d.codigo || d.code || '').trim()));
            }
        } catch (e) {}
    }

    console.log('📋 Documentos existentes encontrados:', docsExistentes.size);

    // Filtrar por documento existente
    const debeFiltrarPorDoc = docsExistentes.size > 0;
    let correccionesValidas = unicas.filter(c => {
        const codigo = String(c.codigoDocumento || c.codigo || '').trim();
        if (!codigo) return false;
        if (!debeFiltrarPorDoc) return true;
        return docsExistentes.has(codigo);
    });

    console.log('✅ Correcciones con documento existente:', correccionesValidas.length);

    // 🔥 FIX PRINCIPAL: Excluir explícitamente las respuestas de la facultad.
    // Cuando la facultad responde, se guarda con responsable: 'FACULTAD'.
    // Cuando Racionalización envía, responsable suele ser '', 'RACIONALIZACIÓN' o similar.
    const correccionesRacio = correccionesValidas.filter(c => {
        const resp = String(c.responsable || c.generadoPor || '').toLowerCase().trim();
        const from = String(c.from || c.sender || c.creadoPor || '').toLowerCase();

        // EXCLUIR: respuestas/envíos hechos por la facultad
        if (resp === 'facultad') {
            console.log('  - Excluida (respuesta de facultad):', c.codigoDocumento || c.codigo);
            return false;
        }
        if (from.includes('facultad')) {
            console.log('  - Excluida (from/sender facultad):', c.codigoDocumento || c.codigo);
            return false;
        }

        // INCLUIR: todo lo demás (racionalización, admin, vacío, etc.)
        return true;
    });

    console.log('🔍 Correcciones de RACIO (sin facultad):', correccionesRacio.length);

    // Limpiar correcciones huérfanas
    for (const clave of claves) {
        try {
            const raw = localStorage.getItem(clave);
            if (!raw) continue;
            const list = JSON.parse(raw);
            if (!Array.isArray(list)) continue;
            const limpia = list.filter(item => {
                const cod = String(item?.codigoDocumento || item?.codigo || '').trim();
                return !cod || docsExistentes.has(cod);
            });
            if (limpia.length !== list.length) {
                localStorage.setItem(clave, JSON.stringify(limpia));
            }
        } catch (e) {}
    }

    return correccionesRacio.map((c, i) => ({
        id: c.id || `notif-local-${i}`,
        type: 'CORRECTION',
        message: c.asunto || c.observaciones || c.message || 'Nueva corrección de Racionalización',
        status: 'UNREAD',
        read: false,
        createdAt: c.fecha || new Date().toISOString(),
        documentCode: c.codigoDocumento || c.codigo,
        documentId: c.documentId || c.codigoDocumento || c.codigo,
        // Mostrar siempre como remitente a Racionalización, ya que filtramos las de facultad arriba
        responsable: (() => {
            const r = String(c.responsable || c.generadoPor || '').trim();
            if (!r || r.toLowerCase() === 'facultad') return 'Racionalización';
            return r;
        })()
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderizarNotificacionesTabla(notificaciones, tbody) {
    tbody.innerHTML = notificaciones.map(n => {
        const fecha = n.createdAt || n.fecha || new Date().toISOString();
        const fechaFormateada = formatearFechaNotif(fecha);
        const tipo = n.type || n.tipo || 'INFO';
        const mensaje = n.message || n.mensaje || n.title || n.asunto || 'Sin mensaje';
        const estaLeida = n.status === 'READ' || n.read === true || esNotificacionLeida(n.id);
        
        const tipoConfig = {
            'CORRECTION': { icono: 'edit_note', color: 'text-amber-600', bg: 'bg-amber-50', label: 'Corrección' },
            'APPROVAL': { icono: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Aprobación' },
            'REJECTION': { icono: 'cancel', color: 'text-red-600', bg: 'bg-red-50', label: 'Rechazo' },
            'INFO': { icono: 'info', color: 'text-blue-600', bg: 'bg-blue-50', label: 'Información' },
            'WARNING': { icono: 'warning', color: 'text-orange-600', bg: 'bg-orange-50', label: 'Advertencia' }
        };
        
        const config = tipoConfig[tipo] || tipoConfig['INFO'];
        
        return `
            <tr class="bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-700/80 transition-all duration-300 group shadow-sm hover:shadow-md rounded-lg ${estaLeida ? 'opacity-60' : ''}" data-id="${n.id}">
                <td class="py-4 px-4 rounded-l-xl border-l-4 ${estaLeida ? 'border-transparent' : 'border-amber-500'} group-hover:border-accent">
                    <div class="text-sm font-bold text-slate-700 dark:text-slate-200">${fechaFormateada.fecha}</div>
                    <div class="text-xs text-slate-400">${fechaFormateada.hora}</div>
                </td>
                <td class="py-4 px-4">
                    <span class="flex items-center gap-2 text-xs font-bold ${config.color} ${config.bg} px-3 py-1 rounded-full w-fit">
                        <span class="material-symbols-outlined text-sm">${config.icono}</span>
                        ${config.label}
                    </span>
                </td>
                <td class="py-4 px-4 max-w-xs">
                    <p class="text-sm text-slate-600 dark:text-slate-400 truncate" title="${escapeHtml(mensaje)}">${escapeHtml(mensaje)}</p>
                </td>
                <td class="py-4 px-4">
                    <span class="flex items-center gap-2 text-xs font-bold ${estaLeida ? 'text-slate-400 bg-slate-100' : 'text-amber-600 bg-amber-50'} px-3 py-1 rounded-full w-fit">
                        ${estaLeida 
                            ? '<span class="material-symbols-outlined text-sm">drafts</span> Leída'
                            : '<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span> No leída'
                        }
                    </span>
                </td>
                <td class="py-4 px-4 text-center rounded-r-xl">
                    <div class="flex items-center justify-center gap-2">
                        ${!estaLeida ? `
                            <button class="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" 
                                    onclick="marcarNotificacionLeida('${n.id}')" title="Marcar como leída">
                                <span class="material-symbols-outlined text-lg">check</span>
                            </button>
                        ` : ''}
                        <button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all" 
                                onclick="verNotificacionDetalle('${n.id}')" title="Revisar documento">
                            <span class="material-symbols-outlined text-sm">visibility</span>
                            Revisar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function formatearFechaNotif(fechaStr) {
    try {
        const date = new Date(fechaStr);
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const anio = date.getFullYear();
        const hora = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return {
            fecha: `${dia}/${mes}/${anio}`,
            hora: `${hora}:${min} H`
        };
    } catch {
        return { fecha: '-', hora: '-' };
    }
}

async function marcarNotificacionLeida(id) {
    let apiOk = false;

    // 1) Intentar API (solo si el ID parece real, no local)
    if (!String(id).startsWith('notif-local-') && typeof API !== 'undefined') {
        try {
            await API.portal.notifications.updateStatus(id, 'READ');
            apiOk = true;
            showToast('Notificación marcada como leída', 'success');
        } catch (error) {
            console.warn('API marcar leída falló, usando localStorage:', error.message);
        }
    }

    // 2) Fallback: persistir en localStorage y actualizar UI inmediatamente
    guardarNotificacionLeida(id);

    // Actualizar en memoria
    const notif = notificacionesData.find(n => n.id === id);
    if (notif) {
        notif.status = 'READ';
        notif.read = true;
    }

    // Re-renderizar solo la tabla (más rápido que recargar todo)
    const tbody = document.getElementById('notifications-tbody');
    if (tbody) {
        renderizarNotificacionesTabla(notificacionesData, tbody);
    }

    // Actualizar badge
    const badge = document.getElementById('notif-badge-header');
    const noLeidas = notificacionesData.filter(n => n.status === 'UNREAD' || !n.read);
    if (badge) {
        if (noLeidas.length > 0) {
            badge.textContent = noLeidas.length > 9 ? '9+' : noLeidas.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (!apiOk) {
        showToast('Marcada como leída (local)', 'success');
    }
}

async function marcarTodasNotifLeidas() {
    const noLeidas = notificacionesData.filter(n => n.status === 'UNREAD' || !n.read);
    if (noLeidas.length === 0) {
        showToast('No hay notificaciones pendientes', 'info');
        return;
    }

    let apiOk = true;

    // 1) Intentar API para las que tienen ID real
    for (const n of noLeidas) {
        if (!String(n.id).startsWith('notif-local-') && typeof API !== 'undefined') {
            try {
                await API.portal.notifications.updateStatus(n.id, 'READ');
            } catch (e) {
                apiOk = false;
            }
        }
    }

    // 2) Marcar todas como leídas en localStorage
    for (const n of noLeidas) {
        guardarNotificacionLeida(n.id);
        n.status = 'READ';
        n.read = true;
    }

    // 3) Re-renderizar
    const tbody = document.getElementById('notifications-tbody');
    if (tbody) {
        renderizarNotificacionesTabla(notificacionesData, tbody);
    }

    const badge = document.getElementById('notif-badge-header');
    if (badge) badge.classList.add('hidden');

    showToast(`${noLeidas.length} notificaciones marcadas como leídas`, 'success');
}

function verNotificacionDetalle(id) {
    const notif = notificacionesData.find(n => n.id === id);
    if (!notif) return;
    
    if (notif.documentId || notif.documentCode || notif.codigoDocumento) {
        window.location.href = `facultades-documentos.html?docCode=${encodeURIComponent(notif.documentCode || notif.documentId || notif.codigoDocumento)}`;
    } else {
        showToast('No hay documento asociado a esta notificación', 'info');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', async function() {
    
    const PERFIL_FALLBACK = {
        nombre: 'Usuario SIGPRO',
        email: 'usuario@unmsm.edu.pe',
        iniciales: 'US',
        rol: 'Usuario',
        facultad: 'UNMSM',
        color: 'bg-slate-600'
    };

    // ========== FUNCIONES ==========
    
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
            iniciales: document.getElementById('profile-iniciales'),
            nombre: document.getElementById('profile-nombre'),
            email: document.getElementById('profile-email'),
            rol: document.getElementById('profile-rol'),
            facultad: document.getElementById('profile-facultad'),
            avatar: document.getElementById('profile-avatar')
        };

        for (const [key, el] of Object.entries(elementos)) {
            if (!el) {
                console.error(`No se encontró el elemento: ${key}`);
                return;
            }
        }

        elementos.iniciales.textContent = usuario.iniciales;
        elementos.nombre.textContent = usuario.nombre;
        elementos.email.textContent = usuario.email;
        elementos.rol.textContent = usuario.rol;
        elementos.facultad.textContent = usuario.facultad;
        elementos.avatar.className = `w-10 h-10 rounded-full ${usuario.color} flex items-center justify-center text-white font-semibold`;
    }

    async function cargarDesdeBackend() {
        try {
            if (typeof API !== 'undefined' && API.auth && API.auth.getUser) {
                const respuesta = await Promise.resolve(API.auth.getUser());
                const user = respuesta && respuesta.success && respuesta.data ? respuesta.data : respuesta;
                if (!user) return false;

                const email = user.correo || user.email || '-';
                const nombreBase = (user.nombreCompleto || user.nombre || email.split('@')[0] || 'usuario').replace(/\./g, ' ');
                const rol = obtenerCargoORol(user);
                const facultad = obtenerNombreFacultad(user);

                renderizarPerfil({
                    nombre: nombreBase,
                    email,
                    iniciales: user.iniciales || getInicialesDesdeNombre(nombreBase),
                    rol,
                    facultad,
                    color: getColorPorRol(rol)
                });
                return true;
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }

        return false;
    }

    function cargarDesdeStorage() {
        try {
            const raw = localStorage.getItem('usuario')
                || localStorage.getItem('sigpro_usuario')
                || localStorage.getItem('usuario_actual')
                || localStorage.getItem('user')
                || localStorage.getItem('unmsm_user');
            const usuario = raw ? JSON.parse(raw) : null;
            if (usuario) {
                const email = usuario.correo || usuario.email || '-';
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
                return true;
            }
        } catch (e) {
            console.error('Error leyendo localStorage:', e);
        }
        return false;
    }

    // ========== INICIALIZAR PERFIL ==========
    const cargadoBackend = await cargarDesdeBackend();
    if (!cargadoBackend) {
        const cargadoStorage = cargarDesdeStorage();
        if (!cargadoStorage) {
            renderizarPerfil(PERFIL_FALLBACK);
        }
    }

    // ========== DROPDOWN TOGGLE ==========
    
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileBtn && profileDropdown) {
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
    } else {
        console.error('No se encontraron elementos del perfil:', { profileBtn, profileDropdown });
    }

    // ========== LOGOUT CON MODAL ==========

    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const logoutCancel = document.getElementById('logout-cancel');
    const logoutConfirm = document.getElementById('logout-confirm');

    function abrirModalLogout() {
        logoutModal.classList.remove('hidden');
        void logoutModal.offsetWidth;
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

    async function ejecutarLogout() {
        logoutModal.classList.add('hide-modal');
        logoutModal.classList.remove('show-modal');
        
        setTimeout(async () => {
            // 1) Intentar logout en backend
            try {
                await API.auth.logout();
            } catch (e) { /* silencioso */ }
            
            // 2) 🔥 SOLO borrar claves de sesión, NO los documentos
            const authKeys = [
                'token', 'unmsm_token', 'auth_token', 'accessToken', 
                'unmsm-token', 'jwt', 'refreshToken'
            ];
            const profileKeys = [
                'usuario', 'sigpro_usuario', 'usuario_actual', 
                'user', 'unmsm_user'
            ];
            
            [...authKeys, ...profileKeys].forEach(k => localStorage.removeItem(k));
            
            // sessionStorage es temporal, sí se puede limpiar
            sessionStorage.clear();
            
            // 3) Redirigir
            window.location.replace('portal-inicio-facultades.html');
            
        }, 400);
    }

    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (profileDropdown) {
                profileDropdown.classList.remove('show-profile', 'hide-profile');
                profileDropdown.classList.add('hidden');
            }
            
            abrirModalLogout();
        });
        
        logoutCancel.addEventListener('click', cerrarModalLogout);
        logoutConfirm.addEventListener('click', ejecutarLogout);
        
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

    function cerrarFichaIndicador() {
        const modalFicha = document.getElementById('modal-ficha');
        if (!modalFicha) return;

        modalFicha.classList.add('hidden');
        document.body.style.overflow = '';
    }

    document.addEventListener('keydown', (e) => {
        const modalFicha = document.getElementById('modal-ficha');
        if (!modalFicha) return;

        if (e.key === 'Escape' && !modalFicha.classList.contains('hidden')) {
            cerrarFichaIndicador();
        }
    });

});
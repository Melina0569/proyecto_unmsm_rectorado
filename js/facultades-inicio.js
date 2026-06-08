/**
 * SIGPRO Dashboard - JavaScript Functionality
 * Handles interactions, animations, and data management
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initThemeToggle();
    initActionButtons();
    initSorting();
    initTooltips();
    loadDashboardData();
});

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
// Data Loading from API
// ==========================================
let reportsData = [];
const STORAGE_KEYS = {
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista'
};

function normalizeEstado(estado) {
    const value = String(estado || '').toLowerCase().trim().replace(/\s+/g, '_');
    if (value === 'aprobado' || value === 'completado') return 'completado';
    if (value === 'en_proceso' || value === 'en proceso' || value === 'revision') return 'en_proceso';
    return 'pendiente';
}

async function loadDashboardData() {
    try {
        showToast('Cargando datos del dashboard...', 'info');
        
        // Check if API is available
        if (typeof API === 'undefined' || !API.documentos || !API.documentos.getAll) {
            console.warn('API no disponible, cargando datos de ejemplo');
            throw new Error('API no disponible');
        }
        
        let user = null;
        try {
            user = API.auth.getUser();
        } catch (e) {
            console.log('No hay usuario autenticado');
        }

        // Buscar facultadId en MÚLTIPLES fuentes
        let facultadId = user?.facultadId 
            || user?.facultyId 
            || user?.faculty?.id 
            || user?.facultad?.id 
            || null;

        // Si no está en el objeto user, buscar en localStorage directamente
        if (!facultadId) {
            try {
                const userRaw = localStorage.getItem('unmsm_user');
                if (userRaw) {
                    const userData = JSON.parse(userRaw);
                    facultadId = userData?.facultadId 
                        || userData?.facultyId 
                        || userData?.faculty?.id 
                        || userData?.facultad?.id
                        || userData?.facultadId  // con 'l' minúscula
                        || null;
                }
            } catch (e) {
                console.warn('Error leyendo unmsm_user:', e);
            }
        }

        // Si aún no hay, buscar en keys separadas
        if (!facultadId) {
            facultadId = localStorage.getItem('unmsm_faculty_id') || null;
        }

        // DEBUG: Mostrar qué se encontró
        console.log('🔍 facultadId encontrado:', facultadId);
        console.log('🔍 Usuario:', user);

        // Si NO hay facultadId, NO lanzar error, continuar sin filtro
        if (!facultadId) {
            console.warn('⚠️ No se encontró facultadId. Continuando sin filtro de facultad.');
            // En lugar de throw, continuar con facultadId = null
            // El backend puede devolver todos los documentos o requerir el filtro
        }

        // Load documents from API
        const resultado = await API.portal.documents.getAll({ facultyId: facultadId });
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Error al cargar datos');
        }
        
        const documentos = resultado.data || [];
        
        // Convert API docs to reports format
        const apiReports = documentos.map((doc, index) => ({
            id: doc.id || index + 1,
            date: doc.fecha || new Date().toISOString().split('T')[0],
            time: doc.hora || '10:30 H',
            code: doc.codigo || `DOC-${index + 1}`,
            description: doc.descripcion || 'Documento generado',
            generatedBy: doc.generadoPor || 'Sistema',
            generatedByClass: getGeneratedByClass(doc.generadoPor),
            status: mapStatus(doc.estado),
            statusClass: getStatusClass(doc.estado),
            statusDot: getStatusDot(doc.estado),
            statusPing: normalizeEstado(doc.estado) !== 'completado'
        }));

        // Merge with locally created pending documents
        const localReports = loadLocalReports();
        reportsData = mergeReports(apiReports, localReports)
            .slice(0, 10);
        
        // If API returned vacío, usar datos ejemplos
        if (reportsData.length === 0) {
            console.warn('No hay documentos desde API, usando mock data');
            loadMockData();
            return;
        }

        // Update counters based on merged data
        updateCounters(reportsData.map(r => ({
            estado: mapStatusFromBadge(r.status)
        })));
        
        // Render table
        renderTable(reportsData);
        
        showToast('Datos cargados correctamente', 'success');
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showToast('Usando datos de ejemplo', 'warning');
        
        // Load mock data + local reports
        loadMockData();
    }
}

function loadLocalReports() {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    if (!raw) return [];

    try {
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];

        const locales = list.map((doc, index) => {
            const estadoNormalizado = normalizeEstado(doc.estado || 'pendiente');
            return {
                id: doc.id || `local-${doc.codigo || index}`,
                date: doc.fecha || new Date().toISOString().split('T')[0],
                time: doc.hora || '00:00 H',
                code: doc.codigo || `DOC-${index + 1}`,
                description: doc.descripcion || 'Documento generado',
                generatedBy: doc.generadoPor || 'Facultad',
                generatedByClass: getGeneratedByClass(doc.generadoPor || 'Facultad'),
                status: mapStatus(estadoNormalizado),
                statusClass: getStatusClass(estadoNormalizado),
                statusDot: getStatusDot(estadoNormalizado),
                statusPing: estadoNormalizado !== 'completado',
                origen: 'local'
            };
        });

        if (locales.length > 0) {
            showToast(`Tiene ${locales.length} reporte(s) nuevo(s) en revisión`, 'info', 3500);
        }

        return locales;
    } catch (error) {
        console.error('Error leyendo reportes locales:', error);
        return [];
    }
}

function mergeReports(baseReports, localReports) {
    const byCode = new Map();

    baseReports.forEach(report => {
        byCode.set(report.code, report);
    });

    localReports.forEach(report => {
        const existing = byCode.get(report.code);
        byCode.set(report.code, existing ? { ...existing, ...report } : report);
    });

    return Array.from(byCode.values()).sort((a, b) => {
        const da = new Date(`${a.date}T00:00:00`).getTime();
        const db = new Date(`${b.date}T00:00:00`).getTime();
        return db - da;
    });
}

function mapStatusFromBadge(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'EN PROCESO') return 'en_proceso';
    if (normalized === 'COMPLETADO' || normalized === 'APROBADO') return 'completado';
    return 'pendiente';
}

function mapStatus(estado) {
    const normalized = normalizeEstado(estado);
    const map = {
        'pendiente': 'PENDIENTE',
        'en_proceso': 'EN PROCESO',
        'completado': 'APROBADO'
    };
    return map[normalized] || 'PENDIENTE';
}

function getGeneratedByClass(generadoPor) {
    const classes = {
        'Facultad': 'text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/40 border-pink-200 dark:border-pink-800',
        'Racionalización': 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
        'Sistema': 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800'
    };
    return classes[generadoPor] || classes['Sistema'];
}

function getStatusClass(estado) {
    const normalized = normalizeEstado(estado);
    const classes = {
        'pendiente': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
        'en_proceso': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
        'completado': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    };
    return classes[normalized] || classes['pendiente'];
}

function getStatusDot(estado) {
    const normalized = normalizeEstado(estado);
    const dots = {
        'pendiente': 'bg-red-500',
        'en_proceso': 'bg-amber-500',
        'completado': 'bg-emerald-500'
    };
    return dots[normalized] || 'bg-red-500';
}

function updateCounters(documentos) {
    const expedientesPendientes = documentos.filter(d => d.estado === 'pendiente').length;
    const expedientesEnProceso = documentos.filter(d => d.estado === 'en_proceso').length;
    const expedientesCompletados = documentos.filter(d => d.estado === 'completado').length;

    setCounterValue('count-pendientes', expedientesPendientes);
    setCounterValue('count-en-proceso', expedientesEnProceso);
    setCounterValue('count-completados', expedientesCompletados);
}

function setCounterValue(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const current = parseInt(element.textContent || '0', 10) || 0;
    const duration = 500;
    const start = performance.now();

    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const value = Math.round(current + (target - current) * progress);
        element.textContent = value;
        element.setAttribute('data-count', String(target));

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}

function loadMockData() {
    const mockReports = [
        {
            id: 1,
            date: '2026-02-02',
            time: '10:30 H',
            code: 'PR-FM-26-01',
            description: 'Corrección sobre el proceso "Proceso de matrícula"',
            generatedBy: 'Facultad',
            generatedByClass: 'text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/40 border-pink-200 dark:border-pink-800',
            status: 'PENDIENTE',
            statusClass: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
            statusDot: 'bg-red-500',
            statusPing: true
        },
        {
            id: 2,
            date: '2026-02-02',
            time: '10:30 H',
            code: 'FL-FM-26-01',
            description: 'Corrección sobre el proceso "Proceso de matrícula"',
            generatedBy: 'Racionalización',
            generatedByClass: 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
            status: 'EN PROCESO',
            statusClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
            statusDot: 'bg-amber-500',
            statusPing: true
        },
        {
            id: 3,
            date: '2026-02-02',
            time: '10:30 H',
            code: 'IN-FM-26-01',
            description: 'Corrección sobre el proceso "Proceso de matrícula"',
            generatedBy: 'Racionalización',
            generatedByClass: 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
            status: 'COMPLETADO',
            statusClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
            statusDot: 'bg-emerald-500',
            statusPing: false
        }
    ];

    reportsData = mergeReports(mockReports, loadLocalReports()).slice(0, 10);
    updateCounters(reportsData.map(r => ({ estado: mapStatusFromBadge(r.status) })));
    renderTable(reportsData);
}

// ==========================================
// Table Data Management
// ==========================================

function renderTable(data) {
    const tbody = document.getElementById('reports-tbody');
    tbody.innerHTML = data.map(report => `
        <tr class="bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-700/80 transition-all duration-300 group shadow-sm hover:shadow-md transform hover:-translate-y-0.5 rounded-lg" data-id="${report.id}">
            <td class="py-4 px-4 rounded-l-xl border-l-4 border-transparent group-hover:border-accent">
                <div class="text-sm font-bold text-slate-700 dark:text-slate-200">${formatDate(report.date)}</div>
                <div class="text-xs text-slate-400">${report.time}</div>
            </td>
            <td class="py-4 px-4 font-mono text-sm font-medium text-slate-600 dark:text-slate-300">${report.code}</td>
            <td class="py-4 px-4 max-w-xs">
                <p class="text-sm text-slate-600 dark:text-slate-400 truncate" title="${report.description}">${report.description}</p>
            </td>
            <td class="py-4 px-4">
                <span class="text-xs font-bold ${report.generatedByClass} px-3 py-1 rounded-full border uppercase">${report.generatedBy}</span>
            </td>
            <td class="py-4 px-4">
                <span class="flex items-center gap-2 text-xs font-bold ${report.statusClass} px-3 py-1 rounded-full w-fit status-badge">
                    ${report.statusPing ? `
                        <span class="relative flex h-2 w-2">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${report.statusDot} opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 ${report.statusDot}"></span>
                        </span>
                    ` : `
                        <span class="relative flex h-2 w-2">
                            <span class="relative inline-flex rounded-full h-2 w-2 ${report.statusDot}"></span>
                        </span>
                    `}
                    ${report.status}
                </span>
            </td>
            <td class="py-4 px-4 text-center rounded-r-xl">
                <button class="p-2 rounded-lg text-accent hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors view-btn" data-id="${report.id}" title="Revisar">
                    <span class="material-symbols-outlined text-lg">visibility</span>
                </button>
                <button class="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors delete-btn" data-id="${report.id}" title="Eliminar">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Add event listeners to action buttons
    tbody.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            viewReport(id);
        });
    });
    
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteReport(id);
        });
    });
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// ==========================================
// Table Actions
// ==========================================
function viewReport(id) {
    const report = reportsData.find(r => r.id === id);
    if (report) {
        showToast(`Abriendo expediente ${report.code}...`, 'info');
        // Redirect to documentos page with query string (use code para garantizar match)
        setTimeout(() => {
            window.location.href = `facultades-documentos.html?docCode=${encodeURIComponent(report.code)}`;
        }, 300);
    }
}

function deleteReport(id) {
    const report = reportsData.find(r => r.id === id);
    if (report) {
        showToast(`Eliminando reporte ${report.code}...`, 'warning');
        // Simulate deletion
        setTimeout(() => {
            reportsData = reportsData.filter(r => r.id !== id);
            renderTable(reportsData);
            updateCounters(reportsData.map(r => ({ estado: r.status.toLowerCase().replace(' ', '_') })));
            showToast('Reporte eliminado', 'success');
        }, 500);
    }
}

function deleteReport(id) {
    const report = reportsData.find(r => r.id === id);
    if (report) {
        showToast(`Eliminando reporte ${report.code}...`, 'warning');
        // Simulate deletion
        setTimeout(() => {
            reportsData = reportsData.filter(r => r.id !== id);
            renderTable(reportsData);
            updateCounters(reportsData.map(r => ({ estado: r.status.toLowerCase().replace(' ', '_') })));
            showToast('Reporte eliminado', 'success');
        }, 500);
    }
}

function deleteReport(id) {
    const index = reportsData.findIndex(r => r.id === id);
    if (index > -1) {
        const report = reportsData[index];
        if (confirm(`¿Estás seguro de eliminar el reporte ${report.code}?`)) {
            reportsData.splice(index, 1);
            persistLocalReports(report.code);
            renderTable(reportsData);
            showToast(`Reporte ${report.code} eliminado`, 'success');
        }
    }
}

function persistLocalReports(codeToDelete) {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    if (!raw) return;

    try {
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return;
        const updated = list.filter(item => item.codigo !== codeToDelete);
        localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(updated));
    } catch (error) {
        console.error('Error actualizando reportes locales:', error);
    }
}

// ==========================================
// Sorting Functionality
// ==========================================
function initSorting() {
    const headers = document.querySelectorAll('th[data-sort]');
    let sortDirection = {};
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            sortDirection[sortKey] = !sortDirection[sortKey];
            
            const sorted = [...reportsData].sort((a, b) => {
                let valA = a[sortKey];
                let valB = b[sortKey];
                
                if (sortKey === 'date') {
                    valA = new Date(a.date);
                    valB = new Date(b.date);
                }
                
                if (valA < valB) return sortDirection[sortKey] ? -1 : 1;
                if (valA > valB) return sortDirection[sortKey] ? 1 : -1;
                return 0;
            });
            
            renderTable(sorted);
            
            // Update header indicator
            headers.forEach(h => {
                if (h !== header) h.textContent = h.textContent.replace(/[↑↓]/, '↕');
            });
            header.textContent = header.textContent.replace('↕', sortDirection[sortKey] ? '↑' : '↓');
        });
    });
}

// ==========================================
// Action Buttons
// ==========================================
function initActionButtons() {
    const buttons = document.querySelectorAll('.action-button');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleAction(action, e.currentTarget);
        });
    });
    
    // View all button
    document.getElementById('view-all-btn')?.addEventListener('click', () => {
        showToast('Cargando todos los reportes...', 'info');
        // Simulate loading more data
        setTimeout(() => {
            showToast('Aun no disponible', 'warning');
        }, 1000);
    });
}

function handleAction(action, button) {
    const actions = {
        'create-indicator': {
            text: 'Iniciar',
            loadingText: 'Creando...',
            message: 'Iniciando creación de ficha de indicador'
        },
        'upload-flowchart': {
            text: 'Subir',
            loadingText: 'Subiendo...',
            message: 'Abriendo ficha de flujograma'
        },
        'upload-characterization': {
            text: 'Subir',
            loadingText: 'Subiendo...',
            message: 'Abriendo ficha de caracterización'
        },
        'upload-report': {
            text: 'Iniciar',
            loadingText: 'Subiendo...',
            message: 'Iniciando creación de hoja de reportes'
        }

    };
    
    const config = actions[action];
    if (!config) return;
    
    // Mostrar loading
    const originalText = button.textContent;
    button.innerHTML = `<span class="spinner-inline"></span>${config.loadingText}`;
    button.disabled = true;
    
    showToast(config.message, 'info');
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
    }, 1500);
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
// Cargar tarjetas de acciones desde API
// ==========================================

async function cargarTarjetasAcciones() {
    const container = document.getElementById('action-cards-container');
    
    if (!container) {
        console.error('No se encontró el contenedor de tarjetas');
        return;
    }
    
    try {
        // Llamar a la API
        const resultado = await API.dashboardActions.getAll();
        
        if (!resultado.success) {
            console.error('Error cargando acciones:', resultado.error);
            return;
        }
        
        const acciones = resultado.data;
        
        // Ajustar grid según cantidad (3 o 4)
        container.className = `grid grid-cols-1 md:grid-cols-${acciones.length} gap-6 mb-12`;
        
        // Renderizar tarjetas
        container.innerHTML = acciones.map((accion, index) => `
            <div class="premium-glass action-card hover-lift-enhanced" data-id="${accion.id}">
                <div class="action-icon-3d ${accion.color}" style="animation-delay: ${index * 0.5}s;">
                    <span class="material-symbols-outlined">${accion.icono}</span>
                </div>
                <h3>${accion.titulo}</h3>
                <button class="action-button" data-action="${accion.accion}" data-url="${accion.url}">
                    ${accion.botonTexto}
                </button>
            </div>
        `).join('');
        
        // Agregar event listeners
        container.querySelectorAll('.action-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const url = e.currentTarget.dataset.url;
                manejarAccion(action, url, e.currentTarget);
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p class="text-center text-red-500 col-span-full">Error cargando acciones</p>';
    }
}

// ==========================================
// Cargar dashboard completo desde API
// ==========================================

async function cargarDashboard() {
    try {
        // Obtener usuario actual para filtrar por facultad si es necesario
        const user = API.auth.getUser();
        const facultadId = user?.facultadId || null;
        
        // Llamar a la API
        const resultado = await API.dashboard.getPublicMetrics(facultadId);
        
        if (!resultado.success) {
            console.error('Error cargando dashboard:', resultado.error);
            return;
        }
        
        const data = resultado.data;
        
        // 1. Actualizar tarjetas de estadísticas
        actualizarTarjetasStats(data.estadisticas);
        
        // 2. Actualizar tabla de reportes
        actualizarTablaReportes(data.ultimosReportes);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

function actualizarTarjetasStats(estadisticas) {
    // Actualizar los data-count y re-iniciar animación
    const tarjetas = document.querySelectorAll('.lava-card');
    
    const config = [
        { selector: '.lava-card.orange .number', valor: estadisticas.pendientes },
        { selector: '.lava-card.blue .number', valor: estadisticas.enProceso },
        { selector: '.lava-card.emerald .number', valor: estadisticas.completados }
    ];
    
    config.forEach(item => {
        const el = document.querySelector(item.selector);
        if (el) {
            el.setAttribute('data-count', item.valor);
            el.textContent = '0'; // Reset para animación
        }
    });
    
    // Reiniciar animación de contadores
    reiniciarContadores();
}

function actualizarTablaReportes(reportes) {
    const tbody = document.getElementById('reports-tbody');
    if (!tbody) return;
    
    // Mapear reportes a formato de tabla
    const filas = reportes.map(reporte => {
        const estadoConfig = getEstadoConfig(reporte.estado);
        
        return {
            id: reporte.id,
            date: reporte.fecha,
            time: reporte.hora,
            code: reporte.codigo,
            description: reporte.descripcion,
            generatedBy: reporte.generadoPor,
            generatedByClass: getGeneradoPorClass(reporte.generadoPor),
            status: reporte.estado,
            statusClass: estadoConfig.class,
            statusDot: estadoConfig.dot,
            statusPing: estadoConfig.ping
        };
    });
    
    // Renderizar (usa tu función existente o crea una nueva)
    renderTable(filas);
}

function getEstadoConfig(estado) {
    const configs = {
        'PENDIENTE': {
            class: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
            dot: 'bg-red-500',
            ping: true
        },
        'EN PROCESO': {
            class: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
            dot: 'bg-amber-500',
            ping: true
        },
        'COMPLETADO': {
            class: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
            dot: 'bg-emerald-500',
            ping: false
        }
    };
    
    return configs[estado] || configs['PENDIENTE'];
}

function getGeneradoPorClass(generadoPor) {
    const classes = {
        'FACULTAD': 'text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/40 border-pink-200 dark:border-pink-800',
        'RACIONALIZACIÓN': 'text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800'
    };
    
    return classes[generadoPor] || classes['FACULTAD'];
}

function reiniciarContadores() {
    // Limpiar observers anteriores si existen
    if (window.countersObserver) {
        window.countersObserver.disconnect();
    }
    
    // Crear nuevo observer
    const counters = document.querySelectorAll('[data-count]');
    
    window.countersObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                window.countersObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => window.countersObserver.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-count'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const updateCount = () => {
        current += step;
        if (current < target) {
            element.textContent = Math.floor(current);
            requestAnimationFrame(updateCount);
        } else {
            element.textContent = target;
        }
    };
    
    updateCount();
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
        // Trigger reflow para asegurar que la animación se aplique
        void logoutModal.offsetWidth;
        logoutModal.classList.add('show-modal');
    }

    function cerrarModalLogout() {
        logoutModal.classList.add('hide-modal');
        logoutModal.classList.remove('show-modal');
        
        // Esperar a que termine la animación antes de ocultar
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
                // 1. Llamar al backend PRIMERO (antes de limpiar el token)
                try {
                    // Usar la API híbrida que ya maneja el token automáticamente
                    if (typeof API !== 'undefined' && API.auth && API.auth.logout) {
                        await API.auth.logout();
                    } else {
                        // Fallback manual si API no está disponible
                        const token = localStorage.getItem('unmsm_token') 
                            || localStorage.getItem('token') 
                            || localStorage.getItem('accessToken');
                        
                        if (token) {
                            await fetch('http://localhost:8080/v1/auth/logout', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.log('Logout backend (silencioso):', error.message);
                }

                // 2. Limpiar TODO el almacenamiento local
                localStorage.clear();
                sessionStorage.clear();

                // 3. Redirigir reemplazando el historial (no deja rastro de la sesión)
                window.location.replace('index.html');
            }, 400);
        }

    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // CERRAR DROPDOWN PRIMERO
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
        document.body.style.overflow = ''; // Restaurar scroll
    }

    // Cerrar con Escape solo si el modal está visible
    document.addEventListener('keydown', (e) => {
        const modalFicha = document.getElementById('modal-ficha');
        if (!modalFicha) return;

        if (e.key === 'Escape' && !modalFicha.classList.contains('hidden')) {
            cerrarFichaIndicador();
        }
    });

});




/**
 * FACULTADES EXPEDIENTES - JavaScript Principal
 * Panel de documentos aprobados
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    EXPEDIENTES_LISTA: 'sigpro_expedientes_lista',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    FACULTAD_ID: 'sigpro_facultad_id'
};

let expedientes = [];

function esEstadoAprobado(estado) {
    const value = String(estado || '').toLowerCase().trim();
    return value === 'aprobado' || value === 'completado';
}

const PERFIL_FALLBACK = {
    nombre: 'Usuario SIGPRO',
    email: 'usuario@unmsm.edu.pe',
    iniciales: 'US',
    rol: 'Usuario',
    facultad: 'UNMSM',
    color: 'bg-blue-600'
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initThemeToggle();
    initProfileDropdown();
    initLogoutModal();
    await cargarPerfilDesdeBackend();
    cargarExpedientes();
    
    // Filtro
    document.getElementById('filtro-tipo')?.addEventListener('change', filtrarExpedientes);
});

// ==========================================
// TEMA
// ==========================================

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    
    toggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
    });
}

// ==========================================
// PERFIL DROPDOWN
// ==========================================

function initProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (!profileBtn || !profileDropdown) return;

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
    
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = !profileDropdown.classList.contains('hidden') &&
            !profileDropdown.classList.contains('hide-profile');

        if (isVisible) {
            closeProfileDropdown();
        } else {
            openProfileDropdown();
        }
    });
    
    document.addEventListener('click', () => {
        closeProfileDropdown();
    });

    document.addEventListener('keydown', (e) => {
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

    function ejecutarLogout() {
        logoutModal.classList.add('hide-modal');
        logoutModal.classList.remove('show-modal');

        setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();

            if (typeof API !== 'undefined' && API.auth && API.auth.logout) {
                Promise.resolve(API.auth.logout()).catch(() => {});
            }

            window.location.href = 'portal-inicio.html';
        }, 400);
    }

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

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

    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) {
            cerrarModalLogout();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !logoutModal.classList.contains('hidden')) {
            cerrarModalLogout();
        }
    });
}

// ==========================================
// CARGAR EXPEDIENTES
// ==========================================

async function cargarExpedientes() {
    showToast('Cargando expedientes...', 'info');
    
    try {
        // Intentar cargar desde API
        if (typeof API !== 'undefined' && API.expedientes) {
            const response = await API.expedientes.getAprobados();
            if (response.success) {
                expedientes = (response.data || []).filter(item => esEstadoAprobado(item.estado));

                const desdeDocumentos = obtenerExpedientesDesdeDocumentos();
                expedientes = fusionarExpedientes(expedientes, desdeDocumentos);
                expedientes = asegurarInventarioEjemplo(expedientes);

                renderizarExpedientes();
                return;
            }
        }
    } catch (error) {
        console.log('API no disponible, usando localStorage');
    }
    
    // Fallback: Cargar desde localStorage o datos de demo
    const guardado = localStorage.getItem(STORAGE_KEYS.EXPEDIENTES_LISTA);
    if (guardado) {
        expedientes = JSON.parse(guardado).filter(item => esEstadoAprobado(item.estado));

        const desdeDocumentos = obtenerExpedientesDesdeDocumentos();
        expedientes = fusionarExpedientes(expedientes, desdeDocumentos);
        expedientes = asegurarInventarioEjemplo(expedientes);
    } else {
        // Datos de demostración
        expedientes = [
            {
                id: '1',
                codigo: 'IND-2026-001',
                tipo: 'indicador',
                nombre: 'Índice de Ejecución Presupuestal',
                macroProceso: 'Gestión de Recursos Económicos',
                fechaAprobacion: '2026-03-15',
                estado: 'aprobado',
                responsable: 'Oficina de Planificación'
            },
            {
                id: '2',
                codigo: 'FLU-2026-001',
                tipo: 'flujograma',
                nombre: 'Proceso de Admisión de Estudiantes',
                macroProceso: 'Gestión de Admisión y Matrícula',
                fechaAprobacion: '2026-03-10',
                estado: 'aprobado',
                responsable: 'Dirección de Admisión'
            },
            {
                id: '3',
                codigo: 'CAR-2026-001',
                tipo: 'caracterizacion',
                nombre: 'Ficha de Caracterización - Proceso de Investigación',
                macroProceso: 'Gestión de Investigación',
                fechaAprobacion: '2026-03-05',
                estado: 'aprobado',
                responsable: 'Vicerrectorado de Investigación'
            },
            {
                id: '4',
                codigo: 'REP-2026-001',
                tipo: 'reporte',
                nombre: 'Hoja de Reporte Mensual - Matrícula',
                macroProceso: 'Gestión de Admisión y Matrícula',
                fechaAprobacion: '2026-02-28',
                estado: 'aprobado',
                responsable: 'Dirección de Registros Académicos'
            },
            {
                id: '5',
                codigo: 'INV-2026-001',
                tipo: 'inventario',
                nombre: 'Inventario Institucional de Procesos',
                macroProceso: 'Gestión de Inventarios',
                fechaAprobacion: '2026-03-20',
                estado: 'aprobado',
                responsable: 'Oficina de Racionalización'
            }
        ];
        
        // Guardar en localStorage
        localStorage.setItem(STORAGE_KEYS.EXPEDIENTES_LISTA, JSON.stringify(expedientes));

        const desdeDocumentos = obtenerExpedientesDesdeDocumentos();
        expedientes = fusionarExpedientes(expedientes, desdeDocumentos);
    }
    
    renderizarExpedientes();
}

// ==========================================
// RENDERIZAR EXPEDIENTES
// ==========================================

function renderizarExpedientes(filtrarPor = 'todos') {
    const grid = document.getElementById('grid-expedientes');
    const estadoVacio = document.getElementById('estado-vacio');
    
    if (!grid) return;
    
    // Filtrar
    const filtrados = filtrarPor === 'todos' 
        ? expedientes 
        : expedientes.filter(e => e.tipo === filtrarPor);
    
    if (filtrados.length === 0) {
        grid.innerHTML = '';
        estadoVacio?.classList.remove('hidden');
        return;
    }
    
    estadoVacio?.classList.add('hidden');
    
    grid.innerHTML = filtrados.map(exp => {
        const icono = getIconoPorTipo(exp.tipo);
        const color = getColorPorTipo(exp.tipo);
        const procesoConCodigo = exp.tipo === 'indicador'
            ? obtenerProcesoIndicadorConCodigo(exp.proceso || exp.macroProceso || 'No registrado')
            : '';
        const infoIndicador = exp.tipo === 'indicador'
            ? `
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span class="material-symbols-outlined text-slate-400 text-sm">tune</span>
                    <span class="truncate">Tipo de proceso: ${exp.tipoProceso || 'No registrado'}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span class="material-symbols-outlined text-slate-400 text-sm">account_tree</span>
                    <span class="truncate">Proceso: ${procesoConCodigo}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-slate-400 text-sm">calendar_today</span>
                    <span>Aprobado: ${formatearFecha(exp.fechaAprobacion)}</span>
                </div>
            `
            : `
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span class="material-symbols-outlined text-slate-400 text-sm">account_tree</span>
                    <span class="truncate">${exp.macroProceso}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span class="material-symbols-outlined text-slate-400 text-sm">business</span>
                    <span class="truncate">${exp.responsable}</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-slate-400 text-sm">calendar_today</span>
                    <span>Aprobado: ${formatearFecha(exp.fechaAprobacion)}</span>
                </div>
            `;
        
        return `
              <div class="expediente-card bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all hover:-translate-y-1 cursor-pointer group flex flex-col h-full overflow-hidden"
                 onclick="verExpediente('${exp.tipo}', '${exp.codigo}')">
                
                <!-- Header con icono -->
                <div class="p-6 border-b border-slate-100 dark:border-slate-700">
                    <div class="flex items-start justify-between">
                        <div class="w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-lg">
                            <span class="material-symbols-outlined text-white text-2xl">${icono}</span>
                        </div>
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            ${exp.estado}
                        </span>
                    </div>
                    <h3 class="mt-4 font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-primary transition-colors">
                        ${exp.tipo === 'indicador' ? (exp.nombreIndicador || exp.nombre) : exp.nombre}
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">${exp.codigo}</p>
                </div>
                
                <!-- Info -->
                <div class="p-6 space-y-3 flex-1">
                    ${infoIndicador}
                </div>
                
                <!-- Footer -->
                <div class="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                            ${getNombreTipo(exp.tipo)}
                        </span>
                        <div class="flex items-center gap-1">
                            <button
                                type="button"
                                class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Eliminar del repositorio"
                                onclick="eliminarExpediente('${exp.codigo}', event)">
                                <span class="material-symbols-outlined text-base">delete</span>
                            </button>
                            <span class="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                                arrow_forward
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// NAVEGACIÓN A EXPEDIENTE ESPECÍFICO
// ==========================================

function verExpediente(tipo, codigo) {
    // Guardar el expediente seleccionado
    const expediente = expedientes.find(e => e.codigo === codigo);
    if (expediente) {
        localStorage.setItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL, JSON.stringify(expediente));
    }
    
    // Navegar según el tipo
    const urls = {
        indicador: `expediente-indicador.html?codigo=${encodeURIComponent(codigo)}`,
        flujograma: `expediente-flujograma.html?codigo=${encodeURIComponent(codigo)}`,
        caracterizacion: `expediente-caracterizacion.html?codigo=${encodeURIComponent(codigo)}`,
        reporte: `expediente-reporte.html?codigo=${encodeURIComponent(codigo)}`,
        inventario: `expediente-inventario.html?codigo=${encodeURIComponent(codigo)}`
    };
    
    const url = urls[tipo] || 'facultades-expedientes.html';
    window.location.href = url;
}

// ==========================================
// FILTRAR
// ==========================================

function filtrarExpedientes() {
    const filtro = document.getElementById('filtro-tipo')?.value || 'todos';
    renderizarExpedientes(filtro);
}

function eliminarExpediente(codigo, event) {
    event?.stopPropagation();

    if (!confirm(`¿Desea eliminar el expediente ${codigo}?`)) {
        return;
    }

    expedientes = expedientes.filter(exp => exp.codigo !== codigo);
    localStorage.setItem(STORAGE_KEYS.EXPEDIENTES_LISTA, JSON.stringify(expedientes));

    const documentosRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    if (documentosRaw) {
        try {
            const documentos = JSON.parse(documentosRaw);
            if (Array.isArray(documentos)) {
                const actualizados = documentos.filter((doc) => doc?.codigo !== codigo);
                localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(actualizados));
            }
        } catch (error) {
            console.error('Error limpiando sigpro_documentos_lista:', error);
        }
    }

    const reportesRaw = localStorage.getItem('sigpro_reportes');
    if (reportesRaw) {
        try {
            const reportes = JSON.parse(reportesRaw);
            if (Array.isArray(reportes)) {
                const actualizados = reportes.filter((item) => item?.codigo !== codigo);
                localStorage.setItem('sigpro_reportes', JSON.stringify(actualizados));
            }
        } catch (error) {
            console.error('Error limpiando sigpro_reportes:', error);
        }
    }

    const detalleRaw = localStorage.getItem('sigpro_documentos_detalle');
    if (detalleRaw) {
        try {
            const detalle = JSON.parse(detalleRaw);
            if (detalle && typeof detalle === 'object' && detalle[codigo]) {
                delete detalle[codigo];
                localStorage.setItem('sigpro_documentos_detalle', JSON.stringify(detalle));
            }
        } catch (error) {
            console.error('Error limpiando sigpro_documentos_detalle:', error);
        }
    }

    const cuadrosRaw = localStorage.getItem('sigpro_reporte_cuadros');
    if (cuadrosRaw) {
        try {
            const cuadros = JSON.parse(cuadrosRaw);
            if (cuadros && typeof cuadros === 'object' && cuadros[codigo]) {
                delete cuadros[codigo];
                localStorage.setItem('sigpro_reporte_cuadros', JSON.stringify(cuadros));
            }
        } catch (error) {
            console.error('Error limpiando sigpro_reporte_cuadros:', error);
        }
    }

    const actualRaw = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    if (actualRaw) {
        const actual = JSON.parse(actualRaw);
        if (actual?.codigo === codigo) {
            localStorage.removeItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
        }
    }

    filtrarExpedientes();
    showToast('Expediente eliminado del repositorio', 'success');
}

// ==========================================
// UTILIDADES
// ==========================================

function getIconoPorTipo(tipo) {
    const iconos = {
        indicador: 'monitoring',
        flujograma: 'account_tree',
        caracterizacion: 'description',
        reporte: 'summarize',
        inventario: 'inventory_2'
    };
    return iconos[tipo] || 'description';
}

function getColorPorTipo(tipo) {
    const colores = {
        indicador: 'bg-blue-600',
        flujograma: 'bg-purple-600',
        caracterizacion: 'bg-emerald-600',
        reporte: 'bg-amber-600',
        inventario: 'bg-cyan-600'
    };
    return colores[tipo] || 'bg-slate-600';
}

function getNombreTipo(tipo) {
    const nombres = {
        indicador: 'Indicador',
        flujograma: 'Flujograma',
        caracterizacion: 'Ficha de Caracterización',
        reporte: 'Hoja de Reporte',
        inventario: 'Ficha de Inventario'
    };
    return nombres[tipo] || 'Documento';
}

function getUrlPorTipo(tipo, codigo) {
    const urls = {
        indicador: `expediente-indicador.html?codigo=${codigo}`,
        flujograma: `expediente-flujograma.html?codigo=${codigo}`,
        caracterizacion: `expediente-caracterizacion.html?codigo=${codigo}`,
        reporte: `expediente-reporte.html?codigo=${codigo}`,
        inventario: `expediente-inventario.html?codigo=${codigo}`
    };
    return urls[tipo] || '#';
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function getColorPorRol(rol) {
    const colores = {
        administrador: 'bg-blue-600',
        admin: 'bg-blue-600',
        editor: 'bg-emerald-600',
        visualizador: 'bg-purple-600',
        'usuario facultad': 'bg-amber-600'
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
        .map((parte) => parte[0]?.toUpperCase())
        .join('') || 'US';
}

function obtenerCargoORol(user) {
    return user?.cargo
        || user?.cargoNombre
        || user?.puesto
        || user?.rol
        || user?.role
        || PERFIL_FALLBACK.rol;
}

function obtenerNombreFacultad(user) {
    const facultadRaw = user?.facultad || user?.faculty;
    if (typeof facultadRaw === 'string' && facultadRaw.trim()) return facultadRaw;
    if (facultadRaw && typeof facultadRaw === 'object') {
        return facultadRaw.nombre
            || facultadRaw.descripcion
            || facultadRaw.name
            || PERFIL_FALLBACK.facultad;
    }
    return user?.facultadNombre
        || user?.nombreFacultad
        || user?.nombre_facultad
        || user?.facultadName
        || user?.facultad_id_nombre
        || PERFIL_FALLBACK.facultad;
}

function normalizarPerfil(user) {
    if (!user || typeof user !== 'object') return null;

    const email = user.correo || user.email || PERFIL_FALLBACK.email;
    const nombreBase = user.nombreCompleto || user.nombre || user.name || email.split('@')[0] || PERFIL_FALLBACK.nombre;
    const nombre = String(nombreBase).replace(/\./g, ' ').trim() || PERFIL_FALLBACK.nombre;
    const rol = obtenerCargoORol(user);
    const facultad = obtenerNombreFacultad(user);

    return {
        nombre,
        email,
        iniciales: user.iniciales || getInicialesDesdeNombre(nombre),
        rol,
        facultad,
        color: user.color || getColorPorRol(rol)
    };
}

function renderizarPerfil(usuario) {
    const inicialesEl = document.getElementById('profile-iniciales');
    const nombreEl = document.getElementById('profile-nombre');
    const emailEl = document.getElementById('profile-email');
    const rolEl = document.getElementById('profile-rol');
    const facultadEl = document.getElementById('profile-facultad');
    const avatarEl = document.getElementById('profile-avatar');

    if (inicialesEl) inicialesEl.textContent = usuario.iniciales || '-';
    if (nombreEl) nombreEl.textContent = usuario.nombre || 'Usuario';
    if (emailEl) emailEl.textContent = usuario.email || '-';
    if (rolEl) rolEl.textContent = usuario.rol || '-';
    if (facultadEl) facultadEl.textContent = usuario.facultad || '-';
    if (avatarEl) {
        avatarEl.className = `w-10 h-10 rounded-full ${usuario.color || 'bg-slate-600'} flex items-center justify-center text-white font-semibold`;
    }
}

async function cargarPerfilDesdeBackend() {
    try {
        if (typeof API !== 'undefined' && API.auth && typeof API.auth.getUser === 'function') {
            const response = await Promise.resolve(API.auth.getUser());
            const user = response && response.success && response.data ? response.data : response;
            const perfilApi = normalizarPerfil(user);
            if (perfilApi) {
                renderizarPerfil(perfilApi);
                return;
            }
        }

        const rawStorage = localStorage.getItem('usuario')
            || localStorage.getItem('sigpro_usuario')
            || localStorage.getItem('usuario_actual')
            || localStorage.getItem('user')
            || localStorage.getItem('unmsm_user');

        if (rawStorage) {
            const usuarioLocal = JSON.parse(rawStorage);
            const perfilStorage = normalizarPerfil(usuarioLocal);
            if (perfilStorage) {
                renderizarPerfil(perfilStorage);
                return;
            }
        }

        renderizarPerfil(PERFIL_FALLBACK);
    } catch (error) {
        console.error('Error cargando perfil:', error);
        renderizarPerfil(PERFIL_FALLBACK);
    }
}

function obtenerExpedientesDesdeDocumentos() {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    if (!raw) return [];

    try {
        const docs = JSON.parse(raw);
        if (!Array.isArray(docs)) return [];

        const detalleRaw = localStorage.getItem('sigpro_documentos_detalle');
        const detalleMap = detalleRaw ? JSON.parse(detalleRaw) : {};

        return docs
            .filter((doc) => {
                const estado = String(doc.estado || '').toLowerCase();
                return estado === 'completado' || estado === 'aprobado';
            })
            .map((doc) => {
                const tipo = doc.tipo || inferirTipo(doc.codigo);
                const detalle = detalleMap?.[doc.codigo] || null;
                const titulo = tipo === 'reporte'
                    ? obtenerTituloReporteDesdeDetalle(detalle, doc)
                    : (tipo === 'indicador'
                        ? obtenerNombreIndicadorDesdeDetalle(detalle, doc)
                        : (doc.descripcion || `Expediente ${doc.codigo}`));

                const tipoProceso = tipo === 'indicador' ? obtenerTipoProcesoIndicador(detalle) : '';
                const proceso = tipo === 'indicador' ? obtenerProcesoIndicador(detalle, doc) : '';

                return {
                    id: doc.id || doc.codigo,
                    codigo: doc.codigo,
                    tipo,
                    nombre: titulo,
                    nombreIndicador: tipo === 'indicador' ? titulo : '',
                    tipoProceso,
                    proceso,
                    macroProceso: doc.macroProceso || 'Gestión Institucional',
                    fechaAprobacion: doc.fechaAprobacion || doc.fechaActualizacion || doc.fecha || new Date().toISOString().split('T')[0],
                    estado: 'aprobado',
                    responsable: doc.responsable || 'Oficina de Planeamiento'
                };
            });
    } catch (error) {
        console.error('Error leyendo documentos aprobados para repositorio:', error);
        return [];
    }
}

function obtenerTituloReporteDesdeDetalle(detalle, doc) {
    const actividades = detalle?.reporteData?.actividades
        || buscarCampoResumen(detalle?.resumenCampos, 'Actividades realizadas')
        || '';

    const tituloBase = String(actividades || '').trim();
    if (!tituloBase) {
        return doc.descripcion || `Reporte ${doc.codigo}`;
    }

    const maxLen = 70;
    if (tituloBase.length <= maxLen) {
        return tituloBase;
    }

    return `${tituloBase.slice(0, maxLen).trim()}...`;
}

function buscarCampoResumen(resumenCampos, labelObjetivo) {
    if (!Array.isArray(resumenCampos)) return '';

    const target = String(labelObjetivo || '').toLowerCase().trim();
    const match = resumenCampos.find((item) => String(item?.label || '').toLowerCase().trim() === target);
    return match?.value || '';
}

function fusionarExpedientes(base, extra) {
    const map = new Map();

    [...base, ...extra].forEach((item) => {
        if (!item?.codigo) return;
        map.set(item.codigo, item);
    });

    return Array.from(map.values());
}

function asegurarInventarioEjemplo(lista) {
    const items = Array.isArray(lista) ? [...lista] : [];
    const existeInventario = items.some((item) => item?.tipo === 'inventario' || inferirTipo(item?.codigo) === 'inventario');

    if (!existeInventario) {
        items.push({
            id: '5',
            codigo: 'INV-2026-001',
            tipo: 'inventario',
            nombre: 'Inventario Institucional de Procesos',
            macroProceso: 'Gestión de Inventarios',
            fechaAprobacion: '2026-03-20',
            estado: 'aprobado',
            responsable: 'Oficina de Racionalización'
        });
    }

    return items;
}

function inferirTipo(codigo) {
    const prefix = String(codigo || '').split('-')[0].toUpperCase();

    if (prefix === 'IND') return 'indicador';
    if (prefix === 'FLU' || prefix === 'FL') return 'flujograma';
    if (prefix === 'CAR') return 'caracterizacion';
    if (prefix === 'HR' || prefix === 'REP') return 'reporte';
    if (prefix === 'INV') return 'inventario';

    return 'reporte';
}

function obtenerNombreIndicadorDesdeDetalle(detalle, doc) {
    const nombre = detalle?.fichaData?.nombreIndicador
        || buscarCampoResumen(detalle?.resumenCampos, 'Nombre del Indicador')
        || buscarCampoResumen(detalle?.resumenCampos, 'Indicador')
        || doc.descripcion
        || `Indicador ${doc.codigo}`;

    return String(nombre).trim();
}

function obtenerTipoProcesoIndicador(detalle) {
    const tipoProceso = detalle?.fichaData?.tipoProcesoLabel
        || detalle?.fichaData?.tipoProceso
        || buscarCampoResumen(detalle?.resumenCampos, 'Tipo de Proceso')
        || 'No registrado';

    return String(tipoProceso).trim();
}

function obtenerProcesoIndicador(detalle, doc) {
    const proceso = detalle?.fichaData?.macroProcesoNombre
        || detalle?.fichaData?.macroProceso
        || buscarCampoResumen(detalle?.resumenCampos, 'Proceso')
        || buscarCampoResumen(detalle?.resumenCampos, 'Macro Proceso')
        || doc.macroProceso
        || 'No registrado';

    return String(proceso).trim();
}

function obtenerProcesoIndicadorConCodigo(proceso) {
    const texto = String(proceso || '').trim();
    if (!texto) return 'No registrado';

    const codigoInicio = texto.match(/^([A-Za-z]{2,5})[\.-]?(\d{1,3})\s*[-:]?\s*/);
    if (codigoInicio) {
        const prefijo = codigoInicio[1].toUpperCase();
        const numero = String(codigoInicio[2]).padStart(2, '0');
        return `${prefijo}-${numero}`;
    }

    return texto;
}
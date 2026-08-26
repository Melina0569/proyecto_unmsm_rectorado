/**
 * FACULTADES EXPEDIENTES - JavaScript Principal (CORREGIDO)
 * 
 * CAMBIOS:
 * 1. inferirTipo() ahora reconoce prefijos: FC, CAR, FI, FG, IND, FLU, FL, REP, HR, INV
 * 2. Sincronizacion correcta de tipo al aprobar/guardar
 * 3. Funciones de guardado/aprobacion con Google Sheets integrado
 */

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    EXPEDIENTES_LISTA: 'sigpro_expedientes_lista',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
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
// INICIALIZACION
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initThemeToggle();
    initProfileDropdown();
    initLogoutModal();
    await cargarPerfilDesdeBackend();
    cargarExpedientes();

    document.getElementById('filtro-tipo')?.addEventListener('change', filtrarExpedientes);
});

// ============================================
// ANTI-BACK BUTTON
// ============================================

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        const hasToken = !!(
            localStorage.getItem('token') ||
            localStorage.getItem('unmsm_token') ||
            localStorage.getItem('auth_token') ||
            localStorage.getItem('accessToken')
        );
        if (!hasToken) {
            window.location.replace('portal-inicio-facultades.html');
        } else {
            window.location.reload();
        }
    }
});

(function checkSessionOnLoad() {
    const hasToken = !!(
        localStorage.getItem('token') ||
        localStorage.getItem('unmsm_token') ||
        localStorage.getItem('auth_token') ||
        localStorage.getItem('accessToken')
    );
    if (!hasToken) {
        window.location.replace('portal-inicio-facultades.html');
        return;
    }
})();

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
// PERFIL DROPDOWN (sin cambios)
// ==========================================

function initProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    if (!profileBtn || !profileDropdown) return;

    let hideTimer = null;

    function openProfileDropdown() {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        profileDropdown.classList.remove('hidden', 'hide-profile');
        void profileDropdown.offsetWidth;
        profileDropdown.classList.add('show-profile');
    }

    function closeProfileDropdown(immediate = false) {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
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
        if (isVisible) closeProfileDropdown(); else openProfileDropdown();
    });

    document.addEventListener('click', () => closeProfileDropdown());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProfileDropdown();
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
            window.location.replace('portal-inicio-facultades.html');
        }, 400);
    }

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (profileDropdown) {
            profileDropdown.classList.remove('show-profile', 'hide-profile');
            profileDropdown.classList.add('hidden');
        }
        abrirModalLogout();
    });
    if (logoutCancel) logoutCancel.addEventListener('click', cerrarModalLogout);
    if (logoutConfirm) logoutConfirm.addEventListener('click', ejecutarLogout);
    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) cerrarModalLogout();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !logoutModal.classList.contains('hidden')) cerrarModalLogout();
    });
}

// ==========================================
// CARGAR EXPEDIENTES (CORREGIDO)
// ==========================================

async function cargarExpedientes() {
    showToast('Cargando expedientes...', 'info');

    try {
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

    const guardado = localStorage.getItem(STORAGE_KEYS.EXPEDIENTES_LISTA);
    if (guardado) {
        expedientes = JSON.parse(guardado).filter(item => esEstadoAprobado(item.estado));
        const desdeDocumentos = obtenerExpedientesDesdeDocumentos();
        expedientes = fusionarExpedientes(expedientes, desdeDocumentos);
        expedientes = asegurarInventarioEjemplo(expedientes);
    } else {
        // Datos de demostracion
        expedientes = [
            {
                id: '1', codigo: 'IND-FM-2026-1', tipo: 'indicador',
                nombre: 'Indice de Ejecucion Presupuestal',
                macroProceso: 'Gestion de Recursos Economicos',
                fechaAprobacion: '2026-03-15', estado: 'aprobado',
                responsable: 'Oficina de Planificacion'
            },
            {
                id: '2', codigo: 'FL-FM-2026-1', tipo: 'flujograma',
                nombre: 'Proceso de Admision de Estudiantes',
                macroProceso: 'Gestion de Admision y Matricula',
                fechaAprobacion: '2026-03-10', estado: 'aprobado',
                responsable: 'Direccion de Admision'
            },
            {
                id: '3', codigo: 'FC-FM-2026-1', tipo: 'caracterizacion',
                nombre: 'Proceso de Investigacion',
                macroProceso: 'Gestion de Investigacion',
                fechaAprobacion: '2026-03-05', estado: 'aprobado',
                responsable: 'Vicerrectorado de Investigacion'
            },
            {
                id: '4', codigo: 'HR-FM-2026-1', tipo: 'reporte',
                nombre: 'Matricula',
                macroProceso: 'Gestion de Admision y Matricula',
                fechaAprobacion: '2026-02-28', estado: 'aprobado',
                responsable: 'Direccion de Registros Academicos'
            },
            {
                id: '5', codigo: 'INV-FM-2026-1', tipo: 'inventario',
                nombre: 'Inventario Institucional de Procesos',
                macroProceso: 'Gestion de Inventarios',
                fechaAprobacion: '2026-03-20', estado: 'aprobado',
                responsable: 'Oficina de Racionalizacion'
            }
        ];

        localStorage.setItem(STORAGE_KEYS.EXPEDIENTES_LISTA, JSON.stringify(expedientes));
        sincronizarExpedientesADocumentosLista(expedientes);
        const desdeDocumentos = obtenerExpedientesDesdeDocumentos();
        expedientes = fusionarExpedientes(expedientes, desdeDocumentos);
    }

    renderizarExpedientes();
}

function sincronizarExpedientesADocumentosLista(expedientes) {
    try {
        const docsLista = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
        const existingCodes = new Set(docsLista.map(d => d.codigo));

        for (const exp of expedientes) {
            if (!existingCodes.has(exp.codigo)) {
                docsLista.unshift({
                    id: exp.id || exp.codigo,
                    codigo: exp.codigo,
                    tipo: exp.tipo || inferirTipo(exp.codigo),
                    estado: exp.estado || 'aprobado',
                    descripcion: exp.nombre || `Expediente ${exp.codigo}`,
                    nombre: exp.nombre || `Expediente ${exp.codigo}`,
                    fecha: exp.fechaAprobacion || new Date().toISOString().split('T')[0],
                    fechaAprobacion: exp.fechaAprobacion,
                    nombreFacultad: exp.responsable || 'UNMSM',
                    facultad: exp.responsable || 'UNMSM',
                    responsable: exp.responsable,
                    macroProceso: exp.macroProceso,
                    origen: 'expediente'
                });
                existingCodes.add(exp.codigo);
            }
        }
        localStorage.setItem('sigpro_documentos_lista', JSON.stringify(docsLista));
    } catch (e) {
        console.warn('Error sincronizando expedientes a documentos_lista:', e);
    }
}

function limpiarTituloRepetido(nombre, tipo) {
    if (!nombre) return '';
    const n = String(nombre);
    
    // Prefijos que se quitarán del título según el tipo
    const prefijos = {
        caracterizacion: ['Ficha de Caracterizacion', 'Ficha de Caracterización', 'Ficha Tecnica', 'Ficha Técnica', 'Caracterizacion', 'Caracterización'],
        indicador: ['Indicador', 'Indice de', 'Índice de'],
        flujograma: ['Flujograma', 'Proceso de'],
        reporte: ['Hoja de Reporte', 'Reporte'],
        inventario: ['Inventario Institucional de', 'Inventario de', 'Ficha de Inventario']
    };
    
    const lista = prefijos[tipo] || [];
    for (const pref of lista) {
        const regex = new RegExp(`^\\s*${pref}\\s*[-–—:]\\s*`, 'i');
        if (regex.test(n)) {
            return n.replace(regex, '').trim();
        }
    }
    return n;
}

// ==========================================
// RENDERIZAR EXPEDIENTES (sin cambios visuales)
// ==========================================

function renderizarExpedientes(filtrarPor = 'todos') {
    const grid = document.getElementById('grid-expedientes');
    const estadoVacio = document.getElementById('estado-vacio');
    if (!grid) return;

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

        return `
            <div class="expediente-card bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all hover:-translate-y-1 cursor-pointer group flex flex-col h-full overflow-hidden"
                 onclick="verExpediente('${exp.tipo}', '${exp.codigo}')">
                <div class="p-6 border-b border-slate-100 dark:border-slate-700">
                    <div class="flex items-start justify-between">
                        <div class="w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-lg">
                            <span class="material-symbols-outlined text-white text-2xl">${icono}</span>
                        </div>
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            ${exp.estado}
                        </span>
                    </div>
                    <h3 class="mt-4 font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem]">
                        ${exp.tipo === 'indicador' 
                            ? limpiarTituloRepetido(exp.nombreIndicador || exp.nombre, exp.tipo) 
                            : limpiarTituloRepetido(exp.nombre, exp.tipo)}
                    </h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 min-h-[1.25rem]">${exp.codigo}</p>
                </div>
                
                <!-- SECCIÓN MEDIO ELIMINADA: antes mostraba macroProceso, responsable, fecha -->

                <div class="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                            ${getNombreTipo(exp.tipo)}
                        </span>
                        <div class="flex items-center gap-1">
                            <button type="button"
                                class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Eliminar del repositorio"
                                onclick="eliminarExpediente('${exp.codigo}', event)">
                                <span class="material-symbols-outlined text-base">delete</span>
                            </button>
                            <span class="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// NAVEGACION A EXPEDIENTE ESPECIFICO
// ==========================================

function verExpediente(tipo, codigo) {
    const expediente = expedientes.find(e => e.codigo === codigo);
    if (expediente) {
        localStorage.setItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL, JSON.stringify(expediente));
    }

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
// FILTRAR Y ELIMINAR
// ==========================================

function filtrarExpedientes() {
    const filtro = document.getElementById('filtro-tipo')?.value || 'todos';
    renderizarExpedientes(filtro);
}

function eliminarExpediente(codigo, event) {
    event?.stopPropagation();
    if (!confirm(`Desea eliminar el expediente ${codigo}?`)) return;

    expedientes = expedientes.filter(exp => exp.codigo !== codigo);
    localStorage.setItem(STORAGE_KEYS.EXPEDIENTES_LISTA, JSON.stringify(expedientes));

    const documentosRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    if (documentosRaw) {
        try {
            const documentos = JSON.parse(documentosRaw);
            if (Array.isArray(documentos)) {
                localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(documentos.filter(d => d?.codigo !== codigo)));
            }
        } catch (e) { console.error('Error limpiando documentos_lista:', e); }
    }

    const reportesRaw = localStorage.getItem('sigpro_reportes');
    if (reportesRaw) {
        try {
            const reportes = JSON.parse(reportesRaw);
            if (Array.isArray(reportes)) {
                localStorage.setItem('sigpro_reportes', JSON.stringify(reportes.filter(r => r?.codigo !== codigo)));
            }
        } catch (e) { console.error('Error limpiando reportes:', e); }
    }

    const detalleRaw = localStorage.getItem('sigpro_documentos_detalle');
    if (detalleRaw) {
        try {
            const detalle = JSON.parse(detalleRaw);
            if (detalle && typeof detalle === 'object' && detalle[codigo]) {
                delete detalle[codigo];
                localStorage.setItem('sigpro_documentos_detalle', JSON.stringify(detalle));
            }
        } catch (e) { console.error('Error limpiando detalle:', e); }
    }

    const cuadrosRaw = localStorage.getItem('sigpro_reporte_cuadros');
    if (cuadrosRaw) {
        try {
            const cuadros = JSON.parse(cuadrosRaw);
            if (cuadros && typeof cuadros === 'object' && cuadros[codigo]) {
                delete cuadros[codigo];
                localStorage.setItem('sigpro_reporte_cuadros', JSON.stringify(cuadros));
            }
        } catch (e) { console.error('Error limpiando cuadros:', e); }
    }

    const actualRaw = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    if (actualRaw) {
        const actual = JSON.parse(actualRaw);
        if (actual?.codigo === codigo) localStorage.removeItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    }

    filtrarExpedientes();
    showToast('Expediente eliminado del repositorio', 'success');
}

// ==========================================
// UTILIDADES (CORREGIDO inferirTipo)
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
        indicador: 'Ficha de Indicador',
        flujograma: 'Flujograma',
        caracterizacion: 'Ficha Técnica',
        reporte: 'Hoja de Reporte',
        inventario: 'Ficha de Inventario'
    };
    return nombres[tipo] || 'Documento';
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * CORREGIDO: Ahora reconoce mas prefijos de codigo
 * FC  = Ficha de Caracterizacion
 * CAR = Caracterizacion (legacy)
 * FI  = Ficha de Inventario
 * FG  = Flujograma
 * IND = Indicador
 * FLU/FL = Flujograma
 * REP/HR = Reporte
 * INV = Inventario
 */
function inferirTipo(codigo) {
    const prefix = String(codigo || '').split('-')[0].toUpperCase();

    if (prefix === 'IND') return 'indicador';
    if (prefix === 'FLU' || prefix === 'FL' || prefix === 'FG') return 'flujograma';
    if (prefix === 'CAR' || prefix === 'FC') return 'caracterizacion';
    if (prefix === 'HR' || prefix === 'REP') return 'reporte';
    if (prefix === 'INV' || prefix === 'FI') return 'inventario';

    return 'reporte';
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { info: 'info', success: 'check_circle', warning: 'warning', error: 'error' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined">${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================
// FUNCIONES DE GUARDADO/APROBACION CON GOOGLE SHEETS
// ==========================================

/**
 * Guarda una ficha de caracterizacion aprobada en todos los storages necesarios.
 * Usa esta funcion cuando el usuario hace clic en "Aprobar" o "Guardar" en el formulario.
 * 
 * @param {Object} datos - Datos de la ficha
 * @param {string} datos.codigo - Ej: "FC-FM-2026-001"
 * @param {string} datos.nombre - Nombre del proceso
 * @param {string} datos.macroProceso - Macro proceso
 * @param {string} datos.tipoProceso - Tipo: estrategico, misional, soporte
 * @param {string} datos.unidadOrganica - Unidad responsable
 * @param {string} datos.objetivo - Objetivo del proceso
 * @param {string} datos.googleSheetsUrl - URL de Google Sheets
 * @param {string} datos.googleSheetsRange - Rango a previsualizar (ej: "A1:G25")
 * @param {Array} datos.adjuntos - Array de adjuntos
 */
function aprobarFichaCaracterizacion(datos) {
    const codigo = datos.codigo || generarCodigoCaracterizacion();
    const tipo = 'caracterizacion';
    const fechaHoy = new Date().toISOString().split('T')[0];

    // 1. Construir fichaData (toda la info tecnica + Google Sheets)
    const fichaData = {
        nombreProceso: datos.nombre || datos.nombreProceso,
        macroProceso: datos.macroProceso,
        tipoProceso: datos.tipoProceso,
        tipoProcesoLabel: formatearTipoProceso(datos.tipoProceso),
        unidadOrganica: datos.unidadOrganica,
        objetivo: datos.objetivo,
        alcance: datos.alcance,
        entradas: datos.entradas,
        salidas: datos.salidas,
        clientes: datos.clientes,
        proveedores: datos.proveedores,
        indicadoresGestion: datos.indicadoresGestion,
        riesgos: datos.riesgos,
        controles: datos.controles,
        frecuencia: datos.frecuencia || 'Continua',
        version: datos.version || '1.0',
        fuente: datos.fuente || 'SIGPRO',
        fechaElaboracion: datos.fechaElaboracion || fechaHoy,
        responsable: datos.responsable,
        // GOOGLE SHEETS (Opcion 1)
        googleSheetsUrl: datos.googleSheetsUrl || null,
        googleSheetsRange: datos.googleSheetsRange || 'A1:Z50'
    };

    // Limpiar campos null/undefined
    Object.keys(fichaData).forEach(key => {
        if (fichaData[key] === undefined || fichaData[key] === null || fichaData[key] === '') {
            delete fichaData[key];
        }
    });

    // 2. Construir resumenCampos (para compatibilidad con busquedas)
    const resumenCampos = Object.entries(fichaData)
        .filter(([k, v]) => k !== 'googleSheetsUrl' && k !== 'googleSheetsRange')
        .map(([k, v]) => ({
            label: formatearNombreCampo(k),
            campo: k,
            valor: String(v)
        }));

    // 3. Guardar en sigpro_documentos_detalle
    const detalleMap = JSON.parse(localStorage.getItem('sigpro_documentos_detalle') || '{}');
    detalleMap[codigo] = {
        tipo: tipo,
        titulo: fichaData.nombreProceso,
        fechaRegistro: fechaHoy,
        estado: 'aprobado',
        fichaData: fichaData,
        resumenCampos: resumenCampos,
        adjuntos: datos.adjuntos || []
    };
    localStorage.setItem('sigpro_documentos_detalle', JSON.stringify(detalleMap));

    // 4. Guardar en sigpro_documentos_lista
    const docsLista = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
    const idxDoc = docsLista.findIndex(d => d.codigo === codigo);
    const docItem = {
        id: codigo,
        codigo: codigo,
        tipo: tipo,
        estado: 'aprobado',
        descripcion: fichaData.nombreProceso,
        nombre: fichaData.nombreProceso,
        fecha: fechaHoy,
        fechaAprobacion: fechaHoy,
        nombreFacultad: fichaData.unidadOrganica || 'UNMSM',
        facultad: fichaData.unidadOrganica || 'UNMSM',
        responsable: fichaData.responsable || fichaData.unidadOrganica,
        macroProceso: fichaData.macroProceso,
        origen: 'expediente'
    };
    if (idxDoc >= 0) docsLista[idxDoc] = docItem;
    else docsLista.unshift(docItem);
    localStorage.setItem('sigpro_documentos_lista', JSON.stringify(docsLista));

    // 5. Guardar en sigpro_expedientes_lista
    const expLista = JSON.parse(localStorage.getItem('sigpro_expedientes_lista') || '[]');
    const idxExp = expLista.findIndex(e => e.codigo === codigo);
    const expItem = {
        id: codigo,
        codigo: codigo,
        tipo: tipo,
        nombre: fichaData.nombreProceso,
        macroProceso: fichaData.macroProceso,
        fechaAprobacion: fechaHoy,
        estado: 'aprobado',
        responsable: fichaData.responsable || fichaData.unidadOrganica
    };
    if (idxExp >= 0) expLista[idxExp] = expItem;
    else expLista.unshift(expItem);
    localStorage.setItem('sigpro_expedientes_lista', JSON.stringify(expLista));

    // 6. Guardar como expediente actual para navegacion inmediata
    localStorage.setItem('sigpro_expediente_actual', JSON.stringify(expItem));

    showToast('Ficha de caracterizacion aprobada y guardada', 'success');
    return codigo;
}

function generarCodigoCaracterizacion() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 900) + 100;
    return `FC-${year}-${mes}-${random}`;
}

function formatearTipoProceso(tipo) {
    const value = String(tipo || '').toLowerCase().trim();
    if (value === 'estrategico') return 'Estrategico';
    if (value === 'misional') return 'Misional';
    if (value === 'de-apoyo' || value === 'de apoyo' || value === 'soporte' || value === 'support' || value === 'apoyo') return 'Soporte';
    return tipo || '-';
}

function formatearNombreCampo(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/_/g, ' ')
        .trim();
}

// ==========================================
// PERFIL Y UTILIDADES (sin cambios)
// ==========================================

function getColorPorRol(rol) {
    const colores = {
        administrador: 'bg-blue-600', admin: 'bg-blue-600',
        editor: 'bg-emerald-600', visualizador: 'bg-purple-600',
        'usuario facultad': 'bg-amber-600'
    };
    return colores[String(rol || '').trim().toLowerCase()] || 'bg-slate-600';
}

function getInicialesDesdeNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return 'US';
    return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'US';
}

function obtenerCargoORol(user) {
    return user?.cargo || user?.cargoNombre || user?.puesto || user?.rol || user?.role || PERFIL_FALLBACK.rol;
}

function obtenerNombreFacultad(user) {
    const facultadRaw = user?.facultad || user?.faculty;
    if (typeof facultadRaw === 'string' && facultadRaw.trim()) return facultadRaw;
    if (facultadRaw && typeof facultadRaw === 'object') {
        return facultadRaw.nombre || facultadRaw.descripcion || facultadRaw.name || PERFIL_FALLBACK.facultad;
    }
    return user?.facultadNombre || user?.nombreFacultad || user?.nombre_facultad || user?.facultadName || user?.facultad_id_nombre || PERFIL_FALLBACK.facultad;
}

function normalizarPerfil(user) {
    if (!user || typeof user !== 'object') return null;
    const email = user.correo || user.email || PERFIL_FALLBACK.email;
    const nombreBase = user.nombreCompleto || user.nombre || user.name || email.split('@')[0] || PERFIL_FALLBACK.nombre;
    const nombre = String(nombreBase).replace(/\./g, ' ').trim() || PERFIL_FALLBACK.nombre;
    return {
        nombre, email,
        iniciales: user.iniciales || getInicialesDesdeNombre(nombre),
        rol: obtenerCargoORol(user),
        facultad: obtenerNombreFacultad(user),
        color: user.color || getColorPorRol(obtenerCargoORol(user))
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
            if (perfilApi) { renderizarPerfil(perfilApi); return; }
        }
        const rawStorage = localStorage.getItem('usuario') || localStorage.getItem('sigpro_usuario') || localStorage.getItem('usuario_actual') || localStorage.getItem('user') || localStorage.getItem('unmsm_user');
        if (rawStorage) {
            const perfilStorage = normalizarPerfil(JSON.parse(rawStorage));
            if (perfilStorage) { renderizarPerfil(perfilStorage); return; }
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
            .filter(doc => {
                const estado = String(doc.estado || '').toLowerCase();
                return estado === 'completado' || estado === 'aprobado';
            })
            .map(doc => {
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
                    macroProceso: doc.macroProceso || 'Gestion Institucional',
                    fechaAprobacion: doc.fechaAprobacion || doc.fechaActualizacion || doc.fecha || new Date().toISOString().split('T')[0],
                    estado: 'aprobado',
                    responsable: doc.responsable || 'Oficina de Planeamiento'
                };
            });
    } catch (error) {
        console.error('Error leyendo documentos aprobados:', error);
        return [];
    }
}

function obtenerTituloReporteDesdeDetalle(detalle, doc) {
    const actividades = detalle?.reporteData?.actividades || buscarCampoResumen(detalle?.resumenCampos, 'Actividades realizadas') || '';
    const tituloBase = String(actividades || '').trim();
    if (!tituloBase) return doc.descripcion || `Reporte ${doc.codigo}`;
    return tituloBase.length <= 70 ? tituloBase : `${tituloBase.slice(0, 70).trim()}...`;
}

function buscarCampoResumen(resumenCampos, labelObjetivo) {
    if (!Array.isArray(resumenCampos)) return '';
    const target = String(labelObjetivo || '').toLowerCase().trim();
    const match = resumenCampos.find(item => String(item?.label || '').toLowerCase().trim() === target);
    return match?.value || '';
}

function fusionarExpedientes(base, extra) {
    const map = new Map();
    [...base, ...extra].forEach(item => {
        if (!item?.codigo) return;
        map.set(item.codigo, item);
    });
    return Array.from(map.values());
}

function asegurarInventarioEjemplo(lista) {
    const items = Array.isArray(lista) ? [...lista] : [];
    const existeInventario = items.some(item => item?.tipo === 'inventario' || inferirTipo(item?.codigo) === 'inventario');
    if (!existeInventario) {
        items.push({
            id: '5', codigo: 'INV-2026-001', tipo: 'inventario',
            nombre: 'Inventario Institucional de Procesos',
            macroProceso: 'Gestion de Inventarios',
            fechaAprobacion: '2026-03-20', estado: 'aprobado',
            responsable: 'Oficina de Racionalizacion'
        });
    }
    return items;
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
    return String(detalle?.fichaData?.tipoProcesoLabel || detalle?.fichaData?.tipoProceso || buscarCampoResumen(detalle?.resumenCampos, 'Tipo de Proceso') || 'No registrado').trim();
}

function obtenerProcesoIndicador(detalle, doc) {
    return String(detalle?.fichaData?.macroProcesoNombre || detalle?.fichaData?.macroProceso || buscarCampoResumen(detalle?.resumenCampos, 'Proceso') || buscarCampoResumen(detalle?.resumenCampos, 'Macro Proceso') || doc.macroProceso || 'No registrado').trim();
}

function obtenerProcesoIndicadorConCodigo(proceso) {
    const texto = String(proceso || '').trim();
    if (!texto) return 'No registrado';
    const codigoInicio = texto.match(/^([A-Za-z]{2,5})[\.-]?(\d{1,3})\s*[-:]?\s*/);
    if (codigoInicio) {
        return `${codigoInicio[1].toUpperCase()}-${String(codigoInicio[2]).padStart(2, '0')}`;
    }
    return texto;
}
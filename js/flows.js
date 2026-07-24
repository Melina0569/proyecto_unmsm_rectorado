/**
 * FLOWS MODULE
 * Maneja la lógica de flujogramas integrando con API híbrida (local/remoto)
 */

// 🔧 FIX: No redefinir CONFIG si ya existe (api.js lo define)
const FLOWS_CONFIG = {
    useRealData: true,
    showExamplesIfEmpty: true,        // 🔧 FIX: cambiado a true para mostrar ejemplos si API falla
    REMOTE_BASE: (typeof CONFIG !== 'undefined' ? CONFIG.REMOTE_BASE : 'http://localhost:8080/v1'),
    facultyId: null
};

// Catalogo de PDFs reales por código
const PDF_CATALOG = {
    'PE-01': {
        url: 'docs/pdfs/flujogramas/FLUJOGRAMA DE GESTIÓN ESTRATÉGICA (2).pdf',
        facultyId: null
    }
};

// 🔧 FIX: Datos de ejemplo ampliados para todas las facultades
const exampleProcedures = [
    { id: 'PE-01', title: "Gestión Estratégica", code: "PE-01", desc: "Flujogramas del proceso de gestión estratégica y actividades clave institucionales.", pdfUrl: "", facultyId: null, type: 'estrategico' },
    { id: 'PROC-002', title: "Gestión de Grados", code: "PROC-002", desc: "Trámite administrativo para la obtención de grados académicos y títulos profesionales.", pdfUrl: "", facultyId: 20, type: 'misional' },
    { id: 'PROC-003', title: "Traslados Internos", code: "PROC-003", desc: "Flujo de aprobación para el cambio de escuela profesional dentro de la misma facultad.", pdfUrl: "", facultyId: 19, type: 'misional' },
    { id: 'PROC-004', title: "Reserva de Matrícula", code: "PROC-004", desc: "Gestión de solicitudes para la suspensión temporal de estudios regulares.", pdfUrl: "", facultyId: 9, type: 'misional' },
    { id: 'PROC-005', title: "Convalidación de Cursos", code: "PROC-005", desc: "Evaluación de sílabos externos para el reconocimiento de créditos académicos.", pdfUrl: "", facultyId: 20, type: 'misional' },
    { id: 'PROC-006', title: "Certificados de Estudios", code: "PROC-006", desc: "Emisión de documentos oficiales que acreditan el rendimiento académico del alumno.", pdfUrl: "", facultyId: 20, type: 'apoyo' },
    { id: 'PROC-007', title: "Admisión de Postulantes", code: "PROC-007", desc: "Proceso de evaluación y selección de postulantes para ingreso a la universidad.", pdfUrl: "", facultyId: null, type: 'misional' },
    { id: 'PROC-008', title: "Gestión de Bienestar Universitario", code: "PROC-008", desc: "Atención integral a estudiantes en aspectos de salud, alimentación y vivienda.", pdfUrl: "", facultyId: null, type: 'apoyo' },
    { id: 'PROC-009', title: "Gestión Documental", code: "PROC-009", desc: "Organización, clasificación y archivo de documentos institucionales.", pdfUrl: "", facultyId: null, type: 'apoyo' },
    { id: 'PROC-010', title: "Gestión de Recursos Humanos", code: "PROC-010", desc: "Procesos de contratación, evaluación y desarrollo del personal docente y administrativo.", pdfUrl: "", facultyId: null, type: 'apoyo' },
];

// Estado del visor PDF
let pdfState = {
    currentPage: 1,
    totalPages: 2,
    zoom: 100,
    rotation: 0,
    currentProcedure: null,
    isOpen: false
};

let currentProcedures = [];
const pdfPagesCache = new Map();
const pdfThumbsCache = new Map();
const pdfThumbsLoading = new Set();

// ============================================================
// 🔧 FIX: Función mejorada que respeta modo local/remoto
// ============================================================

/**
 * Obtener flujogramas desde API (híbrida) o fallback local
 */
async function getFlowsByFaculty(facultyId, page = 1, limit = 20) {
    // 🔧 FIX: Si estamos en modo local y window.API existe, usar la API híbrida
    const isLocalMode = (typeof window !== 'undefined' && window.API && window.API.CONFIG && window.API.CONFIG.MODE === 'local');
    
    if (isLocalMode && window.API && window.API.flows && typeof window.API.flows.getByFaculty === 'function') {
        try {
            console.log('📦 [LOCAL] Usando API híbrida para flujogramas...');
            const result = await window.API.flows.getByFaculty(facultyId);
            const data = Array.isArray(result?.data) ? result.data : [];
            
            const apiProcedures = data.map((flow, index) => ({
                id: flow.id || `flow-${index}`,
                title: flow.name || flow.title || 'Flujograma',
                code: flow.code || flow.codigo || `FL-${String(index + 1).padStart(3, '0')}`,
                desc: flow.description || flow.desc || '',
                pdfUrl: flow.pdfUrl || flow.urlArchivo || null,
                facultyId: flow.facultyId,
                type: flow.type || 'apoyo',
                pages: flow.pages || 0,
                lastUpdated: flow.lastUpdated || flow.updatedAt || new Date().toISOString(),
                downloads: flow.downloads || 0
            }));

            const catalogProcedures = [];
            for (const [code, entry] of Object.entries(PDF_CATALOG || {})) {
                const entryFaculty = String(entry.facultyId || '');
                const targetFaculty = String(facultyId || '');
                if (!entryFaculty || entryFaculty === targetFaculty) {
                    catalogProcedures.push({
                        id: code,
                        title: code === 'PE-01' ? 'Gestión Estratégica' : code,
                        code: code,
                        desc: 'Documento PDF local',
                        pdfUrl: entry.url,
                        facultyId: entry.facultyId || null,
                        type: 'local',
                        pages: 0,
                        lastUpdated: null,
                        downloads: 0
                    });
                }
            }

            const merged = [...apiProcedures];
            const seenCodes = new Set(apiProcedures.map(p => p.code));
            for (const cat of catalogProcedures) {
                if (!seenCodes.has(cat.code)) {
                    merged.push(cat);
                    seenCodes.add(cat.code);
                }
            }

            return {
                success: merged.length > 0,
                data: merged,
                pagination: result?.pagination || null,
                status: 200
            };
            // Si no hay datos locales, seguir al fallback
            console.log('⚠️ [LOCAL] API local devolvió vacío, usando fallback...');
        } catch (error) {
            console.warn('⚠️ [LOCAL] API.flows.getByFaculty falló:', error.message);
        }
    }

    // 🔧 FIX: Intentar fetch remoto solo si estamos en modo remoto o como fallback
    try {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const baseUrl = FLOWS_CONFIG.REMOTE_BASE;
        const url = `${baseUrl}/public/flows?facultyId=${facultyId || ''}&page=${page}&limit=${limit}`;
        
        console.log('🌐 [REMOTE] Fetching:', url);
        
        const response = await fetch(url, { method: 'GET', headers });

        if (!response.ok) {
            console.warn(`⚠️ HTTP ${response.status} desde backend`);
            return { success: false, data: [], pagination: null, status: response.status };
        }

        const data = await response.json();
        const flows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        
        return {
            success: flows.length > 0,
            data: flows,
            pagination: data?.pagination || null,
            status: response.status
        };

    } catch (error) {
        console.error('❌ Error de red obteniendo flujogramas:', error.message);
        return { success: false, data: [], pagination: null, error: error.message };
    }
}

/**
 * Obtener detalle de un flujograma por ID
 */
async function getFlowById(flowId) {
    try {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(
            `${FLOWS_CONFIG.REMOTE_BASE}/public/flows/${encodeURIComponent(flowId)}`,
            { method: 'GET', headers }
        );

        if (!response.ok) {
            return { success: false, data: null, status: response.status };
        }

        const data = await response.json();
        return { success: true, data: data, status: response.status };
    } catch (error) {
        console.error('Error obteniendo detalle de flujograma:', error);
        return { success: false, data: null, error: error.message };
    }
}

/**
 * Descargar PDF de un flujograma por ID desde API
 */
async function downloadFlowPdfById(flowId, fileName = null) {
    try {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');
        const headers = { 'Accept': 'application/pdf' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(
            `${FLOWS_CONFIG.REMOTE_BASE}/public/flows/${encodeURIComponent(flowId)}/download`,
            { method: 'GET', headers }
        );

        if (!response.ok) {
            return { success: false, status: response.status };
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName || `flujograma_${flowId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);

        return { success: true, status: response.status };
    } catch (error) {
        console.error('Error descargando PDF del flujograma:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initCustomSelect();
    initSearchFunctionality();
    initFacultyFilter();
    loadProcedures(); // Carga inicial sin filtro de facultad
});

// ============================================================
// 🔧 FIX: Carga de procedimientos robusta
// ============================================================

async function loadProcedures(facultyId = null) {
    showLoading(true);
    
    try {
        let procedures = [];
        
        if (FLOWS_CONFIG.useRealData) {
            // 🔧 FIX: No forzar facultad 12, pasar null si no hay selección
            const targetFaculty = facultyId || null;
            const response = await getFlowsByFaculty(targetFaculty, 1, 20);
            
            if (response.success && response.data && response.data.length > 0) {
                procedures = response.data;
                console.log('✅ Datos cargados desde API:', procedures.length, 'procedimientos');
            } else {
                console.log('⚠️ API devolvió vacío o falló, usando fallback...');
                procedures = getFallbackProcedures(facultyId);
            }
        } else {
            procedures = getFallbackProcedures(facultyId);
            console.log('📴 Modo offline, usando ejemplos:', procedures.length, 'procedimientos');
        }
        
        currentProcedures = procedures;
        renderProcedureCards(procedures);
        
    } catch (error) {
        console.error('Error cargando procedimientos:', error);
        // 🔧 FIX: Siempre mostrar fallback incluso si hay error
        const procedures = getFallbackProcedures(facultyId);
        currentProcedures = procedures;
        renderProcedureCards(procedures);
        showToast('Error al cargar datos. Mostrando flujogramas de ejemplo.', 'warning');
    } finally {
        showLoading(false);
    }
}

/**
 * 🔧 FIX: Obtener procedimientos de fallback (PDFs locales + ejemplos)
 */
function getFallbackProcedures(facultyId) {
    let procedures = [];
    const localPdfCodes = Object.keys(PDF_CATALOG || {});
    for (const code of localPdfCodes) {
        const entry = PDF_CATALOG[code];
        const entryFaculty = String(entry.facultyId || '');
        const targetFaculty = String(facultyId || '');
        if (!entryFaculty || entryFaculty === targetFaculty) {
            procedures.push({
                id: code,
                title: code === 'PE-01' ? 'Gestión Estratégica' : code,
                code: code,
                desc: 'Documento PDF local',
                pdfUrl: entry.url,
                facultyId: entry.facultyId || null,
                type: 'local',
                pages: 0,
                lastUpdated: null,
                downloads: 0
            });
        }
    }
    
    // 2. Agregar ejemplos filtrados por facultad
    const filteredExamples = filterExamplesByFaculty(facultyId);
    // Evitar duplicados por código
    const existingCodes = new Set(procedures.map(p => p.code));
    for (const ex of filteredExamples) {
        if (!existingCodes.has(ex.code)) {
            procedures.push(ex);
            existingCodes.add(ex.code);
        }
    }
    
    return procedures;
}

/**
 * Filtra ejemplos por facultad
 */
function filterExamplesByFaculty(facultyId) {
    if (!facultyId) return exampleProcedures;
    const fid = String(facultyId);
    return exampleProcedures.filter(p => 
        !p.facultyId || String(p.facultyId) === fid
    );
}

/**
 * 🔧 FIX: showLoading robusto (no falla si el elemento no existe)
 */
function showLoading(show) {
    const loadingEl = document.getElementById('loading-state');
    const gridEl = document.getElementById('procedures-grid');
    const noResultsEl = document.getElementById('no-results');
    
    if (loadingEl) {
        loadingEl.classList.toggle('hidden', !show);
    }
    if (gridEl) {
        gridEl.classList.toggle('opacity-50', show);
    }
    if (noResultsEl) {
        noResultsEl.classList.toggle('hidden', true); // Ocultar no-results durante carga
    }
}

// ============================================================
// TEMA
// ============================================================

function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
}

// ============================================================
// RENDERIZADO DE TARJETAS
// ============================================================

function renderProcedureCards(procedures) {
    const grid = document.getElementById('procedures-grid');
    const noResults = document.getElementById('no-results');
    
    if (!grid) {
        console.error('❌ No se encontró #procedures-grid');
        return;
    }

    if (procedures.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.classList.remove('hidden');
        return;
    }
    
    if (noResults) noResults.classList.add('hidden');

    grid.innerHTML = procedures.map(card => `
        <div class="procedure-card group cursor-pointer bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 p-6 rounded-xl border border-transparent hover:border-primary/20 transition-all" 
             onclick="selectProcedure('${card.id}')" 
             data-procedure-id="${card.id}">
            <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-16 h-16 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                    <span class="material-icons-round text-primary dark:text-blue-400 text-3xl">description</span>
                </div>
                <div class="flex flex-col flex-grow">
                    <h3 class="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors text-lg">${escapeHtml(card.title)}</h3>
                    <span class="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">${card.code}</span>
                    <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">${escapeHtml(card.desc)}</p>
                    ${`<span class="text-xs text-slate-400 mt-2">Actualizado: ${new Date().toLocaleDateString('es-PE')}</span>`}
                </div>
                <div class="flex-shrink-0 self-center">
                    <span class="material-icons-round text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 🔧 FIX: Helper para escapar HTML y prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// VISOR PDF
// ============================================================

async function selectProcedure(procedureId) {
    console.log('Seleccionando procedimiento:', procedureId);
    
    let procedure = currentProcedures.find(p => p.id === procedureId);
    
    if (!procedure) {
        procedure = exampleProcedures.find(p => p.id === procedureId);
    }
    
    if (!procedure) {
        showToast('Procedimiento no encontrado', 'error');
        return;
    }

    console.log('Procedimiento encontrado:', procedure);

    pdfState.currentProcedure = procedure;
    pdfState.currentPage = 1;
    pdfState.totalPages = Math.max(1, parseInt(procedure.pages, 10) || 1);
    pdfState.zoom = 100;
    pdfState.rotation = 0;
    pdfState.isOpen = true;
    
    document.querySelectorAll('.procedure-card').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    });
    
    const selectedCard = document.querySelector(`[data-procedure-id="${procedureId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    }

    showToast(`Cargando: ${procedure.title}`, 'info');
    
    renderPDFViewer();
    ensureProcedurePdfPages(procedure).catch((error) => {
        console.warn('No se pudo obtener el total real de paginas del PDF:', error);
    });
    
    setTimeout(() => {
        const viewer = document.getElementById('pdf-viewer');
        if (viewer) {
            viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

function renderPDFViewer() {
    const viewer = document.getElementById('pdf-viewer');
    
    if (!viewer) {
        console.error('❌ No se encontró el contenedor del PDF con id="pdf-viewer"');
        return;
    }

    viewer.classList.remove('hidden');
    
    const procedure = pdfState.currentProcedure;

    viewer.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div class="bg-slate-800 dark:bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-sm">
                <div class="flex items-center gap-4">
                    <button class="p-2 hover:bg-slate-700 rounded-lg transition-colors" onclick="toggleSidebar()" title="Mostrar/Ocultar sidebar">
                        <span class="material-icons-round text-lg">menu</span>
                    </button>
                    <div class="flex flex-col">
                        <span class="font-medium text-sm">${procedure?.title || 'Documento'}</span>
                        <span class="text-xs text-slate-400">${procedure?.code || ''}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 md:gap-4">
                    <div class="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1">
                        <button class="p-1 hover:bg-slate-600 rounded" onclick="prevPage()">
                            <span class="material-icons-round text-sm">chevron_left</span>
                        </button>
                        <input type="text" class="w-10 h-7 bg-slate-600 border-none rounded text-center text-xs text-white focus:ring-1 focus:ring-primary" 
                               value="${pdfState.currentPage}" 
                               onchange="goToPage(this.value)"/>
                        <span class="text-slate-400 text-xs">/ ${pdfState.totalPages}</span>
                        <button class="p-1 hover:bg-slate-600 rounded" onclick="nextPage()">
                            <span class="material-icons-round text-sm">chevron_right</span>
                        </button>
                    </div>
                    
                    <div class="hidden md:flex items-center gap-1">
                        <button class="p-2 hover:bg-slate-700 rounded-lg" onclick="zoomOut()" title="Alejar">
                            <span class="material-icons-round text-lg">remove</span>
                        </button>
                        <span class="w-12 text-center font-mono text-xs">${pdfState.zoom}%</span>
                        <button class="p-2 hover:bg-slate-700 rounded-lg" onclick="zoomIn()" title="Acercar">
                            <span class="material-icons-round text-lg">add</span>
                        </button>
                    </div>
                    
                    <div class="flex items-center gap-1 border-l border-slate-700 pl-2 md:pl-4">
                        <button class="p-2 hover:bg-slate-700 rounded-lg" onclick="downloadPDF()" title="Descargar">
                            <span class="material-icons-round text-lg">file_download</span>
                        </button>
                        <button class="p-2 hover:bg-slate-700 rounded-lg" onclick="printPDF()" title="Imprimir">
                            <span class="material-icons-round text-lg">print</span>
                        </button>
                        <button class="p-2 hover:bg-slate-700 rounded-lg text-red-400" onclick="closePDFViewer()" title="Cerrar">
                            <span class="material-icons-round text-lg">close</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="bg-slate-100 dark:bg-slate-900 flex" style="height: min(72vh, 760px); min-height: 480px;">
                <div id="pdf-sidebar" class="w-48 bg-slate-200 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 overflow-y-auto hidden md:block">
                    ${renderThumbnails()}
                </div>
                
                <div class="flex-1 overflow-auto bg-white dark:bg-slate-900 relative pdf-viewer-scrollbar" id="pdf-scroll-area">
                    <div class="h-full flex items-stretch justify-stretch p-0">
                        ${renderPDFContent()}
                    </div>
                </div>
            </div>
        </div>
    `;

    scrollActiveThumbnailIntoView();
}

function renderThumbnails() {
    const procedure = pdfState.currentProcedure;
    const pdfUrl = resolveProcedurePdfUrl(procedure);
    const thumbs = pdfUrl ? (pdfThumbsCache.get(pdfUrl) || []) : [];

    return Array.from({ length: pdfState.totalPages }, (_, i) => i + 1).map(page => `
        <div class="p-3 cursor-pointer transition-all hover:bg-slate-300 dark:hover:bg-slate-700 ${page === pdfState.currentPage ? 'bg-blue-100 dark:bg-blue-900/30 border-r-2 border-primary' : ''}" 
             data-thumb-page="${page}"
             onclick="goToPage(${page})">
            <div class="bg-slate-100 dark:bg-slate-700 rounded shadow-sm aspect-[3/4] flex items-center justify-center mb-2 border-2 overflow-hidden ${page === pdfState.currentPage ? 'border-primary' : 'border-transparent'}">
                ${thumbs[page - 1]
                    ? `<img src="${thumbs[page - 1]}" alt="Miniatura página ${page}" style="width:100%;height:100%;object-fit:contain;border-radius:0.25rem;" />`
                    : `<span class="text-slate-400 text-xs font-bold">Pág ${page}</span>`}
            </div>
            <p class="text-xs text-center text-slate-600 dark:text-slate-400">Página ${page}</p>
        </div>
    `).join('');
}

function refreshSidebarThumbnails() {
    const sidebar = document.getElementById('pdf-sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = renderThumbnails();
    scrollActiveThumbnailIntoView();
}

function scrollActiveThumbnailIntoView() {
    const activeThumb = document.querySelector(`#pdf-sidebar [data-thumb-page="${pdfState.currentPage}"]`);
    if (activeThumb) {
        activeThumb.scrollIntoView({ block: 'nearest' });
    }
}

function renderPDFContent() {
    const procedure = pdfState.currentProcedure;
    const pdfUrl = resolveProcedurePdfUrl(procedure);

    if (pdfUrl) {
        const zoomValue = Math.max(50, Math.min(300, pdfState.zoom));
        const zoomParam = zoomValue === 100 ? 'page-width' : String(zoomValue);
        const pdfSrc = `${pdfUrl}#page=${pdfState.currentPage}&zoom=${zoomParam}&toolbar=0&navpanes=0&scrollbar=1`;
        const rotateStyle = pdfState.rotation ? `transform: rotate(${pdfState.rotation}deg); transform-origin: top left;` : '';
        return `
            <div class="bg-white shadow-2xl relative" style="width: 100%; height: 100%; min-height: 0;">
                <iframe
                    src="${pdfSrc}"
                    title="Visor PDF"
                    style="position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; border: none; ${rotateStyle}"
                ></iframe>
            </div>
        `;
    }
    
    const scale = pdfState.zoom / 100;
    return `
        <div class="bg-white shadow-2xl transition-transform duration-200 origin-center" 
             style="transform: scale(${scale}) rotate(${pdfState.rotation}deg); width: 210mm; min-height: 297mm;">
            <div class="p-12 text-slate-800">
                <div class="border-b-2 border-primary pb-6 mb-8">
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-xl font-bold text-slate-900">UNIVERSIDAD NACIONAL MAYOR DE SAN MARCOS</h2>
                            <p class="text-sm text-slate-600 mt-1">FACULTAD DE INGENIERÍA DE SISTEMAS E INFORMÁTICA</p>
                        </div>
                        <div class="text-right text-xs text-slate-500">
                            <p>Código: ${procedure?.code || 'O-RA-001'}</p>
                            <p>Versión: 3.0</p>
                            <p class="font-semibold border-b border-slate-200 pb-1">${procedure?.lastUpdated || '2024-01-15'}</p>
                        </div>
                    </div>
                </div>
                <div class="text-center mb-10">
                    <h1 class="text-2xl font-bold text-slate-900 mb-2">${procedure?.title || 'PROCEDIMIENTO ADMINISTRATIVO'}</h1>
                    <p class="text-slate-600 text-sm max-w-2xl mx-auto">${procedure?.desc || ''}</p>
                </div>
                <div class="grid grid-cols-2 gap-6 mb-10 text-sm">
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Código</label>
                            <p class="font-semibold border-b border-slate-200 pb-1">${procedure?.code || 'N/A'}</p>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo</label>
                            <p class="font-semibold border-b border-slate-200 pb-1">${procedure?.type || 'Administrativo'}</p>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Páginas</label>
                            <p class="font-semibold border-b border-slate-200 pb-1">${procedure?.pages || '2'}</p>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Última actualización</label>
                            <p class="font-semibold border-b border-slate-200 pb-1">${procedure?.lastUpdated || '2024-01-15'}</p>
                        </div>
                    </div>
                </div>
                <div class="border-t-2 border-dashed border-slate-300 pt-8">
                    <h3 class="text-lg font-bold text-slate-900 mb-6 text-center">Diagrama de Flujo del Proceso</h3>
                    <div class="flex flex-col items-center gap-4">
                        <div class="w-48 h-12 bg-green-100 border-2 border-green-600 rounded-lg flex items-center justify-center font-semibold text-green-800 text-sm">INICIO</div>
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        <div class="w-64 h-16 bg-blue-50 border-2 border-primary rounded-lg flex items-center justify-center text-center px-4 font-medium text-slate-800 text-sm">Recepción de solicitud<br/>y documentos</div>
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        <div class="relative w-32 h-32 flex items-center justify-center">
                            <div class="absolute inset-0 bg-amber-50 border-2 border-amber-500 transform rotate-45"></div>
                            <span class="relative z-10 text-xs font-bold text-amber-800 text-center leading-tight">¿Documentos<br/>completos?</span>
                        </div>
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        <div class="w-64 h-16 bg-blue-50 border-2 border-primary rounded-lg flex items-center justify-center text-center px-4 font-medium text-slate-800 text-sm">Revisión por<br/>Secretaría Académica</div>
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        <div class="w-48 h-12 bg-red-100 border-2 border-red-600 rounded-lg flex items-center justify-center font-semibold text-red-800 text-sm">FIN</div>
                    </div>
                </div>
                <div class="mt-12 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                    <p><strong>Nota:</strong> Este es un documento oficial de la Universidad Nacional Mayor de San Marcos. Cualquier modificación debe ser aprobada por la Oficina de Racionalización.</p>
                </div>
            </div>
        </div>
    `;
}

function goToPage(page) {
    page = parseInt(page);
    if (isNaN(page) || page < 1) page = 1;
    if (page > pdfState.totalPages) page = pdfState.totalPages;
    
    pdfState.currentPage = page;
    renderPDFViewer();
    
    const scrollArea = document.getElementById('pdf-scroll-area');
    if (scrollArea) {
        scrollArea.scrollTop = 0;
    }
    scrollActiveThumbnailIntoView();
}

function prevPage() {
    if (pdfState.currentPage > 1) {
        goToPage(pdfState.currentPage - 1);
    }
}

function nextPage() {
    if (pdfState.currentPage < pdfState.totalPages) {
        goToPage(pdfState.currentPage + 1);
    }
}

function zoomIn() {
    if (pdfState.zoom < 200) {
        pdfState.zoom += 25;
        renderPDFViewer();
    }
}

function zoomOut() {
    if (pdfState.zoom > 50) {
        pdfState.zoom -= 25;
        renderPDFViewer();
    }
}

function rotatePDF() {
    pdfState.rotation = (pdfState.rotation + 90) % 360;
    renderPDFViewer();
}

async function loadPdfJsLibrary() {
    if (window.pdfjsLib) {
        return window.pdfjsLib;
    }

    await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-lib="pdfjs-runtime"]');
        if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', () => reject(new Error('No se pudo cargar PDF.js.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.async = true;
        script.defer = true;
        script.dataset.lib = 'pdfjs-runtime';
        script.onload = resolve;
        script.onerror = () => reject(new Error('No se pudo cargar PDF.js.'));
        document.head.appendChild(script);
    });

    if (!window.pdfjsLib) {
        throw new Error('PDF.js no disponible');
    }

    if (window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    return window.pdfjsLib;
}

async function ensureProcedurePdfPages(procedure) {
    if (!procedure) return;

    const pdfUrl = resolveProcedurePdfUrl(procedure);
    if (!pdfUrl) return;

    if (pdfPagesCache.has(pdfUrl)) {
        const cachedPages = pdfPagesCache.get(pdfUrl);
        procedure.pages = cachedPages;
        pdfState.totalPages = cachedPages;
        if (pdfState.currentPage > cachedPages) {
            pdfState.currentPage = cachedPages;
        }
        renderPDFViewer();
        ensureProcedurePdfThumbnails(procedure).catch((error) => {
            console.warn('No se pudieron generar miniaturas del PDF:', error);
        });
        return;
    }

    try {
        const pdfjsLib = await loadPdfJsLibrary();
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdfDoc = await loadingTask.promise;
        const total = Math.max(1, Number(pdfDoc.numPages) || 1);

        pdfPagesCache.set(pdfUrl, total);
        procedure.pages = total;

        if (pdfState.currentProcedure && pdfState.currentProcedure.id === procedure.id) {
            pdfState.totalPages = total;
            if (pdfState.currentPage > total) {
                pdfState.currentPage = total;
            }
            renderPDFViewer();
        }

        ensureProcedurePdfThumbnails(procedure, pdfDoc).catch((error) => {
            console.warn('No se pudieron generar miniaturas del PDF:', error);
        });
    } catch (error) {
        console.warn('No se pudo cargar PDF.js para contar páginas:', error);
    }
}

async function ensureProcedurePdfThumbnails(procedure, existingPdfDoc = null) {
    if (!procedure) return;

    const pdfUrl = resolveProcedurePdfUrl(procedure);
    if (!pdfUrl) return;
    if (pdfThumbsLoading.has(pdfUrl)) return;

    const cached = pdfThumbsCache.get(pdfUrl);
    const expectedPages = Math.max(1, parseInt(procedure.pages, 10) || pdfState.totalPages || 1);
    const alreadyComplete = cached && cached.length >= expectedPages && cached.every(Boolean);
    if (alreadyComplete) {
        if (pdfState.currentProcedure && resolveProcedurePdfUrl(pdfState.currentProcedure) === pdfUrl) {
            refreshSidebarThumbnails();
        }
        return;
    }

    pdfThumbsLoading.add(pdfUrl);

    try {
        const pdfjsLib = await loadPdfJsLibrary();
        const pdfDoc = existingPdfDoc || (await pdfjsLib.getDocument({ url: pdfUrl }).promise);
        const total = Math.max(1, Number(pdfDoc.numPages) || expectedPages);

        const thumbs = cached && cached.length === total ? cached : new Array(total).fill('');
        const targetWidth = 140;

        for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
            if (thumbs[pageNumber - 1]) continue;

            const page = await pdfDoc.getPage(pageNumber);
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = targetWidth / baseViewport.width;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.floor(viewport.width));
            canvas.height = Math.max(1, Math.floor(viewport.height));
            const ctx = canvas.getContext('2d', { alpha: false });
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs[pageNumber - 1] = canvas.toDataURL('image/jpeg', 0.72);

            pdfThumbsCache.set(pdfUrl, thumbs);
            if (pdfState.currentProcedure && resolveProcedurePdfUrl(pdfState.currentProcedure) === pdfUrl) {
                refreshSidebarThumbnails();
            }
        }
    } catch (error) {
        console.warn('Error generando miniaturas:', error);
    } finally {
        pdfThumbsLoading.delete(pdfUrl);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('pdf-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
    }
}

function closePDFViewer() {
    pdfState.isOpen = false;
    pdfState.currentProcedure = null;
    const viewer = document.getElementById('pdf-viewer');
    if (viewer) {
        viewer.classList.add('hidden');
        viewer.innerHTML = '';
    }
    
    document.querySelectorAll('.procedure-card').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    });
}

async function downloadPDF() {
    if (!pdfState.currentProcedure) {
        showToast('Seleccione un procedimiento primero', 'warning');
        return;
    }

    const procedure = pdfState.currentProcedure;
    const safeTitle = (procedure.title || 'flujograma').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `${safeTitle}_${procedure.code || 'PROC'}.pdf`;

    try {
        showToast(`Descargando ${procedure.title}...`, 'success');

        if (procedure.id != null) {
            const remoteDownload = await downloadFlowPdfById(procedure.id, fileName);
            if (remoteDownload.success) {
                return;
            }
        }

        const pdfUrl = resolveProcedurePdfUrl(procedure);
        if (!pdfUrl) {
            showToast('No se encontró PDF para descargar', 'warning');
            return;
        }

        const response = await fetch(pdfUrl);
        if (!response.ok) {
            throw new Error(`No se pudo descargar el PDF (${response.status})`);
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error('Error descargando PDF:', error);
        showToast('No se pudo descargar el PDF', 'error');
    }
}

function resolveProcedurePdfUrl(procedure) {
    if (!procedure) return '';

    const code = String(procedure.code || '').toUpperCase();
    const catalogEntry = PDF_CATALOG[code];

    // Solo devolver PDF si coincide la facultad o no tiene restricción de facultad
    if (catalogEntry) {
        const entryFaculty = String(catalogEntry.facultyId || '');
        const procFaculty = String(procedure.facultyId || '');
        
        // Si el PDF tiene facultyId definido, solo mostrarlo si coincide
        // Si no tiene facultyId (null/''), mostrar para todas
        if (!entryFaculty || entryFaculty === procFaculty) {
            return catalogEntry.url;
        }
    }

    // Fallback: pdfUrl explícito del procedimiento
    const dataUrl = String(procedure.pdfUrl || '').trim();
    if (dataUrl && !isPlaceholderPdfUrl(dataUrl)) {
        return dataUrl;
    }

    return '';
}

function getFirstValidPdfUrl(urls = []) {
    for (const rawUrl of urls) {
        const url = String(rawUrl || '').trim();
        if (!url) continue;
        if (isPlaceholderPdfUrl(url)) continue;
        return url;
    }
    return '';
}

function isPlaceholderPdfUrl(url) {
    if (!url || url === '#' || url === '') return true;
    // Detecta URLs tipo #pdf-12-1 generadas por LocalAPI
    if (url.startsWith('#')) return true;
    // Detecta placeholders de API
    return /^\/api\/flowcharts\/\d+\/pdf$/i.test(url);
}

async function printPDF() {
    if (!pdfState.currentProcedure) {
        showToast('Seleccione un procedimiento primero', 'warning');
        return;
    }

    const procedure = pdfState.currentProcedure;
    const pdfUrl = resolveProcedurePdfUrl(procedure);

    if (!pdfUrl) {
        showToast('No hay PDF disponible para imprimir', 'warning');
        return;
    }

    try {
        showToast('Abriendo vista de impresión...', 'info');

        const printWindow = window.open(pdfUrl, '_blank');
        
        if (!printWindow) {
            showToast('Permita ventanas emergentes para imprimir. Descargando en su lugar...', 'warning');
            await downloadPDF();
            return;
        }

        printWindow.addEventListener('load', () => {
            setTimeout(() => {
                printWindow.print();
            }, 1000);
        });

        setTimeout(() => {
            try {
                printWindow.print();
            } catch (e) {
                // Ignorar errores de cross-origin
            }
        }, 1500);

    } catch (error) {
        console.error('Error al imprimir:', error);
        showToast('Error al abrir impresión. Intente descargar el PDF.', 'error');
    }
}

// ============================================================
// BÚSQUEDA
// ============================================================

function initSearchFunctionality() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            filterProceduresByText(query);
        }, 300);
    });
}

function filterProceduresByText(query) {
    if (!query) {
        renderProcedureCards(currentProcedures);
        return;
    }
    
    const filtered = currentProcedures.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.code.toLowerCase().includes(query) ||
        (p.desc && p.desc.toLowerCase().includes(query))
    );
    
    renderProcedureCards(filtered);
}

// ============================================================
// 🔧 FIX: FILTRO DE FACULTADES CORREGIDO
// ============================================================

function initFacultyFilter() {
    const facultySelect = document.getElementById('faculty-select');
    if (!facultySelect) {
        console.warn('No se encontró #faculty-select');
        return;
    }

    facultySelect.addEventListener('change', (e) => {
        const facultyId = e.target.value;
        FLOWS_CONFIG.facultyId = facultyId;
        
        closePDFViewer();
        loadProcedures(facultyId || null);
        
        if (facultyId) {
            const btnText = document.getElementById('selected-faculty-text');
            const facultyName = btnText ? btnText.textContent : 'Facultad seleccionada';
            showToast(`Filtrando: ${facultyName}`, 'info');
        }
    });
}

// ============================================================
// SELECT PERSONALIZADO
// ============================================================

function initCustomSelect() {
    const selectBtn = document.getElementById('faculty-select-btn');
    const dropdown = document.getElementById('faculty-dropdown');
    const arrow = document.getElementById('select-arrow');
    const selectedText = document.getElementById('selected-faculty-text');
    const hiddenInput = document.getElementById('faculty-select');
    const options = document.querySelectorAll('.faculty-option');
    const container = document.getElementById('custom-select-container');
    
    if (!selectBtn || !dropdown) {
        console.warn('No se encontró el select personalizado de facultades');
        return;
    }
    
    function openDropdown() {
        dropdown.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'translateY(-50%) rotate(180deg)';
        selectBtn.classList.add('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }
    
    function closeDropdown() {
        dropdown.classList.add('hidden');
        if (arrow) arrow.style.transform = 'translateY(-50%) rotate(0deg)';
        selectBtn.classList.remove('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }
    
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            const text = option.textContent.trim();
            
            if (selectedText) selectedText.textContent = text;
            if (hiddenInput) hiddenInput.value = value;
            
            closeDropdown();
            
            // 🔧 FIX: Disparar evento change para que initFacultyFilter lo capture
            if (hiddenInput) {
                const event = new Event('change', { bubbles: true });
                hiddenInput.dispatchEvent(event);
            }
            
            // 🔧 FIX: Llamar directamente a loadProcedures también
            if (typeof loadProcedures === 'function') {
                loadProcedures(value || null);
            }
            
            if (value && typeof showToast === 'function') {
                showToast(`Filtrando: ${text}`, 'info');
            }
        });
    });
    
    document.addEventListener('click', (e) => {
        if (container && !container.contains(e.target)) {
            closeDropdown();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });
}

// ============================================================
// TOAST
// ============================================================

function showToast(message, type = 'info') {
    if (window.Toast && typeof window.Toast.show === 'function') {
        Toast.show(message, type);
    } else {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-50 transition-opacity duration-300 ${
            type === 'error' ? 'bg-red-600' : 
            type === 'success' ? 'bg-green-600' : 
            type === 'warning' ? 'bg-amber-600' : 'bg-primary'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// ============================================================
// EXPORTAR GLOBAL
// ============================================================

window.selectProcedure = selectProcedure;
window.goToPage = goToPage;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.rotatePDF = rotatePDF;
window.toggleSidebar = toggleSidebar;
window.downloadPDF = downloadPDF;
window.printPDF = printPDF;
window.closePDFViewer = closePDFViewer;
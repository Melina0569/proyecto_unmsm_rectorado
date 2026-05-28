/**
 * FLOWS MODULE
 * Maneja la lógica de flujogramas integrando con API local
 */

// Configuración
const CONFIG = {
    useRealData: true,       // true = usa API, false = usa ejemplos estáticos
    showExamplesIfEmpty: false, // NO mostrar ejemplos si no hay datos reales
    REMOTE_BASE: 'http://localhost:8080/v1',
    facultyId: null         // Se establece dinámicamente según el filtro
};

// Catalogo manual de PDFs reales por codigo
const PDF_CATALOG = {
    'PE-01': 'docs/pdfs/flujogramas/FLUJOGRAMA DE GESTIÓN ESTRATÉGICA (2).pdf'
};

// Datos de ejemplo (fallback)
const exampleProcedures = [
    { 
        id: 'PE-01',
        title: "Gestión Estratégica", 
        code: "PE-01", 
        desc: "Flujogramas del proceso de gestión estratégica y actividades clave institucionales.",
        pdfUrl: "docs/pdfs/flujogramas/FLUJOGRAMA DE GESTIÓN ESTRATÉGICA (2).pdf"
    },
    { 
        id: 'PROC-002',
        title: "Gestión de Grados", 
        code: "PROC-002", 
        desc: "Trámite administrativo para la obtención de grados académicos y títulos profesionales.",
        pdfUrl: "gestion_grados.pdf",
        facultyId: 20
    },
    { 
        id: 'PROC-003',
        title: "Traslados Internos", 
        code: "PROC-003", 
        desc: "Flujo de aprobación para el cambio de escuela profesional dentro de la misma facultad.",
        pdfUrl: "traslados_internos.pdf",
        facultyId: 19
    },
    { 
        id: 'PROC-004',
        title: "Reserva de Matrícula", 
        code: "PROC-004", 
        desc: "Gestión de solicitudes para la suspensión temporal de estudios regulares.",
        pdfUrl: "reserva_matricula.pdf",
        facultyId: 9
    },
    { 
        id: 'PROC-005',
        title: "Convalidación de Cursos", 
        code: "PROC-005", 
        desc: "Evaluación de sílabos externos para el reconocimiento de créditos académicos.",
        pdfUrl: "convalidacion_cursos.pdf",
        facultyId: 20
    },
    { 
        id: 'PROC-006',
        title: "Certificados de Estudios", 
        code: "PROC-006", 
        desc: "Emisión de documentos oficiales que acreditan el rendimiento académico del alumno.",
        pdfUrl: "certificados_estudios.pdf",
        facultyId: 20
    }
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

// Variable para guardar los procedimientos cargados actualmente
let currentProcedures = [];
const pdfPagesCache = new Map();
const pdfThumbsCache = new Map();
const pdfThumbsLoading = new Set();

/**
 * Obtener flujogramas desde API pública
 */
async function getFlowsByFaculty(facultyId, page = 1, limit = 20) {
    try {
        // Obtener token guardado
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');

        const headers = {
            'Accept': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `${CONFIG.REMOTE_BASE}/public/flows?facultyId=${facultyId}&page=${page}&limit=${limit}`,
            {
                method: 'GET',
                headers: headers
            }
        );

        // Validar errores HTTP
        if (!response.ok) {
            console.error(`Error HTTP: ${response.status}`);
            return {
                success: false,
                data: [],
                pagination: null,
                status: response.status
            };
        }

        // Convertir respuesta
        const data = await response.json();
        console.log('Flujogramas desde API:', data);

        // Normalizar respuesta
        const flows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        const pagination = data?.pagination || null;

        return {
            success: flows.length > 0,
            data: flows,
            pagination: pagination,
            status: response.status
        };

    } catch (error) {
        console.error('Error obteniendo flujogramas:', error);

        return {
            success: false,
            data: [],
            pagination: null,
            error: error.message
        };
    }
}

/**
 * Obtener detalle de un flujograma por ID
 */
async function getFlowById(flowId) {
    try {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');

        const headers = {
            'Accept': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `${CONFIG.REMOTE_BASE}/public/flows/${encodeURIComponent(flowId)}`,
            {
                method: 'GET',
                headers: headers
            }
        );

        if (!response.ok) {
            return {
                success: false,
                data: null,
                status: response.status
            };
        }

        const data = await response.json();

        return {
            success: true,
            data: data,
            status: response.status
        };
    } catch (error) {
        console.error('Error obteniendo detalle de flujograma:', error);
        return {
            success: false,
            data: null,
            error: error.message
        };
    }
}

/**
 * Descargar PDF de un flujograma por ID desde API
 */
async function downloadFlowPdfById(flowId, fileName = null) {
    try {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');

        const headers = {
            'Accept': 'application/pdf'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `${CONFIG.REMOTE_BASE}/public/flows/${encodeURIComponent(flowId)}/download`,
            {
                method: 'GET',
                headers: headers
            }
        );

        if (!response.ok) {
            return {
                success: false,
                status: response.status
            };
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

        return {
            success: true,
            status: response.status
        };
    } catch (error) {
        console.error('Error descargando PDF del flujograma:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Inicialización del módulo
 */
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    loadProcedures(); // Carga desde API o ejemplos
    initSearchFunctionality();
    initFacultyFilter();
});

/**
 * Carga procedimientos (API real o ejemplos)
 */
async function loadProcedures(facultyId = null) {
    showLoading(true);
    
    try {
        let procedures = [];
        
        if (CONFIG.useRealData) {
            // Usar la función getFlowsByFaculty() local con paginación
            const response = await getFlowsByFaculty(facultyId || 12, 1, 20);
            
            if (response.success && response.data && response.data.length > 0) {
                procedures = response.data.map((flow, index) => ({
                    id: flow.id || index + 1,
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
                console.log('✅ Datos cargados desde API:', procedures.length, 'procedimientos');
            } else {
                // API devolvió vacío o no hubo flujogramas publicados.
                // Intentar usar PDFs locales definidos en PDF_CATALOG antes de caer en ejemplos.
                const localPdfCodes = Object.keys(PDF_CATALOG || {});
                if (localPdfCodes.length > 0) {
                    procedures = localPdfCodes.map((code, idx) => ({
                        id: code,
                        title: code === 'PE-01' ? 'Gestión Estratégica' : code,
                        code: code,
                        desc: '',
                        pdfUrl: PDF_CATALOG[code],
                        facultyId: null,
                        type: 'local',
                        pages: 0,
                        lastUpdated: null,
                        downloads: 0
                    }));
                    console.log('⚠️ API vacía, usando PDFs locales:', procedures.length, 'procedimientos');
                    showToast('Mostrando PDFs locales disponibles.', 'info');
                } else if (CONFIG.showExamplesIfEmpty) {
                    procedures = filterExamplesByFaculty(facultyId);
                    console.log('⚠️ API vacía, usando ejemplos:', procedures.length, 'procedimientos');
                }
            }
        } else {
            procedures = filterExamplesByFaculty(facultyId);
            console.log('📴 Modo offline, usando ejemplos:', procedures.length, 'procedimientos');
        }
        
        currentProcedures = procedures;
        renderProcedureCards(procedures);
        
    } catch (error) {
        console.error('Error cargando procedimientos:', error);
        // En caso de error, intentar mostrar PDFs locales si existen
        const localPdfCodes = Object.keys(PDF_CATALOG || {});
        if (localPdfCodes.length > 0) {
            const procedures = localPdfCodes.map((code) => ({
                id: code,
                title: code === 'PE-01' ? 'Gestión Estratégica' : code,
                code: code,
                desc: '',
                pdfUrl: PDF_CATALOG[code],
                facultyId: null,
                type: 'local',
                pages: 0,
                lastUpdated: null,
                downloads: 0
            }));
            currentProcedures = procedures;
            renderProcedureCards(procedures);
            showToast('Mostrando PDFs locales disponibles.', 'info');
        } else if (CONFIG.showExamplesIfEmpty) {
            const procedures = filterExamplesByFaculty(facultyId);
            currentProcedures = procedures;
            renderProcedureCards(procedures);
            showToast('Error al cargar datos. Mostrando ejemplos.', 'warning');
        } else {
            // No mostrar ejemplos: dejar lista vacía y notificar
            currentProcedures = [];
            renderProcedureCards([]);
            showToast('Error al cargar datos desde la API. No hay flujogramas disponibles.', 'warning');
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Filtra ejemplos por facultad
 */
function filterExamplesByFaculty(facultyId) {
    if (!facultyId) return exampleProcedures;
    const fid = String(facultyId);
    return exampleProcedures.filter(p => p.code === 'PE-01' || String(p.facultyId) === fid || !p.facultyId);
}

/**
 * Muestra/oculta estado de carga
 */
function showLoading(show) {
    const loadingEl = document.getElementById('loading-state');
    const gridEl = document.getElementById('procedures-grid');
    
    if (loadingEl) {
        loadingEl.classList.toggle('hidden', !show);
    }
    if (gridEl) {
        gridEl.classList.toggle('opacity-50', show);
    }
}

/**
 * Control de tema claro/oscuro
 */
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

/**
 * Renderiza las tarjetas de procedimientos
 */
function renderProcedureCards(procedures) {
    const grid = document.getElementById('procedures-grid');
    const noResults = document.getElementById('no-results');
    
    if (!grid) return;

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
                    <h3 class="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors text-lg">${card.title}</h3>
                    <span class="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider">${card.code}</span>
                    <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">${card.desc}</p>
                    ${card.lastUpdated ? `<span class="text-xs text-slate-400 mt-2">Actualizado: ${card.lastUpdated}</span>` : ''}
                </div>
                <div class="flex-shrink-0 self-center">
                    <span class="material-icons-round text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Selecciona un procedimiento y muestra el PDF
 */
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
    
    // Actualizar UI activa
    document.querySelectorAll('.procedure-card').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    });
    
    const selectedCard = document.querySelector(`[data-procedure-id="${procedureId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    }

    showToast(`Cargando: ${procedure.title}`, 'info');
    
    // Mostrar de inmediato con valor inicial y luego sincronizar con paginas reales del PDF.
    renderPDFViewer();
    ensureProcedurePdfPages(procedure).catch((error) => {
        console.warn('No se pudo obtener el total real de paginas del PDF:', error);
    });
    
    // Scroll suave al PDF
    setTimeout(() => {
        const viewer = document.getElementById('pdf-viewer');
        if (viewer) {
            viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

/**
 * Renderiza el visor de PDF
 */
function renderPDFViewer() {
    // ✅ USAR EL ID CORRECTO: pdf-viewer (no pdf-viewer-container)
    const viewer = document.getElementById('pdf-viewer');
    
    if (!viewer) {
        console.error('❌ No se encontró el contenedor del PDF con id="pdf-viewer"');
        return;
    }

    // Mostrar el contenedor removiendo la clase 'hidden'
    viewer.classList.remove('hidden');
    
    const procedure = pdfState.currentProcedure;

    viewer.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl">
            <!-- Toolbar -->
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
                    <!-- Navegación de páginas -->
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
                    
                    <!-- Zoom -->
                    <div class="hidden md:flex items-center gap-1">
                        <button class="p-2 hover:bg-slate-700 rounded-lg" onclick="zoomOut()" title="Alejar">
                            <span class="material-icons-round text-lg">remove</span>
                        </button>
                        <span class="w-12 text-center font-mono text-xs">${pdfState.zoom}%</span>
                        <button class="p-2 hover:bg-slate-700 rounded-lg" onclick="zoomIn()" title="Acercar">
                            <span class="material-icons-round text-lg">add</span>
                        </button>
                    </div>
                    
                    <!-- Acciones -->
                    <div class="flex items-center gap-1 border-l border-slate-700 pl-2 md:pl-4">
                        <button class="p-2 hover:bg-slate-700 rounded-lg" onclick="rotatePDF()" title="Rotar">
                            <span class="material-icons-round text-lg">rotate_right</span>
                        </button>
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
            
            <!-- Contenido del PDF -->
            <div class="bg-slate-100 dark:bg-slate-900 flex" style="height: min(72vh, 760px); min-height: 480px;">
                <!-- Sidebar con miniaturas -->
                <div id="pdf-sidebar" class="w-48 bg-slate-200 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 overflow-y-auto hidden md:block">
                    ${renderThumbnails()}
                </div>
                
                <!-- Área de visualización -->
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

/**
 * Renderiza las miniaturas del sidebar
 */
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

/**
 * Renderiza el contenido del PDF
 */
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
            
            <!-- Contenido del documento -->
            <div class="p-12 text-slate-800">
                <!-- Header del documento -->
                <div class="border-b-2 border-primary pb-6 mb-8">
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-xl font-bold text-slate-900">UNIVERSIDAD NACIONAL MAYOR DE SAN MARCOS</h2>
                            <p class="text-sm text-slate-600 mt-1">FACULTAD DE INGENIERÍA DE SISTEMAS E INFORMÁTICA</p>
                        </div>
                        <div class="text-right text-xs text-slate-500">
                            <p>Código: ${procedure?.code || 'O-RA-001'}</p>
                            <p>Versión: 3.0</p>
                            <p>Fecha: ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Título del procedimiento -->
                <div class="text-center mb-10">
                    <h1 class="text-2xl font-bold text-slate-900 mb-2">${procedure?.title || 'PROCEDIMIENTO ADMINISTRATIVO'}</h1>
                    <p class="text-slate-600 text-sm max-w-2xl mx-auto">${procedure?.desc || ''}</p>
                </div>
                
                <!-- Info del procedimiento -->
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
                
                <!-- Diagrama de flujo simplificado -->
                <div class="border-t-2 border-dashed border-slate-300 pt-8">
                    <h3 class="text-lg font-bold text-slate-900 mb-6 text-center">Diagrama de Flujo del Proceso</h3>
                    
                    <div class="flex flex-col items-center gap-4">
                        <!-- Inicio -->
                        <div class="w-48 h-12 bg-green-100 border-2 border-green-600 rounded-lg flex items-center justify-center font-semibold text-green-800 text-sm">
                            INICIO
                        </div>
                        
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        
                        <!-- Proceso -->
                        <div class="w-64 h-16 bg-blue-50 border-2 border-primary rounded-lg flex items-center justify-center text-center px-4 font-medium text-slate-800 text-sm">
                            Recepción de solicitud<br/>y documentos
                        </div>
                        
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        
                        <!-- Decisión -->
                        <div class="relative w-32 h-32 flex items-center justify-center">
                            <div class="absolute inset-0 bg-amber-50 border-2 border-amber-500 transform rotate-45"></div>
                            <span class="relative z-10 text-xs font-bold text-amber-800 text-center leading-tight">
                                ¿Documentos<br/>completos?
                            </span>
                        </div>
                        
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        
                        <!-- Proceso -->
                        <div class="w-64 h-16 bg-blue-50 border-2 border-primary rounded-lg flex items-center justify-center text-center px-4 font-medium text-slate-800 text-sm">
                            Revisión por<br/>Secretaría Académica
                        </div>
                        
                        <div class="h-6 w-0.5 bg-slate-400"></div>
                        
                        <!-- Fin -->
                        <div class="w-48 h-12 bg-red-100 border-2 border-red-600 rounded-lg flex items-center justify-center font-semibold text-red-800 text-sm">
                            FIN
                        </div>
                    </div>
                </div>
                
                <!-- Nota -->
                <div class="mt-12 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                    <p><strong>Nota:</strong> Este es un documento oficial de la Universidad Nacional Mayor de San Marcos. 
                    Cualquier modificación debe ser aprobada por la Oficina de Racionalización.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Navegación de páginas
 */
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

/**
 * Zoom controls
 */
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

/**
 * Rotación del PDF
 */
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
    } finally {
        pdfThumbsLoading.delete(pdfUrl);
    }
}

/**
 * Toggle sidebar
 */
function toggleSidebar() {
    const sidebar = document.getElementById('pdf-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
    }
}

/**
 * Cierra el visor PDF
 */
function closePDFViewer() {
    pdfState.isOpen = false;
    pdfState.currentProcedure = null;
    const viewer = document.getElementById('pdf-viewer');
    if (viewer) {
        viewer.classList.add('hidden');
        viewer.innerHTML = '';
    }
    
    // Quitar selección de tarjetas
    document.querySelectorAll('.procedure-card').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    });
}

/**
 * Descargar PDF
 */
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

        // Primero intentar descarga por endpoint del backend usando el ID del flujo.
        if (procedure.id != null) {
            const remoteDownload = await downloadFlowPdfById(procedure.id, fileName);
            if (remoteDownload.success) {
                return;
            }
        }

        // Si falla la descarga remota, intentar con URL local/directa.
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
    const byCatalog = PDF_CATALOG[code] || '';
    const byConvention = code ? `docs/pdfs/flujogramas/${code}.pdf` : '';
    const dataUrl = String(procedure.pdfUrl || '').trim();

    return getFirstValidPdfUrl([byCatalog, byConvention, dataUrl]);
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
    if (!url || url === '#') return true;
    return /^\/api\/flowcharts\/\d+\/pdf$/i.test(url);
}

/**
 * Imprimir PDF
 */
function printPDF() {
    window.print();
}

/**
 * Inicializa la funcionalidad de búsqueda
 */
function initSearchFunctionality() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase();
            filterProceduresByText(query);
        }, 300);
    });
}

/**
 * Filtra procedimientos por texto (client-side)
 */
function filterProceduresByText(query) {
    if (!query) {
        renderProcedureCards(currentProcedures);
        return;
    }
    
    const filtered = currentProcedures.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.code.toLowerCase().includes(query) ||
        p.desc.toLowerCase().includes(query)
    );
    
    renderProcedureCards(filtered);
}

/**
 * Inicializa el filtro de facultades
 */
function initFacultyFilter() {
    const facultySelect = document.getElementById('faculty-select');
    if (!facultySelect) return;

    facultySelect.addEventListener('change', (e) => {
        const facultyId = e.target.value;
        CONFIG.facultyId = facultyId;
        
        // Cerrar visor PDF al cambiar de facultad
        closePDFViewer();
        
        loadProcedures(facultyId);
        
        if (facultyId) {
            const facultyName = facultySelect.options[facultySelect.selectedIndex].text;
            showToast(`Filtrando: ${facultyName}`, 'info');
        }
    });
}

/**
 * Muestra notificación toast
 */
function showToast(message, type = 'info') {
    if (window.Toast && typeof Toast.show === 'function') {
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

/**
 * Inicializa el select personalizado de facultades
 */
function initCustomSelect() {
    const selectBtn = document.getElementById('faculty-select-btn');
    const dropdown = document.getElementById('faculty-dropdown');
    const arrow = document.getElementById('select-arrow');
    const selectedText = document.getElementById('selected-faculty-text');
    const hiddenInput = document.getElementById('faculty-select');
    const options = document.querySelectorAll('.faculty-option');
    const container = document.getElementById('custom-select-container');
    
    if (!selectBtn || !dropdown) return;
    
    // Toggle dropdown
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    // Abrir dropdown
    function openDropdown() {
        dropdown.classList.remove('hidden');
        arrow.style.transform = 'translateY(-50%) rotate(180deg)';
        selectBtn.classList.add('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }
    
    // Cerrar dropdown
    function closeDropdown() {
        dropdown.classList.add('hidden');
        arrow.style.transform = 'translateY(-50%) rotate(0deg)';
        selectBtn.classList.remove('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }
    
    // Seleccionar opción
    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            const text = option.textContent.trim();
            
            // Actualizar texto mostrado
            selectedText.textContent = text;
            
            // Actualizar input hidden
            hiddenInput.value = value;
            
            // Cerrar dropdown
            closeDropdown();
            
            // Disparar evento change para compatibilidad con código existente
            const event = new Event('change');
            hiddenInput.dispatchEvent(event);
            
            // Llamar directamente a la función de filtro si existe
            if (typeof loadIndicators === 'function') {
                loadIndicators(value);
            }
            
            // Mostrar toast
            if (value && typeof showToast === 'function') {
                showToast(`Filtrando: ${text}`, 'info');
            }
        });
    });
    
    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initCustomSelect();
});

// Exportar funciones globales necesarias
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
// ==========================================
// FUNCIÓN PREPARADA: Obtener archivo desde backend (cuando esté disponible)
// ==========================================
// Descomenta y adapta cuando tengas tu backend listo
// async function fetchArchivoDesdeBackend(codigo) {
//     // Ejemplo de endpoint, reemplaza por el tuyo:
//     // const response = await fetch(`/api/documentos/${codigo}/archivo`);
//     // if (!response.ok) throw new Error('No se pudo obtener el archivo');
//     // const data = await response.json(); // o response.blob() según tu backend
//     // return data.base64 || data.url || data.blob;
// }

// Ejemplo de uso futuro:
// if (!archivoEnLocalStorage) {
//     // Mostrar mensaje: "No disponible localmente. Cuando el sistema esté conectado al servidor, se podrá previsualizar."
//     // Cuando tengas backend:
//     // const archivo = await fetchArchivoDesdeBackend(codigo);
//     // ...mostrar archivo...
// }
// ==========================================
// SIGPRO - Document Management Dashboard
// JavaScript con integración API.js
// ==========================================

// Estado global
let currentPage = 1;
let totalPages = 1;
let currentFilter = 'todos';
let allDocuments = [];
let filteredDocuments = [];
let rectificacionSeleccionada = null; // índice/objeto seleccionado para el botón RESPONDER

// Mismo prefijo que usa api.js → evita que el borrado limpie claves distintas a las que lee
const _mode = (typeof CONFIG !== 'undefined' && CONFIG.MODE) ? CONFIG.MODE : 'local';
const STORAGE_KEYS = {
    DOCUMENTOS_LISTA:    `${_mode}_sigpro_documentos_lista`,
    INDICADORES_DETALLE: `${_mode}_sigpro_indicadores_detalle`,
    DOCUMENTOS_DETALLE:  `${_mode}_sigpro_documentos_detalle`,
    CORRECCIONES_LISTA:  `${_mode}_sigpro_correcciones_solicitudes`
};

// ============================================
// ANTI-BACK BUTTON: Prevenir volver con sesión cerrada
// ============================================

// Cuando el navegador restaura la página desde bfcache (botón Atrás)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        const hasToken = !!(
            localStorage.getItem('token') ||
            localStorage.getItem('unmsm_token') ||
            localStorage.getItem('auth_token') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('unmsm-token') ||
            localStorage.getItem('jwt')
        );
        
        if (!hasToken) {
            window.location.replace('portal-inicio-facultades.html');
        } else {
            window.location.reload();
        }
    }
});

// ============================================
// PROTECCIÓN: Verificar sesión al cargar
// ============================================

(function checkSessionOnLoad() {
    const hasToken = !!(
        localStorage.getItem('token') ||
        localStorage.getItem('unmsm_token') ||
        localStorage.getItem('auth_token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('unmsm-token') ||      // ← NUEVO: formato con guión
        localStorage.getItem('jwt')                 // ← NUEVO: algunas APIs usan jwt
    );
    
    if (!hasToken) {
        window.location.replace('portal-inicio-facultades.html');
        return;
    }
})();


// ==========================================
// UTILIDADES GLOBALES
// ==========================================

/**
 * Valida si un string es un ID válido del backend
 * Acepta UUIDs estándar o códigos generados por el backend (CAR-, FLU-, IND-, etc.)
 */
function isBackendId(str) {
    if (!str || typeof str !== 'string') return false;
    // UUID estándar
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return true;
    // Código de caracterización: CAR-YYYY-XXXXXXXXXX
    if (/^CAR-\d{4}-\d+$/i.test(str)) return true;
    // Código de flujograma: FLU-XXXX-YYYY-NNN
    if (/^FLU-[A-Z]+-\d{4}-\d+$/i.test(str)) return true;
    // Otros códigos del backend
    if (/^(IND|REP|DOC|FLU|CAR)-[A-Z0-9-]+$/i.test(str)) return true;
    return false;
}


// ==========================================
// INDEXEDDB PARA ADJUNTOS GRANDES (compartido con racio-expedientes)
// ==========================================

function openAdjuntosIndexedDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB no disponible"));
            return;
        }
        const request = indexedDB.open("sigpro_adjuntos_db", 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("adjuntos")) {
                db.createObjectStore("adjuntos", { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("No se pudo abrir IndexedDB"));
    });
}

// ==========================================
// Inicialización
// ==========================================

document.addEventListener('DOMContentLoaded', async function() {
    initThemeToggle();  
    loadDashboardData();
    initEventListeners();
    initSorting();
    applyQueryDocId();

    // Manejo de subida de archivo en formulario de respuesta de rectificación
    const respFileInput = document.getElementById('resp-file-input');
    if (respFileInput) {
        respFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                window.respuestaAdjuntoTemporal = {
                    nombre: file.name,
                    tipo: file.type,
                    tamaño: file.size,
                    fecha: new Date().toISOString(),
                    contenido: event.target.result
                };
                showToast('Archivo listo para enviar', 'success');
            };
            reader.readAsDataURL(file);
        });
    }

    // Agregar evento para el botón ENVIAR del formulario de respuesta
    const enviarBtn = document.querySelector('#formulario-respuesta button.bg-primary');
        if (enviarBtn) {
            // Eliminar listeners anteriores para evitar duplicados
            const nuevoBtn = enviarBtn.cloneNode(true);
            enviarBtn.parentNode.replaceChild(nuevoBtn, enviarBtn);
            
            nuevoBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                await enviarRespuestaObservaciones();
            });
        }
});

function guardarAdjunto(detalle) {
    if (!window.archivoAdjuntoTemporal) {
        alert("Selecciona un archivo primero");
        return;
    }

    const codigo = document.getElementById('detail-codigo')?.textContent;

    if (!codigo) {
        alert("No se encontró el código del documento");
        return;
    }

    // Obtener storage actual
    let storage = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE)) || {};

    // Si no existe ese documento, crearlo
    if (!storage[codigo]) {
        storage[codigo] = {
            codigo: codigo,
            adjuntos: []
        };
    }

    // 🔥 Asegurar que el adjunto tenga contenido base64
    const adjunto = window.archivoAdjuntoTemporal;
    
    // Verificar que tenga contenido
    if (!adjunto.contenido || adjunto.contenido.length < 100) {
        alert("El archivo no tiene contenido. Por favor seleccione el archivo nuevamente.");
        return;
    }

    // Guardar el archivo
    storage[codigo].adjuntos = [adjunto];

    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(storage));

    console.log("✅ Archivo guardado en sistema:", storage[codigo]);

    alert("Archivo guardado correctamente");

    // Limpiar temporal
    window.archivoAdjuntoTemporal = null;
    
    // Recargar la vista para mostrar el nuevo adjunto
    const contenido = document.getElementById('viewer-contenido');
    if (contenido) {
        const campos = Array.isArray(detalle.resumenCampos) ? detalle.resumenCampos : [];

        if (campos.length > 0) {
            const tipoDetalle = normalizar(detalle.tipo || detalle.asunto || '');
            const valor = (patterns, fallback = '-') => {
                const item = campos.find(c => patterns.some(p => p.test(normalizar(c.label))));
                return item?.value || fallback;
            };

            if (!/indicador/.test(tipoDetalle)) {
                const camposVisibles = campos.filter(campo => {
                    const label = normalizar(campo.label);
                    if (/archivo/.test(label) || /documento adjunto/.test(label)) return false;
                    const value = String(campo.value || '').trim();
                    return value !== '' && value !== '-';
                });

                const campoBaseSimple = (label, value) => `
                    <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1">
                        <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">${escapeHtml(label)}</p>
                        <p class="text-slate-900 dark:text-slate-100 text-sm font-semibold break-words">${escapeHtml(value)}</p>
                    </div>
                `;

                if (/inventario/.test(tipoDetalle) || /inventarios/.test(normalizar(detalle.asunto))) {
                    const versionInventario = detalle.version || valor([/version/], '-');
                    const fechaInventario = detalle.fechaElaboracion || valor([/fecha.*elaboraci[oó]n/, /fecha de elaboraci[oó]n/], '-');
                    const adjuntoInventario = (detalle.adjuntos || [])[0]?.nombre || valor([/documento adjunto/, /archivo adjunto/, /adjunto/], '-');

                    contenido.innerHTML = `
                        <div class="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
                            <h3 class="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4">Información técnica</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${campoBaseSimple('Versión', versionInventario || '-')}
                                ${campoBaseSimple('Fecha de elaboración', fechaInventario || '-')}
                                ${campoBaseSimple('Documento adjunto', adjuntoInventario || '-')}
                            </div>
                        </div>
                    `;
                } else {
                    const bloques = [
                        campoBaseSimple('VERSION', detalle.version || '-'),
                        ...camposVisibles.map(campo => campoBaseSimple(campo.label || '-', campo.value || '-'))
                    ];

                    contenido.innerHTML = bloques.join('');
                }
            } else {
                const nombreCampo = /indicador|documento|proceso/;
                const nombreLabel = /indicador/.test(normalizar(detalle.asunto)) ? 'NOMBRE DEL INDICADOR' : 'NOMBRE DEL DOCUMENTO';
                const metaValor = valor([/meta/], '-');
                const metaNumero = parseFloat(String(metaValor).replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                const metaEstado = metaNumero < 75
                    ? { texto: 'Riesgo', clase: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50' }
                    : metaNumero < 90
                        ? { texto: 'Aceptable', clase: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50' }
                        : { texto: 'Optimo', clase: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50' };
                const variablesValor = valor([/variables/], '-');
                const formulaValor = valor([/formula/, /f[óo]rmula/], '-');
                const frecuenciaValor = valor([/frecuencia/], '-');

                const campoBase = (label, value, extraClass = '') => `
                    <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1 ${extraClass}">
                        <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">${label}</p>
                        <p class="text-slate-900 dark:text-slate-100 text-sm font-semibold break-words whitespace-pre-line">${escapeHtml(value || '-')}</p>
                    </div>
                `;

                contenido.innerHTML = `
                    <div class="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span class="material-symbols-outlined text-blue-600">info</span>
                                    Información Técnica
                                </h3>
                                <p class="text-xs text-slate-500 mt-1">N° transacción: ${escapeHtml(String(detalle.transaccion || '--'))}</p>
                            </div>
                            <span class="px-4 py-1.5 rounded-full text-base font-black text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                                ${escapeHtml(String(detalle.codigo || detalle.version || '--'))}
                            </span>
                        </div>

                        <div class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                            ${campoBase('MACRO PROCESO', valor([/macro\s*proceso/], '-'))}
                            ${campoBase('PROCESO', valor([/^proceso$/], '-'))}
                            ${campoBase('VERSION', detalle.version || '-')}
                            ${campoBase('TIPO DE PROCESO', valor([/tipo\s*de\s*proceso/, /tipo\s*proceso/], '-'))}
                            ${campoBase('OFICINA O UNIDAD RESPONSABLE', valor([/unidad\s*responsable/, /oficina\s*o\s*unidad\s*responsable/, /responsable/], '-'))}
                            ${campoBase('OBJETIVO DEL PROCESO', valor([/objetivo/], '-'), 'lg:col-span-1')}
                            ${campoBase(nombreLabel, valor([nombreCampo], detalle.descripcion || '-'), 'lg:col-span-2')}
                            <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1">
                                <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">FRECUENCIA</p>
                                <span class="w-fit px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase">${escapeHtml(frecuenciaValor)}</span>
                            </div>
                            <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1">
                                <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">META</p>
                                <div class="flex flex-col gap-2">
                                    <span class="text-4xl font-black text-red-500 leading-none">${escapeHtml(metaValor || '-')}%</span>
                                    <span class="w-fit px-3 py-1 rounded-full text-xs font-bold border ${metaEstado.clase}">${metaEstado.texto}</span>
                                </div>
                            </div>
                            <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1 lg:col-span-2">
                                <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">VARIABLES</p>
                                <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm whitespace-pre-line">${escapeHtml(variablesValor)}</div>
                            </div>
                            <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1 lg:col-span-2">
                                <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">FORMULA DEL INDICADOR</p>
                                <div class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-mono">${escapeHtml(formulaValor)}</div>
                            </div>
                            ${campoBase('FUENTE', valor([/fuente/], '-'))}
                        </div>
                    </div>
                `;
            }
        }
        if (campos.length === 0) {
            contenido.innerHTML = `
                <div class="lg:col-span-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
                    No hay contenido detallado registrado para este documento.
                </div>
            `;
        }
    }
}

function applyQueryDocId() {
    const query = new URLSearchParams(window.location.search);
    const docId = query.get('docId');
    const docCode = query.get('docCode');
    if (!docId && !docCode) return;

    console.log(`🔎 Buscando documento con docId="${docId}" o docCode="${docCode}"`);

    // Función para buscar y abrir el documento
    const buscarYAbrir = () => {
        let existing = null;
        
        if (docId) {
            existing = allDocuments.find(d => d.id === docId || String(d.id) === String(docId));
        }
        if (!existing && docCode) {
            existing = allDocuments.find(d => d.codigo === docCode || d.code === docCode);
        }

        if (existing) {
            console.log(`📂 Abriendo documento: ${existing.codigo} (id=${existing.id})`);
            viewDocument(existing.id);
            return true;
        }
        return false;
    };

    // Si los datos ya están cargados, abrir inmediatamente
    if (allDocuments.length > 0) {
        if (!buscarYAbrir()) {
            showToast('No se encontró ese expediente en el listado', 'error');
        }
        return;
    }

    // Si los datos aún no cargan, esperar con polling inteligente
    let intentos = 0;
    const maxIntentos = 40; // 40 * 150ms = 6 segundos máximo
    const checkReady = setInterval(() => {
        intentos++;
        console.log(`⏳ Esperando datos... intento ${intentos}, allDocuments.length = ${allDocuments.length}`);
        
        if (allDocuments.length > 0) {
            clearInterval(checkReady);
            if (!buscarYAbrir()) {
                // Si no está en allDocuments, buscar en localStorage directamente
                buscarEnLocalStorageYAbrir(docCode, docId);
            }
        } else if (intentos >= maxIntentos) {
            clearInterval(checkReady);
            console.error('❌ Timeout: Los datos no se cargaron después de 6 segundos');
            // Intentar una última vez con localStorage
            buscarEnLocalStorageYAbrir(docCode, docId);
        }
    }, 150);
}

// ========== NUEVA FUNCIÓN: Buscar en localStorage y abrir ==========
function buscarEnLocalStorageYAbrir(docCode, docId) {
    console.log('🔍 Buscando en localStorage como último recurso...');
    
    try {
        // Buscar en sigpro_documentos_lista
        const docsRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA)
             || localStorage.getItem('sigpro_documentos_lista');
        const reportesRaw = localStorage.getItem('sigpro_reportes');
        
        let localDoc = null;
        
        if (docsRaw) {
            const docs = JSON.parse(docsRaw);
            if (Array.isArray(docs)) {
                localDoc = docs.find(d => 
                    (docCode && d.codigo === docCode) || 
                    (docId && (d.id === docId || String(d.id) === String(docId)))
                );
            }
        }
        
        if (!localDoc && reportesRaw) {
            const reportes = JSON.parse(reportesRaw);
            if (Array.isArray(reportes)) {
                localDoc = reportes.find(r => 
                    (docCode && r.codigo === docCode) || 
                    (docId && r.id === docId)
                );
            }
        }

        if (localDoc) {
            // Convertir al formato de allDocuments
            const docFormateado = {
                id: localDoc.id || `local-${localDoc.codigo || Date.now()}`,
                fecha: localDoc.fecha || new Date().toISOString().split('T')[0],
                hora: localDoc.hora || '00:00 H',
                codigo: localDoc.codigo || `DOC-${Date.now()}`,
                descripcion: localDoc.descripcion || localDoc.nombre || 'Documento local',
                generadoPor: localDoc.generadoPor || 'Facultad',
                estado: mapEstado(localDoc.estado || 'pendiente'),
                progreso: localDoc.progreso || 5,
                facultadId: localDoc.facultadId || 1,
                tipo: localDoc.tipo || 'documento',
                origen: 'local'
            };
            
            // Agregar a allDocuments para futuras referencias
            allDocuments.push(docFormateado);
            filteredDocuments = [...allDocuments];
            
            console.log(`📂 Abriendo documento local: ${docFormateado.codigo}`);
            viewDocument(docFormateado.id);
            return;
        }
        
        showToast('No se encontró ese expediente', 'error');
        
    } catch (e) {
        console.error('Error buscando en localStorage:', e);
        showToast('No se encontró ese expediente', 'error');
    }
}

// ==========================================
// Tema Oscuro/Claro
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
// Carga de Datos desde API
// ==========================================

// ==========================================
// Carga de Datos desde API + Fallback
// ==========================================

async function loadDashboardData() {
    try {
        showToast('Cargando documentos...', 'info');
        
        // 🔥 FIX: Buscar el token correcto que usa la API
        const token = localStorage.getItem('unmsm_token') || 
                      localStorage.getItem('token') || 
                      localStorage.getItem('auth_token') ||
                      localStorage.getItem('accessToken');
        
        if (!token) {
            console.error('❌ No se encontró token en localStorage');
            window.location.replace('portal-inicio-facultades.html');
            return;
        }

        // ========== PASO 1: Intentar cargar desde API ==========
        let apiDocs = [];
        const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
        
        for (const status of statuses) {
            try {
                const result = await API.portal.documents.getAll({ status, page: 1, limit: 100 });
                if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                    result.data.forEach(d => d._status = status);
                    apiDocs.push(...result.data);
                }
            } catch (e) {
                console.warn(`⚠️ Error cargando status ${status}:`, e.message);
            }
        }
        
        // Fallback: intentar sin filtro de status
        if (apiDocs.length === 0) {
            try {
                const result = await API.portal.documents.getAll({ page: 1, limit: 100 });
                if (result.success && Array.isArray(result.data)) {
                    apiDocs = result.data;
                }
            } catch (e) {
                console.warn('⚠️ Error cargando sin filtro:', e.message);
            }
        }

        // ========== PASO 2: Cargar documentos locales SIEMPRE ==========
        const localDocs = loadLocalDocuments();
        console.log(`📦 Documentos locales encontrados: ${localDocs.length}`);

        // ========== PASO 3: Normalizar documentos API ==========
        const apiDocsNormalizados = apiDocs.map((doc, idx) => {
            const status = doc._status || doc.status || doc.estado || 'PENDING';
            const createdAt = doc.createdAt || doc.fechaCreacion || doc.fecha;
            
            // ✅ PRESERVAR UUID del backend
            const backendId = doc.id || doc._id || doc.uuid || null;
            
            return {
                id: backendId || `api-${idx}`,  // ← UUID real del backend
                backendId: backendId,  // ← Guardar explícitamente
                fecha: createdAt ? createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                hora: createdAt 
                    ? new Date(createdAt).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'}) + ' H'
                    : '00:00 H',
                codigo: doc.code || doc.codigo || doc.numeroExpediente || `DOC-${idx}`,
                descripcion: doc.title || doc.nombre || doc.descripcion || doc.asunto || 'Documento',
                generadoPor: doc.createdBy?.fullName || doc.createdBy?.email || doc.generadoPor || 'Facultad',
                estado: mapEstado(status),
                progreso: doc.progreso || calculateProgress(status),
                facultadId: doc.faculty?.id || doc.facultyId || doc.facultadId || 1,
                tipo: (doc.type || doc.tipo || 'DOCUMENT').toLowerCase(),
                origen: backendId ? 'api' : 'local'  // ← 'api' si tiene ID del backend (UUID o CAR-...)
            };
        });

        // ========== PASO 4: Mergear API + locales (locales tienen prioridad si son más recientes) ==========
        const porCodigo = new Map();
        
        // Agregar API docs primero
        apiDocsNormalizados.forEach(doc => porCodigo.set(doc.codigo, doc));
        
        // Mergear locales (sobrescriben si existen, o se agregan si no)
        localDocs.forEach(local => {
            const existente = porCodigo.get(local.codigo);
            if (!existente) {
                porCodigo.set(local.codigo, local);
            } else {
                // Merge: priorizar datos locales pero preservar backendId del API
                const merged = { 
                    ...existente, 
                    ...local, 
                    // 🔥 FIX: Preservar backendId del API (UUID o código CAR/FLU/IND)
                    backendId: local.backendId || existente.backendId || null,
                    // Preservar id del API si es válido, sino usar el del local
                    id: (isBackendId(existente.id) ? existente.id : local.id) || local.id || existente.id,
                    origen: (local.backendId || existente.backendId) ? 'hibrido' : 'local'
                };
                porCodigo.set(local.codigo, merged);
            }
        });

        allDocuments = Array.from(porCodigo.values()).sort((a, b) => {
            return new Date(b.fecha + 'T' + b.hora.replace(' H', '')) - 
                   new Date(a.fecha + 'T' + a.hora.replace(' H', ''));
        });

        console.log(`✅ Total documentos cargados: ${allDocuments.length} (API: ${apiDocsNormalizados.length}, Locales: ${localDocs.length})`);

        // 🔥 FIX PRINCIPAL: Si después de mergear API + locales no hay nada, cargar ejemplos
        if (allDocuments.length === 0) {
            console.log('📭 Sin datos de API ni locales, cargando ejemplos de demostración...');
            loadMockData();
            showToast('Mostrando ejemplos de demostración', 'info', 3000);
            return; // loadMockData ya hace renderTable() y updateStats
        }

        filteredDocuments = [...allDocuments];
        updateStatsFromCurrentDocuments();
        renderTable();

        persistLocalDocuments();
        
        // Si la API falló pero hay locales, mostrar advertencia suave
        if (apiDocs.length === 0 && localDocs.length > 0) {
            showToast('Usando documentos locales (servidor no disponible)', 'warning', 4000);
        } else if (allDocuments.length > 0) {
            showToast(`${allDocuments.length} documentos cargados`, 'success', 2000);
        }
        
    } catch (error) {
        console.error('❌ Error crítico en loadDashboardData:', error);
        
        // ========== FALLBACK TOTAL: Solo localStorage ==========
        const localDocs = loadLocalDocuments();
        if (localDocs.length > 0) {
            allDocuments = localDocs;
            filteredDocuments = [...allDocuments];
            updateStatsFromCurrentDocuments();
            renderTable();
            showToast('Usando datos locales (sin conexión)', 'warning', 4000);
        } else {
            // Último recurso: mock data
            loadMockData();
            showToast('Usando datos de demostración', 'warning', 4000);
        }
    }
}

//function generateDocumentsFromReportes(reportes) {
    //return reportes.map((reporte, index) => ({
    //    id: reporte.id || `doc-${index}`,
    //    fecha: reporte.fecha,
    //    hora: reporte.hora || '10:30 H',
    //    codigo: reporte.codigo,
    //    descripcion: reporte.descripcion,
    //    generadoPor: reporte.generadoPor,
    //   estado: mapEstado(reporte.estado),
    //    progreso: calculateProgress(reporte.estado),
     //   facultadId: reporte.facultadId || 1
    //}));
//}

function normalizeEstadoKey(estado) {
    const value = String(estado || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');

    if (value === 'aprobado' || value === 'completado') return 'completado';
    if (value === 'en_proceso' || value === 'revision') return 'en_proceso';
    return 'pendiente';
}

function toEstadoTexto(estado) {
    const normalized = normalizeEstadoKey(estado);
    if (normalized === 'completado') return 'APROBADO';
    if (normalized === 'en_proceso') return 'EN PROCESO';
    return 'PENDIENTE';
}

function getSubestadoByEstado(estado) {
    const normalized = normalizeEstadoKey(estado);
    if (normalized === 'completado') return 'Documento aprobado';
    if (normalized === 'en_proceso') return 'En revisión por Racionalización';
    return 'Pendiente de revisión por Racionalización';
}

function getEtapaByEstado(estado) {
    const normalized = normalizeEstadoKey(estado);
    if (normalized === 'completado') return 'Proceso Finalizado';
    if (normalized === 'en_proceso') return 'Revisión en Curso';
    return 'Validación Documental';
}

function getDefaultProgressByEstado(estado) {
    const normalized = normalizeEstadoKey(estado);
    if (normalized === 'completado') return 100;
    if (normalized === 'en_proceso') return 50;
    return 5;
}

function getHistorialGeneradoPor(estado, generadoPor = 'FACULTAD') {
    const normalized = normalizeEstadoKey(estado);
    if (normalized === 'completado') return 'RACIONALIZACIÓN';
    if (normalized === 'en_proceso') return 'RACIONALIZACIÓN';
    return generadoPor;
}

function mapEstado(estadoAPI) {
    return normalizeEstadoKey(estadoAPI);
}

function calculateProgress(estado) {
    return getDefaultProgressByEstado(estado);
}

function loadMockData() {
    console.log('Cargando datos de ejemplo...');
    
    allDocuments = [
        {
            id: 'doc-1',
            fecha: '2026-02-02',
            hora: '10:30 H',
            codigo: 'PR-FM-26-01',
            descripcion: 'Proceso de matrícula 2026-I',
            generadoPor: 'Facultad',
            estado: 'pendiente',
            progreso: 5,
            facultadId: 1,
            origen: 'mock'
        },
        {
            id: 'doc-2',
            fecha: '2026-02-02',
            hora: '10:30 H',
            codigo: 'FL-FM-26-01',
            descripcion: 'Flujograma de admisión',
            generadoPor: 'Racionalización',
            estado: 'en_proceso',
            progreso: 50,
            facultadId: 1,
            origen: 'mock'
        },
        {
            id: 'doc-3',
            fecha: '2026-02-02',
            hora: '10:30 H',
            codigo: 'IN-FM-26-01',
            descripcion: 'Indicador de graduación',
            generadoPor: 'Racionalización',
            estado: 'completado',
            progreso: 100,
            facultadId: 1,
            origen: 'mock'
        }
    ];
    
    const localDocuments = loadLocalDocuments();
    allDocuments = mergeDocuments(allDocuments, localDocuments);
    filteredDocuments = [...allDocuments];
    updateStatsFromCurrentDocuments();
    
    // 🚨 ESTO FALTABA - Renderizar la tabla
    renderTable();
    
    console.log('Datos de ejemplo cargados:', allDocuments.length, 'documentos');
}

// ==========================================
// FUNCIÓN UNIVERSAL: Archivo → Adjunto con base64
// ==========================================

/**
 * Convierte un File del input[type=file] a objeto adjunto con contenido base64
 * @param {File} file - Archivo seleccionado
 * @returns {Promise<Object|null>} Adjunto listo para guardar o null si hay error
 */
async function archivoAAdjunto(file) {
    if (!file) return null;
    
    // Validar tamaño máximo (5 MB para localStorage)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        alert(`El archivo "${file.name}" (${(file.size/1024/1024).toFixed(1)} MB) excede el límite de 5 MB.\n\nPor favor comprima el PDF antes de subirlo.`);
        return null;
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve({
                nombre: file.name,
                tipo: file.name.split('.').pop().toUpperCase(),
                tamaño: file.size >= 1024 * 1024 
                    ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
                    : Math.round(file.size / 1024) + ' KB',
                fecha: new Date().toLocaleDateString('es-PE'),
                activo: true,
                icono: file.name.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 
                       file.name.toLowerCase().endsWith('.xlsx') ? 'table_chart' : 'description',
                contenido: e.target.result  // ← BASE64 COMPLETO
            });
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
    });
}

// ✅ FUNCIÓN FALTANTE - Agregar esto:

// ==========================================
// ENVIAR RESPUESTA A OBSERVACIONES (CORREGIDO)
// ==========================================

async function enviarRespuestaObservaciones() {
    const observaciones = document.getElementById('resp-observaciones')?.value.trim();
    const asunto = document.getElementById('resp-asunto')?.value.trim() || 'Respuesta a observaciones';
    const codigo = document.getElementById('detail-codigo')?.textContent;
    
    // Validaciones
    if (!observaciones) {
        showToast('Por favor ingrese sus observaciones', 'warning');
        return;
    }
    if (!codigo) {
        showToast('Error: no se encontró código del documento', 'error');
        return;
    }
    
    // 🔥 BUSCAR EL ID REAL DEL BACKEND (UUID)
    const doc = allDocuments.find(d => d.codigo === codigo);
    let documentId = doc?.backendId || doc?.id;
    
    // Validar que sea un UUID válido
    const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    
    if (!isUUID(documentId)) {
        console.error('❌ ID no es UUID válido:', documentId);
        showToast('Error: Documento no tiene ID válido del servidor', 'error');
        return;
    }
    
    // Preparar attachments (nombres de archivos como strings)
    let attachmentNames = [];
    if (window.archivoRespuestaActual) {
        attachmentNames = [window.archivoRespuestaActual.name];
    }
    
    console.log('📤 Enviando respuesta:', {
        documentId,
        asunto,
        observaciones: observaciones.substring(0, 50) + '...',
        attachments: attachmentNames
    });
    
    // Mostrar estado de carga
    const btnEnviar = document.querySelector('#formulario-respuesta button.bg-primary');
    const textoOriginal = btnEnviar?.textContent || 'Enviar';
    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';
    }
    
    try {
        // 🔥 LLAMADA A API.JS — Token se maneja automáticamente, NO se expone
        const result = await API.portal.responses.toObservations(
            documentId,
            asunto,
            observaciones,
            attachmentNames
        );
        
        if (!result.success) {
            throw new Error(result.error || `Error ${result.status}`);
        }
        
        // ✅ ÉXITO: Guardar en localStorage como backup/historial
        const correccion = {
            id: `resp_${Date.now()}`,
            codigoDocumento: codigo,
            documentId: documentId,
            fecha: new Date().toISOString(),
            asunto: asunto,
            observaciones: observaciones,
            estado: 'SUBSANADO',
            responsable: 'FACULTAD',
            adjunto: window.respuestaAdjuntoTemporal || null
        };
        
        let lista = JSON.parse(localStorage.getItem(STORAGE_KEYS.CORRECCIONES_LISTA)) || [];
        lista.push(correccion);
        localStorage.setItem(STORAGE_KEYS.CORRECCIONES_LISTA, JSON.stringify(lista));
        
        showToast(result.data?.message || 'Respuesta enviada correctamente', 'success');
        
        // Limpiar formulario
        document.getElementById('resp-observaciones').value = '';
        document.getElementById('resp-asunto').value = 'Respuesta a observaciones';
        window.respuestaAdjuntoTemporal = null;
        window.archivoRespuestaActual = null;
        const fileInput = document.getElementById('resp-file-input');
        if (fileInput) fileInput.value = '';
        
        // Cerrar formulario y recargar
        toggleFormularioRespuesta();
        cargarRectificaciones(codigo, document.getElementById('detail-estado')?.textContent);
        
    } catch (error) {
        console.error('❌ Error enviando respuesta:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.textContent = textoOriginal;
        }
    }
}

// Función para guardar respuesta y actualizar historial en la vista actual
function guardarRespuestaYActualizarHistorial() {
    guardarRespuestaConAdjuntos();
    // Si tienes una función para renderizar historial, llámala aquí
    if (typeof renderHistoryPanel === "function") {
        const codigo = document.getElementById('detail-codigo')?.textContent;
        renderHistoryPanel(codigo);
    }
}

// ==========================================
// Actualizar Tarjetas de Estadísticas
// ==========================================

function updateStatsCards(estadisticas) {
    // Animar contadores
    animateCounter('count-pendiente', estadisticas.pendientes || 0);
    animateCounter('count-en-proceso', estadisticas.enProceso || 0);
    animateCounter('count-completado', estadisticas.completados || 0);
    
    const total = (estadisticas.pendientes || 0) + 
                  (estadisticas.enProceso || 0) + 
                  (estadisticas.completados || 0);
    animateCounter('count-todos', total);
}

function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 1500;
    const step = target / (duration / 16);
    let current = 0;
    
    const update = () => {
        current += step;
        if (current < target) {
            element.textContent = Math.floor(current);
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    };
    
    update();
}

// ==========================================
// Renderizar Tabla
// ==========================================

function renderTable() {
    const tbody = document.getElementById('documents-tbody');
    const start = (currentPage - 1) * 10;
    const end = start + 10;
    const pageData = filteredDocuments.slice(start, end);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-slate-500">
                    No hay documentos para mostrar
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageData.map(doc => `
        <tr class="group" data-id="${doc.id}">
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-900 dark:text-slate-200">${formatDate(doc.fecha)}</span>
                    <span class="text-xs text-slate-500">${doc.hora}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="text-sm font-mono font-bold text-primary">${doc.codigo}</span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-3 min-w-[120px]">
                    <div class="progress-bar">
                        <div class="progress-bar-fill ${doc.estado}" style="width: ${doc.progreso}%"></div>
                    </div>
                    <span class="text-xs font-bold text-slate-500">${doc.progreso}%</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 ${getGeneradoPorClass(doc.generadoPor)} text-[10px] font-bold uppercase rounded-full">
                    ${doc.generadoPor}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="status-badge ${doc.estado}">
                    <div class="status-dot ${doc.estado} ${doc.estado !== 'completado' ? 'pulse' : ''}"></div>
                    ${formatEstado(doc.estado)}
                </div>
            </td>
            <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button class="action-btn" onclick="viewDocument('${doc.id}')" title="Revisar documento">
                        <span class="material-symbols-outlined text-sm">visibility</span>
                        REVISAR
                    </button>
                    ${doc.estado === 'pendiente' ? `
                        <button class="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold uppercase bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                                onclick="deleteDocument('${doc.id}')"
                                title="Eliminar documento">
                            <span class="material-symbols-outlined text-sm">delete</span>
                            Eliminar
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePagination();
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function formatEstado(estado) {
    const normalized = normalizeEstadoKey(estado);
    const map = {
        'pendiente': 'Pendiente',
        'en_proceso': 'En Proceso',
        'completado': 'Aprobado'
    };
    return map[normalized] || normalized;
}

function getGeneradoPorClass(generadoPor) {
    const classes = {
        'Facultad': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        'Racionalización': 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
    };
    return classes[generadoPor] || classes['Facultad'];
}

function updatePagination() {
    totalPages = Math.ceil(filteredDocuments.length / 10) || 1;
    
    document.getElementById('pagination-info').textContent = 
        `Página ${currentPage} de ${totalPages} (${filteredDocuments.length} documentos)`;
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

// ==========================================
// Event Listeners
// ==========================================

// ==========================================
// Event Listeners - Las tarjetas filtran la tabla
// ==========================================

function initEventListeners() {
    // Filtros de tarjetas
    document.querySelectorAll('.lava-card').forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.dataset.filter; // 'pendiente' | 'en_proceso' | 'completado' | 'todos'
            currentFilter = filter;
            currentPage = 1;
            
            // UI: resaltar tarjeta activa
            document.querySelectorAll('.lava-card').forEach(c => {
                c.classList.remove('ring-2', 'ring-offset-2', 'ring-primary', 'scale-105');
            });
            card.classList.add('ring-2', 'ring-offset-2', 'ring-primary', 'scale-105');
            
            // Aplicar filtro
            if (filter === 'todos') {
                filteredDocuments = [...allDocuments];
            } else {
                filteredDocuments = allDocuments.filter(d => d.estado === filter);
            }
            
            renderTable();
            
            const label = {
                'pendiente': 'Pendientes',
                'en_proceso': 'En Proceso', 
                'completado': 'Completados',
                'todos': 'Todos'
            }[filter];
            
            showToast(`Mostrando: ${label} (${filteredDocuments.length})`, 'info');
        });
    });
    
    // Búsqueda
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        filteredDocuments = allDocuments.filter(doc => 
            doc.codigo.toLowerCase().includes(term) ||
            doc.descripcion.toLowerCase().includes(term) ||
            doc.generadoPor.toLowerCase().includes(term)
        );
        
        currentPage = 1;
        renderTable();
    });
    
    // Ordenamiento
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortDocuments(e.target.value);
        });
    }
    
    // Paginación
    const prevPageBtn = document.getElementById('prev-page');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
    }
    
    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
    }
    
    // Refrescar
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadDashboardData();
        });
    }
    
    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.blur();
            filteredDocuments = [...allDocuments];
            renderTable();
        }
    });
}

// ==========================================
// Ordenamiento
// ==========================================

function initSorting() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            sortDocuments(sortKey);
        });
    });
}

function sortDocuments(criteria) {
    const sortFunctions = {
        'fecha': (a, b) => new Date(b.fecha) - new Date(a.fecha),
        'antiguos': (a, b) => new Date(a.fecha) - new Date(b.fecha),
        'recientes': (a, b) => new Date(b.fecha) - new Date(a.fecha),
        'codigo': (a, b) => a.codigo.localeCompare(b.codigo),
        'estado': (a, b) => a.estado.localeCompare(b.estado)
    };
    
    const sortFn = sortFunctions[criteria] || sortFunctions['recientes'];
    filteredDocuments.sort(sortFn);
    
    currentPage = 1;
    renderTable();
}

// ==========================================
// Acciones de Documentos
// ==========================================

async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;
    
    showToast(`Abriendo documento ${doc.codigo}...`, 'info');
    
    try {
        // Simular carga de detalle
        await simulateDelay(500);
        
        // Aquí puedes redirigir a una página de detalle o abrir modal
        console.log('Ver documento:', doc);
        
        // Ejemplo: Abrir modal o navegar
        // window.location.href = `documento.html?id=${docId}`;
        
    } catch (error) {
        showToast('Error al abrir documento', 'error');
    }
}

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// Toast Notifications
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
        <span class="material-symbols-outlined" style="font-size: 20px;">${icons[type] || icons.info}</span>
        <span style="flex: 1;">${message}</span>
        <span class="material-symbols-outlined close-icon">close</span>
    `;
    
    toast.addEventListener('click', () => closeToast(toast));
    
    container.appendChild(toast);
    
    const autoClose = setTimeout(() => closeToast(toast), duration);
    toast.addEventListener('remove', () => clearTimeout(autoClose));
}

function closeToast(toast) {
    if (toast.classList.contains('hiding')) return;
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
}

// ==========================================
// Exportar funciones globales
// ==========================================

window.viewDocument = viewDocument;

window.deleteDocument = async function(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        showToast('Documento no encontrado', 'error');
        return;
    }

    // Solo PENDING puede eliminarse
    const estadoNormalizado = normalizeEstadoKey(doc.estado);
    if (estadoNormalizado !== 'pendiente') {
        showToast(
            `No se puede eliminar: el documento está "${formatEstado(doc.estado)}". Solo PENDIENTES pueden eliminarse.`,
            'warning', 4000
        );
        return;
    }

    if (!confirm(`¿Desea eliminar el documento ${doc.codigo}?\n\nEsta acción no se puede deshacer.`)) return;

    try {
        // 🔥 FIX: Validar IDs del backend (UUID o códigos CAR/FLU/IND/etc.)
        const isBackendId = (str) => {
            if (!str || typeof str !== 'string') return false;
            // UUID estándar
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return true;
            // Código de caracterización: CAR-YYYY-XXXXXXXXXX
            if (/^CAR-\d{4}-\d+$/i.test(str)) return true;
            // Código de flujograma: FLU-XXXX-YYYY-NNN
            if (/^FLU-[A-Z]+-\d{4}-\d+$/i.test(str)) return true;
            // Otros códigos del backend
            if (/^(IND|REP|DOC|FLU|CAR)-[A-Z0-9-]+$/i.test(str)) return true;
            return false;
        };
        
        const tieneBackendIdReal = isBackendId(doc.backendId);
        const tieneIdReal = isBackendId(doc.id);
        
        // Solo llamar al backend si TENEMOS un UUID válido (backendId o id)
        let idParaApi = null;
        if (tieneBackendIdReal) {
            idParaApi = doc.backendId;
        } else if (tieneIdReal) {
            idParaApi = doc.id;
        }
        
        const debeLlamarApi = !!idParaApi;

        console.log(`🗑️ Eliminar: codigo=${doc.codigo}, backendId=${doc.backendId}, id=${doc.id}, idParaApi=${idParaApi}, llamarApi=${debeLlamarApi}`);

        if (debeLlamarApi) {
            showToast('Eliminando documento...', 'info');
            
            const deleteResult = await API.portal.documents.delete(idParaApi);
            console.log('📥 Respuesta delete:', deleteResult);
            
            // 204 = éxito, 404 = ya no existe, ambos OK
            if (!deleteResult.success && deleteResult.status !== 404) {
                throw new Error(deleteResult.error || `Error ${deleteResult.status}`);
            }
            
            if (deleteResult.status === 404) {
                console.warn(`⚠️ Backend 404, documento ya no existe: ${idParaApi}`);
            }
        } else {
            console.log(`📄 Documento sin UUID válido, eliminando solo local: ${doc.codigo}`);
        }

        // Limpiar del frontend
        eliminarDelFrontend(doc);
        showToast('Documento eliminado correctamente', 'success');

    } catch (error) {
        console.error('❌ Error:', error);
        showToast(`Error al eliminar: ${error.message}`, 'error');
    }
};

// Función auxiliar para limpiar del frontend
function eliminarDelFrontend(doc) {
    const docId = doc.id;
    const codigo = doc.codigo;
    // Remover de arrays en memoria
    allDocuments = allDocuments.filter(d => d.id !== docId);
    filteredDocuments = filteredDocuments.filter(d => d.id !== docId);
    // ─── Limpiar sigpro_reportes ───────────────────────────────────────────
    // Los items en sigpro_reportes usan el campo 'code' (no 'codigo') y 'id'
    try {
        const reportesRaw = localStorage.getItem('sigpro_reportes');
        if (reportesRaw) {
            const reportes = JSON.parse(reportesRaw);
            const filtrados = reportes.filter(r =>
                r.id !== docId &&
                r.code !== codigo &&
                r.codigo !== codigo   // por compatibilidad con entradas antiguas
            );
            localStorage.setItem('sigpro_reportes', JSON.stringify(filtrados));
        }
    } catch (e) { console.error('Error limpiando sigpro_reportes:', e); }
    // ─── Limpiar lista de documentos (clave CON prefijo — la que usa api.js) ─
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
        if (raw) {
            const lista = JSON.parse(raw);
            const filtrada = lista.filter(d => d.id !== docId && d.codigo !== codigo);
            localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(filtrada));
        }
    } catch (e) { console.error('Error limpiando DOCUMENTOS_LISTA:', e); }
    // ─── Limpiar lista SIN prefijo (compatibilidad con guardarDocumentoUsuario) ─
    try {
        const raw = localStorage.getItem('sigpro_documentos_lista');
        if (raw) {
            const lista = JSON.parse(raw);
            const filtrada = lista.filter(d => d.id !== docId && d.codigo !== codigo);
            localStorage.setItem('sigpro_documentos_lista', JSON.stringify(filtrada));
        }
    } catch (e) { console.error('Error limpiando sigpro_documentos_lista sin prefijo:', e); }
    // ─── Limpiar detalles (objeto clave→valor) ────────────────────────────
    [STORAGE_KEYS.DOCUMENTOS_DETALLE, STORAGE_KEYS.INDICADORES_DETALLE,
     'sigpro_documentos_detalle', 'sigpro_indicadores_detalle'].forEach(key => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const data = JSON.parse(raw);
            let changed = false;
            [docId, codigo].forEach(k => { if (data[k]) { delete data[k]; changed = true; } });
            if (changed) localStorage.setItem(key, JSON.stringify(data));
        } catch (e) { console.error(`Error limpiando ${key}:`, e); }
    });
    // ─── Limpiar historial si es indicador ───────────────────────────────
    if (doc.tipo === 'indicador') {
        localStorage.removeItem(`sigpro_historial_datos_${codigo}`);
    }
    persistLocalDocuments();
    updateStatsFromCurrentDocuments();
    const maxPages = Math.max(1, Math.ceil(filteredDocuments.length / 10));
    if (currentPage > maxPages) currentPage = maxPages;
    renderTable();
}

function loadLocalDocuments() {
    const clavesBuscar = [
        STORAGE_KEYS.DOCUMENTOS_LISTA,   // local_sigpro_documentos_lista
        'sigpro_documentos_lista',
        'remote_sigpro_documentos_lista',
        'sigpro_reportes',               // ← DONDE LAS FICHAS GUARDAN
        'sigpro_user_documents',
        'local_sigpro_user_documents'
    ];
    
    let todos = [];
    
    for (const clave of clavesBuscar) {
        const raw = localStorage.getItem(clave);
        if (!raw) continue;
        try {
            const list = JSON.parse(raw);
            if (!Array.isArray(list)) continue;
            
            const normalizados = list.map((doc, index) => {
                const estado = normalizeEstadoKey(doc.estado || doc.status || 'pendiente');
                const progreso = typeof doc.progreso === 'number' ? doc.progreso : getDefaultProgressByEstado(estado);
                const fechaBase = doc.createdAt || doc.fechaRegistro || doc.fecha || new Date().toISOString();
                
                return {
                    // 🔥 FIX: soportar múltiples campos de ID
                    id: doc.backendId || doc.apiId || doc.id || doc._id || `local-${doc.codigo || doc.code || index}`,
                    backendId: doc.backendId || doc.apiId || null,
                    // 🔥 FIX: soportar fecha en varios formatos
                    fecha: fechaBase,
                    hora: doc.hora || (fechaBase.includes('T') ? new Date(fechaBase).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H' : '00:00 H'),
                    createdAt: doc.createdAt || null,
                    fechaRegistro: doc.fechaRegistro || doc.createdAt || null,
                    // 🔥 FIX: soportar 'code' (usado por fichas) y 'codigo'
                    codigo: doc.codigo || doc.code || doc.numeroExpediente || `DOC-${index}`,
                    // 🔥 FIX: soportar 'nombre', 'title', 'asunto' (usado por fichas)
                    descripcion: doc.descripcion || doc.nombre || doc.title || doc.asunto || 'Documento sin descripción',
                    generadoPor: doc.generadoPor || doc.createdBy?.fullName || doc.createdBy?.email || 'Facultad',
                    estado,
                    progreso,
                    facultadId: doc.facultadId || doc.faculty?.id || doc.facultyId || 1,
                    tipo: doc.tipo || doc.type || 'documento',
                    origen: doc.origen || 'local'
                };
            });
            
            todos = todos.concat(normalizados);
        } catch (e) {
            console.warn(`Error leyendo ${clave}:`, e);
        }
    }
    
    // Eliminar duplicados por código, manteniendo el más reciente
    const porCodigo = new Map();
    todos.forEach(doc => {
        const existente = porCodigo.get(doc.codigo);
        const docTime = new Date(doc.fecha).getTime();
        const existenteTime = existente ? new Date(existente.fecha).getTime() : -Infinity;
        if (!existente || docTime > existenteTime || (doc.hora && !existente.hora)) {
            porCodigo.set(doc.codigo, doc);
        }
    });
    
    return Array.from(porCodigo.values());
}

function mergeDocuments(baseDocuments, additionalDocuments) {
    const byCode = new Map();

    baseDocuments.forEach(doc => {
        byCode.set(doc.codigo, doc);
    });

    additionalDocuments.forEach(doc => {
        const existente = byCode.get(doc.codigo);
        byCode.set(doc.codigo, existente ? { ...existente, ...doc } : doc);
    });

    return Array.from(byCode.values());
}

// ==========================================
// Actualizar contadores de las 4 tarjetas
// ==========================================

function updateStatsFromCurrentDocuments() {
    const stats = {
        pendientes: allDocuments.filter(d => d.estado === 'pendiente').length,
        enProceso: allDocuments.filter(d => d.estado === 'en_proceso').length,
        completados: allDocuments.filter(d => d.estado === 'completado').length
    };
    
    const total = stats.pendientes + stats.enProceso + stats.completados;
    
    // Actualizar DOM de las tarjetas
    updateCardCount('count-pendiente', stats.pendientes, 'PENDIENTE');
    updateCardCount('count-en-proceso', stats.enProceso, 'EN PROCESO');
    updateCardCount('count-completado', stats.completados, 'COMPLETADO');
    updateCardCount('count-todos', total, 'TODOS');
}

function updateCardCount(elementId, count, label) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Animar el cambio
    const current = parseInt(element.textContent || '0');
    const duration = 600;
    const start = performance.now();
    
    const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const value = Math.round(current + (count - current) * progress);
        element.textContent = value;
        if (progress < 1) requestAnimationFrame(step);
    };
    
    requestAnimationFrame(step);
}

function persistLocalDocuments() {
    const localDocs = allDocuments
        .filter(doc => doc.origen !== 'api')
        .map(doc => ({
            id: doc.id,
            backendId: doc.backendId || null,
            fecha: doc.fecha,
            hora: doc.hora,
            createdAt: doc.createdAt || null,
            fechaRegistro: doc.fechaRegistro || doc.createdAt || null,
            codigo: doc.codigo,
            descripcion: doc.descripcion,
            generadoPor: doc.generadoPor,
            estado: doc.estado,
            progreso: doc.progreso,
            facultadId: doc.facultadId,
            tipo: doc.tipo,
            origen: doc.origen || 'local'
        }));

    // Guardar en clave del modo actual (local_ o remote_)
    localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(localDocs));
    
    // 🔥 FIX: También guardar en clave neutra para cambio de modo
    localStorage.setItem('sigpro_documentos_lista', JSON.stringify(localDocs));
    
    // Sync con sigpro_reportes para dashboard
    try {
        const reportes = localDocs.map(d => ({
            id: d.id,
            codigo: d.codigo,
            nombre: d.descripcion,
            descripcion: d.descripcion,
            fecha: d.fecha,
            hora: d.hora,
            createdAt: d.createdAt,
            fechaRegistro: d.fechaRegistro,
            estado: d.estado,
            generadoPor: d.generadoPor,
            progreso: d.progreso,
            facultadId: d.facultadId,
            tipo: d.tipo,
            origen: d.origen
        }));
        localStorage.setItem('sigpro_reportes', JSON.stringify(reportes));
    } catch (e) {
        console.warn('Error sincronizando sigpro_reportes:', e);
    }
}

// ==========================================
// NAVEGACIÓN VISTA DETALLE (NUEVO)
// ==========================================

// Datos mock detallados para cada documento
const documentosDetalle = {
    'PR-FM-26-01': {
        codigo: 'PR-FM-26-01',
        asunto: 'PROCESOS',
        descripcion: 'Proceso de matrícula 2026-I',
        estado: 'pendiente',
        estadoTexto: 'PENDIENTE',
        subestado: 'Pendiente de Revisión Inicial',
        progreso: 5,
        fecha: '05/01/2024',
        fechaActualizacion: '05/01/2024 10:30 H',
        transaccion: '982231-A',
        etapa: 'Validación Documental',
        version: 'PR-FM-26-01-V1',
        historial: [
            { fecha: '05/01/2024 10:30 H', progreso: 5, estado: 'PENDIENTE', generadoPor: 'FACULTAD' }
        ],
        adjuntos: [
            { nombre: 'Solicitud de Matrícula', tipo: 'PDF', tamaño: '1.2 MB', fecha: '05/01/2024', activo: true, icono: 'description' },
            { nombre: 'Documentos de Identidad', tipo: 'PDF', tamaño: '2.4 MB', fecha: '05/01/2024', activo: true, icono: 'badge' },
            { nombre: 'Comprobante de Pago', tipo: 'PDF', tamaño: '850 KB', fecha: '05/01/2024', activo: false, icono: 'payments' }
        ]
    },
    'FL-FM-26-01': {
        codigo: 'FL-FM-26-01',
        asunto: 'FLUJOGRAMA',
        descripcion: 'Flujograma de admisión',
        estado: 'en_proceso',
        estadoTexto: 'EN PROCESO',
        subestado: 'En revisión técnica',
        progreso: 50,
        fecha: '15/01/2024',
        fechaActualizacion: '20/01/2024 14:15 H',
        transaccion: '982232-B',
        etapa: 'Revisión Técnica',
        version: 'FL-FM-26-01-V2',
        historial: [
            { fecha: '15/01/2024 09:00 H', progreso: 5, estado: 'PENDIENTE', generadoPor: 'FACULTAD' },
            { fecha: '20/01/2024 14:15 H', progreso: 50, estado: 'EN PROCESO', generadoPor: 'RACIONALIZACIÓN' }
        ],
        adjuntos: [
            { nombre: 'Flujograma Propuesto', tipo: 'PDF', tamaño: '2.5 MB', fecha: '15/01/2024', activo: true, icono: 'account_tree' },
            { nombre: 'Documentación Técnica', tipo: 'PDF', tamaño: '1.8 MB', fecha: '15/01/2024', activo: true, icono: 'folder' },
            { nombre: 'Anexos y Diagramas', tipo: 'PDF', tamaño: '3.2 MB', fecha: '20/01/2024', activo: false, icono: 'schema' }
        ]
    },
    'IN-FM-26-01': {
        codigo: 'IN-FM-26-01',
        asunto: 'INDICADORES',
        descripcion: 'Indicador de graduación',
        estado: 'completado',
        estadoTexto: 'COMPLETADO',
        subestado: 'Documento aprobado',
        progreso: 100,
        fecha: '20/12/2023',
        fechaActualizacion: '02/02/2024 16:45 H',
        transaccion: '982230-C',
        etapa: 'Proceso Finalizado',
        version: 'IN-FM-26-01-V1',
        historial: [
            { fecha: '20/12/2023 11:20 H', progreso: 5, estado: 'PENDIENTE', generadoPor: 'FACULTAD' },
            { fecha: '25/01/2024 13:30 H', progreso: 50, estado: 'EN PROCESO', generadoPor: 'RACIONALIZACIÓN' },
            { fecha: '02/02/2024 16:45 H', progreso: 100, estado: 'COMPLETADO', generadoPor: 'APROBADO' }
        ],
        adjuntos: [
            { nombre: 'Reporte Final de Indicadores', tipo: 'PDF', tamaño: '3.1 MB', fecha: '02/02/2024', activo: true, icono: 'description' },
            { nombre: 'Análisis Estadístico Completo', tipo: 'XLSX', tamaño: '1.2 MB', fecha: '02/02/2024', activo: true, icono: 'table_chart' },
            { nombre: 'Gráficos y Visualización', tipo: 'PDF', tamaño: '2.8 MB', fecha: '02/02/2024', activo: false, icono: 'bar_chart' }
        ]
    }
};

window.viewDocument = async function(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        showToast('Documento no encontrado', 'error');
        return;
    }

    let detalleBackend = null;

    try {
        // ✅ NUEVO: Lógica mejorada para seleccionar el ID correcto
        // Prioridad: 1) backendId (UUID real), 2) id si es UUID, 3) código
        
        const isBackendId = (str) => {
            if (!str || typeof str !== 'string') return false;
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return true;
            if (/^CAR-\d{4}-\d+$/i.test(str)) return true;
            if (/^FLU-[A-Z]+-\d{4}-\d+$/i.test(str)) return true;
            if (/^(IND|REP|DOC|FLU|CAR)-[A-Z0-9-]+$/i.test(str)) return true;
            return false;
        };
        
        let searchId = doc.backendId; // ← NUEVO: Intentar primero con backendId
        let idType = 'backendId';
        
        if (!searchId) {
            searchId = doc.id;
            idType = 'id';
        }
        
        // Si el ID no parece UUID, usar código como fallback
        if (!isBackendId(searchId)) {
            console.log(`⚠️ ${idType} ${searchId} no es UUID, probando alternativas...`);
            // Intentar con código si existe
            if (doc.codigo) {
                searchId = doc.codigo;
                idType = 'codigo';
            }
        }

        console.log(`🔍 getById: usando ${idType}=${searchId} (backendId=${doc.backendId}, id=${doc.id}, codigo=${doc.codigo})`);

        let result = await API.portal.documents.getById(searchId);

        // Si falla y tenemos backendId diferente, intentar
        if (!result.success && doc.backendId && doc.backendId !== searchId) {
            console.log(`⚠️ Falló con ${searchId}, probando backendId: ${doc.backendId}`);
            result = await API.portal.documents.getById(doc.backendId);
        }
        
        // Si aún falla y tenemos código diferente, intentar
        if (!result.success && doc.codigo && doc.codigo !== searchId) {
            console.log(`⚠️ Falló, probando código: ${doc.codigo}`);
            result = await API.portal.documents.getById(doc.codigo);
        }

        if (!result.success || !result.data) {
            console.warn('Backend no disponible, usando localStorage');
            throw new Error('Backend no devolvió datos');
        }

        // 🔥 EL BACKEND SOLO DEVUELVE id, code, status — NO los campos de la ficha
        // Por eso, SIEMPRE mezclamos con datos de localStorage si existen
        const localDetail = getLocalDocumentDetail(doc.codigo, doc);
        if (localDetail && localDetail.resumenCampos && localDetail.resumenCampos.length > 0) {
            console.log('✅ Mezclando con datos locales de la ficha');
            // El backend dio metadata básica, pero los campos vienen de localStorage
        }
        
        detalleBackend = result.data;
        console.log('✅ Datos del backend recibidos');

        // Transformar respuesta del backend al formato interno

        const tipoDetectado = detalleBackend.type || detalleBackend.tipo ||
            (/^IND-/i.test(doc.codigo) ? 'indicador' :
            /^FLU-/i.test(doc.codigo) ? 'flujograma' :
            /^CAR-/i.test(doc.codigo) ? 'caracterizacion' :
            /^REP-/i.test(doc.codigo) ? 'reporte' : 'documento');

        const detalle = {
            tipo: tipoDetectado,
            codigo: detalleBackend.code || detalleBackend.codigo || doc.codigo,
            asunto: detalleBackend.asunto || detalleBackend.title || detalleBackend.nombre || 'DOCUMENTOS',
            descripcion: detalleBackend.description || detalleBackend.descripcion || doc.descripcion,
            estado: mapEstado(detalleBackend.status || detalleBackend.estado || doc.estado),
            estadoTexto: toEstadoTexto(detalleBackend.status || detalleBackend.estado || doc.estado),
            subestado: detalleBackend.subestado || getSubestadoByEstado(detalleBackend.status || doc.estado),
            progreso: detalleBackend.progreso || doc.progreso || calculateProgress(detalleBackend.status || doc.estado),
            fecha: formatDate(detalleBackend.createdAt || detalleBackend.fecha || doc.fecha),
            fechaActualizacion: detalleBackend.updatedAt 
                ? `${formatDate(detalleBackend.updatedAt.split('T')[0])} ${new Date(detalleBackend.updatedAt).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'})} H`
                : `${formatDate(doc.fecha)} ${doc.hora}`,
            transaccion: detalleBackend.transaccion || detalleBackend.numeroTransaccion || doc.codigo,
            etapa: detalleBackend.etapa || getEtapaByEstado(detalleBackend.status || doc.estado),
            version: detalleBackend.version || `${doc.codigo}-V1`,
            // ✅ FIX 1: usar datos locales como fallback cuando el backend no manda campos
            resumenCampos: detalleBackend.campos || detalleBackend.resumenCampos || detalleBackend.fields || detalleBackend.data || localResumen,
            // ✅ FIX 2: incluir fichaData local para que showDetailView pueda construir el resumen por tipo
            fichaData: localFallback.fichaData || null,
            historial: detalleBackend.historial || detalleBackend.seguimiento || [{
                fecha: `${formatDate(doc.fecha)} ${doc.hora}`,
                progreso: doc.progreso,
                estado: toEstadoTexto(doc.estado),
                generadoPor: getHistorialGeneradoPor(doc.estado, doc.generadoPor)
            }],
            // ✅ FIX 3: usar adjuntos locales cuando el backend devuelve vacío
            adjuntos: ((detalleBackend.adjuntos || detalleBackend.attachments || []).length > 0
                ? (detalleBackend.adjuntos || detalleBackend.attachments || []).map(adj => ({
                    nombre: adj.nombre || adj.name || adj.filename || 'Documento',
                    tipo: adj.tipo || adj.type || adj.extension?.toUpperCase() || 'PDF',
                    tamaño: adj.tamaño || adj.size || adj.tamano || '-',
                    fecha: adj.fecha || formatDate(doc.fecha),
                    activo: adj.activo !== false,
                    icono: adj.icono || (adj.tipo === 'PDF' ? 'picture_as_pdf' : 'description'),
                    contenido: adj.url || adj.contenido || adj.path || ''
                }))
                : (localFallback.adjuntos || []))
        };

        showDetailView(detalle);
        
    } catch (error) {
        console.error('Error:', error);
        // Fallback a localStorage solo si el backend falla
        const detalleLocal = getLocalDocumentDetail(doc.codigo, doc) 
                          || getLocalIndicatorDetail(doc.codigo, doc);
        const detalle = detalleLocal || documentosDetalle[doc.codigo] || generateDefaultDetail(doc);
        showDetailView(detalle);
        showToast('Usando datos locales (sin conexión)', 'warning');
    }
};

// ==========================================
// FUNCIONES UTILITARIAS GLOBALES
// ==========================================

function normalizar(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function getLocalDocumentDetail(codigo, doc) {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    if (!raw) return null;

    try {
        const map = JSON.parse(raw);
        const item = map?.[codigo];
        if (!item) {
            console.warn(`No se encontró detalle para código: ${codigo}`);
            return null;
        }

        console.log(`✓ Cargando detalle para ${codigo}:`, item);

        const fechaBase = doc?.fecha || new Date().toISOString().split('T')[0];
        const horaBase = doc?.hora || '00:00 H';
        const tipo = item.tipo || 'documento';

        const asuntoMap = {
            indicador: 'INDICADORES',
            flujograma: 'FLUJOGRAMAS',
            caracterizacion: 'CARACTERIZACION',
            reporte: 'REPORTES',
            inventario: 'INVENTARIOS'
        };

        const estadoBase = normalizeEstadoKey(doc?.estado || 'pendiente');
        let resumen = Array.isArray(item.resumenCampos) ? item.resumenCampos : [];

        if ((!resumen || resumen.length === 0) && normalizar(tipo) === 'indicador' && item?.fichaData) {
            const ficha = item.fichaData;
            resumen = [
                { label: 'Tipo de Proceso', value: ficha.tipoProcesoLabel || ficha.tipoProceso || ficha.processType || '-' },
                { label: 'Macro Proceso', value: ficha.macroProcesoNombre || ficha.macroProceso || ficha.macroProcess || '-' },
                { label: 'Proceso', value: ficha.macroProcesoNombre || ficha.proceso || ficha.process || '-' },
                { label: 'Oficina o Unidad Responsable', value: ficha.unidadResponsable || ficha.responsibleUnit || '-' },
                { label: 'Objetivo del Proceso', value: ficha.objetivoProceso || ficha.processObjective || '-' },
                { label: 'Nombre del Indicador', value: ficha.nombreIndicador || ficha.indicatorName || '-' },
                { label: 'Frecuencia', value: ficha.frecuencia || ficha.frequency || '-' },
                { label: 'Variables', value: ficha.variables || '-' },
                { label: 'Formula del Indicador', value: ficha.formulaDefinicion || ficha.formula || '-' },
                { label: 'Fuente', value: ficha.fuente || ficha.dataSource || '-' },
                { label: 'Meta', value: ficha.meta || ficha.target || '-' }
            ];
        }

        if ((!resumen || resumen.length === 0) && normalizar(tipo) === 'flujograma' && item?.fichaData) {
            const ficha = item.fichaData;
            resumen = [
                { label: 'Tipo de Proceso', value: ficha.tipoProcesoLabel || ficha.tipoProceso || '-' },
                { label: 'Proceso', value: ficha.macroProcesoNombre || ficha.macroProceso || '-' },
                { label: 'Nombre de la actividad', value: ficha.proceso || '-' },
                { label: 'Archivo adjunto', value: (ficha.adjuntos || []).map((adj) => adj.nombre).join(', ') || '-' }
            ];
        }

        if ((!resumen || resumen.length === 0) && normalizar(tipo) === 'caracterizacion' && item?.fichaData) {
            const ficha = item.fichaData;
            resumen = [
                { label: 'Tipo de Proceso', value: ficha.tipoProcesoLabel || ficha.tipoProceso || '-' },
                { label: 'Proceso', value: ficha.macroProcesoNombre || ficha.macroProceso || '-' },
                { label: 'Archivo adjunto', value: (ficha.adjuntos || []).map((adj) => adj.nombre).join(', ') || '-' }
            ];
        }
        
        // PRIORITARIO: Usar adjuntos persistidos del formulario
        let adjuntosFinales = [];
        // 1) PRIORITARIO: item.adjuntos (ubicación directa)
        if (Array.isArray(item.adjuntos) && item.adjuntos.length > 0) {
            console.log(`📎 Usando item.adjuntos (${item.adjuntos.length})`);
            adjuntosFinales = item.adjuntos;
        }

        // 2) Buscar en fichaData.adjuntos (donde guarda el formulario de indicadores)
        else if (item.fichaData && Array.isArray(item.fichaData.adjuntos) && item.fichaData.adjuntos.length > 0) {
            console.log(`📎 Usando fichaData.adjuntos (${item.fichaData.adjuntos.length})`);
            adjuntosFinales = item.fichaData.adjuntos;
        }

        // 3) Buscar campo "archivo" suelto en fichaData
        else if (item.fichaData?.archivo) {
            console.log(`📎 Usando fichaData.archivo`);
            adjuntosFinales = [{
                nombre: item.fichaData.archivo.name || item.fichaData.archivo.nombre || 'Archivo adjunto',
                tipo: item.fichaData.archivo.type || item.fichaData.archivo.tipo || 'PDF',
                tamaño: item.fichaData.archivo.size || item.fichaData.archivo.tamaño || '-',
                fecha: formatDate(fechaBase),
                activo: true,
                icono: 'picture_as_pdf',
                contenido: item.fichaData.archivo.contenido || item.fichaData.archivo.url || item.fichaData.archivo.dataUrl || ''
            }];
        }

        // 4) Buscar en item.archivo (otra ubicación posible)
        else if (item.archivo) {
            console.log(`📎 Usando item.archivo`);
            const arch = typeof item.archivo === 'string' ? { nombre: item.archivo } : item.archivo;
            adjuntosFinales = [{
                nombre: arch.nombre || arch.name || 'Archivo adjunto',
                tipo: arch.tipo || arch.type || 'PDF',
                tamaño: arch.tamaño || arch.size || '-',
                fecha: formatDate(fechaBase),
                activo: true,
                icono: 'picture_as_pdf',
                contenido: arch.contenido || arch.url || arch.dataUrl || arch.base64 || ''
            }];
        }

        // 5) FALLBACK: Reconstruir desde campo "archivo" en resumen
        if (adjuntosFinales.length === 0) {
            const archivoCampo = resumen.find(c => /archivo|adjunto|documento/i.test(normalizar(c.label)));
            const archivoNombre = (archivoCampo?.value || '').trim();
            if (archivoNombre && archivoNombre !== '-') {
                console.log(`📋 Reconstruyendo desde resumen: ${archivoNombre}`);
                adjuntosFinales = [{
                    nombre: archivoNombre,
                    tipo: 'PDF',
                    tamaño: '-',
                    fecha: formatDate(fechaBase),
                    activo: true,
                    icono: 'picture_as_pdf'
                }];
            }
        }


        try {
            const rawCache = sessionStorage.getItem('sigpro_adjuntos_cache');
            const adjuntosCache = rawCache ? JSON.parse(rawCache) : {};
            const cachePorCodigo = Array.isArray(adjuntosCache?.[codigo]) ? adjuntosCache[codigo] : [];

            if (cachePorCodigo.length > 0) {
                if (adjuntosFinales.length === 0) {
                    adjuntosFinales = cachePorCodigo;
                } else {
                    const cacheByName = new Map(
                        cachePorCodigo
                            .filter((adj) => adj && typeof adj === 'object')
                            .map((adj) => [adj.nombre || adj.name || '', adj])
                    );

                    adjuntosFinales = adjuntosFinales.map((adj) => {
                        if (adj?.contenido || adj?.url || adj?.path) {
                            return adj;
                        }

                        const key = adj?.nombre || adj?.name || '';
                        const cached = cacheByName.get(key);
                        return cached ? { ...adj, ...cached } : adj;
                    });
                }
            }
        } catch (error) {
            console.warn('No se pudo leer cache temporal de adjuntos:', error);
        }

        return {
            tipo,
            codigo: item.codigo || codigo,
            asunto: asuntoMap[tipo] || 'DOCUMENTOS',
            descripcion: item.titulo || doc?.descripcion || `Documento ${codigo}`,
            estado: estadoBase,
            estadoTexto: toEstadoTexto(estadoBase),
            subestado: getSubestadoByEstado(estadoBase),
            progreso: doc?.progreso || getDefaultProgressByEstado(estadoBase),
            fecha: formatDate(fechaBase),
            fechaActualizacion: `${formatDate(fechaBase)} ${horaBase}`,
            transaccion: item.codigo || codigo,
            etapa: getEtapaByEstado(estadoBase),
            version: item.version || item.fichaData?.version || `${item.codigo || codigo}-V1`,
            fechaElaboracion: item.fechaElaboracion || item.fichaData?.fechaElaboracion || '',
            operacion: item.operacion || 'PROCESO DE RACIONALIZACION',
            resumenCampos: resumen,
            historial: [
                {
                    fecha: `${formatDate(fechaBase)} ${horaBase}`,
                    progreso: doc?.progreso || getDefaultProgressByEstado(estadoBase),
                    estado: toEstadoTexto(estadoBase),
                    generadoPor: getHistorialGeneradoPor(estadoBase)
                }
            ],
            adjuntos: adjuntosFinales
        };
    } catch (error) {
        console.error('Error leyendo detalle local de documento:', error);
        return null;
    }
}

function getLocalIndicatorDetail(codigo, doc) {
    const raw = localStorage.getItem(STORAGE_KEYS.INDICADORES_DETALLE);
    if (!raw) return null;

    try {
        const map = JSON.parse(raw);
        const ficha = map?.[codigo];
        if (!ficha) return null;

        const fechaBase = doc?.fecha || new Date().toISOString().split('T')[0];
        const horaBase = doc?.hora || '00:00 H';

        const estadoBase = normalizeEstadoKey(doc?.estado || 'pendiente');
        return {
            codigo: ficha.codigo || codigo,
            asunto: 'INDICADORES',
            descripcion: ficha.nombreIndicador || doc?.descripcion || 'Ficha de indicador',
            estado: estadoBase,
            estadoTexto: toEstadoTexto(estadoBase),
            subestado: getSubestadoByEstado(estadoBase),
            progreso: doc?.progreso || getDefaultProgressByEstado(estadoBase),
            fecha: formatDate(fechaBase),
            fechaActualizacion: `${formatDate(fechaBase)} ${horaBase}`,
            transaccion: ficha.codigo || codigo,
            etapa: getEtapaByEstado(estadoBase),
            version: `${ficha.codigo || codigo}-${ficha.version || 'V1'}`,
            historial: [
                {
                    fecha: `${formatDate(fechaBase)} ${horaBase}`,
                    progreso: doc?.progreso || getDefaultProgressByEstado(estadoBase),
                    estado: toEstadoTexto(estadoBase),
                    generadoPor: getHistorialGeneradoPor(estadoBase)
                }
            ],
            adjuntos: [
                { nombre: `Nombre: ${ficha.nombreIndicador || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'add_chart' },
                { nombre: `Macro Proceso: ${ficha.macroProcesoTexto || ficha.macroProceso || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'account_tree' },
                { nombre: `Unidad Responsable: ${ficha.unidadResponsable || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'business' },
                { nombre: `Frecuencia: ${ficha.frecuencia || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'schedule' },
                { nombre: `Meta: ${ficha.meta || '-'}%`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'flag' },
                { nombre: `Fuente: ${ficha.fuente || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'database' },
                { nombre: `Objetivo: ${ficha.objetivoProceso || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'target' },
                { nombre: `Variables: ${ficha.variables || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'functions' },
                { nombre: `Fórmula: ${ficha.formulaDefinicion || '-'}`, tipo: 'TXT', tamaño: '-', fecha: formatDate(fechaBase), activo: true, icono: 'calculate' }
            ]
        };
    } catch (error) {
        console.error('Error leyendo detalle local del indicador:', error);
        return null;
    }
}

function generateDefaultDetail(doc) {
    const estado = normalizeEstadoKey(doc.estado);
    return {
        codigo: doc.codigo,
        asunto: 'PROCESO',
        descripcion: doc.descripcion,
        estado,
        estadoTexto: toEstadoTexto(estado),
        subestado: getSubestadoByEstado(estado),
        progreso: doc.progreso,
        fecha: formatDate(doc.fecha),
        fechaActualizacion: `${formatDate(doc.fecha)} ${doc.hora}`,
        transaccion: Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
        etapa: getEtapaByEstado(estado),
        version: `${doc.codigo}-V1`,
        historial: [
            { fecha: `${formatDate(doc.fecha)} ${doc.hora}`, progreso: doc.progreso, estado: toEstadoTexto(estado), generadoPor: getHistorialGeneradoPor(estado, String(doc.generadoPor || 'FACULTAD').toUpperCase()) }
        ],
        adjuntos: [
            { nombre: 'Documento Principal', tipo: 'PDF', tamaño: '1.0 MB', fecha: formatDate(doc.fecha), activo: true, icono: 'description' },
            { nombre: 'Documentación Complementaria', tipo: 'PDF', tamaño: '0.8 MB', fecha: formatDate(doc.fecha), activo: true, icono: 'folder' }
        ]
    };
}

function showDetailView(detalle) {
    // DEBUG: Ver qué campos llegan del backend/localStorage
    console.log('🔍 DEBUG showDetailView:', {
        codigo: detalle.codigo,
        resumenCamposCount: detalle.resumenCampos?.length || 0,
        campos: detalle.resumenCampos?.map(c => ({ 
            labelOriginal: c.label, 
            labelNormalizado: normalizar(c.label),
            value: c.value?.substring?.(0, 30) || c.value 
        }))
    });
    console.log('🔍 showDetailView() llamada con detalle:', detalle);
    console.log('   • Código:', detalle.codigo);
    console.log('   • Tipo:', detalle.tipo);
    console.log('   • Adjuntos:', detalle.adjuntos?.length || 0);
    
    // Ocultar dashboard, mostrar detalle
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
    
    // IMPORTANTE: Mostrar la sección de documentos adjuntos
    const seccionDocumentos = document.getElementById('seccion-documentos');
    if (seccionDocumentos) {
        seccionDocumentos.classList.remove('hidden');
        console.log('✅ Sección de documentos hecha visible');
    }
    
    // Actualizar KPI cards
    document.getElementById('detail-codigo').textContent = detalle.codigo;
    document.getElementById('detail-asunto').textContent = detalle.asunto;
    document.getElementById('detail-estado').textContent = detalle.estadoTexto;
    document.getElementById('detail-subestado').textContent = detalle.subestado;
    document.getElementById('detail-fecha').textContent = detalle.fechaActualizacion || detalle.fecha;
    document.getElementById('detail-progreso-text').textContent = detalle.progreso + '%';
    document.getElementById('detail-progreso-bar').style.width = detalle.progreso + '%';
    document.getElementById('detail-etapa').textContent = 'Etapa: ' + detalle.etapa;
    
    // Actualizar document viewer
    document.getElementById('viewer-transaccion').textContent = detalle.transaccion;
    document.getElementById('viewer-descripcion').textContent = detalle.descripcion;
    document.getElementById('viewer-codigo').textContent = detalle.codigo;
    document.getElementById('viewer-operacion').textContent = detalle.operacion || 'PROCESO DE RACIONALIZACION';
    document.getElementById('viewer-fecha').textContent = 'Fecha: ' + detalle.fecha;
    document.getElementById('viewer-version').textContent = detalle.codigo || detalle.version;

    const contenido = document.getElementById('viewer-contenido');
    if (contenido) {
        const campos = Array.isArray(detalle.resumenCampos) ? detalle.resumenCampos : [];
        if (campos.length > 0) {
            const tipoDetalle = normalizar(detalle.tipo || detalle.asunto || '');
            const valor = (patterns, fallback = '-') => {
                if (!Array.isArray(campos) || campos.length === 0) return fallback;
                
                const item = campos.find(c => {
                    const label = normalizar(c.label || '');
                    return patterns.some(p => {
                        if (p instanceof RegExp) return p.test(label);
                        // 🔥 FIX: Normalizar también el pattern string para que coincida
                        return label.includes(normalizar(p));
                    });
                });
                
                // 🔥 FIX: Verificar que el valor no sea vacío, null o undefined
                const val = item?.value;
                return (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '-') 
                    ? String(val).trim() 
                    : fallback;
            };

            // Para documentos distintos de indicador, mostrar solo los campos realmente llenados.
            if (!/indicador/.test(tipoDetalle)) {
                const camposVisibles = campos.filter(campo => {
                    const label = normalizar(campo.label);
                    if (/archivo/.test(label) || /documento adjunto/.test(label)) return false; // El archivo se muestra en adjuntos
                    const value = String(campo.value || '').trim();
                    return value !== '' && value !== '-';
                });

                const campoBaseSimple = (label, value) => `
                    <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1">
                        <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">${escapeHtml(label)}</p>
                        <p class="text-slate-900 dark:text-slate-100 text-sm font-semibold break-words">${escapeHtml(value)}</p>
                    </div>
                `;

                if (/inventario/.test(tipoDetalle) || /inventarios/.test(normalizar(detalle.asunto))) {
                    const versionInventario = detalle.version || valor([/version/], '-');
                    const fechaInventario = detalle.fechaElaboracion || valor([/fecha.*elaboraci[oó]n/, /fecha de elaboraci[oó]n/], '-');
                    const adjuntoInventario = (detalle.adjuntos || [])[0]?.nombre || valor([/documento adjunto/, /archivo adjunto/, /adjunto/], '-');

                    contenido.innerHTML = `
                        <div class="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
                            <h3 class="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4">Información técnica</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${campoBaseSimple('Versión', versionInventario || '-')}
                                ${campoBaseSimple('Fecha de elaboración', fechaInventario || '-')}
                                ${campoBaseSimple('Documento adjunto', adjuntoInventario || '-')}
                            </div>
                        </div>
                    `;
                } else {
                    const bloques = [
                        campoBaseSimple('VERSION', detalle.version || '-'),
                        ...camposVisibles.map(campo => campoBaseSimple(campo.label || '-', campo.value || '-'))
                    ];

                    contenido.innerHTML = bloques.join('');
                }
            } else {
            const nombreCampo = [/nombre\s*del\s*indicador/i, /nombre\s+indicador/i];
            const nombreLabel = /indicador/.test(normalizar(detalle.asunto)) ? 'NOMBRE DEL INDICADOR' : 'NOMBRE DEL DOCUMENTO';
            const metaValor = valor([/meta/i, 'meta'], '-');
        const metaNumero = parseFloat(String(metaValor).replace(',', '.').replace(/[^\d.-]/g, '')) || 0;

        const metaEstado = metaNumero < 75
            ? { texto: 'Riesgo', clase: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50' }
            : metaNumero < 90
                ? { texto: 'Aceptable', clase: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50' }
                : { texto: 'Óptimo', clase: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50' };

        const variablesValor = valor([/variable/i, 'variables'], '-');
        const formulaValor = valor([/formula/i, /f[óo]rmula/i, 'formula'], '-');
        const frecuenciaValor = valor([/frecuencia/i, 'frecuencia'], '-');

            const campoBase = (label, value, extraClass = '') => `
                <div class="flex flex-col gap-1 border-l-4 border-primary/20 pl-4 py-1 ${extraClass}">
                    <p class="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">${label}</p>
                    <p class="text-slate-900 dark:text-slate-100 text-sm font-semibold break-words whitespace-pre-line">${escapeHtml(value || '-')}</p>
                </div>
            `;

            const metaTexto = (() => {
                const text = String(metaValor || '-').trim();
                if (text === '-' || text === '') return '-';
                return /%$/.test(text) ? text : `${text}%`;
            })();

            const nombreIndicadorValor = detalle.nombreIndicador
            || detalle.indicatorName
            || valor([/nombre.*indicador/i, 'nombre indicador', 'indicador'], null)
            || detalle.descripcion
            || (detalle.resumenCampos?.find(c => /nombre.*indicador/i.test(normalizar(c.label)))?.value)
            || '-';

            const infoBox = (label, value, extraClass = '') => `
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${extraClass}">
                    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">${label}</p>
                    <p class="text-sm font-semibold leading-6 text-slate-800 break-words">${escapeHtml(value || '-')}</p>
                </div>
            `;

            // Función helper para badges de estado
            const estadoBadge = (texto, claseColor) => `
                <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${claseColor}">
                    <span class="w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
                    ${texto}
                </span>
            `;

            contenido.innerHTML = `
            <div class="lg:col-span-3">
                <div class="mx-auto w-full max-w-[1100px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
                    
                    <!-- HEADER INSTITUCIONAL -->
                    <div class="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f766e] px-8 py-8 text-white">
                        <!-- Patrón decorativo sutil -->
                        <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
                        
                        <div class="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            <!-- Lado izquierdo: Título y descripción -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-4">
                                    <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                                        <span class="material-symbols-outlined text-[18px] text-emerald-300">monitoring</span>
                                    </div>
                                    <span class="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300/90">Ficha Técnica del Indicador</span>
                                </div>
                                
                                <h2 class="text-2xl md:text-3xl font-black leading-tight tracking-tight mb-3">${escapeHtml(nombreIndicadorValor)}</h2>
                                <p class="text-sm text-white/70 max-w-xl leading-relaxed">${escapeHtml(valor([/objetivo/], 'Documento formal del indicador generado desde el Sistema de Gestión de Procesos.'))}</p>
                            </div>
                            
                            <!-- Lado derecho: Código y metadata -->
                            <div class="flex flex-col items-start md:items-end gap-3 md:min-w-[200px]">
                                <div class="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm px-5 py-4">
                                    <p class="text-[10px] font-black uppercase tracking-[0.22em] text-white/60 mb-1">Código del Documento</p>
                                    <p class="text-xl font-black tracking-tight font-mono">${escapeHtml(String(detalle.codigo || '--'))}</p>
                                </div>
                                <div class="flex flex-wrap gap-2 md:justify-end">
                                    <span class="rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/80">Versión ${escapeHtml(String(detalle.version || '1.0'))}</span>
                                    <span class="rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/80">${escapeHtml(String(detalle.fecha || '--'))}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- CONTENIDO PRINCIPAL -->
                    <div class="bg-slate-50/50 px-8 py-8 space-y-6">
                        
                        <!-- SECCIÓN 1: IDENTIFICACIÓN -->
                        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
                                <span class="material-symbols-outlined text-slate-400 text-lg">badge</span>
                                <h4 class="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Identificación del Proceso</h4>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                ${infoBox('Código', detalle.codigo || detalle.version || '-')}
                                ${infoBox('Versión', detalle.version || '-')}
                                ${infoBox('Tipo de Proceso', valor([/tipo\s*de\s*proceso/, /tipo\s*proceso/], '-'))}
                                ${infoBox('Macro Proceso', valor([/macro\s*proceso/], '-'))}
                                ${infoBox('Proceso', valor([/^proceso$/], '-'))}
                                ${infoBox('Frecuencia', frecuenciaValor || '-')}
                                ${infoBox('Fuente', valor([/fuente/], '-'))}
                                ${infoBox('Unidad Responsable', valor([/unidad\s*responsable/, /oficina\s*o\s*unidad\s*responsable/, /responsable/], '-'))}
                            </div>
                        </div>

                        <!-- SECCIÓN 2: DATOS TÉCNICOS (con highlight de meta) -->
                        <div class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-6 shadow-sm">
                            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 pb-3 border-b border-emerald-100">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-emerald-500 text-lg">analytics</span>
                                    <h4 class="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Datos Técnicos del Indicador</h4>
                                </div>
                                <div class="flex items-center gap-3 bg-white rounded-xl px-4 py-2 border border-emerald-100 shadow-sm">
                                    <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Meta</span>
                                    <span class="text-2xl font-black text-emerald-600 leading-none">${escapeHtml(metaTexto)}</span>
                                    ${estadoBadge(metaEstado.texto, metaEstado.clase)}
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                ${infoBox('Nombre del Indicador', nombreIndicadorValor, 'lg:col-span-2')}
                                ${infoBox('Objetivo del Proceso', valor([/objetivo/], '-'))}
                                ${infoBox('Variables', variablesValor)}
                                ${infoBox('Fórmula del Indicador', formulaValor, 'lg:col-span-2 font-mono text-slate-600')}
                            </div>
                        </div>

                        <!-- SECCIÓN 3: VARIABLES DETALLADAS (si son extensas) -->
                        ${variablesValor && variablesValor !== '-' ? `
                        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                                <span class="material-symbols-outlined text-slate-400 text-lg">functions</span>
                                <h4 class="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Variables del Indicador</h4>
                            </div>
                            <div class="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">${escapeHtml(variablesValor)}</p>
                            </div>
                        </div>
                        ` : ''}

                        <!-- SECCIÓN 4: FÓRMULA DESTACADA -->
                        ${formulaValor && formulaValor !== '-' ? `
                        <div class="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-6 shadow-sm">
                            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-blue-100">
                                <span class="material-symbols-outlined text-blue-500 text-lg">calculate</span>
                                <h4 class="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Fórmula de Cálculo</h4>
                            </div>
                            <div class="bg-white rounded-xl p-6 border border-blue-100 text-center">
                                <p class="text-lg md:text-xl font-mono font-bold text-slate-800 leading-relaxed">${escapeHtml(formulaValor)}</p>
                            </div>
                        </div>
                        ` : ''}

                        <!-- FOOTER DEL DOCUMENTO -->
                        <div class="flex items-center justify-between pt-4 border-t border-slate-200">
                            <div class="flex items-center gap-2 text-[11px] text-slate-400">
                                <span class="material-symbols-outlined text-sm">shield</span>
                                <span class="font-medium">Documento generado por SIGPRO - UNMSM</span>
                            </div>
                            <div class="text-[11px] text-slate-400 font-mono">
                                ${escapeHtml(String(detalle.transaccion || 'TRANS-000'))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        }
        }
        if (campos.length === 0) {
            contenido.innerHTML = `
                <div class="lg:col-span-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500">
                    No hay contenido detallado registrado para este documento.
                </div>
            `;
        }
    }
    
    // Renderizar historial - Si es PENDIENTE, mostrar solo el primer registro
    const historialTbody = document.getElementById('detail-historial-tbody');
    const historial = Array.isArray(detalle.historial) ? detalle.historial : [];
    const historialAMostrar = normalizeEstadoKey(detalle.estado) === 'pendiente' ? historial.slice(0, 1) : historial;
    
    historialTbody.innerHTML = historialAMostrar.map(h => {
            // Definir clases completas según el progreso
            const progressConfig = {
                100: { bar: 'bg-green-500', text: 'text-green-500' },
                50:  { bar: 'bg-amber-500', text: 'text-amber-500' },  
                5:   { bar: 'bg-red-400', text: 'text-red-500' }
            };
            
            const config = progressConfig[h.progreso] || { bar: 'bg-primary', text: 'text-primary-500' };
            
            return `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-6 py-4 text-xs font-medium text-slate-500">${h.fecha}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <div class="w-24 bg-slate-200 rounded-full h-1.5">
                                <div class="${config.bar} h-1.5 rounded-full" style="width: ${h.progreso}%"></div>
                            </div>
                            <span class="text-[10px] font-bold ${config.text}">${h.progreso}%</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-[10px] font-black text-${(h.estado === 'COMPLETADO' || h.estado === 'APROBADO') ? 'green' : h.estado === 'EN PROCESO' ? 'amber' : 'red'}-500 uppercase">${h.estado}</span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-[10px] font-black text-${h.generadoPor === 'FACULTAD' ? 'red' : h.generadoPor === 'RACIONALIZACIÓN' ? 'amber' : 'green'}-400 uppercase">${h.generadoPor}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <button class="action-btn" onclick="mostrarDocumentos()" title="Revisar documento">
                            <span class="material-symbols-outlined text-sm">visibility</span>
                            Revisar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    
    // ==========================================
    // AGREGAR AQUÍ: Cargar rectificaciones desde API
    // ==========================================
    if (typeof cargarRectificaciones === 'function') {
        cargarRectificaciones(detalle.codigo, detalle.estado);
    }
    
    // Renderizar rectificaciones si existen (solo si la función está definida)
    if (typeof renderizarRectificaciones === 'function') {
        renderizarRectificaciones(detalle.codigo, detalle.estado);
    }
    
    // Guardar detalle actual para usos posteriores (preview generado)
    window.currentDetalle = detalle;

    // Renderizar documentos adjuntos
    const adjuntosContainer = document.getElementById('detail-documentos-adjuntos');
    
    if (!adjuntosContainer) {
        console.error('❌ ERROR: No se encontró el elemento #detail-documentos-adjuntos en el DOM');
    } else {
        // Para fichas de indicador, si no hay adjuntos físicos generamos un adjunto virtual PDF
        let adjuntos = Array.isArray(detalle.adjuntos) ? detalle.adjuntos.slice() : [];
        if ((detalle.tipo || '').toLowerCase() === 'indicador') {
            // Reemplazar lista por un único adjunto virtual que representa la ficha técnica PDF
            adjuntos = [
                {
                    nombre: 'Ficha Técnica PDF',
                    tipo: 'PDF',
                    tamaño: 'generado',
                    fecha: detalle.fecha || '',
                    icono: 'picture_as_pdf',
                    generated: true
                }
            ];
        }

        console.log(`📦 Renderizando ${adjuntos.length} adjunto(s) para ${detalle.codigo}`);
        
        // Guardar referencia global a los adjuntos para la preview
        adjuntosActuales = adjuntos;

        if (adjuntos.length === 0) {
            adjuntosContainer.innerHTML = `
                <div class="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 text-center">
                    No hay documentos adjuntos para este registro.
                </div>
            `;
        } else {
            adjuntosContainer.innerHTML = adjuntos.map((adj, idx) => `
                <div class="grupo-adjunto group flex items-center justify-between p-4 ${adj.activo ? 'bg-primary/5 border border-primary/20' : 'border border-slate-100 dark:border-slate-800'} rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all" data-adjunto-idx="${idx}" onclick="abrirPreviewPdf(${idx})">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 ${adj.activo ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined">${adj.icono}</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold ${adj.activo ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}">${escapeHtml(adj.nombre || 'Documento sin título')}</p>
                            <p class="text-[10px] text-slate-500 font-medium">${escapeHtml(adj.tipo || 'PDF')} • ${escapeHtml(adj.tamaño || '-')} • ${escapeHtml(adj.fecha || '-')}</p>
                        </div>
                    </div>
                    <span class="material-symbols-outlined ${adj.activo ? 'text-primary' : 'text-slate-300 group-hover:text-primary'} transition-colors">visibility</span>
                </div>
            `).join('');
        }
    }
    
    window.scrollTo(0, 0);
    
    showToast('Documento cargado correctamente', 'success');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==========================================
// FUNCIONES DE PREVIEW DE PDF
// ==========================================

let adjuntosActuales = [];

// Obtener el tipo MIME basado en la extensión del archivo
function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// ==========================================
// 🔥 FIX 7 & 8: Función helper para normalizar contenido base64
// ==========================================
function normalizarContenidoAdjunto(adjunto) {
    if (!adjunto || typeof adjunto !== 'object') return '';
    
    // Buscar contenido en TODOS los campos posibles
    const camposBuscar = ['contenido', 'url', 'path', 'raw', 'dataUrl', 'src', 
                          'file', 'documento', 'archivo', 'base64', 'data', 'content'];
    
    let source = '';
    for (const campo of camposBuscar) {
        const valor = adjunto[campo];
        if (valor && typeof valor === 'string') {
            const limpio = valor.trim();
            if (limpio.length > 100) {
                source = limpio;
                break;
            }
        }
    }
    
    // Si el contenido es base64 puro sin prefijo, normalizarlo
    if (source && !source.startsWith('data:') && source.length > 100) {
        const cleaned = source.replace(/\s/g, '');
        // Validar que sea base64 válido (con o sin padding)
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) && cleaned.length > 100) {
            const ext = (adjunto.nombre || 'archivo.pdf').split('.').pop().toLowerCase();
            const mimeMap = { 
                pdf: 'application/pdf', 
                xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                xls: 'application/vnd.ms-excel',
                doc: 'application/msword',
                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                png: 'image/png',
                gif: 'image/gif',
                webp: 'image/webp'
            };
            const mime = mimeMap[ext] || 'application/octet-stream';
            source = `data:${mime};base64,${cleaned}`;
            console.log('✅ Base64 normalizado a data URL');
        }
    }
    
    return source;
}

window.abrirPreviewPdf = async function(indiceAdjunto) {
    console.log(`📁 Abriendo preview del adjunto índice:`, indiceAdjunto);

    if (!adjuntosActuales || indiceAdjunto >= adjuntosActuales.length) {
        console.error('❌ Adjunto no encontrado. Length:', adjuntosActuales?.length);
        showToast('No se pudo abrir el documento', 'error');
        return;
    }

    const adjunto = adjuntosActuales[indiceAdjunto];
    const esTecnico = !!adjunto.generated || adjunto.generatedType === 'technical-pdf' || /ficha/i.test(String(adjunto.nombre || ''));

    try {
        const modal = document.getElementById('modal-pdf-preview');
        const content = modal?.querySelector('.modal-content');
        
        // 🔥 OBTENER EL CONTENEDOR PRINCIPAL
        const container = document.getElementById('pdf-preview-container');
        if (!container) {
            console.error('❌ No se encontró #pdf-preview-container');
            showToast('Error interno del visor', 'error');
            return;
        }

        // Actualizar información del header del modal
        document.getElementById('pdf-preview-nombre').textContent = adjunto.nombre || 'Documento sin título';
        document.getElementById('pdf-preview-info').textContent = `${adjunto.tipo || 'PDF'} • ${adjunto.tamaño || '-'} • ${adjunto.fecha || '-'}`;

        // 🔥 LIMPIAR COMPLETAMENTE el contenedor antes de insertar nuevo contenido
        container.innerHTML = '';

        // 🔥 REVOCAR blob URL anterior si existe (evita fugas de memoria)
        if (window._currentPreviewBlobUrl) {
            URL.revokeObjectURL(window._currentPreviewBlobUrl);
            window._currentPreviewBlobUrl = null;
        }

        if (esTecnico) {
            try {
                if (typeof window.generateTechnicalPdfBlob === 'function') {
                    // Generar PDF técnico como blob
                    const blob = await window.generateTechnicalPdfBlob(window.currentDetalle || {});
                    
                    const blobUrl = URL.createObjectURL(blob);
                    window._currentPreviewBlobUrl = blobUrl;

                    // Crear embed nuevo para el blob PDF
                    const embed = document.createElement('embed');
                    embed.type = 'application/pdf';
                    embed.src = blobUrl;
                    embed.className = 'w-full h-full';
                    container.appendChild(embed);
                    
                    window.adjuntoActual = Object.assign({}, adjunto, { _blob: blob, _blobUrl: blobUrl });
                } else {
                    // IFRAME para ficha técnica HTML (fallback cuando no hay generador de PDF)
                    const panelHtml = document.getElementById('viewer-contenido')?.innerHTML || '';
                    
                    const iframeDoc = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <script src="https://cdn.tailwindcss.com"><\/script>
                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
                            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
                            <style>
                                body{font-family:'Inter',sans-serif;background:#f8fafc;}
                                .material-symbols-outlined{font-family:'Material Symbols Outlined',sans-serif;}
                            </style>
                        </head>
                        <body class="p-8">${panelHtml}</body>
                        </html>
                    `;
                    
                    const iframe = document.createElement('iframe');
                    iframe.className = 'w-full h-full border-0';
                    iframe.srcdoc = iframeDoc;
                    container.appendChild(iframe);
                    
                    window.adjuntoActual = adjunto;
                }
            } catch (err) {
                console.error('❌ Error generando o cargando PDF técnico:', err);
                mostrarModalDocumentoNoDisponible(adjunto);
                return;
            }
        } else {
            // Archivo normal: crear embed dinámico
            let source = adjunto.contenido || adjunto.url || adjunto.path || '';
            
            if (!source) {
                source = normalizarContenidoAdjunto(adjunto);
            }
            
            if (!source) {
                mostrarModalDocumentoNoDisponible(adjunto);
                return;
            }

            const embed = document.createElement('embed');
            embed.type = getMimeType(adjunto.nombre);
            embed.src = source;
            embed.className = 'w-full h-full';
            container.appendChild(embed);
            
            window.adjuntoActual = adjunto;
        }

        // Mostrar modal con animación
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        requestAnimationFrame(() => {
            modal.classList.add('visible-overlay');
            content.classList.add('visible-content');
        });

        console.log('✅ Preview abierto exitosamente');
    } catch (error) {
        console.error('❌ Error abriendo preview:', error);
        showToast('Error al abrir el documento', 'error');
    }
};

// ==========================================
// DESCARGAR FICHA TÉCNICA EN PDF - UNA SOLA HOJA
// ==========================================

async function descargarFichaTecnicaPDF() {
    const currentDetalle = window.currentDetalle || {};
    const docId = currentDetalle.codigo || currentDetalle.id || 'documento';
    const panelHtml = document.getElementById('viewer-contenido');

    if (!panelHtml) {
        showToast('No hay contenido para exportar', 'error');
        return;
    }

    const btn = document.getElementById('btn-descargar-pdf');
    const icono = document.getElementById('icon-pdf');
    const texto = document.getElementById('texto-pdf');
    const setLoading = (isLoading) => {
        if (btn) btn.disabled = isLoading;
        if (icono) icono.textContent = isLoading ? 'hourglass_top' : 'picture_as_pdf';
        if (texto) texto.textContent = isLoading ? 'Generando PDF...' : 'Descargar PDF';
    };
    setLoading(true);

    let wrapper = null;

    try {
        // 1. Cargar librerías
        if (!window.html2canvas) {
            await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        if (!window.jspdf?.jsPDF) {
            await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        const { jsPDF } = window.jspdf;

        // 2. Crear wrapper off-screen al ANCHO NATURAL del diseño (1100px)
        wrapper = document.createElement('div');
        wrapper.id = 'pdf-export-wrapper';
        wrapper.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 1100px;
            background: #ffffff;
            z-index: -1;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            overflow: visible;
        `;

        // 3. Clonar contenido manteniendo su ancho natural
        const clone = panelHtml.cloneNode(true);
        clone.style.cssText = `
            width: 1100px !important;
            min-width: 1100px !important;
            max-width: 1100px !important;
            margin: 0 !important;
            padding: 32px 40px !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
        `;

        // Quitar restricciones internas que causen compresión
        clone.querySelectorAll('*').forEach(el => {
            el.style.maxWidth = 'none';
        });

        // Preservar colores exactos
        const styleFix = document.createElement('style');
        styleFix.textContent = `
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            .material-symbols-outlined { font-family: 'Material Symbols Outlined', sans-serif !important; }
        `;
        clone.appendChild(styleFix);
        
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        // 4. Esperar renderizado
        await new Promise(r => setTimeout(r, 600));

        // 5. Capturar a escala ALTA para nitidez al estirar
        const canvas = await html2canvas(wrapper, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1100,
            width: 1100
        });

        // 6. Generar PDF de UNA SOLA PÁGINA que ocupe TODO el A4
        const imgData = canvas.toDataURL('image/png', 1.0);

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        // addImage(imgData, formato, x, y, ancho_mm, alto_mm)
        // x=0, y=0, ancho=210mm, alto=297mm → ocupa toda la hoja de borde a borde
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

        pdf.save(`Ficha-Tecnica-${docId}.pdf`);
        showToast('Ficha técnica descargada en una sola hoja', 'success');

    } catch (error) {
        console.error('Error generando PDF:', error);
        showToast('Error al generar PDF. Intenta nuevamente.', 'error');
    } finally {
        setLoading(false);
        if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
        }
    }
}

// ==========================================
// DESCARGAR REPORTE COMPLETO DEL EXPEDIENTE
// ==========================================

async function descargarReporteCompletoPDF() {
    const detalle = window.currentDetalle;
    if (!detalle) {
        showToast('No hay datos del expediente cargados', 'error');
        return;
    }

    const btn = document.getElementById('btn-descargar-reporte');
    const icono = btn?.querySelector('.material-symbols-outlined');
    const textoOriginal = btn?.innerHTML;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin">refresh</span> Generando...`;
    }

    try {
        // Cargar librerías si no existen
        if (!window.html2canvas) {
            await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        if (!window.jspdf?.jsPDF) {
            await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        const { jsPDF } = window.jspdf;

        // ==========================================
        // 1. CONSTRUIR HTML TEMPORAL DEL REPORTE
        // ==========================================
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            position:fixed; left:-9999px; top:0; width:1100px; background:#fff;
            font-family:'Inter',sans-serif; color:#0f172a; padding:40px; box-sizing:border-box;
        `;

        // Helper para escapar HTML
        const esc = (s) => String(s || '--')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

        // Helper para badge de estado
        const estadoColor = (estado) => {
            const e = String(estado).toLowerCase();
            if (e.includes('complet') || e.includes('aprob')) return ['#047857', '#d1fae5'];
            if (e.includes('proces') || e.includes('revis')) return ['#b45309', '#fef3c7'];
            return ['#dc2626', '#fee2e2'];
        };

        const [txtColor, bgColor] = estadoColor(detalle.estadoTexto || detalle.estado);

        // === HEADER INSTITUCIONAL ===
        let html = `
        <div style="border-bottom:3px solid #1e3a5f; padding-bottom:20px; margin-bottom:30px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h1 style="font-size:28px; font-weight:900; color:#0f172a; margin:0 0 6px 0; letter-spacing:-0.5px;">
                        REPORTE DE EXPEDIENTE
                    </h1>
                    <p style="font-size:12px; color:#64748b; margin:0; font-weight:600; text-transform:uppercase; letter-spacing:1px;">
                        SIGPRO - Sistema de Gestión de Procesos · UNMSM
                    </p>
                </div>
                <div style="text-align:right;">
                    <p style="font-size:11px; color:#64748b; margin:0;">Generado el</p>
                    <p style="font-size:13px; font-weight:800; color:#0f172a; margin:2px 0 0 0;">
                        ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}
                    </p>
                </div>
            </div>
        </div>

        <!-- KPI CARDS -->
        <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:16px; margin-bottom:30px;">
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <p style="font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0;">Código</p>
                <p style="font-size:16px; font-weight:900; color:#1e3a5f; margin:0;">${esc(detalle.codigo)}</p>
                <span style="display:inline-block; margin-top:6px; font-size:9px; font-weight:800; color:#16a34a; background:#dcfce7; padding:2px 8px; border-radius:999px;">ACTIVO</span>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <p style="font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0;">Asunto</p>
                <p style="font-size:14px; font-weight:800; color:#0f172a; margin:0;">${esc(detalle.asunto)}</p>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <p style="font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0;">Estado</p>
                <p style="font-size:14px; font-weight:900; color:${txtColor}; margin:0;">${esc(detalle.estadoTexto || detalle.estado)}</p>
                <p style="font-size:10px; color:#94a3b8; margin:4px 0 0 0; font-style:italic;">${esc(detalle.subestado)}</p>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <p style="font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0;">Actualización</p>
                <p style="font-size:13px; font-weight:800; color:#0f172a; margin:0;">${esc(detalle.fechaActualizacion || detalle.fecha)}</p>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#f8fafc;">
                <p style="font-size:9px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0;">Progreso</p>
                <p style="font-size:20px; font-weight:900; color:#2563eb; margin:0;">${detalle.progreso || 0}%</p>
                <p style="font-size:10px; color:#64748b; margin:4px 0 0 0;">Etapa: ${esc(detalle.etapa)}</p>
            </div>
        </div>

        <!-- INFORMACIÓN TÉCNICA -->
        <div style="margin-bottom:30px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">
                <span style="font-size:18px;">📋</span>
                <h2 style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0;">
                    Información Técnica del Documento
                </h2>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:24px; background:#fff;">`;

        // Si hay resumenCampos, renderizar como grid
        if (Array.isArray(detalle.resumenCampos) && detalle.resumenCampos.length > 0) {
            html += `<div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:16px;">`;
            detalle.resumenCampos.forEach(campo => {
                const val = String(campo.value || '-').trim();
                if (val && val !== '-') {
                    html += `
                    <div style="border-left:3px solid #cbd5e1; padding-left:12px;">
                        <p style="font-size:9px; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 4px 0;">${esc(campo.label)}</p>
                        <p style="font-size:12px; font-weight:700; color:#0f172a; margin:0; line-height:1.5; white-space:pre-line;">${esc(val)}</p>
                    </div>`;
                }
            });
            html += `</div>`;
        } else {
            // Fallback: clonar el viewer-contenido si existe
            const viewer = document.getElementById('viewer-contenido');
            if (viewer) {
                html += `<div id="reporte-clone-interno">${viewer.innerHTML}</div>`;
            } else {
                html += `<p style="color:#64748b; font-size:12px;">No hay información técnica registrada.</p>`;
            }
        }

        html += `</div></div>`;

        // === HISTORIAL ===
        const historial = Array.isArray(detalle.historial) ? detalle.historial : [];
        html += `
        <div style="margin-bottom:30px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; border-bottom:2px solid #1e3a5f; padding-bottom:8px;">
                <span style="font-size:18px;">📊</span>
                <h2 style="font-size:14px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1px; margin:0;">
                    Historial de Seguimiento
                </h2>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:10px 12px; text-align:left; font-weight:800; color:#475569; text-transform:uppercase; font-size:9px; letter-spacing:1px; border-bottom:2px solid #cbd5e1;">Fecha</th>
                        <th style="padding:10px 12px; text-align:left; font-weight:800; color:#475569; text-transform:uppercase; font-size:9px; letter-spacing:1px; border-bottom:2px solid #cbd5e1;">Progreso</th>
                        <th style="padding:10px 12px; text-align:left; font-weight:800; color:#475569; text-transform:uppercase; font-size:9px; letter-spacing:1px; border-bottom:2px solid #cbd5e1;">Estado</th>
                        <th style="padding:10px 12px; text-align:left; font-weight:800; color:#475569; text-transform:uppercase; font-size:9px; letter-spacing:1px; border-bottom:2px solid #cbd5e1;">Generado por</th>
                    </tr>
                </thead>
                <tbody>`;

        if (historial.length > 0) {
            historial.forEach(h => {
                const progColor = h.progreso >= 100 ? '#16a34a' : h.progreso >= 50 ? '#d97706' : '#dc2626';
                html += `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:10px 12px; color:#334155; font-weight:600;">${esc(h.fecha)}</td>
                        <td style="padding:10px 12px;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <div style="width:60px; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                                    <div style="width:${h.progreso}%; height:100%; background:${progColor}; border-radius:3px;"></div>
                                </div>
                                <span style="font-weight:800; color:${progColor}; font-size:11px;">${h.progreso}%</span>
                            </div>
                        </td>
                        <td style="padding:10px 12px;">
                            <span style="display:inline-block; padding:2px 10px; border-radius:999px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;
                                ${h.estado === 'COMPLETADO' || h.estado === 'APROBADO' 
                                    ? 'background:#dcfce7; color:#166534;' 
                                    : h.estado === 'EN PROCESO' 
                                        ? 'background:#fef3c7; color:#92400e;' 
                                        : 'background:#fee2e2; color:#991b1b;'}">
                                ${esc(h.estado)}
                            </span>
                        </td>
                        <td style="padding:10px 12px; color:#475569; font-weight:700;">${esc(h.generadoPor)}</td>
                    </tr>`;
            });
        } else {
            html += `<tr><td colspan="4" style="padding:16px; text-align:center; color:#94a3b8; font-size:12px;">No hay registros de historial</td></tr>`;
        }

        html += `
                </tbody>
            </table>
        </div>

        <!-- FOOTER -->
        <div style="margin-top:40px; border-top:2px solid #e2e8f0; padding-top:16px; display:flex; justify-content:space-between; align-items:center;">
            <p style="font-size:10px; color:#94a3b8; font-weight:600; margin:0;">
                © ${new Date().getFullYear()} SIGPRO - UNMSM · Oficina General de Planificación
            </p>
            <p style="font-size:10px; color:#94a3b8; font-weight:700; margin:0; font-family:monospace;">
                TRANS: ${esc(detalle.transaccion || 'N/A')}
            </p>
        </div>`;

        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        // ==========================================
        // 2. CAPTURAR Y GENERAR PDF
        // ==========================================
        await new Promise(r => setTimeout(r, 500)); // Esperar renderizado

        const canvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            windowWidth: 1100,
            width: 1100,
            logging: false
        });

        // Calcular dimensiones para PDF A4
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = margin;
        let pageCount = 1;

        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin);

        // Si el contenido excede una página, agregar más
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - margin);
            pageCount++;
        }

        const fileName = `Reporte-${esc(detalle.codigo || 'expediente').replace(/\s+/g,'_')}.pdf`;
        pdf.save(fileName);

        showToast(`Reporte descargado (${pageCount} página${pageCount > 1 ? 's' : ''})`, 'success');

        // Limpieza
        document.body.removeChild(wrapper);

    } catch (error) {
        console.error('Error generando reporte PDF:', error);
        showToast('Error al generar el reporte. Intenta nuevamente.', 'error');
    } finally {
        if (btn && textoOriginal) {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    }
}

// Exponer globalmente
window.descargarReporteCompletoPDF = descargarReporteCompletoPDF;

// Helper para cargar scripts dinámicamente
function cargarScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
        document.head.appendChild(s);
    });
}

// ===== NUEVA FUNCIÓN: Modal informativo cuando no hay contenido =====
function mostrarModalDocumentoNoDisponible(adjunto) {
    let modal = document.getElementById('modal-doc-info');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-doc-info';
        modal.className = 'hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm';
        
        let motivo = '';
        if (adjunto && adjunto.tamaño && adjunto.tamaño.toString().toLowerCase().includes('mb') && parseFloat(adjunto.tamaño) > 4.5) {
            motivo = 'El archivo es muy grande para ser mostrado directamente en el navegador.';
        } else if (!adjunto || !adjunto.contenido || adjunto.contenido.length < 100) {
            motivo = 'El archivo no fue guardado correctamente. Intenta subirlo nuevamente.';
        } else {
            motivo = 'El archivo no está disponible para previsualización en este momento.';
        }

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6 text-center transform transition-all duration-300 scale-95 opacity-0" id="modal-doc-content">
                <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-amber-600 text-3xl">cloud_off</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">No se puede previsualizar el documento</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <strong id="modal-doc-nombre" class="text-slate-700 dark:text-slate-300 block mb-2"></strong>
                    ${motivo}
                </p>
                <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4 text-left text-xs space-y-2">
                    <div class="flex justify-between"><span class="text-slate-500">Tipo:</span> <span id="modal-doc-tipo" class="font-medium"></span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Tamaño:</span> <span id="modal-doc-tamano" class="font-medium"></span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Estado:</span> <span class="font-medium text-amber-600">No disponible para previsualización</span></div>
                </div>
                <div class="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4 text-left">
                    <p class="text-xs text-amber-700 dark:text-amber-400">
                        <span class="material-symbols-outlined text-sm align-middle">info</span>
                        <strong>¿Por qué pasa esto?</strong><br>
                        ${motivo}<br>
                        <strong>¿Cómo lo soluciono?</strong><br>
                        Si el archivo es muy grande, la previsualización estará disponible cuando el sistema esté conectado al servidor.<br>
                        Si el problema ocurre con archivos pequeños, intenta subir el archivo nuevamente.<br>
                    </p>
                </div>
                <div class="flex gap-2">
                    <button onclick="cerrarModalDocInfo()" class="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors">
                        Cerrar
                    </button>
                    <button onclick="solicitarDocumento()" class="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-sm">mail</span>
                        Solicitar reenvío
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModalDocInfo();
        });
    }

    document.getElementById('modal-doc-nombre').textContent = adjunto.nombre || 'Documento';
    document.getElementById('modal-doc-tipo').textContent = adjunto.tipo || '-';
    document.getElementById('modal-doc-tamano').textContent = adjunto.tamaño || '-';

    modal.classList.remove('hidden');
    const content = document.getElementById('modal-doc-content');
    requestAnimationFrame(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    });
}

window.cerrarModalDocInfo = function() {
    const modal = document.getElementById('modal-doc-info');
    if (!modal) return;
    const content = document.getElementById('modal-doc-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.solicitarDocumento = function() {
    const rect = rectificacionSeleccionada;
    const email = rect?.email || 'racionalizacion@unmsm.edu.pe';
    const asunto = `Solicitud de documento - ${rect?.asunto || 'Rectificación'}`;
    const cuerpo = `Estimados,\n\nSolicito el reenvío del documento adjunto para su revisión.\n\nSaludos.`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`, '_blank');
    cerrarModalDocInfo();
};

window.cerrarPreview = function() {
    const modal = document.getElementById('modal-pdf-preview');
    if (!modal) return;

    const content = modal.querySelector('.modal-content');
    
    // Iniciar animación de cierre
    modal.classList.remove('visible-overlay');
    if (content) content.classList.remove('visible-content');

    setTimeout(() => {
        modal.classList.add('hidden');

        // ==========================================
        // 🔥 FIX PRINCIPAL: Limpiar el contenedor correcto
        // ==========================================
        const container = document.getElementById('pdf-preview-container');
        if (container) {
            // Limpiar TODO el contenido dinámico (embeds, iframes, etc.)
            // Esto elimina cualquier elemento creado dinámicamente por abrirPreviewPdf
            container.innerHTML = '';
        }

        // ==========================================
        // 🔥 FIX: Revocar blob URL si existe (siempre, sin condicionales que lo omitan)
        // ==========================================
        if (window._currentPreviewBlobUrl) {
            URL.revokeObjectURL(window._currentPreviewBlobUrl);
            window._currentPreviewBlobUrl = null;
        }
        
        // ==========================================
        // 🔥 LIMPIEZA ADICIONAL: Limpiar referencias
        // ==========================================
        window.adjuntoActual = null;

        console.log('✅ Preview cerrado y recursos liberados');
    }, 300);
};

window.descargarPdfPreview = descargarFichaTecnicaPDF;

// Función global para volver al dashboard
window.showDashboard = function() {
    // Reemplazar estado para que "Atrás" salga de la app, no vuelva al detalle
    history.replaceState({ view: 'dashboard' }, '', window.location.href);
    
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    window.scrollTo(0, 0);
    showToast('Volviendo al listado de documentos', 'info');
};

// Función para mostrar documentos adjuntos
function mostrarDocumentos() {
    const seccionDocumentos = document.getElementById('seccion-documentos');
    if (seccionDocumentos) {
        seccionDocumentos.classList.remove('hidden');
        window.scrollTo(0, 200);
    }
}

// Función para cerrar documentos
window.cerrarDocumentos = function() {
    const seccionDocumentos = document.getElementById('seccion-documentos');
    if (seccionDocumentos) {
        seccionDocumentos.classList.add('hidden');
    }
};

// ==========================================
// FUNCIONES GLOBALES DE RECTIFICACIONES
// ==========================================

// Variable para almacenar rectificaciones cargadas
let rectificacionesActuales = [];

// Cambiar entre tabs
function mostrarTab(tab) {
    const contentHistorial = document.getElementById('content-historial');
    const contentRectificaciones = document.getElementById('content-rectificaciones');
    const tabHistorial = document.getElementById('tab-historial');
    const tabRectificaciones = document.getElementById('tab-rectificaciones');
    
    if (!contentHistorial || !contentRectificaciones) return;
    
    // Ocultar todos los contenidos
    contentHistorial.classList.add('hidden');
    contentRectificaciones.classList.add('hidden');
    
    // Resetear estilos de tabs
    tabHistorial.className = 'py-3 px-1 text-sm font-bold text-slate-400 hover:text-slate-600 border-b-2 border-transparent transition-all';
    tabRectificaciones.className = 'py-3 px-1 text-sm font-bold text-slate-400 hover:text-slate-600 border-b-2 border-transparent transition-all';
    
    // Activar tab seleccionada
    if (tab === 'historial') {
        contentHistorial.classList.remove('hidden');
        tabHistorial.className = 'py-3 px-1 text-sm font-bold text-blue-600 border-b-2 border-blue-600 transition-all relative';
    } else {
        contentRectificaciones.classList.remove('hidden');
        tabRectificaciones.className = 'py-3 px-1 text-sm font-bold text-blue-600 border-b-2 border-blue-600 transition-all relative';
        // Resetear vista de rectificaciones a la lista
        volverAListaRectificaciones();
    }
}

// Cargar rectificaciones desde API
function formatRectificacionFecha(fechaRaw) {
    if (!fechaRaw) return '-';
    const date = new Date(fechaRaw);
    if (Number.isNaN(date.getTime())) return String(fechaRaw);

    const fecha = new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);

    const hora = new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);

    return `${fecha}\n${hora}`;
}

function formatRectificacionSize(sizeValue) {
    if (typeof sizeValue === 'number' && Number.isFinite(sizeValue)) {
        if (sizeValue >= 1024 * 1024) return `${(sizeValue / (1024 * 1024)).toFixed(1)} MB`;
        if (sizeValue >= 1024) return `${Math.round(sizeValue / 1024)} KB`;
        return `${sizeValue} B`;
    }
    const text = String(sizeValue || '').trim();
    return text || '-';
}

function getFileTypeFromName(name) {
    const extension = String(name || '').split('.').pop().toUpperCase();
    return extension || 'ARCHIVO';
}

// ==========================================
// 🔥 FIX 1, 2, 3, 4: mapCorreccionRacioToRectificacion corregida
// ==========================================
function mapCorreccionRacioToRectificacion(item) {
    // Buscar adjunto en TODAS las ubicaciones posibles
    let adjuntoRaw = item?.adjunto || (Array.isArray(item?.adjuntos) ? item.adjuntos[0] : null);
    
    if (!adjuntoRaw && Array.isArray(item?.documentos) && item.documentos.length > 0) {
        adjuntoRaw = item.documentos[0];
    }
    if (!adjuntoRaw && Array.isArray(item?.archivos) && item.archivos.length > 0) {
        adjuntoRaw = item.archivos[0];
    }
    if (!adjuntoRaw && Array.isArray(item?.archivosEnviados) && item.archivosEnviados.length > 0) {
        adjuntoRaw = item.archivosEnviados[0];
    }
    
    // 🔥 CRÍTICO: Extraer contenido de TODOS los campos posibles (inglés Y español)
    let rawContent = "";
    const camposBuscar = [
        'contenido', 'content',      // español + inglés
        'base64', 'data',            // aliases
        'url', 'ruta', 'src',        // URLs
        'file', 'documento', 'archivo'  // otros
    ];
    
    // Buscar en adjuntoRaw
    if (adjuntoRaw && typeof adjuntoRaw === "object") {
        for (const campo of camposBuscar) {
            const valor = adjuntoRaw[campo];
            if (valor && typeof valor === "string" && valor.trim().length > 50) {
                rawContent = valor.trim();
                console.log(`✅ Contenido encontrado en campo: ${campo}`);
                break;
            }
        }
    }
    
    // Si no hay contenido, buscar directamente en item (por si acaso)
    if (!rawContent) {
        for (const campo of camposBuscar) {
            const valor = item[campo];
            if (valor && typeof valor === "string" && valor.trim().length > 50) {
                rawContent = valor.trim();
                console.log(`✅ Contenido encontrado en item.${campo}`);
                break;
            }
        }
    }

    // Extraer nombre (inglés o español)
    const fileName = adjuntoRaw?.name || adjuntoRaw?.nombre || item?.nombreArchivo || "Archivo adjunto";
    
    // Extraer tipo (inglés o español)
    const fileType = adjuntoRaw?.type || adjuntoRaw?.tipo || getFileTypeFromName(fileName);
    
    // Extraer tamaño (inglés o español)
    const fileSize = formatRectificacionSize(adjuntoRaw?.size || adjuntoRaw?.tamaño);

    // Normalizar a data URL si es base64 puro
    let normalizedUrl = rawContent;
    
    if (rawContent) {
        const cleanedContent = rawContent.replace(/\s/g, "");
        
        if (!cleanedContent.startsWith("data:")) {
            // Es base64 puro, agregar prefijo
            const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleanedContent) && cleanedContent.length > 100;
            if (isBase64) {
                const ext = fileName.split(".").pop().toLowerCase();
                const mimeMap = { 
                    pdf: "application/pdf", 
                    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    xls: "application/vnd.ms-excel"
                };
                const mime = mimeMap[ext] || "application/octet-stream";
                normalizedUrl = `data:${mime};base64,${cleanedContent}`;
            }
        } else {
            normalizedUrl = cleanedContent;
        }
    }

    console.log("🔍 mapCorreccion result:", {
        fileName,
        tieneContenido: !!normalizedUrl,
        urlPreview: normalizedUrl ? normalizedUrl.substring(0, 80) + "..." : "VACÍO"
    });

    return {
        id: item?.id || `corr_${Date.now()}`,
        fecha: formatRectificacionFecha(item?.fecha),
        observacion: item?.observaciones || item?.asunto || "Corrección solicitada",
        estado: "OBSERVADO",
        responsable: "RACIONALIZACIÓN",
        asunto: item?.asunto || "Solicitud de rectificación",
        descripcion: item?.observaciones || item?.asunto || "Corrección solicitada",
        email: item?.correoInstitucional || "racionalizacion@unmsm.edu.pe",
        documentos: [{
            nombre: fileName,
            tipo: fileType,
            tamaño: fileSize,
            estado: "por_corregir",
            contenido: normalizedUrl,
            url: normalizedUrl,
            path: normalizedUrl,
            raw: rawContent
        }],
        archivosEnviados: []
    };
}

// 🔥 FIX: cargarRectificacionesSincronizadas ahora es async
async function cargarRectificacionesSincronizadas(expedienteId) {
    const codigo = String(expedienteId || "").trim();
    if (!codigo) return [];

    const raw = localStorage.getItem(STORAGE_KEYS.CORRECCIONES_LISTA);
    if (!raw) return [];

    try {
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];

        const filtered = list
            .filter((item) => String(item?.codigo || "").trim() === codigo)
            .sort((a, b) => new Date(b?.fecha || 0) - new Date(a?.fecha || 0));
        
        const result = [];
        for (const item of filtered) {
            result.push(await mapCorreccionRacioToRectificacion(item));
        }
        return result;
        
    } catch (error) {
        console.error("Error leyendo rectificaciones sincronizadas:", error);
        return [];
    }
}

async function cargarRectificaciones(expedienteId, estadoExpediente) {
    const tbody = document.getElementById("rectificaciones-tbody");
    const empty = document.getElementById("rect-empty");
    const countBadge = document.getElementById("rect-count-badge");
    const badgeTab = document.getElementById("badge-rectificaciones");
    
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8">
        <span class="material-symbols-outlined animate-spin text-amber-600">refresh</span>
        <p class="text-sm text-slate-500 mt-2">Cargando rectificaciones...</p>
    </td></tr>`;
    
    try {
        const token = localStorage.getItem('token');
        
        // ✅ NUEVO: Buscar el documento y obtener el mejor ID para API
        const docObj = allDocuments.find(d => d.codigo === expedienteId || d.id === expedienteId);
        
        // ← NUEVO: Determinar el ID correcto para la API
        const isBackendId = (str) => {
            if (!str || typeof str !== 'string') return false;
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return true;
            if (/^CAR-\d{4}-\d+$/i.test(str)) return true;
            if (/^FLU-[A-Z]+-\d{4}-\d+$/i.test(str)) return true;
            if (/^(IND|REP|DOC|FLU|CAR)-[A-Z0-9-]+$/i.test(str)) return true;
            return false;
        };
        
        let idReal = docObj?.backendId; // ← PRIORIDAD 1: backendId (UUID real)
        let idSource = 'backendId';
        
        if (!idReal) {
            idReal = docObj?.id;
            idSource = 'id';
        }
        
        // Si no es UUID válido, usar código como fallback
        if (!isBackendId(idReal)) {
            console.warn(`⚠️ ${idSource}=${idReal} no es UUID, usando código como fallback`);
            idReal = docObj?.codigo || expedienteId;
            idSource = 'codigo';
        }
        
        console.log(`📋 getHistory: ID=${idReal} (source=${idSource}, backendId=${docObj?.backendId}, id=${docObj?.id}, código=${expedienteId})`);

        const rectResult = await API.portal.documents.getHistory(idReal);
        
        if (rectResult.success && rectResult.data) {
            const data = rectResult.data;

            rectificaciones = (data.rectifications || data.data || []).map(r => ({
                id: r.id || r._id,
                fecha: formatRectificacionFecha(r.createdAt || r.fecha),
                observacion: r.observaciones || r.observacion || r.asunto || 'Corrección solicitada',
                estado: r.status || r.estado || 'OBSERVADO',
                responsable: r.createdBy?.fullName || r.responsable || r.createdBy?.role || 'RACIONALIZACIÓN',
                asunto: r.asunto || r.title || 'Solicitud de rectificación',
                descripcion: r.descripcion || r.observaciones || r.observacion,
                email: r.email || r.correo || r.createdBy?.email || 'racionalizacion@unmsm.edu.pe',
                documentos: (r.documentos || r.attachments || r.adjuntos || []).map(d => ({
                    nombre: d.nombre || d.name || d.filename || 'Documento',
                    tipo: d.tipo || d.type || 'PDF',
                    tamaño: formatRectificacionSize(d.tamaño || d.size),
                    estado: d.estado || d.status || 'por_corregir',
                    contenido: d.url || d.contenido || d.path || ''
                })),
                archivosEnviados: (r.archivosEnviados || r.sentAttachments || []).map(a => ({
                    nombre: a.nombre || a.name || a.filename,
                    tipo: a.tipo || a.type || 'PDF',
                    tamaño: formatRectificacionSize(a.tamaño || a.size)
                }))
            }));
        } else {
            // Fallback a localStorage
            rectificaciones = await cargarRectificacionesSincronizadas(expedienteId);
        }
        
        rectificacionesActuales = rectificaciones;
        // ... resto del renderizado (igual que tienes ahora)
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">
            Error al cargar rectificaciones.
        </td></tr>`;
    }
}

// Simular carga de API (eliminar cuando esté la API real)
function simularCargaRectificaciones(expedienteId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const datosSimulados = {
                'PR-FM-26-01': [
                    { 
                        id: 1,
                        fecha: '05/01/2024\n10:30 H', 
                        observacion: 'Firma ilegible en documento de identidad', 
                        estado: 'OBSERVADO', 
                        responsable: 'ADMIN FACULTAD',
                        asunto: 'Corrección de DNI',
                        descripcion: 'El documento de identidad presenta una firma ilegible que dificulta la validación. Se requiere presentar una copia legible o renovar el documento.',
                        email: 'sistemas@unmsm.edu.pe',
                        documentos: [
                            { nombre: 'DNI Escaneado.pdf', tipo: 'PDF', tamaño: '2.4 MB', estado: 'por_corregir' }
                        ],
                        archivosEnviados: []
                    }
                ],
                'FL-FM-26-01': [
                    { 
                        id: 2,
                        fecha: '15/01/2024\n09:00 H', 
                        observacion: 'Formato incorrecto en flujograma', 
                        estado: 'OBSERVADO', 
                        responsable: 'RACIONALIZACIÓN',
                        asunto: 'Corrección de Flujograma',
                        descripcion: 'El flujograma no cumple con el formato institucional establecido. Se requiere ajustar los colores y la nomenclatura según el manual de identidad.',
                        email: 'racionalizacion@unmsm.edu.pe',
                        documentos: [
                            { nombre: 'Flujograma_v1.pdf', tipo: 'PDF', tamaño: '2.5 MB', estado: 'por_corregir' }
                        ],
                        archivosEnviados: []
                    },
                    { 
                        id: 3,
                        fecha: '18/01/2024\n14:20 H', 
                        observacion: 'Corrección de nomenclatura', 
                        estado: 'SUBSANADO', 
                        responsable: 'FACULTAD',
                        asunto: 'Ajuste de Nomenclatura',
                        descripcion: 'Se realizaron los ajustes solicitados en la nomenclatura del flujograma. Los cambios fueron validados y aprobados.',
                        email: 'sistemas@unmsm.edu.pe',
                        documentos: [
                            { nombre: 'Flujograma_v2.pdf', tipo: 'PDF', tamaño: '2.5 MB', estado: 'corregido' }
                        ],
                        archivosEnviados: [
                            { nombre: 'Anexo_Correcciones.pdf', tipo: 'PDF', tamaño: '1.2 MB' }
                        ]
                    }
                ],
                'IN-FM-26-01': [
                    { 
                        id: 4,
                        fecha: '20/12/2023\n11:20 H', 
                        observacion: 'Datos incompletos en indicadores', 
                        estado: 'OBSERVADO', 
                        responsable: 'RACIONALIZACIÓN',
                        asunto: 'Completar Indicadores',
                        descripcion: 'Faltan datos de los indicadores de graduación del semestre 2023-II. Se requiere completar la información faltante.',
                        email: 'racionalizacion@unmsm.edu.pe',
                        documentos: [
                            { nombre: 'Indicadores_Parciales.xlsx', tipo: 'XLSX', tamaño: '1.2 MB', estado: 'por_corregir' }
                        ],
                        archivosEnviados: []
                    },
                    { 
                        id: 5,
                        fecha: '25/12/2023\n16:45 H', 
                        observacion: 'Actualización de métricas', 
                        estado: 'SUBSANADO', 
                        responsable: 'FACULTAD',
                        asunto: 'Actualización de Métricas',
                        descripcion: 'Se completaron las métricas pendientes y se actualizaron los indicadores según lo solicitado.',
                        email: 'sistemas@unmsm.edu.pe',
                        documentos: [
                            { nombre: 'Indicadores_Completos.xlsx', tipo: 'XLSX', tamaño: '1.5 MB', estado: 'corregido' }
                        ],
                        archivosEnviados: [
                            { nombre: 'Resumen_Metricas.pdf', tipo: 'PDF', tamaño: '850 KB' }
                        ]
                    },
                    { 
                        id: 6,
                        fecha: '02/02/2024\n10:15 H', 
                        observacion: 'Validación final completada', 
                        estado: 'SUBSANADO', 
                        responsable: 'RACIONALIZACIÓN',
                        asunto: 'Validación Final',
                        descripcion: 'Todos los indicadores han sido validados y aprobados. El expediente está listo para su cierre.',
                        email: 'racionalizacion@unmsm.edu.pe',
                        documentos: [
                            { nombre: 'Indicadores_Finales.xlsx', tipo: 'XLSX', tamaño: '1.5 MB', estado: 'corregido' }
                        ],
                        archivosEnviados: [
                            { nombre: 'Certificado_Validacion.pdf', tipo: 'PDF', tamaño: '2.1 MB' }
                        ]
                    }
                ]
            };
            
            resolve(datosSimulados[expedienteId] || []);
        }, 500);
    });
}

// ==========================================
// 🔥 FIX 5 & 6: revisarRectificacion corregida
// ==========================================
function revisarRectificacion(index) {
    const rect = rectificacionesActuales[index];
    if (!rect) {
        console.error('❌ No se encontró rectificación en índice:', index);
        return;
    }

    console.log('🔍 Revisando rectificación:', rect.asunto || rect.observacion);
    console.log('   Documentos:', rect.documentos?.length || 0);
    console.log('   Archivos enviados:', rect.archivosEnviados?.length || 0);

    // Animación suave
    const tablaContainer = document.getElementById('rectificaciones-tabla-container');
    if (tablaContainer) {
        tablaContainer.classList.remove('animate-fade-in');
        tablaContainer.classList.add('animate-slide-down');
        setTimeout(() => {
            tablaContainer.classList.add('hidden');
            tablaContainer.classList.remove('animate-slide-down');
        }, 320);
    }

    const detallePanel = document.getElementById('rectificaciones-detalle-panel');
    if (detallePanel) {
        detallePanel.classList.remove('hidden', 'animate-slide-up', 'animate-fade-in-slow');
        detallePanel.style.opacity = '0';
        void detallePanel.offsetWidth;
        detallePanel.classList.add('animate-slide-up', 'animate-fade-in-slow');
        detallePanel.style.opacity = '1';
    }

    // Llenar datos del detalle
    document.getElementById('rect-detalle-asunto').textContent = rect.asunto || 'Sin asunto';
    document.getElementById('rect-detalle-observacion').textContent = rect.descripcion || rect.observacion;

    const emailLink = document.getElementById('rect-detalle-email');
    if (emailLink && rect.email) {
        emailLink.href = `mailto:${rect.email}`;
        emailLink.textContent = rect.email;
    }

    // BOTÓN RESPONDER
    const btnResponder = document.getElementById('rect-btn-responder');
    const formulario = document.getElementById('formulario-respuesta');
    rectificacionSeleccionada = rect;

    if (btnResponder) {
        if (formulario) formulario.classList.add('hidden');

        if (rect.estado === 'SUBSANADO') {
            btnResponder.disabled = true;
            btnResponder.innerHTML = '<span class="material-symbols-outlined text-lg">check</span> SUBSANADO';
        } else {
            btnResponder.disabled = false;
            btnResponder.innerHTML = '<span class="material-symbols-outlined text-lg">reply</span> RESPONDER';
        }
    }

    // ==========================================
    // 🔥 FIX 5: Función helper para extraer contenido de cualquier objeto
    // ==========================================
    function extraerContenido(obj) {
        if (!obj || typeof obj !== 'object') return '';
        
        const camposBuscar = ['contenido', 'url', 'path', 'raw', 'dataUrl', 'src', 
                              'file', 'documento', 'archivo', 'base64', 'data', 'content'];
        
        for (const campo of camposBuscar) {
            const valor = obj[campo];
            if (valor && typeof valor === 'string') {
                const limpio = valor.trim();
                // Aceptar data URLs o base64 con longitud mínima
                if (limpio.startsWith('data:') && limpio.length > 200) {
                    return limpio;
                }
                if (limpio.length > 100) {
                    // Intentar normalizar si es base64 puro
                    const cleaned = limpio.replace(/\s/g, '');
                    if (/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
                        const ext = (obj.nombre || 'archivo.pdf').split('.').pop().toLowerCase();
                        const mimeMap = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
                        return `data:${mimeMap[ext] || 'application/octet-stream'};base64,${cleaned}`;
                    }
                    return limpio;
                }
            }
        }
        return '';
    }

    // ==========================================
    // PREPARAR ARCHIVOS ENVIADOS
    // ==========================================
    const archivosEnviados = (rect.archivosEnviados || []).map((arch, idx) => {
        const contenido = extraerContenido(arch);
        
        return {
            nombre: arch.nombre || arch.name || 'Archivo',
            tipo: arch.tipo || arch.type || 'PDF',
            tamaño: arch.tamaño || arch.size || '-',
            fecha: rect.fecha?.split('\n')[0] || '-',
            activo: true,
            icono: (arch.tipo || '').toUpperCase() === 'XLSX' ? 'table_chart' : 'description',
            contenido: contenido,
            url: contenido,
            path: contenido,
            raw: contenido
        };
    });

    // ==========================================
    // PREPARAR DOCUMENTOS EN CORRECCIÓN
    // ==========================================
    const docsEnCorreccion = (rect.documentos || []).map((doc, idx) => {
        let contenido = extraerContenido(doc);
        
        // Si no hay contenido en el doc, buscar en la rectificación completa
        if (!contenido) {
            contenido = extraerContenido(rect);
        }

        return {
            nombre: doc.nombre || doc.name || 'Documento',
            tipo: doc.tipo || doc.type || 'PDF',
            tamaño: doc.tamaño || doc.size || '-',
            fecha: rect.fecha?.split('\n')[0] || '-',
            activo: doc.estado === 'por_corregir',
            icono: (doc.tipo || '').toUpperCase() === 'XLSX' ? 'table_chart' : 'description',
            contenido: contenido,
            url: contenido,
            path: contenido,
            raw: contenido
        };
    });

    // Combinar arrays para la vista previa
    adjuntosActuales = [...archivosEnviados, ...docsEnCorreccion];

    // 🔥 FIX 6: Debug - Log para verificar qué adjuntos tienen contenido
    console.log('🔍 Adjuntos preparados para preview:', adjuntosActuales.map((a, i) => ({
        indice: i,
        nombre: a.nombre,
        tieneContenido: !!(a.contenido && a.contenido.length > 100),
        esDataUrl: a.contenido?.startsWith('data:'),
        contenidoPreview: a.contenido ? a.contenido.substring(0, 80) + '...' : 'VACÍO'
    })));

    // ==========================================
    // RENDERIZAR DOCUMENTOS EN CORRECCIÓN
    // ==========================================
    const docsContainer = document.getElementById('rect-documentos-lista');
    if (docsContainer && rect.documentos) {
        const offsetArchivos = archivosEnviados.length;

        docsContainer.innerHTML = rect.documentos.map((doc, idx) => {
            const adjuntoReal = docsEnCorreccion[idx];
            const tieneContenido = !!(adjuntoReal.contenido && adjuntoReal.contenido.length > 100);

            return `
            <div onclick="abrirPreviewPdf(${offsetArchivos + idx})" 
                class="group flex items-center justify-between p-4 ${doc.estado === 'por_corregir' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30' : 'border border-slate-100 dark:border-slate-700'} rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 ${doc.estado === 'por_corregir' ? 'bg-red-500' : 'bg-green-500'} text-white rounded-lg flex items-center justify-center ${doc.estado === 'por_corregir' ? 'shadow-md shadow-red-200' : ''}">
                        <span class="material-symbols-outlined text-sm">${doc.tipo === 'PDF' ? 'description' : 'table_chart'}</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">${doc.nombre}</p>
                        <p class="text-[10px] ${doc.estado === 'por_corregir' ? 'text-red-600' : 'text-green-600'} font-bold uppercase tracking-wider">
                            ${doc.estado === 'por_corregir' ? 'Por corregir' : 'Corregido'}
                        </p>
                        ${!tieneContenido ? '<p class="text-[10px] text-amber-500 font-bold">⚠️ Sin vista previa</p>' : ''}
                    </div>
                </div>
                <span class="material-symbols-outlined ${doc.estado === 'por_corregir' ? 'text-red-500' : 'text-green-500'}">
                    ${doc.estado === 'por_corregir' ? 'warning' : 'check_circle'}
                </span>
            </div>
            `;
        }).join('');
    }

    // ==========================================
    // RENDERIZAR ARCHIVOS ENVIADOS
    // ==========================================
    const archivosContainer = document.getElementById('rect-detalle-archivos');
    if (archivosContainer) {
        if (rect.archivosEnviados && rect.archivosEnviados.length > 0) {
            archivosContainer.innerHTML = rect.archivosEnviados.map((arch, idx) => {
                const adjuntoReal = archivosEnviados[idx];
                const tieneContenido = !!(adjuntoReal.contenido && adjuntoReal.contenido.length > 100);
                let previewHtml = '';
                if (tieneContenido) {
                    const nombre = (adjuntoReal.nombre||'').toLowerCase();
                    if (nombre.endsWith('.pdf')) {
                        previewHtml = `<embed src="${adjuntoReal.contenido}" type="application/pdf" class="w-full h-32 rounded mb-2" />`;
                    } else if (nombre.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
                        previewHtml = `<img src="${adjuntoReal.contenido}" alt="${escapeHtml(adjuntoReal.nombre)}" class="w-full h-32 object-contain rounded mb-2" />`;
                    } else if (nombre.match(/\.(txt|csv|log|md)$/i)) {
                        // Mostrar texto plano
                        try {
                            const textContent = atob(adjuntoReal.contenido.split(',')[1] || '');
                            previewHtml = `<pre class='w-full h-32 overflow-auto bg-slate-100 dark:bg-slate-800 rounded mb-2 text-xs p-2'>${escapeHtml(textContent.substring(0, 1000))}</pre>`;
                        } catch { /* fallback */ }
                    }
                }
                return `
                <div onclick="abrirPreviewPdf(${idx})" 
                    class="w-32 h-32 border-2 border-dashed ${tieneContenido ? 'border-slate-200 dark:border-slate-700' : 'border-amber-200 dark:border-amber-800'} rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group overflow-hidden">
                    ${previewHtml || `<span class=\"material-symbols-outlined ${tieneContenido ? 'text-slate-400' : 'text-amber-400'} text-3xl group-hover:text-amber-600 transition-colors\">description</span>`}
                    <span class="text-[10px] font-bold ${tieneContenido ? 'text-slate-400' : 'text-amber-500'} text-center px-2 truncate w-full">${escapeHtml(arch.nombre)}</span>
                    <span class="text-[9px] ${tieneContenido ? 'text-slate-300' : 'text-amber-400'}">${escapeHtml(arch.tamaño)}</span>
                </div>
                `;
            }).join('');
        } else {
            archivosContainer.innerHTML = `
                <div class="w-full p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <span class="material-symbols-outlined text-3xl mb-2">folder_open</span>
                    <span class="text-xs">No hay archivos adjuntos</span>
                </div>
            `;
        }
    }

    // Scroll al panel
    document.getElementById('rectificaciones-detalle-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Volver a la lista de rectificaciones
function volverAListaRectificaciones() {
    const tablaContainer = document.getElementById('rectificaciones-tabla-container');
    if (tablaContainer) {
        tablaContainer.classList.remove('hidden', 'animate-slide-down');
        tablaContainer.classList.add('animate-fade-in');
    }

    const detallePanel = document.getElementById('rectificaciones-detalle-panel');
    if (detallePanel) {
        detallePanel.classList.add('hidden');
        detallePanel.classList.remove('animate-slide-up', 'animate-fade-in-slow');
    }
    rectificacionSeleccionada = null;
    const formulario = document.getElementById('formulario-respuesta');
    if (formulario) formulario.classList.add('hidden');
}

// Hacer funciones globales
window.mostrarTab = mostrarTab;
window.cargarRectificaciones = cargarRectificaciones;
window.revisarRectificacion = revisarRectificacion;
window.volverAListaRectificaciones = volverAListaRectificaciones;

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', async function() {
    
    // ========== ANIMACIÓN DEL SELECT / DROPDOWN PERSONALIZADO ==========
    const sortDropdown = document.getElementById('sort-dropdown');
    const sortButton = document.getElementById('sort-button');
    const sortMenu = document.getElementById('sort-menu');
    const sortOptions = document.querySelectorAll('.sort-option');
    const sortLabel = document.getElementById('sort-label');
    const sortSelect = document.getElementById('sort-select');
    
    if (sortButton && sortMenu) {
        // Abrir/cerrar dropdown
        sortButton.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('open');
        });
        
        // Opciones del menú
        sortOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                const text = option.textContent;
                
                // Actualizar el botón
                sortLabel.textContent = text;
                
                // Marcar opción activa
                sortOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Actualizar el select oculto
                if (sortSelect) sortSelect.value = value;
                
                // Cerrar menú
                sortDropdown.classList.remove('open');
                
                // Disparar evento de cambio en el select
                sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
        
        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!sortDropdown.contains(e.target)) {
                sortDropdown.classList.remove('open');
            }
        });
        
        // Marcar la opción inicial como activa
        const initialValue = sortSelect.value || 'antiguos';
        sortOptions.forEach(opt => {
            if (opt.getAttribute('data-value') === initialValue) {
                opt.classList.add('active');
            }
        });
    }
    
    const PERFIL_FALLBACK = {
        nombre: 'Usuario SIGPRO',
        email: 'usuario@unmsm.edu.pe',
        iniciales: 'US',
        rol: 'Usuario',
        facultad: 'UNMSM',
        color: 'bg-slate-600'
    };

    // Botón RESPONDER global
    const btnResponderGlobal = document.getElementById('rect-btn-responder');
    if (btnResponderGlobal) {
        btnResponderGlobal.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!rectificacionSeleccionada) {
                if (typeof showToast === 'function') {
                    showToast('Selecciona una rectificación antes de responder', 'warning');
                } else {
                    alert('Selecciona una rectificación antes de responder');
                }
                return;
            }

            if (btnResponderGlobal.disabled) {
                return;
            }

            toggleFormularioRespuesta();
        });
    }

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
            const token = localStorage.getItem('auth_token');
            if (!token) return false;
            
            // 🔥 FIX: API.auth.getUser() NO es async, devuelve el usuario directamente
            const user = API.auth.getUser();
            
            if (!user) {
                // Intentar refresh del token
                const refreshResult = await API.auth.refresh();
                if (!refreshResult.success) {
                    localStorage.removeItem('auth_token');
                    window.location.href = 'index.html';
                    return false;
                }
                const refreshedUser = API.auth.getUser();
                if (!refreshedUser) {
                    throw new Error('No se pudo obtener el perfil');
                }
                return renderUserProfile(refreshedUser);
            }
            
            return renderUserProfile(user);
        } catch (error) {
            console.error('Error cargando perfil:', error);
            return false;
        }
    }

    function renderUserProfile(user) {
        const email = user.email || user.correo || '-';
        const nombreBase = (user.fullName || user.nombreCompleto || user.nombre || email.split('@')[0]).replace(/\./g, ' ');
        const rol = user.role || user.rol || user.cargo || user.puesto || 'Usuario';
        const facultad = user.faculty?.nombre || user.facultad || user.facultyName || 'UNMSM';
        
        renderizarPerfil({
            nombre: nombreBase,
            email: email,
            iniciales: user.iniciales || getInicialesDesdeNombre(nombreBase),
            rol: rol,
            facultad: facultad,
            color: getColorPorRol(rol)
        });
        
        // Guardar en localStorage para fallback offline
        localStorage.setItem('sigpro_usuario', JSON.stringify({
            nombreCompleto: nombreBase, email, iniciales: user.iniciales || getInicialesDesdeNombre(nombreBase),
            rol, facultad
        }));
        
        return true;
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
            // 1) Intentar logout en backend
            try {
                if (typeof API !== 'undefined' && API.auth && API.auth.logout) {
                    await API.auth.logout();
                } else {
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

            window.location.replace('portal-inicio-facultades.html');
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
    //=========PDF DETALLE=========//
    const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
        if (btnDescargarPdf) {
            btnDescargarPdf.addEventListener('click', descargarFichaTecnicaPDF);
        }

    // ==========================================
    // FUNCIONALIDAD BOTÓN RESPONDER - Mostrar formulario de respuesta
    // ==========================================

    function toggleFormularioRespuesta() {
    const formulario = document.getElementById('formulario-respuesta');
    const btnResponder = document.getElementById('rect-btn-responder');
    
    if (formulario) {
        // Toggle visibilidad con animación
        if (formulario.classList.contains('hidden')) {
            formulario.classList.remove('hidden');
            formulario.classList.add('animate-slide-up');
            
            // Cambiar texto del botón
            if (btnResponder) {
                btnResponder.innerHTML = '<span class="material-symbols-outlined text-lg">expand_less</span> OCULTAR FORMULARIO';
            }
            
            // Scroll suave al formulario
            setTimeout(() => {
                formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            
        } else {
            formulario.classList.add('hidden');
            formulario.classList.remove('animate-slide-up');
            
            // Restaurar texto del botón
            if (btnResponder) {
                if (btnResponder.disabled) {
                    btnResponder.innerHTML = '<span class="material-symbols-outlined text-lg">check</span> SUBSANADO';
                } else {
                    btnResponder.innerHTML = '<span class="material-symbols-outlined text-lg">reply</span> RESPONDER';
                }
            }
        }
    }
}

    // Función para enviar la respuesta
    function enviarRespuesta() {
        const asuntoInput = document.getElementById('resp-asunto');
        const asunto = asuntoInput ? asuntoInput.value.trim() : '';
        const observaciones = document.getElementById('resp-observaciones')?.value || '';
        const fileInput = document.getElementById('resp-file-input');
        
        // Validación básica
        if (!observaciones.trim()) {
            showToast('Por favor ingrese sus observaciones', 'warning');
            return;
        }
        
        // Simular envío
        showToast('Enviando respuesta...', 'info');
        
        // Aquí iría la llamada a la API
        setTimeout(() => {
            showToast('Respuesta enviada correctamente', 'success');
            toggleFormularioRespuesta(); // Cerrar formulario
            
            // Limpiar campos
            if (document.getElementById('resp-observaciones')) {
                document.getElementById('resp-observaciones').value = '';
            }
            if (fileInput) {
                fileInput.value = '';
            }




        }, 1500);
    }

    // Hacer funciones globales
    window.toggleFormularioRespuesta = toggleFormularioRespuesta;
    window.enviarRespuesta = enviarRespuesta;

    // Solución alternativa: Delegación de eventos
    document.addEventListener('click', function(e) {
    // Buscar si el click fue en el botón RESPONDER o dentro de él
    const btn = e.target.closest('#rect-btn-responder');
    if (btn && !btn.disabled) {
        console.log('Click detectado en RESPONDER');
        e.preventDefault();
        e.stopPropagation();
        toggleFormularioRespuesta();
    }
});
    inicializarGestorArchivosRespuesta();
    let archivoRespuestaActual = null;

function inicializarGestorArchivosRespuesta() {
    const fileInput = document.getElementById('resp-file-input');
    const fileNameDisplay = document.getElementById('resp-file-name');
    const filePreview = document.getElementById('resp-file-preview');
    const btnRemoveFile = document.getElementById('resp-file-remove');
    
    if (!fileInput) {
        console.warn('⚠️ No se encontró #resp-file-input');
        return;
    }

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files?.[0];
        if (!file) {
            archivoRespuestaActual = null;
            actualizarUIArchivo(null);
            return;
        }

        const tiposPermitidos = [
            'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'xlsx', 'xls'];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!tiposPermitidos.includes(file.type) && !extensionesPermitidas.includes(extension)) {
            showToast('Tipo de archivo no permitido. Use: PDF, JPG, PNG, GIF, WEBP, XLSX', 'error');
            fileInput.value = '';
            archivoRespuestaActual = null;
            actualizarUIArchivo(null);
            return;
        }

        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            showToast(`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 10 MB`, 'error');
            fileInput.value = '';
            archivoRespuestaActual = null;
            actualizarUIArchivo(null);
            return;
        }

        archivoRespuestaActual = file;
        actualizarUIArchivo(file);
    });

    if (btnRemoveFile) {
        btnRemoveFile.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            fileInput.value = '';
            archivoRespuestaActual = null;
            actualizarUIArchivo(null);
        });
    }

    function actualizarUIArchivo(file) {
        if (!fileNameDisplay) return;
        
        if (!file) {
            fileNameDisplay.innerHTML = `
                <span class="text-slate-400 text-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">upload_file</span>
                    Sin archivo adjunto
                </span>
            `;
            if (filePreview) filePreview.classList.add('hidden');
            if (btnRemoveFile) btnRemoveFile.classList.add('hidden');
            return;
        }

        const sizeFormatted = file.size >= 1024 * 1024 
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        const icono = file.type.startsWith('image/') ? 'image' : 
                     file.type === 'application/pdf' ? 'picture_as_pdf' :
                     file.type.includes('excel') || file.type.includes('sheet') ? 'table_chart' : 'description';

        fileNameDisplay.innerHTML = `
            <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span class="material-symbols-outlined text-primary text-xl">${icono}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">${escapeHtml(file.name)}</p>
                    <p class="text-xs text-slate-500">${escapeHtml(file.type || extension.toUpperCase())} • ${sizeFormatted}</p>
                </div>
            </div>
        `;

        if (filePreview && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                filePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="max-h-48 rounded-lg border border-slate-200 object-contain" />`;
                filePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else if (filePreview) {
            filePreview.classList.add('hidden');
        }

        if (btnRemoveFile) btnRemoveFile.classList.remove('hidden');
    }
    }
    });
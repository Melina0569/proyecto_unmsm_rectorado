/**
 * VISOR DE CARACTERIZACIÓN - JavaScript (MODIFICADO)
 * 
 * CAMBIOS:
 * 1. Soporte para mostrar enlace de Google Sheets en info técnica
 * 2. Vista completa de información técnica cuando estado = 'aprobado'
 * 3. Previsualización embebida de Google Sheets en iframe
 * 4. Botón para abrir Google Sheets en nueva pestaña
 * 5. Sección de adjuntos adaptada para convivir con Google Sheets
 */

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista'
};

let caracterizacionActual = null;
let codigoActual = null;

// ============================================================
// UTILITARIO: Base64 → Blob URL
// ============================================================

function base64ToBlobUrl(base64String, contentType = 'application/pdf') {
    const cleanBase64 = base64String.replace(/^data:[^;]+;base64,/, '');

    try {
        const byteCharacters = atob(cleanBase64);
        const byteArrays = [];
        const sliceSize = 512;

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);

            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            byteArrays.push(new Uint8Array(byteNumbers));
        }

        const blob = new Blob(byteArrays, { type: contentType });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error('Error convirtiendo base64 a Blob:', e);
        return null;
    }
}

function esBase64(str) {
    if (!str || typeof str !== 'string') return false;
    const clean = str.replace(/^data:[^;]+;base64,/, '');
    return /^[A-Za-z0-9+/]*={0,2}$/.test(clean) && clean.length > 100;
}

function obtenerExtension(nombre, src) {
    if (src && /^data:image\//.test(src)) {
        const match = src.match(/^data:image\/(\w+);/);
        return match ? match[1] : 'png';
    }
    if (src && /^data:application\/pdf/.test(src)) return 'pdf';
    return (nombre.split('.').pop() || '').toLowerCase();
}

// ============================================================
// GOOGLE SHEETS HELPERS (NUEVO)
// ============================================================

function extractGoogleSheetsId(url) {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

function getGoogleSheetsEmbedUrl(url) {
    const id = extractGoogleSheetsId(url);
    if (!id) return null;
    return `https://docs.google.com/spreadsheets/d/${id}/pubhtml?widget=true&headers=false&chrome=false`;
}

function getGoogleSheetsPreviewUrl(url) {
    const id = extractGoogleSheetsId(url);
    if (!id) return null;
    return `https://docs.google.com/spreadsheets/d/${id}/htmlembed?single=true&widget=true&headers=false&chrome=false`;
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initThemeToggle();

    if (!cargarCaracterizacion()) {
        mostrarEstadoVacio();
        ocultarBloquesNoAplicables();
        return;
    }

    renderizarCaracterizacion();

    // ← NUEVO: Renderizar Google Sheets si existe (incluso si no está aprobado, pero destacado cuando sí)
    if (caracterizacionActual.googleSheetsUrl) {
        renderizarGoogleSheets();
    }

    renderizarAdjuntos(caracterizacionActual.adjuntos || []);
    ocultarBloquesNoAplicables();
});

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

function cargarCaracterizacion() {
    const codigoDesdeURL = new URLSearchParams(window.location.search).get('codigo');
    const actualRaw = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    const actual = actualRaw ? JSON.parse(actualRaw) : null;

    codigoActual = codigoDesdeURL || actual?.codigo || null;

    const detalleMapRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalleMap = detalleMapRaw ? JSON.parse(detalleMapRaw) : {};

    if (codigoActual && detalleMap[codigoActual]?.tipo === 'caracterizacion') {
        caracterizacionActual = construirModeloCaracterizacion(codigoActual, detalleMap[codigoActual]);
        return true;
    }

    const primeraCaracterizacion = Object.entries(detalleMap).find(([, value]) => value?.tipo === 'caracterizacion');
    if (primeraCaracterizacion) {
        codigoActual = primeraCaracterizacion[0];
        caracterizacionActual = construirModeloCaracterizacion(codigoActual, primeraCaracterizacion[1]);
        return true;
    }

    return false;
}

function construirModeloCaracterizacion(codigo, detalle) {
    const resumen = Array.isArray(detalle?.resumenCampos) ? detalle.resumenCampos : [];
    const fichaData = detalle?.fichaData || {};

    const docsRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    const docs = docsRaw ? JSON.parse(docsRaw) : [];
    const doc = docs.find((item) => item.codigo === codigo) || {};

    // ← NUEVO: Extraer URLs de Google Sheets desde fichaData o desde el doc de lista
    const gsUrl = fichaData?.googleSheetsUrl || doc?.googleSheetsUrl || null;

    return {
        codigo,
        titulo: detalle?.titulo || fichaData?.macroProcesoNombre || `Caracterizacion ${codigo}`,
        fechaRegistro: detalle?.fechaRegistro || doc?.fecha || '-',
        estado: doc?.estado || 'aprobado',
        fichaData,
        resumenCampos: resumen,
        adjuntos: Array.isArray(detalle?.adjuntos) ? detalle.adjuntos : [],
        // ← NUEVO: Campos de Google Sheets
        googleSheetsUrl: gsUrl,
        googleSheetsEmbedUrl: gsUrl ? getGoogleSheetsEmbedUrl(gsUrl) : null,
        googleSheetsId: gsUrl ? extractGoogleSheetsId(gsUrl) : null
    };
}

// ============================================================
// RENDERIZAR CARACTERIZACIÓN - INFO TÉCNICA
// ============================================================

function renderizarCaracterizacion() {
    const data = caracterizacionActual.fichaData || {};
    const tipoProceso = data.tipoProcesoLabel || formatearTipoProceso(data.tipoProceso);
    const proceso = data.macroProcesoNombre || data.macroProceso || '-';
    const estado = caracterizacionActual.estado || 'pendiente';
    const isAprobado = normalizarTexto(estado) === 'aprobado' || normalizarTexto(estado) === 'completado';

    // ← NUEVO: Si está aprobado, mostrar información técnica COMPLETA
    if (isAprobado) {
        aplicarVistaCompletaInfoTecnica(data);
    } else {
        aplicarVistaReducidaInfoTecnica();
    }

    setText('codigo-display', caracterizacionActual.codigo || '-');
    setText('info-proceso', proceso);
    setText('info-tipo', tipoProceso || '-');

    // ← NUEVO: Actualizar badge de estado visual
    actualizarBadgeEstado(estado);
}

/**
 * ← NUEVO: Muestra TODA la información técnica de la ficha
 * Se ejecuta cuando el estado es 'aprobado'
 */
function aplicarVistaCompletaInfoTecnica(data) {
    const ids = [
        { id: 'info-macro', value: data.macroProceso || data.macroProcesoNombre || '-' },
        { id: 'info-proceso', value: data.macroProcesoNombre || data.macroProceso || '-' },
        { id: 'info-version', value: data.version || '1.0' },
        { id: 'info-tipo', value: data.tipoProcesoLabel || formatearTipoProceso(data.tipoProceso) },
        { id: 'info-unidad', value: data.unidadOrganica || data.unidad || 'Facultad' },
        { id: 'info-objetivo', value: data.objetivo || data.objetivoProceso || '-' },
        { id: 'info-nombre', value: data.nombreProceso || data.procesoNombre || '-' },
        { id: 'info-frecuencia', value: data.frecuencia || 'Continua' },
        { id: 'info-fuente', value: data.fuente || 'SIGPRO' }
    ];

    ids.forEach(({ id, value }) => {
        const el = document.getElementById(id);
        if (!el) return;

        // Actualizar el valor del campo
        el.textContent = value || '-';

        // Mostrar el bloque contenedor
        const block = el.closest('.flex.flex-col');
        if (block) {
            block.classList.remove('hidden');
            // Agregar animación de entrada suave
            block.style.opacity = '0';
            block.style.transform = 'translateY(8px)';
            block.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            requestAnimationFrame(() => {
                block.style.opacity = '1';
                block.style.transform = 'translateY(0)';
            });
        }
    });

    // ← NUEVO: Si hay Google Sheets, agregarlo como campo adicional en info técnica
    if (caracterizacionActual.googleSheetsUrl) {
        agregarCampoGoogleSheetsInfoTecnica();
    }
}

/**
 * ← NUEVO: Agrega un campo visual de Google Sheets dentro del bloque de info técnica
 */
function agregarCampoGoogleSheetsInfoTecnica() {
    const container = document.getElementById('ficha-info');
    if (!container) return;

    // Evitar duplicados
    if (document.getElementById('info-google-sheets-block')) return;

    const url = caracterizacionActual.googleSheetsUrl;
    const block = document.createElement('div');
    block.id = 'info-google-sheets-block';
    block.className = 'flex flex-col gap-1';
    block.innerHTML = `
        <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Google Sheets</span>
        <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-green-600 text-lg">table_chart</span>
            <a href="${escapeHtml(url)}" 
               target="_blank" 
               rel="noopener noreferrer"
               class="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 underline underline-offset-2 truncate max-w-[280px]">
                Ver hoja de cálculo
            </a>
        </div>
    `;

    container.appendChild(block);

    // Animación de entrada
    block.style.opacity = '0';
    block.style.transform = 'translateY(8px)';
    block.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    requestAnimationFrame(() => {
        block.style.opacity = '1';
        block.style.transform = 'translateY(0)';
    });
}

function aplicarVistaReducidaInfoTecnica() {
    const visibles = new Set(['info-proceso', 'info-tipo']);
    const ids = [
        'info-macro',
        'info-proceso',
        'info-version',
        'info-tipo',
        'info-unidad',
        'info-objetivo',
        'info-nombre',
        'info-frecuencia',
        'info-fuente'
    ];

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        const block = el.closest('.flex.flex-col');
        if (!block) return;

        if (visibles.has(id)) {
            block.classList.remove('hidden');
        } else {
            block.classList.add('hidden');
        }
    });
}

/**
 * ← NUEVO: Actualiza el badge de estado con colores apropiados
 */
function actualizarBadgeEstado(estado) {
    const badge = document.getElementById('estado-badge');
    if (!badge) return;

    const value = normalizarTexto(estado);
    const config = {
        aprobado: { text: 'APROBADO', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        completado: { text: 'APROBADO', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        en_proceso: { text: 'EN PROCESO', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        pendiente: { text: 'PENDIENTE', class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' }
    };

    const cfg = config[value] || config.pendiente;
    badge.textContent = cfg.text;
    badge.className = `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${cfg.class}`;
}

function formatearTipoProceso(tipo) {
    const value = normalizarTexto(tipo);
    if (value === 'estrategico') return 'Estrategico';
    if (value === 'misional') return 'Misional';
    if (value === 'de-apoyo' || value === 'de apoyo' || value === 'soporte' || value === 'support') return 'Soporte';
    return tipo || '-';
}

// ============================================================
// GOOGLE SHEETS - PREVISUALIZACIÓN EMBEBIDA (NUEVO)
// ============================================================

/**
 * ← NUEVO: Renderiza la sección de Google Sheets con iframe embebido
 * Se muestra tanto en pendiente como aprobado, pero con estilos diferenciados
 */
function renderizarGoogleSheets() {
    const url = caracterizacionActual.googleSheetsUrl;
    const embedUrl = caracterizacionActual.googleSheetsEmbedUrl;
    const estado = normalizarTexto(caracterizacionActual.estado || '');
    const isAprobado = estado === 'aprobado' || estado === 'completado';

    if (!url) return;

    // Buscar o crear el contenedor principal
    let section = document.getElementById('google-sheets-section');
    if (!section) {
        section = document.createElement('div');
        section.id = 'google-sheets-section';
        section.className = 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8';

        const main = document.querySelector('main .layout-content-container');
        if (main) {
            // Insertar antes de adjuntos o al final
            const adjuntosWrapper = document.getElementById('caracterizacion-adjuntos-wrapper');
            if (adjuntosWrapper) {
                main.insertBefore(section, adjuntosWrapper);
            } else {
                main.appendChild(section);
            }
        }
    }

    const estadoBadge = isAprobado 
        ? `<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Aprobado</span>`
        : `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">En revisión</span>`;

    const iframeHeight = isAprobado ? '75vh' : '50vh';
    const minHeight = isAprobado ? '600px' : '400px';

    section.innerHTML = `
        <!-- HEADER -->
        <div class="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-green-600 dark:text-green-400">table_chart</span>
                </div>
                <div>
                    <h2 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">Ficha en Google Sheets</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vista previa de la hoja de cálculo vinculada</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${estadoBadge}
            </div>
        </div>

        <!-- CONTROLES / ACCIONES -->
        <div class="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span class="material-symbols-outlined text-base text-slate-400">link</span>
                <span class="truncate max-w-[300px] md:max-w-[500px]" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="abrirGoogleSheets()" 
                        class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-base">open_in_new</span>
                    Abrir en Google Sheets
                </button>
                <button onclick="copiarEnlaceGoogleSheets()" 
                        class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-all flex items-center gap-1"
                        title="Copiar enlace">
                    <span class="material-symbols-outlined text-base">content_copy</span>
                </button>
            </div>
        </div>

        <!-- IFRAME EMBED -->
        <div class="relative bg-slate-100 dark:bg-slate-950" style="height: ${iframeHeight}; min-height: ${minHeight};">
            ${embedUrl ? `
                <iframe 
                    id="gs-iframe"
                    src="${embedUrl}"
                    class="w-full h-full"
                    style="border: none; background: white;"
                    title="Previsualización Google Sheets"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    loading="lazy"
                    onload="this.dataset.loaded='true'; document.getElementById('gs-loading').style.display='none';"
                    onerror="mostrarFallbackGoogleSheets()">
                </iframe>
                <div id="gs-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950">
                    <span class="material-symbols-outlined text-4xl text-slate-300 animate-pulse">table_chart</span>
                    <p class="text-sm text-slate-500 mt-2">Cargando hoja de cálculo...</p>
                </div>
            ` : `
                <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                    <span class="material-symbols-outlined text-5xl text-slate-300 mb-3">link_off</span>
                    <p class="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No se puede previsualizar</p>
                    <p class="text-sm text-slate-500 max-w-md mb-4">
                        La hoja debe estar publicada o compartida públicamente para poder previsualizarse aquí.
                    </p>
                    <button onclick="abrirGoogleSheets()" 
                            class="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">open_in_new</span>
                        Abrir en Google Sheets
                    </button>
                </div>
            `}
        </div>

        ${!isAprobado ? `
        <!-- MENSAJE DE REVISIÓN -->
        <div class="px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20">
            <div class="flex items-center gap-2 text-amber-800 dark:text-amber-400 text-sm">
                <span class="material-symbols-outlined text-base">pending_actions</span>
                <span class="font-medium">Este documento está pendiente de revisión.</span>
                <span class="text-amber-600 dark:text-amber-500">La previsualización estará completa una vez aprobado.</span>
            </div>
        </div>
        ` : ''}
    `;

    // Fallback timeout por si el iframe no carga
    if (embedUrl) {
        setTimeout(() => {
            const iframe = document.getElementById('gs-iframe');
            const loading = document.getElementById('gs-loading');
            if (iframe && iframe.dataset.loaded !== 'true' && loading) {
                mostrarFallbackGoogleSheets();
            }
        }, 8000);
    }
}

/**
 * ← NUEVO: Fallback cuando el iframe de Google Sheets no carga
 */
function mostrarFallbackGoogleSheets() {
    const container = document.querySelector('#google-sheets-section > div:last-child');
    if (!container) return;

    const url = caracterizacionActual.googleSheetsUrl;

    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
            <span class="material-symbols-outlined text-5xl text-slate-300 mb-3">table_chart</span>
            <p class="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Vista previa no disponible
            </p>
            <p class="text-sm text-slate-500 mb-2 max-w-md">
                La hoja de Google Sheets no puede mostrarse directamente. Esto suele ocurrir si:
            </p>
            <ul class="text-sm text-slate-500 mb-6 text-left max-w-md list-disc list-inside space-y-1">
                <li>La hoja no está publicada como página web</li>
                <li>Los permisos de compartir no permiten vista previa</li>
                <li>El enlace no es válido o fue eliminado</li>
            </ul>
            <div class="flex flex-wrap gap-3 justify-center">
                <button onclick="abrirGoogleSheets()" 
                        class="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">open_in_new</span>
                    Abrir en Google Sheets
                </button>
                <button onclick="copiarEnlaceGoogleSheets()" 
                        class="px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">content_copy</span>
                    Copiar enlace
                </button>
            </div>
        </div>
    `;
}

/**
 * ← NUEVO: Abre Google Sheets en nueva pestaña
 */
window.abrirGoogleSheets = function() {
    const url = caracterizacionActual?.googleSheetsUrl;
    if (!url) {
        showToast('No hay enlace de Google Sheets disponible', 'warning');
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Abriendo Google Sheets...', 'success');
};

/**
 * ← NUEVO: Copia el enlace al portapapeles
 */
window.copiarEnlaceGoogleSheets = function() {
    const url = caracterizacionActual?.googleSheetsUrl;
    if (!url) {
        showToast('No hay enlace para copiar', 'warning');
        return;
    }
    navigator.clipboard.writeText(url).then(() => {
        showToast('Enlace copiado al portapapeles', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Enlace copiado al portapapeles', 'success');
    });
};

// ============================================================
// ADJUNTOS - VISOR EXISTENTE (ADAPTADO)
// ============================================================

function renderizarAdjuntos(adjuntos) {
    const section = crearSeccionAdjuntos();

    if (!adjuntos.length) {
        section.innerHTML = `
            <p class="text-sm text-slate-500 dark:text-slate-400">No hay archivos adjuntos registrados.</p>
        `;
        return;
    }

    const primerAdjunto = adjuntos[0];
    const tieneContenido = Boolean(primerAdjunto?.contenido || primerAdjunto?.url || primerAdjunto?.dataUrl || primerAdjunto?.src);

    if (!tieneContenido) {
        section.innerHTML = `
            <p class="text-sm text-slate-500 dark:text-slate-400">El adjunto no tiene contenido disponible.</p>
        `;
        return;
    }

    section.innerHTML = `
        <!-- VISOR DE PREVISUALIZACIÓN -->
        <div id="visor-adjunto" class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">
            <div class="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-sm">visibility</span>
                    <span id="visor-nombre" class="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[300px]">
                        ${escapeHtml(primerAdjunto.nombre || 'Documento')}
                    </span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">
                        Aprobado
                    </span>
                    <button onclick="descargarAdjuntoCaracterizacion()" 
                            class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Descargar">
                        <span class="material-symbols-outlined text-slate-500 text-sm">download</span>
                    </button>
                </div>
            </div>
            <div id="visor-contenido" class="relative bg-slate-100 dark:bg-slate-950" style="height: 70vh; min-height: 500px;">
                <!-- El contenido se inyecta aquí -->
            </div>
        </div>
    `;

    renderVisorAdjunto(primerAdjunto);

    window.descargarAdjuntoCaracterizacion = () => {
        const item = primerAdjunto;
        const src = item.contenido || item.url || item.dataUrl || item.src || '';

        if (!src) {
            showToast('El adjunto no tiene contenido disponible.', 'warning');
            return;
        }

        const link = document.createElement('a');
        link.href = src;
        link.download = item.nombre || 'documento';
        document.body.appendChild(link);
        link.click();
        link.remove();

        showToast('Descarga iniciada', 'success');
    };
}

// ============================================================
// VISOR DE ADJUNTOS - VERSIÓN CORREGIDA CON BLOB URL
// ============================================================

function renderVisorAdjunto(adjunto) {
    const contenedor = document.getElementById('visor-contenido');
    if (!contenedor) return;

    const srcRaw = adjunto.contenido || adjunto.url || adjunto.dataUrl || adjunto.src || '';
    const nombre = adjunto.nombre || 'Documento';
    const ext = obtenerExtension(nombre, srcRaw);

    console.log('🔍 [renderVisorAdjunto] Renderizando:', nombre, '| ext:', ext, '| esBase64:', esBase64(srcRaw));

    const esImagen = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || /^data:image/.test(srcRaw);
    const esPdf = ext === 'pdf' || /^data:application\/pdf/.test(srcRaw);

    let src = srcRaw;
    let blobUrl = null;

    if (esBase64(srcRaw)) {
        const mimeType = esImagen ? 'image/' + (ext === 'svg' ? 'svg+xml' : ext) : 
                        esPdf ? 'application/pdf' : 'application/octet-stream';
        blobUrl = base64ToBlobUrl(srcRaw, mimeType);
        if (blobUrl) {
            src = blobUrl;
            console.log('✅ Blob URL creada:', blobUrl.substring(0, 60) + '...');
        } else {
            console.warn('⚠️ No se pudo crear Blob URL, usando src original');
        }
    }

    contenedor.dataset.blobUrl = blobUrl || '';

    if (esImagen) {
        contenedor.innerHTML = `
            <div class="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
                <img src="${src}" 
                     alt="${escapeHtml(nombre)}" 
                     class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                     onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\'flex flex-col items-center justify-center text-slate-400\'><span class=\'material-symbols-outlined text-5xl mb-2\'>broken_image</span><p>Error al cargar la imagen</p></div>'">
            </div>
        `;
    } else if (esPdf) {
        contenedor.innerHTML = `
            <iframe 
                src="${src}#toolbar=1&navpanes=1&scrollbar=1"
                type="application/pdf"
                class="w-full h-full"
                style="border: none; background: white;"
                title="${escapeHtml(nombre)}"
                onload="this.dataset.loaded='true'">
            </iframe>
        `;

        setTimeout(() => {
            const iframe = contenedor.querySelector('iframe');
            if (iframe && iframe.dataset.loaded !== 'true') {
                mostrarFallbackPdf(src, nombre, blobUrl || srcRaw);
            }
        }, 4000);
    } else {
        mostrarFallbackDescarga(src, nombre);
    }
}

// ============================================================
// FALLBACKS
// ============================================================

function mostrarFallbackPdf(src, nombre, srcOriginal) {
    const contenedor = document.getElementById('visor-contenido');
    if (!contenedor) return;

    const puedeAbrir = src && (src.startsWith('blob:') || src.startsWith('http') || src.startsWith('data:'));

    contenedor.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
            <span class="material-symbols-outlined text-6xl mb-4 text-slate-300">picture_as_pdf</span>
            <p class="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
                ${escapeHtml(nombre)}
            </p>
            <p class="text-sm text-slate-400 mb-6 max-w-md">
                El PDF no puede previsualizarse directamente en este navegador.
            </p>
            <div class="flex flex-wrap gap-3 justify-center">
                ${puedeAbrir ? `
                <button onclick="window.open('${src}', '_blank')" 
                        class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">open_in_new</span>
                    Abrir en nueva pestaña
                </button>
                ` : ''}
                <button onclick="descargarAdjuntoCaracterizacion()" 
                        class="px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">download</span>
                    Descargar
                </button>
            </div>
        </div>
    `;
}

function mostrarFallbackDescarga(src, nombre) {
    const contenedor = document.getElementById('visor-contenido');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
            <span class="material-symbols-outlined text-6xl mb-4 text-slate-300">insert_drive_file</span>
            <p class="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
                ${escapeHtml(nombre)}
            </p>
            <p class="text-sm text-slate-400 mb-6">
                Vista previa no disponible para este tipo de archivo.
            </p>
            <button onclick="descargarAdjuntoCaracterizacion()" 
                    class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">download</span>
                Descargar archivo
            </button>
        </div>
    `;
}

function crearSeccionAdjuntos() {
    let section = document.getElementById('caracterizacion-adjuntos');
    if (section) return section;

    const main = document.querySelector('main .layout-content-container');
    if (!main) return document.createElement('div');

    const wrapper = document.getElementById('caracterizacion-adjuntos-wrapper') || document.createElement('div');
    wrapper.id = 'caracterizacion-adjuntos-wrapper';
    wrapper.className = 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8';
    wrapper.innerHTML = `
        <div class="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">attach_file</span>
            <h2 class="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">Documentos Adjuntos</h2>
        </div>
        <div id="caracterizacion-adjuntos" class="p-6"></div>
    `;

    const fichaInfo = document.getElementById('ficha-info');
    if (fichaInfo && fichaInfo.parentNode === main) {
        main.insertBefore(wrapper, fichaInfo.nextSibling);
    } else {
        main.appendChild(wrapper);
    }

    return document.getElementById('caracterizacion-adjuntos');
}

function ocultarBloquesNoAplicables() {
    const seguimientoTable = document.getElementById('tabla-seguimiento');
    const seguimientoSection = seguimientoTable ? seguimientoTable.closest('section') : null;
    if (seguimientoSection) seguimientoSection.classList.add('hidden');

    const chartContainer = document.getElementById('grafico-tendencia');
    const chartGrid = chartContainer ? chartContainer.closest('.grid') : null;
    if (chartGrid) chartGrid.classList.add('hidden');

    const modal = document.getElementById('modal-dato');
    if (modal) modal.classList.add('hidden');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function normalizarTexto(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function formatearEstado(estado) {
    const value = normalizarTexto(estado);
    if (value === 'completado' || value === 'aprobado') return 'APROBADO';
    if (value === 'en_proceso') return 'EN PROCESO';
    if (value === 'pendiente') return 'PENDIENTE';
    return String(estado || 'APROBADO').toUpperCase();
}

function formatearFecha(fecha) {
    if (!fecha || fecha === '-') return '-';
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return String(fecha);

    return parsed.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function mostrarEstadoVacio() {
    showToast('No se encontró información de caracterización en repositorio', 'warning', 5000);
    setText('codigo-display', 'SIN DATOS');
}

// ============================================================
// EXPORTAR PDF
// ============================================================

function exportarPDF() {
    if (!caracterizacionActual) {
        showToast('No hay información para exportar', 'warning');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('No se pudo cargar el generador de PDF', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        doc.setFontSize(18);
        doc.setTextColor(25, 120, 229);
        doc.text('Expediente de Caracterizacion - SIGPRO', 20, 20);

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        const data = caracterizacionActual.fichaData || {};
        const campos = [
            ['Codigo', caracterizacionActual.codigo],
            ['Titulo', caracterizacionActual.titulo],
            ['Tipo de proceso', data.tipoProcesoLabel || data.tipoProceso || '-'],
            ['Proceso', data.macroProcesoNombre || data.macroProceso || '-'],
            ['Estado', formatearEstado(caracterizacionActual.estado)],
            ['Fecha', formatearFecha(caracterizacionActual.fechaRegistro)],
            // ← NUEVO: Incluir Google Sheets en exportación
            ['Google Sheets', caracterizacionActual.googleSheetsUrl || 'No vinculado']
        ];

        let y = 34;
        campos.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(`${label}:`, 20, y);
            doc.setFont(undefined, 'normal');
            doc.text(String(value || '-').substring(0, 120), 62, y);
            y += 7;
        });

        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('Adjuntos', 20, y);
        y += 6;
        doc.setFont(undefined, 'normal');

        const adjuntos = caracterizacionActual.adjuntos || [];
        if (!adjuntos.length) {
            doc.text('- Sin adjuntos registrados', 20, y);
        } else {
            adjuntos.forEach((item) => {
                const line = `- ${item?.nombre || 'Archivo'} ${item?.tipo ? `(${item.tipo})` : ''}`;
                const lines = doc.splitTextToSize(line, 170);
                doc.text(lines, 20, y);
                y += lines.length * 5;
            });
        }

        doc.save(`Expediente_Caracterizacion_${caracterizacionActual.codigo || 'SIGPRO'}.pdf`);
        showToast('PDF exportado correctamente', 'success');
    } catch (error) {
        console.error(error);
        showToast('Error al exportar PDF', 'error');
    }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

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
        <span class="material-symbols-outlined">${icons[type]}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 250);
    }, duration);
}
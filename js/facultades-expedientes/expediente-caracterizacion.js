const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista'
};

let caracterizacionActual = null;
let codigoActual = null;

// ============================================================
// UTILITARIO: Base64 → Blob URL (solución al problema de preview)
// ============================================================

/**
 * Convierte una cadena base64 (con o sin prefijo data:) en una Blob URL.
 * Las Blob URLs no tienen límite de tamaño y funcionan en todos los navegadores.
 */
function base64ToBlobUrl(base64String, contentType = 'application/pdf') {
    // Limpiar prefijo data: si existe
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

/**
 * Detecta si un string es base64 válido (con o sin prefijo data:)
 */
function esBase64(str) {
    if (!str || typeof str !== 'string') return false;
    const clean = str.replace(/^data:[^;]+;base64,/, '');
    return /^[A-Za-z0-9+/]*={0,2}$/.test(clean) && clean.length > 100;
}

/**
 * Obtiene la extensión de archivo desde un nombre o data URL
 */
function obtenerExtension(nombre, src) {
    if (src && /^data:image\//.test(src)) {
        const match = src.match(/^data:image\/(\w+);/);
        return match ? match[1] : 'png';
    }
    if (src && /^data:application\/pdf/.test(src)) return 'pdf';
    return (nombre.split('.').pop() || '').toLowerCase();
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

    return {
        codigo,
        titulo: detalle?.titulo || fichaData?.macroProcesoNombre || `Caracterizacion ${codigo}`,
        fechaRegistro: detalle?.fechaRegistro || doc?.fecha || '-',
        estado: doc?.estado || 'aprobado',
        fichaData,
        resumenCampos: resumen,
        adjuntos: Array.isArray(detalle?.adjuntos) ? detalle.adjuntos : []
    };
}

function renderizarCaracterizacion() {
    const data = caracterizacionActual.fichaData || {};
    const tipoProceso = data.tipoProcesoLabel || formatearTipoProceso(data.tipoProceso);
    const proceso = data.macroProcesoNombre || data.macroProceso || '-';

    aplicarVistaReducidaInfoTecnica();

    setText('codigo-display', caracterizacionActual.codigo || '-');
    setText('info-proceso', proceso);
    setText('info-tipo', tipoProceso || '-');
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

function formatearTipoProceso(tipo) {
    const value = normalizarTexto(tipo);
    if (value === 'estrategico') return 'Estrategico';
    if (value === 'misional') return 'Misional';
    if (value === 'de-apoyo' || value === 'de apoyo' || value === 'soporte' || value === 'support') return 'Soporte';
    return tipo || '-';
}

// ============================================================
// ADJUNTOS - SOLO VISOR, SIN LISTA INFERIOR
// ============================================================

function renderizarAdjuntos(adjuntos) {
    const section = crearSeccionAdjuntos();

    if (!adjuntos.length) {
        section.innerHTML = `
            <p class="text-sm text-slate-500 dark:text-slate-400">No hay adjuntos registrados.</p>
        `;
        return;
    }

    // Solo mostramos el primer adjunto en el visor
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

    // Función global para descargar el adjunto actual
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

    // Determinar tipo de archivo
    const esImagen = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || /^data:image/.test(srcRaw);
    const esPdf = ext === 'pdf' || /^data:application\/pdf/.test(srcRaw);

    // Si es base64, convertir a Blob URL para evitar problemas de tamaño/encoding
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

    // Guardar referencia para limpieza posterior
    contenedor.dataset.blobUrl = blobUrl || '';

    if (esImagen) {
        // ========== IMÁGENES ==========
        contenedor.innerHTML = `
            <div class="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
                <img src="${src}" 
                     alt="${escapeHtml(nombre)}" 
                     class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                     onerror="this.onerror=null; this.parentNode.innerHTML='<div class=\'flex flex-col items-center justify-center text-slate-400\'><span class=\'material-symbols-outlined text-5xl mb-2\'>broken_image</span><p>Error al cargar la imagen</p></div>'">
            </div>
        `;
    } else if (esPdf) {
        // ========== PDFs ==========
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

        // Fallback: si el iframe no carga en 4 segundos, mostrar alternativa
        setTimeout(() => {
            const iframe = contenedor.querySelector('iframe');
            if (iframe && iframe.dataset.loaded !== 'true') {
                mostrarFallbackPdf(src, nombre, blobUrl || srcRaw);
            }
        }, 4000);
    } else {
        // ========== OTROS ARCHIVOS ==========
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
            ['Fecha', formatearFecha(caracterizacionActual.fechaRegistro)]
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
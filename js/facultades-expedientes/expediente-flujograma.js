/**
 * EXPEDIENTE FLUJOGRAMA - JavaScript
 * Vista de expediente aprobado con campos clave y PDF adjunto
 */

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle'
};

const UI = {
    codigoChip: '#codigo-display',
    tipoProceso: '#info-tipo-proceso',
    proceso: '#info-proceso',
    actividad: '#info-actividad',
    archivoNombre: '#info-archivo-nombre',
    pdfEmpty: '#pdf-empty',
    pdfViewer: '#pdf-viewer',
    btnDescargarPdf: '#btn-descargar-pdf',
    toastContainer: '#toast-container'
};

let expedienteActual = null;
let detalleActual = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initThemeToggle();
    cargarExpedienteFlujograma();
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

function cargarExpedienteFlujograma() {
    const codigo = obtenerCodigoActual();
    if (!codigo) {
        showToast('No se encontro un expediente para mostrar', 'warning');
        setTimeout(() => {
            window.location.href = 'facultades-expedientes.html';
        }, 1400);
        return;
    }

    expedienteActual = obtenerExpedienteDesdeLista(codigo) || obtenerExpedienteActualStorage();
    detalleActual = obtenerDetalle(codigo);

    if (!detalleActual) {
        showToast('No se encontro el detalle del flujograma', 'warning');
    }

    if (expedienteActual && expedienteActual.estado && expedienteActual.estado !== 'aprobado') {
        showToast('Solo se visualizan expedientes aprobados', 'warning');
        setTimeout(() => {
            window.location.href = 'facultades-expedientes.html';
        }, 1600);
        return;
    }

    renderInfo(codigo);
    renderPdf();
}

function obtenerCodigoActual() {
    const params = new URLSearchParams(window.location.search);
    const byUrl = params.get('codigo');
    if (byUrl) return byUrl;

    const actual = obtenerExpedienteActualStorage();
    return actual?.codigo || null;
}

function obtenerExpedienteActualStorage() {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    return raw ? JSON.parse(raw) : null;
}

function obtenerExpedienteDesdeLista(codigo) {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    if (!raw) return null;

    const docs = JSON.parse(raw);
    return docs.find(item => item.codigo === codigo) || null;
}

function obtenerDetalle(codigo) {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    if (!raw) return null;

    const detalles = JSON.parse(raw);
    return detalles[codigo] || null;
}

function getFichaData() {
    return detalleActual?.fichaData || detalleActual || {};
}

function getResumenValue(label) {
    const resumen = detalleActual?.resumenCampos || [];
    const item = resumen.find(field => String(field.label || '').toLowerCase() === label.toLowerCase());
    return item?.value || '-';
}

function getNombreActividad(codigo) {
    const fichaData = getFichaData();
    const tituloDetalle = detalleActual?.titulo || '';
    if (tituloDetalle.startsWith('Flujograma - ')) {
        return tituloDetalle.replace('Flujograma - ', '').trim() || '-';
    }

    const descripcion = expedienteActual?.descripcion || '';
    if (descripcion.startsWith('Flujograma - ')) {
        return descripcion.replace('Flujograma - ', '').trim() || '-';
    }

    const nombre = expedienteActual?.nombre || '';
    if (nombre.startsWith('Flujograma - ')) {
        return nombre.replace('Flujograma - ', '').trim() || '-';
    }

    if (fichaData.proceso) {
        return fichaData.proceso;
    }

    return codigo || '-';
}

function renderInfo(codigo) {
    const fichaData = getFichaData();
    const tipoProceso = fichaData.tipoProceso || getResumenValue('Tipo de proceso');
    const proceso = fichaData.macroProcesoNombre || fichaData.macroProceso || getResumenValue('Proceso');
    const actividad = fichaData.proceso || getNombreActividad(codigo);
    const archivoNombre = detalleActual?.adjuntos?.[0]?.nombre || fichaData.archivos?.[0]?.nombre || 'Sin archivo';

    setText(UI.codigoChip, codigo);
    setText(UI.tipoProceso, tipoProceso);
    setText(UI.proceso, proceso);
    setText(UI.actividad, actividad);
    setText(UI.archivoNombre, archivoNombre);
}

// ==========================================
// 🔥 FUNCIÓN CRÍTICA: renderPdf corregida
// ==========================================
function renderPdf() {
    // 1) Buscar adjunto en múltiples ubicaciones
    let adjunto = detalleActual?.adjuntos?.[0] 
               || getFichaData()?.adjuntos?.[0] 
               || getFichaData()?.archivos?.[0];

    if (!adjunto) {
        mostrarEstadoVacio('No hay documento adjunto');
        return;
    }

    // 2) Extraer contenido de TODOS los campos posibles
    let pdfSrc = adjunto.contenido 
              || adjunto.url 
              || adjunto.dataUrl 
              || adjunto.src 
              || adjunto.base64 
              || adjunto.data 
              || adjunto.file 
              || '';

    // 3) 🔥 BUSCAR EN SESSIONSTORAGE CACHE
    if (!pdfSrc) {
        try {
            const cache = JSON.parse(sessionStorage.getItem('sigpro_adjuntos_cache') || '{}');
            const cached = cache[detalleActual?.codigo]?.[0];
            if (cached?.contenido || cached?.url) {
                pdfSrc = cached.contenido || cached.url;
                console.log('✅ Recuperado de sessionStorage cache');
            }
        } catch(e) {}
    }

    // 4) 🔥 BUSCAR EN INDEXEDDB
    if (!pdfSrc) {
        recuperarDeIndexedDB(detalleActual?.codigo, adjunto.nombre).then(url => {
            if (url) {
                console.log('✅ Recuperado de IndexedDB');
                mostrarVisor(url, adjunto);
            }
        }).catch(() => {});
    }

    // 5) Normalizar base64 puro
    if (pdfSrc && !pdfSrc.startsWith('data:') && pdfSrc.length > 100) {
        const cleaned = pdfSrc.replace(/\s/g, '');
        if (/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
            const ext = (adjunto.nombre || 'archivo.pdf').split('.').pop().toLowerCase();
            const mimeMap = {
                pdf: 'application/pdf',
                jpg: 'image/jpeg', jpeg: 'image/jpeg',
                png: 'image/png', gif: 'image/gif', webp: 'image/webp'
            };
            pdfSrc = `data:${mimeMap[ext] || 'application/octet-stream'};base64,${cleaned}`;
        }
    }

    // 6) Si NO hay contenido, mostrar mensaje informativo con opción de re-subir
    if (!pdfSrc) {
        mostrarSinContenido(adjunto);
        return;
    }

    // 7) Mostrar visor
    mostrarVisor(pdfSrc, adjunto);
}

// 🔥 NUEVA: Recuperar de IndexedDB
async function recuperarDeIndexedDB(codigo, nombreArchivo) {
    if (!codigo || !nombreArchivo || typeof indexedDB === 'undefined') return null;
    
    try {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('sigpro_adjuntos_db', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        const tx = db.transaction('adjuntos', 'readonly');
        const store = tx.objectStore('adjuntos');
        const key = `${codigo}::${nombreArchivo}`;
        
        const record = await new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        db.close();
        return record?.url || record?.contenido || record?.content || null;
    } catch (error) {
        console.warn('No se pudo recuperar de IndexedDB:', error);
        return null;
    }
}

// 🔥 NUEVA: Mostrar visor (PDF o imagen)
function mostrarVisor(pdfSrc, adjunto) {
    const viewerNode = document.querySelector(UI.pdfViewer);
    const emptyNode = document.querySelector(UI.pdfEmpty);
    const btnDescargar = document.querySelector(UI.btnDescargarPdf);

    if (!viewerNode) return;

    // Ocultar estado vacío
    if (emptyNode) emptyNode.classList.add('hidden');

    // Determinar si es imagen
    const esImagen = /^(image\/|data:image)/.test(pdfSrc) || 
                     /\.(jpg|jpeg|png|gif|webp)$/i.test(adjunto.nombre || '');

    // Mostrar visor
    viewerNode.classList.remove('hidden');

    if (esImagen) {
        // Es imagen: reemplazar iframe por img
        const img = document.createElement('img');
        img.id = 'pdf-viewer';
        img.src = pdfSrc;
        img.className = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white';
        img.style.maxHeight = '80vh';
        img.style.objectFit = 'contain';
        img.alt = adjunto.nombre || 'Documento';
        
        if (viewerNode.parentNode) {
            viewerNode.parentNode.replaceChild(img, viewerNode);
        }
        UI.pdfViewer = '#pdf-viewer';
    } else {
        // Es PDF: usar iframe
        viewerNode.src = pdfSrc;
    }

    // Configurar botón descargar
    if (btnDescargar) {
        btnDescargar.href = pdfSrc;
        btnDescargar.download = adjunto.nombre || 'Documento.pdf';
        btnDescargar.classList.remove('hidden');
    }

    window.adjuntoActual = adjunto;
}

// 🔥 NUEVA: Mostrar mensaje cuando no hay contenido
function mostrarSinContenido(adjunto) {
    const emptyNode = document.querySelector(UI.pdfEmpty);
    const viewerNode = document.querySelector(UI.pdfViewer);
    const btnDescargar = document.querySelector(UI.btnDescargarPdf);

    if (emptyNode) {
        emptyNode.classList.remove('hidden');
        emptyNode.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-slate-400">
                <span class="material-symbols-outlined text-5xl mb-3">cloud_off</span>
                <p class="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                    "${escapeHtml(adjunto.nombre || 'Documento')}"
                </p>
                <p class="text-xs text-slate-400 mb-4">
                    ${adjunto.tipo || 'PDF'} • ${adjunto.tamaño || '-'} • ${adjunto.fecha || '-'}
                </p>
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-sm text-left">
                    <p class="text-xs text-amber-700 dark:text-amber-400 mb-3">
                        <span class="material-symbols-outlined text-sm align-middle">info</span>
                        <strong>El archivo no tiene contenido para previsualizar.</strong><br>
                        Esto ocurre cuando se guardó solo la información del archivo sin el contenido base64.
                    </p>
                    <input type="file" id="emergency-file-input" accept=".pdf,.jpg,.jpeg,.png" class="hidden">
                    <button onclick="document.getElementById('emergency-file-input').click()" 
                            class="w-full px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-sm">upload</span>
                        Subir archivo ahora
                    </button>
                </div>
            </div>
        `;
        
        // Manejar archivo de emergencia
        setTimeout(() => {
            const input = document.getElementById('emergency-file-input');
            if (input) {
                input.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const nuevoAdjunto = {
                            ...adjunto,
                            contenido: ev.target.result
                        };
                        
                        // Actualizar en detalleActual
                        if (detalleActual) {
                            detalleActual.adjuntos = [nuevoAdjunto];
                            if (detalleActual.fichaData) {
                                detalleActual.fichaData.adjuntos = [nuevoAdjunto];
                            }
                            
                            // Guardar en localStorage
                            const codigo = detalleActual.codigo;
                            const storage = JSON.parse(localStorage.getItem('sigpro_documentos_detalle') || '{}');
                            if (storage[codigo]) {
                                storage[codigo] = detalleActual;
                                localStorage.setItem('sigpro_documentos_detalle', JSON.stringify(storage));
                            }
                        }
                        
                        // Re-renderizar
                        renderPdf();
                        showToast('Archivo cargado correctamente', 'success');
                    };
                    reader.readAsDataURL(file);
                });
            }
        }, 100);
    }
    
    if (viewerNode) viewerNode.classList.add('hidden');
    if (btnDescargar) btnDescargar.classList.add('hidden');
}

function mostrarEstadoVacio(mensaje) {
    const emptyNode = document.querySelector(UI.pdfEmpty);
    const viewerNode = document.querySelector(UI.pdfViewer);
    const btnDescargar = document.querySelector(UI.btnDescargarPdf);

    if (emptyNode) {
        emptyNode.classList.remove('hidden');
        emptyNode.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-slate-400">
                <span class="material-symbols-outlined text-5xl mb-3">hide_image</span>
                <p class="text-sm font-medium">${mensaje}</p>
            </div>
        `;
    }
    if (viewerNode) viewerNode.classList.add('hidden');
    if (btnDescargar) btnDescargar.classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function exportarPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('No se pudo inicializar la exportacion PDF', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const tipo = document.querySelector(UI.tipoProceso)?.textContent || '-';
    const proceso = document.querySelector(UI.proceso)?.textContent || '-';
    const actividad = document.querySelector(UI.actividad)?.textContent || '-';
    const pdfNombre = detalleActual?.adjuntos?.[0]?.nombre || 'No adjunto';

    doc.setFontSize(18);
    doc.setTextColor(25, 120, 229);
    doc.text('Expediente de Flujograma - SIGPRO UNMSM', 20, 20);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const rows = [
        ['Tipo de proceso', tipo],
        ['Proceso', proceso],
        ['Nombre de la actividad', actividad],
        ['Documento PDF', pdfNombre]
    ];

    let y = 38;
    rows.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(value).substring(0, 120), 68, y);
        y += 8;
    });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Nota: El visor del PDF se muestra en la vista web del expediente.', 20, y + 10);

    const fileName = `Expediente_Flujograma_${document.querySelector(UI.codigoChip)?.textContent || 'SIN-CODIGO'}.pdf`;
    doc.save(fileName);
    showToast('PDF exportado correctamente', 'success');
}

function setText(selector, value) {
    const node = document.querySelector(selector);
    if (!node) return;
    node.textContent = value || '-';
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.querySelector(UI.toastContainer);
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
    toast.className = `${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px]`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icons[type]}</span>
        <span class="font-medium text-sm">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(24px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

window.exportarPDF = exportarPDF;
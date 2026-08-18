/**
 * EXPEDIENTE DE INVENTARIO - Vista de detalle
 * Con soporte para Google Sheets embed + IndexedDB adjuntos
 */

const STORAGE_KEYS = {
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista'
};

let currentExpediente = null;
let currentAdjuntos = [];
let currentPreviewUrl = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initThemeToggle();
    initProfileDropdown();
    initLogoutModal();
    await cargarPerfilDesdeBackend();
    await cargarExpediente();
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
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        profileDropdown.classList.remove('hidden');
    }

    function closeProfileDropdown() {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        profileDropdown.classList.add('hidden');
    }

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = profileDropdown.classList.contains('hidden');
        if (isHidden) openProfileDropdown(); else closeProfileDropdown();
    });

    document.addEventListener('click', () => closeProfileDropdown());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProfileDropdown();
    });
}

// ==========================================
// LOGOUT MODAL
// ==========================================

function initLogoutModal() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const logoutCancel = document.getElementById('logout-cancel');
    const logoutConfirm = document.getElementById('logout-confirm');

    if (!logoutBtn || !logoutModal) return;

    function abrirModalLogout() {
        logoutModal.classList.remove('hidden');
    }
    function cerrarModalLogout() {
        logoutModal.classList.add('hidden');
    }
    function ejecutarLogout() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('portal-inicio-facultades.html');
    }

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        abrirModalLogout();
    });
    if (logoutCancel) logoutCancel.addEventListener('click', cerrarModalLogout);
    if (logoutConfirm) logoutConfirm.addEventListener('click', ejecutarLogout);
    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) cerrarModalLogout();
    });
}

// ==========================================
// CARGAR EXPEDIENTE
// ==========================================

async function cargarExpediente() {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo') || 'INV-2026-001';

    document.getElementById('codigo-display').textContent = codigo;

    // 1. Intentar desde localStorage detalle
    const detalleRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalleMap = detalleRaw ? JSON.parse(detalleRaw) : {};
    const detalle = detalleMap[codigo];

    if (detalle && detalle.fichaData) {
        currentExpediente = detalle;
        renderizarInformacion(detalle.fichaData, codigo);
        renderizarAdjuntos(detalle.fichaData.adjuntos || detalle.adjuntos || [], codigo);
        renderizarGoogleSheets(detalle.fichaData);
        return;
    }

    // 2. Fallback: buscar en lista y construir mínimo
    const listaRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    const lista = listaRaw ? JSON.parse(listaRaw) : [];
    const doc = lista.find(d => d.codigo === codigo);

    if (doc) {
        const fichaData = {
            version: '1.0',
            fechaElaboracion: doc.fecha || new Date().toISOString().split('T')[0],
            facultad: doc.facultad || doc.nombreFacultad || 'UNMSM',
            asunto: doc.asunto || 'Inventarios',
            operacion: 'GESTIÓN DE INVENTARIO',
            documentoTecnico: doc.descripcion || `Inventario ${codigo}`
        };
        renderizarInformacion(fichaData, codigo);
        renderizarAdjuntos([], codigo);
        renderizarGoogleSheets({});
    } else {
        // 3. Demo fallback
        const demoData = {
            version: '1.0',
            fechaElaboracion: '2026-03-20',
            facultad: 'UNMSM',
            asunto: 'Inventarios',
            operacion: 'GESTIÓN DE INVENTARIO',
            documentoTecnico: 'Inventario Institucional de Procesos'
        };
        renderizarInformacion(demoData, codigo);
        renderizarAdjuntos([], codigo);
        renderizarGoogleSheets({});
    }
}

// ==========================================
// RENDERIZAR INFORMACIÓN TÉCNICA
// ==========================================

function renderizarInformacion(data, codigo) {
    setText('info-version', data.version || '-');
    setText('info-fecha', formatearFecha(data.fechaElaboracion) || '-');
    setText('info-facultad', data.facultad || data.facultadNombre || '-');
    setText('info-asunto', data.asunto || 'Inventarios');
    setText('info-operacion', data.operacion || 'GESTIÓN DE INVENTARIO');
    setText('info-documento', data.documentoTecnico || data.descripcion || `Inventario ${codigo}`);
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return fechaStr;
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ==========================================
// GOOGLE SHEETS
// ==========================================

function renderizarGoogleSheets(fichaData) {
    const container = document.getElementById('gsheets-section');
    const iframe = document.getElementById('gsheets-embed');
    const urlDisplay = document.getElementById('gsheets-url-display');
    const rangeDisplay = document.getElementById('gsheets-range-display');

    if (!container) return;

    const url = fichaData?.googleSheetsUrl || fichaData?.googleSheetsURL || '';
    const range = fichaData?.googleSheetsRange || 'A1:Z50';

    if (!url) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const embedUrl = construirGoogleSheetsEmbedUrl(url, range);
    if (embedUrl && iframe) {
        iframe.src = embedUrl;
    }

    if (urlDisplay) urlDisplay.textContent = url;
    if (rangeDisplay) rangeDisplay.textContent = range;
}

/**
 * Convierte una URL pública de Google Sheets en URL embeddable
 * Soporta:
 *   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
 *   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/pubhtml...
 */
function construirGoogleSheetsEmbedUrl(sheetsUrl, range) {
    if (!sheetsUrl) return null;

    // Extraer ID del spreadsheet
    const match = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;

    const sheetId = match[1];

    // Extraer el gid de la HOJA seleccionada
    const gidMatch = sheetsUrl.match(/[?#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    // Rango que el usuario eligió
    const selectedRange = (range || 'A1:Z50').trim();

    const params = new URLSearchParams({
        gid: gid,
        range: selectedRange,
        single: 'true',
        widget: 'true',
        headers: 'false',
        chrome: 'false'
    });

    return `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?${params.toString()}`;
}

function abrirGoogleSheetsExterno() {
    const url = document.getElementById('gsheets-url-display')?.textContent;
    if (url && url !== '-') window.open(url, '_blank');
}

function editarRangoGoogleSheets() {
    const rangeDisplay = document.getElementById('gsheets-range-display');
    const iframe = document.getElementById('gsheets-embed');
    const urlDisplay = document.getElementById('gsheets-url-display');

    if (!rangeDisplay || !iframe || !urlDisplay) {
        showToast('No se pudo acceder a la configuración de Google Sheets.', 'error');
        return;
    }

    const rangoActual = rangeDisplay.textContent.trim();

    const nuevoRango = prompt(
        'Ingrese el nuevo rango de Google Sheets:\n\nEjemplo: A1:F20',
        rangoActual
    );

    // Si presionó "Cancelar"
    if (nuevoRango === null) {
        return;
    }

    const rango = nuevoRango.trim();

    // Validar que no esté vacío
    if (!rango) {
        showToast('Debe ingresar un rango válido.', 'warning');
        return;
    }

    const url = urlDisplay.textContent.trim();

    if (!url || url === '-') {
        showToast('No hay una URL de Google Sheets configurada.', 'error');
        return;
    }

    // Construir nueva URL del iframe
    const embedUrl = construirGoogleSheetsEmbedUrl(url, rango);

    if (!embedUrl) {
        showToast('No se pudo construir la URL de Google Sheets.', 'error');
        return;
    }

    // Actualizar visualmente el rango
    rangeDisplay.textContent = rango;

    // Recargar iframe con el nuevo rango
    iframe.src = embedUrl;

    showToast(`Rango actualizado: ${rango}`, 'success');
}

// ==========================================
// ADJUNTOS + INDEXEDDB
// ==========================================

async function renderizarAdjuntos(adjuntos, codigo) {
    const container = document.getElementById('adjuntos-container');
    if (!container) return;

    currentAdjuntos = adjuntos || [];

    if (currentAdjuntos.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-4xl mb-2">folder_off</span>
                <p class="text-sm">No hay archivos adjuntos para este expediente.</p>
            </div>
        `;
        return;
    }

    // Recuperar contenido de IndexedDB si existe indexedDbId
    for (let i = 0; i < currentAdjuntos.length; i++) {
        const adj = currentAdjuntos[i];
        if (adj.indexedDbId && !adj.contenido) {
            try {
                const contenido = await recuperarAdjuntoIndexedDB(adj.indexedDbId);
                if (contenido) currentAdjuntos[i].contenido = contenido;
            } catch (e) {
                console.warn('No se pudo recuperar adjunto de IndexedDB:', e);
            }
        }
    }

    container.innerHTML = currentAdjuntos.map((adj, index) => {
        const icono = adj.icono || getFileIcon(adj.nombre);
        const tieneContenido = !!adj.contenido;
        return `
            <div class="group flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4 hover:border-primary/40 dark:hover:border-primary/40 transition-all cursor-pointer ${tieneContenido ? '' : 'opacity-75'}"
                 onclick="previsualizarAdjunto(${index})">
                <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-slate-500 dark:text-slate-400">${icono}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">${adj.nombre}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${adj.tamaño || '-'} · ${formatearFecha(adj.fecha)}</p>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${tieneContenido ? `
                        <button type="button" onclick="event.stopPropagation(); descargarAdjunto(${index})" 
                            class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-primary" title="Descargar">
                            <span class="material-symbols-outlined text-sm">download</span>
                        </button>
                    ` : ''}
                    <span class="material-symbols-outlined text-slate-300 dark:text-slate-600 text-sm">chevron_right</span>
                </div>
            </div>
        `;
    }).join('');
}

function getFileIcon(filename) {
    const ext = String(filename || '').split('.').pop().toLowerCase();
    const icons = {
        pdf: 'picture_as_pdf',
        doc: 'description', docx: 'description',
        xls: 'table_chart', xlsx: 'table_chart',
        png: 'image', jpg: 'image', jpeg: 'image',
        default: 'insert_drive_file'
    };
    return icons[ext] || icons.default;
}

function previsualizarAdjunto(index) {
    const adj = currentAdjuntos[index];
    if (!adj) return;

    const previewNombre = document.getElementById('preview-nombre');
    const previewInfo = document.getElementById('preview-info');
    const previewEmbed = document.getElementById('preview-embed');
    const previewHelper = document.getElementById('preview-helper');
    const btnDescargar = document.getElementById('btn-descargar-preview');

    if (previewNombre) previewNombre.textContent = adj.nombre;
    if (previewInfo) previewInfo.textContent = `${adj.tipo || adj.tipoMime || 'Archivo'} · ${adj.tamaño || '-'}`;
    if (previewHelper) previewHelper.classList.add('hidden');

    currentPreviewUrl = null;

    if (adj.contenido) {
        // Es base64
        currentPreviewUrl = adj.contenido;
        if (previewEmbed) previewEmbed.src = adj.contenido;
        if (btnDescargar) {
            btnDescargar.onclick = () => descargarAdjunto(index);
            btnDescargar.classList.remove('hidden');
        }
    } else if (adj.url) {
        currentPreviewUrl = adj.url;
        if (previewEmbed) previewEmbed.src = adj.url;
        if (btnDescargar) {
            btnDescargar.onclick = () => window.open(adj.url, '_blank');
            btnDescargar.classList.remove('hidden');
        }
    } else {
        if (previewEmbed) previewEmbed.src = 'about:blank';
        if (previewHelper) {
            previewHelper.classList.remove('hidden');
            previewHelper.textContent = 'No hay vista previa disponible para este archivo.';
        }
        if (btnDescargar) btnDescargar.classList.add('hidden');
    }
}

function descargarAdjunto(index) {
    const adj = currentAdjuntos[index];
    if (!adj) return;

    if (adj.contenido) {
        const link = document.createElement('a');
        link.href = adj.contenido;
        link.download = adj.nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (adj.url) {
        window.open(adj.url, '_blank');
    }
}

// ==========================================
// INDEXEDDB
// ==========================================

function openSigproIndexedDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB no disponible'));
            return;
        }
        const request = indexedDB.open('sigpro_adjuntos_db', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('adjuntos')) {
                db.createObjectStore('adjuntos', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function recuperarAdjuntoIndexedDB(id) {
    const db = await openSigproIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('adjuntos', 'readonly');
        const store = tx.objectStore('adjuntos');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result?.contenido || null);
        req.onerror = () => reject(req.error);
    });
}

// ==========================================
// EXPORTAR PDF
// ==========================================

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('Librería PDF no disponible', 'error');
        return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const codigo = document.getElementById('codigo-display')?.textContent || 'INV-000';
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 40;

    // Header
    doc.setFillColor(25, 120, 229);
    doc.rect(0, 0, pageWidth, 60, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('SIGPRO UNMSM', 40, 38);
    doc.setFontSize(10);
    doc.text('Expediente de Inventario', pageWidth - 40, 38, { align: 'right' });

    y = 80;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text(`Ficha de Inventario — ${codigo}`, 40, y);

    y += 30;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);

    const campos = [
        ['Versión', document.getElementById('info-version')?.textContent || '-'],
        ['Fecha de elaboración', document.getElementById('info-fecha')?.textContent || '-'],
        ['Facultad', document.getElementById('info-facultad')?.textContent || '-'],
        ['Asunto', document.getElementById('info-asunto')?.textContent || '-'],
        ['Operación', document.getElementById('info-operacion')?.textContent || '-'],
        ['Documento técnico', document.getElementById('info-documento')?.textContent || '-'],
    ];

    campos.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, 40, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(value), 180, y);
        y += 18;
    });

    // Adjuntos
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Archivos Adjuntos', 40, y);
    y += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (currentAdjuntos.length === 0) {
        doc.text('No hay archivos adjuntos.', 40, y);
    } else {
        currentAdjuntos.forEach(adj => {
            doc.text(`• ${adj.nombre} (${adj.tamaño || '-'})`, 40, y);
            y += 16;
        });
    }

    // Footer
    const fecha = new Date().toLocaleDateString('es-PE');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado el ${fecha} — Sistema de Racionalización SIGPRO v2.0`, 40, doc.internal.pageSize.getHeight() - 30);

    doc.save(`expediente-inventario-${codigo}.pdf`);
    showToast('PDF exportado correctamente', 'success');
}

// ==========================================
// PERFIL
// ==========================================

const PERFIL_FALLBACK = {
    nombre: 'Usuario SIGPRO',
    email: 'usuario@unmsm.edu.pe',
    iniciales: 'US',
    rol: 'Usuario',
    facultad: 'UNMSM',
    color: 'bg-blue-600'
};

function getInicialesDesdeNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return 'US';
    return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'US';
}

function getColorPorRol(rol) {
    const colores = {
        administrador: 'bg-blue-600', admin: 'bg-blue-600',
        editor: 'bg-emerald-600', visualizador: 'bg-purple-600',
        'usuario facultad': 'bg-amber-600'
    };
    return colores[String(rol || '').trim().toLowerCase()] || 'bg-slate-600';
}

function normalizarPerfil(user) {
    if (!user || typeof user !== 'object') return null;
    const email = user.correo || user.email || PERFIL_FALLBACK.email;
    const nombreBase = user.nombreCompleto || user.nombre || user.name || email.split('@')[0] || PERFIL_FALLBACK.nombre;
    const nombre = String(nombreBase).replace(/\./g, ' ').trim() || PERFIL_FALLBACK.nombre;
    return {
        nombre, email,
        iniciales: user.iniciales || getInicialesDesdeNombre(nombre),
        rol: user.cargo || user.rol || user.role || PERFIL_FALLBACK.rol,
        facultad: user.facultad || user.nombreFacultad || PERFIL_FALLBACK.facultad,
        color: user.color || getColorPorRol(user.rol)
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
        const rawStorage = localStorage.getItem('usuario') || localStorage.getItem('sigpro_usuario') || localStorage.getItem('user');
        if (rawStorage) {
            const perfilStorage = normalizarPerfil(JSON.parse(rawStorage));
            if (perfilStorage) { renderizarPerfil(perfilStorage); return; }
        }
        renderizarPerfil(PERFIL_FALLBACK);
    } catch (error) {
        renderizarPerfil(PERFIL_FALLBACK);
    }
}

// ==========================================
// TOAST
// ==========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { info: 'info', success: 'check_circle', warning: 'warning', error: 'error' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
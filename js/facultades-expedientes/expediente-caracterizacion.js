/**
 * VISOR DE CARACTERIZACION - JavaScript
 */

const _SK_MODE = (typeof CONFIG !== 'undefined' && CONFIG.MODE) ? CONFIG.MODE : 'local';

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: "sigpro_expediente_actual",
    DOCUMENTOS_DETALLE: `${_SK_MODE}_sigpro_documentos_detalle`,
    DOCUMENTOS_LISTA:   `${_SK_MODE}_sigpro_documentos_lista`
};

function getStorageItem(key) {
    const val = localStorage.getItem(key);
    if (val) return val;
    const neutralKey = key.replace(/^[^_]+_/, '');
    return localStorage.getItem(neutralKey);
}

let caracterizacionActual = null;
let codigoActual = null;

const CAMPOS_CARACTERIZACION = [
    { keys: ["codigoMacro","codigo_macro","macroCodigo","codigoMacroProceso"], label: "Codigo Macro", id: "info-codigo-macro", icono: "tag", orden: 1 },
    { keys: ["proceso","nombreProceso","procesoNombre","nombre_proceso","nombre"], label: "Proceso", id: "info-proceso", icono: "label", orden: 2 },
    { keys: ["version","versionFicha","nroVersion","nro_version"], label: "Version", id: "info-version", icono: "history", orden: 3 },
    { keys: ["tipoProcesoLabel","tipoProceso","tipo_proceso","tipo","tipoProcesoNombre"], label: "Tipo", id: "info-tipo", icono: "category", orden: 4 },
    { keys: ["unidadOrganica","unidad","unidad_organica","unidadResponsable","oficina","unidadOrganicaNombre","facultad"], label: "Unidad Organica", id: "info-unidad", icono: "business", orden: 5 },
    { keys: ["frecuencia","frecuenciaEjecucion","periodicidad"], label: "Frecuencia", id: "info-frecuencia", icono: "schedule", orden: 6 },
    { keys: ["objetivo","objetivoProceso","objetivo_proceso","objetivoDelProceso"], label: "Objetivo", id: "info-objetivo", icono: "flag", orden: 7, multiline: true },
    { keys: ["macroProceso","macroProcesoNombre","macro_proceso","macroproceso","macro"], label: "Macro Proceso", id: "info-macro", icono: "account_tree", orden: 8 },
    { keys: ["subProceso","subproceso","sub_proceso","subprocesoNombre"], label: "Subproceso", id: "info-subproceso", icono: "subdirectory_arrow_right", orden: 9 },
    { keys: ["responsable","responsableProceso","responsable_proceso","responsableNombre"], label: "Responsable", id: "info-responsable", icono: "person", orden: 10 },
    { keys: ["alcance","alcanceProceso"], label: "Alcance", id: "info-alcance", icono: "zoom_out_map", orden: 11, multiline: true },
    { keys: ["entradas","entrada","insumos","input"], label: "Entradas", id: "info-entradas", icono: "input", orden: 12, multiline: true },
    { keys: ["salidas","salida","productos","output","resultados"], label: "Salidas", id: "info-salidas", icono: "output", orden: 13, multiline: true },
    { keys: ["clientes","cliente","usuarios","beneficiarios"], label: "Clientes", id: "info-clientes", icono: "groups", orden: 14, multiline: true },
    { keys: ["proveedores","proveedor","proveedoresExternos"], label: "Proveedores", id: "info-proveedores", icono: "local_shipping", orden: 15, multiline: true },
    { keys: ["indicadoresGestion","indicadores","indicador","kpis"], label: "Indicadores de Gestion", id: "info-indicadores", icono: "monitoring", orden: 16, multiline: true },
    { keys: ["riesgos","riesgo","riesgoProceso"], label: "Riesgos", id: "info-riesgos", icono: "warning", orden: 17, multiline: true },
    { keys: ["controles","control","controlProceso"], label: "Controles", id: "info-controles", icono: "verified", orden: 18, multiline: true },
    { keys: ["fuente","fuenteInformacion","fuenteDatos"], label: "Fuente", id: "info-fuente", icono: "database", orden: 19 },
    { keys: ["fechaElaboracion","fechaCreacion","fechaRegistro","fecha"], label: "Fecha de Elaboracion", id: "info-fecha", icono: "calendar_today", orden: 20 }
];

function normalizarTexto(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function escapeHtml(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatearFecha(fecha) {
    if (!fecha || fecha === "-") return "-";
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return String(fecha);
    return parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatearValorCampo(valor, multiline) {
    if (valor === null || valor === undefined) return "-";
    const str = String(valor);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return formatearFecha(str);
    if (multiline) return escapeHtml(str).replace(/\n/g, "<br>");
    return escapeHtml(str);
}

function formatearNombreCampo(key) {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, function(s) { return s.toUpperCase(); }).replace(/_/g, " ").trim();
}

function obtenerValorCampo(data, resumenCampos, keys) {
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
            return data[key];
        }
    }
    if (Array.isArray(resumenCampos)) {
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const keyNorm = normalizarTexto(key);
            for (let j = 0; j < resumenCampos.length; j++) {
                const item = resumenCampos[j];
                const itemLabel = normalizarTexto(item.label || item.campo || item.nombre || "");
                if (itemLabel === keyNorm || itemLabel.indexOf(keyNorm) >= 0 || keyNorm.indexOf(itemLabel) >= 0) {
                    if (item.valor !== undefined && item.valor !== null && String(item.valor).trim() !== "") {
                        return item.valor;
                    }
                }
            }
        }
    }
    return null;
}

function extractGoogleSheetsId(url) {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

async function cargarDatosGoogleSheets(sheetId, range, gid) {
    gid = gid || 0;
    range = range || "A1:Z100";
    const url = "https://docs.google.com/spreadsheets/d/" + sheetId + "/gviz/tq?tqx=out:json&range=" + encodeURIComponent(range) + "&gid=" + gid;
    try {
        const response = await fetch(url);
        const text = await response.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/s);
        if (jsonMatch) return JSON.parse(jsonMatch[1]);
    } catch (e) {
        console.warn("Error cargando Google Sheets:", e);
    }
    return null;
}

function base64ToBlobUrl(base64String, contentType) {
    contentType = contentType || "application/pdf";
    const cleanBase64 = base64String.replace(/^data:[^;]+;base64,/, "");
    try {
        const byteCharacters = atob(cleanBase64);
        const byteArrays = [];
        const sliceSize = 512;
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
            byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: contentType });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Error base64:", e);
        return null;
    }
}

function esBase64(str) {
    if (!str || typeof str !== "string") return false;
    const clean = str.replace(/^data:[^;]+;base64,/, "");
    return /^[A-Za-z0-9+/]*={0,2}$/.test(clean) && clean.length > 100;
}

function obtenerExtension(nombre, src) {
    if (src && /^data:image\//.test(src)) {
        const match = src.match(/^data:image\/(\w+);/);
        return match ? match[1] : "png";
    }
    if (src && /^data:application\/pdf/.test(src)) return "pdf";
    return (nombre.split(".").pop() || "").toLowerCase();
}

document.addEventListener("DOMContentLoaded", function() {
    initTheme();
    initThemeToggle();
    initProfile();  
    if (!cargarCaracterizacion()) {
        mostrarEstadoVacio();
        return;
    }
    renderizarTodo();
});

function initTheme() {
    const currentTheme = localStorage.getItem("theme") || "light";
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
}

function initThemeToggle() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function() {
        const html = document.documentElement;
        const isDark = html.classList.toggle("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        showToast("Modo " + (isDark ? "oscuro" : "claro") + " activado", "info");
    });
}

function cargarCaracterizacion() {
    const codigoDesdeURL = new URLSearchParams(window.location.search).get("codigo");
    const actualRaw = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    const actual = actualRaw ? JSON.parse(actualRaw) : null;
    codigoActual = codigoDesdeURL || actual?.codigo || null;

    const detalleMapRaw = getStorageItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalleMap = detalleMapRaw ? JSON.parse(detalleMapRaw) : {};

    if (codigoActual && detalleMap[codigoActual]?.tipo === "caracterizacion") {
        caracterizacionActual = construirModelo(codigoActual, detalleMap[codigoActual]);
        return true;
    }

    const primera = Object.entries(detalleMap).find(function(e) {
        return e[1]?.tipo === "caracterizacion";
    });
    if (primera) {
        codigoActual = primera[0];
        caracterizacionActual = construirModelo(codigoActual, primera[1]);
        return true;
    }
    return false;
}

function construirModelo(codigo, detalle) {
    const resumen = Array.isArray(detalle?.resumenCampos) ? detalle.resumenCampos : [];
    const fichaData = detalle?.fichaData || {};
    const docsRaw = getStorageItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    const docs = docsRaw ? JSON.parse(docsRaw) : [];
    const doc = docs.find(function(item) { return item.codigo === codigo; }) || {};

    const gsUrl = fichaData?.googleSheetsUrl || doc?.googleSheetsUrl || detalle?.googleSheetsUrl || null;
    const gsRange = fichaData?.googleSheetsRange || doc?.googleSheetsRange || detalle?.googleSheetsRange || "A1:Z100";

    return {
        codigo: codigo,
        titulo: detalle?.titulo || fichaData?.nombreProceso || fichaData?.procesoNombre || fichaData?.macroProcesoNombre || "Caracterizacion " + codigo,
        fechaRegistro: detalle?.fechaRegistro || doc?.fecha || fichaData?.fechaElaboracion || new Date().toISOString().split("T")[0],
        estado: doc?.estado || detalle?.estado || "aprobado",
        fichaData: fichaData,
        resumenCampos: resumen,
        adjuntos: Array.isArray(detalle?.adjuntos) ? detalle.adjuntos : [],
        googleSheetsUrl: gsUrl,
        googleSheetsRange: gsRange,
        googleSheetsId: gsUrl ? extractGoogleSheetsId(gsUrl) : null
    };
}

function renderizarTodo() {
    renderizarCabecera();
    renderizarInfoTecnica();
    if (caracterizacionActual.googleSheetsUrl) {
        renderizarGoogleSheets();
    }
    renderizarAdjuntos();
    ocultarSeccionesNoAplicables();
    document.title = caracterizacionActual.titulo + " - Expediente | SIGPRO UNMSM";
}

function renderizarCabecera() {
    const estado = caracterizacionActual.estado || "pendiente";
    const isAprobado = normalizarTexto(estado) === "aprobado" || normalizarTexto(estado) === "completado";

    const badge = document.getElementById("estado-badge");
    if (badge) {
        const cfg = isAprobado
            ? { text: "Aprobado", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" }
            : { text: "Pendiente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800" };
        badge.textContent = cfg.text;
        badge.className = "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide " + cfg.cls;
    }

    const fechaEl = document.getElementById("fecha-display");
    if (fechaEl) fechaEl.textContent = formatearFecha(caracterizacionActual.fechaRegistro);

    const codigoEl = document.getElementById("codigo-display");
    if (codigoEl) codigoEl.textContent = caracterizacionActual.codigo || "-";

    const tituloEl = document.getElementById("titulo-display");
    if (tituloEl) tituloEl.textContent = caracterizacionActual.titulo;
}

function renderizarInfoTecnica() {
    const data = caracterizacionActual.fichaData || {};
    const resumen = caracterizacionActual.resumenCampos || [];
    const grid = document.getElementById("info-tecnica-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const camposEncontrados = [];
    const camposProcesados = new Set();

    CAMPOS_CARACTERIZACION.forEach(function(config) {
        const valor = obtenerValorCampo(data, resumen, config.keys);
        if (valor !== null && valor !== undefined && String(valor).trim() !== "" && String(valor).trim() !== "-") {
            camposEncontrados.push(Object.assign({}, config, { valor: valor }));
            config.keys.forEach(function(k) { camposProcesados.add(k); });
        }
    });

    Object.entries(data).forEach(function(entry) {
        const key = entry[0];
        const value = entry[1];
        if (camposProcesados.has(key)) return;
        if (value === null || value === undefined) return;
        if (typeof value === "object") return;
        const strVal = String(value).trim();
        if (strVal === "" || strVal === "-") return;
        if (key.toLowerCase().indexOf("url") >= 0 || key.toLowerCase().indexOf("sheets") >= 0 || key.toLowerCase().indexOf("range") >= 0) return;

        camposEncontrados.push({
            label: formatearNombreCampo(key),
            id: "info-extra-" + key,
            icono: "text_snippet",
            valor: value,
            orden: 99,
            multiline: strVal.length > 60
        });
    });

    if (Array.isArray(resumen)) {
        resumen.forEach(function(item) {
            const key = item.label || item.campo || item.nombre;
            const value = item.valor || item.value;
            if (!key || value === undefined || value === null) return;
            const strVal = String(value).trim();
            if (strVal === "" || strVal === "-") return;

            const keyNorm = normalizarTexto(key);
            const yaProcesado = camposEncontrados.some(function(c) {
                return normalizarTexto(c.label) === keyNorm ||
                    (c.keys && c.keys.some(function(k) { return normalizarTexto(k) === keyNorm; }));
            });
            if (yaProcesado) return;

            camposEncontrados.push({
                label: key,
                id: "info-resumen-" + keyNorm.replace(/\s+/g, "-"),
                icono: "text_snippet",
                valor: value,
                orden: 99,
                multiline: strVal.length > 60
            });
        });
    }

    camposEncontrados.sort(function(a, b) {
        return (a.orden || 99) - (b.orden || 99);
    });

    camposEncontrados.forEach(function(campo, index) {
        const valorFormateado = formatearValorCampo(campo.valor, campo.multiline);
        const delay = index * 60;
        const multilineClass = campo.multiline ? "leading-relaxed whitespace-pre-line" : "truncate";

        const html = '<div class="flex flex-col gap-1.5 border-l-[3px] border-primary/30 pl-3 py-1 opacity-0" style="animation:fadeInUp 0.35s ease ' + delay + 'ms forwards;">' +
            '<p class="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">' + escapeHtml(campo.label) + '</p>' +
            '<p class="text-slate-800 dark:text-slate-200 text-sm font-semibold ' + multilineClass + '">' + valorFormateado + '</p>' +
        '</div>';
        grid.insertAdjacentHTML("beforeend", html);
    });

    if (caracterizacionActual.googleSheetsUrl) {
        const url = caracterizacionActual.googleSheetsUrl;
        const gsHtml = '<div class="flex flex-col gap-1.5 border-l-[3px] border-green-400/50 pl-3 py-1 opacity-0" style="animation:fadeInUp 0.35s ease ' + (camposEncontrados.length * 60) + 'ms forwards;">' +
            '<p class="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Google Sheets</p>' +
            '<div class="flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-green-600 text-sm">table_chart</span>' +
                '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 underline underline-offset-2 truncate">' +
                    'Ver hoja de calculo vinculada' +
                '</a>' +
            '</div>' +
        '</div>';
        grid.insertAdjacentHTML("beforeend", gsHtml);
    }

    if (camposEncontrados.length === 0 && !caracterizacionActual.googleSheetsUrl) {
        grid.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400">' +
            '<span class="material-symbols-outlined text-4xl mb-2">info</span>' +
            '<p class="text-sm">No se encontraron datos tecnicos.</p>' +
        '</div>';
    }
}

async function renderizarGoogleSheets() {
    const url = caracterizacionActual.googleSheetsUrl;
    const range = caracterizacionActual.googleSheetsRange || "A1:Z100";
    const sheetId = caracterizacionActual.googleSheetsId;

    if (!url || !sheetId) return;

    const section = document.getElementById("google-sheets-section");
    if (!section) return;

    const urlDisplay = document.getElementById("gs-url-display");
    if (urlDisplay) {
        const shortUrl = url.replace(/^https:\/\//, "").replace(/\/edit.*$/, "");
        urlDisplay.textContent = shortUrl;
        urlDisplay.title = url;
    }

    const content = document.getElementById("gs-content");
    if (!content) return;

    content.innerHTML = '<div class="flex flex-col items-center justify-center py-16">' +
        '<span class="material-symbols-outlined text-4xl text-slate-300 animate-pulse">table_chart</span>' +
        '<p class="text-sm text-slate-500 mt-2">Cargando datos de la hoja...</p>' +
        '<p class="text-xs text-slate-400 mt-1 font-mono">Rango: ' + escapeHtml(range) + '</p>' +
    '</div>';

    try {
        const sheetData = await cargarDatosGoogleSheets(sheetId, range);
        if (sheetData && sheetData.table && sheetData.table.cols && sheetData.table.cols.length > 0) {
            renderizarTablaGoogleSheets(sheetData, content);
        } else {
            mostrarFallbackGS(content, "No se pudieron cargar los datos del rango especificado.");
        }
    } catch (e) {
        console.error("Error GS:", e);
        mostrarFallbackGS(content, "Error al cargar los datos. Verifica que la hoja este publicada.");
    }
}

function renderizarTablaGoogleSheets(data, container) {
    const cols = data.table.cols;
    const rows = data.table.rows;

    if (!cols.length || !rows.length) {
        mostrarFallbackGS(container, "El rango seleccionado no contiene datos.");
        return;
    }

    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    let html = '<table class="gs-table w-full text-left border-collapse">' +
        '<thead><tr>' +
        '<th class="text-center w-10 text-slate-400 font-normal">#</th>';

    cols.forEach(function(col, i) {
        html += '<th>' + escapeHtml(col.label || letras[i] || "") + '</th>';
    });
    html += '</tr></thead><tbody>';

    rows.forEach(function(row, rowIndex) {
        html += '<tr>' +
            '<td class="text-center font-mono text-slate-400 text-xs">' + (rowIndex + 1) + '</td>';
        row.c.forEach(function(cell) {
            const value = cell ? (cell.f || cell.v || "") : "";
            const strVal = String(value);
            const isEstado = normalizarTexto(strVal) === "aprobado";
            const cellContent = isEstado
                ? '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">' + escapeHtml(strVal) + '</span>'
                : escapeHtml(strVal);
            html += '<td>' + cellContent + '</td>';
        });
        const missing = cols.length - (row.c ? row.c.length : 0);
        for (let m = 0; m < missing; m++) {
            html += '<td></td>';
        }
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function mostrarFallbackGS(container, mensaje) {
    const url = caracterizacionActual?.googleSheetsUrl || "";
    container.innerHTML = '<div class="flex flex-col items-center justify-center py-12 px-8 text-center">' +
        '<span class="material-symbols-outlined text-5xl text-slate-300 mb-3">table_chart</span>' +
        '<p class="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">Vista previa no disponible</p>' +
        '<p class="text-sm text-slate-500 mb-4 max-w-md">' + escapeHtml(mensaje || "La hoja no puede mostrarse.") + '</p>' +
        '<ul class="text-sm text-slate-500 mb-6 text-left max-w-md list-disc list-inside space-y-1">' +
            '<li>La hoja debe estar publicada como pagina web</li>' +
            '<li>Los permisos deben permitir acceso publico</li>' +
            '<li>Verifica que el enlace sea valido</li>' +
        '</ul>' +
        '<div class="flex flex-wrap gap-3 justify-center">' +
            '<button onclick="abrirGoogleSheets()" class="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-all shadow-sm flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-base">open_in_new</span> Abrir en Google Sheets' +
            '</button>' +
            '<button onclick="copiarEnlaceGoogleSheets()" class="px-5 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-base">content_copy</span> Copiar enlace' +
            '</button>' +
        '</div>' +
    '</div>';
}

window.abrirGoogleSheets = function() {
    const url = caracterizacionActual?.googleSheetsUrl;
    if (!url) { showToast("No hay enlace disponible", "warning"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
    showToast("Abriendo Google Sheets...", "success");
};

window.copiarEnlaceGoogleSheets = function() {
    const url = caracterizacionActual?.googleSheetsUrl;
    if (!url) { showToast("No hay enlace para copiar", "warning"); return; }
    navigator.clipboard.writeText(url).then(function() {
        showToast("Enlace copiado al portapapeles", "success");
    }).catch(function() {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("Enlace copiado al portapapeles", "success");
    });
};

function renderizarAdjuntos() {
    const adjuntos = caracterizacionActual.adjuntos || [];
    const container = document.getElementById("caracterizacion-adjuntos");
    if (!container) return;

    if (!adjuntos.length) {
        container.innerHTML = '<p class="text-sm text-slate-500 dark:text-slate-400">No hay archivos adjuntos registrados.</p>';
        return;
    }

    const adjunto = adjuntos[0];
    const srcRaw = adjunto.contenido || adjunto.url || adjunto.dataUrl || adjunto.src || "";
    const nombre = adjunto.nombre || "Documento";
    const ext = obtenerExtension(nombre, srcRaw);
    const esImagen = ["jpg","jpeg","png","gif","webp","bmp","svg"].indexOf(ext) >= 0 || /^data:image/.test(srcRaw);
    const esPdf = ext === "pdf" || /^data:application\/pdf/.test(srcRaw);

    let src = srcRaw;
    let blobUrl = null;
    if (esBase64(srcRaw)) {
        const mime = esImagen ? "image/" + (ext === "svg" ? "svg+xml" : ext) : esPdf ? "application/pdf" : "application/octet-stream";
        blobUrl = base64ToBlobUrl(srcRaw, mime);
        if (blobUrl) src = blobUrl;
    }

    const icono = esPdf ? "picture_as_pdf" : esImagen ? "image" : "insert_drive_file";
    const colorIcono = esPdf ? "text-red-500" : esImagen ? "text-blue-500" : "text-slate-500";

    container.innerHTML = '<div id="visor-adjunto" class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">' +
        '<div class="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">' +
            '<div class="flex items-center gap-2">' +
                '<span class="material-symbols-outlined ' + colorIcono + ' text-sm">' + icono + '</span>' +
                '<span class="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[300px]">' + escapeHtml(nombre) + '</span>' +
            '</div>' +
            '<div class="flex items-center gap-2">' +
                '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Aprobado</span>' +
                '<button onclick="descargarAdjunto()" class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Descargar">' +
                    '<span class="material-symbols-outlined text-slate-500 text-sm">download</span>' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div id="visor-contenido" class="relative bg-slate-100 dark:bg-slate-950 flex items-center justify-center" style="min-height:400px;"></div>' +
    '</div>';

    const visor = document.getElementById("visor-contenido");
    if (!visor) return;

    if (esImagen && src) {
        visor.innerHTML = '<img src="' + src + '" alt="' + escapeHtml(nombre) + '" class="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg" ' +
            'onerror="this.onerror=null;this.parentNode.innerHTML=\'<div class=flex flex-col items-center text-slate-400><span class=material-symbols-outlined text-5xl mb-2>broken_image</span><p>Error al cargar</p></div>\'">';
    } else if (esPdf && src) {
        visor.innerHTML = '<iframe src="' + src + '#toolbar=1" type="application/pdf" class="w-full" style="height:500px;border:none;background:white;"></iframe>';
        setTimeout(function() {
            const iframe = visor.querySelector("iframe");
            if (iframe) {
                iframe.onerror = function() {
                    mostrarFallbackAdjunto(visor, nombre, src, blobUrl || srcRaw);
                };
            }
        }, 3000);
    } else {
        mostrarFallbackAdjunto(visor, nombre, src, blobUrl || srcRaw);
    }

    window.descargarAdjunto = function() {
        if (!srcRaw) { showToast("Sin contenido disponible", "warning"); return; }
        const link = document.createElement("a");
        link.href = src;
        link.download = nombre;
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast("Descarga iniciada", "success");
    };
}

function mostrarFallbackAdjunto(container, nombre, src, srcOriginal) {
    const puedeAbrir = src && (src.indexOf("blob:") === 0 || src.indexOf("http") === 0 || src.indexOf("data:") === 0);
    container.innerHTML = '<div class="flex flex-col items-center justify-center py-12 text-slate-500 text-center px-8">' +
        '<span class="material-symbols-outlined text-6xl mb-4 text-slate-300">picture_as_pdf</span>' +
        '<p class="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">' + escapeHtml(nombre) + '</p>' +
        '<p class="text-sm text-slate-400 mb-6">Vista previa no disponible para este navegador.</p>' +
        '<div class="flex flex-wrap gap-3 justify-center">' +
            (puedeAbrir ? '<button onclick="window.open(\'' + src + '\',\'_blank\')" class="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-base">open_in_new</span> Abrir' +
            '</button>' : '') +
            '<button onclick="descargarAdjunto()" class="px-5 py-2 rounded-lg border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">' +
                '<span class="material-symbols-outlined text-base">download</span> Descargar' +
            '</button>' +
        '</div>' +
    '</div>';
}

function ocultarSeccionesNoAplicables() {
    const seguimiento = document.getElementById("tabla-seguimiento");
    if (seguimiento) {
        const section = seguimiento.closest("section");
        if (section) { section.style.display = "none"; }
    }
    const graficos = document.getElementById("grafico-tendencia");
    if (graficos) {
        const grid = graficos.closest(".grid");
        if (grid) { grid.style.display = "none"; }
    }
}

function mostrarEstadoVacio() {
    showToast("No se encontro informacion de caracterizacion", "warning", 5000);
    const codigo = document.getElementById("codigo-display");
    if (codigo) codigo.textContent = "SIN DATOS";
}

function exportarPDF() {
    if (!caracterizacionActual) { showToast("No hay informacion para exportar", "warning"); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { showToast("Generador de PDF no disponible", "error"); return; }

    try {
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF("p", "mm", "a4");

        doc.setFontSize(16);
        doc.setTextColor(25, 120, 229);
        doc.text("Expediente de Caracterizacion - SIGPRO", 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const data = caracterizacionActual.fichaData || {};
        let campos = [
            ["Codigo", caracterizacionActual.codigo],
            ["Titulo", caracterizacionActual.titulo],
            ["Estado", formatearEstado(caracterizacionActual.estado)],
            ["Fecha", formatearFecha(caracterizacionActual.fechaRegistro)],
            ["Google Sheets", caracterizacionActual.googleSheetsUrl || "No vinculado"]
        ];

        CAMPOS_CARACTERIZACION.forEach(function(config) {
            const valor = obtenerValorCampo(data, caracterizacionActual.resumenCampos || [], config.keys);
            if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
                campos.push([config.label, String(valor)]);
            }
        });

        let y = 32;
        campos.forEach(function(campo) {
            doc.setFont(undefined, "bold");
            doc.text(campo[0] + ":", 20, y);
            doc.setFont(undefined, "normal");
            const lines = doc.splitTextToSize(String(campo[1] || "-").substring(0, 180), 120);
            doc.text(lines, 65, y);
            y += Math.max(lines.length * 4.5, 6);
            if (y > 270) { doc.addPage(); y = 20; }
        });

        doc.save("Expediente_Caracterizacion_" + (caracterizacionActual.codigo || "SIGPRO") + ".pdf");
        showToast("PDF exportado correctamente", "success");
    } catch (error) {
        console.error(error);
        showToast("Error al exportar PDF", "error");
    }
}

function formatearEstado(estado) {
    const value = normalizarTexto(estado);
    if (value === "completado" || value === "aprobado") return "APROBADO";
    if (value === "en_proceso") return "EN PROCESO";
    if (value === "pendiente") return "PENDIENTE";
    return String(estado || "APROBADO").toUpperCase();
}

function showToast(message, type, duration) {
    type = type || "info";
    duration = duration || 3000;
    const container = document.getElementById("toast-container");
    if (!container) return;
    const icons = { info: "info", success: "check_circle", warning: "warning", error: "error" };
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = '<span class="material-symbols-outlined">' + (icons[type] || icons.info) + '</span><span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
        toast.classList.add("hiding");
        setTimeout(function() { toast.remove(); }, 250);
    }, duration);
}

// ============================================================
// PERFIL / DROPDOWN DE USUARIO
// ============================================================

function initProfile() {
    const btn = document.getElementById('profile-btn');
    const menu = document.getElementById('profile-dropdown');
    if (!btn || !menu) return;

    // 1. Obtener datos del usuario
    let user = null;
    try {
        if (typeof API !== 'undefined' && API.auth && typeof API.auth.getUser === 'function') {
            user = API.auth.getUser();
        }
    } catch (e) { /* silent */ }

    // Fallback a localStorage si API no responde
    const userName = user?.nombre || user?.name || user?.username || localStorage.getItem('sigpro_user_name') || localStorage.getItem('current_user_name') || 'Usuario';
    const userEmail = user?.correo || user?.email || localStorage.getItem('sigpro_user_email') || 'usuario@unmsm.edu.pe';
    const userRole = user?.rol || user?.role || 'Usuario Facultad';
    const facultyName = user?.facultad || user?.nombreFacultad || localStorage.getItem('current_faculty_name') || 'Facultad';

    // 2. Iniciales para el avatar
    const initials = String(userName)
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    // 3. Renderizar dropdown con datos reales
    menu.innerHTML = `
        <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">${escapeHtml(initials)}</div>
            <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(userName)}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(userEmail)}</p>
            </div>
        </div>
        <div class="flex flex-wrap gap-2 mb-3">
            <span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">${escapeHtml(userRole)}</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">${escapeHtml(facultyName)}</span>
        </div>
        <div class="border-t border-slate-200 dark:border-slate-700 my-2"></div>
        <a href="facultades-configuracion.html" class="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <span class="material-symbols-outlined text-base">settings</span>
            Configuración
        </a>
        <a href="facultades-cambiar-facultad.html" class="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <span class="material-symbols-outlined text-base">domain</span>
            Cambiar facultad
        </a>
        <div class="border-t border-slate-200 dark:border-slate-700 my-2"></div>
        <button id="btn-logout" class="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <span class="material-symbols-outlined text-base">logout</span>
            Cerrar sesión
        </button>
    `;

    // 4. Toggle del dropdown
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', function(e) {
        if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    // 5. Cerrar sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async function() {
            try {
                if (typeof API !== 'undefined' && API.auth && typeof API.auth.logout === 'function') {
                    await API.auth.logout();
                }
            } catch (e) { /* silent */ }
            
            // Limpiar sesión local
            const keysToRemove = [
                'sigpro_expediente_actual',
                'sigpro_user_name',
                'sigpro_user_email',
                'current_user_name',
                'theme'
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
            
            showToast('Sesión cerrada correctamente', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        });
    }
}

// Alias por si otro modulo la llama con nombre largo
window.construirModeloCaracterizacion = construirModelo;
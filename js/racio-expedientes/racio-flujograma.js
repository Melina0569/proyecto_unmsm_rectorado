const STORAGE_KEYS = {
    DOCUMENTOS_LISTA: "sigpro_documentos_lista",
    DOCUMENTOS_DETALLE: "sigpro_documentos_detalle"
};

const FLUJOGRAMA_KEYS = {
    EXPEDIENTE_ACTUAL: "sigpro_expediente_actual"
};

const FLUJOGRAMA_REFRESH_MS = 5000;

const realtimeState = {
    lastSignature: ""
};

// Ruta base para archivos PDF en modo local/demo
const PDF_BASE_PATH = "docs/pdfs/";

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function formatDate(value) {
    if (!value) return "-";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function statusLabel(value) {
    var text = normalizeText(value);
    if (text.indexOf("aprob") !== -1 || text.indexOf("complet") !== -1) return "Aprobado";
    if (text.indexOf("proceso") !== -1) return "En proceso";
    return "Pendiente";
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUIR URL COMPLETA DEL PDF
// ═══════════════════════════════════════════════════════════════

function construirPdfUrl(valorCrudo) {
    if (!valorCrudo || String(valorCrudo).trim() === "") {
        return null;
    }

    var url = String(valorCrudo).trim();

    // Caso 1: Ya es una URL completa (http/https)
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    // Caso 2: Es una ruta absoluta (/docs/pdfs/...)
    if (url.startsWith("/")) {
        return url;
    }

    // Caso 3: Es base64 (data URI)
    if (url.startsWith("data:")) {
        return url;
    }

    // Normalizar separadores y quitar slash inicial para rutas relativas
    url = url.replace(/\\/g, "/").replace(/^\/+/, "");

    // Evitar duplicados tipo: docs/pdfs/docs/pdfs/archivo.pdf
    url = url.replace(/^(docs\/pdfs\/)+/i, "docs/pdfs/");

    // Si ya viene con carpeta flujogramas/fichas, respetar ruta
    if (/^docs\/pdfs\/(flujogramas|fichas)\//i.test(url)) {
        return url;
    }

    // Si viene como docs/pdfs/archivo.pdf, asumir flujogramas para esta vista
    if (/^docs\/pdfs\//i.test(url)) {
        var fileNameInDocs = url.replace(/^docs\/pdfs\//i, "");
        return "docs/pdfs/flujogramas/" + fileNameInDocs;
    }

    // Caso 4: Es solo un nombre de archivo (FLUJOGRAMA.pdf)
    // Construir ruta relativa para flujogramas
    return "docs/pdfs/flujogramas/" + url;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACCIÓN DE PDF - LÓGICA COMPLETA CON BASE64
// ═══════════════════════════════════════════════════════════════

function extraerPdfData(doc, detalle) {
    var resultado = {
        url: null,
        nombre: null,
        tipo: "application/pdf",
        esBase64: false
    };

    // 1. Buscar adjuntos en detalle (estructura del archivo de referencia)
    if (detalle) {
        // Buscar en adjuntos array
        if (detalle.adjuntos && Array.isArray(detalle.adjuntos) && detalle.adjuntos.length > 0) {
            var adjunto = detalle.adjuntos[0];
            resultado.nombre = adjunto.nombre || adjunto.name || "Documento.pdf";
            
            // Priorizar contenido base64
            if (adjunto.contenido) {
                resultado.url = normalizarBase64(adjunto.contenido, resultado.nombre);
                resultado.esBase64 = resultado.url.startsWith("data:");
                return resultado;
            }
            if (adjunto.url) {
                resultado.url = construirPdfUrl(adjunto.url);
                return resultado;
            }
            if (adjunto.dataUrl) {
                resultado.url = adjunto.dataUrl;
                resultado.esBase64 = true;
                return resultado;
            }
            if (adjunto.base64) {
                resultado.url = normalizarBase64(adjunto.base64, resultado.nombre);
                resultado.esBase64 = true;
                return resultado;
            }
        }

        // Buscar en archivos array
        if (detalle.archivos && Array.isArray(detalle.archivos) && detalle.archivos.length > 0) {
            var archivo = detalle.archivos[0];
            resultado.nombre = archivo.nombre || archivo.name || "Documento.pdf";
            
            if (archivo.contenido) {
                resultado.url = normalizarBase64(archivo.contenido, resultado.nombre);
                resultado.esBase64 = resultado.url.startsWith("data:");
                return resultado;
            }
            if (archivo.url) {
                resultado.url = construirPdfUrl(archivo.url);
                return resultado;
            }
            if (archivo.dataUrl) {
                resultado.url = archivo.dataUrl;
                resultado.esBase64 = true;
                return resultado;
            }
        }

        // Buscar en fichaData
        var fichaData = detalle.fichaData || detalle.flujogramaData || detalle.flujoData || {};
        if (fichaData.adjuntos && Array.isArray(fichaData.adjuntos) && fichaData.adjuntos.length > 0) {
            var fichaAdj = fichaData.adjuntos[0];
            resultado.nombre = fichaAdj.nombre || fichaAdj.name || "Documento.pdf";
            
            if (fichaAdj.contenido) {
                resultado.url = normalizarBase64(fichaAdj.contenido, resultado.nombre);
                resultado.esBase64 = resultado.url.startsWith("data:");
                return resultado;
            }
            if (fichaAdj.url) {
                resultado.url = construirPdfUrl(fichaAdj.url);
                return resultado;
            }
        }
    }

    // 2. Buscar en el documento directamente
    var candidatosDoc = [
        { prop: doc.pdfUrl, nombre: doc.archivoNombre || doc.nombreArchivo },
        { prop: doc.urlDocumento, nombre: doc.archivoNombre || doc.nombreArchivo },
        { prop: doc.archivoUrl, nombre: doc.archivoNombre || doc.nombreArchivo },
        { prop: doc.fileUrl, nombre: doc.fileName || doc.archivoNombre },
        { prop: doc.downloadUrl, nombre: doc.archivoNombre || doc.nombreArchivo }
    ];

    for (var i = 0; i < candidatosDoc.length; i++) {
        if (candidatosDoc[i].prop && String(candidatosDoc[i].prop).trim() !== "") {
            resultado.url = construirPdfUrl(candidatosDoc[i].prop);
            resultado.nombre = candidatosDoc[i].nombre || "Documento.pdf";
            return resultado;
        }
    }

    // 3. Buscar en resumenCampos
    if (detalle && Array.isArray(detalle.resumenCampos)) {
        for (var k = 0; k < detalle.resumenCampos.length; k++) {
            var campo = detalle.resumenCampos[k];
            var label = String(campo.label || "").toLowerCase().trim();
            if (label.indexOf("pdf") !== -1 || label.indexOf("url") !== -1 || 
                label.indexOf("archivo") !== -1 || label.indexOf("documento") !== -1) {
                if (campo.value && String(campo.value).trim() !== "") {
                    resultado.url = construirPdfUrl(campo.value);
                    resultado.nombre = "Documento.pdf";
                    return resultado;
                }
            }
        }
    }

    return resultado;
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZAR BASE64 A DATA URL
// ═══════════════════════════════════════════════════════════════

function normalizarBase64(valor, nombreArchivo) {
    if (!valor) return null;
    
    var str = String(valor).trim();
    
    // Si ya es data URL, retornar tal cual
    if (str.startsWith("data:")) {
        return str;
    }
    
    // Limpiar espacios y saltos de línea del base64
    var cleaned = str.replace(/\s/g, '');
    
    // Verificar que sea base64 válido
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
        // No es base64, podría ser una URL
        return construirPdfUrl(str);
    }
    
    // Determinar MIME type por extensión
    var ext = (nombreArchivo || 'archivo.pdf').split('.').pop().toLowerCase();
    var mimeMap = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp'
    };
    var mimeType = mimeMap[ext] || 'application/octet-stream';
    
    return 'data:' + mimeType + ';base64,' + cleaned;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACCIÓN DE NOMBRE DE ARCHIVO
// ═══════════════════════════════════════════════════════════════

function extraerArchivoNombre(doc, detalle, pdfData) {
    if (pdfData && pdfData.nombre) {
        return pdfData.nombre;
    }

    var candidatos = [
        doc.archivoNombre,
        doc.nombreArchivo,
        doc.fileName,
        doc.nombreDocumento
    ];

    for (var i = 0; i < candidatos.length; i++) {
        if (candidatos[i] && String(candidatos[i]).trim() !== "") {
            return String(candidatos[i]).trim();
        }
    }

    if (detalle) {
        var flujoData = detalle.flujogramaData || detalle.flujoData || detalle.datosFlujograma || {};
        var detalleCandidatos = [
            flujoData.archivoNombre,
            flujoData.nombreArchivo,
            flujoData.fileName,
            detalle.archivoNombre,
            detalle.nombreArchivo
        ];

        for (var j = 0; j < detalleCandidatos.length; j++) {
            if (detalleCandidatos[j] && String(detalleCandidatos[j]).trim() !== "") {
                return String(detalleCandidatos[j]).trim();
            }
        }
    }

    if (pdfData && pdfData.url) {
        var partes = pdfData.url.split("/");
        var nombre = partes[partes.length - 1];
        if (nombre && nombre.indexOf(".") !== -1) {
            return decodeURIComponent(nombre);
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACCIÓN DE TIPO DE PROCESO
// ═══════════════════════════════════════════════════════════════

function extraerTipoProceso(doc, detalle) {
    var candidatosDoc = [
        doc.tipoProceso,
        doc.tipo_proceso,
        doc.procesoTipo,
        doc.tipoDeProceso,
        doc.clasificacionProceso,
        doc.categoriaProceso
    ];
    
    for (var i = 0; i < candidatosDoc.length; i++) {
        if (candidatosDoc[i] && String(candidatosDoc[i]).trim() !== "") {
            var valor = String(candidatosDoc[i]).trim().toLowerCase();
            if (valor !== "flujograma" && valor !== "indicador" && valor !== "inventario" && 
                valor !== "caracterizacion" && valor !== "reporte" && valor !== "documento") {
                return String(candidatosDoc[i]).trim();
            }
        }
    }

    if (detalle) {
        var fichaData = detalle.fichaData || {};
        var candidatosDetalle = [
            fichaData.tipoProceso,
            fichaData.tipo_proceso,
            fichaData.procesoTipo,
            detalle.tipoProceso,
            detalle.tipo_proceso,
            detalle.procesoTipo
        ];
        
        for (var j = 0; j < candidatosDetalle.length; j++) {
            if (candidatosDetalle[j] && String(candidatosDetalle[j]).trim() !== "") {
                var valor = String(candidatosDetalle[j]).trim().toLowerCase();
                if (valor !== "flujograma" && valor !== "indicador" && valor !== "inventario" && 
                    valor !== "caracterizacion" && valor !== "reporte" && valor !== "documento") {
                    return String(candidatosDetalle[j]).trim();
                }
            }
        }
    }

    if (detalle && Array.isArray(detalle.resumenCampos)) {
        for (var k = 0; k < detalle.resumenCampos.length; k++) {
            var campo = detalle.resumenCampos[k];
            var label = String(campo.label || "").toLowerCase().trim();
            if (label === "tipo de proceso" || label === "tipoproceso" || label === "tipo_proceso") {
                if (campo.value && String(campo.value).trim() !== "") {
                    var valor = String(campo.value).trim().toLowerCase();
                    if (valor !== "flujograma" && valor !== "indicador" && valor !== "inventario" && 
                        valor !== "caracterizacion" && valor !== "reporte") {
                        return String(campo.value).trim();
                    }
                }
            }
        }
    }

    var proceso = extraerProceso(doc, detalle);
    if (proceso) {
        var procesoLower = proceso.toLowerCase();
        if (procesoLower.indexOf("estrateg") !== -1) return "Estratégico";
        if (procesoLower.indexOf("mision") !== -1) return "Misional";
        if (procesoLower.indexOf("apoyo") !== -1 || procesoLower.indexOf("soport") !== -1) return "De Apoyo";
        if (procesoLower.indexOf("gestion") !== -1) return "De Gestión";
    }

    return "Estratégico";
}

// ═══════════════════════════════════════════════════════════════
// EXTRACCIÓN DE PROCESO
// ═══════════════════════════════════════════════════════════════

function extraerProceso(doc, detalle) {
    var candidatosDoc = [
        doc.proceso,
        doc.nombreProceso,
        doc.procesoNombre,
        doc.macroProceso,
        doc.macro_proceso
    ];
    
    for (var i = 0; i < candidatosDoc.length; i++) {
        if (candidatosDoc[i] && String(candidatosDoc[i]).trim() !== "") {
            return String(candidatosDoc[i]).trim();
        }
    }

    if (detalle) {
        var fichaData = detalle.fichaData || {};
        var candidatosDetalle = [
            fichaData.proceso,
            fichaData.nombreProceso,
            fichaData.procesoNombre,
            fichaData.macroProceso,
            fichaData.macro_proceso,
            detalle.proceso,
            detalle.nombreProceso,
            detalle.macroProceso
        ];
        
        for (var j = 0; j < candidatosDetalle.length; j++) {
            if (candidatosDetalle[j] && String(candidatosDetalle[j]).trim() !== "") {
                return String(candidatosDetalle[j]).trim();
            }
        }
    }

    if (detalle && Array.isArray(detalle.resumenCampos)) {
        for (var k = 0; k < detalle.resumenCampos.length; k++) {
            var campo = detalle.resumenCampos[k];
            var label = String(campo.label || "").toLowerCase().trim();
            if (label === "proceso" || label === "nombre del proceso" || label === "macro proceso") {
                if (campo.value && String(campo.value).trim() !== "") {
                    return String(campo.value).trim();
                }
            }
        }
    }

    return "Gestión Estratégica";
}

// ═══════════════════════════════════════════════════════════════
// EXTRACCIÓN DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════

function extraerActividad(doc, detalle) {
    var candidatos = [
        doc.actividad,
        doc.nombreActividad,
        doc.actividadNombre,
        doc.descripcion,
        doc.nombre,
        doc.titulo
    ];
    
    for (var i = 0; i < candidatos.length; i++) {
        if (candidatos[i] && String(candidatos[i]).trim() !== "") {
            return String(candidatos[i]).trim();
        }
    }

    if (detalle) {
        var fichaData = detalle.fichaData || {};
        var candidatosDetalle = [
            fichaData.actividad,
            fichaData.nombreActividad,
            fichaData.proceso,
            detalle.actividad,
            detalle.nombreActividad
        ];
        
        for (var j = 0; j < candidatosDetalle.length; j++) {
            if (candidatosDetalle[j] && String(candidatosDetalle[j]).trim() !== "") {
                return String(candidatosDetalle[j]).trim();
            }
        }
    }

    return "-";
}

function buildDocFromStorage(codigo) {
    if (!codigo) return null;

    var raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    var docs = [];
    var doc = null;

    try {
        docs = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(docs)) docs = [];
    } catch(e) {
        docs = [];
    }

    for (var i = 0; i < docs.length; i++) {
        var d = docs[i];
        var docCodigo = d.codigo || d.code || d.id || "";
        if (docCodigo === codigo) {
            doc = d;
            break;
        }
    }

    if (!doc) {
        var expRaw = localStorage.getItem("sigpro_expedientes_lista");
        if (expRaw) {
            try {
                var expedientes = JSON.parse(expRaw);
                if (Array.isArray(expedientes)) {
                    for (var j = 0; j < expedientes.length; j++) {
                        var exp = expedientes[j];
                        if ((exp.codigo || exp.id) === codigo) {
                            doc = exp;
                            break;
                        }
                    }
                }
            } catch(e) {}
        }
    }

    if (!doc) {
        var actualRaw = localStorage.getItem(FLUJOGRAMA_KEYS.EXPEDIENTE_ACTUAL);
        if (actualRaw) {
            try {
                var actual = JSON.parse(actualRaw);
                if ((actual.codigo || actual.id) === codigo) {
                    doc = actual;
                }
            } catch(e) {}
        }
    }

    if (!doc) return null;

    var codigoRef = doc.codigo || doc.code || doc.id || codigo;

    var detalle = null;
    var detalleRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    if (detalleRaw) {
        try {
            var detalleMap = JSON.parse(detalleRaw);
            detalle = detalleMap[codigoRef] || detalleMap[doc.id] || null;
        } catch(e) {}
    }

    // Extraer datos
    var tipoProceso = extraerTipoProceso(doc, detalle);
    var proceso = extraerProceso(doc, detalle);
    var actividad = extraerActividad(doc, detalle);
    var pdfData = extraerPdfData(doc, detalle);
    var archivoNombre = extraerArchivoNombre(doc, detalle, pdfData);

    return {
        id: doc.id || codigoRef,
        codigo: codigoRef,
        descripcion: doc.descripcion || doc.nombre || doc.titulo || ("Flujograma " + codigoRef),
        facultad: doc.nombreFacultad || doc.facultad || doc.facultadNombre || doc.generadoPor || "UNMSM",
        tipoProceso: tipoProceso,
        proceso: proceso,
        actividad: actividad,
        archivoNombre: archivoNombre,
        pdfUrl: pdfData.url,
        pdfEsBase64: pdfData.esBase64
    };
}

function buildTechnicalInfoMarkup(doc) {
    var markup = '<div class="flujo-info-grid">' +
        '<div class="flujo-field">' +
            '<p class="flujo-field-label">Tipo de Proceso</p>' +
            '<p class="flujo-field-value">' + doc.tipoProceso + '</p>' +
        '</div>' +
        '<div class="flujo-field">' +
            '<p class="flujo-field-label">Proceso</p>' +
            '<p class="flujo-field-value">' + doc.proceso + '</p>' +
        '</div>' +
        '<div class="flujo-field flujo-field-full">' +
            '<p class="flujo-field-label">Nombre de la Actividad</p>' +
            '<p class="flujo-field-value">' + doc.actividad + '</p>' +
        '</div>' +
        '<div class="flujo-field flujo-field-full">' +
            '<p class="flujo-field-label">Archivo Adjunto</p>' +
            '<p class="flujo-field-value">' + (doc.archivoNombre || '<span class="text-slate-400 italic">Sin archivo adjunto</span>') + '</p>' +
        '</div>' +
    '</div>';

    return markup;
}

// ═══════════════════════════════════════════════════════════════
// RENDERIZAR PDF - CON PREVISUALIZACIÓN CORRECTA
// ═══════════════════════════════════════════════════════════════

function renderPdf(doc) {
    var pdfEmpty = document.getElementById("pdf-empty");
    var pdfViewer = document.getElementById("pdf-viewer");
    var btnDescargar = document.getElementById("btn-descargar-pdf");

    if (!pdfEmpty || !pdfViewer) return;

    var tienePdf = Boolean(doc.pdfUrl) && String(doc.pdfUrl).trim() !== "";

    if (!tienePdf) {
        pdfEmpty.classList.remove("hidden");
        pdfViewer.classList.add("hidden");
        if (btnDescargar) btnDescargar.classList.add("hidden");
        return;
    }

    pdfEmpty.classList.add("hidden");
    pdfViewer.classList.remove("hidden");

    // Asignar src al iframe - funciona con data URLs y URLs normales
    pdfViewer.src = doc.pdfUrl;

    // Configurar botón descargar
    if (btnDescargar) {
        btnDescargar.href = doc.pdfUrl;
        btnDescargar.download = doc.archivoNombre || (doc.codigo + ".pdf");
        btnDescargar.classList.remove("hidden");
    }
}

function renderDetail(doc) {
    if (!doc) {
        console.error("No se encontró el flujograma");
        var descEl = document.getElementById("detalle-descripcion");
        if (descEl) descEl.textContent = "Flujograma no encontrado. Verifique el código o vuelva al repositorio.";
        return;
    }

    var descEl = document.getElementById("detalle-descripcion");
    if (descEl) descEl.textContent = doc.descripcion;

    var codePill = document.getElementById("detail-code-pill");
    if (codePill) codePill.textContent = doc.codigo;

    var detailBody = document.getElementById("detail-info-body");
    if (detailBody) {
        detailBody.innerHTML = buildTechnicalInfoMarkup(doc);
    }

    renderPdf(doc);
}

function renderCurrentDetailFromStorage() {
    var currentCode = window.__racioFlujoCode;
    if (!currentCode) return;

    var doc = buildDocFromStorage(currentCode);
    if (doc) {
        renderDetail(doc);
    }
}

function getFlujogramaSignature() {
    var code = window.__racioFlujoCode || "";
    if (!code) return "";

    var docs = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA) || "";
    var detail = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE) || "";
    var expediente = localStorage.getItem(FLUJOGRAMA_KEYS.EXPEDIENTE_ACTUAL) || "";
    var expedientesLista = localStorage.getItem("sigpro_expedientes_lista") || "";

    return [
        code,
        docs.length,
        detail.length,
        expediente.length,
        expedientesLista.length,
        docs.slice(-64),
        detail.slice(-64),
        expediente.slice(-32),
        expedientesLista.slice(-32)
    ].join("|");
}

function refreshFlujogramaView(force) {
    var signature = getFlujogramaSignature();
    if (!signature) return;

    if (!force && signature === realtimeState.lastSignature) {
        return;
    }

    realtimeState.lastSignature = signature;
    renderCurrentDetailFromStorage();
}

// ═══════════════════════════════════════════════════════════════
// PERFIL Y SEGURIDAD (igual que antes)
// ═══════════════════════════════════════════════════════════════

function getCurrentUser() {
    if (typeof API !== "undefined" && API.auth && typeof API.auth.getUser === "function") {
        return API.auth.getUser();
    }
    try {
        var raw = localStorage.getItem("unmsm_user");
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function initialsFromName(name) {
    var tokens = String(name || "").split(" ").filter(Boolean).slice(0, 2);
    if (!tokens.length) return "RA";
    return tokens.map(function(token) {
        return token.charAt(0).toUpperCase();
    }).join("");
}

function guardAdminSession() {
    var loginPage = "portal-inicio-racio.html";
    var userPanelPage = "facultades-inicio.html";
    if (typeof API !== "undefined" && API.auth && typeof API.auth.isAuthenticated === "function") {
        if (!API.auth.isAuthenticated()) {
            window.location.replace(loginPage);
            return false;
        }
        var user = typeof API.auth.getUser === "function" ? API.auth.getUser() : null;
        var role = String(user?.rol || "").toLowerCase();
        if (role && !role.includes("admin")) {
            window.location.replace(userPanelPage);
            return false;
        }
        return true;
    }
    if (!localStorage.getItem("unmsm_token")) {
        window.location.replace(loginPage);
        return false;
    }
    return true;
}

function renderProfileInfo() {
    var user = getCurrentUser();
    var displayName = user?.nombreCompleto || user?.nombre || "Administrador Racio";
    var displayRole = user?.rol || "Administrador Global";
    var displayEmail = user?.correo || user?.email || "admin@unmsm.edu.pe";
    var avatar = document.getElementById("profile-avatar");
    var name = document.getElementById("profile-name");
    var role = document.getElementById("profile-role");
    var menuName = document.getElementById("profile-menu-name");
    var menuEmail = document.getElementById("profile-menu-email");
    if (avatar) avatar.textContent = initialsFromName(displayName);
    if (name) name.textContent = displayName;
    if (role) role.textContent = displayRole;
    if (menuName) menuName.textContent = displayName;
    if (menuEmail) menuEmail.textContent = displayEmail;
}

function setupThemeToggle() {
    var body = document.getElementById("racio-body");
    var toggle = document.getElementById("theme-toggle");
    var icon = document.getElementById("theme-icon");
    if (!body || !toggle || !icon) return;
    var savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
        body.classList.add("theme-dark");
        icon.textContent = "light_mode";
    }
    toggle.addEventListener("click", function() {
        var isDark = body.classList.toggle("theme-dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        icon.textContent = isDark ? "light_mode" : "dark_mode";
    });
}

function setupLogoutModal() {
    var modal = document.getElementById("logout-modal");
    var backdrop = document.getElementById("logout-modal-backdrop");
    var cancelButton = document.getElementById("logout-cancel");
    var confirmButton = document.getElementById("logout-confirm");
    if (!modal || !cancelButton || !confirmButton) return null;

    var closeModal = function() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    };
    var openModal = function() {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    };
    var performLogout = function() {
        try {
            if (typeof API !== "undefined" && API.auth && typeof API.auth.logout === "function") {
                API.auth.logout();
            } else {
                localStorage.removeItem("unmsm_token");
                localStorage.removeItem("unmsm_user");
            }
        } finally {
            window.location.replace("portal-inicio-racio.html");
        }
    };

    if (backdrop) backdrop.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);
    confirmButton.addEventListener("click", performLogout);
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
    return { openModal: openModal };
}

function setupProfileMenu(logoutControls) {
    var profileToggle = document.getElementById("profile-toggle");
    var profileMenu = document.getElementById("profile-menu");
    var logoutButton = document.getElementById("logout-button");
    if (!profileToggle || !profileMenu) return;

    var closeMenu = function() {
        profileMenu.classList.remove("is-open");
        profileToggle.classList.remove("open");
        profileToggle.setAttribute("aria-expanded", "false");
    };

    profileToggle.addEventListener("click", function() {
        var open = profileMenu.classList.contains("is-open");
        if (open) {
            closeMenu();
            return;
        }
        profileMenu.classList.add("is-open");
        profileToggle.classList.add("open");
        profileToggle.setAttribute("aria-expanded", "true");
    });

    document.addEventListener("click", function(event) {
        if (!profileMenu.contains(event.target) && !profileToggle.contains(event.target)) {
            closeMenu();
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener("click", function() {
            closeMenu();
            if (logoutControls && logoutControls.openModal) logoutControls.openModal();
        });
    }
}

document.addEventListener("DOMContentLoaded", function() {
    if (!guardAdminSession()) return;
    renderProfileInfo();
    setupThemeToggle();
    var logoutControls = setupLogoutModal();
    setupProfileMenu(logoutControls);

    var params = new URLSearchParams(window.location.search);
    var codigo = params.get("codigo") || "";
    window.__racioFlujoCode = codigo;

    if (!codigo) {
        var descEl = document.getElementById("detalle-descripcion");
        if (descEl) descEl.textContent = "No se especificó un flujograma. Vuelva al repositorio y seleccione uno.";
        return;
    }

    var doc = buildDocFromStorage(codigo);
    if (doc) {
        renderDetail(doc);
    } else {
        var descEl = document.getElementById("detalle-descripcion");
        if (descEl) descEl.textContent = "Flujograma no encontrado. Verifique el código o vuelva al repositorio.";
    }

    realtimeState.lastSignature = getFlujogramaSignature();

    window.addEventListener("storage", function(event) {
        var key = event.key || "";
        if (
            !key
            || key === STORAGE_KEYS.DOCUMENTOS_LISTA
            || key === STORAGE_KEYS.DOCUMENTOS_DETALLE
            || key === FLUJOGRAMA_KEYS.EXPEDIENTE_ACTUAL
            || key === "sigpro_expedientes_lista"
        ) {
            refreshFlujogramaView(true);
        }
    });

    window.setInterval(function() {
        refreshFlujogramaView(false);
    }, FLUJOGRAMA_REFRESH_MS);
});
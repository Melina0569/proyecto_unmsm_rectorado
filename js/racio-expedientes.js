// === ESCUCHA EVENTO DE HISTORIAL ACTUALIZADO DESDE OTRAS VISTAS ===
document.addEventListener('historial-actualizado', function(e) {
    // Si hay un código seleccionado, refresca el historial
    const codigo = (e && e.detail && e.detail.codigo) || state.selectedCode;
    if (codigo && typeof renderHistoryPanel === 'function') {
        renderHistoryPanel(codigo);
    }
});
// ==========================================
// SIGPRO - Sistema Unificado de Gestión Documental
// Corrección: Preview de documentos desde racio-expedientes
// ==========================================

const _mode = (typeof CONFIG !== 'undefined' && CONFIG.MODE) ? CONFIG.MODE : 'local';
const STORAGE_KEYS = {
    DOCUMENTOS_LISTA:    `${_mode}_sigpro_documentos_lista`,
    DOCUMENTOS_DETALLE:  `${_mode}_sigpro_documentos_detalle`,
    EXPEDIENTES_LISTA:   `${_mode}_sigpro_expedientes_lista`,
    CORRECCIONES_LISTA:  `${_mode}_sigpro_correcciones_solicitudes`
};

const SAMPLE_DOCUMENTS = [
    {
        codigo: "INV-GEN-2026-001",
        descripcion: "Ficha de inventario INV-GEN-2026-001",
        facultad: "demo@unmsm.edu.pe",
        unidad: "demo@unmsm.edu.pe",
        estado: "completado",
        progreso: 100,
        fecha: "2026-04-07T00:00:00.000Z",
        attachments: [
            { name: "INV-GEN-2026-001.pdf", type: "pdf", url: "" },
            { name: "INV-GEN-2026-001.xlsx", type: "xlsx", url: "" }
        ]
    }
];

const MAX_INLINE_CORRECTION_ATTACHMENT_BYTES = 2 * 1024 * 1024;

const state = {
    allDocuments: [],
    selectedCode: "",
    selectedDocument: null,
    selectedAttachmentKey: "",
    selectedCorrectionId: "",
    previewScale: 1,
    currentAttachmentIndex: 0
};

const excelPreviewCache = new Map();
const correctionPreviewCache = new Map();

// ==========================================
// UTILIDADES BASE
// ==========================================

function fileExtension(fileName) {
    return String(fileName || "").split(".").pop().toLowerCase();
}

function mimeTypeFromExtension(ext) {
    const normalizedExt = String(ext || "").toLowerCase();
    if (normalizedExt === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (normalizedExt === "xls") return "application/vnd.ms-excel";
    if (normalizedExt === "csv") return "text/csv";
    if (normalizedExt === "pdf") return "application/pdf";
    if (normalizedExt === "doc") return "application/msword";
    if (normalizedExt === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return "application/octet-stream";
}

function toDataUrlFromBase64(content, fileName) {
    const value = String(content || "").trim();
    if (!value) return "";
    if (value.startsWith("data:")) return value;
    if (!/^[A-Za-z0-9+/=]+$/.test(value)) return "";
    const mimeType = mimeTypeFromExtension(fileExtension(fileName));
    return `data:${mimeType};base64,${value}`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo adjunto."));
        reader.readAsDataURL(file);
    });
}

function createObjectUrlFromFile(file) {
    if (!file) return "";
    try {
        return URL.createObjectURL(file);
    } catch {
        return "";
    }
}

// ==========================================
// NORMALIZACIÓN DE ADJUNTOS (CRÍTICO)
// ==========================================

/**
 * Normaliza cualquier adjunto de cualquier fuente a un formato estándar.
 * Busca contenido en TODOS los campos posibles.
 */
function normalizeAttachment(item, fallbackName) {
    // Caso string simple
    if (typeof item === "string") {
        const ext = item.includes(".") ? item.split(".").pop().toLowerCase() : "file";
        return { name: item, type: ext, url: "", content: "", size: "", date: "" };
    }

    // Caso nulo/inválido
    if (!item || typeof item !== "object") {
        const ext = String(fallbackName).split(".").pop().toLowerCase();
        return { name: fallbackName, type: ext, url: "", content: "", size: "", date: "" };
    }

    // Extraer nombre
    const name = item.name || item.nombre || item.fileName || item.archivo || fallbackName;
    
    // Extraer tipo
    const type = item.type || item.tipo || String(name).split(".").pop().toLowerCase();
    
    // 🔥 CRÍTICO: Buscar contenido en TODOS los campos posibles
    let content = "";
    const contentFields = [
        'contenido', 'content', 'base64', 'data', 'archivoBase64', 
        'raw', 'src', 'path', 'documento', 'archivo'
    ];
    for (const field of contentFields) {
        if (item[field] && typeof item[field] === "string" && item[field].length > 50) {
            content = item[field];
            break;
        }
    }
    
    // 🔥 CRÍTICO: Buscar URL en TODOS los campos posibles
    let url = "";
    const urlFields = [
        'url', 'ruta', 'path', 'src', 'fileUrl', 'dataUrl', 'link'
    ];
    for (const field of urlFields) {
        if (item[field] && typeof item[field] === "string" && item[field].length > 10) {
            url = item[field];
            break;
        }
    }
    
    // Si hay contenido base64 puro pero no URL, generar data URL
    if (content && !url) {
        url = toDataUrlFromBase64(content, name);
    }
    
    // Si hay URL tipo data pero no contenido extraído, extraerlo
    if (url && url.startsWith("data:") && !content) {
        const base64Match = url.match(/base64,(.+)/);
        if (base64Match) content = base64Match[1];
    }

    const size = item.size || item.tamano || item.tamaño || "";
    const date = item.date || item.fecha || item.uploadedAt || item.createdAt || "";

    return { 
        name, 
        type: String(type).toLowerCase(), 
        url,      // ← Siempre tendrá valor si hay contenido
        content,  // ← Siempre tendrá valor si hay URL data
        size, 
        date,
        generatedType: item.generatedType || item.generated_type || ""
    };
}

function normalizeAttachmentName(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

// ==========================================
// INDEXEDDB PARA ADJUNTOS GRANDES
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

async function hydrateAttachmentFromIndexedDb(codigo, attachment) {
    const name = String(attachment?.name || attachment?.nombre || attachment?.fileName || "").trim();
    if (!codigo || !name) return attachment;

    try {
        const db = await openAdjuntosIndexedDb();
        const key = `${codigo}::${name}`;
        
        // Buscar por clave exacta
        const record = await new Promise((resolve, reject) => {
            const tx = db.transaction("adjuntos", "readonly");
            const store = tx.objectStore("adjuntos");
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });

        if (record) {
            db.close();
            return { ...attachment, ...record };
        }

        // Fallback: buscar por código y nombre similar
        const targetName = normalizeAttachmentName(name);
        const fallbackRecord = await new Promise((resolve, reject) => {
            const tx = db.transaction("adjuntos", "readonly");
            const store = tx.objectStore("adjuntos");
            const request = store.openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) { resolve(null); return; }
                const current = cursor.value;
                if (current?.codigo === codigo) {
                    const itemName = normalizeAttachmentName(current?.name || current?.nombre || "");
                    if (targetName && (itemName === targetName || itemName.includes(targetName) || targetName.includes(itemName))) {
                        resolve(current);
                        return;
                    }
                }
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });

        db.close();
        return fallbackRecord ? { ...attachment, ...fallbackRecord } : attachment;
    } catch (error) {
        console.warn("No se pudo hidratar adjunto desde IndexedDB:", error);
        return attachment;
    }
}

async function hydrateAttachmentForDocument(doc, attachment) {
    return hydrateAttachmentFromIndexedDb(doc?.codigo, attachment);
}

// ==========================================
// UTILIDADES DE DOCUMENTOS
// ==========================================

function normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function parseDate(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeEstado(value) {
    const status = normalizeText(value).replace(/\s+/g, "_");
    if (status.includes("complet") || status.includes("aprob") || status.includes("public")) return "completado";
    if (status.includes("proceso") || status.includes("revision") || status.includes("observ")) return "en_proceso";
    return "pendiente";
}

function normalizeTipo(value, codigo) {
    const normalized = normalizeText(value);
    if (normalized.includes("invent")) return "inventario";
    if (normalized.includes("report")) return "reporte";
    if (normalized.includes("flujo")) return "flujograma";
    if (normalized.includes("indica")) return "indicador";
    if (normalized.includes("caracter")) return "caracterizacion";
    return inferDocumentTypeFromCode(codigo);
}

function safeValue(value) {
    if (value === null || value === undefined) return "-";
    const text = String(value).trim();
    return text ? text : "-";
}

function dedupeTechnicalRows(rows) {
    const seen = new Set();
    return rows.filter((row) => {
        const label = safeValue(row?.label).toLowerCase();
        const value = safeValue(row?.value).toLowerCase();
        const key = `${label}::${value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function formatDisplayDate(date) {
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function getStatusLabel(status) {
    if (status === "completado") return "COMPLETADO";
    if (status === "en_proceso") return "EN PROCESO";
    return "PENDIENTE";
}

function inferDocumentTypeFromCode(code) {
    const prefix = String(code || "").split("-")[0].toUpperCase();
    if (prefix === "IND") return "indicador";
    if (prefix === "FLU" || prefix === "FL") return "flujograma";
    if (prefix === "CAR") return "caracterizacion";
    if (prefix === "INV") return "inventario";
    if (prefix === "HR" || prefix === "REP" || prefix === "PR") return "reporte";
    return "reporte";
}

function parseJsonArray(raw) {
    if (!raw) return [];
    try {
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function mergeAttachmentsByName(primary, secondary) {
    const merged = new Map();
    const addAttachment = (attachment) => {
        if (!attachment || typeof attachment !== "object") return;
        const key = normalizeAttachmentName(attachment.name || attachment.nombre || attachment.fileName || "");
        if (!key) return;
        const current = merged.get(key) || {};
        merged.set(key, { ...current, ...attachment });
    };
    (Array.isArray(primary) ? primary : []).forEach(addAttachment);
    (Array.isArray(secondary) ? secondary : []).forEach(addAttachment);
    return Array.from(merged.values());
}

// ==========================================
// GESTIÓN DE EXPEDIENTES APROBADOS
// ==========================================

function upsertDocumentoAprobado(doc) {
    const nowIso = new Date().toISOString();
    const docs = parseJsonArray(localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA));
    const index = docs.findIndex((item) => String(item?.codigo || item?.code || "") === doc.codigo);
    const existing = index >= 0 ? docs[index] : {};
    const adjuntos = Array.isArray(existing?.adjuntos) && existing.adjuntos.length
        ? existing.adjuntos
        : (Array.isArray(doc.attachments) ? doc.attachments : []);

    const updated = {
        ...existing,
        id: existing.id || doc.id || doc.codigo,
        codigo: doc.codigo,
        descripcion: doc.descripcion,
        nombreFacultad: existing.nombreFacultad || doc.facultad,
        facultad: existing.facultad || doc.facultad,
        unidad: existing.unidad || doc.unidad,
        estado: "aprobado",
        progreso: 100,
        fechaAprobacion: nowIso,
        fechaActualizacion: nowIso,
        updatedAt: nowIso,
        fecha: existing.fecha || nowIso,
        tipo: existing.tipo || inferDocumentTypeFromCode(doc.codigo),
        adjuntos,
        responsable: existing.responsable || "Oficina de Racionalizacion"
    };

    if (index >= 0) docs[index] = updated;
    else docs.push(updated);
    
    localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(docs));
    return updated;
}

function upsertExpedienteRepositorio(doc) {
    const nowIso = new Date().toISOString();
    const expedientes = parseJsonArray(localStorage.getItem(STORAGE_KEYS.EXPEDIENTES_LISTA));
    const index = expedientes.findIndex((item) => String(item?.codigo || "") === doc.codigo);
    const existing = index >= 0 ? expedientes[index] : {};
    const nextItem = {
        ...existing,
        id: existing.id || doc.id || doc.codigo,
        codigo: doc.codigo,
        tipo: existing.tipo || inferDocumentTypeFromCode(doc.codigo),
        nombre: doc.descripcion || existing.nombre || `Expediente ${doc.codigo}`,
        macroProceso: existing.macroProceso || "Gestion Institucional",
        fechaAprobacion: nowIso,
        estado: "aprobado",
        responsable: existing.responsable || "Oficina de Racionalizacion"
    };

    if (index >= 0) expedientes[index] = nextItem;
    else expedientes.push(nextItem);
    
    localStorage.setItem(STORAGE_KEYS.EXPEDIENTES_LISTA, JSON.stringify(expedientes));
}

function isApprovedStatus(value) {
    return normalizeEstado(value) === "completado";
}

function getApprovedSnapshotByCode(codigo) {
    if (!codigo) return null;
    const docs = parseJsonArray(localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA));
    const expedientes = parseJsonArray(localStorage.getItem(STORAGE_KEYS.EXPEDIENTES_LISTA));
    const source = docs.find((item) => String(item?.codigo || item?.code || "") === codigo) 
        || expedientes.find((item) => String(item?.codigo || "") === codigo);
    
    if (!source || !isApprovedStatus(source?.estado)) return null;
    
    const sourceDate = source?.fechaAprobacion || source?.fechaActualizacion || source?.updatedAt || source?.fecha || new Date().toISOString();
    return { estado: "completado", progreso: 100, fecha: parseDate(sourceDate) };
}

// ==========================================
// UI: BOTÓN DE APROBACIÓN
// ==========================================

function updateApproveButtonState(doc) {
    const approveButton = document.getElementById("approve-expediente-btn");
    const correctionButton = document.getElementById("correction-expediente-btn");
    const approvedMessage = document.getElementById("expediente-approved-message");
    if (!approveButton) return;

    const hasDoc = Boolean(doc);
    const isApproved = isApprovedStatus(doc?.estado);

    if (!hasDoc) {
        approveButton.classList.remove("hidden", "cursor-not-allowed", "opacity-70");
        approveButton.disabled = true;
        approveButton.innerHTML = '<span class="material-symbols-outlined">pending</span>SELECCIONE UN EXPEDIENTE';
        if (correctionButton) {
            correctionButton.classList.remove("hidden", "opacity-70", "cursor-not-allowed");
            correctionButton.disabled = false;
        }
        if (approvedMessage) approvedMessage.classList.add("hidden");
        return;
    }

    if (isApproved) {
        approveButton.classList.add("hidden");
        approveButton.disabled = true;
        if (correctionButton) {
            correctionButton.classList.remove("hidden", "opacity-70", "cursor-not-allowed");
            correctionButton.disabled = true;
        }
        if (approvedMessage) {
            approvedMessage.textContent = "Este expediente ya fue aprobado. Si detecta errores, puede indicar corrección.";
            approvedMessage.classList.remove("hidden");
        }
        return;
    }

    approveButton.classList.remove("hidden", "cursor-not-allowed", "opacity-70");
    approveButton.disabled = false;
    approveButton.innerHTML = '<span class="material-symbols-outlined">check_circle</span>APROBAR EXPEDIENTE';
    if (correctionButton) {
        correctionButton.classList.remove("hidden", "opacity-70", "cursor-not-allowed");
        correctionButton.disabled = false;
    }
    if (approvedMessage) approvedMessage.classList.add("hidden");
}

// ==========================================
// HISTORIAL DE CORRECCIONES
// ==========================================

// Lee historial de correcciones desde localStorage (sigpro_correcciones_solicitudes)
function getExpedienteHistory(codigo) {
    let historial = [];
    const claves = [
        STORAGE_KEYS.CORRECCIONES_LISTA, // local_ o remote_
        'sigpro_correcciones_solicitudes',
        'sigpro_correcciones_shared'
    ];
    
    for (const clave of claves) {
        try {
            const raw = localStorage.getItem(clave);
            if (!raw) continue;
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                historial = historial.concat(list);
            }
        } catch {}
    }
    
    // Deduplicar por ID
    const vistas = new Set();
    const unicas = [];
    for (const item of historial) {
        const key = item?.id || `${item?.codigo}-${item?.fecha}`;
        if (!vistas.has(key)) {
            vistas.add(key);
            unicas.push(item);
        }
    }
    
    return unicas
        .filter((item) => String(item?.codigo || item?.codigoDocumento || "") === String(codigo || ""))
        .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
        .map((item) => {
            const cachedAttachment = correctionPreviewCache.get(String(item?.id || ""));
            if (!cachedAttachment) return item;
            return {
                ...item,
                adjunto: { ...(item?.adjunto || {}), ...cachedAttachment, fromRuntimeCache: true }
            };
        });
}

function getSelectedCorrection(codigo) {
    const historial = getExpedienteHistory(codigo);
    if (!historial.length) return null;
    const selected = historial.find((item) => String(item?.id || "") === String(state.selectedCorrectionId || ""));
    if (selected) return selected;
    state.selectedCorrectionId = historial[0]?.id || "";
    return historial[0] || null;
}

// ==========================================
// PREVIEW DE ADJUNTOS (CORREGIDO)
// ==========================================

/**
 * 🔥 FUNCIÓN CRÍTICA CORREGIDA
 * Renderiza el preview de un adjunto, ahora busca en TODOS los campos
 * y NUNCA muestra "no disponible" si hay contenido real.
 */
function renderAttachmentPreview(attachment) {
    // 🔥 NORMALIZAR PRIMERO: esto extrae contenido de TODOS los campos posibles
    const normalized = normalizeAttachment(attachment, "documento");
    const url = normalized.url;
    const content = normalized.content;
    const name = normalized.name || "Adjunto";
    
    // Si hay URL blob pero no es de caché runtime, mostrar mensaje de expiración
    const isBlobUrl = url.startsWith("blob:");
    if (isBlobUrl && !attachment?.fromRuntimeCache) {
        return `
            <div class="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                La vista previa del adjunto expiró al recargar la página. El archivo fue registrado correctamente en el historial.
            </div>
        `;
    }

    // 🔥 CRÍTICO: Si NO hay URL ni contenido, mostrar genérico pero NUNCA el modal bloqueante
    if (!url && !content) {
        return `
            <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
                <p class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(name)}</p>
                <p class="mt-1">Vista previa no disponible para este tipo de archivo.</p>
                <p class="text-xs text-slate-400 mt-2">El archivo está registrado pero no tiene contenido almacenado.</p>
            </div>
        `;
    }

    const attachmentType = normalized.type || fileExtension(name);
    const attachmentMime = attachmentType.includes("/") ? attachmentType : mimeTypeFromExtension(attachmentType);
    const attachmentName = escapeHtml(name);
    const isImage = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(attachmentType)
        || attachmentMime.startsWith("image/")
        || url.startsWith("data:image/");
    const isPdf = attachmentType === "pdf"
        || attachmentMime === "application/pdf"
        || url.startsWith("data:application/pdf")
        || (isBlobUrl && attachmentType === "pdf");

    // Preview de imagen
    if (isImage) {
        return `
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">
                <div class="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                    Vista previa: ${attachmentName}
                </div>
                <img src="${escapeHtml(url)}" alt="${attachmentName}" class="w-full max-h-[520px] object-contain bg-slate-50 dark:bg-slate-950" />
            </div>
        `;
    }

    // Preview de PDF
    if (isPdf) {
        return `
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950">
                <div class="border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center">
                    <span>Vista previa: ${attachmentName}</span>
                    <div class="flex gap-2">
                        <a class="inline-flex items-center gap-2 rounded-md bg-primary/10 text-primary dark:text-sky-300 px-3 py-1.5 text-xs font-bold hover:bg-primary/20" 
                           href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                            <span class="material-symbols-outlined text-base">open_in_new</span>
                            Abrir PDF
                        </a>
                        <a class="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" 
                           href="${escapeHtml(url)}" download="${attachmentName}">
                            <span class="material-symbols-outlined text-base">download</span>
                            Descargar
                        </a>
                    </div>
                </div>
                <object data="${escapeHtml(url)}" type="application/pdf" class="w-full h-[520px] bg-white dark:bg-slate-950">
                    <div class="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <p class="font-semibold">No se pudo incrustar el PDF.</p>
                        <p class="mt-1">Use "Abrir PDF" o "Descargar" para revisarlo.</p>
                    </div>
                </object>
            </div>
        `;
    }

    // Fallback genérico con botón de descarga
    return `
        <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
            <p class="font-bold text-slate-800 dark:text-slate-100">${attachmentName}</p>
            <p class="mt-1">Tipo: ${escapeHtml(attachmentType.toUpperCase())}</p>
            <a class="inline-flex items-center gap-2 mt-3 text-primary dark:text-sky-300 font-bold hover:underline" 
               href="${escapeHtml(url)}" download="${attachmentName}">
                <span class="material-symbols-outlined text-base">download</span>
                Descargar adjunto
            </a>
        </div>
    `;
}

// ==========================================
// PANEL DE CORRECCIÓN
// ==========================================

function renderCorrectionDetailPanel(codigo = state.selectedCode) {
    const panel = document.getElementById("correction-detail-panel");
    const content = document.getElementById("correction-detail-content");
    if (!panel || !content) return;

    const correction = getSelectedCorrection(codigo);
    if (!correction) {
        panel.classList.add("hidden");
        content.innerHTML = "";
        return;
    }

    panel.classList.remove("hidden");
    const fecha = formatDisplayDate(parseDate(correction.fecha));
    
    // 🔥 NORMALIZAR el adjunto de la corrección antes de renderizar
    const rawAdjunto = correction.adjunto;
    const normalizedAdjunto = rawAdjunto ? normalizeAttachment(rawAdjunto, "adjunto-correccion") : null;
    const attachmentName = normalizedAdjunto?.name ? escapeHtml(normalizedAdjunto.name) : "Sin archivo adjunto";
    const attachmentPreview = normalizedAdjunto ? renderAttachmentPreview(normalizedAdjunto) : 
        '<div class="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Sin archivo adjunto.</div>';

    content.innerHTML = `
        <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p class="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">Detalle de corrección</p>
                    <h3 class="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">${escapeHtml(correction.asunto || "Solicitud de corrección")}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(correction.correoInstitucional || "-")}</p>
                </div>
                <span class="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-bold">EN PROCESO</span>
            </div>
            <p class="text-sm text-slate-700 dark:text-slate-200 mt-4 whitespace-pre-line">${escapeHtml(correction.observaciones || "-")}</p>
            <div class="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <p><span class="font-bold text-slate-800 dark:text-slate-100">Fecha:</span> ${escapeHtml(fecha)}</p>
                <p><span class="font-bold text-slate-800 dark:text-slate-100">Expediente:</span> ${escapeHtml(correction.codigo || codigo || "-")}</p>
                <p><span class="font-bold text-slate-800 dark:text-slate-100">Documento adjunto:</span> ${attachmentName}</p>
            </div>
            <div class="mt-5">
                ${attachmentPreview}
            </div>
        </div>
    `;
}

function deleteHistoryItem(codigo, correctionId) {
    const id = String(correctionId || "").trim();
    if (!id) return;
    if (!window.confirm("¿Eliminar esta corrección del historial?")) return;
    
    const historial = parseJsonArray(localStorage.getItem(STORAGE_KEYS.CORRECCIONES_LISTA));
    const filtered = historial.filter((item) => String(item?.id || "") !== id);
    localStorage.setItem(STORAGE_KEYS.CORRECCIONES_LISTA, JSON.stringify(filtered));
    correctionPreviewCache.delete(id);
    
    if (String(state.selectedCorrectionId || "") === id) state.selectedCorrectionId = "";
    renderHistoryPanel(codigo);
}

function renderHistoryPanel(codigo = state.selectedCode) {
    const list = document.getElementById("history-list");
    if (!list) return;

    if (!codigo) {
        list.innerHTML = '<div class="rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">Seleccione un expediente para ver su historial.</div>';
        return;
    }

    const historial = getExpedienteHistory(codigo);
    if (!historial.length) {
        state.selectedCorrectionId = "";
        renderCorrectionDetailPanel(codigo);
        list.innerHTML = '<div class="rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">No hay eventos registrados.</div>';
        return;
    }

    if (!state.selectedCorrectionId || !historial.some((item) => String(item?.id || "") === String(state.selectedCorrectionId))) {
        state.selectedCorrectionId = historial[0]?.id || "";
    }

    list.innerHTML = historial.map((evento) => {
        const fecha = formatDisplayDate(parseDate(evento.fecha));
        const estadoLabel = String(evento.estadoDestino || "en_proceso").replace("_", " ").toUpperCase();
        const adjunto = evento.adjunto?.name ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Adjunto: ${escapeHtml(evento.adjunto.name)}</p>` : "";
        const isActive = String(evento.id || "") === String(state.selectedCorrectionId || "");
        const eventId = escapeHtml(String(evento.id || ""));
        
        return `
            <article data-correction-id="${eventId}" class="rounded-xl border ${isActive ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'} p-4 cursor-pointer hover:border-primary/60 transition-colors">
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <p class="text-sm font-black text-slate-900 dark:text-slate-100">${escapeHtml(evento.asunto || "Solicitud de corrección")}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(evento.correoInstitucional || "-")}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-bold">${escapeHtml(estadoLabel)}</span>
                        <button type="button" data-delete-correction-id="${eventId}" class="inline-flex items-center justify-center size-7 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-900/20" aria-label="Eliminar corrección">
                            <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                    </div>
                </div>
                <p class="text-sm text-slate-700 dark:text-slate-200 mt-3 whitespace-pre-line">${escapeHtml(evento.observaciones || "-")}</p>
                ${adjunto}
                <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-3">${escapeHtml(fecha)}</p>
            </article>
        `;
    }).join("");

    // Event listeners
    list.querySelectorAll("article[data-correction-id]").forEach((article) => {
        article.addEventListener("click", () => {
            state.selectedCorrectionId = article.getAttribute("data-correction-id") || "";
            renderHistoryPanel(codigo);
        });
    });

    list.querySelectorAll("button[data-delete-correction-id]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            deleteHistoryItem(codigo, button.getAttribute("data-delete-correction-id"));
        });
    });

    renderCorrectionDetailPanel(codigo);
}

// ==========================================
// SINCRONIZACIÓN DE CORRECCIONES
// ==========================================

function syncCorrectionToSharedStorages(doc, correctionRequest) {
    if (!doc?.codigo) return;
    const nowIso = new Date().toISOString();
    const codigo = String(doc.codigo);

    // 🔥 FIX: Si el documento estaba aprobado, quitarlo de approved_docs al enviar a corrección
    try {
        const approvedRaw = localStorage.getItem('sigpro_approved_docs');
        if (approvedRaw) {
            const approved = JSON.parse(approvedRaw);
            const filtered = approved.filter(d => 
                String(d?.codigo || d?.code || "").trim().toUpperCase() !== codigo.toUpperCase()
            );
            localStorage.setItem('sigpro_approved_docs', JSON.stringify(filtered));
        }
    } catch (e) {
        console.warn("No se pudo limpiar sigpro_approved_docs:", e);
    }

    // Actualizar documentos
    const documentos = parseJsonArray(localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(
        documentos.map((item) => String(item?.codigo || item?.code || "") === codigo ? {
            ...item, estado: "en_proceso", estadoTexto: "EN PROCESO", subestado: "Observado por Racionalización",
            progreso: 50, fechaActualizacion: nowIso, updatedAt: nowIso
        } : item)
    ));

    // Actualizar expedientes
    const expedientes = parseJsonArray(localStorage.getItem(STORAGE_KEYS.EXPEDIENTES_LISTA));
    localStorage.setItem(STORAGE_KEYS.EXPEDIENTES_LISTA, JSON.stringify(
        expedientes.map((item) => String(item?.codigo || "") === codigo ? {
            ...item, estado: "en_proceso", progreso: 50, fechaActualizacion: nowIso, updatedAt: nowIso
        } : item)
    ));

    // Actualizar detalle
    try {
        const rawDetalle = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
        const detalleMap = rawDetalle ? JSON.parse(rawDetalle) : {};
        if (detalleMap && typeof detalleMap === "object") {
            const detalle = detalleMap[codigo] && typeof detalleMap[codigo] === "object" ? detalleMap[codigo] : {};
            const historialDetalle = Array.isArray(detalle.historial) ? detalle.historial : [];
            historialDetalle.push({
                fecha: nowIso, progreso: 50, estado: "EN PROCESO",
                generadoPor: "RACIONALIZACIÓN", observacion: correctionRequest?.asunto || "Corrección solicitada"
            });
            detalleMap[codigo] = { ...detalle, estado: "en_proceso", progreso: 50, fechaActualizacion: nowIso, historial: historialDetalle };
            localStorage.setItem(STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalleMap));
        }
    } catch (error) {
        console.warn("No se pudo actualizar detalle:", error);
    }

    // Actualizar estado global
    state.selectedDocument = { ...state.selectedDocument, estado: "en_proceso", progreso: 50, fecha: new Date(nowIso) };
    state.allDocuments = state.allDocuments.map((item) => item.codigo === codigo ? {
        ...item, estado: "en_proceso", progreso: 50, fecha: new Date(nowIso)
    } : item);

    // 🔥 FIX: También actualizar sigpro_reportes (donde facultades-documentos lee)
    try {
        const reportesRaw = localStorage.getItem('sigpro_reportes');
        const reportes = reportesRaw ? JSON.parse(reportesRaw) : [];
        const reporteIdx = reportes.findIndex(r => String(r?.codigo || r?.code || "") === codigo);
        const updatedReporte = {
            ...(reporteIdx >= 0 ? reportes[reporteIdx] : {}),
            codigo: codigo,
            estado: "en_proceso",
            progreso: 50,
            fechaActualizacion: nowIso,
            updatedAt: nowIso
        };
        if (reporteIdx >= 0) {
            reportes[reporteIdx] = updatedReporte;
        } else {
            reportes.push(updatedReporte);
        }
        localStorage.setItem('sigpro_reportes', JSON.stringify(reportes));
    } catch (e) {
        console.warn("No se pudo actualizar sigpro_reportes:", e);
    }
}

// ==========================================
// APROBAR EXPEDIENTE
// ==========================================

async function approveCurrentExpediente() {
    const doc = state.selectedDocument || state.allDocuments[0] || null;
    if (!doc) return;
    
    if (doc.estado === "completado") {
        window.alert("Este expediente ya fue aprobado.");
        return;
    }
    
    if (!window.confirm("¿Aprobar y enviar al repositorio público?")) return;

    const approveButton = document.getElementById("approve-expediente-btn");
    if (approveButton) {
        approveButton.disabled = true;
        approveButton.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> APROBANDO...';
        approveButton.classList.add("opacity-80", "cursor-wait");
    }

    let apiSuccess = false;
    let publicUrl = '';
    const approvedDate = new Date();

    // ── 1. Intentar API solo si estamos en modo remoto ──
    try {
        const isRemote = (typeof API !== 'undefined' && API.CONFIG?.MODE === 'remote');
        const docId = doc.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doc.id)
            ? doc.id
            : doc.codigo;

        if (isRemote && typeof API !== "undefined" && API.admin?.documents?.approve) {
            const apiResult = await API.admin.documents.approve(docId);
            if (apiResult.success) {
                apiSuccess = true;
                publicUrl = apiResult.data?.publicUrl || `/public/reps/${docId}`;
            }
        }
    } catch (error) {
        console.warn('API no disponible, se usará aprobación local:', error);
    }

    // Si la API no respondió, generamos URL local
    if (!apiSuccess) {
        publicUrl = `/public/reps/${doc.codigo}`;
    }

    // ── 2. Guardado LOCAL robusto (claves CON prefijo y SIN prefijo) ──
    try {
        // A) Claves internas con prefijo (modo local/remote)
        upsertDocumentoAprobado({
            ...doc,
            estado: "completado",
            progreso: 100,
            fechaAprobacion: approvedDate.toISOString(),
            publicUrl: publicUrl
        });
        upsertExpedienteRepositorio({
            ...doc,
            estado: "aprobado",
            fechaAprobacion: approvedDate.toISOString(),
            publicUrl: publicUrl
        });

        // B) sigpro_approved_docs (lee racio-repositorio)
        const approvedDocs = JSON.parse(localStorage.getItem('sigpro_approved_docs') || '[]');
        const approvedDoc = {
            id: doc.id || doc.codigo,
            code: doc.codigo,
            codigo: doc.codigo,
            title: doc.descripcion || 'Documento aprobado',
            descripcion: doc.descripcion || 'Documento aprobado',
            name: doc.descripcion || 'Documento aprobado',
            type: doc.tipo || inferDocumentTypeFromCode(doc.codigo),
            tipo: doc.tipo || inferDocumentTypeFromCode(doc.codigo),
            status: 'APPROVED',
            estado: 'aprobado',
            faculty: doc.facultad || 'UNMSM',
            facultad: doc.facultad || 'UNMSM',
            nombreFacultad: doc.facultad || 'UNMSM',
            facultyId: doc.facultyId || doc.facultadId || '',
            unit: doc.unidad || 'Oficina de Racionalización',
            unidad: doc.unidad || 'Oficina de Racionalización',
            publicUrl: publicUrl,
            approvedAt: approvedDate.toISOString(),
            fechaAprobacion: approvedDate.toISOString(),
            fecha: approvedDate.toISOString(),
            updatedAt: approvedDate.toISOString(),
            publishedAt: approvedDate.toISOString(),
            createdAt: doc.fecha || approvedDate.toISOString(),
            macroProceso: doc.macroProceso || '',
            responsable: doc.responsable || doc.unidad || 'Oficina de Racionalización'
        };
        const idxApp = approvedDocs.findIndex(d => d.id === (doc.id || doc.codigo) || d.codigo === doc.codigo);
        if (idxApp >= 0) approvedDocs[idxApp] = { ...approvedDocs[idxApp], ...approvedDoc };
        else approvedDocs.push(approvedDoc);
        localStorage.setItem('sigpro_approved_docs', JSON.stringify(approvedDocs));

        // C) sigpro_expedientes_lista (lee facultades-expedientes)
        const expsGlobal = JSON.parse(localStorage.getItem('sigpro_expedientes_lista') || '[]');
        const expItem = {
            id: doc.id || doc.codigo,
            codigo: doc.codigo,
            tipo: doc.tipo || inferDocumentTypeFromCode(doc.codigo),
            nombre: doc.descripcion || `Expediente ${doc.codigo}`,
            macroProceso: doc.macroProceso || 'Gestión Institucional',
            fechaAprobacion: approvedDate.toISOString(),
            estado: 'aprobado',
            responsable: doc.responsable || doc.unidad || 'Oficina de Racionalización',
            facultad: doc.facultad || 'UNMSM',
            nombreFacultad: doc.facultad || 'UNMSM',
            publicUrl: publicUrl
        };
        const idxExp = expsGlobal.findIndex(e => String(e.codigo) === String(doc.codigo));
        if (idxExp >= 0) expsGlobal[idxExp] = { ...expsGlobal[idxExp], ...expItem };
        else expsGlobal.push(expItem);
        localStorage.setItem('sigpro_expedientes_lista', JSON.stringify(expsGlobal));

        // D) sigpro_documentos_lista (compartido entre vistas)
        const docsGlobal = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
        const docItem = {
            id: doc.id || doc.codigo,
            codigo: doc.codigo,
            tipo: doc.tipo || inferDocumentTypeFromCode(doc.codigo),
            estado: 'aprobado',
            descripcion: doc.descripcion || `Documento ${doc.codigo}`,
            nombre: doc.descripcion || `Documento ${doc.codigo}`,
            fecha: approvedDate.toISOString().split('T')[0],
            fechaAprobacion: approvedDate.toISOString(),
            nombreFacultad: doc.facultad || 'UNMSM',
            facultad: doc.facultad || 'UNMSM',
            responsable: doc.responsable || doc.unidad || 'Oficina de Racionalización',
            macroProceso: doc.macroProceso || 'Gestión Institucional',
            origen: 'expediente',
            publicUrl: publicUrl
        };
        const idxDoc = docsGlobal.findIndex(d => String(d.codigo || d.id) === String(doc.codigo));
        if (idxDoc >= 0) docsGlobal[idxDoc] = { ...docsGlobal[idxDoc], ...docItem };
        else docsGlobal.unshift(docItem);
        localStorage.setItem('sigpro_documentos_lista', JSON.stringify(docsGlobal));

        // ── 3. Sincronización en tiempo real ──
        ['sigpro_approved_docs','sigpro_expedientes_lista','sigpro_documentos_lista'].forEach(key => {
            window.dispatchEvent(new StorageEvent('storage', { key: key }));
        });

        document.dispatchEvent(new CustomEvent('historial-actualizado', {
            detail: { codigo: doc.codigo, accion: 'aprobado', publicUrl }
        }));

        // ── 4. UI y redirección ──
        doc.estado = "completado";
        doc.progreso = 100;
        doc.fecha = approvedDate;
        doc.publicUrl = publicUrl;
        state.allDocuments = state.allDocuments.map(item => 
            item.codigo === doc.codigo ? { ...item, estado: "completado", progreso: 100, fecha: approvedDate, publicUrl } : item
        );
        state.selectedDocument = doc;

        renderDocumentList();
        await renderSelectedDocument();

        sessionStorage.setItem('sigpro_just_approved', 'true');
        window.alert(`✅ Expediente aprobado y publicado.\n\nSe redirigirá al repositorio...`);
        window.location.href = 'racio-repositorio.html';

    } catch (error) {
        console.error("❌ Error en aprobación:", error);
        window.alert(`Error guardando la aprobación:\n${error.message}`);
    } finally {
        if (approveButton) {
            approveButton.classList.remove("cursor-wait", "opacity-80");
            updateApproveButtonState(state.selectedDocument);
        }
    }
}


// ==========================================
// USUARIO Y AUTENTICACIÓN
// ==========================================

function getCurrentUser() {
    if (typeof API !== "undefined" && API.auth?.getUser) {
        return API.auth.getUser();
    }
    try {
        const raw = localStorage.getItem("unmsm_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function initialsFromName(name) {
    const tokens = String(name || "").split(" ").filter(Boolean).slice(0, 2);
    return tokens.map((token) => token.charAt(0).toUpperCase()).join("") || "RA";
}

function guardAdminSession() {
    const loginPage = "portal-inicio-racio.html";
    const userPanelPage = "facultades-inicio.html";

    if (typeof API !== "undefined" && API.auth?.isAuthenticated) {
        if (!API.auth.isAuthenticated()) {
            window.location.replace(loginPage);
            return false;
        }
        const user = API.auth.getUser?.() || null;
        const role = String(user?.rol || "").toLowerCase();
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
    const user = getCurrentUser();
    const displayName = user?.nombreCompleto || user?.nombre || "Administrador Racio";
    const displayRole = user?.rol || "Administrador Global";
    const displayEmail = user?.correo || user?.email || "admin@unmsm.edu.pe";

    const avatar = document.getElementById("profile-avatar");
    const name = document.getElementById("profile-name");
    const role = document.getElementById("profile-role");
    const menuName = document.getElementById("profile-menu-name");
    const menuEmail = document.getElementById("profile-menu-email");

    if (avatar) avatar.textContent = initialsFromName(displayName);
    if (name) name.textContent = displayName;
    if (role) role.textContent = displayRole;
    if (menuName) menuName.textContent = displayName;
    if (menuEmail) menuEmail.textContent = displayEmail;
}

// ==========================================
// UI: TEMA, LOGOUT, TABS
// ==========================================

function setupThemeToggle() {
    const body = document.getElementById("racio-body");
    const toggle = document.getElementById("theme-toggle");
    const icon = document.getElementById("theme-icon");
    if (!body || !toggle || !icon) return;

    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
        body.classList.add("theme-dark");
        icon.textContent = "light_mode";
    }

    toggle.addEventListener("click", () => {
        const isDark = body.classList.toggle("theme-dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        icon.textContent = isDark ? "light_mode" : "dark_mode";
    });
}

function setupLogoutModal() {
    const modal = document.getElementById("logout-modal");
    const backdrop = document.getElementById("logout-modal-backdrop");
    const cancelButton = document.getElementById("logout-cancel");
    const confirmButton = document.getElementById("logout-confirm");
    if (!modal || !cancelButton || !confirmButton) return null;

    const closeModal = () => {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    };
    const openModal = () => {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    };
    const performLogout = async () => {
        try {
            if (typeof API !== "undefined" && API.auth?.logout) {
                await Promise.resolve(API.auth.logout());
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
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });

    return { openModal };
}

function setupProfileMenu(logoutControls) {
    const profileToggle = document.getElementById("profile-toggle");
    const profileMenu = document.getElementById("profile-menu");
    const logoutButton = document.getElementById("logout-button");
    if (!profileToggle || !profileMenu) return;

    const closeMenu = () => {
        profileMenu.classList.remove("is-open");
        profileToggle.classList.remove("open");
        profileToggle.setAttribute("aria-expanded", "false");
    };

    profileToggle.addEventListener("click", () => {
        if (profileMenu.classList.contains("is-open")) {
            closeMenu();
            return;
        }
        profileMenu.classList.add("is-open");
        profileToggle.classList.add("open");
        profileToggle.setAttribute("aria-expanded", "true");
    });

    document.addEventListener("click", (event) => {
        if (!profileMenu.contains(event.target) && !profileToggle.contains(event.target)) closeMenu();
    });

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            closeMenu();
            logoutControls?.openModal?.();
        });
    }
}

function setActiveMainTab(tabKey) {
    const tabs = {
        historial: document.getElementById("tab-historial"),
        reporte: document.getElementById("tab-reporte"),
        correcciones: document.getElementById("tab-correcciones")
    };
    const panels = {
        historial: document.getElementById("tab-panel-historial"),
        reporte: document.getElementById("tab-panel-reporte"),
        correcciones: document.getElementById("tab-panel-correcciones")
    };

    Object.values(tabs).forEach((tab) => {
        if (!tab) return;
        tab.classList.remove("font-bold", "text-primary", "border-primary", "bg-primary/5");
        tab.classList.add("font-semibold", "text-slate-500", "dark:text-slate-400", "border-transparent");
    });

    const activeTab = tabs[tabKey];
    if (activeTab) {
        activeTab.classList.remove("font-semibold", "text-slate-500", "dark:text-slate-400", "border-transparent");
        activeTab.classList.add("font-bold", "text-primary", "border-primary", "bg-primary/5");
    }

    Object.entries(panels).forEach(([key, panel]) => {
        if (panel) panel.classList.toggle("hidden", key !== tabKey);
    });
}

// ==========================================
// FORMULARIO DE CORRECCIONES
// ==========================================

// ==========================================
// FORMULARIO DE CORRECCIONES (CORREGIDO)
// ==========================================

function setupTabsAndCorrections() {
    const tabHistorial = document.getElementById("tab-historial");
    const tabReporte = document.getElementById("tab-reporte");
    const tabCorrecciones = document.getElementById("tab-correcciones");
    const correctionButton = document.getElementById("correction-expediente-btn");
    const correctionCancel = document.getElementById("correction-cancel");
    const correctionSubmit = document.getElementById("correction-submit-btn");
    const correctionForm = document.getElementById("correction-form");
    const correctionAttachment = document.getElementById("correction-attachment");
    const correctionAttachmentName = document.getElementById("correction-attachment-name");
    const correctionStatus = document.getElementById("correction-status");

    const setCorrectionStatus = (message, tone = "neutral") => {
        if (!correctionStatus) return;
        correctionStatus.classList.remove("hidden");
        const tones = {
            success: ["border-emerald-200", "bg-emerald-50", "text-emerald-700"],
            error: ["border-rose-200", "bg-rose-50", "text-rose-700"],
            neutral: ["border-slate-200", "bg-slate-50", "text-slate-700"]
        };
        const [border, bg, text] = tones[tone] || tones.neutral;
        correctionStatus.className = `mt-3 rounded-lg border px-3 py-2 text-sm font-medium ${border} ${bg} ${text}`;
        correctionStatus.textContent = message;
    };

    tabHistorial?.addEventListener("click", () => setActiveMainTab("historial"));
    tabReporte?.addEventListener("click", () => setActiveMainTab("reporte"));
    tabCorrecciones?.addEventListener("click", () => {
        setActiveMainTab("correcciones");
        document.getElementById("correction-email")?.focus();
    });
    correctionButton?.addEventListener("click", () => {
        setActiveMainTab("correcciones");
        document.getElementById("correction-email")?.focus();
    });
    correctionCancel?.addEventListener("click", () => setActiveMainTab("reporte"));

    correctionAttachment?.addEventListener("change", () => {
        const file = correctionAttachment.files?.[0];
        correctionAttachmentName.textContent = file ? `Adjunto: ${file.name}` : "Sin archivo adjunto";
    });

    correctionForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        setCorrectionStatus("Procesando...", "neutral");
        if (correctionSubmit) correctionSubmit.disabled = true;

        try {
            const doc = state.selectedDocument;
            if (!doc) {
                setCorrectionStatus("Seleccione un expediente primero.", "error");
                return;
            }

            const emailInput = document.getElementById("correction-email");
            const subjectInput = document.getElementById("correction-subject");
            const observationsInput = document.getElementById("correction-observations");
            const attachmentInput = document.getElementById("correction-attachment");

            const correoInstitucional = String(emailInput?.value || "").trim();
            const asunto = String(subjectInput?.value || "").trim();
            const observaciones = String(observationsInput?.value || "").trim();
            const attachmentFile = attachmentInput?.files?.[0] || null;

            if (!/@unmsm\.edu\.pe$/i.test(correoInstitucional)) {
                setCorrectionStatus("Ingrese un correo institucional válido (@unmsm.edu.pe).", "error");
                emailInput?.focus();
                return;
            }
            if (!asunto || !observaciones) {
                setCorrectionStatus("Complete Asunto y Observaciones.", "error");
                return;
            }

            // 🔥 FIX: Procesar adjunto SIEMPRE como base64, sin importar tamaño
            let attachment = null;
            let reducedForStorageQuota = false;

            if (attachmentFile) {
                try {
                    // 🔥 SIEMPRE leer como base64 completo
                    const dataUrl = await readFileAsDataUrl(attachmentFile);
                    
                    // 🔥 FIX: Guardar SIEMPRE en IndexedDB (sin importar el tamaño)
                    // Esto garantiza que el indexedDbKey usado como fallback
                    // ante cuota excedida en localStorage SIEMPRE apunte a un registro real.
                    try {
                        const db = await openAdjuntosIndexedDb();
                        const tx = db.transaction("adjuntos", "readwrite");
                        const store = tx.objectStore("adjuntos");
                        const key = `${doc.codigo}::${attachmentFile.name}`;
                        await new Promise((resolve, reject) => {
                            const request = store.put({
                                id: key,
                                codigo: doc.codigo,
                                name: attachmentFile.name,
                                nombre: attachmentFile.name,
                                type: attachmentFile.type,
                                tipo: attachmentFile.type,
                                size: attachmentFile.size,
                                tamaño: attachmentFile.size,
                                url: dataUrl,
                                content: dataUrl,
                                contenido: dataUrl,
                                base64: dataUrl,
                                data: dataUrl,
                                fecha: new Date().toISOString()
                            });
                            request.onsuccess = () => resolve();
                            request.onerror = () => reject(request.error);
                        });
                        db.close();
                        console.log("✅ Adjunto respaldado en IndexedDB:", key);
                    } catch (idbError) {
                        console.warn("No se pudo guardar en IndexedDB:", idbError);
                    }

                    attachment = {
                        name: attachmentFile.name,
                        nombre: attachmentFile.name,           // ← Nombre en español también
                        type: attachmentFile.type,
                        tipo: attachmentFile.type,             // ← Tipo en español también
                        size: attachmentFile.size,
                        tamaño: attachmentFile.size,           // ← Tamaño en español también
                        url: dataUrl,                          // ← data URL completa
                        content: dataUrl,                      // ← Mismo contenido
                        contenido: dataUrl,                    // ← En español también
                        base64: dataUrl,                       // ← Alias para compatibilidad
                        data: dataUrl,                         // ← Alias para compatibilidad
                        date: new Date().toISOString(),
                        fecha: new Date().toISOString()        // ← En español también
                    };
                } catch (error) {
                    setCorrectionStatus("No se pudo leer el adjunto.", "error");
                    return;
                }
            }

            const request = {
                id: `corr_${Date.now()}`,
                codigo: doc.codigo,
                docId: doc.id,
                correoInstitucional,
                asunto,
                observaciones,
                adjunto: attachment,           // ← Objeto con TODOS los campos
                adjuntos: attachment ? [attachment] : [],  // ← Array también para compatibilidad
                fecha: new Date().toISOString(),
                estado: "registrado",
                estadoDestino: "en_proceso",
                destinatario: correoInstitucional,
                asuntoCorreo: `[SIGPRO] Corrección ${doc.codigo}: ${asunto}`,
                cuerpoCorreo: [
                    `Expediente: ${doc.codigo}`,
                    `Facultad: ${doc.facultad}`,
                    "",
                    "Observaciones:",
                    observaciones,
                    "",
                    attachmentFile ? `Adjunto: ${attachmentFile.name}` : "Sin archivo adjunto."
                ].join("\n")
            };

            // Guardar en caché de sesión para preview inmediato
            if (attachment?.url) correctionPreviewCache.set(request.id, { ...attachment });

            const historial = parseJsonArray(localStorage.getItem(STORAGE_KEYS.CORRECCIONES_LISTA));
            historial.push(request);
            
            // ==========================================
            // GUARDAR EN LOCALSTORAGE (con manejo de cuota)
            // ==========================================
            let requestToSave = request;
            let savedToPrimary = false;

            try {
                localStorage.setItem(STORAGE_KEYS.CORRECCIONES_LISTA, JSON.stringify(historial));
                savedToPrimary = true;
            } catch (storageError) {
                const isQuotaExceeded = storageError?.name === "QuotaExceededError" || [22, 1014].includes(storageError?.code);
                if (isQuotaExceeded) {
                    // Reducir adjunto y reintentar
                    const reducedAttachment = attachment ? {
                        name: attachment.name,
                        nombre: attachment.nombre,
                        type: attachment.type,
                        tipo: attachment.tipo,
                        size: attachment.size,
                        tamaño: attachment.tamaño,
                        url: "",
                        content: "",
                        contenido: "",
                        base64: "",
                        data: "",
                        reducedForStorage: true,
                        indexedDbKey: `${doc.codigo}::${attachment.name}`
                    } : null;
                    
                    requestToSave = { ...request, adjunto: reducedAttachment, adjuntos: reducedAttachment ? [reducedAttachment] : [] };
                    historial[historial.length - 1] = requestToSave;
                    
                    try {
                        localStorage.setItem(STORAGE_KEYS.CORRECCIONES_LISTA, JSON.stringify(historial));
                        savedToPrimary = true;
                    } catch (e2) {
                        console.error("❌ No se pudo guardar ni siquiera sin adjunto:", e2);
                    }
                } else {
                    throw storageError;
                }
            }

            // ==========================================
            // 2) SIEMPRE guardar en clave SIN prefijo (para facultades)
            // ==========================================
            const saveToShared = (key) => {
                try {
                    const sharedRaw = localStorage.getItem(key) || '[]';
                    const sharedList = JSON.parse(sharedRaw);
                    sharedList.push(requestToSave);
                    localStorage.setItem(key, JSON.stringify(sharedList));
                } catch (e) {
                    console.warn(`No se pudo guardar en ${key}:`, e);
                }
            };

            saveToShared('sigpro_correcciones_solicitudes');
            saveToShared('sigpro_correcciones_shared');

            // ==========================================
            // 3) Sincronizar estado del documento
            // ==========================================
            syncCorrectionToSharedStorages(doc, requestToSave);

            // ==========================================
            // 4) Disparar eventos
            // ==========================================
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'sigpro_correcciones_solicitudes',
                newValue: JSON.stringify(requestToSave)
            }));
            document.dispatchEvent(new CustomEvent('historial-actualizado', {
                detail: { codigo: doc.codigo, accion: 'correccion_enviada', correccionId: requestToSave.id }
            }));

            syncCorrectionToSharedStorages(doc, request);
            state.selectedCorrectionId = request.id;
            renderHistoryPanel(doc.codigo);

            if (navigator.clipboard?.writeText) {
                void navigator.clipboard.writeText(request.cuerpoCorreo).catch(() => {});
            }

            const warnings = [];
            if (reducedForStorageQuota) warnings.push("guardado con referencia (recuperar desde IndexedDB)");
            const warningText = warnings.length ? ` (${warnings.join("; ")})` : "";
            setCorrectionStatus(`Corrección registrada${warningText}.`, "success");

            correctionForm.reset();
            correctionAttachmentName.textContent = "Sin archivo adjunto";
            renderDocumentList();
            void renderSelectedDocument();
        } catch (error) {
            console.error("Error:", error);
            setCorrectionStatus("Error al registrar. Intente con un adjunto más ligero.", "error");
        } finally {
            if (correctionSubmit) correctionSubmit.disabled = false;
        }
    });

    setActiveMainTab("reporte");
}

// ==========================================
// CARGA Y NORMALIZACIÓN DE DOCUMENTOS
// ==========================================

function normalizeDocument(doc, index) {
    const date = parseDate(doc.fecha || doc.fechaCreacion || doc.createdAt || doc.updatedAt);
    const codigo = doc.codigo || doc.code || `EXP-${date.getFullYear()}-${String(index + 1).padStart(4, "0")}`;
    const facultyId = doc.facultyId || doc.facultadId || doc.facultad_id || doc.faculty?.id || "";
    const faculty = doc.nombreFacultad || doc.facultad || doc.facultadNombre || doc.generadoPor || "Facultad no especificada";
    const unit = doc.unidad || doc.area || doc.generadoPor || "Unidad administrativa";
    const status = normalizeEstado(doc.estado || doc.status || doc.estadoTexto);
    const description = doc.descripcion || doc.nombre || "Expediente";

    return {
        id: doc.id || codigo,
        facultyId,
        codigo,           // ← clave principal
        code: codigo,     // ← alias por compatibilidad
        faculty,
        facultad: faculty,
        unit,
        unidad: unit,
        status,
        estado: status,
        date,
        fecha: date,
        progress: Number.isFinite(doc.progreso) ? Number(doc.progreso) : inferProgress(status),
        progreso: Number.isFinite(doc.progreso) ? Number(doc.progreso) : inferProgress(status),
        description,
        descripcion: description,
        contenido: doc.contenido || doc.texto || doc.descripcionCompleta || "",
        resumen: doc.resumen || doc.observacion || "",
        version: doc.version || doc.versión || doc.numeroVersion || 1,
        resumenCampos: Array.isArray(doc.resumenCampos) ? doc.resumenCampos : [],
        fichaData: doc.fichaData && typeof doc.fichaData === "object" ? doc.fichaData : {},
        reporteData: doc.reporteData && typeof doc.reporteData === "object"
            ? doc.reporteData
            : (doc.reportData && typeof doc.reportData === "object" ? doc.reportData : {}),
        adjuntos: Array.isArray(doc.adjuntos) && doc.adjuntos.length
            ? doc.adjuntos
            : (Array.isArray(doc.attachments) && doc.attachments.length ? doc.attachments : []),
        attachments: Array.isArray(doc.attachments) && doc.attachments.length
            ? doc.attachments
            : (Array.isArray(doc.adjuntos) && doc.adjuntos.length ? doc.adjuntos : [])
    };
}

function extractArrayPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

async function loadApiDocuments() {
    if (typeof API === "undefined" || !API.documentos?.getAll) return [];
    try {
        const result = await (API.admin && API.admin.documents && typeof API.admin.documents.getAdminDocuments === 'function'
            ? API.admin.documents.getAdminDocuments('', '', 1, 20)
            : API.documentos.getAll({}));
        if (!result?.success) return [];
        return extractArrayPayload(result.data).map((doc, index) => normalizeDocument(doc, index));
    } catch {
        return [];
    }
}

function loadLocalDocuments() {
    const clavesBuscar = [
        STORAGE_KEYS.DOCUMENTOS_LISTA,      // local_... o remote_...
        'sigpro_documentos_lista',          // sin prefijo (compatibilidad)
        'remote_sigpro_documentos_lista',
        'sigpro_reportes',                    // ← donde las fichas técnicas guardan
        'sigpro_user_documents',
        'local_sigpro_user_documents',
        'remote_sigpro_user_documents'
    ];
    
    let todos = [];
    
    for (const clave of clavesBuscar) {
        const raw = localStorage.getItem(clave);
        if (!raw) continue;
        try {
            const list = JSON.parse(raw);
            if (!Array.isArray(list)) continue;
            
            const normalizados = list.map((doc, index) => {
                const estado = normalizeEstado(doc.estado || doc.status || 'pendiente');
                const progreso = Number.isFinite(doc.progreso) ? doc.progreso : inferProgress(estado);
                const fechaRaw = doc.fecha || doc.fechaCreacion || doc.createdAt || doc.updatedAt || new Date().toISOString();
                
                return normalizeDocument({
                    ...doc,
                    fecha: fechaRaw,
                    estado: estado,
                    progreso: progreso
                }, index);
            });
            
            todos = todos.concat(normalizados);
        } catch (e) {
            console.warn(`Error leyendo ${clave}:`, e);
        }
    }
    
    // Eliminar duplicados por código, manteniendo el más reciente
    const porCodigo = new Map();
    todos.forEach(doc => {
        const key = doc.codigo || doc.id;
        if (!key) return;
        const existente = porCodigo.get(key);
        if (!existente || (doc.fecha && existente.fecha && doc.fecha > existente.fecha)) {
            porCodigo.set(key, doc);
        }
    });
    
    return Array.from(porCodigo.values());
}

function loadLocalDetailDocuments() {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    if (!raw) return [];
    try {
        const detailMap = JSON.parse(raw);
        if (!detailMap || typeof detailMap !== "object") return [];

        let cacheMap = {};
        try {
            const rawCache = sessionStorage.getItem("sigpro_adjuntos_cache");
            cacheMap = rawCache ? JSON.parse(rawCache) : {};
        } catch {
            cacheMap = {};
        }

        return Object.entries(detailMap).map(([codigo, detail], index) => {
            const item = detail && typeof detail === "object" ? detail : {};
            const fichaData = item.fichaData && typeof item.fichaData === "object" ? item.fichaData : {};
            
            // 🔥 Buscar adjuntos en TODAS las ubicaciones posibles
            const savedAdjuntos = Array.isArray(item.adjuntos) ? item.adjuntos : [];
            const fichaAdjuntos = Array.isArray(fichaData.adjuntos) ? fichaData.adjuntos : [];
            const cacheAdjuntos = Array.isArray(cacheMap?.[codigo]) ? cacheMap[codigo] : [];
            const baseAdjuntos = mergeAttachmentsByName(
                savedAdjuntos.length ? savedAdjuntos : fichaAdjuntos,
                cacheAdjuntos
            );

            return normalizeDocument({
                ...item,
                ...fichaData,
                codigo: item.codigo || fichaData.codigo || codigo,
                descripcion: item.titulo || fichaData.descripcion || `Documento ${codigo}`,
                nombreFacultad: fichaData.facultad || fichaData.nombreFacultad || fichaData.generadoPor,
                unidad: fichaData.unidad || fichaData.generadoPor,
                fecha: item.fechaRegistro || fichaData.fechaRegistro || new Date().toISOString(),
                estado: item.estado || fichaData.estado || "pendiente",
                progreso: Number.isFinite(item.progreso) ? item.progreso : (Number.isFinite(fichaData.progreso) ? fichaData.progreso : 5),
                adjuntos: baseAdjuntos,
                attachments: baseAdjuntos
            }, index);
        });
    } catch {
        return [];
    }
}

function mergeDocuments(apiDocs, localDocs) {
	const map = new Map();
	apiDocs.forEach((d) => map.set(d.codigo, d));
	localDocs.forEach((d) => {
		const existing = map.get(d.codigo);
		map.set(d.codigo, existing ? { ...existing, ...d } : d);
	});
	return Array.from(map.values());
}

function getQueryParams() {
    return new URLSearchParams(window.location.search);
}

function toFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function buildDocumentFromQueryParams(params, selectedCode) {
    if (!selectedCode) return null;
    const descripcion = params.get("descripcion") || `Expediente ${selectedCode}`;
    const facultad = params.get("facultad") || "Facultad no especificada";
    const unidad = params.get("unidad") || facultad || "Unidad administrativa";
    const estado = normalizeEstado(params.get("estado") || "pendiente");
    const fecha = parseDate(params.get("fecha"));
    const tipo = params.get("tipo") || inferDocumentTypeFromCode(selectedCode);
    const progresoFromQuery = toFiniteNumber(params.get("progreso"), NaN);
    const progreso = Number.isFinite(progresoFromQuery)
        ? Math.max(0, Math.min(100, progresoFromQuery))
        : (estado === "completado" ? 100 : estado === "en_proceso" ? 60 : 20);

    return {
        id: selectedCode,
        codigo: selectedCode,
        code: selectedCode,
        tipo,
        descripcion,
        facultad,
        unidad,
        estado,
        status: estado,
        progreso,
        progress: progreso,
        fecha,
        date: fecha,
        contenido: "",
        resumen: "",
        version: 1,
        resumenCampos: [],
        fichaData: {},
        attachments: []
    };
}

// ==========================================
// RENDERIZADO DE DOCUMENTOS Y PREVIEW
// ==========================================

function statusClass(status) {
    if (status === "completado") return "bg-emerald-100 text-emerald-700";
    if (status === "en_proceso") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getFormalSummary(doc) {
    return doc.contenido || doc.resumen || 
        `El expediente ${doc.codigo} fue remitido por ${doc.facultad} para revisión administrativa dentro de ${doc.unidad}.`;
}

function getAttachmentFileName(doc) {
    const selected = resolveSelectedAttachment(doc);
    if (selected?.name) return selected.name;
    const first = Array.isArray(doc.attachments) && doc.attachments.length ? doc.attachments[0] : null;
    return first?.name || `${doc.codigo}.xlsx`;
}

function getPrimaryAttachmentByExtensions(doc, extensions) {
    if (!Array.isArray(doc.attachments)) return null;
    return doc.attachments.find((attachment) => extensions.includes(fileExtension(attachment.name)));
}

/**
 * 🔥 FUNCIÓN CRÍTICA CORREGIDA
 * Obtiene URL de preview buscando en TODOS los campos posibles
 */
function getAttachmentPreviewUrl(doc) {
    const selected = resolveSelectedAttachment(doc);
    if (selected) {
        // Buscar en todos los campos del adjunto seleccionado
        if (selected.url) return selected.url;
        if (selected.content) return toDataUrlFromBase64(selected.content, selected.name || `${doc.codigo}.pdf`);
        if (selected.contenido) return toDataUrlFromBase64(selected.contenido, selected.name || `${doc.codigo}.pdf`);
        if (selected.base64) return toDataUrlFromBase64(selected.base64, selected.name || `${doc.codigo}.pdf`);
        if (selected.data) return toDataUrlFromBase64(selected.data, selected.name || `${doc.codigo}.pdf`);
    }
    
    // Buscar en el primer adjunto
    const first = Array.isArray(doc.attachments) && doc.attachments.length ? doc.attachments[0] : null;
    if (first) {
        if (first.url) return first.url;
        if (first.content) return toDataUrlFromBase64(first.content, first.name || `${doc.codigo}.pdf`);
        if (first.contenido) return toDataUrlFromBase64(first.contenido, first.name || `${doc.codigo}.pdf`);
        if (first.base64) return toDataUrlFromBase64(first.base64, first.name || `${doc.codigo}.pdf`);
    }
    
    return "";
}

function getAttachmentTypeIcon(fileName) {
    const extension = String(fileName || "").split(".").pop().toLowerCase();
    if (extension === "xlsx" || extension === "xls") return "table_chart";
    if (extension === "pdf") return "picture_as_pdf";
    if (extension === "doc" || extension === "docx") return "description";
    return "insert_drive_file";
}

function getAttachmentMeta(fileName) {
    const extension = fileExtension(fileName).toUpperCase();
    if (extension === "XLSX" || extension === "XLS") return `Excel • ${fileName}`;
    if (extension === "PDF") return `PDF • ${fileName}`;
    if (extension === "DOC" || extension === "DOCX") return `Word • ${fileName}`;
    return fileName;
}

function getTipoLabel(tipo) {
    const labels = {
        inventario: "Inventarios",
        reporte: "Reportes",
        flujograma: "Flujogramas",
        indicador: "Indicador",
        caracterizacion: "Caracterización"
    };
    return labels[tipo] || "Documento";
}

function getAsuntoByTipo(tipo) {
    const asuntos = {
        indicador: "INDICADORES",
        flujograma: "FLUJOGRAMAS",
        caracterizacion: "FICHA TECNICA",
        inventario: "INVENTARIO",
        reporte: "REPORTES"
    };
    return asuntos[tipo] || "DOCUMENTOS";
}

function getTechnicalInfoRows(doc) {
    const ficha = doc.fichaData || {};
    const reporte = doc.reporteData || {};
    const rows = [];
    const resumenCampos = Array.isArray(doc.resumenCampos) ? doc.resumenCampos : [];
    const addRow = (label, value) => {
        const finalLabel = safeValue(label);
        const finalValue = safeValue(value);
        if (finalValue === "-") return;
        rows.push({ label: finalLabel, value: finalValue });
    };

    const getResumenValue = (label, fallback = "-") => {
        const wanted = normalizeText(label);
        const found = resumenCampos.find((item) => normalizeText(item?.label) === wanted);
        return found?.value || fallback;
    };

    const tipoHandlers = {
        indicador: () => {
            addRow("Tipo de Proceso", ficha.tipoProcesoLabel || ficha.tipoProceso || getResumenValue("Tipo de Proceso"));
            addRow("Macro Proceso", ficha.macroProcesoNombre || ficha.macroProceso || getResumenValue("Macro Proceso"));
            addRow("Oficina o Unidad Responsable", ficha.unidadResponsable || getResumenValue("Oficina o Unidad Responsable"));
            addRow("Objetivo del Proceso", ficha.objetivoProceso || getResumenValue("Objetivo del Proceso"));
            addRow("Nombre del Indicador", ficha.nombreIndicador || getResumenValue("Nombre del Indicador") || doc.descripcion);
            addRow("Frecuencia", ficha.frecuencia || getResumenValue("Frecuencia"));
            addRow("Variables", ficha.variables || getResumenValue("Variables"));
            addRow("Formula del Indicador", ficha.formulaDefinicion || ficha.formula || getResumenValue("Formula del Indicador"));
            addRow("Fuente", ficha.fuente || getResumenValue("Fuente"));
            addRow("Meta", ficha.meta || getResumenValue("Meta"));
        },
        flujograma: () => {
            addRow("Tipo de Proceso", ficha.tipoProcesoLabel || ficha.tipoProceso || getResumenValue("Tipo de Proceso"));
            addRow("Proceso", ficha.macroProcesoNombre || ficha.macroProceso || getResumenValue("Proceso"));
            addRow("Nombre de la actividad", ficha.proceso || ficha.actividad || getResumenValue("Nombre de la actividad") || doc.descripcion);
        },
        caracterizacion: () => {
            addRow("Tipo de Proceso", ficha.tipoProcesoLabel || ficha.tipoProceso || getResumenValue("Tipo de Proceso"));
            addRow("Proceso", ficha.macroProcesoNombre || ficha.macroProceso || getResumenValue("Proceso"));
        },
        inventario: () => {
            addRow("Versión", doc.version || ficha.version || getResumenValue("Versión"));
            addRow("Fecha de elaboración", ficha.fechaElaboracion || getResumenValue("Fecha de elaboración"));
        },
        reporte: () => {
            addRow("Semestre", reporte.semestre || ficha.semestreReporte || getResumenValue("Semestre"));
            addRow("Fecha de elaboracion", reporte.fechaElaboracion || ficha.fechaElaboracion || getResumenValue("Fecha de elaboracion"));
            addRow("Responsable", reporte.responsable || ficha.nombreResponsable || getResumenValue("Responsable"));
            addRow("Cargo", reporte.cargo || ficha.cargoResponsable || getResumenValue("Cargo"));
            addRow("Unidad orgánica Responsable", reporte.unidadOrganicaResponsable || reporte.unidadResponsable || ficha.unidadOrganicaResponsable || ficha.unidadResponsable || getResumenValue("Unidad orgánica Responsable"));
            addRow("Actividades realizadas", reporte.actividades || ficha.actividadesRealizadas || getResumenValue("Actividades realizadas"));
            addRow("Resultados obtenidos", reporte.resultados || ficha.resultadosObtenidos || getResumenValue("Resultados obtenidos"));
            addRow("Observaciones", reporte.observaciones || ficha.observaciones || getResumenValue("Observaciones"));
        }
    };

    (tipoHandlers[doc.tipo] || (() => {}))();

    if (!rows.length && resumenCampos.length) {
        resumenCampos.forEach((item) => {
            addRow(item?.label, item?.value);
        });
    }

    if (!rows.length && doc.tipo === "indicador") {
        addRow("Nombre del Indicador", doc.descripcion || doc.nombre || doc.codigo);
        addRow("Facultad", doc.facultad || doc.nombreFacultad || "-");
        addRow("Unidad", doc.unidad || "-");
        addRow("Estado", doc.estado || doc.status || "-");
    }

    return dedupeTechnicalRows(rows);
}

function buildTechnicalAttachment(doc) {
    return {
        name: `${doc.codigo}-informacion-tecnica.pdf`,
        type: "pdf",
        url: "",
        size: "Auto",
        date: doc.fecha,
        generatedType: "technical-pdf"
    };
}

function buildTechnicalPreviewContent(doc) {
    const rows = getTechnicalInfoRows(doc);
    window.__fichaTecnicaDoc = doc;
    window.__fichaTecnicaRows = rows;

    const byLabel = (pattern, fallback = "-") => {
        const found = rows.find((row) => pattern.test(normalizeText(row.label || "")));
        return found?.value || fallback;
    };
    const metaValue = byLabel(/meta/);
    
    return `
        <div class="flex justify-center my-8 px-4">
            <div class="w-full max-w-[1040px] rounded-[28px] bg-slate-900/90 p-4 shadow-2xl">
                <div class="overflow-hidden rounded-[22px] bg-white">
                    <div class="bg-[#0f4b5f] px-6 py-6 text-white">
                        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h3 class="text-2xl md:text-3xl font-black tracking-tight leading-tight">FICHA TÉCNICA DEL INDICADOR</h3>
                                <p class="mt-2 text-xs text-white/80">Documento formal generado automáticamente desde SIGPRO</p>
                            </div>
                            <div class="text-left md:text-right">
                                <p class="text-lg font-black tracking-wide">${escapeHtml(String(doc.codigo || doc.version || "--"))}</p>
                                <p class="mt-1 text-xs text-white/80">Fecha: ${escapeHtml(String(doc.fecha || "--"))}</p>
                            </div>
                        </div>
                    </div>

                    <div class="p-7 md:p-9 bg-slate-50">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                            ${rows.map((row) => {
                                let value = row.value;
                                if (row.label?.toLowerCase().includes('meta') && /^\d+(\.\d+)?$/.test(String(value).trim()) && !String(value).includes('%')) {
                                    value = `${value} %`;
                                }
                                return `
                                    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm min-h-[92px]">
                                        <p class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">${escapeHtml(row.label)}</p>
                                        <p class="mt-2 text-sm font-semibold leading-6 text-slate-800 whitespace-pre-line break-words">${escapeHtml(value)}</p>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <div class="mt-6 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
                            Datos técnicos del indicador
                        </div>

                        <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
                            <div class="flex flex-wrap items-center gap-3">
                                <span class="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">Estado de meta</span>
                                <span class="text-4xl font-black text-red-500 leading-none">${escapeHtml(metaValue)}</span>
                                <span class="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700">Indicador</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function generateTechnicalPdfBlob(doc) {
    if (!window.jspdf?.jsPDF) {
        throw new Error("Librería jsPDF no cargada.");
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 18;
    const marginTop = 14;
    const marginBottom = 18;
    const maxWidth = pageWidth - marginX * 2;
    const bottomLimit = pageHeight - marginBottom;
    let y = marginTop;
    const rows = getTechnicalInfoRows(doc);
    const metaRow = rows.find((row) => /meta/i.test(row.label || ""));
    const metaValue = metaRow?.value || "-";

    const drawFooter = (pageNumber) => {
        pdf.setDrawColor(221, 226, 232);
        pdf.setLineWidth(0.3);
        pdf.line(marginX, pageHeight - 8, pageWidth - marginX, pageHeight - 8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(120);
        pdf.text("SIGPRO UNMSM", marginX, pageHeight - 4);
        pdf.text(`Página ${pageNumber}`, pageWidth - marginX, pageHeight - 4, { align: "right" });
    };

    const writeHeader = () => {
        pdf.setDrawColor(26, 62, 78);
        pdf.setFillColor(26, 82, 102);
        pdf.roundedRect(marginX, marginTop, pageWidth - marginX * 2, 26, 4, 4, "F");
        pdf.setFillColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(17);
        pdf.setTextColor(255, 255, 255);
        pdf.text("FICHA TÉCNICA DEL INDICADOR", marginX + 4, y + 9);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text("Documento formal generado automáticamente desde SIGPRO", marginX + 4, y + 16);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(String(doc.codigo || doc.version || "--"), pageWidth - marginX - 2, y + 9, { align: "right" });
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Fecha: ${String(doc.fecha || "--")}`, pageWidth - marginX - 2, y + 16, { align: "right" });

        y += 36;
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0);
    };

    const startNewPage = () => {
        drawFooter(pdf.getNumberOfPages());
        pdf.addPage();
        y = marginTop;
        writeHeader();
    };

    writeHeader();

    if (!rows.length) {
        pdf.setFontSize(11);
        pdf.text("Sin campos registrados.", marginX, y);
        drawFooter(pdf.getNumberOfPages());
        return pdf.output("blob");
    }

    pdf.setFontSize(12);
    const rowSpacing = 11;
    const cardGap = 6;
    const cardWidth = (pageWidth - (marginX * 2) - cardGap) / 2;
    const cardPadding = 5;

    rows.forEach((row, index) => {
        let value = row.value;
        if (row.label?.toLowerCase().includes("meta") && /^\d+(\.\d+)?$/.test(String(value).trim()) && !String(value).includes("%")) {
            value = `${value} %`;
        }

        const valueLines = pdf.splitTextToSize(String(value || ""), cardWidth - cardPadding * 2);
        const cardHeight = Math.max(18, 11 + valueLines.length * 5.4);

        if (y + cardHeight + 22 > bottomLimit) {
            startNewPage();
        }

        const isLeftColumn = index % 2 === 0;
        const x = isLeftColumn ? marginX : marginX + cardWidth + cardGap;
        if (isLeftColumn && index > 0) {
            y += 2;
        }

        pdf.setDrawColor(219, 227, 236);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.8);
        pdf.setTextColor(90, 99, 110);
        pdf.text(String(row.label || "").toUpperCase(), x + cardPadding, y + 5.2);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(20, 28, 36);
        pdf.text(valueLines, x + cardPadding, y + 12);

        if (!isLeftColumn || index === rows.length - 1) {
            y += cardHeight + 5;
        }

        if (index === rows.length - 1) {
            y += 1;
        }
    });

    const stateBandY = Math.min(y + 4, bottomLimit - 24);
    pdf.setFillColor(22, 184, 104);
    pdf.roundedRect(marginX, stateBandY, maxWidth, 8, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text("DATOS TÉCNICOS DEL INDICADOR", pageWidth / 2, stateBandY + 5.4, { align: "center" });

    const metaBandY = stateBandY + 13;
    pdf.setDrawColor(182, 235, 206);
    pdf.setFillColor(240, 253, 244);
    pdf.roundedRect(marginX, metaBandY, maxWidth, 18, 2, 2, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text("ESTADO DE META", marginX + 4, metaBandY + 11);
    pdf.setFontSize(19);
    pdf.setTextColor(239, 68, 68);
    pdf.text(String(metaValue || "-"), marginX + 33, metaBandY + 12);

    drawFooter(1);

    return pdf.output("blob");
}

function buildReportSummaryPreviewContent(doc) {
    const reporte = doc.reporteData || {};
    const resumen = Array.isArray(doc.resumenCampos) ? doc.resumenCampos : [];
    const getResumenValue = (label, fallback = "-") => {
        const wanted = normalizeText(label);
        const found = resumen.find((item) => normalizeText(item?.label) === wanted);
        return found?.value || fallback;
    };

    const rows = [
        ["Semestre", reporte.semestre || getResumenValue("Semestre")],
        ["Fecha de Elaboración", reporte.fechaElaboracion || getResumenValue("Fecha de elaboracion")],
        ["Responsable", reporte.responsable || getResumenValue("Responsable")],
        ["Cargo", reporte.cargo || getResumenValue("Cargo")],
        ["Unidad orgánica Responsable", reporte.unidadOrganicaResponsable || reporte.unidadResponsable || getResumenValue("Unidad orgánica Responsable") || getResumenValue("Unidad responsable")],
        ["Actividades realizadas", reporte.actividades || getResumenValue("Actividades realizadas")],
        ["Resultados obtenidos", reporte.resultados || getResumenValue("Resultados obtenidos")],
        ["Observaciones", reporte.observaciones || getResumenValue("Observaciones")]
    ].filter(([, value]) => String(value || "").trim() && String(value) !== "-");

    return `
        <div class="ficha-tecnica-formal bg-gradient-to-br from-slate-50 to-slate-200 rounded-2xl border-4 border-primary/60 shadow-2xl p-10 max-w-2xl mx-auto my-10">
            <div class="flex flex-col items-center mb-8">
                <div class="uppercase tracking-widest text-primary font-extrabold text-lg mb-2">Ficha del Reporte</div>
                <div class="w-16 h-1 rounded-full bg-primary/40 mb-2"></div>
                <div class="text-slate-500 text-xs mb-2">Vista previa resumida del contenido guardado</div>
            </div>
            <table class="w-full text-base">
                <tbody>
                    ${rows.map(([label, value]) => `
                        <tr>
                            <th class="text-right align-top pr-4 py-2 font-semibold text-slate-700 w-48">${escapeHtml(label)}</th>
                            <td class="text-slate-900 py-2 text-left">${escapeHtml(value)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function downloadTechnicalPdf(doc) {
    generateTechnicalPdfBlob(doc)
        .then((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${doc.codigo}-informacion-tecnica.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        })
        .catch((error) => {
            console.error("Error generando PDF técnico:", error);
            window.alert(error.message || "No se pudo generar el PDF técnico.");
        });
}

function updatePreviewScale(scale) {
    state.previewScale = Math.min(1.4, Math.max(0.7, scale));
    const previewContent = document.getElementById("preview-content");
    if (previewContent) {
        previewContent.style.zoom = `${Math.round(state.previewScale * 100)}%`;
        previewContent.style.transform = `scale(${state.previewScale})`;
        previewContent.style.transformOrigin = "top left";
        previewContent.style.transition = "transform 0.18s ease";
    }
    const zoomLabel = document.getElementById("preview-zoom-label");
    if (zoomLabel) zoomLabel.textContent = `${Math.round(state.previewScale * 100)}%`;
}

function updatePreviewToolbar(doc, entries) {
    const pageLabel = document.getElementById("preview-page-label");
    if (pageLabel) {
        const total = entries.length || 1;
        const current = Math.min(total, Math.max(1, state.currentAttachmentIndex + 1));
        pageLabel.textContent = `Pág. ${current} / ${total}`;
    }
    const prevButton = document.querySelector('[data-preview-action="prev"]');
    const nextButton = document.querySelector('[data-preview-action="next"]');
    if (prevButton) prevButton.disabled = (entries.length || 0) <= 1;
    if (nextButton) nextButton.disabled = (entries.length || 0) <= 1;
    const documentName = document.getElementById("document-name");
    if (documentName) documentName.textContent = getAttachmentFileName(doc);
}

function openPrintablePreview(doc) {
    const printableHtml = buildPrintableDocumentHtml(doc);
    const printFrame = document.createElement("iframe");
    printFrame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    printFrame.setAttribute("aria-hidden", "true");
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) { printFrame.remove(); return; }
    frameDoc.open();
    frameDoc.write(printableHtml);
    frameDoc.close();
    printFrame.onload = () => {
        try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
        } catch {
            // Ignore print errors
        } finally {
            setTimeout(() => printFrame.remove(), 1000);
        }
    };
}

function buildPdfFallbackContent(doc, fileName) {
    return `
        <div class="pdf-fallback-page">
            <div class="pdf-fallback-header">
                <span class="material-symbols-outlined">picture_as_pdf</span>
                <div>
                    <p class="pdf-fallback-label">Documento PDF</p>
                    <h4>${escapeHtml(fileName)}</h4>
                </div>
            </div>
            <div class="pdf-fallback-body">
                <p><strong>Código:</strong> ${escapeHtml(doc.codigo)}</p>
                <p><strong>Facultad:</strong> ${escapeHtml(doc.facultad)}</p>
                <p><strong>Asunto:</strong> ${escapeHtml(doc.descripcion)}</p>
                <p><strong>Estado:</strong> ${getStatusLabel(doc.estado)}</p>
                <p><strong>Fecha:</strong> ${formatDisplayDate(doc.fecha)}</p>
                <p class="pdf-fallback-note">El PDF no tiene URL pública disponible.</p>
            </div>
        </div>
    `;
}

function buildExcelUnavailableContent(fileName) {
    return `
        <div class="pdf-fallback-page">
            <div class="pdf-fallback-header">
                <span class="material-symbols-outlined">table_chart</span>
                <div>
                    <p class="pdf-fallback-label">Documento Excel</p>
                    <h4>${escapeHtml(fileName)}</h4>
                </div>
            </div>
            <div class="pdf-fallback-body">
                <p><strong>Previsualización no disponible.</strong></p>
                <p class="pdf-fallback-note">El archivo debe tener una URL accesible.</p>
            </div>
        </div>
    `;
}

function buildWordUnavailableContent(fileName) {
    return `
        <div class="pdf-fallback-page">
            <div class="pdf-fallback-header">
                <span class="material-symbols-outlined">description</span>
                <div>
                    <p class="pdf-fallback-label">Documento Word</p>
                    <h4>${escapeHtml(fileName)}</h4>
                </div>
            </div>
            <div class="pdf-fallback-body">
                <p><strong>Previsualización no disponible.</strong></p>
                <p class="pdf-fallback-note">El archivo Word puede descargarse desde el botón lateral.</p>
            </div>
        </div>
    `;
}

function collectAttachmentEntries(docCode = state.selectedCode) {
    if (!docCode) return [];
    const entries = [];
    
    state.allDocuments.forEach((doc) => {
        if (docCode && doc.codigo !== docCode) return;
        let attachments = Array.isArray(doc.attachments) ? doc.attachments : [];
        if (!attachments.length) attachments = [buildTechnicalAttachment(doc)];
        
        attachments.forEach((attachment, index) => {
            entries.push({
                key: `${doc.codigo}::${index}::${attachment.name}`,
                docCode: doc.codigo,
                docDate: doc.fecha,
                docEstado: doc.estado,
                doc,
                attachment
            });
        });
    });
    
    return entries.sort((a, b) => b.docDate - a.docDate);
}

function renderNoSelectionState() {
    const elements = {
        breadcrumb: document.getElementById("breadcrumb-current"),
        codeNode: document.getElementById("expediente-code"),
        facultyNode: document.getElementById("expediente-faculty"),
        subjectNode: document.getElementById("expediente-subject"),
        statusNode: document.getElementById("expediente-status"),
        dateNode: document.getElementById("expediente-date"),
        progressText: document.getElementById("expediente-progress-text"),
        progressBar: document.getElementById("expediente-progress-bar"),
        documentName: document.getElementById("document-name"),
        previewTitle: document.getElementById("preview-title"),
        previewSubtitle: document.getElementById("preview-subtitle"),
        previewCode: document.getElementById("preview-code"),
        previewUnit: document.getElementById("preview-unit"),
        previewContent: document.getElementById("preview-content"),
        pageLabel: document.getElementById("preview-page-label"),
        approveButton: document.getElementById("approve-expediente-btn")
    };

    if (elements.breadcrumb) elements.breadcrumb.textContent = "Seleccione un expediente";
    if (elements.codeNode) elements.codeNode.textContent = "SIN EXPEDIENTE SELECCIONADO";
    if (elements.facultyNode) elements.facultyNode.innerHTML = '<span class="material-symbols-outlined text-lg">school</span> FACULTAD: -';
    if (elements.subjectNode) elements.subjectNode.innerHTML = '<span class="material-symbols-outlined text-lg">description</span> ASUNTO: -';
    if (elements.statusNode) {
        elements.statusNode.textContent = "-";
        elements.statusNode.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 bg-slate-100 text-slate-500";
    }
    if (elements.dateNode) elements.dateNode.textContent = "-";
    if (elements.progressText) elements.progressText.textContent = "0%";
    if (elements.progressBar) elements.progressBar.style.width = "0%";
    if (elements.documentName) elements.documentName.textContent = "Seleccione un expediente";
    if (elements.previewTitle) elements.previewTitle.textContent = "Seleccione un expediente";
    if (elements.previewSubtitle) elements.previewSubtitle.textContent = "Ingrese desde Documentos por Facultad y elija un expediente.";
    if (elements.previewCode) elements.previewCode.textContent = "-";
    if (elements.previewUnit) elements.previewUnit.textContent = "-";
    if (elements.pageLabel) elements.pageLabel.textContent = "Pág. 0 / 0";
    if (elements.previewContent) {
        elements.previewContent.innerHTML = `
            <div class="pdf-fallback-page">
                <div class="pdf-fallback-header">
                    <span class="material-symbols-outlined">info</span>
                    <div>
                        <p class="pdf-fallback-label">Sin expediente seleccionado</p>
                        <h4>Seleccione un expediente para continuar</h4>
                    </div>
                </div>
                <div class="pdf-fallback-body">
                    <p><strong>No hay información para mostrar.</strong></p>
                    <p class="pdf-fallback-note">Vaya a la bandeja de documentos y abra un expediente.</p>
                </div>
            </div>
        `;
    }
    if (elements.approveButton) updateApproveButtonState(null);
}

function resolveSelectedAttachment(doc) {
    const entries = collectAttachmentEntries(doc?.codigo);
    const byKey = entries.find((entry) => entry.key === state.selectedAttachmentKey);
    if (byKey) return normalizeAttachment(byKey.attachment, "adjunto");
    return entries[0] ? normalizeAttachment(entries[0].attachment, "adjunto") : null;
}

function getFormalDecisionText(doc) {
    if (doc.estado === "completado") return "Se deja constancia de la aprobación del expediente.";
    if (doc.estado === "en_proceso") return "Se mantiene el expediente en evaluación.";
    return "El expediente queda pendiente de atención.";
}

function buildFormalDocumentContent(doc, options = {}) {
    const includeIcons = options.includeIcons !== false;
    const dateLabel = formatDisplayDate(doc.fecha);
    const summary = escapeHtml(getFormalSummary(doc));
    const decision = escapeHtml(getFormalDecisionText(doc));
    const faculty = escapeHtml(doc.facultad);
    const unit = escapeHtml(doc.unidad);
    const description = escapeHtml(doc.descripcion);
    const selectedAttachment = resolveSelectedAttachment(doc);
    const selectedAttachmentName = selectedAttachment?.name || getAttachmentFileName(doc);
    const attachmentName = escapeHtml(selectedAttachmentName);
    const attachmentIcon = getAttachmentTypeIcon(selectedAttachmentName);
    const version = escapeHtml(String(doc.version || 1));
    const currentUser = getCurrentUser();
    const userName = escapeHtml(currentUser?.nombreCompleto || currentUser?.nombre || "Usuario no identificado");
    const userRole = escapeHtml(currentUser?.rol || "Responsable");
    
    const allAttachments = Array.isArray(doc.attachments) && doc.attachments.length
        ? doc.attachments
        : [{ name: attachmentName, type: "xlsx", url: "", size: "", date: doc.fecha }];
    
    const attachmentListMarkup = allAttachments.map((attachment) => {
        const fileName = escapeHtml(attachment.name || attachmentName);
        const icon = includeIcons ? `<span class="material-symbols-outlined">${getAttachmentTypeIcon(fileName)}</span>` : "";
        const meta = escapeHtml(getAttachmentMeta(fileName));
        return `<li>${icon}<span><strong>${fileName}</strong><small>${meta}</small></span></li>`;
    }).join("");

    return `
        <div class="formal-document">
            <div class="formal-card">
                <h5>INFORMACIÓN TÉCNICA</h5>
                <div class="formal-tech-grid">
                    <div class="formal-tech-item formal-tech-span-2">
                        <p class="formal-label">N° transacción</p>
                        <p class="formal-value">${escapeHtml(doc.codigo)}</p>
                    </div>
                    <div class="formal-tech-item">
                        <p class="formal-label">Versión</p>
                        <p class="formal-value">${version}</p>
                    </div>
                    <div class="formal-tech-item">
                        <p class="formal-label">Fecha de elaboración</p>
                        <p class="formal-value">${dateLabel}</p>
                    </div>
                    <div class="formal-tech-item formal-tech-span-2">
                        <p class="formal-label">Documento adjunto</p>
                        <p class="formal-file">${includeIcons ? `<span class="material-symbols-outlined">${attachmentIcon}</span>` : ""} ${attachmentName}</p>
                    </div>
                    <div class="formal-tech-item formal-tech-span-2">
                        <p class="formal-label">Archivos adjuntos cargados</p>
                        <ul class="formal-attachments-list">${attachmentListMarkup}</ul>
                    </div>
                </div>
            </div>
            <section class="formal-section">
                <h5>DESCRIPCIÓN</h5>
                <p>El expediente ${escapeHtml(doc.codigo)} corresponde a <strong>${description}</strong> y ha sido remitido por ${faculty} a través de ${unit}.</p>
            </section>
            <section class="formal-section">
                <h5>CONTENIDO</h5>
                <div class="formal-tech-grid formal-content-grid">
                    <div class="formal-tech-item formal-tech-span-2">
                        <p class="formal-label">Resumen</p>
                        <p class="formal-value">${summary}</p>
                    </div>
                    <div class="formal-tech-item">
                        <p class="formal-label">Estado</p>
                        <p class="formal-value">${getStatusLabel(doc.estado)}</p>
                    </div>
                    <div class="formal-tech-item">
                        <p class="formal-label">Progreso</p>
                        <p class="formal-value">${doc.progreso}%</p>
                    </div>
                    <div class="formal-tech-item">
                        <p class="formal-label">Facultad</p>
                        <p class="formal-value">${faculty}</p>
                    </div>
                    <div class="formal-tech-item">
                        <p class="formal-label">Unidad</p>
                        <p class="formal-value">${unit}</p>
                    </div>
                </div>
            </section>
            <section class="formal-section">
                <h5>OBSERVACIÓN</h5>
                <p>${decision}</p>
            </section>
            <div class="formal-signature">
                <div class="formal-signature-line"></div>
                <p class="formal-signature-name">${faculty}</p>
                <p class="formal-signature-role">Responsable: ${userName}</p>
                <p class="formal-signature-role">Cargo: ${userRole}</p>
                <p class="formal-signature-role">Sistema de Racionalización v2.0</p>
            </div>
        </div>
    `;
}

function buildPrintableDocumentHtml(doc) {
    const dateLabel = formatDisplayDate(doc.fecha);
    const content = buildFormalDocumentContent(doc, { includeIcons: false });
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(doc.codigo)} - Sistema de Racionalización</title>
    <style>
        body { font-family: Inter, Arial, sans-serif; margin: 0; background: #f6f6f8; color: #0f172a; }
        .main { max-width: 900px; margin: 24px auto; padding: 24px; }
        .sheet { background: #fff; border: 1px solid #dbe4f0; border-radius: 18px; box-shadow: 0 24px 44px -32px rgba(15, 23, 42, 0.35); padding: 32px; }
        .formal-document-topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .formal-document-chip { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: rgba(17,82,212,.1); color: #1152d4; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
        .formal-document-pill { padding: 8px 14px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 13px; font-weight: 800; white-space: nowrap; }
        .formal-document-title { margin: 14px 0 6px; font-size: 36px; font-weight: 900; letter-spacing: -.03em; line-height: 1.1; }
        .formal-document-subtitle { margin: 0; color: #64748b; font-size: 15px; }
        .formal-card { margin-top: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; }
        .formal-card h5 { margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: .16em; }
        .formal-tech-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .formal-tech-item { padding-left: 10px; border-left: 4px solid #cbd5e1; min-height: 40px; }
        .formal-tech-span-2 { grid-column: span 2 / span 2; }
        .formal-attachments-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .formal-attachments-list li { display: flex; align-items: flex-start; gap: 8px; }
        .formal-attachments-list small { display: block; margin-top: 2px; color: #64748b; font-size: 11px; }
        .formal-label { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; color: #94a3b8; font-weight: 800; }
        .formal-value { margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; }
        .formal-file { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
        .formal-section { margin-top: 22px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
        .formal-section h5 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .18em; color: #1152d4; }
        .formal-section p { margin: 0 0 10px; line-height: 1.75; font-size: 14px; color: #334155; }
        .formal-signature { margin-top: 34px; display: flex; flex-direction: column; align-items: flex-end; }
        .formal-signature-line { width: 280px; border-top: 1px solid #cbd5e1; margin-bottom: 10px; }
        .formal-signature-name { margin: 0; font-size: 14px; font-weight: 800; }
        .formal-signature-role { margin: 2px 0 0; font-size: 12px; color: #64748b; }
        @media print { body { background: #fff; } .main { margin: 0; padding: 0; } .sheet { box-shadow: none; border: none; border-radius: 0; } }
    </style>
</head>
<body>
    <div class="main">
        <div class="sheet">
            ${content}
            <div style="margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: right;">Generado el ${dateLabel}</div>
        </div>
    </div>
</body>
</html>`;
}

function downloadCurrentDocument() {
    const doc = state.selectedDocument || state.allDocuments[0] || SAMPLE_DOCUMENTS[0];
    if (!doc) return;
    const selectedAttachment = resolveSelectedAttachment(doc);
    const selectedSource = selectedAttachment?.url || (selectedAttachment?.content ? toDataUrlFromBase64(selectedAttachment.content, selectedAttachment.name || `${doc.codigo}.pdf`) : "");
    
    if (selectedSource) {
        const link = document.createElement("a");
        link.href = selectedSource;
        link.download = selectedAttachment.name || `${doc.codigo}`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
    }

    const html = buildPrintableDocumentHtml(doc);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.codigo || "expediente"}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadAttachmentFromEntry(entry) {
    if (!entry) return;
    let attachment = normalizeAttachment(entry.attachment || {}, entry.docCode || "adjunto");
    const fileName = attachment.name || `${entry.docCode}.bin`;

    if (attachment.generatedType === "technical-pdf") {
        downloadTechnicalPdf(entry.doc);
        return;
    }

    // Buscar base64 en todos los campos
    let attachmentSource = attachment.url;
    if (!attachmentSource && attachment.content) attachmentSource = toDataUrlFromBase64(attachment.content, fileName);
    if (!attachmentSource && attachment.contenido) attachmentSource = toDataUrlFromBase64(attachment.contenido, fileName);
    if (!attachmentSource && attachment.base64) attachmentSource = toDataUrlFromBase64(attachment.base64, fileName);
    if (!attachmentSource && attachment.data) attachmentSource = toDataUrlFromBase64(attachment.data, fileName);

    if (attachmentSource) {
        const link = document.createElement("a");
        link.href = attachmentSource;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
    }

    // Fallback CSV para Excel
    const ext = fileExtension(fileName);
    if (["xlsx", "xls", "csv"].includes(ext)) {
        const csv = ["Campo,Valor", `Codigo,${entry.docCode}`, `Archivo,${fileName}`, `Estado,${entry.docEstado}`, `Fecha,${formatDisplayDate(entry.docDate)}`].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName.replace(/\.(xlsx|xls)$/i, ".csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

async function renderExcelPreview(fileUrl, fileName) {
    if (!fileUrl || typeof XLSX === "undefined") return "";
    const cacheKey = `${fileUrl}::${fileName}`;
    if (excelPreviewCache.has(cacheKey)) return excelPreviewCache.get(cacheKey);

    try {
        let workbook = null;

        if (fileUrl.startsWith("data:")) {
            const base64Match = fileUrl.match(/base64,(.+)$/);
            if (!base64Match) return "";
            workbook = XLSX.read(base64Match[1], { type: "base64" });
        } else {
            const response = await fetch(fileUrl);
            if (!response.ok) return "";
            const buffer = await response.arrayBuffer();
            workbook = XLSX.read(buffer, { type: "array" });
        }

        if (!workbook) return "";
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return "";
        const sheet = workbook.Sheets[firstSheetName];
        const tableHtml = XLSX.utils.sheet_to_html(sheet, { editable: false, id: "excel-preview-table" });
        const wrapped = `<div class="excel-preview-wrap">${tableHtml}</div>`;
        excelPreviewCache.set(cacheKey, wrapped);
        return wrapped;
    } catch {
        return "";
    }
}

function documentButtonMarkup(entry, active) {
    const fileName = entry.attachment?.name || `${entry.docCode}.xlsx`;
    const extension = String(fileName).split(".").pop().toLowerCase();
    const icon = getAttachmentTypeIcon(fileName);
    const metaDate = entry.attachment?.date ? formatDisplayDate(parseDate(entry.attachment.date)) : formatDisplayDate(entry.docDate);
    const meta = entry.attachment?.generatedType === "technical-pdf"
        ? `pdf técnico • ${getTipoLabel(entry.doc?.tipo).toLowerCase()}`
        : `${extension} • ${metaDate}`;
    
    return `
        <div class="document-item w-full flex items-center gap-3 p-3 rounded-lg ${active ? "active bg-primary/10 text-primary border border-primary/20" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"}" data-entry-key="${entry.key}" data-code="${entry.docCode}">
            <div class="attachment-icon"><span class="material-symbols-outlined ${active ? "fill-1" : ""}">${icon}</span></div>
            <div class="flex-grow min-w-0 text-left">
                <p class="text-xs font-bold truncate uppercase tracking-tight">${escapeHtml(fileName)}</p>
                <p class="document-meta text-[10px] ${active ? "opacity-70" : "text-slate-400"}">${escapeHtml(meta)}</p>
            </div>
            <div class="attachment-actions">
                <button type="button" class="attachment-view-btn ${active ? "" : "opacity-80"}" data-action="view" data-entry-key="${entry.key}" aria-label="Visualizar ${escapeHtml(fileName)}">
                    <span class="material-symbols-outlined text-lg">visibility</span>
                </button>
                <button type="button" class="attachment-download-btn" data-action="download" data-entry-key="${entry.key}" aria-label="Descargar ${escapeHtml(fileName)}">
                    <span class="material-symbols-outlined text-lg">download</span>
                </button>
            </div>
        </div>
    `;
}

function renderDocumentList() {
    const list = document.getElementById("document-list");
    if (!list) return;

    if (!state.selectedCode || !state.selectedDocument) {
        list.innerHTML = `<div class="p-4 text-sm text-slate-500">No hay expediente seleccionado.</div>`;
        state.currentAttachmentIndex = 0;
        return;
    }

    if (!state.allDocuments.length) {
        list.innerHTML = `<div class="p-4 text-sm text-slate-500">No hay documentos cargados.</div>`;
        return;
    }

    const doc = state.selectedDocument;
    
    // Para indicadores, mostrar solo ficha técnica
    if (doc?.tipo === "indicador") {
        const technicalEntry = {
            key: `${doc.codigo}::technical-pdf`,
            docCode: doc.codigo,
            docDate: doc.fecha,
            docEstado: doc.estado,
            doc,
            attachment: buildTechnicalAttachment(doc)
        };
        list.innerHTML = documentButtonMarkup(technicalEntry, true);
        list.querySelector('[data-action="view"]')?.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.selectedAttachmentKey = technicalEntry.key;
            void renderSelectedDocument();
        });
        list.querySelector('[data-action="download"]')?.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (state.selectedDocument) downloadTechnicalPdf(state.selectedDocument);
        });
        list.querySelector(".document-item")?.addEventListener("click", (event) => {
            if (event.target.closest("button")) return;
            state.selectedAttachmentKey = technicalEntry.key;
            void renderSelectedDocument();
        });
        state.currentAttachmentIndex = 0;
        return;
    }

    const entries = collectAttachmentEntries(state.selectedCode);
    if (!entries.length) {
        list.innerHTML = `<div class="p-4 text-sm text-slate-500">Sin adjuntos.</div>`;
        state.currentAttachmentIndex = 0;
        return;
    }

    list.innerHTML = entries.map((entry) => documentButtonMarkup(entry, entry.key === state.selectedAttachmentKey)).join("");

    // Event listeners para botones
    list.querySelectorAll('[data-action="view"]').forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const wrapper = button.closest(".document-item");
            if (!wrapper) return;
            state.selectedCode = wrapper.dataset.code || state.selectedCode;
            state.selectedAttachmentKey = wrapper.dataset.entryKey || state.selectedAttachmentKey;
            state.selectedDocument = state.allDocuments.find((d) => d.codigo === state.selectedCode) || state.selectedDocument;
            renderDocumentList();
            void renderSelectedDocument();
        });
    });

    list.querySelectorAll(".document-item").forEach((row) => {
        row.addEventListener("click", (event) => {
            if (event.target.closest("button")) return;
            state.selectedCode = row.dataset.code || state.selectedCode;
            state.selectedAttachmentKey = row.dataset.entryKey || state.selectedAttachmentKey;
            state.selectedDocument = state.allDocuments.find((d) => d.codigo === state.selectedCode) || state.selectedDocument;
            renderDocumentList();
            void renderSelectedDocument();
        });
    });

    list.querySelectorAll('[data-action="download"]').forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const entry = entries.find((item) => item.key === button.dataset.entryKey);
            downloadAttachmentFromEntry(entry);
        });
    });

    const selectedEntry = entries.find((entry) => entry.key === state.selectedAttachmentKey) || entries[0] || null;
    state.currentAttachmentIndex = selectedEntry ? entries.findIndex((entry) => entry.key === selectedEntry.key) : 0;
}

/**
 * 🔥 FUNCIÓN CRÍTICA CORREGIDA
 * Renderiza el documento seleccionado con preview funcional
 */
async function renderSelectedDocument() {
    const doc = state.selectedDocument;
    if (!doc) {
        renderNoSelectionState();
        return;
    }

    // Actualizar UI básica
    const elements = {
        codeNode: document.getElementById("expediente-code"),
        facultyNode: document.getElementById("expediente-faculty"),
        subjectNode: document.getElementById("expediente-subject"),
        statusNode: document.getElementById("expediente-status"),
        dateNode: document.getElementById("expediente-date"),
        progressText: document.getElementById("expediente-progress-text"),
        progressBar: document.getElementById("expediente-progress-bar"),
        documentName: document.getElementById("document-name"),
        previewTitle: document.getElementById("preview-title"),
        previewSubtitle: document.getElementById("preview-subtitle"),
        previewCode: document.getElementById("preview-code"),
        previewContent: document.getElementById("preview-content"),
        previewUnit: document.getElementById("preview-unit"),
        previewFrame: document.querySelector(".preview-frame")
    };

    if (elements.codeNode) elements.codeNode.textContent = `CÓDIGO ${doc.codigo}`;
    if (elements.facultyNode) elements.facultyNode.innerHTML = `<span class="material-symbols-outlined text-lg">school</span> FACULTAD: ${doc.facultad}`;
    if (elements.subjectNode) elements.subjectNode.innerHTML = `<span class="material-symbols-outlined text-lg">description</span> ASUNTO: ${getAsuntoByTipo(doc.tipo)}`;
    if (elements.statusNode) {
        elements.statusNode.textContent = getStatusLabel(doc.estado);
        elements.statusNode.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${statusClass(doc.estado)}`;
    }
    if (elements.dateNode) elements.dateNode.textContent = formatDisplayDate(doc.fecha);
    if (elements.progressText) elements.progressText.textContent = `${doc.progreso}%`;
    if (elements.progressBar) elements.progressBar.style.width = `${doc.progreso}%`;
    if (elements.documentName) elements.documentName.textContent = getAttachmentFileName(doc);
    if (elements.previewTitle) elements.previewTitle.textContent = doc.descripcion;
    if (elements.previewSubtitle) elements.previewSubtitle.textContent = `${doc.facultad} • ${getStatusLabel(doc.estado)} • ${formatDisplayDate(doc.fecha)}`;
    if (elements.previewCode) elements.previewCode.textContent = doc.codigo;
    if (elements.previewUnit) elements.previewUnit.textContent = doc.unidad;

    // Preparar entries y toolbar
    const entries = collectAttachmentEntries(doc.codigo);
    if (!entries.length) state.currentAttachmentIndex = 0;
    else {
        const currentIndex = entries.findIndex((entry) => entry.key === state.selectedAttachmentKey);
        state.currentAttachmentIndex = currentIndex >= 0 ? currentIndex : 0;
    }
    updatePreviewToolbar(doc, entries);

    // 🔥 RENDERIZAR PREVIEW (prioridad: última respuesta de facultades-documentos si existe)
    if (elements.previewContent) {
        const codigo = doc.codigo;
        // Intentar cargar revisión desde API admin (si está disponible)
        const isLocalMode = typeof API === 'undefined' || (API.CONFIG && API.CONFIG.MODE === 'local');
        let reviewPayload = null;
        let reviewError = null;

        if (!isLocalMode && typeof API !== 'undefined' && API.admin?.documents?.getReview) {
            const reviewId = doc.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doc.id) 
                ? doc.id 
                : doc.codigo;
            try {
                const resp = await API.admin.documents.getReview(reviewId);
                if (resp && resp.success && resp.data) {
                    reviewPayload = resp.data;
                } else if (resp && !resp.success) {
                    reviewError = resp.error || resp.data?.message;
                }
            } catch (err) {
                reviewError = String(err);
            }


        }

        // Construir lista de mensajes/rectificaciones: preferir datos del review, fallback a localStorage
        let mensajes = [];
        if (reviewPayload) {
            mensajes = Array.isArray(reviewPayload.correcciones)
                ? reviewPayload.correcciones.slice()
                : Array.isArray(reviewPayload.rectificaciones)
                    ? reviewPayload.rectificaciones.slice()
                    : Array.isArray(reviewPayload.observaciones)
                        ? reviewPayload.observaciones.slice()
                        : [];
            // Normalizar fechas si vienen como objetos
            mensajes = mensajes.map(m => ({ ...m }));
            mensajes.sort((a, b) => new Date(b.fecha || b.createdAt || 0) - new Date(a.fecha || a.createdAt || 0));
        } else {
            let historial = [];
            try {
                historial = JSON.parse(localStorage.getItem('sigpro_correcciones_solicitudes')) || [];
            } catch {}
            mensajes = historial.filter((item) => String(item?.codigo || "") === String(codigo || ""))
                .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
        }
        if (mensajes.length > 0) {
            // Mostrar la última respuesta enviada
            const evento = mensajes[0];
            const fecha = formatDisplayDate(parseDate(evento.fecha));
            let adjuntoHtml = '';
            if (evento.adjunto && evento.adjunto.contenido && evento.adjunto.nombre) {
                const nombre = (evento.adjunto.nombre||'').toLowerCase();
                if (nombre.endsWith('.pdf')) {
                    adjuntoHtml = `<embed src="${evento.adjunto.contenido}" type="application/pdf" class="w-full h-96 rounded mb-2 mt-2" />`;
                } else if (nombre.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
                    adjuntoHtml = `<img src="${evento.adjunto.contenido}" alt="${escapeHtml(evento.adjunto.nombre)}" class="w-full h-96 object-contain rounded mb-2 mt-2" />`;
                } else if (nombre.match(/\.(txt|csv|log|md)$/i)) {
                    try {
                        const textContent = atob(evento.adjunto.contenido.split(',')[1] || '');
                        adjuntoHtml = `<pre class='w-full h-32 overflow-auto bg-slate-100 dark:bg-slate-800 rounded mb-2 mt-2 text-xs p-2'>${escapeHtml(textContent.substring(0, 1000))}</pre>`;
                    } catch { /* fallback */ }
                }
            }
            elements.previewContent.innerHTML = `
                <div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 mb-6">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-sm font-black text-slate-900 dark:text-slate-100">${escapeHtml(evento.asunto || "Mensaje enviado")}</p>
                        </div>
                        <span class="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-bold">${escapeHtml(evento.estado || "ENVIADO")}</span>
                    </div>
                    <p class="text-sm text-slate-700 dark:text-slate-200 mt-3 whitespace-pre-line">${escapeHtml(evento.observaciones || "-")}</p>
                    ${adjuntoHtml}
                    <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-3">${escapeHtml(fecha)}</p>
                </div>
            `;
        } else {
            // Si hubo un error consultando la revisión, mostrar aviso al usuario en lugar del preview
            if (reviewError) {
                elements.previewContent.innerHTML = `
                    <div class="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-800">
                        <p class="font-bold">Error al cargar la revisión del servidor</p>
                        <p class="mt-1">${escapeHtml(String(reviewError).substring(0, 200))}</p>
                        <p class="mt-2 text-xs text-slate-500">Verifique la pestaña Network y los logs del servidor para más detalles.</p>
                    </div>
                `;
                // Evitar continuar con el preview normal cuando hubo error
                if (elements.previewFrame) {
                    elements.previewFrame.classList.remove("preview-frame");
                    void elements.previewFrame.offsetWidth;
                    elements.previewFrame.classList.add("preview-frame");
                    updatePreviewScale(state.previewScale);
                }
                updateApproveButtonState(doc);
                renderHistoryPanel(doc.codigo);
                return;
            }
            // Si no hay mensajes, mostrar el adjunto principal como antes
            let selectedAttachment = doc.tipo === "indicador"
                ? buildTechnicalAttachment(doc)
                : await hydrateAttachmentForDocument(doc, resolveSelectedAttachment(doc));
            selectedAttachment = normalizeAttachment(selectedAttachment, getAttachmentFileName(doc));
            const fileName = doc.tipo === "indicador"
                ? `${doc.codigo}-informacion-tecnica.pdf`
                : (selectedAttachment?.name || getAttachmentFileName(doc));
            const fileExt = doc.tipo === "indicador"
                ? "pdf"
                : fileExtension(fileName);
            let fileUrl = "";
            if (doc.tipo === "indicador") {
                if (window.__technicalPdfObjectUrl) {
                    URL.revokeObjectURL(window.__technicalPdfObjectUrl);
                    window.__technicalPdfObjectUrl = null;
                }
                try {
                    const blob = await generateTechnicalPdfBlob(doc);
                    window.__technicalPdfObjectUrl = URL.createObjectURL(blob);
                    fileUrl = window.__technicalPdfObjectUrl;
                } catch (error) {
                    console.error("No se pudo generar el PDF técnico para el preview:", error);
                    fileUrl = "";
                }
            } else if (selectedAttachment.file instanceof Blob || selectedAttachment.file instanceof File) {
                fileUrl = URL.createObjectURL(selectedAttachment.file);
            } else if (selectedAttachment.url) {
                fileUrl = selectedAttachment.url;
            } else if (selectedAttachment.content) {
                fileUrl = toDataUrlFromBase64(selectedAttachment.content, fileName);
            } else if (selectedAttachment.contenido) {
                fileUrl = toDataUrlFromBase64(selectedAttachment.contenido, fileName);
            } else if (selectedAttachment.base64) {
                fileUrl = toDataUrlFromBase64(selectedAttachment.base64, fileName);
            } else if (selectedAttachment.data) {
                fileUrl = toDataUrlFromBase64(selectedAttachment.data, fileName);
            } else {
                fileUrl = getAttachmentPreviewUrl(doc);
            }
            elements.previewContent.innerHTML = `<div class="excel-loading">Cargando vista previa...</div>`;
            let previewHtml = "";
            if (fileExt === "pdf" && fileUrl) {
                previewHtml = `<embed src="${escapeHtml(fileUrl)}" type="application/pdf" style="width:100%;height:70vh;min-height:520px;background:#fff;" />`;
            } else if (["xlsx", "xls", "csv"].includes(fileExt) && fileUrl && typeof XLSX !== "undefined") {
                try {
                    previewHtml = await renderExcelPreview(fileUrl, fileName) || buildExcelUnavailableContent(fileName);
                } catch {
                    previewHtml = buildExcelUnavailableContent(fileName);
                }
            } else if (["xlsx", "xls", "csv"].includes(fileExt)) {
                previewHtml = doc.tipo === "reporte"
                    ? buildReportSummaryPreviewContent(doc)
                    : buildExcelUnavailableContent(fileName);
            } else if (["doc", "docx"].includes(fileExt)) {
                previewHtml = buildWordUnavailableContent(fileName);
            } else if (selectedAttachment?.generatedType === "technical-pdf") {
                try {
                    if (window.__technicalPdfObjectUrl) {
                        URL.revokeObjectURL(window.__technicalPdfObjectUrl);
                        window.__technicalPdfObjectUrl = null;
                    }
                    const blob = await generateTechnicalPdfBlob(doc);
                    window.__technicalPdfObjectUrl = URL.createObjectURL(blob);
                    previewHtml = `<embed src="${escapeHtml(window.__technicalPdfObjectUrl)}" type="application/pdf" style="width:100%;height:70vh;min-height:520px;background:#fff;" />`;
                } catch (error) {
                    console.error("No se pudo generar la ficha técnica PDF:", error);
                    previewHtml = buildTechnicalPreviewContent(doc);
                }
            } else if (doc.tipo === "indicador") {
                previewHtml = "";
            } else if (fileUrl) {
                previewHtml = `<iframe src="${escapeHtml(fileUrl)}" style="width:100%;height:70vh;min-height:520px;border:none;" title="${escapeHtml(fileName)}"></iframe>`;
            } else {
                previewHtml = buildPdfFallbackContent(doc, fileName);
            }
            elements.previewContent.innerHTML = previewHtml || buildTechnicalPreviewContent(doc);
        }
    }

    if (elements.previewFrame) {
        elements.previewFrame.classList.remove("preview-frame");
        void elements.previewFrame.offsetWidth;
        elements.previewFrame.classList.add("preview-frame");
        updatePreviewScale(state.previewScale);
    }

    const breadcrumb = document.getElementById("breadcrumb-current");
    if (breadcrumb) breadcrumb.textContent = doc.codigo;
    
    updateApproveButtonState(doc);
    renderHistoryPanel(doc.codigo);
}

function findDocumentInLocalStorage(codigo) {
    if (!codigo) return null;
    const keys = [
        STORAGE_KEYS.DOCUMENTOS_LISTA,
        STORAGE_KEYS.DOCUMENTOS_DETALLE,
        'sigpro_documentos_lista',
        'local_sigpro_documentos_lista',
        'remote_sigpro_documentos_lista',
        'sigpro_reportes',
        'sigpro_indicadores_detalle',
        'local_sigpro_indicadores_detalle',
        'remote_sigpro_indicadores_detalle',
        'sigpro_approved_docs'
    ];
    
    for (const key of keys) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            
            if (Array.isArray(parsed)) {
                const found = parsed.find(item => 
                    (item.codigo || item.code || item.id) === codigo
                );
                if (found) return normalizeDocument(found, 0);
            } else if (parsed && typeof parsed === 'object') {
                // formato mapa { codigo: detalle }
                if (parsed[codigo]) {
                    const item = parsed[codigo];
                    const ficha = item.fichaData || item;
                    return normalizeDocument({
                        ...ficha,
                        codigo: codigo,
                        estado: item.estado || ficha.estado || 'pendiente',
                        progreso: item.progreso || ficha.progreso || inferProgress(item.estado || ficha.estado),
                        adjuntos: Array.isArray(item.adjuntos) && item.adjuntos.length ? item.adjuntos : (Array.isArray(ficha.adjuntos) ? ficha.adjuntos : []),
                        attachments: Array.isArray(item.attachments) && item.attachments.length ? item.attachments : (Array.isArray(item.adjuntos) && item.adjuntos.length ? item.adjuntos : (Array.isArray(ficha.attachments) ? ficha.attachments : []))
                    }, 0);
                }
                // buscar por valores
                const values = Object.values(parsed);
                const found = values.find(item => item && (item.codigo || item.code || item.id) === codigo);
                if (found) return normalizeDocument(found, 0);
            }
        } catch (e) { continue; }
    }
    return null;
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

async function initializeDocuments() {
    const apiDocs = await loadApiDocuments();
    const localDocs = loadLocalDocuments();
    const detailDocs = loadLocalDetailDocuments();
    
    let merged = mergeDocuments(apiDocs, localDocs);
    merged = mergeDocuments(merged, detailDocs);
    state.allDocuments = merged;

    const params = getQueryParams();
    const selectedCode = params.get("codigo") || params.get("code") || "";
    state.selectedCode = selectedCode;
    
    // 1. Buscar en documentos ya cargados
    state.selectedDocument = state.allDocuments.find((doc) => doc.codigo === selectedCode) || null;

    // 2. Fallback: buscar directo en localStorage (donde facultades-documentos guarda)
    if (!state.selectedDocument && selectedCode) {
        const fromStorage = findDocumentInLocalStorage(selectedCode);
        if (fromStorage) {
            state.selectedDocument = fromStorage;
            state.allDocuments.unshift(fromStorage);
        }
    }

    // 3. ÚLTIMO recurso: reconstruir desde query params (solo si no hay nada)
    if (!state.selectedDocument && selectedCode) {
        const queryDocument = buildDocumentFromQueryParams(params, selectedCode);
        if (queryDocument) {
            state.allDocuments.unshift(queryDocument);
            state.selectedDocument = queryDocument;
        }
    }

    if (state.selectedDocument) {
        const approvedSnapshot = getApprovedSnapshotByCode(state.selectedDocument.codigo);
        if (approvedSnapshot) {
            state.selectedDocument = { ...state.selectedDocument, ...approvedSnapshot };
            state.allDocuments = state.allDocuments.map((item) => 
                item.codigo === state.selectedDocument.codigo ? { ...item, ...approvedSnapshot } : item
            );
        }
    }

    if (state.selectedDocument) {
        const docEntries = collectAttachmentEntries(state.selectedCode);
        const firstEntry = docEntries.find((entry) => fileExtension(entry.attachment.name) === "pdf") || docEntries[0] || null;
        state.selectedAttachmentKey = firstEntry?.key || "";
    } else {
        state.selectedAttachmentKey = "";
    }

    renderDocumentList();
    await renderSelectedDocument();
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!guardAdminSession()) return;
    renderProfileInfo();
    setupThemeToggle();
    const logoutControls = setupLogoutModal();
    setupProfileMenu(logoutControls);
    setupTabsAndCorrections();

    document.getElementById("download-toolbar-document")?.addEventListener("click", downloadCurrentDocument);
    document.querySelector('[data-preview-action="zoom-out"]')?.addEventListener("click", () => updatePreviewScale(state.previewScale - 0.1));
    document.querySelector('[data-preview-action="zoom-in"]')?.addEventListener("click", () => updatePreviewScale(state.previewScale + 0.1));
    document.querySelector('[data-preview-action="print"]')?.addEventListener("click", () => {
        const doc = state.selectedDocument || state.allDocuments[0] || SAMPLE_DOCUMENTS[0];
        if (doc) openPrintablePreview(doc);
    });
    document.querySelector('[data-preview-action="prev"]')?.addEventListener("click", () => {
        const entries = collectAttachmentEntries(state.selectedCode);
        if (!entries.length) return;
        const currentIndex = Math.max(0, entries.findIndex((entry) => entry.key === state.selectedAttachmentKey));
        const nextIndex = (currentIndex - 1 + entries.length) % entries.length;
        state.selectedAttachmentKey = entries[nextIndex].key;
        state.currentAttachmentIndex = nextIndex;
        renderDocumentList();
        void renderSelectedDocument();
    });
    document.querySelector('[data-preview-action="next"]')?.addEventListener("click", () => {
        const entries = collectAttachmentEntries(state.selectedCode);
        if (!entries.length) return;
        const currentIndex = Math.max(0, entries.findIndex((entry) => entry.key === state.selectedAttachmentKey));
        const nextIndex = (currentIndex + 1) % entries.length;
        state.selectedAttachmentKey = entries[nextIndex].key;
        state.currentAttachmentIndex = nextIndex;
        renderDocumentList();
        void renderSelectedDocument();
    });
    document.getElementById("approve-expediente-btn")?.addEventListener("click", () => void approveCurrentExpediente());

    await initializeDocuments();
    document.getElementById("racio-body")?.classList.add("is-ready", "expedientes-page");
});
const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: "sigpro_expediente_actual",
    DOCUMENTOS_DETALLE: "sigpro_documentos_detalle",
    DOCUMENTOS_LISTA: "sigpro_documentos_lista"
};

let caracterizacionActual = null;

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function base64ToBlobUrl(base64String, contentType) {
    const cleanBase64 = String(base64String || "").replace(/^data:[^;]+;base64,/, "");
    try {
        const byteCharacters = atob(cleanBase64);
        const sliceSize = 512;
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i += 1) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
        }
        return URL.createObjectURL(new Blob(byteArrays, { type: contentType || "application/octet-stream" }));
    } catch {
        return null;
    }
}

function isBase64Data(value) {
    if (!value || typeof value !== "string") return false;
    const clean = value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    return clean.length > 100 && /^[A-Za-z0-9+/]*={0,2}$/.test(clean);
}

function formatTipoProceso(value) {
    const text = normalizeText(value);
    if (text === "estrategico") return "Estrategico";
    if (text === "misional") return "Misional";
    if (text === "de apoyo" || text === "de-apoyo" || text === "soporte") return "De Apoyo";
    return value || "-";
}

function getCurrentUser() {
    if (typeof API !== "undefined" && API.auth && typeof API.auth.getUser === "function") {
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
    if (!tokens.length) return "RA";
    return tokens.map((token) => token.charAt(0).toUpperCase()).join("");
}

function guardAdminSession() {
    const loginPage = "portal-inicio-racio.html";
    const userPanelPage = "facultades-inicio.html";
    if (typeof API !== "undefined" && API.auth && typeof API.auth.isAuthenticated === "function") {
        if (!API.auth.isAuthenticated()) {
            window.location.replace(loginPage);
            return false;
        }
        const user = typeof API.auth.getUser === "function" ? API.auth.getUser() : null;
        const role = String(user && user.rol ? user.rol : "").toLowerCase();
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
    const displayName = (user && (user.nombreCompleto || user.nombre)) || "Administrador Racio";
    const displayRole = (user && user.rol) || "Administrador Global";
    const displayEmail = (user && (user.correo || user.email)) || "admin@unmsm.edu.pe";

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
            if (typeof API !== "undefined" && API.auth && typeof API.auth.logout === "function") {
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
    return { openModal, closeModal };
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
        const open = profileMenu.classList.contains("is-open");
        if (open) {
            closeMenu();
            return;
        }
        profileMenu.classList.add("is-open");
        profileToggle.classList.add("open");
        profileToggle.setAttribute("aria-expanded", "true");
    });

    document.addEventListener("click", (event) => {
        if (!profileMenu.contains(event.target) && !profileToggle.contains(event.target)) {
            closeMenu();
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            closeMenu();
            if (logoutControls && logoutControls.openModal) logoutControls.openModal();
        });
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "-";
}

function findResumenValue(detalle, labels) {
    if (!detalle || !Array.isArray(detalle.resumenCampos)) return "";
    for (let i = 0; i < detalle.resumenCampos.length; i += 1) {
        const row = detalle.resumenCampos[i] || {};
        const key = normalizeText(row.label);
        if (labels.some((label) => key === normalizeText(label))) {
            return String(row.value || "").trim();
        }
    }
    return "";
}

function loadCaracterizacionData() {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("codigo") || "";
    let current = null;
    try {
        const rawCurrent = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
        current = rawCurrent ? JSON.parse(rawCurrent) : null;
    } catch {
        current = null;
    }

    let docs = [];
    let detailMap = {};
    try {
        const rawDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
        docs = rawDocs ? JSON.parse(rawDocs) : [];
        if (!Array.isArray(docs)) docs = [];
    } catch {
        docs = [];
    }
    try {
        const rawDetail = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
        detailMap = rawDetail ? JSON.parse(rawDetail) : {};
    } catch {
        detailMap = {};
    }

    const preferredCode = codeFromUrl || (current && current.codigo) || "";
    const preferredDoc = docs.find((item) => (item.codigo || item.code || item.id) === preferredCode) || null;

    let selectedCode = preferredCode;
    let selectedDetail = preferredCode ? detailMap[preferredCode] : null;

    if (!selectedDetail && preferredDoc) {
        selectedDetail = detailMap[preferredDoc.id] || null;
    }

    if (!selectedDetail) {
        const keys = Object.keys(detailMap || {});
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            const value = detailMap[key] || {};
            const tipo = normalizeText(value.tipo || value.type || "");
            if (tipo.includes("caracter")) {
                selectedCode = key;
                selectedDetail = value;
                break;
            }
        }
    }

    if (!selectedCode && selectedDetail) {
        selectedCode = String(selectedDetail.codigo || selectedDetail.code || "");
    }

    const selectedDoc = docs.find((item) => (item.codigo || item.code || item.id) === selectedCode) || preferredDoc || current || {};
    const ficha = (selectedDetail && selectedDetail.fichaData) || selectedDetail || {};

    const proceso =
        ficha.procesoNombre
        || ficha.proceso
        || ficha.macroProcesoNombre
        || selectedDoc.descripcion
        || selectedDoc.nombre
        || findResumenValue(selectedDetail, ["Proceso", "Macro Proceso", "Nombre del proceso"])
        || "-";

    const tipoProceso =
        ficha.tipoProceso
        || ficha.tipoProcesoLabel
        || selectedDoc.tipoProceso
        || findResumenValue(selectedDetail, ["Tipo de proceso", "Tipo"])
        || "-";

    const descripcion =
        ficha.descripcion
        || ficha.objetivo
        || selectedDoc.descripcion
        || "Caracterizacion institucional";

    const adjuntos = [];
    const pushAdjuntos = (value) => {
        if (Array.isArray(value)) {
            value.forEach((item) => adjuntos.push(item));
        }
    };
    pushAdjuntos(selectedDetail && selectedDetail.adjuntos);
    pushAdjuntos(selectedDetail && selectedDetail.archivos);
    pushAdjuntos(ficha.adjuntos);
    pushAdjuntos(ficha.archivos);

    if (!selectedCode && !selectedDetail && !selectedDoc.codigo) {
        return null;
    }

    return {
        codigo: selectedCode || selectedDoc.codigo || selectedDoc.id || "-",
        proceso,
        tipoProceso: formatTipoProceso(tipoProceso),
        descripcion,
        adjuntos,
        nombreAdjunto: (adjuntos[0] && (adjuntos[0].nombre || adjuntos[0].name)) || "Sin adjunto"
    };
}

function buildTechnicalInfoMarkup(data) {
    return '<div class="flujo-info-grid">'
        + '<div class="flujo-field">'
        + '<p class="flujo-field-label">Proceso</p>'
        + '<p class="flujo-field-value">' + escapeHtml(data.proceso) + '</p>'
        + '</div>'
        + '<div class="flujo-field">'
        + '<p class="flujo-field-label">Tipo de Proceso</p>'
        + '<p class="flujo-field-value">' + escapeHtml(data.tipoProceso) + '</p>'
        + '</div>'
        
        + '<div class="flujo-field flujo-field-full">'
        + '<p class="flujo-field-label">Archivo Adjunto</p>'
        + '<p class="flujo-field-value">' + escapeHtml(data.nombreAdjunto) + '</p>'
        + '</div>'
        + '</div>';
}

function getAdjuntoSource(adjunto) {
    return String(
        (adjunto && (adjunto.contenido || adjunto.url || adjunto.dataUrl || adjunto.src || adjunto.base64 || adjunto.data))
        || ""
    ).trim();
}

function renderPreview(model) {
    const emptyNode = document.getElementById("pdf-empty");
    const viewerNode = document.getElementById("pdf-viewer");
    const downloadBtn = document.getElementById("btn-descargar-pdf");
    if (!emptyNode || !viewerNode || !downloadBtn) return;

    const adjunto = (model.adjuntos || []).find((item) => getAdjuntoSource(item)) || null;
    if (!adjunto) {
        emptyNode.classList.remove("hidden");
        viewerNode.classList.add("hidden");
        downloadBtn.classList.add("hidden");
        return;
    }

    let src = getAdjuntoSource(adjunto);
    const nombre = adjunto.nombre || adjunto.name || "Documento.pdf";
    const ext = String(nombre.split(".").pop() || "").toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext) || src.startsWith("data:image/");
    const isPdf = ext === "pdf" || src.startsWith("data:application/pdf");

    if (isBase64Data(src) && !src.startsWith("data:")) {
        const mimeType = isImage ? "image/" + ext : isPdf ? "application/pdf" : "application/octet-stream";
        const blobUrl = base64ToBlobUrl(src, mimeType);
        if (blobUrl) src = blobUrl;
    }

    emptyNode.classList.add("hidden");
    viewerNode.classList.remove("hidden");
    viewerNode.src = isPdf ? src + "#toolbar=1&navpanes=1&scrollbar=1" : src;

    downloadBtn.href = src;
    downloadBtn.download = nombre;
    downloadBtn.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
    if (!guardAdminSession()) return;

    renderProfileInfo();
    setupThemeToggle();
    const logoutControls = setupLogoutModal();
    setupProfileMenu(logoutControls);

    const model = loadCaracterizacionData();
    caracterizacionActual = model;
    if (!model) {
        setText("detail-code-pill", "-");
        const detailBody = document.getElementById("detail-info-body");
        if (detailBody) {
            detailBody.innerHTML = '<div class="flujo-field flujo-field-full"><p class="flujo-field-label">Estado</p><p class="flujo-field-value">Sin datos disponibles</p></div>';
        }
        return;
    }
    setText("detail-code-pill", model.codigo);

    const detailBody = document.getElementById("detail-info-body");
    if (detailBody) {
        detailBody.innerHTML = buildTechnicalInfoMarkup(model);
    }

    renderPreview(model);
});
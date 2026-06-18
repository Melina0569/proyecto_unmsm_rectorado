const STORAGE_KEYS = {
	DOCUMENTOS_LISTA: "sigpro_documentos_lista"
};

// ============================================
// UTILIDADES COMPARTIDAS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateLocalRequestStatusById(requestId, newStatus) {
    try {
        const requests = JSON.parse(localStorage.getItem('sigpro_access_requests') || '[]');
        const updated = requests.map(req => {
            if ((req.id || req.requestId || '') === requestId) {
                return { 
                    ...req, 
                    status: newStatus, 
                    estado: newStatus,
                    updatedAt: new Date().toISOString() 
                };
            }
            return req;
        });
        localStorage.setItem('sigpro_access_requests', JSON.stringify(updated));
        
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'sigpro_access_requests',
            newValue: JSON.stringify(updated)
        }));
        
        console.log(`📝 Solicitud ID ${requestId} actualizada a ${newStatus}`);
    } catch (e) {
        console.error('Error actualizando localStorage por ID:', e);
    }
}

// ============================================
// HANDLERS ACTUALIZADOS CON VALIDACIÓN DE UUID
// ============================================

function isValidUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str));
}

window.handleApproveRequest = async function(requestId, email) {
    if (!requestId || !email) {
        requestId = currentRequestId;
        email = currentRequestEmail;
    }
    
    const validUUID = isValidUUID(requestId);
    
    try {
        let apiSuccess = false;
        let apiMessage = '';
        
        // Solo llamar API si el ID es un UUID válido del backend
        if (validUUID && typeof API !== 'undefined' && API.admin?.accessRequests?.approve) {
            try {
                const result = await API.admin.accessRequests.approve(requestId);
                if (result.success) {
                    apiSuccess = true;
                    apiMessage = result.data?.message || 'Solicitud aprobada en el servidor.';
                    console.log('✅ Solicitud aprobada en API:', result.data);
                } else {
                    console.warn('⚠️ API approve falló:', result.error);
                }
            } catch (apiError) {
                console.warn('⚠️ Error en API approve:', apiError.message);
            }
        } else if (!validUUID) {
            console.log('ℹ️ ID no es UUID válido del backend, solo se actualiza localStorage:', requestId);
        }
        
        // Actualizar localStorage SIEMPRE (funciona para UUID y no-UUID)
        updateLocalRequestStatus(email, 'APPROVED');
        
        // También actualizar por ID si es UUID
        if (validUUID) {
            updateLocalRequestStatusById(requestId, 'APPROVED');
        }
        
        // Recargar lista con manejo de errores
        try {
            await loadAccessRequests().then(requests => {
                renderAccessRequests(requests);
            });
        } catch (reloadError) {
            console.warn('⚠️ Error recargando lista tras aprobar:', reloadError);
        }
        
        closeApproveModal();
        
        // Mensaje según si fue API o solo local
        if (apiSuccess) {
            showToast('success', '¡Solicitud aprobada!', `Se enviaron las credenciales a ${email}`);
        } else if (validUUID) {
            showToast('success', 'Aprobada localmente', `La solicitud fue aprobada pero el servidor no respondió. Se sincronizará más tarde.`);
        } else {
            showToast('success', 'Solicitud aprobada', `La solicitud de ${email} fue aprobada localmente.`);
        }
        
    } catch (error) {
        console.error('Error aprobando:', error);
        closeApproveModal();
        showToast('error', 'Error al aprobar', error.message || 'Ocurrió un error inesperado');
    }
};

window.handleRejectRequest = async function(requestId, email, reason) {
    if (!requestId || !email) {
        requestId = currentRequestId;
        email = currentRequestEmail;
    }
    
    // Obtener motivo del modal si no viene como parámetro
    if (!reason) {
        const selectReason = document.getElementById("reject-reason-select")?.value;
        const textReason = document.getElementById("reject-reason-text")?.value.trim();
        reason = textReason || selectReason || 'No cumple requisitos';
        
        if (!selectReason && !textReason) {
            showToast('error', 'Motivo requerido', 'Por favor selecciona o escribe un motivo de rechazo');
            return;
        }
    }
    
    const validUUID = isValidUUID(requestId);
    
    try {
        let apiSuccess = false;
        
        // Solo llamar API si el ID es un UUID válido del backend
        if (validUUID && typeof API !== 'undefined' && API.admin?.accessRequests?.reject) {
            try {
                const result = await API.admin.accessRequests.reject(requestId, { 
                    reason,
                    additionalProp1: reason
                });
                
                if (result.success) {
                    apiSuccess = true;
                    console.log('✅ Solicitud rechazada en API:', result.data);
                } else {
                    console.warn('⚠️ API reject falló:', result.error);
                }
            } catch (apiError) {
                console.warn('⚠️ Error en API reject:', apiError.message);
            }
        } else if (!validUUID) {
            console.log('ℹ️ ID no es UUID válido del backend, solo se actualiza localStorage:', requestId);
        }
        
        // Actualizar localStorage SIEMPRE
        updateLocalRequestStatus(email, 'REJECTED');
        
        // También por ID si es UUID
        if (validUUID) {
            updateLocalRequestStatusById(requestId, 'REJECTED');
        }
        
        // Recargar lista con manejo de errores
        try {
            await loadAccessRequests().then(requests => {
                renderAccessRequests(requests);
            });
        } catch (reloadError) {
            console.warn('⚠️ Error recargando lista tras rechazar:', reloadError);
        }
        
        closeRejectModal();
        
        // Mensaje según resultado
        if (apiSuccess) {
            showToast('success', 'Solicitud rechazada', `Se notificó a ${email} sobre el rechazo.`);
        } else if (validUUID) {
            showToast('success', 'Rechazada localmente', `La solicitud fue rechazada pero el servidor no respondió. Se sincronizará más tarde.`);
        } else {
            showToast('success', 'Solicitud rechazada', `La solicitud de ${email} fue rechazada localmente.`);
        }
        
    } catch (error) {
        console.error('Error rechazando:', error);
        closeRejectModal();
        showToast('error', 'Error al rechazar', error.message || 'Ocurrió un error inesperado');
    }
};


let dashboardDocuments = [];
let dashboardAccessRequests = [];
// Variables para modales de solicitudes
let currentRequestId = null;
let currentRequestEmail = null;
let currentRequestData = null;

function formatSpanishDate(date) {
	const dayName = new Intl.DateTimeFormat("es-PE", { weekday: "long" }).format(date);
	const time = new Intl.DateTimeFormat("es-PE", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true
	}).format(date);

	const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
	return `Ultima actualizacion: ${dayLabel}, ${time}`;
}

function normalizeText(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();
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
		const role = String(user?.rol || "").toLowerCase();
		if (role && !role.includes("admin")) {
			window.location.replace(userPanelPage);
			return false;
		}

		return true;
	}

	const hasToken = Boolean(localStorage.getItem("unmsm_token"));
	if (!hasToken) {
		window.location.replace(loginPage);
		return false;
	}

	return true;
}

function updateLastRefreshLabel() {
	const target = document.getElementById("last-update");
	if (!target) {
		return;
	}

	target.textContent = formatSpanishDate(new Date());
}

function getCurrentUser() {
	if (typeof API !== "undefined" && API.auth && typeof API.auth.getUser === "function") {
		const apiUser = API.auth.getUser();
		if (apiUser) {
			return apiUser;
		}
	}

	try {
		const raw = localStorage.getItem("unmsm_user");
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function initialsFromName(name) {
	const tokens = String(name || "")
		.split(" ")
		.filter(Boolean)
		.slice(0, 2);

	if (!tokens.length) {
		return "RA";
	}

	return tokens.map((token) => token.charAt(0).toUpperCase()).join("");
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

function setupThemeToggle() {
	const body = document.getElementById("racio-body");
	const toggle = document.getElementById("theme-toggle");
	const icon = document.getElementById("theme-icon");

	if (!body || !toggle || !icon) {
		return;
	}

	const savedTheme = localStorage.getItem("theme") || "light";
	if (savedTheme === "dark") {
		body.classList.add("theme-dark");
		icon.textContent = "light_mode";
		toggle.setAttribute("aria-label", "Activar modo claro");
	}

	toggle.addEventListener("click", () => {
		const isDark = body.classList.toggle("theme-dark");
		localStorage.setItem("theme", isDark ? "dark" : "light");
		icon.textContent = isDark ? "light_mode" : "dark_mode";
		toggle.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
	});
}

function setupLogoutModal() {
	const modal = document.getElementById("logout-modal");
	const backdrop = document.getElementById("logout-modal-backdrop");
	const cancelButton = document.getElementById("logout-cancel");
	const confirmButton = document.getElementById("logout-confirm");

	if (!modal || !cancelButton || !confirmButton) {
		return null;
	}

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

	if (backdrop) {
		backdrop.addEventListener("click", closeModal);
	}

	cancelButton.addEventListener("click", closeModal);
	confirmButton.addEventListener("click", performLogout);

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && modal.classList.contains("is-open")) {
			closeModal();
		}
	});

	return {
		openModal,
		closeModal
	};
}

function setupProfileMenu(logoutModalControls) {
	const profileToggle = document.getElementById("profile-toggle");
	const profileMenu = document.getElementById("profile-menu");
	const logoutButton = document.getElementById("logout-button");

	if (!profileToggle || !profileMenu) {
		return;
	}

	const closeMenu = () => {
		profileMenu.classList.remove("is-open");
		profileToggle.classList.remove("open");
		profileToggle.setAttribute("aria-expanded", "false");
	};

	const openMenu = () => {
		profileMenu.classList.add("is-open");
		profileToggle.classList.add("open");
		profileToggle.setAttribute("aria-expanded", "true");
	};

	profileToggle.addEventListener("click", () => {
		if (profileMenu.classList.contains("is-open")) {
			closeMenu();
			return;
		}
		openMenu();
	});

	document.addEventListener("click", (event) => {
		if (!profileMenu.contains(event.target) && !profileToggle.contains(event.target)) {
			closeMenu();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeMenu();
		}
	});

	if (logoutButton) {
		logoutButton.addEventListener("click", () => {
			closeMenu();
			if (logoutModalControls && typeof logoutModalControls.openModal === "function") {
				logoutModalControls.openModal();
				return;
			}
			window.location.replace("portal-inicio-racio.html");
		});
	}
}

function normalizeEstado(value) {
	const status = normalizeText(value).replace(/\s+/g, "_");

	if (status.includes("complet") || status.includes("aprob") || status.includes("public")) {
		return "completado";
	}

	if (status.includes("proceso") || status.includes("revision") || status.includes("observ")) {
		return "en_proceso";
	}

	return "pendiente";
}

function parseDocumentDate(doc) {
	const candidates = [
		doc.fechaRegistro,
		doc.fechaActualizacion,
		doc.updatedAt,
		doc.fecha,
		doc.createdAt,
		doc.fechaCreacion
	];

	for (const candidate of candidates) {
		if (!candidate) {
			continue;
		}

		const date = new Date(candidate);
		if (!Number.isNaN(date.getTime())) {
			return date;
		}
	}

	if (doc.fecha && doc.hora) {
		const hourOnly = String(doc.hora).replace(/\s*H$/i, '').trim();
		const dateWithHour = new Date(`${doc.fecha}T${hourOnly}:00`);
		if (!Number.isNaN(dateWithHour.getTime())) {
			return dateWithHour;
		}
	}

	return new Date();
}

function normalizeDocument(doc, index) {
	const status = normalizeEstado(doc.estado || doc.estadoTexto || doc.status);
	const docDate = parseDocumentDate(doc);
	const codigo = doc.codigo || doc.code || `DOC-${index + 1}`;
	const descripcion = doc.descripcion || doc.nombre || doc.name || "Documento sin descripcion";
	const facultad = doc.nombreFacultad || doc.facultad || doc.facultadNombre || doc.generadoPor || "Facultad";
	const unidad = doc.unidad || doc.area || doc.generadoPor || "Unidad administrativa";

	return {
		id: doc.id || codigo,
		codigo,
		descripcion,
		facultad,
		unidad,
		estado: status,
		fecha: docDate
	};
}

function buildExpedienteDetailUrl(doc) {
	const params = new URLSearchParams();
	params.set("codigo", doc.codigo || "");
	params.set("facultad", doc.facultad || "");
	params.set("unidad", doc.unidad || "");
	params.set("descripcion", doc.descripcion || "");
	params.set("estado", doc.estado || "pendiente");
	params.set("fecha", doc.fecha instanceof Date ? doc.fecha.toISOString() : "");
	return `racio-expedientes.html?${params.toString()}`;
}

function normalizeAccessRequest(item, index) {
    if (!item || typeof item !== "object") {
        return null;
    }

    const firstName = item.firstName || item.first_name || item.nombre || item.name || "";
    const lastName = item.lastName || item.last_name || item.apellido || item.surname || "";
    const fullName = String(`${firstName} ${lastName}`).trim() || item.email || `Solicitud ${index + 1}`;
    const requestedAt = item.requestedAt || item.requested_at || item.createdAt || item.created_at || item.fecha || new Date().toISOString();

    // ✅ FIX: Asegurar que el ID sea el UUID del backend si existe
    const id = item.id || item.requestId || item.code || `${index + 1}`;

    return {
        id: id,
        requestId: item.requestId || item.id,  // ← Guardar ambos para compatibilidad
        email: item.email || item.correo || "",
        fullName,
        faculty: item.faculty?.name || item.faculty?.nombre || item.faculty || item.facultad || "Sin facultad",
        position: item.position || item.cargo || "",
        message: item.message || item.mensaje || "",
        status: String(item.status || "PENDING").toUpperCase(),
        requestedAt: new Date(requestedAt)
    };
}

function mergeDocuments(primary, secondary) {
	const byCode = new Map();

	primary.forEach((doc) => {
		byCode.set(doc.codigo, doc);
	});

	secondary.forEach((doc) => {
		const existing = byCode.get(doc.codigo);
		byCode.set(doc.codigo, existing ? { ...existing, ...doc } : doc);
	});

	return Array.from(byCode.values());
}

function loadLocalDocuments() {
	const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.map((doc, index) => normalizeDocument(doc, index));
	} catch (error) {
		console.error("No se pudo leer sigpro_documentos_lista:", error);
		return [];
	}
}

function extractArrayPayload(payload) {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (!payload || typeof payload !== "object") {
		return [];
	}

	const candidateKeys = ["data", "items", "documents", "records", "results", "rows", "list", "docs", "content"];
	for (const key of candidateKeys) {
		const value = payload[key];
		if (Array.isArray(value)) {
			return value;
		}
	}

	for (const key of candidateKeys) {
		const nested = payload[key];
		if (nested && typeof nested === "object") {
			const nestedArray = extractArrayPayload(nested);
			if (nestedArray.length) {
				return nestedArray;
			}
		}
	}

	return [];
}

async function loadApiDocuments() {
    if (typeof API === "undefined" || !API.admin?.documents?.getAdminDocuments) return [];

    try {
        const result = await API.admin.documents.getAdminDocuments('', '', 1, 100);
        
        if (!result?.success) {
            console.warn('Error cargando documentos:', result?.error);
            return [];
        }
        
        const allDocs = extractArrayPayload(result.data);
        console.log(`📊 Documentos admin cargados: ${allDocs.length}`);
        
        const normalized = allDocs.map((doc, i) => normalizeDocument(doc, i));
        
        // ✅ FIX: usar doc.codigo (no doc.code)
        const unique = new Map();
        normalized.forEach(doc => unique.set(doc.codigo, doc));
        
        return Array.from(unique.values());

    } catch (error) {
        console.error("Error cargando documentos desde API:", error);
        return [];
    }
}

function toRelativeTime(date) {
    if (!date || !(date instanceof Date)) return "--";
    
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return "Ahora"; // Fecha futura
    
    if (diffMs < 60 * 1000) return "Ahora";

    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 60) return `Hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} días`;
    
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short"
    }).format(date);
}

async function loadAccessRequests() {
    let apiRequests = [];
    let apiSuccess = false;

    // 1. Intentar API sin filtro de status (evita 500 del backend)
    if (typeof API !== "undefined" && API.admin?.accessRequests?.getAll) {
        try {
            const response = await API.admin.accessRequests.getAll();
            console.log('📥 API accessRequests response:', response);
            
            const isSuccess = response?.success === true || Array.isArray(response) || Array.isArray(response?.data);
            
            if (isSuccess) {
                const rows = extractArrayPayload(response.data || response);
                console.log('📊 Raw API rows:', rows.length);
                
                // Filtrar PENDING en el frontend
                apiRequests = rows.filter(item => {
                    const status = String(item.status || item.estado || '').toUpperCase();
                    return status === 'PENDING' || status === 'PENDIENTE';
                });
                apiSuccess = true;
                console.log(`✅ ${apiRequests.length} solicitudes PENDING desde API`);
            } else {
                console.warn('⚠️ API accessRequests no exitosa:', response?.error || 'Sin datos');
            }
        } catch (error) {
            console.warn('❌ API accessRequests exception:', error.message);
        }
    }

    // 2. Fallback: localStorage (solicitudes guardadas desde el portal de registro)
    let localRequests = [];
    try {
        const raw = localStorage.getItem('sigpro_access_requests');
        if (raw) {
            const parsed = JSON.parse(raw);
            localRequests = Array.isArray(parsed) ? parsed : [];
            console.log('📦 localStorage raw:', localRequests.length, 'solicitudes');
            
            localRequests = localRequests.filter(r => {
                const status = String(r.status || '').toUpperCase();
                return status === 'PENDING' || status === 'PENDIENTE';
            });
            console.log('📦 localStorage PENDING:', localRequests.length);
        }
    } catch (e) {
        console.error('❌ Error leyendo localStorage:', e);
        localRequests = [];
    }

    // 3. Si la API falló pero hay datos locales, usarlos
    if (!apiSuccess && localRequests.length > 0) {
        console.log(`📦 Usando ${localRequests.length} solicitudes desde localStorage (API falló)`);
    }

    // 4. Merge API + localStorage, eliminar duplicados por email
    const merged = new Map();

    [...apiRequests, ...localRequests].forEach(req => {
        const key = (req.id || req.requestId || '').toString().trim();
        const emailKey = (req.email || req.correo || '').toLowerCase().trim();
        
        // Si es UUID, usarlo como clave principal
        if (isValidUUID(key)) {
            if (!merged.has(key)) {
                merged.set(key, req);
            }
        } else if (emailKey && !merged.has(emailKey)) {
            merged.set(emailKey, req);
        }
    });

    const result = Array.from(merged.values())
        .map((item, index) => normalizeAccessRequest(item, index))
        .filter(Boolean)
        .sort((a, b) => (b.requestedAt?.getTime?.() || 0) - (a.requestedAt?.getTime?.() || 0));

    console.log(`📋 Total solicitudes pendientes a mostrar: ${result.length}`);
    return result;
}

function updateCounters(documents) {
	const counts = {
		pendiente: documents.filter((doc) => doc.estado === "pendiente").length,
		en_proceso: documents.filter((doc) => doc.estado === "en_proceso").length,
		completado: documents.filter((doc) => doc.estado === "completado").length
	};

	const pendingNode = document.getElementById("count-pendiente");
	const processNode = document.getElementById("count-en-proceso");
	const completedNode = document.getElementById("count-completado");

	if (pendingNode) pendingNode.textContent = String(counts.pendiente);
	if (processNode) processNode.textContent = String(counts.en_proceso);
	if (completedNode) completedNode.textContent = String(counts.completado);
}

function toRelativeTime(date) {
	const diffMs = Date.now() - date.getTime();
	if (diffMs < 60 * 1000) return "Ahora";

	const minutes = Math.floor(diffMs / (60 * 1000));
	if (minutes < 60) return `${minutes} min`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return "Hoy";

	const days = Math.floor(hours / 24);
	if (days === 1) return "Ayer";

	return `${days} dias`;
}

function renderAccessRequests(requests) {
    dashboardAccessRequests = Array.isArray(requests) ? requests : [];
    const list = document.getElementById("access-requests-list");
    const status = document.getElementById("access-requests-status");
    if (!list) return;

    if (!dashboardAccessRequests.length) {
        if (status) status.textContent = "Sin solicitudes pendientes";
        list.innerHTML = `
            <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-8 text-center md:col-span-3">
                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
                <p class="text-sm text-gray-500 font-medium">No hay solicitudes de acceso pendientes en este momento.</p>
                <p class="text-xs text-gray-400 mt-1">Las nuevas solicitudes aparecerán aquí automáticamente.</p>
            </div>
        `;
        return;
    }

    if (status) status.textContent = `Mostrando ${dashboardAccessRequests.length} solicitud(es) pendiente(s)`;
    
    list.innerHTML = dashboardAccessRequests.slice(0, 5).map((request) => {
        const relativeTime = toRelativeTime(request.requestedAt || new Date());
        const initials = initialsFromName(request.fullName);
        
        const requestId = request.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.id)
            ? request.id
            : (request.requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.requestId)
                ? request.requestId
                : (request.id || request.email));
        
        const requestData = encodeURIComponent(JSON.stringify({
            id: requestId,
            email: request.email,
            fullName: request.fullName,
            faculty: request.faculty,
            position: request.position,
            message: request.message,
            requestedAt: request.requestedAt?.toISOString?.() || request.requestedAt,
            initials: initials,
            relativeTime: relativeTime
        }));
        
        return `
            <article class="access-request-card rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg" 
                     data-request-id="${requestId}" 
                     data-request='${requestData}'
                     onclick="openRequestDetail(this)">
                <div class="flex items-start gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center font-black text-sm shadow-sm">
                        ${escapeHtml(initials)}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex justify-between items-start gap-2">
                            <div>
                                <h4 class="text-sm font-semibold text-gray-900 truncate">${escapeHtml(request.fullName)}</h4>
                                <p class="text-xs text-gray-500 truncate">${escapeHtml(request.email || "Sin correo")}</p>
                            </div>
                            <span class="text-[10px] text-gray-400 font-medium whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded-full">${escapeHtml(relativeTime)}</span>
                        </div>
                        <p class="text-xs text-gray-600 mt-2 line-clamp-1"><span class="font-medium">Facultad:</span> ${escapeHtml(request.faculty)}</p>
                        ${request.position ? `<p class="text-xs text-gray-600 mt-1 line-clamp-1"><span class="font-medium">Cargo:</span> ${escapeHtml(request.position)}</p>` : ""}
                        
                        <div class="card-actions mt-3 flex gap-2">
                            <button onclick="event.stopPropagation(); openApproveModal('${requestId}', '${escapeHtml(request.email)}')" 
                                    class="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-all hover:shadow-lg hover:shadow-green-600/20 flex items-center justify-center gap-1.5">
                                <span class="material-symbols-outlined text-sm">check</span>
                                Aprobar
                            </button>
                            <button onclick="event.stopPropagation(); openRejectModal('${requestId}', '${escapeHtml(request.email)}')" 
                                    class="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-all hover:shadow-lg hover:shadow-red-600/20 flex items-center justify-center gap-1.5">
                                <span class="material-symbols-outlined text-sm">close</span>
                                Rechazar
                            </button>
                        </div>
                        
                        <div class="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-100">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                            Pendiente
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function getNotificationStyle(status) {
	if (status === "completado") {
		return {
			title: "Documento aprobado",
			icon: "task_alt",
			iconClass: "bg-green-50 text-green-600",
			tagClass: "bg-green-100 text-green-800",
			tagLabel: "Publicado"
		};
	}

	if (status === "en_proceso") {
		return {
			title: "Documento en proceso",
			icon: "sync",
			iconClass: "bg-blue-50 text-blue-600",
			tagClass: "bg-blue-100 text-blue-800",
			tagLabel: "En proceso"
		};
	}

	return {
		title: "Nuevo documento recibido",
		icon: "description",
		iconClass: "bg-orange-50 text-orange-600",
		tagClass: "bg-orange-100 text-orange-800",
		tagLabel: "Pendiente"
	};
}

// Mostrar notificaciones de documentos y correcciones recientes
function renderNotifications(documents) {
	const list = document.getElementById("notifications-list");
	const status = document.getElementById("notifications-status");
	if (!list) return;

	// Leer correcciones recientes (en proceso) de sigpro_correcciones_solicitudes
	let correcciones = [];
	try {
		correcciones = JSON.parse(localStorage.getItem('sigpro_correcciones_solicitudes')) || [];
	} catch {}
	// Solo mostrar las que están en proceso
	correcciones = correcciones.filter(c => (c.estado || '').toLowerCase().includes('proceso'));

	// Normalizar fechas
	correcciones = correcciones.map(c => ({
		...c,
		fechaObj: new Date(c.fecha),
		descripcion: c.asunto || 'Corrección',
		facultad: c.correoInstitucional || 'Facultad',
		estado: c.estado || 'en_proceso',
		codigo: c.codigo || '',
	}));

	// Dar prioridad a pendientes y en proceso para que las notificaciones reflejen actividad real
	const prioritizedDocuments = [...documents]
		.sort((a, b) => {
			const rank = (doc) => (doc.estado === "pendiente" ? 0 : doc.estado === "en_proceso" ? 1 : 2);
			return rank(a) - rank(b) || ((b.fechaObj || b.fecha)?.getTime?.() || 0) - ((a.fechaObj || a.fecha)?.getTime?.() || 0);
		});

	// Unir documentos y correcciones
	const all = [...prioritizedDocuments, ...correcciones].sort((a, b) => {
		const da = a.fechaObj || a.fecha;
		const db = b.fechaObj || b.fecha;
		return (db?.getTime?.() || 0) - (da?.getTime?.() || 0);
	});
	const latest = all.slice(0, 3);

	if (!latest.length) {
		if (status) status.textContent = "Sin notificaciones recientes";
		list.innerHTML = `
			<div class="notification-card flex gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 md:col-span-3">
				<div class="flex-shrink-0">
					<div class="notification-icon w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">hourglass_empty</span>
					</div>
				</div>
				<div class="flex-grow">
					<div class="flex justify-between items-start">
						<h4 class="text-sm font-semibold text-gray-900">Sin documentos todavia</h4>
						<span class="text-[10px] text-gray-400 font-medium">--</span>
					</div>
					<p class="text-xs text-gray-500 mt-1 mb-2 line-clamp-2">Las notificaciones se activaran cuando las facultades envien documentos al sistema.</p>
					<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">Sin actividad</span>
				</div>
			</div>
		`;
		return;
	}

	if (status) status.textContent = `Mostrando ${latest.length} notificacion(es) mas reciente(s)`;

	list.innerHTML = latest.map((doc) => {
		const style = getNotificationStyle(doc.estado);
		const relativeTime = toRelativeTime(doc.fecha instanceof Date ? doc.fecha : new Date(doc.fecha));
		// Si es corrección, ir a racio-expedientes con el código
		const detailUrl = doc.codigo ? `racio-expedientes.html?codigo=${encodeURIComponent(doc.codigo)}` : buildExpedienteDetailUrl(doc);
		return `
			<a class="notification-card flex gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover-lift cursor-pointer" href="${detailUrl}" title="Abrir expediente ${doc.codigo}">
				<div class="flex-shrink-0">
					<div class="notification-icon w-10 h-10 rounded-full ${style.iconClass} flex items-center justify-center">
						<span class="material-symbols-outlined text-xl">${style.icon}</span>
					</div>
				</div>
				<div class="flex-grow">
					<div class="flex justify-between items-start gap-2">
						<h4 class="text-sm font-semibold text-gray-900">${style.title}</h4>
						<span class="text-[10px] text-gray-400 font-medium whitespace-nowrap">${relativeTime}</span>
					</div>
					<p class="text-xs text-gray-500 mt-1 mb-2 line-clamp-2">${doc.facultad} envio ${doc.codigo} (${doc.descripcion}).</p>
					<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${style.tagClass}">${style.tagLabel}</span>
				</div>
			</a>
		`;
	}).join("");
}

function extractFacultyRows(payload) {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (Array.isArray(payload?.data)) {
		return payload.data;
	}

	if (Array.isArray(payload?.items)) {
		return payload.items;
	}

	return [];
}

function formatAdminFacultyDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";

	return new Intl.DateTimeFormat("es-PE", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(date);
}

function renderAdminFacultiesTable(rows) {
	const tableBody = document.getElementById("admin-faculties-body");
	const emptyState = document.getElementById("admin-faculties-empty");
	const countNode = document.getElementById("admin-faculties-count");

	if (!tableBody) {
		return;
	}

	if (!rows.length) {
		tableBody.innerHTML = `
			<tr>
				<td colspan="9" class="text-center py-6 text-slate-500">No hay datos de facultades para mostrar.</td>
			</tr>
		`;
		if (countNode) countNode.textContent = "0 facultades";
		if (emptyState) emptyState.classList.remove("hidden");
		return;
	}

	if (countNode) {
		countNode.textContent = `${rows.length} facultad${rows.length === 1 ? "" : "es"}`;
	}
	if (emptyState) emptyState.classList.add("hidden");

	tableBody.innerHTML = rows.map((faculty) => {
		const stats = faculty?.stats || {};
		const active = Boolean(faculty?.isActive);
		const statusClass = active
			? "admin-faculty-status admin-faculty-status--active"
			: "admin-faculty-status admin-faculty-status--inactive";
		const statusLabel = active ? "Activa" : "Inactiva";

		return `
			<tr>
				<td>
					<div class="font-semibold text-slate-800">${faculty?.name || "-"}</div>
				</td>
				<td class="font-semibold text-slate-700">${faculty?.code || "-"}</td>
				<td class="text-slate-600">${faculty?.shortName || "-"}</td>
				<td><span class="${statusClass}">${statusLabel}</span></td>
				<td class="text-slate-600">${formatAdminFacultyDate(faculty?.createdAt)}</td>
				<td class="text-center font-semibold text-slate-700">${Number(stats?.indicatorsCount || 0)}</td>
				<td class="text-center font-semibold text-slate-700">${Number(stats?.flowsCount || 0)}</td>
				<td class="text-center font-semibold text-slate-700">${Number(stats?.processesCount || 0)}</td>
				<td class="text-center font-semibold text-slate-700">${Number(stats?.activeUsers || 0)}</td>
			</tr>
		`;
	}).join("");
}

async function loadAdminFacultiesTable() {
	const errorNode = document.getElementById("admin-faculties-error");
	const tableBody = document.getElementById("admin-faculties-body");

	if (!tableBody) {
		return;
	}

	if (errorNode) {
		errorNode.classList.add("hidden");
		errorNode.textContent = "";
	}

	if (typeof API === "undefined" || !API.admin || !API.admin.faculties) {
		renderAdminFacultiesTable([]);
		return;
	}

	try {
		let result = null;
		if (typeof API.admin.faculties.getAll === "function") {
			result = await API.admin.faculties.getAll();
		}

		if (!result?.success && typeof API.admin.faculties.getAdminFaculties === "function") {
			const fallbackRows = await API.admin.faculties.getAdminFaculties();
			const rows = extractFacultyRows(fallbackRows);
			renderAdminFacultiesTable(rows);
			return;
		}

		if (!result?.success) {
			throw new Error(result?.error || "No se pudieron cargar las facultades administrativas.");
		}

		const rows = extractFacultyRows(result.data);
		renderAdminFacultiesTable(rows);
	} catch (error) {
		console.error("Error cargando facultades administrativas:", error);
		renderAdminFacultiesTable([]);
		if (errorNode) {
			errorNode.textContent = error?.message || "No se pudieron cargar las facultades administrativas.";
			errorNode.classList.remove("hidden");
		}
	}
}

async function loadDashboardData() {
	const [apiDocuments] = await Promise.all([
		loadApiDocuments()
	]);

	const localDocuments = loadLocalDocuments();
	// Cargar documentos detallados guardados por las facultades (sigpro_documentos_detalle)
	let localDetailDocs = [];
	try {
		const rawDetail = localStorage.getItem('sigpro_documentos_detalle');
		if (rawDetail) {
			const detailMap = JSON.parse(rawDetail) || {};
			localDetailDocs = Object.entries(detailMap).map(([codigo, detail]) => {
				const item = detail || {};
				const ficha = item.fichaData || {};
				return {
					codigo: item.codigo || ficha.codigo || codigo,
					descripcion: item.titulo || ficha.descripcion || item.descripcion || `Documento ${codigo}`,
					facultad: ficha.facultad || item.nombreFacultad || item.facultad || '',
					estado: normalizeEstado(item.estado || ficha.estado || 'pendiente'),
					fecha: parseDocumentDate(item) || parseDocumentDate(ficha) || new Date(),
					fechaObj: parseDocumentDate(item) || parseDocumentDate(ficha) || new Date(),
					descripcionRaw: item,
				};
			});
		}
	} catch (e) {
		console.warn('No se pudo parsear sigpro_documentos_detalle:', e);
		localDetailDocs = [];
	}

	// Merge: api <- local list <- local detail (detail should override summaries)
	dashboardDocuments = mergeDocuments(apiDocuments, mergeDocuments(localDocuments, localDetailDocs));
	dashboardAccessRequests = await loadAccessRequests();

	if (dashboardDocuments.length > 0) {
		updateCounters(dashboardDocuments);
	}
	renderNotifications(dashboardDocuments);
	renderAccessRequests(dashboardAccessRequests);
	updateLastRefreshLabel();
}

// Cargar y renderizar estadísticas administrativas (contador de documentos)
async function loadAndRenderAdminStats() {
	if (typeof API === 'undefined' || !API.admin || !API.admin.stats) return;

	// Preferir método centralizado si existe
	const loader = API.admin.stats.getAdminStats || API.admin.stats.get;
	if (typeof loader !== 'function') return;

	try {
		const res = await loader();
		const result = res?.success ? res : (res && Array.isArray(res) ? { success: true, data: res } : res);

		if (!result?.success) {
			const errEl = document.getElementById('admin-stats-error');
			if (result?.status === 401 || result?.status === 403) {
				// Sesión inválida: limpiar y redirigir al login
				localStorage.removeItem('unmsm_token');
				localStorage.removeItem('unmsm_user');
				window.location.replace('portal-inicio-racio.html');
				return;
			}
			console.warn('No se pudieron cargar estadísticas administrativas', result);
			if (errEl) {
				errEl.textContent = result?.error || result?.message || 'No se pudieron cargar las estadísticas del sistema.';
				errEl.classList.remove('hidden');
			}
			return;
		}

		const stats = result.data || {};
		// Hide error if present
		const errEl = document.getElementById('admin-stats-error');
		if (errEl) errEl.classList.add('hidden');

		const byStatus = stats.byStatus || {};
		const byType = stats.byType || {};

		const pend = document.getElementById('count-pendiente');
		const proc = document.getElementById('count-en-proceso');
		const comp = document.getElementById('count-completado');

		if (pend) pend.textContent = String((byStatus.pending ?? stats.documentsPending ?? stats.documents_pending ?? stats.pending ?? stats.pendingDocuments ?? pend.textContent) || 0);
		if (proc) proc.textContent = String((byStatus.inProgress ?? stats.documentsInProcess ?? stats.documents_in_process ?? stats.inProcess ?? stats.processing ?? proc.textContent) || 0);
		if (comp) comp.textContent = String((byStatus.completed ?? stats.documentsCompleted ?? stats.documents_completed ?? stats.completed ?? stats.approved ?? comp.textContent) || 0);

		const totalNode = document.getElementById('total-documents');
		const facultiesNode = document.getElementById('active-faculties');
		const pendingUsersNode = document.getElementById('pending-users');
		const avgNode = document.getElementById('avg-approval-time');

		if (totalNode) totalNode.textContent = String(stats.totalDocuments ?? stats.total_documents ?? stats.total ?? 0);
		if (facultiesNode) facultiesNode.textContent = String(stats.activeFaculties ?? stats.active_faculties ?? stats.facultiesActive ?? 0);
		if (pendingUsersNode) pendingUsersNode.textContent = String(stats.pendingUsers ?? stats.pending_users ?? stats.usersPending ?? 0);
		if (avgNode) avgNode.textContent = String(stats.avgApprovalTime ?? stats.avg_approval_time ?? stats.averageApprovalTime ?? 0);

		const indicatorsNode = document.getElementById('type-indicators');
		const flowsNode = document.getElementById('type-flows');
		const charsNode = document.getElementById('type-characterizations');
		const reportsNode = document.getElementById('type-reports');

		if (indicatorsNode) indicatorsNode.textContent = String(byType.indicators ?? stats.indicators ?? 0);
		if (flowsNode) flowsNode.textContent = String(byType.flows ?? stats.flows ?? 0);
		if (charsNode) charsNode.textContent = String(byType.characterizations ?? stats.characterizations ?? 0);
		if (reportsNode) reportsNode.textContent = String(byType.reports ?? stats.reports ?? 0);

	} catch (error) {
		console.error('Error cargando admin stats:', error);
	}
}

function setupRefreshButton() {
	const button = document.getElementById("refresh-button");
	if (!button) {
		return;
	}

	button.addEventListener("click", async () => {
		button.disabled = true;
		const originalLabel = button.innerHTML;
		button.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>Actualizando';
		try {
			await Promise.all([
				loadDashboardData(),
				loadAdminFacultiesTable(),
				loadAndRenderAdminStats()
			]);
		} finally {
			button.disabled = false;
			button.innerHTML = originalLabel;
		}
	});
}

function setupFacultyFilter() {
    const input = document.getElementById("facultad-search");
    const clearButton = document.getElementById("facultad-search-clear");
    const status = document.getElementById("facultad-search-status");
    const emptyState = document.getElementById("facultad-empty-state");
    const cards = Array.from(document.querySelectorAll(".facultad-card"));

    if (!input || !cards.length) return;

    const total = cards.length;

    const applyFilter = () => {
        const query = normalizeText(input.value || "");
        let visibleCount = 0;

        cards.forEach((card) => {
            // Buscar en nombre, código y data attributes
            const name = normalizeText(card.textContent || "");
            const code = normalizeText(card.dataset.facultyCode || "");
            const fullName = normalizeText(card.getAttribute('title') || "");
            
            const visible = name.includes(query) || code.includes(query) || fullName.includes(query);
            card.classList.toggle("hidden", !visible);
            if (visible) visibleCount += 1;
        });

        if (status) {
            status.textContent = query
                ? `Búsqueda activa: ${visibleCount} resultado(s) de ${total} para "${input.value.trim()}"`
                : `Mostrando ${total} de ${total} facultades`;
        }

        if (clearButton) {
            clearButton.classList.toggle("hidden", !query);
        }

        if (emptyState) {
            emptyState.classList.toggle("hidden", visibleCount > 0);
        }
    };

    // Limpiar listeners anteriores para evitar duplicados
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.addEventListener("input", applyFilter);
    
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            newInput.value = "";
            newInput.focus();
            applyFilter();
        });
    }

    applyFilter();
}

async function setupFacultyNavigation() {
    const grid = document.getElementById("facultades-grid");
    const emptyState = document.getElementById("facultad-empty-state");
    const status = document.getElementById("facultad-search-status");
    
    if (!grid) return;

    // Mostrar loading
    grid.innerHTML = `
        <div class="md:col-span-full text-center py-8">
            <span class="material-symbols-outlined text-4xl text-blue-300 animate-spin">progress_activity</span>
            <p class="text-sm text-slate-500 mt-2">Cargando facultades desde el sistema...</p>
        </div>
    `;

    try {
        // Cargar facultades desde la API
        let faculties = [];
        
        if (typeof API !== 'undefined' && API.admin && API.admin.faculties?.getAll) {
            const res = await API.admin.faculties.getAll();
            if (res?.success && Array.isArray(res.data)) {
                faculties = res.data;
            }
        }
        
        // Fallback: intentar con endpoint público
        if (!faculties.length && typeof API !== 'undefined' && API.public?.faculties?.getAll) {
            const res = await API.public.faculties.getAll();
            if (res?.success && Array.isArray(res.data)) {
                faculties = res.data;
            }
        }

        // Si no hay datos de API, mostrar error
        if (!faculties.length) {
            grid.innerHTML = `
                <div class="md:col-span-full text-center py-8">
                    <span class="material-symbols-outlined text-4xl text-slate-300">cloud_off</span>
                    <p class="text-sm text-slate-500 mt-2">No se pudieron cargar las facultades desde el servidor.</p>
                    <button onclick="location.reload()" class="mt-2 text-xs text-blue-600 hover:underline">Reintentar</button>
                </div>
            `;
            if (status) status.textContent = "Error de conexión con el servidor";
            return;
        }

        // Mapear iconos y colores por código de facultad
        const facultyConfig = {
            'MED': { icon: 'medical_services', color: 'red', glow: 'icon-glow-red' },
            'DER': { icon: 'gavel', color: 'indigo', glow: 'icon-glow-indigo' },
            'FLCH': { icon: 'history_edu', color: 'amber', glow: 'icon-glow-amber' },
            'FFB': { icon: 'vaccines', color: 'cyan', glow: 'icon-glow-cyan' },
            'FO': { icon: 'health_and_safety', color: 'teal', glow: 'icon-glow-teal' },
            'FE': { icon: 'school', color: 'emerald', glow: 'icon-glow-emerald' },
            'FQIQ': { icon: 'science', color: 'lime', glow: 'icon-glow-lime' },
            'FMV': { icon: 'pets', color: 'orange', glow: 'icon-glow-orange' },
            'FCA': { icon: 'work', color: 'purple', glow: 'icon-glow-purple' },
            'FCB': { icon: 'biotech', color: 'green', glow: 'icon-glow-green' },
            'FCC': { icon: 'money_bag', color: 'pink', glow: 'icon-glow-pink' },
            'FCE': { icon: 'trending_up', color: 'yellow', glow: 'icon-glow-yellow' },
            'FCF': { icon: 'antigravity', color: 'violet', glow: 'icon-glow-violet' },
            'FCM': { icon: 'calculate', color: 'blue', glow: 'icon-glow-blue' },
            'FCCSS': { icon: 'groups', color: 'rose', glow: 'icon-glow-rose' },
            'FIGMMG': { icon: 'terrain', color: 'stone', glow: 'icon-glow-stone' },
            'FII': { icon: 'precision_manufacturing', color: 'slate', glow: 'icon-glow-slate' },
            'FP': { icon: 'psychology', color: 'fuchsia', glow: 'icon-glow-fuchsia' },
            'FIEE': { icon: 'electrical_services', color: 'amber', glow: 'icon-glow-amber' },
            'FISI': { icon: 'computer', color: 'sky', glow: 'icon-glow-sky' }
        };

        // Generar cards dinámicamente
        grid.innerHTML = faculties.map(faculty => {
            const config = facultyConfig[faculty.code] || { 
                icon: 'school', 
                color: 'slate', 
                glow: 'icon-glow-slate' 
            };
            
            const stats = faculty.stats || {};
            const shortName = faculty.shortName || faculty.name?.replace('Facultad de ', '') || faculty.name;
            const displayName = shortName.length > 25 ? shortName.substring(0, 22) + '...' : shortName;
            
            // URL con el ID real de la API
            const targetUrl = `racio-facultades-documentos.html?facultyId=${encodeURIComponent(faculty.id)}&facultyCode=${encodeURIComponent(faculty.code)}&facultyName=${encodeURIComponent(faculty.name)}`;
            
            return `
                <a class="facultad-card bg-white p-5 rounded-xl shadow-sm hover-lift transition-all duration-300 flex flex-col items-center justify-center gap-3 h-36 border border-gray-100 group ${config.glow}" 
                   href="${targetUrl}" 
                   title="${faculty.name} - Ver ${stats.flowsCount || 0} flujogramas, ${stats.indicatorsCount || 0} indicadores"
                   data-faculty-id="${faculty.id}"
                   data-faculty-code="${faculty.code}">
                    
                    <div class="w-12 h-12 rounded-full bg-${config.color}-50 text-${config.color}-500 flex items-center justify-center group-hover:bg-${config.color}-100 transition-all icon-bg relative">
                        <span class="material-symbols-outlined text-2xl">${config.icon}</span>
                        ${stats.flowsCount > 0 ? `
                            <span class="absolute -top-1 -right-1 w-5 h-5 bg-${config.color}-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                ${stats.flowsCount}
                            </span>
                        ` : ''}
                    </div>
                    
                    <span class="text-xs font-bold text-gray-700 text-center leading-tight">${displayName}</span>
                    
                    ${stats.indicatorsCount > 0 || stats.processesCount > 0 ? `
                        <div class="flex gap-1 mt-1">
                            ${stats.indicatorsCount > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">${stats.indicatorsCount} ind</span>` : ''}
                            ${stats.flowsCount > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">${stats.flowsCount} fluj</span>` : ''}
                        </div>
                    ` : ''}
                </a>
            `;
        }).join('');

        // Actualizar contador
        if (status) {
            status.textContent = `Mostrando ${faculties.length} de ${faculties.length} facultades`;
        }

        // Re-inicializar el filtro de búsqueda con los nuevos elementos
        setupFacultyFilter();

    } catch (error) {
        console.error('Error cargando facultades:', error);
        grid.innerHTML = `
            <div class="md:col-span-full text-center py-8">
                <span class="material-symbols-outlined text-4xl text-red-300">error</span>
                <p class="text-sm text-red-500 mt-2">Error al cargar facultades: ${error.message}</p>
                <button onclick="setupFacultyNavigation()" class="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Reintentar</button>
            </div>
        `;
    }
}

// ============================================
// MODALES DE SOLICITUDES
// ============================================

function openRequestDetail(cardElement) {
    const data = JSON.parse(decodeURIComponent(cardElement.dataset.request));
    currentRequestId = data.id;
    currentRequestEmail = data.email;
    currentRequestData = data;
    
    const modal = document.getElementById("request-detail-modal");
    const content = document.getElementById("request-detail-content");
    
    const requestedDate = data.requestedAt 
        ? new Date(data.requestedAt).toLocaleDateString('es-PE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Fecha no disponible';
    
    content.innerHTML = `
        <div class="request-detail-header">
            <div class="request-detail-avatar">${escapeHtml(data.initials)}</div>
            <div class="request-detail-meta">
                <div class="request-detail-name">${escapeHtml(data.fullName)}</div>
                <div class="request-detail-email">${escapeHtml(data.email)}</div>
                <span class="request-detail-badge request-detail-badge--pending">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 animate-pulse"></span>
                    Solicitud pendiente
                </span>
            </div>
            <button onclick="closeRequestDetailModal()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
        
        <div class="request-detail-info-grid">
            <div class="request-detail-info-item">
                <div class="request-detail-info-label">Facultad</div>
                <div class="request-detail-info-value">${escapeHtml(data.faculty || 'No especificada')}</div>
            </div>
            <div class="request-detail-info-item">
                <div class="request-detail-info-label">Cargo / Posición</div>
                <div class="request-detail-info-value">${escapeHtml(data.position || 'No especificado')}</div>
            </div>
            <div class="request-detail-info-item">
                <div class="request-detail-info-label">Fecha de solicitud</div>
                <div class="request-detail-info-value">${requestedDate}</div>
            </div>
            <div class="request-detail-info-item">
                <div class="request-detail-info-label">ID de solicitud</div>
                <div class="request-detail-info-value font-mono text-xs text-gray-500">${escapeHtml(String(data.id).substring(0, 20))}${String(data.id).length > 20 ? '...' : ''}</div>
            </div>
        </div>
        
        ${data.message ? `
        <div class="request-detail-message">
            <div class="request-detail-message-label">
                <span class="material-symbols-outlined text-xs align-middle mr-1">chat</span>
                Mensaje del solicitante
            </div>
            <div class="request-detail-message-text">"${escapeHtml(data.message)}"</div>
        </div>
        ` : ''}
        
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <div class="flex items-start gap-2">
                <span class="material-symbols-outlined text-blue-600 text-sm mt-0.5">info</span>
                <div class="text-sm text-blue-800">
                    <p class="font-semibold mb-1">Acciones disponibles</p>
                    <p class="text-xs leading-relaxed">
                        Al <strong>aprobar</strong>, el usuario recibirá credenciales por correo. 
                        Al <strong>rechazar</strong>, se le notificará con el motivo indicado.
                    </p>
                </div>
            </div>
        </div>
        
        <div class="request-detail-actions">
            <button onclick="closeRequestDetailModal(); setTimeout(() => openApproveModal('${data.id}', '${escapeHtml(data.email)}'), 300);" 
                    class="request-detail-btn request-detail-btn--approve">
                <span class="material-symbols-outlined text-sm">check</span>
                Aprobar solicitud
            </button>
            <button onclick="closeRequestDetailModal(); setTimeout(() => openRejectModal('${data.id}', '${escapeHtml(data.email)}'), 300);" 
                    class="request-detail-btn request-detail-btn--reject">
                <span class="material-symbols-outlined text-sm">close</span>
                Rechazar solicitud
            </button>
            <button onclick="closeRequestDetailModal()" 
                    class="request-detail-btn request-detail-btn--close">
                Cerrar
            </button>
        </div>
    `;
    
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeRequestDetailModal() {
    const modal = document.getElementById("request-detail-modal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function openApproveModal(requestId, email) {
    currentRequestId = requestId;
    currentRequestEmail = email;
    const modal = document.getElementById("approve-confirm-modal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeApproveModal() {
    const modal = document.getElementById("approve-confirm-modal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function openRejectModal(requestId, email) {
    currentRequestId = requestId;
    currentRequestEmail = email;
    document.getElementById("reject-reason-select").value = "";
    document.getElementById("reject-reason-text").value = "";
    const modal = document.getElementById("reject-confirm-modal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeRejectModal() {
    const modal = document.getElementById("reject-confirm-modal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function showToast(type, title, message) {
    const toast = document.getElementById("request-toast");
    const icon = document.getElementById("request-toast-icon");
    const titleEl = document.getElementById("request-toast-title");
    const messageEl = document.getElementById("request-toast-message");
    
    toast.className = `request-toast request-toast--${type}`;
    icon.textContent = type === 'success' ? 'check_circle' : 'error';
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    toast.classList.add("is-visible");
    
    setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 4000);
}

function setupRequestModals() {
    document.getElementById("request-detail-backdrop")?.addEventListener("click", closeRequestDetailModal);
    document.getElementById("approve-confirm-backdrop")?.addEventListener("click", closeApproveModal);
    document.getElementById("reject-confirm-backdrop")?.addEventListener("click", closeRejectModal);
    
    document.getElementById("approve-cancel")?.addEventListener("click", closeApproveModal);
    document.getElementById("reject-cancel")?.addEventListener("click", closeRejectModal);
    
    document.getElementById("approve-confirm")?.addEventListener("click", () => handleApproveRequest());
    document.getElementById("reject-confirm")?.addEventListener("click", () => handleRejectRequest());
    
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeRequestDetailModal();
            closeApproveModal();
            closeRejectModal();
        }
    });
    
    document.getElementById("reject-reason-select")?.addEventListener("change", function() {
        const textArea = document.getElementById("reject-reason-text");
        const reasons = {
            'incomplete_data': 'Los datos proporcionados están incompletos o contienen errores. Por favor, revise su información y vuelva a solicitar el acceso.',
            'invalid_email': 'El correo institucional proporcionado no es válido o no pertenece a la UNMSM. Se requiere un correo @unmsm.edu.pe.',
            'not_authorized': 'La facultad o unidad a la que pertenece no está autorizada para acceder al sistema en este momento.',
            'duplicate': 'Ya existe una solicitud de acceso activa o un usuario registrado con este correo electrónico.',
            'other': ''
        };
        if (reasons[this.value] && !textArea.value.trim()) {
            textArea.value = reasons[this.value];
        }
    });
}

// ✅ NUEVO: Actualizar estado en localStorage
function updateLocalRequestStatus(email, newStatus) {
    try {
        const requests = JSON.parse(localStorage.getItem('sigpro_access_requests') || '[]');
        const updated = requests.map(req => {
            if ((req.email || req.correo || '').toLowerCase() === email.toLowerCase()) {
                return { ...req, status: newStatus, updatedAt: new Date().toISOString() };
            }
            return req;
        });
        localStorage.setItem('sigpro_access_requests', JSON.stringify(updated));
        console.log(`📝 Solicitud ${email} actualizada a ${newStatus}`);
    } catch (e) {
        console.error('Error actualizando localStorage:', e);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
	if (!guardAdminSession()) {
		return;
	}

	renderProfileInfo();
	setupThemeToggle();
	const logoutModalControls = setupLogoutModal();
	setupProfileMenu(logoutModalControls);
	setupRefreshButton();
	setupFacultyFilter();
	setupFacultyNavigation();
	setupRequestModals();
	await loadAdminFacultiesTable();
	await loadAndRenderAdminStats();
	await loadDashboardData();
	
	// ✅ FIX: Cerrar correctamente el callback del event listener
	window.addEventListener('storage', (event) => {
		if (event.key === 'sigpro_access_requests') {
			console.log('🔄 Solicitudes actualizadas desde otra pestaña');
			loadAccessRequests().then(requests => renderAccessRequests(requests));
		}
	}); 
});

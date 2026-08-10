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

// ============================================
// PARSEO SEGURO DE FECHAS (ZONA HORARIA PERÚ)
// ============================================

function parsePeruDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    const str = String(value).trim();

    // Timestamp numérico (segundos o milisegundos)
    if (/^\d+$/.test(str)) {
        const num = Number(str);
        const ms = str.length === 10 ? num * 1000 : num;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
    }

    // Si ya trae Z o offset explícito (+05:00, -05:00), respetarlo
    if (/Z|[+\-]\d{2}:?\d{2}$/.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    // Fecha sola tipo "2026-08-04" → asumir inicio del día en Perú (UTC-5)
    // Esto evita que JavaScript la interprete como UTC y te la muestre a las 7pm
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const d = new Date(str + 'T00:00:00-05:00');
        return isNaN(d.getTime()) ? null : d;
    }

    // Fecha tipo "04/08/2026"
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [day, month, year] = str.split('/');
        const d = new Date(`${year}-${month}-${day}T00:00:00-05:00`);
        return isNaN(d.getTime()) ? null : d;
    }

    // Cualquier otro formato, intentar parseo nativo
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

// ✅ CORREGIDA: Ya no inventa fechas
function parseDocumentDate(doc) {
    const candidates = [
        doc.createdAt,        // ← ✅ Subido al primer lugar
        doc.fechaRegistro,
        doc.fechaActualizacion,
        doc.updatedAt,
        doc.fechaCreacion,
        doc.fecha
    ];

    for (const candidate of candidates) {
        const date = parsePeruDate(candidate);
        if (!date) continue;

        if (doc.hora) {
            const hourOnly = String(doc.hora).replace(/\s*H$/i, '').trim();
            const [hours, minutes] = hourOnly.split(':').map((part) => Number(part));

            if (Number.isFinite(hours) && Number.isFinite(minutes)) {
                const combined = new Date(date);
                const isMidnight =
                    combined.getHours() === 0 &&
                    combined.getMinutes() === 0 &&
                    combined.getSeconds() === 0 &&
                    combined.getMilliseconds() === 0;

                if (isMidnight) {
                    combined.setHours(hours, minutes, 0, 0);
                    return combined;
                }
            }
        }

        return date;
    }

    // Solo si existe fecha + hora explícitas
    if (doc.fecha && doc.hora) {
        const hourOnly = String(doc.hora).replace(/\s*H$/i, '').trim();
        const dateWithHour = new Date(`${doc.fecha}T${hourOnly}:00-05:00`);
        if (!Number.isNaN(dateWithHour.getTime())) {
            return dateWithHour;
        }
    }

    return null; // ← ❌ Antes era: return new Date();
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

function formatTime(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Lima"
    }).format(date);
}

function formatStoredHour(hourValue) {
    if (!hourValue) return "";

    const raw = String(hourValue).trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return raw;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return raw;

    const date = new Date(2000, 0, 1, hours, minutes, 0, 0);
    return new Intl.DateTimeFormat("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Lima"
    }).format(date);
}

// ✅ NUEVA: Fecha fija de creación
function formatDocumentDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "Sin fecha";

    const now = new Date();
    const isSameYear = date.getFullYear() === now.getFullYear();

    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: isSameYear ? undefined : "numeric",
        timeZone: "America/Lima"
    }).format(date);
}

function normalizeDocument(doc, index) {
    const status = normalizeEstado(doc.estado || doc.estadoTexto || doc.status);
    const docDate = parseDocumentDate(doc); // ← ahora puede ser null
    const codigo = doc.codigo || doc.code || `DOC-${index + 1}`;
    const descripcion = doc.descripcion || doc.nombre || doc.name || "Documento sin descripcion";
    const facultad = doc.nombreFacultad || doc.facultad || doc.facultadNombre || doc.generadoPor || "Facultad";
    const unidad = doc.unidad || doc.area || doc.generadoPor || "Unidad administrativa";

    const inferredTipo = inferDocumentTypeFromCode(codigo);
    const storedTipo = doc.tipo || doc.docType || doc.tipoDocumento;
    const isGeneric = !storedTipo || storedTipo === 'documento' || storedTipo === 'reporte';
    const finalTipo = isGeneric ? inferredTipo : storedTipo;

    return {
        id: doc.id || codigo,
        codigo,
        descripcion,
        facultad,
        unidad,
        estado: status,
        fecha: docDate, // ← puede ser null
        hora: doc.hora || doc.horaCreacion || doc.time || '',
        createdAt: doc.createdAt || doc.fechaRegistro || doc.fechaActualizacion || doc.updatedAt || doc.fechaCreacion || null,
        progreso: Number.isFinite(doc.progreso) ? Number(doc.progreso) : (status === "completado" ? 100 : status === "en_proceso" ? 60 : 15),
        tipo: finalTipo
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
	params.set("progreso", String(doc.progreso ?? (doc.estado === "completado" ? 100 : doc.estado === "en_proceso" ? 60 : 15)));
	if (doc.tipo) params.set("tipo", doc.tipo);
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
		if (existing) {
			// Fusionar, pero NUNCA degradar el estado (completado > en_proceso > pendiente)
			const merged = { ...existing, ...doc };
			const rank = (s) => (s === "completado" ? 3 : s === "en_proceso" ? 2 : s === "pendiente" ? 1 : 0);
			if (rank(existing.estado) > rank(doc.estado)) {
				merged.estado = existing.estado;
			}
			byCode.set(doc.codigo, merged);
		} else {
			byCode.set(doc.codigo, doc);
		}
	});

	return Array.from(byCode.values());
}

function loadLocalDocuments() {
    const clavesRevisar = [
        STORAGE_KEYS.DOCUMENTOS_LISTA,
        'local_sigpro_documentos_lista',
        'remote_sigpro_documentos_lista',
        'sigpro_reportes',
        'sigpro_user_documents',
        'local_sigpro_user_documents',
        'remote_sigpro_user_documents',
    ];

    let todosLosDocs = [];

    for (const clave of clavesRevisar) {
        const raw = localStorage.getItem(clave);
        if (!raw) continue;

        try {
            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) {
                parsed.forEach((doc, index) => {
                    if (!doc) return;

                    if (clave === 'sigpro_reportes') {
                        const status = normalizeEstado(doc.status || doc.estado);
                        // ✅ FIX: Priorizar createdAt/fechaRegistro (tienen hora real) sobre fecha (puede ser solo día)
                        const fechaReal = doc.createdAt || doc.fechaRegistro || doc.fecha;
                        const fechaStr = fechaReal || new Date().toISOString();
                        const codigo = doc.code || doc.id || `REP-${index}`;
                        todosLosDocs.push({
                            id: doc.id || codigo,
                            codigo: codigo,
                            descripcion: doc.description || doc.title || `Reporte ${doc.semester || ''}`,
                            facultad: doc.responsibleName || doc.generadoPor || 'Facultad',
                            unidad: doc.unit || 'Unidad administrativa',
                            estado: status,
                            fecha: fechaReal, // ← null si no hay fecha
                            hora: doc.hora || new Date(fechaStr).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'}) + ' H',
                            createdAt: doc.createdAt || null,
                            fechaRegistro: doc.fechaRegistro || null,
                            tipo: doc.tipo || inferDocumentTypeFromCode(codigo)
                        });
                    } else {
                        todosLosDocs.push(normalizeDocument(doc, index));
                    }
                });
            }
            else if (parsed && typeof parsed === 'object') {
                Object.entries(parsed).forEach(([codigo, detail], index) => {
                    if (!detail) return;
                    const item = detail.fichaData || detail;

                    const rawEstado = item.estado || item.status || detail.estado || 'pendiente';
                    const status = normalizeEstado(rawEstado);

                    // ✅ FIX: Usar parsePeruDate en vez de lógica manual con fallback a "ahora"
                    const fechaCandidatos = [
                        item.fechaRegistro, item.fechaActualizacion, item.updatedAt,
                        item.fecha, item.createdAt, item.fechaCreacion, detail.fecha
                    ];
                    let fecha = null;
                    for (const c of fechaCandidatos) {
                        const d = parsePeruDate(c);
                        if (d) { fecha = d; break; }
                    }

                    const finalCodigo = item.codigo || item.code || codigo;
                    const tipoExplicito = item.tipo || item.docType || item.tipoDocumento;
                    const tipoInferido = inferDocumentTypeFromCode(finalCodigo);
                    const isGeneric = !tipoExplicito || tipoExplicito === 'documento' || tipoExplicito === 'reporte';

                    todosLosDocs.push({
                        id: item.id || codigo,
                        codigo: finalCodigo,
                        descripcion: item.descripcion || item.titulo || item.nombreIndicador || item.name || `Documento ${codigo}`,
                        facultad: item.nombreFacultad || item.facultad || item.unidadResponsable || detail.generadoPor || 'Facultad',
                        unidad: item.unidadResponsable || item.unidad || item.area || 'Unidad administrativa',
                        estado: status,
                        fecha: fecha, // ← null si no hay fecha real
                        tipo: isGeneric ? tipoInferido : tipoExplicito
                    });
                });
            }
        } catch (error) {
            console.warn(`Error leyendo ${clave}:`, error);
        }
    }

    // Eliminar duplicados por código, manteniendo el más reciente (solo si tienen fecha)
    const porCodigo = new Map();
    todosLosDocs.forEach(doc => {
        const key = doc.codigo || doc.id;
        if (!key) return;
        const existente = porCodigo.get(key);
        if (!existente) {
            porCodigo.set(key, doc);
        } else if (doc.fecha && existente.fecha) {
            const docTime = doc.fecha instanceof Date ? doc.fecha.getTime() : new Date(doc.fecha).getTime();
            const existenteTime = existente.fecha instanceof Date ? existente.fecha.getTime() : new Date(existente.fecha).getTime();
            const docHasHora = Boolean(doc.hora);
            const existenteHasHora = Boolean(existente.hora);

            if (docHasHora && !existenteHasHora) {
                porCodigo.set(key, doc);
            } else if (docTime > existenteTime) {
                porCodigo.set(key, doc);
            }
        } else if (doc.fecha && !existente.fecha) {
            porCodigo.set(key, doc); // preferir el que SÍ tiene fecha
        }
    });

    return Array.from(porCodigo.values());
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
    // Si no hay API admin disponible, salir temprano
    if (typeof API === "undefined" || !API.admin?.documents?.getAdminDocuments) {
        return [];
    }

    try {
        const result = await API.admin.documents.getAdminDocuments('', '', 1, 100);
        
        if (!result?.success) {
            console.warn('Error cargando documentos admin:', result?.error);
            // ✅ FALLBACK: si la API falla o está en modo remoto, leer localStorage
            if (API.CONFIG?.MODE === 'remote') {
                console.log('📦 Fallback a localStorage por API remota vacía/fallida');
                return [];
            }
            return [];
        }
        
        const allDocs = extractArrayPayload(result.data);
        console.log(`📊 Documentos admin cargados: ${allDocs.length}`);
        
        const normalized = allDocs.map((doc, i) => normalizeDocument(doc, i));
        
        const unique = new Map();
        normalized.forEach(doc => unique.set(doc.codigo, doc));
        
        return Array.from(unique.values());

    } catch (error) {
        console.error("Error cargando documentos desde API:", error);
        return [];
    }
}


/* function toRelativeTime(date) {
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
}  */

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

function getDocumentTypeConfig(tipo) {
    const map = {
        indicador:      { label: 'Indicador',       icon: 'monitoring',      color: 'sky' },
        flujograma:     { label: 'Flujograma',      icon: 'account_tree',    color: 'indigo' },
        caracterizacion:{ label: 'Caracterización', icon: 'assignment',      color: 'amber' },
        inventario:     { label: 'Inventario',      icon: 'inventory_2',     color: 'emerald' },
        reporte:        { label: 'Hoja de reporte', icon: 'description',     color: 'violet' },
    };
    const key = String(tipo || 'reporte').toLowerCase();
    return map[key] || { label: 'Ficha técnica', icon: 'feed', color: 'slate' };
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

// ✅ NUEVA: Formatea fecha fija del documento (ej: "4 ago. 2026" o "04/08/2026")
function formatDocumentDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "—";
    
    const now = new Date();
    const isSameYear = date.getFullYear() === now.getFullYear();
    
    // Si es del año actual: "4 ago." (sin año)
    // Si es de otro año: "4 ago. 2025"
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: isSameYear ? undefined : "numeric"
    }).format(date).replace('.', ''); // quita punto del mes si quieres, o déjalo
}

// ✅ CORREGIDA: Notificaciones con fecha fija de creación
function renderNotifications(documents) {
    const list = document.getElementById("notifications-list");
    const status = document.getElementById("notifications-status");
    if (!list) return;

    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '12px';

    let correcciones = [];
    try {
        correcciones = JSON.parse(localStorage.getItem('sigpro_correcciones_solicitudes')) || [];
    } catch {}
    correcciones = correcciones.filter(c => (c.estado || '').toLowerCase().includes('proceso'));

    correcciones = correcciones.map(c => ({
        ...c,
        fechaObj: parsePeruDate(c.fecha), // ← también corregido
        descripcion: c.asunto || 'Corrección solicitada',
        facultad: c.correoInstitucional || 'Facultad',
        unidad: c.correoInstitucional || 'Unidad',
        estado: 'en_proceso',
        codigo: c.codigo || '',
        progreso: 50,
        tipo: inferDocumentTypeFromCode(c.codigo)
    }));

    const prioritizedDocuments = [...documents]
        .filter(d => d.estado !== 'completado')
        .sort((a, b) => {
            const rank = (doc) => (doc.estado === "pendiente" ? 0 : doc.estado === "en_proceso" ? 1 : 2);
            return rank(a) - rank(b) || ((b.fecha?.getTime?.() || 0) - (a.fecha?.getTime?.() || 0));
        });

    const all = [...prioritizedDocuments, ...correcciones].sort((a, b) => {
        const da = a.fechaObj || a.fecha;
        const db = b.fechaObj || b.fecha;
        return (db?.getTime?.() || 0) - (da?.getTime?.() || 0);
    });
    const latest = all.slice(0, 10);

    if (!latest.length) {
        if (status) status.textContent = "Sin notificaciones recientes";
        list.innerHTML = `
            <div class="rounded-xl border border-gray-100 bg-gray-50/50 p-8 text-center">
                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2">hourglass_empty</span>
                <p class="text-sm text-gray-500 font-medium">Sin documentos todavía</p>
                <p class="text-xs text-gray-400 mt-1">Las notificaciones se activarán cuando las facultades envíen documentos al sistema.</p>
            </div>
        `;
        return;
    }

    if (status) status.textContent = `Mostrando ${latest.length} notificación(es) más reciente(s)`;

    list.innerHTML = latest.map((doc) => {
        const typeCfg = getDocumentTypeConfig(doc.tipo);
        
        // ✅ FIX: Manejar fecha null
        const docDate = (doc.fecha instanceof Date && !isNaN(doc.fecha)) ? doc.fecha : 
                        (doc.fechaObj instanceof Date && !isNaN(doc.fechaObj)) ? doc.fechaObj : null;

        const fechaCreacion = formatDocumentDate(docDate);
        const horaCreacion = formatStoredHour(doc.hora) || formatTime(docDate);
        const detailUrl = buildExpedienteDetailUrl(doc);

        // 🐛 DEBUG TEMPORAL: Abre la consola (F12) y verás qué fecha tiene cada documento
        console.log(`📅 ${doc.codigo}: fecha=${docDate?.toISOString?.() || 'NULL'} | mostrando="${fechaCreacion} ${horaCreacion}" | rawFields=`, {
            fecha: doc.fecha,
            hora: doc.hora,
            fechaRegistro: doc.fechaRegistro,
            createdAt: doc.createdAt,
            fechaCreacion: doc.fechaCreacion
        });

        const statusConfig = {
            pendiente:   { label: 'Pendiente de revisión', dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
            en_proceso:  { label: 'En proceso',            dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100' },
            completado:  { label: 'Publicado',             dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100' }
        };
        const st = statusConfig[doc.estado] || statusConfig.pendiente;

        return `
            <a class="group block w-full p-5 border border-gray-100 rounded-xl bg-white hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer" 
               href="${detailUrl}" title="Abrir expediente ${doc.codigo}">
                
                <div class="flex items-start justify-between gap-4 mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-${typeCfg.color}-50 text-${typeCfg.color}-600 flex items-center justify-center border border-${typeCfg.color}-100 flex-shrink-0">
                            <span class="material-symbols-outlined text-[20px]">${typeCfg.icon}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-${typeCfg.color}-50 text-${typeCfg.color}-700 border border-${typeCfg.color}-100 w-fit">
                                ${typeCfg.label}
                            </span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end text-right flex-shrink-0">
                        <!-- ✅ FIX: Fecha real o "Sin fecha" -->
                        <span class="text-[11px] text-gray-500 font-semibold whitespace-nowrap">${escapeHtml(fechaCreacion)}</span>
                        ${horaCreacion ? `<span class="text-[11px] text-gray-400 font-medium whitespace-nowrap">${escapeHtml(horaCreacion)}</span>` : ''}
                    </div>
                </div>

                <h4 class="text-[15px] font-semibold text-gray-900 leading-snug mb-3 truncate">
                    ${escapeHtml(doc.descripcion || 'Documento sin descripción')}
                </h4>

                <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-gray-600 mb-4">
                    <span class="inline-flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px] text-gray-400">school</span>
                        ${escapeHtml(doc.facultad || 'Facultad')}
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px] text-gray-400">person</span>
                        ${escapeHtml(doc.unidad || 'Unidad administrativa')}
                    </span>
                    <span class="font-mono text-[12px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                        ${escapeHtml(doc.codigo || '-')}
                    </span>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-semibold ${st.bg} ${st.text} border ${st.border}">
                        <span class="w-1.5 h-1.5 rounded-full ${st.dot}"></span>
                        ${st.label}
                    </span>
                    <span class="text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        Ver expediente →
                    </span>
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

    day: "2-digit",
    month: "2-digit",
    year: "numeric"
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

    if (!tableBody) return;

    if (errorNode) {
        errorNode.classList.add("hidden");
        errorNode.textContent = "";
    }

    let rows = [];

    // ========== INTENTO 1: API Admin ==========
    if (typeof API !== "undefined" && API.admin?.faculties) {
        try {
            let result = null;
            if (typeof API.admin.faculties.getAll === "function") {
                result = await API.admin.faculties.getAll();
            }

            if (!result?.success && typeof API.admin.faculties.getAdminFaculties === "function") {
                const fallbackRows = await API.admin.faculties.getAdminFaculties();
                rows = extractFacultyRows(fallbackRows);
            } else if (result?.success) {
                rows = extractFacultyRows(result.data);
            }
        } catch (error) {
            console.warn("⚠️ API admin facultades tabla falló:", error.message);
        }
    }

    // ========== INTENTO 2: LocalAPI / localStorage ==========
    if (!rows.length) {
        try {
            // Intentar LocalAPI directo
            if (typeof LocalAPI !== 'undefined' && LocalAPI.faculties?.getAll) {
                const res = await LocalAPI.faculties.getAll();
                if (res?.success && Array.isArray(res.data)) {
                    rows = res.data.map(f => ({
                        name: f.name || f.nombre,
                        code: f.code || f.codigo,
                        shortName: f.shortName || f.name?.replace('Facultad de ', ''),
                        isActive: true,
                        createdAt: f.createdAt,
                        stats: {
                            indicatorsCount: f.indicators || 0,
                            flowsCount: f.flows || 0,
                            processesCount: f.processes || 0,
                            activeUsers: 0
                        }
                    }));
                }
            }
        } catch (e) {
            console.warn("⚠️ LocalAPI facultades tabla falló:", e.message);
        }
    }

    // ========== INTENTO 3: localStorage directo ==========
    if (!rows.length) {
        try {
            const rawLocal = localStorage.getItem('local_sigpro_faculties') 
                || localStorage.getItem('sigpro_faculties');
            
            if (rawLocal) {
                const parsed = JSON.parse(rawLocal);
                if (Array.isArray(parsed)) {
                    rows = parsed.map(f => ({
                        name: f.name || f.nombre,
                        code: f.code || f.codigo,
                        shortName: f.shortName || f.name?.replace('Facultad de ', ''),
                        isActive: true,
                        createdAt: f.createdAt,
                        stats: {
                            indicatorsCount: f.indicators || 0,
                            flowsCount: f.flows || 0,
                            processesCount: f.processes || 0,
                            activeUsers: 0
                        }
                    }));
                }
            }
        } catch (e) {
            console.warn("⚠️ localStorage facultades tabla falló:", e.message);
        }
    }

    renderAdminFacultiesTable(rows);
}

async function loadDashboardData() {
    const [apiDocuments] = await Promise.all([loadApiDocuments()]);
    const localDocuments = loadLocalDocuments();
    
    // Merge API + local
    let merged = mergeDocuments(apiDocuments, localDocuments);
    
    // ✅ FIX: Descartar documentos con códigos basura (fantasmas)
    merged = merged.filter(doc => {
        const cod = String(doc.codigo || '');
        // Un código SIGPRO válido tiene letras y guiones, nunca es puro número
        return cod.length > 3 && (/[a-zA-Z]/.test(cod) || cod.includes('-'));
    });
    
    dashboardDocuments = merged;
    dashboardAccessRequests = await loadAccessRequests();

    if (dashboardDocuments.length > 0) {
        updateCounters(dashboardDocuments);
    }

    const docsParaNotificaciones = dashboardDocuments.filter(
        doc => doc.estado !== "completado"
    );
    renderNotifications(docsParaNotificaciones);
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

    let faculties = [];

    // ========== INTENTO 1: API Admin ==========
    try {
        if (typeof API !== 'undefined' && API.admin?.faculties?.getAll) {
            const res = await API.admin.faculties.getAll();
            if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                faculties = res.data;
                console.log('✅ Facultades cargadas desde API.admin.faculties.getAll');
            }
        }
    } catch (e) {
        console.warn('⚠️ API admin facultades falló:', e.message);
    }

    // ========== INTENTO 2: API Pública ==========
    if (!faculties.length) {
        try {
            if (typeof API !== 'undefined' && API.public?.faculties?.getAll) {
                const res = await API.public.faculties.getAll();
                if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                    faculties = res.data;
                    console.log('✅ Facultades cargadas desde API.public.faculties.getAll');
                }
            }
        } catch (e) {
            console.warn('⚠️ API public facultades falló:', e.message);
        }
    }

    // ========== INTENTO 3: LocalAPI directo (modo local) ==========
    if (!faculties.length) {
        try {
            if (typeof LocalAPI !== 'undefined' && LocalAPI.faculties?.getAll) {
                const res = await LocalAPI.faculties.getAll();
                if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                    faculties = res.data;
                    console.log('✅ Facultades cargadas desde LocalAPI.faculties.getAll');
                }
            }
        } catch (e) {
            console.warn('⚠️ LocalAPI facultades falló:', e.message);
        }
    }

    // ========== INTENTO 4: localStorage directo (último recurso) ==========
    if (!faculties.length) {
        try {
            // Intentar con prefijo local_ (modo local)
            const rawLocal = localStorage.getItem('local_sigpro_faculties') 
                || localStorage.getItem('sigpro_faculties');
            
            if (rawLocal) {
                const parsed = JSON.parse(rawLocal);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    faculties = parsed;
                    console.log('✅ Facultades cargadas desde localStorage');
                }
            }
        } catch (e) {
            console.warn('⚠️ localStorage facultades falló:', e.message);
        }
    }

    // ========== RENDERIZAR ==========
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
        'FM': { icon: 'medical_services', color: 'red', glow: 'icon-glow-red' },
        'FDCP': { icon: 'gavel', color: 'indigo', glow: 'icon-glow-indigo' },
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

    grid.innerHTML = faculties.map(faculty => {
        const code = faculty.code || faculty.codigo || '';
        const config = facultyConfig[code] || { 
            icon: faculty.icon || 'school', 
            color: faculty.color || 'slate', 
            glow: 'icon-glow-slate' 
        };
        
        const stats = faculty.stats || {};
        // Compatibilidad con datos locales (indicators/flows/processes) vs datos API (stats object)
        const indicatorsCount = stats.indicatorsCount ?? stats.indicators ?? faculty.indicators ?? 0;
        const flowsCount = stats.flowsCount ?? stats.flows ?? faculty.flows ?? 0;
        const processesCount = stats.processesCount ?? stats.processes ?? faculty.processes ?? 0;
        
        const shortName = faculty.shortName 
            || faculty.name?.replace('Facultad de ', '') 
            || faculty.nombre 
            || faculty.name;
        const displayName = shortName.length > 25 ? shortName.substring(0, 22) + '...' : shortName;
        
        const targetUrl = `racio-facultades-documentos.html?facultyId=${encodeURIComponent(faculty.id)}&facultyCode=${encodeURIComponent(code)}&facultyName=${encodeURIComponent(faculty.name || faculty.nombre)}`;
        
        return `
            <a class="facultad-card bg-white p-5 rounded-xl shadow-sm hover-lift transition-all duration-300 flex flex-col items-center justify-center gap-3 h-36 border border-gray-100 group ${config.glow}" 
               href="${targetUrl}" 
               title="${faculty.name || faculty.nombre} - Ver ${flowsCount} flujogramas, ${indicatorsCount} indicadores"
               data-faculty-id="${faculty.id}"
               data-faculty-code="${code}">
                
                <div class="w-12 h-12 rounded-full bg-${config.color}-50 text-${config.color}-500 flex items-center justify-center group-hover:bg-${config.color}-100 transition-all icon-bg relative">
                    <span class="material-symbols-outlined text-2xl">${config.icon}</span>
                    ${flowsCount > 0 ? `
                        <span class="absolute -top-1 -right-1 w-5 h-5 bg-${config.color}-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                            ${flowsCount}
                        </span>
                    ` : ''}
                </div>
                
                <span class="text-xs font-bold text-gray-700 text-center leading-tight">${escapeHtml(displayName)}</span>
                
                ${indicatorsCount > 0 || processesCount > 0 ? `
                    <div class="flex gap-1 mt-1">
                        ${indicatorsCount > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">${indicatorsCount} ind</span>` : ''}
                        ${flowsCount > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">${flowsCount} fluj</span>` : ''}
                    </div>
                ` : ''}
            </a>
        `;
    }).join('');

    if (status) {
        status.textContent = `Mostrando ${faculties.length} de ${faculties.length} facultades`;
    }

    setupFacultyFilter();
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

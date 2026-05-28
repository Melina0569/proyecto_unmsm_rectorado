const STORAGE_KEYS = {
	DOCUMENTOS_LISTA: "sigpro_documentos_lista"
};

let dashboardDocuments = [];

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

	if (Array.isArray(payload?.data)) {
		return payload.data;
	}

	if (Array.isArray(payload?.items)) {
		return payload.items;
	}

	return [];
}

async function loadApiDocuments() {
	if (typeof API === "undefined" || !API.documentos || typeof API.documentos.getAll !== "function") {
		return [];
	}

	try {
		const response = await API.documentos.getAll({});
		if (!response?.success) {
			return [];
		}

		const rows = extractArrayPayload(response.data);
		return rows.map((doc, index) => normalizeDocument(doc, index));
	} catch (error) {
		console.error("Error cargando documentos desde API:", error);
		return [];
	}
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

	// Unir documentos y correcciones
	const all = [...documents, ...correcciones].sort((a, b) => {
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
		const relativeTime = toRelativeTime(doc.fechaObj || doc.fecha);
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

async function loadDashboardData() {
	const [apiDocuments] = await Promise.all([
		loadApiDocuments()
	]);

	const localDocuments = loadLocalDocuments();
	dashboardDocuments = mergeDocuments(apiDocuments, localDocuments);

	if (dashboardDocuments.length > 0) {
		updateCounters(dashboardDocuments);
	}
	renderNotifications(dashboardDocuments);
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
		await loadDashboardData();
		button.disabled = false;
	});
}

function setupFacultyFilter() {
	const input = document.getElementById("facultad-search");
	const clearButton = document.getElementById("facultad-search-clear");
	const status = document.getElementById("facultad-search-status");
	const emptyState = document.getElementById("facultad-empty-state");
	const cards = Array.from(document.querySelectorAll(".facultad-card"));

	if (!input || !cards.length) {
		return;
	}

	const total = cards.length;

	const applyFilter = () => {
		const query = normalizeText(input.value || "");
		let visibleCount = 0;

		cards.forEach((card) => {
			const label = normalizeText(card.textContent || "");
			const visible = label.includes(query);
			card.classList.toggle("hidden", !visible);
			if (visible) {
				visibleCount += 1;
			}
		});

		if (status) {
			status.textContent = query
				? `Busqueda activa: ${visibleCount} resultado(s) de ${total} para "${input.value.trim()}"`
				: `Mostrando ${total} de ${total} facultades`;
		}

		if (clearButton) {
			clearButton.classList.toggle("hidden", !query);
		}

		if (emptyState) {
			emptyState.classList.toggle("hidden", visibleCount > 0);
		}
	};

	input.addEventListener("input", (event) => {
		applyFilter();
	});

	if (clearButton) {
		clearButton.addEventListener("click", () => {
			input.value = "";
			input.focus();
			applyFilter();
		});
	}

	applyFilter();
}

function setupFacultyNavigation() {
	const cards = Array.from(document.querySelectorAll(".facultad-card"));
	if (!cards.length) return;

	cards.forEach((card) => {
		const labelNode = card.querySelector("span.text-xs.font-bold");
		const facultyName = (labelNode?.textContent || "").trim();
		if (!facultyName) return;

		const target = `racio-facultades-documentos.html?facultad=${encodeURIComponent(facultyName)}`;
		card.setAttribute("href", target);
		card.setAttribute("title", `Ver expedientes de ${facultyName}`);
	});
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
	await loadAndRenderAdminStats();
	await loadDashboardData();
});

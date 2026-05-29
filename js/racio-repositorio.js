const STORAGE_KEYS = {
	DOCUMENTOS_LISTA: "sigpro_documentos_lista",
	DOCUMENTOS_DETALLE: "sigpro_documentos_detalle",
	HISTORIAL_DATOS: "sigpro_historial_datos"
};

const REALTIME_REFRESH_MS = 5000;
const realtimeState = {
	lastSignature: ""
};

const state = {
	documents: [],
	filtered: [],
	faculties: [],
	selectedType: "all",
	selectedFaculty: "all",
	selectedFacultyId: "",
	searchTerm: "",
	selectedCode: ""
};

function normalizeText(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function parseDate(value) {
	const date = new Date(value || "");
	return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(value) {
	const date = parseDate(value);
	return new Intl.DateTimeFormat("es-PE", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	}).format(date);
}

function toPercentage(value) {
	const numeric = Number.parseFloat(value);
	if (!Number.isFinite(numeric)) return 0;
	return numeric <= 1 ? numeric * 100 : numeric;
}

function formatCurrency(value) {
	const numeric = Number.parseFloat(value);
	if (!Number.isFinite(numeric)) return "0.00";
	return numeric.toLocaleString("es-PE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

function computeIndicatorState(value) {
	const numeric = Number.parseFloat(value) || 0;
	if (numeric < 75) {
		return { text: "Riesgo", color: "#ef4444", badgeClass: "bg-red-100 text-red-700 border border-red-200" };
	}
	if (numeric < 90) {
		return { text: "Estable", color: "#f59e0b", badgeClass: "bg-amber-100 text-amber-700 border border-amber-200" };
	}
	return { text: "Optimo", color: "#10b981", badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
}

function inferType(code) {
	const prefix = String(code || "").split("-")[0].toUpperCase();
	if (prefix === "IND") return "indicador";
	if (prefix === "FLU" || prefix === "FL") return "flujograma";
	if (prefix === "INV") return "inventario";
	if (prefix === "CAR") return "caracterizacion";
	return "reporte";
}

function typeLabel(type) {
	if (type === "indicador") return "Indicador";
	if (type === "flujograma") return "Flujograma";
	if (type === "inventario") return "Inventario";
	if (type === "caracterizacion") return "Caracterización";
	return "Proceso";
}

function statusLabel(value) {
	const text = normalizeText(value);
	if (text.includes("aprob") || text.includes("complet")) return "Aprobado";
	if (text.includes("proceso")) return "En proceso";
	return "Pendiente";
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
			if (logoutControls?.openModal) logoutControls.openModal();
		});
	}
}

function normalizeRepositoryType(value, fallbackCode = "") {
	const raw = normalizeText(value);
	if (raw.includes("indic")) return "indicador";
	if (raw.includes("flujo") || raw.includes("flow")) return "flujograma";
	if (raw.includes("caract")) return "caracterizacion";
	if (raw.includes("invent")) return "inventario";
	if (raw.includes("report")) return "reporte";
	return inferType(fallbackCode);
}

function safeArray(value) {
	return Array.isArray(value) ? value : [];
}

function readLocalRepositorySource() {
	const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
	const detailRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
	let docs = [];
	let detailMap = {};

	try {
		docs = raw ? JSON.parse(raw) : [];
		if (!Array.isArray(docs)) docs = [];
	} catch {
		docs = [];
	}

	try {
		detailMap = detailRaw ? JSON.parse(detailRaw) : {};
	} catch {
		detailMap = {};
	}

	return { docs, detailMap };
}

function mapLocalApprovedDocuments(docs, detailMap) {
	return safeArray(docs)
		.filter((doc) => {
			const status = normalizeText(doc.estado || doc.status);
			return status.includes("aprob") || status.includes("complet");
		})
		.map((doc) => {
			const code = doc.codigo || doc.code || doc.id || "DOC-SIN-CODIGO";
			const detail = detailMap?.[code] || null;
			return {
				id: doc.id || code,
				codigo: code,
				descripcion: doc.descripcion || doc.nombre || `Documento ${code}`,
				facultad: doc.nombreFacultad || doc.facultad || doc.generadoPor || "Facultad no registrada",
				unidad: doc.unidad || doc.area || "Oficina responsable",
				tipo: normalizeRepositoryType(doc.tipo, code),
				estado: statusLabel(doc.estado || doc.status || "aprobado"),
				fecha: parseDate(doc.fechaAprobacion || doc.fechaActualizacion || doc.fecha || doc.updatedAt),
				detail
			};
		})
		.sort((a, b) => b.fecha - a.fecha);
}

function normalizeRemoteRepositoryDoc(doc, forcedType, index) {
	const code = doc?.code || doc?.codigo || doc?.documentCode || doc?.id || `DOC-${index + 1}`;
	const facultyName =
		doc?.faculty?.shortName
		|| doc?.faculty?.name
		|| doc?.nombreFacultad
		|| doc?.facultad
		|| doc?.facultadNombre
		|| doc?.createdBy?.faculty?.shortName
		|| doc?.createdBy?.faculty?.name
		|| "Facultad no registrada";

	const unidad =
		doc?.unit
		|| doc?.unidad
		|| doc?.area
		|| doc?.responsibleUnit
		|| doc?.createdBy?.fullName
		|| "Oficina responsable";

	const fecha = parseDate(
		doc?.approvedAt
		|| doc?.publishedAt
		|| doc?.updatedAt
		|| doc?.createdAt
		|| doc?.fechaAprobacion
		|| doc?.fechaActualizacion
		|| doc?.fecha
	);

	return {
		id: doc?.id || code,
		codigo: code,
		descripcion: doc?.title || doc?.descripcion || doc?.name || `Documento ${code}`,
		facultad: facultyName,
		unidad,
		tipo: normalizeRepositoryType(forcedType || doc?.type || doc?.tipo, code),
		estado: statusLabel(doc?.status || doc?.estado || "Aprobado"),
		fecha,
		detail: doc || null
	};
}

function flattenRemoteRepositoryPayload(payload) {
	if (Array.isArray(payload)) {
		return payload.map((doc, index) => normalizeRemoteRepositoryDoc(doc, doc?.type || doc?.tipo, index));
	}

	const source = payload && typeof payload === "object" ? payload : {};
	const buckets = [
		{ key: "indicators", type: "indicador" },
		{ key: "flows", type: "flujograma" },
		{ key: "characterizations", type: "caracterizacion" },
		{ key: "reports", type: "reporte" }
	];

	const rows = [];
	buckets.forEach(({ key, type }) => {
		safeArray(source[key]).forEach((doc, index) => {
			rows.push(normalizeRemoteRepositoryDoc(doc, type, index));
		});
	});

	if (!rows.length && Array.isArray(source.items)) {
		return source.items.map((doc, index) => normalizeRemoteRepositoryDoc(doc, doc?.type || doc?.tipo, index));
	}

	return rows;
}

function mergeRemoteWithLocal(remoteDocs, localDocs) {
	const localByCode = new Map();
	localDocs.forEach((doc) => {
		localByCode.set(doc.codigo, doc);
	});

	return remoteDocs
		.map((remoteDoc) => {
			const localDoc = localByCode.get(remoteDoc.codigo);
			return {
				...localDoc,
				...remoteDoc,
				detail: remoteDoc.detail || localDoc?.detail || null
			};
		})
		.sort((a, b) => b.fecha - a.fecha);
}

async function loadRemoteRepositoryDocuments(facultyIdOverride = "") {
	if (
		typeof API === "undefined"
		|| !API.admin
		|| !API.admin.repository
		|| typeof API.admin.repository.get !== "function"
	) {
		return { success: false, docs: [] };
	}

	try {
		const params = new URLSearchParams(window.location.search);
		const facultyId = facultyIdOverride || params.get("facultyId") || params.get("facultadId") || "";

		let response;
		if (facultyId && typeof API.admin.repository.getByFaculty === "function") {
			response = await API.admin.repository.getByFaculty(facultyId);
		} else if (facultyId) {
			response = await API.admin.repository.get({ facultyId });
		} else {
			response = await API.admin.repository.get();
		}

		if (!response?.success) {
			return { success: false, docs: [] };
		}

		const docs = flattenRemoteRepositoryPayload(response.data);
		return { success: true, docs };
	} catch (error) {
		console.error("No se pudo cargar el repositorio administrativo:", error);
		return { success: false, docs: [] };
	}
}

async function loadRepositoryDocuments(options = {}) {
	const { includeRemote = true, facultyId = "" } = options;
	const previousCode = state.selectedCode;
	let approved = [];
	if (includeRemote) {
		const remoteResult = await loadRemoteRepositoryDocuments(facultyId);
		if (remoteResult.success) {
			approved = remoteResult.docs;
		}
	} else {
		const { docs, detailMap } = readLocalRepositorySource();
		approved = mapLocalApprovedDocuments(docs, detailMap);
	}

	state.documents = approved;
	state.filtered = approved;
	state.selectedCode = approved.some((doc) => doc.codigo === previousCode)
		? previousCode
		: approved[0]?.codigo || "";
}

async function loadFacultiesForFilter() {
	let faculties = [];

	try {
		if (
			typeof API !== "undefined"
			&& API.admin
			&& API.admin.faculties
			&& typeof API.admin.faculties.getAll === "function"
		) {
			const response = await API.admin.faculties.getAll();
			if (response?.success) {
				const source = Array.isArray(response.data)
					? response.data
					: Array.isArray(response.data?.items)
						? response.data.items
						: [];
				faculties = source
					.map((item) => ({
						id: item?.id || "",
						name: item?.shortName || item?.name || item?.facultad || ""
					}))
					.filter((item) => item.name);
			}
		}
	} catch (error) {
		console.warn("No se pudieron cargar facultades administrativas:", error);
	}

	if (!faculties.length) {
		try {
			if (
				typeof API !== "undefined"
				&& API.public
				&& API.public.faculties
				&& typeof API.public.faculties.getAll === "function"
			) {
				const response = await API.public.faculties.getAll();
				if (response?.success) {
					const source = Array.isArray(response.data)
						? response.data
						: Array.isArray(response.data?.items)
							? response.data.items
							: [];
					faculties = source
							.map((item) => ({
								id: item?.id || "",
								name: item?.shortName || item?.name || item?.facultad || ""
							}))
							.filter((item) => item.name);
				}
			}
		} catch (error) {
			console.warn("No se pudieron cargar facultades públicas:", error);
		}
	}

	if (!faculties.length) {
		faculties = state.documents
			.map((doc) => ({ id: "", name: doc.facultad }))
			.filter((item) => item.name);
	}

	const uniqueByName = new Map();
	faculties.forEach((faculty) => {
		const key = normalizeText(faculty.name);
		if (!key) return;
		if (!uniqueByName.has(key)) {
			uniqueByName.set(key, faculty);
			return;
		}
		const existing = uniqueByName.get(key);
		if (!existing?.id && faculty.id) {
			uniqueByName.set(key, faculty);
		}
	});

	state.faculties = Array.from(uniqueByName.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function populateFacultyFilter() {
	const select = document.getElementById("repo-faculty-filter");
	if (!select) return;
	const options = ["<option value=\"all\">Todas las facultades</option>"];
	state.faculties.forEach((faculty) => {
		const safeName = faculty.name.replace(/"/g, "&quot;");
		const safeId = String(faculty.id || "").replace(/"/g, "&quot;");
		options.push(`<option value="${safeName}" data-faculty-id="${safeId}">${safeName}</option>`);
	});
	select.innerHTML = options.join("");
	select.value = state.selectedFaculty;
	if (!select.value) {
		state.selectedFaculty = "all";
		select.value = "all";
	}
	const selectedOption = select.options[select.selectedIndex] || null;
	state.selectedFacultyId = selectedOption?.dataset?.facultyId || "";
	renderFacultyDropdownMenu();
	updateFacultyDropdownLabel();
}

function updateFacultyDropdownLabel() {
	const label = document.getElementById("repo-faculty-selected");
	if (!label) return;
	const current = state.selectedFaculty === "all" ? "Todas las facultades" : state.selectedFaculty;
	label.textContent = current;
}

function closeFacultyDropdown() {
	const selectWrap = document.getElementById("repo-faculty-select");
	const trigger = document.getElementById("repo-faculty-trigger");
	const menu = document.getElementById("repo-faculty-menu");
	if (!selectWrap || !trigger || !menu) return;
	menu.classList.add("hidden");
	selectWrap.classList.remove("open");
	trigger.setAttribute("aria-expanded", "false");
}

function openFacultyDropdown() {
	const selectWrap = document.getElementById("repo-faculty-select");
	const trigger = document.getElementById("repo-faculty-trigger");
	const menu = document.getElementById("repo-faculty-menu");
	if (!selectWrap || !trigger || !menu) return;
	menu.classList.remove("hidden");
	selectWrap.classList.add("open");
	trigger.setAttribute("aria-expanded", "true");
}

function renderFacultyDropdownMenu() {
	const menu = document.getElementById("repo-faculty-menu");
	const select = document.getElementById("repo-faculty-filter");
	if (!menu || !select) return;

	const items = [
		{ name: "Todas las facultades", value: "all", id: "" },
		...state.faculties.map((faculty) => ({
			name: faculty.name,
			value: faculty.name,
			id: faculty.id || ""
		}))
	];

	menu.innerHTML = items.map((item) => {
		const active = item.value === state.selectedFaculty;
		const safeName = item.name.replace(/"/g, "&quot;");
		const safeId = String(item.id || "").replace(/"/g, "&quot;");
		return `
			<button
				type="button"
				class="repo-select-option ${active ? "is-active" : ""}"
				role="option"
				aria-selected="${active ? "true" : "false"}"
				data-value="${safeName}"
				data-faculty-id="${safeId}"
			>
				${safeName}
			</button>
		`;
	}).join("");

	menu.querySelectorAll(".repo-select-option").forEach((option) => {
		option.addEventListener("click", () => {
			const value = option.dataset.value || "all";
			const facultyId = option.dataset.facultyId || "";
			state.selectedFaculty = value;
			state.selectedFacultyId = facultyId;
			select.value = value;
			updateFacultyDropdownLabel();
			closeFacultyDropdown();
			select.dispatchEvent(new Event("change", { bubbles: true }));
		});
	});
}

function setupFacultyDropdown() {
	const selectWrap = document.getElementById("repo-faculty-select");
	const trigger = document.getElementById("repo-faculty-trigger");
	const menu = document.getElementById("repo-faculty-menu");
	if (!selectWrap || !trigger || !menu) return;

	trigger.addEventListener("click", () => {
		const isOpen = selectWrap.classList.contains("open");
		if (isOpen) {
			closeFacultyDropdown();
			return;
		}
		openFacultyDropdown();
	});

	trigger.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
			event.preventDefault();
			openFacultyDropdown();
		}
		if (event.key === "Escape") {
			event.preventDefault();
			closeFacultyDropdown();
		}
	});

	menu.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			closeFacultyDropdown();
			trigger.focus();
		}
	});

	document.addEventListener("click", (event) => {
		if (!selectWrap.contains(event.target)) {
			closeFacultyDropdown();
		}
	});
}

function getPageByType(type) {
	const typeMap = {
		"indicador": "racio-indicador.html",
		"flujograma": "racio-flujograma.html",
		"caracterizacion": "racio-caracterizacion.html",
		"inventario": "racio-inventario.html",
		"reporte": "racio-reporte.html"
	};
	return typeMap[type] || "racio-indicador.html";
}

function cardMarkup(doc) {
	const active = doc.codigo === state.selectedCode;
	return `
		<article class="repo-card ${active ? "active" : ""}" data-code="${doc.codigo}" data-tipo="${doc.tipo}">
			<div class="flex items-start justify-between gap-3 mb-3">
				<span class="repo-code">${doc.codigo}</span>
				<span class="repo-chip">${typeLabel(doc.tipo)}</span>
			</div>
			<h3 class="text-base font-black text-slate-900 dark:text-slate-100 leading-tight">${doc.descripcion}</h3>
			<p class="text-xs text-slate-500 dark:text-slate-400 mt-2">${doc.facultad}</p>
			<div class="mt-4 flex items-center justify-between text-xs">
				<span class="text-slate-500 dark:text-slate-400">${formatDate(doc.fecha)}</span>
				<span class="detail-badge">${doc.estado}</span>
			</div>
		</article>
	`;
}

function applyFilters() {
	const term = normalizeText(state.searchTerm);
	state.filtered = state.documents.filter((doc) => {
		const byType = state.selectedType === "all" || doc.tipo === state.selectedType;
		const byFaculty = state.selectedFaculty === "all" || doc.facultad === state.selectedFaculty;
		const bySearch = !term
			|| normalizeText(doc.codigo).includes(term)
			|| normalizeText(doc.descripcion).includes(term)
			|| normalizeText(doc.facultad).includes(term);
		return byType && byFaculty && bySearch;
	});
	if (!state.filtered.some((doc) => doc.codigo === state.selectedCode)) {
		state.selectedCode = state.filtered[0]?.codigo || "";
	}
}

function renderCards() {
	const grid = document.getElementById("repo-cards-grid");
	const empty = document.getElementById("repo-empty");
	if (!grid || !empty) return;
	if (!state.filtered.length) {
		grid.innerHTML = "";
		empty.classList.remove("hidden");
		return;
	}
	empty.classList.add("hidden");
	grid.innerHTML = state.filtered.map(cardMarkup).join("");
	grid.querySelectorAll(".repo-card").forEach((card) => {
		card.addEventListener("click", () => {
			const tipo = card.dataset.tipo;
			const codigo = card.dataset.code;
			const page = getPageByType(tipo);
			window.location.href = `${page}?codigo=${encodeURIComponent(codigo)}`;
		});
	});
}

function showCardsView() {
	const cardsView = document.getElementById("cards-view");
	const detailView = document.getElementById("detail-view");
	if (cardsView) cardsView.classList.remove("hidden");
	if (detailView) detailView.classList.add("hidden");
}

function showDetailView() {
	const cardsView = document.getElementById("cards-view");
	const detailView = document.getElementById("detail-view");
	if (cardsView) cardsView.classList.add("hidden");
	if (detailView) {
		detailView.classList.remove("hidden");
		detailView.classList.remove("detail-view-enter");
		requestAnimationFrame(() => {
			detailView.classList.add("detail-view-enter");
		});
	}
}

function buildChartSvg(points, target = 60) {
	const safePoints = Array.isArray(points) && points.length ? points : [0];
	const linePoints = safePoints.length === 1 ? [safePoints[0], safePoints[0]] : safePoints;
	const xStep = 800 / Math.max(linePoints.length - 1, 1);
	const toY = (value) => 300 - Math.max(0, Math.min(100, value)) * 3;
	const areaPoints = linePoints.map((value, index) => `${index * xStep},${toY(value)}`).join(" L ");
	const resultLine = linePoints.map((value, index) => `${index * xStep},${toY(value)}`).join(" ");
	const targetLine = linePoints.map((_, index) => `${index * xStep},${toY(target)}`).join(" ");
	const circles = safePoints
		.map((value, index) => {
			const cx = safePoints.length === 1 ? 400 : index * xStep;
			const cy = toY(value);
			const alwaysVisible = safePoints.length === 1 ? "always-visible" : "";
			return `
				<g class="chart-point-group" data-value="${Number(value).toFixed(2)}">
					<line class="chart-point-guide" x1="${cx}" y1="${cy}" x2="${cx}" y2="300"></line>
					<circle class="chart-point" cx="${cx}" cy="${cy}" r="4"></circle>
					<text class="chart-value-label ${alwaysVisible}" x="${cx + 10}" y="${cy - 10}">${Number(value).toFixed(2)}%</text>
				</g>
			`;
		})
		.join("");
	return `
		<svg viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
			<defs>
				<linearGradient id="chartAreaFill" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22"></stop>
					<stop offset="100%" stop-color="#3b82f6" stop-opacity="0"></stop>
				</linearGradient>
			</defs>
			<path class="chart-area" d="M0,300 L ${areaPoints} L 800,300 Z" fill="url(#chartAreaFill)"></path>
			<polyline class="chart-line-target" points="${targetLine}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4"></polyline>
			<polyline class="chart-line-result" points="${resultLine}" fill="none" stroke="#1152d4" stroke-width="3"></polyline>
			${circles}
		</svg>
	`;
}

function buildHistoryRows(doc) {
	const historyKey = `${STORAGE_KEYS.HISTORIAL_DATOS}_${doc.codigo}`;
	let historial = [];
	try {
		const raw = localStorage.getItem(historyKey);
		historial = raw ? JSON.parse(raw) : [];
		if (!Array.isArray(historial)) historial = [];
	} catch {
		historial = [];
	}

	if (historial.length) {
		const normalized = historial
			.filter((row) => row && row.fecha)
			.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
			.map((row, index) => {
				const result = toPercentage(row.resultado);
				const targetRaw = Number.parseFloat(row.metaPeriodo ?? row.meta);
				const target = Number.isFinite(targetRaw) ? (targetRaw <= 1 ? targetRaw * 100 : targetRaw) : 60;
				const compliance = target > 0 ? Math.round((result / target) * 100) : Math.round(result);
				const stateInfo = computeIndicatorState(result);
				return {
					number: index + 1,
					date: formatDate(`${row.fecha}-01`),
					devengado: Number.parseFloat(row.devengado) || 0,
					pim: Number.parseFloat(row.pim) || 0,
					result,
					target,
					compliance,
					stateText: stateInfo.text,
					stateClass: stateInfo.badgeClass,
					analysis: String(row.analisis || "").trim(),
					actions: String(row.acciones || "").trim(),
					note: String(row.analisis || "").trim() || (compliance >= 100
						? "Ejecucion dentro de los parametros previstos."
						: "Se recomienda reforzar acciones de seguimiento.")
				};
			});

		if (normalized.length) return normalized;
	}

	return [];
}

function getRealtimeSignature() {
	const docs = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA) || "";
	const detail = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE) || "";
	const historyKey = state.selectedCode ? `${STORAGE_KEYS.HISTORIAL_DATOS}_${state.selectedCode}` : "";
	const history = historyKey ? (localStorage.getItem(historyKey) || "") : "";
	return [docs.length, detail.length, history.length, docs.slice(-48), detail.slice(-48), history.slice(-48)].join("|");
}

async function refreshRacioViewFromStorage(force = false) {
	const signature = getRealtimeSignature();
	if (!force && realtimeState.lastSignature === signature) return;
	realtimeState.lastSignature = signature;

	const detailView = document.getElementById("detail-view");
	const detailVisible = Boolean(detailView && !detailView.classList.contains("hidden"));
	const currentCode = state.selectedCode;

	await loadRepositoryDocuments({ includeRemote: false });
	if (currentCode && state.documents.some((doc) => doc.codigo === currentCode)) {
		state.selectedCode = currentCode;
	}
	populateFacultyFilter();
	applyFilters();
	renderCards();

	if (detailVisible && state.selectedCode) {
		renderDetail();
	}
}

function setupRealTimeSync() {
	window.addEventListener("storage", (event) => {
		const key = event.key || "";
		if (!key) {
			void refreshRacioViewFromStorage(true);
			return;
		}
		if (
			key === STORAGE_KEYS.DOCUMENTOS_LISTA
			|| key === STORAGE_KEYS.DOCUMENTOS_DETALLE
			|| key.startsWith(`${STORAGE_KEYS.HISTORIAL_DATOS}_`)
		) {
			void refreshRacioViewFromStorage(true);
		}
	});

	window.setInterval(() => {
		void refreshRacioViewFromStorage(false);
	}, REALTIME_REFRESH_MS);
}

function renderEstadoGauge(rows) {
	const gaugeCircle = document.getElementById("circulo-progreso");
	const estadoPromedio = document.getElementById("estado-promedio");
	const estadoTexto = document.getElementById("estado-texto");
	if (!gaugeCircle || !estadoPromedio || !estadoTexto) return;

	if (!rows.length) {
		gaugeCircle.style.strokeDashoffset = 502;
		gaugeCircle.style.stroke = "#94a3b8";
		estadoPromedio.textContent = "Sin datos";
		estadoPromedio.style.color = "#64748b";
		estadoTexto.textContent = "-";
		estadoTexto.className = "text-xs mt-2 px-3 py-1 rounded-full bg-slate-100";
		return;
	}

	const average = rows.reduce((sum, row) => sum + row.result, 0) / rows.length;
	const indicatorState = computeIndicatorState(average);
	const normalized = Math.max(0, Math.min(100, average));
	const circumference = 502;
	const offset = circumference - (normalized / 100) * circumference;

	gaugeCircle.style.strokeDashoffset = offset;
	gaugeCircle.style.stroke = indicatorState.color;
	estadoPromedio.textContent = indicatorState.text;
	estadoPromedio.style.color = indicatorState.color;
	estadoTexto.textContent = `Promedio ${average.toFixed(1)}%`;
	estadoTexto.className = `text-xs mt-2 px-3 py-1 rounded-full font-bold ${indicatorState.badgeClass}`;
}

function getTechnicalDetail(doc) {
	const detail = doc.detail?.indicadorData || doc.detail?.fichaData || doc.detail || {};
	const rawUnitCandidates = [
		detail.unidadResponsable,
		detail.oficinaResponsable,
		detail.areaResponsable,
		detail.oficina,
		detail.unidad,
		doc.unidad,
		doc.facultad
	];
	const unidadResponsable = rawUnitCandidates
		.map((value) => String(value || "").trim())
		.find((value) => value && !value.includes("@")) || "Oficina responsable";
	return {
		version: detail.version || detail.versión || detail.versao || "1",
		tipoProceso: detail.tipoProceso || detail.tipo_proceso || detail.procesoTipo || "Misional",
		proceso: detail.macroProceso || detail.proceso || detail.nombreProceso || doc.descripcion || "-",
		unidad: unidadResponsable,
		objetivo: detail.objetivoProceso || detail.objetivo || detail.objetivoProceso || doc.descripcion || "-",
		nombreIndicador: detail.nombreIndicador || detail.indicador || detail.nombre || doc.descripcion || "-",
		frecuencia: detail.frecuencia || "Trimestral",
		variables: detail.variables || detail.variable || "-",
		formula: detail.formulaDefinicion || detail.formula || detail.fórmula || detail.formulaIndicador || "Admitidos / Matriculados × 100%",
		fuente: detail.fuente || detail.source || "Sistema de Matrícula",
		meta: detail.meta || detail.metaValor || "90%"
	};
}

function buildTechnicalInfoMarkup(doc) {
	const technical = getTechnicalDetail(doc);
	const code = doc.codigo || "-";
	const variables = Array.isArray(technical.variables)
		? technical.variables.join("\n")
		: String(technical.variables || "-");
	const rawFormula = String(technical.formula || "").replace(/\s+/g, " ").trim();
	const multMatch = rawFormula.match(/^(.*?)(?:\s*[×x*]\s*)(.+)$/i);
	const mainFormula = (multMatch ? multMatch[1] : rawFormula) || "Admitidos / Matriculados";
	const multiplierValue = multMatch?.[2]?.trim() || "100%";
	const slashParts = mainFormula.split("/");
	const formulaLeft = slashParts[0]?.trim() || "Admitidos";
	const formulaRight = slashParts.slice(1).join("/").trim() || "Matriculados";
	const showMultiplier = Boolean(multMatch);
	return `
		<div class="detail-field detail-span-1"><p class="label">VERSIÓN</p><p class="value">${technical.version}</p></div>
		<div class="detail-field detail-span-1"><p class="label">TIPO DE PROCESO</p><p class="value">${technical.tipoProceso}</p></div>
		<div class="detail-field detail-span-1"><p class="label">PROCESO</p><p class="value">${technical.proceso}</p></div>
		<div class="detail-field detail-span-1"><p class="label">OFICINA O UNIDAD RESPONSABLE</p><p class="value">${technical.unidad}</p></div>
		<div class="detail-field detail-span-2"><p class="label">OBJETIVO DEL PROCESO</p><p class="value">${technical.objetivo}</p></div>
		<div class="detail-field detail-span-2"><p class="label">NOMBRE DEL INDICADOR</p><p class="value">${technical.nombreIndicador}</p></div>
		<div class="detail-field detail-span-1"><p class="label">FRECUENCIA</p><p class="value"><span class="detail-chip">${technical.frecuencia}</span></p></div>
		<div class="detail-field detail-span-3"><p class="label">VARIABLES</p><p class="value detail-multiline">${variables}</p></div>
		<div class="detail-field detail-span-2"><p class="label">FÓRMULA DEL INDICADOR</p><div class="formula-card"><div class="formula-main"><span>${formulaLeft}</span><span class="formula-divider"></span><span>${formulaRight}</span></div>${showMultiplier ? `<span class="formula-multiplier">× ${multiplierValue}</span>` : ""}</div></div>
		<div class="detail-field detail-span-1"><p class="label">FUENTE</p><p class="value">${technical.fuente}</p></div>
		<div class="detail-field detail-span-1"><p class="label">META</p><p class="value detail-meta">${technical.meta}</p></div>
	`;
}

function renderDetail() {
	const section = document.getElementById("detail-view");
	if (!section) return;
	const doc = state.filtered.find((item) => item.codigo === state.selectedCode);
	if (!doc) {
		section.classList.add("hidden");
		return;
	}

	const detailTitle = document.getElementById("detail-title");
	if (detailTitle) detailTitle.textContent = `${typeLabel(doc.tipo)} - ${doc.codigo}`;

	const infoHeader = section.querySelector(".detail-info-header");
	if (infoHeader) {
		infoHeader.innerHTML = `
			<h3 class="detail-header-title"><span class="detail-header-icon-wrap"><span class="material-symbols-outlined">info</span></span><span>Información Técnica</span></h3>
			<span class="detail-code-pill detail-code-pill-header">${doc.codigo}</span>
		`;
	}

	const detailBody = document.getElementById("detail-info-body");
	if (detailBody) {
		detailBody.classList.add("detail-info-body-grid");
		detailBody.innerHTML = buildTechnicalInfoMarkup(doc);
	}

	const chartTitle = document.getElementById("detail-chart-title");
	if (chartTitle) chartTitle.textContent = `Tendencia de Resultados - ${doc.codigo}`;

	const historyRows = buildHistoryRows(doc);

	const chartGrid = document.getElementById("detail-chart-grid");
	if (chartGrid) {
		if (!historyRows.length) {
			chartGrid.innerHTML = `
				<div class="flex h-full items-center justify-center text-slate-400 text-sm font-medium">
					Sin datos de seguimiento registrados
				</div>
			`;
		} else {
			const points = historyRows.map((row) => row.result);
			const avgTarget = historyRows.reduce((sum, row) => sum + (Number.parseFloat(row.target) || 0), 0) / historyRows.length;
			chartGrid.innerHTML = buildChartSvg(points, avgTarget || 60);
		}
	}

	const tableBody = document.getElementById("detail-table-body");
	if (tableBody) {
		if (!historyRows.length) {
			tableBody.innerHTML = `
				<tr>
					<td colspan="9" class="text-center text-slate-400 py-8">Sin datos de seguimiento registrados</td>
				</tr>
			`;
		} else {
			const rows = historyRows
				.map((row) => `
					<tr>
						<td>${row.number}</td>
						<td>${row.date}</td>
						<td>${formatCurrency(row.devengado)}</td>
						<td>${formatCurrency(row.pim)}</td>
						<td>${row.result}%</td>
						<td>${row.target}%</td>
						<td><span class="detail-badge ${row.stateClass}">${row.stateText}</span></td>
						<td>${row.analysis || row.note || "-"}</td>
						<td>${row.actions || "-"}</td>
					</tr>
				`)
				.join("");
			tableBody.innerHTML = rows;
		}
	}

	renderEstadoGauge(historyRows);
}


function wireFilters() {
	const tabs = document.querySelectorAll(".repo-tab");
	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			state.selectedType = tab.dataset.type || "all";
			document.querySelectorAll(".repo-tab").forEach((item) => item.classList.remove("active"));
			tab.classList.add("active");
			applyFilters();
			renderCards();
			showCardsView();
		});
	});

	const facultyFilter = document.getElementById("repo-faculty-filter");
	if (facultyFilter) {
		facultyFilter.addEventListener("change", async () => {
			state.selectedFaculty = facultyFilter.value;
			const selectedOption = facultyFilter.options[facultyFilter.selectedIndex] || null;
			state.selectedFacultyId = selectedOption?.dataset?.facultyId || "";
			updateFacultyDropdownLabel();
			await loadRepositoryDocuments({ includeRemote: true, facultyId: state.selectedFacultyId });
			applyFilters();
			renderCards();
			showCardsView();
			renderFacultyDropdownMenu();
		});
	}

	const search = document.getElementById("repo-search");
	if (search) {
		search.addEventListener("input", () => {
			state.searchTerm = search.value;
			applyFilters();
			renderCards();
			showCardsView();
		});
	}

	const exportButton = document.getElementById("export-repository");
	if (exportButton) {
		exportButton.addEventListener("click", () => window.print());
	}

	const backButton = document.getElementById("back-to-list");
	if (backButton) {
		backButton.addEventListener("click", () => {
			showCardsView();
			document.getElementById("cards-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	if (!guardAdminSession()) return;
	renderProfileInfo();
	setupThemeToggle();
	const logoutControls = setupLogoutModal();
	setupProfileMenu(logoutControls);
	setupFacultyDropdown();
	await loadRepositoryDocuments({ includeRemote: true });
	await loadFacultiesForFilter();
	realtimeState.lastSignature = getRealtimeSignature();
	populateFacultyFilter();
	applyFilters();
	renderCards();
	wireFilters();
	setupRealTimeSync();
});

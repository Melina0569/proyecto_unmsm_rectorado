const STORAGE_KEYS = {
	DOCUMENTOS_LISTA: "sigpro_documentos_lista"
};

const PAGE_SIZE = 8;

const FACULTADES_CATALOGO = [
	{ id: 1, name: "Medicina", code: "FM", icon: "medical_services", color: "red", indicators: 12, flows: 8, processes: 5 },
	{ id: 2, name: "Derecho y Ciencia Política", code: "FDCP", icon: "gavel", color: "indigo", indicators: 12, flows: 8, processes: 5 },
	{ id: 3, name: "Letras y Ciencias Humanas", code: "FLCH", icon: "history_edu", color: "amber", indicators: 10, flows: 12, processes: 7 },
	{ id: 4, name: "Farmacia y Bioquímica", code: "FFB", icon: "vaccines", color: "cyan", indicators: 13, flows: 8, processes: 5 },
	{ id: 5, name: "Odontología", code: "FO", icon: "health_and_safety", color: "teal", indicators: 11, flows: 7, processes: 4 },
	{ id: 6, name: "Educación", code: "FE", icon: "school", color: "emerald", indicators: 17, flows: 12, processes: 8 },
	{ id: 7, name: "Química e Ingeniería Química", code: "FQIQ", icon: "science", color: "lime", indicators: 11, flows: 8, processes: 5 },
	{ id: 8, name: "Medicina Veterinaria", code: "FMV", icon: "pets", color: "orange", indicators: 14, flows: 9, processes: 6 },
	{ id: 9, name: "Ciencias Administrativas", code: "FCA", icon: "work", color: "purple", indicators: 12, flows: 8, processes: 5 },
	{ id: 10, name: "Ciencias Biológicas", code: "FCB", icon: "biotech", color: "green", indicators: 15, flows: 6, processes: 4 },
	{ id: 11, name: "Ciencias Contables", code: "FCC", icon: "money_bag", color: "pink", indicators: 15, flows: 6, processes: 4 },
	{ id: 12, name: "Ciencias Económicas", code: "FCE", icon: "trending_up", color: "yellow", indicators: 14, flows: 10, processes: 6 },
	{ id: 13, name: "Ciencias Físicas", code: "FCF", icon: "antigravity", color: "violet", indicators: 10, flows: 7, processes: 4 },
	{ id: 14, name: "Ciencias Matemáticas", code: "FCM", icon: "calculate", color: "blue", indicators: 12, flows: 8, processes: 5 },
	{ id: 15, name: "Ciencias Sociales", code: "FCCSS", icon: "groups", color: "rose", indicators: 13, flows: 9, processes: 6 },
	{ id: 16, name: "Ingeniería Geológica, Minera, Metalúrgica y Geográfica", code: "FIGMMG", icon: "terrain", color: "stone", indicators: 9, flows: 10, processes: 6 },
	{ id: 17, name: "Ingeniería Industrial", code: "FII", icon: "precision_manufacturing", color: "slate", indicators: 15, flows: 9, processes: 6 },
	{ id: 18, name: "Psicología", code: "FP", icon: "psychology", color: "fuchsia", indicators: 16, flows: 8, processes: 5 },
	{ id: 19, name: "Ingeniería Eléctrica y Electrónica", code: "FIEE", icon: "electrical_services", color: "amber", indicators: 16, flows: 11, processes: 7 },
	{ id: 20, name: "Ingeniería de Sistemas e Informática", code: "FISI", icon: "computer", color: "sky", indicators: 18, flows: 14, processes: 8 }
];

const SORT_OPTIONS = [
	{ value: "oldest", label: "Más antiguos" },
	{ value: "newest", label: "Más recientes" },
	{ value: "progress-desc", label: "Mayor progreso" },
	{ value: "progress-asc", label: "Menor progreso" }
];

const state = {
	allDocuments: [],
	filteredDocuments: [],
	page: 1,
	status: "all",
	faculty: "all",
	query: "",
	sortBy: "oldest"
};

function normalizeText(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();
}

function normalizeEstado(value) {
	const status = normalizeText(value).replace(/\s+/g, "_");
	if (status.includes("complet") || status.includes("aprob") || status.includes("public")) return "completado";
	if (status.includes("proceso") || status.includes("revision") || status.includes("observ")) return "en_proceso";
	return "pendiente";
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
	const tokens = String(name || "")
		.split(" ")
		.filter(Boolean)
		.slice(0, 2);
	if (!tokens.length) return "RA";
	return tokens.map((w) => w.charAt(0).toUpperCase()).join("");
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

function parseDate(value) {
	if (!value) return new Date();

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? new Date() : value;
	}

	const raw = String(value).trim();
	const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (dateOnlyMatch) {
		const [, year, month, day] = dateOnlyMatch;
		return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
	}

	const date = new Date(raw);
	if (Number.isNaN(date.getTime())) return new Date();
	return date;
}

function inferProgress(status) {
	if (status === "completado") return 100;
	if (status === "en_proceso") return 60;
	return 15;
}

function formatDisplayDate(date) {
	return new Intl.DateTimeFormat("es-PE", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	}).format(date);
}

function normalizeDocument(doc, index) {
	const status = normalizeEstado(doc.estado || doc.status || doc.estadoTexto);
	const date = parseDate(doc.fecha || doc.fechaCreacion || doc.createdAt || doc.updatedAt);
	const code = doc.codigo || doc.code || `EXP-${date.getFullYear()}-${String(index + 1).padStart(4, "0")}`;
	const faculty = doc.nombreFacultad || doc.facultad || doc.facultadNombre || "Facultad no especificada";
	const unit = doc.unidad || doc.area || doc.generadoPor || "Unidad administrativa";

	return {
		id: doc.id || code,
		code,
		faculty,
		unit,
		status,
		date,
		progress: Number.isFinite(doc.progreso) ? Number(doc.progreso) : inferProgress(status),
		description: doc.descripcion || doc.nombre || "Expediente"
	};
}

function mergeDocuments(apiDocs, localDocs) {
	const map = new Map();
	apiDocs.forEach((d) => map.set(d.code, d));
	localDocs.forEach((d) => {
		const existing = map.get(d.code);
		map.set(d.code, existing ? { ...existing, ...d } : d);
	});
	return Array.from(map.values());
}

function extractArrayPayload(payload) {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	return [];
}

async function loadApiDocuments() {
	if (typeof API === "undefined" || !API.documentos || typeof API.documentos.getAll !== "function") return [];

	try {
		const result = await API.documentos.getAll({});
		if (!result?.success) return [];
		const list = extractArrayPayload(result.data);
		return list.map((doc, i) => normalizeDocument(doc, i));
	} catch {
		return [];
	}
}

function loadLocalDocuments() {
	const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
	if (!raw) return [];

	try {
		const list = JSON.parse(raw);
		if (!Array.isArray(list)) return [];
		return list.map((doc, i) => normalizeDocument(doc, i));
	} catch {
		return [];
	}
}

function statusLabel(status) {
	if (status === "completado") return "COMPLETADO";
	if (status === "en_proceso") return "EN PROCESO";
	return "PENDIENTE";
}

function getFacultyDisplayLabel(value) {
	if (!value || value === "all") return "Todas las facultades";
	const match = FACULTADES_CATALOGO.find((item) => item.name === value || item.code === value);
	return match?.name || value;
}

function getSortDisplayLabel(value) {
	return SORT_OPTIONS.find((option) => option.value === value)?.label || "Más antiguos";
}

function getDropdownConfig(type) {
	if (type === "faculty") {
		return {
			root: document.querySelector('.custom-dropdown[data-dropdown="faculty"]'),
			trigger: document.getElementById("filter-faculty-trigger"),
			menu: document.getElementById("filter-faculty-menu"),
			label: document.getElementById("filter-faculty-label")
		};
	}

	return {
		root: document.querySelector('.custom-dropdown[data-dropdown="sort"]'),
		trigger: document.getElementById("sort-by-trigger"),
		menu: document.getElementById("sort-by-menu"),
		label: document.getElementById("sort-by-label")
	};
}

function syncDropdownSelection(type, value) {
	const config = getDropdownConfig(type);
	if (!config.root || !config.trigger || !config.menu || !config.label) return;

	const displayLabel = type === "faculty" ? getFacultyDisplayLabel(value) : getSortDisplayLabel(value);
	config.label.textContent = displayLabel;

	Array.from(config.menu.querySelectorAll(".dropdown-option")).forEach((option) => {
		option.classList.toggle("active", option.dataset.value === value);
		option.setAttribute("aria-selected", option.dataset.value === value ? "true" : "false");
	});
}

function setDropdownOpen(type, open) {
	const config = getDropdownConfig(type);
	if (!config.root || !config.trigger || !config.menu) return;

	config.root.classList.toggle("is-open", open);
	config.trigger.setAttribute("aria-expanded", open ? "true" : "false");
	config.menu.setAttribute("aria-hidden", open ? "false" : "true");
}

function closeAllDropdowns() {
	["faculty", "sort"].forEach((type) => setDropdownOpen(type, false));
}

function toggleDropdown(type) {
	const config = getDropdownConfig(type);
	if (!config.root) return;
	const isOpen = config.root.classList.contains("is-open");
	closeAllDropdowns();
	setDropdownOpen(type, !isOpen);
}

function renderFacultyDropdownOptions(documents) {
	const config = getDropdownConfig("faculty");
	if (!config.menu) return;

	const fromCatalog = FACULTADES_CATALOGO.map((faculty) => faculty.name);
	const fromDocuments = documents.map((doc) => doc.faculty).filter(Boolean);
	const faculties = Array.from(new Set([...fromCatalog, ...fromDocuments])).sort((a, b) => a.localeCompare(b));

	config.menu.innerHTML = [
		`<button type="button" class="dropdown-option active" data-value="all" aria-selected="true">Todas las facultades</button>`,
		...faculties.map((name) => `<button type="button" class="dropdown-option" data-value="${name}" aria-selected="false">${name}</button>`)
	].join("");
}

function renderSortDropdownOptions() {
	const config = getDropdownConfig("sort");
	if (!config.menu) return;

	config.menu.innerHTML = SORT_OPTIONS.map((option) => `
		<button type="button" class="dropdown-option${option.value === state.sortBy ? " active" : ""}" data-value="${option.value}" aria-selected="${option.value === state.sortBy ? "true" : "false"}">${option.label}</button>
	`).join("");
}

function setupDropdownInteractions() {
	const facultyConfig = getDropdownConfig("faculty");
	const sortConfig = getDropdownConfig("sort");

	if (facultyConfig.trigger) {
		facultyConfig.trigger.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			toggleDropdown("faculty");
		});
	}

	if (sortConfig.trigger) {
		sortConfig.trigger.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			toggleDropdown("sort");
		});
	}

	if (facultyConfig.menu) {
		facultyConfig.menu.addEventListener("click", (event) => {
			const option = event.target.closest(".dropdown-option");
			if (!option) return;
			state.faculty = option.dataset.value || "all";
			syncDropdownSelection("faculty", state.faculty);
			closeAllDropdowns();
			applyFilters();
		});
	}

	if (sortConfig.menu) {
		sortConfig.menu.addEventListener("click", (event) => {
			const option = event.target.closest(".dropdown-option");
			if (!option) return;
			state.sortBy = option.dataset.value || "oldest";
			syncDropdownSelection("sort", state.sortBy);
			closeAllDropdowns();
			applyFilters();
		});
	}

	document.addEventListener("click", (event) => {
		if (!facultyConfig.root?.contains(event.target) && !sortConfig.root?.contains(event.target)) {
			closeAllDropdowns();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeAllDropdowns();
		}
	});
}

function applyFilters() {
	const query = normalizeText(state.query);

	state.filteredDocuments = state.allDocuments
		.filter((doc) => state.faculty === "all" || normalizeText(doc.faculty) === normalizeText(state.faculty))
		.filter((doc) => state.status === "all" || doc.status === state.status)
		.filter((doc) => {
			if (!query) return true;
			return [doc.code, doc.description, doc.faculty, doc.unit].some((value) => normalizeText(value).includes(query));
		});

	state.filteredDocuments.sort((a, b) => {
		if (state.sortBy === "newest") return b.date - a.date;
		if (state.sortBy === "progress-desc") return b.progress - a.progress;
		if (state.sortBy === "progress-asc") return a.progress - b.progress;
		return a.date - b.date;
	});

	state.page = 1;
	renderTable();
	updatePagination();
}

function renderTable() {
	const tbody = document.getElementById("docs-tbody");
	if (!tbody) return;

	const start = (state.page - 1) * PAGE_SIZE;
	const end = start + PAGE_SIZE;
	const pageItems = state.filteredDocuments.slice(start, end);

	if (!pageItems.length) {
		tbody.innerHTML = `
			<tr>
				<td colspan="6" class="px-5 py-8 text-sm text-slate-500 text-center">No hay expedientes para los filtros seleccionados.</td>
			</tr>
		`;
		return;
	}

	tbody.innerHTML = pageItems.map((doc) => `
		<tr class="hover:bg-slate-50/60 transition-colors">
			<td class="px-5 py-4"><span class="font-mono font-bold text-sm text-slate-800">${doc.code}</span></td>
			<td class="px-5 py-4">
				<div class="flex flex-col">
					<span class="text-sm font-semibold text-slate-800">${doc.faculty}</span>
					<span class="text-xs text-slate-500">${doc.unit}</span>
				</div>
			</td>
			<td class="px-5 py-4">
				<div class="w-full max-w-[130px]">
					<div class="text-[10px] font-bold text-slate-500 mb-1">${doc.progress}%</div>
					<div class="progress-track"><div class="progress-fill ${doc.status}" style="width: ${doc.progress}%"></div></div>
				</div>
			</td>
			<td class="px-5 py-4"><span class="badge ${doc.status}">${statusLabel(doc.status)}</span></td>
			<td class="px-5 py-4 text-sm text-slate-500">${formatDisplayDate(doc.date)}</td>
			<td class="px-5 py-4 text-right"><a href="racio-expedientes.html?codigo=${encodeURIComponent(doc.code)}&facultad=${encodeURIComponent(doc.faculty)}&unidad=${encodeURIComponent(doc.unit)}&estado=${encodeURIComponent(doc.status)}&descripcion=${encodeURIComponent(doc.description)}&fecha=${encodeURIComponent(doc.date.toISOString())}&progreso=${encodeURIComponent(String(doc.progress))}" class="table-action"><span class="material-symbols-outlined text-sm">visibility</span>REVISAR</a></td>
		</tr>
	`).join("");
}

function updatePagination() {
	const info = document.getElementById("pagination-info");
	const prev = document.getElementById("page-prev");
	const next = document.getElementById("page-next");
	const current = document.getElementById("page-current");

	const total = state.filteredDocuments.length;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	if (state.page > totalPages) state.page = totalPages;

	const start = total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
	const end = Math.min(state.page * PAGE_SIZE, total);

	if (info) info.textContent = `Mostrando ${start}-${end} de ${total} expedientes`;
	if (current) current.textContent = String(state.page);
	if (prev) prev.disabled = state.page <= 1;
	if (next) next.disabled = state.page >= totalPages;
}

function bindPagination() {
	const prev = document.getElementById("page-prev");
	const next = document.getElementById("page-next");

	if (prev) {
		prev.addEventListener("click", () => {
			state.page = Math.max(1, state.page - 1);
			renderTable();
			updatePagination();
		});
	}

	if (next) {
		next.addEventListener("click", () => {
			const totalPages = Math.max(1, Math.ceil(state.filteredDocuments.length / PAGE_SIZE));
			state.page = Math.min(totalPages, state.page + 1);
			renderTable();
			updatePagination();
		});
	}
}

function populateFacultyFilter(documents) {
	renderFacultyDropdownOptions(documents);
}

function resolveFacultyFromQuery() {
	const params = new URLSearchParams(window.location.search);
	const facultyParam = params.get("facultad");
	if (!facultyParam) return "all";

	const normalizedQuery = normalizeText(facultyParam);
	const byName = FACULTADES_CATALOGO.find((item) => normalizeText(item.name) === normalizedQuery);
	if (byName) return byName.name;

	const byCode = FACULTADES_CATALOGO.find((item) => normalizeText(item.code) === normalizedQuery);
	if (byCode) return byCode.name;

	return facultyParam;
}

function bindFilters() {
	const code = document.getElementById("filter-code");
	const tabs = Array.from(document.querySelectorAll(".status-tab"));

	if (code) {
		code.addEventListener("input", (event) => {
			state.query = event.target.value || "";
			applyFilters();
		});
	}

	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			tabs.forEach((node) => node.classList.remove("active"));
			tab.classList.add("active");
			state.status = tab.dataset.status || "all";
			applyFilters();
		});
	});
}

function buildFallbackDocuments() {
	return [
		{ code: "EXP-2024-0045", faculty: "Ingeniería de Sistemas e Informática", unit: "Unidad de Planificación", status: "en_proceso", progress: 65, date: new Date("2024-03-12") },
		{ code: "EXP-2024-0032", faculty: "Medicina", unit: "Secretaría Académica", status: "completado", progress: 100, date: new Date("2024-03-05") },
		{ code: "EXP-2024-0051", faculty: "Ciencias Económicas", unit: "Decanato", status: "pendiente", progress: 15, date: new Date("2024-03-18") },
		{ code: "EXP-2024-0012", faculty: "Letras y Ciencias Humanas", unit: "Escuela de Posgrado", status: "completado", progress: 100, date: new Date("2024-02-01") }
	];
}

async function initializeDocuments() {
	const apiDocs = await loadApiDocuments();
	const localDocs = loadLocalDocuments();
	const merged = mergeDocuments(apiDocs, localDocs);

	state.allDocuments = merged.length ? merged : buildFallbackDocuments();
	populateFacultyFilter(state.allDocuments);
	renderSortDropdownOptions();

	const preselectedFaculty = resolveFacultyFromQuery();
	state.faculty = preselectedFaculty;
	syncDropdownSelection("faculty", state.faculty);
	syncDropdownSelection("sort", state.sortBy);

	applyFilters();
}

document.addEventListener("DOMContentLoaded", async () => {
	if (!guardAdminSession()) return;

	renderProfileInfo();
	setupThemeToggle();
	const logoutControls = setupLogoutModal();
	setupProfileMenu(logoutControls);
	setupDropdownInteractions();
	bindFilters();
	bindPagination();
	await initializeDocuments();
	document.getElementById("racio-body")?.classList.add("is-ready");
});

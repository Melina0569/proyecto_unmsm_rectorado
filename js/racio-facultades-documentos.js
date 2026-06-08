const STORAGE_KEYS = {
	DOCUMENTOS_LISTA: "sigpro_documentos_lista"
};

const PAGE_SIZE = 8;

const SORT_OPTIONS = [
    { value: "oldest", label: "Más antiguos" },
    { value: "newest", label: "Más recientes" },
    { value: "progress-desc", label: "Mayor progreso" },
    { value: "progress-asc", label: "Menor progreso" }
];

// ✅ NUEVO: Opciones de status para la API
const STATUS_OPTIONS = [
    { value: "all", label: "Todos los estados" },
    { value: "PENDING", label: "Pendiente" },
    { value: "IN_PROGRESS", label: "En progreso" },
    { value: "COMPLETED", label: "Completado" },
    { value: "REJECTED", label: "Rechazado" }
];

const state = {
	allDocuments: [],
    filteredDocuments: [],
    faculties: [],
    page: 1,
    apiStatus: "",            // ✅ NUEVO: PENDING, IN_PROGRESS, COMPLETED, REJECTED para API
    query: "",
    sortBy: "oldest"
};

function getStatusDisplayLabel(value) {
    return STATUS_OPTIONS.find(option => option.value === value)?.label || "Todos los estados";
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
        const items = Array.isArray(source[key]) ? source[key] : [];
        items.forEach((doc, index) => {
            rows.push({
                id: doc?.id || doc?.code || `DOC-${index}`,
                codigo: doc?.code || doc?.codigo || doc?.documentCode || doc?.id || `DOC-${index}`,
                descripcion: doc?.title || doc?.descripcion || doc?.name || `Documento ${index}`,
                facultad: doc?.faculty?.shortName || doc?.faculty?.name || doc?.nombreFacultad || doc?.facultad || "Facultad no registrada",
                unidad: doc?.unit || doc?.unidad || doc?.area || "Oficina responsable",
                tipo: type,
                estado: doc?.status || doc?.estado || 'pendiente',
                fecha: parseDate(doc?.approvedAt || doc?.publishedAt || doc?.updatedAt || doc?.createdAt || new Date()),
                progress: inferProgress(doc?.status || doc?.estado)
            });
        });
    });

    return rows;
}

function normalizeRemoteRepositoryDoc(doc, forcedType, index) {
    return {
        id: doc?.id || doc?.code || `DOC-${index}`,
        codigo: doc?.code || doc?.codigo || doc?.documentCode || doc?.id || `DOC-${index}`,
        descripcion: doc?.title || doc?.descripcion || doc?.name || `Documento ${index}`,
        facultad: doc?.faculty?.shortName || doc?.faculty?.name || doc?.nombreFacultad || doc?.facultad || "Facultad no registrada",
        unidad: doc?.unit || doc?.unidad || doc?.area || "Oficina responsable",
        tipo: forcedType || inferType(doc?.code || doc?.codigo),
        estado: statusLabel(doc?.status || doc?.estado || "Aprobado"),
        fecha: parseDate(doc?.approvedAt || doc?.publishedAt || doc?.updatedAt || doc?.createdAt || new Date())
    };
}

function inferProgress(status) {
    const s = normalizeText(status);
    if (s.includes("complet") || s.includes("aprob")) return 100;
    if (s.includes("proceso")) return 60;
    return 15;
}

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
	const facultyId = doc.facultyId || doc.facultadId || doc.facultad_id || doc.faculty?.id || "";
	const faculty = doc.nombreFacultad || doc.facultad || doc.facultadNombre || "Facultad no especificada";
	const unit = doc.unidad || doc.area || doc.generadoPor || "Unidad administrativa";

	return {
		id: doc.id || code,
		facultyId,
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

function extractFacultyRows(payload) {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	return [];
}

async function loadApiFaculties() {
	if (typeof API === "undefined" || !API.admin?.faculties?.getAll) return [];

	try {
		const response = await API.admin.faculties.getAll();
		if (!response?.success) return [];
		const rows = extractFacultyRows(response.data);
		return rows
			.map((item) => ({
				id: item?.id || "",
				code: item?.code || "",
				name: item?.name || item?.shortName || item?.facultad || "",
				shortName: item?.shortName || item?.name || ""
			}))
			.filter((item) => item.id && item.name);
	} catch {
		return [];
	}
}

async function loadApiDocuments(facultyId = "", faculties = state.faculties) {
    if (typeof API === "undefined") {
        console.warn('API no disponible');
        return [];
    }

    console.log('📤 Cargando documentos, facultyId:', facultyId || '(todas)', 'apiStatus:', state.apiStatus || '(todos)');

    // ═══════════════════════════════════════════════════════════
    // ESTRATEGIA 1: Filtro específico facultyId + apiStatus
    // ESTE es el único endpoint que funciona sin 500
    // ═══════════════════════════════════════════════════════════
    if (facultyId && facultyId !== "all" && state.apiStatus && state.apiStatus !== "all") {
        try {
            console.log(`🔄 /admin/documents?facultyId=${facultyId}&status=${state.apiStatus}`);
            const result = await API.admin.documents.getFiltered(facultyId, state.apiStatus, 1, 100);
            
            if (result?.success) {
                const docs = Array.isArray(result.data) ? result.data : [];
                console.log(`✅ /admin/documents: ${docs.length} docs`);
                return docs.map((doc, i) => normalizeDocument(doc, i));
            } else {
                console.warn('⚠️ /admin/documents error:', result?.error);
                return [];
            }
        } catch (e) {
            console.warn('⚠️ /admin/documents falló:', e.message);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ESTRATEGIA 2: /admin/repository (funciona, pero suele estar vacío)
    // ═══════════════════════════════════════════════════════════
    try {
        console.log('🔄 /admin/repository...');
        const repoResponse = await API.admin.repository.get(
            facultyId && facultyId !== "all" ? { facultyId } : {}
        );
        
        if (repoResponse?.success && repoResponse.data) {
            const docs = flattenRemoteRepositoryPayload(repoResponse.data);
            console.log(`✅ /admin/repository: ${docs.length} docs`);
            if (docs.length > 0) {
                return docs;
            }
        }
    } catch (e) {
        console.warn('⚠️ /admin/repository falló:', e.message);
    }

    // ═══════════════════════════════════════════════════════════
    // ESTRATEGIA 3: /portal/documents (probablemente también 500)
    // ═══════════════════════════════════════════════════════════
    if (!facultyId || facultyId === "all") {
        try {
            const result = await API.portal.documents.getAll({ page: 1, limit: 100 });
            if (result?.success && Array.isArray(result.data)) {
                console.log(`✅ /portal/documents: ${result.data.length} docs`);
                return result.data.map((doc, i) => normalizeDocument(doc, i));
            }
        } catch (e) {
            console.warn('⚠️ /portal/documents falló:', e.message);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ESTRATEGIA 4: Datos de demostración
    // ═══════════════════════════════════════════════════════════
    console.log('🔄 Usando datos de demostración...');
    return buildFallbackDocuments(facultyId);
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
    // Mapear estados API a labels visuales
    const labels = {
        "PENDING": "PENDIENTE",
        "IN_PROGRESS": "EN PROCESO", 
        "COMPLETED": "COMPLETADO",
        "REJECTED": "RECHAZADO",
        "completado": "COMPLETADO",
        "en_proceso": "EN PROCESO",
        "pendiente": "PENDIENTE"
    };
    return labels[status] || status?.toUpperCase() || "PENDIENTE";
}

function inferProgress(status) {
    const s = normalizeText(status);
    if (s.includes("complet") || s.includes("aprob") || s.includes("COMPLETED")) return 100;
    if (s.includes("proceso") || s.includes("PROGRESS") || s.includes("IN_PROGRESS")) return 60;
    if (s.includes("rechaz") || s.includes("REJECTED")) return 0;
    return 15;
}

function getFacultyDisplayLabel(value) {
	if (!value || value === "all") return "Todas las facultades";
	const match = state.faculties.find((item) => item.id === value || item.code === value || item.name === value || item.shortName === value);
	return match?.shortName || match?.name || value;
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
    
    if (type === "status-api") {
        return {
            root: document.querySelector('.custom-dropdown[data-dropdown="status-api"]'),
            trigger: document.getElementById("filter-status-api-trigger"),
            menu: document.getElementById("filter-status-api-menu"),
            label: document.getElementById("filter-status-api-label")
        };
    }

    return {
        root: document.querySelector('.custom-dropdown[data-dropdown="sort"]'),
        trigger: document.getElementById("sort-by-trigger"),
        menu: document.getElementById("sort-by-menu"),
        label: document.getElementById("sort-by-label")
    };
}

function renderStatusApiDropdownOptions() {
    const config = getDropdownConfig("status-api");
    if (!config.menu) return;

    config.menu.innerHTML = STATUS_OPTIONS.map((option) => `
        <button type="button" class="dropdown-option${option.value === state.apiStatus ? " active" : ""}" data-value="${option.value}" aria-selected="${option.value === state.apiStatus ? "true" : "false"}">${option.label}</button>
    `).join("");
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
    ["faculty", "sort", "status-api"].forEach((type) => {  // ✅ Agregar "status-api"
        const config = getDropdownConfig(type);
        if (!config.root || !config.trigger || !config.menu) return;
        
        if (document.activeElement && config.menu.contains(document.activeElement)) {
            config.trigger.focus();
        }
        
        config.root.classList.remove("is-open");
        config.trigger.setAttribute("aria-expanded", "false");
        config.menu.setAttribute("aria-hidden", "true");
    });
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

	const faculties = state.faculties
		.slice()
		.sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name));

	config.menu.innerHTML = [
		`<button type="button" class="dropdown-option active" data-value="all" aria-selected="true">Todas las facultades</button>`,
		...faculties.map((faculty) => `<button type="button" class="dropdown-option" data-value="${faculty.id}" aria-selected="false">${faculty.shortName || faculty.name}</button>`)
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
    const statusApiConfig = getDropdownConfig("status-api");  // ✅ NUEVO

    // Faculty dropdown (existente)
    if (facultyConfig.trigger) {
        facultyConfig.trigger.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleDropdown("faculty");
        });
    }

    // Sort dropdown (existente)
    if (sortConfig.trigger) {
        sortConfig.trigger.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleDropdown("sort");
        });
    }

    // ✅ NUEVO: Status API dropdown
    if (statusApiConfig.trigger) {
        statusApiConfig.trigger.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleDropdown("status-api");
        });
    }

    // Faculty menu click
    if (facultyConfig.menu) {
        facultyConfig.menu.addEventListener("click", (event) => {
            const option = event.target.closest(".dropdown-option");
            if (!option) return;
            state.faculty = option.dataset.value || "all";
            syncDropdownSelection("faculty", state.faculty);
            closeAllDropdowns();
            // Recargar documentos con nuevo faculty + status API
            reloadDocuments();
        });
    }

    // Sort menu click (existente)
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

    // ✅ NUEVO: Status API menu click
    if (statusApiConfig.menu) {
        statusApiConfig.menu.addEventListener("click", (event) => {
            const option = event.target.closest(".dropdown-option");
            if (!option) return;
            state.apiStatus = option.dataset.value || "";
            syncDropdownSelection("status-api", state.apiStatus);
            closeAllDropdowns();
            // Recargar documentos desde API con nuevo status
            reloadDocuments();
        });
    }

    // Click outside (actualizar para incluir status-api)
    document.addEventListener("click", (event) => {
        if (!facultyConfig.root?.contains(event.target) && 
            !sortConfig.root?.contains(event.target) &&
            !statusApiConfig.root?.contains(event.target)) {
            closeAllDropdowns();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAllDropdowns();
        }
    });
}

async function reloadDocuments() {
    const facultyId = state.faculty === "all" ? "" : state.faculty;
    const apiDocs = await loadApiDocuments(facultyId, state.faculties);
    state.allDocuments = apiDocs;
    applyFilters();
}

function applyFilters() {
    const query = normalizeText(state.query);

    state.filteredDocuments = state.allDocuments
        .filter((doc) => {
            if (state.faculty === "all") return true;
            if (doc.facultyId && doc.facultyId === state.faculty) return true;
            const selectedFacultyName = getFacultyDisplayLabel(state.faculty);
            return normalizeText(doc.faculty) === normalizeText(selectedFacultyName);
        })
        // ✅ ELIMINADO: filtro por state.status (tabs locales)
        .filter((doc) => {
            if (!query) return true;
            return [doc.code, doc.description, doc.faculty, doc.unit].some((value) => normalizeText(value).includes(query));
        });

    state.filteredDocuments.sort((a, b) => {
        if (state.sortBy === "newest") return b.date - a.date;
        if (state.sortBy === "progress-desc") return b.progress - b.progress;
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

function populateFacultyFilter() {
	renderFacultyDropdownOptions();
}

function resolveFacultyFromQuery() {
	const params = new URLSearchParams(window.location.search);
	const facultyParam = params.get("facultyId") || params.get("facultadId") || params.get("facultad");
	if (!facultyParam) return "all";

	const normalizedQuery = normalizeText(facultyParam);
	const match = state.faculties.find((item) => (
		normalizeText(item.id) === normalizedQuery
		|| normalizeText(item.code) === normalizedQuery
		|| normalizeText(item.name) === normalizedQuery
		|| normalizeText(item.shortName) === normalizedQuery
	));

	return match?.id || "all";
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
}

function buildFallbackDocuments() {
	return [
		{ code: "EXP-2024-0045", faculty: "Ingeniería de Sistemas e Informática", unit: "Unidad de Planificación", status: "en_proceso", progress: 65, date: new Date("2024-03-12") },
		{ code: "EXP-2024-0032", faculty: "Medicina", unit: "Secretaría Académica", status: "completado", progress: 100, date: new Date("2024-03-05") },
		{ code: "EXP-2024-0051", faculty: "Ciencias Económicas", unit: "Decanato", status: "pendiente", progress: 15, date: new Date("2024-03-18") },
		{ code: "EXP-2024-0012", faculty: "Letras y Ciencias Humanas", unit: "Escuela de Posgrado", status: "completado", progress: 100, date: new Date("2024-02-01") }
	];
}

function getFacultyFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        id: params.get('facultyId'),
        code: params.get('facultyCode'),
        name: params.get('facultyName')
    };
}

async function initializeDocuments() {
    const urlFaculty = getFacultyFromUrl();
    
    // Cargar facultades
    state.faculties = await loadApiFaculties();
    populateFacultyFilter();
    renderSortDropdownOptions();
    renderStatusApiDropdownOptions();

    // Si viene facultyId en URL
    if (urlFaculty.id) {
        const exists = state.faculties.find(f => f.id === urlFaculty.id);
        if (exists) {
            state.faculty = urlFaculty.id;
            // ✅ Pre-seleccionar PENDING para que el endpoint funcione
            state.apiStatus = "PENDING";
            
            const pageTitle = document.querySelector('h1');
            if (pageTitle && urlFaculty.name) {
                pageTitle.innerHTML = `
                    <span class="material-symbols-outlined text-blue-600">folder_shared</span>
                    Documentos: ${decodeURIComponent(urlFaculty.name)}
                `;
            }
        }
    }

    // Sincronizar UI
    syncDropdownSelection("faculty", state.faculty);
    syncDropdownSelection("sort", state.sortBy);
    syncDropdownSelection("status-api", state.apiStatus);

    // Cargar documentos
    const apiDocs = await loadApiDocuments(
        state.faculty === "all" ? "" : state.faculty, 
        state.faculties
    );
    
    state.allDocuments = apiDocs;
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

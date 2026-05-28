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
	selectedType: "all",
	selectedFaculty: "all",
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

function loadRepositoryDocuments() {
	const previousCode = state.selectedCode;
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

	const approved = docs
		.filter((doc) => {
			const status = normalizeText(doc.estado || doc.status);
			return status.includes("aprob") || status.includes("complet");
		})
		.map((doc) => {
			const code = doc.codigo || doc.code || doc.id || "DOC-SIN-CODIGO";
			const type = doc.tipo || inferType(code);
			const detail = detailMap?.[code] || null;
			return {
				id: doc.id || code,
				codigo: code,
				descripcion: doc.descripcion || doc.nombre || `Documento ${code}`,
				facultad: doc.nombreFacultad || doc.facultad || doc.generadoPor || "Facultad no registrada",
				unidad: doc.unidad || doc.area || "Oficina responsable",
				tipo: type,
				estado: statusLabel(doc.estado || doc.status || "aprobado"),
				fecha: parseDate(doc.fechaAprobacion || doc.fechaActualizacion || doc.fecha || doc.updatedAt),
				detail
			};
		})
		.sort((a, b) => b.fecha - a.fecha);

	state.documents = approved;
	state.filtered = approved;
	state.selectedCode = approved.some((doc) => doc.codigo === previousCode)
		? previousCode
		: approved[0]?.codigo || "";
}

function populateFacultyFilter() {
	const select = document.getElementById("repo-faculty-filter");
	if (!select) return;
	const faculties = Array.from(new Set(state.documents.map((doc) => doc.facultad))).sort((a, b) => a.localeCompare(b, "es"));
	const options = ["<option value=\"all\">Todas las facultades</option>"];
	faculties.forEach((faculty) => {
		options.push(`<option value="${faculty.replace(/"/g, "&quot;")}">${faculty}</option>`);
	});
	select.innerHTML = options.join("");
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

function refreshRacioViewFromStorage(force = false) {
	const signature = getRealtimeSignature();
	if (!force && realtimeState.lastSignature === signature) return;
	realtimeState.lastSignature = signature;

	const detailView = document.getElementById("detail-view");
	const detailVisible = Boolean(detailView && !detailView.classList.contains("hidden"));
	const currentCode = state.selectedCode;

	loadRepositoryDocuments();
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
			refreshRacioViewFromStorage(true);
			return;
		}
		if (
			key === STORAGE_KEYS.DOCUMENTOS_LISTA
			|| key === STORAGE_KEYS.DOCUMENTOS_DETALLE
			|| key.startsWith(`${STORAGE_KEYS.HISTORIAL_DATOS}_`)
		) {
			refreshRacioViewFromStorage(true);
		}
	});

	window.setInterval(() => {
		refreshRacioViewFromStorage(false);
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
		facultyFilter.addEventListener("change", () => {
			state.selectedFaculty = facultyFilter.value;
			applyFilters();
			renderCards();
			showCardsView();
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

document.addEventListener("DOMContentLoaded", () => {
	if (!guardAdminSession()) return;
	renderProfileInfo();
	setupThemeToggle();
	const logoutControls = setupLogoutModal();
	setupProfileMenu(logoutControls);
	loadRepositoryDocuments();
	populateFacultyFilter();
	applyFilters();
	renderCards();
	wireFilters();
	setupRealTimeSync();
});

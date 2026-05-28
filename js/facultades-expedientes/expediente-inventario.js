const STORAGE_KEYS = {
	EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
	DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
	DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle'
};

let expedienteActual = null;
let adjuntosActuales = [];

document.addEventListener('DOMContentLoaded', () => {
	initTheme();
	initThemeToggle();
	initProfileDropdown();
	initLogoutModal();
	cargarPerfil();

	const urlParams = new URLSearchParams(window.location.search);
	const codigo = urlParams.get('codigo') || urlParams.get('docCode');
	cargarExpediente(codigo);
	initPreviewControls();
});

function initTheme() {
	const currentTheme = localStorage.getItem('theme') || 'light';
	document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

function initThemeToggle() {
	const toggle = document.getElementById('theme-toggle');
	if (!toggle) return;

	toggle.addEventListener('click', () => {
		const isDark = document.documentElement.classList.toggle('dark');
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
	});
}

function initProfileDropdown() {
	const profileBtn = document.getElementById('profile-btn');
	const profileDropdown = document.getElementById('profile-dropdown');
	if (!profileBtn || !profileDropdown) return;

	let hideTimer = null;
	const open = () => { if (hideTimer) clearTimeout(hideTimer); profileDropdown.classList.remove('hidden', 'hide-profile'); void profileDropdown.offsetWidth; profileDropdown.classList.add('show-profile'); };
	const close = (immediate = false) => {
		if (hideTimer) clearTimeout(hideTimer);
		if (immediate) { profileDropdown.classList.remove('show-profile', 'hide-profile'); profileDropdown.classList.add('hidden'); return; }
		if (profileDropdown.classList.contains('hidden')) return;
		profileDropdown.classList.remove('show-profile'); profileDropdown.classList.add('hide-profile');
		hideTimer = setTimeout(() => { profileDropdown.classList.add('hidden'); profileDropdown.classList.remove('hide-profile'); }, 180);
	};

	profileBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.contains('hidden') ? open() : close(); });
	document.addEventListener('click', () => close());
	document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function initLogoutModal() {
	const logoutBtn = document.getElementById('logout-btn');
	const logoutModal = document.getElementById('logout-modal');
	const logoutCancel = document.getElementById('logout-cancel');
	const logoutConfirm = document.getElementById('logout-confirm');
	const profileDropdown = document.getElementById('profile-dropdown');

	if (!logoutBtn || !logoutModal) return;

	const abrir = () => {
		logoutModal.classList.remove('hidden');
		void logoutModal.offsetWidth;
	};

	const cerrar = () => {
		logoutModal.classList.add('hidden');
	};

	const ejecutar = () => {
		localStorage.clear();
		sessionStorage.clear();
		if (typeof API !== 'undefined' && API.auth && API.auth.logout) {
			Promise.resolve(API.auth.logout()).catch(() => {});
		}
		window.location.href = 'portal-inicio.html';
	};

	logoutBtn.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		profileDropdown?.classList.add('hidden');
		abrir();
	});

	logoutCancel?.addEventListener('click', cerrar);
	logoutConfirm?.addEventListener('click', ejecutar);
	logoutModal.addEventListener('click', (e) => { if (e.target === logoutModal) cerrar(); });
}

function cargarPerfil() {
	const raw = localStorage.getItem('usuario') || localStorage.getItem('sigpro_usuario') || localStorage.getItem('user');
	let user = null;
	try { user = raw ? JSON.parse(raw) : null; } catch { user = null; }

	const nombre = user?.nombre || user?.name || 'Usuario SIGPRO';
	const email = user?.correo || user?.email || 'usuario@unmsm.edu.pe';
	const rol = user?.rol || user?.role || 'Usuario';
	const facultad = user?.facultad || user?.facultadNombre || 'UNMSM';
	const iniciales = (nombre.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'US');

	document.getElementById('profile-iniciales').textContent = iniciales;
	document.getElementById('profile-nombre').textContent = nombre;
	document.getElementById('profile-email').textContent = email;
	document.getElementById('profile-rol').textContent = rol;
	document.getElementById('profile-facultad').textContent = facultad;
}

function cargarExpediente(codigo) {
	expedienteActual = obtenerInventario(codigo) || obtenerPrimeroInventario();

	if (!expedienteActual) {
		showToast('No se encontró un inventario aprobado', 'warning');
		return;
	}

	mostrarInfoTecnica(expedienteActual);
	renderAdjuntos(expedienteActual.adjuntos || []);
}

function obtenerPrimeroInventario() {
	const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
	if (!raw) return null;
	try {
		const map = JSON.parse(raw);
		const entry = Object.values(map).find((item) => item?.tipo === 'inventario' || /inventario/i.test(item?.asunto || ''));
		return entry ? construirDetalleInventario(entry.codigo, entry) : null;
	} catch {
		return null;
	}
}

function obtenerInventario(codigo) {
	if (!codigo) return null;
	const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
	if (!raw) return null;
	try {
		const map = JSON.parse(raw);
		const item = map?.[codigo];
		if (!item) return null;
		return construirDetalleInventario(codigo, item);
	} catch (error) {
		console.error('Error leyendo inventario:', error);
		return null;
	}
}

function construirDetalleInventario(codigo, item) {
	const ficha = item.fichaData || item;
	const fechaElaboracion = item.fechaElaboracion || ficha.fechaElaboracion || '-';
	const version = item.version || ficha.version || '-';
	const adjuntos = normalizarAdjuntos(codigo, item.adjuntos || ficha.adjuntos || []);

	return {
		codigo: item.codigo || codigo,
		tipo: 'inventario',
		asunto: 'Inventarios',
		descripcion: item.titulo || `Inventario ${codigo}`,
		version,
		fechaElaboracion,
		operacion: item.operacion || 'GESTION DE INVENTARIO',
		facultad: item.reporteData?.facultad || ficha.facultad || '-',
		adjuntos,
		resumenCampos: [
			{ label: 'Versión', value: version },
			{ label: 'Fecha de elaboración', value: fechaElaboracion },
			{ label: 'Documento adjunto', value: adjuntos.map((adj) => adj.nombre).join(', ') || '-' }
		]
	};
}

function normalizarAdjuntos(codigo, adjuntos) {
	let list = Array.isArray(adjuntos) ? adjuntos : [];

	try {
		const cacheRaw = sessionStorage.getItem('sigpro_adjuntos_cache');
		const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
		const cacheByCodigo = Array.isArray(cache?.[codigo]) ? cache[codigo] : [];

		if (cacheByCodigo.length > 0) {
			const cacheMap = new Map(cacheByCodigo.map((adj) => [adj.nombre || adj.name || '', adj]));
			list = list.map((adj) => {
				if (adj?.contenido || adj?.url || adj?.path) return adj;
				const key = adj?.nombre || adj?.name || '';
				const cached = cacheMap.get(key);
				return cached ? { ...adj, ...cached } : adj;
			});

			if (list.length === 0) list = cacheByCodigo;
		}
	} catch (error) {
		console.warn('No se pudo leer cache temporal:', error);
	}

	return list;
}

function mostrarInfoTecnica(detalle) {
	document.getElementById('codigo-display').textContent = detalle.codigo || '-';
	document.getElementById('info-version').textContent = detalle.version || '-';
	document.getElementById('info-fecha').textContent = detalle.fechaElaboracion || '-';
	document.getElementById('info-facultad').textContent = detalle.facultad || '-';
	document.getElementById('info-asunto').textContent = detalle.asunto || '-';
	document.getElementById('info-operacion').textContent = detalle.operacion || '-';
	document.getElementById('info-documento').textContent = detalle.descripcion || '-';
}

function renderAdjuntos(adjuntos) {
	adjuntosActuales = Array.isArray(adjuntos) ? adjuntos : [];
	const container = document.getElementById('adjuntos-container');
	if (!container) return;

	if (!adjuntosActuales.length) {
		container.innerHTML = '<div class="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 text-center md:col-span-2">No hay archivos adjuntos para este inventario.</div>';
		return;
	}

	container.innerHTML = adjuntosActuales.map((adj, index) => {
		const extension = String(adj.tipo || adj.nombre || '').split('.').pop().toLowerCase();
		const icono = extension === 'xlsx' || extension === 'xls' ? 'table_chart' : 'picture_as_pdf';
		return `
			<div class="adjunto-card" onclick="abrirAdjunto(${index})">
				<div class="flex items-center gap-4 min-w-0">
					<div class="adjunto-icon"><span class="material-symbols-outlined">${icono}</span></div>
					<div class="min-w-0">
						<p class="adjunto-name truncate">${escapeHtml(adj.nombre || 'Documento')}</p>
						<p class="adjunto-meta">${escapeHtml(adj.tipo || 'Archivo')} • ${escapeHtml(adj.tamaño || '-')} • ${escapeHtml(adj.fecha || '-')}</p>
					</div>
				</div>
				<span class="material-symbols-outlined text-primary">visibility</span>
			</div>
		`;
	}).join('');

	if (adjuntosActuales.length > 0) {
		abrirAdjunto(0, false);
	}
}

function escapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function getMimeType(filename) {
	const ext = String(filename || '').split('.').pop().toLowerCase();
	const mimeTypes = {
		pdf: 'application/pdf',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	};
	return mimeTypes[ext] || 'application/octet-stream';
}

window.abrirAdjunto = function(index) {
	abrirAdjunto(index, true);
};

function abrirAdjunto(index, desplazar = true) {
	const adjunto = adjuntosActuales[index];
	if (!adjunto) return;

	const source = adjunto.contenido || adjunto.url || adjunto.path || '';
	if (!source) {
		showToast('El archivo no tiene fuente de vista previa', 'warning');
		return;
	}

	const nombreEl = document.getElementById('preview-nombre');
	const infoEl = document.getElementById('preview-info');
	const notaEl = document.getElementById('preview-helper');
	const embed = document.getElementById('preview-embed');
	if (!nombreEl || !infoEl || !notaEl || !embed) return;

	nombreEl.textContent = adjunto.nombre || 'Archivo';
	infoEl.textContent = `${adjunto.tipo || '-'} • ${adjunto.tamaño || '-'} • ${adjunto.fecha || '-'}`;
	notaEl.textContent = /xlsx|xls/i.test(adjunto.nombre || adjunto.tipo || '')
		? 'Vista previa de Excel: si el navegador no la renderiza, use el botón Descargar.'
		: 'Vista previa del documento.';

	embed.type = getMimeType(adjunto.nombre || adjunto.tipo || '');
	embed.src = source;

	const downloadBtn = document.getElementById('btn-descargar-preview');
	if (downloadBtn) {
		downloadBtn.onclick = () => descargarAdjunto(adjunto);
	}

	window.adjuntoActual = adjunto;

	if (desplazar) {
		document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
};

window.cerrarPreview = function() {
	const embed = document.getElementById('preview-embed');
	if (embed) embed.src = '';
};

function initPreviewControls() {
	return;
}

function descargarAdjunto(adjunto) {
	const source = adjunto.contenido || adjunto.url || adjunto.path || '';
	if (!source) {
		showToast('El archivo no está disponible', 'error');
		return;
	}

	const link = document.createElement('a');
	link.href = source;
	link.download = adjunto.nombre || 'archivo';
	document.body.appendChild(link);
	link.click();
	link.remove();
}

window.exportarPDF = function() {
	if (!window.jspdf?.jsPDF) {
		showToast('No se pudo exportar el PDF', 'error');
		return;
	}

	const { jsPDF } = window.jspdf;
	const doc = new jsPDF('p', 'mm', 'a4');
	const yBase = 20;
	let y = yBase;

	doc.setFontSize(18);
	doc.setTextColor(25, 120, 229);
	doc.text('Expediente de Inventario - SIGPRO UNMSM', 20, y);
	y += 12;

	doc.setFontSize(11);
	doc.setTextColor(0, 0, 0);
	const filas = [
		['Código', expedienteActual?.codigo || '-'],
		['Versión', expedienteActual?.version || '-'],
		['Fecha de elaboración', expedienteActual?.fechaElaboracion || '-'],
		['Operación', expedienteActual?.operacion || '-']
	];

	filas.forEach(([label, value]) => {
		doc.setFont(undefined, 'bold');
		doc.text(`${label}:`, 20, y);
		doc.setFont(undefined, 'normal');
		doc.text(String(value).substring(0, 90), 65, y);
		y += 8;
	});

	y += 6;
	doc.setFont(undefined, 'bold');
	doc.text('Adjuntos', 20, y);
	y += 8;

	doc.setFont(undefined, 'normal');
	(adjuntosActuales || []).forEach((adj, index) => {
		if (y > 275) { doc.addPage(); y = 20; }
		doc.text(`${index + 1}. ${String(adj.nombre || 'Archivo').substring(0, 90)}`, 20, y);
		y += 6;
	});

	doc.save(`${expedienteActual?.codigo || 'inventario'}.pdf`);
};

function showToast(message, type = 'info', duration = 3000) {
	const container = document.getElementById('toast-container');
	if (!container) return;

	const toast = document.createElement('div');
	toast.className = `toast ${type}`;
	toast.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'}</span><span>${message}</span>`;
	container.appendChild(toast);

	setTimeout(() => {
		toast.classList.add('hiding');
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

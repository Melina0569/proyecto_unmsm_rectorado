/**
 * EXPEDIENTE REPORTE - JavaScript
 * Muestra el contenido aprobado de hoja-reportes y un cuadro complementario editable.
 */

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    REPORTE_CUADRO: 'sigpro_reporte_cuadros'
};

let reporteActual = null;
let codigoActual = null;
let cuadroComplementario = [];

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initThemeToggle();

    if (!cargarReporte()) {
        mostrarEstadoVacio();
        return;
    }

    renderizarReporte();
    cargarCuadroComplementario();
});

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
    });
}

function cargarReporte() {
    const codigoDesdeURL = new URLSearchParams(window.location.search).get('codigo');
    const actualRaw = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    const actual = actualRaw ? JSON.parse(actualRaw) : null;

    codigoActual = codigoDesdeURL || actual?.codigo || null;

    const detalleMapRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalleMap = detalleMapRaw ? JSON.parse(detalleMapRaw) : {};

    if (codigoActual && detalleMap[codigoActual]?.tipo === 'reporte') {
        reporteActual = construirModeloReporte(codigoActual, detalleMap[codigoActual]);
        return true;
    }

    const primerReporte = Object.entries(detalleMap).find(([, value]) => value?.tipo === 'reporte');
    if (primerReporte) {
        codigoActual = primerReporte[0];
        reporteActual = construirModeloReporte(codigoActual, primerReporte[1]);
        return true;
    }

    return false;
}

function construirModeloReporte(codigo, detalle) {
    const resumen = Array.isArray(detalle?.resumenCampos) ? detalle.resumenCampos : [];
    const reporteData = detalle?.reporteData || {};

    const docsRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    const docs = docsRaw ? JSON.parse(docsRaw) : [];
    const doc = docs.find((item) => item.codigo === codigo) || {};

    return {
        codigo,
        semestre: reporteData.semestre || valorResumen(resumen, 'semestre') || '-',
        fechaAprobacion: doc.fechaAprobacion || doc.fechaActualizacion || doc.fecha || '-',
        fechaElaboracion: reporteData.fechaElaboracion || valorResumen(resumen, 'fecha de elaboracion') || '-',
        responsable: reporteData.responsable || valorResumen(resumen, 'responsable') || '-',
        cargo: reporteData.cargo || valorResumen(resumen, 'cargo') || '-',
        unidadOrganicaResponsable:
            reporteData.unidadOrganicaResponsable
            || reporteData.unidadResponsable
            || valorResumen(resumen, 'unidad organica responsable')
            || valorResumen(resumen, 'unidad responsable')
            || '-',
        documentoPrincipal: reporteData.documentoPrincipal || valorResumen(resumen, 'documento principal') || '-',
        actividades: reporteData.actividades || valorResumen(resumen, 'actividades realizadas') || '-',
        resultados: reporteData.resultados || valorResumen(resumen, 'resultados obtenidos') || '-',
        observaciones: reporteData.observaciones || valorResumen(resumen, 'observaciones') || '-',
        estado: doc.estado || 'aprobado',
        adjuntos: construirAdjuntos(detalle, resumen)
    };
}

function valorResumen(resumen, etiqueta) {
    const normalizada = normalizarTexto(etiqueta);
    const campo = resumen.find((item) => normalizarTexto(item?.label) === normalizada);
    return campo?.value || '';
}

function construirAdjuntos(detalle, resumen) {
    if (Array.isArray(detalle?.adjuntos) && detalle.adjuntos.length > 0) {
        return detalle.adjuntos;
    }

    const documentoPrincipal = valorResumen(resumen, 'documento principal') || valorResumen(resumen, 'excel principal');
    const soporte = valorResumen(resumen, 'archivos de soporte') || valorResumen(resumen, 'archivos adjuntos');
    const adjuntos = [];

    if (documentoPrincipal && documentoPrincipal !== '-') {
        adjuntos.push({
            nombre: documentoPrincipal,
            icono: /\.pdf$/i.test(documentoPrincipal) ? 'picture_as_pdf' : 'table_chart',
            categoria: /\.pdf$/i.test(documentoPrincipal) ? 'pdf' : 'excel'
        });
    }

    if (soporte && soporte !== '-') {
        soporte.split(',').map((v) => v.trim()).filter(Boolean).forEach((nombre) => {
            adjuntos.push({ nombre, icono: 'insert_drive_file', categoria: 'soporte' });
        });
    }

    return adjuntos;
}

function renderizarReporte() {
    document.getElementById('codigo-display').textContent = reporteActual.codigo || '-';
    document.getElementById('rep-semestre').textContent = reporteActual.semestre || '-';
    document.getElementById('rep-fecha').textContent = formatearFechaISO(reporteActual.fechaAprobacion);
    document.getElementById('rep-responsable').textContent = reporteActual.responsable || '-';
    document.getElementById('rep-cargo').textContent = reporteActual.cargo || '-';
    setText('rep-unidad', reporteActual.unidadOrganicaResponsable || '-');
    document.getElementById('rep-estado').textContent = formatearEstado(reporteActual.estado);

    document.getElementById('rep-actividades').textContent = reporteActual.actividades || '-';
    document.getElementById('rep-resultados').textContent = reporteActual.resultados || '-';
    document.getElementById('rep-observaciones').textContent = reporteActual.observaciones || '-';

    renderizarAdjuntos(reporteActual.adjuntos || []);
}

function renderizarAdjuntos(adjuntos) {
    const excelList = document.getElementById('excel-list');
    const excelEmpty = document.getElementById('excel-empty');
    const soporteList = document.getElementById('soporte-list');
    const soporteEmpty = document.getElementById('soporte-empty');

    const principalFiles = adjuntos.filter((item) => {
        const categoria = normalizarTexto(item?.categoria);
        return categoria === 'pdf' || /\.pdf$/i.test(item?.nombre || '') || categoria === 'excel' || /\.(xlsx|xls)$/i.test(item?.nombre || '');
    });

    const soporteFiles = adjuntos.filter((item) => !principalFiles.includes(item));

    if (principalFiles.length === 0) {
        excelEmpty.classList.remove('hidden');
        excelList.innerHTML = '';
    } else {
        excelEmpty.classList.add('hidden');
        excelList.innerHTML = principalFiles.map((file) => renderAdjuntoItem(file, file.categoria === 'pdf' ? 'picture_as_pdf' : 'table_chart')).join('');
    }

    if (soporteFiles.length === 0) {
        soporteEmpty.classList.remove('hidden');
        soporteList.innerHTML = '';
    } else {
        soporteEmpty.classList.add('hidden');
        soporteList.innerHTML = soporteFiles.map((file) => renderAdjuntoItem(file, file.icono || 'insert_drive_file')).join('');
    }
}

function renderAdjuntoItem(file, iconoFallback) {
    const icono = file?.icono || iconoFallback;
    const meta = [file?.tipo, file?.tamaño].filter(Boolean).join(' | ');

    return `
        <li class="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">${icono}</span>
            <div class="min-w-0">
                <p class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">${file?.nombre || 'Archivo'}</p>
                <p class="text-xs text-slate-500">${meta || 'Adjunto registrado'}</p>
            </div>
        </li>
    `;
}

function cargarCuadroComplementario() {
    const mapRaw = localStorage.getItem(STORAGE_KEYS.REPORTE_CUADRO);
    const map = mapRaw ? JSON.parse(mapRaw) : {};
    cuadroComplementario = Array.isArray(map[codigoActual]) ? map[codigoActual] : [];

    if (cuadroComplementario.length === 0) {
        cuadroComplementario.push(crearFilaVacia());
    }

    renderizarCuadro();
}

function crearFilaVacia() {
    return {
        fechaAsignacion: '',
        concepto: '',
        descripcionGasto: '',
        montoAsignado: '',
        montoEjecutado: '',
        porcentajeEjecucion: '',
        observacion: '',
        descripcionExpandida: false,
        observacionExpandida: false
    };
}

function renderizarCuadro() {
    const tbody = document.getElementById('tbody-cuadro');
    if (!tbody) return;

    tbody.innerHTML = cuadroComplementario.map((fila, index) => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-3 text-center font-semibold text-slate-500">${index + 1}</td>
            <td class="px-4 py-3">
                <input type="date" value="${escapeHtml(fila.fechaAsignacion)}" oninput="actualizarFilaCuadro(${index}, 'fechaAsignacion', this.value)"
                    class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
            </td>
            <td class="px-4 py-3">
                <input type="text" value="${escapeHtml(fila.concepto)}" oninput="actualizarFilaCuadro(${index}, 'concepto', this.value)"
                    class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Planilla / Mantenimiento / Otros" />
            </td>
            <td class="px-4 py-3">
                <div class="space-y-2">
                    <textarea rows="${fila.descripcionExpandida ? 6 : 2}" value="${escapeHtml(fila.descripcionGasto)}" oninput="actualizarFilaCuadro(${index}, 'descripcionGasto', this.value)"
                        class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-y"
                        placeholder="Detalle de gasto o acción">${escapeHtml(fila.descripcionGasto)}</textarea>
                    <button type="button" onclick="toggleExpandirCampo(${index}, 'descripcionExpandida')"
                        class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                        <span class="material-symbols-outlined text-sm">${fila.descripcionExpandida ? 'unfold_less' : 'open_in_full'}</span>
                        ${fila.descripcionExpandida ? 'Reducir' : 'Ampliar'}
                    </button>
                </div>
            </td>
            <td class="px-4 py-3">
                <input type="number" min="0" step="0.01" value="${escapeHtml(fila.montoAsignado)}" oninput="actualizarFilaCuadro(${index}, 'montoAsignado', this.value)"
                    class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0.00" />
            </td>
            <td class="px-4 py-3">
                <input type="number" min="0" step="0.01" value="${escapeHtml(fila.montoEjecutado)}" oninput="actualizarFilaCuadro(${index}, 'montoEjecutado', this.value)"
                    class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0.00" />
            </td>
            <td class="px-4 py-3">
                <input type="text" readonly value="${escapeHtml(formatearPorcentajeFila(fila))}"
                    class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-right focus:outline-none" />
            </td>
            <td class="px-4 py-3">
                <div class="space-y-2">
                    <textarea rows="${fila.observacionExpandida ? 6 : 2}" value="${escapeHtml(fila.observacion)}" oninput="actualizarFilaCuadro(${index}, 'observacion', this.value)"
                        class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-y"
                        placeholder="Observación">${escapeHtml(fila.observacion)}</textarea>
                    <button type="button" onclick="toggleExpandirCampo(${index}, 'observacionExpandida')"
                        class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                        <span class="material-symbols-outlined text-sm">${fila.observacionExpandida ? 'unfold_less' : 'open_in_full'}</span>
                        ${fila.observacionExpandida ? 'Reducir' : 'Ampliar'}
                    </button>
                </div>
            </td>
            <td class="px-4 py-3 text-center">
                <button type="button" onclick="eliminarFilaCuadro(${index})" class="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar fila">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>
            </td>
        </tr>
    `).join('');

    renderizarResumenSemestral();
}

function actualizarFilaCuadro(index, campo, valor) {
    if (!cuadroComplementario[index]) return;
    cuadroComplementario[index][campo] = valor;

    if (campo === 'montoAsignado' || campo === 'montoEjecutado') {
        cuadroComplementario[index].porcentajeEjecucion = formatearPorcentajeFila(cuadroComplementario[index]);
    }

    renderizarResumenSemestral();
}

function toggleExpandirCampo(index, campoExpandido) {
    if (!cuadroComplementario[index]) return;
    cuadroComplementario[index][campoExpandido] = !cuadroComplementario[index][campoExpandido];
    renderizarCuadro();
}

function agregarFilaCuadro() {
    cuadroComplementario.push(crearFilaVacia());
    renderizarCuadro();
}

function eliminarFilaCuadro(index) {
    cuadroComplementario.splice(index, 1);

    if (cuadroComplementario.length === 0) {
        cuadroComplementario.push(crearFilaVacia());
    }

    renderizarCuadro();
}

function guardarCuadroComplementario() {
    const mapRaw = localStorage.getItem(STORAGE_KEYS.REPORTE_CUADRO);
    const map = mapRaw ? JSON.parse(mapRaw) : {};
    map[codigoActual] = cuadroComplementario;
    localStorage.setItem(STORAGE_KEYS.REPORTE_CUADRO, JSON.stringify(map));
    showToast('Cuadro complementario guardado', 'success');
}

function formatearPorcentajeFila(fila) {
    const asignado = Number(fila?.montoAsignado) || 0;
    const ejecutado = Number(fila?.montoEjecutado) || 0;

    if (asignado <= 0) return '0.00%';
    return `${((ejecutado / asignado) * 100).toFixed(2)}%`;
}

function renderizarResumenSemestral() {
    const filasValidas = cuadroComplementario.filter((fila) => {
        const tieneDatos = (fila?.concepto || '').trim() || (fila?.descripcionGasto || '').trim() || Number(fila?.montoAsignado) > 0 || Number(fila?.montoEjecutado) > 0;
        return Boolean(tieneDatos);
    });

    const totalAsignado = filasValidas.reduce((acc, fila) => acc + (Number(fila?.montoAsignado) || 0), 0);
    const totalEjecutado = filasValidas.reduce((acc, fila) => acc + (Number(fila?.montoEjecutado) || 0), 0);
    const n = filasValidas.length;

    const promedioAsignacion = n > 0 ? totalAsignado / n : 0;
    const promedioEjecucion = n > 0 ? totalEjecutado / n : 0;

    setText('resumen-veces-asignaron', String(n));
    setText('resumen-total-asignado', formatearMoneda(totalAsignado));
    setText('resumen-total-ejecutado', formatearMoneda(totalEjecutado));
    setText('resumen-promedio-asignacion', formatearMoneda(promedioAsignacion));
    setText('resumen-promedio-ejecucion', formatearMoneda(promedioEjecucion));
}

function formatearMoneda(valor) {
    return `S/. ${Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function exportarPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('No se pudo cargar el generador de PDF', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        doc.setFontSize(18);
        doc.setTextColor(25, 120, 229);
        doc.text('Expediente de Reporte - SIGPRO', 20, 20);

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        let y = 34;
        const datos = [
            ['Codigo', reporteActual.codigo],
            ['Semestre', reporteActual.semestre],
            ['Fecha de aprobacion', formatearFechaISO(reporteActual.fechaAprobacion)],
            ['Responsable', reporteActual.responsable],
            ['Cargo', reporteActual.cargo],
            ['Unidad orgánica Responsable', reporteActual.unidadOrganicaResponsable],
            ['Estado', formatearEstado(reporteActual.estado)]
        ];

        datos.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(`${label}:`, 20, y);
            doc.setFont(undefined, 'normal');
            doc.text(String(value || '-').substring(0, 120), 55, y);
            y += 7;
        });

        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('Contenido del reporte', 20, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        [
            `Actividades: ${reporteActual.actividades || '-'}`,
            `Resultados: ${reporteActual.resultados || '-'}`,
            `Observaciones: ${reporteActual.observaciones || '-'}`
        ].forEach((line) => {
            const lines = doc.splitTextToSize(line, 170);
            doc.text(lines, 20, y);
            y += lines.length * 5;
        });

        const fileName = `Expediente_Reporte_${reporteActual.codigo || 'SIGPRO'}.pdf`;
        doc.save(fileName);
        showToast('PDF exportado correctamente', 'success');
    } catch (error) {
        console.error(error);
        showToast('Error al exportar PDF', 'error');
    }
}

function mostrarEstadoVacio() {
    showToast('No se encontró información del reporte en repositorio', 'warning', 5000);
    document.getElementById('codigo-display').textContent = 'SIN DATOS';
}

function formatearEstado(estado) {
    const value = normalizarTexto(estado);
    if (value === 'completado' || value === 'aprobado') return 'APROBADO';
    if (value === 'en_proceso') return 'EN PROCESO';
    if (value === 'pendiente') return 'PENDIENTE';
    return String(estado || 'APROBADO').toUpperCase();
}

function formatearFechaISO(fecha) {
    if (!fecha || fecha === '-') return '-';
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return String(fecha);

    return parsed.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function normalizarTexto(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icons[type]}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

window.agregarFilaCuadro = agregarFilaCuadro;
window.eliminarFilaCuadro = eliminarFilaCuadro;
window.actualizarFilaCuadro = actualizarFilaCuadro;
window.toggleExpandirCampo = toggleExpandirCampo;
window.guardarCuadroComplementario = guardarCuadroComplementario;
window.exportarPDF = exportarPDF;

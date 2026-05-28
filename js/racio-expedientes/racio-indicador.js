const STORAGE_KEYS = {
    DOCUMENTOS_LISTA: "sigpro_documentos_lista",
    DOCUMENTOS_DETALLE: "sigpro_documentos_detalle",
    HISTORIAL_DATOS: "sigpro_historial_datos"
};

// ═══════════════════════════════════════════════════════════════
// RACIO INDICADOR - LÓGICA ESPECÍFICA DEL INDICADOR
// NOTA: El tema, perfil y logout ya se inicializan en racio-repositorio.js
// ═══════════════════════════════════════════════════════════════

const INDICATOR_KEYS = {
    HISTORIAL_DATOS: "sigpro_historial_datos",
    EXPEDIENTE_ACTUAL: "sigpro_expediente_actual"
};

const INDICATOR_REFRESH_MS = 5000;

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function formatDate(value) {
    if (!value) return "-";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function typeLabel(type) {
    var labels = {
        indicador: "Indicador",
        flujograma: "Flujograma",
        inventario: "Inventario",
        caracterizacion: "Caracterización",
        reporte: "Reporte"
    };
    return labels[type] || "Proceso";
}

function statusLabel(value) {
    var text = normalizeText(value);
    if (text.indexOf("aprob") !== -1 || text.indexOf("complet") !== -1) return "Aprobado";
    if (text.indexOf("proceso") !== -1) return "En proceso";
    return "Pendiente";
}

function formatCurrency(value) {
    var numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return "0.00";
    return numeric.toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function calcularEstadoIndicador(valor) {
    var numeric = Number.parseFloat(valor) || 0;
    if (numeric < 75) {
        return { 
            texto: "Riesgo", 
            color: "#ef4444", 
            badgeClass: "bg-red-100 text-red-700 border border-red-200" 
        };
    }
    if (numeric < 90) {
        return { 
            texto: "Estable", 
            color: "#f59e0b", 
            badgeClass: "bg-amber-100 text-amber-700 border border-amber-200" 
        };
    }
    return { 
        texto: "Optimo", 
        color: "#10b981", 
        badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200" 
    };
}

function toPercentage(value) {
    var numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return 0;
    return numeric <= 1 ? numeric * 100 : numeric;
}

function inferirTipo(codigo) {
    var prefix = String(codigo || "").split("-")[0].toUpperCase();
    if (prefix === "IND") return "indicador";
    if (prefix === "FLU" || prefix === "FL") return "flujograma";
    if (prefix === "INV") return "inventario";
    if (prefix === "CAR") return "caracterizacion";
    if (prefix === "REP" || prefix === "HR") return "reporte";
    return "reporte";
}

// ═══════════════════════════════════════════════════════════════
// GRÁFICO SVG
// ═══════════════════════════════════════════════════════════════

function buildChartSvg(points, target) {
    target = target || 60;
    var safePoints = Array.isArray(points) && points.length ? points : [0];
    var linePoints = safePoints.length === 1 ? [safePoints[0], safePoints[0]] : safePoints;
    var xStep = 800 / Math.max(linePoints.length - 1, 1);
    var toY = function(value) { return 300 - Math.max(0, Math.min(100, value)) * 3; };
    
    var areaPoints = linePoints.map(function(value, index) { 
        return (index * xStep) + "," + toY(value); 
    }).join(" L ");
    
    var resultLine = linePoints.map(function(value, index) { 
        return (index * xStep) + "," + toY(value); 
    }).join(" ");
    
    var targetLine = linePoints.map(function(_, index) { 
        return (index * xStep) + "," + toY(target); 
    }).join(" ");
    
    var circles = safePoints.map(function(value, index) {
        var cx = safePoints.length === 1 ? 400 : index * xStep;
        var cy = toY(value);
        var alwaysVisible = safePoints.length === 1 ? "always-visible" : "";
        return '<g class="chart-point-group" data-value="' + Number(value).toFixed(2) + '">' +
            '<line class="chart-point-guide" x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="300"></line>' +
            '<circle class="chart-point" cx="' + cx + '" cy="' + cy + '" r="4"></circle>' +
            '<text class="chart-value-label ' + alwaysVisible + '" x="' + (cx + 10) + '" y="' + (cy - 10) + '">' + Number(value).toFixed(2) + '%</text>' +
            '</g>';
    }).join("");

    return '<svg viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs>' +
            '<linearGradient id="chartAreaFill" x1="0" x2="0" y1="0" y2="1">' +
                '<stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22"></stop>' +
                '<stop offset="100%" stop-color="#3b82f6" stop-opacity="0"></stop>' +
            '</linearGradient>' +
        '</defs>' +
        '<path class="chart-area" d="M0,300 L ' + areaPoints + ' L 800,300 Z" fill="url(#chartAreaFill)"></path>' +
        '<polyline class="chart-line-target" points="' + targetLine + '" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4"></polyline>' +
        '<polyline class="chart-line-result" points="' + resultLine + '" fill="none" stroke="#1152d4" stroke-width="3"></polyline>' +
        circles +
    '</svg>';
}

// ═══════════════════════════════════════════════════════════════
// HISTORIAL DE DATOS
// ═══════════════════════════════════════════════════════════════

function buildHistoryRows(doc) {
    var historyKey = INDICATOR_KEYS.HISTORIAL_DATOS + "_" + doc.codigo;
    var historial = [];
    var tieneDatosReales = false;

    try {
        var raw = localStorage.getItem(historyKey);
        if (raw) {
            historial = JSON.parse(raw);
            if (!Array.isArray(historial)) historial = [];
            else tieneDatosReales = historial.length > 0;
        }
    } catch(e) {
        historial = [];
    }

    if (!tieneDatosReales && doc.detalle) {
        var detalleHistorial = doc.detalle.historial || doc.detalle.historialDatos || doc.detalle.seguimiento;
        if (Array.isArray(detalleHistorial) && detalleHistorial.length > 0) {
            historial = detalleHistorial;
            tieneDatosReales = true;
        }
    }

    if (tieneDatosReales && historial.length) {
        var normalized = historial
            .filter(function(row) { return row && (row.fecha || row.periodo || row.mes); })
            .sort(function(a, b) {
                var fechaA = String(a.fecha || a.periodo || a.mes || "");
                var fechaB = String(b.fecha || b.periodo || b.mes || "");
                return fechaA.localeCompare(fechaB);
            })
            .map(function(row, index) {
                var result = toPercentage(row.resultado || row.resultadoIndicador || row.cumplimiento || row.valor);
                var targetRaw = Number.parseFloat(row.metaPeriodo != null ? row.metaPeriodo : (row.meta || row.metaAnual || 60));
                var target = Number.isFinite(targetRaw) ? (targetRaw <= 1 ? targetRaw * 100 : targetRaw) : 60;
                var compliance = target > 0 ? Math.round((result / target) * 100) : Math.round(result);

                return {
                    number: index + 1,
                    date: formatDate(row.fecha || row.periodo || row.mes),
                    devengado: Number.parseFloat(row.devengado || row.ejecutado || row.avance || 0),
                    pim: Number.parseFloat(row.pim || row.programado || row.presupuesto || 0),
                    result: result,
                    target: target,
                    compliance: compliance,
                    analysis: String(row.analisis || row.observaciones || row.comentario || "").trim(),
                    actions: String(row.acciones || row.accionesMejora || "").trim(),
                    note: String(row.analisis || row.observaciones || "").trim() || 
                        (compliance >= 100 ? "Ejecución dentro de los parámetros previstos." : "Se recomienda reforzar acciones de seguimiento."),
                    estado: calcularEstadoIndicador(result).texto
                };
            });

        if (normalized.length) return normalized;
    }

    var seed = 0;
    for (var s = 0; s < doc.codigo.length; s++) seed += doc.codigo.charCodeAt(s);
    for (var s2 = 0; s2 < doc.descripcion.length; s2++) seed += doc.descripcion.charCodeAt(s2);
    
    var rows = [];
    var fechaBase = doc.fecha || new Date();
    
    for (var i = 0; i < 4; i++) {
        var result = 35 + ((seed + i * 7) % 55);
        var target = 60 + ((seed + i * 3) % 30);
        var compliance = Math.round((result / target) * 100);
        var fechaRow = new Date(fechaBase);
        fechaRow.setMonth(fechaRow.getMonth() - (3 - i));
        
        rows.push({
            number: i + 1,
            date: formatDate(fechaRow),
            devengado: Math.round((seed * 100 + i * 5000) / 100) * 100,
            pim: Math.round((seed * 150 + i * 8000) / 100) * 100,
            result: result,
            target: target,
            compliance: compliance,
            analysis: "",
            actions: "",
            note: compliance >= 100 
                ? "Ejecución dentro de los parámetros previstos." 
                : "Se recomienda reforzar acciones de seguimiento.",
            estado: calcularEstadoIndicador(result).texto
        });
    }
    return rows;
}

// ═══════════════════════════════════════════════════════════════
// GAUGE DE ESTADO
// ═══════════════════════════════════════════════════════════════

function renderEstadoGauge(rows) {
    var gaugeCircle = document.getElementById("circulo-progreso");
    var estadoPromedio = document.getElementById("estado-promedio");
    var estadoTexto = document.getElementById("estado-texto");

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

    var average = rows.reduce(function(sum, row) { return sum + row.result; }, 0) / rows.length;
    var estado = calcularEstadoIndicador(average);
    var normalized = Math.max(0, Math.min(100, average));
    var circumference = 502;
    var offset = circumference - (normalized / 100) * circumference;

    gaugeCircle.style.transition = "stroke-dashoffset 1s ease-out, stroke 0.5s ease";
    gaugeCircle.style.strokeDashoffset = offset;
    gaugeCircle.style.stroke = estado.color;

    estadoPromedio.textContent = estado.texto;
    estadoPromedio.style.color = estado.color;
    estadoTexto.textContent = "Promedio " + average.toFixed(1) + "%";
    estadoTexto.className = "text-xs mt-2 px-3 py-1 rounded-full font-bold " + estado.badgeClass;
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL DOCUMENTO DESDE LOCALSTORAGE
// ═══════════════════════════════════════════════════════════════

function buildDocFromStorage(codigo) {
    if (!codigo) return null;

    var raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
    var docs = [];
    var doc = null;

    try {
        docs = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(docs)) docs = [];
    } catch(e) {
        docs = [];
    }

    for (var i = 0; i < docs.length; i++) {
        var d = docs[i];
        var docCodigo = d.codigo || d.code || d.id || "";
        if (docCodigo === codigo) {
            doc = d;
            break;
        }
    }

    if (!doc) {
        var expRaw = localStorage.getItem("sigpro_expedientes_lista");
        if (expRaw) {
            try {
                var expedientes = JSON.parse(expRaw);
                if (Array.isArray(expedientes)) {
                    for (var j = 0; j < expedientes.length; j++) {
                        var exp = expedientes[j];
                        if ((exp.codigo || exp.id) === codigo) {
                            doc = exp;
                            break;
                        }
                    }
                }
            } catch(e) {}
        }
    }

    if (!doc) {
        var actualRaw = localStorage.getItem(INDICATOR_KEYS.EXPEDIENTE_ACTUAL);
        if (actualRaw) {
            try {
                var actual = JSON.parse(actualRaw);
                if ((actual.codigo || actual.id) === codigo) {
                    doc = actual;
                }
            } catch(e) {}
        }
    }

    if (!doc) return null;

    var codigoRef = doc.codigo || doc.code || doc.id || codigo;
    var tipo = doc.tipo || inferirTipo(codigoRef);
    var fechaStr = doc.fechaAprobacion || doc.fechaActualizacion || doc.fecha || doc.updatedAt;
    var fecha = fechaStr ? new Date(fechaStr) : new Date();

    var detalle = null;
    var detalleRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
    if (detalleRaw) {
        try {
            var detalleMap = JSON.parse(detalleRaw);
            detalle = detalleMap[codigoRef] || detalleMap[doc.id] || null;
        } catch(e) {}
    }

    return {
        id: doc.id || codigoRef,
        codigo: codigoRef,
        descripcion: doc.descripcion || doc.nombre || doc.nombreIndicador || doc.titulo || ("Documento " + codigoRef),
        facultad: doc.nombreFacultad || doc.facultad || doc.facultadNombre || doc.generadoPor || "UNMSM",
        unidad: doc.unidad || doc.area || doc.responsable || doc.oficinaResponsable || "Oficina responsable",
        tipo: tipo,
        estado: statusLabel(doc.estado || doc.status || "aprobado"),
        fecha: fecha,
        detalle: detalle,
        nombreIndicador: doc.nombreIndicador || doc.nombre || doc.descripcion,
        macroProceso: doc.macroProceso || doc.proceso || "Gestión Institucional",
        tipoProceso: doc.tipoProceso || "Misional"
    };
}

// ═══════════════════════════════════════════════════════════════
// INFORMACIÓN TÉCNICA
// ═══════════════════════════════════════════════════════════════

function getTechnicalDetail(doc) {
    var detail = doc.detalle || {};
    var indicadorData = detail.indicadorData || detail.fichaData || detail.fichaIndicador || {};
    var resumenCampos = detail.resumenCampos || [];
    
    function buscarCampo(labelObjetivo) {
        if (!Array.isArray(resumenCampos)) return "";
        var target = String(labelObjetivo || "").toLowerCase().trim();
        for (var i = 0; i < resumenCampos.length; i++) {
            var item = resumenCampos[i];
            if (String(item.label || "").toLowerCase().trim() === target) {
                return String(item.value || "").trim();
            }
        }
        return "";
    }

    var unidadCandidatos = [
        indicadorData.unidadResponsable,
        indicadorData.oficinaResponsable,
        indicadorData.areaResponsable,
        indicadorData.oficina,
        indicadorData.unidad,
        doc.unidad,
        doc.responsable,
        doc.facultad
    ];
    
    var unidadResponsable = "Oficina responsable";
    for (var u = 0; u < unidadCandidatos.length; u++) {
        var val = String(unidadCandidatos[u] || "").trim();
        if (val && val.indexOf("@") === -1) {
            unidadResponsable = val;
            break;
        }
    }

    var variables = indicadorData.variables || indicadorData.variable;
    if (Array.isArray(variables)) {
        variables = variables.join("\n");
    } else {
        variables = String(variables || buscarCampo("Variables") || "-");
    }

    var formula = indicadorData.formulaDefinicion 
        || indicadorData.formula 
        || indicadorData.fórmula 
        || indicadorData.formulaIndicador
        || buscarCampo("Fórmula del Indicador")
        || buscarCampo("Fórmula")
        || "Admitidos / Matriculados × 100%";

    return {
        version: indicadorData.version || indicadorData.versión || indicadorData.versao || buscarCampo("Versión") || "1",
        tipoProceso: indicadorData.tipoProceso 
            || indicadorData.tipo_proceso 
            || indicadorData.procesoTipo 
            || buscarCampo("Tipo de Proceso")
            || doc.tipoProceso 
            || "Misional",
        proceso: indicadorData.macroProceso 
            || indicadorData.proceso 
            || indicadorData.nombreProceso 
            || buscarCampo("Proceso")
            || buscarCampo("Macro Proceso")
            || doc.macroProceso 
            || "-",
        unidad: unidadResponsable,
        objetivo: indicadorData.objetivoProceso 
            || indicadorData.objetivo 
            || buscarCampo("Objetivo del Proceso")
            || buscarCampo("Objetivo")
            || doc.descripcion 
            || "-",
        nombreIndicador: indicadorData.nombreIndicador 
            || indicadorData.indicador 
            || indicadorData.nombre 
            || buscarCampo("Nombre del Indicador")
            || buscarCampo("Indicador")
            || doc.nombreIndicador 
            || doc.descripcion 
            || "-",
        frecuencia: indicadorData.frecuencia 
            || buscarCampo("Frecuencia")
            || "Trimestral",
        variables: variables,
        formula: formula,
        fuente: indicadorData.fuente 
            || indicadorData.source 
            || buscarCampo("Fuente")
            || buscarCampo("Fuente de Información")
            || "Sistema de Matrícula",
        meta: indicadorData.meta 
            || indicadorData.metaValor 
            || buscarCampo("Meta")
            || buscarCampo("Meta Anual")
            || "90%"
    };
}

function buildTechnicalInfoMarkup(doc) {
    var technical = getTechnicalDetail(doc);
    var variables = Array.isArray(technical.variables)
        ? technical.variables.join("\n")
        : String(technical.variables || "-");
    
    var rawFormula = String(technical.formula || "").replace(/\s+/g, " ").trim();
    var multMatch = rawFormula.match(/^(.*?)(?:\s*[×x*]\s*)(.+)$/i);
    var mainFormula = (multMatch ? multMatch[1] : rawFormula) || "Admitidos / Matriculados";
    var multiplierValue = multMatch && multMatch[2] ? multMatch[2].trim() : "100%";
    var slashParts = mainFormula.split("/");
    var formulaLeft = slashParts[0] ? slashParts[0].trim() : "Admitidos";
    var formulaRight = slashParts.slice(1).join("/").trim() || "Matriculados";
    var showMultiplier = Boolean(multMatch);

    return '<div class="detail-field detail-span-1">' +
            '<p class="label">CÓDIGO</p>' +
            '<p class="value font-mono text-blue-600">' + doc.codigo + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">VERSIÓN</p>' +
            '<p class="value">' + technical.version + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">TIPO DE PROCESO</p>' +
            '<p class="value">' + technical.tipoProceso + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">PROCESO</p>' +
            '<p class="value">' + technical.proceso + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">FACULTAD</p>' +
            '<p class="value">' + doc.facultad + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">OFICINA O UNIDAD RESPONSABLE</p>' +
            '<p class="value">' + technical.unidad + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-2">' +
            '<p class="label">OBJETIVO DEL PROCESO</p>' +
            '<p class="value">' + technical.objetivo + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-2">' +
            '<p class="label">NOMBRE DEL INDICADOR</p>' +
            '<p class="value">' + technical.nombreIndicador + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">FRECUENCIA</p>' +
            '<p class="value"><span class="detail-chip">' + technical.frecuencia + '</span></p>' +
        '</div>' +
        '<div class="detail-field detail-span-3">' +
            '<p class="label">VARIABLES</p>' +
            '<p class="value detail-multiline">' + variables + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-2">' +
            '<p class="label">FÓRMULA DEL INDICADOR</p>' +
            '<div class="formula-card">' +
                '<div class="formula-main">' +
                    '<span>' + formulaLeft + '</span>' +
                    '<span class="formula-divider"></span>' +
                    '<span>' + formulaRight + '</span>' +
                '</div>' +
                (showMultiplier ? '<span class="formula-multiplier">× ' + multiplierValue + '</span>' : '') +
            '</div>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">FUENTE</p>' +
            '<p class="value">' + technical.fuente + '</p>' +
        '</div>' +
        '<div class="detail-field detail-span-1">' +
            '<p class="label">META</p>' +
            '<p class="value detail-meta">' + technical.meta + '</p>' +
        '</div>';
}

// ═══════════════════════════════════════════════════════════════
// RENDERIZADO PRINCIPAL
// ═══════════════════════════════════════════════════════════════

function renderDetail(doc) {
    if (!doc) {
        console.error("No se encontró el documento");
        var descEl = document.getElementById("detalle-descripcion");
        if (descEl) descEl.textContent = "Documento no encontrado. Verifique el código o vuelva al repositorio.";
        return;
    }

    console.log("Renderizando documento:", doc.codigo, doc);

    var descEl = document.getElementById("detalle-descripcion");
    if (descEl) descEl.textContent = doc.descripcion;

    var codePill = document.getElementById("detail-code-pill");
    if (codePill) codePill.textContent = doc.codigo;

    var detailBody = document.getElementById("detail-info-body");
    if (detailBody) {
        detailBody.innerHTML = buildTechnicalInfoMarkup(doc);
        console.log("Información técnica renderizada");
    }

    var historyRows = buildHistoryRows(doc);

    var chartTitle = document.getElementById("detail-chart-title");
    if (chartTitle) {
        chartTitle.textContent = "Tendencia de Resultados - " + doc.codigo;
    }

    var chartGrid = document.getElementById("detail-chart-grid");
    if (chartGrid) {
        if (!historyRows.length) {
            chartGrid.innerHTML = '<div class="flex h-full items-center justify-center text-slate-400 text-sm font-medium">Sin datos de seguimiento registrados</div>';
        } else {
            var points = historyRows.map(function(row) { return row.result; });
            var avgTarget = historyRows.reduce(function(sum, row) { return sum + (Number.parseFloat(row.target) || 0); }, 0) / historyRows.length;
            chartGrid.innerHTML = buildChartSvg(points, avgTarget || 60);
        }
        console.log("Gráfico renderizado, filas:", historyRows.length);
    }

    var tableBody = document.getElementById("detail-table-body");
    if (tableBody) {
        if (!historyRows.length) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-slate-400 py-8">Sin datos de seguimiento registrados</td></tr>';
        } else {
            var rowsHtml = historyRows.map(function(row) {
                var estadoInfo = calcularEstadoIndicador(row.result);
                return '<tr>' +
                    '<td>' + row.number + '</td>' +
                    '<td>' + row.date + '</td>' +
                    '<td>' + formatCurrency(row.devengado) + '</td>' +
                    '<td>' + formatCurrency(row.pim) + '</td>' +
                    '<td>' + row.result + '%</td>' +
                    '<td>' + row.target + '%</td>' +
                    '<td><span class="detail-badge ' + estadoInfo.badgeClass + '">' + row.estado + '</span></td>' +
                    '<td>' + (row.analysis || row.note || "-") + '</td>' +
                    '<td>' + (row.actions || "-") + '</td>' +
                '</tr>';
            }).join("");
            tableBody.innerHTML = rowsHtml;
        }
        console.log("Tabla renderizada");
    }

    renderEstadoGauge(historyRows);
}

function renderCurrentDetailFromStorage() {
    var currentCode = window.__racioDetailCode;
    if (!currentCode) return;
    
    console.log("Refrescando documento:", currentCode);
    var doc = buildDocFromStorage(currentCode);
    if (doc) {
        renderDetail(doc);
    }
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑAS
// ═══════════════════════════════════════════════════════════════

function setupTabs() {
    var tabs = document.querySelectorAll('.indicator-tab');
    var panels = document.querySelectorAll('.tab-panel');
    
    console.log("Configurando pestañas:", tabs.length, "tabs,", panels.length, "panels");
    
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var targetTab = tab.getAttribute('data-tab');
            console.log("Clic en pestaña:", targetTab);
            
            tabs.forEach(function(t) { t.classList.remove('active'); });
            panels.forEach(function(p) { p.classList.remove('active'); });
            
            tab.classList.add('active');
            var targetPanel = document.getElementById('tab-' + targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
                console.log("Panel activado:", 'tab-' + targetTab);
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// PERFIL DE ADMINISTRADOR RACIO + MODAL DE LOGOUT
// (Misma lógica que racio-repositorio.js)
// ═══════════════════════════════════════════════════════════════

function getCurrentUser() {
    if (typeof API !== "undefined" && API.auth && typeof API.auth.getUser === "function") {
        return API.auth.getUser();
    }
    try {
        var raw = localStorage.getItem("unmsm_user");
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function initialsFromName(name) {
    var tokens = String(name || "").split(" ").filter(Boolean).slice(0, 2);
    if (!tokens.length) return "RA";
    return tokens.map(function(token) {
        return token.charAt(0).toUpperCase();
    }).join("");
}

function guardAdminSession() {
    var loginPage = "portal-inicio-racio.html";
    var userPanelPage = "facultades-inicio.html";
    if (typeof API !== "undefined" && API.auth && typeof API.auth.isAuthenticated === "function") {
        if (!API.auth.isAuthenticated()) {
            window.location.replace(loginPage);
            return false;
        }
        var user = typeof API.auth.getUser === "function" ? API.auth.getUser() : null;
        var role = String(user?.rol || "").toLowerCase();
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
    var user = getCurrentUser();
    var displayName = user?.nombreCompleto || user?.nombre || "Administrador Racio";
    var displayRole = user?.rol || "Administrador Global";
    var displayEmail = user?.correo || user?.email || "admin@unmsm.edu.pe";
    var avatar = document.getElementById("profile-avatar");
    var name = document.getElementById("profile-name");
    var role = document.getElementById("profile-role");
    var menuName = document.getElementById("profile-menu-name");
    var menuEmail = document.getElementById("profile-menu-email");
    if (avatar) avatar.textContent = initialsFromName(displayName);
    if (name) name.textContent = displayName;
    if (role) role.textContent = displayRole;
    if (menuName) menuName.textContent = displayName;
    if (menuEmail) menuEmail.textContent = displayEmail;
}

function setupThemeToggle() {
    var body = document.getElementById("racio-body");
    var toggle = document.getElementById("theme-toggle");
    var icon = document.getElementById("theme-icon");
    if (!body || !toggle || !icon) return;
    var savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
        body.classList.add("theme-dark");
        icon.textContent = "light_mode";
    }
    toggle.addEventListener("click", function() {
        var isDark = body.classList.toggle("theme-dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        icon.textContent = isDark ? "light_mode" : "dark_mode";
    });
}

function setupLogoutModal() {
    var modal = document.getElementById("logout-modal");
    var backdrop = document.getElementById("logout-modal-backdrop");
    var cancelButton = document.getElementById("logout-cancel");
    var confirmButton = document.getElementById("logout-confirm");
    if (!modal || !cancelButton || !confirmButton) return null;

    var closeModal = function() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    };
    var openModal = function() {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
    };
    var performLogout = function() {
        try {
            if (typeof API !== "undefined" && API.auth && typeof API.auth.logout === "function") {
                API.auth.logout();
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
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
    return { openModal: openModal };
}

function setupProfileMenu(logoutControls) {
    var profileToggle = document.getElementById("profile-toggle");
    var profileMenu = document.getElementById("profile-menu");
    var logoutButton = document.getElementById("logout-button");
    if (!profileToggle || !profileMenu) return;

    var closeMenu = function() {
        profileMenu.classList.remove("is-open");
        profileToggle.classList.remove("open");
        profileToggle.setAttribute("aria-expanded", "false");
    };

    profileToggle.addEventListener("click", function() {
        var open = profileMenu.classList.contains("is-open");
        if (open) {
            closeMenu();
            return;
        }
        profileMenu.classList.add("is-open");
        profileToggle.classList.add("open");
        profileToggle.setAttribute("aria-expanded", "true");
    });

    document.addEventListener("click", function(event) {
        if (!profileMenu.contains(event.target) && !profileToggle.contains(event.target)) {
            closeMenu();
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener("click", function() {
            closeMenu();
            if (logoutControls && logoutControls.openModal) logoutControls.openModal();
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", function() {
    console.log("=== RACIO INDICADOR INICIADO ===");
    
    // ── PERFIL Y SEGURIDAD (misma lógica que repositorio) ──
    if (!guardAdminSession()) return;
    renderProfileInfo();
    setupThemeToggle();
    var logoutControls = setupLogoutModal();
    setupProfileMenu(logoutControls);
    
    // ── LÓGICA DEL INDICADOR ──
    var params = new URLSearchParams(window.location.search);
    var codigo = params.get("codigo") || "";
    window.__racioDetailCode = codigo;

    console.log("Código del documento:", codigo);

    setupTabs();

    if (!codigo) {
        console.warn("No se proporcionó código de documento en la URL");
        var descEl = document.getElementById("detalle-descripcion");
        if (descEl) descEl.textContent = "No se especificó un documento. Vuelva al repositorio y seleccione uno.";
        return;
    }

    var doc = buildDocFromStorage(codigo);
    if (doc) {
        console.log("Documento encontrado:", doc);
        renderDetail(doc);
    } else {
        console.error("No se encontró el documento con código:", codigo);
        var descEl = document.getElementById("detalle-descripcion");
        if (descEl) descEl.textContent = "Documento no encontrado. Verifique el código o vuelva al repositorio.";
    }

    window.addEventListener("storage", function(event) {
        var key = event.key || "";
        if (!key || key === STORAGE_KEYS.DOCUMENTOS_LISTA || key.indexOf(INDICATOR_KEYS.HISTORIAL_DATOS + "_") === 0) {
            renderCurrentDetailFromStorage();
        }
    });

    window.setInterval(function() {
        renderCurrentDetailFromStorage();
    }, INDICATOR_REFRESH_MS);
});
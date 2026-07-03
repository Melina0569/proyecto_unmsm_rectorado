/**
 * INDICATORS MODULE
 * Maneja la lógica de indicadores de gestión
 */
// ============================================
// PROTECCIÓN: Verificar que API esté disponible
// ============================================
function ensureApi() {
    if (typeof window.API === 'undefined' || !window.API) {
        console.error('❌ API no está definida. Posibles causas:');
        console.error('   1. api.js no se cargó (verifica <script src="js/api.js">)');
        console.error('   2. api.js tiene un error de JavaScript (revisa la Consola)');
        console.error('   3. El orden de scripts es incorrecto');
        return false;
    }
    return true;
}

// Alias global para compatibilidad
var API = window.API;

// Estado actual
let currentIndicators = [];
let selectedIndicator = null;
let selectedFacultyId = '';
let realtimeRefreshIntervalId = null;
let lastRealtimeSignature = '';
// Última metadata de la última consulta remota (status, total, error)
let lastIndicatorsMeta = null;

const INDICATOR_STORAGE_KEYS = {
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
    INDICADORES_DETALLE: 'sigpro_indicadores_detalle',
    HISTORIAL_PREFIX: 'sigpro_historial_datos_'
};

function safeParseArray(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function safeParseObject(raw) {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function normalizeFacultyId(value) {
    if (value === null || value === undefined || value === '' || value === 'all') return 'all';
    return String(value).trim();
}

function resolveIndicatorType(rawType) {
    const normalized = String(rawType || '').toLowerCase().trim();
    if (normalized === 'estrategico' || normalized === 'estratégico' || normalized === 'strategic') return 'strategic';
    if (normalized === 'misional' || normalized === 'missional') return 'missional';
    if (normalized === 'de-apoyo' || normalized === 'de apoyo' || normalized === 'soporte' || normalized === 'support') return 'support';
    return 'support';
}

function normalizeProcessCode(value) {
    const text = String(value || '').toUpperCase().trim();
    if (!text) return '';

    const match = text.match(/\b(PE|PM|PS)[\.\-_\s]?(\d{1,2})\b/);
    if (!match) return '';

    const prefix = match[1];
    const number = String(match[2]).padStart(2, '0');
    return `${prefix}.${number}`;
}

function normalizeProcessText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function inferProcessCodeFromName(value) {
    const name = normalizeProcessText(value);
    if (!name) return '';

    const aliases = [
        ['gestion estrategica', 'PE.01'],
        ['calidad y mejora continua', 'PE.02'],
        ['gestion de la calidad', 'PE.02'],
        ['relaciones interinstitucionales', 'PE.03'],
        ['formacion academica', 'PM.01'],
        ['gestion de la formacion', 'PM.01'],
        ['gestion de la investigacion', 'PM.02'],
        ['responsabilidad y vinculacion social', 'PM.03'],
        ['admision y matricula', 'PS.01'],
        ['gestion documental', 'PS.02'],
        ['bienestar integral', 'PS.03'],
        ['recursos economicos', 'PS.04'],
        ['recursos humanos', 'PS.05'],
        ['abastecimiento y servicios', 'PS.06'],
        ['tecnologia de la informacion', 'PS.07'],
        ['actividades productivas', 'PS.08'],
        ['recursos bibliograficos', 'PS.09'],
        ['gestion de la comunicacion', 'PS.10']
    ];

    const found = aliases.find(([key]) => name.includes(key));
    return found ? found[1] : '';
}

function resolveProcessCode(item) {
    const candidates = [
        item?.codigoProceso,
        item?.procesoCodigo,
        item?.macroProcesoCodigo,
        item?.macroProceso,
        item?.macroProcesoTexto,
        item?.macroProcesoNombre,
        item?.proceso,
        item?.procesoNombre
    ];

    for (const candidate of candidates) {
        const normalized = normalizeProcessCode(candidate);
        if (normalized) return normalized;
    }

    for (const candidate of candidates) {
        const inferred = inferProcessCodeFromName(candidate);
        if (inferred) return inferred;
    }

    return '';
}

function getIndicatorColorByType(type) {
    if (type === 'strategic') return 'blue';
    if (type === 'missional') return 'teal';
    return 'orange';
}

function calculateEstadoFromValor(valor) {
    if (valor < 75) return 'Crítico';
    if (valor < 90) return 'Riesgo';
    return 'Óptimo';
}

function formatPeriodo(fecha) {
    const raw = String(fecha || '').trim();
    if (!raw) return '-';
    if (/^\d{4}-\d{2}$/.test(raw)) {
        const [year, month] = raw.split('-');
        const monthNumber = Number(month);
        if (monthNumber >= 1 && monthNumber <= 12) {
            const semester = monthNumber <= 6 ? 'I' : 'II';
            return `${year}-${semester}`;
        }
    }
    return raw;
}

function readSeguimientoFromStorage(codigo, metaFallback = 0) {
    if (!codigo) return [];

    const historyKey = `${INDICATOR_STORAGE_KEYS.HISTORIAL_PREFIX}${codigo}`;
    const historyRows = safeParseArray(localStorage.getItem(historyKey));
    if (historyRows.length === 0) return [];

    return historyRows
        .map((item) => {
            const resultadoRaw = Number(item?.resultado ?? item?.valor ?? 0);
            const valor = Number.isFinite(resultadoRaw)
                ? (resultadoRaw <= 1 ? resultadoRaw * 100 : resultadoRaw)
                : 0;
            const meta = Number(item?.metaPeriodo ?? item?.meta ?? metaFallback) || 0;

            return {
                periodo: item?.periodo || formatPeriodo(item?.fecha),
                N: Number(item?.N ?? item?.devengado ?? 0),
                D: Number(item?.D ?? item?.pim ?? 0),
                meta,
                valor: Number(valor.toFixed(1)),
                estado: item?.estado || calculateEstadoFromValor(valor),
                observaciones: item?.observaciones || item?.analisis || item?.acciones || ''
            };
        })
        .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
}

function cleanVariableLabel(value, label) {
    const text = String(value || '').trim();
    if (!text) return '';

    const regex = new RegExp(`^${label}\\s*[:=]\\s*`, 'i');
    return text.replace(regex, '').trim();
}

function extractVariables(rawVariables, fallbackN = '', fallbackD = '') {
    const raw = String(rawVariables || '').replace(/\r/g, '').trim();
    let variableN = String(fallbackN || '').trim();
    let variableD = String(fallbackD || '').trim();

    if (!raw) {
        return {
            variableN: cleanVariableLabel(variableN, 'N') || 'N',
            variableD: cleanVariableLabel(variableD, 'D') || 'D'
        };
    }

    const normalized = raw
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const nMatch = normalized.match(/(?:^|\b)N\s*[:=]\s*(.+?)(?=\s+(?:D\s*[:=]|$))/i);
    const dMatch = normalized.match(/(?:^|\b)D\s*[:=]\s*(.+)$/i);

    if (nMatch && nMatch[1]) variableN = nMatch[1].trim();
    if (dMatch && dMatch[1]) variableD = dMatch[1].trim();

    if ((!nMatch || !dMatch) && normalized.includes('/')) {
        const [partN, partD] = normalized.split('/');
        if (!nMatch && partN) variableN = partN.trim();
        if (!dMatch && partD) variableD = partD.trim();
    }

    return {
        variableN: cleanVariableLabel(variableN, 'N') || 'N',
        variableD: cleanVariableLabel(variableD, 'D') || 'D'
    };
}

function getStoredIndicators() {
    // 🔥 SOLO lee indicadores que fueron previamente guardados desde la API
    // No genera datos ficticios. Si no hay nada en localStorage, devuelve [].
    
    const documentosLista = safeParseArray(localStorage.getItem(INDICATOR_STORAGE_KEYS.DOCUMENTOS_LISTA));
    const detalleIndicadores = safeParseObject(localStorage.getItem(INDICATOR_STORAGE_KEYS.INDICADORES_DETALLE));
    const detalleDocumentos = safeParseObject(localStorage.getItem(INDICATOR_STORAGE_KEYS.DOCUMENTOS_DETALLE));

    const activeIndicatorCodes = new Set(
        documentosLista
            .filter((doc) => {
                const tipo = String(doc?.tipo || doc?.asunto || '').toLowerCase().trim();
                const estado = String(doc?.estado || '').toLowerCase().trim();
                if (!tipo.includes('indic')) return false;
                if (estado.includes('elimin') || estado.includes('inactiv')) return false;
                return true;
            })
            .map((doc) => String(doc?.codigo || '').trim())
            .filter(Boolean)
    );

    // Si no hay códigos activos, no hay nada que mostrar
    if (activeIndicatorCodes.size === 0) {
        return [];
    }

    const byCode = new Map();

    Object.entries(detalleIndicadores).forEach(([codigo, raw]) => {
        if (!raw) return;
        if (!activeIndicatorCodes.has(String(codigo))) return;
        byCode.set(codigo, { ...raw, codigo });
    });

    Object.entries(detalleDocumentos).forEach(([codigo, raw]) => {
        if (!activeIndicatorCodes.has(String(codigo))) return;
        const payload = raw?.fichaData || raw?.indicadorData;
        if (!payload) return;
        if (!byCode.has(codigo)) {
            byCode.set(codigo, { ...payload, codigo });
        }
    });

    return Array.from(byCode.values())
        .filter((item) => item?.codigo && (item?.tipoDocumento === 'indicador' || item?.tipo === 'indicador' || item?.nombreIndicador))
        .map((item) => {
            const type = resolveIndicatorType(item.tipoProceso);
            const meta = Number(item.meta) || 0;
            const seguimiento = readSeguimientoFromStorage(item.codigo, meta);
            const extractedVariables = extractVariables(item.variables, item.variableN, item.variableD);

            return {
                id: String(item.codigo),
                title: item.nombreIndicador || `Indicador ${item.codigo}`,
                code: item.codigo,
                processCode: resolveProcessCode(item),
                version: item.version || '1',
                desc: item.objetivoProceso || 'Indicador registrado por la facultad.',
                facultyId: normalizeFacultyId(item.facultadId),
                type,
                icon: 'monitoring',
                color: getIndicatorColorByType(type),
                proceso: item.macroProcesoNombre || item.macroProceso || item.proceso || '-',
                responsable: item.unidadResponsable || 'Unidad responsable',
                objetivo: item.objetivoProceso || '-',
                indicadorNombre: item.nombreIndicador || '-',
                frecuencia: item.frecuencia || '-',
                variableN: extractedVariables.variableN,
                variableD: extractedVariables.variableD,
                fuente: item.fuente || '-',
                meta,
                seguimiento
            };
        });
}

function getAllIndicators() {
    return getStoredIndicators();
}

/**
 * Normaliza un objeto de la API pública al formato que espera la UI
 */
function mapApiIndicatorToUi(item) {
    if (!item || typeof item !== 'object') return null;

    const facultyId = item.faculty?.id || item.faculty?.code || item.facultyId || item.facultadId || 'all';
    const meta = Number(item.target ?? item.meta ?? 0) || 0;

    const seguimiento = Array.isArray(item.trackingData)
        ? item.trackingData.map((t) => {
            const resultadoRaw = Number(t.result ?? t.compliancePercentage ?? 0);
            const valor = Number.isFinite(resultadoRaw) ? (resultadoRaw <= 1 ? resultadoRaw * 100 : resultadoRaw) : 0;
            const periodo = t.month || t.period || formatPeriodo(t.month) || '-';

            return {
                periodo,
                N: Number(t.accrued ?? t.N ?? 0),
                D: Number(t.pim ?? t.D ?? 0),
                meta: Number(t.periodTarget ?? t.metaPeriodo ?? meta) || meta,
                valor: Number(valor.toFixed(1)),
                estado: t.complianceStatus || t.status || calculateEstadoFromValor(valor),
                observaciones: t.observations || t.analysis || t.improvementActions || ''
            };
        })
        : [];

    const variables = String(item.variables || item.variablesText || item.formula || '') || '';
    const extracted = extractVariables(variables, item.variableN, item.variableD);

    return {
        id: String(item.id || item.code || item.codigo || generateId()),
        title: item.indicatorName || item.title || item.nombreIndicador || item.name || `Indicador ${item.code || item.codigo || ''}`.trim(),
        code: item.code || item.codigo || item.id || 'IND',
        version: item.version || item.currentVersion || item.version || '1',
        desc: item.processObjective || item.descripcion || item.desc || item.objetivo || '-',
        facultyId: normalizeFacultyId(facultyId),
        type: resolveIndicatorType(item.processType || item.type || item.tipo || item.tipoProceso),
        icon: item.icon || 'monitoring',
        color: getIndicatorColorByType(resolveIndicatorType(item.processType || item.type || item.tipo || item.tipoProceso)),
        proceso: item.macroProcess || item.macroProceso || item.process || item.proceso || '-',
        responsable: item.responsibleUnit || item.responsable || '-',
        objetivo: item.processObjective || item.objetivo || '-',
        indicadorNombre: item.indicatorName || item.nombreIndicador || item.title || '-',
        frecuencia: (item.frequency || item.frecuencia || '').toString(),
        variableN: extracted.variableN || 'N',
        variableD: extracted.variableD || 'D',
        fuente: item.dataSource || item.fuente || '-',
        meta,
        seguimiento
    };
}

async function getIndicators(page = 1, limit = 20) {
    try {
        const res = await API.public.indicators.getIndicators(page, limit);
        if (!res) return { success: false, data: [], status: 0, error: 'No response' };

        const data = Array.isArray(res.data)
            ? res.data
            : (Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res) ? res : []));

        const status = res.status || (res.data && res.data.status) || (res.success ? 200 : 0);
        const error = res.error || (res.success ? null : (res.data?.message || `HTTP ${status}`));

        return { success: !!res.success, data, status, error, pagination: res.data?.pagination || res.data?.meta || null };
    } catch (error) {
        return { success: false, data: [], status: 0, error: String(error) };
    }
}

async function getIndicatorsByFaculty(
    facultyId,
    page = 1,
    limit = 20
) {
    try {
        if (!facultyId) return { success: false, data: [], error: 'facultyId requerido' };

        const res = await API.public.indicators.getAll({ facultyId, page, limit });
        if (!res) return { success: false, data: [], status: 0, error: 'No response' };

        const data = Array.isArray(res.data)
            ? res.data
            : (Array.isArray(res.data?.items) ? res.data.items : []);

        const status = res.status || (res.data && res.data.status) || (res.success ? 200 : 0);
        const error = res.error || (res.success ? null : (res.data?.message || `HTTP ${status}`));

        return { success: !!res.success, data, status, error, pagination: res.data?.pagination || res.data?.meta || null };
    } catch (error) {
        return { success: false, data: [], status: 0, error: String(error) };
    }
}

function buildRealtimeSignature() {
    const baseKeys = [
        INDICATOR_STORAGE_KEYS.DOCUMENTOS_LISTA,
        INDICATOR_STORAGE_KEYS.DOCUMENTOS_DETALLE,
        INDICATOR_STORAGE_KEYS.INDICADORES_DETALLE
    ];
    const signatureChunks = baseKeys.map((key) => `${key}:${localStorage.getItem(key) || ''}`);

    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(INDICATOR_STORAGE_KEYS.HISTORIAL_PREFIX)) continue;
        signatureChunks.push(`${key}:${localStorage.getItem(key) || ''}`);
    }

    return signatureChunks.join('||');
}

function refreshIndicatorsRealtime() {
    const nextSignature = buildRealtimeSignature();
    if (nextSignature === lastRealtimeSignature) return;

    lastRealtimeSignature = nextSignature;

    const selectedId = selectedIndicator?.id;
    loadIndicators(selectedFacultyId || null);

    if (!selectedId) return;

    const stillExists = currentIndicators.find((item) => item.id === selectedId);
    if (stillExists) {
        selectIndicator(selectedId, { silent: true, skipScroll: true });
    } else {
        closeFichaTecnica();
    }
}

function initRealtimeSync() {
    lastRealtimeSignature = buildRealtimeSignature();

    window.addEventListener('storage', (event) => {
        const key = event.key || '';
        if (
            key === INDICATOR_STORAGE_KEYS.DOCUMENTOS_LISTA ||
            key === INDICATOR_STORAGE_KEYS.DOCUMENTOS_DETALLE ||
            key === INDICATOR_STORAGE_KEYS.INDICADORES_DETALLE ||
            key.startsWith(INDICATOR_STORAGE_KEYS.HISTORIAL_PREFIX)
        ) {
            refreshIndicatorsRealtime();
        }
    });

    realtimeRefreshIntervalId = window.setInterval(() => {
        if (document.hidden) return;
        refreshIndicatorsRealtime();
    }, 5000);

    window.addEventListener('beforeunload', () => {
        if (realtimeRefreshIntervalId) {
            clearInterval(realtimeRefreshIntervalId);
            realtimeRefreshIntervalId = null;
        }
    });
}

/**
 * Inicialización
 */
document.addEventListener('DOMContentLoaded', () => {
    loadIndicators();
    initFacultyFilter();
    initSearch();
    initRealtimeSync();
});

/**
 * Carga indicadores
 */
async function loadIndicators(facultyId = null) {
    // 🔥 PROTECCIÓN
    if (!ensureApi()) {
        lastIndicatorsMeta = { 
            source: 'remote', 
            total: 0, 
            status: 0, 
            error: 'API no está disponible. Verifica que api.js se cargue correctamente.' 
        };
        currentIndicators = [];
        renderIndicators([]);
        return;
    }
    selectedFacultyId = facultyId ? String(facultyId) : '';
    
    // Solo usar localStorage como respaldo si explícitamente se solicita (modo offline)
    // En modo remoto normal, si la API falla, mostramos vacío con el error
    const allIndicators = getAllIndicators();

    const applyFacultyFilter = (items) => {
        if (!selectedFacultyId) return items;
        return items.filter((ind) => {
            const indicatorFacultyId = normalizeFacultyId(ind.facultyId);
            return indicatorFacultyId === selectedFacultyId || indicatorFacultyId === 'all' || !indicatorFacultyId;
        });
    };

    try {
        // 🔥 FIX: Llamar a la API con facultyId si existe
        const remoteResult = await (selectedFacultyId 
            ? getIndicatorsByFaculty(selectedFacultyId, 1, 20) 
            : getIndicators(1, 20));

        let payload = [];
        if (!remoteResult) {
            payload = [];
        } else if (Array.isArray(remoteResult)) {
            payload = remoteResult;
        } else if (remoteResult.success && Array.isArray(remoteResult.data)) {
            payload = remoteResult.data;
        } else if (Array.isArray(remoteResult.items)) {
            payload = remoteResult.items;
        } else if (Array.isArray(remoteResult.data)) {
            payload = remoteResult.data;
        } else if (Array.isArray(remoteResult.results)) {
            payload = remoteResult.results;
        }

        const remoteTotal = Array.isArray(payload) ? payload.length : (remoteResult?.pagination?.total ?? 0);
        const remoteStatus = remoteResult?.status ?? (remoteResult?.success ? 200 : 0);
        const remoteError = remoteResult?.error ?? null;

        lastIndicatorsMeta = { 
            source: 'remote', 
            total: Number(remoteTotal || 0), 
            status: Number(remoteStatus || 0), 
            error: remoteError 
        };

        // 🔥 FIX: Si la API devuelve error (como 500), NO usar datos locales como fallback
        if (!remoteResult || !remoteResult.success || remoteStatus >= 500) {
            console.warn('⚠️ API de indicadores no disponible o error:', remoteError);
            currentIndicators = [];
            renderIndicators([]);
            return;
        }

        // Mapear respuesta de la API al formato de UI
        let remoteIndicators = (Array.isArray(payload) && payload.length > 0)
            ? payload.map((item) => mapApiIndicatorToUi(item)).filter(Boolean)
            : [];

        // Solo si la API devolvió datos vacíos pero exitosos (200 + []), 
        // y el usuario tiene datos guardados en localStorage, mostrar esos
        if (remoteIndicators.length === 0 && allIndicators.length > 0) {
            console.log('📭 API devolvió 0 indicadores, mostrando datos locales guardados...');
            remoteIndicators = allIndicators;
            lastIndicatorsMeta.source = 'local';
        }

        // Per-item detail fallback: para items que les falten variables o seguimiento
        const needsDetail = remoteIndicators.filter((it) => 
            (!it.variableN || it.variableN === '-' || !it.seguimiento || it.seguimiento.length === 0)
        );
        
        if (needsDetail.length > 0) {
            const detailPromises = needsDetail.map((it) => 
                API.public.indicators.getById(it.id).catch(() => ({ success: false }))
            );
            const details = await Promise.all(detailPromises);
            for (let i = 0; i < needsDetail.length; i += 1) {
                const original = needsDetail[i];
                const detailRes = details[i];
                if (detailRes?.success && detailRes.data) {
                    const d = detailRes.data;
                    const idx = remoteIndicators.findIndex((r) => r.id === original.id);
                    if (idx >= 0) {
                        remoteIndicators[idx] = {
                            ...remoteIndicators[idx],
                            variableN: remoteIndicators[idx].variableN && remoteIndicators[idx].variableN !== '-' 
                                ? remoteIndicators[idx].variableN 
                                : (d.variableN || d.variableNLabel || remoteIndicators[idx].variableN),
                            variableD: remoteIndicators[idx].variableD && remoteIndicators[idx].variableD !== '-' 
                                ? remoteIndicators[idx].variableD 
                                : (d.variableD || d.variableDLabel || remoteIndicators[idx].variableD),
                            seguimiento: (Array.isArray(d.seguimiento) && d.seguimiento.length > 0) 
                                ? d.seguimiento 
                                : remoteIndicators[idx].seguimiento
                        };
                    }
                }
            }
        }

        const indicators = applyFacultyFilter(remoteIndicators);
        currentIndicators = indicators;
        renderIndicators(indicators);
        
    } catch (e) {
        console.error('❌ Error cargando indicadores:', e);
        lastIndicatorsMeta = { source: 'remote', total: 0, status: 0, error: e.message };
        currentIndicators = [];
        renderIndicators([]);
    }
}

function getStableVariantIndex(seed, total) {
    const text = String(seed || 'SIGPRO');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % total;
}

function getIndicatorIconSvg(ind) {
    const iconText = String(ind?.icon || '').toLowerCase();
    const type = String(ind?.type || '').toLowerCase();
    const processCode = normalizeProcessCode(ind?.processCode || ind?.proceso || '');
    const processNumber = Number(processCode.split('.')[1] || 0);
    const seed = `${ind?.code || ''}-${ind?.title || ''}-${type}-${processCode}`;

    const peIcons = [
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 18h16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7 16V11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 16V8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M17 16V6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="6.8" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.9"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 17l4-5 3 2 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 7h2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 19h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
    ];

    const pmIcons = [
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 9l9-4 9 4-9 4-9-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 11v4c0 1.5 2.2 2.8 5 2.8s5-1.3 5-2.8v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 7.5h15v9h-15z" stroke="currentColor" stroke-width="1.8"/><path d="M8 11h8M8 14h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 4h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 4.8h6l1.8 3.6-3.6 6.6H10.8L7.2 8.4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.4 18h5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
    ];

    const psIcons = [
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 20h8M10 16v4M14 16v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6.8h9l3 3V17.2H6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 6.8v3h3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 12h7M8.5 14.7h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.9"/><path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`
    ];

    if (processCode.startsWith('PE.')) {
        const idx = getStableVariantIndex(`${processCode}-${ind?.code || seed}-${processNumber}`, peIcons.length);
        return peIcons[idx];
    }

    if (processCode.startsWith('PM.')) {
        const idx = getStableVariantIndex(`${processCode}-${ind?.code || seed}-${processNumber}`, pmIcons.length);
        return pmIcons[idx];
    }

    if (processCode.startsWith('PS.')) {
        const idx = getStableVariantIndex(`${processCode}-${ind?.code || seed}-${processNumber}`, psIcons.length);
        return psIcons[idx];
    }

    const strategicIcons = [
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 18h16" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
            <path d="M7 16V11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M12 16V8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M17 16V6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 17l4-5 3 2 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 7h2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M4 19h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`
    ];

    const missionalIcons = [
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 9l9-4 9 4-9 4-9-4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M7 11v4c0 1.5 2.2 2.8 5 2.8s5-1.3 5-2.8v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 10h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M6 10V7.5A1.5 1.5 0 017.5 6h9A1.5 1.5 0 0118 7.5V10" stroke="currentColor" stroke-width="1.8"/>
            <path d="M8 13h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M9 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`
    ];

    const supportIcons = [
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8"></rect>
            <path d="M8 20h8M10 16v4M14 16v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        </svg>`,
        `<svg class="indicator-card__icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.9"/>
            <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>`
    ];

    if (iconText.includes('school') || type === 'missional') {
        return missionalIcons[getStableVariantIndex(seed, missionalIcons.length)];
    }

    if (iconText.includes('query') || iconText.includes('task') || type === 'strategic') {
        return strategicIcons[getStableVariantIndex(seed, strategicIcons.length)];
    }

    return supportIcons[getStableVariantIndex(seed, supportIcons.length)];
}

function getProcessBadgeClass(processCode) {
    const code = normalizeProcessCode(processCode);
    if (code.startsWith('PE.')) {
        return 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/40';
    }
    if (code.startsWith('PM.')) {
        return 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/40';
    }
    if (code.startsWith('PS.')) {
        return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/40';
    }
    return 'text-slate-500 bg-slate-50 dark:text-slate-300 dark:bg-slate-700';
}

/**
 * Renderiza tarjetas de indicadores
 */
function renderIndicators(indicators) {
    const grid = document.getElementById('indicators-grid');
    if (!grid) return;

    if (indicators.length === 0) {
        let message = 'No se encontraron indicadores para esta facultad';
        let extraHtml = '';
        
        if (lastIndicatorsMeta && lastIndicatorsMeta.source === 'remote') {
            if (lastIndicatorsMeta.status === 200 && Number(lastIndicatorsMeta.total) === 0) {
                message = 'No hay indicadores publicados para esta facultad.';
            } else if (lastIndicatorsMeta.status === 403) {
                message = 'No tienes permiso para ver indicadores públicos (403).';
            } else if (lastIndicatorsMeta.status >= 500) {
                message = 'Error del servidor al cargar indicadores. Intente más tarde.';
            } else if (lastIndicatorsMeta.error) {
                message = `No se pudo cargar indicadores: ${lastIndicatorsMeta.error}`;
            }
            
            // 🔥 Solo mostrar botón de fallback si hay datos locales REALES guardados
            const localCount = getAllIndicators().length;
            if (localCount > 0) {
                extraHtml = `<div class="mt-4">
                    <button class="px-4 py-2 bg-primary text-white rounded-lg" onclick="showLocalExamples()">
                        Ver ${localCount} indicador(es) guardado(s) localmente
                    </button>
                </div>`;
            }
        }

        grid.innerHTML = `
            <div class="col-span-2 text-center py-12 text-slate-500">
                <span class="material-icons-round text-6xl mb-4">search_off</span>
                <p>${message}</p>
                ${extraHtml}
            </div>
        `;
        return;
    }

    grid.innerHTML = indicators.map((ind, index) => `
        <div class="group bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-secondary hover:shadow-md transition-all cursor-pointer"
             onclick="selectIndicator('${ind.id}')"
             data-indicator-id="${ind.id}">
            <div class="flex gap-5">
                <div class="indicator-card__icon w-16 h-16 bg-${ind.color}-50 dark:bg-${ind.color}-900/30 rounded-xl flex items-center justify-center shrink-0 text-${ind.color}-500 dark:text-${ind.color}-400">
                    ${getIndicatorIconSvg(ind)}
                </div>
                <div class="flex flex-col flex-grow">
                    <div class="flex justify-between items-start">
                        <h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">${ind.title}</h3>
                        <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${getProcessBadgeClass(ind.processCode)}">${ind.processCode || 'PROC'}</span>
                    </div>
                    <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">${ind.desc}</p>
                    <div class="flex gap-2 mt-3">
                        <span class="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            ${ind.type === 'strategic' ? 'Estratégico' : ind.type === 'missional' ? 'Misional' : 'Soporte'}
                        </span>
                        <span class="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Meta: ${ind.meta}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Selecciona un indicador y muestra su ficha técnica completa
 */
function selectIndicator(indicatorId, options = {}) {
    const { silent = false, skipScroll = false } = options;
    const indicator = currentIndicators.find(ind => ind.id === indicatorId);
    if (!indicator) return;

    selectedIndicator = indicator;

    // Actualizar UI activa
    document.querySelectorAll('[data-indicator-id]').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    });
    document.querySelector(`[data-indicator-id="${indicatorId}"]`)?.classList.add('ring-2', 'ring-primary');

    // Mostrar ficha técnica
    const fichaContainer = document.getElementById('ficha-tecnica');
    const fichaContent = document.getElementById('ficha-content');
    
    if (fichaContainer && fichaContent) {
        fichaContainer.classList.remove('hidden');
        fichaContent.innerHTML = renderFichaTecnica(indicator);
        
        // Renderizar gráfico si hay datos de seguimiento
        if (indicator.seguimiento && indicator.seguimiento.length > 0) {
            setTimeout(() => {
                renderGraficoSeguimiento(indicator.seguimiento, indicator.meta);
            }, 100);
        }
        
        // Scroll suave
        if (!skipScroll) {
            setTimeout(() => {
                fichaContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    if (!silent) {
        showToast(`Cargando ficha: ${indicator.title}`, 'info');
    }
}

// Fallback helper: render indicadores locales generados
function showLocalExamples() {
    // 🔥 Ya no muestra datos de ejemplo. Solo recarga desde la API.
    loadIndicators(selectedFacultyId || null);
}

/**
 * Renderiza el contenido completo de la ficha técnica
 */
/**
 * Renderiza el contenido completo de la ficha técnica
 */
function renderFichaTecnica(ind) {
    const tipoProceso = ind.type === 'strategic' ? 'Estratégico' : 
                       ind.type === 'missional' ? 'Misional' : 'Soporte';
    
    return `
        <!-- 1. IDENTIFICACIÓN DEL PROCESO -->
        <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-b-0">
            <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">1. Identificación del Proceso</h3>
        </div>
        <div class="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                    <tbody>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-1/4">Proceso:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${ind.proceso}</td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Código:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono">${ind.code}</td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Versión:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono font-bold">${ind.version}</td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Responsable:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${ind.responsable}</td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tipo de proceso:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 bg-white dark:bg-slate-900">
                                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getTipoBadgeClass(ind.type)}">
                                    ${tipoProceso}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 2. OBJETIVO -->
        <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-y-0">
            <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">2. Objetivo</h3>
        </div>
        <div class="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 border-t-0">
            <p class="text-slate-700 dark:text-slate-300 italic leading-relaxed border-l-4 border-slate-400 dark:border-slate-500 pl-4">
                "${ind.objetivo}"
            </p>
        </div>

        <!-- 3. INDICADOR -->
        <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-y-0">
            <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">3. Indicador</h3>
        </div>
        <div class="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                    <tbody>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300 w-1/4">Nombre:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                ${ind.indicadorNombre}
                            </td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Frecuencia:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                ${ind.frecuencia}
                            </td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Variables:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                <div class="space-y-1">
                                    <div><strong class="text-slate-600 dark:text-slate-400">N:</strong> ${ind.variableN}</div>
                                    <div><strong class="text-slate-600 dark:text-slate-400">D:</strong> ${ind.variableD}</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Fuente:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                ${ind.fuente}
                            </td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Fórmula:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-8 text-center bg-white dark:bg-slate-900">
                                <div class="inline-block text-lg formula-box">
                                    <div class="flex items-center gap-4">
                                        <span class="font-bold italic text-slate-800 dark:text-slate-200">I<sub>${ind.code}</sub> =</span>
                                        <div class="flex flex-col items-center">
                                            <span class="border-b-2 border-slate-400 dark:border-slate-600 pb-1 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">${ind.variableN}</span>
                                            <span class="pt-1 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">${ind.variableD}</span>
                                        </div>
                                        <span class="font-bold text-slate-800 dark:text-slate-200">x 100%</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Meta:</td>
                            <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 bg-white dark:bg-slate-900">
                                <div class="flex items-center gap-4">
                                    <span class="text-2xl font-bold text-slate-800 dark:text-slate-200">${ind.meta}%</span>
                                    <div class="flex gap-2">
                                        <span class="px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">&lt;75 Crítico</span>
                                        <span class="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">75≤U&lt;90 Riesgo</span>
                                        <span class="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">≥90 Óptimo</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 4. SEGUIMIENTO -->
        <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-y-0">
            <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">4. Seguimiento</h3>
        </div>
        <div class="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                    <thead>
                        <tr class="bg-slate-200 dark:bg-slate-700">
                            <th class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Período</th>
                            <th class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">N</th>
                            <th class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">D</th>
                            <th class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Meta</th>
                            <th class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Valor del Indicador</th>
                            <th class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Estado</th>
                            <th class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ind.seguimiento.map(seg => `
                            <tr class="hover:bg-slate-100 dark:hover:bg-slate-700/30">
                                <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${seg.periodo}</td>
                                <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">${seg.N}</td>
                                <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">${seg.D}</td>
                                <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">${seg.meta}</td>
                                <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${seg.valor}</td>
                                <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center bg-white dark:bg-slate-900">
                                    <span class="px-2 py-1 rounded-full text-xs font-medium ${getEstadoClass(seg.estado)}">
                                        ${seg.estado}
                                    </span>
                                </td>
                                <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-600 dark:text-slate-400 text-xs bg-white dark:bg-slate-900">${seg.observaciones || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Gráfico de seguimiento -->
            <div class="mt-8 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600">
                <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Tendencia del Indicador</h4>
                <div class="relative h-64 w-full bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 p-4">
                    <canvas id="chart-seguimiento" class="w-full h-full"></canvas>
                </div>
                <div class="flex justify-center gap-6 mt-4 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span class="text-slate-600 dark:text-slate-400">Meta</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-red-500"></span>
                        <span class="text-slate-600 dark:text-slate-400">Valor del Indicador</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza el gráfico de seguimiento usando canvas
 */
function renderGraficoSeguimiento(seguimiento, meta) {
    const canvas = document.getElementById('chart-seguimiento');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    ctx.clearRect(0, 0, width, height);
    
    const labels = seguimiento.map(s => s.periodo);
    const valores = seguimiento.map(s => s.valor);
    const maxVal = Math.max(...valores, meta) + 5;
    const minVal = Math.min(...valores, meta) - 5;
    const range = maxVal - minVal;
    
    // Ejes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Línea de meta
    const metaY = height - padding.bottom - ((meta - minVal) / range) * chartHeight;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, metaY);
    ctx.lineTo(width - padding.right, metaY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Línea de valores
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const stepX = chartWidth / (labels.length - 1 || 1);
    
    valores.forEach((val, i) => {
        const x = padding.left + i * stepX;
        const y = height - padding.bottom - ((val - minVal) / range) * chartHeight;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Puntos y etiquetas
    valores.forEach((val, i) => {
        const x = padding.left + i * stepX;
        const y = height - padding.bottom - ((val - minVal) / range) * chartHeight;
        
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(val, x, y - 10);
        
        ctx.fillStyle = '#64748b';
        ctx.fillText(labels[i], x, height - padding.bottom + 15);
    });
    
    // Etiqueta de meta
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Meta: ${meta}`, width - padding.right - 50, metaY - 5);
}

/**
 * Retorna las clases CSS para el badge de tipo de proceso
 */
function getTipoBadgeClass(type) {
    const classes = {
        strategic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        missional: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
        support: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    };
    return classes[type] || classes.support;
}

/**
 * Retorna las clases CSS para el badge de estado
 */
function getEstadoClass(estado) {
    const classes = {
        'Óptimo': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Riesgo': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        'Crítico': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    };
    return classes[estado] || 'bg-slate-100 text-slate-700';
}

/**
 * Cierra la ficha técnica
 */
function closeFichaTecnica() {
    const fichaContainer = document.getElementById('ficha-tecnica');
    if (fichaContainer) {
        fichaContainer.classList.add('hidden');
    }
    
    document.querySelectorAll('[data-indicator-id]').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    });
    
    selectedIndicator = null;
}

/**
 * Inicializa filtro de facultades
 */
function initFacultyFilter() {
    const select = document.getElementById('faculty-select');
    const selectedText = document.getElementById('selected-faculty-text');
    if (!select) return;

    select.addEventListener('change', (e) => {
        const facultyId = e.target.value;
        loadIndicators(facultyId);
        closeFichaTecnica();
        
        if (facultyId) {
            const facultyName = selectedText ? selectedText.textContent.trim() : 'Facultad seleccionada';
            showToast(`Filtrando: ${facultyName}`, 'info');
        }
    });
}

/**
 * Inicializa búsqueda
 */
function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            renderIndicators(currentIndicators);
            return;
        }
        
        // Mapeo de tipos para búsqueda
        const tipoMap = {
            'estrategico': 'strategic',
            'estrategia': 'strategic',
            'misional': 'missional',
            'mision': 'missional',
            'soporte': 'support',
            'apoyo': 'support'
        };
        
        // Detectar si la búsqueda es por tipo
        const tipoBuscado = tipoMap[query];
        
        const filtered = currentIndicators.filter(ind => {
            // Búsqueda normal en campos de texto
            const matchTexto = ind.title.toLowerCase().includes(query) ||
                              ind.code.toLowerCase().includes(query) ||
                              ind.desc.toLowerCase().includes(query) ||
                              ind.proceso.toLowerCase().includes(query) ||
                              ind.responsable.toLowerCase().includes(query);
            
            // Búsqueda por tipo (si aplica)
            const matchTipo = tipoBuscado && ind.type === tipoBuscado;
            
            // Búsqueda directa por tipo (para "strategic", "missional", "support")
            const matchTipoDirecto = ind.type.toLowerCase().includes(query);
            
            return matchTexto || matchTipo || matchTipoDirecto;
        });
        
        renderIndicators(filtered);
        
        // Mostrar mensaje si no hay resultados
        if (filtered.length === 0) {
            const grid = document.getElementById('indicators-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="col-span-2 text-center py-12 text-slate-500">
                        <span class="material-icons-round text-6xl mb-4">search_off</span>
                        <p>No se encontraron indicadores para "<strong>${e.target.value}</strong>"</p>
                        <p class="text-sm mt-2">Prueba buscando por: nombre, código, tipo (Estratégico, Misional, Soporte) o proceso</p>
                    </div>
                `;
            }
        }
    });
}

/**
 * Muestra toast
 */
function showToast(message, type = 'info') {
    if (window.Toast && typeof Toast.show === 'function') {
        Toast.show(message, type);
    } else {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-50 ${
            type === 'error' ? 'bg-red-600' : 
            type === 'success' ? 'bg-green-600' : 
            type === 'warning' ? 'bg-amber-600' : 'bg-primary'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

/**
 * Inicializa el select personalizado de facultades
 */
function initCustomSelect() {
    const selectBtn = document.getElementById('faculty-select-btn');
    const dropdown = document.getElementById('faculty-dropdown');
    const arrow = document.getElementById('select-arrow');
    const selectedText = document.getElementById('selected-faculty-text');
    const hiddenInput = document.getElementById('faculty-select');
    const options = document.querySelectorAll('.faculty-option');
    const container = document.getElementById('custom-select-container');
    
    if (!selectBtn || !dropdown) return;
    
    // Toggle dropdown
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    // Abrir dropdown
    function openDropdown() {
        dropdown.classList.remove('hidden');
        arrow.style.transform = 'translateY(-50%) rotate(180deg)';
        selectBtn.classList.add('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }
    
    // Cerrar dropdown
    function closeDropdown() {
        dropdown.classList.add('hidden');
        arrow.style.transform = 'translateY(-50%) rotate(0deg)';
        selectBtn.classList.remove('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }
    
    // Seleccionar opción
    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            const text = option.textContent.trim();
            
            // Actualizar texto mostrado
            selectedText.textContent = text;
            
            // Actualizar input hidden
            hiddenInput.value = value;
            
            // Cerrar dropdown
            closeDropdown();
            
            // Disparar evento change para compatibilidad con código existente
            const event = new Event('change');
            hiddenInput.dispatchEvent(event);
            
            // Llamar directamente a la función de filtro si existe
            if (typeof loadIndicators === 'function') {
                loadIndicators(value);
            }
            
            // Mostrar toast
            if (value && typeof showToast === 'function') {
                showToast(`Filtrando: ${text}`, 'info');
            }
        });
    });
    
    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
        }
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initCustomSelect();
});

// ============================================
// EXPORTAR / DESCARGAR INDICADORES
// ============================================
async function downloadIndicator(indicatorId) {
    try {
        console.log(`Descargando indicador: ${indicatorId}`);
        
        if (typeof showToast === 'function') {
            showToast('Descargando indicador...', 'info');
        }

        const result = await API.public.indicators.export(indicatorId);

        if (!result.success) {
            console.error('Error descargando:', result.error);
            if (typeof showToast === 'function') {
                showToast(`Error: ${result.error || 'No se pudo descargar'}`, 'error');
            }
            return;
        }

        // Crear URL temporal del blob
        const url = window.URL.createObjectURL(result.data);

        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `indicador-${indicatorId}.pdf`;

        // Agregar al DOM, hacer click y limpiar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Liberar memoria
        window.URL.revokeObjectURL(url);

        console.log('✅ Indicador descargado correctamente');
        if (typeof showToast === 'function') {
            showToast('Indicador descargado correctamente', 'success');
        }

    } catch (error) {
        console.error('Error descargando indicador:', error);
        if (typeof showToast === 'function') {
            showToast('Error descargando indicador', 'error');
        }
    }
}

// Añadir al final del archivo, junto a las otras inicializaciones
async function loadFacultyOptions() {
    if (!ensureApi()) return;
    
    try {
        const res = await API.public.faculties.getAll({ page: 1, limit: 50 });
        const faculties = res.success && Array.isArray(res.data) ? res.data : [];
        
        const container = document.getElementById('faculty-options-container');
        if (!container) return;
        
        container.innerHTML = faculties.map(f => `
            <button type="button" 
                    class="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 
                           hover:bg-slate-100 dark:hover:bg-slate-700 
                           transition-colors faculty-option" 
                    data-value="${f.id}">
                ${f.name}
            </button>
        `).join('');
        
        // Re-inicializar event listeners
        initCustomSelect();
        
    } catch (e) {
        console.error('Error cargando facultades:', e);
    }
}

// Modificar el DOMContentLoaded existente:
document.addEventListener('DOMContentLoaded', () => {
    loadFacultyOptions();  // ← NUEVO: Cargar facultades desde API
    loadIndicators();
    initFacultyFilter();
    initSearch();
    initRealtimeSync();
});

// Exportar funciones globales
window.selectIndicator = selectIndicator;
window.closeFichaTecnica = closeFichaTecnica;
window.downloadIndicator = downloadIndicator;
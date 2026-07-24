/**
 * INDICATORS MODULE
 * Maneja la lógica de indicadores de gestión - Versión Híbrida (Local + Remote)
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
//var API = window.API;

// ============================================
// ESTADO GLOBAL
// ============================================
let currentIndicators = [];
let selectedIndicator = null;
let selectedFacultyId = '';
let realtimeRefreshIntervalId = null;
let lastRealtimeSignature = '';
let lastIndicatorsMeta = null;
let facultyListCache = [];

const INDICATOR_STORAGE_KEYS = {
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
    INDICADORES_DETALLE: 'sigpro_indicadores_detalle',
    HISTORIAL_PREFIX: 'sigpro_historial_datos_',
    LOCAL_INDICATORS: 'sigpro_local_indicators'
};

// ============================================
// 20 FACULTADES UNMSM
// ============================================
const FACULTADES_UNMSM = [
    { id: 1, name: 'Medicina', code: 'FM', icon: 'medical_services', color: 'red' },
    { id: 2, name: 'Derecho y Ciencia Política', code: 'FDCP', icon: 'gavel', color: 'indigo' },
    { id: 3, name: 'Letras y Ciencias Humanas', code: 'FLCH', icon: 'history_edu', color: 'amber' },
    { id: 4, name: 'Farmacia y Bioquímica', code: 'FFB', icon: 'vaccines', color: 'cyan' },
    { id: 5, name: 'Odontología', code: 'FO', icon: 'health_and_safety', color: 'teal' },
    { id: 6, name: 'Educación', code: 'FE', icon: 'school', color: 'emerald' },
    { id: 7, name: 'Química e Ingeniería Química', code: 'FQIQ', icon: 'science', color: 'lime' },
    { id: 8, name: 'Medicina Veterinaria', code: 'FMV', icon: 'pets', color: 'orange' },
    { id: 9, name: 'Ciencias Administrativas', code: 'FCA', icon: 'work', color: 'purple' },
    { id: 10, name: 'Ciencias Biológicas', code: 'FCB', icon: 'biotech', color: 'green' },
    { id: 11, name: 'Ciencias Contables', code: 'FCC', icon: 'money_bag', color: 'pink' },
    { id: 12, name: 'Ciencias Económicas', code: 'FCE', icon: 'trending_up', color: 'yellow' },
    { id: 13, name: 'Ciencias Físicas', code: 'FCF', icon: 'antigravity', color: 'violet' },
    { id: 14, name: 'Ciencias Matemáticas', code: 'FCM', icon: 'calculate', color: 'blue' },
    { id: 15, name: 'Ciencias Sociales', code: 'FCCSS', icon: 'groups', color: 'rose' },
    { id: 16, name: 'Ingeniería Geológica, Minera, Metalúrgica y Geográfica', code: 'FIGMMG', icon: 'terrain', color: 'stone' },
    { id: 17, name: 'Ingeniería Industrial', code: 'FII', icon: 'precision_manufacturing', color: 'slate' },
    { id: 18, name: 'Psicología', code: 'FP', icon: 'psychology', color: 'fuchsia' },
    { id: 19, name: 'Ingeniería Eléctrica y Electrónica', code: 'FIEE', icon: 'electrical_services', color: 'amber' },
    { id: 20, name: 'Ingeniería de Sistemas e Informática', code: 'FISI', icon: 'computer', color: 'sky' }
];

// ============================================
// 2 EJEMPLOS DE INDICADORES (MODO LOCAL)
// ============================================
const INDICADORES_EJEMPLO = [
    {
        id: 'IND-PE01-001',
        code: 'IND-PE01-001',
        title: 'Índice de Satisfacción de Usuarios Externos',
        desc: 'Medir el nivel de satisfacción de los usuarios externos (pacientes, familiares, comunidad) respecto a los servicios académicos y de salud ofrecidos por la Facultad de Medicina.',
        facultyId: '1',
        type: 'strategic',
        processCode: 'PE.01',
        proceso: 'PE.01 Gestión Estratégica',
        responsable: 'Oficina de Calidad - Facultad de Medicina',
        objetivo: 'Medir el nivel de satisfacción de los usuarios externos respecto a los servicios académicos y de salud.',
        indicadorNombre: 'Índice de Satisfacción de Usuarios Externos',
        frecuencia: 'Semestral',
        variableN: 'N° de usuarios satisfechos (encuesta ≥4)',
        variableD: 'Total de usuarios encuestados',
        fuente: 'Encuesta de Satisfacción SIGPRO - FM',
        meta: 85,
        version: '2.0',
        icon: 'monitoring',
        color: 'blue',
        seguimiento: [
            { periodo: '2023-I', N: 145, D: 200, meta: 80, valor: 72.5, estado: 'Crítico', observaciones: 'Primer semestre con encuesta piloto. Baja participación de usuarios.' },
            { periodo: '2023-II', N: 195, D: 250, meta: 80, valor: 78.0, estado: 'Riesgo', observaciones: 'Mejora significativa tras implementación de encuestas digitales.' },
            { periodo: '2024-I', N: 247, D: 300, meta: 82, valor: 82.3, estado: 'Óptimo', observaciones: 'Supera meta por primera vez. Alta satisfacción en servicios de consulta externa.' },
            { periodo: '2024-II', N: 300, D: 350, meta: 85, valor: 85.7, estado: 'Óptimo', observaciones: 'Meta alcanzada con éxito. Satisfacción óptima en todas las áreas evaluadas.' },
            { periodo: '2025-I', N: 353, D: 400, meta: 85, valor: 88.2, estado: 'Óptimo', observaciones: 'Tendencia ascendente sostenida. Mejor resultado histórico.' }
        ]
    },
    {
        id: 'IND-PE01-002',
        code: 'IND-PE01-002',
        title: 'Tasa de Cumplimiento del Plan Estratégico Institucional',
        desc: 'Evaluar el grado de cumplimiento de las metas establecidas en el Plan Estratégico Institucional de la Facultad de Medicina.',
        facultyId: '1',
        type: 'strategic',
        processCode: 'PE.01',
        proceso: 'PE.01 Gestión Estratégica',
        responsable: 'Dirección de Planificación - FM',
        objetivo: 'Evaluar el grado de cumplimiento de las metas establecidas en el Plan Estratégico Institucional.',
        indicadorNombre: 'Tasa de Cumplimiento del Plan Estratégico Institucional',
        frecuencia: 'Anual',
        variableN: 'N° de metas del PEI cumplidas',
        variableD: 'Total de metas del PEI programadas',
        fuente: 'Sistema de Gestión del Plan Estratégico UNMSM',
        meta: 90,
        version: '1.5',
        icon: 'monitoring',
        color: 'blue',
        seguimiento: [
            { periodo: '2020', N: 13, D: 20, meta: 75, valor: 65.0, estado: 'Crítico', observaciones: 'Año afectado por pandemia COVID-19. Reprogramación de metas.' },
            { periodo: '2021', N: 14, D: 20, meta: 75, valor: 70.0, estado: 'Riesgo', observaciones: 'Recuperación gradual. Dificultades en metas de infraestructura.' },
            { periodo: '2022', N: 39, D: 50, meta: 80, valor: 78.0, estado: 'Riesgo', observaciones: 'Mejora notable. Avance en acreditación internacional.' },
            { periodo: '2023', N: 51, D: 60, meta: 85, valor: 85.0, estado: 'Óptimo', observaciones: 'Meta alcanzada. Éxito en internacionalización y publicaciones.' },
            { periodo: '2024', N: 69, D: 75, meta: 90, valor: 92.0, estado: 'Óptimo', observaciones: 'Excelente desempeño. Cumplimiento superior al 90% por primera vez.' },
            { periodo: '2025', N: 22, D: 24, meta: 90, valor: 91.5, estado: 'Óptimo', observaciones: 'En curso. Proyección favorable para cierre de año.' }
        ]
    }
];

// ============================================
// HELPERS
// ============================================
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

function isLocalMode() {
    return window.CONFIG && window.CONFIG.MODE === 'local';
}

function isRemoteMode() {
    return window.CONFIG && window.CONFIG.MODE === 'remote';
}

// ============================================
// INICIALIZAR DATOS LOCALES (MODO LOCAL)
// ============================================
function initLocalIndicators() {
    // Verificar si ya existen los ejemplos en localStorage
    const existing = localStorage.getItem(INDICATOR_STORAGE_KEYS.LOCAL_INDICATORS);
    
    if (!existing) {
        // Guardar los 2 ejemplos en localStorage
        localStorage.setItem(INDICATOR_STORAGE_KEYS.LOCAL_INDICATORS, JSON.stringify(INDICADORES_EJEMPLO));
        console.log('✅ 2 indicadores de ejemplo guardados en localStorage');
    }

    // Guardar en formato de documentos lista para compatibilidad
    const docsListaKey = INDICATOR_STORAGE_KEYS.DOCUMENTOS_LISTA;
    let docsLista = safeParseArray(localStorage.getItem(docsListaKey));
    
    const hasInd001 = docsLista.some(d => d.codigo === 'IND-PE01-001');
    const hasInd002 = docsLista.some(d => d.codigo === 'IND-PE01-002');

    if (!hasInd001) {
        docsLista.push({
            id: 'ind-fm-pe01-001',
            codigo: 'IND-PE01-001',
            tipo: 'indicador',
            estado: 'aprobado',
            facultyId: '1',
            nombreFacultad: 'Facultad de Medicina',
            descripcion: 'Índice de Satisfacción de Usuarios Externos',
            fecha: '2025-01-15T10:00:00Z'
        });
    }
    if (!hasInd002) {
        docsLista.push({
            id: 'ind-fm-pe01-002',
            codigo: 'IND-PE01-002',
            tipo: 'indicador',
            estado: 'aprobado',
            facultyId: '1',
            nombreFacultad: 'Facultad de Medicina',
            descripcion: 'Tasa de Cumplimiento del Plan Estratégico Institucional',
            fecha: '2025-02-20T14:30:00Z'
        });
    }
    localStorage.setItem(docsListaKey, JSON.stringify(docsLista));

    // Guardar detalles
    const detalleKey = INDICATOR_STORAGE_KEYS.DOCUMENTOS_DETALLE;
    let detalleDocumentos = safeParseObject(localStorage.getItem(detalleKey));
    
    if (!detalleDocumentos['IND-PE01-001']) {
        detalleDocumentos['IND-PE01-001'] = {
            fichaData: {
                codigo: 'IND-PE01-001',
                nombreIndicador: 'Índice de Satisfacción de Usuarios Externos',
                macroProcesoNombre: 'PE.01 Gestión Estratégica',
                macroProcesoTexto: 'PE.01',
                macroProceso: 'PE.01',
                proceso: 'PE.01',
                procesoNombre: 'Gestión Estratégica',
                codigoProceso: 'PE.01',
                tipoProceso: 'ESTRATEGICO',
                version: '2.0',
                unidadResponsable: 'Oficina de Calidad - Facultad de Medicina',
                responsable: 'Dra. María Elena Vargas',
                frecuencia: 'Semestral',
                variableN: 'N° de usuarios satisfechos (encuesta ≥4)',
                variableD: 'Total de usuarios encuestados',
                fuente: 'Encuesta de Satisfacción SIGPRO - FM',
                meta: '85',
                objetivoProceso: 'Medir el nivel de satisfacción de los usuarios externos (pacientes, familiares, comunidad) respecto a los servicios académicos y de salud ofrecidos por la Facultad de Medicina.',
                descripcion: 'Índice de Satisfacción de Usuarios Externos'
            }
        };
    }
    if (!detalleDocumentos['IND-PE01-002']) {
        detalleDocumentos['IND-PE01-002'] = {
            fichaData: {
                codigo: 'IND-PE01-002',
                nombreIndicador: 'Tasa de Cumplimiento del Plan Estratégico Institucional',
                macroProcesoNombre: 'PE.01 Gestión Estratégica',
                macroProcesoTexto: 'PE.01',
                macroProceso: 'PE.01',
                proceso: 'PE.01',
                procesoNombre: 'Gestión Estratégica',
                codigoProceso: 'PE.01',
                tipoProceso: 'ESTRATEGICO',
                version: '1.5',
                unidadResponsable: 'Dirección de Planificación - FM',
                responsable: 'Dr. Carlos Alberto Mendoza',
                frecuencia: 'Anual',
                variableN: 'N° de metas del PEI cumplidas',
                variableD: 'Total de metas del PEI programadas',
                fuente: 'Sistema de Gestión del Plan Estratégico UNMSM',
                meta: '90',
                objetivoProceso: 'Evaluar el grado de cumplimiento de las metas establecidas en el Plan Estratégico Institucional de la Facultad de Medicina, asegurando la alineación con los objetivos de la Decana de América.',
                descripcion: 'Tasa de Cumplimiento del Plan Estratégico Institucional'
            }
        };
    }
    localStorage.setItem(detalleKey, JSON.stringify(detalleDocumentos));

    // Guardar historiales
    const histKey1 = `${INDICATOR_STORAGE_KEYS.HISTORIAL_PREFIX}IND-PE01-001`;
    const histKey2 = `${INDICATOR_STORAGE_KEYS.HISTORIAL_PREFIX}IND-PE01-002`;
    
    if (!localStorage.getItem(histKey1)) {
        localStorage.setItem(histKey1, JSON.stringify([
            {"fecha": "2023-I", "periodo": "2023-I", "resultado": 72.5, "devengado": 145, "pim": 200, "metaPeriodo": 80, "analisis": "Primer semestre con encuesta piloto. Baja participación de usuarios.", "acciones": "Ampliar cobertura de encuestas en hospitales asociados."},
            {"fecha": "2023-II", "periodo": "2023-II", "resultado": 78.0, "devengado": 195, "pim": 250, "metaPeriodo": 80, "analisis": "Mejora significativa tras implementación de encuestas digitales.", "acciones": "Capacitar personal en atención al usuario."},
            {"fecha": "2024-I", "periodo": "2024-I", "resultado": 82.3, "devengado": 247, "pim": 300, "metaPeriodo": 82, "analisis": "Supera meta por primera vez. Alta satisfacción en servicios de consulta externa.", "acciones": "Mantener estándares y replicar modelo en otras áreas."},
            {"fecha": "2024-II", "periodo": "2024-II", "resultado": 85.7, "devengado": 300, "pim": 350, "metaPeriodo": 85, "analisis": "Meta alcanzada con éxito. Satisfacción óptima en todas las áreas evaluadas.", "acciones": "Consolidar buenas prácticas, planificar encuesta anual 2025."},
            {"fecha": "2025-I", "periodo": "2025-I", "resultado": 88.2, "devengado": 353, "pim": 400, "metaPeriodo": 85, "analisis": "Tendencia ascendente sostenida. Mejor resultado histórico.", "acciones": "Propuesta de aumentar meta al 90% para 2025-II."}
        ]));
    }

    if (!localStorage.getItem(histKey2)) {
        localStorage.setItem(histKey2, JSON.stringify([
            {"fecha": "2020", "periodo": "2020", "resultado": 65.0, "devengado": 13, "pim": 20, "metaPeriodo": 75, "analisis": "Año afectado por pandemia COVID-19. Reprogramación de metas.", "acciones": "Revisar cronograma y ajustar metas a contexto post-pandemia."},
            {"fecha": "2021", "periodo": "2021", "resultado": 70.0, "devengado": 14, "pim": 20, "metaPeriodo": 75, "analisis": "Recuperación gradual. Dificultades en metas de infraestructura.", "acciones": "Priorizar metas de investigación y docencia."},
            {"fecha": "2022", "periodo": "2022", "resultado": 78.0, "devengado": 39, "pim": 50, "metaPeriodo": 80, "analisis": "Mejora notable. Avance en acreditación internacional.", "acciones": "Fortalecer seguimiento trimestral de metas."},
            {"fecha": "2023", "periodo": "2023", "resultado": 85.0, "devengado": 51, "pim": 60, "metaPeriodo": 85, "analisis": "Meta alcanzada. Éxito en internacionalización y publicaciones.", "acciones": "Replicar modelo de gestión en otros procesos estratégicos."},
            {"fecha": "2024", "periodo": "2024", "resultado": 92.0, "devengado": 69, "pim": 75, "metaPeriodo": 90, "analisis": "Excelente desempeño. Cumplimiento superior al 90% por primera vez.", "acciones": "Ajustar Plan Estratégico 2025-2030 con metas más ambiciosas."},
            {"fecha": "2025", "periodo": "2025", "resultado": 91.5, "devengado": 22, "pim": 24, "metaPeriodo": 90, "analisis": "En curso. Proyección favorable para cierre de año.", "acciones": "Monitorear metas pendientes de investigación clínica."}
        ]));
    }
}


// ============================================
// OBTENER INDICADORES SEGÚN MODO
// ============================================
function getLocalIndicators() {
    const localIndicators = safeParseArray(localStorage.getItem(INDICATOR_STORAGE_KEYS.LOCAL_INDICATORS));
    if (localIndicators.length > 0) {
        return localIndicators;
    }
    return getStoredIndicatorsLegacy();
}

function getStoredIndicatorsLegacy() {
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

            return {
                id: String(item.codigo),
                title: item.nombreIndicador || `Indicador ${item.codigo}`,
                code: item.codigo,
                processCode: normalizeProcessCode(item.macroProceso || item.proceso || ''),
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
                variableN: item.variableN || 'N',
                variableD: item.variableD || 'D',
                fuente: item.fuente || '-',
                meta,
                seguimiento
            };
        });
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

// ============================================
// MAPEAR INDICADOR DE API A FORMATO UI
// ============================================
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

    return {
        id: String(item.id || item.code || item.codigo || generateId()),
        title: item.indicatorName || item.title || item.nombreIndicador || item.name || `Indicador ${item.code || item.codigo || ''}`.trim(),
        code: item.code || item.codigo || item.id || 'IND',
        version: item.version || item.currentVersion || '1',
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
        variableN: item.variableN || item.variableNLabel || 'N',
        variableD: item.variableD || item.variableDLabel || 'D',
        fuente: item.dataSource || item.fuente || '-',
        meta,
        seguimiento
    };
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// CARGAR FACULTADES EN EL SELECT
// ============================================
async function loadFacultyOptions() {
    const container = document.getElementById('faculty-options-container');
    const select = document.getElementById('faculty-select');
    if (!container && !select) return;

    let faculties = [];

    if (isRemoteMode()) {
        try {
            if (!ensureApi()) throw new Error('API no disponible');
            const res = await API.public.faculties.getAll({ page: 1, limit: 50 });
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                faculties = res.data.map(f => ({
                    id: f.id || f.code,
                    name: f.name || f.nombre || f.facultyName || `Facultad ${f.id}`
                }));
            }
        } catch (e) {
            console.warn('⚠️ No se pudieron cargar facultades desde API remota:', e.message);
        }
    }

    // Siempre usar las 20 facultades locales como fallback o en modo local
    if (faculties.length === 0) {
        faculties = FACULTADES_UNMSM.map(f => ({
            id: String(f.id),
            name: f.name
        }));
    }

    facultyListCache = faculties;

    // Renderizar en el dropdown personalizado
    if (container) {
        container.innerHTML = faculties.map(f => `
            <button type="button" 
                    class="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 
                           hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors faculty-option" 
                    data-value="${f.id}">
                ${f.name}
            </button>
        `).join('');
        
        // Inicializar el select personalizado DESPUÉS de renderizar las opciones
        initCustomSelect();
    }

    // También actualizar el select nativo si existe
    if (select) {
        select.innerHTML = `
            <option value="">Todas las facultades</option>
            ${faculties.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
        `;
    }
}

// ============================================
// CARGAR INDICADORES PRINCIPAL
// ============================================
async function loadIndicators(facultyId = null) {
    if (!ensureApi()) {
        lastIndicatorsMeta = { 
            source: 'error', 
            total: 0, 
            status: 0, 
            error: 'API no está disponible.' 
        };
        currentIndicators = [];
        renderIndicators([]);
        return;
    }

    selectedFacultyId = facultyId ? String(facultyId) : '';

    const applyFacultyFilter = (items) => {
        if (!selectedFacultyId) return items;
        return items.filter((ind) => {
            const indicatorFacultyId = normalizeFacultyId(ind.facultyId);
            return indicatorFacultyId === selectedFacultyId || indicatorFacultyId === 'all' || !indicatorFacultyId;
        });
    };

    try {
        let indicators = [];

        if (isLocalMode()) {
        // ========== MODO LOCAL ==========
        console.log('📦 Modo LOCAL: Cargando indicadores desde localStorage');

        initLocalIndicators();

        // Obtener indicadores locales - los ejemplos ya están en INDICADORES_EJEMPLO
        const localIndicators = getLocalIndicators();
        
        // Si no hay indicadores en localStorage, usar los ejemplos en memoria
        if (localIndicators.length === 0) {
            console.log('⚠️ No hay indicadores en localStorage, usando ejemplos en memoria');
            indicators = INDICADORES_EJEMPLO.map(item => {
                if (item.seguimiento && Array.isArray(item.seguimiento)) {
                    return item;
                }
                return mapLegacyToUi(item);
            }).filter(Boolean);
        } else {
            indicators = localIndicators.map(item => {
                if (item.seguimiento && Array.isArray(item.seguimiento)) {
                    return item;
                }
                return mapLegacyToUi(item);
            }).filter(Boolean);
        }

        lastIndicatorsMeta = { 
            source: 'local', 
            total: indicators.length, 
            status: 200, 
            error: null 
        };

        } else {
            // ========== MODO REMOTO ==========
            console.log('🌐 Modo REMOTO: Cargando indicadores desde API');

            const remoteResult = await (selectedFacultyId 
                ? getIndicatorsByFaculty(selectedFacultyId, 1, 50) 
                : getIndicators(1, 50));

            let payload = [];
            if (remoteResult && remoteResult.success && Array.isArray(remoteResult.data)) {
                payload = remoteResult.data;
            } else if (Array.isArray(remoteResult)) {
                payload = remoteResult;
            }

            const remoteStatus = remoteResult?.status ?? (remoteResult?.success ? 200 : 0);
            const remoteError = remoteResult?.error ?? null;

            lastIndicatorsMeta = { 
                source: 'remote', 
                total: Array.isArray(payload) ? payload.length : 0, 
                status: Number(remoteStatus || 0), 
                error: remoteError 
            };

            if (!remoteResult || !remoteResult.success) {
                console.warn('⚠️ API de indicadores no disponible:', remoteError);
                currentIndicators = [];
                renderIndicators([]);
                return;
            }

            indicators = payload
                .map((item) => mapApiIndicatorToUi(item))
                .filter(Boolean);
        }

        const filteredIndicators = applyFacultyFilter(indicators);
        currentIndicators = filteredIndicators;
        renderIndicators(filteredIndicators);

    } catch (e) {
        console.error('❌ Error cargando indicadores:', e);
        lastIndicatorsMeta = { source: 'error', total: 0, status: 0, error: e.message };
        currentIndicators = [];
        renderIndicators([]);
    }
}

function mapLegacyToUi(item) {
    if (!item) return null;

    const type = resolveIndicatorType(item.tipoProceso || item.type);
    const meta = Number(item.meta) || 0;
    const seguimiento = readSeguimientoFromStorage(item.codigo || item.id, meta);

    return {
        id: String(item.codigo || item.id || generateId()),
        title: item.nombreIndicador || item.title || `Indicador ${item.codigo || ''}`,
        code: item.codigo || item.id || 'IND',
        processCode: normalizeProcessCode(item.macroProceso || item.proceso || ''),
        version: item.version || '1',
        desc: item.objetivoProceso || item.descripcion || item.desc || '-',
        facultyId: normalizeFacultyId(item.facultadId || item.facultyId),
        type,
        icon: 'monitoring',
        color: getIndicatorColorByType(type),
        proceso: item.macroProcesoNombre || item.macroProceso || item.proceso || '-',
        responsable: item.unidadResponsable || item.responsable || '-',
        objetivo: item.objetivoProceso || item.objetivo || '-',
        indicadorNombre: item.nombreIndicador || item.title || '-',
        frecuencia: item.frecuencia || '-',
        variableN: item.variableN || 'N',
        variableD: item.variableD || 'D',
        fuente: item.fuente || '-',
        meta,
        seguimiento
    };
}

async function getIndicators(page = 1, limit = 20) {
    try {
        const res = await API.public.indicators.getIndicators(page, limit);
        if (!res) return { success: false, data: [], status: 0, error: 'No response' };
        const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res) ? res : []));
        return { success: !!res.success, data, status: res.status || 0, error: res.error || null };
    } catch (error) {
        return { success: false, data: [], status: 0, error: String(error) };
    }
}

async function getIndicatorsByFaculty(facultyId, page = 1, limit = 20) {
    try {
        if (!facultyId) return { success: false, data: [], error: 'facultyId requerido' };
        const res = await API.public.indicators.getAll({ facultyId, page, limit });
        if (!res) return { success: false, data: [], status: 0, error: 'No response' };
        const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.items) ? res.data.items : []);
        return { success: !!res.success, data, status: res.status || 0, error: res.error || null };
    } catch (error) {
        return { success: false, data: [], status: 0, error: String(error) };
    }
}


// ============================================
// RENDERIZAR INDICADORES
// ============================================
function renderIndicators(indicators) {
    console.log('🔄 renderIndicators()... count:', indicators ? indicators.length : 0);
    const grid = document.getElementById('indicators-grid');
    if (!grid) {
        console.warn('⚠️ #indicators-grid no encontrado');
        return;
    }

    if (!indicators || indicators.length === 0) {
        let message = 'No se encontraron indicadores';
        let extraHtml = '';

        if (lastIndicatorsMeta) {
            if (lastIndicatorsMeta.source === 'local') {
                message = 'No hay indicadores locales disponibles.';
            } else if (lastIndicatorsMeta.status === 403) {
                message = 'No tienes permiso para ver indicadores (403).';
            } else if (lastIndicatorsMeta.status >= 500) {
                message = 'Error del servidor al cargar indicadores.';
            } else if (lastIndicatorsMeta.error) {
                message = `Error: ${lastIndicatorsMeta.error}`;
            }
        }

        if (isLocalMode()) {
            extraHtml = '';
        }

        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-500">
                <span class="material-icons-round text-6xl mb-4">search_off</span>
                <p class="text-lg font-medium">${message}</p>
                ${selectedFacultyId ? `<p class="text-sm mt-2">Facultad: ${getFacultyNameById(selectedFacultyId)}</p>` : ''}
                ${extraHtml}
            </div>
        `;
        return;
    }

    grid.innerHTML = indicators.map((ind) => `
        <div class="group bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-secondary hover:shadow-md transition-all cursor-pointer"
             onclick="selectIndicator('${ind.id}')"
             data-indicator-id="${ind.id}">
            <div class="flex gap-5">
                <div class="indicator-card__icon w-16 h-16 bg-${ind.color}-50 dark:bg-${ind.color}-900/30 rounded-xl flex items-center justify-center shrink-0 text-${ind.color}-500 dark:text-${ind.color}-400">
                    ${getIndicatorIconSvg(ind)}
                </div>
                <div class="flex flex-col flex-grow min-w-0">
                    <div class="flex justify-between items-start gap-2">
                        <h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">${ind.title}</h3>
                        <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded shrink-0 ${getProcessBadgeClass(ind.processCode)}">${ind.processCode || 'PROC'}</span>
                    </div>
                    <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed line-clamp-2">${ind.desc}</p>
                    <div class="flex flex-wrap gap-2 mt-3">
                        <span class="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            ${ind.type === 'strategic' ? 'Estratégico' : ind.type === 'missional' ? 'Misional' : 'Soporte'}
                        </span>
                        <span class="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Meta: ${ind.meta}%
                        </span>
                        ${ind.facultyId && ind.facultyId !== 'all' ? `
                        <span class="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            ${getFacultyNameById(ind.facultyId)}
                        </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getFacultyNameById(id) {
    if (!id) return 'Todas las facultades';
    const faculty = FACULTADES_UNMSM.find(f => String(f.id) === String(id));
    return faculty ? faculty.name : `Facultad ${id}`;
}

// ============================================
// ICONOS SVG
// ============================================
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
    const type = String(ind?.type || '').toLowerCase();
    const processCode = normalizeProcessCode(ind?.processCode || ind?.proceso || '');
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
        return peIcons[getStableVariantIndex(seed, peIcons.length)];
    }
    if (processCode.startsWith('PM.')) {
        return pmIcons[getStableVariantIndex(seed, pmIcons.length)];
    }
    if (processCode.startsWith('PS.')) {
        return psIcons[getStableVariantIndex(seed, psIcons.length)];
    }

    if (type === 'strategic') return peIcons[0];
    if (type === 'missional') return pmIcons[0];
    return psIcons[0];
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

// ============================================
// SELECCIONAR INDICADOR - FICHA TÉCNICA
// ============================================
function selectIndicator(indicatorId, options) {
    console.log('🔄 selectIndicator()... id:', indicatorId);
    const opts = options || {};
    const silent = opts.silent || false;
    const skipScroll = opts.skipScroll || false;
    
    if (!currentIndicators || currentIndicators.length === 0) {
        console.warn('⚠️ selectIndicator() llamado pero currentIndicators está vacío');
        return;
    }
    
    const indicator = currentIndicators.find(ind => ind.id === indicatorId);
    if (!indicator) {
        console.warn('⚠️ Indicador no encontrado:', indicatorId);
        return;
    }

    selectedIndicator = indicator;

    document.querySelectorAll('[data-indicator-id]').forEach(card => {
        card.classList.remove('ring-2', 'ring-primary', 'bg-blue-50', 'dark:bg-blue-900/20');
    });
    document.querySelector(`[data-indicator-id="${indicatorId}"]`)?.classList.add('ring-2', 'ring-primary');

    const fichaContainer = document.getElementById('ficha-tecnica');
    const fichaContent = document.getElementById('ficha-content');

    if (fichaContainer && fichaContent) {
        fichaContainer.classList.remove('hidden');
        fichaContent.innerHTML = renderFichaTecnica(indicator);

        if (indicator.seguimiento && indicator.seguimiento.length > 0) {
            setTimeout(() => {
                renderGraficoSeguimiento(indicator.seguimiento, indicator.meta);
            }, 100);
        }

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


// ============================================
// RENDER FICHA TÉCNICA COMPLETA
// ============================================
function renderFichaTecnica(ind) {
    const tipoProceso = ind.type === 'strategic' ? 'Estratégico' : 
                       ind.type === 'missional' ? 'Misional' : 'Soporte';

    const hasSeguimiento = ind.seguimiento && ind.seguimiento.length > 0;

    return `
        <!-- 1. IDENTIFICACIÓN DEL PROCESO -->
        <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-b-0 rounded-t-lg">
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
                                <div class="flex items-center gap-4 flex-wrap">
                                    <span class="text-2xl font-bold text-slate-800 dark:text-slate-200">${ind.meta}%</span>
                                    <div class="flex gap-2 flex-wrap">
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
        <div class="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0 rounded-b-lg">
            ${hasSeguimiento ? `
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
            ` : `
            <div class="text-center py-8 text-slate-400">
                <span class="material-icons-round text-4xl mb-2">analytics</span>
                <p>No hay datos de seguimiento disponibles</p>
            </div>
            `}
        </div>
    `;
}


// ============================================
// GRÁFICO DE SEGUIMIENTO (CANVAS)
// ============================================
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

function getTipoBadgeClass(type) {
    const classes = {
        strategic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        missional: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
        support: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
    };
    return classes[type] || classes.support;
}

function getEstadoClass(estado) {
    const classes = {
        'Óptimo': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        'Riesgo': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        'Crítico': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    };
    return classes[estado] || 'bg-slate-100 text-slate-700';
}

// ============================================
// SELECT PERSONALIZADO DE FACULTADES
// ============================================
function initCustomSelect() {
    const selectBtn = document.getElementById('faculty-select-btn');
    const dropdown = document.getElementById('faculty-dropdown');
    const arrow = document.getElementById('select-arrow');
    const selectedText = document.getElementById('selected-faculty-text');
    const hiddenInput = document.getElementById('faculty-select');
    const container = document.getElementById('custom-select-container');

    if (!selectBtn || !dropdown) return;

    function openDropdown() {
        dropdown.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'translateY(-50%) rotate(180deg)';
        selectBtn.classList.add('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }

    function closeDropdown() {
        dropdown.classList.add('hidden');
        if (arrow) arrow.style.transform = 'translateY(-50%) rotate(0deg)';
        selectBtn.classList.remove('border-blue-500', 'ring-1', 'ring-blue-500/20');
    }

    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        if (isOpen) closeDropdown();
        else openDropdown();
    });

    dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.faculty-option');
        if (!option) return;

        const value = option.getAttribute('data-value');
        const text = option.textContent.trim();

        if (selectedText) selectedText.textContent = text;
        if (hiddenInput) hiddenInput.value = value;

        closeDropdown();

        // Actualizar el estado visual de selección
        dropdown.querySelectorAll('.faculty-option').forEach(opt => {
            opt.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-600', 'dark:text-blue-300');
        });
        option.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-600', 'dark:text-blue-300');

        // Disparar evento change
        if (hiddenInput) {
            const event = new Event('change');
            hiddenInput.dispatchEvent(event);
        }

        // Cargar indicadores para la facultad seleccionada
        if (typeof loadIndicators === 'function') {
            loadIndicators(value || null);
        }

        if (value && typeof showToast === 'function') {
            showToast(`Filtrando: ${text}`, 'info');
        }
    });

    document.addEventListener('click', (e) => {
        if (container && !container.contains(e.target)) {
            closeDropdown();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDropdown();
    });
}

// ============================================
// FILTRO DE FACULTADES (SELECT NATIVO)
// ============================================
function initFacultyFilter() {
    const select = document.getElementById('faculty-select');
    if (!select) return;

    select.addEventListener('change', (e) => {
        const facultyId = e.target.value;
        loadIndicators(facultyId);
        closeFichaTecnica();

        if (facultyId && typeof showToast === 'function') {
            const facultyName = getFacultyNameById(facultyId);
            showToast(`Filtrando: ${facultyName}`, 'info');
        }
    });
}

// ============================================
// BÚSQUEDA
// ============================================
function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
            renderIndicators(currentIndicators);
            return;
        }

        const tipoMap = {
            'estrategico': 'strategic',
            'estrategia': 'strategic',
            'misional': 'missional',
            'mision': 'missional',
            'soporte': 'support',
            'apoyo': 'support'
        };

        const tipoBuscado = tipoMap[query];

        const filtered = currentIndicators.filter(ind => {
            const matchTexto = ind.title.toLowerCase().includes(query) ||
                              ind.code.toLowerCase().includes(query) ||
                              ind.desc.toLowerCase().includes(query) ||
                              ind.proceso.toLowerCase().includes(query) ||
                              ind.responsable.toLowerCase().includes(query);

            const matchTipo = tipoBuscado && ind.type === tipoBuscado;
            const matchTipoDirecto = ind.type.toLowerCase().includes(query);

            return matchTexto || matchTipo || matchTipoDirecto;
        });

        renderIndicators(filtered);

        if (filtered.length === 0) {
            const grid = document.getElementById('indicators-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-12 text-slate-500">
                        <span class="material-icons-round text-6xl mb-4">search_off</span>
                        <p>No se encontraron indicadores para "<strong>${e.target.value}</strong>"</p>
                        <p class="text-sm mt-2">Prueba buscando por: nombre, código, tipo (Estratégico, Misional, Soporte) o proceso</p>
                    </div>
                `;
            }
        }
    });
}

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'info') {
    if (window.Toast && typeof Toast.show === 'function') {
        Toast.show(message, type);
    } else {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-50 ${
            type === 'error' ? 'bg-red-600' : 
            type === 'success' ? 'bg-green-600' : 
            type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// ============================================
// SINCRONIZACIÓN EN TIEMPO REAL
// ============================================
function buildRealtimeSignature() {
    const baseKeys = [
        INDICATOR_STORAGE_KEYS.DOCUMENTOS_LISTA,
        INDICATOR_STORAGE_KEYS.DOCUMENTOS_DETALLE,
        INDICATOR_STORAGE_KEYS.INDICADORES_DETALLE,
        INDICATOR_STORAGE_KEYS.LOCAL_INDICATORS
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
            key === INDICATOR_STORAGE_KEYS.LOCAL_INDICATORS ||
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

// ============================================
// DESCARGAR INDICADOR
// ============================================
async function downloadIndicator(indicatorId) {
    try {
        if (typeof showToast === 'function') {
            showToast('Descargando indicador...', 'info');
        }

        const result = await API.public.indicators.export(indicatorId);

        if (!result.success) {
            if (typeof showToast === 'function') {
                showToast(`Error: ${result.error || 'No se pudo descargar'}`, 'error');
            }
            return;
        }

        const url = window.URL.createObjectURL(result.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `indicador-${indicatorId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

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

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar datos locales si estamos en modo local
    if (isLocalMode()) {
        initLocalIndicators();
    }

    loadFacultyOptions();
    loadIndicators();
    initFacultyFilter();
    initSearch();
    initRealtimeSync();
});

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.selectIndicator = selectIndicator;
window.closeFichaTecnica = closeFichaTecnica;
window.downloadIndicator = downloadIndicator;
window.loadIndicators = loadIndicators;
window.loadFacultyOptions = loadFacultyOptions;
window.initLocalIndicators = initLocalIndicators;
window.getLocalIndicators = getLocalIndicators;
window.renderIndicators = renderIndicators;
window.renderFichaTecnica = renderFichaTecnica;
window.renderGraficoSeguimiento = renderGraficoSeguimiento;
window.initCustomSelect = initCustomSelect;
window.initFacultyFilter = initFacultyFilter;
window.initSearch = initSearch;
window.showToast = showToast;
window.showLocalExamples = function() {
    console.log('🔄 showLocalExamples()...');
    initLocalIndicators();
    loadIndicators(selectedFacultyId || null);
};

console.log('✅ INDICATORS MODULE cargado - Modo:', isLocalMode() ? 'LOCAL' : 'REMOTE');
/**
 * FICHA DE INDICADOR - JavaScript
 * Integrado con API UNMSM (modo hibrido: remoto + fallback local)
 */

const INDICADOR_CONFIG = {
    selectors: {
        form: '#ficha-form',
        btnFinalizar: '#btn-finalizar',
        btnExpedientes: '#btn-expedientes',
        codigoField: '#codigo-field',
        tipoProcesoSelect: '#tipo-proceso-select',
        macroProcesoSelect: '#macro-proceso-select',
        indicadorTemplateSelect: '#indicador-template-select',
        variablesInput: '#variables-input',
        formulaDefinicion: '#formula-definicion',
        formulaPreview: '#formula-preview',
        toastContainer: '#toast-container'
    },
    SHOW_DOCUMENTOS_BUTTON_DELAY_MS: 1400
};

const _SK_MODE = (typeof CONFIG !== 'undefined' && CONFIG.MODE) ? CONFIG.MODE : 'local';
const INDICADOR_STORAGE_KEYS = {
    DOCUMENTOS_LISTA:    `${_SK_MODE}_sigpro_documentos_lista`,
    DOCUMENTOS_DETALLE:  `${_SK_MODE}_sigpro_documentos_detalle`,
    INDICADORES_DETALLE: `${_SK_MODE}_sigpro_indicadores_detalle`,
    HISTORIAL_PREFIX:    'sigpro_historial_datos_'   // este SÍ queda sin prefijo
};

/*
const FICHA_CONFIG = INDICADOR_CONFIG;
const _SK_MODE = (typeof CONFIG !== 'undefined' && CONFIG.MODE) ? CONFIG.MODE : 'local';
const FICHA_STORAGE_KEYS = {
    DOCUMENTOS_LISTA:    `${_SK_MODE}_sigpro_documentos_lista`,
    INDICADORES_DETALLE: `${_SK_MODE}_sigpro_indicadores_detalle`,
    DOCUMENTOS_DETALLE:  `${_SK_MODE}_sigpro_documentos_detalle`
};
*/

const FACULTY_CODE_MAP = {
    'Facultad de medicina': 'FM',
    'Facultad de Medicina': 'FM',
    'Medicina': 'FM',
    'Facultad de derecho y ciencia politica': 'FDCP',
    'Facultad de Derecho y Ciencia Política': 'FDCP',
    'Derecho y ciencia politica': 'FDCP',
    'Derecho': 'FDCP',
    'Facultad de Letras y Ciencias Humanas': 'FLCH',
    'Facultad de letras y ciencias humanas': 'FLCH',
    'Letras y ciencias humanas': 'FLCH',
    'Letras': 'FLCH',
    'Facultad de Farmacia y Bioquímica': 'FFB',
    'Facultad de farmacia y bioquímica': 'FFB',
    'Farmacia y bioquímica': 'FFB',
    'Farmacia': 'FFB',
    'Facultad de Odontología': 'FO',
    'Facultad de odontología': 'FO',
    'Odontología': 'FO',
    'Facultad de Educación': 'FE',
    'Facultad de educación': 'FE',
    'Educación': 'FE',
    'Facultad de Química e Ingeniería Química': 'FQIQ',
    'Facultad de química e ingeniería química': 'FQIQ',
    'Química e ingeniería química': 'FQIQ',
    'Química': 'FQIQ',
    'Facultad de Medicina Veterinaria': 'FMV',
    'Facultad de medicina veterinaria': 'FMV',
    'Medicina veterinaria': 'FMV',
    'Veterinaria': 'FMV',
    'Facultad de Ciencias Administrativas': 'FCA',
    'Facultad de ciencias administrativas': 'FCA',
    'Ciencias administrativas': 'FCA',
    'Administración': 'FCA',
    'Facultad de Ciencias Biológicas': 'FCB',
    'Facultad de ciencias biológicas': 'FCB',
    'Ciencias biológicas': 'FCB',
    'Biología': 'FCB',
    'Facultad de Ciencias Contables': 'FCC',
    'Facultad de ciencias contables': 'FCC',
    'Ciencias contables': 'FCC',
    'Contabilidad': 'FCC',
    'Facultad de Ciencias Económicas': 'FCE',
    'Facultad de ciencias económicas': 'FCE',
    'Ciencias económicas': 'FCE',
    'Economía': 'FCE',
    'Facultad de Ciencias Físicas': 'FCF',
    'Facultad de ciencias físicas': 'FCF',
    'Ciencias físicas': 'FCF',
    'Física': 'FCF',
    'Facultad de Ciencias Matemáticas': 'FCM',
    'Facultad de ciencias matemáticas': 'FCM',
    'Ciencias matemáticas': 'FCM',
    'Matemáticas': 'FCM',
    'Facultad de Ciencias Sociales': 'FCCSS',
    'Facultad de ciencias sociales': 'FCCSS',
    'Ciencias sociales': 'FCCSS',
    'Sociales': 'FCCSS',
    'Facultad de Ingeniería Geológica, Minera, Metalúrgica y Geográfica': 'FIGMMG',
    'Facultad de ingeniería geológica, minera, metalúrgica y geográfica': 'FIGMMG',
    'Ingeniería geológica, minera, metalúrgica y geográfica': 'FIGMMG',
    'Geología': 'FIGMMG',
    'Minas': 'FIGMMG',
    'Metalurgia': 'FIGMMG',
    'Geografía': 'FIGMMG',
    'Facultad de Ingeniería Industrial': 'FII',
    'Facultad de ingeniería industrial': 'FII',
    'Ingeniería industrial': 'FII',
    'Industrial': 'FII',
    'Facultad de Psicología': 'FP',
    'Facultad de psicología': 'FP',
    'Psicología': 'FP',
    'Facultad de Ingeniería Electrónica y Eléctrica': 'FIEE',
    'Facultad de ingeniería electrónica y eléctrica': 'FIEE',
    'Ingeniería electrónica y eléctrica': 'FIEE',
    'Electrónica y eléctrica': 'FIEE',
    'Electrónica': 'FIEE',
    'Eléctrica': 'FIEE',
    'Facultad de Ingeniería de Sistemas e Informática': 'FISI',
    'Facultad de ingeniería de sistemas e informática': 'FISI',
    'Sistemas': 'FISI',
    'Informática': 'FISI'
};

const TIPO_PROCESO_MAP = {
    estrategico: 'strategic',
    estratégico: 'strategic',
    misional: 'missional',
    'de-apoyo': 'support',
    'de apoyo': 'support',
    soporte: 'support',
    apoyo: 'support',
    support: 'support'
};

let procesosCache = {
    strategic: [
        { id: 'pe-01', code: 'PE.01', name: 'Gestión Estratégica' },
        { id: 'pe-02', code: 'PE.02', name: 'Gestión de la Calidad y mejora continua' },
        { id: 'pe-03', code: 'PE.03', name: 'Gestión de Relaciones Institucionales' }
    ],
    missional: [
        { id: 'pm-01', code: 'PM.01', name: 'Gestión de la Formación Académica' },
        { id: 'pm-02', code: 'PM.02', name: 'Gestión de Investigación' },
        { id: 'pm-03', code: 'PM.03', name: 'Gestión de la Responsabilidad y Vinculación Social' }
    ],
    support: [
        { id: 'ps-01', code: 'PS.01', name: 'Gestión de Admisión y Matrícula' },
        { id: 'ps-02', code: 'PS.02', name: 'Gestión Documental' },
        { id: 'ps-03', code: 'PS.03', name: 'Gestión de Bienestar Integral' },
        { id: 'ps-04', code: 'PS.04', name: 'Gestión de Recursos Económicos' },
        { id: 'ps-05', code: 'PS.05', name: 'Gestión de Recursos Humanos' },
        { id: 'ps-06', code: 'PS.06', name: 'Gestión de Abastecimiento y Servicios' },
        { id: 'ps-07', code: 'PS.07', name: 'Gestión de la Tecnología de la Información' },
        { id: 'ps-08', code: 'PS.08', name: 'Gestión de Actividades Productivas' },
        { id: 'ps-09', code: 'PS.09', name: 'Gestión de Recursos Bibliográficos' },
        { id: 'ps-10', code: 'PS.10', name: 'Gestión de la Comunicación' }
    ]
};

const PROCESS_AUTO_FILL_TEMPLATES = {
    'pe-02': {
        unidadResponsable: 'Oficina de Calidad y Mejora Continua',
        objetivoProceso: 'Fortalecer la mejora continua mediante el seguimiento de hallazgos, auditorias y planes de accion.',
        nombreIndicador: 'Porcentaje de acciones de mejora implementadas',
        frecuencia: 'trimestral',
        variables: 'N = Acciones de mejora implementadas\nD = Acciones de mejora planificadas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Informes de calidad',
        meta: '85'
    },
    'pe-03': {
        unidadResponsable: 'Oficina de Cooperacion y Relaciones Institucionales',
        objetivoProceso: 'Impulsar alianzas estrategicas que contribuyan a la formacion, investigacion y proyeccion social.',
        nombreIndicador: 'Porcentaje de convenios activos con resultados',
        frecuencia: 'semestral',
        variables: 'N = Convenios activos con resultados reportados\nD = Convenios activos vigentes',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Registro de convenios institucionales',
        meta: '80'
    },
    'pm-01': {
        unidadResponsable: 'Direccion Academica de la Facultad',
        objetivoProceso: 'Asegurar la calidad y oportunidad del servicio academico brindado a los estudiantes.',
        nombreIndicador: 'Porcentaje de asignaturas desarrolladas segun silabo',
        frecuencia: 'semestral',
        variables: 'N = Asignaturas desarrolladas segun silabo\nD = Total de asignaturas programadas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema academico',
        meta: '90'
    },
    'pm-02': {
        unidadResponsable: 'Unidad de Investigacion',
        objetivoProceso: 'Promover el desarrollo y la productividad cientifica de docentes y estudiantes.',
        nombreIndicador: 'Porcentaje de proyectos de investigacion ejecutados',
        frecuencia: 'anual',
        variables: 'N = Proyectos de investigacion ejecutados\nD = Proyectos de investigacion aprobados',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema de investigacion',
        meta: '75'
    },
    'pm-03': {
        unidadResponsable: 'Unidad de Responsabilidad y Vinculacion Social',
        objetivoProceso: 'Fortalecer la vinculacion con la comunidad mediante actividades de responsabilidad social universitaria.',
        nombreIndicador: 'Porcentaje de actividades de vinculacion ejecutadas',
        frecuencia: 'semestral',
        variables: 'N = Actividades de vinculacion ejecutadas\nD = Actividades de vinculacion programadas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Reportes de responsabilidad social',
        meta: '85'
    },
    'ps-01': {
        unidadResponsable: 'Oficina de Admision y Registro Academico',
        objetivoProceso: 'Garantizar la admision y matricula oportuna conforme a la normativa institucional.',
        nombreIndicador: 'Porcentaje de matriculas registradas en el plazo establecido',
        frecuencia: 'semestral',
        variables: 'N = Matriculas registradas en plazo\nD = Matriculas programadas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema de matricula',
        meta: '95'
    },
    'ps-02': {
        unidadResponsable: 'Oficina de Tramite Documentario',
        objetivoProceso: 'Asegurar la atencion y trazabilidad de documentos institucionales en tiempo oportuno.',
        nombreIndicador: 'Porcentaje de documentos atendidos dentro del plazo',
        frecuencia: 'mensual',
        variables: 'N = Documentos atendidos en plazo\nD = Total de documentos recibidos',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema de tramite documentario',
        meta: '90'
    },
    'ps-03': {
        unidadResponsable: 'Unidad de Bienestar Universitario',
        objetivoProceso: 'Brindar servicios de bienestar integral para mejorar la permanencia y satisfaccion estudiantil.',
        nombreIndicador: 'Porcentaje de cobertura de servicios de bienestar',
        frecuencia: 'semestral',
        variables: 'N = Estudiantes atendidos\nD = Estudiantes objetivo',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Registros de bienestar universitario',
        meta: '80'
    },
    'ps-04': {
        unidadResponsable: 'Oficina de Economia y Finanzas',
        objetivoProceso: 'Optimizar la gestion economica para asegurar la ejecucion eficiente de recursos.',
        nombreIndicador: 'Porcentaje de ejecucion presupuestal',
        frecuencia: 'mensual',
        variables: 'N = Presupuesto ejecutado\nD = Presupuesto asignado',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema financiero institucional',
        meta: '90'
    },
    'ps-05': {
        unidadResponsable: 'Oficina de Recursos Humanos',
        objetivoProceso: 'Fortalecer la gestion del talento humano mediante procesos oportunos y transparentes.',
        nombreIndicador: 'Porcentaje de procesos de personal atendidos en plazo',
        frecuencia: 'mensual',
        variables: 'N = Procesos de personal atendidos en plazo\nD = Total de procesos de personal recibidos',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema de recursos humanos',
        meta: '88'
    },
    'ps-06': {
        unidadResponsable: 'Oficina de Abastecimiento y Servicios Generales',
        objetivoProceso: 'Garantizar la disponibilidad oportuna de bienes y servicios para las actividades academicas y administrativas.',
        nombreIndicador: 'Porcentaje de requerimientos atendidos en plazo',
        frecuencia: 'mensual',
        variables: 'N = Requerimientos atendidos en plazo\nD = Requerimientos recibidos',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema de abastecimiento',
        meta: '85'
    },
    'ps-07': {
        unidadResponsable: 'Oficina de Tecnologias de la Informacion',
        objetivoProceso: 'Asegurar la continuidad y calidad de los servicios tecnologicos institucionales.',
        nombreIndicador: 'Porcentaje de incidencias TIC resueltas en SLA',
        frecuencia: 'mensual',
        variables: 'N = Incidencias resueltas dentro del SLA\nD = Total de incidencias registradas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Mesa de ayuda TIC',
        meta: '92'
    },
    'ps-08': {
        unidadResponsable: 'Unidad de Actividades Productivas',
        objetivoProceso: 'Impulsar actividades productivas sostenibles alineadas al plan de desarrollo institucional.',
        nombreIndicador: 'Porcentaje de actividades productivas ejecutadas',
        frecuencia: 'trimestral',
        variables: 'N = Actividades productivas ejecutadas\nD = Actividades productivas programadas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Reportes de actividades productivas',
        meta: '80'
    },
    'ps-09': {
        unidadResponsable: 'Sistema de Bibliotecas de la Facultad',
        objetivoProceso: 'Garantizar el acceso oportuno a recursos bibliograficos fisicos y digitales.',
        nombreIndicador: 'Porcentaje de solicitudes bibliograficas atendidas',
        frecuencia: 'mensual',
        variables: 'N = Solicitudes bibliograficas atendidas\nD = Solicitudes bibliograficas recibidas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Sistema bibliotecario',
        meta: '90'
    },
    'ps-10': {
        unidadResponsable: 'Oficina de Comunicaciones',
        objetivoProceso: 'Mejorar la comunicacion institucional con mensajes oportunos y de alto alcance.',
        nombreIndicador: 'Porcentaje de piezas de comunicacion difundidas segun plan',
        frecuencia: 'mensual',
        variables: 'N = Piezas difundidas segun plan\nD = Piezas planificadas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Plan de comunicaciones',
        meta: '90'
    }
};

const PROCESS_INDICATOR_VARIANTS = {
    'pe-02': [
        {
            id: 'hallazgos-cerrados',
            label: 'Porcentaje de hallazgos de auditoria cerrados',
            overrides: {
                objetivoProceso: 'Medir la capacidad de cierre oportuno de hallazgos para fortalecer la mejora continua institucional.',
                nombreIndicador: 'Porcentaje de hallazgos de auditoria cerrados',
                frecuencia: 'mensual',
                variables: 'N = Hallazgos cerrados en el periodo\nD = Hallazgos identificados en el periodo',
                fuente: 'Informes de auditoria y seguimiento',
                meta: '90'
            }
        }
    ],
    'pe-01': [
        {
            id: 'ejecucion-presupuestal',
            label: 'Porcentaje de ejecución presupuestaria de los recursos directamente recaudados (RDR)',
            default: true,
            overrides: {
                version: '1.0',
                unidadResponsable: 'Jefe de la Unidad de Planificación, Presupuesto y Racionalización',
                objetivoProceso: 'Evaluar el nivel de avance en la ejecución del gasto y la capacidad de gestión presupuestal.',
                nombreIndicador: 'Porcentaje de ejecución presupuestaria de los recursos directamente recaudados (RDR)',
                frecuencia: 'Mensual',
                variables: 'N = Presupuesto ejecutado por la facultad en recursos directamente recaudados (RDR)\nD = Presupuesto asignado a la facultad en recursos directamente recaudados (RDR)',
                formulaDefinicion: '(N / D) * 100%',
                fuente: 'Quipucamayoc',
                meta: '90'
            }
        },
        {
            id: 'acciones-estrategicas',
            label: 'Porcentaje de cumplimiento de acciones estratégicas',
            overrides: {
                version: '1.0',
                unidadResponsable: 'Jefe de la Unidad de Planificación, Presupuesto y Racionalización',
                objetivoProceso: 'Evaluar el nivel de cumplimiento de la programación operativa institucional y la capacidad de gestión para ejecutar las actividades previstas.',
                nombreIndicador: 'Porcentaje de cumplimiento de acciones estratégicas',
                frecuencia: 'Anual',
                variables: 'N = Número de acciones estratégicas con avance igual o mayor al 75%\nD = Número de acciones estratégicas programadas',
                formulaDefinicion: '(N / D) * 100%',
                fuente: 'Plan estratégico',
                meta: '90'
            }
        }
    ]
};

const PROCESS_VARIANT_KEY_ALIASES = {
    'pe.01': 'pe-01',
    'pe 01': 'pe-01',
    'gestion estrategica': 'pe-01',
    'gestion de la calidad y mejora continua': 'pe-02',
    'gestion de relaciones institucionales': 'pe-03',
    'pm.01': 'pm-01',
    'pm 01': 'pm-01',
    'gestion de la formacion academica': 'pm-01',
    'pm.02': 'pm-02',
    'pm 02': 'pm-02',
    'gestion de investigacion': 'pm-02',
    'pm.03': 'pm-03',
    'pm 03': 'pm-03',
    'gestion de la responsabilidad y vinculacion social': 'pm-03',
    'ps.01': 'ps-01',
    'ps 01': 'ps-01',
    'gestion de admision y matricula': 'ps-01',
    'ps.02': 'ps-02',
    'ps 02': 'ps-02',
    'gestion documental': 'ps-02',
    'ps.03': 'ps-03',
    'ps 03': 'ps-03',
    'gestion de bienestar integral': 'ps-03',
    'ps.04': 'ps-04',
    'ps 04': 'ps-04',
    'gestion de recursos economicos': 'ps-04',
    'ps.05': 'ps-05',
    'ps 05': 'ps-05',
    'gestion de recursos humanos': 'ps-05',
    'ps.06': 'ps-06',
    'ps 06': 'ps-06',
    'gestion de abastecimiento y servicios': 'ps-06',
    'ps.07': 'ps-07',
    'ps 07': 'ps-07',
    'gestion de la tecnologia de la informacion': 'ps-07',
    'ps.08': 'ps-08',
    'ps 08': 'ps-08',
    'gestion de actividades productivas': 'ps-08',
    'ps.09': 'ps-09',
    'ps 09': 'ps-09',
    'gestion de recursos bibliograficos': 'ps-09',
    'ps.10': 'ps-10',
    'ps 10': 'ps-10',
    'gestion de la comunicacion': 'ps-10'
};

let currentUser = null;
let userFaculty = null;
let cascadaInicializada = false;
let indicatorTemplateOptionsMap = new Map();

function getApiMode() {
    return typeof API !== 'undefined' && typeof API.getMode === 'function'
        ? API.getMode()
        : 'desconocido';
}

function canUseApiUpload() {
    return typeof API !== 'undefined' && API.documentos && typeof API.documentos.upload === 'function';
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function findFacultyCodeInMap(value) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) return null;

    for (const [rawName, code] of Object.entries(FACULTY_CODE_MAP)) {
        if (normalizeText(rawName) === normalizedValue) {
            return code;
        }
    }

    return null;
}

function getFacultyCodeFromLocalContext() {
    const direct = String(localStorage.getItem('current_faculty_code') || '').trim().toUpperCase();
    if (direct) return direct;

    const names = [
        localStorage.getItem('current_faculty_name'),
        localStorage.getItem('sigpro_facultad_nombre')
    ];

    for (const name of names) {
        const mapped = findFacultyCodeInMap(name);
        if (mapped) return mapped;
    }

    return null;
}

function resolveFacultyCode() {
    if (userFaculty?.code) return String(userFaculty.code).toUpperCase();

    const candidates = [
        currentUser?.facultad,
        currentUser?.nombreFacultad,
        userFaculty?.name,
        userFaculty?.nombre,
        localStorage.getItem('current_faculty_name')
    ];

    for (const candidate of candidates) {
        const code = findFacultyCodeInMap(candidate);
        if (code) return code;
    }

    return getFacultyCodeFromLocalContext() || 'GEN';
}

function resolveFacultyId() {
    const currentFacultyId = Number.parseInt(localStorage.getItem('current_faculty_id') || '', 10);
    if (Number.isInteger(currentFacultyId) && currentFacultyId > 0) {
        return currentFacultyId;
    }

    if (typeof API !== 'undefined' && API.auth && typeof API.auth.getUser === 'function') {
        const user = API.auth.getUser();
        const facultyId = Number(user?.facultadId || user?.facultyId);
        if (Number.isInteger(facultyId) && facultyId > 0) {
            return facultyId;
        }
    }

    return 1;
}

function extractSequenceFromCode(code, facultyCode, year) {
    const pattern = new RegExp(`^IND-${facultyCode}-${year}-(\\d+)$`);
    const match = String(code || '').trim().match(pattern);
    return match ? Number(match[1]) : null;
}

async function getNextIndicatorSequence(facultyCode, year) {
    const usedSequences = new Set();
    const docsRaw = localStorage.getItem(INDICADOR_STORAGE_KEYS.DOCUMENTOS_LISTA);
    const docs = docsRaw ? JSON.parse(docsRaw) : [];

    docs.forEach((doc) => {
        const seq = extractSequenceFromCode(doc.codigo, facultyCode, year);
        if (Number.isInteger(seq) && seq > 0) {
            usedSequences.add(seq);
        }
    });

    let nextSequence = 1;
    while (usedSequences.has(nextSequence)) {
        nextSequence += 1;
    }

    return nextSequence;
}

async function generateIndicatorCode() {
    const year = new Date().getFullYear();
    const facultyCode = resolveFacultyCode();
    const nextSequence = await getNextIndicatorSequence(facultyCode, year);
    return `IND-${facultyCode}-${year}-${nextSequence}`;
}

async function refreshGeneratedCode() {
    const codigoField = document.querySelector(INDICADOR_CONFIG.selectors.codigoField);
    if (!codigoField) return;

    codigoField.value = await generateIndicatorCode();
}

function setDemoUser() {
    currentUser = {
        correo: 'demo@unmsm.edu.pe',
        rol: 'Usuario Facultad',
        facultad: localStorage.getItem('current_faculty_name') || 'Facultad no identificada'
    };

    userFaculty = {
        code: getFacultyCodeFromLocalContext() || 'GEN',
        name: currentUser.facultad
    };
}

async function loadUserData() {
    try {
        if (typeof API === 'undefined' || !API.auth || !API.auth.getUser) {
            setDemoUser();
            return;
        }

        const user = API.auth.getUser();
        if (!user) {
            setDemoUser();
            return;
        }

        currentUser = user;
        userFaculty = {
            code: findFacultyCodeInMap(user.facultad || user.nombreFacultad) || getFacultyCodeFromLocalContext() || 'GEN',
            name: user.facultad || user.nombreFacultad || ''
        };
    } catch (error) {
        console.error('Error cargando usuario:', error);
        setDemoUser();
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.querySelector(INDICADOR_CONFIG.selectors.toastContainer);
    if (!container) return;

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icons[type]}</span>
        <span class="font-medium">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function getRequiredEmptyFields(form, data) {
    return Array.from(form.querySelectorAll('[required]')).filter((field) => {
        const value = field.name ? data[field.name] : field.value;
        return !String(value || '').trim();
    });
}

function getSelectedOptionText(selectElement) {
    if (!selectElement) return '';

    const option = selectElement.options && selectElement.selectedIndex >= 0
        ? selectElement.options[selectElement.selectedIndex]
        : null;

    return option ? option.textContent.trim() : '';
}

function resolveTipoProcesoCategoria(tipoValue) {
    return TIPO_PROCESO_MAP[normalizeText(tipoValue)] || null;
}

async function cargarProcesosDesdeAPI() {
    try {
        const facultadId = resolveFacultyId();
        if (typeof API !== 'undefined' && API.processes && API.processes.getByFaculty) {
            const response = await API.processes.getByFaculty(facultadId);
            if (response.success && response.data) {
                procesosCache = response.data;
                console.log('✅ Procesos cargados desde API:', procesosCache);
                return;
            }
        }
    } catch (error) {
        console.log('ℹ️ No se pudieron cargar procesos desde API, usando fallback');
    }

    console.log('✅ Usando procesos fallback:', procesosCache);
}

function populateMacroProcesoSelect(tipoValue, preserveSelection = true) {
    const macroSelect = document.querySelector(INDICADOR_CONFIG.selectors.macroProcesoSelect);
    if (!macroSelect) return;

    const currentSelection = preserveSelection ? macroSelect.value : '';
    macroSelect.innerHTML = '<option value="">Seleccione Proceso...</option>';
    macroSelect.disabled = true;

    const categoria = resolveTipoProcesoCategoria(tipoValue);
    if (!categoria || !procesosCache) return;

    const procesos = procesosCache[categoria] || [];
    procesos.forEach((proc) => {
        const option = document.createElement('option');
        option.value = proc.id;
        option.textContent = `${proc.code} - ${proc.name}`;
        option.dataset.name = proc.name;
        option.dataset.code = proc.code;
        macroSelect.appendChild(option);
    });

    macroSelect.disabled = procesos.length === 0;

    if (preserveSelection && currentSelection) {
        macroSelect.value = currentSelection;
    }
}

function rehydrateCascadaFromCurrentSelection() {
    const tipoSelect = document.querySelector(INDICADOR_CONFIG.selectors.tipoProcesoSelect);
    const macroSelect = document.querySelector(INDICADOR_CONFIG.selectors.macroProcesoSelect);
    if (!tipoSelect) return;

    populateMacroProcesoSelect(tipoSelect.value, true);

    if (macroSelect && macroSelect.value) {
        const selectedOption = macroSelect.options[macroSelect.selectedIndex] || null;
        populateIndicadorTemplateSelect(selectedOption, true);
    } else {
        resetIndicadorTemplateSelect('Primero seleccione Proceso');
    }
}

function initCascadaSelects() {
    if (cascadaInicializada) {
        rehydrateCascadaFromCurrentSelection();
        return;
    }

    const tipoSelect = document.querySelector(INDICADOR_CONFIG.selectors.tipoProcesoSelect);
    const macroSelect = document.querySelector(INDICADOR_CONFIG.selectors.macroProcesoSelect);
    const indicadorTemplateSelect = document.querySelector(INDICADOR_CONFIG.selectors.indicadorTemplateSelect);
    if (!tipoSelect || !macroSelect || !indicadorTemplateSelect) return;

    tipoSelect.addEventListener('change', () => {
        populateMacroProcesoSelect(tipoSelect.value, false);
        resetIndicadorTemplateSelect('Primero seleccione Proceso');
    });

    macroSelect.addEventListener('change', () => {
        const selectedOption = macroSelect.options[macroSelect.selectedIndex] || null;
        populateIndicadorTemplateSelect(selectedOption, false);

        const codigoField = document.querySelector(INDICADOR_CONFIG.selectors.codigoField);
        if (macroSelect.value && codigoField && !codigoField.value.trim()) {
            refreshGeneratedCode();
        }
    });

    indicadorTemplateSelect.addEventListener('change', () => {
        applyAutoFillByIndicatorValue(indicadorTemplateSelect.value);
    });

    cascadaInicializada = true;
    rehydrateCascadaFromCurrentSelection();
}

function initFormulaPreview() {
    const formulaDefinicion = document.querySelector(INDICADOR_CONFIG.selectors.formulaDefinicion);
    const formulaPreview = document.querySelector(INDICADOR_CONFIG.selectors.formulaPreview);

    if (!formulaPreview) return;

    function updatePreview() {
        const formula = formulaDefinicion ? formulaDefinicion.value.trim() : '';

        if (!formula) {
            formulaPreview.innerHTML = '<span class="text-slate-400 text-sm">Ingrese una fórmula...</span>';
            return;
        }

        const formulaHtml = parsearFormulaConFracciones(formula);
        formulaPreview.innerHTML = `
            <div class="inline-flex flex-col items-center animate-fade-in">
                ${formulaHtml}
            </div>
        `;
    }

    if (formulaDefinicion) {
        formulaDefinicion.addEventListener('input', updatePreview);
    }

    updatePreview();
}

function parsearFormulaConFracciones(formula) {
    const safeFormula = escapeHtml(formula);
    
    // Limpiar espacios extra
    const clean = safeFormula.replace(/\s+/g, ' ').trim();
    
    // Patrón: (N / D) * 100%  o  N / D * 100  o  (N / D) * 100
    const fraccionConMultiplicacion = clean.match(/^\(?\s*([^/]+?)\s*\/\s*([^/)]+?)\s*\)?\s*\*\s*(\d+%?)$/);
    
    if (fraccionConMultiplicacion) {
        const numerador = fraccionConMultiplicacion[1].trim();
        const denominador = fraccionConMultiplicacion[2].trim();
        const multiplicador = fraccionConMultiplicacion[3].trim();
        
        return `
            <div class="bg-white dark:bg-slate-900 px-4 py-3 rounded-lg shadow border border-blue-200 dark:border-blue-800">
                <div class="flex items-center justify-center gap-3 text-base font-semibold text-blue-600 dark:text-blue-400">
                    <span class="text-slate-500 dark:text-slate-400">(</span>
                    ${renderizarFraccion(numerador, denominador)}
                    <span class="text-slate-500 dark:text-slate-400">)</span>
                    <span class="text-slate-400">×</span>
                    <span class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 font-bold">${multiplicador}</span>
                </div>
            </div>
        `;
    }
    
    // Patrón simple: N / D (sin multiplicación)
    const fraccionSimple = clean.match(/^([^/]+?)\s*\/\s*([^/]+?)$/);
    if (fraccionSimple) {
        return `
            <div class="bg-white dark:bg-slate-900 px-4 py-3 rounded-lg shadow border border-blue-200 dark:border-blue-800">
                <div class="flex items-center justify-center gap-2 text-base font-semibold text-blue-600 dark:text-blue-400">
                    ${renderizarFraccion(fraccionSimple[1].trim(), fraccionSimple[2].trim())}
                </div>
            </div>
        `;
    }
    
    // Si no es fracción, mostrar como texto normal
    return `<span class="text-base font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg shadow border border-blue-200 dark:border-blue-800">${clean}</span>`;
}

function renderizarFraccion(numerador, denominador) {
    return `
        <span class="inline-flex flex-col items-center mx-1">
            <span class="px-2 py-1 text-sm font-bold">${numerador}</span>
            <span class="w-full h-0.5 bg-blue-600 dark:bg-blue-400 my-0.5"></span>
            <span class="px-2 py-1 text-sm font-bold">${denominador}</span>
        </span>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function obtenerNombreMacroProceso(macroProcesoId) {
    if (!macroProcesoId || !procesosCache) return macroProcesoId || '-';

    const todasLasCategorias = Object.values(procesosCache).flat();
    const encontrado = todasLasCategorias.find((proc) => proc.id === macroProcesoId);

    if (!encontrado) return macroProcesoId;
    return `${encontrado.code} - ${encontrado.name}`;
}

function getProcessTemplateFromOption(option) {
    if (!option) return null;

    const rawKeyCandidates = [
        option.value,
        option.dataset?.code,
        option.dataset?.name,
        option.textContent
    ];

    const normalizedKeys = rawKeyCandidates
        .map((value) => normalizeText(value))
        .filter(Boolean);

    for (const key of normalizedKeys) {
        if (PROCESS_AUTO_FILL_TEMPLATES[key]) {
            return PROCESS_AUTO_FILL_TEMPLATES[key];
        }
    }

    return null;
}

function buildGenericTemplateFromOption(option) {
    const processName = option?.dataset?.name || option?.textContent || 'Proceso';
    const cleanName = processName.replace(/^\s*[A-Za-z]+\.?\d+\s*-\s*/i, '').trim();

    return {
        version: '1.0',
        unidadResponsable: `Responsable del proceso de ${cleanName}`,
        objetivoProceso: `Asegurar la gestion eficiente del proceso de ${cleanName} de acuerdo con las metas institucionales.`,
        nombreIndicador: `Porcentaje de cumplimiento del proceso de ${cleanName}`,
        frecuencia: 'mensual',
        variables: 'N = Actividades cumplidas\nD = Actividades programadas',
        formulaDefinicion: '(N / D) * 100',
        fuente: 'Registros institucionales',
        meta: '90'
    };
}

function resetIndicadorTemplateSelect(message = 'Primero seleccione Proceso') {
    const indicadorSelect = document.querySelector(INDICADOR_CONFIG.selectors.indicadorTemplateSelect);
    if (!indicadorSelect) return;

    indicatorTemplateOptionsMap = new Map();
    indicadorSelect.innerHTML = `<option value="">${message}</option>`;
    indicadorSelect.disabled = true;
}

function resolveProcessVariantKey(processOption) {
    const candidates = [
        processOption?.value,
        processOption?.dataset?.code,
        processOption?.dataset?.name,
        processOption?.textContent
    ]
        .map((value) => normalizeText(value))
        .filter(Boolean);

    for (const candidate of candidates) {
        if (PROCESS_INDICATOR_VARIANTS[candidate]) {
            return candidate;
        }
    }

    for (const candidate of candidates) {
        if (PROCESS_VARIANT_KEY_ALIASES[candidate]) {
            return PROCESS_VARIANT_KEY_ALIASES[candidate];
        }
    }

    for (const candidate of candidates) {
        const match = candidate.match(/\b(p[ems])\s*\.?\s*0*(\d{1,2})\b/i);
        if (!match) continue;

        const family = String(match[1] || '').toLowerCase();
        const number = Number.parseInt(match[2], 10);
        if (!Number.isInteger(number) || number <= 0) continue;

        const key = `${family}-${String(number).padStart(2, '0')}`;
        if (PROCESS_INDICATOR_VARIANTS[key]) {
            return key;
        }
    }

    return normalizeText(processOption?.value);
}

function getIndicatorTemplatesForProcess(processOption) {
    const processId = resolveProcessVariantKey(processOption);
    const baseTemplate = getProcessTemplateFromOption(processOption) || buildGenericTemplateFromOption(processOption);
    const variants = PROCESS_INDICATOR_VARIANTS[processId] || [];

    if (variants.length === 0) {
        return [
            {
                id: `${processId || 'proceso'}-base`,
                label: baseTemplate.nombreIndicador || 'Indicador sugerido',
                template: baseTemplate
            }
        ];
    }

    return variants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        template: {
            ...baseTemplate,
            ...variant.overrides,
            nombreIndicador: variant.overrides?.nombreIndicador || variant.label || baseTemplate.nombreIndicador
        }
    }));
}

function populateIndicadorTemplateSelect(processOption, preserveSelection = false) {
    const indicadorSelect = document.querySelector(INDICADOR_CONFIG.selectors.indicadorTemplateSelect);
    if (!indicadorSelect) return;

    const currentSelection = preserveSelection ? indicadorSelect.value : '';
    indicatorTemplateOptionsMap = new Map();
    indicadorSelect.innerHTML = '<option value="">Seleccione indicador...</option>';
    indicadorSelect.disabled = true;

    if (!processOption || !processOption.value) return;

    const processId = resolveProcessVariantKey(processOption);
    const templates = getIndicatorTemplatesForProcess(processOption);

    templates.forEach((item, index) => {
        const optionValue = `${processId}::${item.id || index + 1}`;
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = item.label;
        if (item.default) {
            option.dataset.default = 'true';
        }
        indicadorSelect.appendChild(option);
        indicatorTemplateOptionsMap.set(optionValue, item.template);
    });

    indicadorSelect.disabled = templates.length === 0;

    const defaultOption = Array.from(indicadorSelect.options).find((option) => option.dataset.default === 'true');
    if (defaultOption) {
        indicadorSelect.value = defaultOption.value;
        applyAutoFillByIndicatorValue(defaultOption.value);
        return;
    }

    if (currentSelection && indicatorTemplateOptionsMap.has(currentSelection)) {
        indicadorSelect.value = currentSelection;
    }
}

function setFormFieldValue(form, name, value) {
    const field = form.querySelector(`[name="${name}"]`);
    if (!field || value === undefined || value === null) return;

    if (field.tagName === 'SELECT') {
        const normalizedValue = normalizeText(value);
        const matchingOption = Array.from(field.options).find((option) => {
            return normalizeText(option.value) === normalizedValue
                || normalizeText(option.textContent) === normalizedValue;
        });

        if (matchingOption) {
            field.value = matchingOption.value;
        } else {
            field.value = String(value);
        }
    } else {
        field.value = String(value);
    }

    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyAutoFillByIndicatorValue(optionValue) {
    const form = document.querySelector(INDICADOR_CONFIG.selectors.form);
    if (!form || !optionValue) return;

    const template = indicatorTemplateOptionsMap.get(optionValue);
    if (!template) return;

    setFormFieldValue(form, 'version', template.version);
    setFormFieldValue(form, 'unidadResponsable', template.unidadResponsable);
    setFormFieldValue(form, 'objetivoProceso', template.objetivoProceso);
    setFormFieldValue(form, 'nombreIndicador', template.nombreIndicador);
    setFormFieldValue(form, 'frecuencia', template.frecuencia);
    setFormFieldValue(form, 'variables', template.variables);
    setFormFieldValue(form, 'formulaDefinicion', template.formulaDefinicion);
    setFormFieldValue(form, 'fuente', template.fuente);
    setFormFieldValue(form, 'meta', template.meta);

    const versionInput = form.querySelector('[name="version"]');
    if (versionInput && !String(versionInput.value || '').trim()) {
        versionInput.value = '1.0';
        versionInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    showToast('Campos autocompletados segun el indicador seleccionado', 'info', 2200);
}

function saveIndicadorToLocalStorage(payload, savedOrigin) {
    const now = new Date();
    const codigo = payload.codigo || (payload.indicatorName ? 
    `IND-${resolveFacultyCode()}-${new Date().getFullYear()}-001` : 
    `IND-${Date.now()}`
    );

    // ← NUEVO: Usar backendId si existe, sino generar ID local
    const idFinal = payload.backendId || payload.id || Date.now().toString();

    const documentoPendiente = {
        id: idFinal,
        backendId: payload.backendId || null,
        fecha: now.toISOString().split('T')[0],
        hora: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
        createdAt: now.toISOString(),
        fechaRegistro: now.toISOString(),
        codigo,
        descripcion: payload.nombreIndicador || payload.indicatorName || `Ficha de indicador ${codigo}`,
        generadoPor: payload.generadoPor || 'Facultad',
        estado: 'pendiente',
        progreso: 5,
        facultadId: payload.facultadId || 1,
        tipo: 'indicador',
        origen: savedOrigin || 'local'
    };

    const documentosRaw = localStorage.getItem(INDICADOR_STORAGE_KEYS.DOCUMENTOS_LISTA);
    const documentos = documentosRaw ? JSON.parse(documentosRaw) : [];
    const idxDoc = documentos.findIndex((item) => item.codigo === codigo);
    const isNewIndicator = idxDoc < 0;
    if (idxDoc >= 0) {
        documentos[idxDoc] = { ...documentos[idxDoc], ...documentoPendiente };
    } else {
        documentos.unshift(documentoPendiente);
    }
    localStorage.setItem(INDICADOR_STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(documentos));

    const detalleDocumentosRaw = localStorage.getItem(INDICADOR_STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalleDocumentos = detalleDocumentosRaw ? JSON.parse(detalleDocumentosRaw) : {};
    
    // ============================================================
    // 🔥 FIX: MAPEAR correctamente campos del inglés al español
    // El payload del API viene en inglés, pero la ficha usa español
    // ============================================================
    const tipoProcesoLabel = payload.tipoProcesoLabel || payload.processType || '';
    const macroProcesoNombre = payload.macroProcesoNombre || payload.macroProcess || payload.process || '';
    const unidadResponsable = payload.unidadResponsable || payload.responsibleUnit || '';
    const objetivoProceso = payload.objetivoProceso || payload.processObjective || '';
    const nombreIndicador = payload.nombreIndicador || payload.indicatorName || '';
    const frecuencia = payload.frecuencia || payload.frequency || '';
    const variables = payload.variables || '';
    const formulaDefinicion = payload.formulaDefinicion || payload.formula || '';
    const fuente = payload.fuente || payload.dataSource || '';
    const meta = payload.meta !== undefined ? payload.meta : (payload.target !== undefined ? payload.target : '');
    const version = payload.version || '1.0';

    detalleDocumentos[codigo] = {
        tipo: 'indicador',
        codigo,
        titulo: nombreIndicador || `Indicador ${codigo}`,
        version: version, 
        operacion: 'GESTION DE INDICADORES',
        fechaRegistro: now.toISOString(),
        fichaData: {
            // Datos del backend (mapeados) - en inglés
            macroProcess: payload.macroProcess || macroProcesoNombre,
            process: payload.process || macroProcesoNombre,
            responsibleUnit: payload.responsibleUnit || unidadResponsable,
            processType: payload.processType || tipoProcesoLabel,
            processObjective: payload.processObjective || objetivoProceso,
            indicatorName: payload.indicatorName || nombreIndicador,
            frequency: payload.frequency || frecuencia,
            variables: variables,
            dataSource: payload.dataSource || fuente,
            formula: payload.formula || formulaDefinicion,
            target: payload.target !== undefined ? payload.target : meta,
            unit: payload.unit || '%',
            // Datos originales del formulario (nombres en español)
            tipoProceso: payload.tipoProceso || tipoProcesoLabel,
            tipoProcesoLabel: tipoProcesoLabel,
            macroProceso: payload.macroProceso || macroProcesoNombre,
            macroProcesoNombre: macroProcesoNombre,
            unidadResponsable: unidadResponsable,
            objetivoProceso: objetivoProceso,
            nombreIndicador: nombreIndicador,
            frecuencia: frecuencia,
            variables: variables,
            formulaDefinicion: formulaDefinicion,
            fuente: fuente,
            meta: meta,
            version: version,
            codigo: codigo
        },
        indicadorData: payload,
        resumenCampos: [
            { label: 'Version', value: version || '-' },
            { label: 'Tipo de Proceso', value: tipoProcesoLabel || '-' },
            { label: 'Macro Proceso', value: macroProcesoNombre || '-' },
            { label: 'Proceso', value: macroProcesoNombre || '-' },
            { label: 'Oficina o Unidad Responsable', value: unidadResponsable || '-' },
            { label: 'Objetivo del Proceso', value: objetivoProceso || '-' },
            { label: 'Nombre del Indicador', value: nombreIndicador || '-' },
            { label: 'Frecuencia', value: frecuencia || '-' },
            { label: 'Variables', value: variables || '-' },
            { label: 'Formula del Indicador', value: formulaDefinicion || '-' },
            { label: 'Fuente', value: fuente || '-' },
            { label: 'Meta', value: meta !== '' ? String(meta) : '-' }
        ],
        adjuntos: []
    };
    localStorage.setItem(INDICADOR_STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalleDocumentos));

    const detalleIndicadoresRaw = localStorage.getItem(INDICADOR_STORAGE_KEYS.INDICADORES_DETALLE);
    const detalleIndicadores = detalleIndicadoresRaw ? JSON.parse(detalleIndicadoresRaw) : {};
    detalleIndicadores[codigo] = {
        ...payload,
        tipoDocumento: 'indicador',
        fechaRegistro: now.toISOString(),
        macroProcesoTexto: macroProcesoNombre
    };
    localStorage.setItem(INDICADOR_STORAGE_KEYS.INDICADORES_DETALLE, JSON.stringify(detalleIndicadores));

    if (isNewIndicator) {
        localStorage.removeItem(`${INDICADOR_STORAGE_KEYS.HISTORIAL_PREFIX}${codigo}`);
    }
}

function goToDocumentos(codigo) {
    const destino = `facultades-documentos.html?docCode=${encodeURIComponent(codigo)}`;

    if (window.top && window.top !== window) {
        window.top.location.href = destino;
        return;
    }
    if (window.parent && window.parent !== window) {
        window.parent.location.href = destino;
        return;
    }
    window.location.href = destino;
}

function initFormHandler() {
    const btnFinalizar = document.querySelector(INDICADOR_CONFIG.selectors.btnFinalizar);
    const btnExpedientes = document.querySelector(INDICADOR_CONFIG.selectors.btnExpedientes);
    const form = document.querySelector(INDICADOR_CONFIG.selectors.form);

    if (!btnFinalizar || !form) return;

    btnFinalizar.addEventListener('click', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const emptyRequiredFields = getRequiredEmptyFields(form, data);
        if (emptyRequiredFields.length > 0) {
            showToast('Complete todos los campos obligatorios (*)', 'warning');

            emptyRequiredFields.forEach((input) => {
                input.classList.add('ring-2', 'ring-red-500', 'border-red-500');
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    input.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
                }, 3000);
            });

            return;
        }

        const originalText = btnFinalizar.innerHTML;
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = `
            <span class="material-symbols-outlined animate-spin">refresh</span>
            GUARDANDO...
        `;

        try {
            const tipoProcesoInput = form.querySelector(INDICADOR_CONFIG.selectors.tipoProcesoSelect);
            const macroProcesoInput = form.querySelector(INDICADOR_CONFIG.selectors.macroProcesoSelect);

            // ============================================================
            // 🔥 PAYLOAD PARA EL BACKEND (schema exacto de /portal/indicators)
            // ============================================================
            const payload = {
                // Campos en INGLÉS (para el backend)
                macroProcess: getSelectedOptionText(macroProcesoInput) || data.macroProceso || '',
                process: getSelectedOptionText(macroProcesoInput) || data.proceso || data.macroProceso || '',
                responsibleUnit: data.unidadResponsable || '',
                processType: (data.tipoProceso || 'ESTRATEGICO').toUpperCase(),
                processObjective: data.objetivoProceso || '',
                indicatorName: data.nombreIndicador || '',
                frequency: (data.frecuencia || 'MENSUAL').toUpperCase(),
                variables: data.variables || '',
                dataSource: data.fuente || '',
                formula: data.formulaDefinicion || '',
                target: Number(data.meta || 0),
                unit: data.unidad || '%',

                // 🔥 NUEVO: Campos en ESPAÑOL (para localStorage)
                unidadResponsable: data.unidadResponsable || '',
                objetivoProceso: data.objetivoProceso || '',
                nombreIndicador: data.nombreIndicador || '',
                frecuencia: data.frecuencia || '',
                formulaDefinicion: data.formulaDefinicion || '',
                fuente: data.fuente || '',
                meta: data.meta || '',
                version: data.version || '1.0',
                tipoProceso: data.tipoProceso || '',
                tipoProcesoLabel: getSelectedOptionText(tipoProcesoInput),
                macroProceso: data.macroProceso || '',
                macroProcesoNombre: getSelectedOptionText(macroProcesoInput) || obtenerNombreMacroProceso(data.macroProceso)
            };

            // ============================================================
            // DATOS EXTRAS para localStorage (no se envían al backend)
            // ============================================================
            const codigoLocal = data.codigo || await generateIndicatorCode();
            const extrasParaLocal = {
                codigo: codigoLocal,
                tipoProcesoLabel: getSelectedOptionText(tipoProcesoInput),
                macroProcesoNombre: getSelectedOptionText(macroProcesoInput) || obtenerNombreMacroProceso(data.macroProceso),
                facultadId: resolveFacultyId(),
                generadoPor: 'Facultad',
                estado: 'pendiente',
                version: data.version || '1.0'
            };

            let result = null;
            let savedOrigin = 'local';
            let codigoFinal = codigoLocal;
            let backendId = null;  // ← NUEVO: Para guardar UUID del servidor

            // ============================================================
            // 🔥 PASO 1: Intentar crear vía API
            // ============================================================
            if (typeof API !== 'undefined' && API.portal && API.portal.indicators && typeof API.portal.indicators.create === 'function') {
                console.log('📤 POST /portal/indicators:', payload);
                result = await API.portal.indicators.create(payload);
                console.log('📥 Respuesta:', result);

                if (result && result.success) {
                    savedOrigin = 'remote';
                    codigoFinal = result.data?.code || result.data?.codigo || codigoLocal;
                    backendId = result.data?.id || result.data?.uuid || null;
                    
                    // 🔥 NUEVO LOG para ver qué devuelve el backend
                    console.log('📥 Backend response data:', result.data);
                    console.log('   backendId extraído:', backendId);
                    
                    showToast(`Ficha creada en servidor: ${codigoFinal}`, 'success');
                } else {

                    console.warn('⚠️ API respondió error:', result?.status, result?.error);
                }
            } else {
                console.warn('⚠️ API.portal.indicators.create no disponible');
            }

            // ============================================================
            // PASO 2: Si falló API, guardar local
            // ============================================================
            if (!result || !result.success) {
                saveIndicadorToLocalStorage({ ...payload, ...extrasParaLocal, backendId }, 'local');
                result = { success: true, data: { id: codigoLocal, code: codigoLocal } };
                showToast('Sin conexión a API. Guardado localmente.', 'warning', 4000);
            } else {
                // ← NUEVO: Guardar también local como backup/cache, incluyendo backendId
                // Si es éxito del backend, guardar también local como backup
                saveIndicadorToLocalStorage({ 
                    ...payload, 
                    ...extrasParaLocal, 
                    backendId, 
                    codigo: codigoFinal,
                    // 🔥 Incluir también los datos originales del formulario para el detalle
                    version: data.version,
                    unidadResponsable: data.unidadResponsable,
                    objetivoProceso: data.objetivoProceso,
                    nombreIndicador: data.nombreIndicador,
                    frecuencia: data.frecuencia,
                    variables: data.variables,
                    formulaDefinicion: data.formulaDefinicion,
                    fuente: data.fuente,
                    meta: data.meta
                }, savedOrigin);
            }

            showToast(`Ficha ${codigoFinal} creada exitosamente`, 'success');

            // ============================================================
            // PASO 3: Mostrar botón "Ver Expedientes" o redirigir
            // ============================================================
            if (btnExpedientes) {
                setTimeout(() => {
                    btnFinalizar.style.display = 'none';
                    btnExpedientes.classList.remove('hidden');
                    btnExpedientes.href = `facultades-documentos.html?docCode=${encodeURIComponent(codigoFinal)}`;
                    btnExpedientes.onclick = (ev) => {
                        ev.preventDefault();
                        goToDocumentos(codigoFinal);
                    };
                }, INDICADOR_CONFIG.SHOW_DOCUMENTOS_BUTTON_DELAY_MS);
            } else {
                goToDocumentos(codigoFinal);
            }

        } catch (error) {
            console.error('❌ Error:', error);
            showToast(`Error al guardar: ${error.message}`, 'error');
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = originalText;
        }
    });
}

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');

    window.addEventListener('message', (event) => {
        if (event.data?.type === 'theme-change') {
            const newTheme = event.data.theme === 'dark' ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', newTheme === 'dark');
            localStorage.setItem('theme', newTheme);
        }
    });
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.querySelector(INDICADOR_CONFIG.selectors.btnFinalizar)?.click();
        }

        if (e.key === 'Escape') {
            if (confirm('¿Desea salir? Los cambios no guardados se perderán.')) {
                window.location.href = 'facultades-nuevo.html';
            }
        }
    });
}

async function init() {
    console.log('🚀 Ficha de Indicador cargada');

    initTheme();
    initFormulaPreview();
    initFormHandler();
    initKeyboardShortcuts();

    await loadUserData();
    await refreshGeneratedCode();
    await cargarProcesosDesdeAPI();
    initCascadaSelects();

    window.addEventListener('pageshow', () => {
        refreshGeneratedCode();
        rehydrateCascadaFromCurrentSelection();
    });

    showToast('Formulario listo', 'info', 2000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

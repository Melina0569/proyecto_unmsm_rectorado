/**
 * FICHA DE INDICADOR - JavaScript
 * Lógica específica del formulario con integración API
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================

const FICHA_CONFIG = {
    selectors: {
        form: '#ficha-form',
        btnFinalizar: '#btn-finalizar',
        btnExpedientes: '#btn-expedientes',
        codigoField: '#codigo-field',
        tipoProcesoSelect: '#tipo-proceso-select',
        macroProcesoSelect: '#macro-proceso-select',
        uploadArea: '#upload-area',
        fileInput: '#file-input',
        fileInfo: '#file-info',
        // ELIMINADO: procesoSelect - ya no existe en el HTML
        variablesInput: '#variables-input',
        formulaDefinicion: '#formula-definicion',
        formulaPreview: '#formula-preview',
        toastContainer: '#toast-container'
    },
    // ID de facultad por defecto (cambiar según el usuario logueado)
    facultadId: 1,
    SHOW_DOCUMENTOS_BUTTON_DELAY_MS: 1400
};

const FICHA_STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    EXPEDIENTES_LISTA: 'sigpro_expedientes_lista',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    INDICADORES_DETALLE: 'sigpro_indicadores_detalle',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle'
};

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

let currentUser = null;
let userFaculty = null;

function getApiMode() {
    return typeof API !== 'undefined' && typeof API.getMode === 'function' ? API.getMode() : 'desconocido';
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
    const pattern = new RegExp(`^FL-${facultyCode}-${year}-(\\d+)$`);
    const match = String(code || '').trim().match(pattern);
    return match ? Number(match[1]) : null;
}

async function getNextFlujogramaSequence(facultyCode, year) {
    const usedSequences = new Set();
    const docsRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_LISTA);
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

async function generateFlujogramaCode() {
    const year = new Date().getFullYear();
    const facultyCode = resolveFacultyCode();
    const nextSequence = await getNextFlujogramaSequence(facultyCode, year);
    return `FL-${facultyCode}-${year}-${nextSequence}`;
}

async function refreshGeneratedCode() {
    const codigoField = document.querySelector(FICHA_CONFIG.selectors.codigoField);
    if (!codigoField) return;

    codigoField.value = await generateFlujogramaCode();
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

// Almacenamiento temporal de procesos cargados
let procesosCache = null;

// ==========================================
// UTILIDADES
// ==========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.querySelector(FICHA_CONFIG.selectors.toastContainer);
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

// ==========================================
// CARGA DE PROCESOS DESDE API
// ==========================================

async function cargarProcesosDesdeAPI() {
    try {
        showToast('Cargando procesos...', 'info', 2000);
        
        const response = await API.processes.getByFaculty(FICHA_CONFIG.facultadId);
        
        if (!response.success) {
            throw new Error('No se pudieron cargar los procesos');
        }
        
        procesosCache = response.data;
        console.log('Procesos cargados:', procesosCache);
        
        showToast('Procesos cargados correctamente', 'success', 2000);
        
    } catch (error) {
        console.error('Error cargando procesos:', error);
        showToast('Error al cargar procesos. Usando datos locales.', 'warning', 3000);
        
        // Datos de respaldo en caso de error
        procesosCache = {
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
    }
}

// ==========================================
// MAPEO DE TIPOS DE PROCESO
// ==========================================

const tipoProcesoMap = {
    'estrategico': 'strategic',
    'misional': 'missional',
    'de-apoyo': 'support',
};

// ==========================================
// CASCADA DE SELECTS (Tipo -> Macro Proceso) - SIMPLIFICADO
// ==========================================

function initCascadaSelects() {
    const tipoSelect = document.querySelector(FICHA_CONFIG.selectors.tipoProcesoSelect);
    const macroSelect = document.querySelector(FICHA_CONFIG.selectors.macroProcesoSelect);
    
    if (!tipoSelect || !macroSelect) return;
    
    // Cuando cambia el tipo de proceso
    tipoSelect.addEventListener('change', () => {
        const tipo = tipoSelect.value;
        
        // Resetear macro proceso
        macroSelect.innerHTML = '<option value="">Seleccione Proceso...</option>';
        macroSelect.disabled = true;
        
        if (!tipo || !procesosCache) return;
        
        const categoria = tipoProcesoMap[tipo];
        const procesos = procesosCache[categoria] || [];
        
        // Llenar macro procesos
        if (procesos.length > 0) {
            procesos.forEach(proc => {
                const option = document.createElement('option');
                option.value = proc.id;
                option.textContent = `${proc.code} - ${proc.name}`;
                option.dataset.code = proc.code;
                option.dataset.name = proc.name;
                macroSelect.appendChild(option);
            });
            
            macroSelect.disabled = false;
            showToast(`${procesos.length} procesos disponibles`, 'info', 1500);
        } else {
            showToast('No hay procesos para este tipo', 'warning', 2000);
        }
    });
    
    // 🆕 Generar código cuando se selecciona macro proceso (reemplaza el procesoSelect)
    macroSelect.addEventListener('change', () => {
        const codigoField = document.querySelector(FICHA_CONFIG.selectors.codigoField);
        if (macroSelect.value && !codigoField.value) {
            refreshGeneratedCode();
        }
    });
}

// ==========================================
// GENERACIÓN AUTOMÁTICA DE CÓDIGO
// ==========================================

function initCodigoGenerator() {
    const codigoField = document.querySelector(FICHA_CONFIG.selectors.codigoField);
    const nombreInput = document.querySelector('input[name="proceso"]');

    if (nombreInput && codigoField) {
        nombreInput.addEventListener('blur', () => {
            if (nombreInput.value.trim() && !codigoField.value) {
                refreshGeneratedCode();
            }
        });
    }
}

// ==========================================
// FÓRMULA - PREVISUALIZACIÓN CON VARIABLES
// ==========================================

function initFormulaPreview() {
    const formulaDefinicion = document.querySelector(FICHA_CONFIG.selectors.formulaDefinicion);
    const formulaPreview = document.querySelector(FICHA_CONFIG.selectors.formulaPreview);
    
    if (!formulaPreview) return;
    
    function updatePreview() {
        const formula = formulaDefinicion ? formulaDefinicion.value.trim() : '';
        
        if (!formula) {
            formulaPreview.innerHTML = `<span class="text-slate-400 text-sm">Ingrese una fórmula...</span>`;
            return;
        }
        
        // Parsear la fórmula para detectar fracciones
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

/**
 * Parsea la fórmula y convierte X / Y en fracción matemática
 * Soporta: DEVENGADO / PIM, (a+b)/(c+d), etc.
 */
function parsearFormulaConFracciones(formula) {
    // Escapar HTML primero por seguridad
    let safeFormula = escapeHtml(formula);
    
    // Buscar patrones de fracción: algo / algo
    // Puede ser: "DEVENGADO / PIM" o "(a+b) / (c+d)" o "NUM / DEN * 100"
    
    // Regex para encontrar fracciones: (numerador) / (denominador)
    // El numerador puede ser: palabra, número, o expresión entre paréntesis
    // El denominador puede ser: palabra, número, o expresión entre paréntesis
    
    const fraccionRegex = /(\([^\)]+\)|[A-Za-z0-9_]+)\s*\/\s*(\([^\)]+\)|[A-Za-z0-9_]+)/g;
    
    // Reemplazar fracciones con HTML de fracción
    let resultado = safeFormula.replace(fraccionRegex, (match, numerador, denominador) => {
        return renderizarFraccion(numerador.trim(), denominador.trim());
    });
    
    // Si no hubo reemplazo de fracción, mostrar como texto simple
    if (resultado === safeFormula && !formula.includes('/')) {
        return `<span class="text-base font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg shadow border border-blue-200 dark:border-blue-800">${resultado}</span>`;
    }
    
    // Envolver en contenedor si tiene fracción
    return `
        <div class="bg-white dark:bg-slate-900 px-4 py-3 rounded-lg shadow border border-blue-200 dark:border-blue-800">
            <div class="flex items-center gap-2 text-base font-semibold text-blue-600 dark:text-blue-400">
                ${resultado}
            </div>
        </div>
    `;
}

/**
 * Renderiza una fracción en HTML
 */
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

function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function stripAdjuntosContent(data) {
    if (!data || !Array.isArray(data.adjuntos)) return data;
    return {
        ...data,
        adjuntos: data.adjuntos.map((adj) => {
            const { contenido, ...rest } = adj || {};
            return rest;
        })
    };
}

function isQuotaExceededError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.name === 'QuotaExceededError' || message.includes('quota') || message.includes('storage');
}

function cacheAdjuntosTemporales(codigo, adjuntos) {
    if (!codigo || !Array.isArray(adjuntos) || adjuntos.length === 0) return;

    try {
        const raw = sessionStorage.getItem('sigpro_adjuntos_cache');
        const cache = raw ? JSON.parse(raw) : {};
        cache[codigo] = adjuntos;
        sessionStorage.setItem('sigpro_adjuntos_cache', JSON.stringify(cache));
    } catch (error) {
        console.warn('No se pudo guardar cache temporal de adjuntos:', error);
    }
}

function openAdjuntosIndexedDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB no disponible'));
            return;
        }

        const request = indexedDB.open('sigpro_adjuntos_db', 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('adjuntos')) {
                db.createObjectStore('adjuntos', { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB'));
    });
}

async function cacheAdjuntosIndexedDb(codigo, adjuntos) {
    if (!codigo || !Array.isArray(adjuntos) || adjuntos.length === 0) return;

    try {
        const db = await openAdjuntosIndexedDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction('adjuntos', 'readwrite');
            const store = tx.objectStore('adjuntos');

            adjuntos.forEach((adjunto) => {
                const name = String(adjunto?.nombre || adjunto?.name || '').trim();
                if (!name) return;

                store.put({
                    id: `${codigo}::${name}`,
                    codigo,
                    nombre: name,
                    contenido: adjunto?.contenido || '',
                    url: adjunto?.url || '',
                    path: adjunto?.path || '',
                    tipo: adjunto?.tipo || 'PDF',
                    tamaño: adjunto?.tamaño || '',
                    fecha: adjunto?.fecha || '',
                    updatedAt: new Date().toISOString()
                });
            });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('No se pudo guardar adjuntos en IndexedDB'));
        });
        db.close();
    } catch (error) {
        console.warn('No se pudo guardar adjuntos en IndexedDB:', error);
    }
}

function obtenerNombreMacroProceso(macroProcesoId) {
    const macroSelect = document.querySelector(FICHA_CONFIG.selectors.macroProcesoSelect);
    if (!macroSelect) return macroProcesoId || '';

    const option = Array.from(macroSelect.options).find((opt) => opt.value === macroProcesoId);
    return option ? option.textContent.trim() : (macroProcesoId || '');
}

function renderSelectedFileInfo(file) {
    const fileInfo = document.querySelector(FICHA_CONFIG.selectors.fileInfo);
    const uploadArea = document.querySelector(FICHA_CONFIG.selectors.uploadArea);
    if (!fileInfo || !uploadArea) return;

    if (!file) {
        fileInfo.classList.add('hidden');
        fileInfo.innerHTML = '';
        uploadArea.classList.remove('has-file');
        return;
    }

    uploadArea.classList.add('has-file');
    fileInfo.classList.remove('hidden');
    fileInfo.innerHTML = `
        <div class="file-info-item">
            <span class="material-symbols-outlined text-cyan-600">description</span>
            <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(file.name)}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">PDF • ${formatFileSize(file.size)}</p>
            </div>
        </div>
    `;
}

function initFileUpload() {
    const fileInput = document.querySelector(FICHA_CONFIG.selectors.fileInput);
    if (!fileInput) return;

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

        if (!file) {
            renderSelectedFileInfo(null);
            return;
        }

        const isPdf = /\.pdf$/i.test(file.name);
        if (!isPdf) {
            showToast('Solo se permite archivo PDF', 'warning');
            fileInput.value = '';
            renderSelectedFileInfo(null);
            return;
        }

        if (file.size > 25 * 1024 * 1024) {
            showToast('El archivo excede el máximo de 25MB', 'warning');
            fileInput.value = '';
            renderSelectedFileInfo(null);
            return;
        }

        renderSelectedFileInfo(file);
        showToast('Archivo detectado correctamente', 'success', 1400);
    });
}

// ==========================================
// MANEJO DEL FORMULARIO Y BOTÓN EXPEDIENTES
// ==========================================

function initFormHandler() {
    const btnFinalizar = document.querySelector(FICHA_CONFIG.selectors.btnFinalizar);
    const btnExpedientes = document.querySelector(FICHA_CONFIG.selectors.btnExpedientes);
    const form = document.querySelector(FICHA_CONFIG.selectors.form);
    
    if (!btnFinalizar || !form) return;
    
    btnFinalizar.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Validar formulario
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Campos requeridos reales de la ficha de flujograma
        const requiredFields = [
            'codigo',
            'tipoProceso', 
            'macroProceso',
            'proceso'
        ];
        
        const emptyFields = requiredFields.filter(field => !data[field] || !data[field].trim());
        
        if (emptyFields.length > 0) {
            console.log('Campos vacíos:', emptyFields); // Debug
            showToast('Complete todos los campos obligatorios (*)', 'warning');
            
            // Resaltar campos vacíos y hacer scroll al primero
            let firstEmpty = null;
            emptyFields.forEach(fieldName => {
                const input = form.querySelector(`[name="${fieldName}"]`);
                if (input) {
                    input.classList.add('ring-2', 'ring-red-500', 'border-red-500');
                    if (!firstEmpty) firstEmpty = input;
                    setTimeout(() => {
                        input.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
                    }, 3000);
                }
            });
            
            if (firstEmpty) {
                firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            return;
        }

        const fileInput = form.querySelector(FICHA_CONFIG.selectors.fileInput);
        const archivo = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!archivo) {
            showToast('Debe adjuntar el archivo PDF del flujograma', 'warning');
            return;
        }
        
        // Generar código si no existe
        if (!data.codigo || !data.codigo.trim()) {
            const year = new Date().getFullYear();
            const random = Math.floor(Math.random() * 900) + 100;
            data.codigo = `FL-${year}-${random}`;
            document.querySelector(FICHA_CONFIG.selectors.codigoField).value = data.codigo;
        }
        
        // Mostrar carga
        const originalText = btnFinalizar.innerHTML;
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = `
            <span class="material-symbols-outlined animate-spin">refresh</span>
            GUARDANDO...
        `;
        
        try {
            const adjuntos = [];

            if (archivo) {
                const contenido = await fileToBase64(archivo);
                adjuntos.push({
                    nombre: archivo.name,
                    tipo: 'PDF',
                    tamaño: formatFileSize(archivo.size),
                    fecha: new Date().toISOString().split('T')[0],
                    activo: true,
                    icono: 'picture_as_pdf',
                    contenido
                });
            }

            const payload = {
                ...data,
                adjuntos,
                archivos: adjuntos.map((item) => ({ nombre: item.nombre, tamaño: item.tamaño, tipo: item.tipo })),
                macroProcesoNombre: obtenerNombreMacroProceso(data.macroProceso),
                facultadId: resolveFacultyId(),
                generadoPor: currentUser?.correo || 'Facultad',
                origen: 'local'
            };

            cacheAdjuntosTemporales(data.codigo, adjuntos);
            await cacheAdjuntosIndexedDb(data.codigo, adjuntos);

            let result = null;
            if (canUseApiUpload()) {
                const apiFormData = new FormData();
                apiFormData.append('data', JSON.stringify({
                    ...payload,
                    tipo: 'flujograma'
                }));
                if (archivo) {
                    apiFormData.append('archivo0', archivo);
                }
                result = await API.documentos.upload(apiFormData);
            }

            if (!result || !result.success) {
                guardarFlujogramaLocal(payload);
                showToast('Sin conexion a API. Se guardo localmente en este equipo.', 'warning', 4000);
            } else {
                guardarFlujogramaLocal(payload);
            }

            showToast(`Ficha ${data.codigo} creada exitosamente`, 'success');
            
            // Mostrar botón "Ver en Documentos" con una pequeña pausa (patrón hoja-reportes)
            if (btnExpedientes) {
                setTimeout(() => {
                    btnFinalizar.style.display = 'none';
                    btnExpedientes.classList.remove('hidden');
                    btnExpedientes.href = `facultades-documentos.html?docCode=${encodeURIComponent(data.codigo)}`;
                    btnExpedientes.onclick = (e) => {
                        e.preventDefault();
                        guardarFichaYRedirigir(data.codigo);
                    };
                }, FICHA_CONFIG.SHOW_DOCUMENTOS_BUTTON_DELAY_MS);
            } else {
                guardarFichaYRedirigir(data.codigo);
            }
            
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al guardar. Intente nuevamente.', 'error');
            
            // Restaurar botón
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = originalText;
        }
    });
}

// ==========================================
// TEMA OSCURO/CLARO (SINCRONIZADO CON PADRE)
// ==========================================

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    
    console.log('Tema inicial (iframe):', currentTheme);
    
    initParentMessageListener();
}

function initParentMessageListener() {
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'theme-change') {
            const newTheme = event.data.theme;
            
            console.log('Mensaje recibido del padre. Tema:', newTheme);
            
            const html = document.documentElement;
            if (newTheme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            
            localStorage.setItem('theme', newTheme);
            showToast(`Modo ${newTheme === 'dark' ? 'oscuro' : 'claro'} sincronizado`, 'info', 1500);
        }
    });
    
    console.log('✅ Listener de mensajes del padre activado');
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

async function init() {
    console.log('🚀 Ficha de Indicador cargada');
    
    // Inicializar tema primero
    initTheme();
    await loadUserData();
    
    // Cargar procesos desde API
    await cargarProcesosDesdeAPI();
    await refreshGeneratedCode();
    
    // Inicializar componentes
    initCascadaSelects();
    initCodigoGenerator();
    initFileUpload();
    initFormulaPreview();
    initFormHandler();
    initKeyboardShortcuts();

    window.addEventListener('pageshow', () => {
        refreshGeneratedCode();
    });
    
    showToast('Formulario listo', 'info', 2000);
}

// Ejecutar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ==========================================
// ATAJOS DE TECLADO
// ==========================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S para guardar
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.querySelector(FICHA_CONFIG.selectors.btnFinalizar)?.click();
        }
        
        // Escape para volver
        if (e.key === 'Escape') {
            if (confirm('¿Desea salir? Los cambios no guardados se perderán.')) {
                window.location.href = 'facultades-nuevo.html';
            }
        }
    });
}

// ==========================================
// GUARDAR EN API Y REDIRIGIR A EXPEDIENTES
// ==========================================

function guardarFlujogramaLocal(data) {
    try {
        return guardarFlujogramaLocalInternal(data);
    } catch (error) {
        if (!isQuotaExceededError(error)) throw error;

        // Reintentar sin contenido base64 para no bloquear la creación de la ficha.
        const sanitized = stripAdjuntosContent(data);
        showToast('Archivo pesado detectado: se guardó la ficha sin incrustar el PDF para evitar límite de almacenamiento.', 'warning', 5000);
        return guardarFlujogramaLocalInternal(sanitized);
    }
}

function guardarFlujogramaLocalInternal(data) {
    const now = new Date();
    const codigo = data.codigo;

    const documentosRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_LISTA);
    const documentos = documentosRaw ? JSON.parse(documentosRaw) : [];
    const documentoPendiente = {
        id: data.id || Date.now().toString(),
        fecha: now.toISOString().split('T')[0],
        hora: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
        codigo,
        descripcion: data.proceso || data.macroProcesoNombre || `Flujograma ${codigo}`,
        generadoPor: data.generadoPor || 'Facultad',
        estado: 'pendiente',
        progreso: 5,
        facultadId: data.facultadId || 1,
        tipo: 'flujograma',
        origen: data.origen || 'local'
    };

    const idxDoc = documentos.findIndex((item) => item.codigo === codigo);
    if (idxDoc >= 0) {
        documentos[idxDoc] = { ...documentos[idxDoc], ...documentoPendiente };
    } else {
        documentos.unshift(documentoPendiente);
    }
    localStorage.setItem(FICHA_STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(documentos));

    const detalleRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalle = detalleRaw ? JSON.parse(detalleRaw) : {};
    detalle[codigo] = {
        tipo: 'flujograma',
        codigo,
        titulo: data.proceso || `Flujograma ${codigo}`,
        operacion: 'GESTION DE FLUJOGRAMAS',
        fechaRegistro: now.toISOString(),
        fichaData: data,
        resumenCampos: [
            { label: 'Tipo de Proceso', value: data.tipoProceso || '-' },
            { label: 'Proceso', value: data.macroProcesoNombre || data.macroProceso || '-' },
            { label: 'Nombre de la actividad', value: data.proceso || '-' },
            { label: 'Archivo adjunto', value: (data.adjuntos || []).map((adj) => adj.nombre).join(', ') || '-' }
        ],
        adjuntos: data.adjuntos || []
    };
    localStorage.setItem(FICHA_STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalle));

    const detalleFlujogramasRaw = localStorage.getItem('sigpro_flujogramas_detalle');
    const detalleFlujogramas = detalleFlujogramasRaw ? JSON.parse(detalleFlujogramasRaw) : {};
    detalleFlujogramas[codigo] = {
        ...data,
        tipoDocumento: 'flujograma',
        fechaRegistro: now.toISOString(),
        macroProcesoTexto: data.macroProcesoNombre
    };
    localStorage.setItem('sigpro_flujogramas_detalle', JSON.stringify(detalleFlujogramas));
}

async function guardarFichaYRedirigir(codigo) {
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
/**
 * FICHA DE CARACTERIZACIÓN - JavaScript
 * Lógica específica del formulario de caracterización de procesos
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================

const FICHA_CONFIG = {
    selectors: {
        form: '#ficha-form',
        btnFinalizar: '#btn-finalizar',
        btnExpedientes: '#btn-expedientes',
        toastContainer: '#toast-container',
        fileInput: '#file-input',
        fileList: '#file-list',
        tipoProcesoSelect: '#tipo-proceso-select',
        macroProcesoSelect: '#macro-proceso-select',
        codigoField: '#codigo-field'
    },
    SHOW_DOCUMENTOS_BUTTON_DELAY_MS: 1400
};

const FICHA_STORAGE_KEYS = {
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
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

const TIPO_PROCESO_MAP = {
    'estrategico': 'strategic',
    'estratégico': 'strategic',
    'misional': 'missional',
    'de-apoyo': 'support',
    'de apoyo': 'support',
    'soporte': 'support',
    'support': 'support'
};

function getApiMode() {
    return typeof API !== 'undefined' && typeof API.getMode === 'function'
        ? API.getMode()
        : 'desconocido';
}

function canUseApiUpload() {
    return typeof API !== 'undefined'
        && API.portal
        && API.portal.characterizations
        && typeof API.portal.characterizations.upload === 'function';
}

function getRequiredEmptyFields(form, data) {
    return Array.from(form.querySelectorAll('[required]')).filter((field) => {
        if (field.type === 'file') {
            return !field.files || field.files.length === 0;
        }

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

function safeParseJson(rawValue, fallback) {
    try {
        return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
        console.warn('No se pudo parsear JSON de almacenamiento local, usando fallback:', error);
        return fallback;
    }
}

function resolveFacultyId() {
    const storedFacultyId = localStorage.getItem('current_faculty_id');
    const parsedFacultyId = parseInt(storedFacultyId, 10);

    if (Number.isInteger(parsedFacultyId) && parsedFacultyId > 0) {
        return parsedFacultyId;
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

function saveFichaToLocalStorage(payload) {
    const now = new Date();
    const codigo = payload.codigo;
    const docsRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_LISTA);
    const docs = safeParseJson(docsRaw, []);

    const docPendiente = {
        id: payload.id || payload.codigo || Date.now().toString(),
        fecha: now.toISOString().split('T')[0],
        hora: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
        codigo,
        descripcion: payload.nombreProceso || payload.macroProcesoNombre || `Caracterizacion ${codigo}`,
        generadoPor: payload.generadoPor || 'Facultad',
        estado: 'pendiente',
        progreso: 5,
        facultadId: payload.facultadId || 1,
        tipo: 'caracterizacion',
        origen: payload.origen || 'local'
    };

    const idx = docs.findIndex(item => item.codigo === codigo);
    if (idx >= 0) {
        docs[idx] = { ...docs[idx], ...docPendiente };
    } else {
        docs.unshift(docPendiente);
    }
    localStorage.setItem(FICHA_STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(docs));

    const detalleRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalle = safeParseJson(detalleRaw, {});
    detalle[codigo] = {
        tipo: 'caracterizacion',
        codigo,
        titulo: payload.nombreProceso || payload.macroProcesoNombre || `Caracterizacion ${codigo}`,
        operacion: 'GESTION DE CARACTERIZACION',
        fechaRegistro: now.toISOString(),
        fichaData: payload,
        resumenCampos: [
            { label: 'Tipo de Proceso', value: payload.tipoProcesoLabel || payload.tipoProceso || '-' },
            { label: 'Proceso', value: payload.macroProcesoNombre || payload.macroProceso || '-' },
            { label: 'Archivo adjunto', value: (payload.adjuntos || []).map((adj) => adj.nombre).join(', ') || '-' }
        ],
        adjuntos: payload.adjuntos || []
    };
    localStorage.setItem(FICHA_STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalle));
}

function compactEmbeddedAdjuntos(excludeCodigo) {
    const detalleRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_DETALLE);
    const detalle = safeParseJson(detalleRaw, {});

    Object.keys(detalle).forEach((codigo) => {
        if (codigo === excludeCodigo) return;
        const item = detalle[codigo];
        if (!item || !Array.isArray(item.adjuntos)) return;

        item.adjuntos = item.adjuntos.map((adjunto) => {
            if (!adjunto || typeof adjunto !== 'object') return adjunto;
            const { contenido, ...rest } = adjunto;
            return rest;
        });
    });

    localStorage.setItem(FICHA_STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalle));
}

function cacheAdjuntosTemporales(codigo, adjuntos) {
    if (!codigo || !Array.isArray(adjuntos) || adjuntos.length === 0) return;

    try {
        const raw = sessionStorage.getItem('sigpro_adjuntos_cache');
        const cache = safeParseJson(raw, {});
        cache[codigo] = adjuntos;
        sessionStorage.setItem('sigpro_adjuntos_cache', JSON.stringify(cache));
    } catch (error) {
        console.warn('No se pudo guardar cache temporal de adjuntos:', error);
    }
}

function persistCaracterizacionLocal(payload, savedOrigin) {
    const normalizedPayload = {
        ...payload,
        facultadId: resolveFacultyId(),
        generadoPor: 'Facultad',
        origen: savedOrigin
    };

    try {
        saveFichaToLocalStorage(normalizedPayload);
        return;
    } catch (error) {
        const errorText = String(error?.message || '').toLowerCase();
        const isQuotaIssue = error?.name === 'QuotaExceededError'
            || /quota|exceeded|almacenamiento|storage/.test(errorText);

        if (!isQuotaIssue) {
            throw error;
        }

        try {
            // Intentar liberar espacio de adjuntos antiguos para conservar preview del documento actual.
            compactEmbeddedAdjuntos(normalizedPayload.codigo);
            saveFichaToLocalStorage(normalizedPayload);
            showToast('Se liberó espacio local y se guardó el documento con vista previa.', 'warning', 4200);
            return;
        } catch (retryError) {
            console.warn('No se pudo guardar conservando base64 tras compactar almacenamiento:', retryError);
        }

        // Si el almacenamiento se llena, guardamos metadatos sin base64 embebido.
        const payloadSinContenido = {
            ...normalizedPayload,
            adjuntos: (normalizedPayload.adjuntos || []).map((adjunto) => {
                const { contenido, ...rest } = adjunto;
                return rest;
            })
        };

        cacheAdjuntosTemporales(normalizedPayload.codigo, normalizedPayload.adjuntos || []);
        saveFichaToLocalStorage(payloadSinContenido);
        showToast('Se guardó la ficha sin contenido embebido permanente, pero con vista temporal disponible.', 'warning', 5000);
    }
}

// Archivos seleccionados
let selectedFiles = [];

// Procesos cargados desde API
let procesosCache = null;

let currentUser = null;
let userFaculty = null;
let cascadaSelectsInicializada = false;

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
// MANEJO DE ARCHIVOS
// ==========================================

function initFileUpload() {
    const fileInput = document.querySelector(FICHA_CONFIG.selectors.fileInput);
    const fileList = document.querySelector(FICHA_CONFIG.selectors.fileList);
    
    if (!fileInput || !fileList) return;
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
        
        files.forEach(file => {
            const ext = String(file.name || '').split('.').pop().toLowerCase();

            if (!allowedExtensions.includes(ext)) {
                showToast(`Formato no permitido: ${file.name}`, 'warning');
                return;
            }

            // Validar tamaño (25MB)
            if (file.size > 25 * 1024 * 1024) {
                showToast(`El archivo ${file.name} excede 25MB`, 'error');
                return;
            }

            const alreadySelected = selectedFiles.some((selected) => selected.name === file.name && selected.size === file.size);
            if (!alreadySelected) {
                selectedFiles.push(file);
            }
        });
        
        renderFileList();
        e.target.value = '';

        if (selectedFiles.length > 0) {
            showToast('Archivo detectado correctamente', 'success', 1400);
        }
    });
}

function renderFileList() {
    const fileList = document.querySelector(FICHA_CONFIG.selectors.fileList);
    if (!fileList) return;
    
    if (selectedFiles.length === 0) {
        fileList.classList.add('hidden');
        return;
    }
    
    fileList.classList.remove('hidden');
    fileList.innerHTML = selectedFiles.map((file, index) => {
        const size = formatFileSize(file.size);
        const icon = getFileIcon(file.name);
        
        return `
            <div class="file-item">
                <span class="material-symbols-outlined text-purple-500">${icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">${file.name}</p>
                    <p class="text-xs text-slate-500">${size}</p>
                </div>
                <button type="button" class="remove-file" onclick="removeFile(${index})" title="Eliminar">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        `;
    }).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf: 'picture_as_pdf',
        doc: 'description',
        docx: 'description',
        xls: 'table_chart',
        xlsx: 'table_chart',
        default: 'insert_drive_file'
    };
    return icons[ext] || icons.default;
}

/**
 * Convierte un archivo a base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Hacer global para los onclick
window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    showToast('Archivo eliminado', 'info', 1500);
};

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
    const storedFacultyCode = String(localStorage.getItem('current_faculty_code') || '').trim().toUpperCase();
    if (storedFacultyCode) return storedFacultyCode;

    const facultyNameCandidates = [
        localStorage.getItem('current_faculty_name'),
        localStorage.getItem('sigpro_facultad_nombre')
    ];

    for (const name of facultyNameCandidates) {
        const mapped = findFacultyCodeInMap(name);
        if (mapped) return mapped;
    }

    const storedFacultyId = Number.parseInt(localStorage.getItem('current_faculty_id') || '', 10);
    if (Number.isInteger(storedFacultyId) && storedFacultyId > 0) {
        try {
            const faculties = JSON.parse(localStorage.getItem('sigpro_faculties') || '[]');
            const faculty = faculties.find((item) => Number(item?.id) === storedFacultyId);
            if (faculty?.code) return String(faculty.code).toUpperCase();
            if (faculty?.name) {
                const mapped = findFacultyCodeInMap(faculty.name);
                if (mapped) return mapped;
            }
        } catch (error) {
            console.warn('No se pudo resolver facultad desde sigpro_faculties:', error);
        }
    }

    return null;
}

function resolveFacultyCode() {
    if (userFaculty && userFaculty.code) {
        return String(userFaculty.code).toUpperCase();
    }

    const candidates = [
        currentUser?.facultad,
        currentUser?.nombreFacultad,
        userFaculty?.name,
        userFaculty?.nombre
    ];

    for (const candidate of candidates) {
        const code = findFacultyCodeInMap(candidate);
        if (code) return code;
    }

    return 'GEN';
}

function extractSequenceFromCode(code, facultyCode, year) {
    const pattern = new RegExp(`^FC-${facultyCode}-${year}-(\\d+)$`);
    const match = String(code || '').trim().match(pattern);
    return match ? Number(match[1]) : null;
}

async function getNextFichaSequence(facultyCode, year) {
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

async function generateFichaCode() {
    const year = new Date().getFullYear();
    const facultyCode = resolveFacultyCode();
    const nextSequence = await getNextFichaSequence(facultyCode, year);
    return `FC-${facultyCode}-${year}-${nextSequence}`;
}

async function refreshGeneratedCode() {
    const codigoInput = document.querySelector(FICHA_CONFIG.selectors.codigoField);
    if (!codigoInput) return;

    codigoInput.value = await generateFichaCode();
}

function setDemoUser() {
    const fallbackCode = getFacultyCodeFromLocalContext() || 'GEN';

    currentUser = {
        correo: 'demo@unmsm.edu.pe',
        rol: 'Usuario Facultad',
        facultad: localStorage.getItem('current_faculty_name') || 'Facultad no identificada'
    };
    userFaculty = {
        code: fallbackCode,
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
        const resolvedCode = findFacultyCodeInMap(user.facultad || user.nombreFacultad)
            || getFacultyCodeFromLocalContext()
            || 'GEN';

        userFaculty = {
            code: resolvedCode,
            name: user.facultad || user.nombreFacultad || ''
        };
    } catch (error) {
        console.error('Error cargando usuario:', error);
        setDemoUser();
    }
}

function resolveTipoProcesoCategoria(tipoValue) {
    return TIPO_PROCESO_MAP[normalizeText(tipoValue)] || null;
}

function populateMacroProcesoSelect(tipoValue, preserveSelection = true) {
    const macroSelect = document.querySelector(FICHA_CONFIG.selectors.macroProcesoSelect);
    if (!macroSelect) return;

    const currentSelection = preserveSelection ? macroSelect.value : '';
    macroSelect.innerHTML = '<option value="">Primero seleccione Tipo de Proceso</option>';
    macroSelect.disabled = true;

    const categoria = resolveTipoProcesoCategoria(tipoValue);
    if (!categoria || !procesosCache) return;

    const procesos = procesosCache[categoria] || [];
    procesos.forEach(proc => {
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
    const tipoSelect = document.querySelector(FICHA_CONFIG.selectors.tipoProcesoSelect);
    if (!tipoSelect) return;

    populateMacroProcesoSelect(tipoSelect.value, true);
}

function guardarFichaYRedirigir(codigo) {
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

// ==========================================
// MANEJO DEL FORMULARIO
// ==========================================

function initFormHandler() {
    const btnFinalizar = document.querySelector(FICHA_CONFIG.selectors.btnFinalizar);
    const btnExpedientes = document.querySelector(FICHA_CONFIG.selectors.btnExpedientes);
    const form = document.querySelector(FICHA_CONFIG.selectors.form);
    
    if (!btnFinalizar || !form) return;
    
    btnFinalizar.addEventListener('click', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const emptyRequiredFields = getRequiredEmptyFields(form, data);

        if (emptyRequiredFields.length > 0) {
            showToast('Complete todos los campos obligatorios (*)', 'warning');

            emptyRequiredFields.forEach(input => {
                input.classList.add('ring-2', 'ring-red-500', 'border-red-500');
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    input.classList.remove('ring-2', 'ring-red-500', 'border-red-500');
                }, 3000);
            });
            
            return;
        }
        
        // Mostrar carga
        const originalText = btnFinalizar.innerHTML;
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = `
            <span class="material-symbols-outlined animate-spin">refresh</span>
            GUARDANDO...
        `;
        
        try {
            const codigo = data.codigo || `FC-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
            const tipoProcesoInput = form.querySelector(FICHA_CONFIG.selectors.tipoProcesoSelect);
            const macroProcesoInput = form.querySelector(FICHA_CONFIG.selectors.macroProcesoSelect);
            const tipoProcesoLabel = getSelectedOptionText(tipoProcesoInput);
            const macroProcesoLabel = getSelectedOptionText(macroProcesoInput);
            const fileInput = form.querySelector(FICHA_CONFIG.selectors.fileInput);

            if (selectedFiles.length === 0 && fileInput?.files?.length) {
                selectedFiles = Array.from(fileInput.files);
            }

            const payload = {
                ...data,
                codigo,
                tipoProcesoLabel,
                macroProcesoNombre: macroProcesoLabel || obtenerNombreMacroProceso(data.macroProceso),
                archivos: selectedFiles.map(f => ({
                    nombre: f.name,
                    tamaño: formatFileSize(f.size),
                    tipo: getFileIcon(f.name)
                })),
                adjuntos: []
            };
            
            console.log('Datos a enviar:', payload);
            
            const adjuntosConBase64 = [];
            for (let file of selectedFiles) {
                const base64 = await fileToBase64(file);

                const ext = file.name.split('.').pop().toLowerCase();
                let tipo = 'Documento';
                if (ext === 'pdf') tipo = 'PDF';
                else if (ext === 'doc' || ext === 'docx') tipo = 'Word';
                else if (ext === 'xls' || ext === 'xlsx') tipo = 'Excel';
                
                adjuntosConBase64.push({
                    nombre: file.name,
                    tipo: tipo,
                    tamaño: formatFileSize(file.size),
                    fecha: new Date().toISOString().split('T')[0],
                    activo: true,
                    icono: getFileIcon(file.name),
                    contenido: base64
                });
            }
            
            payload.adjuntos = adjuntosConBase64;

            let result = null;
            let savedOrigin = 'local';

            if (canUseApiUpload()) {
                try {
                    // Obtener valores de los selects para los query params
                    const tipoProcesoInput = form.querySelector(FICHA_CONFIG.selectors.tipoProcesoSelect);
                    const macroProcesoInput = form.querySelector(FICHA_CONFIG.selectors.macroProcesoSelect);
                    
                    // El backend espera: macroProcess (nombre del tipo) y process (nombre del macro proceso)
                    const macroProcess = tipoProcesoLabel || 'Estratégico';
                    const process = macroProcesoLabel || 'Gestión estratégica';

                    // Tomar el PRIMER archivo PDF seleccionado (el backend solo acepta 1 PDF)
                    const pdfFile = selectedFiles.find(f => f.name.toLowerCase().endsWith('.pdf')) || selectedFiles[0];
                    
                    if (!pdfFile) {
                        throw new Error('No se seleccionó ningún archivo PDF');
                    }

                    // ✅ USAR EL ENDPOINT CORRECTO DEL BACKEND
                    result = await API.portal.characterizations.upload(pdfFile, macroProcess, process);

                    if (result && result.success) {
                        savedOrigin = 'remote';
                        // ✅ GUARDAR EL CÓDIGO DEL BACKEND
                        const backendCode = result.data?.code || result.data?.id;
                        payload.codigo = backendCode;           // "CAR-2024-1782320546390"
                        payload.id = backendCode;                // Usar el mismo para API calls
                        payload.backendId = backendCode;         // Referencia original
                        
                        showToast(`Ficha subida: ${backendCode}`, 'success', 3000);
                    }
                } catch (apiError) {
                    console.warn('No se pudo guardar en API remota, usando fallback local:', apiError);
                    result = null;
                }
            }

            if (!result || !result.success) {
                // Fallback: guardar solo local
                persistCaracterizacionLocal(payload, 'local');
                result = { success: true, data: { id: payload.codigo, code: payload.codigo } };
                showToast('Sin conexión a API. Se guardó localmente.', 'warning', 4000);
            } else {
                // ✅ API exitosa: guardar localmente también con el código del servidor
                payload.codigo = result.data?.code || payload.codigo;
                payload.id = result.data?.id || result.data?.code;
                persistCaracterizacionLocal(payload, 'remote');
            }

            showToast('Ficha de caracterización creada exitosamente', 'success');

            if (btnExpedientes) {
                setTimeout(() => {
                    btnFinalizar.style.display = 'none';
                    btnExpedientes.classList.remove('hidden');

                    btnExpedientes.href = `facultades-documentos.html?docCode=${encodeURIComponent(codigo)}`;
                    btnExpedientes.onclick = (ev) => {
                        ev.preventDefault();
                        guardarFichaYRedirigir(codigo);
                    };
                }, FICHA_CONFIG.SHOW_DOCUMENTOS_BUTTON_DELAY_MS);
            } else {
                guardarFichaYRedirigir(codigo);
            }
            
        } catch (error) {
            console.error('Error:', error);
            const detail = error?.message ? ` (${error.message})` : '';
            showToast(`Error al guardar${detail}`, 'error');
            
            // Restaurar botón
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = originalText;
        }
    });
}

async function cargarProcesosDesdeAPI() {
    try {
        const currentFacultyId = localStorage.getItem('current_faculty_id');
        const facultadId = parseInt(currentFacultyId, 10) || 1;

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
    console.log('✅ Procesos cargados desde fallback:', procesosCache);
    rehydrateCascadaFromCurrentSelection();
}

// ==========================================
// CASCADA DE SELECTORES
// ==========================================

function initCascadaSelects() {
    if (cascadaSelectsInicializada) {
        rehydrateCascadaFromCurrentSelection();
        return;
    }

    const tipoSelect = document.querySelector(FICHA_CONFIG.selectors.tipoProcesoSelect);
    const macroSelect = document.querySelector(FICHA_CONFIG.selectors.macroProcesoSelect);

    if (!tipoSelect || !macroSelect) {
        console.warn('⚠️ No se encontraron los selectores de tipo/macro proceso');
        return;
    }

    tipoSelect.addEventListener('change', () => {
        populateMacroProcesoSelect(tipoSelect.value, false);
    });

    cascadaSelectsInicializada = true;
    rehydrateCascadaFromCurrentSelection();
}

function obtenerNombreMacroProceso(macroProcesoId) {
    if (!macroProcesoId || !procesosCache) return macroProcesoId || '-';
    const todasLasCategorias = Object.values(procesosCache).flat();
    const encontrado = todasLasCategorias.find(proc => proc.id === macroProcesoId);
    return encontrado ? `${encontrado.code} - ${encontrado.name}` : macroProcesoId;
}

// ==========================================
// TEMA OSCURO/CLARO
// ==========================================

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

// Escuchar cambios de tema desde el iframe padre
window.addEventListener('message', (event) => {
    if (event.data.type === 'theme-change') {
        const theme = event.data.theme;
        console.log('🌌 Cambio de tema recibido:', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }
});

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
// INICIALIZACIÓN
// ==========================================

function init() {
    console.log('🚀 Ficha de Caracterización cargada');
    
    initTheme();
    initFileUpload();
    initFormHandler();
    initKeyboardShortcuts();

    loadUserData()
        .then(() => refreshGeneratedCode())
        .catch(() => refreshGeneratedCode());
    
    // Cargar procesos y después configurar cascada
    cargarProcesosDesdeAPI().then(() => {
        initCascadaSelects();
        rehydrateCascadaFromCurrentSelection();
        console.log('✅ Cascada de selectores inicializada');
    });

    window.addEventListener('pageshow', () => {
        refreshGeneratedCode();
        rehydrateCascadaFromCurrentSelection();
    });
    
    showToast('Formulario listo', 'info', 2000);
}

// Ejecutar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
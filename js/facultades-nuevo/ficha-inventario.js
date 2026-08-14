/**
 * FICHA DE INVENTARIO - JavaScript
 * Solo código autogenerado, con patrón compatible con las otras fichas.
 */

const FICHA_CONFIG = {
    selectors: {
        codigoField: '#codigo-field',
        btnFinalizar: '#btn-finalizar',
        btnExpedientes: '#btn-expedientes',
        toastContainer: '#toast-container',
        fileInput: '#file-input',
        fileList: '#file-list'
    },
    SHOW_DOCUMENTOS_BUTTON_DELAY_MS: 1400
};

const _SK_MODE = (typeof CONFIG !== 'undefined' && CONFIG.MODE) ? CONFIG.MODE : 'local';
const FICHA_STORAGE_KEYS = {
    DOCUMENTOS_LISTA:   `${_SK_MODE}_sigpro_documentos_lista`,
    DOCUMENTOS_DETALLE: `${_SK_MODE}_sigpro_documentos_detalle`  // ← agregar también
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
let selectedFiles = [];

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

function getApiMode() {
    return typeof API !== 'undefined' && typeof API.getMode === 'function' ? API.getMode() : 'desconocido';
}

function canUseApiUpload() {
    return typeof API !== 'undefined' && API.documentos && typeof API.documentos.upload === 'function';
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

function getNextSequence(facultyCode, year) {
    const usedSequences = new Set();
    const docsRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_LISTA);
    const docs = docsRaw ? JSON.parse(docsRaw) : [];

    docs.forEach((doc) => {
        const match = String(doc.codigo || '').trim().match(new RegExp(`^INV-${facultyCode}-${year}-(\\d+)$`));
        if (match) {
            usedSequences.add(Number(match[1]));
        }
    });

    let nextSequence = 1;
    while (usedSequences.has(nextSequence)) {
        nextSequence += 1;
    }

    return nextSequence;
}

function generateInventoryCode() {
    const year = new Date().getFullYear();
    const facultyCode = resolveFacultyCode();
    const sequence = getNextSequence(facultyCode, year);
    return `INV-${facultyCode}-${year}-${sequence}`;   // ← sin padStart
}

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

function refreshGeneratedCode() {
    const codigoField = document.querySelector(FICHA_CONFIG.selectors.codigoField);
    if (!codigoField) return;

    codigoField.value = generateInventoryCode();
}

function setTodayDefaultDate() {
    const dateInput = document.querySelector('input[name="fechaElaboracion"]');
    if (!dateInput || dateInput.value) return;

    dateInput.value = new Date().toISOString().split('T')[0];
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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

// ==========================================
// INDEXEDDB: Almacén para adjuntos pesados
// ==========================================

function openSigproIndexedDB() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB no disponible'));
            return;
        }
        const request = indexedDB.open('sigpro_adjuntos_db', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('adjuntos')) {
                db.createObjectStore('adjuntos', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB'));
    });
}

/**
 * Guarda el contenido base64 de los adjuntos en IndexedDB y retorna
 * solo metadata ligera (sin el contenido pesado) para localStorage.
 */
async function persistirAdjuntosGrandes(codigo, adjuntos) {
    if (!adjuntos || adjuntos.length === 0) return [];

    try {
        const db = await openSigproIndexedDB();
        const tx = db.transaction('adjuntos', 'readwrite');
        const store = tx.objectStore('adjuntos');

        const metadata = [];
        for (let i = 0; i < adjuntos.length; i++) {
            const adj = adjuntos[i];
            const id = `${codigo}_adj_${i}_${Date.now()}`;

            // Solo guardar en IndexedDB si hay contenido pesado (base64)
            if (adj.contenido && String(adj.contenido).length > 200) {
                await new Promise((res, rej) => {
                    const putReq = store.put({
                        id,
                        contenido: adj.contenido,
                        nombre: adj.nombre,
                        tipoMime: adj.tipoMime || adj.tipo || '',
                        fecha: adj.fecha || new Date().toISOString()
                    });
                    putReq.onsuccess = () => res();
                    putReq.onerror = () => rej(putReq.error);
                });
            }

            metadata.push({
                nombre: adj.nombre,
                tipo: adj.tipo,
                tamaño: adj.tamaño,
                fecha: adj.fecha,
                activo: adj.activo !== false,
                icono: adj.icono,
                indexedDbId: id   // ← referencia para recuperarlo luego
            });
        }
        return metadata;
    } catch (e) {
        console.warn('IndexedDB falló, usando solo metadata sin contenido:', e);
        return adjuntos.map(adj => ({
            nombre: adj.nombre,
            tipo: adj.tipo,
            tamaño: adj.tamaño,
            fecha: adj.fecha,
            activo: adj.activo !== false,
            icono: adj.icono
        }));
    }
}

// ==========================================
// GUARDAR INVENTARIO (ahora async)
// ==========================================

async function guardarInventarioLocal(payload) {
    const now = new Date();
    const codigo = payload.codigo;
    const documentosRaw = localStorage.getItem(FICHA_STORAGE_KEYS.DOCUMENTOS_LISTA);
    const documentos = documentosRaw ? JSON.parse(documentosRaw) : [];
    const fechaElaboracion = payload.fechaElaboracion || '';
    const version = payload.version || '';

    // 1️⃣  Mover adjuntos pesados a IndexedDB, quedarnos solo con metadata
    const adjuntosLigeros = await persistirAdjuntosGrandes(codigo, payload.adjuntos || []);

    // 2️⃣  Payload limpio (sin base64) para guardar en fichaData
    const payloadLimpio = {
        ...payload,
        adjuntos: adjuntosLigeros
    };

    const documentoPendiente = {
        id: payload.id || Date.now().toString(),
        fecha: now.toISOString().split('T')[0],
        hora: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
        codigo,
        asunto: 'Inventarios',
        descripcion: `Ficha de inventario ${codigo}`,
        generadoPor: payload.generadoPor || 'Facultad',
        estado: 'pendiente',
        progreso: 5,
        facultadId: payload.facultadId || 1,
        tipo: 'inventario',
        origen: payload.origen || 'local'
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
        tipo: 'inventario',
        asunto: 'Inventarios',
        codigo,
        titulo: `Inventario ${codigo}`,
        version,
        fechaElaboracion,
        operacion: 'GESTION DE INVENTARIO',
        fechaRegistro: now.toISOString(),
        fichaData: payloadLimpio,   // ← sin base64
        resumenCampos: [
            { label: 'Versión', value: version || '-' },
            { label: 'Fecha de elaboración', value: fechaElaboracion || '-' },
            { label: 'Documento adjunto', value: adjuntosLigeros.map(a => a.nombre).join(', ') || '-' },
            { label: 'Google Sheets', value: payload.googleSheetsUrl || '-' }
        ],
        adjuntos: adjuntosLigeros,     // ← sin base64
        googleSheetsUrl: payload.googleSheetsUrl || null,
        googleSheetsRange: payload.googleSheetsRange || 'A1:Z50'
    };

    try {
        localStorage.setItem(FICHA_STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalle));
        localStorage.setItem('sigpro_documentos_detalle', JSON.stringify(detalle));

        // Sync modo-agnóstico
        sincronizarClavesNeutras(documentoPendiente);
    } catch (quotaError) {
        console.error('❌ localStorage lleno incluso sin adjuntos:', quotaError);
        throw new Error('Almacenamiento local lleno. Elimine documentos antiguos o adjunte archivos más pequeños.');
    }
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

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

function applyTheme(theme) {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', normalizedTheme === 'dark');
    localStorage.setItem('theme', normalizedTheme);
}

window.addEventListener('message', (event) => {
    if (event.data?.type !== 'theme-change') return;
    applyTheme(event.data.theme);
});

function initFileUpload() {
    const fileInput = document.querySelector(FICHA_CONFIG.selectors.fileInput);
    if (!fileInput) return;

    fileInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files || []);

        files.forEach((file) => {
            if (file.size > 25 * 1024 * 1024) {
                showToast(`El archivo ${file.name} excede 25MB`, 'error');
                return;
            }

            selectedFiles.push(file);
        });

        renderFileList();
        fileInput.value = '';
    });
}

async function initFormHandler() {
    const btnFinalizar = document.querySelector(FICHA_CONFIG.selectors.btnFinalizar);
    const btnExpedientes = document.querySelector(FICHA_CONFIG.selectors.btnExpedientes);
    if (!btnFinalizar) return;

    btnFinalizar.addEventListener('click', async (e) => {
        e.preventDefault();

        const form = document.getElementById('ficha-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (!data.version || !String(data.version).trim()) {
            showToast('Complete la versión', 'warning');
            return;
        }

        if (!data.fechaElaboracion || !String(data.fechaElaboracion).trim()) {
            showToast('Complete la fecha de elaboración', 'warning');
            return;
        }

        const originalText = btnFinalizar.innerHTML;
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = `
            <span class="material-symbols-outlined animate-spin">refresh</span>
            GUARDANDO...
        `;

        try {
            const adjuntos = [];
            for (const file of selectedFiles) {
                const contenido = await fileToBase64(file);
                adjuntos.push({
                    nombre: file.name,
                    tipo: getFileIcon(file.name),
                    tamaño: formatFileSize(file.size),
                    fecha: new Date().toISOString().split('T')[0],
                    activo: true,
                    icono: getFileIcon(file.name),
                    contenido
                });
            }

            const payload = {
                ...data,
                codigo: data.codigo || generateInventoryCode(),
                facultadId: resolveFacultyId(),
                generadoPor: 'Facultad',
                origen: 'local',
                adjuntos,
                googleSheetsUrl: data.googleSheetsUrl || '',
                googleSheetsRange: data.googleSheetsRange || 'A1:Z50'
            };

            let result = null;
            if (canUseApiUpload()) {
                const apiFormData = new FormData();
                apiFormData.append('data', JSON.stringify({
                    ...payload,
                    tipo: 'inventario'
                }));

                selectedFiles.forEach((file, index) => {
                    apiFormData.append(`archivo${index}`, file);
                });

                result = await API.documentos.upload(apiFormData);
            }

            guardarInventarioLocal(payload);

            if (!result || !result.success) {
                showToast('Sin conexion a API. Se guardo localmente en este equipo.', 'warning', 4000);
            }

            showToast(`Ficha ${payload.codigo} creada exitosamente`, 'success');

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'document-created',
                    docCode: payload.codigo,
                    docName: `Inventario ${payload.codigo}`,
                    docType: 'inventario',
                    docStatus: 'pendiente',
                    facultyId: payload.facultadId || resolveFacultyId()
                }, '*');
            }

            if (btnExpedientes) {
                setTimeout(() => {
                    btnFinalizar.style.display = 'none';
                    btnExpedientes.classList.remove('hidden');
                    btnExpedientes.href = `facultades-documentos.html?docCode=${encodeURIComponent(payload.codigo)}`;
                    btnExpedientes.onclick = (ev) => {
                        ev.preventDefault();
                        goToDocumentos(payload.codigo);
                    };
                }, FICHA_CONFIG.SHOW_DOCUMENTOS_BUTTON_DELAY_MS);
            } else {
                goToDocumentos(payload.codigo);
            }
        } catch (error) {
            console.error('Error guardando inventario:', error);
            showToast('Error al guardar. Intente nuevamente.', 'error');
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = originalText;
        }
    });
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            refreshGeneratedCode();
            showToast('Código regenerado', 'success', 1800);
        }

        if (e.key === 'Escape') {
            if (confirm('¿Desea salir?')) {
                window.location.href = 'facultades-nuevo.html';
            }
        }
    });
}

async function init() {
    initTheme();
    initFileUpload();
    await loadUserData();
    setTodayDefaultDate();
    refreshGeneratedCode();
    initFormHandler();
    initKeyboardShortcuts();

    window.addEventListener('pageshow', () => {
        refreshGeneratedCode();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(filename) {
    const ext = String(filename || '').split('.').pop().toLowerCase();
    const icons = {
        pdf: 'picture_as_pdf',
        doc: 'description',
        docx: 'description',
        xls: 'table_chart',
        xlsx: 'table_chart',
        png: 'image',
        jpg: 'image',
        jpeg: 'image',
        default: 'insert_drive_file'
    };

    return icons[ext] || icons.default;
}

function renderFileList() {
    const fileList = document.querySelector(FICHA_CONFIG.selectors.fileList);
    if (!fileList) return;

    if (selectedFiles.length === 0) {
        fileList.classList.add('hidden');
        fileList.innerHTML = '';
        return;
    }

    fileList.classList.remove('hidden');
    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
            <span class="material-symbols-outlined text-emerald-500">${getFileIcon(file.name)}</span>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">${file.name}</p>
                <p class="text-xs text-slate-500">${formatFileSize(file.size)}</p>
            </div>
            <button type="button" class="text-slate-400 hover:text-red-500 transition-colors" onclick="removeInventoryFile(${index})" title="Eliminar">
                <span class="material-symbols-outlined text-base">close</span>
            </button>
        </div>
    `).join('');
}

window.removeInventoryFile = function(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
};

// ==========================================
// SYNC MODO-AGNÓSTICO: Guarda en claves sin prefijo
// para que funcione al cambiar local ↔ remote
// ==========================================
function sincronizarClavesNeutras(doc) {
    try {
        // 1) Lista neutral de documentos (sin prefijo local/remote)
        const neutralRaw = localStorage.getItem('sigpro_documentos_lista');
        const neutral = neutralRaw ? JSON.parse(neutralRaw) : [];
        const idx = neutral.findIndex(d => d.codigo === doc.codigo);
        if (idx >= 0) {
            neutral[idx] = { ...neutral[idx], ...doc };
        } else {
            neutral.unshift(doc);
        }
        localStorage.setItem('sigpro_documentos_lista', JSON.stringify(neutral));

        // 2) Reportes (para que el dashboard siempre cuente)
        const reportesRaw = localStorage.getItem('sigpro_reportes');
        const reportes = reportesRaw ? JSON.parse(reportesRaw) : [];
        const idxR = reportes.findIndex(r => r.codigo === doc.codigo);
        const reporteDoc = {
            id: doc.id,
            codigo: doc.codigo,
            nombre: doc.descripcion,
            descripcion: doc.descripcion,
            fecha: doc.fecha,
            hora: doc.hora,
            estado: doc.estado,
            generadoPor: doc.generadoPor,
            progreso: doc.progreso,
            facultadId: doc.facultadId,
            tipo: doc.tipo,
            origen: doc.origen
        };
        if (idxR >= 0) {
            reportes[idxR] = { ...reportes[idxR], ...reporteDoc };
        } else {
            reportes.unshift(reporteDoc);
        }
        localStorage.setItem('sigpro_reportes', JSON.stringify(reportes));
    } catch (e) {
        console.warn('Error sincronizando a claves neutrales:', e);
    }
}
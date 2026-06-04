/**
 * HOJA DE REPORTE - JavaScript
 * Integrado con API UNMSM (modo hibrido: remoto + fallback local)
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================

const REPORT_CONFIG = {
    selectors: {
        form: '#reporte-form',
        btnFinalizar: '#btn-finalizar',
        btnExpedientes: '#btn-expedientes',
        toastContainer: '#toast-container',
        fileInput: '#file-input',
        fileList: '#file-list',
        excelInput: '#excel-file-input',
        excelList: '#excel-file-list',
        codigoReporte: '#codigo-reporte',
        nombreResponsable: '#nombre-responsable',
        cargoResponsable: '#cargo-responsable',
        unidadOrganicaResponsable: '#unidad-organica-responsable'
    },
    DOCUMENT_TYPE: 'reporte',
    API_ENDPOINT: '/documentos',
    SHOW_DOCUMENTOS_BUTTON_DELAY_MS: 1400
};

const REPORT_STORAGE_KEYS = {
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
    'Informática': 'FISI',
};

// Archivos seleccionados
let selectedFiles = [];
let selectedExcelFile = null;
let currentUser = null;
let userFaculty = null;

function getApiMode() {
    return typeof API !== 'undefined' && typeof API.getMode === 'function'
        ? API.getMode()
        : 'desconocido';
}

function canUseApiUpload() {
    return typeof API !== 'undefined'
        && API.documentos
        && typeof API.documentos.upload === 'function';
}

// ==========================================
// UTILIDADES
// ==========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.querySelector(REPORT_CONFIG.selectors.toastContainer);
    if (!container) return;

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };

    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-amber-500'
    };

    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] toast-enter`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icons[type]}</span>
        <span class="font-medium text-sm">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function cleanFileName(value) {
    return String(value || 'reporte')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s/g, '_');
}

function formatReportDate(value) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return String(value).trim() || '-';
    }
    return parsed.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function buildReportPdfAttachment(reportData, nowDate) {
    const JsPDF = window.jspdf?.jsPDF;
    if (!JsPDF) {
        throw new Error('jsPDF no está disponible para generar el PDF del reporte');
    }

    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    const colors = {
        header: [22, 78, 99],
        accent: [16, 185, 129],
        border: [203, 213, 225],
        fill: [248, 250, 252],
        text: [15, 23, 42],
        muted: [100, 116, 139]
    };

    let cursorY = margin;
    const safe = (value) => String(value ?? '').trim() || '-';

    const drawHeader = () => {
        pdf.setFillColor(...colors.header);
        pdf.roundedRect(margin, cursorY, contentWidth, 24, 4, 4, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text('HOJA DE REPORTE', margin + 6, cursorY + 10);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text('Documento formal generado desde SIGPRO', margin + 6, cursorY + 17);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(safe(reportData.codigo), pageWidth - margin - 2, cursorY + 10, { align: 'right' });
        pdf.setFontSize(8);
        pdf.text(`Fecha: ${nowDate}`, pageWidth - margin - 2, cursorY + 17, { align: 'right' });
        cursorY += 30;
    };

    const ensureSpace = (heightNeeded) => {
        if (cursorY + heightNeeded <= pageHeight - margin) return;
        pdf.addPage();
        cursorY = margin;
        drawHeader();
    };

    const drawPair = (leftLabel, leftValue, rightLabel, rightValue) => {
        const boxHeight = 22;
        ensureSpace(boxHeight + 4);
        const halfWidth = (contentWidth - 4) / 2;
        const items = [
            { x: margin, label: leftLabel, value: safe(leftValue) },
            { x: margin + halfWidth + 4, label: rightLabel, value: safe(rightValue) }
        ];

        items.forEach((item) => {
            pdf.setDrawColor(...colors.border);
            pdf.setFillColor(...colors.fill);
            pdf.roundedRect(item.x, cursorY, halfWidth, boxHeight, 2, 2, 'FD');
            pdf.setTextColor(...colors.muted);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.text(item.label.toUpperCase(), item.x + 3, cursorY + 6);
            pdf.setTextColor(...colors.text);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            const lines = pdf.splitTextToSize(item.value, halfWidth - 6);
            pdf.text(lines, item.x + 3, cursorY + 12);
        });

        cursorY += boxHeight + 4;
    };

    const drawSection = (title, value) => {
        const textLines = pdf.splitTextToSize(safe(value), contentWidth - 8);
        const boxHeight = Math.max(18, (textLines.length * 4.5) + 10);
        ensureSpace(boxHeight + 10);

        pdf.setFillColor(...colors.accent);
        pdf.roundedRect(margin, cursorY, contentWidth, 8, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.text(title.toUpperCase(), margin + 3, cursorY + 5.5);
        cursorY += 11;

        pdf.setDrawColor(...colors.border);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin, cursorY, contentWidth, boxHeight, 2, 2, 'FD');
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(textLines, margin + 4, cursorY + 6);
        cursorY += boxHeight + 4;
    };

    drawHeader();
    drawPair('Código', reportData.codigo, 'Semestre', reportData.semestre);
    drawPair('Fecha de elaboración', formatReportDate(reportData.fechaElaboracion), 'Estado', 'Pendiente de validación');
    drawPair('Responsable', reportData.responsable, 'Cargo', reportData.cargo);
    drawPair('Unidad orgánica Responsable', reportData.unidadOrganicaResponsable, 'Documento principal', reportData.documentoPrincipal);
    drawSection('Actividades realizadas', reportData.actividades);
    drawSection('Resultados obtenidos', reportData.resultados);
    drawSection('Observaciones', reportData.observaciones);

    const supportFiles = Array.isArray(reportData.archivosSoporte) && reportData.archivosSoporte.length > 0
        ? reportData.archivosSoporte.join(', ')
        : '-';
    drawSection('Archivos de soporte', supportFiles);

    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        const footerY = pageHeight - 9;
        pdf.setDrawColor(...colors.border);
        pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
        pdf.setTextColor(...colors.muted);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text('SIGPRO UNMSM', margin, footerY);
        pdf.text(`Página ${page} de ${pages}`, pageWidth - margin, footerY, { align: 'right' });
    }

    return {
        nombre: `${cleanFileName(reportData.codigo)}.pdf`,
        tipo: 'PDF',
        tamaño: '1 archivo',
        fecha: nowDate,
        activo: true,
        icono: 'picture_as_pdf',
        categoria: 'pdf',
        mimeType: 'application/pdf',
        contenido: pdf.output('datauristring')
    };
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
    const pattern = new RegExp(`^HR-${facultyCode}-${year}-(\\d+)$`);
    const match = String(code || '').trim().match(pattern);
    return match ? Number(match[1]) : null;
}

async function getNextReportSequence(facultyCode, year) {
    const usedSequences = new Set();
    const docsRaw = localStorage.getItem(REPORT_STORAGE_KEYS.DOCUMENTOS_LISTA);
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

async function generateReportCode() {
    const year = new Date().getFullYear();
    const facultyCode = resolveFacultyCode();
    const nextSequence = await getNextReportSequence(facultyCode, year);
    return `HR-${facultyCode}-${year}-${nextSequence}`;
}

async function refreshGeneratedCode() {
    const codigoInput = document.querySelector(REPORT_CONFIG.selectors.codigoReporte);
    if (!codigoInput) return;

    const generatedCode = await generateReportCode();
    codigoInput.value = generatedCode;
}

// ==========================================
// CARGAR DATOS DE USUARIO DESDE API
// ==========================================

async function loadUserData() {
    try {
        if (typeof API === 'undefined' || !API.auth) {
            setDemoUser();
            showToast('API no disponible. Se usara modo local en este equipo.', 'warning', 3500);
            return;
        }

        const user = API.auth.getUser();
        if (!user) {
            setDemoUser();
            showToast('No hay sesion activa. Se usara modo local temporal.', 'warning', 3500);
            return;
        }

        currentUser = user;

        // Extraer facultad del usuario (múltiples fuentes)
        const facultyName = user.facultad || user.nombreFacultad || user.facultyName || user.faculty;
        if (facultyName) {
            userFaculty = await findFacultyId(facultyName);
        }

        // Si aún no hay facultad, inferir del correo
        if (!userFaculty && user.correo) {
            const domain = user.correo.split('@')[0];
            if (domain.includes('fisi')) {
                userFaculty = { id: 20, name: 'Ingeniería de Sistemas e Informática', code: 'FISI' };
            }
        }

        // Prellenar campos del usuario
        const nombreInput = document.querySelector(REPORT_CONFIG.selectors.nombreResponsable);
        const cargoInput = document.querySelector(REPORT_CONFIG.selectors.cargoResponsable);
        const unidadInput = document.querySelector(REPORT_CONFIG.selectors.unidadOrganicaResponsable);

        if (nombreInput && user.correo) {
            const nameFromEmail = user.correo.split('@')[0]
                .split('.')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            nombreInput.value = nameFromEmail;
        }

        if (cargoInput && user.rol) {
            cargoInput.value = user.rol;
        }

        if (unidadInput) {
            unidadInput.value = user.unidad || user.area || user.oficina || user.nombreUnidad || user.nombreUnidadResponsable || '';
        }

        console.log('Usuario cargado:', { user, faculty: userFaculty });

    } catch (error) {
        console.error('Error cargando usuario:', error);
        setDemoUser();
        showToast(error.message || 'No se pudo cargar la sesion', 'error', 4500);
    }
}

function setDemoUser() {
    currentUser = {
        correo: 'demo@unmsm.edu.pe',
        rol: 'Usuario Facultad',
        facultad: 'Facultad de Ingeniería de Sistemas',
        unidad: 'Oficina de Planificación'
    };
    userFaculty = { id: 20, name: 'Ingeniería de Sistemas e Informática', code: 'FISI' };
}

async function findFacultyId(facultyName) {
    try {
        if (!API.faculties || !API.faculties.getAll) return null;

        const result = await API.faculties.getAll();
        if (result.success && result.data) {
            const faculty = result.data.find(f =>
                facultyName.includes(f.name) || f.name.includes(facultyName.replace('Facultad de ', ''))
            );
            return faculty || null;
        }
    } catch (e) {
        console.error('Error buscando facultad:', e);
    }
    return null;
}

// ==========================================
// MANEJO DE ARCHIVOS
// ==========================================

function initFileUpload() {
    const fileInput = document.querySelector(REPORT_CONFIG.selectors.fileInput);
    const fileList = document.querySelector(REPORT_CONFIG.selectors.fileList);
    const excelInput = document.querySelector(REPORT_CONFIG.selectors.excelInput);

    if (fileInput && fileList) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);

            files.forEach(file => {
                if (file.size > 25 * 1024 * 1024) {
                    showToast(`El archivo ${file.name} excede 25MB`, 'error');
                    return;
                }

                if (isExcelFile(file.name)) {
                    showToast(`Use el apartado Excel para ${file.name}`, 'warning', 2500);
                    return;
                }

                selectedFiles.push(file);
            });

            renderFileList();
            fileInput.value = '';
        });
    }

    if (!excelInput) return;

    excelInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isExcelFile(file.name)) {
            showToast('Solo se permiten archivos Excel (.xls, .xlsx)', 'warning');
            excelInput.value = '';
            return;
        }

        if (file.size > 25 * 1024 * 1024) {
            showToast(`El archivo ${file.name} excede 25MB`, 'error');
            excelInput.value = '';
            return;
        }

        selectedExcelFile = file;
        renderExcelFile();
        excelInput.value = '';
    });
}

function renderFileList() {
    const fileList = document.querySelector(REPORT_CONFIG.selectors.fileList);
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
                <span class="material-symbols-outlined text-emerald-500">${icon}</span>
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

function renderExcelFile() {
    const excelList = document.querySelector(REPORT_CONFIG.selectors.excelList);
    if (!excelList) return;

    if (!selectedExcelFile) {
        excelList.classList.add('hidden');
        excelList.innerHTML = '';
        return;
    }

    excelList.classList.remove('hidden');
    excelList.innerHTML = `
        <div class="file-item">
            <span class="material-symbols-outlined text-emerald-500">table_chart</span>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">${selectedExcelFile.name}</p>
                <p class="text-xs text-slate-500">${formatFileSize(selectedExcelFile.size)}</p>
            </div>
            <button type="button" class="remove-file" onclick="removeExcelFile()" title="Eliminar Excel">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
    `;
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
        jpg: 'image',
        jpeg: 'image',
        png: 'image',
        default: 'insert_drive_file'
    };
    return icons[ext] || icons.default;
}

function isExcelFile(filename) {
    return /\.(xlsx|xls)$/i.test(String(filename || ''));
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file?.name || ''}`));
        reader.readAsDataURL(file);
    });
}

function safeParseJson(raw, fallback = null) {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function cacheAdjuntosTemporales(codigo, adjuntos) {
    if (!codigo || !Array.isArray(adjuntos) || adjuntos.length === 0) return;

    try {
        const cache = safeParseJson(sessionStorage.getItem('sigpro_adjuntos_cache'), {}) || {};
        cache[codigo] = adjuntos;
        sessionStorage.setItem('sigpro_adjuntos_cache', JSON.stringify(cache));
    } catch (error) {
        console.warn('No se pudo guardar cache temporal de adjuntos para reportes:', error);
    }
}

async function buildAdjuntosPersistidos(reportData, files, excelFile, nowDate) {
    const adjuntos = [];

    adjuntos.push(buildReportPdfAttachment(reportData, nowDate));

    if (excelFile) {
        const contenidoExcel = await fileToBase64(excelFile);
        adjuntos.push({
            nombre: excelFile.name,
            tipo: (excelFile.name.split('.').pop() || 'XLSX').toUpperCase(),
            tamaño: formatFileSize(excelFile.size),
            fecha: nowDate,
            activo: true,
            icono: 'table_chart',
            categoria: 'excel',
            mimeType: excelFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            contenido: contenidoExcel
        });
    }

    for (const file of files) {
        const contenido = await fileToBase64(file);
        const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        adjuntos.push({
            nombre: file.name,
            tipo: extension,
            tamaño: formatFileSize(file.size),
            fecha: nowDate,
            activo: true,
            icono: getFileIcon(file.name),
            categoria: 'soporte',
            mimeType: file.type || 'application/octet-stream',
            contenido
        });
    }

    return adjuntos;
}

function getRequiredEmptyFields(form, data) {
    return Array.from(form.querySelectorAll('[required]')).filter((field) => {
        const name = field.name;

        if (field.type === 'file') {
            return !field.files || field.files.length === 0;
        }

        if (!name) {
            return !String(field.value || '').trim();
        }

        return !String(data[name] || '').trim();
    });
}

// Hacer global para los onclick
window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    showToast('Archivo eliminado', 'info', 1500);
};

window.removeExcelFile = function() {
    selectedExcelFile = null;
    renderExcelFile();
    showToast('Archivo Excel eliminado', 'info', 1500);
};

function goToDocumentos(codigo) {
    const destino = `facultades-documentos.html?docCode=${encodeURIComponent(codigo)}`;
    
    // Si estamos dentro de un iframe, notificar al padre para navegación suave
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'navigate-to',
            url: destino,
            docCode: codigo
        }, '*');
        return;
    }
    
    // Si estamos en ventana principal, navegar directamente
    window.location.href = destino;
}

// ==========================================
// MANEJO DEL FORMULARIO - INTEGRADO CON API REAL + LOCALSTORAGE
// ==========================================

function initFormHandler() {
    const btnFinalizar = document.querySelector(REPORT_CONFIG.selectors.btnFinalizar);
    const btnExpedientes = document.querySelector(REPORT_CONFIG.selectors.btnExpedientes);
    const form = document.querySelector(REPORT_CONFIG.selectors.form);

    if (!btnFinalizar || !form) return;

    btnFinalizar.addEventListener('click', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('unmsm_token') 
            || localStorage.getItem('accessToken') 
            || localStorage.getItem('token');

        if (!token) {
            showToast('No hay sesión activa. Inicie sesión primero.', 'error');
            setTimeout(() => {
                window.location.href = 'portal-inicio-facultades.html';
            }, 2000);
            return;
        }

        // Validar formulario
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

        // Verificar autenticación
        if (typeof API === 'undefined' || !API.auth.isAuthenticated()) {
            showToast('Debe iniciar sesión primero.', 'error');
            return;
        }

        // Mostrar carga
        const originalText = btnFinalizar.innerHTML;
        btnFinalizar.disabled = true;
        btnFinalizar.innerHTML = `
            <span class="material-symbols-outlined animate-spin">refresh</span>
            ENVIANDO...
        `;

        let apiSuccess = false;
        let apiResult = null;

        try {
            // ==========================================
            // PASO 1: Enviar a API real
            // ==========================================
            const reportPayload = {
                semester: data.semestreReporte || '',
                responsibleName: data.nombreResponsable?.trim() || '',
                position: data.cargoResponsable?.trim() || '',
                organicUnit: data.unidadOrganicaResponsable?.trim() || '',
                elaborationDate: data.fechaElaboracion || new Date().toISOString().split('T')[0],
                activities: data.actividadesRealizadas || '',
                results: data.resultadosObtenidos || '',
                observations: data.observaciones || '',
                code: data.codigoReporte || await generateReportCode(),
                facultyId: userFaculty?.id || null,
                userEmail: currentUser?.correo || currentUser?.email || '',
                documentType: 'reporte',
                status: 'PENDING'
            };

            console.log('Enviando a API:', reportPayload);

            apiResult = await API.portal.reports.create(reportPayload);

            if (!apiResult.success) {
    if (apiResult.status === 401) {
        showToast('Sesión expirada. Redirigiendo...', 'error');
        setTimeout(() => {
            window.location.href = 'portal-inicio-facultades.html';
        }, 2000);
        return;
    }
    console.warn('API falló, usando fallback local:', apiResult.error);
    showToast('API no disponible. Guardando localmente...', 'warning', 3000);
}
        if (!apiResult.success) {
            // Errores de autenticación
            if (apiResult.status === 401) {
                showToast('Sesión expirada. Redirigiendo al login...', 'error');
                setTimeout(() => {
                    window.location.href = 'portal-inicio-facultades.html';
                }, 2000);
                return;
            }
            
            // Error 403 - Forbidden: El servidor rechazó la petición
            if (apiResult.status === 403) {
                console.error('🔴 Error 403 Forbidden:', apiResult.data);
                showToast(
                    `Error 403: Acceso denegado. ${apiResult.data?.message || 'Verifica permisos o token.'}`, 
                    'error', 
                    5000
                );
                // NO guardar localmente en 403, informar al usuario claramente
                btnFinalizar.disabled = false;
                btnFinalizar.innerHTML = originalText;
                return;  // ← Detener aquí, no continuar con fallback
            }
            
            // Error 404 - Endpoint no encontrado
            if (apiResult.status === 404) {
                showToast('Error 404: El endpoint /portal/reports no existe en el servidor', 'error', 5000);
                btnFinalizar.disabled = false;
                btnFinalizar.innerHTML = originalText;
                return;
            }
            
            // Error de red (servidor no responde)
            if (apiResult.isNetworkError) {
                showToast('Error de red: No se pudo conectar con ' + CONFIG.REMOTE_BASE, 'error', 5000);
                btnFinalizar.disabled = false;
                btnFinalizar.innerHTML = originalText;
                return;
            }
            
            // Otros errores del servidor
            showToast(
                `Error ${apiResult.status || ''}: ${apiResult.error || 'Desconocido'}`, 
                'error', 
                5000
            );
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = originalText;
            return;
        }

        
        apiSuccess = true;
        console.log('✅ Reporte creado en API:', apiResult.data);

            // ==========================================
            // PASO 2: Guardar localmente (PDF, adjuntos, documentos)
            // ==========================================
            const reportData = {
                codigo: data.codigoReporte || await generateReportCode(),
                nombre: `Reporte ${data.semestreReporte} - ${data.nombreResponsable}`,
                descripcion: data.actividadesRealizadas ? `Actividades: ${data.actividadesRealizadas.substring(0, 100)}...` : `Reporte ${data.semestreReporte}`,
                tipo: 'reporte',
                semestre: data.semestreReporte,
                fechaElaboracion: data.fechaElaboracion,
                responsable: data.nombreResponsable,
                cargo: data.cargoResponsable,
                unidadOrganicaResponsable: data.unidadOrganicaResponsable || '',
                actividades: data.actividadesRealizadas,
                resultados: data.resultadosObtenidos,
                observaciones: data.observaciones || '',
                facultadId: userFaculty?.id || null,
                generadoPor: currentUser?.correo || 'Sistema',
                estado: 'pendiente',
                fechaCreacion: new Date().toISOString(),
                excelPrincipal: selectedExcelFile ? selectedExcelFile.name : '',
                archivosSoporte: selectedFiles.map(f => f.name),
                archivos: selectedFiles.map(f => f.name),
                apiId: apiResult?.data?.id || null,
                apiSync: apiSuccess
            };
            reportData.documentoPrincipal = `${cleanFileName(reportData.codigo)}.pdf`;

            const now = new Date();
            const codigo = reportData.codigo;
            const fechaAdjunto = now.toISOString().split('T')[0];

            // Guardar en lista de documentos
            const docsRaw = localStorage.getItem(REPORT_STORAGE_KEYS.DOCUMENTOS_LISTA);
            const docs = docsRaw ? JSON.parse(docsRaw) : [];
            const docPendiente = {
                id: apiResult?.data?.id || codigo,
                fecha: fechaAdjunto,
                hora: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
                codigo: codigo,
                descripcion: reportData.nombre,
                generadoPor: 'Facultad',
                estado: 'pendiente',
                progreso: 5,
                facultadId: reportData.facultadId || 1,
                tipo: 'reporte',
                origen: apiSuccess ? 'api' : 'local-fallback'
            };

            const idx = docs.findIndex(item => item.codigo === codigo);
            if (idx >= 0) {
                docs[idx] = { ...docs[idx], ...docPendiente };
            } else {
                docs.unshift(docPendiente);
            }
            localStorage.setItem(REPORT_STORAGE_KEYS.DOCUMENTOS_LISTA, JSON.stringify(docs));

            // Guardar detalle con adjuntos
            const detalleRaw = localStorage.getItem(REPORT_STORAGE_KEYS.DOCUMENTOS_DETALLE);
            const detalle = safeParseJson(detalleRaw, {}) || {};

            const adjuntos = await buildAdjuntosPersistidos(reportData, selectedFiles, selectedExcelFile, fechaAdjunto);

            const detalleReporte = {
                tipo: 'reporte',
                codigo: codigo,
                titulo: reportData.nombre,
                operacion: 'GESTION DE REPORTES',
                fechaRegistro: now.toISOString(),
                reporteData: reportData,
                adjuntos: adjuntos,
                resumenCampos: [
                    { label: 'Semestre', value: data.semestreReporte || '-' },
                    { label: 'Fecha de elaboracion', value: data.fechaElaboracion || '-' },
                    { label: 'Responsable', value: data.nombreResponsable || '-' },
                    { label: 'Cargo', value: data.cargoResponsable || '-' },
                    { label: 'Unidad orgánica Responsable', value: data.unidadOrganicaResponsable || '-' },
                    { label: 'Actividades realizadas', value: data.actividadesRealizadas || '-' },
                    { label: 'Resultados obtenidos', value: data.resultadosObtenidos || '-' },
                    { label: 'Observaciones', value: data.observaciones || '-' },
                    { label: 'Documento principal', value: reportData.documentoPrincipal || '-' },
                    { label: 'Excel de sustento', value: selectedExcelFile?.name || '-' }
                ]
            };

            detalle[codigo] = detalleReporte;

            try {
                localStorage.setItem(REPORT_STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalle));
            } catch (error) {
                if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    const detalleSinContenido = {
                        ...detalleReporte,
                        adjuntos: (detalleReporte.adjuntos || []).map((adjunto) => {
                            const { contenido, ...rest } = adjunto;
                            return rest;
                        })
                    };

                    detalle[codigo] = detalleSinContenido;
                    cacheAdjuntosTemporales(codigo, detalleReporte.adjuntos || []);
                    localStorage.setItem(REPORT_STORAGE_KEYS.DOCUMENTOS_DETALLE, JSON.stringify(detalle));
                    showToast('Adjuntos grandes: se activo vista temporal para previsualizar en Documentos.', 'warning', 5000);
                } else {
                    throw error;
                }
            }

            // Mostrar mensaje de éxito
            if (apiSuccess) {
                showToast('¡Reporte enviado y guardado correctamente!', 'success');
            } else {
                showToast('Reporte guardado localmente (API no disponible)', 'warning', 4000);
            }

            // Mostrar botón "Ver en Documentos"
            if (btnExpedientes) {
                setTimeout(() => {
                    btnFinalizar.style.display = 'none';
                    btnExpedientes.classList.remove('hidden');
                    btnExpedientes.href = `facultades-documentos.html?docCode=${encodeURIComponent(codigo)}`;
                    btnExpedientes.onclick = (ev) => {
                        ev.preventDefault();
                        goToDocumentos(codigo);
                    };
                }, REPORT_CONFIG.SHOW_DOCUMENTOS_BUTTON_DELAY_MS);
            } else {
                goToDocumentos(codigo);
            }

        } catch (error) {
            console.error('Error:', error);
            showToast('Error al enviar: ' + error.message, 'error');
            btnFinalizar.disabled = false;
            btnFinalizar.innerHTML = originalText;
        }
    });
}

// ==========================================
// INICIALIZACIÓN DE CAMPOS
// ==========================================

function initDefaultValues() {
    const fechaInput = document.querySelector('input[name="fechaElaboracion"]');
    if (fechaInput && !fechaInput.value) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.value = today;
    }
}

// ==========================================
// TEMA OSCURO/CLARO
// ==========================================

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    window.addEventListener('message', (event) => {
        const payload = event.data || {};
        if (payload.type !== 'theme-change') return;

        const incomingTheme = payload.theme === 'dark' ? 'dark' : 'light';
        applyTheme(incomingTheme);
    });
}

function applyTheme(theme) {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', normalizedTheme === 'dark');
    localStorage.setItem('theme', normalizedTheme);
}

// ==========================================
// ATAJOS DE TECLADO
// ==========================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.querySelector(REPORT_CONFIG.selectors.btnFinalizar)?.click();
        }

        if (e.key === 'Escape') {
            if (confirm('¿Desea salir? Los cambios no guardados se perderán.')) {
                window.location.href = 'facultades-nuevo.html';
            }
        }
    });
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================

async function init() {
    console.log('🚀 Hoja de Reporte - Inicializando...');

    initTheme();
    initDefaultValues();
    initFileUpload();
    initKeyboardShortcuts();

    await loadUserData();
    await refreshGeneratedCode();
    initFormHandler();

    showToast('Formulario listo', 'info', 2000);
    console.log('✅ Hoja de Reporte inicializada');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function saveToLocalStorage(data) {
    const key = 'sigpro_reportes';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const localId = `local-${Date.now()}`;
    existing.push({ ...data, id: localId, synced: false });
    localStorage.setItem(key, JSON.stringify(existing));
    return localId;
}
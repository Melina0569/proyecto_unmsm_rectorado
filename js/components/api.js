// api.js - API Híbrida UNMSM (LocalStorage + API Real)
// Versión completa con tus 20 facultades y datos originales

// ============================================
// CONFIGURACIÓN - CAMBIA ESTO PARA ALTERNAR
// ============================================
const CONFIG = {
    // 'local' = Usa LocalStorage (sin internet, datos locales)
    // 'remote' = Usa API real UNMSM (requiere internet, datos compartidos)
    MODE: 'remote', // Se puede sobrescribir con localStorage: api_mode
    
    // URL de la API real
    REMOTE_BASE: 'http://localhost:8080/v1',
    
    // Timeout para cold start de Render (60 segundos)
    TIMEOUT: 60000
};

// Credenciales locales unicas para acceso administrativo (Racio)
const LOCAL_ADMIN_CREDENTIALS = {
    username: 'racio.admin',
    email: 'racionalizacion.ogpl@unmsm.edu.pe',
    password: 'Gestion05@'
};

// ============================================
// DATOS Y FUNCIONES ORIGINALES (LOCALSTORAGE)
// ============================================
const DATA_VERSION = '3';

// Generar datos de procesos específicos para cada facultad
function generateFacultyProcesses(facultyId) {
    const baseProcesses = {
        strategic: [
            { id: `pe-01-${facultyId}`, code: 'PE.01', name: 'Gestión Estratégica' },
            { id: `pe-02-${facultyId}`, code: 'PE.02', name: 'Gestión de la Calidad y Mejora Continua' },
            { id: `pe-03-${facultyId}`, code: 'PE.03', name: 'Gestión de Relaciones Interinstitucionales' }
        ],
        missional: [
            { id: `pm-01-${facultyId}`, code: 'PM.01', name: 'Gestión de la Formación Académica' },
            { id: `pm-02-${facultyId}`, code: 'PM.02', name: 'Gestión de la Investigación' },
            { id: `pm-03-${facultyId}`, code: 'PM.03', name: 'Gestión de la Responsabilidad y Vinculación Social' }
        ],
        support: [
            { id: `ps-01-${facultyId}`, code: 'PS.01', name: 'Gestión de Admisión y Matrícula' },
            { id: `ps-02-${facultyId}`, code: 'PS.02', name: 'Gestión Documental' },
            { id: `ps-03-${facultyId}`, code: 'PS.03', name: 'Gestión de Bienestar Integral' },
            { id: `ps-04-${facultyId}`, code: 'PS.04', name: 'Gestión de Recursos Económicos' },
            { id: `ps-05-${facultyId}`, code: 'PS.05', name: 'Gestión de Recursos Humanos' },
            { id: `ps-06-${facultyId}`, code: 'PS.06', name: 'Gestión de Abastecimiento y Servicios' },
            { id: `ps-07-${facultyId}`, code: 'PS.07', name: 'Gestión de la Tecnología de la Información' },
            { id: `ps-08-${facultyId}`, code: 'PS.08', name: 'Gestión de Actividades Productivas' },
            { id: `ps-09-${facultyId}`, code: 'PS.09', name: 'Gestión de Recursos Bibliográficos' },
            { id: `ps-10-${facultyId}`, code: 'PS.10', name: 'Gestión de la Comunicación' }
        ]
    };

    // Personalizar según facultad
    const customizations = {
        6: { // Educación - Elimina PE.03 y PS.08
            strategic: baseProcesses.strategic.filter(p => p.code !== 'PE.03'),
            support: baseProcesses.support.filter(p => p.code !== 'PS.08')
        }
    };

    const result = customizations[facultyId] ? { 
        strategic: customizations[facultyId].strategic || baseProcesses.strategic,
        missional: baseProcesses.missional,
        support: customizations[facultyId].support || baseProcesses.support
    } : baseProcesses;
    
    console.log(`Generando procesos para facultad ${facultyId}:`, result);
    return result;
}

// Generar flujogramas de ejemplo por facultad
function generateFacultyFlows(facultyId) {
    const types = ['strategic', 'missional', 'support'];
    const typeNames = {
        strategic: ['Gestión Estratégica', 'Planificación', 'Control de Gestión'],
        missional: ['Admisión', 'Matrícula', 'Enseñanza', 'Evaluación', 'Graduación'],
        support: ['Recursos Humanos', 'Finanzas', 'Infraestructura', 'TI', 'Biblioteca']
    };

    const flows = [];
    let counter = 1;

    types.forEach(type => {
        const names = typeNames[type];
        names.forEach((name, idx) => {
            flows.push({
                id: `flow-${facultyId}-${type}-${idx}`,
                code: `FL-${String(counter).padStart(3, '0')}`,
                name: `Proceso de ${name}`,
                type: type,
                description: `Flujograma del proceso de ${name.toLowerCase()}`,
                pages: Math.floor(Math.random() * 5) + 2,
                lastUpdated: '2024-01-15',
                pdfUrl: `#pdf-${facultyId}-${counter}`,
                downloads: 0,
                facultyId: facultyId
            });
            counter++;
        });
    });

    return flows;
}

// Generar indicadores de ejemplo por facultad
function generateFacultyIndicators(facultyId) {
    const indicators = [];
    const types = ['strategic', 'missional', 'support'];
    const typeNames = {
        strategic: ['Eficiencia', 'Calidad', 'Innovación'],
        missional: ['Matrícula', 'Graduación', 'Investigación'],
        support: ['Satisfacción', 'Eficiencia', 'Cumplimiento']
    };

    let counter = 1;
    types.forEach(type => {
        typeNames[type].forEach((name, idx) => {
            indicators.push({
                id: `ind-${facultyId}-${type}-${idx}`,
                code: `IND-${String(counter).padStart(3, '0')}`,
                name: `Indicador de ${name}`,
                type: type,
                description: `Métrica de ${name.toLowerCase()}`,
                target: Math.floor(Math.random() * 30) + 70, // 70-100%
                current: Math.floor(Math.random() * 40) + 60,
                lastUpdated: '2024-01-15',
                facultyId: facultyId
            });
            counter++;
        });
    });

    return indicators;
}

// Helpers
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFaculties() {

    try {

        const response = await fetch(
            "http://localhost:8080/v1/public/faculties?page=1&limit=20",
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error("Error obteniendo facultades");
        }

        const data = await response.json();

        console.log(data);

        return data;

    } catch (error) {

        console.error(error);

        return [];
    }
}

// ============================================
// MODO LOCAL - LOCALSTORAGE (TU CÓDIGO ORIGINAL)
// ============================================
const LocalAPI = {
    db: {
        faculties: 'sigpro_faculties',
        indicators: 'sigpro_indicators',
        processes: 'sigpro_processes',
        version: 'sigpro_data_version',
        processesVersion: 'sigpro_processes_version'
    },

    init() {
        console.log('API Local - Inicializando...');
        
        const storedProcessesVersion = localStorage.getItem(this.db.processesVersion);
        
        if (storedProcessesVersion !== DATA_VERSION) {
            console.log(`🆕 Nueva versión de procesos detectada (${storedProcessesVersion} → ${DATA_VERSION})`);
            this.clearAllProcesses();
            localStorage.setItem(this.db.processesVersion, DATA_VERSION);
        }
        
        if (!localStorage.getItem(this.db.faculties)) {
            console.log('Generando datos iniciales...');
            this.seedData();
        }
    },

    clearAllProcesses() {
        console.log('Limpiando procesos...');
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('faculty_processes_')) {
                localStorage.removeItem(key);
            }
        }
    },

    

    // TUS 20 FACULTADES ORIGINALES
    async seedData() {
        /**const defaultFaculties = [
            { id: 1, name: 'Medicina', code: 'FM', icon: 'medical_services', color: 'red', indicators: 12, flows: 8, processes: 5, createdAt: new Date().toISOString() },
            { id: 2, name: 'Derecho y Ciencia Política', code: 'FDCP', icon: 'gravel', color: 'indigo', indicators: 15, flows: 6, processes: 4, createdAt: new Date().toISOString() },
            { id: 3, name: 'Letras y Ciencias Humanas', code: 'FLCH', icon: 'history_edu', color: 'amber', indicators: 10, flows: 12, processes: 7, createdAt: new Date().toISOString() },
            { id: 4, name: 'Farmacia y Bioquímica', code: 'FFB', icon: 'vaccines', color: 'cyan', indicators: 12, flows: 8, processes: 5, createdAt: new Date().toISOString() },
            { id: 5, name: 'Odontología', code: 'FO', icon: 'health_and_safety', color: 'teal', indicators: 12, flows: 8, processes: 5, createdAt: new Date().toISOString() },
            { id: 6, name: 'Educación', code: 'FE', icon: 'school', color: 'emerald', indicators: 12, flows: 8, processes: 5, createdAt: new Date().toISOString() },
            { id: 7, name: 'Química e Ingeniería Química', code: 'FQIQ', icon: 'science', color: 'lime', indicators: 14, flows: 9, processes: 6, createdAt: new Date().toISOString() },
            { id: 8, name: 'Medicina Veterinaria', code: 'FMV', icon: 'pets', color: 'orange', indicators: 11, flows: 7, processes: 4, createdAt: new Date().toISOString() },
            { id: 9, name: 'Ciencias Administrativas', code: 'FCA', icon: 'work', color: 'purple', indicators: 13, flows: 8, processes: 5, createdAt: new Date().toISOString() },
            { id: 10, name: 'Ciencias Biológicas', code: 'FCB', icon: 'biotech', color: 'green', indicators: 9, flows: 10, processes: 6, createdAt: new Date().toISOString() },
            { id: 11, name: 'Ciencias Contables', code: 'FCC', icon: 'money_bag', color: 'pink', indicators: 16, flows: 11, processes: 7, createdAt: new Date().toISOString() },
            { id: 12, name: 'Ciencias Económicas', code: 'FCE', icon: 'trending_up', color: 'yellow', indicators: 18, flows: 14, processes: 8, createdAt: new Date().toISOString() },
            { id: 13, name: 'Ciencias Físicas', code: 'FCF', icon: 'antigravity', color: 'violet', indicators: 15, flows: 9, processes: 6, createdAt: new Date().toISOString() },
            { id: 14, name: 'Ciencias Matemáticas', code: 'FCM', icon: 'calculate', color: 'blue', indicators: 11, flows: 8, processes: 5, createdAt: new Date().toISOString() },
            { id: 15, name: 'Ciencias Sociales', code: 'FCCSS', icon: 'groups', color: 'rose', indicators: 10, flows: 7, processes: 4, createdAt: new Date().toISOString() },
            { id: 16, name: 'Ingeniería Geológica, Minera, Metalúrgica y Geográfica', code: 'FIGMMG', icon: 'terrain', color: 'stone', indicators: 13, flows: 9, processes: 6, createdAt: new Date().toISOString() },
            { id: 17, name: 'Ingeniería Industrial', code: 'FII', icon: 'precision_manufacturing', color: 'slate', indicators: 17, flows: 12, processes: 8, createdAt: new Date().toISOString() },
            { id: 18, name: 'Psicología', code: 'FP', icon: 'psychology', color: 'fuchsia', indicators: 14, flows: 10, processes: 6, createdAt: new Date().toISOString() },
            { id: 19, name: 'Ingeniería Eléctrica y Electrónica', code: 'FIEE', icon: 'electrical_services', color: 'amber', indicators: 12, flows: 15, processes: 9, createdAt: new Date().toISOString() },
            { id: 20, name: 'Ingeniería de Sistemas e Informática', code: 'FISI', icon: 'computer', color: 'sky', indicators: 16, flows: 8, processes: 5, createdAt: new Date().toISOString() }
        ];**/
        
        const defaultFaculties = await getFaculties();
        localStorage.setItem(this.db.faculties, JSON.stringify(defaultFaculties));
        console.log('✅ 20 facultades cargadas en LocalStorage');
    },

    // ========== AUTENTICACIÓN LOCAL ==========
    auth: {
        async login(correo, password) {
            await simulateDelay(800);

            const normalizedInput = String(correo || '').trim().toLowerCase();
            const adminEmail = LOCAL_ADMIN_CREDENTIALS.email.toLowerCase();
            const adminUsername = LOCAL_ADMIN_CREDENTIALS.username.toLowerCase();
            const isAdminCandidate = normalizedInput === adminEmail || normalizedInput === adminUsername;

            // Credencial unica para panel administrativo
            if (isAdminCandidate) {
                if (password !== LOCAL_ADMIN_CREDENTIALS.password) {
                    return { success: false, data: { message: 'Credenciales administrativas incorrectas' } };
                }

                const mockToken = 'eyJhbGciOiJIUzI1NiJ9.mock_token_local_' + Date.now();
                const userData = {
                    correo: LOCAL_ADMIN_CREDENTIALS.email,
                    email: LOCAL_ADMIN_CREDENTIALS.email,
                    nombre: 'Administrador Racio',
                    nombreCompleto: 'Administrador Racio',
                    cargo: 'Administrador Global',
                    rol: 'Administrador Global',
                    facultad: 'UNMSM',
                    nombreFacultad: 'UNMSM'
                };

                localStorage.setItem('unmsm_token', mockToken);
                localStorage.setItem('unmsm_user', JSON.stringify(userData));

                return {
                    success: true,
                    data: {
                        token: mockToken,
                        rol: userData.rol,
                        facultad: userData.facultad
                    }
                };
            }
            
            // Simulación: cualquier correo @unmsm.edu.pe / password123
            if (!correo.endsWith('@unmsm.edu.pe')) {
                return { success: false, data: { message: 'Debe usar correo @unmsm.edu.pe' } };
            }
            
            if (password !== 'password123') {
                return { success: false, data: { message: 'Contraseña incorrecta' } };
            }
            
            const isAdmin = correo.includes('admin') || correo.includes('racio');
            const mockToken = 'eyJhbGciOiJIUzI1NiJ9.mock_token_local_' + Date.now();
            const nombreDesdeCorreo = correo.split('@')[0].replace(/\./g, ' ');
            const facultadMock = isAdmin
                ? 'UNMSM'
                : 'Facultad de ' + correo.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            const userData = {
                correo: correo,
                email: correo,
                nombre: nombreDesdeCorreo,
                nombreCompleto: nombreDesdeCorreo,
                cargo: isAdmin ? 'Administrador Global' : 'Usuario Facultad',
                rol: isAdmin ? 'Administrador Global' : 'Usuario Facultad',
                facultad: facultadMock,
                nombreFacultad: facultadMock
            };
            
            localStorage.setItem('unmsm_token', mockToken);
            localStorage.setItem('unmsm_user', JSON.stringify(userData));
            
            return {
                success: true,
                data: {
                    token: mockToken,
                    rol: userData.rol,
                    facultad: userData.facultad
                }
            };
        },

        async registro(userData) {
            await simulateDelay(600);
            // Simulación: registro exitoso
            return { 
                success: true, 
                data: { message: 'Usuario registrado correctamente' },
                status: 201 
            };
        },

        async logout() {
            localStorage.removeItem('unmsm_token');
            localStorage.removeItem('unmsm_user');
            return { success: true };
        },

        isAuthenticated() {
            return !!localStorage.getItem('unmsm_token');
        },

        getUser() {
            const user = localStorage.getItem('unmsm_user');
            return user ? JSON.parse(user) : null;
        }
    },

    // ========== FACULTADES ==========
    faculties: {
        async getAll() {
            await simulateDelay(300);
            const data = JSON.parse(localStorage.getItem(LocalAPI.db.faculties) || '[]');
            return { success: true, data, count: data.length };
        },

        async getById(id) {
            await simulateDelay(200);
            const faculties = JSON.parse(localStorage.getItem(LocalAPI.db.faculties) || '[]');
            const faculty = faculties.find(f => f.id === id);
            
            if (!faculty) {
                return { success: false, error: 'Facultad no encontrada', status: 404 };
            }
            
            return { success: true, data: faculty };
        },

        async getStats() {
            await simulateDelay(200);
            const faculties = JSON.parse(localStorage.getItem(LocalAPI.db.faculties) || '[]');
            
            const stats = {
                total: faculties.length,
                totalIndicators: faculties.reduce((sum, f) => sum + f.indicators, 0),
                totalFlows: faculties.reduce((sum, f) => sum + f.flows, 0),
                totalProcesses: faculties.reduce((sum, f) => sum + f.processes, 0)
            };
            
            return { success: true, data: stats };
        }
    },

    // ========== PROCESOS ==========
    processes: {
        async getByFaculty(facultyId) {
            console.log(`API.processes.getByFaculty(${facultyId}) llamado`);
            await simulateDelay(400);
            
            const key = `faculty_processes_${facultyId}`;
            let data = JSON.parse(localStorage.getItem(key));
            
            const isValidData = (d) => {
                if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
                if (!d.hasOwnProperty('strategic') || !Array.isArray(d.strategic)) return false;
                if (!d.hasOwnProperty('missional') || !Array.isArray(d.missional)) return false;
                if (!d.hasOwnProperty('support') || !Array.isArray(d.support)) return false;
                return true;
            };
            
            if (!isValidData(data)) {
                console.log(`Generando procesos para facultad ${facultyId}...`);
                data = generateFacultyProcesses(facultyId);
                localStorage.setItem(key, JSON.stringify(data));
            }
            
            return { success: true, data };
        }
    },

    // ========== INDICADORES ==========
    indicators: {
        async getByFaculty(facultyId) {
            await simulateDelay(300);
            
            const key = `faculty_indicators_${facultyId}`;
            let data = JSON.parse(localStorage.getItem(key));
            
            if (!data) {
                data = generateFacultyIndicators(facultyId);
                localStorage.setItem(key, JSON.stringify(data));
            }
            
            return { success: true, data, count: data.length };
        },

        async getPanel(id) {
            // Panel local: usar historial persistido del indicador, sin datos demo automáticos
            await simulateDelay(500);

            const historyKey = `sigpro_historial_datos_${id}`;
            let historialPersistido = [];

            try {
                const rawHistory = localStorage.getItem(historyKey);
                const parsedHistory = rawHistory ? JSON.parse(rawHistory) : [];
                if (Array.isArray(parsedHistory)) {
                    historialPersistido = parsedHistory;
                }
            } catch (error) {
                console.warn('No se pudo leer historial local del indicador:', error);
            }

            const indicator = {
                datos: { id: id, nombre: 'Indicador Simulado' },
                historial: historialPersistido.map((item) => ({
                    fecha: item.fecha,
                    valor: item.resultado ?? item.valor ?? 0,
                    devengado: item.devengado ?? 0,
                    pim: item.pim ?? 0,
                    meta: item.metaPeriodo ?? item.meta ?? 0,
                    analisis: item.analisis || '',
                    acciones: item.acciones || ''
                })),
                metas: 'Meta 2026: 85% de cumplimiento',
                datosGrafico: historialPersistido.map((item) => ({
                    mes: item.fecha,
                    valor: item.resultado ?? item.valor ?? 0
                }))
            };
            return { success: true, data: indicator };
        }
    },

    // ========== FLUJOGRAMAS ==========
    flows: {
        async getByFaculty(facultyId) {
            await simulateDelay(400);
            
            const key = `faculty_flows_${facultyId}`;
            let data = JSON.parse(localStorage.getItem(key));
            
            if (!data) {
                data = generateFacultyFlows(facultyId);
                localStorage.setItem(key, JSON.stringify(data));
            }
            
            return { success: true, data, count: data.length };
        }
    },

    // ========== DASHBOARD ==========
    dashboard: {
            async getPublicMetrics() {
                try {
                    // Intentar endpoint público /public/stats (sin auth)
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/public/stats`, {
                        headers: { 'Accept': 'application/json' }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const data = await response.json();
                    return { success: true, data };
                } catch (error) {
                    console.warn('Dashboard público no disponible:', error.message);
                    return { success: false, error: error.message };
                }
            }
        },

    // ========== DOCUMENTOS (Simulado) ==========
    documentos: {
        async getAll(filtros = {}) {
            await simulateDelay(400);
            // Devuelve flujogramas como documentos
            const allDocs = [];
            for (let i = 1; i <= 20; i++) {
                const flows = JSON.parse(localStorage.getItem(`faculty_flows_${i}`) || '[]');
                allDocs.push(...flows);
            }
            
            let data = allDocs;
            if (filtros.facultadId) {
                data = data.filter(d => d.facultyId == filtros.facultadId);
            }
            if (filtros.estado) {
                data = data.map(d => ({ ...d, estado: filtros.estado }));
            }
            
            return { success: true, data };
        },

        async getById(id) {
            await simulateDelay(200);
            return { 
                success: true, 
                data: { 
                    id: id, 
                    nombre: 'Documento ' + id,
                    estado: 'aprobado'
                } 
            };
        }
    },

    // ========== REPOSITORIO ==========
    repositorio: {
        async getAprobados(filtros = {}) {
            await simulateDelay(400);
            const docs = await LocalAPI.documentos.getAll(filtros);
            return { 
                success: true, 
                data: docs.data.map(d => ({ ...d, estado: 'completado' }))
            };
        }
    },

    // ========== NOTIFICACIONES ==========
    notificaciones: {
        async getByUsuario(usuarioId) {
            await simulateDelay(300);
            return {
                success: true,
                data: [
                    { id: 1, mensaje: 'Bienvenido al sistema', leida: false, fecha: new Date().toISOString() },
                    { id: 2, mensaje: 'Complete su perfil', leida: true, fecha: new Date().toISOString() }
                ]
            };
        },

        async marcarLeido(idNotificacion) {
            await simulateDelay(200);
            return { success: true };
        }
    },

    // ========== UTILIDADES ==========
    async reset() {
        localStorage.removeItem(this.db.faculties);
        localStorage.removeItem(this.db.indicators);
        localStorage.removeItem(this.db.processes);
        localStorage.removeItem(this.db.version);
        localStorage.removeItem(this.db.processesVersion);
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('faculty_processes_') || key.startsWith('faculty_indicators_') || key.startsWith('faculty_flows_'))) {
                localStorage.removeItem(key);
            }
        }
        
        this.seedData();
        return { success: true, message: 'Base de datos reseteada' };
    }
};

// ============================================
// MODO REMOTO - API REAL UNMSM
// ============================================
const RemoteAPI = {
    getHeaders() {
        // Buscar token en TODAS las claves posibles (¡token está antes!)
        const token = localStorage.getItem('token')  // ← TU TOKEN ESTÁ AQUÍ
            || localStorage.getItem('unmsm_token')
            || localStorage.getItem('accessToken')
            || localStorage.getItem('unmsm_access_token')
            || sessionStorage.getItem('accessToken')
            || sessionStorage.getItem('unmsm_token');
        
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        
        if (token && token.length > 20) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
        },

    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Timeout - El servidor está despertando (cold start). Espere 60 segundos e intente de nuevo.');
            }
            throw error;
        }
    },

    // ========== AUTENTICACIÓN ==========
    auth: {
        async login(email, password) {
            try {
                const normalizeAuthResponse = (data, fallbackEmail) => {
                    // El backend devuelve: { accessToken, refreshToken, expiresIn, user: {...} }
                    const user = data?.user || {};
                    const emailFinal = user.email || fallbackEmail;
                    
                    // Construir nombre desde firstName + lastName
                    const nombreCompletoBackend = [user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    
                    // Fallback: usar parte del email si no hay nombre
                    const nombreDesdeEmail = String(fallbackEmail || '')
                        .split('@')[0]
                        .replace(/\./g, ' ');
                    
                    const nombre = nombreCompletoBackend || nombreDesdeEmail;
                    const rol = user.role || 'Usuario';
                    const facultyId = user.facultyId || null;
                    const facultad = user.facultyName || 'UNMSM';

                    return {
                        email: emailFinal,
                        nombre,
                        nombreCompleto: nombre,
                        cargo: rol,
                        rol,
                        facultyId,
                        facultadId: facultyId,
                        facultad,
                        nombreFacultad: facultad,
                        refreshToken: data?.refreshToken || null,
                        accessToken: data?.accessToken || null
                    };
                };

                const persistSession = (normalizedUser, accessToken, refreshToken) => {
                    localStorage.setItem('unmsm_faculty_id', normalizedUser.facultyId || '');
                    localStorage.setItem('unmsm_faculty_name', normalizedUser.facultad || '');
                    localStorage.setItem('unmsm_token', accessToken);
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('token', accessToken);
                    if (refreshToken) {
                        localStorage.setItem('unmsm_refresh_token', refreshToken);
                    } else {
                        localStorage.removeItem('unmsm_refresh_token');
                    }

                    localStorage.setItem('unmsm_user', JSON.stringify(normalizedUser));
                };

                const loginWithJson = async (path) => {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}${path}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    let data = {};
                    try {
                        data = await response.json();
                    } catch (error) {
                        data = {};
                    }

                    return { response, data };
                };

                const loginWithForm = async (path) => {
                    const body = new URLSearchParams();
                    body.append('username', email);
                    body.append('password', password);

                    const response = await fetch(`${CONFIG.REMOTE_BASE}${path}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: body.toString()
                    });

                    let data = {};
                    try {
                        data = await response.json();
                    } catch (error) {
                        data = {};
                    }

                    return { response, data };
                };

                let authResult = await loginWithJson('/auth/login');
                let normalized = normalizeAuthResponse(authResult.data, email);

                const needsFallback = !authResult.response.ok || !normalized.accessToken;
                if (needsFallback) {
                    authResult = await loginWithForm('/auth/token');
                    normalized = normalizeAuthResponse(authResult.data, email);
                }

                if (authResult.response.ok && normalized.accessToken) {
                    persistSession(normalized, normalized.accessToken, normalized.refreshToken);
                }

                return {
                    success: authResult.response.ok && !!normalized.accessToken,
                    data: {
                        ...authResult.data,
                        accessToken: normalized.accessToken,
                        refreshToken: normalized.refreshToken,
                        user: authResult.data?.user || null
                    },
                    status: authResult.response.status
                };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.message, 
                    status: 0 
                };
            }
        },

        async registro(userData) {
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                return { 
                    success: response.ok, 
                    data: await response.json(), 
                    status: response.status 
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async register(registroData) {
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(registroData)
                });
                return { 
                    success: response.ok, 
                    data: await response.json(), 
                    status: response.status 
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async refresh(refreshToken) {
            try {
                const token = refreshToken || localStorage.getItem('unmsm_refresh_token');
                if (!token) {
                    return { 
                        success: false, 
                        error: 'No refresh token disponible',
                        status: 401
                    };
                }

                const response = await fetch(`${CONFIG.REMOTE_BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: token })
                });

                const data = await response.json();

                if (response.ok && data.accessToken) {
                    localStorage.setItem('unmsm_token', data.accessToken);
                    if (data.refreshToken) {
                        localStorage.setItem('unmsm_refresh_token', data.refreshToken);
                    }
                }

                return { 
                    success: response.ok, 
                    data: data, 
                    status: response.status 
                };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.message,
                    status: 0
                };
            }
        },

        async logout() {
            try {
                await fetch(`${CONFIG.REMOTE_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: RemoteAPI.getHeaders()
                });
            } catch (e) {
                console.log('Logout silencioso');
            }
            localStorage.removeItem('unmsm_token');
            localStorage.removeItem('unmsm_refresh_token');
            localStorage.removeItem('unmsm_user');
            return { success: true };
        },

        isAuthenticated() {
            return !!localStorage.getItem('unmsm_token');
        },

        getUser() {
            const user = localStorage.getItem('unmsm_user');
            return user ? JSON.parse(user) : null;
        }
    },

    // ========== DASHBOARD ==========
    dashboard: {
        async getPublicMetrics() {
        try {
            // ✅ Usar /v1/public/stats (el endpoint que SÍ existe)
            const response = await fetch(`${CONFIG.REMOTE_BASE}/public/stats`, {
                headers: { 'Accept': 'application/json' }
            });
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // ========== DOCUMENTOS ==========
    documentos: {
        async getAll(filtros = {}) {
            const cleanFiltros = { ...filtros };
            //delete cleanFiltros.facultadId;
            //delete cleanFiltros.facultyId;

            const params = new URLSearchParams(cleanFiltros).toString();
            const url = `${CONFIG.REMOTE_BASE}/portal/documents${params ? '?' + params : ''}`;

            try {
                const response = await fetch(url, { headers: RemoteAPI.getHeaders() });

                if (!response.ok) {
                    console.warn(`⚠️ /portal/documents HTTP ${response.status} ${response.statusText}`);
                    return { success: false, data: [], status: response.status, error: response.statusText };
                }

                const payload = await response.json();
                const data = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
                return { success: true, data, status: response.status };
            } catch (error) {
                return { success: false, data: [], status: 0, error: error.message };
            }
        },

        async getById(id) {
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/documentos/${id}`, {
                    headers: RemoteAPI.getHeaders()
                });
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async upload(formData) {
            const token = localStorage.getItem('unmsm_token');
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/documentos`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async updateEstado(id, nuevoEstado, usuarioId) {
            try {
                const response = await fetch(
                    `${CONFIG.REMOTE_BASE}/documentos/${id}/estado?nuevoEstado=${nuevoEstado}&usuarioId=${usuarioId}`, 
                    {
                        method: 'PATCH',
                        headers: RemoteAPI.getHeaders()
                    }
                );
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async getHistorial(id) {
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/documentos/${id}/historial`, {
                    headers: RemoteAPI.getHeaders()
                });
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // ========== INDICADORES ==========
    indicators: {
        async getByFaculty(facultyId) {
            // La API real no tiene este endpoint exacto, usamos getPanel
            return RemoteAPI.indicators.getPanel(facultyId);
        },

        async getPanel(id) {
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/indicadores/${id}`, {
                    headers: RemoteAPI.getHeaders()
                });
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async downloadReporte(id) {
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/indicadores/${id}/reporte`, {
                    headers: RemoteAPI.getHeaders()
                });
                const blob = await response.blob();
                return { success: response.ok, data: blob };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // ========== REPOSITORIO ==========
    repositorio: {
        async getAprobados(filtros = {}) {
            const params = new URLSearchParams(filtros).toString();
            // ✅ Usar el endpoint correcto del backend
            const url = `${CONFIG.REMOTE_BASE}/repositorio${params ? '?' + params : ''}`;
            
            try {
                const response = await fetch(url, { headers: RemoteAPI.getHeaders() });
                if (!response.ok) {
                    // Fallback: si /repositorio no existe, usar /public/reps/ directamente
                    console.warn('⚠️ /repositorio no disponible, intentando /public/reps/');
                    return this.getPublicReps(filtros);
                }
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        // ✅ NUEVO: Acceso directo a archivos públicos aprobados
        async getPublicReps(filtros = {}) {
            try {
                // Si no hay endpoint de listado, construir desde localStorage
                const approvedDocs = JSON.parse(localStorage.getItem('sigpro_approved_docs') || '[]');
                
                // Filtrar por facultad si se especifica
                let data = approvedDocs;
                if (filtros.facultyId) {
                    data = data.filter(d => d.facultyId === filtros.facultyId);
                }
                
                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async downloadArchivo(id) {
            try {
                const response = await fetch(`${CONFIG.REMOTE_BASE}/repositorio/${id}/descargar`, {
                    headers: RemoteAPI.getHeaders()
                });
                const blob = await response.blob();
                const filename = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'archivo';
                return { success: response.ok, data: blob, filename };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // ========== NOTIFICACIONES ==========
    notificaciones: {
        async getByUsuario(usuarioId) {
            try {
                const response = await fetch(
                    `${CONFIG.REMOTE_BASE}/notificaciones?usuarioId=${usuarioId}`,
                    { headers: RemoteAPI.getHeaders() }
                );
                return { success: response.ok, data: await response.json() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },

        async marcarLeido(idNotificacion) {
            try {
                const response = await fetch(
                    `${CONFIG.REMOTE_BASE}/notificaciones/marcar-leido?idNotificacion=${idNotificacion}`,
                    {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders()
                    }
                );
                return { success: response.ok };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },

    // ========== FACULTADES (No existe en API real, simulado) ==========
    faculties: {
        async getAll() {
            // La API real no tiene facultades, usamos datos locales o dashboard
            const metrics = await RemoteAPI.dashboard.getPublicMetrics();
            if (metrics.success && metrics.data.conteosPorFacultad) {
                const faculties = metrics.data.conteosPorFacultad.map((f, idx) => ({
                    id: idx + 1,
                    name: f.facultad,
                    code: 'F' + (idx + 1),
                    indicators: 0,
                    flows: f.totalDocumentos,
                    processes: 0
                }));
                return { success: true, data: faculties, count: faculties.length };
            }
            return { success: false, error: 'No se pudieron cargar facultades' };
        },

        async getById(id) {
            const all = await RemoteAPI.faculties.getAll();
            const faculty = all.data.find(f => f.id === id);
            return faculty ? { success: true, data: faculty } : { success: false, error: 'No encontrada' };
        },

        async getStats() {
            const metrics = await RemoteAPI.dashboard.getPublicMetrics();
            return { success: true, data: metrics.data.totalesGlobales };
        }
    },

    // ========== PROCESOS (No existe en API real, simulado) ==========
    processes: {
        async getByFaculty(facultyId) {
            // Generar procesos genéricos
            return {
                success: true,
                data: generateFacultyProcesses(facultyId)
            };
        }
    },

    // ========== FLUJOGRAMAS (Desde endpoints públicos) ==========
    flows: {
        async getByFaculty(facultyId) {
            // Intentar primero endpoints públicos (sin 403)
            try {
                const pmUrl = `${CONFIG.REMOTE_BASE}/public/process-map/${facultyId}`;
                const pmResp = await fetch(pmUrl, { headers: { 'Accept': 'application/json' } });
                
                if (pmResp.ok) {
                    let pm = await pmResp.json();
                    const procs = [
                        ...(Array.isArray(pm?.strategic) ? pm.strategic : []),
                        ...(Array.isArray(pm?.missional) ? pm.missional : []),
                        ...(Array.isArray(pm?.support) ? pm.support : [])
                    ];

                    const allFlows = [];
                    for (const p of procs) {
                        try {
                            const fUrl = `${CONFIG.REMOTE_BASE}/public/process-map/${facultyId}/processes/${p.id}/flows`;
                            const fResp = await fetch(fUrl, { headers: { 'Accept': 'application/json' } });
                            if (fResp.ok) {
                                let fData = await fResp.json();
                                const items = Array.isArray(fData) ? fData : (Array.isArray(fData?.data) ? fData.data : []);
                                allFlows.push(...items.map(f => ({
                                    id: f.id || f.code,
                                    code: f.code || 'FL-001',
                                    title: f.title || f.name || 'Flujograma',
                                    name: f.title || f.name || 'Flujograma',
                                    type: f.type || 'support',
                                    description: f.description || '',
                                    pdfUrl: f.pdfUrl || f.urlArchivo || null,
                                    lastUpdated: f.lastUpdated || f.updatedAt || new Date().toISOString()
                                })));
                            }
                        } catch (e) {}
                    }

                    if (allFlows.length > 0) {
                        return { success: true, data: allFlows, count: allFlows.length };
                    }
                }
            } catch (e) {}

            // Fallback: documentos privados
            const docs = await RemoteAPI.documentos.getAll({ facultadId: facultyId });
            const source = Array.isArray(docs?.data) ? docs.data : [];
            const flows = source.map(d => ({
                id: d.id,
                code: d.codigo || 'FL-001',
                name: d.nombre || 'Documento',
                type: d.tipo || 'support',
                description: d.descripcion || '',
                pages: 1,
                lastUpdated: d.fechaCreacion || new Date().toISOString(),
                pdfUrl: d.urlArchivo || '#',
                downloads: 0,
                facultyId: facultyId
            }));
            if (!docs?.success) {
                return {
                    success: false,
                    data: flows,
                    count: flows.length,
                    status: docs?.status,
                    error: docs?.error || 'APIs no disponibles'
                };
            }

            return { success: true, data: flows, count: flows.length };
        }
    },

    // ========== ADMIN - FACULTADES ==========
    admin: {
        faculties: {
            async getAll() {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/faculties`, {
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getAdminFaculties() {
                const token = localStorage.getItem('token') || localStorage.getItem('unmsm_token');

                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/faculties`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Error obteniendo facultades admin');
                    }

                    return await response.json();
                } catch (error) {
                    console.error(error);
                    return [];
                }
            },

            async create(facultyData) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/faculties`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders(),
                        body: JSON.stringify(facultyData)
                    });
                    return { success: response.ok, data: await response.json(), status: response.status };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== ADMIN - ESTADÍSTICAS ==========
        stats: {
            async get() {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/stats`, {
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            // Convenience wrapper that returns structured result for admin stats
            async getAdminStats() {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/stats`, {
                        headers: RemoteAPI.getHeaders()
                    });

                    let data = null;
                    try { data = await response.json(); } catch (e) { data = null; }

                    return { success: response.ok, data, status: response.status };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
        },

        // ========== ADMIN - REPOSITORIO ==========
        repository: {
            async get(filtros = {}) {
                // 🔧 FIX: No enviar facultyId vacío o mal formado
                const cleanFiltros = { ...filtros };
                
                // Si facultyId está vacío, eliminarlo para no enviar parámetro vacío
                if (!cleanFiltros.facultyId || cleanFiltros.facultyId === '') {
                    delete cleanFiltros.facultyId;
                }
                delete cleanFiltros.facultadId;
                
                const params = new URLSearchParams(cleanFiltros).toString();
                const url = `${CONFIG.REMOTE_BASE}/admin/repository${params ? '?' + params : ''}`;
                
                console.log('📤 GET', url);
                
                try {
                    const response = await fetch(url, {
                        headers: RemoteAPI.getHeaders()
                    });
                    
                    if (!response.ok) {
                        const text = await response.text();
                        console.warn(`⚠️ /admin/repository ${response.status}:`, text.substring(0, 300));
                        return { 
                            success: false, 
                            error: `HTTP ${response.status}: ${response.statusText}`,
                            status: response.status,
                            data: null
                        };
                    }
                    
                    const data = await response.json();
                    console.log('✅ /admin/repository:', data);
                    return { success: true, data, status: response.status };
                    
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

    async getByFaculty(facultyId) {
        if (!facultyId) {
            return { success: false, error: 'facultyId es requerido' };
        }
        return this.get({ facultyId });
    }
},

        // ========== ADMIN - DOCUMENTOS ==========
        documents: {
            async getAll(filtros = {}) {
                const defaults = { page: 1, limit: 20, ...filtros };
                const params = new URLSearchParams(defaults).toString();
                const url = `${CONFIG.REMOTE_BASE}/admin/documents?${params}`;
                try {
                    const response = await fetch(url, {
                        headers: RemoteAPI.getHeaders()
                    });
                    
                    // Si no es OK, leer como texto para no crashear con HTML de error
                    if (!response.ok) {
                        const text = await response.text();
                        let errorData = null;
                        try {
                            errorData = JSON.parse(text);
                        } catch {
                            errorData = { message: text.substring(0, 200) };
                        }
                        return { 
                            success: false, 
                            status: response.status,
                            error: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
                            data: errorData
                        };
                    }
                    
                    const data = await response.json();
                    return { success: true, status: response.status, data };
                    
                } catch (error) {
                    return { 
                        success: false, 
                        status: 0,
                        error: error.message || "Error de red"
                    };
                }
            },

            async getFiltered(facultyId, status = '', page = 1, limit = 20) {
                const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
                const filters = { page, limit };
                
                if (facultyId) filters.facultyId = facultyId;
                if (status && validStatuses.includes(status)) filters.status = status;
                
                console.log(`📤 Admin documents filter: faculty=${facultyId}, status=${status}`);
                return this.getAll(filters);
            },

            async getAdminDocuments(facultyId, status = '', page = 1, limit = 20) {
                const filters = { page, limit };
                if (facultyId) filters.facultyId = facultyId;
                if (status) filters.status = status;
                return this.getAll(filters);
            },

            async getReview(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/documents/${id}/review`, {
                        headers: RemoteAPI.getHeaders()
                    });
                    
                    // Si no es OK, leer como texto primero
                    if (!response.ok) {
                        const text = await response.text();
                        let errorData = null;
                        try {
                            errorData = JSON.parse(text);
                        } catch {
                            errorData = { message: text.substring(0, 200) };
                        }
                        return { 
                            success: false, 
                            status: response.status,
                            error: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
                            data: errorData
                        };
                    }
                    
                    const data = await response.json();
                    return { success: true, status: response.status, data };
                    
                } catch (error) {
                    return { 
                        success: false, 
                        status: 0,
                        error: error.message || "Error de red"
                    };
                }
            },

            async requestCorrection(id, subject, observations, attachments = []) {
                const url = new URL(`${CONFIG.REMOTE_BASE}/admin/documents/${encodeURIComponent(id)}/request-correction`);
                
                // Parámetros obligatorios
                url.searchParams.append('subject', subject);
                url.searchParams.append('observations', observations);
                
                // 🔧 FIX: Solo agregar attachments si hay valores reales y no vacíos
                const validAttachments = (Array.isArray(attachments) ? attachments : [attachments])
                    .filter(a => a && String(a).trim() !== '' && String(a).toLowerCase() !== 'string');
                
                if (validAttachments.length > 0) {
                    validAttachments.forEach(file => {
                        url.searchParams.append('attachments', String(file).trim());
                    });
                }
                
                console.log('📤 request-correction URL:', url.toString());

                try {
                    const response = await fetch(url.toString(), {
                        method: 'POST',
                        headers: {
                            ...RemoteAPI.getHeaders(),
                            'Content-Length': '0'  // Indicar body vacío explícitamente
                        }
                    });
                    
                    let data = null;
                    const contentType = response.headers.get('content-type') || '';
                    
                    if (contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        const text = await response.text();
                        data = { raw: text.substring(0, 500) };
                    }
                    
                    if (!response.ok) {
                        console.error('❌ request-correction error:', data);
                        
                        // Si es 500 y hay attachments, reintentar SIN attachments como fallback
                        if (response.status === 500 && validAttachments.length > 0) {
                            console.warn('⚠️ Reintentando sin attachments debido a error 500...');
                            return this.requestCorrection(id, subject, observations, []);
                        }
                    }
                    
                    return { 
                        success: response.ok, 
                        data,
                        status: response.status 
                    };
                } catch (error) {
                    console.error('❌ request-correction exception:', error);
                    return { 
                        success: false, 
                        error: error.message,
                        status: 0 
                    };
                }
            },

            async approve(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/documents/${id}/approve`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders()
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // ✅ Guardar en localStorage con todos los campos necesarios
                        const approvedDocs = JSON.parse(localStorage.getItem('sigpro_approved_docs') || '[]');
                        
                        // Obtener info completa del documento
                        const docInfo = await this.getById(id); // o desde localStorage
                        
                        approvedDocs.push({
                            id: id,
                            publicUrl: data.publicUrl,
                            codigo: docInfo.codigo || id.substring(0, 8).toUpperCase(),
                            descripcion: docInfo.descripcion || 'Documento aprobado',
                            tipo: docInfo.tipo || 'reporte',
                            facultad: docInfo.nombreFacultad || docInfo.facultad || 'UNMSM',
                            facultyId: docInfo.facultyId || '',
                            estado: 'APPROVED',
                            approvedAt: new Date().toISOString(),
                            fecha: new Date()
                        });
                        
                        localStorage.setItem('sigpro_approved_docs', JSON.stringify(approvedDocs));
                    }
                    
                    return { success: response.ok, data, status: response.status };
                } catch (error) {
                    return { success: false, error: error.message, status: 0 };
                }
            }
        },

        // ========== ADMIN - SOLICITUDES DE ACCESO ==========
        accessRequests: {
            async getAll(status = '') {
                // 🔧 FIX: No enviar status=PENDING (da 500 en backend por Hibernate proxy)
                // Traer todas y filtrar en el frontend
                const url = `${CONFIG.REMOTE_BASE}/admin/access-requests`;
                
                try {
                    const response = await fetch(url, {
                        headers: RemoteAPI.getHeaders()
                    });
                    
                    if (!response.ok) {
                        const text = await response.text();
                        let errorData = null;
                        try { errorData = JSON.parse(text); } catch { errorData = { message: text.substring(0, 200) }; }
                        return { 
                            success: false, 
                            status: response.status,
                            error: errorData?.message || `HTTP ${response.status}`,
                            data: errorData
                        };
                    }
                    
                    const data = await response.json();
                    return { success: true, status: response.status, data };
                    
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async approve(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/access-requests/${id}/approve`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async reject(id, rejectionData) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/access-requests/${id}/reject`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders(),
                        body: JSON.stringify(rejectionData)
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        }
    },

    // ========== PORTAL - FACULTADES ==========
    portal: {
        // ========== PORTAL - NOTIFICACIONES ==========
        notifications: {
            async getAll(status = 'UNREAD', limit = 10) {
                const params = new URLSearchParams({ status, limit }).toString();
                try {
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/portal/notifications?${params}`,
                        {
                            headers: RemoteAPI.getHeaders()
                        }
                    );
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async delete(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/notifications/${id}`, {
                        method: 'DELETE',
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async updateStatus(id, status) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/notifications/${id}`, {
                        method: 'PATCH',
                        headers: RemoteAPI.getHeaders(),
                        body: JSON.stringify({ status })
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PORTAL - DOCUMENTOS ==========
        documents: {
                async getAll(filtros = {}) {
                    // 🔥 FIX: No intentar /admin/documents sin filtros (da 500)
                    // Solo usar /portal/documents directamente
                    
                    const cleanFiltros = { ...filtros };
                    delete cleanFiltros.facultyId;
                    delete cleanFiltros.facultadId;
                    
                    const defaults = { page: 1, limit: 20, ...cleanFiltros };
                    const params = new URLSearchParams(defaults).toString();
                    
                    // ✅ Solo /portal/documents, sin fallback a /admin/documents
                    console.log('🔄 /portal/documents?' + params);
                    try {
                        const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/documents?${params}`, {
                            headers: RemoteAPI.getHeaders()
                        });
                        
                        if (!response.ok) {
                            const text = await response.text();
                            return { 
                                success: false, 
                                error: `HTTP ${response.status}: ${text.substring(0, 100)}`,
                                status: response.status,
                                data: []
                            };
                        }
                        
                        const payload = await response.json();
                        const data = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
                        return { success: true, data, status: response.status };
                        
                    } catch (error) {
                        return { 
                            success: false, 
                            error: error.message,
                            status: 0,
                            data: []
                        };
                    }
                },

            async getById(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/documents/${id}`, {
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getReview(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/documents/${id}/review`, {
                        headers: RemoteAPI.getHeaders()
                    });
                    
                    // Si la respuesta no es OK, intentar leer el body como texto primero
                    if (!response.ok) {
                        const text = await response.text();
                        let errorData = null;
                        try {
                            errorData = JSON.parse(text); // Intentar parsear como JSON
                        } catch {
                            errorData = { message: text.substring(0, 200) };
                        }
                        return { 
                            success: false, 
                            status: response.status,
                            error: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
                            data: errorData
                        };
                    }
                    
                    const data = await response.json();
                    return { success: true, status: response.status, data };
                    
                } catch (error) {
                    return { 
                        success: false, 
                        status: 0,
                        error: error.message || "Error de red"
                    };
                }
            },

            async getHistory(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/documents/${id}/history`, {
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async delete(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/documents/${id}`, {
                        method: 'DELETE',
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok || response.status === 204, data: await response.json().catch(() => ({})) };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PORTAL - INDICADORES ==========
        indicators: {
            async getTracking(id, year) {
                const params = new URLSearchParams({ year }).toString();
                try {
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/portal/indicators/${id}/tracking?${params}`,
                        {
                            headers: RemoteAPI.getHeaders()
                        }
                    );
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async create(indicatorData) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/indicators`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders(),
                        body: JSON.stringify(indicatorData)
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async addTracking(id, trackingData) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/indicators/${id}/tracking`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders(),
                        body: JSON.stringify(trackingData)
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PORTAL - REPORTES ==========
        reports: {
            async create(reportData) {
                const url = `${CONFIG.REMOTE_BASE}/portal/reports`;
                const headers = RemoteAPI.getHeaders();
                
                // Debug: mostrar qué se va a enviar
                console.log('📤 POST', url);
                console.log('📤 Headers:', { 
                    ...headers, 
                    Authorization: headers.Authorization ? 'Bearer ***' : 'SIN TOKEN' 
                });
                console.log('📤 Body:', JSON.stringify(reportData, null, 2));
    
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(reportData)
            });
            
            console.log('📥 Status:', response.status, response.statusText);
            
            let data = null;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                data = await response.json();
                console.log('📥 JSON response:', data);
            } else {
                // Servidor devolvió HTML (página de error 403) o texto
                const text = await response.text();
                data = { 
                    rawResponse: text.substring(0, 500),
                    message: `Error ${response.status}: ${response.statusText}`
                };
                console.log('📥 Text/Error response:', text.substring(0, 200));
            }
            
            return { 
                success: response.ok, 
                data: data,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            // Error de red (servidor no responde, CORS, etc.)
            console.error('❌ Network error:', error);
            return { 
                success: false, 
                error: error.message,
                isNetworkError: true,
                status: 0
            };
        }
    },

            async addAssignment(id, assignmentData) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/reports/${id}/assignments`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders(),
                        body: JSON.stringify(assignmentData)
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PORTAL - FLUJOGRAMAS ==========
        flows: {
            async upload(pdfFile, macroProcess, process, activityName) {
                try {
                    const formData = new FormData();
                    formData.append('pdf', pdfFile);

                    const params = new URLSearchParams({
                        macroProcess,
                        process,
                        activityName
                    });

                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/flows?${params.toString()}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('unmsm_token')}`
                        },
                        body: formData
                    });

                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PORTAL - CARACTERIZACIONES ==========
        characterizations: {
            async upload(pdfFile, macroProcess, process) {
                try {
                    const formData = new FormData();
                    formData.append('pdf', pdfFile);

                    const params = new URLSearchParams({
                        macroProcess,
                        process
                    });

                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/characterizations?${params.toString()}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('unmsm_token')}`
                        },
                        body: formData
                    });

                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PORTAL - RESPUESTAS A OBSERVACIONES ==========
        responses: {
            async toObservations(documentId, subject, observations, attachments = []) {
                const params = new URLSearchParams({
                    subject,
                    observations,
                    attachments: attachments.join(',')
                });

                try {
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/portal/documents/${documentId}/respond?${params.toString()}`,
                        {
                            method: 'POST',
                            headers: RemoteAPI.getHeaders()
                        }
                    );
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PORTAL - DASHBOARD ==========
        dashboard: {
            async get() {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/dashboard`, {
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        }
    },

    // ========== PÚBLICO - Sin autenticación ==========
    public: {
        // ========== PÚBLICO - ESTADÍSTICAS ==========
        stats: {
            async get() {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/public/stats`);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PÚBLICO - MAPA DE PROCESOS ==========
        processMap: {
            async getByFaculty(facultyId) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/public/process-map/${facultyId}`);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getTechnicalSheet(facultyId, processId) {
                try {
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/public/process-map/${facultyId}/processes/${processId}/technical-sheet`
                    );
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getIndicators(facultyId, processId) {
                try {
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/public/process-map/${facultyId}/processes/${processId}/indicators`
                    );
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getFlows(facultyId, processId) {
                try {
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/public/process-map/${facultyId}/processes/${processId}/flows`
                    );
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PÚBLICO - INDICADORES ==========
        indicators: {
            async getAll(filtros = {}) {
                const defaults = { page: 1, limit: 20, ...filtros };
                const params = new URLSearchParams(defaults).toString();
                const url = `${CONFIG.REMOTE_BASE}/public/indicators?${params}`;
                try {
                    const response = await fetch(url);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getIndicators(page = 1, limit = 20) {
                return this.getAll({ page, limit });
            },

            async getApprovedIndicators(page = 1, limit = 20) {
                return this.getAll({ page, limit });
            },

            async getById(id) {
                try {
                    const token = localStorage.getItem('unmsm_token') || localStorage.getItem('accessToken');
                    const headers = { 'Accept': 'application/json' };
                    if (token) headers.Authorization = `Bearer ${token}`;

                    const response = await RemoteAPI.fetchWithTimeout(`${CONFIG.REMOTE_BASE}/public/indicators/${id}`, { headers });

                    let payload = null;
                    try {
                        payload = await response.json();
                    } catch (e) {
                        payload = null;
                    }

                    const error = response.ok ? null : (payload?.message || `HTTP ${response.status}`);
                    return { success: response.ok, data: payload, status: response.status, error };
                } catch (error) {
                    return { success: false, error: error.message, status: 0 };
                }
            },

            async export(indicatorId) {
                try {
                    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');
                    const headers = {
                        'Accept': 'application/json'
                    };
                    
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    const response = await RemoteAPI.fetchWithTimeout(
                        `${CONFIG.REMOTE_BASE}/public/indicators/${indicatorId}/export`,
                        { method: 'GET', headers }
                    );

                    if (!response.ok) {
                        let errorMsg = `HTTP ${response.status}`;
                        try {
                            const errData = await response.json();
                            errorMsg = errData.message || errData.error || errorMsg;
                        } catch (e) {
                            // No JSON response, use default error
                        }
                        return { 
                            success: false, 
                            error: errorMsg,
                            status: response.status 
                        };
                    }

                    const blob = await response.blob();
                    
                    return { 
                        success: true, 
                        data: blob,
                        filename: `indicador-${indicatorId}.pdf`,
                        status: response.status
                    };
                } catch (error) {
                    console.error('Error exportando indicador:', error);
                    return { 
                        success: false, 
                        error: error.message,
                        status: 0 
                    };
                }
            }
        },

        // ========== PÚBLICO - FLUJOGRAMAS ==========
        flows: {
            async getAll(filtros = {}) {
                const defaults = { page: 1, limit: 20, ...filtros };
                const params = new URLSearchParams(defaults).toString();
                const url = `${CONFIG.REMOTE_BASE}/public/flows?${params}`;
                try {
                    const response = await fetch(url);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getById(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/public/flows/${id}`);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async download(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/public/flows/${id}/download`);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PÚBLICO - FACULTADES ==========
        faculties: {
            async getAll(filtros = {}) {
                const defaults = { page: 1, limit: 20, ...filtros };
                const params = new URLSearchParams(defaults).toString();
                const url = `${CONFIG.REMOTE_BASE}/public/faculties?${params}`;
                try {
                    const response = await fetch(url);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },

            async getById(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/public/faculties/${id}`);
                    return { success: response.ok, data: await response.json() };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
        },

        // ========== PÚBLICO - INDICADORES DE PROCESOS ==========
        processIndicators: {
            async getByProcess(facultyId, processId) {
                try {
                    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');
                    const headers = {
                        'Accept': 'application/json'
                    };
                    
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }

                    const response = await RemoteAPI.fetchWithTimeout(
                        `${CONFIG.REMOTE_BASE}/public/process-map/${facultyId}/processes/${processId}/indicators`,
                        { method: 'GET', headers }
                    );

                    if (!response.ok) {
                        let errorMsg = `HTTP ${response.status}`;
                        try {
                            const errData = await response.json();
                            errorMsg = errData.message || errData.error || errorMsg;
                        } catch (e) {
                            // No JSON response, use default error
                        }
                        return { 
                            success: false, 
                            data: [], 
                            status: response.status, 
                            error: errorMsg 
                        };
                    }

                    const data = await response.json();
                    const indicators = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

                    return { 
                        success: true, 
                        data: indicators, 
                        status: response.status,
                        count: indicators.length
                    };
                } catch (error) {
                    console.error('Error obteniendo indicadores del proceso:', error);
                    return { 
                        success: false, 
                        data: [], 
                        error: error.message,
                        status: 0
                    };
                }
            }
        }
    },

    async reset() {
        localStorage.clear();
        return { success: true, message: 'Sesión limpiada' };
    }
};

// ============================================
// EXPORTAR API SEGÚN MODO SELECCIONADO
// ============================================
// Forzar uso del modo remoto (usar la API real)
// Forzar uso del modo remoto SIEMPRE
CONFIG.MODE = 'remote';
// Limpiar cualquier modo local que pudiera estar guardado
localStorage.removeItem('api_mode');

const API = RemoteAPI;

// Helpers para cambiar modo
API.CONFIG = CONFIG;
API.setMode = (mode) => {
    if (mode === 'local' || mode === 'remote') {
        CONFIG.MODE = mode;
        localStorage.setItem('api_mode', mode);
        location.reload();
    }
};
API.getMode = () => CONFIG.MODE;

window.API = API;
console.log(`✅ API UNMSM cargada en modo: ${CONFIG.MODE.toUpperCase()}`);
console.log(`   Base URL: ${CONFIG.MODE === 'remote' ? CONFIG.REMOTE_BASE : 'LocalStorage'}`);
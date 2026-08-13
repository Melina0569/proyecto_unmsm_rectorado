// api.js - API Híbrida UNMSM (LocalStorage + API Real)
// Versión completa con tus 20 facultades y datos originales

// ============================================
// CONFIGURACIÓN - CAMBIA ESTO PARA ALTERNAR
// ============================================
const CONFIG = {
    // 'local' = Usa LocalStorage (sin internet, datos locales)
    // 'remote' = Usa API real UNMSM (requiere internet, datos compartidos)
    MODE: 'local', // Se puede sobrescribir con localStorage: api_mode
    
    // URL de la API real
    REMOTE_BASE: 'http://localhost:8080/v1',
    
    // Timeout para cold start de Render (60 segundos)
    TIMEOUT: 60000
};

// ============================================
// CLAVE ÚNICA POR MODO (evita contaminación)
// ============================================
function getStorageKey(baseKey) {
    // Cada modo tiene su propio namespace
    return `${CONFIG.MODE}_${baseKey}`;
}

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
            // 🔧 FIX: El PDF real de Gestión Estratégica SOLO para Medicina (facultyId = 1)
            const isMedicina = String(facultyId) === '1';
            const isFirstFlow = (counter === 1);
            const hasRealPdf = isFirstFlow && isMedicina;
            
            flows.push({
                id: hasRealPdf ? 'PE-01' : `flow-${facultyId}-${type}-${idx}`,
                code: hasRealPdf ? 'PE-01' : `FL-${String(counter).padStart(3, '0')}`,
                name: isFirstFlow ? 'Gestión Estratégica' : `Proceso de ${name}`,
                type: type,
                description: `Flujograma del proceso de ${name.toLowerCase()}`,
                pages: Math.floor(Math.random() * 5) + 2,
                lastUpdated: new Date().toISOString().split('T')[0],
                pdfUrl: hasRealPdf ? 'docs/pdfs/flujogramas/FLUJOGRAMA DE GESTIÓN ESTRATÉGICA (2).pdf' : `#pdf-${facultyId}-${counter}`,
                downloads: 0,
                facultyId: facultyId,
                // AGREGA ESTAS 2 LÍNEAS:
                estado: 'pendiente',
                isSystemGenerated: true   // flag para saber que es auto-generado
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
                lastUpdated: new Date().toISOString().split('T')[0],
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
        faculties: getStorageKey('sigpro_faculties'),      // local_sigpro_faculties
        indicators: getStorageKey('sigpro_indicators'),    // local_sigpro_indicators
        processes: getStorageKey('sigpro_processes'),
        version: getStorageKey('sigpro_data_version'),
        processesVersion: getStorageKey('sigpro_processes_version'),
        documentosLista: getStorageKey('sigpro_documentos_lista'),      // ← AGREGAR
        documentosDetalle: getStorageKey('sigpro_documentos_detalle'),    // ← AGREGAR
        indicadoresDetalle: getStorageKey('sigpro_indicadores_detalle')   // ← AGREGAR
    },

    init() {
        console.log('API Local - Inicializando...');
        
        const storedVersion = localStorage.getItem(this.db.version);
        
        // Siempre regenerar si cambió la versión o no hay datos
        if (storedVersion !== DATA_VERSION) {
            console.log(`🆕 Versión ${storedVersion} → ${DATA_VERSION}, regenerando datos locales...`);
            this.clearAll();
            localStorage.setItem(this.db.version, DATA_VERSION);
        }
        
        if (!localStorage.getItem(this.db.faculties)) {
            console.log('Generando 20 facultades locales...');
            this.seedData();
        }
    },

    clearAll() {
        // Solo limpiar claves del modo LOCAL (prefijo 'local_')
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('local_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Limpiadas ${keysToRemove.length} claves locales`);
    },

    

    // TUS 20 FACULTADES ORIGINALES
    async seedData() {
        const defaultFaculties = [
            { id: 1, name: 'Medicina', code: 'FM', icon: 'medical_services', color: 'red', indicators: 12, flows: 8, processes: 5, createdAt: new Date().toISOString() },
            { id: 2, name: 'Derecho y Ciencia Política', code: 'FDCP', icon: 'gavel', color: 'indigo', indicators: 15, flows: 6, processes: 4, createdAt: new Date().toISOString() },
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
        ];
        
        localStorage.setItem(this.db.faculties, JSON.stringify(defaultFaculties));
        console.log('✅ 20 facultades locales guardadas en:', this.db.faculties);

        // ============================================================
        // INDICADORES DE EJEMPLO - MEDICINA PE.01 (SIEMPRE DISPONIBLES)
        // ============================================================
        
        // 1. Lista de documentos
        let docsLista = JSON.parse(localStorage.getItem(this.db.documentosLista) || '[]');
        docsLista = docsLista.filter(d => d.codigo !== 'IND-FM-2026-001' && d.codigo !== 'IND-FM-2026-002');
        docsLista.push(
            {
                "id": "ind-fm-2026-001",
                "codigo": "IND-FM-2026-001",
                "tipo": "indicador",
                "estado": "aprobado",
                "facultadId": "1",
                "nombreFacultad": "Facultad de Medicina",
                "descripcion": "Índice de Satisfacción de Usuarios Externos",
                "fecha": "2026-01-15T10:00:00Z",
                "isDemo": true
            },
            {
                "id": "ind-fm-2026-002",
                "codigo": "IND-FM-2026-002",
                "tipo": "indicador",
                "estado": "aprobado",
                "facultadId": "1",
                "nombreFacultad": "Facultad de Medicina",
                "descripcion": "Tasa de Cumplimiento del Plan Estratégico Institucional",
                "fecha": "2026-02-20T14:30:00Z",
                "isDemo": true
            }
        );
        localStorage.setItem(this.db.documentosLista, JSON.stringify(docsLista));

        // 2. Detalles de indicadores
        let docsDetalle = JSON.parse(localStorage.getItem(this.db.documentosDetalle) || '{}');
        docsDetalle['IND-FM-2026-001'] = {
            "fichaData": {
                "codigo": "IND-FM-2026-001",
                "nombreIndicador": "Índice de Satisfacción de Usuarios Externos",
                "macroProcesoNombre": "PE.01 Gestión Estratégica",
                "macroProcesoTexto": "PE.01",
                "macroProceso": "PE.01",
                "proceso": "PE.01",
                "procesoNombre": "Gestión Estratégica",
                "codigoProceso": "PE.01",
                "tipoProceso": "ESTRATEGICO",
                "version": "2.0",
                "unidadResponsable": "Oficina de Calidad - Facultad de Medicina",
                "responsable": "Dra. María Elena Vargas",
                "frecuencia": "Semestral",
                "variableN": "N° de usuarios satisfechos (encuesta ≥4)",
                "variableD": "Total de usuarios encuestados",
                "fuente": "Encuesta de Satisfacción SIGPRO - FM",
                "meta": "85",
                "objetivoProceso": "Medir el nivel de satisfacción de los usuarios externos (pacientes, familiares, comunidad) respecto a los servicios académicos y de salud ofrecidos por la Facultad de Medicina.",
                "descripcion": "Índice de Satisfacción de Usuarios Externos"
            }
        };
        docsDetalle['IND-FM-2026-002'] = {
            "fichaData": {
                "codigo": "IND-FM-2026-002",
                "nombreIndicador": "Tasa de Cumplimiento del Plan Estratégico Institucional",
                "macroProcesoNombre": "PE.01 Gestión Estratégica",
                "macroProcesoTexto": "PE.01",
                "macroProceso": "PE.01",
                "proceso": "PE.01",
                "procesoNombre": "Gestión Estratégica",
                "codigoProceso": "PE.01",
                "tipoProceso": "ESTRATEGICO",
                "version": "1.5",
                "unidadResponsable": "Dirección de Planificación - FM",
                "responsable": "Dr. Carlos Alberto Mendoza",
                "frecuencia": "Anual",
                "variableN": "N° de metas del PEI cumplidas",
                "variableD": "Total de metas del PEI programadas",
                "fuente": "Sistema de Gestión del Plan Estratégico UNMSM",
                "meta": "90",
                "objetivoProceso": "Evaluar el grado de cumplimiento de las metas establecidas en el Plan Estratégico Institucional de la Facultad de Medicina, asegurando la alineación con los objetivos de la Decana de América.",
                "descripcion": "Tasa de Cumplimiento del Plan Estratégico Institucional"
            }
        };
        localStorage.setItem(this.db.documentosDetalle, JSON.stringify(docsDetalle));

        // 3. Historiales de seguimiento
        localStorage.setItem('sigpro_historial_datos_IND-FM-2026-001', JSON.stringify([
            {"fecha": "2023-I", "periodo": "2023-I", "resultado": 72.5, "devengado": 145, "pim": 200, "metaPeriodo": 80, "analisis": "Primer semestre con encuesta piloto. Baja participación de usuarios.", "acciones": "Ampliar cobertura de encuestas en hospitales asociados."},
            {"fecha": "2023-II", "periodo": "2023-II", "resultado": 78.0, "devengado": 195, "pim": 250, "metaPeriodo": 80, "analisis": "Mejora significativa tras implementación de encuestas digitales.", "acciones": "Capacitar personal en atención al usuario."},
            {"fecha": "2024-I", "periodo": "2024-I", "resultado": 82.3, "devengado": 247, "pim": 300, "metaPeriodo": 82, "analisis": "Supera meta por primera vez. Alta satisfacción en servicios de consulta externa.", "acciones": "Mantener estándares y replicar modelo en otras áreas."},
            {"fecha": "2024-II", "periodo": "2024-II", "resultado": 85.7, "devengado": 300, "pim": 350, "metaPeriodo": 85, "analisis": "Meta alcanzada con éxito. Satisfacción óptima en todas las áreas evaluadas.", "acciones": "Consolidar buenas prácticas, planificar encuesta anual 2025."},
            {"fecha": "2025-I", "periodo": "2025-I", "resultado": 88.2, "devengado": 353, "pim": 400, "metaPeriodo": 85, "analisis": "Tendencia ascendente sostenida. Mejor resultado histórico.", "acciones": "Propuesta de aumentar meta al 90% para 2025-II."}
        ]));

        localStorage.setItem('sigpro_historial_datos_IND-FM-2026-002', JSON.stringify([
            {"fecha": "2020", "periodo": "2020", "resultado": 65.0, "devengado": 13, "pim": 20, "metaPeriodo": 75, "analisis": "Año afectado por pandemia COVID-19. Reprogramación de metas.", "acciones": "Revisar cronograma y ajustar metas a contexto post-pandemia."},
            {"fecha": "2021", "periodo": "2021", "resultado": 70.0, "devengado": 14, "pim": 20, "metaPeriodo": 75, "analisis": "Recuperación gradual. Dificultades en metas de infraestructura.", "acciones": "Priorizar metas de investigación y docencia."},
            {"fecha": "2022", "periodo": "2022", "resultado": 78.0, "devengado": 39, "pim": 50, "metaPeriodo": 80, "analisis": "Mejora notable. Avance en acreditación internacional.", "acciones": "Fortalecer seguimiento trimestral de metas."},
            {"fecha": "2023", "periodo": "2023", "resultado": 85.0, "devengado": 51, "pim": 60, "metaPeriodo": 85, "analisis": "Meta alcanzada. Éxito en internacionalización y publicaciones.", "acciones": "Replicar modelo de gestión en otros procesos estratégicos."},
            {"fecha": "2024", "periodo": "2024", "resultado": 92.0, "devengado": 69, "pim": 75, "metaPeriodo": 90, "analisis": "Excelente desempeño. Cumplimiento superior al 90% por primera vez.", "acciones": "Ajustar Plan Estratégico 2025-2030 con metas más ambiciosas."},
            {"fecha": "2025", "periodo": "2025", "resultado": 91.5, "devengado": 22, "pim": 24, "metaPeriodo": 90, "analisis": "En curso. Proyección favorable para cierre de año.", "acciones": "Monitorear metas pendientes de investigación clínica."}
        ]));

        console.log('✅ Indicadores de Medicina PE.01 precargados permanentemente');
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

        //async registro(userData) {
            //await simulateDelay(600);
            // Simulación: registro exitoso
            //return { 
                //success: true, 
                //data: { message: 'Usuario registrado correctamente' },
                //status: 201 
            //};
        //},

        async logout() {
            // Usar la misma limpieza completa que RemoteAPI
            localStorage.removeItem('token');
            localStorage.removeItem('unmsm_token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('unmsm_access_token');
            localStorage.removeItem('unmsm_refresh_token');
            localStorage.removeItem('unmsm_token_expires_at');
            localStorage.removeItem('unmsm_user');
            localStorage.removeItem('unmsm_faculty_id');
            localStorage.removeItem('unmsm_faculty_name');
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
            // ✅ MODO LOCAL: Calcular desde datos locales, NUNCA hacer fetch
            const faculties = JSON.parse(localStorage.getItem(this.db.faculties) || '[]');
            
            const totalIndicators = faculties.reduce((sum, f) => sum + (f.indicators || 0), 0);
            const totalFlows = faculties.reduce((sum, f) => sum + (f.flows || 0), 0);
            
            const stats = {
                faculties: faculties.length,
                facultyCount: faculties.length,
                totalFaculties: faculties.length,
                indicators: totalIndicators,
                indicatorsCount: totalIndicators,
                totalIndicators: totalIndicators,
                flows: totalFlows,
                flowsCount: totalFlows,
                totalFlows: totalFlows,
                activeUsers: 20,
                usersActive: 20,
                activeUsersCount: 20,
                users: 20
            };
            
            console.log('📊 [LOCAL] Stats calculados:', stats);
            return { success: true, data: stats };
        }
    },

    // ========== DOCUMENTOS (Simulado) ==========
    documentos: {
        async getAll(filtros = {}) {
            await simulateDelay(400);
            
            // ✅ SOLO documentos creados por usuarios (reportes, indicadores, etc.)
            // NO incluimos flujogramas auto-generados que son fantasmas
            let allDocs = [];
            
            // 1. Leer desde la lista oficial de documentos del dashboard
            const docsLista = JSON.parse(localStorage.getItem(LocalAPI.db.documentosLista) || '[]');
            // 1b. También leer desde la clave SIN prefijo (donde guardan todas las fichas)
            //     Esto cubre ficha-indicador, ficha-caracterizacion, ficha-flujograma,
            //     ficha-inventario y hoja-reporte que todas usan 'sigpro_documentos_lista'
            const docsListaSinPrefijo = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
            // Fusionar evitando duplicados por código
            const codigosEnLista = new Set(docsLista.map(d => d.codigo));
            const docsSinPrefijuNuevos = docsListaSinPrefijo.filter(d => !codigosEnLista.has(d.codigo));
            allDocs = [...docsLista, ...docsSinPrefijuNuevos];
            
            // 2. También sincronizar con reportes creados
            const reportes = JSON.parse(localStorage.getItem('sigpro_reportes') || '[]');
            for (const rep of reportes) {
                const yaExiste = allDocs.some(d => d.id === rep.id);
                if (!yaExiste) {
                    allDocs.push({
                        id: rep.id,
                        codigo: rep.code || rep.id,
                        tipo: 'reporte',
                        estado: rep.status === 'PENDING' ? 'pendiente' : 
                                rep.status === 'IN_PROGRESS' ? 'en_proceso' : 
                                rep.status === 'COMPLETED' ? 'completado' : 'pendiente',
                        descripcion: `Reporte ${rep.semester} - ${rep.responsibleName}`,
                        fecha: rep.createdAt ? rep.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                        generadoPor: 'Facultad',
                        progreso: rep.status === 'COMPLETED' ? 100 : rep.status === 'IN_PROGRESS' ? 50 : 5,
                        facultadId: rep.facultyId || '',
                        origen: 'local'
                    });
                }
            }
            
            // 3. Aplicar filtros
            let data = allDocs;
            if (filtros.facultadId) {
                data = data.filter(d => String(d.facultadId) === String(filtros.facultadId));
            }
            if (filtros.estado) {
                data = data.filter(d => d.estado === filtros.estado);
            }
            
            return { success: true, data };
        },

        async getById(id) {
            await simulateDelay(200);
            
            // Buscar detalle técnico donde se guardan pdfBase64 y archivos
            const docsDetalle = JSON.parse(localStorage.getItem(this.db.documentosDetalle) || '{}');
            const detalle = docsDetalle[id] || {};
            
            // Buscar en lista general
            const allDocs = await LocalAPI.documentos.getAll();
            const docInfo = allDocs.data.find(d => d.id === id || d.codigo === id) || {};
            
            return { 
                success: true, 
                data: { 
                    id: id,
                    nombre: docInfo.descripcion || detalle.fichaData?.nombreIndicador || 'Documento ' + id,
                    estado: docInfo.estado || 'pendiente',
                    // ✅ CRÍTICO: exponer los archivos para el fallback
                    pdfUrl: detalle.pdfUrl || null,
                    pdfBase64: detalle.pdfBase64 || null,
                    archivos: detalle.archivos || [],
                    fichaData: detalle.fichaData || null,
                    ...docInfo
                } 
            };
        }
    },

    repositorio: {
        async getAprobados(filtros = {}) {
            await simulateDelay(400);
            
            // ✅ 1. Leer documentos EXPLÍCITAMENTE aprobados
            let approvedDocs = [];
            try {
                approvedDocs = JSON.parse(localStorage.getItem('sigpro_approved_docs') || '[]');
            } catch (e) {
                approvedDocs = [];
            }
            
            // ✅ 2. También buscar en la lista general los que tengan estado "aprobado"
            const generalDocs = await LocalAPI.documentos.getAll(filtros);
            const fromGeneral = generalDocs.data.filter(d => 
                d.estado === 'aprobado' || d.status === 'APPROVED'
            );
            
            // ✅ 3. Mergear y eliminar duplicados
            const merged = [...approvedDocs, ...fromGeneral];
            const seen = new Set();
            const unique = merged.filter(d => {
                const key = d.id || d.codigo || d.code;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            // ✅ 4. Aplicar filtros
            let data = unique;
            if (filtros.facultyId) {
                data = data.filter(d => String(d.facultyId) === String(filtros.facultyId));
            }
            if (filtros.estado) {
                data = data.filter(d => d.estado === filtros.estado || d.status === filtros.estado);
            }
            
            return { success: true, data };
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

        // ========== PORTAL (Simulado para modo local) ==========
    portal: {
        reports: {
            async create(reportData) {
                await simulateDelay(600);
                
                const localId = `local-${Date.now()}`;
                const reporteGuardado = {
                    id: localId,
                    ...reportData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    status: 'PENDING'
                };
                
                // 1. Guardar en reportes
                const existing = JSON.parse(localStorage.getItem('sigpro_reportes') || '[]');
                existing.push(reporteGuardado);
                localStorage.setItem('sigpro_reportes', JSON.stringify(existing));
                
                // 2. Guardar en lista del dashboard
                const docsLista = JSON.parse(localStorage.getItem(LocalAPI.db.documentosLista) || '[]');
                docsLista.unshift({
                    id: localId,
                    codigo: reportData.code || `HR-${Date.now()}`,
                    tipo: 'reporte',
                    estado: 'pendiente',
                    descripcion: reportData.description || `Reporte ${reportData.semester} - ${reportData.responsibleName}`,
                    fecha: new Date().toISOString().split('T')[0],
                    hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
                    generadoPor: reportData.responsibleName || 'Facultad',
                    progreso: 5,
                    facultadId: reportData.facultyId || 1,
                    origen: 'local'
                });
                localStorage.setItem(LocalAPI.db.documentosLista, JSON.stringify(docsLista));

                // ✅ AGREGAR ESTO: Sincronizar con clave sin prefijo para compatibilidad con racio-inicio
                try {
                    const listaGlobal = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
                    listaGlobal.unshift({
                        id: localId,
                        codigo: reportData.code || `HR-${Date.now()}`,
                        tipo: 'reporte',
                        estado: 'pendiente',
                        descripcion: reportData.description || `Reporte ${reportData.semester} - ${reportData.responsibleName}`,
                        fecha: new Date().toISOString().split('T')[0],
                        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
                        generadoPor: reportData.responsibleName || 'Facultad',
                        progreso: 5,
                        facultadId: reportData.facultyId || 1,
                        origen: 'local'
                    });
                    localStorage.setItem('sigpro_documentos_lista', JSON.stringify(listaGlobal));
                } catch (e) {
                    console.warn('No se pudo sincronizar con sigpro_documentos_lista:', e);
                }
                
                // ============================================
                // ✅ AGREGA ESTO: Información técnica para el visor
                // ============================================
                let docsDetalle = JSON.parse(localStorage.getItem(LocalAPI.db.documentosDetalle) || '{}');
                docsDetalle[localId] = {
                    fichaData: {
                        codigo: reportData.code || `HR-${Date.now()}`,
                        nombreIndicador: reportData.title || reportData.description || `Reporte ${reportData.semester}`,
                        macroProcesoNombre: reportData.macroProcess ? `${reportData.macroProcess}` : 'No especificado',
                        macroProcesoTexto: reportData.macroProcess || '--',
                        macroProceso: reportData.macroProcess || '--',
                        proceso: reportData.process || '--',
                        procesoNombre: reportData.process || 'No especificado',
                        codigoProceso: reportData.process || '--',
                        tipoProceso: reportData.processType || 'SOPORTE',
                        version: '1.0',
                        unidadResponsable: reportData.unit || 'Facultad',
                        responsable: reportData.responsibleName || 'No especificado',
                        frecuencia: 'Semestral',
                        variableN: 'N/A',
                        variableD: 'N/A',
                        fuente: 'Sistema SIGPRO',
                        meta: '100',
                        objetivoProceso: reportData.objective || 'Sin objetivo especificado',
                        descripcion: reportData.description || 'Sin descripción'
                    },
                    // ✅ Archivos adjuntos / PDF
                    archivos: reportData.attachments || [],
                    pdfUrl: reportData.pdfUrl || reportData.fileUrl || null,
                    pdfBase64: reportData.pdfBase64 || null  // si guardas el PDF en base64
                };
                localStorage.setItem(LocalAPI.db.documentosDetalle, JSON.stringify(docsDetalle));
                // ============================================
                
                console.log('✅ [LOCAL] Reporte creado con detalle técnico:', reporteGuardado);
                
                return {
                    success: true,
                    data: {
                        id: localId,
                        code: reportData.code,
                        status: 'PENDING',
                        message: 'Reporte creado en modo local'
                    },
                    status: 201
                };
            }
        },
        
        documents: {
            async getAll(filtros = {}) {
                return LocalAPI.documentos.getAll(filtros);
            },
            async getById(id) {
                return LocalAPI.documentos.getById(id);
            },
            async getHistory(id) {
                await new Promise(r => setTimeout(r, 200));
                // Leer historial guardado localmente si existe
                const historial = JSON.parse(
                    localStorage.getItem(`sigpro_historial_rect_${id}`) || '[]'
                );
                return { success: true, data: { documentos: historial } };
            },
            async delete(id) {
                // Borrar de TODAS las listas
                let docsLista = JSON.parse(localStorage.getItem(LocalAPI.db.documentosLista) || '[]');
                docsLista = docsLista.filter(d => d.id !== id && d.codigo !== id);
                localStorage.setItem(LocalAPI.db.documentosLista, JSON.stringify(docsLista));
                
                // ✅ AGREGAR ESTO: Borrar también de clave sin prefijo
                try {
                    let globalLista = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
                    globalLista = globalLista.filter(d => d.id !== id && d.codigo !== id);
                    localStorage.setItem('sigpro_documentos_lista', JSON.stringify(globalLista));
                } catch (e) {}
                
                let reportes = JSON.parse(localStorage.getItem('sigpro_reportes') || '[]');
                reportes = reportes.filter(r => r.id !== id && r.code !== id && r.codigo !== id);
                localStorage.setItem('sigpro_reportes', JSON.stringify(reportes));
                
                // Borrar también detalle
                let docsDetalle = JSON.parse(localStorage.getItem(LocalAPI.db.documentosDetalle) || '{}');
                delete docsDetalle[id];
                localStorage.setItem(LocalAPI.db.documentosDetalle, JSON.stringify(docsDetalle));
                
                return { success: true };
            }
        },
        
        dashboard: {
            async get() {
                return LocalAPI.dashboard.getPublicMetrics();
            }
        }
    },

    // ========== UTILIDADES ==========
    async reset() {
        localStorage.removeItem(this.db.faculties);
        localStorage.removeItem(this.db.indicators);
        localStorage.removeItem(this.db.processes);
        localStorage.removeItem(this.db.version);
        localStorage.removeItem(this.db.processesVersion);
        localStorage.removeItem('sigpro_approved_docs');        
        localStorage.removeItem('sigpro_access_requests');      
        localStorage.removeItem('sigpro_documentos_lista');     
        
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
                    const payload = data?.data || data || {};
                    // El backend devuelve: { accessToken, refreshToken, expiresIn, user: {...} }
                    const user = payload?.user || {};
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
                        role: rol,
                        facultyId,
                        facultadId: facultyId,
                        facultad,
                        nombreFacultad: facultad,
                        refreshToken: payload?.refreshToken || payload?.refresh_token || null,
                        accessToken: payload?.accessToken || payload?.access_token || payload?.token || null,
                        expiresIn: payload?.expiresIn || payload?.expires_in || 3600
                    };
                };

                const persistSession = (normalizedUser, accessToken, refreshToken) => {
                    localStorage.setItem('unmsm_faculty_id', normalizedUser.facultyId || '');
                    localStorage.setItem('unmsm_faculty_name', normalizedUser.facultad || '');
                    localStorage.setItem('unmsm_token', accessToken);
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('token', accessToken);
                    // ✅ GUARDAR REFRESH TOKEN
                    if (refreshToken) {
                        localStorage.setItem('unmsm_refresh_token', refreshToken);
                    }
                    
                    localStorage.setItem('unmsm_user', JSON.stringify(normalizedUser));
                    
                    // ✅ GUARDAR EXPIRACIÓN según backend
                    const expiresAt = Date.now() + ((normalizedUser.expiresIn || 3600) * 1000);
                    localStorage.setItem('unmsm_token_expires_at', String(expiresAt));
                };

                const loginWithJson = async (path) => {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}${path}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
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

                const buildAuthError = (result) => {
                    const status = result?.response?.status ?? 0;
                    const backendMessage = result?.data?.message || result?.data?.detail || result?.data?.error || result?.data?.code;

                    if (backendMessage) {
                        return backendMessage;
                    }

                    if (status === 401) return 'Credenciales incorrectas';
                    if (status === 403) return 'Acceso denegado por el backend';
                    if (status >= 500) return `Error del servidor (${status})`;
                    if (status > 0) return `Error HTTP ${status}`;
                    return 'No se pudo conectar con el backend';
                };

                let authResult = await loginWithJson('/auth/login');
                let authResponse = authResult?.response ?? { ok: false, status: 0 };
                let normalized = normalizeAuthResponse(authResult.data, email);

                if (authResponse.ok && normalized.accessToken) {
                    persistSession(normalized, normalized.accessToken, normalized.refreshToken);
                }

                const authError = authResponse.ok && !normalized.accessToken
                    ? 'La API respondió sin token de acceso'
                    : buildAuthError(authResult);

                return {
                    success: authResponse.ok && !!normalized.accessToken,
                    error: authResponse.ok && !!normalized.accessToken ? null : authError,
                    data: {
                        ...authResult.data,
                        accessToken: normalized.accessToken,
                        refreshToken: normalized.refreshToken,
                        user: authResult.data?.user || authResult.data?.data?.user || normalized,
                        rol: normalized.rol,
                        role: normalized.role,
                        expiresIn: normalized.expiresIn,
                        message: authResponse.ok && !!normalized.accessToken ? null : authError
                    },
                    status: authResponse.status
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
                // ✅ Validar que facultyId sea string (UUID) o número, no forzar conversión
                const payload = {
                    email: registroData.email,
                    firstName: registroData.firstName,
                    lastName: registroData.lastName,
                    facultyId: registroData.facultyId,        // ← UUID string, sin parseInt
                    phone: registroData.phone || '',
                    position: registroData.position || '',
                    message: registroData.message || 'Solicitud de acceso al sistema SIGPRO'
                };

                const response = await fetch(`${CONFIG.REMOTE_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                        // ❌ Sin Authorization — es endpoint público
                    },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                
                // Guardar en localStorage como backup
                if (response.ok && data.requestId) {
                    const pendingRequest = {
                        id: data.requestId,
                        requestId: data.requestId,
                        email: registroData.email,
                        firstName: registroData.firstName,
                        lastName: registroData.lastName,
                        fullName: `${registroData.firstName} ${registroData.lastName}`.trim(),
                        facultyId: registroData.facultyId,        // ← UUID string preservado
                        faculty: registroData.facultyName || registroData.faculty || 'Facultad no especificada',
                        position: registroData.position || '',
                        phone: registroData.phone || '',
                        message: registroData.message || '',
                        status: 'PENDING',
                        estado: 'PENDING',
                        requestedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    };
                    
                    const existing = JSON.parse(localStorage.getItem('sigpro_access_requests') || '[]');
                    existing.push(pendingRequest);
                    localStorage.setItem('sigpro_access_requests', JSON.stringify(existing));
                    
                    console.log('✅ Solicitud guardada en localStorage:', pendingRequest);
                }
                
                return { 
                    success: response.ok, 
                    data: data, 
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
                    // ✅ ACTUALIZAR TOKENS
                    localStorage.setItem('unmsm_token', data.accessToken);
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('token', data.accessToken);
                    
                    const newExpiresAt = Date.now() + ((data.expiresIn || 3600) * 1000);
                    localStorage.setItem('unmsm_token_expires_at', String(newExpiresAt));
                    
                    console.log('✅ Token renovado exitosamente');
                } else {
                    // Refresh token inválido → limpiar todo
                    this.clearSession();
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
                // Notificar al backend (opcional, el refresh token expira solo)
                await fetch(`${CONFIG.REMOTE_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: this.getHeaders()
                });
            } catch (e) {
                console.log('Logout silencioso');
            }
            this.clearSession();
            return { success: true };
        },

        clearSession() {
            localStorage.removeItem('unmsm_token');
            localStorage.removeItem('unmsm_refresh_token');
            localStorage.removeItem('unmsm_user');
            localStorage.removeItem('unmsm_token_expires_at');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('token');
            localStorage.removeItem('unmsm_faculty_id');
            localStorage.removeItem('unmsm_faculty_name');
        },

        isAuthenticated() {
            return !!localStorage.getItem('unmsm_token');
        },

        getUser() {
            const user = localStorage.getItem('unmsm_user');
            return user ? JSON.parse(user) : null;
        },

        // ✅ NUEVO: Verificar si el token está por expirar
        isTokenExpiringSoon(minutesBefore = 5) {
            const expiresAt = parseInt(localStorage.getItem('unmsm_token_expires_at') || '0');
            if (!expiresAt) return true;
            return Date.now() >= (expiresAt - (minutesBefore * 60 * 1000));
        }
    },

    // ========== DASHBOARD ==========
    dashboard: {
        async getPublicMetrics() {
            try {
                // ✅ MODO REMOTO: Solo fetch al backend
                const response = await fetch(`${CONFIG.REMOTE_BASE}/public/stats`, {
                    headers: { 'Accept': 'application/json' }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                return { success: true, data };
            } catch (error) {
                console.warn('[REMOTE] Dashboard no disponible:', error.message);
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
                        // ✅ OBTENER INFO COMPLETA del documento antes de guardar
                        const allDocs = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
                        const docInfo = allDocs.find(d => (d.id === id || d.codigo === id)) || {};
                        
                        // Normalizar el documento aprobado
                        const approvedDoc = {
                            id: id,
                            code: docInfo.codigo || id,
                            codigo: docInfo.codigo || id,
                            title: docInfo.descripcion || docInfo.nombre || data.title || 'Documento aprobado',
                            descripcion: docInfo.descripcion || docInfo.nombre || data.title || 'Documento aprobado',
                            name: docInfo.descripcion || docInfo.nombre || data.title || 'Documento aprobado',
                            type: docInfo.tipo || data.type || 'reporte',
                            tipo: docInfo.tipo || data.type || 'reporte',
                            status: 'APPROVED',
                            estado: 'aprobado',
                            faculty: docInfo.nombreFacultad || docInfo.facultad || data.facultyName || 'UNMSM',
                            facultad: docInfo.nombreFacultad || docInfo.facultad || data.facultyName || 'UNMSM',
                            nombreFacultad: docInfo.nombreFacultad || docInfo.facultad || data.facultyName || 'UNMSM',
                            facultyId: docInfo.facultyId || data.facultyId || '',
                            unit: docInfo.unidad || data.unit || 'Oficina de Racionalización',
                            unidad: docInfo.unidad || data.unit || 'Oficina de Racionalización',
                            publicUrl: data.publicUrl || data.urlPublica || `/public/reps/${id}`,
                            approvedAt: new Date().toISOString(),
                            fechaAprobacion: new Date().toISOString(),
                            fecha: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            // Campos para compatibilidad con normalizeRemoteRepositoryDoc
                            approvedAt: data.approvedAt || new Date().toISOString(),
                            publishedAt: data.publishedAt || new Date().toISOString(),
                            createdAt: docInfo.fecha || docInfo.createdAt || new Date().toISOString()
                        };
                        
                        // Guardar en sigpro_approved_docs
                        const approvedDocs = JSON.parse(localStorage.getItem('sigpro_approved_docs') || '[]');
                        const existingIndex = approvedDocs.findIndex(d => d.id === id || d.codigo === approvedDoc.codigo);
                        
                        if (existingIndex >= 0) {
                            approvedDocs[existingIndex] = { ...approvedDocs[existingIndex], ...approvedDoc };
                        } else {
                            approvedDocs.push(approvedDoc);
                        }
                        
                        localStorage.setItem('sigpro_approved_docs', JSON.stringify(approvedDocs));
                        
                        // 🔥 DISPARAR EVENTO de storage para sincronizar otras pestañas
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: 'sigpro_approved_docs',
                            newValue: JSON.stringify(approvedDocs)
                        }));
                        
                        console.log('✅ Documento aprobado guardado en localStorage:', approvedDoc);
                    }
                    
                    return { success: response.ok, data, status: response.status };
                } catch (error) {
                    console.error('❌ Error en approve:', error);
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
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/admin/access-requests/${id}/approve`,
                        {
                            method: 'POST',
                            headers: RemoteAPI.getHeaders()
                        }
                    );
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Error ${response.status}: ${errorText.substring(0, 200)}`);
                    }
                    
                    const data = await response.json();
                    console.log('✅ Solicitud aprobada:', data);
                    
                    // Actualizar localStorage
                    try {
                        const requests = JSON.parse(localStorage.getItem('sigpro_access_requests') || '[]');
                        const updated = requests.map(req => {
                            if ((req.id || req.requestId || '') === id) {
                                return { 
                                    ...req, 
                                    status: 'APPROVED', 
                                    estado: 'APPROVED',
                                    approvedAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                };
                            }
                            return req;
                        });
                        localStorage.setItem('sigpro_access_requests', JSON.stringify(updated));
                        
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: 'sigpro_access_requests',
                            newValue: JSON.stringify(updated)
                        }));
                    } catch (e) {
                        console.warn('No se pudo actualizar localStorage:', e);
                    }
                    
                    return { success: true, data, status: response.status };
                    
                } catch (error) {
                    console.error('❌ Error en approve:', error);
                    return { success: false, error: error.message, status: 0 };
                }
            },

            async reject(id, rejectionData) {
            try {
                // ✅ FIX: El backend espera { additionalProp1, additionalProp2, additionalProp3 }
                // Mapeamos "reason" a additionalProp1 para compatibilidad
                const body = {
                    additionalProp1: rejectionData.reason || rejectionData.additionalProp1 || 'Solicitud rechazada',
                    additionalProp2: rejectionData.additionalProp2 || '',
                    additionalProp3: rejectionData.additionalProp3 || ''
                };

                const response = await fetch(`${CONFIG.REMOTE_BASE}/admin/access-requests/${id}/reject`, {
                    method: 'POST',
                    headers: RemoteAPI.getHeaders(),
                    body: JSON.stringify(body)
                });
                
                let data = null;
                try {
                    data = await response.json();
                } catch (e) {
                    data = { message: 'Solicitud rechazada' };
                }
                
                if (!response.ok) {
                    console.error('❌ Reject error:', data);
                    return { 
                        success: false, 
                        error: data?.message || `HTTP ${response.status}`,
                        status: response.status 
                    };
                }
                
                return { success: true, data, status: response.status };
            } catch (error) {
                console.error('❌ Reject exception:', error);
                return { success: false, error: error.message, status: 0 };
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
                        { headers: RemoteAPI.getHeaders() }
                    );
                    
                    // 🔧 FIX: Si UNREAD da 500, intentar READ con límite mayor y filtrar local
                    if (!response.ok && status === 'UNREAD' && response.status === 500) {
                        console.warn('⚠️ /portal/notifications?status=UNREAD → 500, haciendo fallback a READ...');
                        const fallbackResp = await fetch(
                            `${CONFIG.REMOTE_BASE}/portal/notifications?status=READ&limit=50`,
                            { headers: RemoteAPI.getHeaders() }
                        );
                        if (fallbackResp.ok) {
                            const allData = await fallbackResp.json();
                            const data = Array.isArray(allData) ? allData : (allData.data || []);
                            const unreadOnly = data.filter(n => n.status === 'UNREAD' || n.read === false);
                            return { success: true, data: unreadOnly, status: 200, fallback: true };
                        }
                    }
                    
                    const data = await response.json();
                    return { success: response.ok, data: Array.isArray(data) ? data : (data.data || []), status: response.status };
                } catch (error) {
                    return { success: false, error: error.message, status: 0, data: [] };
                }
            },

            async delete(id) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/notifications/${id}`, {
                        method: 'DELETE',
                        headers: RemoteAPI.getHeaders()
                    });
                    return { success: response.ok, data: await response.json().catch(() => ({})) };
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
                    return { success: response.ok, data: await response.json().catch(() => ({})) };
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
                    const token = localStorage.getItem('token') 
                        || localStorage.getItem('unmsm_token') 
                        || localStorage.getItem('accessToken');
                    
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/documents/${encodeURIComponent(id)}`, {
                        method: 'DELETE',
                        headers: {
                            'Accept': '*/*',
                            'Authorization': token ? `Bearer ${token}` : ''
                        }
                    });
                    
                    // 204 No Content = éxito, no hay body que parsear
                    if (response.status === 204 || response.ok) {
                        return { success: true, status: response.status };
                    }
                    
                    // Si hay error, intentar leer body
                    let errorData = null;
                    try {
                        errorData = await response.json();
                    } catch {
                        errorData = { message: `HTTP ${response.status}` };
                    }
                    
                    return { 
                        success: false, 
                        error: errorData?.message || `Error ${response.status}`,
                        status: response.status 
                    };
                } catch (error) {
                    return { success: false, error: error.message, status: 0 };
                }
            }
        },

        // ========== PORTAL - INDICADORES ==========
        // En api.js → RemoteAPI.portal.indicators
        indicators: {
            async getTracking(id, year) {
                const params = new URLSearchParams({ year }).toString();
                try {
                    const response = await fetch(
                        `${CONFIG.REMOTE_BASE}/portal/indicators/${id}/tracking?${params}`,
                        {
                            headers: RemoteAPI.getHeaders()  // ← Token automático
                        }
                    );
                    
                    if (!response.ok) {
                        const text = await response.text();
                        return { 
                            success: false, 
                            error: `HTTP ${response.status}: ${text.substring(0, 100)}`,
                            status: response.status,
                            data: []
                        };
                    }
                    
                    const data = await response.json();
                    return { success: true, data, status: response.status };
                    
                } catch (error) {
                    return { success: false, error: error.message, status: 0, data: [] };
                }
            },

            async addTracking(id, trackingData) {
                try {
                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/indicators/${id}/tracking`, {
                        method: 'POST',
                        headers: RemoteAPI.getHeaders(),  // ← Incluye Content-Type: application/json + Bearer token
                        body: JSON.stringify(trackingData)
                    });
                    return { success: response.ok, data: await response.json().catch(() => ({})) };
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
                    // Asegurar que el campo se llame exactamente 'pdf' como espera el backend
                    formData.append('pdf', pdfFile);

                    const params = new URLSearchParams({
                        macroProcess,
                        process,
                        activityName
                    });

                    // Obtener token de TODAS las claves posibles (consistente con el resto de tu API)
                    const token = localStorage.getItem('token') 
                        || localStorage.getItem('unmsm_token') 
                        || localStorage.getItem('accessToken');

                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/flows?${params.toString()}`, {
                        method: 'POST',
                        // 🔥 CRÍTICO: NO incluir 'Content-Type' cuando usas FormData
                        // El navegador lo establece automáticamente con el boundary correcto
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                        },
                        body: formData
                    });

                    // Manejar respuesta
                    let data = null;
                    const contentType = response.headers.get('content-type') || '';
                    
                    if (contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        const text = await response.text();
                        data = { raw: text.substring(0, 500) };
                    }

                    if (!response.ok) {
                        return { 
                            success: false, 
                            error: data?.message || `HTTP ${response.status}: ${response.statusText}`,
                            status: response.status,
                            data 
                        };
                    }

                    return { 
                        success: true, 
                        data,           // { id, code }
                        status: response.status 
                    };

                } catch (error) {
                    return { 
                        success: false, 
                        error: error.message,
                        isNetworkError: true,
                        status: 0 
                    };
                }
            }
        },

        // ========== PORTAL - CARACTERIZACIONES ==========
        characterizations: {
            async upload(pdfFile, macroProcess, process) {
                try {
                    const formData = new FormData();
                    formData.append('pdf', pdfFile);  // ← campo debe llamarse 'pdf'

                    const params = new URLSearchParams({
                        macroProcess,
                        process
                    });

                    const token = localStorage.getItem('token') 
                        || localStorage.getItem('unmsm_token') 
                        || localStorage.getItem('accessToken');

                    const response = await fetch(`${CONFIG.REMOTE_BASE}/portal/characterizations?${params.toString()}`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': token ? `Bearer ${token}` : ''
                            // ❌ NO 'Content-Type' — el navegador lo pone automáticamente
                        },
                        body: formData
                    });

                    let data = null;
                    const contentType = response.headers.get('content-type') || '';
                    
                    if (contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        const text = await response.text();
                        data = { raw: text.substring(0, 500) };
                    }

                    // ✅ El backend devuelve 201 Created
                    if (!response.ok && response.status !== 201) {
                        return { 
                            success: false, 
                            error: data?.message || `HTTP ${response.status}`,
                            status: response.status,
                            data 
                        };
                    }

                    return { 
                        success: true, 
                        data,  // { id, code, message }
                        status: response.status 
                    };

                } catch (error) {
                    return { 
                        success: false, 
                        error: error.message,
                        status: 0 
                    };
                }
            }
        },

        // ========== PORTAL - RESPUESTAS A OBSERVACIONES ==========
        responses: {
            async toObservations(documentId, subject, observations, attachments = []) {
                // 🔥 FIX: Construir URL con query params correctamente
                const url = new URL(`${CONFIG.REMOTE_BASE}/portal/documents/${encodeURIComponent(documentId)}/respond`);
                
                // Parámetros obligatorios
                url.searchParams.append('subject', subject);
                url.searchParams.append('observations', observations);
                
                // 🔥 FIX: attachments es array[string] en query params
                // Solo agregar si hay valores reales (no vacíos, no 'string' de placeholder)
                const validAttachments = (Array.isArray(attachments) ? attachments : [attachments])
                    .filter(a => a && String(a).trim() !== '' && String(a).toLowerCase() !== 'string');
                
                validAttachments.forEach(file => {
                    url.searchParams.append('attachments', String(file).trim());
                });

                console.log('📤 POST', url.toString());

                try {
                    // 🔥 FIX: Usar apiFetch (con auto-refresh de token) en lugar de fetch directo
                    const response = await window.apiFetch(url.toString(), {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            // ❌ NO 'Content-Type' — body vacío, no necesita
                        },
                        // 🔥 CRÍTICO: Body vacío como en el curl de Swagger
                        body: null
                    });
                    
                    let data = null;
                    const contentType = response.headers.get('content-type') || '';
                    
                    if (contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        const text = await response.text();
                        data = { message: text || 'Respuesta enviada' };
                    }
                    
                    if (!response.ok) {
                        console.error('❌ respond error:', data);
                        return { 
                            success: false, 
                            error: data?.message || `HTTP ${response.status}`,
                            status: response.status,
                            data 
                        };
                    }
                    
                    return { 
                        success: true, 
                        data,  // { message: "Respuesta envida exitosamente" }
                        status: response.status 
                    };

                } catch (error) {
                    console.error('❌ respond exception:', error);
                    return { 
                        success: false, 
                        error: error.message,
                        status: 0 
                    };
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
                    
                    // 🔧 FIX: Si el status no es 2xx, marcar como fallo
                    if (!response.ok) {
                        const text = await response.text();
                        let errorData = null;
                        try { errorData = JSON.parse(text); } catch { errorData = { raw: text.substring(0, 200) }; }
                        return { 
                            success: false, 
                            error: errorData?.message || `HTTP ${response.status}`,
                            status: response.status,
                            data: null
                        };
                    }
                    
                    const data = await response.json();
                    return { success: true, data, status: response.status };
                    
                } catch (error) {
                    return { success: false, error: error.message, status: 0, data: null };
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
                const defaults = { page: 1, limit: 20 };
                
                // 🔥 FIX: Normalizar processType al formato que espera el backend
                const cleanFiltros = { ...filtros };
                if (cleanFiltros.processType) {
                    const pt = String(cleanFiltros.processType).toUpperCase().trim();
                    if (pt === 'STRATEGIC' || pt === 'ESTRATEGICO' || pt === 'ESTRATÉGICO') {
                        cleanFiltros.processType = 'ESTRATEGICO';
                    } else if (pt === 'MISSIONAL' || pt === 'MISIONAL' || pt === 'MISIÓN') {
                        cleanFiltros.processType = 'MISIONAL';
                    } else if (pt === 'SUPPORT' || pt === 'SOPORTE' || pt === 'DE APOYO' || pt === 'DE-APOYO') {
                        cleanFiltros.processType = 'SOPORTE';
                    }
                }
                
                // 🔥 FIX: Si facultyId está vacío, no enviarlo (evita 500)
                if (!cleanFiltros.facultyId || cleanFiltros.facultyId === '') {
                    delete cleanFiltros.facultyId;
                }
                
                const params = new URLSearchParams({ ...defaults, ...cleanFiltros }).toString();
                const url = `${CONFIG.REMOTE_BASE}/public/indicators?${params}`;
                
                console.log('📤 GET /public/indicators?', params);
                
                try {
                    const response = await fetch(url, {
                        headers: { 'Accept': 'application/json' }
                    });
                    
                    if (!response.ok) {
                        const text = await response.text();
                        let errorData = null;
                        try { errorData = JSON.parse(text); } catch { errorData = { raw: text.substring(0, 200) }; }
                        console.error('❌ /public/indicators error:', response.status, errorData);
                        return { 
                            success: false, 
                            data: [],
                            status: response.status,
                            error: errorData?.message || `HTTP ${response.status}: ${response.statusText}`
                        };
                    }
                    
                    const data = await response.json();
                    // El backend puede devolver { items: [...], pagination: {...} } o directamente [...]
                    const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
                    const pagination = data?.pagination || data?.meta || null;
                    
                    return { 
                        success: true, 
                        data: items,
                        status: response.status,
                        pagination
                    };
                } catch (error) {
                    console.error('❌ /public/indicators exception:', error);
                    return { success: false, data: [], status: 0, error: error.message };
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

                    const response = await RemoteAPI.fetchWithTimeout(
                        `${CONFIG.REMOTE_BASE}/public/indicators/${id}`, 
                        { headers }
                    );

                    let payload = null;
                    try { payload = await response.json(); } catch { payload = null; }

                    const error = response.ok ? null : (payload?.message || `HTTP ${response.status}`);
                    return { success: response.ok, data: payload, status: response.status, error };
                } catch (error) {
                    return { success: false, error: error.message, status: 0 };
                }
            },

            async export(indicatorId) {
                try {
                    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token');
                    const headers = { 'Accept': 'application/json' };
                    if (token) headers.Authorization = `Bearer ${token}`;

                    const response = await RemoteAPI.fetchWithTimeout(
                        `${CONFIG.REMOTE_BASE}/public/indicators/${indicatorId}/export`,
                        { method: 'GET', headers }
                    );

                    if (!response.ok) {
                        let errorMsg = `HTTP ${response.status}`;
                        try {
                            const errData = await response.json();
                            errorMsg = errData.message || errData.error || errorMsg;
                        } catch (e) {}
                        return { success: false, error: errorMsg, status: response.status };
                    }

                    const blob = await response.blob();
                    const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/["']/g, '') || `indicador-${indicatorId}.pdf`;
                    
                    return { success: true, data: blob, filename, status: response.status };
                } catch (error) {
                    console.error('Error exportando indicador:', error);
                    return { success: false, error: error.message, status: 0 };
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

// ✅ Leer modo guardado o usar el de CONFIG (NO forzar 'remote')
const savedMode = localStorage.getItem('api_mode');
if (savedMode === 'local' || savedMode === 'remote') {
    CONFIG.MODE = savedMode;
}

const API = CONFIG.MODE === 'local' ? LocalAPI : RemoteAPI;

if (CONFIG.MODE === 'local') {
    LocalAPI.init();
}

// Helpers para cambiar modo
API.CONFIG = CONFIG;
API.setMode = (mode) => {
    if (mode === 'local' || mode === 'remote') {
        // Guardar el modo anterior para saber qué limpiar
        const previousMode = CONFIG.MODE;
        
        CONFIG.MODE = mode;
        localStorage.setItem('api_mode', mode);
        
        console.log(`🔄 Cambiando modo: ${previousMode} → ${mode}`);
        
        // Opcional: limpiar datos del modo anterior para evitar basura
        if (previousMode !== mode) {
            const prefixToClean = previousMode === 'local' ? 'local_' : 'remote_';
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefixToClean)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`🧹 Limpiados ${keysToRemove.length} datos del modo ${previousMode}`);
        }
        
        location.reload();
    }
};
API.getMode = () => CONFIG.MODE;

window.API = API;
window.LocalAPI = LocalAPI;
window.RemoteAPI = RemoteAPI;
window.CONFIG = CONFIG;
console.log(`✅ API UNMSM cargada en modo: ${CONFIG.MODE.toUpperCase()}`);
console.log(`   Base URL: ${CONFIG.MODE === 'remote' ? CONFIG.REMOTE_BASE : 'LocalStorage'}`);

// ============================================
// FUNCIONES UTILITARIAS DIRECTAS
// ============================================

/**
 * Aprueba una solicitud de acceso directamente via API.
 * Más simple que usar API.admin.accessRequests.approve()
 * 
 * @param {string} idSolicitud - UUID de la solicitud
 * @param {string} token - Bearer token (opcional, se autodetecta si no se pasa)
 * @returns {Promise<Object>} - Respuesta del servidor
 */
async function aprobarSolicitud(idSolicitud, token) {
    const authToken = token || localStorage.getItem('token') || localStorage.getItem('unmsm_token');
    
    try {

        const response = await fetch(
            `${CONFIG.REMOTE_BASE}/admin/access-requests/${idSolicitud}/approve`,
            {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log("✅ Solicitud aprobada:", data);

        // ✅ Actualizar localStorage
        try {
            const requests = JSON.parse(localStorage.getItem('sigpro_access_requests') || '[]');
            const updated = requests.map(req => {
                if ((req.id || req.requestId || '') === idSolicitud) {
                    return { 
                        ...req, 
                        status: 'APPROVED', 
                        estado: 'APPROVED',
                        approvedAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                }
                return req;
            });
            localStorage.setItem('sigpro_access_requests', JSON.stringify(updated));
            
            // Sincronizar otras pestañas
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'sigpro_access_requests',
                newValue: JSON.stringify(updated)
            }));
        } catch (e) {
            console.warn('No se pudo actualizar localStorage:', e);
        }

        return { success: true, data };

    } catch (error) {
        console.error("❌ Error aprobando solicitud:", error);
        return { success: false, error: error.message };
    }
}

// Exponer globalmente
window.aprobarSolicitud = aprobarSolicitud;

// ============================================
// UTILIDAD: Guardar documento creado por el usuario
// ============================================

/**
 * Registra CUALQUIER documento creado en la bandeja unificada
 * que lee racio-inicio.js. Llámalo desde el onSubmit de cada ficha.
 * 
 * @param {Object} doc
 * @param {string} doc.id
 * @param {string} doc.tipo   'indicador' | 'flujograma' | 'caracterizacion' | 'reporte' | 'inventario'
 * @param {string} doc.estado 'pendiente' | 'en_proceso' | 'completado'
 * @param {string} doc.titulo
 * @param {string} [doc.facultad]
 * @param {string} [doc.codigo]
 */
function registrarEnBandejaRacio(doc) {
    if (!doc || !doc.id) {
        console.warn('registrarEnBandejaRacio: documento inválido', doc);
        return;
    }

    const payload = {
        id: doc.id,
        codigo: doc.codigo || doc.id,
        tipo: doc.tipo || 'documento',
        estado: doc.estado || 'pendiente',
        descripcion: doc.titulo || doc.descripcion || 'Sin título',
        nombre: doc.titulo || doc.descripcion || 'Sin título',
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' H',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generadoPor: doc.facultad || localStorage.getItem('unmsm_faculty_name') || 'Facultad',
        nombreFacultad: doc.facultad || localStorage.getItem('unmsm_faculty_name') || 'Facultad',
        facultadId: doc.facultyId || localStorage.getItem('unmsm_faculty_id') || '',
        progreso: doc.estado === 'completado' ? 100 : doc.estado === 'en_proceso' ? 50 : 5,
        origen: API.getMode ? API.getMode() : 'local'
    };

    // 1. Guardar en clave CON prefijo del modo (local_ / remote_)
    const claveModo = `${API.CONFIG?.MODE || 'local'}_sigpro_documentos_lista`;
    try {
        const listaModo = JSON.parse(localStorage.getItem(claveModo) || '[]');
        // Evitar duplicados por id
        const filtrada = listaModo.filter(d => d.id !== payload.id);
        filtrada.unshift(payload);
        localStorage.setItem(claveModo, JSON.stringify(filtrada));
    } catch (e) {}

    // 2. Guardar en clave SIN prefijo (compatibilidad directa con racio-inicio)
    try {
        const listaGlobal = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
        const filtrada = listaGlobal.filter(d => d.id !== payload.id);
        filtrada.unshift(payload);
        localStorage.setItem('sigpro_documentos_lista', JSON.stringify(filtrada));
    } catch (e) {}

    // 3. Si es modo remoto, guardar también en sigpro_reportes como fallback
    if (API.CONFIG?.MODE === 'remote') {
        try {
            const reportes = JSON.parse(localStorage.getItem('sigpro_reportes') || '[]');
            const filtrada = reportes.filter(r => r.id !== payload.id);
            filtrada.unshift({
                id: payload.id,
                code: payload.codigo,
                status: payload.estado.toUpperCase(),
                description: payload.descripcion,
                semester: '',
                responsibleName: payload.generadoPor,
                createdAt: payload.createdAt,
                facultyId: payload.facultadId
            });
            localStorage.setItem('sigpro_reportes', JSON.stringify(filtrada));
        } catch (e) {}
    }

    // 4. Disparar evento para que racio-inicio se actualice en tiempo real
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'sigpro_documentos_lista',
        newValue: JSON.stringify([payload])
    }));

    console.log('📥 Documento registrado en bandeja racio:', payload.codigo);
}

// Exponer globalmente
window.registrarEnBandejaRacio = registrarEnBandejaRacio;

// ============================================
// INTERCEPTOR FETCH CON AUTO-REFRESH (AGREGAR AL FINAL)
// ============================================

(function setupFetchInterceptor() {
    const originalFetch = window.fetch;
    
    window.apiFetch = async function(url, options = {}) {
        // Si estamos en modo remoto y el token está por expirar, renovarlo ANTES de la petición
        if (CONFIG.MODE === 'remote' && RemoteAPI.auth.isTokenExpiringSoon?.(5)) {
            console.log('🔄 Token expirando. Renovando...');
            await RemoteAPI.auth.refresh().catch(() => {});
        }
        return originalFetch.call(window, url, options);
    };
    
    window.fetch = window.apiFetch;
    console.log('✅ Interceptor fetch con auto-refresh activado');
})();


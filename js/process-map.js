// process-map.js - Lógica del Mapa de Procesos por Facultad

const ProcessMap = {
        // Panel de Soporte
        openSoporte(processId) {
            // Ocultar otros paneles
            document.getElementById('indicators-section')?.classList.add('hidden');
            document.getElementById('flowcharts-section')?.classList.add('hidden');
            document.getElementById('ficha-tecnica-section')?.classList.add('hidden');
            // Mostrar panel de soporte
            const soporteSection = document.getElementById('soporte-section');
            soporteSection?.classList.remove('hidden');
            // Scroll automático al panel de soporte
            setTimeout(() => {
                soporteSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            // Actualizar nombre del proceso
            const allProcesses = [
                ...(this.processes?.strategic || []),
                ...(this.processes?.missional || []),
                ...(this.processes?.support || [])
            ];
            const process = allProcesses.find(p => String(p.id) === String(processId));
            document.getElementById('current-soporte-process-name').textContent = process ? process.name : 'Proceso';
            // Limpiar buscador
            const searchInput = document.getElementById('search-soporte');
            if (searchInput) searchInput.value = '';
            // Renderizar mensaje vacío (igual que flujogramas)
            this.renderSoporteList([]);
        },

        renderSoporteList(items) {
        const soporteList = document.getElementById('soporte-list');
        if (!soporteList) return;
        if (!items || items.length === 0) {
            soporteList.innerHTML = `
                <div class="flex flex-col items-center justify-center w-full h-full">
                    <div class="rounded-full bg-slate-100 dark:bg-slate-900 w-24 h-24 flex items-center justify-center mb-6">
                        <span class="material-symbols-outlined text-4xl text-slate-400">support_agent</span>
                    </div>
                    <div class="text-base font-bold text-slate-500 dark:text-slate-400 mb-1">No hay recursos de soporte disponibles</div>
                    <div class="text-base text-slate-500 dark:text-slate-400 text-center">Para este proceso aún no se han registrado recursos de soporte.</div>
                </div>
            `;
        } else {
            // Aquí puedes renderizar la lista de recursos si existen
            soporteList.innerHTML = items.map(item => `<div>${item}</div>`).join('');
        }
        },

        filterSoporte(query) {
            // Aquí puedes implementar el filtrado real si tienes recursos
            // Por ahora solo muestra vacío
            this.renderSoporteList([]);
        },

        closeSoportePanel() {
            document.getElementById('soporte-section')?.classList.add('hidden');
        },
    facultyId: null,
    facultyData: null,
    processes: null,
    currentProcessId: null,
    currentIndicator: null,
    allIndicators: [],
    allFlowcharts: [],
    currentFlowchartProcessId: null,
    currentProcessType: null,
    currentProcessCode: null,
    currentFichaTecnicaPdfUrl: null,
    // Catálogo manual de PDFs reales.
    // Puedes mapear por código y ruta relativa, por ejemplo:
    // flowcharts: { 'PROC-001': 'docs/pdfs/flujogramas/PROC-001.pdf' }
    // fichaTecnica: { 'PE.01': 'docs/pdfs/fichas/PE.01.pdf' }
    // También funciona automático por convención de nombre:
    // docs/pdfs/flujogramas/{CODIGO}.pdf y docs/pdfs/fichas/{CODIGO}.pdf
    manualPdfCatalog: {
        flowcharts: {
            'PROC-001': 'docs/pdfs/flujogramas/FLUJOGRAMA DE GESTIÓN ESTRATÉGICA (2).pdf',
            'PE.01': 'docs/pdfs/flujogramas/FLUJOGRAMA DE GESTIÓN ESTRATÉGICA (2).pdf'
        },
        fichaTecnica: {
            'PE.01': 'docs/pdfs/fichas/Ficha técnica 01.pdf'
        }
    },

    storageKeys: {
        documentosLista: 'sigpro_documentos_lista',
        documentosDetalle: 'sigpro_documentos_detalle',
        indicadoresDetalle: 'sigpro_indicadores_detalle',
        historialPrefix: 'sigpro_historial_datos_'
    },

    async init() {
        await this.loadFacultyFromURL();
        this.initTheme();
    },

    // Cargar facultad desde URL o sessionStorage
    async loadFacultyFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.facultyId = urlParams.get('faculty') || '1';

        // Intentar recuperar de sessionStorage primero
        const stored = sessionStorage.getItem('selectedFaculty');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (String(parsed.id) === String(this.facultyId)) {
                this.facultyData = parsed;
            }
        }

        // Si no hay en storage, obtener de la API
        if (!this.facultyData) {
            await this.fetchFacultyData();
        } else {
            this.updateUIFacultyInfo();
            await this.fetchProcesses();
        }
    },

    async fetchFacultyData() {
        try {
            // Intento 1: si ya hay faculty en sessionStorage y coincide, úsalo
            const stored = sessionStorage.getItem('selectedFaculty');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && String(parsed.id) === String(this.facultyId)) {
                        this.facultyData = parsed;
                        this.updateUIFacultyInfo();
                        // Cargar procesos desde API
                        await this.fetchProcesses();
                        return;
                    }
                } catch (e) {
                    // ignore parse errors
                }
            }

            // Intento 2: llamar al endpoint público de mapa de procesos (devuelve facultyName y listados)
            const pm = await this.getProcessMap(this.facultyId);
            if (pm && pm.success && pm.data) {
                const d = pm.data;
                this.facultyData = { id: this.facultyId, name: d.facultyName || d.name || d.faculty || 'Facultad' };
                sessionStorage.setItem('selectedFaculty', JSON.stringify(this.facultyData));
                // Asignar procesos directamente si vienen categorizados
                if (d.strategic || d.missional || d.support) {
                    this.processes = {
                        strategic: d.strategic || [],
                        missional: d.missional || [],
                        support: d.support || []
                    };
                    
                    // Asignar tipo automáticamente según la categoría
                    this.processes.strategic.forEach(p => p.type = 'strategic');
                    this.processes.missional.forEach(p => p.type = 'missional');
                    this.processes.support.forEach(p => p.type = 'support');
                }
                this.updateUIFacultyInfo();
                // Si el endpoint público viene vacío, usar la fuente remota secundaria para mostrar el mapa
                if (this.processes && (this.processes.strategic?.length || this.processes.missional?.length || this.processes.support?.length)) {
                    this.renderProcesses();
                } else {
                    await this.fetchProcesses();
                }
                return;
            }

            // Fallback: intentar con API.faculties.getById (por compatibilidad con ids numéricos)
            const response = await window.API?.faculties?.getById(this.facultyId);
            if (response && response.success) {
                this.facultyData = response.data;
                sessionStorage.setItem('selectedFaculty', JSON.stringify(this.facultyData));
                this.updateUIFacultyInfo();
                await this.fetchProcesses();
                return;
            }

            this.showError('Facultad no encontrada');
        } catch (error) {
            console.error('Error cargando facultad:', error);
            this.showError('Error al cargar los datos de la facultad');
        }
    },

    async fetchProcesses() {
        try {
            const response = await this.getProcessMap(this.facultyId);
            const remoteProcessMap = response?.success ? response.data : null;

            const hasRealProcesses = remoteProcessMap && (
                (remoteProcessMap.strategic && remoteProcessMap.strategic.length > 0) ||
                (remoteProcessMap.missional && remoteProcessMap.missional.length > 0) ||
                (remoteProcessMap.support && remoteProcessMap.support.length > 0)
            );

            if (hasRealProcesses) {
                this.processes = {
                    strategic: remoteProcessMap.strategic || [],
                    missional: remoteProcessMap.missional || [],
                    support: remoteProcessMap.support || []
                };
                
                // Asignar tipo automáticamente según la categoría
                this.processes.strategic.forEach(p => p.type = 'strategic');
                this.processes.missional.forEach(p => p.type = 'missional');
                this.processes.support.forEach(p => p.type = 'support');
                
                this.renderProcesses();
                return;
            }

            // Fallback visual: generar procesos desde el wrapper remoto si el endpoint público viene vacío
            const fallback = await window.API?.processes?.getByFaculty?.(this.facultyId);
            if (fallback && fallback.success) {
                this.processes = fallback.data;
                
                // Asignar tipo automáticamente si el fallback también viene sin type
                if (this.processes.strategic) this.processes.strategic.forEach(p => p.type = p.type || 'strategic');
                if (this.processes.missional) this.processes.missional.forEach(p => p.type = p.type || 'missional');
                if (this.processes.support) this.processes.support.forEach(p => p.type = p.type || 'support');
                
                this.renderProcesses();
            }
        } catch (error) {
            console.error('Error cargando procesos:', error);
        }
    },

    async getProcessMap(facultyId) {
        try {
            const base = window.API?.CONFIG?.REMOTE_BASE || 'http://localhost:8080/v1';
            const headers = { 'Accept': 'application/json' };

            const response = await fetch(`${base}/public/process-map/${facultyId}`, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error('Error obteniendo mapa de procesos');
            }

            const data = await response.json();
            console.log('Mapa de procesos:', data);

            return { success: true, data };
        } catch (error) {
            console.error(error);
            return { success: false, error: error.message };
        }
    },

    async getTechnicalSheet(facultyId, processId) {
        try {
            const base = window.API?.CONFIG?.REMOTE_BASE || 'http://localhost:8080/v1';
            const headers = { 'Accept': 'application/json' };

            const res = await fetch(`${base}/public/process-map/${facultyId}/processes/${processId}/technical-sheet`, {
                method: 'GET',
                headers
            });

            if (!res.ok) {
                throw new Error(`Error obteniendo ficha técnica (${res.status})`);
            }

            const data = await res.json();
            console.log('Ficha técnica:', data);
            return { success: true, data };
        } catch (error) {
            console.error('Error getTechnicalSheet:', error);
            return { success: false, error: error.message };
        }
    },

    async getProcessIndicators(facultyId, processId) {
        try {
            const base = window.API?.CONFIG?.REMOTE_BASE || 'http://localhost:8080/v1';
            const res = await fetch(`${base}/public/process-map/${facultyId}/processes/${processId}/indicators`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`Error obteniendo indicadores (${res.status})`);
            }

            const data = await res.json();
            console.log('Indicadores:', data);
            return { success: true, data };
        } catch (err) {
            console.error('getProcessIndicators error', err);
            return { success: false, error: err.message, data: [] };
        }
    },

    async getProcessFlows(facultyId, processId) {
        try {
            const base = window.API?.CONFIG?.REMOTE_BASE || 'http://localhost:8080/v1';
            const response = await fetch(`${base}/public/process-map/${facultyId}/processes/${processId}/flows`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Token inválido o expirado');
                }
                if (response.status === 404) {
                    throw new Error('Flujogramas no encontrados');
                }
                throw new Error(`Error obteniendo flujogramas (${response.status})`);
            }

            const data = await response.json();
            console.log('Flujogramas:', data);
            return { success: true, data };
        } catch (error) {
            console.error('ERROR getProcessFlows:', error);
            return { success: false, error: error.message, data: [] };
        }
    },

    normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    },

    safeParseArray(raw) {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    safeParseObject(raw) {
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    },

    isApprovedStatus(value) {
        const status = this.normalizeText(value);
        return status === 'aprobado' || status === 'completado' || status.includes('aprob');
    },

    resolveIndicatorType(rawType, code = '', proceso = '') {
        const type = this.normalizeText(rawType);
        const normalizedCode = this.normalizeText(code);
        const normalizedProceso = this.normalizeText(proceso);
        
        // Primero: Intentar detectar del proceso (ej: "PE.01", "PM.01", "PS.01")
        if (normalizedProceso.startsWith('pe.') || normalizedProceso.startsWith('pe-') || normalizedProceso.includes(' pe.') || normalizedProceso.includes(' pe-')) {
            return 'strategic';
        }
        if (normalizedProceso.startsWith('pm.') || normalizedProceso.startsWith('pm-') || normalizedProceso.includes(' pm.') || normalizedProceso.includes(' pm-')) {
            return 'missional';
        }
        if (normalizedProceso.startsWith('ps.') || normalizedProceso.startsWith('ps-') || normalizedProceso.includes(' ps.') || normalizedProceso.includes(' ps-')) {
            return 'support';
        }
        
        // Segundo: Intentar del código
        if (normalizedCode.includes('pe-') || normalizedCode.includes('pe_')) return 'strategic';
        if (normalizedCode.includes('pm-') || normalizedCode.includes('pm_')) return 'missional';
        if (normalizedCode.includes('ps-') || normalizedCode.includes('ps_')) return 'support';
        
        // Tercero: Intentar del tipo
        if (type.includes('estrateg')) return 'strategic';
        if (type.includes('mision')) return 'missional';
        if (type.includes('soporte') || type.includes('apoyo') || type.includes('support')) return 'support';
        
        return 'support';
    },

    parseHistoryFromStorage(codigo, metaFallback = 0) {
        if (!codigo) return [];

        const historyKey = `${this.storageKeys.historialPrefix}${codigo}`;
        const historyRows = this.safeParseArray(localStorage.getItem(historyKey));

        return historyRows
            .filter((item) => item && item.fecha)
            .map((item) => {
                const resultadoRaw = Number(item?.resultado ?? item?.valor ?? 0);
                const valor = Number.isFinite(resultadoRaw)
                    ? (resultadoRaw <= 1 ? resultadoRaw * 100 : resultadoRaw)
                    : 0;
                const meta = Number(item?.metaPeriodo ?? item?.meta ?? metaFallback) || 0;

                return {
                    periodo: item?.periodo || item?.fecha,
                    N: Number(item?.N ?? item?.devengado ?? 0),
                    D: Number(item?.D ?? item?.pim ?? 0),
                    meta,
                    valor: Number(valor.toFixed(1)),
                    estado: item?.estado || (valor >= meta ? 'Óptimo' : valor >= 75 ? 'Estable' : 'Riesgo'),
                    observaciones: item?.observaciones || item?.analisis || item?.acciones || ''
                };
            })
            .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
    },

    processMatchesDescriptor(process, descriptorParts) {
        const parts = Array.isArray(descriptorParts) ? descriptorParts : [descriptorParts];
        const descriptorText = this.normalizeText(parts.filter(Boolean).join(' '));
        const codeText = this.normalizeText(process?.code);
        const nameText = this.normalizeText(process?.name);
        const idText = this.normalizeText(process?.id);

        return [codeText, nameText, idText].some((part) => part && descriptorText.includes(part));
    },

    loadIndicatorsFromStorage(processId, processType, processCode) {
        // Siempre leer del storage sin cache para reflejar eliminaciones recientes
        const documentosListaRaw = localStorage.getItem(this.storageKeys.documentosLista);
        const documentosDetRaw = localStorage.getItem(this.storageKeys.documentosDetalle);
        const indicadoresDetRaw = localStorage.getItem(this.storageKeys.indicadoresDetalle);
        
        const documentosLista = this.safeParseArray(documentosListaRaw);
        const documentosDetalle = this.safeParseObject(documentosDetRaw);
        const indicadoresDetalle = this.safeParseObject(indicadoresDetRaw);
        const allProcesses = [
            ...(this.processes?.strategic || []),
            ...(this.processes?.missional || []),
            ...(this.processes?.support || [])
        ];
        const currentProcess = allProcesses.find((p) => String(p.id) === String(processId)) ||
            allProcesses.find((p) => String(p.code).toUpperCase() === String(processCode).toUpperCase()) ||
            null;
        const facultyId = String(this.facultyId || '');
        const facultyName = this.normalizeText(this.facultyData?.name || this.facultyData?.nombre || this.facultyData?.nombreFacultad || '');
        const seen = new Set();

        return documentosLista
            .filter((doc) => {
                const tipo = this.normalizeText(doc?.tipo || doc?.asunto || '');
                if (tipo !== 'indicador') return false;
                if (!this.isApprovedStatus(doc?.estado)) return false;
                const docFacultyId = String(doc?.facultadId || doc?.facultyId || '');
                const docFacultyName = this.normalizeText(doc?.nombreFacultad || doc?.facultad || doc?.facultadNombre || doc?.generadoPor || '');
                if (facultyId && docFacultyId && docFacultyId !== facultyId) return false;
                if (facultyId && !docFacultyId && facultyName && docFacultyName && docFacultyName !== facultyName) return false;
                return true;
            })
            .map((doc) => {
                const detail = documentosDetalle[doc.codigo] || indicadoresDetalle[doc.codigo] || {};
                const payload = detail.fichaData || detail.indicadorData || detail;
                const descriptorParts = [
                    payload?.macroProcesoNombre,
                    payload?.macroProcesoTexto,
                    payload?.macroProceso,
                    payload?.proceso,
                    payload?.procesoNombre,
                    payload?.codigoProceso,
                    detail?.titulo
                ].filter(Boolean).join(' ');

                if (!this.processMatchesDescriptor(currentProcess, descriptorParts)) {
                    return null;
                }

                const code = String(doc.codigo || payload?.codigo || '').trim();
                if (!code || seen.has(code)) return null;
                seen.add(code);

                const history = this.parseHistoryFromStorage(code, Number(payload?.meta) || 0);
                
                // Resolver tipo: priorizar código/proceso sobre payload.tipoProceso
                const proceso = payload?.macroProcesoNombre || payload?.macroProceso || currentProcess?.name || doc?.descripcion || descriptorParts || '-';
                const resolvedType = this.resolveIndicatorType(payload?.tipoProceso || processType, code, proceso);

                return {
                    id: doc.id || code,
                    code,
                    type: resolvedType,
                    proceso: proceso,
                    version: payload?.version || detail?.version || '1.0',
                    responsable: payload?.unidadResponsable || payload?.responsable || '-',
                    frecuencia: payload?.frecuencia || '-',
                    variableN: payload?.variables?.split('\n')?.[0]?.replace(/^N\s*=\s*/i, '') || payload?.variableN || '-',
                    variableD: payload?.variables?.split('\n')?.[1]?.replace(/^D\s*=\s*/i, '') || payload?.variableD || '-',
                    fuente: payload?.fuente || '-',
                    meta: String(payload?.meta || '90').replace(/%$/, ''),
                    objetivo: payload?.objetivoProceso || payload?.objetivo || '-',
                    indicadorNombre: payload?.nombreIndicador || payload?.nombre || doc?.descripcion || '-',
                    description: payload?.objetivoProceso || payload?.descripcion || doc?.descripcion || '-',
                    seguimiento: history,
                    aprobado: true
                };
            })
            .filter(Boolean);
    },

    updateUIFacultyInfo() {
        const nameEl = document.getElementById('faculty-name');
        const btnIndicators = document.getElementById('btn-indicators');
        const btnFlows = document.getElementById('btn-flows');
        
        if (nameEl && this.facultyData) {
            nameEl.textContent = `Facultad de ${this.facultyData.name}`;
        }

        if (btnIndicators) {
            btnIndicators.onclick = (e) => {
                e.preventDefault();
                const firstProcess = this.getFirstProcessId();
                if (firstProcess) {
                    this.openIndicatorsPanel(firstProcess);
                } else {
                    this.showError('No hay procesos disponibles');
                }
            };
        }
        
        if (btnFlows) {
            btnFlows.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const firstProcess = this.getFirstProcessId();
                if (firstProcess) {
                    this.openFlowchartsPanel(firstProcess);
                } else {
                    this.showError('No hay procesos disponibles');
                }
            };
        }
    },

    getFirstProcessId() {
        if (!this.processes) return null;
        const all = [
            ...(this.processes.strategic || []),
            ...(this.processes.missional || []),
            ...(this.processes.support || [])
        ];
        return all.length > 0 ? all[0].id : null;
    },

    renderProcesses() {
        const container = document.getElementById('processes-container');
        if (!container || !this.processes) return;

        const { strategic = [], missional = [], support = [] } = this.processes;

        container.innerHTML = `
            ${this.renderStrategicProcesses(strategic)}
            ${this.renderMissionalProcesses(missional)}
            ${this.renderSupportProcesses(support)}
        `;

        this.attachEventListeners();
    },

    renderStrategicProcesses(processes) {
        if (!processes.length) return '';
    
        const cards = processes.map(p => `
            <div class="process-card standard" data-process-id="${p.id}">
                <div class="support-card-content">
                    <span class="process-code strategic">${p.code}</span>
                    <h4 class="process-title">${p.name}</h4>
                </div>
                <div class="process-actions">
                    <button class="btn-action-primary strategic-btn" onclick="ProcessMap.openFlows('${p.id}')">
                        <span class="material-symbols-outlined text-xs">account_tree</span>
                        Flujogramas
                    </button>
                    <button class="btn-action-secondary strategic-btn" onclick="ProcessMap.openSubprocesses('${p.id}')">
                        <span class="material-symbols-outlined text-xs">monitoring</span>
                        Indicadores
                    </button>
                    <button class="btn-action-secondary strategic-btn" onclick="ProcessMap.openSoporte && ProcessMap.openSoporte('${p.id}')">
                        <span class="material-symbols-outlined text-xs">support_agent</span>
                        Inventario
                    </button>
                    <button class="btn-action-third strategic-btn" onclick="ProcessMap.openFichatecnica('${p.id}')">
                        <span class="material-symbols-outlined text-xs">description</span>
                        Ficha técnica
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="process-container gradient-strategic">
                <div class="side-label">
                    <div class="icon-wrapper">
                        <span class="material-symbols-outlined text-white text-5xl">insights</span>
                    </div>
                    <span class="label-text">Procesos<br>Estratégicos</span>
                </div>
                <div class="process-grid-container">
                    ${cards}
                </div>
            </div>
        `;
    },

    renderMissionalProcesses(processes) {
        if (!processes.length) return '';
    
        const cards = processes.map(p => `
            <div class="process-card arrow-process" data-process-id="${p.id}">
                <div class="arrow-content">
                    <span class="arrow-code">${p.code}</span>
                    <span class="arrow-title">${p.name}</span>
                </div>
                <div class="process-actions">
                    <button class="btn-action-primary missional-btn" onclick="ProcessMap.openFlows('${p.id}')">
                        <span class="material-symbols-outlined text-xs">account_tree</span>
                        Flujogramas
                    </button>
                    <button class="btn-action-secondary missional-btn" onclick="ProcessMap.openSubprocesses('${p.id}')">
                        <span class="material-symbols-outlined text-xs">monitoring</span>
                        Indicadores
                    </button>
                    <button class="btn-action-secondary missional-btn" onclick="ProcessMap.openSoporte && ProcessMap.openSoporte('${p.id}')">
                        <span class="material-symbols-outlined text-xs">support_agent</span>
                        Inventario
                    </button>
                    <button class="btn-action-third missional-btn" onclick="ProcessMap.openFichatecnica('${p.id}')">
                        <span class="material-symbols-outlined text-xs">description</span>
                        Ficha técnica
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="process-container gradient-missional">
                <div class="side-label">
                    <div class="icon-wrapper">
                        <span class="material-symbols-outlined text-white text-5xl">school</span>
                    </div>
                    <span class="label-text">Procesos<br>Misionales</span>
                </div>
                <div class="process-grid-container missional">
                    ${cards}
                </div>
            </div>
        `;
    },

    renderSupportProcesses(processes) {
        if (!processes.length) return '';
        
        const firstRow = processes.slice(0, 5);
        const secondRow = processes.slice(5);
        
        const firstRowHtml = firstRow.map(p => this.createSupportCard(p)).join('');
        
        let secondRowHtml = '';
        if (secondRow.length > 0) {
            const secondRowCards = secondRow.map(p => this.createSupportCard(p)).join('');
            secondRowHtml = `
                <div class="support-row second-row">
                    ${secondRowCards}
                </div>
            `;
        }
        
        return `
            <div class="process-container gradient-support">
                <div class="side-label">
                    <div class="icon-wrapper">
                        <span class="material-symbols-outlined text-white text-5xl">support_agent</span>
                    </div>
                    <span class="label-text">Procesos<br>De Soporte</span>
                </div>
                <div class="process-grid-container support-container">
                    <div class="support-grid-wrapper">
                        <div class="support-row first-row">
                            ${firstRowHtml}
                        </div>
                        ${secondRowHtml}
                    </div>
                </div>
            </div>
        `;
    },

    createSupportCard(p) {
        return `
            <div class="process-card small" data-process-id="${p.id}">
                <div class="support-card-content">
                    <span class="process-code support">${p.code}</span>
                    <h4 class="process-title">${p.name}</h4>
                </div>
                <div class="process-actions">
                    <button class="btn-action-primary" onclick="ProcessMap.openFlows('${p.id}')">
                        <span class="material-symbols-outlined text-xs">account_tree</span>
                        Flujogramas
                    </button>
                    <button class="btn-action-secondary" onclick="ProcessMap.openSubprocesses('${p.id}')">
                        <span class="material-symbols-outlined text-xs">monitoring</span>
                        Indicadores
                    </button>
                    <button class="btn-action-secondary" onclick="ProcessMap.openSoporte && ProcessMap.openSoporte('${p.id}')">
                        <span class="material-symbols-outlined text-xs">support_agent</span>
                        Inventario
                    </button>
                    <button class="btn-action-third" onclick="ProcessMap.openFichatecnica('${p.id}')">
                        <span class="material-symbols-outlined text-xs">description</span>
                        Ficha técnica
                    </button>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        document.querySelectorAll('.process-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const processId = card.dataset.processId;
                    this.showProcessPreview(processId);
                }
            });
        });
    },

    // ============================================
    // MÉTODOS DE FLUJOGRAMAS
    // ============================================

    openFlows(processId) {
        console.log('Abriendo flujogramas para proceso:', processId);
        this.openFlowchartsPanel(processId);
    },

    async openFlowchartsPanel(processId) {
        console.log('Iniciando openFlowchartsPanel con ID:', processId);
        this.currentFlowchartProcessId = processId;
        
        const allProcesses = [
            ...(this.processes?.strategic || []),
            ...(this.processes?.missional || []),
            ...(this.processes?.support || [])
        ];
        
        const process = allProcesses.find(p => p.id === parseInt(processId) || p.id === processId);
        
        if (!process) {
            console.error('Proceso no encontrado:', processId);
            this.showError('Proceso no encontrado');
            return;
        }

        if (this.processes?.strategic?.some(p => p.id == processId)) {
            this.currentProcessType = 'strategic';
        } else if (this.processes?.missional?.some(p => p.id == processId)) {
            this.currentProcessType = 'missional';
        } else {
            this.currentProcessType = 'support';
        }

        const titleEl = document.getElementById('current-flowchart-process-name');
        if (titleEl) titleEl.textContent = process.name;
        this.currentProcessCode = process.code;
        
        const section = document.getElementById('flowcharts-section');
        if (section) {
            section.classList.remove('hidden');
            console.log('Panel de flujogramas mostrado');
            
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            console.error('No se encontró el elemento flowcharts-section');
        }
        
        await this.loadFlowcharts(processId);
    },

    async loadFlowcharts(processId) {
        const container = document.getElementById('flowcharts-list');
        if (!container) {
            console.error('No se encontró el contenedor flowcharts-list');
            return;
        }
        
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <span class="material-symbols-outlined text-3xl text-slate-400 animate-spin">refresh</span>
                </div>
                <p class="text-slate-500 font-medium">Cargando flujogramas...</p>
            </div>
        `;
        
        try {
            const allProcesses = [
                ...(this.processes?.strategic || []),
                ...(this.processes?.missional || []),
                ...(this.processes?.support || [])
            ];

            const selectedProcess = allProcesses.find(
                (p) => p.id === parseInt(processId) || p.id === processId
            );
            const selectedCode = String(selectedProcess?.code || this.currentProcessCode || '').toUpperCase();

            const remoteFlows = await this.getProcessFlows(this.facultyId, processId);
            const rawList = remoteFlows?.success
                ? (Array.isArray(remoteFlows.data)
                    ? remoteFlows.data
                    : (remoteFlows.data?.items || remoteFlows.data?.flows || remoteFlows.data?.data || []))
                : [];

            let scopedFlowcharts = rawList.map((flow, index) => {
                const code = String(flow.code || flow.codigo || selectedCode || `PROC-${String(index + 1).padStart(3, '0')}`).toUpperCase();
                const name = flow.name || flow.nombre || `Flujograma ${code}`;
                const description = flow.description || flow.descripcion || 'Flujograma del proceso';
                const baseNoV1 = (window.API?.CONFIG?.REMOTE_BASE || 'http://localhost:8080/v1').replace(/\/v1\/?$/i, '');
                const pdfCandidate = flow.pdfUrl || flow.url || flow.fileUrl || flow.documentUrl || null;
                const resolvedPdf = pdfCandidate && String(pdfCandidate).startsWith('/') ? `${baseNoV1}${pdfCandidate}` : pdfCandidate;

                return {
                    id: flow.id || flow.flowId || `${processId}-${index}`,
                    code,
                    name,
                    description,
                    icon: flow.icon || 'account_tree',
                    imageUrl: flow.imageUrl || flow.thumbnailUrl || flow.image || '',
                    pdfUrl: resolvedPdf,
                    lastUpdated: flow.lastUpdated || flow.updatedAt || flow.fechaActualizacion || ''
                };
            });

            // Fallback: si la API no devuelve flujogramas, intentar usar PDF local mapeado por código.
            if (scopedFlowcharts.length === 0 && selectedProcess) {
                const localPdf = this.resolveFlowchartPdfUrl({ code: selectedCode });
                if (localPdf) {
                    scopedFlowcharts = [{
                        id: `local-${processId}`,
                        code: selectedCode || 'PROC',
                        name: selectedProcess.name || `Flujograma ${selectedCode || 'PROC'}`,
                        description: 'Flujograma cargado desde documentos locales.',
                        icon: 'account_tree',
                        imageUrl: '',
                        pdfUrl: localPdf,
                        lastUpdated: ''
                    }];
                }
            }
            
            this.allFlowcharts = scopedFlowcharts;
            this.renderFlowchartsList(scopedFlowcharts);
            console.log('Flujogramas cargados:', scopedFlowcharts.length, 'para proceso:', selectedCode || 'sin código');
            
        } catch (error) {
            console.error('Error cargando flujogramas:', error);
            container.innerHTML = `
                <div class="text-center py-16">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                        <span class="material-symbols-outlined text-3xl text-red-500">error</span>
                    </div>
                    <p class="text-red-500 font-medium mb-2">Error al cargar los flujogramas</p>
                    <p class="text-slate-400 text-sm">${error.message || 'Intente nuevamente más tarde'}</p>
                    <button onclick="ProcessMap.loadFlowcharts(${processId})" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                        Reintentar
                    </button>
                </div>
            `;
        }
    },

    renderFlowchartsList(flowcharts) {
        const container = document.getElementById('flowcharts-list');
        if (!container) return;
        
        if (!flowcharts || flowcharts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16">
                    <div class="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                        <span class="material-symbols-outlined text-4xl text-slate-400">account_tree</span>
                    </div>
                    <p class="text-slate-500 font-medium text-lg">No hay flujogramas disponibles</p>
                    <p class="text-slate-400 text-sm mt-1">Para este proceso aún no se han registrado flujogramas.</p>
                </div>
            `;
            return;
        }
        
        const type = this.currentProcessType || 'strategic';
        
        container.innerHTML = `
            <div class="flowcharts-grid">
                ${flowcharts.map((fc, index) => `
                    <div class="flowchart-card-item ${type}" data-flowchart-id="${fc.id}" style="animation-delay: ${index * 0.08}s">
                        <div class="flowchart-card-header">
                            <div class="flowchart-icon-wrapper ${type}">
                                <span class="material-symbols-outlined text-3xl">${fc.icon || 'account_tree'}</span>
                            </div>
                            <div class="flowchart-info">
                                <h5>${fc.name}</h5>
                                <span class="flowchart-code ${type}">${fc.code}</span>
                            </div>
                        </div>
                        <p class="flowchart-description">${fc.description}</p>
                        <div class="flowchart-actions">
                            <button onclick="ProcessMap.viewFlowchart('${fc.id}')" class="flowchart-btn view">
                                <span class="material-symbols-outlined">visibility</span>
                                Visualizar
                            </button>
                            <button onclick="ProcessMap.downloadFlowchart('${fc.id}')" class="flowchart-btn download">
                                <span class="material-symbols-outlined">download</span>
                                Descargar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    filterFlowcharts(searchTerm) {
        if (!this.allFlowcharts) return;
        
        const term = searchTerm.toLowerCase().trim();
        const filtered = this.allFlowcharts.filter(fc => 
            fc.name.toLowerCase().includes(term) ||
            fc.code.toLowerCase().includes(term) ||
            fc.description.toLowerCase().includes(term)
        );
        
        this.renderFlowchartsList(filtered);
    },

    closeFlowchartsPanel() {
        const section = document.getElementById('flowcharts-section');
        if (section) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(-20px)';
            section.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                section.classList.add('hidden');
                section.style.opacity = '';
                section.style.transform = '';
                section.style.transition = '';
            }, 300);
        }
        
        const searchInput = document.getElementById('search-flowchart');
        if (searchInput) searchInput.value = '';
        
        this.currentFlowchartProcessId = null;
        this.allFlowcharts = [];
    },

    viewFlowchart(flowchartId) {
        const flowchart = this.allFlowcharts.find(fc => 
            fc.id === parseInt(flowchartId) || fc.id === flowchartId
        );
        
        if (!flowchart) {
            this.showError('Flujograma no encontrado');
            return;
        }

        this.createFlowchartViewerModal(flowchart);
    },

    createFlowchartViewerModal(flowchart) {
        this.closeFlowchartViewerModal();
        
        const type = this.currentProcessType || 'strategic';
        const realPdfUrl = this.resolveFlowchartPdfUrl(flowchart);
        const typeColors = {
            strategic: '#ea580c',
            missional: '#2563eb',
            support: '#059669'
        };
        
        const modalHTML = `
            <div id="flowchart-viewer-modal" onclick="if(event.target === this) ProcessMap.closeFlowchartViewerModal()">
                <div>
                    <div class="flowchart-viewer-header">
                        <h4>
                            <span class="material-symbols-outlined" style="color: ${typeColors[type]}">account_tree</span>
                            ${flowchart.name}
                        </h4>
                        <button onclick="ProcessMap.closeFlowchartViewerModal()" class="w-10 h-10 rounded-full bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 flex items-center justify-center transition-all">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="flowchart-viewer-content">
                        <div class="mb-4 flex items-center gap-4 text-sm text-slate-500">
                            <span class="flowchart-code ${type}" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                <span class="material-symbols-outlined text-sm">tag</span>
                                ${flowchart.code}
                            </span>
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                                <span class="material-symbols-outlined text-sm">schedule</span>
                                Actualizado: ${flowchart.lastUpdated || 'No disponible'}
                            </span>
                        </div>
                        <div class="flowchart-canvas" id="flowchart-canvas">
                            ${realPdfUrl ? `
                                <iframe
                                    src="${realPdfUrl}#toolbar=0&navpanes=0&scrollbar=1"
                                    style="width: 100%; height: 560px; border: none; border-radius: 0.75rem; background: white;"
                                    title="Vista previa de flujograma"
                                ></iframe>
                            ` : `
                                <div class="flowchart-placeholder">
                                    <span class="material-symbols-outlined">account_tree</span>
                                    <p class="text-lg font-medium mb-2">Vista previa del flujograma</p>
                                    <p class="text-sm mb-4">Aquí se mostrará el PDF cuando asignes una URL real</p>
                                    <div style="background: white; padding: 2rem; border-radius: 0.5rem; border: 2px solid #e2e8f0; max-width: 600px; margin: 0 auto;">
                                        <div style="text-align: left; font-family: monospace; font-size: 0.875rem; line-height: 1.6; color: #334155;">
                                            <div style="background: #dbeafe; border: 2px solid #3b82f6; border-radius: 0.5rem; padding: 1rem; text-align: center; margin-bottom: 1rem; color: #1e40af; font-weight: 600;">
                                                INICIO: ${flowchart.name}
                                            </div>
                                            <div style="display: flex; align-items: center; justify-content: center; margin: 0.5rem 0;">
                                                <span style="color: #94a3b8;">↓</span>
                                            </div>
                                            <div style="background: #f1f5f9; border: 2px solid #64748b; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                                                <strong>Paso 1:</strong> Verificación de requisitos iniciales
                                            </div>
                                            <div style="display: flex; align-items: center; justify-content: center; margin: 0.5rem 0;">
                                                <span style="color: #94a3b8;">↓</span>
                                            </div>
                                            <div style="background: #f1f5f9; border: 2px solid #64748b; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                                                <strong>Paso 2:</strong> Procesamiento de la solicitud
                                            </div>
                                            <div style="display: flex; align-items: center; justify-content: center; margin: 0.5rem 0;">
                                                <span style="color: #94a3b8;">↓</span>
                                            </div>
                                            <div style="background: #dcfce7; border: 2px solid #22c55e; border-radius: 0.5rem; padding: 1rem; text-align: center; color: #15803d; font-weight: 600;">
                                                FIN: Proceso completado
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                    <div class="flowchart-viewer-footer">
                        <button onclick="ProcessMap.closeFlowchartViewerModal()" class="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-all">
                            Cerrar
                        </button>
                        <button onclick="ProcessMap.downloadFlowchart('${flowchart.id}')" class="px-6 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">download</span>
                            Descargar PDF
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';
    },

    loadFlowchartImage(imageUrl) {
        const canvas = document.getElementById('flowchart-canvas');
        if (!canvas) return;
        
        canvas.innerHTML = `
            <div class="text-center">
                <span class="material-symbols-outlined text-4xl text-slate-400 animate-spin">refresh</span>
                <p class="text-slate-500 mt-2">Cargando diagrama...</p>
            </div>
        `;
        
        const img = new Image();
        img.onload = () => {
            canvas.innerHTML = '';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '500px';
            img.style.borderRadius = '0.5rem';
            img.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            canvas.appendChild(img);
        };
        img.onerror = () => {
            console.log('No se pudo cargar la imagen, mostrando vista previa por defecto');
        };
        img.src = imageUrl;
    },

    closeFlowchartViewerModal() {
        const modal = document.getElementById('flowchart-viewer-modal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                document.body.style.overflow = '';
            }, 200);
        }
    },

    downloadFlowchart(flowchartId) {
        const flowchart = this.allFlowcharts.find(fc => 
            fc.id === parseInt(flowchartId) || fc.id === flowchartId
        );
        
        if (!flowchart) {
            this.showError('Flujograma no encontrado');
            return;
        }

        this.showDownloadFlowchartModal(flowchart);
    },

    showDownloadFlowchartModal(flowchart) {
            const existingModal = document.getElementById('download-flowchart-modal');
            if (existingModal) existingModal.remove();
            
            const safeName = flowchart.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            const fileName = `Flujograma_${safeName}_${flowchart.code}.pdf`;
            
            const modalHTML = `
                <div id="download-flowchart-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4" 
                    style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); opacity: 0; animation: modalBackdropIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
                    <div class="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden" 
                        style="opacity: 0; transform: scale(0.85) translateY(30px); animation: modalContentIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
                        <div class="p-8">
                            <div class="flex flex-col items-center text-center">
                                <div class="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
                                    <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-5xl">picture_as_pdf</span>
                                </div>
                                
                                <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Descargar Flujograma</h3>
                                <p class="text-slate-500 dark:text-slate-400 font-medium mb-6 text-sm">
                                    ${flowchart.name}
                                </p>
                                
                                <div class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 mb-6">
                                    <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                                        <span class="material-symbols-outlined text-red-500 text-2xl">description</span>
                                    </div>
                                    <div class="text-left overflow-hidden flex-1">
                                        <p class="text-sm font-bold text-slate-900 dark:text-white truncate">${fileName}</p>
                                        <p class="text-xs font-semibold text-slate-400">PDF • Diagrama de flujo</p>
                                    </div>
                                </div>
                                
                                <div class="flex flex-col sm:flex-row gap-3 w-full">
                                    <button onclick="ProcessMap.closeDownloadFlowchartModal()" class="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all uppercase tracking-wider text-xs">
                                        Cancelar
                                    </button>
                                    <button onclick="ProcessMap.confirmDownloadFlowchart('${flowchart.id}', '${fileName}')" id="confirm-download-btn" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-500/25 uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                                        <span class="material-symbols-outlined text-sm" id="download-icon">download</span>
                                        <span id="download-text">Descargar PDF</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            document.body.style.overflow = 'hidden';
            
            console.log('Modal de descarga de flujograma mostrado:', flowchart.name);
        },

    closeDownloadFlowchartModal() {
        const modal = document.getElementById('download-flowchart-modal');
        if (modal) {
            // Animación de salida suave
            modal.style.animation = 'modalBackdropOut 0.4s cubic-bezier(0.4, 0, 0.6, 1) forwards';
            const content = modal.querySelector('div');
            if (content) {
                content.style.animation = 'none'; // Resetear animación anterior
                content.style.opacity = '1';
                content.style.transform = 'scale(1) translateY(0)';
                // Forzar reflow
                void content.offsetWidth;
                content.style.animation = 'modalContentOut 0.4s cubic-bezier(0.4, 0, 0.6, 1) forwards';
            }
            
            setTimeout(() => {
                modal.remove();
                if (!document.getElementById('flowchart-viewer-modal')) {
                    document.body.style.overflow = '';
                }
            }, 400);
        }
    },

    async confirmDownloadFlowchart(flowchartId, fileName) {
        const flowchart = this.allFlowcharts.find(fc => 
            fc.id === parseInt(flowchartId) || fc.id === flowchartId
        );
        
        if (!flowchart) {
            this.showError('Flujograma no encontrado');
            this.closeDownloadFlowchartModal();
            return;
        }

        const btnText = document.getElementById('download-text');
        const btnIcon = document.getElementById('download-icon');
        const confirmBtn = document.getElementById('confirm-download-btn');
        
        btnText.textContent = 'Generando PDF...';
        btnIcon.textContent = 'sync';
        btnIcon.classList.add('animate-spin');
        confirmBtn.disabled = true;
        
        try {
            const realPdfUrl = this.resolveFlowchartPdfUrl(flowchart);
            if (realPdfUrl) {
                btnText.textContent = 'Descargando PDF...';
                await this.downloadPdfFromUrl(realPdfUrl, fileName);
            } else {
                await this.generateAndDownloadPDF(flowchart, fileName);
            }
            
            btnText.textContent = '¡Descargado!';
            btnIcon.textContent = 'check';
            btnIcon.classList.remove('animate-spin');
            
            setTimeout(() => {
                this.closeDownloadFlowchartModal();
                this.showToast('Flujograma descargado exitosamente', 'success');
            }, 1500);
            
        } catch (error) {
            console.error('Error en descarga:', error);
            btnText.textContent = 'Error';
            btnIcon.textContent = 'error';
            btnIcon.classList.remove('animate-spin');
            
            setTimeout(() => {
                this.showError('Error al generar el PDF: ' + error.message);
                this.closeDownloadFlowchartModal();
            }, 1500);
        }
    },

    async generateAndDownloadPDF(flowchart, fileName) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) {
                    const content = `
                        FLUJOGRAMA - ${flowchart.name}
                        Código: ${flowchart.code}
                        Fecha: ${new Date().toLocaleDateString()}
                        
                        ${flowchart.description}
                        
                        [Aquí iría el contenido del diagrama de flujo]
                    `;
                    
                    const blob = new Blob([content], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    
                    resolve();
                } else {
                    reject(new Error('Error de conexión con el servidor'));
                }
            }, 2000);
        });
    },

    // ============================================
    // MÉTODOS DE INDICADORES (COMPLETOS)
    // ============================================

    openSubprocesses(processId) {
        this.openIndicatorsPanel(processId);
    },

    async openIndicatorsPanel(processId) {
        console.log('Abriendo panel de indicadores para proceso:', processId);
        this.currentProcessId = processId;
        
        const allProcesses = [
            ...(this.processes?.strategic || []),
            ...(this.processes?.missional || []),
            ...(this.processes?.support || [])
        ];
        
        const process = allProcesses.find(p => p.id === parseInt(processId) || p.id === processId);
        
        if (!process) {
            console.error('Proceso no encontrado:', processId);
            this.showError('Proceso no encontrado');
            return;
        }

        const titleEl = document.getElementById('current-process-name');
        if (titleEl) titleEl.textContent = process.name;
        
        this.currentProcessType = process.type;
        this.currentProcessCode = process.code;
        
        const section = document.getElementById('indicators-section');
        if (section) {
            section.classList.remove('hidden');
            console.log('Panel de indicadores mostrado');
            
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            console.error('No se encontró el elemento indicators-section');
        }
        
        await this.loadIndicators(processId, process.type, process.code);
    },

    async loadIndicators(processId, processType = this.currentProcessType, processCode = this.currentProcessCode) {
        const container = document.getElementById('indicators-list');
        if (!container) {
            console.error('No se encontró el contenedor indicators-list');
            return;
        }
        
        container.innerHTML = `
            <div class="text-center py-12">
                <span class="material-symbols-outlined text-4xl text-slate-300 animate-spin">refresh</span>
                <p class="text-slate-500 mt-2">Cargando indicadores...</p>
            </div>
        `;
        
        try {
            const indicatorsToRender = this.loadIndicatorsFromStorage(processId, processType, processCode);

            this.allIndicators = indicatorsToRender;
            this.renderIndicatorsList(indicatorsToRender);
            console.log('Indicadores cargados:', indicatorsToRender.length, 'tipo:', processType, 'codigo:', processCode);
            
        } catch (error) {
            console.error('Error cargando indicadores:', error);
            container.innerHTML = `
                <div class="text-center py-12 text-red-500">
                    <span class="material-symbols-outlined text-4xl mb-2">error</span>
                    <p>Error al cargar los indicadores.</p>
                </div>
            `;
        }
    },

    renderIndicatorsList(indicators) {
        const container = document.getElementById('indicators-list');
        if (!container) return;
        
        if (!indicators || indicators.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">analytics</span>
                    <p>No hay indicadores disponibles para este proceso.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = indicators.map(ind => `
            <div class="indicator-item flex items-center justify-between p-5 mb-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" data-indicator-id="${ind.id}">
                <div class="flex-1 pr-6">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="inline-flex items-center px-3 py-1 rounded-full bg-slate-900 dark:bg-slate-600 text-white text-xs font-bold tracking-wider">
                            ${ind.code}
                        </span>
                    </div>
                    <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-1">${ind.indicadorNombre || ind.name}</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">${ind.description}</p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="ProcessMap.viewIndicator('${ind.id}')" class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl font-semibold text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all">
                        <span class="material-symbols-outlined text-sm">visibility</span>
                        Visualizar
                    </button>
                    <button onclick="ProcessMap.downloadIndicator('${ind.id}')" class="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-600 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-500 transition-all">
                        <span class="material-symbols-outlined text-sm">download</span>
                        Descargar
                    </button>
                </div>
            </div>
        `).join('');
    },

    filterIndicators(searchTerm) {
        if (!this.allIndicators) return;
        
        const filtered = this.allIndicators.filter(ind => 
            (ind.indicadorNombre || ind.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            ind.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ind.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderIndicatorsList(filtered);
    },

    closeIndicatorsPanel() {
        const section = document.getElementById('indicators-section');
        if (section) {
            section.classList.add('hidden');
            section.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        this.currentProcessId = null;
        this.currentProcessType = null;
        this.currentProcessCode = null;
        this.allIndicators = [];
    },

    viewIndicator(indicatorId) {
        console.log('Visualizando indicador:', indicatorId);
        
        const indicator = this.allIndicators.find(ind => 
            ind.id === parseInt(indicatorId) || ind.id === indicatorId
        );
        
        if (!indicator) {
            console.error('Indicador no encontrado:', indicatorId);
            this.showError('Indicador no encontrado');
            return;
        }

        this.currentIndicator = indicator;
        
        const container = document.getElementById('indicators-list');
        if (!container) {
            console.error('No se encontró el contenedor indicators-list');
            return;
        }

        container.classList.add('indicators-list-exit');
        
        setTimeout(() => {
            this.renderFichaTecnica(indicator);
        }, 400);
    },

    renderFichaTecnica(ind) {
        const container = document.getElementById('indicators-list');
        if (!container) {
            console.error('No se encontró el contenedor indicators-list en renderFichaTecnica');
            return;
        }

        const tipoProceso = ind.type === 'strategic' ? 'Estratégico' : 
                           ind.type === 'missional' ? 'Misional' : 'Soporte';

        const datosGrafico = Array.isArray(ind.seguimiento) ? ind.seguimiento : [];

        container.classList.remove('indicators-list-exit');
        
        const html = `
            <!-- Botón volver con animación -->
            <div class="mb-6 btn-volver-enter">
                <button onclick="ProcessMap.backToIndicatorsList()" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-all">
                    <span class="material-symbols-outlined text-sm">arrow_back</span>
                    Volver a la lista
                </button>
            </div>

            <div class="ficha-tecnica-enter space-y-0">
                <!-- 1. IDENTIFICACIÓN DEL PROCESO -->
                <div class="ficha-section bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-b-0 rounded-t-xl">
                    <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">1. Identificación del Proceso</h3>
                </div>
                <div class="ficha-section p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                            <tbody>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-1/4">Proceso:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${ind.proceso || 'Gestión de la Calidad y Mejora Continua'}</td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Código:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono font-bold">${ind.code}</td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Versión:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono font-bold">${ind.version || '1.0'}</td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Responsable:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${ind.responsable || 'Director de Calidad'}</td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tipo de proceso:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 bg-white dark:bg-slate-900">
                                        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${this.getTipoBadgeClass(ind.type || 'strategic')}">
                                            ${tipoProceso}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 2. OBJETIVO -->
                <div class="ficha-section bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-y-0">
                    <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">2. Objetivo</h3>
                </div>
                <div class="ficha-section p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 border-t-0">
                    <p class="text-slate-700 dark:text-slate-300 italic leading-relaxed border-l-4 border-slate-400 dark:border-slate-500 pl-4">
                        "${ind.objetivo || ind.description || 'Evaluar la eficiencia terminal del programa académico, identificando cuellos de botella en la progresión estudiantil y asegurando el cumplimiento de las metas de graduación institucional.'}"
                    </p>
                </div>

                <!-- 3. INDICADOR -->
                <div class="ficha-section bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-y-0">
                    <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">3. Indicador</h3>
                </div>
                <div class="ficha-section p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                            <tbody>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300 w-1/4">Nombre:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-medium">
                                        ${ind.indicadorNombre || ind.name}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Frecuencia:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                        ${ind.frecuencia || 'Anual'}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Variables:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                        <div class="space-y-1">
                                            <div><strong class="text-slate-600 dark:text-slate-400">N:</strong> ${ind.variableN || 'N° Graduados en tiempo'}</div>
                                            <div><strong class="text-slate-600 dark:text-slate-400">D:</strong> ${ind.variableD || 'Total ingresantes cohorte'}</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Fuente:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-4 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                        ${ind.fuente || 'Sistema de Gestión Académica'}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">Fórmula:</td>
                                    <td class="border border-slate-300 dark:border-slate-600 px-4 py-8 text-center bg-white dark:bg-slate-900">
                                        <div class="formula-container inline-block text-lg">
                                            <div class="flex items-center gap-4">
                                                <span class="font-bold italic text-slate-800 dark:text-slate-200">I<sub>${ind.code}</sub> =</span>
                                                <div class="flex flex-col items-center">
                                                    <span class="border-b-2 border-slate-400 dark:border-slate-600 pb-1 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">${ind.variableN || 'N° Graduados en tiempo'}</span>
                                                    <span class="pt-1 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">${ind.variableD || 'Total ingresantes cohorte'}</span>
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
                                            <span class="text-2xl font-bold text-slate-800 dark:text-slate-200">${ind.meta || '90'}%</span>
                                            <div class="flex gap-2 flex-wrap">
                                                <span class="estado-badge px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">&lt;75 Crítico</span>
                                                <span class="estado-badge px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">75≤U&lt;90 Riesgo</span>
                                                <span class="estado-badge px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">≥90 Óptimo</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 4. SEGUIMIENTO -->
                <div class="ficha-section bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-y-0">
                    <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">4. Seguimiento</h3>
                </div>
                <div class="ficha-section p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0">
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
                                ${datosGrafico.length ? datosGrafico.map(seg => `
                                    <tr>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${seg.periodo}</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">${seg.N}</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">${seg.D}</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">${seg.meta}</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${seg.valor}</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-center bg-white dark:bg-slate-900">
                                            <span class="estado-badge px-2 py-1 rounded-full text-xs font-medium ${this.getEstadoClass(seg.estado)}">
                                                ${seg.estado}
                                            </span>
                                        </td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-600 dark:text-slate-400 text-xs bg-white dark:bg-slate-900">${seg.observaciones || '-'}</td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="7" class="border border-slate-300 dark:border-slate-600 px-4 py-8 text-center text-slate-400 bg-white dark:bg-slate-900">
                                            Sin datos de seguimiento registrados
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 5. TENDENCIA DEL INDICADOR (GRÁFICO) -->
                <div class="ficha-section bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-y-0">
                    <h3 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">5. Tendencia del Indicador</h3>
                </div>
                <div class="ficha-section p-6 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0 rounded-b-xl">
                    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600 p-6">
                        <div class="relative w-full h-64" id="tendencia-chart">
                            <svg viewBox="0 0 800 250" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                <rect x="60" y="20" width="720" height="180" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="4"/>
                                
                                <line x1="60" y1="50" x2="780" y2="50" 
                                      stroke="#3b82f6" stroke-width="2" stroke-dasharray="8,4" opacity="0.8"/>
                                <text x="760" y="45" text-anchor="end" fill="#3b82f6" font-size="12" font-weight="600">
                                    Meta: ${ind.meta || 90}
                                </text>
                                
                                <line x1="60" y1="20" x2="60" y2="200" stroke="#64748b" stroke-width="1"/>
                                <line x1="60" y1="200" x2="780" y2="200" stroke="#64748b" stroke-width="1"/>
                                
                                <text x="50" y="55" text-anchor="end" fill="#64748b" font-size="11">${ind.meta || 90}</text>
                                <text x="50" y="130" text-anchor="end" fill="#64748b" font-size="11">${Math.round((ind.meta || 90) * 0.8)}</text>
                                <text x="50" y="195" text-anchor="end" fill="#64748b" font-size="11">0</text>
                                
                                ${datosGrafico.length ? this.generarLineaTendencia(datosGrafico, ind.meta || 90) : ''}
                                
                                ${datosGrafico.length ? this.generarPuntosDatos(datosGrafico, ind.meta || 90) : ''}
                                
                                ${datosGrafico.length ? datosGrafico.map((d, i) => {
                                    const x = 60 + (720 / (datosGrafico.length - 1 || 1)) * i;
                                    return `<text x="${x}" y="220" text-anchor="middle" fill="#64748b" font-size="11">${d.periodo}</text>`;
                                }).join('') : `<text x="420" y="120" text-anchor="middle" fill="#94a3b8" font-size="13">Sin datos de seguimiento registrados</text>`}
                            </svg>
                        </div>
                        
                        <div class="flex justify-center gap-8 mt-4">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span class="text-sm text-slate-600 dark:text-slate-400 font-medium">Meta</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-red-500"></span>
                                <span class="text-sm text-slate-600 dark:text-slate-400 font-medium">Valor del Indicador</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        console.log('Ficha técnica renderizada con gráfico');

        setTimeout(() => {
            const section = document.getElementById('indicators-section');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    },

    generarLineaTendencia(datos, meta) {
        if (datos.length < 2) return '';
        
        const width = 720;
        const height = 180;
        const paddingY = 20;
        const chartHeight = height - paddingY * 2;
        const maxVal = meta * 1.1;
        
        const points = datos.map((d, i) => {
            const x = 60 + (width / (datos.length - 1)) * i;
            const val = parseFloat(d.valor);
            const y = 20 + chartHeight - (val / maxVal) * chartHeight;
            return `${x},${y}`;
        }).join(' ');
        
        return `<polyline points="${points}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    },

    generarPuntosDatos(datos, meta) {
        const width = 720;
        const height = 180;
        const paddingY = 20;
        const chartHeight = height - paddingY * 2;
        const maxVal = meta * 1.1;
        
        return datos.map((d, i) => {
            const x = 60 + (width / (datos.length - 1)) * i;
            const val = parseFloat(d.valor);
            const y = 20 + chartHeight - (val / maxVal) * chartHeight;
            
            return `
                <circle cx="${x}" cy="${y}" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                <text x="${x}" y="${y - 12}" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="600">${val}</text>
            `;
        }).join('');
    },

    backToIndicatorsList() {
        const container = document.getElementById('indicators-list');
        if (!container) return;
        
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        container.style.transition = 'all 0.3s ease';

        setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'none';
            if (this.allIndicators && this.allIndicators.length > 0) {
                this.renderIndicatorsList(this.allIndicators);
            } else {
                this.closeIndicatorsPanel();
            }
        }, 300);
    },

    getTipoBadgeClass(type) {
        const classes = {
            strategic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
            missional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            support: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        };
        return classes[type] || classes.strategic;
    },

    getEstadoClass(estado) {
        const classes = {
            'Óptimo': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            'Cumple': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            'Riesgo': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            'Crítico': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
        };
        return classes[estado] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    },

    downloadIndicator(indicatorId) {
        const indicator = this.allIndicators.find(ind => 
            ind.id === parseInt(indicatorId) || ind.id === indicatorId
        );
        
        if (!indicator) {
            this.showError('Indicador no encontrado');
            return;
        }
        
        this.currentDownloadIndicator = indicator;
        
        const indicatorTitle = indicator.indicadorNombre || indicator.name || `Indicador_${indicator.code || indicatorId}`;
        const safeName = indicatorTitle.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `Ficha_Tecnica_${safeName}_${indicator.code || indicatorId}.pdf`;
        
        this.showDownloadModal(indicator, fileName);
    },

    showDownloadModal(indicator, fileName) {
        const existingModal = document.getElementById('download-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const fileSize = "PDF • Generado desde servidor";
        
        const modalHTML = `
            <div id="download-modal" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden transform animate-in zoom-in duration-300">
                    <div class="p-10">
                        <div class="flex flex-col items-center text-center">
                            <div class="w-24 h-24 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mb-6">
                                <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-6xl">picture_as_pdf</span>
                            </div>
                            
                            <h3 class="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Descargar Indicador</h3>
                            <p class="text-slate-500 dark:text-slate-400 font-medium mb-8">Confirma la descarga de la ficha técnica oficial del indicador seleccionado.</p>
                            
                            <div class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 mb-10">
                                <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                                    <span class="material-symbols-outlined text-red-500 text-2xl">description</span>
                                </div>
                                <div class="text-left overflow-hidden">
                                    <p class="text-sm font-bold text-slate-900 dark:text-white truncate" id="modal-filename">${fileName}</p>
                                    <p class="text-xs font-semibold text-slate-400" id="modal-filesize">${fileSize}</p>
                                </div>
                            </div>
                            
                            <div class="flex flex-col sm:flex-row gap-4 w-full">
                                <button onclick="ProcessMap.closeDownloadModal()" class="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black py-4 px-6 rounded-2xl transition-all uppercase tracking-widest text-xs">
                                    Cancelar
                                </button>
                                <button onclick="ProcessMap.confirmDownload('${indicator.id}')" id="confirm-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/25 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-sm" id="download-icon">download</span>
                                    <span id="download-text">Confirmar Descarga</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.classList.add('modal-open');
        
        this.currentDownloadIndicator = indicator;
        this.currentFileName = fileName;
    },

    closeDownloadModal() {
        const modal = document.getElementById('download-modal');
        if (modal) {
            modal.classList.add('animate-out', 'fade-out');
            setTimeout(() => {
                modal.remove();
                document.body.classList.remove('modal-open');
            }, 200);
        }
        this.currentDownloadIndicator = null;
        this.currentFileName = null;
    },

    async confirmDownload(indicatorId) {
        const indicator = this.currentDownloadIndicator;
        const fileName = this.currentFileName;
        
        if (!indicator) {
            this.showError('No hay datos del indicador disponibles');
            return;
        }
        
        const btnText = document.getElementById('download-text');
        const btnIcon = document.getElementById('download-icon');
        const confirmBtn = document.getElementById('confirm-btn');
        
        btnText.textContent = 'Descargando...';
        btnIcon.textContent = 'sync';
        btnIcon.classList.add('animate-spin');
        confirmBtn.disabled = true;
        
        try {
            await this.downloadIndicatorFichaAsPDF(indicator, fileName);
            
            btnText.textContent = '¡Descargado!';
            btnIcon.textContent = 'check';
            btnIcon.classList.remove('animate-spin');
            
            setTimeout(() => this.closeDownloadModal(), 1500);
            
        } catch (error) {
            console.error('Error en descarga:', error);
            btnText.textContent = 'Error';
            btnIcon.textContent = 'error';
            btnIcon.classList.remove('animate-spin');
            
            setTimeout(() => {
                this.showError('Error al descargar: ' + error.message);
                this.closeDownloadModal();
            }, 1500);
        }
    },

    async downloadIndicatorFichaAsPDF(indicator, fileName) {
        let fichaNode = document.querySelector('#indicators-list .ficha-tecnica-enter') || document.querySelector('.ficha-tecnica-enter');

        // Si la ficha no esta abierta, la renderizamos con el mismo indicador para exportar exactamente esa vista.
        if (!fichaNode) {
            this.renderFichaTecnica(indicator);
            await new Promise((resolve) => setTimeout(resolve, 120));
            await new Promise((resolve) => requestAnimationFrame(resolve));
            await new Promise((resolve) => requestAnimationFrame(resolve));
            fichaNode = document.querySelector('#indicators-list .ficha-tecnica-enter') || document.querySelector('.ficha-tecnica-enter');
        }

        if (!fichaNode) {
            throw new Error('No se pudo generar la visualización de la ficha para descargar el PDF.');
        }

        if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector('script[data-lib="html2canvas-runtime"]');
                if (existing) {
                    existing.addEventListener('load', resolve, { once: true });
                    existing.addEventListener('error', () => reject(new Error('No se pudo cargar html2canvas.')), { once: true });
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.async = true;
                script.defer = true;
                script.dataset.lib = 'html2canvas-runtime';
                script.onload = resolve;
                script.onerror = () => reject(new Error('No se pudo cargar html2canvas.'));
                document.head.appendChild(script);
            });
        }

        if (!(window.jspdf && window.jspdf.jsPDF)) {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector('script[data-lib="jspdf-runtime"]');
                if (existing) {
                    existing.addEventListener('load', resolve, { once: true });
                    existing.addEventListener('error', () => reject(new Error('No se pudo cargar jsPDF.')), { once: true });
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.async = true;
                script.defer = true;
                script.dataset.lib = 'jspdf-runtime';
                script.onload = resolve;
                script.onerror = () => reject(new Error('No se pudo cargar jsPDF.'));
                document.head.appendChild(script);
            });
        }

        const html2canvasLib = window.html2canvas;
        const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;

        if (!html2canvasLib || !jsPDFCtor) {
            throw new Error('No se encontro el generador de PDF. Verifica tu conexion e intenta nuevamente.');
        }

        const downloadModal = document.getElementById('download-modal');
        const originalModalDisplay = downloadModal ? downloadModal.style.display : '';
        let captureHost = null;

        // Desactiva animaciones solo durante la captura para evitar estados vacios.
        const exportStyle = document.createElement('style');
        exportStyle.id = 'indicator-pdf-export-style';
        exportStyle.textContent = `
            .ficha-tecnica-enter,
            .ficha-tecnica-enter *,
            .ficha-section,
            .ficha-section * {
                animation: none !important;
                transition: none !important;
                opacity: 1 !important;
                transform: none !important;
                filter: none !important;
            }
        `;
        document.head.appendChild(exportStyle);

        try {
            if (downloadModal) {
                downloadModal.style.display = 'none';
            }

            const captureNode = fichaNode.cloneNode(true);
            captureNode.classList.remove('ficha-tecnica-enter');
            captureNode.querySelectorAll('button').forEach((el) => el.remove());
            captureNode.querySelectorAll('.overflow-x-auto').forEach((el) => {
                el.style.overflow = 'visible';
            });

            const visualWidth = Math.max(760, Math.ceil(fichaNode.getBoundingClientRect().width || fichaNode.scrollWidth || 760));
            captureNode.style.width = `${visualWidth}px`;
            captureNode.style.maxWidth = 'none';
            captureNode.style.position = 'relative';

            captureHost = document.createElement('div');
            captureHost.style.position = 'absolute';
            captureHost.style.left = '0';
            captureHost.style.top = '0';
            captureHost.style.zIndex = '-1';
            captureHost.style.background = '#ffffff';
            captureHost.style.padding = '16px';
            captureHost.style.overflow = 'visible';
            captureHost.style.pointerEvents = 'none';
            captureHost.style.width = `${visualWidth + 32}px`;
            captureHost.appendChild(captureNode);
            document.body.appendChild(captureHost);

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            await new Promise((resolve) => requestAnimationFrame(resolve));
            await new Promise((resolve) => requestAnimationFrame(resolve));

            // If there is an SVG inside the cloned ficha, rasterize it and
            // overlay a PNG image at the same position so html2canvas
            // reliably captures vector elements like polylines.
            try {
                const svg = captureNode.querySelector && captureNode.querySelector('svg');
                if (svg && svg instanceof SVGElement) {
                    const nodeRect = captureNode.getBoundingClientRect();
                    const svgRect = svg.getBoundingClientRect();
                    const left = svgRect.left - nodeRect.left;
                    const top = svgRect.top - nodeRect.top;
                    const width = Math.ceil(svgRect.width) || svg.clientWidth || 800;
                    const height = Math.ceil(svgRect.height) || svg.clientHeight || 250;

                    const svgClone = svg.cloneNode(true);
                    const wrapper = document.createElement('div');
                    wrapper.appendChild(svgClone);
                    const serialized = new XMLSerializer().serializeToString(svgClone);
                    const svgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized);

                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            try {
                                const tmp = document.createElement('canvas');
                                tmp.width = Math.max(1, Math.round(width * 2));
                                tmp.height = Math.max(1, Math.round(height * 2));
                                const ctx = tmp.getContext('2d');
                                ctx.clearRect(0, 0, tmp.width, tmp.height);
                                ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
                                const png = tmp.toDataURL('image/png');

                                const imgEl = document.createElement('img');
                                imgEl.src = png;
                                imgEl.style.position = 'absolute';
                                imgEl.style.left = left + 'px';
                                imgEl.style.top = top + 'px';
                                imgEl.style.width = width + 'px';
                                imgEl.style.height = height + 'px';
                                imgEl.style.pointerEvents = 'none';
                                imgEl.setAttribute('data-export-overlay', 'true');
                                captureNode.appendChild(imgEl);
                                resolve();
                            } catch (e) { reject(e); }
                        };
                        img.onerror = () => resolve();
                        img.crossOrigin = 'anonymous';
                        img.src = svgData;
                    });
                }
            } catch (e) {
                console.warn('SVG rasterization failed, continuing export', e);
            }

            const safeName = (fileName || 'Ficha_Tecnica_Indicador.pdf').endsWith('.pdf')
                ? (fileName || 'Ficha_Tecnica_Indicador.pdf')
                : `${fileName || 'Ficha_Tecnica_Indicador'}.pdf`;

            const canvas = await html2canvasLib(captureNode, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                width: visualWidth,
                windowWidth: visualWidth,
                windowHeight: captureHost.scrollHeight + 40
            });

            const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const printableWidth = pageWidth - margin * 2;
            const printableHeight = pageHeight - margin * 2;

            const pxPerMm = canvas.width / printableWidth;
            const pageSliceHeightPx = Math.floor(printableHeight * pxPerMm);

            let offsetY = 0;
            let pageIndex = 0;

            while (offsetY < canvas.height) {
                const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - offsetY);
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeightPx;

                const pageCtx = pageCanvas.getContext('2d');
                pageCtx.fillStyle = '#ffffff';
                pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                pageCtx.drawImage(
                    canvas,
                    0,
                    offsetY,
                    canvas.width,
                    sliceHeightPx,
                    0,
                    0,
                    canvas.width,
                    sliceHeightPx
                );

                if (pageIndex > 0) {
                    pdf.addPage();
                }

                const sliceHeightMm = sliceHeightPx / pxPerMm;
                const pageImg = pageCanvas.toDataURL('image/jpeg', 0.98);
                pdf.addImage(pageImg, 'JPEG', margin, margin, printableWidth, sliceHeightMm, undefined, 'FAST');

                offsetY += sliceHeightPx;
                pageIndex += 1;
            }

            pdf.save(safeName);
        } finally {
            if (downloadModal) {
                downloadModal.style.display = originalModalDisplay;
            }
            if (captureHost) {
                captureHost.remove();
            }
            exportStyle.remove();
        }
    },

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

        // ============================================
        // MÉTODOS DE FICHA TÉCNICA - PANEL DEBAJO DEL MAPA
        // ============================================

        async openFichatecnica(processId) {
            console.log('Cargando Ficha Técnica para proceso:', processId);

            // 1. Obtener los elementos del DOM
            const panel = document.getElementById('ficha-tecnica-section');
            const processNameEl = document.getElementById('current-ficha-process-name');
            const fileNameEl = document.getElementById('ficha-tecnica-filename-display');
            const iframe = document.getElementById('ficha-tecnica-iframe-display');
            const placeholder = document.getElementById('ficha-tecnica-placeholder-display');
            const redirectBtn = document.getElementById('btn-redirect-sheet');

            if (!panel) return;

            // Ocultar otros paneles abiertos si los hay
            if (typeof this.closeIndicatorsPanel === 'function') this.closeIndicatorsPanel();
            if (typeof this.closeFlowchartsPanel === 'function') this.closeFlowchartsPanel();
            if (typeof this.closeSoportePanel === 'function') this.closeSoportePanel();

            // Mostrar el panel y hacer scroll suave hacia él
            panel.classList.remove('hidden');
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Mostrar pantalla de carga (Placeholder)
            if (placeholder) {
                placeholder.style.display = 'flex';
                placeholder.innerHTML = `
                    <div class="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-lg bg-emerald-50 border-2 border-emerald-200">
                        <span class="material-symbols-outlined text-5xl text-emerald-600 animate-spin">refresh</span>
                    </div>
                    <h4 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Buscando Ficha Técnica aprobada...</h4>
                    <p class="text-slate-500 dark:text-slate-400 text-center max-w-md">Consultando el repositorio de documentos aprobados.</p>
                `;
            }

            if (iframe) {
                iframe.src = '';
                iframe.style.display = 'none';
            }

            try {
                // Obtener el nombre del proceso para el título
                const allProcesses = [
                    ...(this.processes?.strategic || []),
                    ...(this.processes?.missional || []),
                    ...(this.processes?.support || [])
                ];
                const process = allProcesses.find(p => String(p.id) === String(processId));

                if (processNameEl) {
                    processNameEl.textContent = process ? process.name : 'Proceso';
                }

                // 2. BUSCAR EL DOCUMENTO APROBADO PARA ESTE PROCESO
                let docAprobado = null;
                const processCode = String(process?.code || '').trim().toUpperCase();

                const docsLista = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
                const candidatos = docsLista.filter(doc => {
                    const estado = String(doc.estado || '').toLowerCase();
                    const tipo = String(doc.tipo || '').toLowerCase();
                    return (estado === 'aprobado' || estado === 'completado') && tipo === 'caracterizacion';
                });

                // Prioridad 1: coincidencia exacta por codigoProceso
                docAprobado = candidatos.find(doc =>
                    String(doc.codigoProceso || '').trim().toUpperCase() === processCode
                );

                // Prioridad 2 (fallback): el código aparece en el texto de macroProceso
                if (!docAprobado) {
                    docAprobado = candidatos.find(doc => {
                        const texto = String(doc.macroProceso || doc.descripcion || '').toUpperCase();
                        return processCode && texto.includes(processCode);
                    });
                }
                // Si no se encuentra, buscar en sigpro_documentos_lista
                if (!docAprobado) {
                    const docsLista = JSON.parse(localStorage.getItem('sigpro_documentos_lista') || '[]');
                    const aprobados = docsLista.filter(d => d.estado === 'aprobado' || d.estado === 'APPROVED');
                    
                    docAprobado = aprobados.find(doc => {
                        const codigoDoc = String(doc.codigo || '').toUpperCase();
                        const codigoProceso = processCode.toUpperCase();
                        return codigoDoc === codigoProceso; // ✅ COINCIDENCIA EXACTA
                    });
                }

                // Si se encontró un documento aprobado, mostrar su contenido
                if (docAprobado) {
                    console.log('📄 Documento aprobado encontrado:', docAprobado);

                    // 🔥 ============================================================
                    // CAMBIO 3: BUSCAR EL RANGO ACTUALIZADO EN sigpro_documentos_detalle
                    // ============================================================
                    let rangeActualizado = docAprobado.range || docAprobado.googleSheetsRange || 'B4:J26';
                    let gidActualizado = docAprobado.gid || '0';
                    let sheetIdActualizado = docAprobado.sheetId || null;
                    let sheetNameActualizado = docAprobado.sheetName || 'Datos';

                    try {
                        const docsDetalle = JSON.parse(localStorage.getItem('sigpro_documentos_detalle') || '{}');
                        const detalle = docsDetalle[docAprobado.codigo] || docsDetalle[docAprobado.id] || {};
                        
                        if (detalle.fichaData) {
                            if (detalle.fichaData.range) rangeActualizado = detalle.fichaData.range;
                            if (detalle.fichaData.googleSheetsRange) rangeActualizado = detalle.fichaData.googleSheetsRange;
                            if (detalle.fichaData.gid) gidActualizado = detalle.fichaData.gid;
                            if (detalle.fichaData.sheetId) sheetIdActualizado = detalle.fichaData.sheetId;
                            if (detalle.fichaData.sheetName) sheetNameActualizado = detalle.fichaData.sheetName;
                        }
                        if (detalle.range) rangeActualizado = detalle.range;
                        if (detalle.gid) gidActualizado = detalle.gid;
                        if (detalle.sheetId) sheetIdActualizado = detalle.sheetId;
                        if (detalle.sheetName) sheetNameActualizado = detalle.sheetName;
                        
                        console.log('📎 Rango actualizado desde detalle:', rangeActualizado);
                        console.log('📎 GID actualizado:', gidActualizado);
                        console.log('📎 Sheet ID actualizado:', sheetIdActualizado);
                    } catch (e) {
                        console.warn('No se pudo obtener el detalle para actualizar el rango:', e);
                    }

                    // Usar los valores actualizados
                    let range = rangeActualizado;
                    let gid = gidActualizado;
                    let sheetId = sheetIdActualizado;
                    let sheetName = sheetNameActualizado;

                    // Obtener la URL pública del documento
                    let sheetUrl = docAprobado.publicUrl || 
                                docAprobado.urlPublica || 
                                docAprobado.pdfUrl || 
                                docAprobado.url || 
                                docAprobado.documentUrl || 
                                docAprobado.sheetUrl || '';

                    // Si hay sheetId pero no URL, construirla con rango
                    if (!sheetUrl && sheetId) {
                        const params = new URLSearchParams({
                            gid: gid || '0',
                            range: range,
                            single: 'true',
                            widget: 'true',
                            headers: 'false',
                            chrome: 'false'
                        });
                        sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?${params.toString()}`;
                    }

                    // 🔥 Si la URL es de Google Sheets, convertir a htmlembed con rango
                    if (sheetUrl && sheetUrl.includes('docs.google.com/spreadsheets/d/')) {
                        const match = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                        if (match) {
                            const id = match[1];
                            sheetId = id;
                            
                            // ✅ USAR HTMLEMBED (el mismo que funciona en expediente-caracterizacion)
                            const params = new URLSearchParams({
                                gid: gid || '0',
                                range: range,
                                single: 'true',
                                widget: 'true',
                                headers: 'false',
                                chrome: 'false'
                            });
                            
                            sheetUrl = `https://docs.google.com/spreadsheets/d/${id}/htmlembed?${params.toString()}`;
                            console.log('📎 Usando htmlembed (como en expediente-caracterizacion)');
                            console.log('📎 Rango:', range);
                            console.log('📎 GID:', gid);
                            console.log('📎 URL final:', sheetUrl);
                        }
                    }

                    // 🔥 Si aún no hay URL, buscar en attachments
                    if (!sheetUrl && docAprobado.attachments && Array.isArray(docAprobado.attachments)) {
                        const sheetLink = docAprobado.attachments.find(a => 
                            typeof a === 'string' && 
                            (a.includes('docs.google.com/spreadsheets') || a.includes('sheets.googleapis.com'))
                        );
                        if (sheetLink) {
                            const match = sheetLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
                            if (match) {
                                const id = match[1];
                                const params = new URLSearchParams({
                                    gid: gid || '0',
                                    range: range,
                                    single: 'true',
                                    widget: 'true',
                                    headers: 'false',
                                    chrome: 'false'
                                });
                                sheetUrl = `https://docs.google.com/spreadsheets/d/${id}/htmlembed?${params.toString()}`;
                            } else {
                                sheetUrl = sheetLink;
                            }
                        }
                    }

                    console.log('📎 URL final para iframe:', sheetUrl);

                    // Actualizar el nombre del archivo
                    if (fileNameEl) {
                        const nombreArchivo = docAprobado.title || docAprobado.descripcion || docAprobado.name || 'Ficha_Tecnica_Caracterizacion';
                        const codigoProceso = docAprobado.code || docAprobado.codigo || processCode || 'PROC';
                        fileNameEl.textContent = `${codigoProceso} - ${nombreArchivo}.xlsx`;
                    }

                    // Actualizar el botón de redirección
                    if (redirectBtn) {
                        let redirectUrl = docAprobado.publicUrl || 
                                        docAprobado.urlPublica || 
                                        docAprobado.pdfUrl || 
                                        docAprobado.url || 
                                        docAprobado.documentUrl || 
                                        sheetUrl;
                        
                        // Si es preview, convertir a edit para el botón
                        if (redirectUrl && redirectUrl.includes('/preview')) {
                            redirectUrl = redirectUrl.replace('/preview', '/edit');
                        }
                        // Si no tiene URL, usar la del iframe
                        if (!redirectUrl || redirectUrl === '#') {
                            redirectUrl = sheetUrl;
                        }
                        redirectBtn.href = redirectUrl || '#';
                        redirectBtn.style.display = 'inline-flex';
                    }

                    // Cargar el iframe con la URL
                    if (iframe && sheetUrl && sheetUrl !== '#') {
                        iframe.src = sheetUrl;
                        iframe.style.display = 'block';
                        if (placeholder) placeholder.style.display = 'none';
                    } else if (iframe) {
                        // Si no hay URL, mostrar mensaje
                        if (placeholder) {
                            placeholder.style.display = 'flex';
                            placeholder.innerHTML = `
                                <div class="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-lg bg-amber-50 border-2 border-amber-200">
                                    <span class="material-symbols-outlined text-5xl text-amber-600">info</span>
                                </div>
                                <h4 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Documento sin enlace público</h4>
                                <p class="text-slate-500 dark:text-slate-400 text-center max-w-md">
                                    El documento "${docAprobado.title || docAprobado.descripcion || 'Ficha Técnica'}" está aprobado pero no tiene un enlace público configurado.
                                </p>
                                <p class="text-sm text-slate-400 mt-2">
                                    Usa el botón "Abrir Ficha Técnica Completa" si está disponible.
                                </p>
                            `;
                        }
                    }

                    this.currentFichaTecnicaPdfUrl = sheetUrl;
                    this.currentFichaTecnicaProcess = process;
                    this.currentFichaTecnicaFileName = fileNameEl ? fileNameEl.textContent : 'Ficha_Tecnica.xlsx';

                } else {
                    // No se encontró documento aprobado
                    console.warn('No se encontró documento aprobado para el proceso:', processCode);
                    
                    // 🔥 INTENTAR BUSCAR POR sheetId en documentos generales
                    const docsDetalle = JSON.parse(localStorage.getItem('sigpro_documentos_detalle') || '{}');
                    let foundBySheet = null;
                    for (const [key, value] of Object.entries(docsDetalle)) {
                        if (value.fichaData && value.fichaData.sheetId) {
                            const procesoEnFicha = value.fichaData.macroProceso || value.fichaData.proceso || '';
                            if (procesoEnFicha.includes(processCode) || processName.includes(procesoEnFicha)) {
                                foundBySheet = {
                                    id: key,
                                    title: value.fichaData.nombreIndicador || value.fichaData.descripcion || 'Ficha Técnica',
                                    sheetId: value.fichaData.sheetId,
                                    publicUrl: `https://docs.google.com/spreadsheets/d/${value.fichaData.sheetId}/preview`
                                };
                                break;
                            }
                        }
                    }
                    
                    if (foundBySheet) {
                        console.log('📄 Documento encontrado por sheetId:', foundBySheet);
                        if (iframe && foundBySheet.publicUrl) {
                            iframe.src = foundBySheet.publicUrl;
                            iframe.style.display = 'block';
                            if (placeholder) placeholder.style.display = 'none';
                            if (fileNameEl) fileNameEl.textContent = `${processCode} - ${foundBySheet.title}.xlsx`;
                            if (redirectBtn) {
                                redirectBtn.href = foundBySheet.publicUrl.replace('/preview', '/edit');
                                redirectBtn.style.display = 'inline-flex';
                            }
                            this.currentFichaTecnicaPdfUrl = foundBySheet.publicUrl;
                            return;
                        }
                    }

                    if (placeholder) {
                        placeholder.style.display = 'flex';
                        placeholder.innerHTML = `
                            <div class="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-lg bg-amber-50 border-2 border-amber-200">
                                <span class="material-symbols-outlined text-5xl text-amber-600">file_open</span>
                            </div>
                            <h4 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Sin Ficha Técnica aprobada</h4>
                            <p class="text-slate-500 dark:text-slate-400 text-center max-w-md">
                                No se encontró un documento de ficha técnica aprobado para este proceso.
                                <br><span class="text-sm text-slate-400">Código: ${processCode || 'No disponible'}</span>
                            </p>
                            <p class="text-xs text-slate-400 mt-4">
                                Asegúrate de que el documento esté aprobado en el repositorio.<br>
                                La ficha técnica debe tener un enlace público de Google Sheets.
                            </p>
                        `;
                    }

                    if (redirectBtn) {
                        redirectBtn.href = '#';
                        redirectBtn.style.display = 'none';
                    }
                }

            } catch (error) {
                console.error('Error al abrir la ficha técnica:', error);

                // Mostrar estado de error en el contenedor
                if (placeholder) {
                    placeholder.style.display = 'flex';
                    placeholder.innerHTML = `
                        <div class="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-lg bg-red-100 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700/50">
                            <span class="material-symbols-outlined text-5xl text-red-500">error_outline</span>
                        </div>
                        <h4 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Error al cargar la Ficha Técnica</h4>
                        <p class="text-slate-500 dark:text-slate-400 text-center max-w-md">${error.message || 'Ocurrió un error inesperado.'}</p>
                    `;
                }
            }
        },

        closeFichaTecnicaPanel() {
            const panel = document.getElementById('ficha-tecnica-section');
            const iframe = document.getElementById('ficha-tecnica-iframe-display');

            if (panel) {
                panel.classList.add('hidden');
            }
            
            // Limpiar el src del iframe para detener la ejecución en segundo plano
            if (iframe) {
                iframe.src = '';
                iframe.style.display = 'none';
            }

            // Resetear estado
            this.currentFichaTecnicaProcess = null;
            this.currentFichaTecnicaPdfUrl = null;
            this.currentFichaTecnicaFileName = null;
        },

        async showFichaTecnicaPanel(process) {
            const section = document.getElementById('ficha-tecnica-section');
            const processNameEl = document.getElementById('current-ficha-process-name');
            const filenameEl = document.getElementById('ficha-tecnica-filename-display');
            const iframe = document.getElementById('ficha-tecnica-iframe-display');
            const placeholder = document.getElementById('ficha-tecnica-placeholder-display');
            
            if (!section) {
                console.error('No se encontró el panel de ficha técnica');
                return;
            }
            
            // Actualizar contenido
            processNameEl.textContent = process.name;
            
            const safeName = process.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            const pdfUrl = this.resolveFichaTecnicaPdfUrl(process);
            const fileName = this.getFileNameFromUrl(pdfUrl, `Ficha_Tecnica_${safeName}_${process.code}.pdf`);
            filenameEl.textContent = fileName;
            
            // Guardar referencia para descarga
            this.currentFichaTecnicaFileName = fileName;
            this.currentFichaTecnicaPdfUrl = pdfUrl;
            
            // Mostrar PDF real si existe URL configurada
            if (this.currentFichaTecnicaPdfUrl) {
                const resolvedWithParams = `${this.currentFichaTecnicaPdfUrl}#toolbar=0&navpanes=0&scrollbar=1`;
                // Intentar prefetch para detectar 404/CORS y ofrecer blob como fallback
                try {
                    const resp = await fetch(resolvedWithParams, { method: 'GET', mode: 'cors' });
                    if (resp.ok) {
                        const ct = resp.headers.get('content-type') || '';
                        if (ct.toLowerCase().includes('pdf')) {
                            const blob = await resp.blob();
                            if (this.currentFichaTecnicaBlobUrl) window.URL.revokeObjectURL(this.currentFichaTecnicaBlobUrl);
                            this.currentFichaTecnicaBlobUrl = window.URL.createObjectURL(blob);
                            iframe.src = this.currentFichaTecnicaBlobUrl;
                            placeholder.style.display = 'none';
                        } else {
                            // No es PDF según el header, usar URL directa
                            iframe.src = resolvedWithParams;
                            placeholder.style.display = 'none';
                        }
                    } else {
                        // Intentar usar downloadUrl si existe
                        if (process.fichaDownloadUrl) {
                            try {
                                const dresp = await fetch(process.fichaDownloadUrl, { method: 'GET', mode: 'cors' });
                                if (dresp.ok) {
                                    const blob = await dresp.blob();
                                    if (this.currentFichaTecnicaBlobUrl) window.URL.revokeObjectURL(this.currentFichaTecnicaBlobUrl);
                                    this.currentFichaTecnicaBlobUrl = window.URL.createObjectURL(blob);
                                    iframe.src = this.currentFichaTecnicaBlobUrl;
                                    placeholder.style.display = 'none';
                                } else {
                                    iframe.src = resolvedWithParams;
                                    placeholder.style.display = 'none';
                                }
                            } catch (e) {
                                iframe.src = resolvedWithParams;
                                placeholder.style.display = 'none';
                            }
                        } else {
                            iframe.src = resolvedWithParams;
                            placeholder.style.display = 'none';
                        }
                    }
                } catch (err) {
                    console.warn('Prefetch ficha técnica falló, usando URL directa o download:', err);
                    if (process.fichaDownloadUrl) {
                        try {
                            const dresp = await fetch(process.fichaDownloadUrl, { method: 'GET', mode: 'cors' });
                            if (dresp.ok) {
                                const blob = await dresp.blob();
                                if (this.currentFichaTecnicaBlobUrl) window.URL.revokeObjectURL(this.currentFichaTecnicaBlobUrl);
                                this.currentFichaTecnicaBlobUrl = window.URL.createObjectURL(blob);
                                iframe.src = this.currentFichaTecnicaBlobUrl;
                                placeholder.style.display = 'none';
                            } else {
                                iframe.src = resolvedWithParams;
                                placeholder.style.display = 'none';
                            }
                        } catch (e) {
                            iframe.src = resolvedWithParams;
                            placeholder.style.display = 'none';
                        }
                    } else {
                        iframe.src = resolvedWithParams;
                        placeholder.style.display = 'none';
                    }
                }
            } else {
                iframe.src = '';
                placeholder.style.display = 'flex';
            }
            
            // Cargar indicadores del proceso y renderizarlos si existe el contenedor
            try {
                const inds = await this.getProcessIndicators(this.facultyId, process.id);
                if (inds && inds.success) {
                    process.indicators = Array.isArray(inds.data) ? inds.data : (inds.data?.items || []);
                    const indContainer = document.getElementById('ficha-tecnica-indicators');
                    if (indContainer) {
                        if (!process.indicators || process.indicators.length === 0) {
                            indContainer.innerHTML = '<div class="text-sm text-neutral-500">No hay indicadores disponibles</div>';
                        } else {
                            indContainer.innerHTML = process.indicators.map(i => {
                                const title = this.escapeHtml(i.name || i.title || i.indicador || 'Indicador');
                                const value = this.escapeHtml(i.value || i.meta || i.target || '');
                                return `<div class="py-2 border-b last:border-b-0"><div class="font-medium">${title}</div><div class="text-sm text-neutral-600">${value}</div></div>`;
                            }).join('');
                        }
                    }
                }
            } catch (e) {
                console.warn('No se pudieron cargar indicadores', e);
            }

            // Mostrar panel
            section.classList.remove('hidden');
            
            // Scroll suave al panel
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            
            console.log('Panel de ficha técnica mostrado:', process.name);
        },

        closeFichaTecnicaPanel() {
            const section = document.getElementById('ficha-tecnica-section');
            if (!section) return;
            
            // Animación de salida
            section.style.opacity = '0';
            section.style.transform = 'translateY(-20px)';
            section.style.transition = 'all 0.4s ease';
            
            setTimeout(() => {
                section.classList.add('hidden');
                section.style.opacity = '';
                section.style.transform = '';
                section.style.transition = '';
                
                // Limpiar contenido
                const iframe = document.getElementById('ficha-tecnica-iframe-display');
                if (iframe) iframe.src = '';
                
                this.currentFichaTecnicaProcess = null;
                this.currentFichaTecnicaFileName = null;
                this.currentFichaTecnicaPdfUrl = null;
                if (this.currentFichaTecnicaBlobUrl) {
                    try { window.URL.revokeObjectURL(this.currentFichaTecnicaBlobUrl); } catch (e) {}
                    this.currentFichaTecnicaBlobUrl = null;
                }
            }, 400);
        },

        downloadFichaTecnicaFile() {
            if (!this.currentFichaTecnicaPdfUrl) {
                this.showError('No hay URL de ficha técnica disponible');
                return;
            }
            
            const fileName = this.currentFichaTecnicaFileName || 'Ficha_Tecnica.xlsx';
            const btn = document.getElementById('btn-download-ficha');
            
            if (!btn) return;
            
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> Descargando...';
            btn.disabled = true;

            // Si es una URL de Google Sheets, abrir en nueva pestaña
            const url = this.currentFichaTecnicaPdfUrl;
            if (url.includes('docs.google.com')) {
                window.open(url, '_blank');
                btn.innerHTML = '<span class="material-symbols-outlined text-base">check</span> Abierto';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }, 2000);
                return;
            }

            // Para otros tipos de URL (PDF, etc.)
            this.downloadPdfFromUrl(url, fileName)
                .then(() => {
                    btn.innerHTML = '<span class="material-symbols-outlined text-base">check</span> ¡Descargado!';
                    btn.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
                    btn.style.borderColor = '#059669';
                    this.showToast('Ficha técnica descargada exitosamente', 'success');
                })
                .catch((error) => {
                    console.error('Error descargando:', error);
                    this.showError('Error al descargar: ' + error.message);
                })
                .finally(() => {
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                        btn.style.background = '';
                        btn.style.borderColor = '';
                    }, 1500);
                });
        },

    resolveFlowchartPdfUrl(flowchart) {
        if (!flowchart) return null;

        const dataUrl = flowchart.realPdfUrl || flowchart.pdfUrl || flowchart.documentUrl || flowchart.fileUrl || '';
        const byCode = this.manualPdfCatalog?.flowcharts?.[String(flowchart.code || '').toUpperCase()] || '';

        // Evita falsos positivos (ej. PE.02.pdf inexistente):
        // para flujogramas solo usar URL de API o mapeo manual por código.
        return this.getFirstValidPdfUrl([byCode, dataUrl]);
    },

    resolveFichaTecnicaPdfUrl(process) {
        if (!process) return null;

        const dataUrl = process.fichaPdfUrl || process.pdfUrl || process.documentUrl || process.fileUrl || '';
        const byCode = this.manualPdfCatalog?.fichaTecnica?.[String(process.code || '').toUpperCase()] || '';

        // En ficha tecnica usamos asignacion explicita por codigo para evitar
        // mostrar archivos en procesos no configurados.
        return this.getFirstValidPdfUrl([byCode, dataUrl]);
    },

    getFirstValidPdfUrl(urls = []) {
        for (const rawUrl of urls) {
            const url = String(rawUrl || '').trim();
            if (!url) continue;
            if (this.isPlaceholderPdfUrl(url)) continue;
            return url;
        }
        return null;
    },

    getDefaultFlowchartPdfPath(flowchart) {
        const rawCode = String(flowchart?.code || '').trim();
        if (!rawCode) return '';

        const safeCode = rawCode.toUpperCase().replace(/[^A-Z0-9._-]/g, '');
        if (!safeCode) return '';

        return `docs/pdfs/flujogramas/${safeCode}.pdf`;
    },

    getDefaultFichaTecnicaPdfPath(process) {
        const rawCode = String(process?.code || '').trim();
        if (!rawCode) return '';

        const safeCode = rawCode.toUpperCase().replace(/[^A-Z0-9._-]/g, '');
        if (!safeCode) return '';

        return `docs/pdfs/fichas/${safeCode}.pdf`;
    },

    isPlaceholderPdfUrl(url) {
        if (!url || url === '#') return true;
        return /^\/api\/flowcharts\/\d+\/pdf$/i.test(String(url).trim());
    },

    getFileNameFromUrl(url, fallbackName) {
        if (!url) return fallbackName;
        const clean = String(url).split('?')[0].split('#')[0];
        const last = clean.split('/').pop();
        return last ? decodeURIComponent(last) : fallbackName;
    },

    async downloadPdfFromUrl(url, fileName) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`No se pudo descargar el PDF (${response.status})`);
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName || this.getFileNameFromUrl(url, 'documento.pdf');
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(objectUrl);
    },


    // ============================================
    // MÉTODOS AUXILIARES
    // ============================================

    showProcessPreview(processId) {
        console.log('Preview proceso:', processId);
    },

    saveState() {
        sessionStorage.setItem('processMapScroll', window.scrollY);
        sessionStorage.setItem('processMapFaculty', this.facultyId);
    },

    restoreState() {
        const scroll = sessionStorage.getItem('processMapScroll');
        const faculty = sessionStorage.getItem('processMapFaculty');
        
        if (scroll && faculty == this.facultyId) {
            window.scrollTo(0, parseInt(scroll));
            sessionStorage.removeItem('processMapScroll');
        }
    },

    initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;
        
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        
        themeToggle?.addEventListener('click', () => {
            html.classList.toggle('dark');
            localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
        });
    },

    showToast(message, type = 'info') {
        if (window.toast && window.toast[type]) {
            window.toast[type](message);
            return;
        }
        
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };
        
        toast.className = `fixed bottom-8 right-8 ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl shadow-2xl z-[200] animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-2 font-medium`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
            ${message}
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out');
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    },

    showError(message) {
        if (window.toast && window.toast.error) {
            window.toast.error(message);
        } else {
            alert(message);
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => ProcessMap.init());
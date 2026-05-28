/**
 * PROCESS MAP - INDICADOR CONTROLLER
 * Tarjetas con modal de ficha técnica completa
 */

class ProcessMapIndicador {
    constructor() {
        this.facultyId = null;
        this.facultyData = null;
        this.indicators = [];
        this.filteredIndicators = [];
        this.currentModalIndicator = null;
        this.currentTypeFilter = 'all';
        
        this.init();
    }

    async init() {
        this.getFacultyFromURL();
        this.setupEventListeners();
        this.setupThemeToggle();
        
        if (this.facultyId) {
            await this.loadFacultyData();
            await this.loadIndicators();
        } else {
            this.showError('No se especificó una facultad en la URL. Ejemplo: ?faculty=2');
        }
    }

    getFacultyFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const facultyParam = urlParams.get('faculty');
        this.facultyId = facultyParam ? parseInt(facultyParam) : null;
        
        console.log('Faculty ID:', this.facultyId); // Debug
        
        const btnFlows = document.getElementById('btn-flows');
        if (btnFlows && this.facultyId) {
            btnFlows.href = `process-map-flujograma.html?faculty=${this.facultyId}`;
        }
    }

    async loadFacultyData() {
        const stored = sessionStorage.getItem('selectedFaculty');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parseInt(parsed.id) === parseInt(this.facultyId)) {
                    this.facultyData = parsed;
                    this.updateUIFacultyInfo();
                    return;
                }
            } catch (e) {
                console.warn('Error parseando sessionStorage:', e);
            }
        }

        try {
            if (typeof API === 'undefined' || !API.faculties) {
                throw new Error('API no disponible');
            }

            const response = await API.faculties.getById(this.facultyId);
            
            if (!response.success) {
                throw new Error(response.error || 'Error en la respuesta de la API');
            }
            
            this.facultyData = response.data;
            sessionStorage.setItem('selectedFaculty', JSON.stringify(this.facultyData));
            this.updateUIFacultyInfo();

        } catch (error) {
            console.error('Error cargando facultad:', error);
            this.facultyData = { 
                id: this.facultyId, 
                name: `Facultad ${this.facultyId}` 
            };
            this.updateUIFacultyInfo();
        }
    }

    updateUIFacultyInfo() {
        const facultyNameEl = document.getElementById('faculty-name');
        if (facultyNameEl && this.facultyData) {
            facultyNameEl.textContent = `Facultad de ${this.facultyData.name}`;
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('search-indicators');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Dropdown de Tipo - IDs sin sufijo según tu HTML
        this.setupCustomDropdown();

        // Modal
        const modalOverlay = document.getElementById('modal-overlay');
        const closeModalBtn = document.getElementById('btn-close-modal');
        const downloadFichaBtn = document.getElementById('btn-download-ficha');

        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        if (downloadFichaBtn) {
            downloadFichaBtn.addEventListener('click', () => this.downloadFicha());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    setupCustomDropdown() {
        // IDs según tu HTML actual: sin sufijo -type
        const container = document.getElementById('custom-dropdown');
        const dropdownBtn = document.getElementById('dropdown-btn');
        const dropdownOptions = document.getElementById('dropdown-options');
        const dropdownSelected = document.getElementById('dropdown-selected');
        const dropdownArrow = document.getElementById('dropdown-arrow');
        const optionButtons = document.querySelectorAll('.dropdown-option');
        
        console.log('Dropdown elements:', {
            container: !!container,
            btn: !!dropdownBtn,
            options: !!dropdownOptions,
            selected: !!dropdownSelected,
            arrow: !!dropdownArrow,
            optionsCount: optionButtons.length
        });

        if (!dropdownBtn || !dropdownOptions) {
            console.error('No se encontraron elementos del dropdown');
            return;
        }
        
        let isOpen = false;

        // Toggle dropdown
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isOpen = !isOpen;
            console.log('Dropdown clicked, isOpen:', isOpen);
            this.toggleDropdown(isOpen, dropdownOptions, dropdownBtn, dropdownArrow);
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (isOpen && !dropdownBtn.contains(e.target) && !dropdownOptions.contains(e.target)) {
                isOpen = false;
                this.toggleDropdown(false, dropdownOptions, dropdownBtn, dropdownArrow);
            }
        });

        // Prevenir que el click en opciones cierre inmediatamente
        dropdownOptions.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Seleccionar opción
        optionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = button.dataset.value;
                const text = button.textContent.trim();
                
                console.log('Opción seleccionada:', value, text);
                
                if (dropdownSelected) {
                    dropdownSelected.textContent = text;
                }
                
                // Remover active de todas las opciones
                optionButtons.forEach(opt => opt.classList.remove('active'));
                // Agregar active a la seleccionada
                button.classList.add('active');
                
                isOpen = false;
                this.toggleDropdown(false, dropdownOptions, dropdownBtn, dropdownArrow);
                
                // Aplicar filtro
                this.currentTypeFilter = value;
                this.applyFilters();
            });
        });

        // Marcar la primera opción como activa por defecto
        const defaultOption = document.querySelector('.dropdown-option[data-value="all"]');
        if (defaultOption) {
            defaultOption.classList.add('active');
        }
    }

    toggleDropdown(isOpen, dropdownOptions, dropdownBtn, dropdownArrow) {
        if (isOpen) {
            dropdownOptions.classList.add('active');
            dropdownOptions.style.opacity = '1';
            dropdownOptions.style.visibility = 'visible';
            dropdownOptions.style.transform = 'translateY(0)';
            dropdownBtn.classList.add('active');
            if (dropdownArrow) {
                dropdownArrow.style.transform = 'rotate(180deg)';
            }
            document.body.classList.add('dropdown-open');
        } else {
            dropdownOptions.classList.remove('active');
            dropdownOptions.style.opacity = '0';
            dropdownOptions.style.visibility = 'hidden';
            dropdownOptions.style.transform = 'translateY(-8px)';
            dropdownBtn.classList.remove('active');
            if (dropdownArrow) {
                dropdownArrow.style.transform = 'rotate(0deg)';
            }
            document.body.classList.remove('dropdown-open');
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;
        
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                html.classList.toggle('dark');
                localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
            });
        }
    }

    safeParseArray(raw) {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    safeParseObject(raw) {
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }

    normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    isApprovedStatus(value) {
        const status = this.normalizeText(value);
        return status === 'aprobado' || status === 'completado' || status.includes('aprob');
    }

    resolveType(rawType, codigo = '', proceso = '') {
        const type = this.normalizeText(rawType);
        const normalizedCode = this.normalizeText(codigo);
        const normalizedProceso = this.normalizeText(proceso);
        
        console.log('resolveType DEBUG:', { rawType, codigo, proceso, normalizedCode, normalizedProceso });
        
        // Primero: Intentar detectar del proceso (ej: "PE.01", "PM.01", "PS.01")
        if (normalizedProceso.startsWith('pe.') || normalizedProceso.startsWith('pe-') || normalizedProceso.includes(' pe.') || normalizedProceso.includes(' pe-')) {
            console.log('✓ Detectado como ESTRATÉGICO por proceso');
            return 'estrategico';
        }
        if (normalizedProceso.startsWith('pm.') || normalizedProceso.startsWith('pm-') || normalizedProceso.includes(' pm.') || normalizedProceso.includes(' pm-')) {
            console.log('✓ Detectado como MISIONAL por proceso');
            return 'misional';
        }
        if (normalizedProceso.startsWith('ps.') || normalizedProceso.startsWith('ps-') || normalizedProceso.includes(' ps.') || normalizedProceso.includes(' ps-')) {
            console.log('✓ Detectado como SOPORTE por proceso');
            return 'soporte';
        }
        
        // Segundo: Intentar del código
        if (normalizedCode.includes('pe-') || normalizedCode.includes('pe_')) {
            console.log('✓ Detectado como ESTRATÉGICO por código');
            return 'estrategico';
        }
        if (normalizedCode.includes('pm-') || normalizedCode.includes('pm_')) {
            console.log('✓ Detectado como MISIONAL por código');
            return 'misional';
        }
        if (normalizedCode.includes('ps-') || normalizedCode.includes('ps_')) {
            console.log('✓ Detectado como SOPORTE por código');
            return 'soporte';
        }
        
        // Tercero: Intentar del tipo
        if (type.includes('estrateg')) {
            console.log('✓ Detectado como ESTRATÉGICO por tipo');
            return 'estrategico';
        }
        if (type.includes('mision')) {
            console.log('✓ Detectado como MISIONAL por tipo');
            return 'misional';
        }
        if (type.includes('soporte') || type.includes('apoyo')) {
            console.log('✓ Detectado como SOPORTE por tipo');
            return 'soporte';
        }
        
        console.log('⚠ Usando SOPORTE como default');
        return 'soporte';
    }

    parseVariables(rawVariables, fallbackN = '', fallbackD = '') {
        const raw = String(rawVariables || '').replace(/\r/g, '').trim();
        let variableN = String(fallbackN || '').trim();
        let variableD = String(fallbackD || '').trim();

        const clean = (value, label) => String(value || '').replace(new RegExp(`^${label}\\s*[:=]\\s*`, 'i'), '').trim();

        if (!raw) {
            return { N: clean(variableN, 'N') || '-', D: clean(variableD, 'D') || '-' };
        }

        const normalized = raw.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const nMatch = normalized.match(/(?:^|\b)N\s*[:=]\s*(.+?)(?=\s+(?:D\s*[:=]|$))/i);
        const dMatch = normalized.match(/(?:^|\b)D\s*[:=]\s*(.+)$/i);

        if (nMatch?.[1]) variableN = nMatch[1].trim();
        if (dMatch?.[1]) variableD = dMatch[1].trim();

        if ((!nMatch || !dMatch) && normalized.includes('/')) {
            const [partN, partD] = normalized.split('/');
            if (!nMatch && partN) variableN = partN.trim();
            if (!dMatch && partD) variableD = partD.trim();
        }

        return { N: clean(variableN, 'N') || '-', D: clean(variableD, 'D') || '-' };
    }

    parseSeguimiento(codigo, metaFallback = 0) {
        if (!codigo) return [];

        const rows = this.safeParseArray(localStorage.getItem(`sigpro_historial_datos_${codigo}`));
        return rows
            .filter((item) => item && (item.fecha || item.periodo))
            .map((item) => {
                const rawValor = Number(item?.resultado ?? item?.valor ?? 0);
                const valor = Number.isFinite(rawValor) ? (rawValor <= 1 ? rawValor * 100 : rawValor) : 0;
                const meta = Number(item?.metaPeriodo ?? item?.meta ?? metaFallback) || 0;
                return {
                    periodo: item?.periodo || item?.fecha || '-',
                    N: Number(item?.N ?? item?.devengado ?? 0) || '-',
                    D: Number(item?.D ?? item?.pim ?? 0) || '-',
                    meta,
                    valor: Number(valor.toFixed(1)),
                    estado: item?.estado || (valor >= meta ? 'Óptimo' : valor >= 75 ? 'Riesgo' : 'Crítico'),
                    lineaBase: item?.lineaBase || '-',
                    observaciones: item?.observaciones || item?.analisis || item?.acciones || ''
                };
            })
            .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
    }

    matchesCurrentFaculty(doc) {
        const facultyId = String(this.facultyId || '');
        const docFacultyId = String(doc?.facultadId || doc?.facultyId || '');
        if (facultyId && docFacultyId) return docFacultyId === facultyId;

        const currentName = this.normalizeText(this.facultyData?.name || this.facultyData?.nombre || this.facultyData?.nombreFacultad || '');
        const docName = this.normalizeText(doc?.nombreFacultad || doc?.facultad || doc?.facultadNombre || doc?.generadoPor || '');
        if (currentName && docName) return currentName === docName;

        return true;
    }

    buildIndicatorsFromStorage() {
        const documentosLista = this.safeParseArray(localStorage.getItem('sigpro_documentos_lista'));
        const documentosDetalle = this.safeParseObject(localStorage.getItem('sigpro_documentos_detalle'));
        const indicadoresDetalle = this.safeParseObject(localStorage.getItem('sigpro_indicadores_detalle'));

        const approvedDocs = documentosLista.filter((doc) => {
            const tipo = this.normalizeText(doc?.tipo || doc?.asunto || '');
            if (!tipo.includes('indic')) return false;
            if (!this.isApprovedStatus(doc?.estado)) return false;
            if (!this.matchesCurrentFaculty(doc)) return false;
            return true;
        });

        return approvedDocs.map((doc, index) => {
            const code = String(doc?.codigo || '').trim();
            const detail = documentosDetalle[code] || indicadoresDetalle[code] || {};
            const payload = detail.fichaData || detail.indicadorData || detail;

            const target = Number(payload?.meta ?? detail?.meta ?? 90) || 90;
            const seguimiento = this.parseSeguimiento(code, target);
            const lastRow = seguimiento[seguimiento.length - 1] || null;
            const actual = lastRow ? Number(lastRow.valor) || target : target;
            const vars = this.parseVariables(payload?.variables, payload?.variableN, payload?.variableD);
            const proceso = payload?.macroProcesoNombre || payload?.macroProcesoTexto || payload?.macroProceso || payload?.proceso || '-';

            const type = this.resolveType(payload?.tipoProcesoLabel || payload?.tipoProceso || payload?.tipo || doc?.tipo, code, proceso);

            return {
                id: String(doc?.id || code || `ind-${index + 1}`),
                facultyId: doc?.facultadId || this.facultyId,
                code,
                title: payload?.nombreIndicador || detail?.titulo || doc?.descripcion || `Indicador ${code}`,
                type,
                proceso,
                target,
                actual: Number(actual.toFixed(1)),
                unit: '%',
                lastUpdate: doc?.fechaAprobacion || doc?.fechaActualizacion || doc?.updatedAt || detail?.fechaRegistro || payload?.createdAt || doc?.fecha || new Date().toISOString(),
                ficha: {
                    responsable: payload?.unidadResponsable || payload?.responsable || 'Unidad responsable',
                    version: payload?.version || detail?.version || '1.0',
                    objetivo: payload?.objetivoProceso || payload?.objetivo || '-',
                    variables: vars,
                    fuente: payload?.fuente || '-',
                    formula: payload?.formulaDefinicion || payload?.formula || 'I=(N/D)*100',
                    frecuencia: payload?.frecuencia || '-'
                },
                seguimiento,
                chartData: {
                    meta: seguimiento.length ? seguimiento.map((row) => Number(row.meta) || target) : [target],
                    valores: seguimiento.length ? seguimiento.map((row) => Number(row.valor) || 0) : [Number(actual.toFixed(1))]
                }
            };
        });
    }

    async loadIndicators() {
        const container = document.getElementById('indicators-container');
        if (!container) return;

        container.innerHTML = `
            <div class="indicators-loading col-span-full flex flex-col items-center justify-center py-16">
                <span class="material-symbols-outlined text-6xl animate-spin text-primary">refresh</span>
                <p class="mt-4 text-lg font-medium">Cargando indicadores...</p>
            </div>
        `;

        try {
            this.indicators = this.buildIndicatorsFromStorage();
            
            if (this.indicators.length === 0) {
                container.innerHTML = `
                    <div class="indicators-empty col-span-full text-center py-16">
                        <span class="material-symbols-outlined text-6xl mb-4 text-slate-300">monitoring</span>
                        <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Sin indicadores</h3>
                        <p class="text-slate-500">No hay indicadores configurados para ${this.facultyData?.name || 'esta facultad'} aún.</p>
                    </div>
                `;
                return;
            }

            this.filteredIndicators = [...this.indicators];
            this.renderIndicators();

        } catch (error) {
            console.error('Error cargando indicadores:', error);
            this.showError('Error al cargar los indicadores');
        }
    }

    renderIndicators() {
        const container = document.getElementById('indicators-container');
        if (!container) return;

        if (this.filteredIndicators.length === 0) {
            container.innerHTML = `
                <div class="indicators-empty col-span-full text-center py-16">
                    <span class="material-symbols-outlined text-6xl mb-4 text-slate-300">monitoring</span>
                    <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No se encontraron indicadores</h3>
                    <p class="text-slate-500">Intenta con otros términos de búsqueda o filtros</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredIndicators.map((indicator, index) => this.createIndicatorCard(indicator, index)).join('');
    }

    createIndicatorCard(indicator, index) {
        const typeLabels = {
            'estrategico': 'Estratégico',
            'soporte': 'Soporte',
            'misional': 'Misional'
        };

        const typeIcons = {
            'estrategico': 'rocket_launch',
            'soporte': 'support_agent',
            'misional': 'school'
        };

        const progressPercentage = Math.min(100, Math.round((indicator.actual / indicator.target) * 100));
        const safeId = String(indicator.id).replace(/'/g, "\\'");
        
        return `
            <div class="indicator-card bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-slate-200 dark:border-slate-700" 
                 data-id="${indicator.id}" 
                 style="animation-delay: ${index * 0.05}s" 
                 onclick="processMapIndicador.openDetail('${safeId}')">
                
                <div class="flex items-start gap-4 mb-4">
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span class="material-symbols-outlined text-primary text-2xl">${typeIcons[indicator.type] || 'monitoring'}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold text-slate-400">${indicator.code}</span>
                            <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs font-semibold">
                                ${typeLabels[indicator.type] || indicator.type}
                            </span>
                        </div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">${indicator.title}</h3>
                        <p class="text-sm text-slate-500 mt-1">${indicator.proceso}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div class="text-center">
                        <div class="text-lg font-bold text-slate-400">${indicator.target}${indicator.unit}</div>
                        <div class="text-xs text-slate-500 uppercase font-semibold">Meta</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold text-primary">${indicator.actual}${indicator.unit}</div>
                        <div class="text-xs text-slate-500 uppercase font-semibold">Actual</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-bold text-slate-700 dark:text-slate-200">${progressPercentage}%</div>
                        <div class="text-xs text-slate-500 uppercase font-semibold">Avance</div>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-slate-500">Cumplimiento</span>
                        <span class="font-semibold text-slate-700 dark:text-slate-200">${progressPercentage}%</span>
                    </div>
                    <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500" 
                             style="width: ${progressPercentage}%"></div>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                    <span class="text-sm text-slate-500 flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">calendar_today</span>
                        ${this.formatDate(indicator.lastUpdate)}
                    </span>
                    <span class="text-sm font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                        Ver ficha
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                </div>
            </div>
        `;
    }

    openDetail(indicatorId) {
        const indicator = this.indicators.find(i => String(i.id) === String(indicatorId));
        if (!indicator) return;

        this.currentModalIndicator = indicator;
        const ficha = indicator.ficha;
        const seguimiento = indicator.seguimiento;

        const modalBody = document.getElementById('modal-ficha-content');
        if (modalBody) {
            modalBody.innerHTML = this.renderFichaTecnica(indicator);
        }

        const modal = document.getElementById('detail-modal');
        const modalContent = document.getElementById('modal-content');
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);

        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            this.renderChartModal(indicator.chartData);
        }, 100);
    }

    renderFichaTecnica(indicator) {
        const ficha = indicator.ficha;
        const seguimiento = indicator.seguimiento || [];

        const tipoProceso = indicator.type === 'estrategico'
            ? 'Estratégico'
            : indicator.type === 'misional'
            ? 'Misional'
            : 'Soporte';

        return `
            <div class="space-y-6">
                <div>
                    <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-b-0 rounded-t-xl">
                        <h4 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">1. Identificación del proceso</h4>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0 rounded-b-xl p-4">
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                                <tbody>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-[220px]">Proceso:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${indicator.proceso || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Código:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono font-bold">${indicator.code || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Indicador:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${indicator.title || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Responsable:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${ficha.responsable || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Versión:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-mono">${ficha.version || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Tipo de proceso:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                tipoProceso === 'Estratégico' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                tipoProceso === 'Misional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                            }">${tipoProceso}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-b-0 rounded-t-xl">
                        <h4 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">2. Objetivo</h4>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0 rounded-b-xl p-5">
                        <p class="text-slate-700 dark:text-slate-300 italic leading-relaxed border-l-4 border-slate-400 dark:border-slate-500 pl-4">${ficha.objetivo || '-'}</p>
                    </div>
                </div>

                <div>
                    <div class="bg-slate-200 dark:bg-slate-700 px-6 py-3 border border-slate-300 dark:border-slate-600 border-b-0 rounded-t-xl">
                        <h4 class="text-xs font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">3. Indicador</h4>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 border-t-0 rounded-b-xl p-4">
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
                                <tbody>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-[220px]">Nombre:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${indicator.title || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Frecuencia:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${ficha.frecuencia || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Variables:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                                            <div class="space-y-1">
                                                <div><strong class="text-slate-600 dark:text-slate-400">N:</strong> ${ficha.variables?.N || '-'}</div>
                                                <div><strong class="text-slate-600 dark:text-slate-400">D:</strong> ${ficha.variables?.D || '-'}</div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Fuente:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">${ficha.fuente || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Fórmula:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 bg-white dark:bg-slate-900">
                                            <div class="rounded-lg p-3 font-mono text-sm text-primary dark:text-blue-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                ${ficha.formula || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Meta:</td>
                                        <td class="border border-slate-300 dark:border-slate-600 px-4 py-3 bg-white dark:bg-slate-900">
                                            <div class="flex items-center gap-3 flex-wrap">
                                                <span class="text-2xl font-black text-slate-900 dark:text-white">${indicator.target || ficha.meta || '-'}%</span>
                                                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">&lt;75 Crítico</span>
                                                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">75≤U&lt;90 Riesgo</span>
                                                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">≥90 Óptimo</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">4. Seguimiento</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="bg-slate-100 dark:bg-slate-800">
                                    <th class="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300 rounded-tl-lg">Período</th>
                                    <th class="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">N</th>
                                    <th class="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">D</th>
                                    <th class="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">Meta</th>
                                    <th class="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">Valor del Indicador</th>
                                    <th class="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">Estado</th>
                                    <th class="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300 rounded-tr-lg">Observaciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                                ${seguimiento.map(row => `
                                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">${row.periodo || '-'}</td>
                                        <td class="px-4 py-3 text-center text-slate-600 dark:text-slate-400">${row.N || '-'}</td>
                                        <td class="px-4 py-3 text-center text-slate-600 dark:text-slate-400">${row.D || '-'}</td>
                                        <td class="px-4 py-3 text-center font-semibold text-emerald-600">${row.meta || '-'}</td>
                                        <td class="px-4 py-3 text-center font-bold ${row.valor >= row.meta ? 'text-emerald-600' : row.valor >= row.meta * 0.85 ? 'text-amber-600' : 'text-red-600'}">${row.valor || '-'}</td>
                                        <td class="px-4 py-3 text-center">
                                            <span class="inline-block px-2 py-1 rounded-full text-xs font-bold ${this.getEstadoClass(row.estado)}">${row.estado || '-'}</span>
                                        </td>
                                        <td class="px-4 py-3 text-slate-600 dark:text-slate-400">${row.observaciones || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h4 class="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">5. Tendencia del Indicador</h4>
                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                        <div class="flex justify-center gap-6 mb-4 text-sm">
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span class="text-slate-600 dark:text-slate-300">Meta</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full bg-red-500"></span>
                                <span class="text-slate-600 dark:text-slate-300">Valor del Indicador</span>
                            </div>
                        </div>
                        <canvas id="modal-chart" width="700" height="250"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    getEstadoClass(estado) {
        if (estado === 'Óptimo') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (estado === 'Riesgo') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }

    renderChartModal(chartData) {
        const canvas = document.getElementById('modal-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = { top: 20, right: 30, bottom: 40, left: 50 };
        
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, width, height);

        const allValues = [...chartData.meta, ...chartData.valores];
        const maxVal = Math.max(...allValues) * 1.1;
        const minVal = Math.min(...allValues) * 0.8;

        const getY = (val) => padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
        const getX = (index) => padding.left + (index / (chartData.valores.length - 1)) * chartWidth;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        ctx.strokeStyle = '#f1f5f9';
        ctx.setLineDash([5, 5]);
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const val = minVal + ((maxVal - minVal) / 5) * (5 - i);
            const y = padding.top + (chartHeight / 5) * i;
            ctx.fillText(Math.round(val), padding.left - 10, y + 4);
        }

        ctx.textAlign = 'center';
        chartData.valores.forEach((_, index) => {
            const x = getX(index);
            ctx.fillText(`2026-${index + 1}`, x, height - padding.bottom + 20);
        });

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        chartData.meta.forEach((val, index) => {
            const x = getX(index);
            const y = getY(val);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#3b82f6';
        chartData.meta.forEach((val, index) => {
            const x = getX(index);
            const y = getY(val);
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        chartData.valores.forEach((val, index) => {
            const x = getX(index);
            const y = getY(val);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Inter, sans-serif';
        
        chartData.valores.forEach((val, index) => {
            const x = getX(index);
            const y = getY(val);
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillText(val, x, y - 15);
        });
    }

    async ensurePdfLibraries() {
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
    }

    async downloadFicha() {
        if (!this.currentModalIndicator) {
            this.showToast('No hay una ficha abierta para descargar', 'error');
            return;
        }

        const btn = document.getElementById('btn-download-ficha');
        const originalHTML = btn ? btn.innerHTML : '';
        const originalDisabled = btn ? btn.disabled : false;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> Generando PDF...';
            }

            await this.ensurePdfLibraries();

            const html2canvasLib = window.html2canvas;
            const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;

            if (!html2canvasLib || !jsPDFCtor) {
                throw new Error('No se pudo preparar el generador de PDF.');
            }

            const modalContent = document.getElementById('modal-content');
            const fichaContent = document.getElementById('modal-ficha-content');

            if (!modalContent || !fichaContent) {
                throw new Error('No se encontró el contenido de la ficha.');
            }

            const captureNode = modalContent.cloneNode(true);
            captureNode.classList.remove('scale-95', 'opacity-0', 'scale-100', 'opacity-100');
            captureNode.style.transform = 'none';
            captureNode.style.opacity = '1';
            captureNode.style.maxHeight = 'none';
            captureNode.style.overflow = 'visible';
            captureNode.style.width = `${Math.max(960, Math.ceil(modalContent.getBoundingClientRect().width || 960))}px`;
            captureNode.querySelectorAll('button').forEach((el) => el.remove());

            const originalChartCanvas = document.getElementById('modal-chart');
            const clonedChartCanvas = captureNode.querySelector('#modal-chart');
            if (originalChartCanvas && clonedChartCanvas) {
                try {
                    const chartImage = document.createElement('img');
                    chartImage.src = originalChartCanvas.toDataURL('image/png');
                    chartImage.alt = 'Gráfica de tendencia';
                    chartImage.style.width = `${originalChartCanvas.width}px`;
                    chartImage.style.height = `${originalChartCanvas.height}px`;
                    chartImage.style.display = 'block';
                    chartImage.style.maxWidth = '100%';
                    clonedChartCanvas.replaceWith(chartImage);
                } catch (chartError) {



                }
            }

            const bodyClone = captureNode.querySelector('#modal-ficha-content');
            if (bodyClone) {
                bodyClone.style.overflow = 'visible';
                bodyClone.style.maxHeight = 'none';
            }

            const captureHost = document.createElement('div');
            captureHost.style.position = 'absolute';
            captureHost.style.left = '0';
            captureHost.style.top = '0';
            captureHost.style.zIndex = '-1';
            captureHost.style.background = '#ffffff';
            captureHost.style.padding = '16px';
            captureHost.style.pointerEvents = 'none';
            captureHost.style.width = `${captureNode.getBoundingClientRect().width + 32}px`;
            captureHost.appendChild(captureNode);
            document.body.appendChild(captureHost);

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            await new Promise((resolve) => requestAnimationFrame(resolve));
            await new Promise((resolve) => requestAnimationFrame(resolve));

            const canvas = await html2canvasLib(captureNode, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                width: captureNode.getBoundingClientRect().width,
                windowWidth: captureNode.getBoundingClientRect().width,
                windowHeight: captureHost.scrollHeight
            });

            const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const printableWidth = pageWidth - margin * 2;
            const printableHeight = pageHeight - margin * 2;

            const imageWidthMm = printableWidth;
            const imageHeightMm = (canvas.height * imageWidthMm) / canvas.width;
            const finalWidthMm = imageHeightMm > printableHeight
                ? (printableHeight * canvas.width) / canvas.height
                : imageWidthMm;
            const finalHeightMm = imageHeightMm > printableHeight
                ? printableHeight
                : imageHeightMm;
            const x = margin + (printableWidth - finalWidthMm) / 2;
            const y = margin + (printableHeight - finalHeightMm) / 2;

            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', x, y, finalWidthMm, finalHeightMm);

            const safeCode = (this.currentModalIndicator.code || 'ficha').replace(/[^a-z0-9]+/gi, '_');
            pdf.save(`ficha_${safeCode}.pdf`);

            this.showToast('Ficha descargada correctamente', 'success');

            setTimeout(() => captureHost.remove(), 0);
        } catch (error) {
            console.error('Error descargando ficha:', error);
            this.showToast(`No se pudo descargar la ficha: ${error.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = originalDisabled;
                btn.innerHTML = originalHTML;
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('detail-modal');
        const modalContent = document.getElementById('modal-content');

        if (modalContent) {
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
        }

        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            this.currentModalIndicator = null;
        }, 300);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg text-white text-sm font-medium z-50 transition-all duration-300 transform translate-y-0 ${
            type === 'error' ? 'bg-red-600' : 
            type === 'success' ? 'bg-green-600' : 
            'bg-primary'
        }`;
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">
                    ${type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}
                </span>
                ${message}
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    handleSearch(query) {
        this.applyFilters();
    }

    applyFilters() {
        const searchTerm = document.getElementById('search-indicators')?.value.toLowerCase().trim() || '';
        
        this.filteredIndicators = this.indicators.filter(indicator => {
            const matchesSearch = !searchTerm || 
                indicator.title.toLowerCase().includes(searchTerm) ||
                indicator.code.toLowerCase().includes(searchTerm) ||
                indicator.proceso.toLowerCase().includes(searchTerm);
            
            const matchesType = this.currentTypeFilter === 'all' || indicator.type === this.currentTypeFilter;
            
            return matchesSearch && matchesType;
        });

        this.renderIndicators();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    showError(message) {
        const container = document.getElementById('indicators-container');
        if (container) {
            container.innerHTML = `
                <div class="indicators-empty col-span-full text-center py-16">
                    <span class="material-symbols-outlined text-6xl mb-4 text-red-500">error</span>
                    <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Error</h3>
                    <p class="text-slate-500">${message}</p>
                </div>
            `;
        }
        
        const facultyNameEl = document.getElementById('faculty-name');
        if (facultyNameEl) {
            facultyNameEl.textContent = 'Error al cargar facultad';
        }
    }
}

let processMapIndicador;
document.addEventListener('DOMContentLoaded', () => {
    processMapIndicador = new ProcessMapIndicador();
});
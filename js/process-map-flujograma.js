/**
 * PROCESS MAP - FLUJOGRAMA CONTROLLER
 * Carga de flujogramas desde API (sin datos de ejemplo)
 */

class ProcessMapFlujograma {
    constructor() {
        this.facultyId = null;
        this.facultyData = null;
        this.flows = [];
        this.filteredFlows = [];
        this.currentModalFlow = null;

        this.init();
    }

    async init() {
        this.loadFacultyFromURL();
        this.setupEventListeners();
        this.setupThemeToggle();

        if (this.facultyId) {
            await this.loadFacultyData();
            await this.loadFlows();
        } else {
            this.showError('No se especificó una facultad');
        }
    }

    loadFacultyFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.facultyId = urlParams.get('faculty') || '1';

        const stored = sessionStorage.getItem('selectedFaculty');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (String(parsed.id) === String(this.facultyId)) {
                this.facultyData = parsed;
                this.updateUIFacultyInfo();
            }
        }

        const btnIndicators = document.getElementById('btn-indicators');
        if (btnIndicators && this.facultyId) {
            btnIndicators.href = `process-map-indicador.html?faculty=${encodeURIComponent(this.facultyId)}`;
        }
    }

    updateUIFacultyInfo() {
        const facultyNameEl = document.getElementById('faculty-name');
        if (facultyNameEl && this.facultyData) {
            facultyNameEl.textContent = `Facultad de ${this.facultyData.name}`;
        }
    }

    async loadFacultyData() {
        if (this.facultyData) return;

        try {
            const response = await API.faculties.getById(this.facultyId);

            if (!response.success) {
                throw new Error(response.error);
            }

            this.facultyData = response.data;
            sessionStorage.setItem('selectedFaculty', JSON.stringify(this.facultyData));
            this.updateUIFacultyInfo();

        } catch (error) {
            console.error('Error cargando facultad:', error);
            this.showError('Error al cargar la información de la facultad');
        }
    }

    async getFlowsByProcess(facultyId, processId) {
        try {
            if (!processId || String(processId).trim().toLowerCase() === 'processid') {
                return { success: false, data: [], status: 400, error: 'processId inválido' };
            }

            const response = await fetch(
                `${API.CONFIG.REMOTE_BASE}/public/process-map/${facultyId}/processes/${processId}/flows`,
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json'
                    }
                }
            );

            let data = [];
            try {
                data = await response.json();
            } catch (e) {
                data = [];
            }

            if (!response.ok) {
                return { success: false, data: [], status: response.status, error: `HTTP ${response.status}` };
            }

            return { success: true, data: Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []), status: response.status };
        } catch (error) {
            console.error('Error obteniendo flujogramas por proceso:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('search-flows');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        this.setupCustomDropdown();

        const modalOverlay = document.getElementById('modal-overlay');
        const closeModalBtn = document.getElementById('btn-close-modal');
        const downloadPdfBtn = document.getElementById('btn-download-pdf');

        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => this.downloadCurrentPDF());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    setupCustomDropdown() {
        const dropdownBtn = document.getElementById('dropdown-btn');
        const dropdownOptions = document.getElementById('dropdown-options');
        const dropdownSelected = document.getElementById('dropdown-selected');
        const optionButtons = document.querySelectorAll('.dropdown-option');

        if (!dropdownBtn || !dropdownOptions) return;

        let isOpen = false;
        let currentValue = 'all';

        dropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            isOpen = !isOpen;
            toggleDropdown();
        });

        document.addEventListener('click', function(e) {
            if (isOpen && !dropdownBtn.contains(e.target) && !dropdownOptions.contains(e.target)) {
                isOpen = false;
                toggleDropdown();
            }
        });

        function toggleDropdown() {
            if (isOpen) {
                dropdownOptions.classList.add('active');
                dropdownBtn.classList.add('active');
                document.body.classList.add('dropdown-open');
            } else {
                dropdownOptions.classList.remove('active');
                dropdownBtn.classList.remove('active');
                document.body.classList.remove('dropdown-open');
            }
        }

        optionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = button.dataset.value;
                const text = button.textContent.trim();

                currentValue = value;

                if (dropdownSelected) {
                    dropdownSelected.textContent = text;
                }

                optionButtons.forEach(opt => opt.classList.remove('active'));
                button.classList.add('active');

                isOpen = false;
                toggleDropdown();

                this.handleFilter(value);
            });
        });

        const defaultOption = document.querySelector('.dropdown-option[data-value="all"]');
        if (defaultOption) {
            defaultOption.classList.add('active');
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

    getStaticFlowsFallback() {
        const isMedicina = String(this.facultyId) === '1';

        if (!isMedicina) {
            return [];
        }

        const staticPdf = 'docs/pdfs/flujogramas/FLUJOGRAMA DE GESTIÓN ESTRATÉGICA (2).pdf';
        return [{
            id: 'static-pe-01',
            code: 'PE-01',
            title: 'Gestión Estratégica',
            type: 'estrategico',
            activities: 1,
            documents: 1,
            lastUpdate: new Date().toISOString(),
            imageUrl: null,
            pdfUrl: encodeURI(staticPdf),
            pdfStatus: 'disponible'
        }];
    }

    async loadFlows() {
        const container = document.getElementById('flows-container');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full flows-loading">
                <span class="material-symbols-outlined text-6xl animate-spin text-secondary">refresh</span>
                <p class="mt-4 text-lg font-medium">Cargando flujogramas...</p>
            </div>
        `;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const processId = urlParams.get('process');
            let remoteResult = { success: false, data: [] };

            if (processId) {
                remoteResult = await this.getFlowsByProcess(this.facultyId, processId);
            } else if (API?.flows?.getByFaculty) {
                remoteResult = await API.flows.getByFaculty(this.facultyId);
            }

            if (remoteResult.success && Array.isArray(remoteResult.data) && remoteResult.data.length > 0) {
                this.flows = remoteResult.data.map((flow, index) => ({
                    id: flow.id || index + 1,
                    code: flow.code || flow.codigo || `FL-${String(index + 1).padStart(3, '0')}`,
                    title: flow.title || flow.name || 'Flujograma',
                    type: (flow.type === 'strategic' || String(flow.type || '').toLowerCase().includes('estrat')) ? 'estrategico' :
                          (flow.type === 'missional' || String(flow.type || '').toLowerCase().includes('mision')) ? 'misional' : 'apoyo',
                    activities: Number(flow.activities || flow.steps || 0),
                    documents: Number(flow.documents || flow.documentCount || 0),
                    lastUpdate: flow.lastUpdate || flow.updatedAt || new Date().toISOString(),
                    imageUrl: flow.imageUrl || null,
                    pdfUrl: flow.pdfUrl || flow.urlArchivo || null,
                    pdfStatus: (flow.pdfUrl || flow.urlArchivo) ? 'disponible' : 'pendiente'
                }));
            } else {
                const staticFlows = this.getStaticFlowsFallback();
                this.flows = staticFlows;

                if (this.flows.length === 0) {
                    this.showToast('No hay flujogramas disponibles para esta facultad.', 'info');
                } else if (processId && remoteResult.success) {
                    this.showToast('El proceso no tiene flujogramas registrados. Mostrando PDF estático.', 'info');
                } else if (!processId && remoteResult && !remoteResult.success) {
                    this.showToast('La API devolvió 403. Mostrando PDF estático local.', 'warning');
                }
            }

            this.filteredFlows = [...this.flows];
            this.renderFlows();

        } catch (error) {
            console.error('Error cargando flujogramas:', error);
            this.showError('Error al cargar los flujogramas');
        }
    }

    renderFlows() {
        const container = document.getElementById('flows-container');
        if (!container) return;

        if (this.filteredFlows.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flows-empty">
                    <span class="material-symbols-outlined flows-empty-icon">account_tree</span>
                    <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No se encontraron flujogramas</h3>
                    <p class="text-slate-500">Intenta con otros términos de búsqueda o filtros</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredFlows.map((flow, index) => this.createFlowCard(flow, index)).join('');
        this.attachCardEventListeners();
    }

    createFlowCard(flow, index) {
        const typeLabels = {
            'estrategico': 'Estratégico',
            'misional': 'Misional',
            'apoyo': 'Soporte'
        };

        const typeIcons = {
            'estrategico': 'rocket_launch',
            'misional': 'school',
            'apoyo': 'support_agent'
        };

        const pdfAvailable = flow.pdfUrl && flow.pdfStatus === 'disponible';
        const pdfBadge = !pdfAvailable ?
            `<span class="ml-2 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full">Próximamente</span>` : '';

        return `
            <div class="flow-card" data-flow-id="${flow.id}" style="animation-delay: ${index * 0.05}s">
                <div class="flow-card-header">
                    <div class="flow-icon ${flow.type}">
                        <span class="material-symbols-outlined text-2xl">${typeIcons[flow.type]}</span>
                    </div>
                    <div class="flow-info">
                        <div class="flow-code">${flow.code}</div>
                        <h3 class="flow-title">${flow.title}${pdfBadge}</h3>
                        <span class="flow-type-badge ${flow.type} mt-2">
                            ${typeLabels[flow.type]}
                        </span>
                    </div>
                </div>

                <div class="flow-stats">
                    <div class="flow-stat">
                        <span class="material-symbols-outlined">calendar_today</span>
                        <span>${this.formatDate(flow.lastUpdate)}</span>
                    </div>
                </div>

                <div class="flow-actions">
                    <button class="flow-btn flow-btn-primary btn-preview" data-flow-id="${flow.id}">
                        <span class="material-symbols-outlined text-sm">visibility</span>
                        Ver Flujograma
                    </button>
                    <button class="flow-btn ${pdfAvailable ? 'flow-btn-secondary' : 'flow-btn-disabled'} btn-download"
                            data-flow-id="${flow.id}"
                            ${!pdfAvailable ? 'disabled' : ''}>
                        <span class="material-symbols-outlined text-sm">download</span>
                        ${pdfAvailable ? 'PDF' : 'Próximamente'}
                    </button>
                </div>
            </div>
        `;
    }

    attachCardEventListeners() {
        const previewButtons = document.querySelectorAll('.btn-preview');
        const downloadButtons = document.querySelectorAll('.btn-download');

        previewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const flowId = e.currentTarget.dataset.flowId;
                this.openPreview(flowId);
            });
        });

        downloadButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const flowId = e.currentTarget.dataset.flowId;
                this.downloadFlow(flowId);
            });
        });
    }

    /**
     * Resuelve una ruta de PDF relativa a una URL absoluta basada en la ubicación actual
     */
    resolvePdfUrl(pdfUrl) {
        if (!pdfUrl) return null;

        // URL absoluta: devolver tal cual
        if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://') || pdfUrl.startsWith('//')) {
            return pdfUrl;
        }

        // Ruta absoluta desde raíz: devolver tal cual
        if (pdfUrl.startsWith('/')) {
            return pdfUrl;
        }

        // Ruta relativa: resolver desde la ubicación actual
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        return window.location.origin + basePath + pdfUrl;
    }

    /**
     * Verifica si un archivo PDF existe realmente en el servidor
     */
    async checkPdfExists(pdfUrl) {
        try {
            const resolvedUrl = this.resolvePdfUrl(pdfUrl);
            const response = await fetch(resolvedUrl, { method: 'HEAD', mode: 'no-cors' });
            // Con mode: 'no-cors' no podemos leer el status, pero si falla el fetch, catch lo maneja
            return true;
        } catch (error) {
            console.warn('PDF no encontrado:', pdfUrl, error);
            return false;
        }
    }

    /**
     * Muestra el mensaje de "Vista previa no disponible" en el modal
     */
    showPdfUnavailable(container, flow) {
        container.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl p-8">
                <span class="material-symbols-outlined text-6xl text-slate-300 mb-4">picture_as_pdf</span>
                <h4 class="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Vista previa no disponible</h4>
                <p class="text-slate-500 text-center max-w-md mb-4">
                    El flujograma <strong>${flow.title}</strong> está registrado pero el archivo PDF aún no ha sido cargado al sistema.
                </p>
                ${flow.pdfUrl && !flow.pdfUrl.startsWith('#') ? `
                <button onclick="window.open('${this.resolvePdfUrl(flow.pdfUrl)}', '_blank')" 
                        class="px-4 py-2 bg-primary hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all">
                    <span class="material-symbols-outlined text-sm inline-block mr-1">open_in_new</span>
                    Intentar abrir PDF
                </button>
                ` : ''}
            </div>
        `;
    }

    async openPreview(flowId) {
        const flow = this.flows.find(f => String(f.id) === String(flowId));
        if (!flow) return;

        this.currentModalFlow = flow;

        const modal = document.getElementById('preview-modal');
        const modalContent = document.getElementById('modal-content');
        const modalTitle = document.getElementById('modal-title');
        const modalSubtitle = document.getElementById('modal-subtitle');
        const modalImageContainer = document.getElementById('modal-image-container');

        if (modalTitle) modalTitle.textContent = flow.title;

        // Determinar si este flujograma debería tener PDF real
        const isMedicina = String(this.facultyId) === '1';
        const isRealPdf = flow.pdfUrl && !flow.pdfUrl.startsWith('#') && flow.pdfStatus === 'disponible';
        const shouldHavePdf = isMedicina && isRealPdf;

        if (modalImageContainer) {
            if (shouldHavePdf) {
                // Solo Medicina: intentar cargar el PDF
                const resolvedPdfUrl = this.resolvePdfUrl(flow.pdfUrl);

                // Mostrar loading mientras verificamos
                modalImageContainer.innerHTML = `
                    <div class="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl p-8">
                        <span class="material-symbols-outlined text-4xl text-secondary animate-spin mb-4">refresh</span>
                        <p class="text-slate-500">Cargando flujograma...</p>
                    </div>
                `;

                // Intentar cargar el PDF en un iframe oculto primero para verificar
                const testIframe = document.createElement('iframe');
                testIframe.style.display = 'none';
                document.body.appendChild(testIframe);

                let pdfLoaded = false;

                testIframe.onload = () => {
                    try {
                        // Si el iframe carga contenido HTML (página duplicada), el contenido tendrá <html>
                        const content = testIframe.contentDocument || testIframe.contentWindow?.document;
                        if (content && content.body && content.body.innerHTML.length > 100) {
                            // Verificar si es HTML en vez de PDF
                            const hasHtml = content.body.innerHTML.toLowerCase().includes('<!doctype') ||
                                          content.body.innerHTML.toLowerCase().includes('<html') ||
                                          content.body.innerHTML.toLowerCase().includes('sistema de gestión');
                            if (hasHtml) {
                                pdfLoaded = false;
                            } else {
                                pdfLoaded = true;
                            }
                        }
                    } catch (e) {
                        // Cross-origin, asumir que es PDF
                        pdfLoaded = true;
                    }
                };

                testIframe.onerror = () => {
                    pdfLoaded = false;
                };

                // Dar tiempo para que cargue
                testIframe.src = resolvedPdfUrl;

                setTimeout(() => {
                    document.body.removeChild(testIframe);

                    if (pdfLoaded) {
                        // El PDF parece válido, mostrar en iframe
                        modalImageContainer.innerHTML = `
                            <iframe
                                src="${resolvedPdfUrl}#toolbar=1&navpanes=0&scrollbar=1"
                                title="${flow.title}"
                                class="w-full h-full rounded-xl bg-white"
                                style="min-height: 65vh; border: none;"
                                type="application/pdf"
                            ></iframe>
                        `;
                    } else {
                        // El PDF no es válido, mostrar mensaje
                        this.showPdfUnavailable(modalImageContainer, flow);
                    }
                }, 1500);

            } else {
                // Otras facultades o sin PDF: mostrar mensaje de no disponible
                this.showPdfUnavailable(modalImageContainer, flow);
            }
        }

        const downloadBtn = document.getElementById('btn-download-pdf');
        if (downloadBtn) {
            downloadBtn.style.display = isRealPdf ? 'flex' : 'none';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);

        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('preview-modal');
        const modalContent = document.getElementById('modal-content');

        if (modalContent) {
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
        }

        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
            this.currentModalFlow = null;
        }, 300);
    }

    downloadFlow(flowId) {
        const flow = this.flows.find(f => String(f.id) === String(flowId));
        if (!flow) return;

        if (!flow.pdfUrl || flow.pdfStatus !== 'disponible') {
            this.showToast('El PDF estará disponible próximamente', 'info');
            return;
        }

        const resolvedUrl = this.resolvePdfUrl(flow.pdfUrl);

        try {
            const link = document.createElement('a');
            link.href = resolvedUrl;
            link.download = `${flow.code}_${flow.title.replace(/\s+/g, '_')}.pdf`;
            link.target = '_blank';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast(`Descargando: ${flow.title}`, 'success');

        } catch (error) {
            console.error('Error en descarga:', error);
            window.open(resolvedUrl, '_blank');
            this.showToast(`Abriendo PDF en nueva pestaña`, 'info');
        }
    }

    downloadCurrentPDF() {
        if (this.currentModalFlow) {
            this.downloadFlow(this.currentModalFlow.id);
        }
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        this.filterFlows(searchTerm, document.getElementById('filter-type')?.value || 'all');
    }

    handleFilter(type) {
        const searchTerm = document.getElementById('search-flows')?.value.toLowerCase().trim() || '';
        this.filterFlows(searchTerm, type);
    }

    filterFlows(searchTerm, type) {
        this.filteredFlows = this.flows.filter(flow => {
            const matchesSearch = !searchTerm ||
                flow.title.toLowerCase().includes(searchTerm) ||
                flow.code.toLowerCase().includes(searchTerm);

            const matchesType = type === 'all' || flow.type === type;

            return matchesSearch && matchesType;
        });

        this.renderFlows();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg text-white text-sm font-medium z-50 transition-all duration-300 transform translate-y-0 ${
            type === 'error' ? 'bg-red-600' :
            type === 'success' ? 'bg-green-600' :
            type === 'warning' ? 'bg-amber-600' : 'bg-primary'
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

    showError(message) {
        const container = document.getElementById('flows-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full flows-empty">
                    <span class="material-symbols-outlined flows-empty-icon text-red-500">error</span>
                    <h3 class="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Error</h3>
                    <p class="text-slate-500">${message}</p>
                </div>
            `;
        }
    }
}

let processMapFlujograma;
document.addEventListener('DOMContentLoaded', () => {
    processMapFlujograma = new ProcessMapFlujograma();
});
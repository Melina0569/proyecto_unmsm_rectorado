// views.js - Gestión de vistas Grid/Lista, paginación y expansión
async function getFaculties() {

    try {

        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token') || localStorage.getItem('token');

        const headers = {
            "Accept": "application/json"
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(
            "http://localhost:8080/v1/public/faculties?page=1&limit=20",
            {
                method: "GET",
                headers
            }
        );

        if (!response.ok) {
            throw new Error("Error obteniendo facultades");
        }

        const payload = await response.json();
        const data = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);

        // Mapeo frontend
        const mappedFaculties = data.map(f => ({

            id: f.id,

            name: f.shortName || f.name,

            code: f.code,

            icon: getFacultyIcon(f.code),

            color: getFacultyColor(f.code),

            indicators: f.stats?.indicatorsCount || 0,

            flows: f.stats?.flowsCount || 0,

            processes: f.stats?.processesCount || 0
        }));

        console.log(mappedFaculties);

        return mappedFaculties;

    } catch (error) {

        console.error(error);

        return [];
    }
}

function getFacultyIcon(code) {

    const icons = {
        FM: 'medical_services',
        FDCP: 'gavel',
        FLCH: 'history_edu',
        FFB: 'vaccines',
        FO: 'health_and_safety',
        FE: 'school',
        FQIQ: 'science',
        FMV: 'pets',
        FCA: 'work',
        FCB: 'biotech',
        FCC: 'money_bag',
        FCE: 'trending_up',
        FCF: 'antigravity',
        FCM: 'calculate',
        FCCSS: 'groups',
        FIGMMG: 'terrain',
        FII: 'precision_manufacturing',
        FP: 'psychology',
        FIEE: 'electrical_services',
        FISI: 'computer',

    };

    return icons[code] || 'school';
}

function getFacultyColor(code) {

    const colors = {
        FM: 'red',
        FDCP: 'indigo',
        FLCH: 'amber',
        FFB: 'cyan',
        FO: 'teal',
        FE: 'emerald',
        FQIQ: 'lime',
        FMV: 'orange',
        FCA: 'purple',
        FCB: 'green',
        FCC: 'pink',
        FCE: 'yellow',
        FCF: 'violet',
        FCM: 'blue',
        FCCSS: 'rose',
        FIGMMG: 'stone',
        FII: 'slate',
        FP: 'fuchsia',
        FIEE: 'amber',
        FISI: 'sky',
    };

    return colors[code] || 'blue';
}

const FacultyViews = {
    // Configuración
    config: {
        itemsPerPage: 6,
        currentPage: 1,
        currentView: 'grid', // 'grid' o 'list'
        expanded: false, // Mostrar todas las facultades
        totalFaculties: 20
    },


    //Datos de las 20 facultades
    /**faculties: [
        {id: 1, name: 'Medicina', code: 'FM', icon: 'medical_services', color: 'red', indicators: 12, flows: 8, processes: 5 },
        {id: 2, name: 'Derecho y Ciencia Política', code: 'FDCP', icon: 'gavel', color: 'indigo', indicators: 12, flows: 8, processes: 5 },
        {id: 3, name: 'Letras y Ciencias Humanas', code: 'FLCH', icon: 'history_edu', color: 'amber', indicators: 10, flows: 12, processes: 7 },
        {id: 4, name: 'Farmacia y Bioquímica', code: 'FFB', icon: 'vaccines', color: 'cyan', indicators: 13, flows: 8, processes: 5 },
        {id: 5, name: 'Odontología', code: 'FO', icon: 'health_and_safety', color: 'teal', indicators: 11, flows: 7, processes: 4 },
        {id: 6, name: 'Educación', code: 'FE', icon: 'school', color: 'emerald', indicators: 17, flows: 12, processes: 8 },
        {id: 7, name: 'Química e Ingeniería Química', code: 'FQIQ', icon: 'science', color: 'lime', indicators: 11, flows: 8, processes: 5 },
        {id: 8, name: 'Medicina Veterinaria', code: 'FMV', icon: 'pets', color: 'orange', indicators: 14, flows: 9, processes: 6 },
        {id: 9, name: 'Ciencias Administrativas', code: 'FCA', icon: 'work', color: 'purple', indicators: 12, flows: 8, processes: 5 },
        {id: 10, name: 'Ciencias Biológicas', code: 'FCB', icon: 'biotech', color: 'green', indicators: 15, flows: 6, processes: 4 },
        {id: 11, name: 'Ciencias Contables', code: 'FCC', icon: 'money_bag', color: 'pink', indicators: 15, flows: 6, processes: 4 },
        {id: 12, name: 'Ciencias Económicas', code: 'FCE', icon: 'trending_up', color: 'yellow', indicators: 14, flows: 10, processes: 6 },
        {id: 13, name: 'Ciencias Físicas', code: 'FCF', icon: 'antigravity', color: 'violet', indicators: 10, flows: 7, processes: 4 },
        {id: 14, name: 'Ciencias Matemáticas', code: 'FCM', icon: 'calculate', color: 'blue', indicators: 12, flows: 8, processes: 5 },
        {id: 15, name: 'Ciencias Sociales', code: 'FCCSS', icon: 'groups', color: 'rose', indicators: 13, flows: 9, processes: 6 },
        {id: 16, name: 'Ingeniería Geológica, Minera, Metalúrgica y Geográfica', code: 'FIGMMG', icon: 'terrain', color: 'stone', indicators: 9, flows: 10, processes: 6 },
        {id: 17, name: 'Ingeniería Industrial', code: 'FII', icon: 'precision_manufacturing', color: 'slate', indicators: 15, flows: 9, processes: 6 },
        {id: 18, name: 'Psicología', code: 'FP', icon: 'psychology', color: 'fuchsia', indicators: 16, flows: 8, processes: 5 },
        {id: 19, name: 'Ingeniería Eléctrica y Electrónica', code: 'FIEE', icon: 'electrical_services', color: 'amber', indicators: 16, flows: 11, processes: 7 },
        {id: 20, name: 'Ingeniería de Sistemas e Informática', code: 'FISI', icon: 'computer', color: 'sky', indicators: 18, flows: 14, processes: 8 },
    ],**/
    
    faculties : [],

    // Inicialización
    async init() {

    this.cacheDOM();
    this.bindEvents();

    // Obtener facultades desde API
    this.faculties = await getFaculties();

    // Actualizar total dinámicamente
    this.config.totalFaculties = this.faculties.length;

    this.render();
    },

    // Cachear elementos DOM
    cacheDOM() {
        this.container = document.getElementById('faculties-container');
        this.btnGrid = document.getElementById('btn-grid');
        this.btnList = document.getElementById('btn-list');
        this.paginationContainer = document.getElementById('pagination');
        this.showingText = document.getElementById('showing-text');
        this.btnExpand = document.getElementById('btn-expand');
    },

    // Event listeners
    bindEvents() {
        // Toggle Grid/List
        this.btnGrid?.addEventListener('click', () => this.setView('grid'));
        this.btnList?.addEventListener('click', () => this.setView('list'));

        // Paginación
        this.paginationContainer?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-page]');
            if (btn && !btn.disabled) {
                const page = parseInt(btn.dataset.page);
                if (page) this.goToPage(page);
            }
        });

        // Expandir/Colapsar
        this.btnExpand?.addEventListener('click', () => this.toggleExpand());
    },

    // Cambiar vista
    setView(view) {
        if (this.config.currentView === view) return;
        
        this.config.currentView = view;
        this.config.currentPage = 1; // Reset a página 1
        
        // Actualizar botones
        this.btnGrid?.classList.toggle('active', view === 'grid');
        this.btnList?.classList.toggle('active', view === 'list');
        
        // Animación de transición
        this.container.style.opacity = '0';
        setTimeout(() => {
            this.render();
            this.container.style.opacity = '1';
        }, 200);
    },

    // Cambiar página
    goToPage(page) {
        if (page === this.config.currentPage) return;
        
        this.config.currentPage = page;
        
        // Scroll suave al contenedor
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        this.render();
    },

    // Expandir/Colapsar todas
    toggleExpand() {
        this.config.expanded = !this.config.expanded;
        
        const btnText = this.btnExpand?.querySelector('.btn-text');
        const btnIcon = this.btnExpand?.querySelector('.material-icons-round');
        
        if (this.config.expanded) {
            this.btnExpand?.classList.add('expanded');
            if (btnText) btnText.textContent = 'Mostrar menos facultades';
            if (btnIcon) btnIcon.textContent = 'expand_less';
        } else {
            this.btnExpand?.classList.remove('expanded');
            if (btnText) btnText.textContent = 'Ver todas las facultades';
            if (btnIcon) btnIcon.textContent = 'expand_more';
            this.config.currentPage = 1; // Volver a página 1
        }
        
        this.render();
    },

    // Obtener facultades a mostrar
    getFacultiesToShow() {
        if (this.config.expanded) {
            return this.faculties;
        }
        
        const start = (this.config.currentPage - 1) * this.config.itemsPerPage;
        const end = start + this.config.itemsPerPage;
        return this.faculties.slice(start, end);
    },

    // Renderizar todo
    render() {
        const faculties = this.getFacultiesToShow();
        
        if (this.config.currentView === 'grid') {
            this.renderGrid(faculties);
        } else {
            this.renderList(faculties);
        }
        
        this.updatePagination();
        this.updateShowingText();
    },

    // Renderizar Grid
    renderGrid(faculties) {
        const html = `
            <div class="view-grid">
                ${faculties.map(f => this.createGridCard(f)).join('')}
            </div>
        `;
        this.container.innerHTML = html;
    },

    // Crear card de Grid con 3 botones
    createGridCard(f) {
        const colorClasses = {
            red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
            green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
            amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
            purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
            indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
            orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
            cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
            teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
            stone: 'bg-stone-50 text-stone-600 dark:bg-stone-900/20 dark:text-stone-400',
            yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
            sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
            slate: 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400',
            lime: 'bg-lime-50 text-lime-600 dark:bg-lime-900/20 dark:text-lime-400',
            violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
            rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
            emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
            zinc: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-400',
            fuchsia: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400'
        };

        return `
            <article class="faculty-card group" data-id="${f.id}">
                <div class="faculty-card__header-bar bg-${f.color}-500"></div>
                <div class="faculty-card__content">
                    <div class="flex items-start justify-between mb-6">
                        <div class="w-14 h-14 ${colorClasses[f.color] || colorClasses.blue} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                            <span class="material-symbols-outlined text-3xl">${f.icon}</span>
                        </div>
                        <span class="px-3 py-1 bg-${f.color}-50 dark:bg-${f.color}-900/10 text-[10px] font-black rounded-full text-${f.color}-600 dark:text-${f.color}-400 border border-${f.color}-100 dark:border-${f.color}-900/20">
                            ${f.code} - UNMSM
                        </span>
                    </div>
                    <h3 class="text-xl font-bold mb-6 dark:text-white leading-tight h-14 line-clamp-2">${f.name}</h3>
                    <div class="faculty-card__stats">
                        <div>
                            <div class="text-2xl font-black text-primary dark:text-blue-400">${f.indicators}</div>
                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Indicadores</div>
                        </div>
                        <div class="border-x border-slate-200 dark:border-slate-700">
                            <div class="text-2xl font-black text-primary dark:text-blue-400">${f.flows}</div>
                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Flujogramas</div>
                        </div>
                        <div>
                            <div class="text-2xl font-black text-primary dark:text-blue-400">${f.processes}</div>
                            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Procesos</div>
                        </div>
                    </div>
                </div>
                <!-- TRES BOTONES: Flujogramas, Indicadores, Procesos -->
                <div class="faculty-card__actions faculty-card__actions--three">
                    <button class="btn-flows group/btn" onclick="FacultyViews.openFlows('${f.id}')">
                        <span class="material-symbols-outlined text-sm group-hover/btn:scale-125 transition-transform">account_tree</span>
                        Flujogramas
                    </button>
                    <button class="btn-indicators group/btn" onclick="FacultyViews.openIndicators('${f.id}')">
                        <span class="material-symbols-outlined text-sm group-hover/btn:scale-125 transition-transform">monitoring</span>
                        Indicadores
                    </button>
                    <button class="btn-processes group/btn" onclick="FacultyViews.openProcesses('${f.id}')">
                        <span class="material-symbols-outlined text-sm group-hover/btn:rotate-45 transition-transform">settings</span>
                        Procesos
                    </button>
                </div>
            </article>
        `;
    },

    // Renderizar Lista
    renderList(faculties) {
        const html = `
            <div class="view-list">
                <table>
                    <thead>
                        <tr>
                            <th>Facultad</th>
                            <th class="text-center">Indicadores</th>
                            <th class="text-center">Flujogramas</th>
                            <th class="text-center">Procesos</th>
                            <th class="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${faculties.map(f => this.createListRow(f)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        this.container.innerHTML = html;
    },

    // Crear fila de Lista con 3 botones
    createListRow(f) {
        const colorClasses = {
            red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
            green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
            amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
            purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
            indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
            orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
            cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
            teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
            stone: 'bg-stone-50 text-stone-600 dark:bg-stone-900/20 dark:text-stone-400',
            yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
            sky: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
            slate: 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400',
            lime: 'bg-lime-50 text-lime-600 dark:bg-lime-900/20 dark:text-lime-400',
            violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
            rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
            emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
            zinc: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-400',
            fuchsia: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400'
        };

        return `
            <tr data-color="${f.color}" data-id="${f.id}">
                <td>
                    <div class="faculty-info">
                        <div class="faculty-info__icon ${colorClasses[f.color] || colorClasses.blue}">
                            <span class="material-symbols-outlined">${f.icon}</span>
                        </div>
                        <div>
                            <div class="faculty-info__name">${f.name}</div>
                            <div class="faculty-info__code text-${f.color}-600 dark:text-${f.color}-400">${f.code} - UNMSM</div>
                        </div>
                    </div>
                </td>
                <td class="text-center">
                    <span class="stat-number">${f.indicators}</span>
                </td>
                <td class="text-center">
                    <span class="stat-number">${f.flows}</span>
                </td>
                <td class="text-center">
                    <span class="stat-number">${f.processes}</span>
                </td>
                <td>
                    <div class="actions actions--three">
                        <button class="btn-list-flows" onclick="FacultyViews.openFlows('${f.id}')" title="Flujogramas">
                            <span class="material-symbols-outlined text-sm">account_tree</span>
                        </button>
                        <button class="btn-list-indicators" onclick="FacultyViews.openIndicators('${f.id}')" title="Indicadores">
                            <span class="material-symbols-outlined text-sm">monitoring</span>
                        </button>
                        <button class="btn-list-processes" onclick="FacultyViews.openProcesses('${f.id}')" title="Procesos">
                            <span class="material-symbols-outlined text-sm">settings</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // Actualizar paginación
    updatePagination() {
        if (this.config.expanded) {
            this.paginationContainer.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(this.config.totalFaculties / this.config.itemsPerPage);
        const current = this.config.currentPage;
        
        let html = '';
        
        // Botón anterior
        html += `
        <button class="pagination__btn" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>
            <span class="material-icons-round">chevron_left</span>
        </button>
        `;
        
        // Primera página
        if (current > 2) {
            html += `<button class="pagination__btn" data-page="1">1</button>`;
            if (current > 3) {
                html += `<span class="pagination__ellipsis">...</span>`;
            }
        }
        
        // Páginas alrededor de la actual
        for (let i = Math.max(1, current - 1); i <= Math.min(totalPages, current + 1); i++) {
            html += `
                <button class="pagination__btn ${i === current ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Última página
        if (current < totalPages - 1) {
            if (current < totalPages - 2) {
                html += `<span class="pagination__ellipsis">...</span>`;
            }
            html += `<button class="pagination__btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // Botón siguiente
        html += `
            <button class="pagination__btn" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>
                <span class="material-icons-round">chevron_right</span>
            </button>
        `;
        
        this.paginationContainer.innerHTML = html;
    },

    // Actualizar texto "Mostrando X de Y"
    updateShowingText() {
        if (!this.showingText) return;
        
        if (this.config.expanded) {
            this.showingText.innerHTML = `Mostrando <span class="text-primary dark:text-white font-bold">todas las ${this.config.totalFaculties}</span> facultades`;
        } else {
            const start = (this.config.currentPage - 1) * this.config.itemsPerPage + 1;
            const end = Math.min(start + this.config.itemsPerPage - 1, this.config.totalFaculties);
            this.showingText.innerHTML = `Mostrando <span class="text-primary dark:text-white font-bold">${start}-${end}</span> de <span class="text-primary dark:text-white font-bold">${this.config.totalFaculties}</span> facultades`;
        }
    },

    // NAVEGACIÓN - Tres métodos para los tres botones
    
    openFlows(id) {
        const faculty = this.faculties.find(f => f.id === id);
        if (!faculty) return;
        
        sessionStorage.setItem('selectedFaculty', JSON.stringify(faculty));
        window.location.href = `process-map-flujograma.html?faculty=${id}`;
    },

    openIndicators(id) {
        const faculty = this.faculties.find(f => f.id === id);
        if (!faculty) return;
        
        sessionStorage.setItem('selectedFaculty', JSON.stringify(faculty));
        window.location.href = `process-map-indicador.html?faculty=${id}`;
    },

    openProcesses(id) {
        const faculty = this.faculties.find(f => f.id === id);
        if (!faculty) return;
        
        sessionStorage.setItem('selectedFaculty', JSON.stringify(faculty));
        window.location.href = `process-map.html?faculty=${id}`;
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => FacultyViews.init());
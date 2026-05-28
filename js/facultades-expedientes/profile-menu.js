(function () {
    const PERFIL_FALLBACK = {
        nombre: 'Usuario SIGPRO',
        email: 'usuario@unmsm.edu.pe',
        iniciales: 'US',
        rol: 'Usuario',
        facultad: 'UNMSM',
        color: 'bg-blue-600'
    };

    function initialsFromName(nombre) {
        if (!nombre || typeof nombre !== 'string') return 'US';
        const parts = nombre.trim().split(/\s+/).slice(0, 2);
        return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'US';
    }

    function getCargoOrRol(user) {
        return user?.cargo
            || user?.cargoNombre
            || user?.puesto
            || user?.rol
            || user?.role
            || 'Usuario';
    }

    function getNombreFacultad(user) {
        const facultadRaw = user?.facultad || user?.faculty;
        if (typeof facultadRaw === 'string' && facultadRaw.trim()) return facultadRaw;
        if (facultadRaw && typeof facultadRaw === 'object') {
            return facultadRaw.nombre
                || facultadRaw.descripcion
                || facultadRaw.name
                || 'UNMSM';
        }
        return user?.facultadNombre
            || user?.nombreFacultad
            || user?.nombre_facultad
            || user?.facultadName
            || user?.facultad_id_nombre
            || 'UNMSM';
    }

    function findProfileSource() {
        const raw = localStorage.getItem('usuario')
            || localStorage.getItem('sigpro_usuario')
            || localStorage.getItem('usuario_actual')
            || localStorage.getItem('user')
            || localStorage.getItem('unmsm_user');
        if (raw) {
            try {
                const user = JSON.parse(raw);
                if (user && typeof user === 'object') {
                    const email = user.email || user.correo || 'usuario@unmsm.edu.pe';
                    const nombreCompleto = (user.nombreCompleto || user.nombre || user.name || email.split('@')[0] || 'Usuario SIGPRO')
                        .replace(/\./g, ' ')
                        .trim();
                    return {
                        nombre: nombreCompleto,
                        email,
                        iniciales: user.iniciales || initialsFromName(nombreCompleto),
                        rol: getCargoOrRol(user),
                        facultad: getNombreFacultad(user),
                        color: user.color || 'bg-blue-600'
                    };
                }
            } catch (error) {
                // Ignore invalid JSON and use next fallback.
            }
        }

        return PERFIL_FALLBACK;
    }

    async function resolveProfile() {
        try {
            if (typeof API !== 'undefined' && API.auth && typeof API.auth.getUser === 'function') {
                const res = await Promise.resolve(API.auth.getUser());
                const data = res && res.success && res.data ? res.data : res;
                if (data && typeof data === 'object') {
                    const email = data.email || data.correo || 'usuario@unmsm.edu.pe';
                    const nombreCompleto = (data.nombreCompleto || data.nombre || data.name || email.split('@')[0] || 'Usuario SIGPRO')
                        .replace(/\./g, ' ')
                        .trim();
                    return {
                        nombre: nombreCompleto,
                        email,
                        iniciales: data.iniciales || initialsFromName(nombreCompleto),
                        rol: getCargoOrRol(data),
                        facultad: getNombreFacultad(data),
                        color: data.color || 'bg-blue-600'
                    };
                }
            }
        } catch (error) {
            // Silent fallback.
        }
        return findProfileSource();
    }

    function ensureProfileMarkup() {
        const controls = document.querySelector('header .flex.items-center.gap-4');
        if (!controls) return;

        const oldButton = controls.querySelector('button[aria-label="Perfil"]');
        if (!oldButton) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'relative';
        wrapper.id = 'profile-container';
        wrapper.innerHTML = [
            '<button id="profile-btn" type="button" class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary transition-colors">',
            '  <span class="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm">person</span>',
            '</button>',
            '<div id="profile-dropdown" class="hidden absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">',
            '  <div class="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">',
            '    <div class="flex items-center gap-3">',
            '      <div id="profile-avatar" class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">',
            '        <span id="profile-iniciales">JP</span>',
            '      </div>',
            '      <div class="flex-1 min-w-0">',
            '        <div id="profile-nombre" class="font-semibold text-slate-900 dark:text-white text-sm">Cargando...</div>',
            '        <div id="profile-email" class="text-xs text-slate-500 dark:text-slate-400">-</div>',
            '      </div>',
            '    </div>',
            '    <div class="mt-2 flex flex-wrap gap-1">',
            '      <span id="profile-rol" class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">-</span>',
            '      <span id="profile-facultad" class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">-</span>',
            '    </div>',
            '  </div>',
            '  <div class="p-2">',
            '    <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">',
            '      <span class="material-symbols-outlined text-slate-400 text-sm">settings</span>',
            '      Configuracion',
            '    </a>',
            '    <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300">',
            '      <span class="material-symbols-outlined text-slate-400 text-sm">school</span>',
            '      Cambiar facultad',
            '    </a>',
            '  </div>',
            '  <div class="p-2 border-t border-slate-200 dark:border-slate-700">',
            '    <button id="logout-btn" class="logout-action w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 transition-all duration-300">',
            '      <span class="material-symbols-outlined text-sm">logout</span>',
            '      Cerrar sesion',
            '    </button>',
            '  </div>',
            '</div>'
        ].join('');

        oldButton.replaceWith(wrapper);

        if (!document.getElementById('logout-modal')) {
            const modal = document.createElement('div');
            modal.id = 'logout-modal';
            modal.className = 'hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-200';
            modal.innerHTML = [
                '<div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4 transform transition-all duration-200 scale-100 opacity-100">',
                '  <div class="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">',
                '    <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">logout</span>',
                '  </div>',
                '  <h3 class="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">',
                '    Cerrar sesion?',
                '  </h3>',
                '  <p class="text-sm text-center text-slate-500 dark:text-slate-400 mb-6 px-2">',
                '    Estas seguro de que deseas salir de tu cuenta? Deberas iniciar sesion nuevamente.',
                '  </p>',
                '  <div class="flex gap-3">',
                '    <button id="logout-cancel" class="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">',
                '      Cancelar',
                '    </button>',
                '    <button id="logout-confirm" class="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 hover:shadow-red-600/40">',
                '      Si, cerrar sesion',
                '    </button>',
                '  </div>',
                '</div>'
            ].join('');
            document.body.appendChild(modal);
        }
    }

    function renderProfile(perfil) {
        const nombre = document.getElementById('profile-nombre');
        const email = document.getElementById('profile-email');
        const iniciales = document.getElementById('profile-iniciales');
        const rol = document.getElementById('profile-rol');
        const facultad = document.getElementById('profile-facultad');
        const avatar = document.getElementById('profile-avatar');

        if (!nombre || !email || !iniciales || !rol || !facultad || !avatar) return;

        nombre.textContent = perfil.nombre || 'Usuario SIGPRO';
        email.textContent = perfil.email || 'usuario@unmsm.edu.pe';
        iniciales.textContent = perfil.iniciales || initialsFromName(perfil.nombre);
        rol.textContent = perfil.rol || 'Usuario';
        facultad.textContent = perfil.facultad || 'UNMSM';

        avatar.classList.remove('bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-cyan-600');
        avatar.classList.add(perfil.color || 'bg-blue-600');
    }

    function initProfileDropdown() {
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        if (!profileBtn || !profileDropdown) return;

        profileBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            profileDropdown.classList.add('hidden');
        });
    }

    function initLogoutModal() {
        const logoutBtn = document.getElementById('logout-btn');
        const logoutModal = document.getElementById('logout-modal');
        const logoutCancel = document.getElementById('logout-cancel');
        const logoutConfirm = document.getElementById('logout-confirm');
        const profileDropdown = document.getElementById('profile-dropdown');

        if (!logoutBtn || !logoutModal) return;

        function openModal() {
            logoutModal.classList.remove('hidden');
            void logoutModal.offsetWidth;
            logoutModal.classList.add('show-modal');
        }

        function closeModal() {
            logoutModal.classList.add('hide-modal');
            logoutModal.classList.remove('show-modal');
            setTimeout(() => {
                if (logoutModal.classList.contains('hide-modal')) {
                    logoutModal.classList.add('hidden');
                    logoutModal.classList.remove('hide-modal');
                }
            }, 400);
        }

        function confirmLogout() {
            logoutModal.classList.add('hide-modal');
            logoutModal.classList.remove('show-modal');
            setTimeout(() => {
                localStorage.clear();
                sessionStorage.clear();

                if (typeof API !== 'undefined' && API.auth && typeof API.auth.logout === 'function') {
                    Promise.resolve(API.auth.logout()).catch(() => {});
                }

                window.location.href = 'portal-inicio.html';
            }, 400);
        }

        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (profileDropdown) profileDropdown.classList.add('hidden');
            openModal();
        });

        if (logoutCancel) logoutCancel.addEventListener('click', closeModal);
        if (logoutConfirm) logoutConfirm.addEventListener('click', confirmLogout);

        logoutModal.addEventListener('click', (event) => {
            if (event.target === logoutModal) closeModal();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !logoutModal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        ensureProfileMarkup();
        initProfileDropdown();
        initLogoutModal();
        const perfil = await resolveProfile();
        renderProfile(perfil);
    });
})();

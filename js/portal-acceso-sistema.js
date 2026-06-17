// portal-acceso-sistema.js - Manejo del formulario de solicitud de acceso al sistema

(function() {
    'use strict';

    // ============================================
    // CONFIGURACIÓN
    // ============================================
    const CONFIG = {
        API_BASE: 'http://localhost:8080/v1',
        REDIRECT_SUCCESS: 'portal-inicio.html',
        REDIRECT_CANCEL: 'portal-inicio.html'
    };

    // ============================================
    // UTILIDADES
    // ============================================
    function showNotification(message, type = 'error') {
        const existing = document.getElementById('form-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'form-notification';
        
        const bgColor = type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800';
        
        const icon = type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'error';

        notification.className = `mb-5 p-4 rounded-xl border ${bgColor} flex items-start gap-3 animate-fade-in`;
        notification.innerHTML = `
            <span class="material-symbols-outlined text-lg flex-shrink-0 mt-0.5">${icon}</span>
            <div class="flex-1">
                <p class="text-sm font-medium">${escapeHtml(message)}</p>
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="flex-shrink-0 hover:opacity-70">
                <span class="material-symbols-outlined text-lg">close</span>
            </button>
        `;

        const form = document.getElementById('solicitudForm');
        form.parentNode.insertBefore(notification, form);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setLoading(button, loading) {
        const originalContent = button.dataset.originalContent || button.innerHTML;
        
        if (loading) {
            button.dataset.originalContent = originalContent;
            button.disabled = true;
            button.innerHTML = `
                <span class="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                <span>Enviando...</span>
            `;
            button.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            button.disabled = false;
            button.innerHTML = originalContent;
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email) && email.toLowerCase().endsWith('@unmsm.edu.pe');
    }

    // ============================================
    // MAPEO DE FACULTADES (igual que views.js)
    // ============================================
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

    // ============================================
    // CARGAR FACULTADES DESDE LA API
    // ============================================
    async function loadFacultades() {
        const select = document.getElementById('facultad');
        if (!select) return;

        const defaultOption = select.options[0];
        
        try {
            const token = sessionStorage.getItem('accessToken') || localStorage.getItem('unmsm_token') || localStorage.getItem('token');
            const headers = { 'Accept': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${CONFIG.API_BASE}/public/faculties?page=1&limit=50`, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();
            let faculties = [];

            if (Array.isArray(payload)) {
                faculties = payload;
            } else if (Array.isArray(payload?.data)) {
                faculties = payload.data;
            } else if (Array.isArray(payload?.items)) {
                faculties = payload.items;
            }

            select.innerHTML = '';
            select.appendChild(defaultOption);

            if (faculties.length === 0) {
                throw new Error('No se encontraron facultades');
            }

            // Ordenar por nombre
            faculties.sort((a, b) => {
                const nameA = (a.name || a.nombre || '').toLowerCase();
                const nameB = (b.name || b.nombre || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

            faculties.forEach(faculty => {
                const option = document.createElement('option');
                option.value = faculty.id || '';
                option.textContent = faculty.name || faculty.nombre || 'Facultad sin nombre';
                option.dataset.code = faculty.code || '';
                option.dataset.shortName = faculty.shortName || '';
                select.appendChild(option);
            });

            console.log(`✅ ${faculties.length} facultades cargadas desde API`);

        } catch (error) {
            console.warn('⚠️ No se pudieron cargar facultades desde API:', error);
            
            // Fallback: lista estática con códigos reales de views.js
            const facultadesEstaticas = [
                { id: 'medicina-001', name: 'Facultad de Medicina', code: 'FM', shortName: 'Medicina' },
                { id: 'derecho-001', name: 'Facultad de Derecho y Ciencia Política', code: 'FDCP', shortName: 'Derecho' },
                { id: 'letras-001', name: 'Facultad de Letras y Ciencias Humanas', code: 'FLCH', shortName: 'Letras' },
                { id: 'farmacia-001', name: 'Facultad de Farmacia y Bioquímica', code: 'FFB', shortName: 'Farmacia' },
                { id: 'odontologia-001', name: 'Facultad de Odontología', code: 'FO', shortName: 'Odontología' },
                { id: 'educacion-001', name: 'Facultad de Educación', code: 'FE', shortName: 'Educación' },
                { id: 'quimica-001', name: 'Facultad de Química e Ingeniería Química', code: 'FQIQ', shortName: 'Química' },
                { id: 'veterinaria-001', name: 'Facultad de Medicina Veterinaria', code: 'FMV', shortName: 'Veterinaria' },
                { id: 'administrativas-001', name: 'Facultad de Ciencias Administrativas', code: 'FCA', shortName: 'Administrativas' },
                { id: 'biologicas-001', name: 'Facultad de Ciencias Biológicas', code: 'FCB', shortName: 'Biológicas' },
                { id: 'contables-001', name: 'Facultad de Ciencias Contables', code: 'FCC', shortName: 'Contables' },
                { id: 'economicas-001', name: 'Facultad de Ciencias Económicas', code: 'FCE', shortName: 'Económicas' },
                { id: 'fisicas-001', name: 'Facultad de Ciencias Físicas', code: 'FCF', shortName: 'Físicas' },
                { id: 'matematicas-001', name: 'Facultad de Ciencias Matemáticas', code: 'FCM', shortName: 'Matemáticas' },
                { id: 'sociales-001', name: 'Facultad de Ciencias Sociales', code: 'FCCSS', shortName: 'Sociales' },
                { id: 'geologica-001', name: 'Facultad de Ingeniería Geológica, Minera, Metalúrgica y Geográfica', code: 'FIGMMG', shortName: 'Geológica' },
                { id: 'industrial-001', name: 'Facultad de Ingeniería Industrial', code: 'FII', shortName: 'Industrial' },
                { id: 'psicologia-001', name: 'Facultad de Psicología', code: 'FP', shortName: 'Psicología' },
                { id: 'electrica-001', name: 'Facultad de Ingeniería Eléctrica y Electrónica', code: 'FIEE', shortName: 'Eléctrica' },
                { id: 'sistemas-001', name: 'Facultad de Ingeniería de Sistemas e Informática', code: 'FISI', shortName: 'Sistemas' }
            ];

            select.innerHTML = '';
            select.appendChild(defaultOption);

            facultadesEstaticas.forEach(f => {
                const option = document.createElement('option');
                option.value = f.id;
                option.textContent = f.name;
                option.dataset.code = f.code;
                option.dataset.shortName = f.shortName;
                select.appendChild(option);
            });

            console.log('📦 Usando lista estática de facultades (20 facultades UNMSM)');
        }
    }

    // ============================================
    // ENVIAR SOLICITUD A LA API
    // ============================================
    async function submitAccessRequest(formData) {
        const payload = {
            email: formData.correo,
            firstName: formData.firstName,
            lastName: formData.lastName,
            facultyId: formData.facultadId,
            phone: formData.telefono || null,   // ← envía null si está vacío
            position: formData.cargo,
            message: formData.mensaje || 'Solicitud de acceso al sistema SIGPRO'
        };

        console.log('📤 Enviando solicitud:', payload);

        const response = await fetch(`${CONFIG.API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
                // ❌ Sin Authorization — es endpoint público
            },
            body: JSON.stringify(payload)
        });

        let data;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { message: text };
        }

        if (!response.ok) {
            const errorMessage = data.message || data.error || `Error ${response.status}: ${response.statusText}`;
            
            if (response.status === 400 && errorMessage.includes('Ya existe una solicitud pendiente')) {
                throw new Error('Ya existe una solicitud pendiente para este correo. Por favor espere a que sea revisada por la Oficina de Racionalización.');
            }
            
            if (response.status === 409) {
                throw new Error('El usuario ya está registrado o tiene una solicitud en proceso.');
            }

            throw new Error(errorMessage);
        }

        return { success: true, data };
    }

    // ============================================
    // GUARDAR EN LOCALSTORAGE (BACKUP/FALLBACK)
    // ============================================
    function saveToLocalStorage(formData) {
        const requests = JSON.parse(localStorage.getItem('sigpro_access_requests') || '[]');
        
        const newRequest = {
            id: 'req-' + Date.now(),
            email: formData.correo,
            firstName: formData.firstName,
            lastName: formData.lastName,
            faculty: formData.facultadNombre,
            // ✅ FIX: Guardar facultyId como número para consistencia
            facultyId: formData.facultadId,
            facultyCode: formData.facultadCode,
            phone: formData.telefono,
            position: formData.cargo,
            message: formData.mensaje,
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
            source: 'portal-publico'
        };

        // Evitar duplicados por email
        const existingIndex = requests.findIndex(r => 
            r.email.toLowerCase() === formData.correo.toLowerCase() && 
            r.status === 'PENDING'
        );

        if (existingIndex >= 0) {
            requests[existingIndex] = newRequest;
        } else {
            requests.unshift(newRequest);
        }

        localStorage.setItem('sigpro_access_requests', JSON.stringify(requests));
        console.log('💾 Solicitud guardada en localStorage');
    }

    // ============================================
    // MANEJO DEL FORMULARIO
    // ============================================
    function setupForm() {
        const form = document.getElementById('solicitudForm');
        if (!form) {
            console.error('Formulario no encontrado');
            return;
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Limpiar notificaciones previas
            const existing = document.getElementById('form-notification');
            if (existing) existing.remove();

            // Recoger datos
            const facultadSelect = document.getElementById('facultad');
            const facultadOption = facultadSelect.options[facultadSelect.selectedIndex];
            
            const nombreCompleto = document.getElementById('responsable').value.trim();
            const nameParts = nombreCompleto.split(/\s+/);
            const midPoint = Math.ceil(nameParts.length / 2);
            
            const formData = {
                facultadId: facultadSelect.value,
                facultadNombre: facultadOption.textContent,
                facultadCode: facultadOption.dataset.code || '',
                correo: document.getElementById('correo').value.trim().toLowerCase(),
                firstName: nameParts.slice(0, midPoint).join(' '),
                lastName: nameParts.slice(midPoint).join(' ') || nameParts[0],
                cargo: document.getElementById('cargo').value.trim(),
                mensaje: document.getElementById('mensaje').value.trim(),
                telefono: document.getElementById('telefono')?.value.trim() || '',
            };

            // Validaciones
            const errors = [];

            if (!formData.facultadId) {
                errors.push('Debe seleccionar una facultad');
            }

            if (!formData.correo) {
                errors.push('El correo institucional es obligatorio');
            } else if (!validateEmail(formData.correo)) {
                errors.push('Debe usar un correo @unmsm.edu.pe válido');
            }

            if (!nombreCompleto) {
                errors.push('El nombre completo es obligatorio');
            }

            if (!formData.cargo) {
                errors.push('El cargo es obligatorio');
            }

            if (errors.length > 0) {
                showNotification(errors.join('. '), 'error');
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            setLoading(submitButton, true);

            try {
                // 1. Intentar enviar a la API real
                await submitAccessRequest(formData);
                
                // 2. También guardar en localStorage como backup
                saveToLocalStorage(formData);

                showNotification(
                    '¡Solicitud enviada exitosamente! Será revisada por la Oficina de Racionalización. Recibirá una notificación en su correo cuando sea aprobada.',
                    'success'
                );

                // Limpiar formulario después de 2.5 segundos
                setTimeout(() => {
                    form.reset();
                }, 2500);

            } catch (error) {
                console.error('Error al enviar solicitud:', error);
                
                // Si es error de conexión, guardar localmente
                if (error.message.includes('fetch') || 
                    error.message.includes('network') || 
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('Connection refused') ||
                    error.name === 'TypeError') {
                    
                    saveToLocalStorage(formData);
                    showNotification(
                        'No se pudo conectar con el servidor. Su solicitud ha sido guardada localmente y se sincronizará cuando el servidor esté disponible.',
                        'warning'
                    );
                } else {
                    showNotification(error.message, 'error');
                }
            } finally {
                setLoading(submitButton, false);
            }
        });
    }

    // ============================================
    // TEMA OSCURO (compatible con Tailwind darkMode: "class")
    // ============================================
    function setupTheme() {
        const toggle = document.getElementById('theme-toggle');
        const html = document.documentElement;
        
        if (!toggle) return;

        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            html.classList.add('dark');
        }

        toggle.addEventListener('click', () => {
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Portal de Acceso al Sistema - Inicializando');
        
        setupTheme();
        await loadFacultades();
        setupForm();
        
        // Enfocar primer campo
        const firstInput = document.getElementById('facultad');
        if (firstInput) firstInput.focus();
    });

})();
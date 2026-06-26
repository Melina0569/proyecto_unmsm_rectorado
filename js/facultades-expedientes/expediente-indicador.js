/**
 * EXPEDIENTE INDICADOR - JavaScript
 * Vista detalle de indicador con semáforización
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle',
    INDICADORES_DETALLE: 'sigpro_indicadores_detalle',
    HISTORIAL_DATOS: 'sigpro_historial_datos',
    FACULTAD_ID: 'sigpro_facultad_id',
    INDICADOR_ID: 'sigpro_indicador_id'
};

let expedienteActual = null;
let datosSeguimiento = [];
let indicadorId = null;

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initThemeToggle();
    
    const urlParams = new URLSearchParams(window.location.search);
    const indicadorCodigo = urlParams.get('codigo') || urlParams.get('docCode');
    
    cargarExpediente(indicadorCodigo);
    
    initModalCalculadora();
});

// ==========================================
// TEMA
// ==========================================

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    
    toggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        showToast(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'info');
    });
}

// ==========================================
// SEMÁFORIZACIÓN DEL INDICADOR
// ==========================================

function calcularEstadoIndicador(valor) {
    const numero = parseFloat(valor) || 0;

    if (numero < 75) {
        return {
            estado: 'Riesgo',
            clase: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            icono: 'warning',
            color: '#ef4444'
        };
    }

    if (numero < 90) {
        return {
            estado: 'Estable',
            clase: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            icono: 'info',
            color: '#f59e0b'
        };
    }

    return {
        estado: 'Óptimo',
        clase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icono: 'check_circle',
        color: '#10b981'
    };
}

function formatPercentLabel(value, fallback = '0') {
    const raw = String(value ?? '').trim();
    if (!raw) {
        return `${fallback}%`;
    }

    const cleaned = raw.replace(/%+/g, '').trim();
    if (!cleaned) {
        return `${fallback}%`;
    }

    const numeric = Number.parseFloat(cleaned.replace(',', '.'));
    if (!Number.isFinite(numeric)) {
        return `${cleaned}%`;
    }

    const isInteger = Math.abs(numeric % 1) < 0.000001;
    return isInteger ? `${numeric.toFixed(0)}%` : `${numeric.toFixed(2)}%`;
}

function normalizarIndicadorGuardado(registro, codigo) {
    if (!registro) return null;

    const indicadorData = registro.fichaData || registro.indicadorData || registro;
    return {
        ...registro,
        ...indicadorData,
        codigo: codigo || registro.codigo || indicadorData.codigo,
        indicadorData,
        tipo: registro.tipo || 'indicador',
        __fromStorageLocal: true
    };
}

function parsearHistorialLocal(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function esFilaSemillaLegacy(item) {
    const fecha = String(item?.fecha || '').trim();
    const resultado = Number(item?.resultado || 0);
    const devengado = Number(item?.devengado || 0);
    const pim = Number(item?.pim || 0);
    const meta = Number(item?.metaPeriodo || item?.meta || 0);
    const analisis = String(item?.analisis || '').trim();
    const acciones = String(item?.acciones || '').trim();

    const esMesLegacy = fecha === '2024-01' || fecha === '2024-02' || fecha === '2024-03';
    const esResultadoLegacy = resultado === 75 || resultado === 82 || resultado === 78;

    return esMesLegacy && esResultadoLegacy && devengado === 0 && pim === 0 && meta === 90 && (!analisis || analisis === '-') && (!acciones || acciones === '-');
}

function normalizarHistorialSinSuperposicion(historial) {
    if (!Array.isArray(historial)) return [];

    const filtrado = historial.filter((item) => !esFilaSemillaLegacy(item));
    return filtrado.sort((a, b) => {
        const fechaA = new Date(a?.fecha || a?.timestamp || 0).getTime();
        const fechaB = new Date(b?.fecha || b?.timestamp || 0).getTime();

        if (Number.isFinite(fechaA) && Number.isFinite(fechaB) && fechaA !== fechaB) {
            return fechaA - fechaB;
        }

        return String(a?.fecha || a?.timestamp || '').localeCompare(String(b?.fecha || b?.timestamp || ''));
    });
}

function obtenerIndicadorGuardadoPorCodigo(codigo) {
    if (!codigo) return null;

    const detalleDocumentos = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE) || '{}');
    const detalleIndicadores = JSON.parse(localStorage.getItem(STORAGE_KEYS.INDICADORES_DETALLE) || '{}');
    const registro = detalleDocumentos[codigo] || detalleIndicadores[codigo] || null;

    return normalizarIndicadorGuardado(registro, codigo);
}

function obtenerPrimerIndicadorGuardado() {
    const detalleDocumentos = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE) || '{}');
    const documento = Object.values(detalleDocumentos).find((item) => item?.tipo === 'indicador' || item?.fichaData || item?.indicadorData);
    if (documento) {
        return normalizarIndicadorGuardado(documento, documento.codigo);
    }

    const detalleIndicadores = JSON.parse(localStorage.getItem(STORAGE_KEYS.INDICADORES_DETALLE) || '{}');
    const indicador = Object.values(detalleIndicadores)[0] || null;
    return normalizarIndicadorGuardado(indicador, indicador?.codigo);
}

function crearExpedienteVacio(codigo = '') {
    return {
        codigo: codigo || 'IND-SIN-CODIGO',
        version: '1',
        tipoProceso: '',
        macroProceso: '',
        proceso: '',
        unidadResponsable: '',
        objetivoProceso: '',
        nombreIndicador: '',
        frecuencia: '',
        meta: '0',
        formulaDefinicion: '',
        fuente: '',
        variables: '',
        __isNuevo: true
    };
}

function mostrarExpedienteVacio(codigo = '') {
    expedienteActual = crearExpedienteVacio(codigo);
    mostrarInfoTecnica(expedienteActual);
    datosSeguimiento = [];
    renderizarTabla();
    actualizarGraficos();
}

// ==========================================
// CARGAR EXPEDIENTE
// ==========================================

async function cargarExpedienteNuevo() {
    const urlParams = new URLSearchParams(window.location.search);
    const indicadorCodigo = urlParams.get('codigo') || urlParams.get('docCode');

    expedienteActual = obtenerIndicadorGuardadoPorCodigo(indicadorCodigo) || obtenerPrimerIndicadorGuardado();

    if (expedienteActual) {
        mostrarInfoTecnica(expedienteActual);
        cargarDatosSeguimiento();
        return;
    }

    showToast('No hay ficha guardada. Redirigiendo...', 'warning');
    setTimeout(() => {
        window.location.href = 'facultades-nuevo.html?open=ficha-indicador';
    }, 2000);
}

function cargarExpedienteDesdeStorage() {
    const urlParams = new URLSearchParams(window.location.search);
    const indicadorCodigo = urlParams.get('codigo') || urlParams.get('docCode');

    if (indicadorCodigo) {
        expedienteActual = obtenerIndicadorGuardadoPorCodigo(indicadorCodigo);
        if (expedienteActual) {
            mostrarInfoTecnica(expedienteActual);
            cargarDatosSeguimiento();
            return;
        }

        mostrarExpedienteVacio(indicadorCodigo);
        return;
    }

    expedienteActual = obtenerPrimerIndicadorGuardado();
    if (expedienteActual) {
        mostrarInfoTecnica(expedienteActual);
        cargarDatosSeguimiento();
        return;
    }

    mostrarExpedienteVacio();
}

function cargarExpediente(codigo) {
    if (codigo) {
        expedienteActual = obtenerIndicadorGuardadoPorCodigo(codigo);
        
        // ============================================================
        // 🔥 NUEVO: Extraer el ID real del indicador para la API
        // ============================================================
        if (expedienteActual) {
            // El ID puede estar en diferentes campos según venga de la API o localStorage
            indicadorId = expedienteActual.id 
                || expedienteActual.indicatorId 
                || expedienteActual.indicadorId 
                || expedienteActual.uuid
                || codigo; // Fallback al código si no hay ID
            
            console.log('🆔 Indicador ID para API:', indicadorId);
            
            mostrarInfoTecnica(expedienteActual);
            cargarDatosSeguimiento();
            return;
        }

        mostrarExpedienteVacio(codigo);
        return;
    }

    cargarExpedienteDesdeStorage();
}

async function guardarIndicadorEnAPI(data) {
    try {
        if (typeof API === 'undefined' || !API.indicators) {
            console.log('API no disponible, guardando solo en localStorage');
            return;
        }
        
        const indicadorData = {
            codigo: data.codigo,
            nombre: data.nombreIndicador,
            macroProceso: data.macroProceso || data.proceso,
            proceso: data.proceso || data.macroProceso,
            version: data.version,
            tipoProceso: data.tipoProceso,
            unidadResponsable: data.unidadResponsable,
            objetivoProceso: data.objetivoProceso,
            frecuencia: data.frecuencia,
            meta: parseFloat(data.meta) || 0,
            formula: data.formulaDefinicion,
            fuente: data.fuente,
            variables: data.variables,
            facultadId: localStorage.getItem(STORAGE_KEYS.FACULTAD_ID) || 1,
            fechaCreacion: new Date().toISOString(),
            estado: 'activo'
        };
        
        showToast('Sincronizando con el servidor...', 'info');
        await simulateAPIsave('indicadores', indicadorData);
        showToast('Ficha sincronizada correctamente', 'success');
        
    } catch (error) {
        console.error('Error guardando en API:', error);
        showToast('Guardado localmente (sin conexión)', 'warning');
    }
}

async function simulateAPIsave(endpoint, data) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const key = `api_${endpoint}_${data.codigo}`;
            localStorage.setItem(key, JSON.stringify({
                ...data,
                id: generateId(),
                lastSync: new Date().toISOString()
            }));
            resolve({ success: true, id: generateId() });
        }, 500);
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==========================================
// MOSTRAR INFORMACIÓN TÉCNICA
// ==========================================

function mostrarInfoTecnica(data) {
    document.getElementById('codigo-display').textContent = data.codigo || 'SIN-CÓDIGO';
    document.getElementById('info-version').textContent = data.version || '-';
    document.getElementById('info-tipo').textContent = formatearTipoProceso(data.tipoProceso) || '-';
    document.getElementById('info-proceso').textContent = data.macroProceso || data.proceso || '-';
    document.getElementById('info-unidad').textContent = data.unidadResponsable || '-';
    document.getElementById('info-objetivo').textContent = data.objetivoProceso || '-';
    document.getElementById('info-nombre').textContent = data.nombreIndicador || data.nombre || '-';
    document.getElementById('info-frecuencia').textContent = data.frecuencia || '-';
    document.getElementById('info-variables').textContent = data.variables || '-';

    const metaContainer = document.getElementById('info-meta');
    metaContainer.innerHTML = `
        <span class="text-2xl font-black text-primary">${formatPercentLabel(data.meta, '0')}</span>
    `;

    document.getElementById('info-fuente').textContent = data.fuente || '-';

    const formulaContainer = document.getElementById('info-formula');
    if (data.formulaDefinicion && data.formulaDefinicion.includes('/')) {
        formulaContainer.innerHTML = renderizarFraccionFormula(data.formulaDefinicion);
    } else {
        formulaContainer.textContent = data.formulaDefinicion || '-';
    }

    window.metaGlobal = parseFloat(data.meta) || 0;
}

function formatearTipoProceso(tipo) {
    const tipos = {
        'estrategico': 'Estratégico',
        'misional': 'Misional',
        'de-apoyo': 'De Apoyo',
        'soporte': 'Soporte',
        'de-evaluacion': 'De Evaluación'
    };
    return tipos[tipo] || tipo;
}

function obtenerValorIndicadorPorcentaje(dato) {
    const valor = Number.parseFloat(dato?.resultado);
    if (!Number.isFinite(valor)) {
        return 0;
    }

    return valor <= 1 ? valor * 100 : valor;
}

function renderizarEstadoIndicador(valor, compact = false) {
    const estado = calcularEstadoIndicador(valor);

    return compact
        ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${estado.clase}"><span class="material-symbols-outlined text-sm">${estado.icono}</span>${estado.estado}</span>`
        : `<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${estado.clase}"><span class="material-symbols-outlined text-sm">${estado.icono}</span>${estado.estado}</span>`;
}

function renderizarFraccionFormula(formula) {
    const partes = formula.split('/');
    if (partes.length === 2) {
        const numerador = partes[0].trim();
        const resto = partes[1].trim();
        const denominador = resto.replace(/\*.*$/, '').trim();
        const multiplicador = resto.includes('*') ? resto.match(/\*\s*(\d+)/)?.[1] || '100' : '100';
        
        return `
            <div class="formula-wrap">
                <div class="formula-fraction" role="img" aria-label="Formula de indicador">
                    <span class="formula-part formula-top">${numerador}</span>
                    <span class="formula-divider"></span>
                    <span class="formula-part formula-bottom">${denominador}</span>
                </div>
                ${multiplicador !== '1' ? `<span class="formula-multiplier">x ${multiplicador}%</span>` : ''}
            </div>
        `;
    }
    return formula;
}

// ==========================================
// GESTIÓN DE DATOS DE SEGUIMIENTO
// ==========================================

async function cargarDatosSeguimiento() {
    const codigo = expedienteActual?.codigo;
    if (!codigo) {
        datosSeguimiento = [];
        renderizarTabla();
        return;
    }

    if (expedienteActual?.__isNuevo) {
        datosSeguimiento = [];
        renderizarTabla();
        actualizarGraficos();
        return;
    }

    const key = `${STORAGE_KEYS.HISTORIAL_DATOS}_${codigo}`;
    const guardado = localStorage.getItem(key);
    const historialLocal = normalizarHistorialSinSuperposicion(parsearHistorialLocal(guardado));

    // ============================================================
    // 🔥 NUEVO: Intentar cargar desde API REAL primero
    // ============================================================
    try {
        // El indicadorId puede ser el código si es un UUID, o necesitamos buscarlo
        const indicatorId = indicadorId || codigo;
        
        console.log('🔍 Cargando seguimiento desde API para indicador:', indicatorId);
        
        const response = await API.portal.indicators.getTracking(indicatorId, 2026);
        
        if (response.success && Array.isArray(response.data)) {
            console.log('✅ Seguimiento cargado desde API:', response.data.length, 'registros');
            
            // Mapear datos del backend al formato que usa tu frontend
            datosSeguimiento = response.data.map(item => ({
                fecha: item.period || item.periodo || item.fecha || item.month || '',
                devengado: Number(item.devengado || item.executed || 0),
                pim: Number(item.pim || item.programmed || item.budget || 0),
                resultado: Number(item.resultado || item.value || item.valor || item.percentage || 0),
                metaPeriodo: Number(item.meta || item.target || item.metaPeriodo || window.metaGlobal || 0),
                analisis: item.analisis || item.analysis || item.comment || '',
                acciones: item.acciones || item.actions || item.measures || '',
                timestamp: item.createdAt || item.updatedAt || new Date().toISOString()
            }));
            
            // Guardar en localStorage como caché
            localStorage.setItem(key, JSON.stringify(datosSeguimiento));
            
            renderizarTabla();
            actualizarGraficos();
            return;
        } else {
            console.warn('⚠️ API respondió pero sin datos:', response.error || 'Array vacío');
        }
    } catch (error) {
        console.log('⚠️ API no disponible, usando localStorage:', error.message);
    }

    // ============================================================
    // Fallback: Si API falla, usar localStorage (tu código original)
    // ============================================================
    
    // Si el expediente viene del storage local, priorizar historial local
    if (expedienteActual?.__fromStorageLocal) {
        datosSeguimiento = historialLocal;
        if (guardado) {
            localStorage.setItem(key, JSON.stringify(historialLocal));
        }
        renderizarTabla();
        actualizarGraficos();
        return;
    }
    
    // Intentar API.indicators.getPanel como segundo fallback
    try {
        if (typeof API !== 'undefined' && API.indicators) {
            const response = await API.indicators.getPanel(codigo);
            if (response.success && response.data?.historial) {
                datosSeguimiento = response.data.historial.map(h => ({
                    fecha: h.fecha,
                    devengado: h.devengado || 0,
                    pim: h.pim || 0,
                    resultado: h.valor || 0,
                    metaPeriodo: h.meta || window.metaGlobal,
                    analisis: h.analisis || '',
                    acciones: h.acciones || ''
                }));
                renderizarTabla();
                actualizarGraficos();
                return;
            }
        }
    } catch (error) {
        console.log('API getPanel no disponible');
    }
    
    // Último fallback: localStorage puro
    if (guardado) {
        datosSeguimiento = historialLocal;
        localStorage.setItem(key, JSON.stringify(historialLocal));
    } else {
        datosSeguimiento = [];
    }
    
    renderizarTabla();
    actualizarGraficos();
}

async function guardarDatosSeguimiento() {
    const codigo = expedienteActual?.codigo;
    if (!codigo) return;
    
    const key = `${STORAGE_KEYS.HISTORIAL_DATOS}_${codigo}`;
    datosSeguimiento = normalizarHistorialSinSuperposicion(datosSeguimiento);
    localStorage.setItem(key, JSON.stringify(datosSeguimiento));
    
    // ============================================================
    // 🔥 NUEVO: Sincronizar con API también
    // ============================================================
    await guardarTrackingEnAPI();
    
    showToast('Datos guardados correctamente', 'success');
}

// ==========================================
// GUARDAR EN API (NUEVO)
// ==========================================

async function guardarTrackingEnAPI() {
    if (!indicadorId || datosSeguimiento.length === 0) return;
    
    try {
        // Preparar datos para el backend
        const trackingData = datosSeguimiento.map(d => ({
            period: d.fecha,
            devengado: d.devengado,
            pim: d.pim,
            resultado: d.resultado,
            meta: d.metaPeriodo,
            analisis: d.analisis,
            acciones: d.acciones
        }));
        
        // Enviar el último dato (la API suele aceptar uno por uno)
        const ultimoDato = trackingData[trackingData.length - 1];
        
        console.log('📤 Enviando tracking a API:', ultimoDato);
        
        const response = await API.portal.indicators.addTracking(indicadorId, ultimoDato);
        
        if (response.success) {
            console.log('✅ Tracking guardado en API');
        } else {
            console.warn('⚠️ No se pudo guardar en API:', response.error);
        }
    } catch (error) {
        console.error('❌ Error guardando tracking en API:', error);
    }
}

// ==========================================
// TABLA DE SEGUIMIENTO
// ==========================================

function renderizarTabla() {
    const tbody = document.getElementById('tbody-seguimiento');
    const contador = document.getElementById('contador-registros');
    
    if (datosSeguimiento.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="px-4 py-8 text-center text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                    No hay datos de seguimiento. Agregue el primer dato mensual.
                </td>
            </tr>
        `;
        contador.textContent = '0';
        return;
    }
    
    tbody.innerHTML = datosSeguimiento.map((dato, index) => {
        const resultadoPorcentaje = obtenerValorIndicadorPorcentaje(dato);
        
        return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fade-in" style="animation-delay: ${index * 0.05}s">
                <td class="px-4 py-3 text-center font-medium text-slate-500">${index + 1}</td>
                <td class="px-4 py-3 font-medium">${formatearFecha(dato.fecha)}</td>
                <td class="px-4 py-3 text-right font-mono">${formatearMoneda(dato.devengado)}</td>
                <td class="px-4 py-3 text-right font-mono">${formatearMoneda(dato.pim)}</td>
                <td class="px-4 py-3 text-right font-bold text-primary">${resultadoPorcentaje.toFixed(2)}%</td>
                <td class="px-4 py-3 text-right">${formatPercentLabel(dato.metaPeriodo, '0')}</td>
                <td class="px-4 py-3">
                    ${renderizarEstadoIndicador(resultadoPorcentaje, true)}
                </td>
                <td class="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm max-w-[200px] truncate" title="${dato.analisis}">
                    ${dato.analisis || '-'}
                </td>
                <td class="px-4 py-3 text-slate-600 dark:text-slate-400 text-sm max-w-[200px] truncate" title="${dato.acciones}">
                    ${dato.acciones || '-'}
                </td>
                <td class="px-4 py-3 text-center">
                    <button onclick="editarDato(${index})" class="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 rounded transition-colors" title="Editar">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="eliminarDato(${index})" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded transition-colors" title="Eliminar">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    contador.textContent = datosSeguimiento.length;
}

function calcularCumplimiento(resultado, meta) {
    const valor = obtenerValorIndicadorPorcentaje({ resultado });
    const metaNumero = parseFloat(meta) || 0;

    if (!metaNumero) return valor;
    return (valor / metaNumero) * 100;
}

// ==========================================
// MODAL: AGREGAR/EDITAR DATO
// ==========================================

let datoEditando = null;

function initModalCalculadora() {
    const form = document.getElementById('form-dato');
    const devengado = document.getElementById('input-devengado');
    const pim = document.getElementById('input-pim');
    const resultado = document.getElementById('input-resultado');
    
    function calcular() {
        const dev = parseFloat(devengado.value) || 0;
        const p = parseFloat(pim.value) || 0;
        if (p > 0) {
            // Multiplicar por 100% (valor 1.0 en porcentaje)
            // (dev/p) da 0.077, que es 7.7% directamente
            const res = (dev / p) * 1;
            resultado.value = res.toFixed(2);
        } else {
            resultado.value = '0.00';
        }
    }
    
    devengado.addEventListener('input', calcular);
    pim.addEventListener('input', calcular);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarDato();
    });
}

function agregarDatoMensual() {
    datoEditando = null;
    document.getElementById('modal-titulo').textContent = 'Agregar Dato Mensual';
    document.getElementById('form-dato').reset();
    document.getElementById('dato-id').value = '';
    
    const metaInput = document.getElementById('input-meta');
    if (window.metaGlobal) {
        metaInput.value = window.metaGlobal;
    }
    
    const hoy = new Date();
    document.getElementById('input-fecha').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    
    abrirModal();
}

function editarDato(index) {
    datoEditando = index;
    const dato = datosSeguimiento[index];
    
    document.getElementById('modal-titulo').textContent = 'Editar Dato Mensual';
    document.getElementById('dato-id').value = index;
    document.getElementById('input-fecha').value = dato.fecha;
    document.getElementById('input-meta').value = dato.metaPeriodo;
    document.getElementById('input-devengado').value = dato.devengado;
    document.getElementById('input-pim').value = dato.pim;
    document.getElementById('input-resultado').value = dato.resultado;
    document.getElementById('input-analisis').value = dato.analisis || '';
    document.getElementById('input-acciones').value = dato.acciones || '';
    
    abrirModal();
}

async function guardarDato() {
    const fecha = document.getElementById('input-fecha').value;
    const metaPeriodo = parseFloat(document.getElementById('input-meta').value) || 0;
    const devengado = parseFloat(document.getElementById('input-devengado').value) || 0;
    const pim = parseFloat(document.getElementById('input-pim').value) || 0;
    const resultado = parseFloat(document.getElementById('input-resultado').value) || 0;
    const analisis = document.getElementById('input-analisis').value;
    const acciones = document.getElementById('input-acciones').value;
    
    const nuevoDato = {
        fecha,
        metaPeriodo,
        devengado,
        pim,
        resultado,
        analisis,
        acciones,
        timestamp: new Date().toISOString()
    };
    
    if (datoEditando !== null) {
        datosSeguimiento[datoEditando] = nuevoDato;
        showToast('Dato actualizado correctamente', 'success');
    } else {
        datosSeguimiento.push(nuevoDato);
        showToast('Dato agregado correctamente', 'success');
    }

    datosSeguimiento = normalizarHistorialSinSuperposicion(datosSeguimiento);
    
    cerrarModal();
    renderizarTabla();
    actualizarGraficos();
    await guardarDatosSeguimiento();
}

async function eliminarDato(index) {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;
    
    datosSeguimiento.splice(index, 1);
    renderizarTabla();
    actualizarGraficos();
    await guardarDatosSeguimiento();
    showToast('Dato eliminado', 'info');
}

function abrirModal() {
    document.getElementById('modal-dato').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    document.getElementById('modal-dato').classList.add('hidden');
    document.body.style.overflow = '';
}

// ==========================================
// GRÁFICOS Y ESTADÍSTICAS
// ==========================================

function actualizarGraficos() {
    if (datosSeguimiento.length === 0) {
        document.getElementById('grafico-tendencia').innerHTML = `
            <div class="flex items-center justify-center h-full text-slate-400">
                <span class="material-symbols-outlined text-4xl mr-2">show_chart</span>
                Agregue datos para ver la tendencia
            </div>
        `;
        actualizarGauge(0);
        return;
    }
    
    renderizarGraficoTendencia();
    
    const promedio = datosSeguimiento.reduce((sum, d) => {
        return sum + obtenerValorIndicadorPorcentaje(d);
    }, 0) / datosSeguimiento.length;
    
    actualizarGauge(promedio);
}

function renderizarGraficoTendencia() {
    const container = document.getElementById('grafico-tendencia');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const datos = [...datosSeguimiento].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const valoresResultado = datos.map((d) => obtenerValorIndicadorPorcentaje(d));
    const maxValor = Math.max(...datos.map((d, index) => Math.max(valoresResultado[index], Number(d.metaPeriodo) || 0))) * 1.1 || 100;
    
    const xScale = (i) => padding.left + (i / (datos.length - 1 || 1)) * chartWidth;
    const yScale = (val) => padding.top + chartHeight - (val / maxValor) * chartHeight;
    
    const puntos = datos.map((d, i) => `${xScale(i)},${yScale(valoresResultado[i])}`).join(' ');
    const areaPath = `${xScale(0)},${padding.top + chartHeight} ${puntos} ${xScale(datos.length - 1)},${padding.top + chartHeight}`;
    
    const metaPromedio = datos.reduce((sum, d) => sum + d.metaPeriodo, 0) / datos.length;
    const yMeta = yScale(metaPromedio);
    
    const labelsX = datos.map((d, i) => {
        const fecha = new Date(d.fecha);
        const mes = fecha.toLocaleDateString('es-ES', { month: 'short' });
        return `<text x="${xScale(i)}" y="${height - 10}" text-anchor="middle" class="text-[10px] fill-slate-500 font-bold">${mes}</text>`;
    }).join('');
    
    const labelsY = [0, 25, 50, 75, 100].filter(v => v <= maxValor).map(val => {
        const y = yScale(val);
        return `<text x="${padding.left - 10}" y="${y + 3}" text-anchor="end" class="text-[10px] fill-slate-500 font-bold">${val}%</text>`;
    }).join('');
    
    const gridLines = [25, 50, 75].filter(v => v <= maxValor).map(val => {
        const y = yScale(val);
        return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="2,2" class="dark:stroke-slate-700"/>`;
    }).join('');
    
    container.innerHTML = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            ${gridLines}
            <line x1="${padding.left}" y1="${yMeta}" x2="${width - padding.right}" y2="${yMeta}" 
                  stroke="#f43f5e" stroke-width="2" stroke-dasharray="5,5" class="opacity-60"/>
            <text x="${width - padding.right + 5}" y="${yMeta + 3}" class="text-[10px] fill-rose-500 font-bold">Meta</text>
            <polygon points="${areaPath}" class="area-tendencia"/>
            <polyline points="${puntos}" class="linea-tendencia" fill="none"/>
            ${datos.map((d, i) => `
                <circle cx="${xScale(i)}" cy="${yScale(valoresResultado[i])}" r="4" class="punto-dato">
                    <title>${formatearFecha(d.fecha)}: ${valoresResultado[i].toFixed(2)}%</title>
                </circle>
            `).join('')}
            ${labelsY}
            ${labelsX}
        </svg>
    `;
}

function actualizarGauge(porcentaje) {
    const circulo = document.getElementById('circulo-progreso');
    const texto = document.getElementById('estado-promedio');
    const estado = document.getElementById('estado-texto');
    const estadoIndicador = calcularEstadoIndicador(porcentaje);
    
    const circunferencia = 502;
    const offset = circunferencia - (porcentaje / 100) * circunferencia;
    
    circulo.style.strokeDashoffset = offset;
    texto.textContent = estadoIndicador.estado;
    
    circulo.style.stroke = estadoIndicador.color;
    texto.style.color = estadoIndicador.color;
    estado.innerHTML = `Promedio ${porcentaje.toFixed(1)}%`;
    estado.className = `text-xs mt-2 px-3 py-1 rounded-full font-bold ${estadoIndicador.clase}`;
}

// ==========================================
// SINCRONIZACIÓN Y EXPORTAR
// ==========================================

async function sincronizarConAPI() {
    showToast('Sincronizando con el servidor...', 'info');
    
    try {
        if (expedienteActual) {
            await guardarIndicadorEnAPI(expedienteActual);
        }
        await guardarDatosSeguimiento();
        showToast('Sincronización completada', 'success');
    } catch (error) {
        console.error('Error en sincronización:', error);
        showToast('Error al sincronizar. Verifique su conexión.', 'error');
    }
}

async function exportarPDF() {
    showToast('Generando PDF...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        doc.setFontSize(20);
        doc.setTextColor(25, 120, 229);
        doc.text('Ficha de Indicador - SIGPRO UNMSM', 20, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        let y = 35;
        
        const info = [
            ['Código:', expedienteActual?.codigo || '-'],
            ['Nombre:', expedienteActual?.nombreIndicador || '-'],
            ['Macro Proceso:', expedienteActual?.macroProceso || '-'],
            ['Proceso:', expedienteActual?.proceso || '-'],
            ['Unidad Responsable:', expedienteActual?.unidadResponsable || '-'],
            ['Meta:', formatPercentLabel(expedienteActual?.meta, '0')],
            ['Fórmula:', expedienteActual?.formulaDefinicion || '-']
        ];
        
        info.forEach(([label, value]) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, 20, y);
            doc.setFont(undefined, 'normal');
            doc.text(value.substring(0, 80), 60, y);
            y += 8;
        });
        
        y += 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(25, 120, 229);
        doc.text('Seguimiento de Datos', 20, y);
        y += 10;
        
        const headers = ['N°', 'Fecha', 'Resultado', 'Meta', 'Estado'];
        const colWidths = [10, 35, 30, 25, 30];
        let x = 20;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(100, 116, 139);
        headers.forEach((header, i) => {
            doc.text(header, x, y);
            x += colWidths[i];
        });
        
        y += 5;
        doc.setDrawColor(226, 232, 240);
        doc.line(20, y, 190, y);
        y += 5;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        
        datosSeguimiento.forEach((dato, i) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            
            x = 20;
            const resultadoPorcentaje = obtenerValorIndicadorPorcentaje(dato);
            const estado = calcularEstadoIndicador(resultadoPorcentaje).estado;
            
            const row = [
                (i + 1).toString(),
                formatearFecha(dato.fecha),
                resultadoPorcentaje.toFixed(2) + '%',
                formatPercentLabel(dato.metaPeriodo, '0'),
                estado
            ];
            
            row.forEach((cell, j) => {
                doc.text(cell, x, y);
                x += colWidths[j];
            });
            
            y += 7;
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`SIGPRO UNMSM - Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        }
        
        const nombreArchivo = `Ficha_${expedienteActual?.codigo || 'Indicador'}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nombreArchivo);
        
        showToast('PDF descargado correctamente', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showToast('Error al generar PDF', 'error');
    }
}

// ==========================================
// DEMO
// ==========================================

function mostrarDemo() {
    mostrarExpedienteVacio();
}

// ==========================================
// UTILIDADES
// ==========================================

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const [year, month] = fechaStr.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(month) - 1]} ${year}`;
}

function formatearMoneda(valor) {
    if (valor === undefined || valor === null) return '-';
    return parseFloat(valor).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const icons = {
        info: 'info',
        success: 'check_circle',
        warning: 'warning',
        error: 'error'
    };
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icons[type]}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

async function guardarDatos() {
    await guardarDatosSeguimiento();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModal();
    }
});
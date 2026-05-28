/**
 * EXPEDIENTE INDICADOR - JavaScript
 * Vista detalle de indicador con semÃ¡forizaciÃ³n
 */

// ==========================================
// CONFIGURACIÃ“N
// ==========================================

const STORAGE_KEYS = {
    EXPEDIENTE_ACTUAL: 'sigpro_expediente_actual',
    HISTORIAL_DATOS: 'sigpro_historial_datos',
    FACULTAD_ID: 'sigpro_facultad_id',
    INDICADOR_ID: 'sigpro_indicador_id'
};

let expedienteActual = null;
let datosSeguimiento = [];
let indicadorId = null;

// ==========================================
// INICIALIZACIÃ“N
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initThemeToggle();
    
    // Verificar si viene de ficha-indicador o si hay datos en URL/Storage
    const urlParams = new URLSearchParams(window.location.search);
    const fromFicha = urlParams.get('from') === 'ficha';
    const indicadorCodigo = urlParams.get('codigo');
    
    if (fromFicha || indicadorCodigo) {
        cargarExpedienteNuevo();
    } else {
        cargarExpedienteDesdeStorage();
    }
    
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
// SEMÃFORIZACIÃ“N DE META
// ==========================================

function calcularEstadoMeta(valor) {
    const num = parseFloat(valor) || 0;
    
    if (num < 75) {
        return {
            estado: 'Riesgo',
            clase: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
            icono: 'warning',
            color: '#ef4444'
        };
    } else if (num >= 75 && num < 90) {
        return {
            estado: 'Aceptable',
            clase: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            icono: 'info',
            color: '#f59e0b'
        };
    } else {
        return {
            estado: 'Ã“ptimo',
            clase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
            icono: 'check_circle',
            color: '#10b981'
        };
    }
}

// ==========================================
// CARGAR EXPEDIENTE
// ==========================================

async function cargarExpedienteNuevo() {
    const guardado = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    
    if (guardado) {
        expedienteActual = JSON.parse(guardado);
        await guardarIndicadorEnAPI(expedienteActual);
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
    const guardado = localStorage.getItem(STORAGE_KEYS.EXPEDIENTE_ACTUAL);
    if (guardado) {
        expedienteActual = JSON.parse(guardado);
        mostrarInfoTecnica(expedienteActual);
        cargarDatosSeguimiento();
    } else {
        mostrarDemo();
    }
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
            macroProceso: data.macroProceso,
            proceso: data.proceso,
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
        showToast('Guardado localmente (sin conexiÃ³n)', 'warning');
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
// MOSTRAR INFORMACIÃ“N TÃ‰CNICA
// ==========================================

function mostrarInfoTecnica(data) {
    document.getElementById('codigo-display').textContent = data.codigo || 'SIN-CÃ“DIGO';
    document.getElementById('info-macro').textContent = data.macroProceso || '-';
    document.getElementById('info-proceso').textContent = data.proceso || '-';
    document.getElementById('info-version').textContent = data.version || '-';
    document.getElementById('info-tipo').textContent = formatearTipoProceso(data.tipoProceso) || '-';
    document.getElementById('info-unidad').textContent = data.unidadResponsable || '-';
    document.getElementById('info-objetivo').textContent = data.objetivoProceso || '-';
    document.getElementById('info-nombre').textContent = data.nombreIndicador || '-';
    document.getElementById('info-frecuencia').textContent = data.frecuencia || '-';
    
    // SEMÃFORIZACIÃ“N EN META
    const metaValor = parseFloat(data.meta) || 0;
    const estadoMeta = calcularEstadoMeta(metaValor);
    
    const metaContainer = document.getElementById('info-meta');
    metaContainer.innerHTML = `
        <div class="flex flex-col gap-2">
            <span class="text-2xl font-black" style="color: ${estadoMeta.color}">${data.meta || '0'}%</span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${estadoMeta.clase} w-fit">
                <span class="material-symbols-outlined text-sm">${estadoMeta.icono}</span>
                ${estadoMeta.estado}
            </span>
        </div>
    `;
    
    document.getElementById('info-fuente').textContent = data.fuente || '-';
    
    const formulaContainer = document.getElementById('info-formula');
    if (data.formulaDefinicion && data.formulaDefinicion.includes('/')) {
        formulaContainer.innerHTML = renderizarFraccionFormula(data.formulaDefinicion);
    } else {
        formulaContainer.textContent = data.formulaDefinicion || '-';
    }
    
    window.metaGlobal = metaValor;
}

function formatearTipoProceso(tipo) {
    const tipos = {
        'estrategico': 'EstratÃ©gico',
        'misional': 'Misional',
        'de-apoyo': 'De Apoyo',
        'de-evaluacion': 'De EvaluaciÃ³n'
    };
    return tipos[tipo] || tipo;
}

function renderizarFraccionFormula(formula) {
    const partes = formula.split('/');
    if (partes.length === 2) {
        const numerador = partes[0].trim();
        const resto = partes[1].trim();
        const denominador = resto.replace(/\*.*$/, '').trim();
        const multiplicador = resto.includes('*') ? resto.match(/\*\s*(\d+)/)?.[1] || '100' : '100';
        
        return `
            <div class="flex flex-col items-center inline-flex">
                <span class="font-bold text-lg">${numerador}</span>
                <span class="w-full h-0.5 bg-slate-400 my-1"></span>
                <span class="font-bold text-lg">${denominador}</span>
                ${multiplicador !== '1' ? `<span class="mt-1">Ã— ${multiplicador}</span>` : ''}
            </div>
        `;
    }
    return formula;
}

// ==========================================
// GESTIÃ“N DE DATOS DE SEGUIMIENTO
// ==========================================

async function cargarDatosSeguimiento() {
    const codigo = expedienteActual?.codigo;
    if (!codigo) {
        datosSeguimiento = [];
        renderizarTabla();
        return;
    }
    
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
        console.log('API no disponible, usando localStorage');
    }
    
    const key = `${STORAGE_KEYS.HISTORIAL_DATOS}_${codigo}`;
    const guardado = localStorage.getItem(key);
    
    if (guardado) {
        datosSeguimiento = JSON.parse(guardado);
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
    localStorage.setItem(key, JSON.stringify(datosSeguimiento));
    
    try {
        if (typeof API !== 'undefined' && API.indicators) {
            const historialAPI = datosSeguimiento.map(d => ({
                fecha: d.fecha,
                valor: d.resultado,
                devengado: d.devengado,
                pim: d.pim,
                meta: d.metaPeriodo,
                analisis: d.analisis,
                acciones: d.acciones
            }));
            
            await simulateAPIsave(`indicadores/${codigo}/historial`, {
                codigo: codigo,
                historial: historialAPI,
                lastUpdate: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error sincronizando con API:', error);
    }
    
    showToast('Datos guardados correctamente', 'success');
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
        const cumplimiento = calcularCumplimiento(dato.resultado, dato.metaPeriodo);
        const claseBadge = cumplimiento >= 95 ? 'alto' : cumplimiento >= 80 ? 'medio' : 'bajo';
        
        return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fade-in" style="animation-delay: ${index * 0.05}s">
                <td class="px-4 py-3 text-center font-medium text-slate-500">${index + 1}</td>
                <td class="px-4 py-3 font-medium">${formatearFecha(dato.fecha)}</td>
                <td class="px-4 py-3 text-right font-mono">${formatearMoneda(dato.devengado)}</td>
                <td class="px-4 py-3 text-right font-mono">${formatearMoneda(dato.pim)}</td>
                <td class="px-4 py-3 text-right font-bold text-primary">${(dato.resultado * 100).toFixed(2)}%</td>
                <td class="px-4 py-3 text-right">${dato.metaPeriodo}%</td>
                <td class="px-4 py-3">
                    <span class="badge-cumplimiento ${claseBadge}">${cumplimiento.toFixed(2)}%</span>
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
    if (!meta || meta == 0) return 0;
    return (parseFloat(resultado) / parseFloat(meta)) * 1.00;
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
        datosSeguimiento.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        showToast('Dato agregado correctamente', 'success');
    }
    
    cerrarModal();
    renderizarTabla();
    actualizarGraficos();
    await guardarDatosSeguimiento();
}

async function eliminarDato(index) {
    if (!confirm('Â¿EstÃ¡ seguro de eliminar este registro?')) return;
    
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
// GRÃFICOS Y ESTADÃSTICAS
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
        return sum + calcularCumplimiento(d.resultado, d.metaPeriodo);
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
    const maxValor = Math.max(...datos.map(d => Math.max(d.resultado, d.metaPeriodo))) * 1.1 || 100;
    
    const xScale = (i) => padding.left + (i / (datos.length - 1 || 1)) * chartWidth;
    const yScale = (val) => padding.top + chartHeight - (val / maxValor) * chartHeight;
    
    const puntos = datos.map((d, i) => `${xScale(i)},${yScale(d.resultado)}`).join(' ');
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
                <circle cx="${xScale(i)}" cy="${yScale(d.resultado)}" r="4" class="punto-dato">
                    <title>${formatearFecha(d.fecha)}: ${d.resultado}%</title>
                </circle>
            `).join('')}
            ${labelsY}
            ${labelsX}
        </svg>
    `;
}

function actualizarGauge(porcentaje) {
    const circulo = document.getElementById('circulo-progreso');
    const texto = document.getElementById('promedio-cumplimiento');
    const estado = document.getElementById('estado-texto');
    
    const circunferencia = 502;
    const offset = circunferencia - (porcentaje / 100) * circunferencia;
    
    circulo.style.strokeDashoffset = offset;
    texto.textContent = porcentaje.toFixed(1) + '%';
    
    let color = '#1978e5';
    let estadoTexto = 'Cumplimiento';
    let claseEstado = 'bg-slate-100 dark:bg-slate-800 text-slate-600';
    
    if (porcentaje >= 95) {
        color = '#10b981';
        estadoTexto = 'Excelente';
        claseEstado = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700';
    } else if (porcentaje >= 80) {
        color = '#f59e0b';
        estadoTexto = 'Aceptable';
        claseEstado = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700';
    } else if (porcentaje > 0) {
        color = '#ef4444';
        estadoTexto = 'Necesita Mejora';
        claseEstado = 'bg-red-100 dark:bg-red-900/30 text-red-700';
    }
    
    circulo.style.stroke = color;
    texto.style.color = color;
    estado.textContent = estadoTexto;
    estado.className = `text-xs mt-2 px-3 py-1 rounded-full font-bold ${claseEstado}`;
}

// ==========================================
// SINCRONIZACIÃ“N Y EXPORTAR
// ==========================================

async function sincronizarConAPI() {
    showToast('Sincronizando con el servidor...', 'info');
    
    try {
        if (expedienteActual) {
            await guardarIndicadorEnAPI(expedienteActual);
        }
        await guardarDatosSeguimiento();
        showToast('SincronizaciÃ³n completada', 'success');
    } catch (error) {
        console.error('Error en sincronizaciÃ³n:', error);
        showToast('Error al sincronizar. Verifique su conexiÃ³n.', 'error');
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
            ['CÃ³digo:', expedienteActual?.codigo || '-'],
            ['Nombre:', expedienteActual?.nombreIndicador || '-'],
            ['Macro Proceso:', expedienteActual?.macroProceso || '-'],
            ['Proceso:', expedienteActual?.proceso || '-'],
            ['Unidad Responsable:', expedienteActual?.unidadResponsable || '-'],
            ['Meta:', expedienteActual?.meta || '-'],
            ['FÃ³rmula:', expedienteActual?.formulaDefinicion || '-']
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
        
        const headers = ['NÂ°', 'Fecha', 'Resultado', 'Meta', '% Cumpl.'];
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
            const cumplimiento = calcularCumplimiento(dato.resultado, dato.metaPeriodo);
            
            const row = [
                (i + 1).toString(),
                formatearFecha(dato.fecha),
                dato.resultado + '%',
                dato.metaPeriodo + '%',
                cumplimiento.toFixed(1) + '%'
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
            doc.text(`SIGPRO UNMSM - PÃ¡gina ${i} de ${pageCount}`, 105, 290, { align: 'center' });
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
    expedienteActual = {
        codigo: 'IND-DEMO-001',
        macroProceso: 'GestiÃ³n EstratÃ©gica',
        proceso: 'PlanificaciÃ³n Institucional',
        version: '1.0',
        tipoProceso: 'estrategico',
        unidadResponsable: 'Oficina de PlanificaciÃ³n',
        objetivoProceso: 'Optimizar la gestiÃ³n institucional',
        nombreIndicador: 'Ãndice de EjecuciÃ³n Presupuestal',
        frecuencia: 'mensual',
        meta: '95',
        formulaDefinicion: 'Devengado / PIM * 100%',
        fuente: 'Sistema Financiero',
        variables: 'Devengado = Gasto ejecutado\nPIM = Presupuesto Institucional Modificado'
    };
    
    mostrarInfoTecnica(expedienteActual);
    
    datosSeguimiento = [
        { fecha: '2026-01', devengado: 15400, pim: 200000, resultado: 7.70, metaPeriodo: 8.00, analisis: 'Inicio de procesos', acciones: 'Acelerar TDRs' },
        { fecha: '2026-02', devengado: 32150, pim: 200000, resultado: 16.08, metaPeriodo: 15.00, analisis: 'SuperÃ³ proyecciÃ³n', acciones: 'Mantener ritmo' },
        { fecha: '2026-03', devengado: 48900, pim: 200000, resultado: 24.45, metaPeriodo: 25.00, analisis: 'Ligero retraso', acciones: 'Seguimiento a proveedores' }
    ];
    
    renderizarTabla();
    actualizarGraficos();
    showToast('Mostrando datos de demostraciÃ³n', 'info');
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

function guardarDatos() {
    guardarDatosSeguimiento();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModal();
    }
});

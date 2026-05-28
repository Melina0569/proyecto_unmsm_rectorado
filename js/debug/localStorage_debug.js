/**
 * SCRIPT DE DEBUGGING PARA VERIFICAR localStorage
 * Ejecuta esto en la consola del navegador: F12 > Console
 * 
 * Luego pega este código y presiona Enter
 */

console.log('='.repeat(60));
console.log('🔍 VERIFICACIÓN DE STORAGE DEL SISTEMA SIGPRO');
console.log('='.repeat(60));

// 1. Verificar DOCUMENTOS_LISTA
console.log('\n📋 1. DOCUMENTOS_LISTA (Lista de documentos)');
const docsRaw = localStorage.getItem('sigpro_documentos_lista');
if (docsRaw) {
    const docs = JSON.parse(docsRaw);
    console.log(`   Total: ${docs.length} documentos`);
    docs.forEach((doc, idx) => {
        console.log(`   [${idx}] ${doc.codigo} - ${doc.descripcion} (${doc.estado})`);
    });
} else {
    console.log('   ❌ VACÍO - No hay documentos en lista');
}

// 2. Verificar DOCUMENTOS_DETALLE
console.log('\n📦 2. DOCUMENTOS_DETALLE (Detalles de documentos)');
const detalleRaw = localStorage.getItem('sigpro_documentos_detalle');
if (detalleRaw) {
    try {
        const detalle = JSON.parse(detalleRaw);
        const codigos = Object.keys(detalle);
        console.log(`   Total: ${codigos.length} detalles guardados`);
        
        codigos.forEach(codigo => {
            const item = detalle[codigo];
            const adjuntos = Array.isArray(item.adjuntos) ? item.adjuntos : [];
            console.log(`\n   ✓ ${codigo}`);
            console.log(`     • Tipo: ${item.tipo}`);
            console.log(`     • Título: ${item.titulo}`);
            console.log(`     • Campos: ${Array.isArray(item.resumenCampos) ? item.resumenCampos.length : 0}`);
            console.log(`     • Adjuntos: ${adjuntos.length}`);
            
            if (adjuntos.length > 0) {
                adjuntos.forEach((adj, idx) => {
                    console.log(`       [${idx}] ${adj.nombre} (${adj.tipo}) - ${adj.tamaño}`);
                });
            }
            
            // Verificar campo archivo en resumen
            if (Array.isArray(item.resumenCampos)) {
                const archivoCampo = item.resumenCampos.find(c => /archivo/.test(c.label.toLowerCase()));
                if (archivoCampo) {
                    console.log(`       📄 Campo de archivo encontrado: "${archivoCampo.value}"`);
                }
            }
        });
    } catch (e) {
        console.error('   ❌ ERROR al parsear DOCUMENTOS_DETALLE:', e);
    }
} else {
    console.log('   ❌ VACÍO - No hay detalles de documentos');
}

// 3. Verificar INDICADORES_DETALLE
console.log('\n📊 3. INDICADORES_DETALLE (Detalles de indicadores)');
const indicRaw = localStorage.getItem('sigpro_indicadores_detalle');
if (indicRaw) {
    try {
        const indic = JSON.parse(indicRaw);
        const codigos = Object.keys(indic);
        console.log(`   Total: ${codigos.length} indicadores guardados`);
        codigos.forEach(codigo => {
            console.log(`   ✓ ${codigo} - ${indic[codigo].nombreIndicador}`);
        });
    } catch (e) {
        console.error('   ❌ ERROR al parsear:', e);
    }
} else {
    console.log('   ❌ VACÍO');
}

console.log('\n' + '='.repeat(60));
console.log('Uso: Inspeciona los datos arriba y reporte qué adjuntos ves/no ves');
console.log('='.repeat(60));

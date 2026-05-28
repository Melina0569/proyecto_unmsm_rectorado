/**
 * INSTRUCCIONES PARA DIAGNOSTICAR EL PROBLEMA DEL PDF
 * 
 * 1. Abre tu navegador
 * 2. Presiona F12 para abrir Developer Tools
 * 3. Ve a la pestaña "Console"
 * 4. Copia TODO lo que está entre las línea de ===== y pégalo en la consola
 * 5. Presiona ENTER
 * 6. Verás el estado del localStorage
 * 
 * ============================================================== START ==============================================================
 */

// ============= VERIFICADOR DE localStorage =============
const STORAGE_KEYS = {
    DOCUMENTOS_LISTA: 'sigpro_documentos_lista',
    DOCUMENTOS_DETALLE: 'sigpro_documentos_detalle'
};

console.clear();
console.log('\n' + '█'.repeat(70));
console.log('  📋 DIAGNÓSTICO DE DOCUMENTOS EN localStorage');
console.log('█'.repeat(70) + '\n');

// 1. Verificar DOCUMENTOS_LISTA
const listaRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_LISTA);
console.log('1️⃣  DOCUMENTOS_LISTA (Lista de documentos):');
if (!listaRaw) {
    console.log('   ❌ VACÍO - No hay documentos creados\n');
} else {
    try {
        const lista = JSON.parse(listaRaw);
        console.log(`   ✅ ${lista.length} documento(s) encontrado(s):`);
        lista.forEach((doc, i) => {
            console.log(`      [${i}] ${doc.codigo} - ${doc.descripcion} (${doc.estado})`);
        });
        console.log();
    } catch (e) {
        console.log(`   ❌ ERROR parseando: ${e.message}\n`);
    }
}

// 2. Verificar DOCUMENTOS_DETALLE
const detalleRaw = localStorage.getItem(STORAGE_KEYS.DOCUMENTOS_DETALLE);
console.log('2️⃣  DOCUMENTOS_DETALLE (Detalles con adjuntos):');
if (!detalleRaw) {
    console.log('   ❌ VACÍO - No hay detalles guardados\n');
} else {
    try {
        const detalle = JSON.parse(detalleRaw);
        const codigos = Object.keys(detalle);
        console.log(`   ✅ ${codigos.length} código(s) con detalles:\n`);
        
        codigos.forEach(cod => {
            const item = detalle[cod];
            console.log(`   📄 [${cod}]`);
            console.log(`      • Tipo: ${item.tipo}`);
            console.log(`      • Título: ${item.titulo}`);
            
            const adjuntos = Array.isArray(item.adjuntos) ? item.adjuntos : [];
            console.log(`      • Adjuntos: ${adjuntos.length}`);
            
            if (adjuntos.length > 0) {
                adjuntos.forEach((adj, idx) => {
                    console.log(`         [${idx}] ✅ ${adj.nombre} (${adj.tipo}) - ${adj.tamaño}`);
                });
            } else {
                console.log(`         ❌ SIN ADJUNTOS`);
            }
            
            // Verificar campo "Archivo" en resumen
            if (Array.isArray(item.resumenCampos)) {
                const archivoCampo = item.resumenCampos.find(c => 
                    /archivo/.test(String(c.label).toLowerCase())
                );
                if (archivoCampo) {
                    console.log(`      • Campo Archivo en Resumen: "${archivoCampo.value}"`);
                }
            }
            console.log();
        });
    } catch (e) {
        console.log(`   ❌ ERROR parseando: ${e.message}\n`);
    }
}

console.log('█'.repeat(70));
console.log('  ✅ DIAGNÓSTICO COMPLETADO');
console.log('█'.repeat(70) + '\n');

console.log('PRÓXIMOS PASOS:');
console.log('  1. Verifica los resultados arriba');
console.log('  2. Si ves "Adjuntos: 0" → El PDF no se guardó');
console.log('  3. Si ves "Adjuntos: 1" → El PDF SÍ está guardado pero no se muestra');
console.log('  4. Si ves vacío → No hay documentos. Crea uno.'  + '\n');

/**
 * ============================================================== END ==============================================================
 */

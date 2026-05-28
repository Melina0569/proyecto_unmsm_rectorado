// QUICK DEBUG - Copia y pega en la consola del navegador (F12 > Console)

console.log('\n' + '='.repeat(70));
console.log('📋 DEBUG RÁPIDO - localStorage');
console.log('='.repeat(70));

const raw = localStorage.getItem('sigpro_documentos_detalle');
if (!raw) {
    console.log('❌ localStorage VACÍO - no hay DOCUMENTOS_DETALLE');
} else {
    try {
        const data = JSON.parse(raw);
        const codigos = Object.keys(data);
        console.log(`✅ Encontrados ${codigos.length} código(s):\n`);
        
        codigos.forEach(cod => {
            const item = data[cod];
            console.log(`📄 ${cod}`);
            console.log(`   tipo: ${item.tipo}`);
            console.log(`   adjuntos: ${item.adjuntos?.length || 0}`);
            if (item.adjuntos?.length > 0) {
                item.adjuntos.forEach((adj, i) => {
                    console.log(`      [${i}] ${adj.nombre} (${adj.tipo})`);
                });
            }
        });
    } catch (e) {
        console.error('❌ Error parseando:', e.message);
    }
}

console.log('\n' + '='.repeat(70));

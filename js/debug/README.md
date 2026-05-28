# 🔧 Debug Scripts - SIGPRO

Esta carpeta contiene scripts de ayuda para debugging y diagnóstico del sistema SIGPRO, especialmente para problemas con localStorage y adjuntos de documentos.

## 📂 Archivos

### 1. **localStorage_debug.js**
Inspecciona toda la estructura del localStorage del sistema.

**Uso:**
- Abre F12 > Console en tu navegador
- Copia el contenido de este archivo
- Pégalo en la consola y presiona ENTER

**Muestra:**
- Lista de todos los documentos guardados
- Detalles de cada documento (tipo, título, cantidad de campos)
- Adjuntos guardados con sus metadatos
- Campos de archivo en el resumen

### 2. **quick_debug.js**
Versión rápida y compacta del debug anterior.

**Uso:**
- Abre F12 > Console
- Copia y pega este script
- Presiona ENTER

**Muestra:**
- Solo información crítica: códigos, tipos y adjuntos

### 3. **diagnostic.js**
Script de diagnóstico completo para identificar problemas.

**Uso:**
- Abre F12 > Console
- Copia y pega este script
- Presiona ENTER

**Muestra:**
- Estado de DOCUMENTOS_LISTA
- Estado de DOCUMENTOS_DETALLE
- Verificación de adjuntos
- Recomendaciones based on findings

---

## 🚀 Cómo Usar

### Opción A: Copiar y Pegar en Consola

```bash
1. Abre e:\proyecto\js\debug\localStorage_debug.js
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Abre tu navegador en la aplicación SIGPRO
4. Presiona F12 y ve a la pestaña "Console"
5. Pega el código (Ctrl+V)
6. Presiona ENTER
7. Revisa los resultados
```

### Opción B: Cargar como Script en HTML (Desarrollo)

```html
<!-- En ficha-flujograma.html o facultades-documentos.html -->
<!-- Solo para DEBUGGING - Remover en producción -->
<script src="../js/debug/localStorage_debug.js"></script>
```

---

## 📊 Qué Buscar

### ✅ Señales de Éxito
```
✅ Encontrados 1 código(s)
📄 FL-26-XXX
   tipo: flujograma
   adjuntos: 1
      [0] mi-archivo.pdf (PDF)
```

### ❌ Problemas Comunes
```
❌ localStorage VACÍO - no hay DOCUMENTOS_DETALLE
   → Significa: No se guardó nada

❌ adjuntos: 0
   → Significa: El documento se guardó pero sin adjuntos

Adjuntos SÍ están pero no se muestran
   → Problema en la renderización en facultades-documentos.js
```

---

## 🐛 Formato de localStorage

### DOCUMENTOS_LISTA
```javascript
[
  {
    id: "local-FL-26-XXX",
    fecha: "2026-03-30",
    hora: "10:30 H",
    codigo: "FL-26-XXX",
    descripcion: "Flujograma - Nombre del Proceso",
    generadoPor: "Facultad",
    estado: "pendiente",
    progreso: 5,
    facultadId: 1,
    tipo: "flujograma"
  }
  // ... más documentos
]
```

### DOCUMENTOS_DETALLE
```javascript
{
  "FL-26-XXX": {
    tipo: "flujograma",
    codigo: "FL-26-XXX",
    titulo: "Flujograma - Nombre del Proceso",
    operacion: "GESTION DE FLUJOGRAMAS",
    resumenCampos: [
      { label: "Macro proceso", value: "PM.02 - ..." },
      { label: "Tipo de proceso", value: "misional" },
      { label: "Proceso", value: "nombre-proceso" },
      { label: "Archivo adjunto", value: "mi-archivo.pdf" }
    ],
    adjuntos: [
      {
        nombre: "mi-archivo.pdf",
        tipo: "PDF",
        tamaño: "125 KB",
        fecha: "2026-03-30",
        activo: true,
        icono: "picture_as_pdf"
      }
    ]
  }
  // ... más detalles
}
```

---

## 💡 Troubleshooting

**Problema:** "No hay documentos adjuntos para este registro"

**Checklist:**
1. ✅ ¿El documento aparece en DOCUMENTOS_LISTA?
2. ✅ ¿El documento tiene entrada en DOCUMENTOS_DETALLE?
3. ✅ ¿El array `adjuntos` está presente?
4. ✅ ✅ ¿El array `adjuntos` tiene elementos?
5. ✅ ¿El elemento tiene propiedades: nombre, tipo, tamaño, fecha, activo?

---

## 🗑️ Remover en Producción

⚠️ **IMPORTANTE:** Estos scripts son solo para desarrollo/debugging.

**Antes de deploy:**
```bash
# 1. Remover del HTML
- <script src="../js/debug/..."></script>

# 2. O eliminar toda la carpeta js/debug/
```

---

## 📝 Registro de Cambios

- **v1.0** - Scripts iniciales para debugging de localStorage y adjuntos

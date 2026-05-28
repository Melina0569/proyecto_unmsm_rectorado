# PDFs manuales para Mapa de Procesos

Ubica aqui los archivos PDF reales para que se visualicen y descarguen desde:
- Flujogramas
- Ficha tecnica

## Carpetas

- docs/pdfs/flujogramas/
- docs/pdfs/fichas/

## Convencion sugerida

- Flujogramas: usar codigo del flujograma, por ejemplo:
  - docs/pdfs/flujogramas/PROC-001.pdf
  - docs/pdfs/flujogramas/PROC-002.pdf

- Ficha tecnica: usar codigo del proceso, por ejemplo:
  - docs/pdfs/fichas/PE.01.pdf
  - docs/pdfs/fichas/PM.01.pdf

## Configuracion en js/process-map.js

En manualPdfCatalog agrega el mapeo codigo -> ruta:

flowcharts: {
  'PROC-001': 'docs/pdfs/flujogramas/PROC-001.pdf'
},
fichaTecnica: {
  'PE.01': 'docs/pdfs/fichas/PE.01.pdf'
}

Si no existe URL real en el mapeo o en el dato, el sistema usa el fallback simulado.

# Gestor Hostal Matilda's

Aplicación de contabilidad del hostal (una sola página, `index.html`). Registra
ingresos (reservas) y gastos (fijos y variables), genera informe PDF para la
gestora y export CSV.

## Web en vivo

**https://hostalmatildas-dot.github.io/gestorhostal/**

> La URL antigua `rewendolin.github.io/gestorhostal/` está **deprecada** (código
> viejo). No usar.

## Cómo desplegar

Se publica con **GitHub Pages** desde este repo (`hostalmatildas-dot/gestorhostal`),
rama `main`. Para publicar cambios:

```bash
git add index.html
git commit -m "..."
git push origin main
```

GitHub Pages reconstruye solo (~1-2 min).

## Datos

Las reservas y gastos se sincronizan con **Firebase Firestore** (documento fijo
`hostal/datos`). No se guardan en el repo; `localStorage` es solo caché. Por eso
los datos se conservan aunque cambie el dominio, y se comparten entre dispositivos.

## Uso en el móvil

Funciona en cualquier navegador móvil abriendo la URL. Es una PWA: se puede
"Añadir a pantalla de inicio". Al adjuntar un justificante de gasto, el móvil
ofrece cámara, galería o archivos (foto o PDF).

## Nota de seguridad

`index.html` incluye una clave de API de Anthropic en el cliente (para el OCR de
tickets). Como el repo es **público**, esa clave queda expuesta. Conviene rotarla
y moverla a un proxy/función serverless. Ver el historial de conversación con
Claude Code para más contexto.

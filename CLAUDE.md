# Gestor Hostal Matilda's — contabilidad 2026

App estática sin build: se abre `index.html` y ya. Sin npm, sin bundler.

## Archivos
- `index.html` — solo marcado (páginas, modales). Carga `styles.css`, `data.js` y `app.js`.
- `data.js` — datos base: reservas Q1/Q2 2026, gastos fijos del sistema, semilla de gastos variables. Helper `sj()` (JSON.parse seguro de localStorage).
- `app.js` — toda la lógica: dashboard, habitaciones, gastos, informe, OCR/importación con IA, sync Firebase, copia de seguridad.
- `styles.css` — estilos.
- `netlify/functions/anthropic.mjs` — proxy de la API de Anthropic (clave en env `ANTHROPIC_API_KEY`, protegido con header `x-app-secret` == env `APP_SECRET`).

## Datos
- Los datos añadidos por la usuaria viven en localStorage (claves `ing_extra`, `gv5`, `gf6`, `gf_deleted`) y se sincronizan con Firestore (doc `hostal/datos`, proyecto `gestor-hostal`). El sync sube al momento al guardar y baja cada 5 min o al volver a la pestaña.
- `data.js` solo cambia si hay que corregir datos históricos verificados con documento.

## Despliegue
- GitHub Pages: push a `main` en `hostalmatildas-dot/gestorhostal` → https://hostalmatildas-dot.github.io/gestorhostal/ (workflow `.github/workflows/pages.yml`).
- Netlify (sitio `hostal-matildas`, alberga el proxy de la IA): `netlify deploy --prod`. La app llama al proxy por URL absoluta (`PROXY_URL` en app.js), así la IA funciona desde ambos dominios.

## Reglas fijas
- **Nunca estimar ni inventar gastos/ingresos**: sin documento (ticket, factura, informe) no se carga nada.
- Ninguna clave de API va al código: solo variables de entorno en Netlify.
- `INVENTARIO_PLATAFORMAS.csv` es privado (gitignored) — no debe publicarse ni subirse.

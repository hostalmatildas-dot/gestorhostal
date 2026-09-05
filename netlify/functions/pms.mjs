// Puente hacia el PMS (el programa de reservas) para la contabilidad.
//
// Por qué existe: el Gestor vive en GitHub Pages y el PMS en Railway, dos dominios
// distintos. La sesión del panel del PMS es una cookie SameSite=lax, y el navegador NO
// la manda nunca en una llamada a otro dominio: por eso /accounting/reservations
// contestaba siempre "Unauthorized" y el botón «Sync PMS» no traía nada.
//
// La llave del PMS (GESTOR_API_KEY) vive SOLO aquí, en las variables de entorno de
// Netlify — nunca en el navegador, donde cualquiera podría leerla y sacar el listado de
// huéspedes. Quien llama desde el navegador se identifica con la misma contraseña
// compartida que ya usa la IA (APP_SECRET), igual que en anthropic.mjs.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
  'Access-Control-Max-Age': '86400',
};

const PMS_BASE = 'https://web-production-10bda.up.railway.app';

const json = (obj, status) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json', ...CORS },
});

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  const secret = req.headers.get('x-app-secret') || '';
  if (!process.env.APP_SECRET || secret !== process.env.APP_SECRET) {
    return json({ error: { message: 'No autorizado' } }, 401);
  }
  if (!process.env.GESTOR_API_KEY) {
    return json({ error: { message: 'Falta GESTOR_API_KEY en el servidor' } }, 500);
  }

  // Solo se deja pasar el año, y como número: nada de reenviar al PMS lo que llegue.
  const year = parseInt(new URL(req.url).searchParams.get('year'), 10);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return json({ error: { message: 'Año no válido' } }, 400);
  }

  let r;
  try {
    r = await fetch(`${PMS_BASE}/accounting/reservations?year=${year}`, {
      headers: { 'X-Gestor-API-Key': process.env.GESTOR_API_KEY },
    });
  } catch (e) {
    return json({ error: { message: 'No se pudo conectar con el PMS' } }, 502);
  }

  const body = await r.text();
  if (!r.ok) {
    // El detalle del PMS no se reenvía tal cual: puede llevar rutas o pistas internas.
    return json({ error: { message: `El PMS respondió ${r.status}` } }, r.status === 401 ? 502 : r.status);
  }
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
};

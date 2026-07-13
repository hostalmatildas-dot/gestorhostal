// Proxy hacia la API de Anthropic.
// La clave vive SOLO aquí (variable de entorno ANTHROPIC_API_KEY en Netlify), nunca en el navegador.
// Se protege con una contraseña compartida (APP_SECRET) para que nadie ajeno gaste el saldo.
// CORS: la app vive en otro dominio (GitHub Pages) — sin estas cabeceras el navegador
// bloquea la llamada antes de enviarla. La barrera de acceso real es APP_SECRET.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
  'Access-Control-Max-Age': '86400',
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }
  const secret = req.headers.get('x-app-secret') || '';
  if (!process.env.APP_SECRET || secret !== process.env.APP_SECRET) {
    return new Response(JSON.stringify({ error: { message: 'No autorizado' } }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: { message: 'Falta ANTHROPIC_API_KEY en el servidor' } }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
  const body = await req.text();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
    },
    body,
  });
  const txt = await r.text();
  return new Response(txt, {
    status: r.status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
};

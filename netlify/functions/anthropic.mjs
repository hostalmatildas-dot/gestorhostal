// Proxy hacia la API de Anthropic.
// La clave vive SOLO aquí (variable de entorno ANTHROPIC_API_KEY en Netlify), nunca en el navegador.
// Se protege con una contraseña compartida (APP_SECRET) para que nadie ajeno gaste el saldo.
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const secret = req.headers.get('x-app-secret') || '';
  if (!process.env.APP_SECRET || secret !== process.env.APP_SECRET) {
    return new Response(JSON.stringify({ error: { message: 'No autorizado' } }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: { message: 'Falta ANTHROPIC_API_KEY en el servidor' } }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
  });
};

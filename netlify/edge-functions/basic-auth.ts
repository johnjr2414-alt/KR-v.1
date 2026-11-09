const REALM = 'Knowledge Realms Testers';

interface EdgeContext {
  next: () => Promise<Response>;
}

// Fail closed: without TESTER_USER and TESTER_PASS the site is not served.
export default async function basicAuth(
  request: Request,
  context: EdgeContext,
): Promise<Response> {
  const expectedUser = Deno.env.get('TESTER_USER');
  const expectedPass = Deno.env.get('TESTER_PASS');

  if (!expectedUser || !expectedPass) {
    return new Response('Tester credentials are not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return unauthorized();

  let decoded: string;
  try {
    decoded = atob(header.slice('Basic '.length));
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(':');
  if (separator < 0) return unauthorized();

  const user = decoded.slice(0, separator);
  const pass = decoded.slice(separator + 1);
  if (safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)) {
    return context.next();
  }
  return unauthorized();
}

export const config = { path: '/*' };

function unauthorized(): Response {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

import type { IncomingMessage } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

export const identities = {
  coach: {
    id: 'local-form-coach',
    email: 'coach@form.test',
    name: 'Sam Coach',
  },
  client: {
    id: 'local-form-client',
    email: 'client@form.test',
    name: 'Alex Client',
  },
  // Independent trainee with no coaching membership: free-tier app view.
  solo: {
    id: 'local-form-solo',
    email: 'solo@form.test',
    name: 'Riley Solo',
  },
} as const;
export type DevRole = keyof typeof identities;
const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const addresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const expoOrigins = new Set(['http://localhost:8081', 'http://127.0.0.1:8081']);

export function allowedLocalRequest(
  request: Pick<IncomingMessage, 'headers' | 'socket' | 'url'>,
) {
  try {
    const authority = new URL(`http://${request.headers.host}`);
    const url = new URL(request.url ?? '/', authority);
    const origin = request.headers.origin;
    return (
      hosts.has(authority.hostname) &&
      addresses.has(request.socket.remoteAddress ?? '') &&
      url.origin === authority.origin &&
      request.headers['sec-fetch-site'] !== 'cross-site' &&
      (!origin || origin === authority.origin || expoOrigins.has(origin))
    );
  } catch {
    return false;
  }
}

function setHeader(request: IncomingMessage, name: string, value?: string) {
  delete request.headers[name];
  for (let i = request.rawHeaders.length - 2; i >= 0; i -= 2) {
    if (request.rawHeaders[i]?.toLowerCase() === name)
      request.rawHeaders.splice(i, 2);
  }
  if (value !== undefined) {
    request.headers[name] = value;
    request.rawHeaders.push(name, value);
  }
}

// Vite middleware only: never included in the Worker or activated by a request.
// Each loopback server has one fixed identity; ports isolate web storage.
export function localRoles(token: string | undefined): Plugin {
  return {
    name: 'form-local-roles',
    apply: 'serve',
    configureServer(server) {
      if (!token) return;
      server.middlewares.use((request, response, next) => {
        for (const name of Object.keys(request.headers)) {
          if (name.startsWith('oai-authenticated-user-'))
            setHeader(request, name);
        }
        const supplied = request.headers['x-form-dev-token'];
        const role = request.headers['x-form-dev-role'];
        const validToken =
          typeof supplied === 'string' &&
          Buffer.byteLength(supplied) === Buffer.byteLength(token) &&
          timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
        setHeader(request, 'x-form-dev-token');
        setHeader(request, 'x-form-dev-role');
        if (
          !allowedLocalRequest(request) ||
          !validToken ||
          typeof role !== 'string' ||
          !Object.hasOwn(identities, role)
        ) {
          response.writeHead(403, { 'Cache-Control': 'no-store' });
          response.end(
            'Local role previews accept only trusted loopback requests.',
          );
          return;
        }
        const identity = identities[role as DevRole];
        if (request.url?.split('?')[0] === '/__dev/phones') {
          void readFile(new URL('./phones.html', import.meta.url), 'utf8')
            .then((html) => {
              response.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
              });
              response.end(html);
            })
            .catch(() => {
              response.writeHead(500);
              response.end('Preview could not be loaded.');
            });
          return;
        }
        const origin = request.headers.origin;
        if (origin && expoOrigins.has(origin)) {
          response.setHeader('Access-Control-Allow-Origin', origin);
          response.setHeader('Vary', 'Origin');
          response.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, OPTIONS',
          );
          response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          if (request.method === 'OPTIONS') {
            response.writeHead(204);
            response.end();
            return;
          }
          // This explicit local Expo origin has passed the development boundary.
          setHeader(request, 'origin', `http://${request.headers.host}`);
        }
        setHeader(request, 'oai-authenticated-user-id', identity.id);
        setHeader(request, 'oai-authenticated-user-email', identity.email);
        setHeader(
          request,
          'oai-authenticated-user-full-name',
          encodeURIComponent(identity.name),
        );
        setHeader(
          request,
          'oai-authenticated-user-full-name-encoding',
          'percent-encoded-utf-8',
        );
        next();
      });
    },
  };
}

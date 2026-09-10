import { spawn } from 'node:child_process';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { allowedLocalRequest } from '../dev/roles.ts';

// One Workerd runtime owns SQLite; two loopback proxies isolate identity/storage.
const token = randomBytes(32).toString('hex');
const children = new Set();
const servers = [];
const sockets = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const server of servers) server.close();
  for (const socket of sockets) socket.destroy();
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    children.add(child);
    child.on('error', reject);
    child.on('exit', (code) => {
      children.delete(child);
      if (code === 0) resolve();
      else reject(new Error(`Setup exited with ${code}`));
    });
  });
}
function proxy(role, port) {
  const upstream = (request) => {
    const headers = { ...request.headers };
    for (const name of Object.keys(headers)) {
      if (
        name.startsWith('x-form-dev-') ||
        name.startsWith('oai-authenticated-user-')
      )
        delete headers[name];
    }
    headers['x-form-dev-token'] = token;
    headers['x-form-dev-role'] = role;
    return http.request({
      hostname: '127.0.0.1',
      port: 3102,
      method: request.method,
      path: request.url,
      headers,
    });
  };
  const server = http.createServer((request, response) => {
    if (!allowedLocalRequest(request)) {
      response.writeHead(403);
      response.end('Loopback preview only.');
      return;
    }
    const target = upstream(request);
    target.on('response', (result) => {
      response.writeHead(result.statusCode ?? 502, result.headers);
      result.pipe(response);
    });
    target.on('error', () => {
      if (!response.headersSent) response.writeHead(503);
      response.end('Local backend is starting. Please retry.');
    });
    request.pipe(target);
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (request, socket, head) => {
    if (!allowedLocalRequest(request)) {
      socket.destroy();
      return;
    }
    const target = upstream(request);
    target.on('upgrade', (result, connection, remoteHead) => {
      socket.write(
        `HTTP/1.1 ${result.statusCode} ${result.statusMessage}\r\n` +
          result.rawHeaders.reduce(
            (text, value, index, all) =>
              index % 2 === 0 ? text + `${value}: ${all[index + 1]}\r\n` : text,
            '',
          ) +
          '\r\n',
      );
      if (head.length) connection.write(head);
      if (remoteHead.length) socket.write(remoteHead);
      connection.pipe(socket).pipe(connection);
      connection.on('error', () => socket.destroy());
      socket.on('error', () => connection.destroy());
      socket.on('close', () => connection.destroy());
    });
    target.on('error', () => socket.destroy());
    target.end();
  });
  servers.push(server);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}
try {
  await run(['run', 'db:local']);
  await run(['run', 'db:seed']);
  if (!stopping) {
    await proxy('coach', 3100);
    await proxy('client', 3101);
    await proxy('solo', 3103);
    const child = spawn(
      process.execPath,
      [
        'node_modules/vinext/dist/cli.js',
        'dev',
        '--hostname',
        '127.0.0.1',
        '--port',
        '3102',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, FORM_DEV_TOKEN: token },
      },
    );
    children.add(child);
    child.on('error', (error) => {
      console.error(error);
      stop(1);
    });
    child.on('exit', (code) => {
      children.delete(child);
      if (!stopping) stop(code || 1);
    });
    console.log(
      '\nCoach: http://127.0.0.1:3100/coaching\nClient: http://127.0.0.1:3101/\nSolo (no coach): http://127.0.0.1:3103/\nSeparate identities; shared local database.\n',
    );
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}

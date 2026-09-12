import handler from 'vinext/server/fetch-handler';
import { authenticateAccess, type AccessEnvironment } from './access';

type AssetsEnvironment = { ASSETS?: { fetch: typeof fetch } };

const worker = {
  async fetch(
    request: Request,
    env: Cloudflare.Env & AccessEnvironment & AssetsEnvironment,
    ctx: ExecutionContext,
  ) {
    const verified = await authenticateAccess(request, env);
    if (verified instanceof Response) return verified;
    const url = new URL(verified.url);
    // The Worker runs before static assets so Access guards them too. Serve
    // built files from the assets binding and let the app handle the rest.
    if (
      env.ASSETS &&
      (verified.method === 'GET' || verified.method === 'HEAD')
    ) {
      const asset = await env.ASSETS.fetch(verified);
      if (asset.status !== 404) return asset;
    }
    if (url.pathname === '/signin-with-chatgpt') {
      // Access has already authenticated this request before the existing UI's sign-in path.
      const target = new URL(
        url.searchParams.get('return_to') || '/',
        url.origin,
      );
      const safe =
        target.origin === url.origin &&
        ![
          '/signin-with-chatgpt',
          '/signout-with-chatgpt',
          '/callback',
        ].includes(target.pathname);
      return Response.redirect(safe ? target.href : url.origin + '/', 302);
    }
    if (url.pathname === '/signout-with-chatgpt')
      return Response.redirect(url.origin + '/cdn-cgi/access/logout', 302);
    return handler.fetch(verified, env, ctx);
  },
};

export default worker;

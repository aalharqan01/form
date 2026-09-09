import handler from 'vinext/server/fetch-handler';
import { authenticateAccess, type AccessEnvironment } from './access';

const worker = {
  async fetch(
    request: Request,
    env: Cloudflare.Env & AccessEnvironment,
    ctx: ExecutionContext,
  ) {
    const verified = await authenticateAccess(request, env);
    if (verified instanceof Response) return verified;
    const url = new URL(verified.url);
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

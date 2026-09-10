declare module 'virtual:vinext-worker-entry' {
  const handler: {
    fetch(
      request: Request,
      env: Cloudflare.Env,
      ctx: ExecutionContext,
    ): Promise<Response>;
  };
  export default handler;
}

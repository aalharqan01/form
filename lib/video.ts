/** Turn supported public video URLs into safe player sources; never embed arbitrary HTML. */
export function exerciseVideo(
  value: string,
): { kind: 'embed' | 'file'; src: string } | null {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port)
      return null;
    const host = u.hostname.toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (host === 'youtu.be') id = parts.length === 1 ? parts[0] : null;
    if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtube-nocookie.com',
        'www.youtube-nocookie.com',
      ].includes(host)
    ) {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (
        ['embed', 'shorts', 'live'].includes(parts[0]) &&
        parts.length === 2
      )
        id = parts[1];
    }
    if (id && /^[\w-]{11}$/.test(id))
      return {
        kind: 'embed',
        src: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`,
      };
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const match = u.pathname.match(
        /^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/,
      );
      if (match) {
        const hash = match[2] ?? u.searchParams.get('h');
        const src = new URL(`https://player.vimeo.com/video/${match[1]}`);
        if (hash && /^[a-zA-Z0-9]+$/.test(hash))
          src.searchParams.set('h', hash);
        src.searchParams.set('dnt', '1');
        return { kind: 'embed', src: src.toString() };
      }
    }
    if (/\.(mp4|webm|ogv|ogg)$/i.test(u.pathname))
      return { kind: 'file', src: u.toString() };
    return null;
  } catch {
    return null;
  }
}

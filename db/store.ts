import { env } from 'cloudflare:workers';
export function database() {
  if (!env.DB) throw new Error('Database unavailable');
  return env.DB;
}

export function videoStorage() {
  return env.VIDEOS;
}

/**
 * Development deployments set PREVIEW_ROLES so every signed-in developer gets
 * sample fixtures and can view the app as a coached or an independent trainee.
 */
export function previewRolesEnabled() {
  return (env as { PREVIEW_ROLES?: string }).PREVIEW_ROLES === 'true';
}

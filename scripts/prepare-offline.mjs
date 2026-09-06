import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = 'dist/client';
async function list(dir) {
  return (
    await Promise.all(
      (
        await readdir(dir, { withFileTypes: true })
      ).map(async (f) =>
        f.isDirectory() ? list(dir + '/' + f.name) : [dir + '/' + f.name],
      ),
    )
  ).flat();
}
const files = (await list(root)).filter(
  (f) => /\.(js|css|woff2?|png)$/.test(f) && !f.endsWith('/sw.js'),
);
const paths = files.map((f) => f.slice(root.length));
const hash = createHash('sha256')
  .update(paths.join('\n'))
  .digest('hex')
  .slice(0, 12);
const template = await readFile('public/sw.js', 'utf8');
await writeFile(
  root + '/sw.js',
  template
    .replace('form-shell-v2', `form-shell-${hash}`)
    .replace('/* ASSET_LIST */[]', JSON.stringify(paths)),
);
console.log(`Offline shell prepared with ${paths.length} app assets.`);

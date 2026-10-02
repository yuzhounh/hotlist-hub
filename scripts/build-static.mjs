import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'static';
if (!['static', 'github'].includes(target)) throw new Error('Expected static or github');
const name = target === 'github' ? 'dist_pages' : 'dist_netlify';
const output = join(root, name);
const staging = join(root, `.${name}-build`);
for (const path of [output, staging]) {
  const info = await lstat(path).catch(() => null);
  if (info?.isSymbolicLink()) throw new Error(`Refusing linked output: ${path}`);
}
const basePath = target === 'github' ? '/hotlist-hub' : '';
const apiOrigin = 'https://hotlist-hub.vercel.app';
execFileSync(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'build'], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_HOT_API_ORIGIN: apiOrigin },
});
const manifest = JSON.parse(await readFile(join(root, '.next/prerender-manifest.json'), 'utf8'));
const actions = JSON.parse(await readFile(join(root, '.next/server/server-reference-manifest.json'), 'utf8'));
if (Object.keys(actions.node).length || Object.keys(actions.edge).length) throw new Error('Static packaging does not support Server Actions');
if (!manifest.routes['/'] || manifest.routes['/'].initialRevalidateSeconds !== false) throw new Error('Homepage is not fully prerendered');
if (Object.keys(manifest.routes).some(route => !['/', '/_not-found', '/_global-error'].includes(route))) throw new Error('New pages require an explicit static packaging rule');
await rm(staging, { recursive: true, force: true });
await mkdir(join(staging, '_next'), { recursive: true });
await cp(join(root, 'public'), staging, { recursive: true });
await cp(join(root, '.next/static'), join(staging, '_next/static'), { recursive: true });
await cp(join(root, '.next/server/app/index.html'), join(staging, 'index.html'));
await cp(join(root, '.next/server/app/_not-found.html'), join(staging, '404.html'));
await writeFile(join(staging, '.nojekyll'), '');
if (target === 'static') {
  await writeFile(join(staging, '_redirects'), `/api/*  ${apiOrigin}/api/:splat  200\n`);
}
await writeFile(join(staging, 'deployment-manifest.json'), JSON.stringify({
  source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  target, basePath, apiOrigin, nextBuildId: (await readFile(join(root, '.next/BUILD_ID'), 'utf8')).trim(),
}, null, 2) + '\n');
await rm(output, { recursive: true, force: true });
await rename(staging, output);
console.log(`Prepared ${name}; API: ${apiOrigin}`);

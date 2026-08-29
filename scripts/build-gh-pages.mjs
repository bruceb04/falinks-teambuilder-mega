/**
 * Builds the static, server-less bundle that GitHub Pages serves.
 *
 * GitHub Pages is a dumb file host: no Node process, so no API routes, no
 * `getServerSideProps`, and no `fallback: 'blocking'` to resolve a dynamic
 * route on demand. The collaborative room needs none of that -- it is pure
 * client-side Yjs -- but several other pages do, and Next refuses to export
 * while they are present.
 *
 * Rather than fork those pages (and let the two copies drift), this script
 * temporarily moves them out of `src/pages`, exports, then puts them back.
 * The default Vercel/Netlify build never runs this file and stays unchanged.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(projectRoot, 'src', 'pages');
const outDir = path.join(projectRoot, 'out');
const stashDir = path.join(projectRoot, '.gh-pages-stash');
const manifestPath = path.join(stashDir, '.manifest.json');

/**
 * Paths (relative to src/pages) held back from the static export.
 *
 * - `api`      -- serverless functions; there is no server to run them.
 * - `pastes`   -- reads Postgres through Prisma, including at build time in
 *                 `pastes/[id]`'s getStaticPaths, and `pastes/public` is SSR.
 * - `usages`   -- renders data fetched from /api/usages/* at request time.
 * - `room/[name].tsx` -- a dynamic path param with no server to resolve it.
 *                 `room/index.tsx` is its static twin, reading `?name=`.
 *
 * To re-enable a section later, drop it from this list and make sure every
 * `getStaticPaths` it contains returns `fallback: false`.
 */
const SERVER_ONLY_PAGES = ['api', 'pastes', 'usages', path.join('room', '[name].tsx')];

// Mirror next.config.js's basePath resolution so the redirect stub written
// below agrees with the links Next generated.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/falinks-teambuilder';

/**
 * Moves everything named in the stash manifest back into src/pages. Safe to
 * call when nothing is stashed, and safe to call twice.
 */
const restore = () => {
  if (!fs.existsSync(stashDir)) return;
  let moved = [];
  try {
    moved = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    // No readable manifest: fall back to the full list so a partial stash from
    // an interrupted run still gets put back rather than deleted.
    moved = SERVER_ONLY_PAGES;
  }
  for (const rel of moved) {
    const from = path.join(stashDir, rel);
    if (!fs.existsSync(from)) continue;
    const to = path.join(pagesDir, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.rmSync(to, { recursive: true, force: true });
    fs.renameSync(from, to);
  }
  fs.rmSync(stashDir, { recursive: true, force: true });
};

const stash = () => {
  // A previous run may have died before restoring. Put those pages back rather
  // than deleting them along with the stale stash directory.
  restore();
  const moved = [];
  for (const rel of SERVER_ONLY_PAGES) {
    const from = path.join(pagesDir, rel);
    if (!fs.existsSync(from)) continue;
    const to = path.join(stashDir, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    moved.push(rel);
  }
  fs.mkdirSync(stashDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(moved, null, 2));
  return moved;
};

/**
 * GitHub Pages serves 404.html for any path it has no file for. Old links of
 * the form /room/<name>/ are exactly that, so this stub rewrites them to the
 * exported /room/?name=<name> before the user notices.
 */
const write404 = () => {
  fs.writeFileSync(
    path.join(outDir, '404.html'),
    `<!doctype html>
<meta charset="utf-8">
<title>Redirecting…</title>
<script>
  (function () {
    var basePath = ${JSON.stringify(basePath)};
    var p = window.location.pathname;
    if (basePath && p.indexOf(basePath) === 0) p = p.slice(basePath.length);
    // /room/<name>/ -> /room/?name=<name>, preserving ?protocol=, ?format=, etc.
    var m = p.match(new RegExp('^/room/([^/]+)/?$'));
    if (m) {
      var params = new URLSearchParams(window.location.search);
      params.set('name', decodeURIComponent(m[1]));
      window.location.replace(basePath + '/room/?' + params.toString());
    }
  })();
</script>
<body style="font-family:system-ui,sans-serif;padding:2rem">
  <h1>404</h1>
  <p>That page does not exist here. <a id="home" href="/">Go home</a>.</p>
  <script>document.getElementById('home').href = ${JSON.stringify(basePath)} + '/';</script>
</body>
`
  );
};

// A Ctrl+C between stash and restore would otherwise strand the pages.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restore();
    process.exit(1);
  });
}

const moved = stash();
let status = 0;
try {
  console.log(`Held back from the export: ${moved.join(', ') || '(nothing)'}`);
  const result = spawnSync('npx', ['next', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      NEXT_PUBLIC_STATIC_EXPORT: 'true',
      // No y-websocket server exists on a static host; WebRTC is peer-to-peer.
      NEXT_PUBLIC_DEFAULT_PROTOCOL: 'WebRTC',
      NEXT_PUBLIC_BASE_PATH: basePath
    },
  });
  status = result.status ?? 1;
} finally {
  // Never `process.exit` before this runs -- it would skip the restore and
  // leave the held-back pages sitting outside src/pages.
  restore();
}

if (status !== 0) {
  console.error('\nnext build failed; src/pages has been restored.');
  process.exit(status);
}

// Without this, Pages runs the output through Jekyll, which drops Next's
// _next/ directory because the leading underscore marks it private.
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
write404();
console.log(`\nStatic site ready in out/ (basePath: ${basePath || '/'})`);

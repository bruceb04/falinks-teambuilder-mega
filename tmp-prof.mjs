import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:3113/room/prof' + Date.now() + '/', { waitUntil: 'networkidle' });
await p.getByRole('tab', { name: 'Add a new tab' }).click();
await p.waitForTimeout(1500);
const cdp = await p.context().newCDPSession(p);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
p.locator('input[placeholder="Pokémon"]').focus().then(() => p.keyboard.type('f')).catch(() => {});
await new Promise((r) => setTimeout(r, 8000));
const { profile } = await cdp.send('Profiler.stop');
const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
for (const n of profile.nodes) {
  const cf = n.callFrame;
  const key = `${cf.functionName || '(anon)'} @ ${(cf.url || '').split('/').slice(-2).join('/')}:${cf.lineNumber}`;
  self.set(key, (self.get(key) || 0) + (n.hitCount || 0));
}
const total = [...self.values()].reduce((a, c) => a + c, 0);
console.log('total samples', total);
[...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => console.log(`${((v / total) * 100).toFixed(1)}%  ${k}`));
await b.close();

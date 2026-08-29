import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
await p.goto('http://localhost:3113/room/diag' + Date.now() + '/', { waitUntil: 'networkidle' });
await p.getByRole('tab', { name: 'Add a new tab' }).click();
await p.waitForTimeout(1500);
// type a single character via keyboard, do not wait for actionability
await p.locator('input[placeholder="Pokémon"]').focus();
const t0 = Date.now();
await p.keyboard.type('f', { delay: 0 }).catch((e) => console.log('type err', e.message));
console.log('typed in', Date.now() - t0, 'ms');
await p.waitForTimeout(6000);
const value = await p.locator('input[placeholder="Pokémon"]').inputValue().catch((e) => 'ERR ' + e.message);
console.log('input value:', value);
console.log('errors:', errs.slice(0, 8));
await b.close();

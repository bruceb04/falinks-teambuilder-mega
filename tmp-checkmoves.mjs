import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import fs from 'fs';
const names = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const gens = new Generations(Dex);
const missing = [];
for (const n of names) {
  let found = false;
  for (let g = 9; g >= 1; g--) { if (gens.get(g).dex.moves.get(n)?.exists) { found = true; break; } }
  if (!found) missing.push(n);
}
console.log('total', names.length, 'missing', missing.length);
console.log(missing.join('\n'));

import fs from 'fs';
const SCRATCH = "C:/Users/BETA'S~1/AppData/Local/Temp/claude/c--Users-Beta-s-PC-Documents-wereback/1267553d-6360-4290-9018-b5eaba43a333/scratchpad";
const parsed = JSON.parse(fs.readFileSync(`${SCRATCH}/parsed.json`, 'utf8'));

const src = fs.readFileSync('src/utils/ChampionsData.ts', 'utf8');
const listOf = (name) => {
  const m = src.match(new RegExp(`export const ${name}: string\[\] = \[([\s\S]*?)\n\];`));
  return [...m[1].matchAll(/^\s*(?:'([^']*)'|"([^"]*)")\s*,/gm)].map((x) => x[1] ?? x[2]);
};
const roster = listOf('championsRegulationMBSpecies');
const toSlug = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '');

// section title -> forme suffix appended to the base species name
const SUFFIX = {
  'Standard Moves': '',
  'Alola Form Standard Moves': '-Alola',
  'Hisuian Form Standard Moves': '-Hisui',
  'Galarian Form Standard Moves': '-Galar',
  'Paldean Form Standard Moves': '-Paldea-Combat',
  'Standard Moves - Blaze Breed': '-Paldea-Blaze',
  'Standard Moves - Aqua Breed': '-Paldea-Aqua',
  'Standard Moves - Male': '',
  'Standard Moves - Female': '-F',
  'Standard Moves - Eternal Floette': '-Eternal',
  'Standard Moves - Midnight Form': '-Midnight',
  'Standard Moves - Dusk Form': '-Dusk',
};

const bySlug = new Map(); // slug -> base roster name
roster.forEach((n) => {
  const s = toSlug(n);
  if (!bySlug.has(s)) bySlug.set(s, n);
});

const learnsets = {}; // showdown species name -> move names
const unmatched = [];
for (const [slug, sections] of Object.entries(parsed)) {
  for (const { title, moves } of sections) {
    const suffix = SUFFIX[title];
    if (suffix === undefined) {
      unmatched.push(`${slug}: unknown section "${title}"`);
      continue;
    }
    const base = bySlug.get(slug);
    if (!base) {
      unmatched.push(`${slug}: no roster entry`);
      continue;
    }
    const name = base + suffix;
    if (!roster.includes(name)) {
      unmatched.push(`${slug}/"${title}" -> ${name} not in roster`);
      continue;
    }
    learnsets[name] = moves;
  }
}

const uncovered = roster.filter((n) => !learnsets[n]);
fs.writeFileSync(`${SCRATCH}/learnsets.json`, JSON.stringify(learnsets, null, 1));
console.log('roster', roster.length, 'mapped', Object.keys(learnsets).length);
console.log('UNMATCHED SECTIONS:\n' + (unmatched.join('\n') || 'none'));
console.log('ROSTER ENTRIES WITHOUT THEIR OWN SECTION:\n' + uncovered.join(', '));

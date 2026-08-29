/* eslint-disable import/no-extraneous-dependencies, no-await-in-loop, no-console, no-restricted-syntax */
import fs from 'fs/promises';
import path from 'path';

import { championsRegulationMBSpecies } from '@/utils/ChampionsData';

/**
 * Regenerates `src/utils/ChampionsLearnsets.ts` from Serebii's Pokémon Champions Pokédex.
 *
 * Champions does not share Gen 9's learnsets: it hands every Pokémon one flat move pool that both
 * adds moves Gen 9 never gave it (Charizard's Ancient Power) and takes away moves it had in Gen 9
 * (Incineroar's Knock Off). Pokémon Showdown carries no Champions learnsets, so the pools are read
 * off Serebii, which publishes them per Pokémon as a single "Standard Moves" table.
 *
 * Run with `npm run generate-champions-learnsets` after a roster change or a Champions move update.
 */

const indexUrl = 'https://www.serebii.net/pokemonchampions/pokemon.shtml';
const pokedexUrl = (slug: string) => `https://www.serebii.net/pokedex-champions/${slug}/`;
const outputPath = path.join(process.cwd(), 'src', 'utils', 'ChampionsLearnsets.ts');

/**
 * A Pokémon whose Serebii page or move table is not named after the Showdown forme. Serebii keeps
 * every forme of a Pokémon on the base Pokémon's page, under its own "... Standard Moves" table.
 */
const formeSections: Record<string, { slug: string; section: string }> = {
  'Tauros-Paldea-Combat': { slug: 'tauros', section: 'Paldean Form Standard Moves' },
  'Tauros-Paldea-Blaze': { slug: 'tauros', section: 'Standard Moves - Blaze Breed' },
  'Tauros-Paldea-Aqua': { slug: 'tauros', section: 'Standard Moves - Aqua Breed' },
  // Champions' only Floette is the Eternal Flower one, so both roster entries share its move pool
  Floette: { slug: 'floette', section: 'Standard Moves - Eternal Floette' },
  'Floette-Eternal': { slug: 'floette', section: 'Standard Moves - Eternal Floette' },
  Meowstic: { slug: 'meowstic', section: 'Standard Moves - Male' },
  'Meowstic-F': { slug: 'meowstic', section: 'Standard Moves - Female' },
  Basculegion: { slug: 'basculegion', section: 'Standard Moves - Male' },
  'Basculegion-F': { slug: 'basculegion', section: 'Standard Moves - Female' },
  'Lycanroc-Midnight': { slug: 'lycanroc', section: 'Standard Moves - Midnight Form' },
  'Lycanroc-Dusk': { slug: 'lycanroc', section: 'Standard Moves - Dusk Form' },
};

/** Regional formes follow a naming pattern, so they do not each need an entry above. */
const regionalSections: Record<string, string> = {
  Alola: 'Alola Form Standard Moves',
  Galar: 'Galarian Form Standard Moves',
  Hisui: 'Hisuian Form Standard Moves',
  Paldea: 'Paldean Form Standard Moves',
};

const defaultSection = 'Standard Moves';

const toSlug = (name: string) => name.toLowerCase().replace(/[\s':’]/g, '');

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchPage = async (url: string): Promise<string> => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'falinks-teambuilder learnset sync' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // Serebii answers a missing page with a short stub rather than a 404
      if (text.length < 20_000) throw new Error(`unexpectedly short response (${text.length} bytes)`);
      return text;
    } catch (err) {
      if (attempt === 3) throw new Error(`${url}: ${(err as Error).message}`);
      await sleep(2_000);
    }
  }
  throw new Error(`${url}: unreachable`);
};

/**
 * Every move table on a Serebii Pokédex page opens with a `fooevo` header cell naming it, and lists
 * one move per `rowspan="2"` cell. Anything between two headers belongs to the first of them.
 */
const parseMoveSections = (html: string): Record<string, string[]> => {
  const headers = Array.from(html.matchAll(/<td[^>]*class="fooevo"[^>]*>([\s\S]*?)<\/td>/g)).map((match) => ({
    start: match.index!,
    end: match.index! + match[0]!.length,
    title: match[1]!.replace(/<[^>]*>/g, '').trim(),
  }));

  const sections: Record<string, string[]> = {};
  headers.forEach((header, i) => {
    if (!header.title.includes('Standard Moves')) return;
    const body = html.slice(header.end, headers[i + 1]?.start ?? html.length);
    const moves = Array.from(body.matchAll(/<td rowspan="2" class="fooinfo"><a href="\/attackdex-champions\/[a-z0-9-]+\.shtml">([^<]+)<\/a>/g)).map((match) =>
      match[1]!.trim(),
    );
    sections[header.title] = Array.from(new Set(moves));
  });
  return sections;
};

/**
 * Where to read a Pokémon's move pool. `slugs` is what the Pokédex index actually offers, which is
 * what tells a dash in a forme name (`Rotom-Wash`) apart from a dash in a Pokémon's own name
 * (`Kommo-o`).
 */
const locate = (name: string, slugs: Set<string>): { slug: string; section: string } => {
  const known = formeSections[name];
  if (known) return known;
  const parts = name.split('-');
  const region = parts.length > 1 ? regionalSections[parts[parts.length - 1]!] : undefined;
  if (region) return { slug: toSlug(parts.slice(0, -1).join('-')), section: region };
  // formes without a table of their own, such as `Rotom-Wash`, share their base Pokémon's pool
  const slug = slugs.has(toSlug(name)) ? toSlug(name) : toSlug(parts[0]!);
  return { slug, section: defaultSection };
};

const render = (learnsets: Map<string, string[]>): string => {
  const entries = Array.from(learnsets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, moves]) => `  '${name}': '${moves.join(',')}',`)
    .join('\n');

  return `/**
 * The move pool of every Champions Pokémon, keyed by its Pokémon Showdown species name.
 *
 * Generated by \`npm run generate-champions-learnsets\` from https://www.serebii.net/pokedex-champions/ -
 * do not edit by hand. Champions gives each Pokémon one flat pool instead of Gen 9's level-up/TM/egg
 * learnset, so a pool is stored as a plain comma-separated list of move names and is the complete
 * answer for that Pokémon: neither its base forme nor its pre-evolutions add anything to it.
 */
// prettier-ignore
export const championsLearnsetsBySpecies: Record<string, string> = {
${entries}
};
`;
};

(async () => {
  console.log(`Reading the Champions Pokédex index from ${indexUrl}`);
  const index = await fetchPage(indexUrl);
  const slugs = new Set(Array.from(index.matchAll(/\/pokedex-champions\/([a-z0-9%._-]+)\//g)).map((match) => match[1]!));
  console.log(`Found ${slugs.size} Pokédex pages`);

  const pages = new Map<string, Record<string, string[]>>();
  const wanted = Array.from(new Set(championsRegulationMBSpecies.map((name) => locate(name, slugs).slug)));
  const missingPages = wanted.filter((slug) => !slugs.has(slug));
  if (missingPages.length) throw new Error(`The Pokédex index has no page for: ${missingPages.join(', ')}`);

  let fetched = 0;
  for (const slug of wanted) {
    pages.set(slug, parseMoveSections(await fetchPage(pokedexUrl(slug))));
    fetched += 1;
    if (fetched % 25 === 0) console.log(`  ${fetched}/${wanted.length} pages`);
    await sleep(250);
  }

  const learnsets = new Map<string, string[]>();
  const unresolved: string[] = [];
  championsRegulationMBSpecies.forEach((name) => {
    const { slug, section } = locate(name, slugs);
    const moves = pages.get(slug)?.[section];
    if (!moves?.length) unresolved.push(`${name} (expected the "${section}" table on /pokedex-champions/${slug}/)`);
    else learnsets.set(name, moves);
  });
  if (unresolved.length) throw new Error(`Could not read a move pool for:\n  ${unresolved.join('\n  ')}`);

  await fs.writeFile(outputPath, render(learnsets), 'utf8');
  const total = Array.from(learnsets.values()).reduce((sum, moves) => sum + moves.length, 0);
  console.log(`Wrote ${learnsets.size} learnsets (${total} moves) to ${path.relative(process.cwd(), outputPath)}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

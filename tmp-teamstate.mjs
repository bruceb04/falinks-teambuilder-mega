import fs from 'fs';
const p = 'src/models/TeamState.ts';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  "import { allowsIvCustomization, isChampionsLegalItemId } from '@/utils/ChampionsData';",
  "import { allowsIvCustomization, isChampionsFormatId, isChampionsLegalItemId } from '@/utils/ChampionsData';",
);

const guard = `    // Champions has no IVs: every Pok\u00e9mon is treated as having 31 in every stat
    if (key === 'ivs' && !allowsIvCustomization(this.format)) {
      return;
    }
`;
if (!s.includes(guard)) throw new Error('guard anchor not found');
s = s.replace(
  guard,
  guard +
    `    // Champions has no Terastallization, so a Tera type is not part of a Champions set
    if (key === 'teraType' && isChampionsFormatId(this.format)) {
      return;
    }
`,
);

const norm = `  /**
   * Champions has no IVs, so any Pok\u00e9mon entering the team (e.g. from an imported paste) has its
   * IVs reset to the 31s that Champions gives every Pok\u00e9mon.
   */
  private normalizeIvs = (pokemon: Pokemon): Pokemon => {
    if (allowsIvCustomization(this.format)) return pokemon;
    pokemon.ivs = { ...defaultIvs };
    return pokemon;
  };
`;
if (!s.includes(norm)) throw new Error('normalize anchor not found');
s = s.replace(
  norm,
  `  /**
   * Champions has neither IVs nor Terastallization, so any Pok\u00e9mon entering the team (e.g. from an
   * imported paste) has its IVs reset to the 31s that Champions gives every Pok\u00e9mon and loses the
   * Tera type it was carrying.
   */
  private normalizeToFormat = (pokemon: Pokemon): Pokemon => {
    if (!isChampionsFormatId(this.format)) return pokemon;
    pokemon.ivs = { ...defaultIvs };
    delete pokemon.teraType;
    return pokemon;
  };
`,
);
s = s.replaceAll('this.normalizeIvs', 'this.normalizeToFormat');
fs.writeFileSync(p, s);
console.log('ok');

import fs from 'fs';
const p = 'src/models/DexSingleton.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  "import { isChampionsBannedMoveId, isChampionsFormatId, isChampionsLegalItemId, isChampionsLegalSpeciesId, isChampionsMegaForme } from '@/utils/ChampionsData';",
  "import { isChampionsFormatId, isChampionsLegalItemId, isChampionsLegalMoveId, isChampionsLegalSpeciesId, isChampionsMegaForme } from '@/utils/ChampionsData';",
);
s = s.replace(
  "    case 'Move':\n      // Z-moves and Max moves belong to mechanics Champions does not have\n      return isChampionsContent(d.isNonstandard) && !d.isZ && !d.isMax && !isChampionsBannedMoveId(d.id);",
  "    case 'Move':\n      // Champions ships its own move list, so it decides on its own which moves exist\n      return isChampionsLegalMoveId(d.id);",
);
fs.writeFileSync(p, s);
console.log('ok');

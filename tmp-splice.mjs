import fs from 'fs';
const p = 'src/utils/ChampionsData.ts';
let s = fs.readFileSync(p, 'utf8');
const old = "/** Moves that exist in the Gen 9 data but that Champions does not let a Pok\u00e9mon use. */\nexport const championsBannedMoves: string[] = ['Hidden Power'];\n";
if (!s.includes(old)) throw new Error('anchor not found');
s = s.replace(old, fs.readFileSync('tmp-moves-block.txt', 'utf8'));
s = s.replace('const championsBannedMoveIds = new Set(championsBannedMoves.map(toID));', 'const championsMoveIds = new Set(championsMoves.map(toID));');
s = s.replace(
  'export const isChampionsBannedMoveId = (id: string): boolean => championsBannedMoveIds.has(toID(id));',
  'export const isChampionsLegalMoveId = (id: string): boolean => championsMoveIds.has(toID(id));',
);
fs.writeFileSync(p, s);
console.log('ok');

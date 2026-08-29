import fs from 'fs';
const src = process.argv[2];
const names = fs.readFileSync(src, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const q = (n) => (n.includes("'") ? `"${n}"` : `'${n}'`);
const header = `/**
 * Every move a Pokémon may use in Champions. Champions carries its own move list rather than Gen 9's:
 * it brings back moves Gen 9 dropped (e.g. Light of Ruin) and leaves out a long tail of older moves,
 * along with everything tied to a mechanic it does not have (Hidden Power, Tera Blast, Z-moves, Max
 * moves). Which of these a given Pokémon actually gets is still decided by its Pokémon Showdown
 * learnset.
 *
 * Source: https://www.serebii.net/pokemonchampions/moves.shtml
 */
export const championsMoves: string[] = [
`;
fs.writeFileSync('tmp-moves-block.txt', header + names.map((n) => `  ${q(n)},`).join('\n') + '\n];\n');
console.log('wrote', names.length);

import fs from 'fs';
const p = 'src/utils/PokemonUtils.ts';
let s = fs.readFileSync(p, 'utf8');
const old = `    // The Showdown data gives Champions Pok\u00e9mon current learnsets, which is where a move such as
    // Light of Ruin comes from even though the move itself is still flagged as \`Past\`. The ones that
    // have not been given a current learnset fall back to the moves they learned in any generation,
    // minus the moves Gen 9 no longer has.
    const useAnySource = isChampions && !hasCurrentSources;
    const isLearnableSource = (source: string) => useAnySource || source.startsWith(\`\${gen.num}\`);
    const isMoveAvailable = (move: Move) => !useAnySource || !move.isNonstandard;
`;
if (!s.includes(old)) throw new Error('anchor A not found');
s = s.replace(
  old,
  `    // Champions Pok\u00e9mon that Gen 9 also has keep their current Showdown learnset; the ones Gen 9
    // dropped (e.g. Beedrill) have no current learnset at all, so they fall back to the moves they
    // learned in any generation. Either way the Champions dex only carries the moves Champions has,
    // so a move the game does not ship never survives the \`gen.moves.get\` lookup below.
    const useAnySource = isChampions && !hasCurrentSources;
    const isLearnableSource = (source: string) => useAnySource || source.startsWith(\`\${gen.num}\`);
`,
);
if (!s.includes('    return res.filter(isMoveAvailable);\n')) throw new Error('anchor B not found');
s = s.replace('    return res.filter(isMoveAvailable);\n', '    return res;\n');
fs.writeFileSync(p, s);
console.log('ok');

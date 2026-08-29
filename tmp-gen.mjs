import fs from 'fs';
const p = 'src/components/workspace/GenMechanism/index.tsx';
let s = fs.readFileSync(p, 'utf8');
const old = `  // Champions has both Terastallization and Mega Evolution; Mega Evolution is driven by the held Mega Stone
  if (isChampionsFormatId(teamState.format)) return <TeraTypeSelect />;
`;
if (!s.includes(old)) throw new Error('anchor not found');
s = s.replace(
  old,
  `  // Champions has no Terastallization; its generation mechanic is Mega Evolution, which is driven by the held Mega Stone
  if (isChampionsFormatId(teamState.format)) return null;
`,
);
fs.writeFileSync(p, s);
console.log('ok');

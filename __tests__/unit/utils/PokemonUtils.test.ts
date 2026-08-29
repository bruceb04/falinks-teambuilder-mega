import { expect, test } from 'vitest';

import { calcUsageFromPastes, getRandomTrainerName, getSingleEvUpperLimit, isValidPokePasteURL, trainerNames } from '@/utils/PokemonUtils';

/** Collect every number reachable from a value, so a test can assert none of them is NaN. */
const collectNumbers = (value: unknown): number[] => {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(collectNumbers);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectNumbers);
  return [];
};

test('isValidPokePasteURL', () => {
  expect(isValidPokePasteURL('https://pokepast.es/a00ca5bc26cda7e9')).toBe(true);
  expect(isValidPokePasteURL('https://google.com')).toBe(false);
});

test('getRandomTrainerName', () => {
  expect(trainerNames).toContain(getRandomTrainerName());
});

test('getSingleEvUpperLimit', () => {
  expect(getSingleEvUpperLimit({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, 252)).toBe(252);
  expect(getSingleEvUpperLimit({ hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 }, 0)).toBe(4);
});

// A team whose sets carry no Tera Type: the `TeraTypes` map stays empty, so its normalization denominator is zero.
const pasteWithoutTeraTypes = `Incineroar @ Assault Vest
Ability: Intimidate
Level: 50
EVs: 252 HP / 4 Atk
Adamant Nature
- Fake Out
- Knock Off

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
EVs: 252 HP / 4 Atk
Adamant Nature
- Grassy Glide
- Wood Hammer
`;

test('calcUsageFromPastes: sets without a Tera Type do not throw or produce NaN', () => {
  const usages = calcUsageFromPastes([pasteWithoutTeraTypes]);

  expect(usages.map((u) => u.name).sort()).toEqual(['Incineroar', 'Rillaboom']);
  expect(collectNumbers(usages).filter((n) => Number.isNaN(n))).toEqual([]);
  usages.forEach((usage) => {
    expect(usage.TeraTypes).toEqual({});
  });
});

// The same team with every move line removed.
const pasteWithoutMoves = `Incineroar @ Assault Vest
Ability: Intimidate
Level: 50
EVs: 252 HP / 4 Atk
Adamant Nature

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
EVs: 252 HP / 4 Atk
Adamant Nature
`;

test('calcUsageFromPastes: sets without moves are dropped by the validity guard', () => {
  // `Team.import` omits `moves` entirely for a moveless set, so such sets never reach the counting code
  expect(calcUsageFromPastes([pasteWithoutMoves])).toEqual([]);
});

// The first set is complete; the second has neither an ability nor an item, so it is not a valid set.
const pasteWithOneInvalidSet = `Incineroar @ Assault Vest
Ability: Intimidate
Level: 50
EVs: 252 HP / 4 Atk
Adamant Nature
- Fake Out

Rillaboom
Level: 50
`;

test('calcUsageFromPastes: the non-team-based denominator counts valid sets only', () => {
  const usages = calcUsageFromPastes([pasteWithOneInvalidSet], false);

  expect(usages).toHaveLength(1);
  expect(usages[0]!.name).toBe('Incineroar');
  // one valid set out of one valid set, not one out of the two sets in the paste
  expect(usages[0]!.usage).toBe(1);
});

import { describe, expect, test } from 'vitest';

import DexSingleton from '@/models/DexSingleton';
import { Pokemon } from '@/models/Pokemon';
import { getEvLimits, getLeftEVs, getSingleEvUpperLimit, getStats } from '@/utils/PokemonUtils';

const championsFormatId = 'championsvgc2026regmb';
const gen9FormatId = 'gen9vgc2024regg';

// the Stat Points of a Champions set travel in the EVs field of a Showdown paste
const examplePaste = `Floette-Eternal (F) @ Floettite
Ability: Flower Veil
Level: 50
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Light of Ruin
- Moonblast
- Dazzling Gleam
- Protect
`;

describe('Stat Point budget', () => {
  test('is 66 in total and 32 per stat in Champions', () => {
    expect(getEvLimits(championsFormatId)).toEqual({ total: 66, single: 32, step: 1 });
    expect(getEvLimits(gen9FormatId)).toEqual({ total: 508, single: 252, step: 4 });
  });

  test('caps a single stat at 32 points', () => {
    const empty = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    expect(getSingleEvUpperLimit(empty, 0, championsFormatId)).toBe(32);
    expect(getSingleEvUpperLimit(empty, 0, gen9FormatId)).toBe(252);
  });

  test('caps the team-building budget at what is left', () => {
    const spent = { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 };
    expect(getLeftEVs(spent, championsFormatId)).toBe(2);
    // only the 2 remaining points can go into another stat
    expect(getSingleEvUpperLimit(spent, 0, championsFormatId)).toBe(2);
  });
});

describe('Champions stats', () => {
  const gen = DexSingleton.getGenByFormat(championsFormatId);
  const base = gen.species.get('Floette-Eternal')!.baseStats;
  const modest = gen.natures.get('Modest');

  test('add one point per Stat Point on top of the level 50 stat', () => {
    expect(getStats('hp', base.hp, 2, 31, modest, 50, championsFormatId)).toBe(151);
    expect(getStats('spa', base.spa, 32, 31, modest, 50, championsFormatId)).toBe(192);
    expect(getStats('spe', base.spe, 32, 31, modest, 50, championsFormatId)).toBe(144);
    // without any point invested, the stat is the plain level 50 stat
    expect(getStats('spa', base.spa, 0, 31, modest, 50, championsFormatId)).toBe(160);
  });

  test('leave the EV maths of the other formats alone', () => {
    const incineroar = DexSingleton.getGen(9).species.get('Incineroar')!.baseStats;
    const adamant = DexSingleton.getGen(9).natures.get('Adamant');
    expect(getStats('atk', incineroar.atk, 252, 31, adamant, 50, gen9FormatId)).toBe(183);
  });
});

describe('A Champions paste', () => {
  test('round-trips its Stat Points through the EVs field', () => {
    const team = Pokemon.convertPasteToTeam(examplePaste)!;
    expect(team).toHaveLength(1);
    const [floette] = team;
    expect(floette!.species).toBe('Floette-Eternal');
    expect(floette!.item).toBe('Floettite');
    expect(floette!.evs).toEqual({ hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 });
    expect(Pokemon.convertTeamToPaste(team)).toContain('EVs: 2 HP / 32 SpA / 32 Spe');
  });
});

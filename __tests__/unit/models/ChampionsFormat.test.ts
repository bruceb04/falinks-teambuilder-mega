import { describe, expect, test } from 'vitest';

import DexSingleton from '@/models/DexSingleton';
import FormatManager from '@/models/FormatManager';
import {
  allowsIvCustomization,
  championsItems,
  championsMegaStones,
  championsMoves,
  championsRegulationMBSpecies,
  getChampionsLearnset,
  isChampionsFormatId,
  isChampionsMegaForme,
} from '@/utils/ChampionsData';
import { getMovesBySpecie } from '@/utils/PokemonUtils';

const championsFormat = new FormatManager().getAllFormats().find((f) => f.isChampions)!;

describe('Champions format', () => {
  test('is registered in the FormatManager', () => {
    expect(championsFormat).toBeDefined();
    expect(championsFormat.id).toBe('championsvgc2026regmb');
    expect(isChampionsFormatId(championsFormat.id)).toBe(true);
    expect(isChampionsFormatId('gen9vgc2024regg')).toBe(false);
  });

  test('has no customizable IVs', () => {
    expect(allowsIvCustomization(championsFormat.id)).toBe(false);
    expect(allowsIvCustomization('gen9vgc2024regg')).toBe(true);
  });
});

describe('Champions dex', () => {
  const gen = DexSingleton.getGenByFormat(championsFormat.id);

  test('resolves every Pokémon of the Regulation M-B roster', () => {
    const unresolved = championsRegulationMBSpecies.filter((name) => !gen.species.get(name));
    expect(unresolved).toEqual([]);
    expect(championsRegulationMBSpecies.length).toBeGreaterThan(200);
  });

  test('only contains the Regulation M-B roster', () => {
    const rosterIds = new Set(championsRegulationMBSpecies.map((name) => DexSingleton.getGen().dex.species.get(name)?.id ?? name.toLowerCase()));
    const extra = Array.from(gen.species).filter((s) => !rosterIds.has(s.id) && !isChampionsMegaForme(s));
    expect(extra).toEqual([]);
    // Pokémon that Champions does not have, including Mega formes, are not selectable
    expect(gen.species.get('Terapagos')).toBeUndefined();
    expect(gen.species.get('Flutter Mane')).toBeUndefined();
    expect(gen.species.get('Terapagos-Terastal')).toBeUndefined();
  });

  test('keeps Pokémon that Gen 9 dropped', () => {
    expect(gen.species.get('Beedrill')?.name).toBe('Beedrill');
    expect(gen.species.get('Starmie')?.name).toBe('Starmie');
    expect(DexSingleton.getGen(9).species.get('Beedrill')).toBeUndefined();
  });

  test('only offers items that exist in Champions', () => {
    const legalItemNames = new Set(championsItems);
    const extra = Array.from(gen.items).filter((i) => !legalItemNames.has(i.name));
    expect(extra).toEqual([]);
    expect(gen.items.get('Venusaurite')?.name).toBe('Venusaurite'); // Mega Stone kept from the Gen 6 data
    expect(gen.items.get('Sitrus Berry')?.name).toBe('Sitrus Berry');
    expect(gen.items.get('Assault Vest')).toBeUndefined(); // not in Champions
    expect(gen.items.get('Booster Energy')).toBeUndefined();
  });

  test('offers every Mega Stone, including the ones Champions introduced', () => {
    const unresolved = championsMegaStones.filter((name) => !gen.items.get(name));
    expect(unresolved).toEqual([]);
    expect(championsMegaStones).toHaveLength(75);
    expect(gen.items.get('Meganiumite')?.megaStone).toEqual({ Meganium: 'Meganium-Mega' });
    expect(gen.items.get('Raichunite X')?.megaStone).toEqual({ Raichu: 'Raichu-Mega-X' });
  });

  test('resolves the Mega formes without offering them as a pick', () => {
    const mega = gen.species.get('Meganium-Mega');
    expect(mega?.baseStats.spa).toBe(143);
    expect(mega?.requiredItems).toContain('Meganiumite');
    expect(isChampionsMegaForme(mega!)).toBe(true);
    expect(isChampionsMegaForme(gen.species.get('Meganium')!)).toBe(false);
    // a Mega forme of a Pokémon outside the roster is not in the Champions dex at all
    expect(gen.species.get('Baxcalibur-Mega')).toBeUndefined();
  });

  test('excludes moves that Champions does not have', () => {
    expect(gen.moves.get('Hidden Power')).toBeUndefined();
    expect(gen.moves.get('Fake Out')?.name).toBe('Fake Out');
  });
});

describe('Champions learnsets', () => {
  const moveNamesOf = async (species: string, format: string = championsFormat.id) => (await getMovesBySpecie(species, false, format)).map((m) => m.name);

  test('cover every Pokémon of the roster', () => {
    const withoutLearnset = championsRegulationMBSpecies.filter((name) => !getChampionsLearnset({ id: name })?.length);
    expect(withoutLearnset).toEqual([]);
  });

  test('only hold moves that Champions has', () => {
    const legalMoveNames = new Set(championsMoves);
    const illegal = championsRegulationMBSpecies.flatMap((name) => (getChampionsLearnset({ id: name }) ?? []).filter((move) => !legalMoveNames.has(move)));
    expect(Array.from(new Set(illegal))).toEqual([]);
  });

  test('give back the moves Gen 9 had taken away', async () => {
    expect(await moveNamesOf('Charizard')).toContain('Ancient Power');
    expect(await moveNamesOf('Gholdengo')).toContain('Surf');
    // Showdown's Gen 9 Gholdengo has no Surf anywhere in its learnset
    expect(await moveNamesOf('Gholdengo', 'gen9vgc2024regg')).not.toContain('Surf');
  });

  test('drop the moves Champions took away', async () => {
    const incineroar = await moveNamesOf('Incineroar');
    expect(incineroar).not.toContain('Knock Off');
    expect(incineroar).toContain('Fake Out');
    const grimmsnarl = await moveNamesOf('Grimmsnarl');
    expect(grimmsnarl).not.toContain('Thunder Wave');
    expect(grimmsnarl).toContain('Spirit Break');
  });

  test('include moves of Pokémon that have no Gen 9 learnset', async () => {
    const moveNames = await moveNamesOf('Beedrill');
    expect(moveNames).toContain('Protect');
    expect(moveNames).toContain('U-turn');
    // moves that do not exist in Champions are gone even where a Showdown learnset has them
    expect(moveNames).not.toContain('Pursuit');
    expect(moveNames).not.toContain('Hidden Power');
  });

  test('are a complete move pool on their own', async () => {
    // a Showdown learnset needs the base forme's moves and the egg moves of the first evolution
    // stage added on top of it; a Champions pool already is everything the Pokémon can use
    const moveNames = await moveNamesOf('Incineroar');
    expect(moveNames).toHaveLength(getChampionsLearnset({ id: 'Incineroar' })!.length);
  });

  test('are per forme, and do not borrow from the base forme', async () => {
    expect(await moveNamesOf('Slowbro-Galar')).toContain('Shell Side Arm');
    expect(await moveNamesOf('Slowbro')).not.toContain('Shell Side Arm');
    expect(await moveNamesOf('Tauros-Paldea-Aqua')).toContain('Wave Crash');
    expect(await moveNamesOf('Tauros-Paldea-Combat')).not.toContain('Wave Crash');
    // the Ice/Fairy Alolan Ninetales does not get the Fire moves of the Ninetales it is a forme of
    const alolanNinetales = await moveNamesOf('Ninetales-Alola');
    expect(alolanNinetales).toContain('Aurora Veil');
    ['Fire Blast', 'Flamethrower', 'Overheat', 'Will-O-Wisp'].forEach((move) => expect(alolanNinetales).not.toContain(move));
  });

  test('let a Mega forme use the move pool it Mega Evolves from', () => {
    const charizard = getChampionsLearnset({ id: 'Charizard' });
    expect(getChampionsLearnset({ id: 'Charizard-Mega-Y', baseSpecies: 'Charizard' })).toEqual(charizard);
  });

  test('do not leak into the Gen 9 formats', async () => {
    const moves = await getMovesBySpecie('Incineroar', false, 'gen9vgc2024regg');
    expect(moves.map((m) => m.name)).toContain('Fake Out');
    expect(moves.map((m) => m.name)).toContain('Knock Off');
  });
});

describe('A Champions set', () => {
  test('can pick every move of a Regulation M-B set', async () => {
    const moves = await getMovesBySpecie('Floette-Eternal', false, championsFormat.id);
    const moveNames = moves.map((m) => m.name);
    ['Light of Ruin', 'Moonblast', 'Dazzling Gleam', 'Protect'].forEach((move) => expect(moveNames).toContain(move));
  });
});

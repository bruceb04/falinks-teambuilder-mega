import { syncedStore } from '@syncedstore/core';
import { beforeEach, describe, expect, test } from 'vitest';

import { Pokemon } from '@/models/Pokemon';
import type { StoreContextType } from '@/models/TeamState';
import { TeamState } from '@/models/TeamState';

const championsFormatId = 'championsvgc2026regmb';
const gen9FormatId = 'gen9vgc2024regg';
const zeroIvs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const newTeamState = (format: string): TeamState => {
  const store = syncedStore<StoreContextType>({
    metadata: {} as StoreContextType['metadata'],
    team: [] as Pokemon[],
    notes: 'xml',
    history: [] as string[],
  });
  const teamState = new TeamState(store, store, 'tester');
  teamState.format = format;
  return teamState;
};

describe('IVs in a Champions format', () => {
  let teamState: TeamState;

  beforeEach(() => {
    teamState = newTeamState(championsFormatId);
  });

  test('are reset to 31 when a Pokémon joins the team', () => {
    teamState.addPokemonToTeam(new Pokemon('Garchomp', '', '', '', undefined, undefined, undefined, undefined, { ...zeroIvs }));
    expect(teamState.getPokemonInTeam(0)?.ivs).toEqual({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  });

  test('are reset to 31 for an imported paste', () => {
    const imported = Pokemon.convertPasteToTeam('Garchomp @ Life Orb\nAbility: Rough Skin\nLevel: 50\nIVs: 0 Atk\n- Protect\n')!;
    teamState.splicePokemonTeam(0, 0, ...imported);
    expect(teamState.getPokemonInTeam(0)?.ivs.atk).toBe(31);
  });

  test('cannot be edited', () => {
    teamState.addPokemonToTeam(new Pokemon('Garchomp'));
    teamState.updatePokemonInTeam(0, 'ivs', { ...zeroIvs });
    expect(teamState.getPokemonInTeam(0)?.ivs.atk).toBe(31);
  });
});

describe('IVs in a Gen 9 format', () => {
  test('are kept as they are', () => {
    const teamState = newTeamState(gen9FormatId);
    teamState.addPokemonToTeam(new Pokemon('Incineroar', '', '', '', undefined, undefined, undefined, undefined, { ...zeroIvs }));
    expect(teamState.getPokemonInTeam(0)?.ivs.atk).toBe(0);
    teamState.updatePokemonInTeam(0, 'ivs', { ...zeroIvs, atk: 31 });
    expect(teamState.getPokemonInTeam(0)?.ivs.atk).toBe(31);
  });
});

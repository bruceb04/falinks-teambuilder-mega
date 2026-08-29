import { Generation, Generations } from '@pkmn/data';
import type { ModdedDex, Nonstandard } from '@pkmn/dex';
import { Data, Dex } from '@pkmn/dex';

import { AppConfig } from '@/utils/AppConfig';
import { isChampionsFormatId, isChampionsLegalItemId, isChampionsLegalMoveId, isChampionsLegalSpeciesId, isChampionsMegaForme } from '@/utils/ChampionsData';

/**
 * The Pokémon Champions dex is built on top of the Gen 9 data, which carries the Champions Pokémon,
 * Mega formes and Mega Stones as `Past`/`Future` entries. The plain Gen 9 filter drops all of those,
 * so Champions gets its own filter that instead limits species and items to the Champions roster and
 * item list.
 */
const CHAMPIONS_GEN_NUM = 9;

const standardExists =
  (genNum: number) =>
  (d: Data): boolean => {
    if (!d.exists) return false;
    if ('isNonstandard' in d && d.isNonstandard) return genNum === 8 ? d.isNonstandard === 'Gigantamax' : false;
    if (d.kind === 'Ability' && d.id === 'noability') return false;
    return !('tier' in d && ['Illegal', 'Unreleased'].includes(d.tier));
  };

/**
 * Champions content is either current Gen 9 data, something Champions introduced (`Future`, e.g. the
 * Mega Sol ability) or something Gen 9 left behind that Champions brought back (`Past`, e.g. Light of
 * Ruin). What a Pokémon may actually use is then decided by its learnset. Content of other games
 * (CAP, LGPE, Gigantamax) is never Champions content.
 */
const isChampionsContent = (isNonstandard: Nonstandard | null): boolean => !isNonstandard || ['Future', 'Past'].includes(isNonstandard);

const championsExists = (d: Data): boolean => {
  if (!d.exists) return false;
  switch (d.kind) {
    case 'Species':
      // Mega formes are kept so that their stats and types can be looked up; they are not pickable
      return isChampionsLegalSpeciesId(d.id) || isChampionsMegaForme(d);
    case 'Item':
      return isChampionsLegalItemId(d.id);
    case 'Move':
      // Champions ships its own move list, so it decides on its own which moves exist
      return isChampionsLegalMoveId(d.id);
    case 'Ability':
      return d.id !== 'noability' && isChampionsContent(d.isNonstandard);
    default:
      // types, natures and conditions are shared with Gen 9; learnsets come from `ChampionsLearnsets`
      return true;
  }
};

class DexSingleton {
  private static instances: Map<string, DexSingleton> = new Map(); // eslint-disable-line no-use-before-define

  private dex: ModdedDex;

  private gen: Generation;

  private constructor(genNum: number, isChampions: boolean) {
    this.dex = Dex.forGen(genNum);
    this.gen = new Generations(Dex, isChampions ? championsExists : standardExists(genNum)).get(genNum);
  }

  private static getInstance(genNum: number, isChampions: boolean = false): DexSingleton {
    const key = isChampions ? `champions${genNum}` : `${genNum}`;
    const instance = DexSingleton.instances.get(key) ?? new DexSingleton(genNum, isChampions);
    DexSingleton.instances.set(key, instance);
    return instance;
  }

  public static getDex(gen: number = AppConfig.defaultGen): ModdedDex {
    return DexSingleton.getInstance(gen).dex;
  }

  public static getGen(gen: number = AppConfig.defaultGen): Generation {
    return DexSingleton.getInstance(gen).gen;
  }

  /**
   * The Champions generation: the Gen 9 dex narrowed down to the Pokémon, items and moves that
   * Pokémon Champions supports.
   */
  public static getChampionsGen(): Generation {
    return DexSingleton.getInstance(CHAMPIONS_GEN_NUM, true).gen;
  }

  public static getGenByFormat(format: string): Generation {
    if (isChampionsFormatId(format)) return DexSingleton.getChampionsGen();
    if (format === 'vgc2014' || format === 'vgc2015') return DexSingleton.getGen(6);
    const genNum = parseInt(format.replace(/gen(\d+).*/, '$1'), 10);
    return DexSingleton.getGen(Number.isNaN(genNum) ? AppConfig.defaultGen : genNum);
  }
}

export default DexSingleton;

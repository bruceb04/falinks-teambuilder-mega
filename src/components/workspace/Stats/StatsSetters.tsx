import type { Nature } from '@pkmn/dex-types';
import type { StatsTable } from '@pkmn/types';
import { useTranslation } from 'next-i18next';
import type { ChangeEvent, FocusEvent, KeyboardEvent, MouseEvent, TouchEvent } from 'react';
import { useContext, useEffect, useState } from 'react';

import { StoreContext } from '@/components/workspace/Contexts/StoreContext';
import DexSingleton from '@/models/DexSingleton';
import { allowsIvCustomization, isChampionsFormatId } from '@/utils/ChampionsData';
import { defaultIvs, defaultStats, getEvLimits, getLeftEVs, getSingleEvUpperLimit, getStats } from '@/utils/PokemonUtils';

function StatsSetters() {
  const { t } = useTranslation(['common', 'natures', 'room']);
  const { teamState, tabIdx } = useContext(StoreContext);

  const natures = Array.from(DexSingleton.getGen().natures);
  // Champions treats every Pokémon as having 31 IVs in every stat, so they cannot be edited there
  const canCustomizeIvs = allowsIvCustomization(teamState.format);
  // Champions spends Stat Points instead of EVs: 66 in total, 32 per stat, one point at a time
  const usesStatPoints = isChampionsFormatId(teamState.format);
  const evLimits = getEvLimits(teamState.format);
  const evLabel = usesStatPoints ? t('common.statPoints', { defaultValue: 'SP' }) : t('common.evs');

  // stats
  const [base, setBase] = useState<StatsTable>(defaultStats);
  const [evs, setEvs] = useState<StatsTable>(defaultStats);
  const [ivs, setIvs] = useState<StatsTable>(defaultIvs);
  const [nature, setNature] = useState<Nature>(natures[8]!); // default to Hardy

  useEffect(() => {
    const pName = teamState.getPokemonInTeam(tabIdx)?.species ?? '';
    setBase((old) => DexSingleton.getGenByFormat(teamState.format).species.get(pName)?.baseStats ?? old);
  }, [teamState.getPokemonInTeam(tabIdx)?.species]);

  useEffect(() => {
    const { evs: pEvs } = teamState.getPokemonInTeam(tabIdx) ?? {};
    setEvs((old) => pEvs ?? old);
  }, [teamState.getPokemonInTeam(tabIdx)?.evs]);

  useEffect(() => {
    const { ivs: pIvs } = teamState.getPokemonInTeam(tabIdx) ?? {};
    setIvs((old) => pIvs ?? old);
  }, [teamState.getPokemonInTeam(tabIdx)?.ivs]);

  // receive changes from other users
  useEffect(() => {
    const pNature = teamState.getPokemonInTeam(tabIdx)?.nature;
    setNature((old) => natures.find((n) => n.name === pNature) ?? old);
  }, [teamState.getPokemonInTeam(tabIdx)?.nature]);

  // emit changes to other users
  const handleNatureSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newChecked = natures.find((n) => n.name === e.target.value)!;
    teamState.updatePokemonInTeam(tabIdx, 'nature', newChecked.name);
  };

  const handleNatureRadioChange = (e: ChangeEvent<HTMLInputElement>) => {
    const [buff, stat] = e.target.name.split('-');
    const curBuff = buff === 'plus' ? 'plus' : 'minus';
    const opposingBuff = buff === 'plus' ? 'minus' : 'plus';
    const newChecked =
      natures.find((n) => n[curBuff] === stat && n[opposingBuff] === nature[opposingBuff]) ??
      natures.find((n) => n[curBuff] === stat && n[opposingBuff] === (stat === 'atk' ? 'def' : 'atk')) ??
      nature;
    teamState.updatePokemonInTeam(tabIdx, 'nature', newChecked.name);
  };

  const handleEVInputChange = (e: ChangeEvent<HTMLInputElement>, ev: number, stat: string) => {
    let newEv = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    newEv = Number.isNaN(newEv) ? (evs as unknown as { [s: string]: number })[stat] ?? 0 : Math.min(newEv, getSingleEvUpperLimit(evs, ev, teamState.format));
    setEvs((old) => ({ ...old, [stat]: newEv }));
  };

  // mouse up or on blur
  const handleEVInputDone = (
    e: MouseEvent<HTMLInputElement> | FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement> | TouchEvent<HTMLInputElement>,
    stat: string,
  ) => {
    // @ts-ignore
    if (e.key && !['ArrowDown', 'ArrowUp', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace', 'Delete', 'Enter'].includes(e.key)) return;
    teamState.updatePokemonInTeam(tabIdx, 'evs', {
      ...evs,
      [stat]: Number((e.target as HTMLInputElement).value),
    });
  };

  const handleIVInputChange = (e: ChangeEvent<HTMLInputElement>, stat: string) => {
    if (!canCustomizeIvs) return;
    const newIv = Math.min(Number(e.target.value), 31);
    setIvs((old) => ({ ...old, [stat]: newIv }));
    teamState.updatePokemonInTeam(tabIdx, 'ivs', {
      ...ivs,
      [stat]: newIv,
    });
  };

  return (
    <>
      {/* Header */}
      <div role="rowheader" className="grid grid-cols-12 overflow-x-hidden px-4 text-xs font-bold md:gap-x-4 md:text-sm">
        <span></span>
        <span>{t('common.stats.base')}</span>
        <span className="invisible md:visible">{t('common.nature')}</span>
        <span className="mx-2 md:mx-0">{evLabel}</span>
        <span className="col-span-6"></span>
        <span>{t('common.ivs')}</span>
        <span>{t('common.stats.stats')}</span>
      </div>
      {/* Sliders */}
      {['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map((stat: string) => {
        const b = (base as { [s: string]: number })[stat] ?? 0;
        const iv = canCustomizeIvs ? (ivs as { [s: string]: number })[stat] ?? 31 : 31;
        const ev = (evs as { [s: string]: number })[stat] ?? 0;
        const lv = teamState.getPokemonInTeam(tabIdx)?.level ?? 50;
        return (
          <div key={stat} className="grid grid-cols-12 items-center overflow-hidden px-4 text-xs md:gap-x-4 md:text-sm">
            {/* Column Header */}
            <span className="font-bold uppercase" role="columnheader">
              {t(`common.stats.${stat}`)}
            </span>
            {/* Base */}
            <span className="uppercase">{b}</span>
            {/* Nature radio: plus - primary; minus - secondary */}
            <div className="flex space-x-0.5">
              <>
                <span>+</span>
                <input
                  type="radio"
                  role="radio"
                  aria-label={`plus-${stat}`}
                  name={`plus-${stat}`}
                  className="radio-primary radio radio-xs md:radio-sm"
                  checked={nature.plus === stat}
                  onChange={handleNatureRadioChange}
                  disabled={stat === 'hp'}
                />
                <input
                  type="radio"
                  role="radio"
                  aria-label={`minus-${stat}`}
                  name={`minus-${stat}`}
                  className="radio-secondary radio radio-xs md:radio-sm"
                  checked={nature.minus === stat}
                  onChange={handleNatureRadioChange}
                  disabled={stat === 'hp'}
                />
                <span>-</span>
              </>
            </div>
            {/* EVs - number input */}
            <input
              type="number"
              role="spinbutton"
              aria-label={`${stat} EV input`}
              id={`ev-${stat}-number`}
              min="0"
              max={evLimits.single}
              step={evLimits.step}
              value={ev}
              className={`input-bordered ${
                nature.plus === stat ? 'input-primary' : nature.minus === stat ? 'input-secondary' : ''
              } input input-xs col-span-2 mx-2 md:input-sm md:mx-0`}
              onChange={(e) => handleEVInputChange(e, ev, stat)}
              onKeyUp={(e) => handleEVInputDone(e, stat)}
              onMouseUp={(e) => handleEVInputDone(e, stat)}
              onTouchEnd={(e) => handleEVInputDone(e, stat)}
              onBlur={(e) => handleEVInputDone(e, stat)}
            />
            {/* EVs - range slider */}
            <input
              type="range"
              role="slider"
              aria-label={`${stat} EV slider`}
              id={`ev-${stat}-range`}
              min="0"
              max={evLimits.single}
              step={evLimits.step}
              value={ev}
              className="range range-xs col-span-5 md:range-sm"
              onChange={(e) => handleEVInputChange(e, ev, stat)}
              onMouseUp={(e) => handleEVInputDone(e, stat)}
              onTouchEnd={(e) => handleEVInputDone(e, stat)}
            />
            {/* IVs - number input, read-only in formats without IVs (Champions) */}
            <input
              type="number"
              role="spinbutton"
              aria-label={`${stat} IV input`}
              id={`iv-${stat}-number`}
              min="0"
              max="31"
              value={canCustomizeIvs ? iv : 31}
              disabled={!canCustomizeIvs}
              title={
                canCustomizeIvs
                  ? undefined
                  : t('room.ivsNotCustomizable', {
                      defaultValue: 'This format has no IVs; every Pokémon has 31 in every stat.',
                    })
              }
              className="input input-bordered input-xs appearance-none md:input-sm"
              onChange={(e) => handleIVInputChange(e, stat)}
            />
            {/* Final Stat */}
            <span role="cell" aria-label={`${stat} stat`}>
              {getStats(stat, b, ev, iv, nature, lv, teamState.format)}
            </span>
          </div>
        );
      })}
      <div className="grid grid-cols-12 items-center overflow-hidden px-4 py-1 text-xs md:text-sm">
        {/* Nature */}
        <span className="font-bold uppercase" role="columnheader">
          {t('common.nature')}:
        </span>
        <select id="nature" className="select select-bordered select-xs col-span-2 md:select-sm" value={nature.name} onChange={handleNatureSelectChange}>
          {natures.map(({ id, minus, name, plus }) => (
            <option key={name} value={name}>
              {t(id, { ns: 'natures' })}
              {plus && ` (+${t(`common.stats.${plus}`)} / -${t(`common.stats.${minus}`)})`}
            </option>
          ))}
        </select>
        {/* Left */}
        <span className="col-span-2 text-center font-bold uppercase" role="columnheader">
          {getLeftEVs(evs, teamState.format)}
        </span>
      </div>
    </>
  );
}

export default StatsSetters;

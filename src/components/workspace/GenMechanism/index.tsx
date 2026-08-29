import { useContext } from 'react';

import { StoreContext } from '@/components/workspace/Contexts/StoreContext';
import GMaxSwitch from '@/components/workspace/GMax/GMaxSwitch';
import TeraTypeSelect from '@/components/workspace/TeraTypeSelect';
import { isChampionsFormatId } from '@/utils/ChampionsData';

function GenMechanism() {
  const { teamState } = useContext(StoreContext);
  // Champions has no Terastallization; its generation mechanic is Mega Evolution, which is driven by the held Mega Stone
  if (isChampionsFormatId(teamState.format)) return null;
  if (teamState.format.includes('gen8')) return <GMaxSwitch />;
  if (teamState.format.includes('gen9')) return <TeraTypeSelect />;
  return null;
}

export default GenMechanism;

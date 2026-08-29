import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import Loading from '@/components/layout/Loading';
import { Main } from '@/components/layout/Main';
import { Pokemon } from '@/models/Pokemon';
import { defaultProtocol, selectableProtocols, SupportedProtocolProvider } from '@/providers';
import { isValidPokePasteURL } from '@/utils/PokemonUtils';
import type { BasePokePaste } from '@/utils/Types';

const Workspace = dynamic(() => import('@/components/workspace/index'), {
  ssr: false,
  loading: () => <Loading />,
});

type RoomQueryParams = {
  // supplied as a path param by /room/[name], or as a query param by /room?name=...
  // (the static export used for GitHub Pages cannot pre-render arbitrary path params)
  name: string;
  // query params (persisted in URL)
  protocol: SupportedProtocolProvider;
  // query params (volatile)
  format?: string; // format
  pokepaste?: string; // url
  packed?: string; // packed team string
};

// Known issue: if you access this page via go back, it might cause a series of warnings regarding update some unmounted components.
const RoomView = () => {
  // Get the room name from the params
  const { isReady, query } = useRouter();

  // Get query params and rename them
  const { name: roomName, protocol, pokepaste: pokePasteUrl, packed, format } = query as RoomQueryParams;
  const protocolName = selectableProtocols.includes(protocol) ? protocol : defaultProtocol;

  // Set up the initial team if the pokepaste url is given and valid
  const [basePokePaste, setBasePokePaste] = useState<BasePokePaste | undefined>();
  useEffect(() => {
    // If a packed team string is given in the query params, use it;
    // else if the PokePaste url is set and valid, fetch the team data
    if (packed) {
      setBasePokePaste(Pokemon.convertPackedTeamToTeam(packed));
    } else if (isValidPokePasteURL(pokePasteUrl)) {
      Pokemon.pokePasteURLFetcher(pokePasteUrl!).then((data) => {
        setBasePokePaste(data);
      });
    }

    // Remove PokePaste link and the packed team from URL to allow for sharing
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    params.delete('pokepaste');
    params.delete('packed');
    params.delete('format');
    url.search = params.toString();
    window.history.replaceState({}, document.title, url.toString());
  }, [packed, pokePasteUrl, format]);

  // Prompt the user if they try and leave with unsaved changes
  useEffect(() => {
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleWindowClose);
    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
    };
  }, []);

  return (
    <Main title={`Room - ${roomName}`}>
      {isReady && roomName ? <Workspace roomName={roomName} protocolName={protocolName} basePokePaste={basePokePaste} format={format} /> : <Loading />}
    </Main>
  );
};

export default RoomView;

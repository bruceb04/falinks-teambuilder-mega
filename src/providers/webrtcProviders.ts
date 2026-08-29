import { getYjsValue } from '@syncedstore/core';
import type { MappedTypeDescription } from '@syncedstore/core/types/doc'; // eslint-disable-line import/no-unresolved
import { WebrtcProvider } from 'y-webrtc';

import { StoreContextType } from '@/models/TeamState';
import { Providers } from '@/providers/baseProviders';

// y-webrtc already defaults to a maintained signaling server (wss://y-webrtc-eu.fly.dev).
// Set NEXT_PUBLIC_YJS_SIGNALING to a comma-separated list to point at your own instead.
// Signaling only introduces peers to each other; the team data itself stays peer-to-peer.
const signaling = process.env.NEXT_PUBLIC_YJS_SIGNALING?.split(',')
  .map((url) => url.trim())
  .filter(Boolean);

let instance: Providers<WebrtcProvider>;

class WebrtcProviders extends Providers<WebrtcProvider> {
  constructor() {
    super();
    if (instance) {
      throw new Error('You can only create one instance!');
    }

    instance = this;
  }

  public getOrCreateProvider(roomName: string, store: MappedTypeDescription<StoreContextType>): WebrtcProvider {
    if (!this.providers.has(roomName)) {
      this.providers.set(roomName, new WebrtcProvider(roomName, getYjsValue(store) as any, signaling?.length ? { signaling } : {}));
    }

    return this.providers.get(roomName)!;
  }
}

const singletonWebrtcProviders = Object.freeze(new WebrtcProviders());

export { singletonWebrtcProviders };
